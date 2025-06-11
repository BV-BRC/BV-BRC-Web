/**
 * @module p3/widget/copilot/ChatSessionScrollCardSmallWindow
 * @description A small window version of the ChatSessionScrollCard widget.
 * Extends the base ChatSessionScrollCard with modified styling for smaller displays.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/topic',
    'dojo/dom-construct',
    './ChatSessionScrollCard'
], function(
    declare,
    lang,
    on,
    topic,
    domConstruct,
    ChatSessionScrollCard
) {
    return declare([ChatSessionScrollCard], {
        baseClass: 'ChatSessionScrollCardSmallWindow',

        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
        '<div class="session-title-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="delete-button" data-dojo-attach-point="deleteButtonNode"></div>' +
        '</div>' +
        '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
            '<div class="rating-container" data-dojo-attach-point="ratingContainerNode"></div>' +
        '</div>' + '</div>',

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options to mix into the widget
         */
        constructor: function(opts) {
            if (opts) {
                lang.mixin(this, opts);
            }
        },

        /**
         * Override postCreate to apply small window specific styling
         * Calls parent postCreate first, then applies custom modifications
         */
        postCreate: function() {
            // Call parent postCreate to get base functionality
            this.inherited(arguments);

            // Apply small window specific styling modifications
            if (this.containerNode) {
                // Modify container styling for smaller size
                this.containerNode.style.cssText =
                    'width: 100%; height: 100%; max-height: 70px; background-color: #f8f8f8; ' +
                    'border: 1px solid #ddd; border-radius: 0px; cursor: pointer; ' +
                    'padding: 8px; padding-right: 10px; transition: all 0.2s ease; ' +
                    'position: relative; margin: 0px 0; ' +
                    'left: 0; right: 0; ' +
                    'box-sizing: border-box; ' +
                    'box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
            }

            // Override title content with custom length limit for small window
            if (this.session && this.session.title && this.titleNode) {
                var maxLength = 30;
                this.titleNode.innerHTML = this.session.title.length > maxLength ?
                    this.session.title.substring(0, maxLength) + '...' :
                    this.session.title;
            }

            // Modify title styling for smaller cards
            if (this.titleNode) {
                this.titleNode.style.cssText = 'font-weight: bold; margin-bottom: 3px; font-size: 0.9em; line-height: 1.2; max-height: 30px; overflow:hidden;';
            }

            // Style the delete button for small window
            if (this.deleteButtonNode) {
                this.deleteButtonNode.style.cssText =
                    'opacity: 0.7; display: flex; align-items: center; justify-content: center; ' +
                    'font-size: 14px; cursor: pointer; width: 30px; height: 25px; ' +
                    'border-radius: 3px; background-color: transparent; color: #808080; ' +
                    'background-image: url("/public/icon_source/trash.svg"); ' +
                    'background-repeat: no-repeat; background-position: center; background-size: 12px 12px; ' +
                    'transform: translate(5px, -10px);';

                // Add tooltip to delete button
                this.deleteButtonNode.title = 'Delete chat session';

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
            }

            // Modify date styling
            if (this.dateNode) {
                this.dateNode.style.cssText = 'font-size: 0.7em; color: #666;';
            }
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
                    style: 'cursor: pointer; font-size: 12px; color: #ccc; transition: color 0.2s ease; user-select: none;',
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
        }
    });
});