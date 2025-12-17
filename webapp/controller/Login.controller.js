sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "quality/model/models"
], function (Controller, MessageToast, MessageBox, models) {
    "use strict";

    return Controller.extend("quality.controller.Login", {

        onInit: function () {
            // Set auth model
            var oAuthModel = models.createAuthModel();
            this.getView().setModel(oAuthModel, "auth");

            // Check if already authenticated
            if (sessionStorage.getItem("qms_authenticated") === "true") {
                this._navigateToDashboard();
            }
        },

        /**
         * Handle login button press
         */
        onLogin: function () {
            var oAuthModel = this.getView().getModel("auth");
            var sUsername = oAuthModel.getProperty("/username");
            var sPassword = oAuthModel.getProperty("/password");

            if (!sUsername || !sPassword) {
                MessageBox.error("Please enter both username and password");
                return;
            }

            this._authenticateUser(sUsername, sPassword);
        },

        /**
         * Handle demo login
         */
        onDemoLogin: function () {
            this._setAuthenticated("demo", "Demo User");
            MessageToast.show("Demo login successful");
            this._navigateToDashboard();
        },

        /**
         * Authenticate user with SAP backend
         * @param {string} sUsername - Username
         * @param {string} sPassword - Password
         * @private
         */
        _authenticateUser: function (sUsername, sPassword) {
            var that = this;
            var oLoginModel = this.getOwnerComponent().getModel("login");

            // Show loading
            this.getView().setBusy(true);

            // Try SAP authentication first
            var sPath = "/ZQM_LOG_PR(bname='" + sUsername + "',password='" + sPassword + "')";
            
            oLoginModel.read(sPath, {
                success: function (oData) {
                    that.getView().setBusy(false);
                    if (oData && oData.bname) {
                        that._setAuthenticated(oData.bname, oData.bname);
                        MessageToast.show("Login successful");
                        that._navigateToDashboard();
                    } else {
                        MessageBox.error("Invalid credentials");
                    }
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    console.log("SAP login failed, trying fallback", oError);
                    
                    // Fallback authentication for known users
                    if ((sUsername === "K901900" && sPassword === "12345") ||
                        (sUsername === "demo" && sPassword === "demo") ||
                        (sUsername === "admin" && sPassword === "admin")) {
                        that._setAuthenticated(sUsername, sUsername);
                        MessageToast.show("Login successful (fallback mode)");
                        that._navigateToDashboard();
                    } else {
                        MessageBox.error("Authentication failed. Please check your credentials.");
                    }
                }
            });
        },

        /**
         * Set user as authenticated
         * @param {string} sUsername - Username
         * @param {string} sDisplayName - Display name
         * @private
         */
        _setAuthenticated: function (sUsername, sDisplayName) {
            sessionStorage.setItem("qms_authenticated", "true");
            sessionStorage.setItem("qms_username", sUsername);
            sessionStorage.setItem("qms_displayname", sDisplayName);

            var oAuthModel = this.getView().getModel("auth");
            oAuthModel.setProperty("/isAuthenticated", true);
            oAuthModel.setProperty("/currentUser", {
                username: sUsername,
                displayName: sDisplayName
            });
        },

        /**
         * Navigate to dashboard
         * @private
         */
        _navigateToDashboard: function () {
            this.getOwnerComponent().getRouter().navTo("dashboard");
        },

        /**
         * Handle enter key press
         */
        onEnterPressed: function (oEvent) {
            if (oEvent.getParameter("key") === "Enter") {
                this.onLogin();
            }
        }

    });
});