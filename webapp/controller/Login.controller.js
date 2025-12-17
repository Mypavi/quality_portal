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

            // Real OData authentication with the actual backend
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            var sPath = "/ZQM_LOG_PR(bname='" + sUserId + "',password='" + sPassword + "')";

            sap.ui.core.BusyIndicator.show();

            oAuthModel.read(sPath, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    if (oData && oData.bname) {
                        MessageToast.show("Login Successful! Welcome " + oData.bname);
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("RouteDashboard");
                    } else {
                        MessageToast.show("Invalid Credentials");
                    }
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    console.error("Login error:", oError);
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
