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
  'dojo/dom-style',
  'markdown-it/dist/markdown-it.min', // Markdown parser
  './ChatMessage', // Custom message display widget
  './data/SuggestedQuestions' // Suggested questions data module
], function (
  declare, ContentPane, domConstruct, on, topic, lang, domStyle, markdownit, ChatMessage, SuggestedQuestions
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
    emptyMessage: 'No messages yet!',

    // Default font size
    fontSize: 14,

    // Number of questions to display
    suggestedQuestionsCount: 6,

    // Current suggested questions (will be randomly selected)
    suggestedQuestions: [],

    // Flag to ensure styles are injected only once
    _copilotStylesInjected: false,

    // Context to differentiate between main chat and side panel
    context: null,

    // User scroll state management
    _userIsScrolling: false,
    _scrollTimeout: null,

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
     * Sets up the widget after DOM creation
     * Implementation:
     * - Creates scrollable container for messages
     * - Initializes empty state display
     * - Sets up markdown parser
     * - Adds required CSS styles
     * - Subscribes to message refresh and error topics
     */
    postCreate: function() {
        // Inject styles for suggestion chips if not already injected
        if (!this._copilotStylesInjected) {
          var styleTag = domConstruct.create('style', {
            innerHTML: `
              .copilot-suggested-container { text-align: center; }
              .copilot-suggested-header { font-weight: 600; margin-bottom: 8px; }
              .copilot-suggested-list { list-style: none; padding-left: 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
              .copilot-suggested-list li { background: #f1f5f9; border: 1px solid #d1d5db; border-radius: 16px; padding: 6px 12px; font-size: 13px; color: #1f2937; cursor: pointer; transition: all 0.2s ease; }
              .copilot-suggested-list li:hover { background: #e2e8f0; border-color: #9ca3af; }
              .copilot-suggested-list li:active { background: #cbd5e1; }
            `
          }, document.head || document.getElementsByTagName('head')[0]);
          this._copilotStylesInjected = true;
        }
        // Create scrollable container for messages
        this.resultContainer = domConstruct.create('div', {
          class: 'copilot-result-container',
          style: 'padding-right: 10px;padding-left: 10px;'
        }, this.containerNode);

        // Apply initial responsive padding
        this._updateResponsivePadding();

        // Add scroll event listener to detect user scrolling
        on(this.resultContainer, 'scroll', lang.hitch(this, function() {
          this._userIsScrolling = true;

          // Clear existing timeout
          if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
          }

          // Set timeout to reset scrolling flag after 1 second of no scrolling
          this._scrollTimeout = setTimeout(lang.hitch(this, function() {
            this._userIsScrolling = false;
          }), 1000);
        }));

        // Show initial empty state
        this.showEmptyState();

        // Initialize markdown parser
        this.md = markdownit();

        // Subscribe to message events
        topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
        topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
        topic.subscribe('chatTextSizeChanged', lang.hitch(this, 'setFontSize'));
        topic.subscribe('noJobDataError', lang.hitch(this, function(error) {
            error.message = 'No job data found.\n\n' + error.message;
            this.onQueryError(error);
        }));
    },

    /**
     * Randomly selects a subset of questions from the full list
     * @param {number} count - Number of questions to select
     * @returns {Array} Array of randomly selected questions
     */
    _getRandomQuestions: function(count) {
      var allQuestions = SuggestedQuestions.getAllSuggestedQuestions();
      var questions = allQuestions.slice(); // Create a copy

      // Fisher-Yates shuffle algorithm
      for (var i = questions.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = questions[i];
        questions[i] = questions[j];
        questions[j] = temp;
      }

      // Return the first 'count' questions
      return questions.slice(0, count);
    },

    /**
     * Displays empty state message when no chat messages exist
     * Implementation:
     * - Clears existing messages
     * - Shows centered empty state message
     * - Creates clickable suggestion chips with context-specific or randomly selected questions
     */
    showEmptyState: function() {
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: this.emptyMessage,
        class: 'copilot-empty-state',
        style: 'text-align:center; margin-bottom: 12px;'
      }, this.resultContainer);

      // Use context-specific suggested questions if provided, otherwise get random questions
      if (this.suggestedQuestions && this.suggestedQuestions.length > 0) {
        // Use the context-specific questions that were passed in
        var questionsToShow = this.suggestedQuestions;
      } else {
        // Fall back to random questions if no context-specific ones provided
        questionsToShow = this._getRandomQuestions(this.suggestedQuestionsCount);
      }

      // Add suggested questions list below the empty state message
      if (questionsToShow && questionsToShow.length) {
        var suggestionContainer = domConstruct.create('div', {
          class: 'copilot-suggested-container'
        }, this.resultContainer);

        domConstruct.create('div', {
          innerHTML: 'Try asking:',
          class: 'copilot-suggested-header'
        }, suggestionContainer);

        var ul = domConstruct.create('ul', {
          class: 'copilot-suggested-list'
        }, suggestionContainer);

        questionsToShow.forEach(lang.hitch(this, function(q) {
          var suggestionItem = domConstruct.create('li', {
            innerHTML: q
          }, ul);

          // Add click handler to publish suggestion selection with context-specific topic
          on(suggestionItem, 'click', lang.hitch(this, function() {
            var topicKey = this.context === 'side-panel' ? 'populateInputSuggestionSidePanel' : 'populateInputSuggestion';
            topic.publish(topicKey, q);
          }));
        }));
      }
    },

    /**
     * Sets the font size and redraws messages
     * @param {number} size The new font size
     */
    setFontSize: function(size) {
      this.fontSize = size;
      if (this.messages && this.messages.length > 0) {
        this.showMessages(this.messages, false);
      }
    },

    /**
     * Checks if the user is currently scrolled near the bottom
     * @returns {boolean} True if user is at or near the bottom and not actively scrolling
     */
    _isNearBottom: function() {
      if (!this.resultContainer) return true;

      // Don't auto-scroll if user is actively scrolling or just stopped scrolling
      if (this._userIsScrolling) return false;

      var threshold = 100; // pixels from bottom to consider "near bottom"
      var scrollTop = this.resultContainer.scrollTop;
      var scrollHeight = this.resultContainer.scrollHeight;
      var clientHeight = this.resultContainer.clientHeight;

      return (scrollTop + clientHeight + threshold) >= scrollHeight;
    },

    /**
     * Renders an array of chat messages in the display
     * Implementation:
     * - Clears existing messages
     * - Creates ChatMessage widget for each message
     * - Scrolls to bottom after rendering
     * - Shows empty state if no messages
     */
    showMessages: function(messages, scrollToBottom = false) {
      if (messages.length) {
        this.messages = messages; // Store messages for redrawing

        // Check if user was near bottom before re-rendering
        var wasNearBottom = this._isNearBottom();

        domConstruct.empty(this.resultContainer);
        // console.log('show messages', messages);
        messages.forEach(lang.hitch(this, function(message) {
          new ChatMessage({
            ...message,
            fontSize: this.fontSize
          }, this.resultContainer);
        }));

        // Auto-scroll if explicitly requested OR if user was near bottom
        wasNearBottom = false;
        if (scrollToBottom || wasNearBottom) {
          this.scrollToBottom();
        }
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
    onQueryError: function(error = null) {
      debugger;
      console.log('onQueryError', error);
      domConstruct.empty(this.resultContainer);
      var errorMessage = error ? error.message : 'An error occurred while processing your request. Please try again later.';
      domConstruct.create('div', {
        innerHTML: errorMessage,
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
     * - Only adds loading indicator message without re-rendering existing messages
     * - Scrolls to bottom
     */
    showLoadingIndicator: function(chatMessages) {
      // Only add the loading indicator, don't re-render existing messages
      // since they're already displayed in the container
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

        // Calculate padding based on width
        var padding;
        if (containerWidth < 600) {
            padding = '10px';
        } else {
          // Linear increase from 10px to 100px between 600px and 1200px
          var minPadding = 10;
          var maxPadding = 100;
          var minWidth = 600;
          var maxWidth = 1200;

          // Calculate linear interpolation
          var ratio = 2.3*Math.min(1, (containerWidth - minWidth) / (maxWidth - minWidth));
          var calculatedPadding = Math.round(minPadding + (maxPadding - minPadding) * ratio);
          padding = calculatedPadding + 'px';
        }

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
      }
  });
});
