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
  './WorkspaceExplorerAdapter'
], function (
  declare, ContentPane, domConstruct, on, topic, lang, domClass, domStyle, request, markdownit, linkAttributes, ChatMessage, SuggestedQuestions, WorkspaceExplorerAdapter
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

    // Session workflows panel state
    sessionWorkflows: [],
    sessionWorkspaceBrowse: null,
    sessionWorkspaceSelectionItems: [],
    workspaceExplorerWidget: null,
    onWorkspaceSelectionChanged: null,
    _workspaceSelectionHandles: null,

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

        // Create scrollable container for messages
        this.resultContainer = domConstruct.create('div', {
          class: 'copilot-result-container',
          style: 'padding-right: 10px;padding-left: 10px;'
        }, this.panelContainer);

        // Create files panel container
        this.filesContainer = domConstruct.create('div', {
          class: 'copilot-files-container',
          style: 'display:none;'
        }, this.panelContainer);

        // Create workflows panel container
        this.workflowsContainer = domConstruct.create('div', {
          class: 'copilot-workflows-container',
          style: 'display:none;'
        }, this.panelContainer);

        // Create workspace panel container
        this.workspaceContainer = domConstruct.create('div', {
          class: 'copilot-workspace-container',
          style: 'display:none;'
        }, this.panelContainer);

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
        this._renderFilesPanel();
        this._renderWorkflowsPanel();
        this._renderWorkspacePanel();

        // Initialize markdown parser with link attributes plugin
        this.md = markdownit().use(linkAttributes, {
          attrs: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        });

        // Subscribe to message events
        topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
        topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
        topic.subscribe('chatTextSizeChanged', lang.hitch(this, 'setFontSize'));
        topic.subscribe('CopilotWorkspaceBrowseOpen', lang.hitch(this, function(data) {
          this.setActivePanel('workspace');
          this.setSessionWorkspaceBrowseData(data || null);
        }));
        topic.subscribe('noJobDataError', lang.hitch(this, function(error) {
            error.message = 'No job data found.\n\n' + error.message;
            this.onQueryError(error);
        }));
    },

    setActivePanel: function(panel) {
      if (panel === 'files') {
        this.activePanel = 'files';
      } else if (panel === 'workflows') {
        this.activePanel = 'workflows';
      } else if (panel === 'workspace') {
        this.activePanel = 'workspace';
      } else {
        this.activePanel = 'messages';
      }

      domStyle.set(this.resultContainer, 'display', this.activePanel === 'messages' ? 'block' : 'none');
      domStyle.set(this.filesContainer, 'display', this.activePanel === 'files' ? 'block' : 'none');
      domStyle.set(this.workflowsContainer, 'display', this.activePanel === 'workflows' ? 'block' : 'none');
      domStyle.set(this.workspaceContainer, 'display', this.activePanel === 'workspace' ? 'block' : 'none');

      // dgrid can mis-measure header/body when created while hidden.
      // Ensure workspace grid recalculates layout when tab becomes visible.
      if (this.activePanel === 'workspace' && this.workspaceExplorerWidget && typeof this.workspaceExplorerWidget.resize === 'function') {
        this.workspaceExplorerWidget.resize();
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
      if (messages.length) {
        this.messages = messages; // Store messages for redrawing

        // Check if user was near bottom before re-rendering
        var wasNearBottom = this._isNearBottom();

        domConstruct.empty(this.resultContainer);
        // console.log('show messages', messages);
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
      } else {
        this.showEmptyState();
      }
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
          innerHTML: 'No files yet'
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

      var listNode = domConstruct.create('div', {
        class: 'copilot-files-list'
      }, this.filesContainer);

      this.sessionFiles.forEach(lang.hitch(this, function(file) {
        var card = domConstruct.create('div', {
          class: 'copilot-file-card'
        }, listNode);

        var header = domConstruct.create('div', {
          class: 'copilot-file-card-header'
        }, card);

        domConstruct.create('div', {
          class: 'copilot-file-name',
          innerHTML: file.file_name || 'Untitled file'
        }, header);

        if (file.is_error) {
          domConstruct.create('span', {
            class: 'copilot-file-badge-error',
            innerHTML: 'Error output'
          }, header);
        }

        var toolLabel = file.tool_id || 'Unknown';
        domConstruct.create('div', {
          class: 'copilot-file-meta',
          innerHTML: 'Tool: ' + toolLabel
        }, card);

        var formattedCreated = this._formatTimestamp(file.created_at);
        var formattedSize = this._formatSize(file);

        domConstruct.create('div', {
          class: 'copilot-file-meta',
          innerHTML: 'Created: ' + formattedCreated
        }, card);

        domConstruct.create('div', {
          class: 'copilot-file-meta',
          innerHTML: 'Size: ' + formattedSize
        }, card);

        if (typeof file.record_count === 'number') {
          domConstruct.create('div', {
            class: 'copilot-file-meta',
            innerHTML: 'Records: ' + file.record_count.toLocaleString()
          }, card);
        }

        if (file.data_type) {
          domConstruct.create('div', {
            class: 'copilot-file-meta',
            innerHTML: 'Type: ' + file.data_type
          }, card);
        }

        if (file.workspace_url) {
          var link = domConstruct.create('a', {
            class: 'copilot-file-workspace-link',
            href: file.workspace_url,
            target: '_blank',
            rel: 'noopener noreferrer',
            innerHTML: file.workspace_path || file.workspace_url
          }, card);
          if (!link.textContent || !link.textContent.trim()) {
            link.textContent = file.workspace_url;
          }
        } else if (file.workspace_path) {
          domConstruct.create('div', {
            class: 'copilot-file-meta',
            innerHTML: 'Workspace: ' + file.workspace_path
          }, card);
        }
      }));

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
    },

    /**
     * Displays error message when API request fails
     * Implementation:
     * - Clears existing messages
     * - Shows red error message
     */
    onQueryError: function(error = null) {
      console.log('onQueryError', error);
      domConstruct.empty(this.resultContainer);

      // Extract error message safely, handling various error formats
      var errorMessage = 'An error occurred while processing your request. Please try again later.';

      if (error) {
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
      }

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
      this.resetSessionFiles();
      this.resetSessionWorkflows();
      this.resetSessionWorkspaceBrowse();
      this.setSessionWorkspaceSelectionData([]);
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
      },

    /**
     * Resets workflows panel state
     */
    resetSessionWorkflows: function() {
      this.sessionWorkflows = [];
      this._renderWorkflowsPanel();
    },

    resetSessionWorkspaceBrowse: function() {
      this.sessionWorkspaceBrowse = null;
      this._renderWorkspacePanel();
    },

    setSessionWorkspaceBrowseData: function(workspaceBrowseData) {
      this.sessionWorkspaceBrowse = workspaceBrowseData || null;
      this._renderWorkspacePanel();
    },

    setSessionWorkspaceSelectionData: function(selectedItems) {
      this.sessionWorkspaceSelectionItems = Array.isArray(selectedItems) ? selectedItems.slice() : [];
      if (this.workspaceExplorerWidget && typeof this.workspaceExplorerWidget.setSelectedWorkspaceItems === 'function') {
        this.workspaceExplorerWidget.setSelectedWorkspaceItems(this.sessionWorkspaceSelectionItems);
      }
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
      this._workspaceSelectionHandles = [
        on(this.workspaceExplorerWidget.domNode, 'select', lang.hitch(this, this._publishWorkspaceSelectionChange)),
        on(this.workspaceExplorerWidget.domNode, 'deselect', lang.hitch(this, this._publishWorkspaceSelectionChange))
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

      if (!this.sessionWorkflows || this.sessionWorkflows.length === 0) {
        domConstruct.create('div', {
          class: 'copilot-workflows-empty',
          innerHTML: 'No workflows yet'
        }, this.workflowsContainer);
        return;
      }

      var listNode = domConstruct.create('div', {
        class: 'copilot-workflows-list'
      }, this.workflowsContainer);

      this.sessionWorkflows.forEach(lang.hitch(this, function(workflowId) {
        this._renderWorkflowCard(workflowId, listNode);
      }));
    },

    _renderWorkspacePanel: function() {
      if (!this.workspaceContainer) return;
      domConstruct.empty(this.workspaceContainer);

      if (this.workspaceExplorerWidget) {
        this._clearWorkspaceSelectionHandles();
        this.workspaceExplorerWidget.destroyRecursive();
        this.workspaceExplorerWidget = null;
      }

      if (!this.sessionWorkspaceBrowse || !this.sessionWorkspaceBrowse.uiPayload) {
        domConstruct.create('div', {
          class: 'copilot-workspace-empty',
          innerHTML: 'No workspace browse results yet'
        }, this.workspaceContainer);
        return;
      }

      var payload = this.sessionWorkspaceBrowse.uiPayload;
      var flattenedCount = 0;
      if (Array.isArray(payload.items)) {
        payload.items.forEach(function(item) {
          if (Array.isArray(item)) {
            flattenedCount += 1;
          } else if (item && typeof item === 'object') {
            for (var key in item) {
              if (item.hasOwnProperty(key) && Array.isArray(item[key])) {
                flattenedCount += item[key].length;
              }
            }
          }
        });
      }
      var countValue = payload.result_type === 'search_result'
        ? flattenedCount
        : (typeof payload.count === 'number' ? payload.count : flattenedCount);

      var summaryBits = [];
      summaryBits.push('Results: ' + countValue);
      if (payload.path) {
        summaryBits.push('Path: ' + payload.path);
      }
      if (payload.result_type) {
        summaryBits.push('Type: ' + payload.result_type);
      }

      domConstruct.create('div', {
        class: 'copilot-workspace-summary',
        innerHTML: summaryBits.join(' | ')
      }, this.workspaceContainer);

      if (payload.path) {
        domConstruct.create('a', {
          class: 'copilot-file-workspace-link',
          href: '/workspace' + (payload.path.charAt(0) === '/' ? payload.path : ('/' + payload.path)),
          target: '_blank',
          rel: 'noopener noreferrer',
          innerHTML: 'Open in Workspace Browser'
        }, this.workspaceContainer);
      }

      var gridContainer = domConstruct.create('div', {
        class: 'copilot-workspace-grid-container'
      }, this.workspaceContainer);

      this.workspaceExplorerWidget = new WorkspaceExplorerAdapter({
        region: 'center',
        allowDragAndDrop: false,
        onlyWritable: false
      });

      this.workspaceExplorerWidget.setMcpData({
        path: payload.path || null,
        items: Array.isArray(payload.items) ? payload.items : []
      });

      domConstruct.place(this.workspaceExplorerWidget.domNode, gridContainer);
      this.workspaceExplorerWidget.startup();
      this._bindWorkspaceSelectionEvents();
      if (typeof this.workspaceExplorerWidget.setSelectedWorkspaceItems === 'function') {
        this.workspaceExplorerWidget.setSelectedWorkspaceItems(this.sessionWorkspaceSelectionItems);
      }
      if (typeof this.workspaceExplorerWidget.resize === 'function') {
        this.workspaceExplorerWidget.resize();
      }
    },

    /**
     * Renders a single workflow card with metadata
     * @param {string} workflowId - The workflow ID to fetch and display
     * @param {DOMNode} container - The container to add the card to
     */
    _renderWorkflowCard: function(workflowId, container) {
      var card = domConstruct.create('div', {
        class: 'copilot-workflow-card'
      }, container);

      // Show loading state
      var loadingDiv = domConstruct.create('div', {
        class: 'copilot-workflow-loading',
        innerHTML: '<div style="padding: 10px;">Loading workflow data...</div>'
      }, card);

      // Fetch workflow data from API
      var workflowUrl = window.App.workflow_url || 'https://dev-7.bv-brc.org/api/v1';
      var url = workflowUrl + '/workflows/' + encodeURIComponent(workflowId);

      request.get(url, {
        headers: {
          'Accept': 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function(workflowData) {
        // Remove loading indicator
        domConstruct.empty(card);

        // Render workflow metadata
        this._renderWorkflowMetadata(workflowData, card);
      }), lang.hitch(this, function(error) {
        // Remove loading indicator and show error
        domConstruct.empty(card);

        domConstruct.create('div', {
          class: 'copilot-workflow-error',
          innerHTML: '<div style="padding: 10px; color: #d32f2f;">' +
                    '<strong>Error loading workflow:</strong> ' + workflowId + '<br>' +
                    '<small>' + (error.message || 'Unable to fetch workflow data') + '</small>' +
                    '</div>'
        }, card);
      }));
    },

    /**
     * Renders workflow metadata in the card
     * @param {Object} workflow - The workflow data object
     * @param {DOMNode} card - The card DOM node
     */
    _renderWorkflowMetadata: function(workflow, card) {
      // Create header section
      var header = domConstruct.create('div', {
        class: 'copilot-workflow-header',
        style: 'padding: 12px; border-bottom: 1px solid #e0e0e0; background: #f5f5f5;'
      }, card);

      // Workflow name and status
      var titleRow = domConstruct.create('div', {
        style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;'
      }, header);

      domConstruct.create('div', {
        innerHTML: '<strong>' + (workflow.workflow_name || 'Unnamed Workflow') + '</strong>',
        style: 'font-size: 14px; color: #333;'
      }, titleRow);

      var statusColor = this._getStatusColor(workflow.status);
      domConstruct.create('span', {
        innerHTML: workflow.status || 'unknown',
        style: 'padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ' +
               'background: ' + statusColor.bg + '; color: ' + statusColor.text + ';'
      }, titleRow);

      // Workflow ID
      domConstruct.create('div', {
        innerHTML: '<small style="color: #666;">ID: ' + workflow.workflow_id + '</small>',
        style: 'margin-top: 4px;'
      }, header);

      // Create body section with execution metadata
      var body = domConstruct.create('div', {
        class: 'copilot-workflow-body',
        style: 'padding: 12px;'
      }, card);

      // Execution metadata
      if (workflow.execution_metadata) {
        var meta = workflow.execution_metadata;
        var metaSection = domConstruct.create('div', {
          style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;'
        }, body);

        this._addMetadataItem('Total Steps', meta.total_steps, metaSection);
        this._addMetadataItem('Completed', meta.completed_steps, metaSection);
        this._addMetadataItem('Running', meta.running_steps, metaSection);
        this._addMetadataItem('Failed', meta.failed_steps, metaSection);
      }

      // Timing information
      if (workflow.created_at || workflow.completed_at) {
        var timingSection = domConstruct.create('div', {
          style: 'padding-top: 8px; border-top: 1px solid #e0e0e0; margin-top: 8px;'
        }, body);

        if (workflow.created_at) {
          var createdDate = new Date(workflow.created_at);
          domConstruct.create('div', {
            innerHTML: '<small style="color: #666;"><strong>Created:</strong> ' +
                      createdDate.toLocaleString() + '</small>',
            style: 'margin-bottom: 4px;'
          }, timingSection);
        }

        if (workflow.completed_at) {
          var completedDate = new Date(workflow.completed_at);
          domConstruct.create('div', {
            innerHTML: '<small style="color: #666;"><strong>Completed:</strong> ' +
                      completedDate.toLocaleString() + '</small>',
            style: 'margin-bottom: 4px;'
          }, timingSection);
        }

        // Calculate and show duration
        if (workflow.started_at && workflow.completed_at) {
          var startTime = new Date(workflow.started_at);
          var endTime = new Date(workflow.completed_at);
          var duration = this._formatDuration(endTime - startTime);

          domConstruct.create('div', {
            innerHTML: '<small style="color: #666;"><strong>Duration:</strong> ' + duration + '</small>'
          }, timingSection);
        }
      }

      // Steps summary (if available)
      if (workflow.steps && workflow.steps.length > 0) {
        var stepsSection = domConstruct.create('div', {
          style: 'padding-top: 8px; border-top: 1px solid #e0e0e0; margin-top: 8px;'
        }, body);

        domConstruct.create('div', {
          innerHTML: '<strong style="font-size: 13px;">Steps:</strong>',
          style: 'margin-bottom: 8px;'
        }, stepsSection);

        workflow.steps.forEach(lang.hitch(this, function(step, index) {
          this._renderStepItem(step, index + 1, stepsSection);
        }));
      }
    },

    /**
     * Adds a metadata item to the container
     * @param {string} label - The label for the metadata
     * @param {string|number} value - The value to display
     * @param {DOMNode} container - The container to add to
     */
    _addMetadataItem: function(label, value, container) {
      domConstruct.create('div', {
        innerHTML: '<small style="color: #666;">' + label + ':</small> ' +
                  '<strong style="color: #333;">' + value + '</strong>',
        style: 'padding: 6px; background: #fafafa; border-radius: 4px; font-size: 12px;'
      }, container);
    },

    /**
     * Renders a single step item
     * @param {Object} step - The step data
     * @param {number} stepNum - The step number
     * @param {DOMNode} container - The container to add to
     */
    _renderStepItem: function(step, stepNum, container) {
      var stepDiv = domConstruct.create('div', {
        style: 'padding: 8px; margin-bottom: 6px; background: #fafafa; border-left: 3px solid ' +
               this._getStatusColor(step.status).bg + '; border-radius: 3px;'
      }, container);

      var stepHeader = domConstruct.create('div', {
        style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;'
      }, stepDiv);

      domConstruct.create('span', {
        innerHTML: '<strong style="font-size: 12px;">' + stepNum + '. ' +
                  (step.step_name || step.app || 'Unnamed Step') + '</strong>',
        style: 'color: #333;'
      }, stepHeader);

      var statusColor = this._getStatusColor(step.status);
      domConstruct.create('span', {
        innerHTML: step.status || 'unknown',
        style: 'padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; ' +
               'background: ' + statusColor.bg + '; color: ' + statusColor.text + ';'
      }, stepHeader);

      if (step.elapsed_time) {
        domConstruct.create('div', {
          innerHTML: '<small style="color: #666;">Duration: ' + step.elapsed_time + '</small>',
          style: 'font-size: 11px;'
        }, stepDiv);
      }
    },

    /**
     * Gets the color scheme for a status
     * @param {string} status - The status string
     * @returns {Object} Object with bg and text color properties
     */
    _getStatusColor: function(status) {
      var colors = {
        'succeeded': { bg: '#4caf50', text: '#ffffff' },
        'running': { bg: '#2196f3', text: '#ffffff' },
        'pending': { bg: '#ff9800', text: '#ffffff' },
        'failed': { bg: '#f44336', text: '#ffffff' },
        'cancelled': { bg: '#9e9e9e', text: '#ffffff' },
        'queued': { bg: '#ffc107', text: '#000000' }
      };
      return colors[status] || { bg: '#9e9e9e', text: '#ffffff' };
    },

    /**
     * Formats a duration in milliseconds to a readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    _formatDuration: function(ms) {
      var seconds = Math.floor(ms / 1000);
      var minutes = Math.floor(seconds / 60);
      var hours = Math.floor(minutes / 60);

      seconds = seconds % 60;
      minutes = minutes % 60;

      if (hours > 0) {
        return hours + 'h ' + minutes + 'm ' + seconds + 's';
      } else if (minutes > 0) {
        return minutes + 'm ' + seconds + 's';
      } else {
        return seconds + 's';
      }
    }
  });
});
