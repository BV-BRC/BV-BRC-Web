/**
 * @module p3/widget/copilot/ChatSessionScrollBarSmallWindow
 * @description A small window version of the ChatSessionScrollBar widget.
 * Extends the base ChatSessionScrollBar and uses ChatSessionScrollCardSmallWindow for cards.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-construct',
    './ChatSessionScrollBar',
    './ChatSessionScrollCardSmallWindow'
], function(
    declare,
    lang,
    domConstruct,
    ChatSessionScrollBar,
    ChatSessionScrollCardSmallWindow
) {
    return declare([ChatSessionScrollBar], {
        baseClass: 'ChatSessionScrollBarSmallWindow',

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
         * @method postCreate
         * Called after widget is created but before being rendered
         * Overrides parent to customize scroll container styling for small window
         */
        postCreate: function() {
            this.inherited(arguments);

            // Modify the scroll container to hide scrollbar while maintaining scroll functionality
            if (this.scrollContainer) {
                this.scrollContainer.style.cssText =
                    'width: 100%; height: 100%; overflow-x: hidden; display: flex; flex-direction: column; padding: 0; ' +
                    'overflow-y: scroll; scrollbar-width: none; -ms-overflow-style: none;';

                // Hide webkit scrollbars (Chrome, Safari, Edge)
                this.scrollContainer.style.setProperty('overflow-y', 'scroll');

                // Add webkit-scrollbar hiding styles dynamically
                var style = document.createElement('style');
                style.textContent = `
                    .ChatSessionScrollBarSmallWindow .dijitContentPane > div::-webkit-scrollbar {
                        display: none;
                    }
                    .ChatSessionScrollBarSmallWindow .dijitContentPane > div {
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                    }
                `;
                document.head.appendChild(style);
            }
        },

        /**
         * @method renderSessions
         * Renders the full list of chat session cards using ChatSessionScrollCardSmallWindow
         * Overrides parent method to use small window version of cards
         */
        renderSessions: function() {
            // Clear existing content
            domConstruct.empty(this.scrollContainer);

            // Reset session cards map
            this.sessionCards = {};

            // Create session cards using small window version
            this.sessions_list.forEach(function(session) {
                var sessionCard = new ChatSessionScrollCardSmallWindow({
                    session: session,
                    copilotApi: this.copilotApi
                });
                sessionCard.placeAt(this.scrollContainer);

                // Store reference to the card widget keyed by session ID
                this.sessionCards[session.session_id] = sessionCard;
            }, this);
        }
    });
});