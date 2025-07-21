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
    '../../store/ChatMemoryStore',
    '../../store/ChatSessionsMemoryStore',
    'dojo/topic',
    'dojo/_base/lang',
    './ChatSessionTitle',
    'dojo/Deferred',
    'dojo/dom-class',
    'dojo/dom-style',
    './CopilotStateManager'
], function (
    declare,
    BorderContainer,
    Dialog,
    CopilotDisplay,
    CopilotInput,
    CopilotAPI,
    ChatMemoryStore,
    ChatSessionsMemoryStore,
    topic,
    lang,
    ChatSessionTitle,
    Deferred,
    domClass,
    domStyle,
    CopilotStateManager
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
        style: 'height: 100%; width: 100%; background-color: #ffffff; opacity: 1; overflow: hidden; position: relative;',
        sessionId: null,
        design: 'sidebar',
        persist: false,

        /**
         * Constructor initializes chat memory store and mixes in options
         * @param {Object} opts Configuration options
         */
        constructor: function(opts) {
            if (opts) {
                lang.mixin(this, opts);
            }
            // Initialize chat store for message persistence
            this.chatStore = new ChatMemoryStore({
                copilotApi: this.copilotApi
            });
            window.App.chatStore = this.chatStore;

            // Ensure global sessions store exists
            if (window && window.App) {
                if (!window.App.chatSessionsStore) {
                    window.App.chatSessionsStore = new ChatSessionsMemoryStore();
                }
                this.sessionsStore = window.App.chatSessionsStore;
            } else {
                this.sessionsStore = new ChatSessionsMemoryStore();
            }
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

            // Exit early if no API available
            if (!this.copilotApi) {
                return;
            }

            if (this.sessionId) {
                // We already have a session provided – just wire up the widgets.
                this._createTitleWidget();
                this._createDisplayWidget();
                this._createInputWidget();
                this._getPathState();
                this.changeSessionId(this.sessionId);
                this._initialized.resolve();
            } else {
                // No session supplied – create a brand-new one
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                    this.sessionId = sessionId;
                    this._createTitleWidget();
                    this._createDisplayWidget();
                    this._createInputWidget();
                    this._getPathState();
                    this.changeSessionId(sessionId);
                    this._initialized.resolve();
                })).catch(lang.hitch(this, function(error) {
                    // Handle initialization error
                    this.displayWidget = new CopilotDisplay({
                        region: 'center',
                        style: 'padding: 10px; border: 0;',
                        context: 'main-chat'  // Mark this as main chat context
                    });
                    this.addChild(this.displayWidget);
                    this.displayWidget.onQueryError();
                }));
            }

            domClass.add(this.domNode, 'floatingPanel');

            // Force layout recalculation after creation
            setTimeout(lang.hitch(this, function() {
                this.resize();
            }), 0);

            // Set up topic subscriptions for various events


            // Handle creating new chat sessions
            topic.subscribe('createNewChatSession', lang.hitch(this, function() {
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                    this.inputWidget.startNewChat();
                    this.displayWidget.startNewChat();
                    this.titleWidget.startNewChat(sessionId);
                    this.changeSessionId(sessionId);
                    this.inputWidget.new_chat = true;
                }));
            }));

            topic.subscribe('RefreshSession', lang.hitch(this, function(sessionId, scrollToBottom = true) {
                this.copilotApi.getSessionMessages(sessionId).then(lang.hitch(this, function(res) {
                    if (res.messages.length > 0) {
                        const messages = res.messages[0].messages;
                        this.chatStore.setData(messages);
                        this.displayWidget.showMessages(messages, scrollToBottom);
                    }
                }));
            }));

            // Handle selecting existing chat sessions
            topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
                this.changeSessionId(data.sessionId);
                this.chatStore.addMessages(data.messages);
                this.displayWidget.showMessages(data.messages);
                this.inputWidget.new_chat = false;
            }));

            // Handle chat title changes
            topic.subscribe('ChatSessionTitleChanged', lang.hitch(this, function(data) {
                // Update title in message store if current session
                if (data.sessionId === this.sessionId) {
                    this.chatStore.updateSessionTitle(data.sessionId, data.title);
                }

                // Always update title in sessions store
                this.sessionsStore.updateSessionTitle(data.sessionId, data.title);
            }));

            // Handle various chat configuration changes
            topic.subscribe('UpdateSessionTitleError', lang.hitch(this, this._handleUpdateSessionTitleError));
            topic.subscribe('ChatModel', lang.hitch(this, function(model) {
                if (this.inputWidget) {
                    this.inputWidget.setModel(model);
                }
            }));
            topic.subscribe('ChatRagDb', lang.hitch(this, function(ragDb) {
                this.inputWidget.setRagDb(ragDb);
                this.inputWidget.setRagButtonLabel(ragDb);
            }));
            topic.subscribe('ChatNumDocs', lang.hitch(this, function(numDocs) {
                this.inputWidget.setNumDocs(numDocs);
            }));
            topic.subscribe('ChatSystemPrompt', lang.hitch(this, function(systemPrompt) {
                this.inputWidget.setSystemPrompt(systemPrompt);
            }));
            topic.subscribe('generateSessionTitle', lang.hitch(this, this._handleGenerateSessionTitle));
            topic.subscribe('ChatSession:Delete', lang.hitch(this, this._handleChatSessionDelete));
            topic.subscribe('SetConversationRating', lang.hitch(this, this._handleSetConversationRating));
            topic.subscribe('copy-message', lang.hitch(this, this._handleCopyMessage));
            topic.subscribe('rate-message', lang.hitch(this, this._handleRateMessage));
            topic.subscribe('openReportIssueDialog', lang.hitch(this, this._handleOpenReportIssueDialog));
            topic.subscribe('chatTextSizeChanged', lang.hitch(this, this._handleChatTextSizeChanged));
            topic.subscribe('setStatePrompt', lang.hitch(this, this._handleSetStatePrompt));

            // Start path monitoring
            this._startPathMonitoring();
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
            // Only auto-generate a title when the session still has the default
            // placeholder title.  If the user (or a previous generation) has
            // already set a custom title, we do *not* want to overwrite it.
            var currentTitle = this.titleWidget && this.titleWidget.getTitle ? this.titleWidget.getTitle() : 'New Chat';

            if (currentTitle && currentTitle !== 'New Chat') {
                // Title has already been set to something meaningful – abort.
                return;
            }

            var messages = this.chatStore.query().map(x => x.content);
            var model = this.inputWidget.getModel();
            this.copilotApi.generateTitleFromMessages(messages, model).then(lang.hitch(this, function(title) {
                if (title.startsWith('"') && title.endsWith('"')) {
                    title = title.substring(1, title.length - 1);
                }
                this.titleWidget.updateTitle(title);
                this.titleWidget.saveTitle();
                setTimeout(lang.hitch(this, function() {
                    topic.publish('reloadUserSessions', {
                        highlightSessionId: this.sessionId
                    });
                }), 100);
            }));
        },

        /**
         * Handles deletion of chat sessions
         * If current session is deleted, creates a new chat session automatically
         */
        _handleChatSessionDelete: function(sessionId) {
            this.copilotApi.deleteSession(sessionId).then(lang.hitch(this, function (response) {
                if (response.status === 'ok') {

                    // Remove session from local store
                    this.sessionsStore.removeSession(sessionId);

                    if (this.sessionId === sessionId) {

                        // No remaining sessions - create a new chat session automatically
                        this.copilotApi.getNewSessionId().then(lang.hitch(this, function(newSessionId) {
                            this.inputWidget.startNewChat();
                            this.displayWidget.startNewChat();
                            this.titleWidget.startNewChat(newSessionId);
                            this.changeSessionId(newSessionId);
                            this.inputWidget.new_chat = true;
                        })).catch(lang.hitch(this, function(error) {
                            console.error('Error creating new session after delete:', error);
                        }));
                        topic.publish('reloadUserSessions');
                        return;
                    }
                }
                topic.publish('reloadUserSessions', {
                    highlightSessionId: this.sessionId
                });
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
         * Creates input widget component
         * Handles user message input and submission
         */
        _createInputWidget: function() {
            this.inputWidget = new CopilotInput({
                region: 'bottom',
                splitter: true,
                style: 'height: 15%; padding: 0 5px 5px 20px; border: 0;overflow: hidden;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId
            });
            this.addChild(this.inputWidget);
        },

        /**
         * Creates display widget component
         * Handles user message input and submission
         */
        _createDisplayWidget: function() {
            this.displayWidget = new CopilotDisplay({
                region: 'center',
                style: 'padding: 0 5px 5px 5px; border: 0; background-color: #ffffff; opacity: 1;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                sessionId: this.sessionId,
                context: 'main-chat'  // Mark this as main chat context
            });
            this.addChild(this.displayWidget);
        },

        /**
         * Updates session ID across all components
         * Clears existing chat data when switching sessions
         * @param {string} sessionId New session identifier
         */
        changeSessionId: function(sessionId) {
            this.sessionId = sessionId;
            // Do not add the session to the sessions store here; it will be added after the first successful message.
            // Persist the current session ID so it can be restored the next time the chat opens
            try {
                if (window && window.localStorage) {
                    localStorage.setItem('copilot-current-session-id', sessionId);
                }
            } catch (e) {
                // Failing to access localStorage should not break the application
                console.warn('Unable to persist chat session id to localStorage', e);
            }
            this.chatStore.clearData();
            this.inputWidget.setSessionId(sessionId);
            this.displayWidget.setSessionId(sessionId);
            this.titleWidget.setSessionId(sessionId);

            // Removed reloadUserSessions publish: the scroll bar will react to
            // ChatSession:Selected and other dedicated events, so a full reload
            // is unnecessary here.
        },

        /**
         * Returns the current session ID
         * @returns {string} The current session ID
         */
        getSessionId: function() {
            return this.sessionId;
        },

        /**
         * Handles setting conversation rating
         * @param {Object} data Rating data containing sessionId and rating
         */
        _handleSetConversationRating: function(data) {
            this.copilotApi.setConversationRating(data.sessionId, data.rating).then(lang.hitch(this, function(response) {
                // topic.publish('reloadUserSessions');
                console.log('set conversation rating');
            })).catch(lang.hitch(this, function(error) {
                console.error('Error setting conversation rating:', error);
            }));
        },

        /**
         * Handles copying a message to the clipboard
         * @param {string} message The message to copy
         */
        _handleCopyMessage: function(message) {
            // Modern browsers - use Clipboard API
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(message).then(function() {
                    console.log('Message copied to clipboard successfully');
                }).catch(function(err) {
                    console.error('Failed to copy message to clipboard:', err);
                    throw new Error('Failed to copy message to clipboard: ' + err.message);
                });
            } else {
                throw new Error('Clipboard API not available or not in secure context');
            }
        },

        /**
         * Handles rating a message
         * @param {Object} data Rating data containing messageId and rating
         */
        _handleRateMessage: function(data) {
            this.copilotApi.rateMessage(data.message_id, data.rating).then(lang.hitch(this, function(response) {
                // Refresh the session display to show updated rating
                topic.publish('RefreshSession', this.sessionId, false);
            })).catch(lang.hitch(this, function(error) {
                console.error('Error rating message:', error);
            }));
        },

        /**
         * Handles opening the report issue dialog
         */
        _handleOpenReportIssueDialog: function() {
            var sessionId = this.sessionId;
            var messages = this.chatStore.query();

            // Helper function to truncate long content
            var truncateContent = function(content, maxLength) {
                if (!content || content.length <= maxLength) {
                    return content;
                }

                var halfLength = Math.floor((maxLength - 3) / 2); // Account for "..."
                var firstPart = content.substring(0, halfLength);
                var lastPart = content.substring(content.length - halfLength);

                // Try to break on word boundaries
                var firstWordBreak = firstPart.lastIndexOf(' ');
                var lastWordBreak = lastPart.indexOf(' ');

                if (firstWordBreak > halfLength * 0.7) { // If we found a reasonable word break
                    firstPart = firstPart.substring(0, firstWordBreak);
                }
                if (lastWordBreak !== -1 && lastWordBreak < halfLength * 0.3) { // If we found a reasonable word break
                    lastPart = lastPart.substring(lastWordBreak + 1);
                }

                return firstPart + '...' + lastPart;
            };

            try {
                var content =
                    '\n[Please feel free to add any additional information regarding this issue here.]\n\n\n' +
                    '********************** CHAT SESSION INFO *************************\n\n' +
                    'Session ID: ' + sessionId + '\n\n' +
                    'Chat Messages (showing first 4):\n' +
                    '{code}\n' +
                    JSON.stringify(messages.slice(0, 4).map(msg => ({
                        role: msg.role,
                        content: truncateContent(msg.content, 80), // Truncate to ~80 chars total
                        timestamp: msg.timestamp
                    })), null, 4) +
                    '\n{code}\n';

                topic.publish('/openDialog', {
                    type: 'reportProblem',
                    params: {
                        issueText: content,
                        issueSubject: 'Reporting Issue with Chat Session',
                        jobDescriptRequired: false,
                        jobStatus: 'chat'
                    }
                });
            } catch (e) {
                var content = 'There was an issue fetching chat session info. Error: ' + e;
            }
        },

        /**
         * Handles changing the text size of the chat messages
         * @param {number} newSize The new text size
         */
        _handleChatTextSizeChanged: function(newSize) {
            if (this.displayWidget) {
                this.displayWidget.fontSize = newSize;
                topic.publish('RefreshSession', this.sessionId, false);
            }
        },

        _handleSetStatePrompt: function() {
            if (this.statePrompt) {
                this.inputWidget.setStatePrompt(this.statePrompt);
            }
        },

        /**
         * Gets the current path state
         */
        _getPathState: function() {
            this.path = window.location.pathname;
            if (window.location.search && window.location.search !== '') {
                this.path += window.location.search;
            }
            if (window.location.hash && window.location.hash !== '') {
                this.path += window.location.hash;
            }
            this.copilotApi.getPathState(this.path).then(lang.hitch(this, function(state) {
                if (state && state.message == 'success' && state.pathState) {
                    this.pathState = state.pathState;
                    this.statePrompt = CopilotStateManager.createStatePrompt(this.pathState);
                    console.log('path state = ', this.pathState);
                    topic.publish('setStatePrompt');
                } else {
                    this.pathState = null;
                    console.log('No path state found for path:', this.path);
                }
            })).catch(lang.hitch(this, function(error) {
                console.error('Error getting path state:', error);
            }));
        },

        /**
         * Checks if the current path has changed and updates path state if so
         */
        _checkPathChange: function() {
            var currentPath = window.location.pathname;
            if (window.location.search && window.location.search !== '') {
                currentPath += window.location.search;
            }
            if (window.location.hash && window.location.hash !== '') {
                currentPath += window.location.hash;
            }
            if (currentPath !== this.path) {
                console.log('Path changed from', this.path, 'to', currentPath);
                this._getPathState();
            }
        },

        /**
         * Starts monitoring path changes every 3 seconds
         */
        _startPathMonitoring: function() {
            this._pathMonitorInterval = setInterval(lang.hitch(this, this._checkPathChange), 3000);
        },

        /**
         * Stops monitoring path changes
         */
        _stopPathMonitoring: function() {
            if (this._pathMonitorInterval) {
                clearInterval(this._pathMonitorInterval);
                this._pathMonitorInterval = null;
            }
        },

        /**
         * Cleanup when widget is destroyed
         */
        destroy: function() {
            this._stopPathMonitoring();
            this.inherited(arguments);
        }
    });
});