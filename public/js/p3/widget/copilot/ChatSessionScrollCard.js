/**
 * @module p3/widget/ChatSessionScrollCard
 * @description A widget that displays a single chat session as a clickable card.
 * Renders session details like ID, creation date and title in a styled container.
 * Handles click interactions to load and display the selected chat session.
 *
 * Implementation:
 * - Extends _WidgetBase and _TemplatedMixin for widget functionality
 * - Uses HTML template with attachment points for dynamic content
 * - Handles session data display, styling and click interactions
 * - Manages session deletion through delete button
 * - Provides hover effects and visual feedback
 */
define([
    'dojo/_base/declare', // Base class for creating Dojo classes
    'dijit/_WidgetBase', // Base widget functionality
    'dijit/_TemplatedMixin', // Template support
    'dojo/dom-construct', // DOM manipulation
    'dojo/on', // Event handling
    'dojo/topic', // Pub/sub messaging
    'dojo/_base/lang', // Language utilities
    './CopilotApi' // API for chat operations
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    domConstruct,
    on,
    topic,
    lang,
    CopilotAPI
) {
    /**
     * @class ChatSessionScrollCard
     * Main widget class for displaying individual chat session cards
     * Handles display and interaction for a single chat session
     */
    return declare([_WidgetBase, _TemplatedMixin], {
        /**
         * HTML template for card layout with attachment points
         * Structure:
         * - Container div with chat-session-card class
         * - Title section
         * - Date container with date and delete button
         */
        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
                '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
                '<div class="delete-button" data-dojo-attach-point="deleteButtonNode">Delete</div>' +
            '</div>' +
        '</div>',

        /** CSS class for root node styling */
        baseClass: 'chat-session-card',

        /** Stores chat session data passed to widget */
        session: null,

        /** Reference to CopilotAPI for backend operations */
        copilotApi: null,

        /**
         * Initializes card after creation
         * - Applies container and element styles
         * - Sets up session data display
         * - Configures event handlers
         *
         * Implementation:
         * 1. Style container with fixed dimensions and positioning
         * 2. Style delete button with hover effects
         * 3. Display session data (date, title)
         * 4. Set up click handlers for session loading
         * 5. Configure delete button behavior
         * 6. Add hover effects
         */
        postCreate: function() {
            this.inherited(arguments);

            // Container styling for fixed positioning and dimensions
            this.containerNode.style.cssText =
                'width: 100%; height: 110px; max-height: 110px; background-color: #f0f0f0; ' +
                'border: 1px solid #ccc; border-radius: 0px; cursor: pointer; ' +
                'padding: 10px; transition: background-color 0.2s; ' +
                'position: relative; margin:0px; ' +
                'left: 0; right: 0; ' +
                'box-sizing: border-box;';

            // Delete button styling with hover effects
            this.deleteButtonNode.style.cssText =
                'cursor: pointer; width: auto; height: 20px; text-align: center; line-height: 20px; ' +
                'border-radius: 0; background-color: #f0f0f0; color: #808080; ' +
                'font-size: 12px; display: flex; align-items: center; justify-content: center; padding: 0 5px;';

            if (this.session) {
                // Display formatted creation date
                if (this.session.created_at) {
                    this.dateNode.innerHTML = new Date(this.session.created_at).toLocaleString().split(',')[0];
                    this.dateNode.style.cssText = 'font-size: 0.9em;';
                }

                // Display truncated title (max 60 chars)
                if (this.session.title) {
                    this.titleNode.innerHTML = this.session.title.length > 60 ?
                        this.session.title.substring(0, 60) + '...' :
                        this.session.title;
                    this.titleNode.style.cssText = 'font-weight: bold; margin-bottom: 5px;';
                }

                // Click handler to load session messages
                on(this.containerNode, 'click', lang.hitch(this, function(evt) {
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

                // Delete button interaction handlers
                on(this.deleteButtonNode, 'mousedown', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#d0d0d0';
                }));
                on(this.deleteButtonNode, 'mouseup', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0';
                }));
                on(this.deleteButtonNode, 'mouseleave', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0';
                }));
                on(this.deleteButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    topic.publish('ChatSession:Delete', this.session.session_id);
                }));

                // Container hover effects
                on(this.containerNode, 'mouseover', function() {
                    this.style.backgroundColor = '#e0e0e0';
                });
                on(this.containerNode, 'mouseout', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });
            }
        }
    });
});