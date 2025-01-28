/**
 * @module p3/widget/ChatSessionContainer
 * @description A BorderContainer-based widget that manages a chat session interface with display and input components.
 * Handles session management, message display, and user input for the copilot chat system.
 */
define([
    'dojo/_base/declare',
    'dijit/layout/BorderContainer',
    'dijit/Dialog',
    './CopilotDisplay',
    './CopilotInput',
    './CopilotApi',
    '../../store/ChatSessionMemoryStore',
    'dojo/topic',
    'dojo/_base/lang',
    './ChatSessionTitle',
    'dojo/Deferred'
], function (
    declare,
    BorderContainer,
    Dialog,
    CopilotDisplay,
    CopilotInput,
    CopilotAPI,
    ChatSessionMemoryStore,
    topic,
    lang,
    ChatSessionTitle,
    Deferred
) {
    /**
     * @class ChatSessionContainer
     * @extends {dijit/layout/BorderContainer}
     */
    return declare([BorderContainer], {
        /** @property {boolean} gutters - Disables gutters between panes */
        gutters: false,
        /** @property {boolean} liveSplitters - Enables live updates when resizing panes */
        liveSplitters: true,
        /** @property {string} style - Sets container dimensions to fill parent */
        style: 'height: 100%; width: 100%;',
        /** @property {string} sessionId - Current chat session identifier */
        sessionId: null,
        /** @property {string} design - Better handle splitter behavior */
        design: 'sidebar',
        /** @property {boolean} persist - Maintain splitter position */
        persist: false,

        /**
         * @constructor
         * @param {Object} opts - Configuration options
         * @description Initializes the chat store and mixes in provided options
         */
        constructor: function(opts) {
            // this.inherited(arguments);
            declare.safeMixin(this, opts);
            this.chatStore = new ChatSessionMemoryStore({
                copilotApi: this.copilotApi
            });
            window.App.chatStore = this.chatStore;
        },

        whenInitialized: function() {
            return this._initialized.promise; // Provide a promise for child widgets
        },

        /**
         * @method postCreate
         * @description Sets up the chat interface after widget creation
         * Creates display and input components and sets up topic subscriptions
         * @throws {Error} If copilotApi is not provided
         */
        postCreate: function() {
            this.inherited(arguments);
            this._initialized = new Deferred();

            if (!this.copilotApi) {
                return;
            }

            this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                this.sessionId = sessionId;
                this._createTitleWidget();
                this._createDisplayWidget();
                this._createInputWidget();  // Separate this into its own method

                topic.publish('SetInitialChatModel');
                this._initialized.resolve();
            })).catch(lang.hitch(this, function(error) {
                // Create error display pane
                //  2px solid red
                this.displayWidget = new CopilotDisplay({
                    region: 'center',
                    style: 'padding: 10px; border: 0;'
                });
                this.addChild(this.displayWidget);

                // Show error message
                this.displayWidget.onQueryError();
            }));

            // Subscribe to chat session events
            topic.subscribe('createNewChatSession', lang.hitch(this, function() {
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                    this.changeSessionId(sessionId);
                    this.inputWidget.startNewChat();
                    this.displayWidget.startNewChat();
                    this.titleWidget.startNewChat(sessionId);
                }));
            }));
            topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
                this.changeSessionId(data.sessionId);
                this.chatStore.addMessages(data.messages);
                this.displayWidget.showMessages(data.messages);
            }));
            // Add subscription for title changes
            topic.subscribe('ChatSessionTitleChanged', lang.hitch(this, function(data) {
                if (data.sessionId === this.sessionId) {
                    this.chatStore.updateSessionTitle(data.sessionId, data.title);
                }
                topic.publish('reloadUserSessions', {
                    sessionId: data.sessionId
                });
            }));
            topic.subscribe('UpdateSessionTitleError', lang.hitch(this, this._handleUpdateSessionTitleError));
            topic.subscribe('ChatModel', lang.hitch(this, function(model) {
                this.inputWidget.setModel(model);
            }));
            topic.subscribe('ChatRagDb', lang.hitch(this, function(ragDb) {
                this.inputWidget.setRagDb(ragDb);
            }));
            topic.subscribe('ChatSystemPrompt', lang.hitch(this, function(systemPrompt) {
                this.inputWidget.setSystemPrompt(systemPrompt);
            }));
            topic.subscribe('changeRagButtonLabel', lang.hitch(this, function(ragDb) {
                this.inputWidget.setRagButtonLabel(ragDb);
            }));
            topic.subscribe('generateSessionTitle', lang.hitch(this, this._handleGenerateSessionTitle));
            topic.subscribe('ChatSession:Delete', lang.hitch(this, this._handleChatSessionDelete));
        },

        _handleUpdateSessionTitleError: function(error) {
            var errorDialog = new Dialog({
                title: "Cannot Update Title",
                content: "The chat title cannot be changed until the conversation has started. Please send a message first.",
                style: "width: 300px"
            });

            // Create a container div for the button with flex styling
            var buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'center';
            buttonContainer.style.marginTop = '20px';  // Add space between text and button

            // Create and style the OK button
            var okButton = document.createElement('button');
            okButton.innerHTML = "OK";
            okButton.style.backgroundColor = '#4CAF50';  // Green color
            okButton.style.color = 'white';
            okButton.style.padding = '8px 24px';
            okButton.style.border = 'none';
            okButton.style.borderRadius = '4px';
            okButton.style.cursor = 'pointer';

            okButton.onclick = function() {
                errorDialog.hide();
                errorDialog.destroy();
            };

            // Add button to container, then container to dialog
            buttonContainer.appendChild(okButton);
            errorDialog.containerNode.appendChild(buttonContainer);

            errorDialog.startup();
            errorDialog.show();
        },

        _handleGenerateSessionTitle: function() {
            var messages = this.chatStore.query().map(x => x.content);
            var model = this.inputWidget.getModel();
            this.copilotApi.generateTitleFromMessages(messages, model).then(lang.hitch(this, function(title) {
                if (title.startsWith('"') && title.endsWith('"')) {
                    title = title.substring(1, title.length - 1);
                }
                this.titleWidget.updateTitle(title);
                this.titleWidget.saveTitle();
            }));
        },

        _handleChatSessionDelete: function(sessionId) {
            this.copilotApi.deleteSession(sessionId).then(lang.hitch(this, function (response) {
                if (response.status === 'ok') {
                    if (this.sessionId === sessionId) {
                        this.copilotApi.getUserSessions().then(lang.hitch(this, function(sessions) {
                            const session_id = sessions[0].session_id;
                            const messages = sessions[0].messages;
                            const title = sessions[0].title;
                            const data = {
                                sessionId: session_id,
                                messages: messages
                            };
                            topic.publish('ChatSession:Selected', data);
                            this.titleWidget.updateTitle(title);
                        }));
                    }
                }
                topic.publish('reloadUserSessions');
            }));
        },

        _createTitleWidget: function() {
            this.titleWidget = new ChatSessionTitle({
                region: 'top',
                style: 'padding: 5px;',
                copilotApi: this.copilotApi,
                sessionId: this.sessionId
            });
            this.addChild(this.titleWidget);
        },

        _createDisplayWidget: function() {
            this.displayWidget = new CopilotDisplay({
                region: 'center',
                style: 'padding: 0; border: 0; overflow: hidden; height: 100%; min-height: 100px;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                sessionId: this.sessionId
            });
            this.addChild(this.displayWidget);
        },

        _createInputWidget: function() {
            this.inputWidget = new CopilotInput({
                region: 'bottom',
                splitter: true,
                minSize: 60,
                maxSize: 300,
                style: 'padding: 0 10px 10px 10px; border: 0; height: 30%;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId
            });
            this.addChild(this.inputWidget);
        },

        /**
         * @method changeSessionId
         * @param {string} sessionId - New session identifier
         * @description Updates the session ID across all components and clears existing chat data
         */
        changeSessionId: function(sessionId) {
            this.sessionId = sessionId;
            this.chatStore.clearData();
            this.inputWidget.setSessionId(sessionId);
            this.displayWidget.setSessionId(sessionId);
            this.titleWidget.setSessionId(sessionId);
        }
    });
});