sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast"
], function (Controller, UIComponent, MessageToast) {
    "use strict";

    return Controller.extend("quality.controller.ResultRecording", {
        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            // Attach to both routes: Detail (with ID) and List (generic)
            oRouter.getRoute("RouteResultRecording").attachPatternMatched(this._onRouteMatched, this);
            oRouter.getRoute("RouteResultRecordingList").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var sKeyPredicate = oArgs ? oArgs.inspectionLot : null;

            // Clear inputs when entering a new lot or reloading
            if (this.byId("inputUnrestricted")) this.byId("inputUnrestricted").setValue("");
            if (this.byId("inputBlocked")) this.byId("inputBlocked").setValue("");
            if (this.byId("inputProduction")) this.byId("inputProduction").setValue("");

            var aFilters = [];

            if (sKeyPredicate) {
                // Detail Mode: Specific Lot selected
                var sRawID = sKeyPredicate.replace(/'/g, "");

                // 1. Filter the History Table
                aFilters.push(new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.EQ, sRawID));

                // 2. Determine Binding Path
                // Check if the model supports Key Predicates (OData) or needs Array Access (JSON)
                var oModel = this.getView().getModel("inspection");
                var sPath = "";

                if (oModel.createKey) {
                    // OData Model
                    sPath = "/ZQM_INSPECT_PR('" + sRawID + "')";
                } else {
                    // JSON Model (Client Side) - We must find the index
                    var aData = oModel.getProperty("/ZQM_INSPECT_PR");
                    if (aData) {
                        for (var i = 0; i < aData.length; i++) {
                            if (aData[i].InspectionLotNumber === sRawID) {
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
                    this.byId("resultPage").setTitle("Result Recording - Lot " + sRawID);
                } else {
                    MessageToast.show("Inspection Lot " + sRawID + " not found.");
                }

            } else {
                // List Mode: No Specific Lot (Tile Click)
                this.getView().unbindElement("inspection");
                this.byId("resultPage").setTitle("Result Recording - All");
            }

            var oTable = this.byId("resultTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
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
                var filter = new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.Contains, sQuery);
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

            // Helper to create entry
            var createRecord = function (sCategory, nQty) {
                var oData = {
                    InspectionLotNumber: sLot,
                    ResultCategory: sCategory,
                    StockCode: nQty.toString(), // Using StockCode to store Quantity as String due to metadata assumption
                    PlantCode: sPlant,
                    InspectorName: "Engineer",
                    RecordedDate: new Date(),
                    UsageDecisionCode: ""
                };
                oResultModel.create("/ZQM_RESULT_PR", oData, {
                    success: function () { },
                    error: function () { }
                });
            };

            if (nUnrestricted > 0) createRecord("Unrestricted Stock", nUnrestricted);
            if (nBlocked > 0) createRecord("Block Stock", nBlocked);
            if (nProduction > 0) createRecord("Production Stock", nProduction);

            MessageToast.show("Results Saved. Progress Updated.");

            // Clear Inputs
            this.byId("inputUnrestricted").setValue("");
            this.byId("inputBlocked").setValue("");
            this.byId("inputProduction").setValue("");
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
        }
    });
});
