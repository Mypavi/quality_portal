sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, UIComponent, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("quality.controller.Dashboard", {
        onInit: function () {
            console.log("Dashboard controller initialized");
            
            // Initialize counts with demo data
            var oInspectionModel = new sap.ui.model.json.JSONModel({ count: 15 });
            var oResultModel = new sap.ui.model.json.JSONModel({ count: 8 });
            var oUsageModel = new sap.ui.model.json.JSONModel({ count: 5 });

            this.getView().setModel(oInspectionModel, "inspectionCount");
            this.getView().setModel(oResultModel, "resultCount");
            this.getView().setModel(oUsageModel, "usageCount");

            // Initialize demo inspection data
            this._initializeDemoData();
            
            // Try to fetch real data, but don't fail if unavailable
            this._fetchCounts();
        },

        _initializeDemoData: function() {
            var aDemoInspectionData = [
                {
                    InspectionLotNumber: "100000001",
                    Plant: "1000",
                    PlantDescription: "Main Plant",
                    SelectedMaterial: "MAT-001",
                    MaterialDescription: "Raw Material A",
                    ActualQuantity: "1000.000",
                    InspectedQuantity: "750.000",
                    UnitOfMeasure: "KG",
                    UsageDecisionCode: "",
                    UsageDecisionStatus: "Pending",
                    InspectionStatus: "In Progress"
                },
                {
                    InspectionLotNumber: "100000002",
                    Plant: "1000",
                    PlantDescription: "Main Plant",
                    SelectedMaterial: "MAT-002",
                    MaterialDescription: "Component B",
                    ActualQuantity: "500.000",
                    InspectedQuantity: "500.000",
                    UnitOfMeasure: "PC",
                    UsageDecisionCode: "A",
                    UsageDecisionStatus: "Approved",
                    InspectionStatus: "Complete"
                },
                {
                    InspectionLotNumber: "100000003",
                    Plant: "2000",
                    PlantDescription: "Secondary Plant",
                    SelectedMaterial: "MAT-003",
                    MaterialDescription: "Finished Product C",
                    ActualQuantity: "200.000",
                    InspectedQuantity: "150.000",
                    UnitOfMeasure: "EA",
                    UsageDecisionCode: "",
                    UsageDecisionStatus: "Pending",
                    InspectionStatus: "In Progress"
                }
            ];

            var oInspectionModel = new sap.ui.model.json.JSONModel({
                ZQM_INSPECT_PR: aDemoInspectionData
            });
            
            this.getView().setModel(oInspectionModel, "inspection");
            console.log("Demo inspection data initialized");
            
            // Show welcome message
            setTimeout(function() {
                MessageToast.show("🎉 Welcome to Kaar Technologies Quality Management Dashboard!", {
                    duration: 3000,
                    width: "25em"
                });
            }, 500);
        },

        _fetchCounts: function () {
            console.log("Attempting to fetch real data counts...");
            var oComponent = this.getOwnerComponent();

            // Helper to fetch count using direct OData calls
            var fnFetchCount = function (sModelName, sEntitySet, sTargetModel, sTargetProperty, sBaseUrl) {
                var oModel = oComponent.getModel(sModelName);
                if (!oModel) {
                    console.log("Model " + sModelName + " not available, using demo data");
                    return;
                }
                
                // Try to get count using $inlinecount first, fallback to loading data
                var sUrl = sBaseUrl + sEntitySet + "?$top=0&$inlinecount=allpages&$format=json";
                
                jQuery.ajax({
                    url: sUrl,
                    type: "GET",
                    timeout: 5000, // 5 second timeout
                    success: function (data) {
                        var iCount = 0;
                        if (data && data.d && data.d.__count) {
                            iCount = parseInt(data.d.__count, 10);
                        } else if (data && data.d && data.d.results) {
                            iCount = data.d.results.length;
                        }
                        console.log("Successfully fetched count for " + sEntitySet + ": " + iCount);
                        this.getView().getModel(sTargetModel).setProperty(sTargetProperty, isNaN(iCount) ? 0 : iCount);
                    }.bind(this),
                    error: function (xhr, status, error) {
                        console.log("Failed to fetch count for " + sEntitySet + ", using demo data. Error:", error);
                        // Keep demo data, don't override with 0
                    }.bind(this)
                });
            }.bind(this);

            // Try to fetch real data, but continue with demo data if it fails
            try {
                fnFetchCount("inspection", "ZQM_INSPECT_PR", "inspectionCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/");
                fnFetchCount("result", "ZQM_RESULT_PR", "resultCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_RESULT_PR_CDS/");
                fnFetchCount("usage", "ZQM_US_PR", "usageCount", "/count", "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_US_PR_CDS/");
            } catch (e) {
                console.error("Error in _fetchCounts:", e);
            }
        },

        onNavBack: function () {
            console.log("Dashboard: Navigating back to login");
            try {
                var oRouter = UIComponent.getRouterFor(this);
                if (oRouter) {
                    oRouter.navTo("RouteLogin");
                } else {
                    window.location.hash = "#/";
                }
            } catch (e) {
                console.error("Navigation back failed:", e);
                window.location.hash = "#/";
            }
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
