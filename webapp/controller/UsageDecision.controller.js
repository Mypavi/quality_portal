sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, MessageToast, Filter, FilterOperator, JSONModel) {
    "use strict";

    return Controller.extend("quality.controller.UsageDecision", {
        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteUsageDecision").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteUsageDecisionList").attachPatternMatched(this._onRouteMatched, this);
            
            // Initialize local view model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                hasData: false,
                selectedLot: null,
                usageCount: 0
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            this._initializeModels();
        },

        _initializeModels: function () {
            var oComponent = this.getOwnerComponent();
            var oUsageModel = oComponent.getModel("usage");
            var oInspectionModel = oComponent.getModel("inspection");
            
            if (!oUsageModel) {
                console.error("Usage model not available");
                MessageToast.show("Usage service not available. Please check your connection.");
                return;
            }
            
            if (!oInspectionModel) {
                console.error("Inspection model not available");
                MessageToast.show("Inspection service not available. Please check your connection.");
                return;
            }

            // Set up success and error handlers
            oUsageModel.attachRequestCompleted(function (oEvent) {
                console.log("Usage model request completed successfully");
                this._updateUsageCount();
            }.bind(this));

            oUsageModel.attachRequestFailed(function (oEvent) {
                console.error("Usage model request failed:", oEvent.getParameters());
                MessageToast.show("Failed to load usage data");
                this.getView().getModel("viewModel").setProperty("/busy", false);
            }.bind(this));

            console.log("Usage models initialized successfully");
        },

        _updateUsageCount: function () {
            var oUsageModel = this.getView().getModel("usage");
            if (oUsageModel && oUsageModel.getProperty("/ZQM_US_PR")) {
                var aUsage = oUsageModel.getProperty("/ZQM_US_PR");
                this.getView().getModel("viewModel").setProperty("/usageCount", aUsage.length);
                this.getView().getModel("viewModel").setProperty("/hasData", aUsage.length > 0);
            }
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sKeyPredicate = oArgs ? oArgs.inspectionLot : null;
            var oViewModel = this.getView().getModel("viewModel");

            // Set busy state
            oViewModel.setProperty("/busy", true);

            if (sKeyPredicate) {
                // Detail Mode: Specific Lot selected
                var sRawID = sKeyPredicate.replace(/'/g, "");
                oViewModel.setProperty("/selectedLot", sRawID);
                
                this._bindInspectionLot(sRawID);
                this._loadUsageData(sRawID);
                this.byId("usagePage").setTitle("Usage Decision - Lot " + sRawID);
            } else {
                // List Mode: No Specific Lot (Tile Click)
                oViewModel.setProperty("/selectedLot", null);
                this.getView().unbindElement("inspection");
                this._loadUsageData();
                this.byId("usagePage").setTitle("Usage Decision - All Lots");
            }
        },

        _bindInspectionLot: function (sLotNumber) {
            var oModel = this.getView().getModel("inspection");
            var sPath = "";

            if (oModel && oModel.createKey) {
                // OData Model
                sPath = "/ZQM_INSPECT_PR('" + sLotNumber + "')";
            } else if (oModel) {
                // JSON Model - find by lot number
                var aData = oModel.getProperty("/ZQM_INSPECT_PR");
                if (aData) {
                    for (var i = 0; i < aData.length; i++) {
                        if (aData[i].InspectionLotNumber === sLotNumber) {
                            sPath = "/ZQM_INSPECT_PR/" + i;
                            break;
                        }
                    }
                }
            }

            if (sPath) {
                this.getView().bindElement({
                    path: sPath,
                    model: "inspection"
                });
            } else {
                MessageToast.show("Inspection Lot " + sLotNumber + " not found.");
            }
        },

        _loadUsageData: function (sLotNumber) {
            var oUsageModel = this.getView().getModel("usage");
            var oViewModel = this.getView().getModel("viewModel");
            
            if (!oUsageModel) {
                console.error("Usage model not found");
                MessageToast.show("Usage service not available");
                oViewModel.setProperty("/busy", false);
                return;
            }

            // Create filters if specific lot is selected
            var aFilters = [];
            if (sLotNumber) {
                aFilters.push(new Filter("InspectionLotNumber", FilterOperator.EQ, sLotNumber));
            }

            // Force data refresh from server
            console.log("Loading usage data for lot:", sLotNumber || "All");
            oViewModel.setProperty("/busy", true);
            
            // For OData models, we need to read the data explicitly
            if (oUsageModel.read) {
                var sPath = "/ZQM_US_PR";
                var mParameters = {
                    success: function (oData) {
                        console.log("Usage data loaded successfully:", oData);
                        oViewModel.setProperty("/busy", false);
                        
                        // Filter data if needed
                        var aUsage = oData.results || [];
                        if (sLotNumber) {
                            aUsage = aUsage.filter(function(item) {
                                return item.InspectionLotNumber === sLotNumber;
                            });
                        }
                        
                        oViewModel.setProperty("/hasData", aUsage.length > 0);
                        oViewModel.setProperty("/usageCount", aUsage.length);
                        
                        // Force refresh the table binding
                        this._forceTableRefresh(aFilters);
                        
                        if (aUsage.length === 0 && sLotNumber) {
                            MessageToast.show("No usage decisions found for lot " + sLotNumber);
                        } else if (aUsage.length === 0) {
                            MessageToast.show("No usage decision data available");
                        } else {
                            MessageToast.show("Loaded " + aUsage.length + " usage decision records");
                        }
                    }.bind(this),
                    error: function (oError) {
                        console.error("Failed to load usage data:", oError);
                        MessageToast.show("Failed to load usage data. Please check your connection.");
                        oViewModel.setProperty("/busy", false);
                        oViewModel.setProperty("/hasData", false);
                        oViewModel.setProperty("/usageCount", 0);
                    }.bind(this)
                };

                // Add filters to parameters if any
                if (aFilters.length > 0) {
                    mParameters.filters = aFilters;
                }

                oUsageModel.read(sPath, mParameters);
            } else {
                // For JSON models, just update the binding
                this._forceTableRefresh(aFilters);
                oViewModel.setProperty("/busy", false);
                this._updateUsageCount();
            }
        },

        _forceTableRefresh: function (aFilters) {
            var oTable = this.byId("usageTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                // Apply filters and refresh
                oBinding.filter(aFilters || []);
                oBinding.refresh(true); // Force refresh
            } else {
                // Rebind the table if no binding exists
                oTable.bindItems({
                    path: "usage>/ZQM_US_PR",
                    template: this._getTableTemplate(),
                    filters: aFilters || []
                });
            }
        },

        _getTableTemplate: function () {
            // Create table row template if it doesn't exist
            return new sap.m.ColumnListItem({
                cells: [
                    new sap.m.ObjectIdentifier({
                        title: "{usage>InspectionLotNumber}",
                        class: "lotIdentifier"
                    }),
                    new sap.m.Text({
                        text: "{usage>Plant}",
                        class: "cellText"
                    }),
                    new sap.m.ObjectNumber({
                        number: "{usage>LotQuantity}",
                        class: "quantityNumber"
                    }),
                    new sap.m.ObjectNumber({
                        number: "{usage>InspectedQuantity}",
                        class: "quantityNumber"
                    }),
                    new sap.m.ObjectStatus({
                        text: {
                            path: "usage>UsageDecisionCode",
                            formatter: this.formatDecisionText.bind(this)
                        },
                        state: {
                            path: "usage>UsageDecisionCode",
                            formatter: this.formatDecisionState.bind(this)
                        },
                        class: "decisionStatus"
                    }),
                    new sap.m.ObjectStatus({
                        text: "{usage>DecisionStatus}",
                        state: {
                            path: "usage>DecisionStatus",
                            formatter: this.formatStatusState.bind(this)
                        },
                        class: "statusIndicator"
                    }),
                    new sap.m.Text({
                        text: "{usage>DecisionMessage}",
                        class: "cellText"
                    })
                ],
                press: this.onUsagePress.bind(this),
                class: "usageRow"
            });
        },

        onRefreshData: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var sSelectedLot = oViewModel.getProperty("/selectedLot");
            
            MessageToast.show("Refreshing data...");
            
            // Force refresh all models
            var oUsageModel = this.getView().getModel("usage");
            var oInspectionModel = this.getView().getModel("inspection");
            
            if (oUsageModel && oUsageModel.refresh) {
                oUsageModel.refresh(true);
            }
            
            if (oInspectionModel && oInspectionModel.refresh) {
                oInspectionModel.refresh(true);
            }
            
            // Reload data
            this._loadUsageData(sSelectedLot);
            
            // Refresh inspection data if specific lot is selected
            if (sSelectedLot) {
                this._bindInspectionLot(sSelectedLot);
            }
        },

        // Debug method to test data fetching
        onTestDataFetch: function () {
            var oUsageModel = this.getView().getModel("usage");
            
            if (!oUsageModel) {
                MessageToast.show("Usage model not available");
                return;
            }

            console.log("Testing direct OData call...");
            MessageToast.show("Testing usage data fetch...");

            // Test direct URL call with actual backend
            jQuery.ajax({
                url: "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_US_PR_CDS/ZQM_US_PR?$format=json",
                type: "GET",
                success: function (data) {
                    console.log("Direct AJAX call successful:", data);
                    MessageToast.show("Direct call successful: " + (data.d?.results?.length || 0) + " records");
                },
                error: function (oError) {
                    console.error("Direct AJAX call failed:", oError);
                    MessageToast.show("Direct call failed: " + oError.statusText);
                }
            });

            // Test OData model call
            oUsageModel.read("/ZQM_US_PR", {
                success: function (oData) {
                    console.log("OData model call successful:", oData);
                    MessageToast.show("OData call successful: " + (oData.results?.length || 0) + " records");
                },
                error: function (oError) {
                    console.error("OData model call failed:", oError);
                    MessageToast.show("OData call failed");
                }
            });
        },

        formatDecisionText: function (sCode) {
            if (sCode === 'A') {
                return "Approved";
            } else if (sCode === 'R' || sCode === 'R2') {
                return "Rejected";
            } else if (sCode) {
                return "Decision Made (" + sCode + ")";
            }
            return "Pending";
        },

        formatDecisionState: function (sCode) {
            if (sCode === 'A') {
                return "Success"; // Green
            } else if (sCode === 'R' || sCode === 'R2') {
                return "Error"; // Red
            } else if (sCode) {
                return "Warning";
            }
            return "None"; // Pending
        },

        formatStatusState: function (sStatus) {
            if (sStatus === "Allowed") {
                return "Success";
            } else if (sStatus === "Blocked") {
                return "Error";
            }
            return "Warning";
        },

        onUsagePress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("usage");
            if (oContext) {
                var sLotNumber = oContext.getProperty("InspectionLotNumber");
                MessageToast.show("Selected usage decision for lot: " + sLotNumber);
                // Optional: Navigate to detailed view or show popup
            }
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDashboard");
        },

        onSearch: function (oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new Filter("InspectionLotNumber", FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }
            var oList = this.byId("usageTable");
            var oBinding = oList.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        formatValidationStatus: function (fLotQty, fInspectedQty) {
            if (parseFloat(fLotQty) !== parseFloat(fInspectedQty)) {
                return "Error";
            }
            return "Success";
        },

        formatValidationText: function (fLotQty, fInspectedQty) {
            if (parseFloat(fLotQty) !== parseFloat(fInspectedQty)) {
                return "Pending (Qty Mismatch)";
            }
            return "Ready for Decision";
        },

        formatNoDataVisible: function (bHasData, bBusy) {
            return !bHasData && !bBusy;
        }
    });
});
