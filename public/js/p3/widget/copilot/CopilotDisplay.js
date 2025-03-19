/**
 * @module p3/widget/CopilotDisplay
 * @description A ContentPane-based widget that displays chat messages in a scrollable container.
 * Handles rendering of user and assistant messages, error states, and empty states.
 *
 * Implementation:
 * - Extends ContentPane to provide scrollable message display
 * - Uses ChatMessage widget to render individual messages
 * - Handles loading states and error conditions
 * - Provides methods for message management and session control
 * - Implements markdown rendering for message content
 */

// Import markdown-it from CDN
// https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js

define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dijit/layout/ContentPane', // Parent class for layout container
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Pub/sub messaging
  'dojo/_base/lang', // Language utilities like hitch
  'markdown-it/dist/markdown-it.min', // Markdown parser
  './ChatMessage' // Custom message display widget
], function (
  declare, ContentPane, domConstruct, on, topic, lang, markdownit, ChatMessage
) {

  /**
   * @class CopilotDisplay
   * @extends {dijit/layout/ContentPane}
   *
   * Main widget class that manages chat message display.
   * Handles message rendering, scrolling, loading states and errors.
   */
  return declare([ContentPane], {

    // Reference to the CopilotAPI instance for backend operations
    copilotApi: null,

    // Current chat session identifier
    sessionId: null,

    // Array to store chat message objects
    messages: [],

    // Default message shown when no messages exist
    emptyMessage: 'No messages yet. Start a conversation!',

    /**
     * Constructor that initializes the widget
     * Mixes in any provided configuration options using safeMixin
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
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
      this.inherited(arguments);

      // Create scrollable container for messages
      this.resultContainer = domConstruct.create('div', {
        class: 'copilot-result-container'
      }, this.containerNode);

      // Show initial empty state
      this.showEmptyState();

      // Initialize markdown parser
      this.md = markdownit();

      // Subscribe to message events
      topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
      topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
    },

    /**
     * Displays empty state message when no chat messages exist
     * Implementation:
     * - Clears existing messages
     * - Shows centered empty state message
     */
    showEmptyState: function() {
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: this.emptyMessage,
        class: 'copilot-empty-state'
      }, this.resultContainer);
    },

    /**
     * Renders an array of chat messages in the display
     * Implementation:
     * - Clears existing messages
     * - Creates ChatMessage widget for each message
     * - Scrolls to bottom after rendering
     * - Shows empty state if no messages
     */
    showMessages: function(messages) {
      if (messages.length) {
        domConstruct.empty(this.resultContainer);
        console.log('show messages', messages);

        messages.forEach(lang.hitch(this, function(message) {
          new ChatMessage(message, this.resultContainer);
        }));

        this.scrollToBottom();
      } else {
        this.showEmptyState();
      }
    },

    /**
     * Adds a single message to the display
     * Implementation:
     * - Creates new ChatMessage widget
     * - Appends to container
     */
    addMessage: function(message) {
      new ChatMessage(message, this.resultContainer);
    },

    /**
     * Scrolls the message container to the bottom
     * Implementation:
     * - Sets scrollTop to maximum scroll height
     */
    scrollToBottom: function() {
      if (this.resultContainer) {
        this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
      }
    },

    /**
     * Displays error message when API request fails
     * Implementation:
     * - Clears existing messages
     * - Shows red error message
     */
    onQueryError: function() {
      console.log('onQueryError');
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: 'An error occurred while processing your request. Please try again later.',
        class: 'copilot-error'
      }, this.resultContainer);
    },

    /**
     * Clears all messages and resets to empty state
     * Implementation:
     * - Empties messages array
     * - Shows empty state message
     */
    clearMessages: function() {
      this.messages = [];
      this.showEmptyState();
    },

    /**
     * Starts a new chat session
     * Implementation:
     * - Clears existing messages
     */
    startNewChat: function() {
      this.clearMessages();
    },

    /**
     * Updates the current session ID
     * Implementation:
     * - Sets new session identifier
     */
    setSessionId: function(sessionId) {
      this.sessionId = sessionId;
    },

    /**
     * Shows loading animation while waiting for response
     * Implementation:
     * - Optionally re-renders existing messages
     * - Adds loading indicator message
     * - Scrolls to bottom
     */
    showLoadingIndicator: function(chatMessages) {
      if (chatMessages && chatMessages.length > 0) {
        domConstruct.empty(this.resultContainer);
        chatMessages.forEach(lang.hitch(this, function(message) {
          this.addMessage(message);
        }));
      }
      this.addMessage({
        role: 'assistant',
        content: '...',
        message_id: 'loading-indicator'
      });

      this.scrollToBottom();
    },

    /**
     * Removes the loading animation
     * Implementation:
     * - Destroys loading indicator element if exists
     */
    hideLoadingIndicator: function() {
      if (this._loadingIndicator) {
        domConstruct.destroy(this._loadingIndicator);
        this._loadingIndicator = null;
      }
    }
  });
});
