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
  './SessionFilesExplorerAdapter',
  './WorkflowsExplorerAdapter',
  './WorkflowEngine',
  './PlanTracker'
], function (
  declare, ContentPane, domConstruct, on, topic, lang, domClass, domStyle, request, markdownit, linkAttributes, ChatMessage, SuggestedQuestions, SessionFilesExplorerAdapter, WorkflowsExplorerAdapter, WorkflowEngine, PlanTracker
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

    // Session files panel state
    activePanel: 'messages',
    showPanelTabs: true,
    sessionFiles: [],
    sessionFilesPagination: null,
    sessionFileSummary: null,
    sessionFilesLoading: false,
    sessionFilesError: null,
    onLoadMoreFiles: null,
    sessionFilesSelectionItems: [],
    filesExplorerWidget: null,
    onFilesSelectionChanged: null,

    // Session workflows panel state
    sessionWorkflows: [],
    sessionWorkflowsSelectionItems: [],
    workflowsExplorerWidget: null,
    onWorkflowsSelectionChanged: null,
    onImageContextChanged: null,
    onContextClearAll: null,
    sessionImageContextItems: [],
    _contextEntriesByCategory: null,
    _contextHiddenIdsByCategory: null,
    _filesSelectionHandles: null,
    _workflowsSelectionHandles: null,
    _workspaceSelectionHandles: null,
    _jobsSelectionHandles: null,

    _debugContextEvent: function(label, payload) {
      try {
        console.log('[ContextDebug][Display] ' + label, payload || {});
      } catch (e) {
        // Debug logging should never break interaction flow.
      }
    },

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

        // Create files panel container
        this.filesContainer = domConstruct.create('div', {
          class: 'copilot-files-container',
          style: 'display:none;'
        }, this.panelContainer);

        this.imagesContainer = domConstruct.create('div', {
          class: 'copilot-images-container',
          style: 'display:none;'
        }, this.panelContainer);

        // Create workflows panel container
        this.workflowsContainer = domConstruct.create('div', {
          class: 'copilot-workflows-container',
          style: 'display:none;'
        }, this.panelContainer);

        // Apply initial responsive padding
        this._updateResponsivePadding();

        // Add scroll event listener to detect user scrolling
        on(this.resultContainer, 'scroll', lang.hitch(this, function() {
          this._userIsScrolling = true;
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

        // Show initial empty state
        this.showEmptyState();
        this._renderFilesPanel();
        this._renderImagesPanel();
        this._renderWorkflowsPanel();

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
        topic.subscribe('ChatSession:TurnEnded', lang.hitch(this, function(data) {
          if (!data || data.sessionId !== this.sessionId) return;
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

    _unwrapReplayResultPayload: function(replayResponse) {
      if (!replayResponse || typeof replayResponse !== 'object') {
        return null;
      }
      var topResult = replayResponse.result;
      if (!topResult || typeof topResult !== 'object') {
        return null;
      }
      if (topResult.result && typeof topResult.result === 'object' && !Array.isArray(topResult.result)) {
        return topResult.result;
      }
      return topResult;
    },

    setActivePanel: function(panel) {
      if (panel === 'files') {
        this.activePanel = 'files';
      } else if (panel === 'images') {
        this.activePanel = 'images';
      } else if (panel === 'workflows') {
        this.activePanel = 'workflows';
      } else {
        this.activePanel = 'messages';
      }

      domStyle.set(this.resultContainer, 'display', this.activePanel === 'messages' ? 'block' : 'none');
      this._updateJumpButton();
      domStyle.set(this.filesContainer, 'display', this.activePanel === 'files' ? 'block' : 'none');
      domStyle.set(this.imagesContainer, 'display', this.activePanel === 'images' ? 'block' : 'none');
      domStyle.set(this.workflowsContainer, 'display', this.activePanel === 'workflows' ? 'block' : 'none');

      if (this.activePanel === 'files' && this.filesExplorerWidget && typeof this.filesExplorerWidget.resize === 'function') {
        this.filesExplorerWidget.resize();
      }
      if (this.activePanel === 'workflows' && this.workflowsExplorerWidget && typeof this.workflowsExplorerWidget.resize === 'function') {
        this.workflowsExplorerWidget.resize();
      }
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
      if (!Array.isArray(messages)) {
        messages = [];
      }
      if (messages.length) {
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
        if (scrollToBottom || wasNearBottom) {
          this.scrollToBottom();
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

    resetSessionFiles: function() {
      this.sessionFiles = [];
      this.sessionFilesPagination = {
        has_more: false,
        total: 0,
        limit: 20,
        offset: 0
      };
      this.sessionFileSummary = {
        total_files: 0,
        total_size_bytes: 0
      };
      this.sessionFilesLoading = false;
      this.sessionFilesError = null;
      this._renderFilesPanel();
    },

    setSessionFilesData: function(files, pagination, summary) {
      this.sessionFiles = Array.isArray(files) ? files : [];
      this.sessionFilesPagination = pagination || this.sessionFilesPagination || { has_more: false };
      this.sessionFileSummary = summary || this.sessionFileSummary || null;
      this.sessionFilesError = null;
      this._renderFilesPanel();
    },

    setSessionFilesLoading: function(isLoading) {
      this.sessionFilesLoading = Boolean(isLoading);
      this._renderFilesPanel();
    },

    setSessionFilesError: function(error) {
      this.sessionFilesError = error || null;
      this.sessionFilesLoading = false;
      this._renderFilesPanel();
    },

    _formatTimestamp: function(value) {
      if (!value) return 'Unknown';
      var date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString();
    },

    _formatSize: function(file) {
      if (file && file.size_formatted) {
        return file.size_formatted;
      }
      if (file && typeof file.size_bytes === 'number') {
        return file.size_bytes.toLocaleString() + ' bytes';
      }
      return 'Unknown';
    },

    _renderFilesPanel: function() {
      if (!this.filesContainer) return;
      domConstruct.empty(this.filesContainer);

      if (this.filesExplorerWidget) {
        this._clearFilesSelectionHandles();
        this.filesExplorerWidget.destroyRecursive();
        this.filesExplorerWidget = null;
      }

      if (this.sessionFilesError) {
        domConstruct.create('div', {
          class: 'copilot-files-error',
          innerHTML: this.sessionFilesError.message || 'Unable to load files for this session.'
        }, this.filesContainer);
        return;
      }

      if (this.sessionFilesLoading && (!this.sessionFiles || this.sessionFiles.length === 0)) {
        domConstruct.create('div', {
          class: 'copilot-files-loading',
          innerHTML: 'Loading files...'
        }, this.filesContainer);
        return;
      }

      if (!this.sessionFiles || this.sessionFiles.length === 0) {
        domConstruct.create('div', {
          class: 'copilot-files-empty',
          innerHTML: 'No grids loaded yet'
        }, this.filesContainer);
        return;
      }

      if (this.sessionFileSummary) {
        var summaryBits = [];
        if (typeof this.sessionFileSummary.total_files === 'number') {
          summaryBits.push('Files: ' + this.sessionFileSummary.total_files);
        }
        if (typeof this.sessionFileSummary.total_size_bytes === 'number') {
          summaryBits.push('Total size: ' + this.sessionFileSummary.total_size_bytes.toLocaleString() + ' bytes');
        }

        if (summaryBits.length) {
          domConstruct.create('div', {
            class: 'copilot-files-summary',
            innerHTML: summaryBits.join(' | ')
          }, this.filesContainer);
        }
      }

      var gridContainer = domConstruct.create('div', {
        class: 'copilot-files-grid-container'
      }, this.filesContainer);

      this.filesExplorerWidget = new SessionFilesExplorerAdapter({
        region: 'center'
      });
      this.filesExplorerWidget.setFilesData(this.sessionFiles || []);
      domConstruct.place(this.filesExplorerWidget.domNode, gridContainer);
      this.filesExplorerWidget.startup();
      this._bindFilesSelectionEvents();
      if (typeof this.filesExplorerWidget.setSelectedFiles === 'function') {
        this.filesExplorerWidget.setSelectedFiles(this.sessionFilesSelectionItems);
      }
      if (typeof this.filesExplorerWidget.resize === 'function') {
        this.filesExplorerWidget.resize();
      }

      var hasMore = Boolean(this.sessionFilesPagination && this.sessionFilesPagination.has_more);
      if (hasMore) {
        var loadMoreButton = domConstruct.create('button', {
          type: 'button',
          class: 'copilot-files-load-more',
          innerHTML: this.sessionFilesLoading ? 'Loading...' : 'Load more'
        }, this.filesContainer);

        if (this.sessionFilesLoading) {
          loadMoreButton.disabled = true;
        }

        on(loadMoreButton, 'click', lang.hitch(this, function() {
          if (this.sessionFilesLoading) return;
          if (typeof this.onLoadMoreFiles === 'function') {
            this.onLoadMoreFiles();
          }
        }));
      }
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
      this._contextEntriesByCategory = null;
      this._contextHiddenIdsByCategory = {};
      this.resetSessionFiles();
      this.resetSessionWorkflows();
      this.setSessionFilesSelectionData([]);
      this.setSessionWorkflowsSelectionData([]);
    },

    /**
     * Updates the current session ID
     * Implementation:
     * - Sets new session identifier
     */
    setSessionId: function(sessionId) {
      this.sessionId = sessionId;
      this._hasNewResponse = false;
      this._contextEntriesByCategory = null;
      this._contextHiddenIdsByCategory = {};

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
      },

    _filesIdentity: function(item) {
      if (item && item.id !== undefined && item.id !== null && item.id !== '') {
        return String(item.id);
      }
      if (item && item.file_id) {
        return String(item.file_id);
      }
      if (!item) {
        return '';
      }
      var name = item.file_name || '';
      var createdAt = item.created_at || '';
      return name + '|' + createdAt;
    },

    _workflowsIdentity: function(item) {
      var id = item && (item.id || item.workflow_id);
      return id ? String(id) : '';
    },

    _workspaceIdentity: function(item) {
      if (item && item.id) {
        return 'id:' + item.id;
      }
      if (!item) {
        return 'fallback:';
      }
      var path = item.path || '';
      var name = item.name || '';
      var type = item.type || '';
      return 'fallback:' + path + '|' + name + '|' + type;
    },

    _jobsIdentity: function(item) {
      var id = item && (item.id || item.job_id || item.task_id);
      return id !== undefined && id !== null && id !== '' ? String(id) : '';
    },

    _getContextItemsByCategory: function(category) {
      if (category === 'files') return this.sessionFilesSelectionItems || [];
      if (category === 'workflows') return this.sessionWorkflowsSelectionItems || [];
      if (category === 'workspace') return this.sessionWorkspaceSelectionItems || [];
      if (category === 'jobs') return this.sessionJobsSelectionItems || [];
      if (category === 'images') return this.sessionImageContextItems || [];
      return [];
    },

    _dedupeItemsByCategory: function(category, items) {
      var source = Array.isArray(items) ? items : [];
      var seen = {};
      var deduped = [];
      source.forEach(lang.hitch(this, function(item) {
        var identity = this._itemIdentityByCategory(category, item);
        if (!identity || seen[identity]) {
          return;
        }
        seen[identity] = true;
        deduped.push(item);
      }));
      return deduped;
    },

    _ensureContextEntryState: function() {
      if (!this._contextEntriesByCategory) {
        this._contextEntriesByCategory = {
          workflows: [],
          workspace: [],
          jobs: [],
          images: []
        };
      }
    },

    _mergeContextEntriesByCategory: function(category, items) {
      if (category === 'files') {
        return;
      }
      this._ensureContextEntryState();
      var nextItems = Array.isArray(items) ? items : [];
      var existing = Array.isArray(this._contextEntriesByCategory[category]) ? this._contextEntriesByCategory[category] : [];
      var seen = {};
      var merged = [];
      existing.forEach(lang.hitch(this, function(item) {
        var key = this._itemIdentityByCategory(category, item);
        if (key && !seen[key]) {
          seen[key] = true;
          merged.push(item);
        }
      }));
      nextItems.forEach(lang.hitch(this, function(item) {
        var key = this._itemIdentityByCategory(category, item);
        if (key && !seen[key]) {
          seen[key] = true;
          merged.push(item);
        }
        if (key && this._contextHiddenIdsByCategory && this._contextHiddenIdsByCategory[category]) {
          delete this._contextHiddenIdsByCategory[category][key];
        }
      }));
      this._contextEntriesByCategory[category] = merged;
    },

    _removeContextEntryByCategory: function(category, item) {
      if (category === 'files') {
        return;
      }
      this._ensureContextEntryState();
      var targetIdentity = this._itemIdentityByCategory(category, item);
      if (!targetIdentity) {
        return;
      }
      var existing = Array.isArray(this._contextEntriesByCategory[category]) ? this._contextEntriesByCategory[category] : [];
      this._contextEntriesByCategory[category] = existing.filter(lang.hitch(this, function(candidate) {
        return this._itemIdentityByCategory(category, candidate) !== targetIdentity;
      }));
    },

    _itemIdentityByCategory: function(category, item) {
      if (category === 'files') return this._filesIdentity(item);
      if (category === 'workflows') return this._workflowsIdentity(item);
      if (category === 'workspace') return this._workspaceIdentity(item);
      if (category === 'jobs') return this._jobsIdentity(item);
      if (category === 'images') return item && item.id ? String(item.id) : '';
      return '';
    },

    _removeItemFromContextView: function(category, item) {
      var targetIdentity = this._itemIdentityByCategory(category, item);
      if (!targetIdentity) {
        return;
      }

      if (category === 'files') {
        // For files, remove from sessionFiles (which removes from context view)
        var currentFiles = Array.isArray(this.sessionFiles) ? this.sessionFiles : [];
        var nextFiles = currentFiles.filter(lang.hitch(this, function(file) {
          var identity = this._filesIdentity(file);
          return identity !== targetIdentity;
        }));
        this.setSessionFilesData(nextFiles, this.sessionFilesPagination, this.sessionFileSummary);
        // Also remove from selection if it was selected
        var selectedFiles = Array.isArray(this.sessionFilesSelectionItems) ? this.sessionFilesSelectionItems : [];
        var nextSelected = selectedFiles.filter(lang.hitch(this, function(selectedFile) {
          var identity = this._filesIdentity(selectedFile);
          return identity !== targetIdentity;
        }));
        this._emitCategorySelection(category, nextSelected);
      } else {
        if (!this._contextHiddenIdsByCategory) {
          this._contextHiddenIdsByCategory = {};
        }
        if (!this._contextHiddenIdsByCategory[category]) {
          this._contextHiddenIdsByCategory[category] = {};
        }
        this._contextHiddenIdsByCategory[category][targetIdentity] = true;
        this._removeContextEntryByCategory(category, item);

        // Deselect hidden item so it is not sent in context payloads.
        var selectedItems = this._getContextItemsByCategory(category);
        var nextItems = selectedItems.filter(lang.hitch(this, function(candidate) {
          var identity = this._itemIdentityByCategory(category, candidate);
          return identity !== targetIdentity;
        }));
        this._debugContextEvent('item removed from context view', {
          category: category,
          targetIdentity: targetIdentity,
          beforeCount: selectedItems.length,
          afterCount: nextItems.length
        });
        this._emitCategorySelection(category, nextItems);
        if (category === 'images') {
          this._renderImagesPanel();
        }
      }
    },

    _emitCategorySelection: function(category, items) {
      var payload = {
        sessionId: this.sessionId,
        items: this._dedupeItemsByCategory(category, items)
      };
      this._debugContextEvent('emit category selection', {
        category: category,
        count: payload.items.length,
        itemIds: payload.items.map(lang.hitch(this, function(item) {
          return this._itemIdentityByCategory(category, item);
        }))
      });
      var published = false;
      if (category === 'files' && typeof this.onFilesSelectionChanged === 'function') {
        this.onFilesSelectionChanged(payload);
        published = true;
      } else if (category === 'workflows' && typeof this.onWorkflowsSelectionChanged === 'function') {
        this.onWorkflowsSelectionChanged(payload);
        published = true;
      } else if (category === 'workspace' && typeof this.onWorkspaceSelectionChanged === 'function') {
        this.onWorkspaceSelectionChanged(payload);
        published = true;
      } else if (category === 'jobs' && typeof this.onJobsSelectionChanged === 'function') {
        this.onJobsSelectionChanged(payload);
        published = true;
      } else if (category === 'images' && typeof this.onImageContextChanged === 'function') {
        this.onImageContextChanged(payload);
        published = true;
      }

      // Fallback local updates so clear/remove still work even if parent handlers are unavailable.
      if (!published) {
        this._debugContextEvent('fallback local selection update', {
          category: category,
          count: payload.items.length
        });
        if (category === 'files') {
          this.setSessionFilesSelectionData(payload.items);
        } else if (category === 'workflows') {
          this.setSessionWorkflowsSelectionData(payload.items);
        } else if (category === 'workspace') {
          this.setSessionWorkspaceSelectionData(payload.items);
        } else if (category === 'jobs') {
          this.setSessionJobsSelectionData(payload.items);
        } else if (category === 'images') {
          this.setSessionImageContextData(payload.items);
        }
      }
    },

    setSessionImageContextData: function(selectedItems) {
      this.sessionImageContextItems = this._dedupeItemsByCategory('images', selectedItems);
      this._mergeContextEntriesByCategory('images', this.sessionImageContextItems);
      this._renderImagesPanel();
    },

    _renderImagesPanel: function() {
      if (!this.imagesContainer) {
        return;
      }
      domConstruct.empty(this.imagesContainer);

      var imageItems = Array.isArray(this.sessionImageContextItems) ? this.sessionImageContextItems : [];
      if (!imageItems.length) {
        domConstruct.create('div', {
          class: 'copilot-images-empty',
          innerHTML: 'No images attached.',
          style: 'text-align:center; color:#6b7280; padding:18px 10px;'
        }, this.imagesContainer);
        return;
      }

      var headerNode = domConstruct.create('div', {
        style: 'display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #e5e7eb; background:#f8fafc; border-radius:8px 8px 0 0;'
      }, this.imagesContainer);

      domConstruct.create('div', {
        innerHTML: 'Images (' + imageItems.length + ')',
        style: 'font-weight: 600;'
      }, headerNode);

      var clearButton = domConstruct.create('button', {
        type: 'button',
        innerHTML: 'Clear All',
        style: 'border: 1px solid #d1d5db; background: #ffffff; border-radius: 4px; padding: 4px 8px; cursor: pointer;'
      }, headerNode);
      on(clearButton, 'click', lang.hitch(this, function() {
        this._emitCategorySelection('images', []);
      }));

      var listNode = domConstruct.create('div', {
        style: 'padding: 0;'
      }, this.imagesContainer);

      imageItems.forEach(lang.hitch(this, function(item) {
        var itemNode = domConstruct.create('div', {
          style: 'display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid #f1f5f9;'
        }, listNode);

        if (item && item.thumbnail) {
          domConstruct.create('img', {
            src: item.thumbnail,
            alt: item.name || 'Image thumbnail',
            style: 'width:48px; height:48px; object-fit:cover; border-radius:4px; border:1px solid #d1d5db; flex-shrink:0;'
          }, itemNode);
        }

        var labelText = item && item.name ? item.name : 'Image';
        domConstruct.create('div', {
          innerHTML: labelText,
          style: 'word-break: break-word; flex:1; min-width:0;'
        }, itemNode);

        var removeButton = domConstruct.create('button', {
          type: 'button',
          innerHTML: '&times;',
          title: 'Remove image',
          style: 'border: 1px solid #d1d5db; background: #ffffff; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; line-height: 20px; text-align:center; padding:0; font-size:16px; flex-shrink:0;'
        }, itemNode);
        on(removeButton, 'click', lang.hitch(this, function() {
          this._removeItemFromContextView('images', item);
        }));
      }));
    },

    /**
     * Resets workflows panel state
     */
    resetSessionWorkflows: function() {
      this.sessionWorkflows = [];
      this._renderWorkflowsPanel();
    },

    setSessionWorkspaceSelectionData: function(selectedItems) {
      this.sessionWorkspaceSelectionItems = this._dedupeItemsByCategory('workspace', selectedItems);
      this._mergeContextEntriesByCategory('workspace', this.sessionWorkspaceSelectionItems);
      if (this.workspaceExplorerWidget && typeof this.workspaceExplorerWidget.setSelectedWorkspaceItems === 'function') {
        this.workspaceExplorerWidget.setSelectedWorkspaceItems(this.sessionWorkspaceSelectionItems);
      }
    },

    setSessionJobsSelectionData: function(selectedItems) {
      this.sessionJobsSelectionItems = this._dedupeItemsByCategory('jobs', selectedItems);
      this._mergeContextEntriesByCategory('jobs', this.sessionJobsSelectionItems);
      if (this.jobsExplorerWidget && typeof this.jobsExplorerWidget.setSelectedJobs === 'function') {
        this.jobsExplorerWidget.setSelectedJobs(this.sessionJobsSelectionItems);
      }
    },

    setSessionFilesSelectionData: function(selectedItems) {
      this.sessionFilesSelectionItems = this._dedupeItemsByCategory('files', selectedItems);
      if (this.filesExplorerWidget && typeof this.filesExplorerWidget.setSelectedFiles === 'function') {
        this.filesExplorerWidget.setSelectedFiles(this.sessionFilesSelectionItems);
      }
    },

    setSessionWorkflowsSelectionData: function(selectedItems) {
      this.sessionWorkflowsSelectionItems = this._dedupeItemsByCategory('workflows', selectedItems);
      this._mergeContextEntriesByCategory('workflows', this.sessionWorkflowsSelectionItems);
      if (this.workflowsExplorerWidget && typeof this.workflowsExplorerWidget.setSelectedWorkflows === 'function') {
        this.workflowsExplorerWidget.setSelectedWorkflows(this.sessionWorkflowsSelectionItems);
      }
    },

    _clearFilesSelectionHandles: function() {
      if (!this._filesSelectionHandles) return;
      this._filesSelectionHandles.forEach(function(handle) {
        if (handle && typeof handle.remove === 'function') {
          handle.remove();
        }
      });
      this._filesSelectionHandles = [];
    },

    _clearWorkflowsSelectionHandles: function() {
      if (!this._workflowsSelectionHandles) return;
      this._workflowsSelectionHandles.forEach(function(handle) {
        if (handle && typeof handle.remove === 'function') {
          handle.remove();
        }
      });
      this._workflowsSelectionHandles = [];
    },

    _clearWorkspaceSelectionHandles: function() {
      if (!this._workspaceSelectionHandles) {
        return;
      }
      this._workspaceSelectionHandles.forEach(function(handle) {
        if (handle && typeof handle.remove === 'function') {
          handle.remove();
        }
      });
      this._workspaceSelectionHandles = [];
    },

    _clearJobsSelectionHandles: function() {
      if (!this._jobsSelectionHandles) {
        return;
      }
      this._jobsSelectionHandles.forEach(function(handle) {
        if (handle && typeof handle.remove === 'function') {
          handle.remove();
        }
      });
      this._jobsSelectionHandles = [];
    },

    _publishWorkspaceSelectionChange: function() {
      if (typeof this.onWorkspaceSelectionChanged !== 'function' || !this.workspaceExplorerWidget) {
        return;
      }
      var selectedItems = [];
      if (typeof this.workspaceExplorerWidget.getSelectedWorkspaceItems === 'function') {
        selectedItems = this.workspaceExplorerWidget.getSelectedWorkspaceItems();
      }
      this.onWorkspaceSelectionChanged({
        sessionId: this.sessionId,
        items: selectedItems
      });
    },

    _bindWorkspaceSelectionEvents: function() {
      this._clearWorkspaceSelectionHandles();
      if (!this.workspaceExplorerWidget) {
        return;
      }
      var notifySelectionChanged = lang.hitch(this, function() {
        // Defer to let dgrid finalize selection state before we read selected rows.
        setTimeout(lang.hitch(this, this._publishWorkspaceSelectionChange), 0);
      });
      this._workspaceSelectionHandles = [
        on(this.workspaceExplorerWidget.domNode, 'select', notifySelectionChanged),
        on(this.workspaceExplorerWidget.domNode, 'deselect', notifySelectionChanged),
        on(this.workspaceExplorerWidget.domNode, 'dgrid-select', notifySelectionChanged),
        on(this.workspaceExplorerWidget.domNode, 'dgrid-deselect', notifySelectionChanged)
      ];
    },

    _publishJobsSelectionChange: function() {
      if (typeof this.onJobsSelectionChanged !== 'function' || !this.jobsExplorerWidget) {
        return;
      }
      if (typeof this.jobsExplorerWidget.isApplyingSelectionSync === 'function' && this.jobsExplorerWidget.isApplyingSelectionSync()) {
        return;
      }
      var selectedItems = [];
      if (typeof this.jobsExplorerWidget.getSelectedJobs === 'function') {
        selectedItems = this.jobsExplorerWidget.getSelectedJobs();
      }
      this.onJobsSelectionChanged({
        sessionId: this.sessionId,
        items: selectedItems
      });
    },

    _publishFilesSelectionChange: function() {
      if (!this.filesExplorerWidget) {
        return;
      }
      if (typeof this.filesExplorerWidget.isApplyingSelectionSync === 'function' && this.filesExplorerWidget.isApplyingSelectionSync()) {
        return;
      }
      if (typeof this.filesExplorerWidget.getSelectedFiles === 'function') {
        this.sessionFilesSelectionItems = this.filesExplorerWidget.getSelectedFiles();
      } else {
        this.sessionFilesSelectionItems = [];
      }
      if (typeof this.onFilesSelectionChanged === 'function') {
        this.onFilesSelectionChanged({
          sessionId: this.sessionId,
          items: this.sessionFilesSelectionItems
        });
      }
    },

    _bindFilesSelectionEvents: function() {
      this._clearFilesSelectionHandles();
      if (!this.filesExplorerWidget) {
        return;
      }
      this._filesSelectionHandles = [
        on(this.filesExplorerWidget.domNode, 'dgrid-select', lang.hitch(this, this._publishFilesSelectionChange)),
        on(this.filesExplorerWidget.domNode, 'dgrid-deselect', lang.hitch(this, this._publishFilesSelectionChange))
      ];
    },

    _publishWorkflowsSelectionChange: function() {
      if (!this.workflowsExplorerWidget) {
        return;
      }
      if (typeof this.workflowsExplorerWidget.isApplyingSelectionSync === 'function' && this.workflowsExplorerWidget.isApplyingSelectionSync()) {
        return;
      }
      if (typeof this.workflowsExplorerWidget.getSelectedWorkflows === 'function') {
        this.sessionWorkflowsSelectionItems = this.workflowsExplorerWidget.getSelectedWorkflows();
      } else {
        this.sessionWorkflowsSelectionItems = [];
      }
      if (typeof this.onWorkflowsSelectionChanged === 'function') {
        this.onWorkflowsSelectionChanged({
          sessionId: this.sessionId,
          items: this.sessionWorkflowsSelectionItems
        });
      }
    },

    _bindWorkflowsSelectionEvents: function() {
      this._clearWorkflowsSelectionHandles();
      if (!this.workflowsExplorerWidget) {
        return;
      }
      this._workflowsSelectionHandles = [
        on(this.workflowsExplorerWidget.domNode, 'dgrid-select', lang.hitch(this, this._publishWorkflowsSelectionChange)),
        on(this.workflowsExplorerWidget.domNode, 'dgrid-deselect', lang.hitch(this, this._publishWorkflowsSelectionChange))
      ];
    },

    _bindJobsSelectionEvents: function() {
      this._clearJobsSelectionHandles();
      if (!this.jobsExplorerWidget) {
        return;
      }
      this._jobsSelectionHandles = [
        on(this.jobsExplorerWidget.domNode, 'dgrid-select', lang.hitch(this, this._publishJobsSelectionChange)),
        on(this.jobsExplorerWidget.domNode, 'dgrid-deselect', lang.hitch(this, this._publishJobsSelectionChange))
      ];
    },

    /**
     * Sets workflow data from session metadata
     * @param {Array} workflowIds - Array of workflow IDs from session metadata
     */
    setSessionWorkflows: function(workflowIds) {
      this.sessionWorkflows = Array.isArray(workflowIds) ? workflowIds : [];
      this._renderWorkflowsPanel();
    },

    /**
     * Renders the workflows panel
     */
    _renderWorkflowsPanel: function() {
      if (!this.workflowsContainer) return;
      domConstruct.empty(this.workflowsContainer);

      if (this.workflowsExplorerWidget) {
        this._clearWorkflowsSelectionHandles();
        this.workflowsExplorerWidget.destroyRecursive();
        this.workflowsExplorerWidget = null;
      }

      if (!this.sessionWorkflows || this.sessionWorkflows.length === 0) {
        domConstruct.create('div', {
          class: 'copilot-workflows-empty',
          innerHTML: 'No grids loaded yet'
        }, this.workflowsContainer);
        return;
      }

      domConstruct.create('div', {
        class: 'copilot-workflows-summary',
        innerHTML: 'Results: ' + this.sessionWorkflows.length
      }, this.workflowsContainer);

      var gridContainer = domConstruct.create('div', {
        class: 'copilot-workflows-grid-container'
      }, this.workflowsContainer);

      this.workflowsExplorerWidget = new WorkflowsExplorerAdapter({
        region: 'center',
        copilotApi: this.copilotApi
      });
      domConstruct.place(this.workflowsExplorerWidget.domNode, gridContainer);
      this.workflowsExplorerWidget.startup();
      this._bindWorkflowsSelectionEvents();
      if (typeof this.workflowsExplorerWidget.setSelectedWorkflows === 'function') {
        this.workflowsExplorerWidget.setSelectedWorkflows(this.sessionWorkflowsSelectionItems);
      }

      // Support either legacy array of IDs or pre-shaped workflow rows.
      var hasWorkflowObjects = Array.isArray(this.sessionWorkflows) && this.sessionWorkflows.some(function(item) {
        return item && typeof item === 'object' && (item.workflow_id || item.id);
      });
      if (hasWorkflowObjects) {
        this.workflowsExplorerWidget.setWorkflowData(this.sessionWorkflows);
      } else {
        this.workflowsExplorerWidget.setWorkflowIds(this.sessionWorkflows);
      }
      if (typeof this.workflowsExplorerWidget.resize === 'function') {
        this.workflowsExplorerWidget.resize();
      }
    },

    // _renderWorkflowCard, _renderWorkflowMetadata, _addMetadataItem,
    // _renderStepItem, _getStatusColor, and _formatDuration removed —
    // workflow cards have been deleted. Workflow tracking is now handled
    // via the session jobs panel in the sidebar.
  });
});
