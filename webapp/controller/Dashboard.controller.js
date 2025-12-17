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

            // Helper to fetch count using direct OData calls
            var fnFetchCount = function (sModelName, sEntitySet, sTargetModel, sTargetProperty, sBaseUrl) {
                var oModel = oComponent.getModel(sModelName);
                if (oModel) {
                    // Try to get count using $inlinecount first, fallback to loading data
                    var sUrl = sBaseUrl + sEntitySet + "?$top=0&$inlinecount=allpages&$format=json";
                    
                    jQuery.ajax({
                        url: sUrl,
                        type: "GET",
                        success: function (data) {
                            var iCount = 0;
                            if (data && data.d && data.d.__count) {
                                iCount = parseInt(data.d.__count, 10);
                            } else if (data && data.d && data.d.results) {
                                // Fallback: load all data and count
                                var sCountUrl = sBaseUrl + sEntitySet + "?$format=json";
                                jQuery.ajax({
                                    url: sCountUrl,
                                    type: "GET",
                                    success: function (countData) {
                                        var count = countData && countData.d && countData.d.results ? countData.d.results.length : 0;
                                        this.getView().getModel(sTargetModel).setProperty(sTargetProperty, count);
                                    }.bind(this),
                                    error: function (e) {
                                        console.error("Failed to fetch count for " + sEntitySet, e);
                                        this.getView().getModel(sTargetModel).setProperty(sTargetProperty, 0);
                                    }.bind(this)
                                });
                                return;
                            }
                            this.getView().getModel(sTargetModel).setProperty(sTargetProperty, isNaN(iCount) ? 0 : iCount);
                        }.bind(this),
                        error: function (e) {
                            console.error("Failed to fetch count for " + sEntitySet, e);
                            this.getView().getModel(sTargetModel).setProperty(sTargetProperty, 0);
                        }.bind(this)
                    });
                }
            }.bind(this);

            // Use the actual backend URLs
            fnFetchCount("inspection", "ZQM_INSPECT_PR", "inspectionCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/");
            fnFetchCount("result", "ZQM_RESULT_PR", "resultCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_RESULT_PR_CDS/");
            fnFetchCount("usage", "ZQM_US_PR", "usageCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_US_PR_CDS/");
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
            // Check if result model is available before navigation
            var oResultModel = this.getOwnerComponent().getModel("result");
            if (!oResultModel) {
                sap.m.MessageBox.error("Result service is not available. Please check your connection and try again.");
                return;
            }

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
