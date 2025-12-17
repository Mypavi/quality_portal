sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent"
], function (Controller, UIComponent) {
    "use strict";

    return Controller.extend("quality.controller.UsageDecision", {
        onInit: function () {
            // Initialization logic
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
        }
    });
});
