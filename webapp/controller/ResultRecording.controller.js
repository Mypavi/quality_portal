sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], function (Controller, UIComponent) {
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
            var sInspectionLot = oArgs ? oArgs.inspectionLot : null;

            var aFilters = [];

            if (sInspectionLot) {
                // Detail Mode: Specific Lot selected

                // 1. Filter the History Table
                aFilters.push(new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.EQ, sInspectionLot));

                // 2. Bind the Whole Page/Header to the Inspection Lot Context
                // Assuming standard OData V2 Key syntax: Entity('Key')
                var sPath = "/ZQM_INSPECT_PR('" + sInspectionLot + "')";
                this.getView().bindElement({
                    path: sPath,
                    model: "inspection",
                    events: {
                        change: function () {
                            // Optional: Check if binding failed
                        },
                        dataReceived: function () {
                            // Data Loaded
                        }
                    }
                });

                this.byId("resultPage").setTitle("Result Recording - Lot " + sInspectionLot);

            } else {
                // List Mode: No Specific Lot (Tile Click)
                // Show all results? or just empty? Let's show all for now.

                // Unbind the specific lot context so Header and Panel don't show stale or wrong data
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
        }
    });
});
