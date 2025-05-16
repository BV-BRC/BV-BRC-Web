define([
    'dojo/_base/declare',
    'dijit/form/Button',
    'dojo/dom-class',
    'dojo/on',
    'dojo/topic',
    'dijit/Dialog',
    'dijit/layout/ContentPane',
    'dojo/dom-construct',
    'dojo/_base/lang',
    '../copilot/ChatSessionControllerPanel',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/dom-style',
    './CopilotApi',
    './ChatSessionOptionsBar',
    '../copilot/CopilotGridContainer',
    'require'
], function(
    declare,
    Button,
    domClass,
    on,
    Topic,
    Dialog,
    ContentPane,
    domConstruct,
    lang,
    ChatSessionControllerPanel,
    TooltipDialog,
    popup,
    domStyle,
    CopilotAPI,
    ChatSessionOptionsBar,
    CopilotGridContainer,
    require
) {
    return declare([Button], {
        // Base class for styling
        baseClass: 'ChatButton',

        // Dialog reference
        optionsDialog: null,

        // Controller panel reference
        controllerPanel: null,

        // Dialog reference for larger view
        largeViewDialog: null,

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Constructor
        constructor: function(opts) {
            // Add any initialization logic here
            lang.mixin(this, opts);
        },

        // Post-create lifecycle method
        postCreate: function() {
            this.inherited(arguments);

            // Set the button icon
            this.set('label', '<i class="fa fa-comments"></i>');
            domClass.add(this.domNode, 'ChatButton');

            // Ensure the button node properly fills the entire area
            if (this.buttonNode) {
                domStyle.set(this.buttonNode, {
                    width: '100%',
                    height: '100%',
                    padding: '0',
                    border: 'none',
                    background: 'transparent'
                });
            }

            // Create the options dialog
            this._createOptionsDialog();

            // Close the tooltip when clicking elsewhere
            on(document, 'click', lang.hitch(this, function() {
                popup.close(this.optionsDialog);
            }));
        },

        _createOptionsDialog: function() {
            // Create options as a tooltip dialog
            this.optionsDialog = new TooltipDialog({
                class: "copilotOptionsTooltip",
                style: "width: 200px;"
            });

            // Create content for tooltip
            var contentDiv = domConstruct.create("div", {
                style: "padding: 10px; text-align: center;"
            });

            // Create smaller button
            var smallerButton = new Button({
                label: "Smaller",
                onClick: lang.hitch(this, function(evt) {
                    popup.close(this.optionsDialog);
                    this._openSmallChat();
                    evt.stopPropagation();
                })
            }).placeAt(contentDiv);

            // Add space between buttons
            domConstruct.create("span", {
                innerHTML: "&nbsp;&nbsp;&nbsp;",
                style: "margin: 0 10px;"
            }, contentDiv);

            // Create larger button
            var largerButton = new Button({
                label: "Larger",
                onClick: lang.hitch(this, function(evt) {
                    popup.close(this.optionsDialog);
                    this._openLargeChat();
                    evt.stopPropagation();
                })
            }).placeAt(contentDiv);

            this.optionsDialog.set("content", contentDiv);
        },

        _openSmallChat: function() {
            // If controller panel already exists, just show it
            if (this.controllerPanel && this.controllerPanel.domNode) {
                if (this.chatContainer) {
                    this._showControllerPanel();
                }
                return;
            }

            // Initialize copilotApi if it doesn't exist
            if (!this.copilotApi) {
                this.copilotApi = new CopilotAPI({
                    user_id: window.App.user.l_id
                });
            }

            // Initialize optionsBar if it doesn't exist
            if (!this.optionsBar) {
                // Fetch model list and RAG database list
                this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                    var modelList = JSON.parse(modelsAndRag.models);
                    var ragList = JSON.parse(modelsAndRag.vdb_list);

                    // Create options bar
                    this.optionsBar = new ChatSessionOptionsBar({
                        region: 'top',
                        style: 'height: 40px;',
                        copilotApi: this.copilotApi,
                        modelList: modelList,
                        ragList: ragList
                    });

                    // Create and show controller panel
                    this._createControllerPanel();
                })).catch(lang.hitch(this, function(err) {
                    new Dialog({
                        title: "Service Unavailable",
                        content: "The BV-BRC Copilot service is currently unavailable. Please try again later.",
                        style: "width: 300px"
                    }).show();
                    console.error('Error setting up chat panel:', err);
                }));
            } else {
                // If we already have optionsBar, just create controller panel
                this._createControllerPanel();
            }
        },

        _createControllerPanel: function() {
            // If controller panel already exists, just show it
            if (this.controllerPanel && this.controllerPanel.domNode && this.chatContainer) {
                // Show the existing chat container
                domStyle.set(this.chatContainer, {
                    display: 'block'
                });
                return;
            }

            // Create a container div for the chat panel
            this.chatContainer = domConstruct.create('div', {
                className: 'copilotChatContainer',
                style: 'position: fixed; width: 500px; height: 600px; z-index: 9999; top: 10vh; right: 50px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-radius: 8px; overflow: hidden; background-color: white; display: block;'
            }, document.body);

            // Create controller panel inside the div
            this.controllerPanel = new ChatSessionControllerPanel({
                style: "width: 100%; height: 100%;",
                copilotApi: this.copilotApi,
                optionsBar: this.optionsBar
            });

            // Add the control panel to the container
            this.controllerPanel.placeAt(this.chatContainer);

            // Start up the component
            this.controllerPanel.startup();

            // Force resize of panel after placement
            setTimeout(lang.hitch(this, function() {
                if (this.controllerPanel && this.controllerPanel.resize) {
                    this.controllerPanel.resize();
                }
            }), 100);

            // Add control buttons container
            var buttonsContainer = domConstruct.create('div', {
                className: 'copilotChatButtonsContainer',
                style: 'position: absolute; top: 5px; right: 5px; z-index: 10000; display: flex;'
            }, this.chatContainer);

            // Add minimize button
            var minimizeButton = domConstruct.create('div', {
                className: 'copilotChatMinimizeButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '_',
                title: 'Minimize (keep session)'
            }, buttonsContainer);

            // Add close button
            var closeButton = domConstruct.create('div', {
                className: 'copilotChatCloseButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '✕',
                title: 'Close (start new chat next time)'
            }, buttonsContainer);

            // Minimize button click handler - just hide the panel
            on(minimizeButton, 'click', lang.hitch(this, function(evt) {
                this._hideControllerPanel();
                evt.stopPropagation();
            }));

            // Close button click handler - hide panel and reset session
            on(closeButton, 'click', lang.hitch(this, function(evt) {
                this._hideControllerPanel();
                // Set flag to create new session next time
                this.startNewSession = true;
                evt.stopPropagation();
            }));
        },

        _hideControllerPanel: function() {
            if (this.chatContainer) {
                domStyle.set(this.chatContainer, {
                    display: 'none'
                });
            }
        },

        _openLargeChat: function() {
            // If the large view dialog already exists, just show it
            if (this.largeViewDialog) {
                this.largeViewDialog.show();
                return;
            }

            // get the vw and vh of the window
            var vw = window.innerWidth;
            var vh = window.innerHeight;

            // Create a new dialog for large view
            this.largeViewDialog = new Dialog({
                title: "BV-BRC Copilot",
                style: "width: " + (vw - 60) + "px; height: " + (vh - 40) + "px; left: 30px; top: 20px;",
                onHide: lang.hitch(this, function() {
                    // Destroy the dialog when closed
                    setTimeout(lang.hitch(this, function() {
                        // Clean up grid container if it exists
                        if (this.gridContainer) {
                            if (this.gridContainer.destroyRecursive) {
                                this.gridContainer.destroyRecursive();
                            }
                            this.gridContainer = null;
                        }

                        // Destroy the dialog
                        this.largeViewDialog.destroyRecursive();
                        this.largeViewDialog = null;
                    }), 0);
                })
            });

            // Create a container node for the grid container
            var containerNode = domConstruct.create('div', {
                id: 'copilotLargeViewContainer',
                style: 'height: 100%; width: 100%;'
            });
            this.largeViewDialog.set('content', containerNode);

            // Initialize copilotApi if it doesn't exist
            if (!this.copilotApi) {
                this.copilotApi = new CopilotAPI({
                    user_id: window.App.user.l_id
                });
            }

            // Fetch model list and RAG database list
            this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                var modelList = JSON.parse(modelsAndRag.models);
                var ragList = JSON.parse(modelsAndRag.vdb_list);

                // Create main grid container in dialog
                this.gridContainer = new CopilotGridContainer({
                    copilotApi: this.copilotApi,
                    style: 'height: 100%; width: 100%;'
                }, containerNode);

                // Start up the container
                this.gridContainer.startup();

                // Show the dialog after container is created
                this.largeViewDialog.show();

            })).catch(lang.hitch(this, function(err) {
                // Show error dialog if service is unavailable
                new Dialog({
                    title: "Service Unavailable",
                    content: "The BV-BRC Copilot service is currently unavailable. Please try again later.",
                    style: "width: 300px"
                }).show();
                console.error('Error setting up large chat view:', err);
            }));
        },

        _showControllerPanel: function() {
            if (this.chatContainer) {
                domStyle.set(this.chatContainer, {
                    display: 'block'
                });

                // Check if we need to start a new session
                if (this.startNewSession && this.controllerPanel) {
                    this.startNewSession = false;

                    // Create a new chat session
                    if (this.copilotApi) {
                        this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                            if (this.controllerPanel) {
                                // Change the session ID and reset the chat components
                                this.controllerPanel.changeSessionId(sessionId);

                                // Reset input widget and display
                                if (this.controllerPanel.inputWidget) {
                                    this.controllerPanel.inputWidget.startNewChat();
                                }
                                if (this.controllerPanel.displayWidget) {
                                    this.controllerPanel.displayWidget.startNewChat();
                                }
                                if (this.controllerPanel.titleWidget) {
                                    this.controllerPanel.titleWidget.startNewChat(sessionId);
                                }
                            }
                        }));
                    }
                }
            }
        },

        // Override onClick to show the controller panel
        onClick: function(evt) {
            this.inherited(arguments);
            popup.open({
                popup: this.optionsDialog,
                around: this.domNode
            });

            evt.stopPropagation();
        },

        // Method to update button state
        updateState: function(isOpen) {
            domClass.toggle(this.domNode, 'active', isOpen);
        }
    });
});