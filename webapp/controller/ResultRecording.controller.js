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
            var sKeyPredicate = oArgs ? oArgs.inspectionLot : null;

            var aFilters = [];

            if (sKeyPredicate) {
                // Detail Mode: Specific Lot selected
                // sKeyPredicate might be '5000000010' (with quotes, from Dashboard)
                // Extract raw ID for filtering the table (which relies on property value)
                var sRawID = sKeyPredicate.replace(/'/g, "");

                // 1. Filter the History Table
                // Note: The main table shows results (ZQM_RESULT_PR).
                // Ensure the InspectionLotNumber column matches this ID exactly.
                aFilters.push(new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.EQ, sRawID));

                // 2. Bind the Whole Page/Header to the Inspection Lot Context
                // Use the predicate exactly as passed from Dashboard (matches cache key e.g. '123')
                var sPath = "/ZQM_INSPECT_PR(" + sKeyPredicate + ")";

                this.getView().bindElement({
                    path: sPath,
                    model: "inspection"
                });

                this.byId("resultPage").setTitle("Result Recording - Lot " + sRawID);

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

        onAcceptPress: function () {
            // Simulate Acceptance
            sap.m.MessageToast.show("Inspection Lot Accepted");

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
            sap.m.MessageToast.show("Inspection Lot Rejected");

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
        }
    });
});
