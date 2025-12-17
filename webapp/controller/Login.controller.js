sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("quality.controller.Login", {
        onInit: function () {
            // Local model for login form inputs and UI state
            var oModel = new JSONModel({
                userId: "",
                password: "",
                isLoading: false,
                showWelcome: false
            });
            this.getView().setModel(oModel, "login");
            
            // Add welcome animation on page load
            setTimeout(function() {
                this.getView().getModel("login").setProperty("/showWelcome", true);
            }.bind(this), 500);
        },

        onInputChange: function (oEvent) {
            var oLoginModel = this.getView().getModel("login");
            var sUserId = oLoginModel.getProperty("/userId");
            var sPassword = oLoginModel.getProperty("/password");
            
            // Add visual feedback for input validation
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            
            if (sValue && sValue.trim()) {
                oInput.addStyleClass("inputSuccess");
                oInput.removeStyleClass("inputError");
            } else {
                oInput.removeStyleClass("inputSuccess");
            }
            
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

            // Validate inputs
            if (!sUserId || !sPassword) {
                MessageBox.error("Please enter both User ID and Password.", {
                    title: "Missing Credentials",
                    styleClass: "sapUiSizeCompact"
                });
                return;
            }

            if (sUserId.trim().length < 3) {
                MessageBox.error("User ID must be at least 3 characters long.", {
                    title: "Invalid User ID",
                    styleClass: "sapUiSizeCompact"
                });
                return;
            }

            // Set loading state
            oLoginModel.setProperty("/isLoading", true);
            
            // Show loading message
            MessageToast.show("🔐 Authenticating with Kaar Technologies servers...", {
                duration: 2000,
                width: "20em"
            });

            // Check for demo credentials first
            if (sUserId === "demo" && sPassword === "demo") {
                oLoginModel.setProperty("/isLoading", false);
                MessageToast.show("🎉 Welcome to Quality Management System, Demo User!", {
                    duration: 3000,
                    width: "25em"
                });
                
                setTimeout(function() {
                    try {
                        console.log("Demo login - Attempting navigation to dashboard...");
                        var oComponent = this.getOwnerComponent();
                        console.log("Demo login - Component:", oComponent);
                        
                        if (oComponent) {
                            var oRouter = oComponent.getRouter();
                            console.log("Demo login - Router:", oRouter);
                            
                            if (oRouter) {
                                console.log("Demo login - Navigating to RouteDashboard...");
                                oRouter.navTo("RouteDashboard");
                            } else {
                                console.log("Demo login - No router found, using fallback navigation");
                                window.location.hash = "#/dashboard";
                            }
                        } else {
                            console.log("Demo login - No component found, using direct navigation");
                            window.location.hash = "#/dashboard";
                        }
                    } catch (e) {
                        console.error("Demo login - Navigation error:", e);
                        console.log("Demo login - Using emergency navigation");
                        window.location.hash = "#/dashboard";
                    }
                }.bind(this), 1500);
                return;
            }

            // Real OData authentication with the actual backend
            var oAuthModel = this.getOwnerComponent().getModel("auth");
            
            if (!oAuthModel) {
                MessageBox.error("Authentication service not available. Using demo mode.", {
                    title: "Service Unavailable",
                    styleClass: "sapUiSizeCompact",
                    onClose: function() {
                        // Navigate to dashboard anyway for demo
                        setTimeout(function() {
                            try {
                                var oRouter = this.getOwnerComponent().getRouter();
                                if (oRouter) {
                                    oRouter.navTo("RouteDashboard");
                                } else {
                                    window.location.hash = "#/dashboard";
                                }
                            } catch (e) {
                                window.location.hash = "#/dashboard";
                            }
                        }.bind(this), 500);
                    }.bind(this)
                });
                oLoginModel.setProperty("/isLoading", false);
                return;
            }
            
            var sPath = "/ZQM_LOG_PR(bname='" + sUserId + "',password='" + sPassword + "')";

            sap.ui.core.BusyIndicator.show(0);

            oAuthModel.read(sPath, {
                success: function (oData) {
                    sap.ui.core.BusyIndicator.hide();
                    oLoginModel.setProperty("/isLoading", false);
                    
                    if (oData && oData.bname) {
                        // Success animation and navigation
                        MessageToast.show("🎉 Welcome to Quality Management System, " + oData.bname + "!", {
                            duration: 3000,
                            width: "25em"
                        });
                        
                        // Add success animation delay before navigation
                        setTimeout(function() {
                            try {
                                console.log("Attempting navigation to dashboard...");
                                var oComponent = this.getOwnerComponent();
                                console.log("Component:", oComponent);
                                
                                if (oComponent) {
                                    var oRouter = oComponent.getRouter();
                                    console.log("Router:", oRouter);
                                    
                                    if (oRouter) {
                                        console.log("Navigating to RouteDashboard...");
                                        oRouter.navTo("RouteDashboard");
                                    } else {
                                        console.log("No router found, using fallback navigation");
                                        window.location.hash = "#/dashboard";
                                    }
                                } else {
                                    console.log("No component found, using direct navigation");
                                    window.location.hash = "#/dashboard";
                                }
                            } catch (e) {
                                console.error("Navigation error:", e);
                                console.log("Using emergency navigation");
                                window.location.hash = "#/dashboard";
                            }
                        }.bind(this), 1500);
                        
                    } else {
                        MessageBox.error("Invalid credentials. Please check your User ID and Password.", {
                            title: "Authentication Failed",
                            styleClass: "sapUiSizeCompact"
                        });
                    }
                }.bind(this),
                error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    oLoginModel.setProperty("/isLoading", false);
                    
                    console.error("Login error:", oError);
                    
                    var sErrorMessage = "Authentication failed. Please check your credentials and try again.";
                    var sErrorTitle = "Login Error";
                    
                    try {
                        var oErrorResponse = JSON.parse(oError.responseText);
                        if (oErrorResponse.error && oErrorResponse.error.message) {
                            sErrorMessage = oErrorResponse.error.message.value || sErrorMessage;
                        }
                    } catch (e) {
                        // Use default error message
                        if (oError.status === 0) {
                            sErrorMessage = "Unable to connect to Kaar Technologies servers. Please check your network connection.";
                            sErrorTitle = "Connection Error";
                        } else if (oError.status === 401) {
                            sErrorMessage = "Invalid credentials. Please verify your User ID and Password.";
                            sErrorTitle = "Authentication Failed";
                        } else if (oError.status >= 500) {
                            sErrorMessage = "Server error occurred. Please try again later or contact support.";
                            sErrorTitle = "Server Error";
                        }
                    }
                    
                    MessageBox.error(sErrorMessage, {
                        title: sErrorTitle,
                        styleClass: "sapUiSizeCompact",
                        actions: [MessageBox.Action.OK],
                        onClose: function() {
                            // Focus back to user input for retry
                            this.byId("userInput").focus();
                        }.bind(this)
                    });
                }.bind(this)
            });
        },

        onForgotPassword: function () {
            MessageBox.information(
                "Please contact your system administrator or IT support team to reset your password.\n\n" +
                "📧 Email: support@kaartechnologies.com\n" +
                "📞 Phone: +91-XXX-XXX-XXXX\n\n" +
                "For security reasons, passwords can only be reset by authorized personnel.",
                {
                    title: "Password Reset",
                    styleClass: "sapUiSizeCompact"
                }
            );
        },

        onKeyPress: function (oEvent) {
            // Allow Enter key to trigger login
            if (oEvent.getParameter("keyCode") === 13) { // Enter key
                this.onLoginPress();
            }
        },

        onShowDemoCredentials: function () {
            if (!this._demoDialog) {
                this._demoDialog = sap.ui.xmlfragment("quality.view.fragments.DemoCredentials", this);
                this.getView().addDependent(this._demoDialog);
            }
            this._demoDialog.open();
        },

        onUseDemoCredentials: function () {
            var oLoginModel = this.getView().getModel("login");
            oLoginModel.setProperty("/userId", "demo");
            oLoginModel.setProperty("/password", "demo");
            
            MessageToast.show("✅ Demo credentials loaded! Signing in...", {
                duration: 2000
            });
            
            // Auto-login with demo credentials
            setTimeout(function() {
                this.onLoginPress();
            }.bind(this), 1000);
        },

        // Quick navigation method for testing
        onQuickNavToDashboard: function() {
            try {
                var oRouter = this.getOwnerComponent().getRouter();
                if (oRouter) {
                    oRouter.navTo("RouteDashboard");
                } else {
                    window.location.hash = "#/dashboard";
                }
            } catch (e) {
                console.error("Quick nav error:", e);
                window.location.hash = "#/dashboard";
            }
        },

        onCloseDemoDialog: function () {
            this._demoDialog.close();
        }
    });
});
