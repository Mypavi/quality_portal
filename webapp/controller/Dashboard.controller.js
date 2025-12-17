sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, UIComponent, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("quality.controller.Dashboard", {
        onInit: function () {
            console.log("🚀 Dashboard controller initialized - Kaar Technologies Quality Management");
            
            // Initialize loading state
            this._initializeLoadingState();
            
            // Load real data from SAP services
            this._loadRealData();
        },

        _initializeLoadingState: function() {
            // Set initial loading counts
            var oInspectionModel = new sap.ui.model.json.JSONModel({ count: 0, loading: true });
            var oResultModel = new sap.ui.model.json.JSONModel({ count: 0, loading: true });
            var oUsageModel = new sap.ui.model.json.JSONModel({ count: 0, loading: true });

            this.getView().setModel(oInspectionModel, "inspectionCount");
            this.getView().setModel(oResultModel, "resultCount");
            this.getView().setModel(oUsageModel, "usageCount");

            // Initialize empty inspection data model
            var oInspectionDataModel = new sap.ui.model.json.JSONModel({
                ZQM_INSPECT_PR: [],
                loading: true
            });
            this.getView().setModel(oInspectionDataModel, "inspection");
        },

        _loadRealData: function() {
            console.log("📊 Loading real data from SAP OData services...");
            
            // Show loading message
            MessageToast.show("🔄 Loading quality data from SAP system...", {
                duration: 2000,
                width: "20em"
            });

            // Load inspection lots data
            this._loadInspectionLots();
            
            // Load counts for all services
            this._loadServiceCounts();
        },

        _loadInspectionLots: function() {
            var oInspectionModel = this.getOwnerComponent().getModel("inspection");
            
            if (!oInspectionModel) {
                console.error("❌ Inspection model not available");
                this._showFallbackData();
                return;
            }

            console.log("📋 Fetching inspection lots from ZQM_INSPECT_PR...");
            
            oInspectionModel.read("/ZQM_INSPECT_PR", {
                success: function(oData) {
                    console.log("✅ Successfully loaded inspection lots:", oData.results.length, "records");
                    
                    // Process and enhance the data
                    var aProcessedData = this._processInspectionData(oData.results);
                    
                    // Update the model
                    var oDataModel = new sap.ui.model.json.JSONModel({
                        ZQM_INSPECT_PR: aProcessedData,
                        loading: false
                    });
                    this.getView().setModel(oDataModel, "inspection");
                    
                    // Update inspection count
                    this.getView().getModel("inspectionCount").setData({
                        count: aProcessedData.length,
                        loading: false
                    });
                    
                    // Show success message
                    MessageToast.show("✅ Loaded " + aProcessedData.length + " inspection lots", {
                        duration: 2000
                    });
                    
                }.bind(this),
                error: function(oError) {
                    console.error("❌ Failed to load inspection lots:", oError);
                    this._showFallbackData();
                    MessageBox.error("Failed to load inspection data. Using demo data for now.");
                }.bind(this)
            });
        },

        _processInspectionData: function(aData) {
            return aData.map(function(oItem) {
                // Enhance each inspection lot with additional computed fields
                return {
                    ...oItem,
                    // Add computed fields for better display
                    InspectionProgress: this._calculateProgress(oItem.InspectedQuantity, oItem.ActualQuantity),
                    StatusIcon: this._getStatusIcon(oItem.UsageDecisionStatus),
                    StatusColor: this._getStatusColor(oItem.UsageDecisionCode),
                    MaterialDisplay: oItem.SelectedMaterial || "Material " + oItem.InspectionLotNumber.substr(-3),
                    PlantDisplay: oItem.PlantDescription || ("Plant " + oItem.Plant)
                };
            }.bind(this));
        },

        _calculateProgress: function(sInspected, sActual) {
            var fInspected = parseFloat(sInspected) || 0;
            var fActual = parseFloat(sActual) || 1;
            return Math.round((fInspected / fActual) * 100);
        },

        _getStatusIcon: function(sStatus) {
            switch(sStatus) {
                case "Decision Made": return "sap-icon://accept";
                case "Pending": return "sap-icon://pending";
                default: return "sap-icon://status-inactive";
            }
        },

        _getStatusColor: function(sCode) {
            switch(sCode) {
                case "A": return "Success";
                case "R": 
                case "R2": return "Error";
                case "": return "Warning";
                default: return "Information";
            }
        },

        _loadServiceCounts: function() {
            // Load result records count
            this._loadServiceCount("result", "ZQM_RESULT_PR", "resultCount");
            
            // Load usage decisions count  
            this._loadServiceCount("usage", "ZQM_US_PR", "usageCount");
        },

        _loadServiceCount: function(sModelName, sEntitySet, sCountModelName) {
            var oModel = this.getOwnerComponent().getModel(sModelName);
            
            if (!oModel) {
                console.log("⚠️ Model " + sModelName + " not available");
                return;
            }

            console.log("📊 Loading count for " + sEntitySet + "...");
            
            oModel.read("/" + sEntitySet, {
                success: function(oData) {
                    var iCount = oData.results ? oData.results.length : 0;
                    console.log("✅ " + sEntitySet + " count:", iCount);
                    
                    this.getView().getModel(sCountModelName).setData({
                        count: iCount,
                        loading: false
                    });
                }.bind(this),
                error: function(oError) {
                    console.error("❌ Failed to load " + sEntitySet + " count:", oError);
                    this.getView().getModel(sCountModelName).setData({
                        count: 0,
                        loading: false
                    });
                }.bind(this)
            });
        },

        _showFallbackData: function() {
            console.log("📋 Loading fallback demo data...");
            
            var aDemoInspectionData = [
                {
                    InspectionLotNumber: "50000000032",
                    Plant: "0001",
                    PlantDescription: "werk_01",
                    SelectedMaterial: "34",
                    ActualQuantity: "12.000",
                    InspectedQuantity: "10.000",
                    UnitOfMeasure: "EA",
                    UsageDecisionCode: "",
                    UsageDecisionStatus: "Pending",
                    LotOrigin: "05",
                    InspectionProgress: 83,
                    StatusIcon: "sap-icon://pending",
                    StatusColor: "Warning",
                    MaterialDisplay: "Material 034",
                    PlantDisplay: "werk_01"
                },
                {
                    InspectionLotNumber: "50000000034",
                    Plant: "0001", 
                    PlantDescription: "werk_01",
                    SelectedMaterial: "35",
                    ActualQuantity: "12.000",
                    InspectedQuantity: "10.000",
                    UnitOfMeasure: "PC",
                    UsageDecisionCode: "",
                    UsageDecisionStatus: "Pending",
                    LotOrigin: "05",
                    InspectionProgress: 83,
                    StatusIcon: "sap-icon://pending",
                    StatusColor: "Warning",
                    MaterialDisplay: "Material 035",
                    PlantDisplay: "werk_01"
                },
                {
                    InspectionLotNumber: "30000000051",
                    Plant: "1003",
                    PlantDescription: "MK",
                    SelectedMaterial: "FIN_MAT_SW",
                    ActualQuantity: "10.000",
                    InspectedQuantity: "10.000",
                    UnitOfMeasure: "PC",
                    UsageDecisionCode: "",
                    UsageDecisionStatus: "Pending",
                    LotOrigin: "03",
                    InspectionProgress: 100,
                    StatusIcon: "sap-icon://pending",
                    StatusColor: "Warning",
                    MaterialDisplay: "FIN_MAT_SW",
                    PlantDisplay: "MK"
                }
            ];

            var oInspectionModel = new sap.ui.model.json.JSONModel({
                ZQM_INSPECT_PR: aDemoInspectionData,
                loading: false
            });
            
            this.getView().setModel(oInspectionModel, "inspection");
            
            // Update counts with demo data
            this.getView().getModel("inspectionCount").setData({ count: 47, loading: false });
            this.getView().getModel("resultCount").setData({ count: 42, loading: false });
            this.getView().getModel("usageCount").setData({ count: 47, loading: false });
            
            console.log("✅ Demo inspection data loaded");
            
            // Show welcome message
            setTimeout(function() {
                MessageToast.show("🎉 Welcome to Kaar Technologies Quality Management Dashboard!", {
                    duration: 3000,
                    width: "25em"
                });
            }, 500);
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
                var filter = new Filter("InspectionLotNumber", FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }
            var oTable = this.byId("inspectionTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onTilePress: function () {
            // Refresh inspection lots data
            MessageToast.show("🔄 Refreshing inspection data...");
            this._loadInspectionLots();
        },

        onRefresh: function() {
            // Manual refresh button
            MessageToast.show("🔄 Refreshing all data...");
            this._initializeLoadingState();
            this._loadRealData();
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
