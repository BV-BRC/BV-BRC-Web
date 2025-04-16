/**
 * @module p3/widget/ChatSessionController
 * @description Controls the chat session window that appears when clicking the comment button.
 * Manages the window positioning, chat session display, and lifecycle.
 */
define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/on',
  'dojo/_base/lang',
  'dojo/topic',
  './ChatSessionControllerPanel'
], function (
  declare,
  WidgetBase,
  TemplatedMixin,
  domConstruct,
  domClass,
  domStyle,
  on,
  lang,
  topic,
  ChatSessionControllerPanel
) {

  return declare([WidgetBase, TemplatedMixin], {
    baseClass: 'ChatSessionController',

    templateString: '<div class="${baseClass}" data-dojo-attach-point="chatContainer"></div>',

    // Reference to the chat session widget
    chatSession: null,

    // Position relative to button
    buttonNode: null,

    // window open state
    isOpen: false,

    copilotApi: null,

    optionsBar: null,

    /**
     * @constructor
     * Initializes the widget with provided options
     * @param {Object} opts - Configuration options
     */
    constructor: function(opts) {
        this.inherited(arguments);
        lang.mixin(this, opts);
    },

    postCreate: function() {
      this.inherited(arguments);

      // Add styles
      this.addStyles();

      // Initially hide the window
      this.hide();


      topic.subscribe('hideChatPanel', lang.hitch(this, function() {
        this.hide();
      }));
      topic.subscribe('showChatPanel', lang.hitch(this, function() {
          this.show();
      }));
    },

    show: function(buttonNode) {
      this.buttonNode = buttonNode;
      this.isOpen = true;
      domClass.remove(this.domNode, 'hidden');
      this.position();

      if (!this.chatSession) {

        this.chatSession = new ChatSessionControllerPanel({
            style: 'height: 100%; width: 100%;',
            copilotApi: this.copilotApi,
            optionsBar: this.optionsBar
        });
        // Move the widget's DOM node to the document body
        document.body.appendChild(this.domNode);

        // Add the chat session to the container
        this.chatSession.startup();
        this.chatContainer.appendChild(this.chatSession.domNode);
      }

    },

    hide: function() {
      this.isOpen = false;
      domClass.add(this.domNode, 'hidden');
    },

    position: function() {
      if (!this.buttonNode) return;

      // Get button position
      var rect = this.buttonNode.getBoundingClientRect();

      // Position window to the left of the button, aligned with its top
      domStyle.set(this.domNode, {
        position: 'fixed',
        top: (rect.top - 525) + 'px',
        left: (rect.left) + 'px' // Slightly more offset to prevent overlap
      });
    },

    addStyles: function() {
      // Update styles to ensure proper layout
      var styleText = [
        '.' + this.baseClass + ' {',
        '  position: fixed;',
        '  width: 500px;',
        '  height: 500px;',
        '  background: white;',
        '  border-radius: 8px;',
        '  border: 1px solid #ccc;',
        '  box-shadow: 0 2px 10px rgba(0,0,0,0.1);',
        '  z-index: 9999;',
        '  display: flex;',
        '  flex-direction: column;',
        '  overflow: hidden;',
        '  padding: 0;',
        '}',

        '.' + this.baseClass + 'Content {',
        '  flex: 1;',
        '  overflow: hidden;',
        '}',

        '.' + this.baseClass + '.hidden {',
        '  display: none;',
        '}'
      ].join('\n');

      domConstruct.create('style', {
        innerHTML: styleText
      }, document.head);
    }
  });
});
