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
    './CopilotAPI',
    '../store/ChatSessionMemoryStore',
    'dojo/topic',
    'dojo/_base/lang',
    './ChatSessionTitle'
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
    ChatSessionTitle
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

        /**
         * @constructor
         * @param {Object} opts - Configuration options
         * @description Initializes the chat store and mixes in provided options
         */
        constructor: function(opts) {
            this.inherited(arguments);
            this.chatStore = new ChatSessionMemoryStore({
                copilotApi: this.copilotApi
            });
            declare.safeMixin(this, opts);
            window.App.chatStore = this.chatStore;
        },

        /**
         * @method postCreate
         * @description Sets up the chat interface after widget creation
         * Creates display and input components and sets up topic subscriptions
         * @throws {Error} If copilotApi is not provided
         */
        postCreate: function() {
            this.inherited(arguments);

            // check if copilotApi is passed in
            if (!this.copilotApi) {
                throw new Error('CopilotApi is required');
                return;
            }

            this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                this.sessionId = sessionId;

                // Add title pane
                this.titleWidget = new ChatSessionTitle({
                    region: 'top',
                    style: 'padding: 5px;',
                    copilotApi: this.copilotApi,
                    sessionId: this.sessionId
                });
                this.addChild(this.titleWidget);

                // Add display pane
                this.displayWidget = new CopilotDisplay({
                    region: 'center',
                    style: 'padding: 10px; border: 0;',
                    copilotApi: this.copilotApi,
                    chatStore: this.chatStore,
                    sessionId: this.sessionId
                });
                this.addChild(this.displayWidget);

                // Add input pane
                this.inputWidget = new CopilotInput({
                    region: 'bottom',
                    style: 'padding: 10px; border: 0;',
                    copilotApi: this.copilotApi,
                    chatStore: this.chatStore,
                    displayWidget: this.displayWidget,
                    sessionId: this.sessionId
                });
                this.addChild(this.inputWidget);
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
            topic.subscribe('UpdateSessionTitleError', lang.hitch(this, function(error) {
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
            }));
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