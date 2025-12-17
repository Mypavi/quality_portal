sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("quality.controller.Login", {
        onInit: function () {
            // Local model for login form inputs
            var oModel = new JSONModel({
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

        formatLoginEnabled: function (sUserId, sPassword) {
            // Ensure we always return a boolean, never undefined or empty string
            if (!sUserId || !sPassword) {
                return false;
            }
            return !!(sUserId.trim() && sPassword.trim());
        },

        onLoginPress: function () {
            var oLoginModel = this.getView().getModel("login");
            var sUserId = oLoginModel.getProperty("/userId");
            var sPassword = oLoginModel.getProperty("/password");

            if (!sUserId || !sPassword) {
                MessageToast.show("Please enter both User ID and Password.");
                return;
            }

            // For testing purposes, allow any non-empty credentials
            // In production, uncomment the OData authentication below
            
            MessageToast.show("Login Successful! Welcome to Quality Management System");
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteDashboard");
            
            /* 
            // Uncomment for production OData authentication
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var sPath = "/ZQM_LOG_PR(bname='" + sUserId + "',password='" + sPassword + "')";

            sap.ui.core.BusyIndicator.show();

            oAuthModel.read(sPath, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
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
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        MessageToast.show(oErrorResponse.error.message.value);
                    } catch (e) {
                         MessageToast.show("Login Failed. Please check your credentials and try again.");
                    }
                }
            });
            */
        }
    });
});
