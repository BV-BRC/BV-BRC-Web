/**
 * @module p3/widget/ChatSessionControllerPanel
 * @description A specialized version of ChatSessionSidePanel designed to work within the ChatSessionController window.
 * Provides chat functionality in a floating window context.
 */
define([
    'dojo/_base/declare',
    './ChatSessionContainer',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/on',
    './CopilotInput',
    './CopilotDisplay'
], function(
    declare,
    ChatSessionContainer,
    lang,
    domClass,
    domConstruct,
    domStyle,
    on,
    CopilotInput,
    CopilotDisplay
) {
    return declare([ChatSessionContainer], {
        baseClass: 'ChatSessionControllerPanel',

        /** @property {string} style - CSS styling for container dimensions */
        style: 'height: 100%; width: 100%; position: absolute; background-color: #ffffff; opacity: 1;',

        /** @property {Object} optionsBar - Reference to options bar widget */
        optionsBar: null,

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options
         */
        constructor: function(opts) {
            this.inherited(arguments);
            if (opts) {
                lang.mixin(this, opts);
            }
        },

        postCreate: function() {
            this.inherited(arguments);
            domClass.add(this.domNode, 'floatingPanel');

            // Ensure this widget and its domNode properly fill the parent container
            domStyle.set(this.domNode, {
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                position: 'relative'
            });

            // Force layout recalculation after creation
            setTimeout(lang.hitch(this, function() {
                this.resize();
            }), 0);
        },

        /**
         * Creates input widget component
         * Handles user message input and submission
         */
        _createInputWidget: function() {
            this.inputWidget = new CopilotInput({
                region: 'bottom',
                splitter: true,
                style: 'height: 15%; padding: 0 5px 5px 20px; border: 0;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId
            });
            this.addChild(this.inputWidget);
        },

        /**
         * Creates display widget component
         * Handles user message input and submission
         */
        _createDisplayWidget: function() {
            this.displayWidget = new CopilotDisplay({
                region: 'center',
                style: 'padding: 0 5px 5px 5px; border: 0; background-color: #ffffff; opacity: 1;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                sessionId: this.sessionId
            });
            this.addChild(this.displayWidget);
        },
    });
});
