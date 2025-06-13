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
    './CopilotSmallWindowContainer',
    'require'
], function(
    declare,
    Button,
    domClass,
    on,
    topic,
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
    CopilotSmallWindowContainer,
    require
) {
    return declare([Button], {
        // Base class for styling
        baseClass: 'ChatButton',

        // Controller panel reference
        controllerPanel: null,

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Current session ID
        currentSessionId: null,

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

            topic.subscribe('hideChatPanel', lang.hitch(this, function(checked) {
                this._hideControllerPanel();
            }));

            topic.subscribe('showChatPanel', lang.hitch(this, function(checked) {
                this._showControllerPanel();
            }));
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

                    // Create and show controller panel via container
                    this._initializeSmallWindowContainer();

                })).catch(lang.hitch(this, function(err) {
                    new Dialog({
                        title: "Service Unavailable",
                        content: "The BV-BRC Copilot service is currently unavailable. Please try again later.",
                        style: "width: 300px"
                    }).show();
                    console.error('Error setting up chat panel:', err);
                }));
            } else {
                // If we already have optionsBar, just create controller panel via container
                this._initializeSmallWindowContainer();
            }
        },

        _initializeSmallWindowContainer: function() {
            // Create a container div for the chat panel using CopilotSmallWindowContainer
            this.chatContainer = new CopilotSmallWindowContainer({
                style: 'position: fixed; width: 500px; height: 600px; z-index: 800; top: 10vh; left: 10vw; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); border-radius: 8px; overflow: hidden; background-color: white; display: block;'
            });
            this.chatContainer.placeAt(document.body);

            // Create the controller panel via the container's method
            this.controllerPanel = this.chatContainer.createControllerPanel({
                copilotApi: this.copilotApi,
                optionsBar: this.optionsBar,
                currentSessionId: this.currentSessionId,
                onMinimizeClick: lang.hitch(this, function(evt) {
                    this._hideControllerPanel();
                    this.chatOpen = false;
                    evt.stopPropagation();
                }),
                onResize: lang.hitch(this, function(sessionId) {
                    this.currentSessionId = sessionId;
                })
            });
        },

        _hideControllerPanel: function() {
            if (this.chatContainer) {
                this.chatContainer.hide();
            }
        },

        _showControllerPanel: function() {
            if (this.chatContainer) {
                this.chatContainer.show();

                // Check if we need to start a new session: happens when clicking the close button on the small chat
                if (this.controllerPanel) {

                    // Create a new chat session
                    if (this.copilotApi) {
                        this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                            if (this.controllerPanel) {
                                this.currentSessionId = sessionId;

                                // Clear highlighting from all scroll cards when starting a new chat
                                if (this.chatContainer && this.chatContainer.bottomContentPane) {
                                    this.chatContainer.bottomContentPane.clearHighlight();
                                }

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
                    // Update controller panel with current session
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

            if (!this.chatOpen) {
                this._openSmallChat();
                this.chatOpen = true;
                evt.stopPropagation();
            } else {
                this._hideControllerPanel();
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