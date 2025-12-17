sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },

        /**
         * Create authentication model
         */
        createAuthModel: function () {
            var oModel = new JSONModel({
                username: "",
                password: "",
                isAuthenticated: false,
                currentUser: null
            });
            return oModel;
        },

        /**
         * Create dashboard model
         */
        createDashboardModel: function () {
            var oModel = new JSONModel({
                counts: {
                    totalInspections: 0,
                    pendingInspections: 0,
                    completedInspections: 0,
                    totalResults: 0,
                    totalUsageDecisions: 0
                },
                inspectionLots: [],
                isLoading: false,
                lastUpdated: null
            });
            return oModel;
        },

        /**
         * Create result recording model
         */
        createResultModel: function () {
            var oModel = new JSONModel({
                selectedLot: null,
                results: [],
                newResult: {
                    InspectionLotNumber: "",
                    PlantCode: "",
                    InspectorName: "",
                    RecordedDate: new Date(),
                    UsageDecisionCode: "",
                    StockCode: "",
                    ResultCategory: "",
                    RecordingStatus: "Active"
                },
                isLoading: false,
                isEditing: false
            });
            return oModel;
        },

        /**
         * Create usage decision model
         */
        createUsageModel: function () {
            var oModel = new JSONModel({
                usageDecisions: [],
                selectedDecision: null,
                filters: {
                    plant: "",
                    status: "",
                    lotNumber: ""
                },
                isLoading: false
            });
            return oModel;
        }

    };
});