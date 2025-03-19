/**
 * @module p3/widget/ChatSessionContainer
 * @description A BorderContainer-based widget that manages a chat session interface with display and input components.
 * Handles session management, message display, and user input for the copilot chat system.
 *
 * Key components:
 * - Title widget: Shows chat session title and allows editing
 * - Display widget: Shows chat messages and history
 * - Input widget: Handles user input and message sending
 *
 * Manages:
 * - Chat session lifecycle (create, switch, delete)
 * - Message history and storage
 * - Title generation and updates
 * - Error handling
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
     *
     * Main container widget that coordinates all chat functionality.
     * Uses BorderContainer layout to organize sub-components.
     */
    return declare([BorderContainer], {
        // Layout configuration properties
        gutters: false,
        liveSplitters: true,
        style: 'height: 100%; width: 100%;',
        sessionId: null,
        design: 'sidebar',
        persist: false,

        /**
         * Constructor initializes chat memory store and mixes in options
         * @param {Object} opts Configuration options
         */
        constructor: function(opts) {
            declare.safeMixin(this, opts);
            // Initialize chat store for message persistence
            this.chatStore = new ChatSessionMemoryStore({
                copilotApi: this.copilotApi
            });
            window.App.chatStore = this.chatStore;
        },

        /**
         * Returns promise that resolves when initialization is complete
         * Used by child widgets to ensure container is ready
         */
        whenInitialized: function() {
            return this._initialized.promise;
        },

        /**
         * Main setup method called after widget creation
         * - Initializes new chat session
         * - Creates UI components (title, display, input)
         * - Sets up all topic subscriptions for events
         */
        postCreate: function() {
            this.inherited(arguments);
            this._initialized = new Deferred();

            // Exit if no API available
            if (!this.copilotApi) {
                return;
            }

            // Initialize new session and create widgets
            this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                this.sessionId = sessionId;
                this._createTitleWidget();
                this._createDisplayWidget();
                this._createInputWidget();

                topic.publish('SetInitialChatModel');
                this._initialized.resolve();
            })).catch(lang.hitch(this, function(error) {
                // Handle initialization error
                this.displayWidget = new CopilotDisplay({
                    region: 'center',
                    style: 'padding: 10px; border: 0;'
                });
                this.addChild(this.displayWidget);
                this.displayWidget.onQueryError();
            }));

            // Set up topic subscriptions for various events

            // Handle creating new chat sessions
            topic.subscribe('createNewChatSession', lang.hitch(this, function() {
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                    this.changeSessionId(sessionId);
                    this.inputWidget.startNewChat();
                    this.displayWidget.startNewChat();
                    this.titleWidget.startNewChat(sessionId);
                }));
            }));

            // Handle selecting existing chat sessions
            topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
                this.changeSessionId(data.sessionId);
                this.chatStore.addMessages(data.messages);
                this.displayWidget.showMessages(data.messages);
            }));

            // Handle chat title changes
            topic.subscribe('ChatSessionTitleChanged', lang.hitch(this, function(data) {
                if (data.sessionId === this.sessionId) {
                    this.chatStore.updateSessionTitle(data.sessionId, data.title);
                }
                topic.publish('reloadUserSessions', {
                    sessionId: data.sessionId
                });
            }));

            // Handle various chat configuration changes
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

        /**
         * Displays error dialog when title update fails
         * Shows message explaining title can only be changed after conversation starts
         */
        _handleUpdateSessionTitleError: function(error) {
            var errorDialog = new Dialog({
                title: "Cannot Update Title",
                content: "The chat title cannot be changed until the conversation has started. Please send a message first.",
                style: "width: 300px"
            });

            // Style the error dialog with a centered button
            var buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'center';
            buttonContainer.style.marginTop = '20px';

            var okButton = document.createElement('button');
            okButton.innerHTML = "OK";
            okButton.style.backgroundColor = '#4CAF50';
            okButton.style.color = 'white';
            okButton.style.padding = '8px 24px';
            okButton.style.border = 'none';
            okButton.style.borderRadius = '4px';
            okButton.style.cursor = 'pointer';

            okButton.onclick = function() {
                errorDialog.hide();
                errorDialog.destroy();
            };

            buttonContainer.appendChild(okButton);
            errorDialog.containerNode.appendChild(buttonContainer);

            errorDialog.startup();
            errorDialog.show();
        },

        /**
         * Generates a title for the chat session based on message history
         * Uses AI model to analyze messages and create relevant title
         */
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

        /**
         * Handles deletion of chat sessions
         * If current session is deleted, switches to first available session
         */
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

        /**
         * Creates title widget component
         * Displays and manages chat session title
         */
        _createTitleWidget: function() {
            this.titleWidget = new ChatSessionTitle({
                region: 'top',
                style: 'padding: 5px;',
                copilotApi: this.copilotApi,
                sessionId: this.sessionId
            });
            this.addChild(this.titleWidget);
        },

        /**
         * Creates display widget component
         * Shows chat message history and handles message rendering
         */
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

        /**
         * Creates input widget component
         * Handles user message input and submission
         */
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
         * Updates session ID across all components
         * Clears existing chat data when switching sessions
         * @param {string} sessionId New session identifier
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