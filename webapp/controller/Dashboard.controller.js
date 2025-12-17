sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, UIComponent, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("quality.controller.Dashboard", {
        onInit: function () {
            // Initialize counts or other local data
            var oViewModel = new sap.ui.model.json.JSONModel({
                count: 0
            });
            this.getView().setModel(oViewModel, "inspectionCount");
            this.getView().setModel(oViewModel, "resultCount");
            this.getView().setModel(oViewModel, "usageCount");
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },

        onTilePress: function () {
            // For now just stay or filter
        },

        onResultRecordingPress: function () {
            // Navigate to Result Recording List or View
            // UIComponent.getRouterFor(this).navTo("RouteResultRecording"); 
        },

        onUsageDecisionPress: function () {
            // Navigate to Usage Decision View
            // UIComponent.getRouterFor(this).navTo("RouteUsageDecision");
        },

        onInspectionLotPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("inspection");
            var sPath = oContext.getPath();
            // sPath is like /ZQM_INSPECT_PR('...')
            // We might want to pass the ID to a detail page

            // var oRouter = UIComponent.getRouterFor(this);
            // oRouter.navTo("RouteInspectionDetail", {
            //    inspectionPath: encodeURIComponent(sPath.substr(1))
            // });
        }
    });
});
