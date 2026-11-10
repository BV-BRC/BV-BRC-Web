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
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/request', // HTTP request utilities
  'markdown-it/dist/markdown-it.min', // Markdown parser
  'markdown-it-link-attributes/dist/markdown-it-link-attributes.min', // Plugin to add attributes to links
  './ChatMessage', // Custom message display widget
  './data/SuggestedQuestions', // Suggested questions data module
  './PlanTracker',
  './TurnFollow' // keep the progress card in view while a turn runs
], function (
  declare, ContentPane, domConstruct, on, topic, lang, domClass, domStyle, request, markdownit, linkAttributes, ChatMessage, SuggestedQuestions, PlanTracker, TurnFollow
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

    // A turn is running in this chat and the view follows its progress card
    // (TurnFollow.js): set on ChatSession:TurnStarted, cleared when the answer
    // starts, the user scrolls up, the turn ends or the session changes.
    _followTurn: false,
    _followSessionId: null,
    _scrollIntentAt: 0,
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

        this.panelContainer = domConstruct.create('div', {
          class: 'copilot-panel-container',
          style: 'height: 100%;'
        }, this.containerNode);

        // Create sticky plan tracker (hidden by default, shown during plan execution)
        this._planTracker = new PlanTracker({});
        this._planTracker.placeAt(this.panelContainer);
        this._planTracker.startup();

        // Create scrollable container for messages
        this.resultContainer = domConstruct.create('div', {
          class: 'copilot-result-container',
          style: 'padding-right: 10px;padding-left: 10px;'
        }, this.panelContainer);

        // "Jump to latest" button over the bottom of the message list.  Shown
        // while there is content below the view; after a response finishes
        // off-screen it reads "New response", so the user knows it is done
        // without scrolling to check.  Auto-scroll stays off while streaming.
        this._jumpButton = domConstruct.create('button', {
          type: 'button',
          class: 'copilot-jump-bottom',
          title: 'Jump to the latest message',
          'aria-label': 'Jump to the latest message',
          innerHTML: '<span class="copilot-jump-bottom-label">New response</span>' +
            '<svg class="copilot-jump-bottom-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
            '<path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round"/></svg>'
        }, this.panelContainer);
        on(this._jumpButton, 'click', lang.hitch(this, function() {
          this._jumpToBottom();
        }));

        // Apply initial responsive padding
        this._updateResponsivePadding();

        // Add scroll event listener to detect user scrolling
        on(this.resultContainer, 'scroll', lang.hitch(this, function() {
          this._userIsScrolling = true;
          // Scrolled up on purpose during a turn: stop following it.
          if (this._followTurn && Date.now() - this._scrollIntentAt < 1500 && !this._isAtBottom()) {
            this._followTurn = false;
          }
          this._updateJumpButton();

          // Clear existing timeout
          if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
          }

          // Set timeout to reset scrolling flag after 1 second of no scrolling
          this._scrollTimeout = setTimeout(lang.hitch(this, function() {
            this._userIsScrolling = false;
          }), 1000);
        }));

        // Input that means "let me look further up" (programmatic scrolls
        // also fire 'scroll', so intent comes from the input itself).
        ['wheel', 'keydown', 'touchstart', 'touchmove', 'mousedown'].forEach(lang.hitch(this, function(type) {
          on(this.resultContainer, type, lang.hitch(this, function(evt) {
            if (TurnFollow.isScrollUpIntent(evt)) {
              this._scrollIntentAt = Date.now();
            }
          }));
        }));

        // Show initial empty state
        this.showEmptyState();

        // Initialize markdown parser with link attributes plugin
        // No <img> from markdown: it would be fetched on render (see ChatMessage.md).
        this.md = markdownit().use(linkAttributes, {
          attrs: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }).disable('image');

        // Subscribe to message events
        topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
        topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
        topic.subscribe('chatTextSizeChanged', lang.hitch(this, 'setFontSize'));
        // Start at the saved Text Size: the setting is only published when
        // the floating window builds its options dialog, so the full-page
        // view used to ignore it.
        try {
          var savedTextSize = parseInt(window.localStorage && localStorage.getItem('copilot-text-size'), 10);
          if (savedTextSize >= 1 && savedTextSize <= 100) {
            this.fontSize = savedTextSize;
          }
        } catch (e) { /* ignore */ }
        // A turn in this chat finished: if the user is not at the bottom,
        // the jump button announces the new response.
        // A turn started in this chat: bring the progress into view and
        // follow it until the answer starts.
        topic.subscribe('ChatSession:TurnStarted', lang.hitch(this, function(data) {
          if (!data || data.sessionId !== this.sessionId) return;
          this._followTurn = true;
          this._followSessionId = this.sessionId;
          this.scrollToBottom();
        }));
        topic.subscribe('ChatSession:TurnEnded', lang.hitch(this, function(data) {
          if (!data || data.sessionId !== this.sessionId) return;
          this._followTurn = false;
          // Let the final render land first.
          setTimeout(lang.hitch(this, function() {
            if (!this._isAtBottom()) {
              this._hasNewResponse = true;
            }
            this._updateJumpButton();
          }), 0);
        }));
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
    /**
     * @param {Array} messages
     * @param {boolean} [scrollToBottom]
     * @param {boolean} [announce] - The refresh may have appended messages
     *   the user did not ask for (a job-completed message found by the
     *   workflow-watch poll): if the chat on screen grew and the user was
     *   at the bottom, follow it; otherwise light the "New response" pill.
     */
    showMessages: function(messages, scrollToBottom = false, announce = false) {
      if (!Array.isArray(messages)) {
        messages = [];
      }
      if (messages.length) {
        var previous = (this._messagesSessionId === this.sessionId && Array.isArray(this.messages)) ? this.messages : [];
        var grew = announce && previous.length > 0 && messages.length > previous.length;
        var wasAtBottom = this._isAtBottom();
        this._messagesSessionId = this.sessionId;
        this.messages = messages; // Store messages for redrawing

        // Check if user was near bottom before re-rendering
        var wasNearBottom = this._isNearBottom();

        // Clean up any body-appended selection hover popovers from previous renders
        var stalePopovers = document.querySelectorAll('body > .tool-card-selection-hover');
        for (var pi = 0; pi < stalePopovers.length; pi++) {
          stalePopovers[pi].parentNode.removeChild(stalePopovers[pi]);
        }
        domConstruct.empty(this.resultContainer);
        this._loadingIndicator = null;
        // Clarification cards: answered once any later user message exists
        // (an "Answered Questions" message, or a typed reply such as a plan
        // step's answer); otherwise they render as chips again (also after
        // a reload) with the user message they were asked about.
        messages = messages.map(function(message, i) {
          if (!message || !message.card || message.card.card_type !== 'clarification') return message;
          var later = messages.slice(i + 1);
          var before = messages.slice(0, i).reverse().filter(function(m) { return m && m.role === 'user'; })[0];
          return lang.mixin({}, message, {
            clarificationAnswered: later.some(function(m) { return m && (m.role === 'user_clarification' || m.role === 'user'); }),
            originalQuery: message.originalQuery || (before && before.content) || ''
          });
        });
        messages.forEach(lang.hitch(this, function(message) {
          new ChatMessage({
            ...message,
            fontSize: this.fontSize,
            copilotApi: this.copilotApi,
            sessionId: this.sessionId
          }, this.resultContainer);
        }));

        // Auto-scroll if explicitly requested OR if user was near bottom
        wasNearBottom = false;
        // While a turn runs, keep its progress card in view; once the answer
        // starts, stop following (the view is on the answer's first lines).
        if (this._followTurn) {
          if (this._followSessionId !== this.sessionId || TurnFollow.answerStarted(messages)) {
            this._followTurn = false;
          } else {
            scrollToBottom = true;
          }
        }
        if (scrollToBottom || wasNearBottom) {
          this.scrollToBottom();
        } else if (grew) {
          if (wasAtBottom) {
            this.scrollToBottom();
          } else if (!this._isAtBottom()) {
            this._hasNewResponse = true;
          }
        }
        this._updateJumpButton();
      } else {
        this.showEmptyState();
        this._hasNewResponse = false;
        this._updateJumpButton();
      }
    },

    /** True when the message list is scrolled to (within 40 px of) the bottom. */
    _isAtBottom: function() {
      var el = this.resultContainer;
      if (!el) return true;
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    },

    /**
     * Shows the jump button when there is content below the view (and the
     * messages panel is the one showing); "New response" styling after a turn
     * finished off-screen.  Reaching the bottom clears both.
     */
    _updateJumpButton: function() {
      if (!this._jumpButton) return;
      var messagesShown = !this.resultContainer || this.resultContainer.style.display !== 'none';
      var atBottom = this._isAtBottom();
      if (atBottom) {
        this._hasNewResponse = false;
      }
      domClass.toggle(this._jumpButton, 'visible', messagesShown && !atBottom);
      domClass.toggle(this._jumpButton, 'has-new', !!this._hasNewResponse);
    },

    _jumpToBottom: function() {
      var el = this.resultContainer;
      if (!el) return;
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        el.scrollTop = el.scrollHeight;
      }
      this._hasNewResponse = false;
      domClass.remove(this._jumpButton, 'has-new');
    },

    /**
     * Adds a single message to the display
     * Implementation:
     * - Creates new ChatMessage widget
     * - Appends to container
     */
    addMessage: function(message) {
      // Skip empty assistant messages (can occur after answering questions)
      if (message.role === 'assistant' && 
          (!message.content || String(message.content).trim() === '')) {
        console.log('Skipping empty assistant message', message);
        return;
      }
      
      new ChatMessage({
        ...message,
        copilotApi: this.copilotApi,
        sessionId: this.sessionId
      }, this.resultContainer);
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
      this._hasNewResponse = false;
      this._updateJumpButton();
    },

    /**
     * Displays error message when API request fails
     * Implementation:
     * - Appends error message below existing messages (non-destructive)
     * - Shows error message with reload button
     * - Removes any loading indicator that may still be visible
     */
    onQueryError: function(error = null) {
      console.log('onQueryError', error);

      // Remove any existing loading indicator without wiping messages
      this.hideLoadingIndicator();

      // Remove any previously appended error container so we don't
      // stack multiple error banners (e.g. rapid retries).
      var existingError = this.resultContainer.querySelector('.copilot-error-container');
      if (existingError) {
        domConstruct.destroy(existingError);
      }

      // Extract error message safely, handling various error formats
      var errorMessage = 'An error occurred while processing your request.';
      var errorDetails = null;
      var isStreamDisconnect = false;

      if (error) {
        isStreamDisconnect = error.isStreamDisconnect || false;

        if (error.message && typeof error.message === 'string' && error.message.trim()) {
          errorMessage = error.message;
        } else if (typeof error === 'string' && error.trim()) {
          errorMessage = error;
        } else if (error.error && typeof error.error === 'string' && error.error.trim()) {
          errorMessage = error.error;
        } else if (error.toString && typeof error.toString === 'function') {
          var errorStr = error.toString();
          if (errorStr && errorStr !== '[object Object]' && errorStr.trim()) {
            errorMessage = errorStr;
          }
        }

        // Capture additional error details for display (only for non-disconnect errors)
        if (!isStreamDisconnect && !error.noReload && (error.response || error.status || error.statusText || error.stack)) {
          errorDetails = {
            status: error.status || (error.response && error.response.status),
            statusText: error.statusText || (error.response && error.response.statusText),
            stack: error.stack
          };
        }
      }

      var errorContainer = domConstruct.create('div', {
        class: 'copilot-error-container'
      }, this.resultContainer);

      domConstruct.create('div', {
        innerHTML: errorMessage,
        class: 'copilot-error-message'
      }, errorContainer);

      // Show additional error details if available
      if (errorDetails && (errorDetails.status || errorDetails.statusText)) {
        var detailsText = [];
        if (errorDetails.status) {
          detailsText.push('Status: ' + errorDetails.status);
        }
        if (errorDetails.statusText) {
          detailsText.push(errorDetails.statusText);
        }

        domConstruct.create('div', {
          innerHTML: detailsText.join(' - '),
          class: 'copilot-error-details'
        }, errorContainer);
      }

      // Scroll the error into view so the user notices it
      this.resultContainer.scrollTop = this.resultContainer.scrollHeight;

      // A notice, not a failure (e.g. TURN_IN_FLIGHT): nothing to reload.
      if (error && error.noReload) {
        return;
      }

      var reloadButton = domConstruct.create('button', {
        innerHTML: 'Reload Session',
        class: 'copilot-error-reload-button'
      }, errorContainer);

      on(reloadButton, 'click', lang.hitch(this, function() {
        // If we have a session ID, reload it; otherwise start new chat
        if (this.sessionId) {
          // Clear the entire display and reload from DB
          domConstruct.empty(this.resultContainer);

          // Show loading state
          domConstruct.create('div', {
            innerHTML: 'Reloading session...',
            class: 'copilot-empty-state'
          }, this.resultContainer);

          // Reload session messages
          var reloadSessionId = this.sessionId;
          this.copilotApi.getSessionMessages(reloadSessionId).then(lang.hitch(this, function(res) {
            if (reloadSessionId !== this.sessionId) { return; }
            var messages = [];
            if (res && Array.isArray(res.messages)) {
              if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                messages = res.messages[0].messages; // Legacy nested API shape
              } else {
                messages = res.messages; // Current flat API shape
              }
            }
            this.messages = messages;
            this.showMessages(messages);
          })).catch(lang.hitch(this, function(error) {
            console.error('Error reloading session:', error);
            this.showError(error);
          }));
        } else {
          // No session ID available, start new chat
          this.startNewChat();
        }
      }));
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
      this._hasNewResponse = false;

      // Deactivate the plan tracker when switching sessions or starting
      // a new chat — it belongs to the previous session's plan.
      topic.publish('CopilotPlanTrackerDeactivate');
    },

    /**
     * Shows loading animation while waiting for response
     * Implementation:
     * - Only adds loading indicator message without re-rendering existing messages
     * - Scrolls to bottom
     */
    showLoadingIndicator: function(message) {
      this.hideLoadingIndicator();
      var label = message || '...';
      this._loadingIndicator = domConstruct.create('div', {
        class: 'message assistant',
        innerHTML: '<div style="font-size: ' + (message ? '14' : '24') + 'px; animation: bounce 1s infinite;">' + label + '</div>'
      }, this.resultContainer);
      this.scrollToBottom();
    },

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
