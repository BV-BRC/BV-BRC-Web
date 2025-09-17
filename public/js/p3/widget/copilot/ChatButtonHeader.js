define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/on',
    'dojo/topic',
    'dijit/Dialog',
    'dojo/dom-construct',
    'dojo/_base/lang',
    './CopilotApi',
    './ChatSessionOptionsBar',
    './CopilotFloatingWindow'
], function(
    declare,
    _WidgetBase,
    _TemplatedMixin,
    on,
    topic,
    Dialog,
    domConstruct,
    lang,
    CopilotAPI,
    ChatSessionOptionsBar,
    CopilotFloatingWindow
) {
    return declare([_WidgetBase, _TemplatedMixin], {
        // Template for the widget
        templateString: '<button class="copilot-header-btn"></button>',

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Current session ID
        currentSessionId: null,

        // Chat window state
        chatOpen: false,

        // Controller panel reference
        controllerPanel: null,

        // Chat container reference
        chatContainer: null,

        // Post-create lifecycle method
        postCreate: function() {
            this.inherited(arguments);

            // Add click handler to the button
            on(this.domNode, 'click', lang.hitch(this, function(evt) {
                evt.preventDefault();
                evt.stopPropagation();

                if (!this.chatOpen) {
                    this._openSmallChat();
                    this.chatOpen = true;
                } else {
                    this._hideControllerPanel();
                    this.chatOpen = false;
                }
            }));

            // Subscribe to topic events for external control
            topic.subscribe('hideChatPanel', lang.hitch(this, function(checked) {
                this._hideControllerPanel();
                this.chatOpen = false;
            }));

            topic.subscribe('showChatPanel', lang.hitch(this, function(checked) {
                this._showControllerPanel();
                this.chatOpen = true;
            }));
        },

        _openSmallChat: function() {
            // Attempt to restore a previously saved session ID, if available
            try {
                var savedSessionId = (window && window.localStorage) ? localStorage.getItem('copilot-current-session-id') : null;
                if (savedSessionId) {
                    this.currentSessionId = savedSessionId;
                }
            } catch (e) {
                console.warn('Unable to access localStorage to retrieve chat session id', e);
            }

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
                        className: 'ChatSessionOptionsBar',
                        region: 'top',
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
            // Create a container div for the chat panel using CopilotFloatingWindow
            this.chatContainer = new CopilotFloatingWindow({
                className: 'ChatContainerFloatingWindow'
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
            }
        },

        // Cleanup method
        destroy: function() {
            if (this.chatContainer) {
                this.chatContainer.destroy();
            }
        }
    });
});
