sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "quality/model/models",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, models, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("quality.controller.UsageDecision", {

        onInit: function () {
            // Check authentication
            if (sessionStorage.getItem("qms_authenticated") !== "true") {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }

            // Set usage model
            var oUsageModel = models.createUsageModel();
            this.getView().setModel(oUsageModel, "usage");

            // Load usage decisions
            this._loadUsageDecisions();
        },

        /**
         * Load usage decisions from backend
         * @private
         */
        _loadUsageDecisions: function () {
            var that = this;
            var oUsageModel = this.getView().getModel("usage");
            var oDataModel = this.getOwnerComponent().getModel("usage");

            oUsageModel.setProperty("/isLoading", true);

            oDataModel.read("/ZQM_US_PR", {
                urlParameters: {
                    "$format": "json"
                },
                success: function (oData) {
                    var aUsageDecisions = oData.results || [];
                    
                    // Process and enhance data
                    aUsageDecisions.forEach(function (oDecision) {
                        oDecision.StatusState = that._getDecisionStatusState(oDecision.DecisionStatus);
                        oDecision.DecisionCodeText = that._getDecisionCodeText(oDecision.UsageDecisionCode);
                        oDecision.QuantityProgress = that._calculateProgress(oDecision.InspectedQuantity, oDecision.LotQuantity);
                    });

                    oUsageModel.setProperty("/usageDecisions", aUsageDecisions);
                    oUsageModel.setProperty("/isLoading", false);
                    
                    console.log("Loaded " + aUsageDecisions.length + " usage decisions");
                },
                error: function (oError) {
                    console.error("Failed to load usage decisions:", oError);
                    oUsageModel.setProperty("/isLoading", false);
                    MessageToast.show("Failed to load usage decision data");
                    
                    // Set demo data as fallback
                    that._setDemoUsageData();
                }
            });
        },

        /**
         * Get decision status state
         * @param {string} sStatus - Decision status
         * @returns {string} Status state
         * @private
         */
        _getDecisionStatusState: function (sStatus) {
            switch (sStatus) {
                case "Allowed":
                    return "Success";
                case "Blocked":
                    return "Error";
                case "Checked":
                    return "Information";
                default:
                    return "Warning";
            }
        },

        /**
         * Get decision code text
         * @param {string} sCode - Decision code
         * @returns {string} Decision code text
         * @private
         */
        _getDecisionCodeText: function (sCode) {
            switch (sCode) {
                case "A":
                    return "Approved";
                case "R":
                    return "Rejected";
                case "R2":
                    return "Rework Required";
                default:
                    return sCode || "Pending";
            }
        },

        /**
         * Calculate progress percentage
         * @param {string} sInspected - Inspected quantity
         * @param {string} sTotal - Total quantity
         * @returns {number} Progress percentage
         * @private
         */
        _calculateProgress: function (sInspected, sTotal) {
            var fInspected = parseFloat(sInspected) || 0;
            var fTotal = parseFloat(sTotal) || 0;
            
            if (fTotal === 0) return 0;
            return Math.min(Math.round((fInspected / fTotal) * 100), 100);
        },

        /**
         * Apply filters
         */
        onApplyFilters: function () {
            var oUsageModel = this.getView().getModel("usage");
            var oFilters = oUsageModel.getProperty("/filters");
            var aFilters = [];

            // Build filters
            if (oFilters.plant) {
                aFilters.push(new Filter("Plant", FilterOperator.EQ, oFilters.plant));
            }
            if (oFilters.status) {
                aFilters.push(new Filter("DecisionStatus", FilterOperator.EQ, oFilters.status));
            }
            if (oFilters.lotNumber) {
                aFilters.push(new Filter("InspectionLotNumber", FilterOperator.Contains, oFilters.lotNumber));
            }

            // Apply filters to table
            var oTable = this.byId("usageDecisionTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                oBinding.filter(aFilters);
                MessageToast.show("Filters applied");
            }
        },

        /**
         * Clear all filters
         */
        onClearFilters: function () {
            var oUsageModel = this.getView().getModel("usage");
            
            // Clear filter values
            oUsageModel.setProperty("/filters", {
                plant: "",
                status: "",
                lotNumber: ""
            });

            // Clear table filters
            var oTable = this.byId("usageDecisionTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                oBinding.filter([]);
                MessageToast.show("Filters cleared");
            }
        },

        /**
         * Handle usage decision selection
         */
        onUsageDecisionPress: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("usage");
            var oSelectedDecision = oBindingContext.getObject();
            
            var oUsageModel = this.getView().getModel("usage");
            oUsageModel.setProperty("/selectedDecision", oSelectedDecision);
            
            // Show decision details
            this._showDecisionDetails(oSelectedDecision);
        },

        /**
         * Show decision details
         * @param {object} oDecision - Usage decision object
         * @private
         */
        _showDecisionDetails: function (oDecision) {
            var sMessage = "Usage Decision Details:\n\n" +
                          "Lot Number: " + oDecision.InspectionLotNumber + "\n" +
                          "Plant: " + oDecision.Plant + "\n" +
                          "Lot Quantity: " + oDecision.LotQuantity + "\n" +
                          "Inspected Quantity: " + oDecision.InspectedQuantity + "\n" +
                          "Decision Code: " + (oDecision.UsageDecisionCode || "Pending") + "\n" +
                          "Status: " + oDecision.DecisionStatus + "\n" +
                          "Message: " + oDecision.DecisionMessage;

            MessageBox.information(sMessage, {
                title: "Usage Decision Details"
            });
        },

        /**
         * Set demo usage data
         * @private
         */
        _setDemoUsageData: function () {
            var oUsageModel = this.getView().getModel("usage");
            var aDemoData = [
                {
                    InspectionLotNumber: "50000000032",
                    Plant: "0001",
                    LotQuantity: "12.000",
                    InspectedQuantity: "10.000",
                    UsageDecisionCode: "",
                    DecisionStatus: "Blocked",
                    DecisionMessage: "Cannot proceed",
                    StatusState: "Error",
                    DecisionCodeText: "Pending",
                    QuantityProgress: 83
                }
            ];
            
            oUsageModel.setProperty("/usageDecisions", aDemoData);
            oUsageModel.setProperty("/isLoading", false);
        },

        /**
         * Navigate back to dashboard
         */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Refresh usage decisions
         */
        onRefresh: function () {
            MessageToast.show("Refreshing usage decision data...");
            this._loadUsageDecisions();
        },

        /**
         * Export usage decisions
         */
        onExport: function () {
            MessageToast.show("Export functionality will be implemented");
        }

    });
});