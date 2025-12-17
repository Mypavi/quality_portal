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
            
            // Wait for models to be ready before loading data
            this._waitForModelsAndLoadData();
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

        _waitForModelsAndLoadData: function() {
            console.log("⏳ Waiting for OData models to be ready...");
            
            var oComponent = this.getOwnerComponent();
            var that = this;
            
            // Check if models are ready, if not wait a bit
            var fnCheckModels = function() {
                var oInspectionModel = oComponent.getModel("inspection");
                var oResultModel = oComponent.getModel("result");
                var oUsageModel = oComponent.getModel("usage");
                
                console.log("🔍 Model availability check:");
                console.log("- Inspection model:", !!oInspectionModel);
                console.log("- Result model:", !!oResultModel);
                console.log("- Usage model:", !!oUsageModel);
                
                if (oInspectionModel || oResultModel || oUsageModel) {
                    // At least one model is available, proceed with data loading
                    console.log("✅ Models are ready, loading data...");
                    that._loadRealData();
                } else {
                    console.log("⚠️ Models not ready yet, trying fallback data...");
                    // Models not ready, show fallback data immediately
                    that._showFallbackData();
                }
            };
            
            // Try immediately first
            fnCheckModels();
            
            // If models still not ready, try again after a short delay
            setTimeout(function() {
                var oInspectionModel = oComponent.getModel("inspection");
                if (!oInspectionModel) {
                    console.log("🔄 Retrying model check after delay...");
                    fnCheckModels();
                }
            }, 2000);
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
                console.error("❌ Inspection model not available, trying direct AJAX call...");
                this._tryDirectInspectionCall();
                return;
            }

            console.log("📋 Fetching inspection lots from ZQM_INSPECT_PR...");
            
            // Add timeout to the OData call
            var iTimeout = setTimeout(function() {
                console.warn("⏰ OData call timeout, falling back to demo data");
                this._showFallbackData();
            }.bind(this), 10000); // 10 second timeout
            
            oInspectionModel.read("/ZQM_INSPECT_PR", {
                success: function(oData) {
                    clearTimeout(iTimeout);
                    console.log("✅ Successfully loaded inspection lots:", oData.results?.length || 0, "records");
                    
                    if (oData.results && oData.results.length > 0) {
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
                        MessageToast.show("✅ Loaded " + aProcessedData.length + " inspection lots from SAP", {
                            duration: 3000
                        });
                    } else {
                        console.warn("⚠️ No inspection data returned from SAP");
                        this._showFallbackData();
                    }
                }.bind(this),
                error: function(oError) {
                    clearTimeout(iTimeout);
                    console.error("❌ Failed to load inspection lots:", oError);
                    console.log("🔄 Trying direct AJAX call as fallback...");
                    this._tryDirectInspectionCall();
                }.bind(this)
            });
        },

        _tryDirectInspectionCall: function() {
            console.log("🔗 Attempting direct AJAX call to inspection service...");
            
            var sUrl = "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/ZQM_INSPECT_PR?$format=json";
            
            jQuery.ajax({
                url: sUrl,
                type: "GET",
                timeout: 8000, // 8 second timeout
                success: function(data) {
                    console.log("✅ Direct AJAX call successful:", data);
                    
                    var aResults = data.d?.results || data.results || [];
                    if (aResults.length > 0) {
                        // Process and enhance the data
                        var aProcessedData = this._processInspectionData(aResults);
                        
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
                        
                        MessageToast.show("✅ Loaded " + aProcessedData.length + " inspection lots via direct call", {
                            duration: 3000
                        });
                    } else {
                        console.warn("⚠️ No data from direct call");
                        this._showFallbackData();
                    }
                }.bind(this),
                error: function(xhr, status, error) {
                    console.error("❌ Direct AJAX call failed:", error);
                    console.log("📋 Falling back to demo data");
                    
                    MessageToast.show("⚠️ Unable to connect to SAP services. Loading demo data...", {
                        duration: 3000
                    });
                    
                    this._showFallbackData();
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
                console.log("⚠️ Model " + sModelName + " not available, trying direct call...");
                this._tryDirectCountCall(sModelName, sEntitySet, sCountModelName);
                return;
            }

            console.log("📊 Loading count for " + sEntitySet + "...");
            
            // Add timeout for count calls
            var iTimeout = setTimeout(function() {
                console.warn("⏰ Count call timeout for " + sEntitySet);
                this.getView().getModel(sCountModelName).setData({
                    count: 0,
                    loading: false
                });
            }.bind(this), 5000); // 5 second timeout for counts
            
            oModel.read("/" + sEntitySet, {
                success: function(oData) {
                    clearTimeout(iTimeout);
                    var iCount = oData.results ? oData.results.length : 0;
                    console.log("✅ " + sEntitySet + " count:", iCount);
                    
                    this.getView().getModel(sCountModelName).setData({
                        count: iCount,
                        loading: false
                    });
                }.bind(this),
                error: function(oError) {
                    clearTimeout(iTimeout);
                    console.error("❌ Failed to load " + sEntitySet + " count:", oError);
                    console.log("🔄 Trying direct call for " + sEntitySet + " count...");
                    this._tryDirectCountCall(sModelName, sEntitySet, sCountModelName);
                }.bind(this)
            });
        },

        _tryDirectCountCall: function(sModelName, sEntitySet, sCountModelName) {
            var mServiceUrls = {
                "result": "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_RESULT_PR_CDS/",
                "usage": "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_US_PR_CDS/"
            };
            
            var sBaseUrl = mServiceUrls[sModelName];
            if (!sBaseUrl) {
                console.warn("⚠️ No URL mapping for service:", sModelName);
                this.getView().getModel(sCountModelName).setData({ count: 0, loading: false });
                return;
            }
            
            var sUrl = sBaseUrl + sEntitySet + "?$format=json&$top=1&$inlinecount=allpages";
            
            jQuery.ajax({
                url: sUrl,
                type: "GET",
                timeout: 5000,
                success: function(data) {
                    var iCount = data.d?.__count || data.__count || (data.d?.results?.length) || 0;
                    console.log("✅ Direct count for " + sEntitySet + ":", iCount);
                    
                    this.getView().getModel(sCountModelName).setData({
                        count: iCount,
                        loading: false
                    });
                }.bind(this),
                error: function(xhr, status, error) {
                    console.error("❌ Direct count call failed for " + sEntitySet + ":", error);
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
            
            // Show welcome message with info about demo mode
            setTimeout(function() {
                MessageToast.show("🎉 Welcome to Quality Management Dashboard! (Demo Mode - SAP services unavailable)", {
                    duration: 4000,
                    width: "30em"
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
            console.log("🔄 Manual refresh triggered");
            MessageToast.show("🔄 Refreshing all data from SAP services...");
            
            // Reset loading state
            this._initializeLoadingState();
            
            // Force refresh all OData models
            this._refreshODataModels();
            
            // Wait a moment then reload data
            setTimeout(function() {
                this._waitForModelsAndLoadData();
            }.bind(this), 1000);
        },

        _refreshODataModels: function() {
            console.log("🔄 Refreshing OData models...");
            
            var oComponent = this.getOwnerComponent();
            var aModelNames = ["inspection", "result", "usage"];
            
            aModelNames.forEach(function(sModelName) {
                var oModel = oComponent.getModel(sModelName);
                if (oModel && oModel.refresh) {
                    console.log("🔄 Refreshing " + sModelName + " model");
                    oModel.refresh(true); // Force refresh
                }
            });
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
        },

        // Debug method to test all services
        onTestServices: function() {
            console.log("🧪 Testing all SAP services...");
            MessageToast.show("🧪 Testing SAP service connectivity...");
            
            var aServices = [
                {
                    name: "Inspection",
                    url: "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_INSPECT_PR_CDS/ZQM_INSPECT_PR?$format=json&$top=1"
                },
                {
                    name: "Result", 
                    url: "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_RESULT_PR_CDS/ZQM_RESULT_PR?$format=json&$top=1"
                },
                {
                    name: "Usage",
                    url: "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_US_PR_CDS/ZQM_US_PR?$format=json&$top=1"
                }
            ];
            
            var iCompleted = 0;
            var iSuccessful = 0;
            
            aServices.forEach(function(oService) {
                jQuery.ajax({
                    url: oService.url,
                    type: "GET",
                    timeout: 5000,
                    success: function(data) {
                        console.log("✅ " + oService.name + " service: OK");
                        iSuccessful++;
                    },
                    error: function(xhr, status, error) {
                        console.error("❌ " + oService.name + " service: " + error);
                    },
                    complete: function() {
                        iCompleted++;
                        if (iCompleted === aServices.length) {
                            var sMessage = "Service Test Complete: " + iSuccessful + "/" + aServices.length + " services working";
                            console.log("🎯 " + sMessage);
                            MessageToast.show(sMessage, { duration: 3000 });
                            
                            if (iSuccessful > 0) {
                                // At least one service is working, try to reload data
                                setTimeout(function() {
                                    this.onRefresh();
                                }.bind(this), 1000);
                            }
                        }
                    }.bind(this)
                });
            }.bind(this));
        }
    });
});
