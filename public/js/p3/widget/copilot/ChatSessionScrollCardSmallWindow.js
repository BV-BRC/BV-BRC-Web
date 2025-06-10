/**
 * @module p3/widget/copilot/ChatSessionScrollCardSmallWindow
 * @description A small window version of the ChatSessionScrollCard widget.
 * Extends the base ChatSessionScrollCard with modified styling for smaller displays.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    './ChatSessionScrollCard'
], function(
    declare,
    lang,
    ChatSessionScrollCard
) {
    return declare([ChatSessionScrollCard], {
        baseClass: 'ChatSessionScrollCardSmallWindow',

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

            // Modify delete button for smaller size
            if (this.deleteButtonNode) {
                this.deleteButtonNode.style.cssText =
                    'cursor: pointer; width: auto; height: 18px; text-align: center; line-height: 18px; ' +
                    'border-radius: 3px; background-color: #f8f8f8; color: #999; ' +
                    'font-size: 11px; display: flex; align-items: center; justify-content: center; padding: 0 4px; ' +
                    'border: 1px solid #ddd; transition: all 0.2s ease;';
            }
        }
    });
});