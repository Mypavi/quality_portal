sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (Controller, UIComponent, MessageToast, MessageBox, Filter, FilterOperator, JSONModel) {
    "use strict";

    return Controller.extend("quality.controller.ResultRecording", {
        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteResultRecording").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteResultRecordingList").attachPatternMatched(this._onRouteMatched, this);
            
            // Initialize local view model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                hasData: false,
                selectedLot: null,
                resultCount: 0
            });
            this.getView().setModel(oViewModel, "viewModel");
            
            this._initializeModels();
        },

        _initializeModels: function () {
            var oComponent = this.getOwnerComponent();
            var oResultModel = oComponent.getModel("result");
            var oInspectionModel = oComponent.getModel("inspection");
            
            if (!oResultModel) {
                console.error("Result model not available");
                MessageToast.show("Result service not available. Please check your connection.");
                return;
            }
            
            if (!oInspectionModel) {
                console.error("Inspection model not available");
                MessageToast.show("Inspection service not available. Please check your connection.");
                return;
            }

            // Set up success and error handlers
            oResultModel.attachRequestCompleted(function (oEvent) {
                console.log("Result model request completed successfully");
                this._updateResultCount();
            }.bind(this));

            oResultModel.attachRequestFailed(function (oEvent) {
                console.error("Result model request failed:", oEvent.getParameters());
                MessageToast.show("Failed to load result data");
                this.getView().getModel("viewModel").setProperty("/busy", false);
            }.bind(this));

            console.log("Models initialized successfully");
        },

        _updateResultCount: function () {
            var oResultModel = this.getView().getModel("result");
            if (oResultModel && oResultModel.getProperty("/ZQM_RESULT_PR")) {
                var aResults = oResultModel.getProperty("/ZQM_RESULT_PR");
                this.getView().getModel("viewModel").setProperty("/resultCount", aResults.length);
                this.getView().getModel("viewModel").setProperty("/hasData", aResults.length > 0);
            }
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sKeyPredicate = oArgs ? oArgs.inspectionLot : null;
            var oViewModel = this.getView().getModel("viewModel");

            // Set busy state
            oViewModel.setProperty("/busy", true);

            // Clear inputs when entering a new lot or reloading
            this._clearInputs();

            if (sKeyPredicate) {
                // Detail Mode: Specific Lot selected
                var sRawID = sKeyPredicate.replace(/'/g, "");
                oViewModel.setProperty("/selectedLot", sRawID);
                
                this._bindInspectionLot(sRawID);
                this._loadResultData(sRawID);
                this.byId("resultPage").setTitle("Result Recording - Lot " + sRawID);
            } else {
                // List Mode: No Specific Lot (Tile Click)
                oViewModel.setProperty("/selectedLot", null);
                this.getView().unbindElement("inspection");
                this._loadResultData();
                this.byId("resultPage").setTitle("Result Recording - All Lots");
            }
        },

        _clearInputs: function () {
            if (this.byId("inputUnrestricted")) this.byId("inputUnrestricted").setValue("");
            if (this.byId("inputBlocked")) this.byId("inputBlocked").setValue("");
            if (this.byId("inputProduction")) this.byId("inputProduction").setValue("");
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

        _loadResultData: function (sLotNumber) {
            var oResultModel = this.getView().getModel("result");
            var oViewModel = this.getView().getModel("viewModel");
            
            if (!oResultModel) {
                console.error("Result model not found");
                MessageToast.show("Result service not available");
                oViewModel.setProperty("/busy", false);
                return;
            }

            // Create filters if specific lot is selected
            var aFilters = [];
            if (sLotNumber) {
                aFilters.push(new Filter("InspectionLotNumber", FilterOperator.EQ, sLotNumber));
            }

            // Force data refresh from server
            console.log("Loading result data for lot:", sLotNumber || "All");
            oViewModel.setProperty("/busy", true);
            
            // For OData models, we need to read the data explicitly
            if (oResultModel.read) {
                var sPath = "/ZQM_RESULT_PR";
                var mParameters = {
                    success: function (oData) {
                        console.log("Result data loaded successfully:", oData);
                        oViewModel.setProperty("/busy", false);
                        
                        // Filter data if needed
                        var aResults = oData.results || [];
                        if (sLotNumber) {
                            aResults = aResults.filter(function(item) {
                                return item.InspectionLotNumber === sLotNumber;
                            });
                        }
                        
                        oViewModel.setProperty("/hasData", aResults.length > 0);
                        oViewModel.setProperty("/resultCount", aResults.length);
                        
                        // Force refresh the table binding
                        this._forceTableRefresh(aFilters);
                        
                        if (aResults.length === 0 && sLotNumber) {
                            MessageToast.show("No results found for lot " + sLotNumber);
                        } else if (aResults.length === 0) {
                            MessageToast.show("No result data available");
                        } else {
                            MessageToast.show("Loaded " + aResults.length + " result records");
                        }
                    }.bind(this),
                    error: function (oError) {
                        console.error("Failed to load result data:", oError);
                        MessageToast.show("Failed to load result data. Please check your connection.");
                        oViewModel.setProperty("/busy", false);
                        oViewModel.setProperty("/hasData", false);
                        oViewModel.setProperty("/resultCount", 0);
                    }.bind(this)
                };

                // Add filters to parameters if any
                if (aFilters.length > 0) {
                    mParameters.filters = aFilters;
                }

                oResultModel.read(sPath, mParameters);
            } else {
                // For JSON models, just update the binding
                this._forceTableRefresh(aFilters);
                oViewModel.setProperty("/busy", false);
                this._updateResultCount();
            }
        },

        _forceTableRefresh: function (aFilters) {
            var oTable = this.byId("resultTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                // Apply filters and refresh
                oBinding.filter(aFilters || []);
                oBinding.refresh(true); // Force refresh
            } else {
                // Rebind the table if no binding exists
                oTable.bindItems({
                    path: "result>/ZQM_RESULT_PR",
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
                        title: "{result>InspectionLotNumber}",
                        class: "lotIdentifier"
                    }),
                    new sap.m.Text({
                        text: "{result>PlantCode}",
                        class: "cellText"
                    }),
                    new sap.m.Text({
                        text: "{result>InspectorName}",
                        class: "cellText"
                    }),
                    new sap.m.Text({
                        text: {
                            path: "result>RecordedDate",
                            type: "sap.ui.model.type.Date",
                            formatOptions: { style: "medium" }
                        },
                        class: "cellText"
                    }),
                    new sap.m.ObjectStatus({
                        text: "{result>ResultCategory}",
                        state: {
                            path: "result>ResultCategory",
                            formatter: this.formatCategoryState.bind(this)
                        },
                        class: "categoryStatus"
                    }),
                    new sap.m.ObjectNumber({
                        number: "{result>StockCode}",
                        class: "quantityNumber"
                    }),
                    new sap.m.ObjectStatus({
                        text: {
                            path: "result>UsageDecisionCode",
                            formatter: this.formatUDText.bind(this)
                        },
                        state: {
                            path: "result>UsageDecisionCode",
                            formatter: this.formatUDState.bind(this)
                        },
                        icon: "{= ${result>UsageDecisionCode} ? 'sap-icon://accept' : 'sap-icon://pending' }",
                        class: "statusIndicator"
                    })
                ],
                press: this.onResultPress.bind(this),
                class: "resultRow"
            });
        },

        _updateTableBinding: function (aFilters) {
            var oTable = this.byId("resultTable");
            var oBinding = oTable.getBinding("items");
            
            if (oBinding) {
                oBinding.filter(aFilters || []);
                oBinding.refresh();
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
            var oTable = this.byId("resultTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onSaveResult: function () {
            var oView = this.getView();
            var oCtx = oView.getBindingContext("inspection");
            if (!oCtx) {
                MessageToast.show("No Inspection Lot selected.");
                return;
            }

            // Get Inputs
            var nUnrestricted = parseFloat(this.byId("inputUnrestricted").getValue()) || 0;
            var nBlocked = parseFloat(this.byId("inputBlocked").getValue()) || 0;
            var nProduction = parseFloat(this.byId("inputProduction").getValue()) || 0;
            var nTotal = nUnrestricted + nBlocked + nProduction;

            if (nTotal <= 0) {
                MessageToast.show("Please enter a valid quantity.");
                return;
            }

            var nActual = parseFloat(oCtx.getProperty("ActualQuantity")) || 0;
            var nInspected = parseFloat(oCtx.getProperty("InspectedQuantity")) || 0;

            if (nInspected + nTotal > nActual) {
                MessageToast.show("Error: Total recorded quantity cannot exceed Lot quantity. Remaining: " + (nActual - nInspected).toFixed(3));
                return;
            }

            // Update Inspected Quantity in Inspection Model
            var oInspModel = oCtx.getModel();
            oInspModel.setProperty(oCtx.getPath() + "/InspectedQuantity", (nInspected + nTotal).toFixed(3));

            // Create Entries in Result Model (History)
            var sLot = oCtx.getProperty("InspectionLotNumber");
            var oResultModel = oView.getModel("result");
            var sPlant = oCtx.getProperty("Plant");
            var that = this;

            // Counter for tracking async operations
            var iOperationsCount = 0;
            var iCompletedOperations = 0;

            // Helper to create entry
            var createRecord = function (sCategory, nQty) {
                iOperationsCount++;
                var oData = {
                    InspectionLotNumber: sLot,
                    ResultCategory: sCategory,
                    StockCode: nQty.toString(),
                    PlantCode: sPlant,
                    InspectorName: "TRAINEE",
                    RecordedDate: new Date(),
                    UsageDecisionCode: oCtx.getProperty("UsageDecisionCode") || "",
                    RecordingStatus: "View Only"
                };
                
                oResultModel.create("/ZQM_RESULT_PR", oData, {
                    success: function () {
                        iCompletedOperations++;
                        that._checkOperationsComplete(iOperationsCount, iCompletedOperations, sLot);
                    },
                    error: function (oError) {
                        console.error("Error creating result record:", oError);
                        iCompletedOperations++;
                        that._checkOperationsComplete(iOperationsCount, iCompletedOperations, sLot);
                    }
                });
            };

            if (nUnrestricted > 0) createRecord("Unrestricted Stock", nUnrestricted);
            if (nBlocked > 0) createRecord("Block Stock", nBlocked);
            if (nProduction > 0) createRecord("Production Stock", nProduction);

            // If no records to create, show message immediately
            if (iOperationsCount === 0) {
                MessageToast.show("No quantities entered to save.");
                return;
            }

            MessageToast.show("Saving results...");

            // Clear Inputs
            this.byId("inputUnrestricted").setValue("");
            this.byId("inputBlocked").setValue("");
            this.byId("inputProduction").setValue("");
        },

        _checkOperationsComplete: function (iTotal, iCompleted, sLot) {
            if (iCompleted === iTotal) {
                MessageToast.show("Results saved successfully!");
                
                // Refresh the result table to show new entries
                this._forceTableRefresh([new Filter("InspectionLotNumber", FilterOperator.EQ, sLot)]);
                
                // Check if all quantity is recorded and navigate to usage decision
                var oCtx = this.getView().getBindingContext("inspection");
                if (oCtx) {
                    var nActual = parseFloat(oCtx.getProperty("ActualQuantity")) || 0;
                    var nInspected = parseFloat(oCtx.getProperty("InspectedQuantity")) || 0;
                    
                    if (nInspected >= nActual) {
                        this._navigateToUsageDecision(sLot);
                    }
                }
            }
        },

        _navigateToUsageDecision: function (sLot) {
            sap.m.MessageBox.confirm(
                "All quantities have been recorded for this lot. Would you like to proceed to Usage Decision?",
                {
                    title: "Recording Complete",
                    onClose: function (oAction) {
                        if (oAction === sap.m.MessageBox.Action.OK) {
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            oRouter.navTo("RouteUsageDecision", {
                                inspectionLot: sLot
                            });
                        }
                    }.bind(this)
                }
            );
        },

        onAcceptPress: function () {
            // Simulate Acceptance
            MessageToast.show("Inspection Lot Accepted");

            // In a real app, we would call the OData service to update the status.
            // For now, we update the model locally to reflect the change visually.
            var oCtx = this.getView().getBindingContext("inspection");
            if (oCtx) {
                var oModel = oCtx.getModel();
                oModel.setProperty(oCtx.getPath() + "/UsageDecisionCode", "A");
                oModel.setProperty(oCtx.getPath() + "/UsageDecisionStatus", "Decision Made");
            }
        },

        onRejectPress: function () {
            // Simulate Rejection
            MessageToast.show("Inspection Lot Rejected");

            var oCtx = this.getView().getBindingContext("inspection");
            if (oCtx) {
                var oModel = oCtx.getModel();
                oModel.setProperty(oCtx.getPath() + "/UsageDecisionCode", "R");
                oModel.setProperty(oCtx.getPath() + "/UsageDecisionStatus", "Decision Made");
                
                // Navigate to Usage Decision for further processing
                var sLot = oCtx.getProperty("InspectionLotNumber");
                this._navigateToUsageDecision(sLot);
            }
        },

        onProceedToUsageDecision: function () {
            var oCtx = this.getView().getBindingContext("inspection");
            if (!oCtx) {
                MessageToast.show("No Inspection Lot selected.");
                return;
            }

            var sLot = oCtx.getProperty("InspectionLotNumber");
            var nActual = parseFloat(oCtx.getProperty("ActualQuantity")) || 0;
            var nInspected = parseFloat(oCtx.getProperty("InspectedQuantity")) || 0;

            if (nInspected < nActual) {
                sap.m.MessageBox.warning(
                    "Not all quantities have been recorded yet. Recorded: " + nInspected + " / " + nActual + ". Do you still want to proceed to Usage Decision?",
                    {
                        title: "Incomplete Recording",
                        actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                        onClose: function (oAction) {
                            if (oAction === sap.m.MessageBox.Action.YES) {
                                this._navigateToUsageDecision(sLot);
                            }
                        }.bind(this)
                    }
                );
            } else {
                this._navigateToUsageDecision(sLot);
            }
        },

        formatCategoryState: function (sCategory) {
            if (sCategory === "Unrestricted Stock") {
                return "Success";
            } else if (sCategory === "Block Stock") {
                return "Error";
            } else if (sCategory === "Production Stock") {
                return "Warning";
            }
            return "None";
        },

        formatEditable: function (sUsageDecisionCode) {
            // Case 1: If usage decision is taken (Code exists), cannot record.
            // Returning false if code exists, true otherwise.
            return !sUsageDecisionCode;
        },

        formatUDState: function (sCode) {
            if (sCode === 'A') {
                return "Success"; // Green
            } else if (sCode === 'R' || sCode === 'R2') {
                return "Error"; // Red
            } else if (sCode) {
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

        formatVisible: function (sValue) {
            return !!sValue;
        },

        formatNotDecided: function (sCode) {
            return !sCode;
        },

        formatEntryVisible: function (sLotNumber, sDecisionCode) {
            return !!sLotNumber && !sDecisionCode;
        },

        formatNoDataVisible: function (bHasData, bBusy) {
            return !bHasData && !bBusy;
        },

        formatProgress: function (nInspected, nActual) {
            if (!nActual || nActual === 0) return 0;
            return Math.min((parseFloat(nInspected) / parseFloat(nActual)) * 100, 100);
        },

        formatProgressText: function (nInspected, nActual) {
            if (!nActual || nActual === 0) return "0%";
            var nPercent = Math.min((parseFloat(nInspected) / parseFloat(nActual)) * 100, 100);
            return Math.round(nPercent) + "%";
        },

        onRefreshData: function () {
            var oViewModel = this.getView().getModel("viewModel");
            var sSelectedLot = oViewModel.getProperty("/selectedLot");
            
            MessageToast.show("Refreshing data...");
            
            // Force refresh all models
            var oResultModel = this.getView().getModel("result");
            var oInspectionModel = this.getView().getModel("inspection");
            
            if (oResultModel && oResultModel.refresh) {
                oResultModel.refresh(true);
            }
            
            if (oInspectionModel && oInspectionModel.refresh) {
                oInspectionModel.refresh(true);
            }
            
            // Reload data
            this._loadResultData(sSelectedLot);
            
            // Refresh inspection data if specific lot is selected
            if (sSelectedLot) {
                this._bindInspectionLot(sSelectedLot);
            }
        },

        onInputChange: function () {
            // Optional: Add real-time validation or calculations
            var nUnrestricted = parseFloat(this.byId("inputUnrestricted").getValue()) || 0;
            var nBlocked = parseFloat(this.byId("inputBlocked").getValue()) || 0;
            var nProduction = parseFloat(this.byId("inputProduction").getValue()) || 0;
            var nTotal = nUnrestricted + nBlocked + nProduction;
            
            // You can add validation logic here
            console.log("Total quantity entered:", nTotal);
        },

        onResultPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("result");
            if (oContext) {
                var sLotNumber = oContext.getProperty("InspectionLotNumber");
                MessageToast.show("Selected result for lot: " + sLotNumber);
                // Optional: Navigate to detailed view or show popup
            }
        },

        // Debug method to test data fetching
        onTestDataFetch: function () {
            var oResultModel = this.getView().getModel("result");
            
            if (!oResultModel) {
                MessageToast.show("Result model not available");
                return;
            }

            console.log("Testing direct OData call...");
            MessageToast.show("Testing data fetch...");

            // Test direct URL call with actual backend
            jQuery.ajax({
                url: "http://172.17.19.24:8000/sap/opu/odata/sap/ZQM_RESULT_PR_CDS/ZQM_RESULT_PR?$format=json",
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
            oResultModel.read("/ZQM_RESULT_PR", {
                success: function (oData) {
                    console.log("OData model call successful:", oData);
                    MessageToast.show("OData call successful: " + (oData.results?.length || 0) + " records");
                },
                error: function (oError) {
                    console.error("OData model call failed:", oError);
                    MessageToast.show("OData call failed");
                }
            });
        }
    });
});
