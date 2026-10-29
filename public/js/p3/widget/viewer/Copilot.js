/**
 * @module p3/widget/viewer/Copilot
 * @description Full-page viewer for the BV-BRC Copilot chat interface.
 * Provides the same chat functionality as the floating window but in a
 * dedicated page layout with a session sidebar on the left and the chat
 * area in the center.
 *
 * Accessible at /view/Copilot via the "AI > Chat" menu item under
 * Tools & Services.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/dom-construct',
    'dojo/dom-style',
    './Base',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'dijit/Dialog',
    '../copilot/CopilotApi',
    '../copilot/ChatSessionContainer',
    '../copilot/ChatSessionScrollBar',
    '../copilot/ChatSessionOptionsBar'
], function (
    declare, lang, on, topic, domConstruct, domStyle,
    Base, BorderContainer, ContentPane, Dialog,
    CopilotAPI, ChatSessionContainer, ChatSessionScrollBar, ChatSessionOptionsBar
) {
    return declare([Base], {

        baseClass: 'CopilotFullPageViewer',

        // Viewer metadata
        perspectiveLabel: 'Copilot Chat',

        // Internal references
        _copilotApi: null,
        _optionsBar: null,
        _scrollBar: null,
        _chatContainer: null,
        _sidebarContainer: null,
        _sidebarBorderContainer: null,
        _disabled: false,

        postCreate: function () {
            this.inherited(arguments);

            // Hide the floating chat button while this page is active, also
            // when logged out (one login prompt, not two).  Set the flag first
            // so late-initializing widgets (ChatButton) can check it, then
            // publish for any already-subscribed listeners.
            if (window.App) {
                window.App.copilotViewerActive = true;
            }
            topic.publish('CopilotViewerActive');

            if (!this._checkAuth()) {
                return;
            }

            // Build the UI
            this._initUI();
        },

        /**
         * Checks if the user is logged in. Shows a dialog and disables
         * the viewer if not authenticated.
         * @returns {boolean} true if authenticated
         */
        _checkAuth: function () {
            if (!window.App.authorizationToken || !window.App.user || !window.App.user.id) {
                var box = domConstruct.create('div', { style: 'text-align:center;padding:10px;' });
                domConstruct.create('p', { textContent: 'You must be logged in to use the Copilot Chat.' }, box);
                domConstruct.create('p', { textContent: 'Please sign in with your BV-BRC account to continue.' }, box);
                var loginBtn = domConstruct.create('button', {
                    type: 'button', class: 'chat-card-btn', textContent: 'Log in', style: 'margin-top: 6px;'
                }, box);
                var loginDialog = new Dialog({
                    title: 'Login Required',
                    content: box,
                    style: 'width:400px'
                });
                on(loginBtn, 'click', function () {
                    loginDialog.hide();
                    topic.publish('/login');
                });
                loginDialog.startup();
                loginDialog.show();
                this._disabled = true;
                return false;
            }
            return true;
        },

        /**
         * Initializes the CopilotApi, fetches the model list, then
         * builds the sidebar + chat layout.
         */
        _initUI: function () {
            this._copilotApi = new CopilotAPI({
                user_id: window.App.user.l_id
            });

            // Fetch model list then build layout (mirrors ChatButton flow)
            this._copilotApi.getModelList().then(lang.hitch(this, function (modelsAndRag) {
                var modelList = this._parseList(modelsAndRag.model_list || modelsAndRag.models);
                var ragList = this._parseList(modelsAndRag.rag_list || modelsAndRag.vdb_list);

                // Populate global references so child widgets can read them
                if (window.App) {
                    window.App.copilotModelList = modelList.slice();
                    window.App.copilotRagList = ragList.slice();
                }

                this._buildLayout(modelList, ragList);
            })).catch(lang.hitch(this, function (err) {
                console.error('Copilot viewer: failed to initialize', err);
                var errPane = new ContentPane({
                    region: 'center',
                    content: '<div style="text-align:center;padding:40px;color:#666;">' +
                             '<p style="font-size:16px;">The BV-BRC Copilot service is currently unavailable.</p>' +
                             '<p>Please try again later.</p></div>'
                });
                this.addChild(errPane);
            }));
        },

        /**
         * Builds the main two-panel layout: sidebar (left) + chat (center).
         */
        _buildLayout: function (modelList, ragList) {
            // Attempt to restore session from localStorage
            var savedSessionId = null;
            try {
                savedSessionId = window.localStorage ? localStorage.getItem('copilot-current-session-id') : null;
            } catch (e) { /* ignore */ }

            // --- Left sidebar ---
            this._sidebarContainer = new ContentPane({
                region: 'left',
                splitter: true,
                style: 'width:220px; padding:0; overflow:hidden; background:#fff; border-right:1px solid #ddd;'
            });
            this.addChild(this._sidebarContainer);

            // Inner BorderContainer to stack options bar (top) + session list (center)
            this._sidebarBorderContainer = new BorderContainer({
                gutters: false,
                style: 'width:100%; height:100%;'
            });
            this._sidebarBorderContainer.placeAt(this._sidebarContainer.domNode);

            // Options bar (new chat, model selector, etc.)
            this._optionsBar = new ChatSessionOptionsBar({
                region: 'top',
                style: 'padding:0; background:#fff; overflow-y:none; margin-bottom:0;',
                copilotApi: this._copilotApi,
                modelList: modelList,
                ragList: ragList
            });
            this._sidebarBorderContainer.addChild(this._optionsBar);

            // Session scroll bar (session list)
            this._scrollBar = new ChatSessionScrollBar({
                className: 'optionsBottomSection',
                region: 'center',
                style: 'min-height:100px; padding:0; margin:0; border:0; background:#f0f0f0;',
                copilotApi: this._copilotApi
            });
            this._sidebarBorderContainer.addChild(this._scrollBar);

            this._sidebarBorderContainer.startup();

            // Apply height distribution (same ratio as floating window)
            setTimeout(lang.hitch(this, function () {
                domStyle.set(this._optionsBar.domNode, 'height', '10%');
                domStyle.set(this._scrollBar.domNode, 'height', '90%');
                if (this._sidebarBorderContainer.resize) {
                    this._sidebarBorderContainer.resize();
                }
            }), 0);

            // --- Center: Chat session container ---
            var centerPane = new ContentPane({
                region: 'center',
                style: 'padding:0; border:0;'
            });
            this.addChild(centerPane);

            this._chatContainer = new ChatSessionContainer({
                style: 'width:100%; height:100%;',
                copilotApi: this._copilotApi,
                optionsBar: this._optionsBar,
                sessionId: savedSessionId || null
            });
            this._chatContainer.placeAt(centerPane.domNode);

            // If restoring a saved session, load its messages and title
            if (savedSessionId) {
                setTimeout(lang.hitch(this, function () {
                    if (!this._chatContainer) { return; }

                    this._copilotApi.getSessionMessages(savedSessionId).then(lang.hitch(this, function (res) {
                        // Skip if the user already moved on (New Chat, another session).
                        if (!this._chatContainer || this._chatContainer.sessionId !== savedSessionId) { return; }
                        var messages = [];
                        if (res && Array.isArray(res.messages)) {
                            if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                                messages = res.messages[0].messages;
                            } else {
                                messages = res.messages;
                            }
                        }
                        this._chatContainer.chatStore.addMessages(messages);
                        this._chatContainer.displayWidget.showMessages(messages);

                        // If the session has an in-flight turn, start polling
                        if (res.active_job_id && this._chatContainer._pollUntilTurnComplete) {
                            this._chatContainer._pollUntilTurnComplete(savedSessionId);
                        }
                    }), function () {
                        // 404: the chat was deleted; ChatSessionContainer starts a new one.
                    });

                    this._copilotApi.getSessionTitle(savedSessionId).then(lang.hitch(this, function (titleRes) {
                        if (titleRes.title && titleRes.title.length > 0) {
                            var title = titleRes.title[0].title;
                            if (this._chatContainer.titleWidget) {
                                this._chatContainer.titleWidget.updateTitle(title);
                            }
                        }
                    }), function () { /* deleted chat */ });
                }), 500);
            }

            // Force a layout pass once everything is placed
            setTimeout(lang.hitch(this, function () {
                this.resize();
            }), 200);
        },

        /**
         * Safely parse a value into an array.
         */
        _parseList: function (value) {
            if (Array.isArray(value)) { return value; }
            if (typeof value === 'string') {
                try {
                    var parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) { return []; }
            }
            return [];
        },

        startup: function () {
            if (this._started) { return; }
            this.inherited(arguments);
        },

        destroy: function () {
            // Re-show the floating chat button
            if (window.App) {
                window.App.copilotViewerActive = false;
            }
            topic.publish('CopilotViewerInactive');
            this.inherited(arguments);
        }
    });
});
