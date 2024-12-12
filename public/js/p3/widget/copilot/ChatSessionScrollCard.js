/**
 * @module p3/widget/ChatSessionScrollCard
 * @description A widget that displays a single chat session as a clickable card.
 * Renders session details like ID, creation date and title in a styled container.
 * Handles click interactions to load and display the selected chat session.
 */
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
    /**
     * @class ChatSessionScrollCard
     * @extends {dijit/_WidgetBase}
     * @extends {dijit/_TemplatedMixin}
     */
    return declare([_WidgetBase, _TemplatedMixin], {
        /**
         * @property {string} templateString - HTML template for the card layout
         * Defines attachment points for title, session ID and date elements
         */
        // '<div class="session-id" data-dojo-attach-point="sessionIdNode"></div>' +
        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
                '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
                '<div class="delete-button" data-dojo-attach-point="deleteButtonNode">Delete</div>' +
            '</div>' +
        '</div>',

        /** @property {string} baseClass - CSS class name for the root node */
        baseClass: 'chat-session-card',

        /** @property {Object} session - Chat session data object */
        session: null,

        /** @property {Object} copilotApi - Reference to the CopilotAPI instance */
        copilotApi: null,

        /**
         * @method postCreate
         * @description Initializes the card after creation
         * Applies styles, populates session data and sets up event handlers
         */
        postCreate: function() {
            this.inherited(arguments);

            // Update container styles to lock position
            this.containerNode.style.cssText =
                'width: 100%; height: 180px; background-color: #f0f0f0; ' +
                'border: 1px solid #ccc; border-radius: 0px; cursor: pointer; ' +
                'padding: 10px; transition: background-color 0.2s; ' +
                'position: relative; margin:0px; ' +  // Changed position and added margin
                'left: 0; right: 0; ' +  // Lock horizontal position
                'box-sizing: border-box;'; // Ensure padding is included in width calculation

            // Style delete button
            this.deleteButtonNode.style.cssText =
                'cursor: pointer; width: auto; height: 20px; text-align: center; line-height: 20px; ' +
                'border-radius: 0; background-color: #f0f0f0; color: #808080; ' +
                'font-size: 12px; display: flex; align-items: center; justify-content: center; padding: 0 5px;';

            if (this.session) {
                // Display session ID
                // this.sessionIdNode.innerHTML = 'Session ID: ' + this.session.session_id;
                // this.sessionIdNode.style.cssText = 'font-weight: bold; margin-bottom: 5px;';

                // Format and display creation date
                if (this.session.created_at) {
                    this.dateNode.innerHTML = new Date(this.session.created_at).toLocaleString().split(',')[0];
                    this.dateNode.style.cssText = 'font-size: 0.9em;';
                }

                // Display session title if available
                if (this.session.title) {
                    this.titleNode.innerHTML = this.session.title;
                    this.titleNode.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
                }

                // Set up click handler to load session messages
                on(this.containerNode, 'click', lang.hitch(this, function(evt) {
                    // Don't trigger if clicking delete button
                    if (evt.target === this.deleteButtonNode) {
                        return;
                    }

                    if (this.copilotApi) {
                        var _self = this;
                        this.copilotApi.getSessionMessages(_self.session.session_id).then(function(messages) {
                            console.log('Session messages:', messages.messages);
                            topic.publish('ChatSession:Selected', {
                                sessionId: _self.session.session_id,
                                messages: messages.messages[0].messages
                            });
                            topic.publish('ChatSessionTitleUpdated', _self.session.title);
                        });
                    } else {
                        console.error('CopilotApi not initialized');
                    }
                }));

                // Set up delete button click handler
                on(this.deleteButtonNode, 'mousedown', lang.hitch(this, function(evt) {
                    evt.stopPropagation(); // Prevent container click
                    this.deleteButtonNode.style.backgroundColor = '#d0d0d0'; // Darker when pressed
                }));
                on(this.deleteButtonNode, 'mouseup', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0'; // Original color
                }));
                on(this.deleteButtonNode, 'mouseleave', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0'; // Reset if mouse leaves while pressed
                }));
                on(this.deleteButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    topic.publish('ChatSession:Delete', this.session.session_id);
                }));

                // Add hover effect styles
                on(this.containerNode, 'mouseover', function() {
                    this.style.backgroundColor = '#e0e0e0';
                });
                on(this.containerNode, 'mouseout', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });

                // Generate title from first message if no title exists
                /*
                if (this.session.messages && this.session.messages.length > 0) {
                    this.titleNode.innerHTML = this.session.messages[0].content.substring(0, 20);
                }
                */
            }
        }
    });
});