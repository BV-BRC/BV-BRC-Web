/**
 * @module p3/widget/copilot/ChatSessionScrollCardSmallWindow
 * @description A small window version of the ChatSessionScrollCard widget.
 * Extends the base ChatSessionScrollCard with modified styling for smaller displays.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/dom-construct',
    './ChatSessionScrollCard'
], function(
    declare,
    lang,
    on,
    TooltipDialog,
    popup,
    domConstruct,
    ChatSessionScrollCard
) {
    return declare([ChatSessionScrollCard], {
        baseClass: 'ChatSessionScrollCardSmallWindow',

        // Rating dialog reference
        ratingDialog: null,

        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
        '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
        '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
            '<div class="rating-button" data-dojo-attach-point="ratingButtonNode"></div>' +
            '<div class="delete-button" data-dojo-attach-point="deleteButtonNode">Delete</div>' +
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
                    'padding: 8px; transition: all 0.2s ease; ' +
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
                this.titleNode.style.cssText = 'font-weight: bold; margin-bottom: 3px; font-size: 0.9em; line-height: 1.2;';
            }

            // Modify date styling
            if (this.dateNode) {
                this.dateNode.style.cssText = 'font-size: 0.8em; color: #666;';
            }

            // Set up rating button with star outline styling and click handler
            if (this.ratingButtonNode) {
                this.ratingButtonNode.innerHTML = '☆'; // Star outline character
                this.ratingButtonNode.style.cssText =
                    'cursor: pointer; width: auto; height: 18px; text-align: center; line-height: 18px; ' +
                    'border-radius: 3px; background-color: transparent; color: #666; ' +
                    'font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0 4px; ' +
                    'border: none; transition: all 0.2s ease; user-select: none;';

                // Add hover effect
                this.ratingButtonNode.onmouseenter = function() {
                    this.style.backgroundColor = '#e8e8e8';
                    this.style.color = '#333';
                };

                this.ratingButtonNode.onmouseleave = function() {
                    this.style.backgroundColor = 'transparent';
                    this.style.color = '#666';
                };

                // Create rating dialog
                this._createRatingDialog();

                // Add click event handler to show rating popup
                this.own(on(this.ratingButtonNode, 'click', lang.hitch(this, function(event) {
                    event.stopPropagation(); // Prevent event bubbling to parent card

                    if (this.ratingDialog.visible) {
                        popup.close(this.ratingDialog);
                        this.ratingDialog.visible = false;
                    } else {
                        popup.open({
                            popup: this.ratingDialog,
                            around: this.ratingButtonNode,
                            orient: ['below-centered']
                        });
                        this.ratingDialog.visible = true;
                    }
                })));

                // Handle clicks outside dialog to close it
                this.own(on(document, 'click', lang.hitch(this, function(event) {
                    if (this.ratingDialog && this.ratingDialog.visible &&
                        this.ratingDialog._rendered &&
                        !this.ratingDialog.domNode.contains(event.target) &&
                        !this.ratingButtonNode.contains(event.target)) {
                        popup.close(this.ratingDialog);
                        this.ratingDialog.visible = false;
                    }
                })));
            }

            // Modify delete button for smaller size
            if (this.deleteButtonNode) {
                this.deleteButtonNode.style.cssText =
                    'cursor: pointer; width: auto; height: 18px; text-align: center; line-height: 18px; ' +
                    'border-radius: 3px; background-color: #f8f8f8; color: #999; ' +
                    'font-size: 11px; display: flex; align-items: center; justify-content: center; padding: 0 4px; ' +
                    'border: 1px solid #ddd; transition: all 0.2s ease;';
            }
        },

         /**
         * Creates the star rating dialog with 5 clickable stars
         * @returns {TooltipDialog} The configured rating dialog
         */
         _createRatingDialog: function() {
            if (this.ratingDialog) {
                return this.ratingDialog;
            }

            this.ratingDialog = new TooltipDialog({
                style: "width: 155px; padding: 10px;",
                content: document.createElement('div')
            });

            // Create rating container
            var ratingContainer = domConstruct.create('div', {
                style: 'display: flex; justify-content: center; align-items: center; gap: 5px;'
            });

            // Create 5 star rating buttons
            for (var i = 1; i <= 5; i++) {
                var star = domConstruct.create('div', {
                    innerHTML: '☆', // Empty star
                    style: 'cursor: pointer; font-size: 24px; color: #ccc; transition: color 0.2s ease; user-select: none;',
                    'data-rating': i
                }, ratingContainer);

                // Add hover effects
                star.onmouseenter = function() {
                    var rating = parseInt(this.getAttribute('data-rating'));
                    var stars = this.parentNode.children;
                    for (var j = 0; j < stars.length; j++) {
                        if (j < rating) {
                            stars[j].style.color = '#ffc107'; // Gold color for hover
                            stars[j].innerHTML = '★'; // Filled star
                        } else {
                            stars[j].style.color = '#ccc';
                            stars[j].innerHTML = '☆'; // Empty star
                        }
                    }
                };

                // Add click handler
                this.own(on(star, 'click', lang.hitch(this, function(event) {
                    var rating = parseInt(event.target.getAttribute('data-rating'));
                    console.log('Star rating clicked:', rating, 'for session:', this.session ? this.session.title || 'Unknown Session' : 'No Session');
                    console.log('Session data:', this.session);

                    // Update stars to show selected rating
                    var stars = event.target.parentNode.children;
                    for (var k = 0; k < stars.length; k++) {
                        if (k < rating) {
                            stars[k].style.color = '#ffc107';
                            stars[k].innerHTML = '★';
                        } else {
                            stars[k].style.color = '#ccc';
                            stars[k].innerHTML = '☆';
                        }
                    }

                    // Close the popup after a brief delay to show the selection
                    setTimeout(lang.hitch(this, function() {
                        popup.close(this.ratingDialog);
                        this.ratingDialog.visible = false;
                    }), 500);

                    event.stopPropagation();
                })));
            }

            // Reset stars on mouse leave
            ratingContainer.onmouseleave = function() {
                var stars = this.children;
                for (var i = 0; i < stars.length; i++) {
                    stars[i].style.color = '#ccc';
                    stars[i].innerHTML = '☆';
                }
            };

            this.ratingDialog.containerNode.appendChild(ratingContainer);
            return this.ratingDialog;
        }
    });
});