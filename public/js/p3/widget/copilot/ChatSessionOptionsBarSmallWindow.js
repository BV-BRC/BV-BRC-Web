/**
 * @module BasicChatOptionsWidget
 * @description A basic widget template extending ChatSessionOptionsBar
 * Provides a simplified starting point for creating chat option widgets
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dijit/form/Button',
    'p3/widget/copilot/ChatSessionOptionsBar'
], function (
    declare,
    lang,
    topic,
    Button,
    ChatSessionOptionsBar
) {
    /**
     * @class BasicChatOptionsWidget
     * @extends {p3/widget/copilot/ChatSessionOptionsBar}
     *
     * A basic template widget that extends ChatSessionOptionsBar
     * Customize this template for your specific needs
     */
    return declare([ChatSessionOptionsBar], {

        /** @property {string} baseClass - CSS class for styling */
        baseClass: 'basicChatOptionsWidget',

        /** @property {string} title - Widget title */
        title: 'Basic Chat Options',

        /** @property {Object} customOptions - Custom configuration options */
        customOptions: null,

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options to mix into the widget
         */
        constructor: function(opts) {
            this.inherited(arguments);
        },

        /**
         * Called after widget creation
         * Override to add custom functionality
         */
        postCreate: function() {
            // Call parent postCreate first
            this.inherited(arguments);
        }
    });
});