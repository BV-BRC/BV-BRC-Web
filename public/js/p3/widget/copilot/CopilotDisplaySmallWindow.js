/**
 * @module p3/widget/CopilotDisplaySmallWindow
 * @description A specialized version of CopilotDisplay designed to work within small window contexts.
 * Extends CopilotDisplay with modifications for floating window display.
 */
define([
    'dojo/_base/declare',
    './CopilotDisplay',
    'dojo/_base/lang',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/topic',
    'markdown-it/dist/markdown-it.min'
], function(
    declare,
    CopilotDisplay,
    lang,
    domConstruct,
    domStyle,
    topic,
    markdownit
) {
    return declare([CopilotDisplay], {
        baseClass: 'CopilotDisplaySmallWindow',

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options
         */
        constructor: function(opts) {
            if (opts) {
                lang.mixin(this, opts);
            }
        },

        /**
         * Updates the padding of resultContainer based on current display width
         * @private
         */
        _updateResponsivePadding: function() {
            if (!this.resultContainer) return;

            // Get the width of the container or window
            var containerWidth = this.domNode ?
                domStyle.get(this.domNode, 'width') :
                window.innerWidth;

            // Apply responsive padding: 10px for < 800px, 100px for >= 800px
            var padding = containerWidth < 800 ? '10px' : '100px';

            domStyle.set(this.resultContainer, {
                'padding-left': padding,
                'padding-right': padding
            });
        },

        /**
         * Override resize method to update responsive padding
         */
        resize: function() {
            this.inherited(arguments);
            this._updateResponsivePadding();
        },

    /**
     * Sets up the widget after DOM creation
     * Implementation:
     * - Creates scrollable container for messages
     * - Initializes empty state display
     * - Sets up markdown parser
     * - Adds required CSS styles
     * - Subscribes to message refresh and error topics
     */
    postCreate: function() {
        // Create scrollable container for messages
        this.resultContainer = domConstruct.create('div', {
          class: 'copilot-result-container',
          style: 'padding-right: 10px;padding-left: 10px;'
        }, this.containerNode);

        // Apply initial responsive padding
        this._updateResponsivePadding();

        // Show initial empty state
        this.showEmptyState();

        // Initialize markdown parser
        this.md = markdownit();

        // Subscribe to message events
        topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
        topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
      },
    });
});