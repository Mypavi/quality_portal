sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("quality.controller.Login", {
        onInit: function () {
            // Local model for login form inputs
            var oModel = new sap.ui.model.json.JSONModel({
                userId: "",
                password: ""
            });
            this.getView().setModel(oModel, "login");
        },

        onInputChange: function () {
            // Optional: Add real-time validation or UI updates
            var oLoginModel = this.getView().getModel("login");
            var sUserId = oLoginModel.getProperty("/userId");
            var sPassword = oLoginModel.getProperty("/password");
            
            // You can add validation logic here
            console.log("Input changed - UserId:", sUserId, "Password:", sPassword ? "***" : "");
        },

        onLoginPress: function () {
            var oLoginModel = this.getView().getModel("login");
            var sUserId = oLoginModel.getProperty("/userId");
            var sPassword = oLoginModel.getProperty("/password");

            if (!sUserId || !sPassword) {
                MessageToast.show("Please enter both User ID and Password.");
                return;
            }

            // Call the OData service for authentication
            // URL: /sap/opu/odata/sap/ZQM_LOG_PR_CDS/ZQM_LOG_PR(bname='...',password='...')
            
            // Using the 'auth' model defined in manifest
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var sPath = "/ZQM_LOG_PR(bname='" + sUserId + "',password='" + sPassword + "')";

            sap.ui.core.BusyIndicator.show();

            oAuthModel.read(sPath, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    // Check if data returned is valid (though success usually means it exists)
                    // The XML response shows <id>...ZQM_LOG_PR...</id> so likely it returns the entity if found.
                    // If credentials were wrong, it might return empty or error. 
                    // Assuming success callback means valid credentials based on standard OData read.
                    // We might need to check properties if the backend returns 200 even for invalid with a status field, 
                    // but the URL constraints suggest it fetches a specific record.
                    
                    if (oData) {
                        MessageToast.show("Login Successful! Welcome to Quality Management System");
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("RouteDashboard");
                    } else {
                         MessageToast.show("Invalid Credentials");
                    }
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    // Parse error message
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        MessageToast.show(oErrorResponse.error.message.value);
                    } catch (e) {
                         MessageToast.show("Login Failed. Please check your credentials and try again.");
                    }
                }
            });
        }
    });
});
