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
        '<div class="session-title-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="delete-button" data-dojo-attach-point="deleteButtonNode"></div>' +
        '</div>' +
        '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
            '<div class="rating-container" data-dojo-attach-point="ratingContainerNode"></div>' +
        '</div>' + '</div>',

        /** CSS class for root node styling */
        baseClass: 'chat-session-card',

        /** Stores chat session data passed to widget */
        session: null,

        /** Reference to CopilotAPI for backend operations */
        copilotApi: null,

        /** Default background color for this card */
        defaultBackgroundColor: '#f8f8f8',

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

            // Apply CSS classes instead of inline styles
            this.containerNode.className += ' scrollCardContainer';
            this.deleteButtonNode.className += ' scrollCardDelete';

            // Add tooltip to delete button
            this.deleteButtonNode.title = 'Delete chat session';

            if (this.session) {
                // Display formatted creation date
                if (this.session.created_at) {
                    this.dateNode.innerHTML = new Date(this.session.created_at).toLocaleString().split(',')[0];
                    this.dateNode.style.cssText = 'font-size: 0.9em;';
                }

                // Display truncated title (max 60 chars)
                if (this.session.title) {
                    this.titleNode.innerHTML = this.session.title;
                    this.titleNode.className += ' scrollCardTitle';
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
                            var messages = messages.messages.length > 0 ? messages.messages[0].messages : [];
                            topic.publish('ChatSession:Selected', {
                                sessionId: _self.session.session_id,
                                messages: messages
                            });
                            topic.publish('ChatSessionTitleUpdated', _self.session.title);
                        }).catch(function(error) {
                            console.error('Error fetching session messages:', error);
                        });
                    } else {
                        console.error('CopilotApi not initialized');
                    }
                }));

                // Add hover effects for delete button (matching copilotChatCloseButton:hover)
                this.own(on(this.deleteButtonNode, 'mouseenter', lang.hitch(this, function() {
                    this.deleteButtonNode.style.opacity = '1';
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0';
                })));

                this.own(on(this.deleteButtonNode, 'mouseleave', lang.hitch(this, function() {
                    this.deleteButtonNode.style.opacity = '0.7';
                    this.deleteButtonNode.style.backgroundColor = 'transparent';
                })));

                this.own(on(this.deleteButtonNode, 'mousedown', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#e0e0e0';
                })));

                this.own(on(this.deleteButtonNode, 'mouseup', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this.deleteButtonNode.style.backgroundColor = '#f0f0f0';
                })));

                // Add click handler for delete
                this.own(on(this.deleteButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    topic.publish('ChatSession:Delete', this.session.session_id);
                })));

                // Container hover effects
                on(this.containerNode, 'mouseover', lang.hitch(this, function() {
                    // Only apply hover color if not currently selected/highlighted
                    // Check for the selection highlight color (#e6f7ff)
                    var currentBg = this.containerNode.style.backgroundColor;
                    if (currentBg !== 'rgb(230, 247, 255)' && currentBg !== '#e6f7ff') {
                        this.containerNode.style.backgroundColor = '#e0e0e0';
                    }
                }));
                on(this.containerNode, 'mouseout', lang.hitch(this, function() {
                    // Only reset to default color if not currently selected/highlighted
                    var currentBg = this.containerNode.style.backgroundColor;
                    if (currentBg !== 'rgb(230, 247, 255)' && currentBg !== '#e6f7ff') {
                        this.containerNode.style.backgroundColor = this.defaultBackgroundColor;
                    }
                }));

                this.dateNode.style.cssText = 'font-size: 0.8em; color: #666;';
            }

            this.setupRating();
        },

        /**
         * Creates and configures the rating container with 5-star rating system
         * Override to use smaller stars for the small window
         * @returns {HTMLElement} The rating container element
         */
        createRatingContainer: function() {
            // Create rating container
            var ratingContainer = domConstruct.create('div', {
                style: 'display: flex; justify-content: center; align-items: center; gap: 1px;'
            });

            // Create 5 star rating buttons
            for (var i = 1; i <= 5; i++) {
                var star = domConstruct.create('div', {
                    innerHTML: '☆', // Empty star
                    style: 'cursor: pointer; font-size: 14px; color: #ccc; transition: color 0.2s ease; user-select: none;',
                    'data-rating': i
                }, ratingContainer);

                // Add click handler
                this.own(on(star, 'click', lang.hitch(this, function(event) {
                    var rating = parseInt(event.target.getAttribute('data-rating'));

                    // Update stars to show selected rating
                    var stars = event.target.parentNode.children;
                    for (var k = 0; k < stars.length; k++) {
                        if (k < rating) {
                            stars[k].style.color = 'var(--main-blue)';
                            stars[k].innerHTML = '★';
                        } else {
                            stars[k].style.color = '#ccc';
                            stars[k].innerHTML = '☆';
                        }
                    }

                    // Publish topic for setting conversation rating
                    topic.publish('SetConversationRating', {
                        sessionId: this.session ? this.session.session_id : null,
                        rating: rating
                    });

                    // Store the rating for this session
                    if (this.session) {
                        this.session.rating = rating;
                    }

                    event.stopPropagation();
                })));
            }

            return ratingContainer;
        },

        /**
         * Initializes the rating container and adds it to the ratingContainerNode
         */
        setupRating: function() {
            if (this.ratingContainerNode) {
                var ratingContainer = this.createRatingContainer();
                domConstruct.place(ratingContainer, this.ratingContainerNode);

                // If session has an existing rating, display it
                if (this.session && this.session.rating) {
                    this.updateStarDisplay(ratingContainer, this.session.rating);
                }
            }
        },

        /**
         * Updates the star display to show the specified rating
         * @param {HTMLElement} ratingContainer - The container holding the star elements
         * @param {number} rating - The rating value (1-5) to display
         */
        updateStarDisplay: function(ratingContainer, rating) {
            var stars = ratingContainer.children;
            for (var i = 0; i < stars.length; i++) {
                if (i < rating) {
                    stars[i].style.color = 'var(--main-blue)';
                    stars[i].innerHTML = '★';
                } else {
                    stars[i].style.color = '#ccc';
                    stars[i].innerHTML = '☆';
                }
            }
        }
    });
});