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
    './CopilotStateManager',
    './SessionFilesStore',
    './SessionFilesSelectionStore',
    './SessionWorkflowsSelectionStore',
    './SessionWorkspaceSelectionStore',
    './SessionJobsSelectionStore'
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
    CopilotStateManager,
    SessionFilesStore,
    SessionFilesSelectionStore,
    SessionWorkflowsSelectionStore,
    SessionWorkspaceSelectionStore,
    SessionJobsSelectionStore
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

            this.sessionFilesPageSize = 20;
            this._sessionFilesRequestToken = 0;
            this._sessionFilesState = SessionFilesStore.createInitialState(this.sessionId, this.sessionFilesPageSize);
            this._sessionFilesSelectionState = SessionFilesSelectionStore.createInitialState(this.sessionId);
            this._sessionWorkflowsSelectionState = SessionWorkflowsSelectionStore.createInitialState(this.sessionId);
            this._sessionImageContextState = {
                sessionId: this.sessionId || null,
                entries: [],
                items: []
            };
            this._sessionWorkspaceSelectionState = SessionWorkspaceSelectionStore.createInitialState(this.sessionId);
            this._sessionJobsSelectionState = SessionJobsSelectionStore.createInitialState(this.sessionId);
            this._activeGridPanel = 'files';
            this.contextSectionOrder = ['files', 'workflows', 'workspace', 'jobs'];
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
            }));

            topic.subscribe('RefreshSession', lang.hitch(this, function(sessionId, scrollToBottom = true) {
                this.copilotApi.getSessionMessages(sessionId).then(lang.hitch(this, function(res) {
                    console.log('[DEBUG] RefreshSession - Full response:', res);
                    console.log('[DEBUG] RefreshSession - res.workflow_ids:', res.workflow_ids);
                    if (res.messages.length > 0) {
                        const messages = res.messages[0].messages;
                        this.chatStore.setData(messages);
                        this.displayWidget.showMessages(messages, scrollToBottom);
                    }
                this._applySessionWorkflowContext(res);
                }));
            }));

            // Handle selecting existing chat sessions
            topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
                console.log('[DEBUG] ChatSession:Selected - Full data:', data);
                console.log('[DEBUG] ChatSession:Selected - data.workflow_ids:', data.workflow_ids);
                this.changeSessionId(data.sessionId);
                this.chatStore.addMessages(data.messages);
                this.displayWidget.showMessages(data.messages);
                this.inputWidget.new_chat = false;
                this._applySessionWorkflowContext(data);
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
                this.selectedModel = model;
                if (window && window.App) {
                    window.App.copilotSelectedModel = model;
                }
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
            topic.subscribe('CopilotSessionFileCreated', lang.hitch(this, this._handleSessionFileCreated));
            topic.subscribe('CopilotSessionWorkflowCreated', lang.hitch(this, this._handleSessionWorkflowCreated));
            topic.subscribe('CopilotWorkflowCardStatusUpdated', lang.hitch(this, this._handleWorkflowCardStatusUpdated));
            topic.subscribe('CopilotWorkspaceBrowseOpen', lang.hitch(this, function() {
                this._setActiveTab('grids', 'workspace');
            }));
            topic.subscribe('CopilotJobsBrowseOpen', lang.hitch(this, function() {
                this._setActiveTab('grids', 'jobs');
            }));

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
            // Create a wrapper ContentPane to hold both title and tabs on the same line
            var ContentPane = require('dijit/layout/ContentPane');
            var domConstruct = require('dojo/dom-construct');
            var on = require('dojo/on');
            var lang = require('dojo/_base/lang');
            var topic = require('dojo/topic');

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

            // Create tabs container on the right side
            this.tabsContainer = domConstruct.create('div', {
                class: 'copilot-panel-tabs',
                style: 'display: flex; gap: 8px; margin-left: auto;'
            }, this.titleBarWrapper.containerNode);

            this.messagesTabButton = domConstruct.create('button', {
                type: 'button',
                innerHTML: 'Messages',
                class: 'copilot-panel-tab copilot-panel-tab-active'
            }, this.tabsContainer);

            this.contextTabButton = domConstruct.create('button', {
                type: 'button',
                innerHTML: 'Context',
                class: 'copilot-panel-tab'
            }, this.tabsContainer);

            this.gridsTabButton = domConstruct.create('button', {
                type: 'button',
                innerHTML: 'Grids',
                class: 'copilot-panel-tab'
            }, this.tabsContainer);

            // Set up click handlers for tabs
            on(this.messagesTabButton, 'click', lang.hitch(this, function() {
                this._setActiveTab('messages');
            }));

            on(this.contextTabButton, 'click', lang.hitch(this, function() {
                this._setActiveTab('context');
            }));

            on(this.gridsTabButton, 'click', lang.hitch(this, function() {
                this._setActiveTab('grids');
            }));

            var hideContextHoverMenu = lang.hitch(this, function() {
                if (this._contextHoverMenuHideTimer) {
                    clearTimeout(this._contextHoverMenuHideTimer);
                    this._contextHoverMenuHideTimer = null;
                }
                if (this.contextHoverMenuNode) {
                    this.contextHoverMenuNode.style.display = 'none';
                }
            });

            var scheduleContextHoverHide = lang.hitch(this, function() {
                if (this._contextHoverMenuHideTimer) {
                    clearTimeout(this._contextHoverMenuHideTimer);
                }
                this._contextHoverMenuHideTimer = setTimeout(hideContextHoverMenu, 160);
            });

            var showContextHoverMenu = lang.hitch(this, function() {
                if (!this.contextHoverMenuNode || !this.contextTabButton) {
                    return;
                }
                if (this._contextHoverMenuHideTimer) {
                    clearTimeout(this._contextHoverMenuHideTimer);
                    this._contextHoverMenuHideTimer = null;
                }
                this._renderContextTabSummary();
                this.contextHoverMenuNode.style.display = 'block';
            });

            this.contextHoverMenuNode = domConstruct.create('div', {
                class: 'copilot-context-hover-menu',
                style: 'position:absolute; top: calc(100% + 6px); right: 0; min-width: 320px; max-width: 440px; max-height: 280px; overflow:auto; background:#fff; border:1px solid #d1d5db; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12); padding:8px; z-index:1000; display:none;'
            }, this.tabsContainer);

            on(this.contextTabButton, 'mouseenter', showContextHoverMenu);
            on(this.contextTabButton, 'mouseleave', scheduleContextHoverHide);
            on(this.contextHoverMenuNode, 'mouseenter', lang.hitch(this, function() {
                if (this._contextHoverMenuHideTimer) {
                    clearTimeout(this._contextHoverMenuHideTimer);
                    this._contextHoverMenuHideTimer = null;
                }
            }));
            on(this.contextHoverMenuNode, 'mouseleave', scheduleContextHoverHide);
            on(this.contextTabButton, 'click', hideContextHoverMenu);
            on(this.messagesTabButton, 'click', hideContextHoverMenu);
            on(this.gridsTabButton, 'click', hideContextHoverMenu);

            this._renderContextTabSummary();
        },

        /**
         * Sets the active tab and updates the display
         * @param {string} panel - The panel to activate
         * @param {string} gridPanel - Optional grid panel key when activating grids tab
         */
        _setActiveTab: function(panel, gridPanel) {
            var domClass = require('dojo/dom-class');
            var legacyGridPanels = {
                files: true,
                workflows: true,
                workspace: true,
                jobs: true
            };

            if (legacyGridPanels[panel]) {
                gridPanel = panel;
                panel = 'grids';
            }
            if (gridPanel && legacyGridPanels[gridPanel]) {
                this._activeGridPanel = gridPanel;
            }
            if (panel !== 'messages' && panel !== 'context' && panel !== 'grids') {
                panel = 'messages';
            }

            // Update tab button styles
            domClass.toggle(this.messagesTabButton, 'copilot-panel-tab-active', panel === 'messages');
            domClass.toggle(this.contextTabButton, 'copilot-panel-tab-active', panel === 'context');
            domClass.toggle(this.gridsTabButton, 'copilot-panel-tab-active', panel === 'grids');

            // Update display widget
            if (this.displayWidget && this.displayWidget.setActivePanel) {
                if (panel === 'messages') {
                    this.displayWidget.setActivePanel('messages');
                } else if (panel === 'context') {
                    this.displayWidget.setActivePanel('context');
                } else {
                    this.displayWidget.setActivePanel(this._activeGridPanel || 'files');
                }
            }
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
                sessionId: this.sessionId,
                model: this.selectedModel,
                selectedWorkspaceItems: SessionWorkspaceSelectionStore.getSelectedItems(this._sessionWorkspaceSelectionState),
                selectedJobs: SessionJobsSelectionStore.getSelectedItems(this._sessionJobsSelectionState),
                selectedWorkflows: SessionWorkflowsSelectionStore.getSelectedItems(this._sessionWorkflowsSelectionState),
                onImageAttachmentsChanged: lang.hitch(this, this._handleImageAttachmentsChanged)
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
                onLoadMoreFiles: lang.hitch(this, this._loadMoreSessionFiles),
                onFilesSelectionChanged: lang.hitch(this, this._handleFilesSelectionChanged),
                onWorkflowsSelectionChanged: lang.hitch(this, this._handleWorkflowsSelectionChanged),
                onWorkspaceSelectionChanged: lang.hitch(this, this._handleWorkspaceSelectionChanged),
                onJobsSelectionChanged: lang.hitch(this, this._handleJobsSelectionChanged),
                onImageContextChanged: lang.hitch(this, this._handleImageContextSelectionChanged),
                onContextClearAll: lang.hitch(this, this._handleContextClearAll),
                contextSectionOrder: this.contextSectionOrder,
                context: 'main-chat'  // Mark this as main chat context
            });
            this.displayWidget.setSessionImageContextData(this._sessionImageContextState.items);
            this.displayWidget.setSessionFilesSelectionData(SessionFilesSelectionStore.getSelectedItems(this._sessionFilesSelectionState));
            this.displayWidget.setSessionWorkflowsSelectionData(SessionWorkflowsSelectionStore.getSelectedItems(this._sessionWorkflowsSelectionState));
            this.displayWidget.setSessionWorkspaceSelectionData(SessionWorkspaceSelectionStore.getSelectedItems(this._sessionWorkspaceSelectionState));
            this.displayWidget.setSessionJobsSelectionData(SessionJobsSelectionStore.getSelectedItems(this._sessionJobsSelectionState));
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
            this._resetSessionFilesState(sessionId);
            this._fetchSessionFiles(false);
            this._resetSessionFilesSelectionState(sessionId);
            this._resetSessionWorkflowsSelectionState(sessionId);
            this._resetSessionImageContextState(sessionId);
            this._resetSessionWorkspaceSelectionState(sessionId);
            this._resetSessionJobsSelectionState(sessionId);
            if (this.inputWidget && typeof this.inputWidget.setAttachedImages === 'function') {
                this.inputWidget.setAttachedImages((this._sessionImageContextState && this._sessionImageContextState.entries) || []);
            }
            this._syncFilesSelectionsToWidgets();
            this._syncWorkflowsSelectionsToWidgets();
            this._syncImageContextToWidgets();
            this._syncWorkspaceSelectionsToWidgets();
            this._syncJobsSelectionsToWidgets();
            // Reset workflows when changing session
            this.displayWidget.resetSessionWorkflows();
            this.displayWidget.resetSessionWorkspaceBrowse();
            this.displayWidget.resetSessionJobsBrowse();

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

        _debugContextEvent: function(label, payload) {
            try {
                console.log('[ContextDebug][Container] ' + label, payload || {});
            } catch (e) {
                // Debug logging should never affect control flow.
            }
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

        _resetSessionFilesState: function(sessionId) {
            if (!this._sessionFilesState) {
                this._sessionFilesState = SessionFilesStore.createInitialState(sessionId, this.sessionFilesPageSize);
            } else {
                SessionFilesStore.resetForSession(this._sessionFilesState, sessionId);
            }
            this._sessionFilesRequestToken += 1;
            if (this.displayWidget && this.displayWidget.resetSessionFiles) {
                this.displayWidget.resetSessionFiles();
            }
        },

        _resetSessionWorkspaceSelectionState: function(sessionId) {
            this._sessionWorkspaceSelectionState = SessionWorkspaceSelectionStore.createInitialState(sessionId);
        },

        _resetSessionFilesSelectionState: function(sessionId) {
            this._sessionFilesSelectionState = SessionFilesSelectionStore.createInitialState(sessionId);
        },

        _syncFilesSelectionsToWidgets: function() {
            var selectedItems = this._sessionFilesSelectionState ? SessionFilesSelectionStore.getSelectedItems(this._sessionFilesSelectionState) : [];
            if (this.displayWidget && this.displayWidget.setSessionFilesSelectionData) {
                this.displayWidget.setSessionFilesSelectionData(selectedItems);
            }
            this._renderContextTabSummary();
        },

        _resetSessionWorkflowsSelectionState: function(sessionId) {
            this._sessionWorkflowsSelectionState = SessionWorkflowsSelectionStore.createInitialState(sessionId);
        },

        _syncWorkflowsSelectionsToWidgets: function() {
            var selectedItems = this._sessionWorkflowsSelectionState ? SessionWorkflowsSelectionStore.getSelectedItems(this._sessionWorkflowsSelectionState) : [];
            if (this.displayWidget && this.displayWidget.setSessionWorkflowsSelectionData) {
                this.displayWidget.setSessionWorkflowsSelectionData(selectedItems);
            }
            if (this.inputWidget && this.inputWidget.setSelectedWorkflows) {
                this.inputWidget.setSelectedWorkflows(selectedItems);
            }
            this._renderContextTabSummary();
        },

        _resetSessionImageContextState: function(sessionId) {
            this._sessionImageContextState = {
                sessionId: sessionId || null,
                entries: [],
                items: []
            };
        },

        _syncImageContextToWidgets: function() {
            var selectedItems = (this._sessionImageContextState && this._sessionImageContextState.items) || [];
            if (this.displayWidget && this.displayWidget.setSessionImageContextData) {
                this.displayWidget.setSessionImageContextData(selectedItems);
            }
            this._renderContextTabSummary();
        },

        _syncWorkspaceSelectionsToWidgets: function() {
            var selectedItems = this._sessionWorkspaceSelectionState ? SessionWorkspaceSelectionStore.getSelectedItems(this._sessionWorkspaceSelectionState) : [];
            if (this.displayWidget && this.displayWidget.setSessionWorkspaceSelectionData) {
                this.displayWidget.setSessionWorkspaceSelectionData(selectedItems);
            }
            if (this.inputWidget && this.inputWidget.setSelectedWorkspaceItems) {
                this.inputWidget.setSelectedWorkspaceItems(selectedItems);
            }
            this._renderContextTabSummary();
        },

        _resetSessionJobsSelectionState: function(sessionId) {
            this._sessionJobsSelectionState = SessionJobsSelectionStore.createInitialState(sessionId);
        },

        _syncJobsSelectionsToWidgets: function() {
            var selectedJobs = this._sessionJobsSelectionState ? SessionJobsSelectionStore.getSelectedItems(this._sessionJobsSelectionState) : [];
            if (this.displayWidget && this.displayWidget.setSessionJobsSelectionData) {
                this.displayWidget.setSessionJobsSelectionData(selectedJobs);
            }
            if (this.inputWidget && this.inputWidget.setSelectedJobs) {
                this.inputWidget.setSelectedJobs(selectedJobs);
            }
            this._renderContextTabSummary();
        },

        _workspaceSelectionSignature: function(items) {
            var nextItems = Array.isArray(items) ? items : [];
            var keys = [];
            var seen = {};
            nextItems.forEach(function(item) {
                var normalized = SessionWorkspaceSelectionStore.normalizeItem(item);
                if (!normalized) {
                    return;
                }
                var key = String(normalized.id) + '|' + String(normalized.path) + '|' + String(normalized.type || '') + '|' + String(normalized.name || '');
                if (!seen[key]) {
                    seen[key] = true;
                    keys.push(key);
                }
            });
            keys.sort();
            return keys.join('||');
        },

        _handleWorkspaceSelectionChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionWorkspaceSelectionState) {
                return;
            }
            var incomingItems = payload && payload.items ? payload.items : [];
            var nextSignature = this._workspaceSelectionSignature(incomingItems);
            var currentSignature = this._workspaceSelectionSignature(this._sessionWorkspaceSelectionState.items || []);
            if (nextSignature === currentSignature) {
                this._debugContextEvent('workspace selection unchanged - skip sync', {
                    count: Array.isArray(incomingItems) ? incomingItems.length : 0
                });
                return;
            }
            this._debugContextEvent('workspace selection changed', {
                count: Array.isArray(incomingItems) ? incomingItems.length : 0
            });
            SessionWorkspaceSelectionStore.setItems(this._sessionWorkspaceSelectionState, incomingItems);
            this._syncWorkspaceSelectionsToWidgets();
        },

        _handleJobsSelectionChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionJobsSelectionState) {
                return;
            }
            this._debugContextEvent('jobs selection changed', {
                count: payload && payload.items ? payload.items.length : 0
            });
            SessionJobsSelectionStore.setItems(this._sessionJobsSelectionState, payload && payload.items ? payload.items : []);
            this._syncJobsSelectionsToWidgets();
        },

        _handleFilesSelectionChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionFilesSelectionState) {
                return;
            }
            this._debugContextEvent('files selection changed', {
                count: payload && payload.items ? payload.items.length : 0
            });
            SessionFilesSelectionStore.setItems(this._sessionFilesSelectionState, payload && payload.items ? payload.items : []);
            this._syncFilesSelectionsToWidgets();
        },

        _handleWorkflowsSelectionChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionWorkflowsSelectionState) {
                return;
            }
            this._debugContextEvent('workflows selection changed', {
                count: payload && payload.items ? payload.items.length : 0
            });
            SessionWorkflowsSelectionStore.setItems(this._sessionWorkflowsSelectionState, payload && payload.items ? payload.items : []);
            this._syncWorkflowsSelectionsToWidgets();
        },

        _handleContextClearAll: function() {
            this._debugContextEvent('clear all requested', {
                files: (this._sessionFilesSelectionState && this._sessionFilesSelectionState.items ? this._sessionFilesSelectionState.items.length : 0),
                workflows: (this._sessionWorkflowsSelectionState && this._sessionWorkflowsSelectionState.items ? this._sessionWorkflowsSelectionState.items.length : 0),
                workspace: (this._sessionWorkspaceSelectionState && this._sessionWorkspaceSelectionState.items ? this._sessionWorkspaceSelectionState.items.length : 0),
                jobs: (this._sessionJobsSelectionState && this._sessionJobsSelectionState.items ? this._sessionJobsSelectionState.items.length : 0),
                images: (this._sessionImageContextState && this._sessionImageContextState.items ? this._sessionImageContextState.items.length : 0)
            });
            this._handleFilesSelectionChanged({ items: [] });
            this._handleWorkflowsSelectionChanged({ items: [] });
            this._handleWorkspaceSelectionChanged({ items: [] });
            this._handleJobsSelectionChanged({ items: [] });
            this._handleImageAttachmentsChanged({ entries: [], items: [] });
            if (this.inputWidget && typeof this.inputWidget.setAttachedImages === 'function') {
                this.inputWidget.setAttachedImages([]);
            }
        },

        _handleImageAttachmentsChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionImageContextState) {
                return;
            }
            var entries = payload && Array.isArray(payload.entries) ? payload.entries.slice() : [];
            var items = payload && Array.isArray(payload.items) ? payload.items.slice() : [];
            this._debugContextEvent('image attachments changed', {
                entryCount: entries.length,
                itemCount: items.length
            });
            this._sessionImageContextState.entries = entries;
            this._sessionImageContextState.items = items;
            this._syncImageContextToWidgets();
        },
        _applySessionWorkflowContext: function(data) {
            var workflowItems = [];
            if (data && data.workflow_grid && Array.isArray(data.workflow_grid.items)) {
                workflowItems = data.workflow_grid.items;
            } else if (data && Array.isArray(data.workflow_ids)) {
                workflowItems = data.workflow_ids;
            }

            SessionWorkflowsSelectionStore.setItems(this._sessionWorkflowsSelectionState, workflowItems);
            if (this.displayWidget && this.displayWidget.setSessionWorkflows) {
                this.displayWidget.setSessionWorkflows(workflowItems);
            }
            this._syncWorkflowsSelectionsToWidgets();
        },

        _handleImageContextSelectionChanged: function(payload) {
            var sessionId = this.sessionId;
            if (!sessionId || !this._sessionImageContextState) {
                return;
            }
            var nextItems = payload && Array.isArray(payload.items) ? payload.items : [];
            this._debugContextEvent('image context selection changed', {
                nextCount: nextItems.length
            });
            var allowed = {};
            nextItems.forEach(function(item) {
                if (item && item.id !== undefined && item.id !== null) {
                    allowed[String(item.id)] = true;
                }
            });
            var nextEntries = (this._sessionImageContextState.entries || []).filter(function(entry) {
                var id = entry && entry.id !== undefined && entry.id !== null ? String(entry.id) : '';
                return !!allowed[id];
            });
            this._handleImageAttachmentsChanged({
                entries: nextEntries,
                items: nextItems
            });
            if (this.inputWidget && typeof this.inputWidget.setAttachedImages === 'function') {
                this.inputWidget.setAttachedImages(nextEntries);
            }
        },

        _collectContextSummarySections: function() {
            var sections = [];
            var definitions = [
                {
                    key: 'files',
                    label: 'Files',
                    items: this._sessionFilesSelectionState ? SessionFilesSelectionStore.getSelectedItems(this._sessionFilesSelectionState) : [],
                    mapItem: function(item) { return item && (item.file_name || item.id || 'File'); }
                },
                {
                    key: 'workflows',
                    label: 'Workflows',
                    items: this._sessionWorkflowsSelectionState ? SessionWorkflowsSelectionStore.getSelectedItems(this._sessionWorkflowsSelectionState) : [],
                    mapItem: function(item) { return item && (item.workflow_name || item.workflow_id || item.id || 'Workflow'); }
                },
                {
                    key: 'workspace',
                    label: 'Workspace',
                    items: this._sessionWorkspaceSelectionState ? SessionWorkspaceSelectionStore.getSelectedItems(this._sessionWorkspaceSelectionState) : [],
                    mapItem: function(item) { return item && (item.path || item.name || item.id || 'Workspace item'); }
                },
                {
                    key: 'jobs',
                    label: 'Jobs',
                    items: this._sessionJobsSelectionState ? SessionJobsSelectionStore.getSelectedItems(this._sessionJobsSelectionState) : [],
                    mapItem: function(item) { return item && (item.id || item.application_name || 'Job'); }
                },
                {
                    key: 'images',
                    label: 'Images',
                    items: (this._sessionImageContextState && this._sessionImageContextState.items) || [],
                    mapItem: function(item) { return item && (item.name || 'Image'); }
                }
            ];

            definitions.forEach(function(definition) {
                var items = Array.isArray(definition.items) ? definition.items : [];
                if (!items.length) {
                    return;
                }
                sections.push({
                    key: definition.key,
                    label: definition.label,
                    count: items.length,
                    names: items.map(definition.mapItem).filter(function(name) { return typeof name === 'string' && name.length > 0; })
                });
            });

            return sections;
        },

        _renderContextTabSummary: function() {
            if (!this.contextTabButton) {
                return;
            }
            var sections = this._collectContextSummarySections();
            var total = sections.reduce(function(acc, section) {
                return acc + (section.count || 0);
            }, 0);
            this.contextTabButton.innerHTML = 'Context (' + total + ')';

            if (!this.contextHoverMenuNode) {
                return;
            }
            this.contextHoverMenuNode.innerHTML = '';
            if (!sections.length) {
                this.contextHoverMenuNode.appendChild(document.createTextNode('No context items selected.'));
                return;
            }

            sections.forEach(function(section) {
                var sectionNode = document.createElement('div');
                sectionNode.style.borderBottom = '1px solid #e5e7eb';
                sectionNode.style.padding = '6px 4px';

                var titleNode = document.createElement('div');
                titleNode.style.fontWeight = '600';
                titleNode.style.marginBottom = '4px';
                titleNode.textContent = section.label + ' (' + section.count + ')';
                sectionNode.appendChild(titleNode);

                section.names.slice(0, 20).forEach(function(name) {
                    var itemNode = document.createElement('div');
                    itemNode.style.fontSize = '12px';
                    itemNode.style.color = '#475569';
                    itemNode.style.wordBreak = 'break-word';
                    itemNode.textContent = '- ' + name;
                    sectionNode.appendChild(itemNode);
                });
                if (section.names.length > 20) {
                    var moreNode = document.createElement('div');
                    moreNode.style.fontSize = '12px';
                    moreNode.style.color = '#64748b';
                    moreNode.textContent = '+ ' + (section.names.length - 20) + ' more';
                    sectionNode.appendChild(moreNode);
                }

                this.contextHoverMenuNode.appendChild(sectionNode);
            }, this);
        },

        _syncFilesToDisplay: function() {
            if (!this.displayWidget) return;
            this.displayWidget.setSessionFilesLoading(Boolean(this._sessionFilesState.loading));
            this.displayWidget.setSessionFilesData(
                this._sessionFilesState.files,
                this._sessionFilesState.pagination,
                this._sessionFilesState.summary
            );
            if (this._sessionFilesState.error) {
                this.displayWidget.setSessionFilesError(this._sessionFilesState.error);
            }
        },

        _fetchSessionFiles: function(append) {
            if (!this.sessionId || !this.copilotApi || !this.copilotApi.getSessionFiles) return;
            var targetSessionId = this.sessionId;
            var requestToken = this._sessionFilesRequestToken;
            var offset = append ? SessionFilesStore.getNextOffset(this._sessionFilesState) : 0;

            SessionFilesStore.setError(this._sessionFilesState, null);
            SessionFilesStore.setLoading(this._sessionFilesState, true);
            this._syncFilesToDisplay();

            this.copilotApi.getSessionFiles(targetSessionId, this.sessionFilesPageSize, offset)
                .then(lang.hitch(this, function(response) {
                    if (requestToken !== this._sessionFilesRequestToken || targetSessionId !== this.sessionId) {
                        return;
                    }
                    SessionFilesStore.applyFetchResponse(this._sessionFilesState, response, append);
                    this._syncFilesToDisplay();
                }))
                .catch(lang.hitch(this, function(error) {
                    if (requestToken !== this._sessionFilesRequestToken || targetSessionId !== this.sessionId) {
                        return;
                    }
                    SessionFilesStore.setError(this._sessionFilesState, error);
                    this._syncFilesToDisplay();
                }))
                .finally(lang.hitch(this, function() {
                    if (requestToken !== this._sessionFilesRequestToken || targetSessionId !== this.sessionId) {
                        return;
                    }
                    SessionFilesStore.setLoading(this._sessionFilesState, false);
                    this._syncFilesToDisplay();
                }));
        },

        _loadMoreSessionFiles: function() {
            if (!this._sessionFilesState || this._sessionFilesState.loading) return;
            if (!this._sessionFilesState.pagination || !this._sessionFilesState.pagination.has_more) return;
            this._fetchSessionFiles(true);
        },

        _handleSessionFileCreated: function(eventPayload) {
            if (!eventPayload || eventPayload.session_id !== this.sessionId) {
                return;
            }

            // Check if the SSE event has complete metadata
            var hasCompleteMetadata = eventPayload.file &&
                                     eventPayload.file.created_at &&
                                     (typeof eventPayload.file.size_bytes === 'number' || eventPayload.file.size_formatted);

            if (hasCompleteMetadata) {
                // Use the SSE event data directly if it has metadata
                SessionFilesStore.insertRealtimeFile(this._sessionFilesState, eventPayload);
                this._syncFilesToDisplay();
            } else {
                // SSE event is missing metadata, refresh from API to get complete data
                this._fetchSessionFiles(false);
            }
        },

        _handleSessionWorkflowCreated: function(eventPayload) {
            if (!eventPayload || eventPayload.session_id !== this.sessionId) {
                return;
            }

            var workflowItem = eventPayload.workflow || null;
            if (!workflowItem) {
                return;
            }

            // Merge with current workflow context so newly submitted workflows appear immediately.
            var currentItems = this._sessionWorkflowsSelectionState && Array.isArray(this._sessionWorkflowsSelectionState.items)
                ? this._sessionWorkflowsSelectionState.items
                : [];
            var nextItems = currentItems.concat([workflowItem]);
            SessionWorkflowsSelectionStore.setItems(this._sessionWorkflowsSelectionState, nextItems);

            if (this.displayWidget && this.displayWidget.setSessionWorkflows) {
                this.displayWidget.setSessionWorkflows(this._sessionWorkflowsSelectionState.items);
            }
            this._syncWorkflowsSelectionsToWidgets();
        },

        _handleWorkflowCardStatusUpdated: function(eventPayload) {
            if (!eventPayload) {
                return;
            }
            if (eventPayload.session_id && eventPayload.session_id !== this.sessionId) {
                return;
            }

            var updatedWorkflow = eventPayload.workflow || null;
            if (!updatedWorkflow) {
                return;
            }

            var workflowId = updatedWorkflow.workflow_id ||
                (updatedWorkflow.execution_metadata && updatedWorkflow.execution_metadata.workflow_id) ||
                null;
            if (!workflowId) {
                return;
            }
            workflowId = String(workflowId);

            // Keep message card data in sync so re-renders show latest status.
            var messageId = eventPayload.message_id || null;
            if (messageId) {
                var message = this.chatStore.getMessageById(messageId);
                if (message) {
                    message.workflowData = updatedWorkflow;
                    this.chatStore.updateMessage(message);
                    if (this.displayWidget && this.displayWidget.showMessages) {
                        this.displayWidget.showMessages(this.chatStore.query(), false);
                    }
                }
            }

            // Keep Workflows tab row in sync with the updated status.
            var currentItems = this._sessionWorkflowsSelectionState && Array.isArray(this._sessionWorkflowsSelectionState.items)
                ? this._sessionWorkflowsSelectionState.items
                : [];
            var nextItems = [];
            var replaced = false;

            for (var i = 0; i < currentItems.length; i++) {
                var item = currentItems[i] || {};
                var itemId = item.workflow_id ? String(item.workflow_id) : null;
                if (itemId === workflowId) {
                    nextItems.push(lang.mixin({}, item, {
                        workflow_id: workflowId,
                        id: workflowId,
                        workflow_name: updatedWorkflow.workflow_name || item.workflow_name || 'Workflow',
                        status: (updatedWorkflow.execution_metadata && updatedWorkflow.execution_metadata.status) || updatedWorkflow.status || item.status || null,
                        submitted_at: updatedWorkflow.submitted_at || item.submitted_at || null,
                        completed_at: updatedWorkflow.completed_at || item.completed_at || null
                    }));
                    replaced = true;
                } else {
                    nextItems.push(item);
                }
            }

            if (!replaced) {
                nextItems.push({
                    id: workflowId,
                    workflow_id: workflowId,
                    workflow_name: updatedWorkflow.workflow_name || 'Workflow',
                    status: (updatedWorkflow.execution_metadata && updatedWorkflow.execution_metadata.status) || updatedWorkflow.status || null,
                    submitted_at: updatedWorkflow.submitted_at || null,
                    completed_at: updatedWorkflow.completed_at || null,
                    selected: true
                });
            }

            SessionWorkflowsSelectionStore.setItems(this._sessionWorkflowsSelectionState, nextItems);
            if (this.displayWidget && this.displayWidget.setSessionWorkflows) {
                this.displayWidget.setSessionWorkflows(this._sessionWorkflowsSelectionState.items);
            }
            this._syncWorkflowsSelectionsToWidgets();
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