define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/dom-construct',
    'dojo/on',
    'dojo/topic',
    'dojo/_base/lang',
    './CopilotAPI'
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    domConstruct,
    on,
    topic,
    lang,
    CopilotApi
) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="session-id" data-dojo-attach-point="sessionIdNode"></div>' +
            '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
        '</div>',

        baseClass: 'chat-session-card',
        session: null,
        copilotApi: null,

        postCreate: function() {
            this.inherited(arguments);

            // Apply base styles
            this.containerNode.style.cssText =
                'width: 180px; height: 180px; background-color: #f0f0f0; ' +
                'border: 1px solid #ccc; border-radius: 5px; cursor: pointer; ' +
                'padding: 10px; transition: background-color 0.2s;';

            if (this.session) {
                // Set session ID
                this.sessionIdNode.innerHTML = 'Session ID: ' + this.session.session_id;
                this.sessionIdNode.style.cssText = 'font-weight: bold; margin-bottom: 5px;';

                // Set date
                if (this.session.created_at) {
                    this.dateNode.innerHTML = 'Created: ' + new Date(this.session.created_at).toLocaleString();
                    this.dateNode.style.cssText = 'font-size: 0.9em;';
                }

                // Set title
                if (this.session.title) {
                    this.titleNode.innerHTML = this.session.title;
                    this.titleNode.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
                }

                // Add click handler
                on(this.containerNode, 'click', lang.hitch(this, function() {
                    // topic.publish('ChatSession:Selected', this.session);
                    if (this.copilotApi) {
                        var _self = this;
                        this.copilotApi.getSessionMessages(_self.session.session_id).then(function(messages) {
                            console.log('Session messages:', messages.messages);
                            topic.publish('ChatSession:Selected', {
                                sessionId: _self.session.session_id,
                                messages: messages.messages[0].messages
                            });
                        });
                    } else {
                        console.error('CopilotApi not initialized');
                    }
                }));

                // Add hover effects
                on(this.containerNode, 'mouseover', function() {
                    this.style.backgroundColor = '#e0e0e0';
                });
                on(this.containerNode, 'mouseout', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });

                // generate a title from the first message
                if (this.session.messages && this.session.messages.length > 0) {
                    this.titleNode.innerHTML = this.session.messages[0].content.substring(0, 20);
                }
            }
        }
    });
});