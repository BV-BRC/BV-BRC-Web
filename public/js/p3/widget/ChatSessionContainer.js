define([
    'dojo/_base/declare',
    'dijit/layout/BorderContainer',
    './CopilotDisplay',
    './CopilotInput',
    './CopilotAPI',
    '../store/ChatSessionMemoryStore',
    'dojo/topic',
    'dojo/_base/lang'
], function (
    declare,
    BorderContainer,
    CopilotDisplay,
    CopilotInput,
    CopilotAPI,
    ChatSessionMemoryStore,
    topic,
    lang
) {
    return declare([BorderContainer], {
        gutters: false,
        liveSplitters: true,
        style: 'height: 100%; width: 100%;',
        sessionId: null,

        constructor: function(opts) {
            this.inherited(arguments);
            this.chatStore = new ChatSessionMemoryStore({
                copilotApi: this.copilotApi
            });
            declare.safeMixin(this, opts);
            window.App.chatStore = this.chatStore;
        },

        postCreate: function() {
            this.inherited(arguments);

            // check if copilotApi is passed in
            if (!this.copilotApi) {
                throw new Error('CopilotApi is required');
                return;
            }

            this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                this.sessionId = sessionId;

                // Add display pane
                this.displayWidget = new CopilotDisplay({
                    region: 'center',
                    style: 'padding: 10px; border: 2px solid red;',
                    copilotApi: this.copilotApi,
                    chatStore: this.chatStore,
                    sessionId: this.sessionId
                });
                this.addChild(this.displayWidget);

                // Add input pane
                this.inputWidget = new CopilotInput({
                    region: 'bottom',
                    style: 'padding: 10px; border: 2px solid blue;',
                    copilotApi: this.copilotApi,
                    chatStore: this.chatStore,
                    displayWidget: this.displayWidget,
                    sessionId: this.sessionId
                });
                this.addChild(this.inputWidget);
            })).catch(lang.hitch(this, function(error) {
                // Create error display pane
                this.displayWidget = new CopilotDisplay({
                    region: 'center',
                    style: 'padding: 10px; border: 2px solid red;'
                });
                this.addChild(this.displayWidget);

                // Show error message
                this.displayWidget.onQueryError();
            }));
        },

        setSessionId: function(sessionId) {
            this.sessionId = sessionId;
        }
    });
});