/**
 * @module p3/widget/CopilotDisplay
 * @description A ContentPane-based widget that displays chat messages in a scrollable container.
 * Handles rendering of user and assistant messages, error states, and empty states.
 */
define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/on', 'dojo/topic', 'dojo/_base/lang'
], function (
  declare, ContentPane, domConstruct, on, topic, lang
) {
  /**
   * @class CopilotDisplay
   * @extends {dijit/layout/ContentPane}
   */
  return declare([ContentPane], {
    /** @property {Object} copilotApi - Reference to the CopilotAPI instance */
    copilotApi: null,

    /** @property {string} sessionId - Current chat session identifier */
    sessionId: null,

    /** @property {Array} messages - Array to store chat messages */
    messages: [],

    /** @property {string} emptyMessage - Text to display when no messages exist */
    emptyMessage: 'No messages yet. Start a conversation!',

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     * @description Initializes the widget and mixes in provided options
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * @description Sets up the widget after creation
     * Creates message container, shows empty state, and subscribes to topics
     */
    postCreate: function() {
      this.inherited(arguments);

      // Create a container for displaying the query result
      this.resultContainer = domConstruct.create('div', {
        class: 'copilot-result-container',
        style: 'width: 60%; height: 100%; overflow-y: auto; padding: 10px; border: 0; margin: 0 auto;'
      }, this.containerNode);

      // Show empty state initially
      this.showEmptyState();

      // Subscribe to the 'query' topic
      topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
      topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
    },

    /**
     * @method showEmptyState
     * @description Displays the empty state message when no chat messages exist
     */
    showEmptyState: function() {
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: this.emptyMessage,
        style: 'color: #666; padding: 10px; text-align: center;'
      }, this.resultContainer);
    },

    /**
     * @method showMessages
     * @param {Array} messages - Array of message objects to display
     * @description Renders chat messages in the display container
     * Each message is styled differently based on role (user/assistant)
     */
    showMessages: function(messages) {
      if (messages.length) {
        domConstruct.empty(this.resultContainer);
        console.log('show messages', messages);
        // Create a message element for each message
        messages.forEach(lang.hitch(this, function(message) {
            var messageDiv = domConstruct.create('div', {
                class: 'message ' + message.role,
                style: 'margin-bottom: 10px; padding: 10px; border-radius: 5px; width: 40%; ' +
                       (message.role === 'user' ?
                         'background-color: #e6f3ff; margin-left: auto;' :
                         'background-color: #f5f5f5; margin-right: auto;')
            }, this.resultContainer);

            domConstruct.create('div', {
                innerHTML: message.content,
                style: 'white-space: pre-wrap; word-wrap: break-word;'
            }, messageDiv);
        }));

        // Scroll to bottom after messages are rendered
        this.scrollToBottom();
      } else {
        this.showEmptyState();
      }
    },

    /**
     * @method scrollToBottom
     * @description Scrolls the message container to the bottom
     */
    scrollToBottom: function() {
      if (this.resultContainer) {
        this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
      }
    },

    /**
     * @method onQueryError
     * @description Displays error message when API request fails
     */
    onQueryError: function() {
      console.log('onQueryError');
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: 'An error occurred while processing your request. Please try again later.',
        style: 'color: red; padding: 10px;'
      }, this.resultContainer);
    },

    /**
     * @method clearMessages
     * @description Clears all messages and shows empty state
     */
    clearMessages: function() {
      this.messages = [];
      this.showEmptyState();
    },

    /**
     * @method startNewChat
     * @description Initiates a new chat session by clearing existing messages
     */
    startNewChat: function() {
      this.clearMessages();
    },

    /**
     * @method setSessionId
     * @param {string} sessionId - Session identifier to set
     * @description Updates the current session ID
     */
    setSessionId: function(sessionId) {
      this.sessionId = sessionId;
    },

    /**
     * @method showLoadingIndicator
     * @description Displays a loading animation at the bottom of the chat
     */
    showLoadingIndicator: function() {
      var loadingDiv = domConstruct.create('div', {
        class: 'message assistant loading',
        style: 'margin-bottom: 10px; padding: 10px; border-radius: 5px; background-color: #f5f5f5; width: 25%;'
      }, this.resultContainer);

      domConstruct.create('div', {
        innerHTML: '...',
        style: 'font-size: 24px; animation: bounce 1s infinite;'
      }, loadingDiv);

      // Add CSS animation
      if (!document.getElementById('loading-animation')) {
        var style = domConstruct.create('style', {
          id: 'loading-animation',
          innerHTML: `
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
          `
        }, document.head);
      }

      // Store reference to remove later
      this._loadingIndicator = loadingDiv;

      // Scroll to show loading indicator
      this.scrollToBottom();
    },

    /**
     * @method hideLoadingIndicator
     * @description Removes the loading animation
     */
    hideLoadingIndicator: function() {
      if (this._loadingIndicator) {
        domConstruct.destroy(this._loadingIndicator);
        this._loadingIndicator = null;
      }
    }
  });
});
