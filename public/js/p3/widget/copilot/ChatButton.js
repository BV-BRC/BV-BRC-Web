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

        // Current session ID
        currentSessionId: null,

        // current open chat view
        currentOpenChatView: null,

        // one chat window is open
        chatOpen: false,

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


            /*
            // Create the options dialog
            this._createOptionsDialog();

            // Close the tooltip when clicking elsewhere
            on(document, 'click', lang.hitch(this, function() {
                popup.close(this.optionsDialog);
            }));
            */
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

            // If we have a current session from the large view, load it
            if (this.currentSessionId) {
                // Use setTimeout to ensure the controller panel is fully initialized
                setTimeout(lang.hitch(this, function() {
                    if (this.controllerPanel) {
                        this.controllerPanel.changeSessionId(this.currentSessionId);
                        console.log('get session messages', this.currentSessionId);
                        this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                            if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                                var messages = messages.messages[0].messages;
                                this.controllerPanel.chatStore.addMessages(messages);
                                this.controllerPanel.displayWidget.showMessages(messages);
                            }
                        }));

                        // Set the title if available
                        this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                            var title = title_response.title[0].title;
                            if (this.controllerPanel.titleWidget) {
                                this.controllerPanel.titleWidget.updateTitle(title);
                            }
                        }));
                    }
                }), 500);
            }

            // Add control buttons container
            var buttonsContainer = domConstruct.create('div', {
                className: 'copilotChatButtonsContainer',
                style: 'position: absolute; top: 5px; right: 5px; z-index: 10000; display: flex;'
            }, this.chatContainer);

            // Add expand button
            var expandButton = domConstruct.create('div', {
                className: 'copilotChatExpandButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '↗︎',
                title: 'Expand to large view'
            }, buttonsContainer);

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
                style: 'width: 24px; height: 24px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '+',
                title: 'New Chat (start a new session)'
            }, buttonsContainer);

            // Expand button click handler - open large chat and hide small chat
            on(expandButton, 'click', lang.hitch(this, function(evt) {
                this._hideControllerPanel();
                this._openLargeChat();
                this.currentOpenChatView = 'large';
                evt.stopPropagation();
            }));

            // Minimize button click handler - just hide the panel
            on(minimizeButton, 'click', lang.hitch(this, function(evt) {
                this._hideControllerPanel();
                this.chatOpen = false;
                evt.stopPropagation();
            }));

            // Close button click handler - hide panel and reset session
            on(closeButton, 'click', lang.hitch(this, function(evt) {
                // Create a new chat session immediately
                if (this.copilotApi) {
                    this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                        this.currentSessionId = sessionId;

                        // Reset everything in the controller panel for the new session
                        if (this.controllerPanel) {
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
                evt.stopPropagation();
            }));

                        // Force resize of panel after placement
            // Also get the session ID from the controller panel
            setTimeout(lang.hitch(this, function() {
                if (this.controllerPanel && this.controllerPanel.resize) {
                    this.controllerPanel.resize();
                }
                this.currentSessionId = this.controllerPanel.getSessionId();
            }), 200);
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
                if (this.currentSessionId) {
                    this.gridContainer.rightContainer.changeSessionId(this.currentSessionId);
                    this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                        if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                            var messages = messages.messages[0].messages;
                            this.gridContainer.rightContainer.chatStore.addMessages(messages);
                            this.gridContainer.rightContainer.displayWidget.showMessages(messages);
                        } else {
                            this.gridContainer.rightContainer.chatStore.clearData();
                            this.gridContainer.rightContainer.displayWidget.clearMessages();
                        }
                    }));

                    this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                        if (title_response.title && title_response.title.length > 0 && title_response.title[0].title) {
                            var title = title_response.title[0].title;
                            this.gridContainer.rightContainer.titleWidget.updateTitle(title);
                        } else {
                            this.gridContainer.rightContainer.titleWidget.updateTitle("New Chat");
                        }
                    }));
                }
                return;
            }

            // get the vw and vh of the window
            var vw = window.innerWidth;
            var vh = window.innerHeight;

            // Create a new dialog for large view
            this.largeViewDialog = new Dialog({
                title: "BV-BRC Copilot",
                style: "width: " + (vw - 60) + "px; height: " + (vh - 40) + "px; left: 30px; top: 20px;",
                closable: false,
                onHide: lang.hitch(this, function() {
                    if (!this.currentSessionId || this.currentSessionId != this.gridContainer.rightContainer.getSessionId()) {
                        this.currentSessionId = this.gridContainer.rightContainer.getSessionId();
                    }
                    this.largeViewDialog.hide();
                    // this._openSmallChat();
                })
            });

            // Create a container node for the grid container
            var containerNode = domConstruct.create('div', {
                id: 'copilotLargeViewContainer',
                style: 'height: 100%; width: 100%;'
            });
            this.largeViewDialog.set('content', containerNode);

            // Add shrink button to the dialog's title bar
            var titleBar = this.largeViewDialog.domNode.querySelector('.dijitDialogTitleBar');
            if (titleBar) {
                var shrinkButton = domConstruct.create('div', {
                    className: 'copilotChatShrinkButton',
                    style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 10%; margin-right: 8px; position: absolute; right: 30px; top: 8px;',
                    innerHTML: '↘︎',
                    title: 'Switch to small chat view'
                }, titleBar);

                // Add close button
                var closeButton = domConstruct.create('div', {
                    className: 'copilotChatCloseButton',
                    style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 10%; position: absolute; right: 8px; top: 8px;',
                    innerHTML: '_',
                    title: 'Minimize chat'
                }, titleBar);

                // Shrink button click handler - close large chat and open small chat
                on(shrinkButton, 'click', lang.hitch(this, function(evt) {
                    if (!this.currentSessionId || this.currentSessionId != this.gridContainer.rightContainer.getSessionId()) {
                        this.currentSessionId = this.gridContainer.rightContainer.getSessionId();
                    }
                    this.largeViewDialog.hide();
                    this._openSmallChat();
                    this.currentOpenChatView = 'small';
                    evt.stopPropagation();
                }));

                // Close button click handler
                on(closeButton, 'click', lang.hitch(this, function(evt) {
                    this.largeViewDialog.hide();
                    this.chatOpen = false;
                    evt.stopPropagation();
                }));
            }

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

                // Show the dialog after container is created
                this.largeViewDialog.show();

                setTimeout(lang.hitch(this, function() {
                    if (this.currentSessionId) {
                        this.gridContainer.rightContainer.changeSessionId(this.currentSessionId);
                        this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                            if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                                var messages = messages.messages[0].messages;
                                this.gridContainer.rightContainer.chatStore.addMessages(messages);
                                this.gridContainer.rightContainer.displayWidget.showMessages(messages);
                            }
                        }));

                        this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                            if (title_response.title && title_response.title.length > 0 && title_response.title[0].title) {
                                var title = title_response.title[0].title;
                                this.gridContainer.rightContainer.titleWidget.updateTitle(title);
                            } else {
                                this.gridContainer.rightContainer.titleWidget.updateTitle("New Chat");
                            }
                        }));
                    } else {
                        this.currentSessionId = this.gridContainer.rightContainer.getSessionId();
                    }
                }), 500);
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

                // Check if we need to start a new session: happens when clicking the close button on the small chat
                if (this.startNewSession && this.controllerPanel) {
                    this.startNewSession = false;

                    // Create a new chat session
                    if (this.copilotApi) {
                        this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                            if (this.controllerPanel) {
                                this.currentSessionId = sessionId;
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
                } else {
                    // happens when clicking the minimize button on the large chat
                    this.controllerPanel.changeSessionId(this.currentSessionId);
                    this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                        if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                            var messages = messages.messages[0].messages;
                            this.controllerPanel.chatStore.addMessages(messages);
                            this.controllerPanel.displayWidget.showMessages(messages);
                        }
                    }));

                    // Set the title if available
                    this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                        if (title_response.title && title_response.title.length > 0 && title_response.title[0].title) {
                            var title = title_response.title[0].title;
                            if (this.controllerPanel.titleWidget) {
                                this.controllerPanel.titleWidget.updateTitle(title);
                            }
                        }
                    }));
                }
            }
        },

        // Override onClick to show the controller panel
        onClick: function(evt) {
            this.inherited(arguments);
            /*
            popup.open({
                popup: this.optionsDialog,
                around: this.domNode
            });
            */
            if (!this.chatOpen) {
                if (!this.currentOpenChatView) {
                    this._openSmallChat();
                    this.currentOpenChatView = 'small';
                } else if (this.currentOpenChatView == 'large') {
                    this._openLargeChat();
                } else {
                    this._openSmallChat();
                }
                this.chatOpen = true;
                evt.stopPropagation();
            } else {
                if (this.currentOpenChatView == 'small') {
                    this._hideControllerPanel();
                } else if (this.currentOpenChatView == 'large') {
                    this.largeViewDialog.hide();
                }
                this.chatOpen = false;
            }
            evt.stopPropagation();
        },

        // Method to update button state
        updateState: function(isOpen) {
            domClass.toggle(this.domNode, 'active', isOpen);
        }
    });
});