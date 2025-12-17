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
            var oInspectionModel = new sap.ui.model.json.JSONModel({ count: 0 });
            var oResultModel = new sap.ui.model.json.JSONModel({ count: 0 });
            var oUsageModel = new sap.ui.model.json.JSONModel({ count: 0 });

            this.getView().setModel(oInspectionModel, "inspectionCount");
            this.getView().setModel(oResultModel, "resultCount");
            this.getView().setModel(oUsageModel, "usageCount");

            this._fetchCounts();
        },

        _fetchCounts: function () {
            var oComponent = this.getOwnerComponent();

            // Fetch Inspection Count
            var oInspectionService = oComponent.getModel("inspection");
            if (oInspectionService) {
                oInspectionService.read("/ZQM_INSPECT_PR", {
                    success: function (oData) {
                        this.getView().getModel("inspectionCount").setProperty("/count", oData.results.length);
                    }.bind(this),
                    error: function () {
                        console.error("Failed to fetch inspection count");
                    }
                });
            }

            // Fetch Result Count
            var oResultService = oComponent.getModel("result");
            if (oResultService) {
                oResultService.read("/ZQM_RESULT_PR", {
                    success: function (oData) {
                        this.getView().getModel("resultCount").setProperty("/count", oData.results.length);
                    }.bind(this),
                    error: function () {
                        console.error("Failed to fetch result count");
                    }
                });
            }

            // Fetch Usage Count
            var oUsageService = oComponent.getModel("usage");
            if (oUsageService) {
                oUsageService.read("/ZQM_US_PR", {
                    success: function (oData) {
                        this.getView().getModel("usageCount").setProperty("/count", oData.results.length);
                    }.bind(this),
                    error: function () {
                        console.error("Failed to fetch usage count");
                    }
                });
            }
        },

        onNavBack: function () {
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteLogin");
        },

        onSearch: function (oEvent) {
            var aFilters = [];
            var sQuery = oEvent.getSource().getValue();
            if (sQuery && sQuery.length > 0) {
                var filter = new sap.ui.model.Filter("InspectionLotNumber", sap.ui.model.FilterOperator.Contains, sQuery);
                aFilters.push(filter);
            }
            var oTable = this.byId("inspectionTable");
            var oBinding = oTable.getBinding("items");
            oBinding.filter(aFilters, "Application");
        },

        onTilePress: function () {
            // This tile represents the current view (Inspection Lots)
            // Can be used to refresh the table or counts if needed
            this._fetchCounts();
            this.getView().byId("inspectionTable").getBinding("items").refresh();
        },

        onResultRecordingPress: function () {
            // Navigate to Result Recording List or View
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteResultRecording");
        },

        onUsageDecisionPress: function () {
            // Navigate to Usage Decision View
            var oRouter = UIComponent.getRouterFor(this);
            oRouter.navTo("RouteUsageDecision");
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
