sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, UIComponent, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("quality.controller.Dashboard", {
        onInit: function () {
            // Initialize counts or other local data
            var oInspectionModel = new sap.ui.model.json.JSONModel({ count: 0 });
            var oResultModel = new sap.ui.model.json.JSONModel({ count: 0 });
            var oUsageModel = new sap.ui.model.json.JSONModel({ count: 0 });

            this.getView().setModel(oInspectionModel, "inspectionCount");
            this.getView().setModel(oResultModel, "resultCount");
            this.getView().setModel(oUsageModel, "usageCount");

            this._fetchCounts();
        },

        _fetchCounts: function () {
            var oComponent = this.getOwnerComponent();

            // Helper to fetch count
            var fnFetchCount = function (sModelName, sEntitySet, sTargetModel, sTargetProperty) {
                var oModel = oComponent.getModel(sModelName);
                if (oModel) {
                    var sUrl = oModel.sServiceUrl + sEntitySet + "/$count";
                    // Use jQuery/Ajax for lightweight count fetch to avoid loading all data
                    jQuery.ajax({
                        url: sUrl,
                        type: "GET",
                        success: function (data) {
                            // Data is the count as plain text (or number)
                            var iCount = parseInt(data, 10);
                            this.getView().getModel(sTargetModel).setProperty(sTargetProperty, isNaN(iCount) ? 0 : iCount);
                        }.bind(this),
                        error: function (e) {
                            console.error("Failed to fetch count for " + sEntitySet, e);
                        }
                    });
                }
            }.bind(this);

            fnFetchCount("inspection", "/ZQM_INSPECT_PR", "inspectionCount", "/count");
            fnFetchCount("result", "/ZQM_RESULT_PR", "resultCount", "/count");
            fnFetchCount("usage", "/ZQM_US_PR", "usageCount", "/count");
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },

        onSearch: function (oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }
            var oTable = this.byId("inspectionTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onTilePress: function () {
            // This tile represents the current view (Inspection Lots)
            // Can be used to refresh the table or counts if needed
            this._fetchCounts();
            this.getView().byId("inspectionTable").getBinding("items").refresh();
        },

        onResultRecordingPress: function () {
            // Navigate to Result Recording List (Generic)
            var oRouter = UIComponent.getRouterFor(this);
            // Use the List route which causes no parameter error
            oRouter.navTo("RouteResultRecordingList");
        },

        onUsageDecisionPress: function () {
            // Navigate to Usage Decision View
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteUsageDecision");
        },

        onInspectionLotPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("inspection");

            // Robustly get the ID regardless of model type (Client JSON vs OData)
            var sInspectionLot = oContext.getProperty("InspectionLotNumber");

            var oRouter = UIComponent.getRouterFor(this);
            // Pass the ID. The ResultRecording controller will handle adding quotes if needed for OData keys.
            oRouter.navTo("RouteResultRecording", {
                inspectionLot: sInspectionLot
            });
        },

        formatUDState: function (sCode) {
            if (sCode === 'A') {
                return "Success"; // Green
            } else if (sCode === 'R' || sCode === 'R2') {
                return "Error"; // Red
            } else if (sCode) {
                // Any other code implies a decision was made but maybe not strictly A/R
                return "Warning";
            }
            return "None"; // Pending
        },

        formatUDText: function (sCode) {
            if (sCode === 'A') {
                return "Approved";
            } else if (sCode === 'R' || sCode === 'R2') {
                return "Rejected";
            } else if (sCode) {
                return "Decision Made (" + sCode + ")";
            }
            return "Pending";
        }
    });
});
