sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], function (Controller, UIComponent) {
    "use strict";

    return Controller.extend("quality.controller.ResultRecording", {
        onInit: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteResultRecording").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sInspectionLot = oEvent.getParameter("arguments").inspectionLot;

            // Filter the table based on the passed Inspection Lot Number
            var aFilters = [];
            if (sInspectionLot) {
                // If it's a direct navigation with an ID, filter by it
                // Note: The main table shows results. 
                // We assume ZQM_RESULT_PR has InspectionLotNumber.
                aFilters.push(new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.EQ, sInspectionLot));

                // Also set the title or header to show which lot we are viewing
                this.byId("resultPage").setTitle("Result Recording - Lot " + sInspectionLot);
            } else {
                this.byId("resultPage").setTitle("Result Recording");
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
