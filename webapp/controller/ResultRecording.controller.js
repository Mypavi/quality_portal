sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "quality/model/models",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, models, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("quality.controller.ResultRecording", {

        onInit: function () {
            // Check authentication
            if (sessionStorage.getItem("qms_authenticated") !== "true") {
                this.getOwnerComponent().getRouter().navTo("login");
                return;
            }

            // Set result model
            var oResultModel = models.createResultModel();
            this.getView().setModel(oResultModel, "result");

            // Check for selected lot from dashboard
            this._loadSelectedLot();
            
            // Load existing results
            this._loadResults();
        },

        /**
         * Load selected lot from session storage
         * @private
         */
        _loadSelectedLot: function () {
            var sSelectedLot = sessionStorage.getItem("selectedLot");
            if (sSelectedLot) {
                try {
                    var oSelectedLot = JSON.parse(sSelectedLot);
                    var oResultModel = this.getView().getModel("result");
                    oResultModel.setProperty("/selectedLot", oSelectedLot);
                    
                    // Pre-fill form with lot data
                    oResultModel.setProperty("/newResult/InspectionLotNumber", oSelectedLot.InspectionLotNumber);
                    oResultModel.setProperty("/newResult/PlantCode", oSelectedLot.Plant);
                    oResultModel.setProperty("/newResult/InspectorName", sessionStorage.getItem("qms_username") || "TRAINEE");
                    
                    // Load results for this specific lot
                    this._loadResultsForLot(oSelectedLot.InspectionLotNumber);
                } catch (e) {
                    console.error("Error parsing selected lot:", e);
                }
            }
        },

        /**
         * Load all results
         * @private
         */
        _loadResults: function () {
            var that = this;
            var oResultModel = this.getView().getModel("result");
            var oDataModel = this.getOwnerComponent().getModel("result");

            oResultModel.setProperty("/isLoading", true);

            oDataModel.read("/ZQM_RESULT_PR", {
                urlParameters: {
                    "$format": "json"
                },
                success: function (oData) {
                    var aResults = oData.results || [];
                    
                    // Process results data
                    aResults.forEach(function (oResult) {
                        oResult.RecordedDateFormatted = that._formatDate(oResult.RecordedDate);
                        oResult.StatusState = that._getStatusState(oResult.RecordingStatus);
                    });

                    oResultModel.setProperty("/results", aResults);
                    oResultModel.setProperty("/isLoading", false);
                    
                    console.log("Loaded " + aResults.length + " result records");
                },
                error: function (oError) {
                    console.error("Failed to load results:", oError);
                    oResultModel.setProperty("/isLoading", false);
                    MessageToast.show("Failed to load result data");
                    
                    // Set demo data as fallback
                    that._setDemoResultData();
                }
            });
        },

        /**
         * Load results for specific lot
         * @param {string} sLotNumber - Inspection lot number
         * @private
         */
        _loadResultsForLot: function (sLotNumber) {
            var that = this;
            var oResultModel = this.getView().getModel("result");
            var oDataModel = this.getOwnerComponent().getModel("result");

            var aFilters = [
                new Filter("InspectionLotNumber", FilterOperator.EQ, sLotNumber)
            ];

            oDataModel.read("/ZQM_RESULT_PR", {
                filters: aFilters,
                urlParameters: {
                    "$format": "json"
                },
                success: function (oData) {
                    var aResults = oData.results || [];
                    
                    aResults.forEach(function (oResult) {
                        oResult.RecordedDateFormatted = that._formatDate(oResult.RecordedDate);
                        oResult.StatusState = that._getStatusState(oResult.RecordingStatus);
                    });

                    oResultModel.setProperty("/results", aResults);
                    console.log("Loaded " + aResults.length + " results for lot " + sLotNumber);
                },
                error: function (oError) {
                    console.error("Failed to load results for lot:", oError);
                    MessageToast.show("Failed to load results for selected lot");
                }
            });
        },

        /**
         * Save new result
         */
        onSaveResult: function () {
            var oResultModel = this.getView().getModel("result");
            var oNewResult = oResultModel.getProperty("/newResult");

            // Validate required fields
            if (!oNewResult.InspectionLotNumber || !oNewResult.PlantCode) {
                MessageBox.error("Please fill in all required fields");
                return;
            }

            this._saveResultToBackend(oNewResult);
        },

        /**
         * Save result to backend
         * @param {object} oResult - Result data
         * @private
         */
        _saveResultToBackend: function (oResult) {
            var that = this;
            var oDataModel = this.getOwnerComponent().getModel("result");
            var oResultModel = this.getView().getModel("result");

            // Prepare data for SAP
            var oResultData = {
                InspectionLotNumber: oResult.InspectionLotNumber,
                PlantCode: oResult.PlantCode,
                InspectorName: oResult.InspectorName,
                RecordedDate: oResult.RecordedDate,
                UsageDecisionCode: oResult.UsageDecisionCode,
                StockCode: oResult.StockCode,
                ResultCategory: oResult.ResultCategory,
                RecordingStatus: "Active"
            };

            oDataModel.create("/ZQM_RESULT_PR", oResultData, {
                success: function (oData) {
                    MessageToast.show("Result saved successfully");
                    that._clearForm();
                    that._loadResults();
                    
                    // Navigate to usage decision if result is complete
                    if (oResult.UsageDecisionCode) {
                        that._navigateToUsageDecision();
                    }
                },
                error: function (oError) {
                    console.error("Failed to save result:", oError);
                    MessageBox.error("Failed to save result. Please try again.");
                }
            });
        },

        /**
         * Clear form
         */
        onClearForm: function () {
            this._clearForm();
        },

        /**
         * Clear form data
         * @private
         */
        _clearForm: function () {
            var oResultModel = this.getView().getModel("result");
            var sCurrentLot = oResultModel.getProperty("/newResult/InspectionLotNumber");
            var sCurrentPlant = oResultModel.getProperty("/newResult/PlantCode");
            var sCurrentInspector = oResultModel.getProperty("/newResult/InspectorName");

            oResultModel.setProperty("/newResult", {
                InspectionLotNumber: sCurrentLot,
                PlantCode: sCurrentPlant,
                InspectorName: sCurrentInspector,
                RecordedDate: new Date(),
                UsageDecisionCode: "",
                StockCode: "",
                ResultCategory: "",
                RecordingStatus: "Active"
            });
        },

        /**
         * Navigate to usage decision
         * @private
         */
        _navigateToUsageDecision: function () {
            MessageBox.confirm("Result recorded successfully. Would you like to proceed to Usage Decision?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        this.getOwnerComponent().getRouter().navTo("usage");
                    }
                }.bind(this)
            });
        },

        /**
         * Format date for display
         * @param {string} sDate - Date string
         * @returns {string} Formatted date
         * @private
         */
        _formatDate: function (sDate) {
            if (!sDate) return "";
            
            try {
                var oDate = new Date(sDate);
                return oDate.toLocaleDateString();
            } catch (e) {
                return sDate;
            }
        },

        /**
         * Get status state
         * @param {string} sStatus - Status
         * @returns {string} Status state
         * @private
         */
        _getStatusState: function (sStatus) {
            switch (sStatus) {
                case "Active":
                    return "Success";
                case "View Only":
                    return "Information";
                default:
                    return "None";
            }
        },

        /**
         * Set demo result data
         * @private
         */
        _setDemoResultData: function () {
            var oResultModel = this.getView().getModel("result");
            var aDemoResults = [
                {
                    InspectionLotNumber: "50000000002",
                    PlantCode: "0001",
                    InspectorName: "TRAINEE",
                    RecordedDate: "2025-06-24T00:00:00",
                    RecordedDateFormatted: "6/24/2025",
                    UsageDecisionCode: "A",
                    StockCode: "100",
                    ResultCategory: "Unrestricted Stock",
                    RecordingStatus: "View Only",
                    StatusState: "Information"
                }
            ];
            
            oResultModel.setProperty("/results", aDemoResults);
            oResultModel.setProperty("/isLoading", false);
        },

        /**
         * Navigate back to dashboard
         */
        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Test data fetch
         */
        onTestFetch: function () {
            MessageToast.show("Testing result data connectivity...");
            this._loadResults();
        },

        /**
         * Refresh data
         */
        onRefresh: function () {
            MessageToast.show("Refreshing result data...");
            this._loadResults();
        }

    });
});