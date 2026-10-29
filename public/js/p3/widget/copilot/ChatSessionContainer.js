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
            this.selectedModel = (window && window.App && window.App.copilotSelectedModel) ? window.App.copilotSelectedModel : null;
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

            // Whether this container should react to global topic events.
            // Set to false when the floating window is hidden because the
            // full-page Copilot viewer is active, preventing duplicate
            // topic handling (e.g. double session creation, wrong title
            // generation) from two live ChatSessionContainer instances.
            this._active = true;
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
                this._replaceIfArchived(this.sessionId);
            } else {
                // No session supplied – create a brand-new one
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                    this.sessionId = sessionId;
                    this._createTitleWidget();
                    this._createDisplayWidget();
                    this._createInputWidget();
                    this._getPathState();
                    this.changeSessionId(sessionId);
                    // A fresh id from /start-chat has no Mongo row yet.
                    // setSessionId() defaults new_chat to false, which made
                    // _registerSessionIfNeeded skip registration on the
                    // first send: a new user's first chat got no title and
                    // stayed out of the sidebar. Same as delete-then-create
                    // below; the row is still only written on first send.
                    this.inputWidget.new_chat = true;
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

            // Set up topic subscriptions for various events.
            // Every handler checks this._active so that a hidden floating-
            // window container does not react to topics intended for the
            // full-page viewer (and vice-versa).  Subscriptions are
            // registered with this.own() for automatic cleanup on destroy.

            // Handle creating new chat sessions
            this.own(topic.subscribe('createNewChatSession', lang.hitch(this, function() {
                if (!this._active) { return; }
                this.copilotApi.createAndRegisterSession('New Chat').then(lang.hitch(this, function(result) {
                    var sessionId = result && result.session_id ? result.session_id : null;
                    if (!sessionId) {
                        throw new Error('Failed to create and register new chat session');
                    }
                    this.inputWidget.startNewChat();
                    this.displayWidget.startNewChat();
                    this.titleWidget.startNewChat(sessionId);
                    this.changeSessionId(sessionId);
                    this.inputWidget.new_chat = true;
                    this.inputWidget.session_registered = true;
                    if (window && window.App && window.App.chatSessionsStore) {
                        window.App.chatSessionsStore.addSession({
                            session_id: sessionId,
                            title: 'New Chat',
                            created_at: Date.now()
                        });
                    }
                    topic.publish('reloadUserSessions', { highlightSessionId: sessionId });
                })).catch(function(error) {
                    console.error('Error creating/registering new chat session:', error);
                });
            })));

            this.own(topic.subscribe('RefreshSession', lang.hitch(this, function(sessionId, scrollToBottom = true) {
                if (!this._active) { return; }
                this._refreshMessages(sessionId, scrollToBottom, false);
            })));

            // Handle selecting existing chat sessions
            this.own(topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
                if (!this._active) { return; }
                this.changeSessionId(data.sessionId);
                // Set the title on the header widget from the selected session
                if (data.title && this.titleWidget) {
                    this.titleWidget.setSessionId(data.sessionId, data.title);
                }
                this.chatStore.addMessages(data.messages);
                this.displayWidget.showMessages(data.messages);
                this.inputWidget.new_chat = false;

                // If the session has an in-flight turn, start polling
                // until it finishes, then refresh messages from Mongo.
                if (data.active_job_id) {
                    this._pollUntilTurnComplete(data.sessionId);
                }
            })));

            // Handle chat title changes
            this.own(topic.subscribe('ChatSessionTitleChanged', lang.hitch(this, function(data) {
                if (!this._active) { return; }
                // Update title in message store if current session
                if (data.sessionId === this.sessionId) {
                    this.chatStore.updateSessionTitle(data.sessionId, data.title);
                }

                // Always update title in sessions store
                this.sessionsStore.updateSessionTitle(data.sessionId, data.title);
            })));

            // Handle various chat configuration changes
            this.own(topic.subscribe('UpdateSessionTitleError', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleUpdateSessionTitleError.apply(this, arguments);
            })));
            this.own(topic.subscribe('ChatModel', lang.hitch(this, function(model) {
                if (!this._active) { return; }
                this.selectedModel = model;
                if (window && window.App) {
                    window.App.copilotSelectedModel = model;
                }
                if (this.inputWidget) {
                    this.inputWidget.setModel(model);
                }
            })));
            this.own(topic.subscribe('ChatSystemPrompt', lang.hitch(this, function(systemPrompt) {
                if (!this._active) { return; }
                this.inputWidget.setSystemPrompt(systemPrompt);
            })));
            this.own(topic.subscribe('generateSessionTitle', lang.hitch(this, function(payload) {
                if (!this._active) { return; }
                this._handleGenerateSessionTitle(payload);
            })));
            this.own(topic.subscribe('ChatSession:Delete', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleChatSessionDelete.apply(this, arguments);
            })));
            this.own(topic.subscribe('SetConversationRating', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleSetConversationRating.apply(this, arguments);
            })));
            this.own(topic.subscribe('copy-message', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleCopyMessage.apply(this, arguments);
            })));
            this.own(topic.subscribe('rate-message', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleRateMessage.apply(this, arguments);
            })));
            this.own(topic.subscribe('openReportIssueDialog', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleOpenReportIssueDialog.apply(this, arguments);
            })));
            this.own(topic.subscribe('editSessionTitle', lang.hitch(this, function(sessionId) {
                if (!this._active) { return; }
                if (sessionId && sessionId === this.sessionId && this.titleWidget) {
                    if (this.titleWidget.isEditing) {
                        this.titleWidget.saveTitleEditor();
                    } else {
                        this.titleWidget.startEditing();
                    }
                }
            })));
            this.own(topic.subscribe('chatTextSizeChanged', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleChatTextSizeChanged.apply(this, arguments);
            })));
            // Progress view variant changed (options dialog or the card's
            // toggle): redraw so every status card and summary follows.
            this.own(topic.subscribe('copilotProgressStyleChanged', lang.hitch(this, function() {
                if (!this._active || !this.displayWidget || !this.chatStore) { return; }
                this.displayWidget.showMessages(this.chatStore.query());
            })));
            this.own(topic.subscribe('setStatePrompt', lang.hitch(this, function() {
                if (!this._active) { return; }
                this._handleSetStatePrompt.apply(this, arguments);
            })));
            // Close file previews when a message is submitted
            this.own(topic.subscribe('ChatMessageSubmitted', lang.hitch(this, function() {
                if (!this._active) { return; }
                // Close any expanded file previews so they don't appear during agent SSE updates
                var expanded = document.querySelectorAll('.file-preview-expanded');
                for (var i = 0; i < expanded.length; i++) {
                    var container = expanded[i];
                    container.classList.remove('file-preview-expanded');
                    var toggle = container.querySelector('.file-preview-toggle-button');
                    var content = container.querySelector('.file-preview-content-area');
                    if (toggle) { toggle.style.display = ''; }
                    if (content) { content.style.display = 'none'; }
                }
            })));

            // When a turn starts on the submitting tab, also start a
            // lightweight Mongo fallback poll.  If the live SSE stream
            // delivers events normally the poll is a harmless no-op
            // (stopped by TurnEnded).  If SSE is buffered or dead, the
            // poll detects active_job_id clearing and refreshes the
            // chat from Mongo so the answer appears without a reload.
            this.own(topic.subscribe('ChatSession:TurnStarted', lang.hitch(this, function(data) {
                if (!this._active) { return; }
                if (data && data.sessionId && data.sessionId === this.sessionId) {
                    this._startFallbackPoll(data.sessionId);
                }
            })));
            this.own(topic.subscribe('ChatSession:TurnEnded', lang.hitch(this, function(data) {
                if (!this._active) { return; }
                // SSE stream delivered successfully — cancel the fallback
                // poll since it is no longer needed.
                if (data && data.sessionId && data.sessionId === this.sessionId) {
                    this._stopFallbackPoll();
                    // A completion that came in during the turn waited for it.
                    if (this._watchRefreshPending) {
                        this._watchRefreshPending = false;
                        this._refreshMessages(this.sessionId, false, true);
                    }
                    // The turn may have submitted jobs; their watches are
                    // registered as it is saved, so look again shortly.
                    var turnSessionId = this.sessionId;
                    setTimeout(lang.hitch(this, function() {
                        this._syncWatchPoll(turnSessionId);
                    }), 2000);
                }
            })));

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
         * A restored chat id (localStorage) may belong to a chat the user
         * deleted: the gateway archives it and answers 404 SESSION_ARCHIVED.
         * Start a fresh chat instead of showing an error.
         * @param {string} sessionId
         */
        _replaceIfArchived: function(sessionId) {
            this.copilotApi.getSessionMessages(sessionId).then(null, lang.hitch(this, function(err) {
                var status = err && err.response && err.response.status;
                if (status !== 404 || this.sessionId !== sessionId) { return; }
                try {
                    if (window.localStorage) { localStorage.removeItem('copilot-current-session-id'); }
                } catch (e) { /* ignore */ }
                this.copilotApi.getNewSessionId().then(lang.hitch(this, function(newId) {
                    if (this.sessionId !== sessionId) { return; }
                    if (this.titleWidget && this.titleWidget.startNewChat) {
                        this.titleWidget.startNewChat(newId);
                    }
                    this.changeSessionId(newId);
                    // No Mongo row yet: register and title it on first send.
                    if (this.inputWidget) { this.inputWidget.new_chat = true; }
                }));
            }));
        },

        /**
         * Generates a title for a chat session based on its message history.
         * Bound to the originating session ID so switching sessions mid-flight
         * does not write the title onto the wrong session.
         * @param {Object} [payload] - { sessionId } identifying the target session
         */
        _handleGenerateSessionTitle: function(payload) {
            var targetSessionId = (payload && payload.sessionId) || this.sessionId;

            // Guard: skip if the target session already has a non-default title.
            // When we are still viewing the target session, use the title widget;
            // otherwise check the sessions store.
            var existingTitle = 'New Chat';
            if (this.sessionId === targetSessionId && this.titleWidget && this.titleWidget.getTitle) {
                existingTitle = this.titleWidget.getTitle();
            } else if (this.sessionsStore) {
                var storeEntry = this.sessionsStore.get(targetSessionId);
                if (storeEntry && storeEntry.title) {
                    existingTitle = storeEntry.title;
                }
            }
            if (existingTitle && existingTitle !== 'New Chat') {
                return;
            }

            // Source messages: use the live chat store only when we are still
            // viewing the target session.  Otherwise fall back to the API.
            var _self = this;
            var model = this.inputWidget.getModel();

            var generateFromMessages = function(messages) {
                _self.copilotApi.generateTitleFromMessages(messages, model).then(function(title) {
                    if (title.startsWith('"') && title.endsWith('"')) {
                        title = title.substring(1, title.length - 1);
                    }
                    // Persist directly via API — never call titleWidget.saveTitle()
                    // because that method uses the widget's live sessionId.
                    _self.copilotApi.updateSessionTitle(targetSessionId, title).then(function() {
                        topic.publish('ChatSessionTitleChanged', {
                            sessionId: targetSessionId,
                            title: title
                        });
                    }, function(err) {
                        console.log('Error persisting auto-generated title', err);
                    });

                    // Update the header widget only if we are still viewing
                    // the target session.
                    if (_self.sessionId === targetSessionId && _self.titleWidget) {
                        _self.titleWidget.updateTitle(title);
                    }
                });
            };

            // The title comes from the user's first message only: the assistant's
            // reply (tool output, links, job cards) made titles about the answer
            // instead of the request.  Long pastes (FASTA) are cut.
            var firstUserMessage = function(messages) {
                var first = (messages || []).filter(function(m) {
                    return m && m.role === 'user' && typeof m.content === 'string' && m.content.trim();
                })[0];
                return first ? [first.content.trim().slice(0, 2000)] : [];
            };

            if (this.sessionId === targetSessionId) {
                var opening = firstUserMessage(this.chatStore.query());
                if (opening.length) generateFromMessages(opening);
            } else {
                // Switched away — fetch messages from the API
                this.copilotApi.getSessionMessages(targetSessionId).then(function(res) {
                    var messages = [];
                    if (Array.isArray(res.messages)) {
                        if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                            messages = res.messages[0].messages;
                        } else {
                            messages = res.messages;
                        }
                    }
                    var opening = firstUserMessage(messages);
                    if (opening.length) generateFromMessages(opening);
                }).catch(function(err) {
                    console.warn('Could not fetch messages for title generation', err);
                });
            }
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
            // Wrapper ContentPane for the title bar
            var ContentPane = require('dijit/layout/ContentPane');

            this.titleBarWrapper = new ContentPane({
                region: 'top',
                style: 'padding: 5px; display: flex; align-items: center; justify-content: space-between;'
            });
            this.addChild(this.titleBarWrapper);

            // Add the title widget (without region since it's inside the wrapper)
            this.titleWidget = new ChatSessionTitle({
                style: 'padding: 0; flex: 1;',
                copilotApi: this.copilotApi,
                sessionId: this.sessionId
            });
            this.titleBarWrapper.addChild(this.titleWidget);

        },

        /**
         * Creates input widget component
         * Handles user message input and submission
         */
        _createInputWidget: function() {
            this.inputWidget = new CopilotInput({
                region: 'bottom',
                splitter: true,
                style: 'height: 15%; padding: 8px 12px 12px 12px; border: 0; overflow: visible; z-index: 20;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId,
                model: this.selectedModel
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
        /**
         * Re-read the session's messages from Mongo and render them.
         * Refreshes only the session on screen.  The sidebar poller
         * publishes RefreshSession when ANY session's background turn ends;
         * the old guard let it through whenever either id was empty.
         * @param {boolean} announce - the refresh may append messages the
         *   user did not ask for (the workflow-watch poll): follow them if
         *   the user is at the bottom, else show the "New response" pill.
         */
        _refreshMessages: function(sessionId, scrollToBottom, announce) {
            if (!sessionId || !this.sessionId || sessionId !== this.sessionId) { return; }
            this.copilotApi.getSessionMessages(sessionId).then(lang.hitch(this, function(res) {
                // The user may have switched (e.g. New Chat) while this was
                // in flight; rendering now would show the old session's
                // messages under the new session id (mshukla, 2026-10-09).
                if (sessionId !== this.sessionId) { return; }
                var messages = [];
                if (Array.isArray(res.messages)) {
                    if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                        messages = res.messages[0].messages; // Legacy nested API shape
                    } else {
                        messages = res.messages; // Current flat API shape
                    }
                }
                this.chatStore.setData(messages);
                this.displayWidget.showMessages(messages, scrollToBottom, announce);
            }));
        },

        changeSessionId: function(sessionId) {
            this.sessionId = sessionId;
            // Do not add the session to the sessions store here; it will be added after the first successful message.

            // Abort any in-flight SSE stream from the *previous* session so its
            // callbacks cannot inject stale data into the newly-active session.
            // Skip the abort when re-entering the same session (e.g. path
            // change, topic re-fire) to avoid killing the live SSE stream
            // that is still painting the current turn's response.
            if (this.copilotApi && typeof this.copilotApi.abortActiveStream === 'function') {
                var previousSessionId = this._previousSessionId || null;
                if (previousSessionId && previousSessionId !== sessionId) {
                    console.warn('[ChatSessionContainer] changeSessionId: ABORTING stream (session changed from', previousSessionId, 'to', sessionId, ')');
                    this.copilotApi.abortActiveStream();
                } else {
                    console.log('[ChatSessionContainer] changeSessionId: skipping abort (same session or first call)');
                }
            }
            this._previousSessionId = sessionId;

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
            // Attached images belong to the chat they were added in.
            if (this.inputWidget && typeof this.inputWidget.setAttachedImages === 'function') {
                this.inputWidget.setAttachedImages([]);
            }

            // Removed reloadUserSessions publish: the scroll bar will react to
            // ChatSession:Selected and other dedicated events, so a full reload
            // is unnecessary here.

            // Jobs this chat submitted that are still running: watch them so
            // their completion message appears without a reload.
            this._syncWatchPoll(sessionId);
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
        _handleOpenReportIssueDialog: function(payload) {
            // The cog menu sends the chat it belongs to; it may not be the
            // open one, so fetch that chat's messages first.
            var sessionId = (payload && payload.sessionId) || this.sessionId;
            if (sessionId !== this.sessionId) {
                this.copilotApi.getSessionMessages(sessionId).then(lang.hitch(this, function(res) {
                    var msgs = Array.isArray(res && res.messages) ? res.messages : [];
                    if (msgs.length > 0 && msgs[0] && Array.isArray(msgs[0].messages)) {
                        msgs = msgs[0].messages; // legacy nested shape
                    }
                    this._openReportIssueDialog(sessionId, msgs);
                }), function(err) {
                    console.error('Could not load the chat to report:', err);
                });
                return;
            }
            this._openReportIssueDialog(sessionId, this.chatStore.query());
        },

        _openReportIssueDialog: function(sessionId, messages) {

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
         * Activate or deactivate this container's topic subscriptions.
         * When deactivated, all global topic handlers become no-ops,
         * preventing a hidden floating-window container from reacting
         * to events intended for the full-page viewer (and vice-versa).
         * @param {boolean} active
         */
        setActive: function(active) {
            this._active = !!active;
            if (this._active) {
                this._syncWatchPoll(this.sessionId);
            } else {
                this._stopWatchPoll();
            }
        },

        /**
         * Job-completed messages without a reload (testing session #9).
         *
         * The gateway's workflow monitor (every 60 s) marks a finished job's
         * watch and writes the completion message to the chat in Mongo; its
         * SSE push reaches a browser only while a chat turn is streaming
         * (4 of 220 completion messages up to 2026-10-20).  So while the chat
         * on screen has an active watch, this asks every 30 s; when one
         * finishes it re-reads the chat's messages (a few seconds later, after
         * the monitor has written the message; after the turn if one is
         * streaming, so the live reply is not replaced).  It stops when no
         * watch is active, when the chat changes, or when this container is
         * inactive (the hidden floating window).
         * @private
         */
        _watchPollMs: 30000,

        _syncWatchPoll: function(sessionId) {
            if (!this._active || !sessionId || sessionId !== this.sessionId
                || !this.copilotApi || typeof this.copilotApi.getSessionWorkflowWatches !== 'function') {
                this._stopWatchPoll();
                return;
            }
            this.copilotApi.getSessionWorkflowWatches(sessionId).then(lang.hitch(this, function(res) {
                if (!this._active || sessionId !== this.sessionId) { return; }
                var active = {};
                ((res && res.watches) || []).forEach(function(w) {
                    if (w && w.status === 'active' && w.submission_id) { active[w.submission_id] = true; }
                });
                var previous = (this._watchPollSessionId === sessionId && this._watchActive) || {};
                var finished = Object.keys(previous).some(function(id) { return !active[id]; });
                this._watchPollSessionId = sessionId;
                this._watchActive = active;
                if (finished) {
                    setTimeout(lang.hitch(this, function() {
                        if (!this._active || sessionId !== this.sessionId) { return; }
                        if (this.inputWidget && this.inputWidget.isSubmitting) {
                            this._watchRefreshPending = true;
                        } else {
                            this._refreshMessages(sessionId, false, true);
                        }
                    }), 3000);
                }
                if (Object.keys(active).length === 0) {
                    this._stopWatchPoll();
                } else if (!this._watchPollInterval) {
                    this._watchPollInterval = setInterval(lang.hitch(this, function() {
                        this._syncWatchPoll(this._watchPollSessionId);
                    }), this._watchPollMs);
                }
            }), function(err) {
                // A failed check is retried by the next tick.
                console.warn('[ChatSessionContainer] workflow watch check failed', err);
            });
        },

        _stopWatchPoll: function() {
            if (this._watchPollInterval) {
                clearInterval(this._watchPollInterval);
                this._watchPollInterval = null;
            }
            this._watchActive = null;
            this._watchPollSessionId = null;
        },

        /**
         * Lightweight Mongo fallback poll that runs alongside the live
         * SSE stream.  Does NOT change any UI state (no disabling
         * buttons, no showing/hiding the loading indicator) — the SSE
         * stream's callbacks handle all of that.
         *
         * If SSE works normally, onEnd fires, TurnEnded publishes, and
         * _stopFallbackPoll cleans this up as a no-op.  If SSE is
         * buffered/dead, this poll detects active_job_id clearing and
         * refreshes messages from Mongo so the answer appears without
         * a manual reload.
         *
         * @param {string} sessionId
         */
        _startFallbackPoll: function(sessionId) {
            this._stopFallbackPoll();

            var _self = this;
            var pollCount = 0;
            var MAX_POLLS = 120; // 120 * 3s = 6 minutes max
            // Delay first poll to give SSE time to connect and deliver
            // the initial events.  If SSE works, TurnEnded will cancel
            // this poll before it even fires.
            var INITIAL_DELAY = 6000; // 6 seconds

            // Null-race guard: setSessionActiveJob (chatRunner.js:187) races the
            // first poll. Trust a null active_job_id only after we've seen it
            // non-null once, or after ~14s total elapsed (initial + 8s window).
            var startedAt = Date.now();
            var sawActiveJobId = false;
            var MIN_ELAPSED_BEFORE_TRUSTING_NULL_MS = INITIAL_DELAY + 8000;

            this._fallbackPollTimeout = setTimeout(function() {
                _self._fallbackPollTimeout = null;
                _self._fallbackPollInterval = setInterval(function() {
                    pollCount++;
                    if (!_self._active || _self.sessionId !== sessionId || pollCount > MAX_POLLS) {
                        _self._stopFallbackPoll();
                        return;
                    }

                    _self.copilotApi.getSessionMessages(sessionId).then(function(res) {
                        if (_self.sessionId !== sessionId) return;
                        if (res && res.active_job_id) {
                            sawActiveJobId = true;
                            return;
                        }
                        // active_job_id is null — apply the guard before
                        // treating it as "done".
                        var elapsed = Date.now() - startedAt;
                        if (!sawActiveJobId && elapsed < MIN_ELAPSED_BEFORE_TRUSTING_NULL_MS) {
                            return;
                        }
                        // Turn finished but SSE did not deliver — refresh
                        _self._stopFallbackPoll();
                        _self.displayWidget.hideLoadingIndicator();
                        // Re-enable input in case SSE onEnd never fired
                        if (_self.inputWidget) {
                            _self.inputWidget.isSubmitting = false;
                            _self.inputWidget.submitButton.set('disabled', false);
                            _self.inputWidget._updateStopButtonState();
                        }
                        topic.publish('RefreshSession', sessionId);
                        topic.publish('ChatSession:TurnEnded', { sessionId: sessionId });
                    }).catch(function() {
                        // Ignore — retry next interval
                    });
                }, 3000);
            }, INITIAL_DELAY);
        },

        /**
         * Stops the fallback Mongo poll if one is running.
         */
        _stopFallbackPoll: function() {
            if (this._fallbackPollTimeout) {
                clearTimeout(this._fallbackPollTimeout);
                this._fallbackPollTimeout = null;
            }
            if (this._fallbackPollInterval) {
                clearInterval(this._fallbackPollInterval);
                this._fallbackPollInterval = null;
            }
        },

        /**
         * Poll getSessionMessages until active_job_id clears, then
         * refresh the chat display from Mongo.  Called when the user
         * returns to a session that has an in-flight turn.
         *
         * Does NOT open a second SSE — tokens from the original tab
         * are not replayed.  The user simply sees the final messages.
         *
         * @param {string} sessionId
         */
        _pollUntilTurnComplete: function(sessionId) {
            // Show loading indicator so the user knows something is happening
            this.displayWidget.showLoadingIndicator('Waiting for response...');

            // Disable input while a background turn is in flight to prevent
            // overlapping submissions on the same session.
            if (this.inputWidget) {
                this.inputWidget.isSubmitting = true;
                this.inputWidget.submitButton.set('disabled', true);
                this.inputWidget._updateStopButtonState();
            }

            // Clear any previous poll for a different session
            if (this._busyPollInterval) {
                clearInterval(this._busyPollInterval);
                this._busyPollInterval = null;
            }

            var _self = this;
            var pollCount = 0;
            var MAX_POLLS = 120; // 120 * 3s = 6 minutes max

            this._busyPollInterval = setInterval(function() {
                pollCount++;
                // Stop if we switched sessions, are inactive, or exceeded max
                if (!_self._active || _self.sessionId !== sessionId || pollCount > MAX_POLLS) {
                    clearInterval(_self._busyPollInterval);
                    _self._busyPollInterval = null;
                    if (pollCount > MAX_POLLS) {
                        _self.displayWidget.hideLoadingIndicator();
                    }
                    // Re-enable input
                    if (_self.inputWidget) {
                        _self.inputWidget.isSubmitting = false;
                        _self.inputWidget.submitButton.set('disabled', false);
                        _self.inputWidget._updateStopButtonState();
                    }
                    return;
                }

                _self.copilotApi.getSessionMessages(sessionId).then(function(res) {
                    if (_self.sessionId !== sessionId) return; // session changed
                    if (!res.active_job_id) {
                        // Turn finished — refresh display
                        clearInterval(_self._busyPollInterval);
                        _self._busyPollInterval = null;
                        _self.displayWidget.hideLoadingIndicator();
                        // Re-enable input
                        if (_self.inputWidget) {
                            _self.inputWidget.isSubmitting = false;
                            _self.inputWidget.submitButton.set('disabled', false);
                            _self.inputWidget._updateStopButtonState();
                        }
                        topic.publish('RefreshSession', sessionId);
                        topic.publish('ChatSession:TurnEnded', { sessionId: sessionId });
                    }
                }).catch(function() {
                    // Ignore poll errors — will retry next interval
                });
            }, 3000);
        },

        /**
         * Cleanup when widget is destroyed
         */
        destroy: function() {
            this._stopPathMonitoring();
            this._stopFallbackPoll();
            this._stopWatchPoll();
            if (this._busyPollInterval) {
                clearInterval(this._busyPollInterval);
                this._busyPollInterval = null;
            }
            this.inherited(arguments);
        }
    });
});