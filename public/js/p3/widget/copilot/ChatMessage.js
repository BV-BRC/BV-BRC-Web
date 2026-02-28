define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Topic messaging
  'dojo/_base/lang', // Language utilities
  'markdown-it/dist/markdown-it.min', // Markdown parser and renderer
  'markdown-it-link-attributes/dist/markdown-it-link-attributes.min', // Plugin to add attributes to links
  'dijit/Dialog', // Dialog widget
  './CopilotToolHandler', // Tool handler for special tool processing
  './WorkflowEngine', // Workflow engine widget for displaying workflows
  '../../WorkspaceManager' // Workspace manager for file operations
], function (
  declare, domConstruct, on, topic, lang, markdownit, linkAttributes, Dialog, CopilotToolHandler, WorkflowEngine, WorkspaceManager
) {
  /**
   * @class ChatMessage
   * @description Widget that handles rendering individual chat messages with markdown support.
   * Supports system, user and assistant message types with different styling.
   * System messages have collapsible/expandable functionality.
   */
  return declare(null, {
    /** @property {Object} message - Stores the message data including content, role, and ID */
    message: null,

    /** @property {Object} md - Initialized markdown-it instance for rendering markdown content */
    md: markdownit().use(linkAttributes, {
      attrs: {
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    }),

    /** @property {number} fontSize - Stores the font size for the message content */
    fontSize: null,

    /** @property {boolean} copilotEnableShowPromptDetails - Stores the value of the copilotEnableShowPromptDetails flag */
    copilotEnableShowPromptDetails: false,

    /** @property {Object} copilotApi - Reference to CopilotAPI instance for workflow submission */
    copilotApi: null,

    /** @property {string} sessionId - Current session ID for workflow submission context */
    sessionId: null,

    /**
     * @constructor
     * Creates a new ChatMessage instance
     * @param {Object} message - Message object containing content, role and message_id
     * @param {HTMLElement} container - DOM element to render the message into
     */
    constructor: function(message, container) {
      this.message = message;
      this.container = container;
      this.fontSize = message.fontSize || 14; // Get fontSize from message or use default
      this.copilotApi = message.copilotApi || null; // Get copilotApi from message if provided
      this.sessionId = message.sessionId || null; // Get sessionId from message if provided
      this.copilotEnableShowPromptDetails = window.App && window.App.copilotEnableShowPromptDetails === 'true';
      this.toolHandler = new CopilotToolHandler();
      this.renderMessage(); // Immediately render on construction
    },

    /**
     * Escapes HTML special characters to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for innerHTML
     */
    escapeHtml: function(text) {
      if (typeof text !== 'string') {
        return text;
      }
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    _flattenWorkspaceBrowseItems: function(items) {
      if (!Array.isArray(items)) {
        return [];
      }

      var flattened = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (Array.isArray(item)) {
          flattened.push(item);
          continue;
        }

        if (item && typeof item === 'object') {
          for (var key in item) {
            if (item.hasOwnProperty(key) && Array.isArray(item[key])) {
              flattened = flattened.concat(item[key]);
            }
          }
        }
      }

      return flattened;
    },

    _getWorkspaceBrowseCount: function(payload) {
      if (!payload) {
        return 0;
      }

      if (payload.result_type === 'search_result') {
        return this._flattenWorkspaceBrowseItems(payload.items).length;
      }

      if (typeof payload.count === 'number') {
        return payload.count;
      }

      return this._flattenWorkspaceBrowseItems(payload.items).length;
    },

    _buildWorkspaceBrowserUrl: function(path) {
      if (!path || typeof path !== 'string') {
        return null;
      }
      var normalizedPath = path.charAt(0) === '/' ? path : '/' + path;
      return '/workspace' + normalizedPath;
    },

    _extractRagSummaryText: function() {
      if (typeof this.message.content === 'object' && this.message.content && this.message.content.type === 'rag_result') {
        return this.message.content.summary || '';
      }
      if (typeof this.message.content === 'string') {
        return this.message.content;
      }
      return '';
    },

    _buildRagChunkSearchFilters: function() {
      var seededFilters = this.message && this.message.ragChunkSearchFilters && typeof this.message.ragChunkSearchFilters === 'object'
        ? this.message.ragChunkSearchFilters
        : {};
      var messageToolCall = this._resolveMessageToolCall();
      var toolArgs = messageToolCall && messageToolCall.arguments_executed && typeof messageToolCall.arguments_executed === 'object'
        ? messageToolCall.arguments_executed
        : {};
      var messageId = this.message && this.message.message_id ? this.message.message_id : null;
      if (typeof messageId === 'string' && messageId.indexOf('assistant_') === 0) {
        messageId = null;
      }
      return {
        message_id: seededFilters.message_id || messageId || null,
        session_id: seededFilters.session_id || this.sessionId || null,
        user_id: seededFilters.user_id || (this.copilotApi && this.copilotApi.user_id ? this.copilotApi.user_id : null),
        rag_db: seededFilters.rag_db || toolArgs.rag_db || toolArgs.database_name || toolArgs.config_name || null,
        rag_api_name: seededFilters.rag_api_name || toolArgs.rag_api_name || null,
        doc_id: seededFilters.doc_id || toolArgs.doc_id || toolArgs.document_id || null,
        source_id: seededFilters.source_id || toolArgs.source_id || null,
        include_content: true,
        limit: 100
      };
    },

    _resolveMessageToolCall: function() {
      if (!this.message || typeof this.message !== 'object') {
        return null;
      }
      var candidate = null;

      if (this.message.tool_call !== undefined) {
        candidate = this.message.tool_call;
      } else if (this.message.ui_tool_call !== undefined) {
        candidate = this.message.ui_tool_call;
      } else if (this.message.toolCall !== undefined) {
        candidate = this.message.toolCall;
      } else if (
        this.message.metadata &&
        typeof this.message.metadata === 'object' &&
        this.message.metadata.tool_call !== undefined
      ) {
        candidate = this.message.metadata.tool_call;
      } else if (
        this.message.metadata &&
        typeof this.message.metadata === 'object' &&
        this.message.metadata.ui_tool_call !== undefined
      ) {
        candidate = this.message.metadata.ui_tool_call;
      }

      if (!candidate) {
        return null;
      }
      if (typeof candidate === 'string') {
        try {
          candidate = JSON.parse(candidate);
        } catch (e) {
          return null;
        }
      }
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
        return null;
      }
      return candidate;
    },

    /**
     * Renders a chat message in the container
     * - Adds appropriate spacing based on if it's the first message
     * - Creates message container with role-based styling
     * - Handles 3 types of messages:
     *   1. Loading indicator (animated dots)
     *   2. System messages (collapsible)
     *   3. User/Assistant messages (standard display)
     */
    renderMessage: function() {
      // Check if content is a JSON string containing source_tool (for real-time results)
      var sourceTool = this.message.ui_source_tool || this.message.source_tool;
      var contentToProcess = this.message.content;
      var messageToolCall = this._resolveMessageToolCall();
      if (messageToolCall && !this.message.tool_call) {
        this.message.tool_call = messageToolCall;
      }

      if (!sourceTool && typeof this.message.content === 'string') {
        try {
          // Try to parse the content as JSON to see if source_tool is inside
          var parsedContent = JSON.parse(this.message.content);
          if (parsedContent && parsedContent.source_tool) {
            sourceTool = parsedContent.source_tool;
            // Set it on the message object for consistency
            this.message.source_tool = sourceTool;
            // Use the parsed content for processing
            contentToProcess = parsedContent;
          }
        } catch (e) {
          // Not valid JSON, continue with normal processing
          // Silently skip source_tool extraction for non-JSON content
        }
      }

      // Reloaded session messages may carry canonical tool_call without source_tool.
      // Use it as fallback so tool-specific UI rendering still activates.
      if (messageToolCall && typeof (messageToolCall.tool || messageToolCall.tool_id) === 'string') {
        var toolCallId = messageToolCall.tool || messageToolCall.tool_id;
        var sourceToolLooksLikeTransport =
          typeof sourceTool === 'string' &&
          (
            sourceTool.indexOf('read_file_bytes_tool') !== -1 ||
            sourceTool.indexOf('read_file_tool') !== -1
          );
        if (!sourceTool || sourceToolLooksLikeTransport) {
          sourceTool = toolCallId;
        }
      }
      if (sourceTool) {
        this.message.source_tool = sourceTool;
      }
      // debugger;
      var contentLooksLikeJson = false;
      if (typeof contentToProcess === 'string') {
        var trimmedContent = contentToProcess.trim();
        contentLooksLikeJson = trimmedContent.indexOf('{') === 0 || trimmedContent.indexOf('[') === 0;
      }
      var toolCallArgs = messageToolCall && messageToolCall.arguments_executed && typeof messageToolCall.arguments_executed === 'object'
        ? messageToolCall.arguments_executed
        : {};

      // Infer lightweight tool-card metadata from persisted tool identity.
      if (sourceTool && sourceTool.indexOf('workspace_browse_tool') !== -1) {
        this.message.isWorkspaceBrowse = true;
        if (!this.message.uiAction) {
          this.message.uiAction = 'open_workspace_tab';
        }
      }
      if (sourceTool && (sourceTool.indexOf('list_jobs') !== -1 || sourceTool.indexOf('get_recent_jobs') !== -1)) {
        this.message.isJobsBrowse = true;
        if (!this.message.uiAction) {
          this.message.uiAction = 'open_jobs_tab';
        }
      }
      if (sourceTool && (sourceTool.indexOf('plan_workflow') !== -1 || sourceTool.indexOf('submit_workflow') !== -1)) {
        var inferredWorkflowId = this.message.workflow_id ||
          toolCallArgs.workflow_id ||
          (messageToolCall && messageToolCall.workflow_id) ||
          null;
        if (inferredWorkflowId) {
          this.message.isWorkflow = true;
          this.message.workflow_id = inferredWorkflowId;
          if (!this.message.workflowData || typeof this.message.workflowData !== 'object') {
            this.message.workflowData = { workflow_id: inferredWorkflowId };
          } else if (!this.message.workflowData.workflow_id) {
            this.message.workflowData.workflow_id = inferredWorkflowId;
          }
        }
      }
      if (
        sourceTool &&
        (
          sourceTool.indexOf('bvbrc_search_data') !== -1 ||
          sourceTool.indexOf('query_collection') !== -1 ||
          sourceTool.indexOf('bvbrc_query_collection') !== -1
        )
      ) {
        this.message.isQueryCollection = true;
        if (!this.message.queryCollectionData) {
          this.message.queryCollectionData = {
            queryParameters: toolCallArgs,
            collection: toolCallArgs.collection || null,
            rqlQueryUrl: toolCallArgs.data_api_base_url ? toolCallArgs.data_api_base_url : "https://www.bv-brc.org/api-bulk",
            resultRows: []
          };
        }
      }
      // Ensure persisted tool_call survives downstream processing.
      if (messageToolCall && !this.message.tool_call) {
        this.message.tool_call = messageToolCall;
      }

      // Process content based on source_tool using tool handler
      // Skip processing if the message already has processed tool data (uiPayload/workspaceBrowseResult)
      // This happens when SSE handler already processed the tool output
      var alreadyProcessed = false;
      if (sourceTool === 'bvbrc_server.workspace_browse_tool' && this.message.uiPayload && this.message.workspaceBrowseResult) {
        console.log('[ChatMessage] Workspace browse already processed by SSE handler, skipping re-processing');
        alreadyProcessed = true;
      }
      if (
        sourceTool &&
        (sourceTool.indexOf('list_jobs') !== -1 || sourceTool.indexOf('get_recent_jobs') !== -1) &&
        this.message.uiPayload &&
        this.message.jobsBrowseResult
      ) {
        console.log('[ChatMessage] Jobs browse already processed by SSE handler, skipping re-processing');
        alreadyProcessed = true;
      }
      if (
        sourceTool &&
        (sourceTool.indexOf('plan_workflow') !== -1 || sourceTool.indexOf('submit_workflow') !== -1) &&
        (this.message.workflowData || this.message.workflow_id || this.message.isWorkflow)
      ) {
        console.log('[ChatMessage] Workflow message already has persisted workflow metadata, skipping re-processing');
        alreadyProcessed = true;
      }
      if (
        sourceTool &&
        sourceTool.indexOf('workspace_browse_tool') !== -1 &&
        messageToolCall &&
        !contentLooksLikeJson
      ) {
        alreadyProcessed = true;
      }
      if (
        sourceTool &&
        (sourceTool.indexOf('list_jobs') !== -1 || sourceTool.indexOf('get_recent_jobs') !== -1) &&
        messageToolCall &&
        !contentLooksLikeJson
      ) {
        alreadyProcessed = true;
      }
      if (
        sourceTool &&
        (
          sourceTool.indexOf('bvbrc_search_data') !== -1 ||
          sourceTool.indexOf('query_collection') !== -1 ||
          sourceTool.indexOf('bvbrc_query_collection') !== -1
        ) &&
        messageToolCall &&
        !contentLooksLikeJson
      ) {
        // Persisted session messages are often markdown summaries with tool_call metadata.
        // Skip re-processing so we don't erase query-card flags inferred above.
        alreadyProcessed = true;
      }

      // debugger;
      if (sourceTool && !alreadyProcessed) {
        // If content is an object with nested structure, extract the actual content
        if (typeof contentToProcess === 'object' && contentToProcess.content) {
          contentToProcess = contentToProcess.content;
        }

        var processedData = this.toolHandler.processMessageContent(contentToProcess, sourceTool);

        this.message.content = processedData.content;
        this.message.isWorkflow = typeof processedData.isWorkflow !== 'undefined' ? processedData.isWorkflow : this.message.isWorkflow;
        this.message.workflowData = typeof processedData.workflowData !== 'undefined' ? processedData.workflowData : this.message.workflowData;
        this.message.isWorkspaceBrowse = typeof processedData.isWorkspaceBrowse !== 'undefined'
          ? (processedData.isWorkspaceBrowse || this.message.isWorkspaceBrowse)
          : this.message.isWorkspaceBrowse;
        this.message.workspaceBrowseResult = typeof processedData.workspaceBrowseResult !== 'undefined'
          ? (processedData.workspaceBrowseResult || this.message.workspaceBrowseResult)
          : this.message.workspaceBrowseResult;
        this.message.chatSummary = typeof processedData.chatSummary !== 'undefined' ? processedData.chatSummary : this.message.chatSummary;
        this.message.uiPayload = typeof processedData.uiPayload !== 'undefined' ? processedData.uiPayload : this.message.uiPayload;
        this.message.uiAction = typeof processedData.uiAction !== 'undefined' ? processedData.uiAction : this.message.uiAction;
        this.message.isWorkspaceListing = typeof processedData.isWorkspaceListing !== 'undefined' ? processedData.isWorkspaceListing : this.message.isWorkspaceListing;
        this.message.workspaceData = typeof processedData.workspaceData !== 'undefined' ? processedData.workspaceData : this.message.workspaceData;
        this.message.isQueryCollection = typeof processedData.isQueryCollection !== 'undefined' ? processedData.isQueryCollection : this.message.isQueryCollection;
        this.message.queryCollectionData = typeof processedData.queryCollectionData !== 'undefined' ? processedData.queryCollectionData : this.message.queryCollectionData;
        this.message.isJobsBrowse = typeof processedData.isJobsBrowse !== 'undefined'
          ? (processedData.isJobsBrowse || this.message.isJobsBrowse)
          : this.message.isJobsBrowse;
        this.message.jobsBrowseResult = typeof processedData.jobsBrowseResult !== 'undefined'
          ? (processedData.jobsBrowseResult || this.message.jobsBrowseResult)
          : this.message.jobsBrowseResult;
        this.message.tool_call = (typeof processedData.ui_tool_call !== 'undefined' && processedData.ui_tool_call)
          ? processedData.ui_tool_call
          : this.message.tool_call;

        // Workflow and query collection data are set on message object above
      }

      // Add more top margin for first message, less for subsequent
      var marginTop = this.container.children.length === 0 ? '20px' : '5px';

      // Create main message container with role-based styling
      var messageDiv = domConstruct.create('div', {
        class: 'message ' + this.message.role,
        style: 'margin-top: ' + marginTop + ';'
      }, this.container);

      if (this.message.message_id === 'loading-indicator') {
        // Show animated loading dots
        domConstruct.create('div', {
          innerHTML: '...',
          style: 'font-size: 24px; animation: bounce 1s infinite;'
        }, messageDiv);
      } else if (this.message.role === 'system') {
        if (this.copilotEnableShowPromptDetails) {
          this.renderSystemMessage(messageDiv);
        }
      } else if (this.message.role === 'status') {
        this.renderStatusMessage(messageDiv);
      } else {
        this.renderUserOrAssistantMessage(messageDiv);
      }
    },

    /**
     * Renders a collapsible system message with show/hide functionality
     * - Initially collapsed showing placeholder text
     * - Expands to show full markdown content
     * - Includes toggle button to expand/collapse
     * - Animates height transition
     * @param {HTMLElement} messageDiv - Container to render system message into
     */
    renderSystemMessage: function(messageDiv) {
      // Create a simple button
      var showDocsButton = domConstruct.create('button', {
        innerHTML: 'Show Prompt Details',
        class: 'show-docs-button'
      }, messageDiv);

      // Handle button click
      on(showDocsButton, 'click', function() {
        // Create dialog to show markdown content
        var dialogContent = this.createSystemDialogContent(this.message);
        dialogContent.className = 'systemDialogContent';

        var docsDialog = new Dialog({
          title: "Retrieved Documents",
          style: "width: 600px; max-height: 80vh;",
          content: dialogContent
        });

        // Add close button
        var buttonContainer = document.createElement('div');
        buttonContainer.className = 'systemDialogButtonContainer';

        var closeButton = document.createElement('button');
        closeButton.innerHTML = "Close";
        closeButton.className = 'systemDialogCloseButton';

        closeButton.onclick = function() {
          docsDialog.hide();
          docsDialog.destroy();
        };

        buttonContainer.appendChild(closeButton);
        docsDialog.containerNode.appendChild(buttonContainer);

        docsDialog.startup();
        docsDialog.show();
      }.bind(this));
    },

    /**
     * Renders a status message with distinctive styling
     * - Shows agent/tool activity and progress
     * - Smaller text, gray background
     * - Left-aligned, compact layout
     * - No action buttons
     * @param {HTMLElement} messageDiv - Container to render status message into
     */
    renderStatusMessage: function(messageDiv) {
      domConstruct.create('div', {
        innerHTML: this.message.content ? this.md.render(this.message.content) : '',
        class: 'markdown-content status-content'
      }, messageDiv);
    },

    /**
     * Renders a standard user or assistant message
     * - Simply displays markdown content in a styled container
     * - No collapsible functionality
     * - For workflow messages, shows a "Review Workflow" button instead
     * @param {HTMLElement} messageDiv - Container to render message into
     */
    renderUserOrAssistantMessage: function(messageDiv) {
      // Always render assistant/user text first, then append any tool UI widgets below.
      var contentToRender = '';
      if (this.message.content) {
        if (typeof this.message.content === 'string') {
          contentToRender = this.message.content;
        } else {
          console.warn('[ChatMessage] ⚠ Content is not a string, converting to string. Type:', typeof this.message.content);
          console.warn('[ChatMessage] Content value:', this.message.content);

          // Special handling for rag_result type - extract only the summary field
          if (typeof this.message.content === 'object' && this.message.content.type === 'rag_result') {
            contentToRender = this.message.content.summary || '';
          } else {
            // Convert to string - if it's an object, stringify it
            contentToRender = typeof this.message.content === 'object'
              ? JSON.stringify(this.message.content, null, 2)
              : String(this.message.content);
          }
        }
      }

      if (contentToRender) {
        var markdownContainer = domConstruct.create('div', {
          innerHTML: this.md.render(contentToRender),
          class: 'markdown-content',
          style: 'font-size: ' + this.fontSize + 'px;'
        }, messageDiv);

        // Process code blocks to make large ones collapsible
        this.makeLargeCodeBlocksCollapsible(markdownContainer);
      }

      // Tool-specific widgets are appended under the message text when available.
      var renderSourceTool = this.message.ui_source_tool ||
        this.message.source_tool ||
        (this.message.tool_call && this.message.tool_call.tool) ||
        '';
      var hasWorkflowIdentity = !!(
        this.message.workflow_id ||
        (this.message.workflowData && this.message.workflowData.workflow_id) ||
        (this.message.workflowData && this.message.workflowData.execution_metadata && this.message.workflowData.execution_metadata.workflow_id)
      );

      if ((this.message.isWorkflow && this.message.workflowData) ||
          (renderSourceTool.indexOf('plan_workflow') !== -1 && hasWorkflowIdentity) ||
          (renderSourceTool.indexOf('submit_workflow') !== -1 && hasWorkflowIdentity)) {
        // debugger; // Debug assistant message when loading planned workflow UI
        this.renderWorkflowManifestCard(messageDiv);
      } else if (
        this.message.uiAction === 'show_file_metadata' &&
        this.message.uiPayload
      ) {
        this.renderFileMetadataWidget(messageDiv);
      } else if (
        (this.message.isWorkspaceBrowse && this.message.uiPayload) ||
        (this.message.isWorkspaceListing && this.message.workspaceData) ||
        (renderSourceTool.indexOf('workspace_browse_tool') !== -1 && this.message.tool_call)
      ) {
        this.renderWorkspaceBrowseSummaryWidget(messageDiv);
      } else if (
        (this.message.isJobsBrowse && this.message.uiPayload) ||
        ((renderSourceTool.indexOf('list_jobs') !== -1 || renderSourceTool.indexOf('get_recent_jobs') !== -1) && this.message.tool_call)
      ) {
        this.renderJobsBrowseSummaryWidget(messageDiv);
      } else if (
        this.message.isRagStreamQuery === true
      ) {
        this.renderRagResultWidget(messageDiv);
      } else if (this.message.isQueryCollection && this.message.queryCollectionData) {
        this.renderQueryCollectionWidget(messageDiv);
      }

      if (this.message.role === 'assistant') {
        // Create button container for assistant messages
        var buttonContainer = domConstruct.create('div', {
          class: 'message-button-container'
        }, messageDiv);

        // Add copy text button
        this.createMessageActionButtons(buttonContainer);
      }

      if (this.message.role === 'user') {
        // Create button container for user messages - positioned in bottom right
        var buttonContainer = domConstruct.create('div', {
          class: 'user-message-button-container'
        }, messageDiv);

        // Add copy button for user messages
        this.createUserMessageCopyButton(buttonContainer);
      }

      this.renderAttachments(messageDiv);
    },

    renderAttachments: function(messageDiv) {
      if (!Array.isArray(this.message.attachments) || this.message.attachments.length === 0) {
        return;
      }

      var container = domConstruct.create('div', {
        class: 'message-attachments'
      }, messageDiv);

      this.message.attachments.forEach(lang.hitch(this, function(attachment) {
        if (!attachment || attachment.type !== 'image') {
          return;
        }
        var label = attachment.name || (attachment.source === 'screenshot' ? 'Page screenshot' : 'Attached image');
        domConstruct.create('div', {
          class: 'message-attachment-chip',
          innerHTML: '<i class="fa icon-image"></i> ' + this.escapeHtml(label)
        }, container);
      }));
    },

    /**
     * Makes large code blocks collapsible, showing only the first 8 lines by default
     * @param {HTMLElement} markdownContainer - Container with rendered markdown content
     */
    makeLargeCodeBlocksCollapsible: function(markdownContainer) {
      var preElements = markdownContainer.querySelectorAll('pre');
      var self = this;

      preElements.forEach(function(preElement) {
        var codeElement = preElement.querySelector('code');
        if (!codeElement) {
          return;
        }

        // Count lines in the code block
        var textContent = codeElement.textContent || codeElement.innerText || '';
        var lines = textContent.split('\n');
        var lineCount = lines.length;

        // Only make collapsible if more than 8 lines
        if (lineCount <= 8) {
          return;
        }

        // Get the full HTML content (preserving any syntax highlighting)
        var fullHtml = codeElement.innerHTML;
        var first8LinesText = lines.slice(0, 8).join('\n');

        // Create wrapper container
        var wrapper = domConstruct.create('div', {
          class: 'collapsible-code-block'
        });

        // Create toggle button
        var toggleButton = domConstruct.create('button', {
          class: 'code-block-toggle',
          innerHTML: '▼ Show more (' + (lineCount - 8) + ' more lines)',
          style: 'display: block; width: 100%; padding: 6px 10px; margin-bottom: 4px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 12px; color: #374151; text-align: left;'
        });

        // Create collapsed view (first 8 lines)
        // Try to preserve syntax highlighting by extracting first 8 lines from HTML
        var collapsedPre = preElement.cloneNode(false);
        collapsedPre.className = preElement.className || '';
        collapsedPre.style.margin = '0';
        var collapsedCode = codeElement.cloneNode(false);

        // For collapsed view, we'll use plain text for the first 8 lines
        // to avoid complex HTML parsing
        collapsedCode.textContent = first8LinesText;
        collapsedPre.appendChild(collapsedCode);

        // Create expanded view (full content) - clone the original
        var expandedPre = preElement.cloneNode(true);
        expandedPre.style.margin = '0';
        expandedPre.style.display = 'none';

        // Add elements to wrapper
        wrapper.appendChild(toggleButton);
        wrapper.appendChild(collapsedPre);
        wrapper.appendChild(expandedPre);

        // Track expanded state
        var isExpanded = false;

        // Toggle functionality
        on(toggleButton, 'click', function() {
          isExpanded = !isExpanded;
          if (isExpanded) {
            collapsedPre.style.display = 'none';
            expandedPre.style.display = 'block';
            toggleButton.innerHTML = '▲ Show less';
          } else {
            collapsedPre.style.display = 'block';
            expandedPre.style.display = 'none';
            toggleButton.innerHTML = '▼ Show more (' + (lineCount - 8) + ' more lines)';
          }
        });

        // Replace the original pre element with the wrapper
        if (preElement.parentNode) {
          preElement.parentNode.replaceChild(wrapper, preElement);
        }
      });
    },

    /**
     * Renders a compact workspace browse summary with an action button.
     * @param {HTMLElement} messageDiv - Container to render widget into
     */
    renderWorkspaceBrowseSummaryWidget: function(messageDiv) {
      if (!this.message.tool_call || !this.message.tool_call.replay) {
        return;
      }
      var toolCall = this.message.tool_call || this.message.ui_tool_call;
      var toolArgs = toolCall.replay ? toolCall.replay : null;

      var payload = {
        arguments_executed: toolArgs ? toolArgs : null,
        tool: toolCall.tool || null
      };

      var isSearch = toolArgs && toolArgs.name_contains && toolArgs.name_contains.length > 0 ? true : false;

      var countValue = toolArgs.num_results ? toolArgs.num_results : 0;
      var pathValue = toolCall.replay.path ? toolCall.replay.path : 'unknown path';
      var summaryText = this.message.chatSummary || ('Found ' + countValue + ' ' + (countValue === 1 ? 'result' : 'results') + ' in ' + pathValue);
      var workspaceBrowserUrl = this._buildWorkspaceBrowserUrl(toolCall.replay.path);

      var container = domConstruct.create('div', {
        class: 'workspace-summary-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'tool-card-status-row workspace-summary-text',
        innerHTML: this.escapeHtml(summaryText)
      }, container);

      domConstruct.create('div', {
        class: 'workspace-summary-path',
        innerHTML: 'Path: ' + this.escapeHtml(pathValue)
      }, container);

      var openButton = domConstruct.create('button', {
        type: 'button',
        class: 'workspace-summary-open-button',
        innerHTML: 'Open Workspace Tab'
      }, container);
      on(openButton, 'click', lang.hitch(this, function() {
        topic.publish('CopilotWorkspaceBrowseOpen', {
          uiPayload: payload,
          tool_call: this.message.tool_call || payload.call || null,
          chatSummary: summaryText,
          uiAction: this.message.uiAction || 'open_workspace_tab'
        });
      }));

      if (workspaceBrowserUrl && !isSearch) {
        domConstruct.create('a', {
          class: 'workspace-summary-link',
          href: workspaceBrowserUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          innerHTML: 'Open in Workspace Browser'
        }, container);
      }
    },

    renderJobsBrowseSummaryWidget: function(messageDiv) {
      var payload = this.message.uiPayload || {};
      var jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
      var countValue = jobs.length;
      var summaryText = this.message.chatSummary || ('Found ' + countValue + ' ' + (countValue === 1 ? 'job' : 'jobs'));

      var container = domConstruct.create('div', {
        class: 'workspace-summary-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'tool-card-status-row workspace-summary-text',
        innerHTML: this.escapeHtml(summaryText)
      }, container);

      var detailParts = [];
      if (payload.sort_by || payload.sort_dir || payload.status || payload.service) {
        if (payload.sort_by) {
          detailParts.push('Sort: ' + payload.sort_by + (payload.sort_dir ? ' (' + payload.sort_dir + ')' : ''));
        }
        if (payload.status) {
          detailParts.push('Status: ' + payload.status);
        }
        if (payload.service) {
          detailParts.push('Service: ' + payload.service);
        }
      }
      if (detailParts.length) {
        domConstruct.create('div', {
          class: 'workspace-summary-path',
          innerHTML: this.escapeHtml(detailParts.join(' • '))
        }, container);
      }

      var openButton = domConstruct.create('button', {
        type: 'button',
        class: 'workspace-summary-open-button',
        innerHTML: 'Open Jobs Tab'
      }, container);
      on(openButton, 'click', lang.hitch(this, function() {
        topic.publish('CopilotJobsBrowseOpen', {
          uiPayload: payload,
          tool_call: this.message.tool_call || payload.call || null,
          chatSummary: summaryText,
          uiAction: this.message.uiAction || 'open_jobs_tab'
        });
      }));
    },

    renderRagResultWidget: function(messageDiv) {
      var summaryText = this._extractRagSummaryText();
      var cardText = summaryText || 'RAG results are available.';
      var container = domConstruct.create('div', {
        class: 'workspace-summary-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'tool-card-status-row workspace-summary-text',
        innerHTML: 'RAG results ready'
      }, container);

      domConstruct.create('div', {
        class: 'workspace-summary-path',
        innerHTML: this.escapeHtml(cardText)
      }, container);

      var openButton = domConstruct.create('button', {
        type: 'button',
        class: 'workspace-summary-open-button',
        innerHTML: 'View Retrieved Chunks'
      }, container);
      on(openButton, 'click', lang.hitch(this, function() {
        this.showRagChunksDialog(openButton);
      }));
    },

    showRagChunksDialog: function(triggerButton) {
      if (!this.copilotApi || typeof this.copilotApi.searchRagChunkReferences !== 'function') {
        console.warn('[ChatMessage] Copilot API does not support rag chunk search');
        return;
      }

      var filters = this._buildRagChunkSearchFilters();
      var dialogBody = domConstruct.create('div', {
        style: 'max-height: 60vh; overflow-y: auto;'
      });

      var statusNode = domConstruct.create('div', {
        innerHTML: 'Loading retrieved chunks...',
        style: 'color: #4b5563; margin-bottom: 10px;'
      }, dialogBody);

      var chunksContainer = domConstruct.create('div', {}, dialogBody);

      var chunksDialog = new Dialog({
        title: 'Retrieved RAG Chunks',
        style: 'width: 900px; max-width: 95vw;',
        content: dialogBody
      });

      chunksDialog.startup();
      chunksDialog.show();

      if (triggerButton) {
        triggerButton.disabled = true;
        triggerButton.innerHTML = 'Loading...';
      }

      this.copilotApi.searchRagChunkReferences(filters).then(lang.hitch(this, function(response) {
        domConstruct.empty(chunksContainer);
        var items = response && Array.isArray(response.items) ? response.items : [];
        var total = response && typeof response.total === 'number' ? response.total : items.length;
        statusNode.innerHTML = 'Showing ' + items.length + ' of ' + total + ' chunk references';

        if (!items.length) {
          domConstruct.create('div', {
            innerHTML: 'No chunks were found for this response.',
            style: 'color: #6b7280;'
          }, chunksContainer);
          return;
        }

        items.forEach(lang.hitch(this, function(item, index) {
          var chunkCard = domConstruct.create('div', {
            style: 'border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #f9fafb;'
          }, chunksContainer);

          var titleParts = [];
          titleParts.push('Chunk ' + (index + 1));
          if (item.chunk_id) {
            titleParts.push('ID: ' + item.chunk_id);
          }
          domConstruct.create('div', {
            innerHTML: this.escapeHtml(titleParts.join(' | ')),
            style: 'font-weight: 600; margin-bottom: 6px; color: #1f2937;'
          }, chunkCard);

          var metaParts = [];
          if (item.doc_id) metaParts.push('Doc: ' + item.doc_id);
          if (item.source_id) metaParts.push('Source: ' + item.source_id);
          if (item.rag_db) metaParts.push('DB: ' + item.rag_db);
          if (typeof item.score === 'number') metaParts.push('Score: ' + item.score);
          if (item.message_timestamp) metaParts.push('Time: ' + new Date(item.message_timestamp).toLocaleString());
          if (metaParts.length) {
            domConstruct.create('div', {
              innerHTML: this.escapeHtml(metaParts.join(' | ')),
              style: 'font-size: 12px; color: #4b5563; margin-bottom: 8px;'
            }, chunkCard);
          }

          if (item.content) {
            domConstruct.create('pre', {
              innerHTML: this.escapeHtml(item.content),
              style: 'margin: 0; white-space: pre-wrap; word-break: break-word; max-height: 260px; overflow-y: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 8px; font-size: 12px;'
            }, chunkCard);
          }
        }));
      })).catch(lang.hitch(this, function(error) {
        statusNode.innerHTML = 'Failed to load chunks: ' + this.escapeHtml(error && error.message ? error.message : String(error));
      })).then(function() {
        if (triggerButton) {
          triggerButton.disabled = false;
          triggerButton.innerHTML = 'View Retrieved Chunks';
        }
      });
    },

    /**
     * Renders a file metadata widget with preview
     * @param {HTMLElement} messageDiv - Container to render widget into
     */
    renderFileMetadataWidget: function(messageDiv) {
      var payload = this.message.uiPayload;
      var metadata = payload.metadata || {};
      var filePath = payload.path || 'unknown';
      var fileName = metadata.name || filePath.split('/').pop() || 'Unknown file';
      var fileType = metadata.type || 'unknown';

      var container = domConstruct.create('div', {
        class: 'workspace-summary-card file-metadata-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'tool-card-status-row workspace-summary-text',
        innerHTML: this.escapeHtml(fileName)
      }, container);

      domConstruct.create('div', {
        class: 'workspace-summary-path',
        innerHTML: this.escapeHtml(fileType + ' • ' + filePath)
      }, container);

      // Download link container - will be populated async
      var downloadContainer = domConstruct.create('div', {
        class: 'file-metadata-download'
      }, container);

      var parentPath = filePath.split('/').slice(0, -1).join('/') || '/';
      var workspaceDirUrl = this._buildWorkspaceBrowserUrl(parentPath);
      if (workspaceDirUrl) {
        domConstruct.create('a', {
          class: 'workspace-summary-link',
          href: workspaceDirUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          innerHTML: 'Open in Workspace Browser'
        }, container);
      }

      // Preview container - Show Preview button reveals content on click
      var previewContainer = domConstruct.create('div', {
        class: 'file-preview-container'
      }, container);

      var previewToggleButton = domConstruct.create('button', {
        type: 'button',
        class: 'workspace-summary-open-button file-preview-toggle-button',
        innerHTML: 'Show Preview'
      }, previewContainer);

      var previewContentArea = domConstruct.create('div', {
        class: 'file-preview-content-area'
      }, previewContainer);
      previewContentArea.style.display = 'none';

      var showPreview = function() {
        previewContainer.classList.add('file-preview-expanded');
        previewToggleButton.style.display = 'none';
        previewContentArea.style.display = '';
      };

      on(previewToggleButton, 'click', lang.hitch(this, function() {
        if (previewContentArea.getAttribute('data-loaded') === '1') {
          showPreview();
          return;
        }
        if (previewContentArea.getAttribute('data-loading') === '1') {
          return;
        }
        previewContentArea.setAttribute('data-loading', '1');
        domConstruct.empty(previewContentArea);
        domConstruct.create('div', {
          class: 'file-preview-loading',
          innerHTML: 'Loading preview...'
        }, previewContentArea);
        showPreview();

        WorkspaceManager.getDownloadUrls([filePath]).then(lang.hitch(this, function(urls) {
          if (urls && urls.length > 0) {
            var downloadUrl = urls[0];
            fetch(downloadUrl, {
              headers: {
                'Range': 'bytes=0-2047'
              }
            }).then(function(response) {
              if (!response.ok) {
                throw new Error('HTTP ' + response.status);
              }
              return response.text();
            }).then(lang.hitch(this, function(previewText) {
              domConstruct.empty(previewContentArea);
              domConstruct.create('div', {
                class: 'file-preview-label',
                innerHTML: 'Preview (first 2KB):'
              }, previewContentArea);
              domConstruct.create('pre', {
                class: 'file-preview-content',
                innerHTML: this.escapeHtml(previewText)
              }, previewContentArea);
              previewContentArea.setAttribute('data-loaded', '1');
              previewContentArea.removeAttribute('data-loading');
            })).catch(lang.hitch(this, function() {
              domConstruct.empty(previewContentArea);
              domConstruct.create('div', {
                class: 'file-preview-error',
                innerHTML: 'There was an issue previewing this file'
              }, previewContentArea);
              previewContentArea.removeAttribute('data-loading');
            }));
          } else {
            domConstruct.empty(previewContentArea);
            domConstruct.create('div', {
              class: 'file-preview-error',
              innerHTML: 'There was an issue previewing this file'
            }, previewContentArea);
            previewContentArea.removeAttribute('data-loading');
          }
        })).catch(lang.hitch(this, function() {
          domConstruct.empty(previewContentArea);
          domConstruct.create('div', {
            class: 'file-preview-error',
            innerHTML: 'There was an issue previewing this file'
          }, previewContentArea);
          previewContentArea.removeAttribute('data-loading');
        }));
      }));

      // Download link - fetch URL async (non-blocking)
      setTimeout(lang.hitch(this, function() {
        WorkspaceManager.getDownloadUrls([filePath]).then(lang.hitch(this, function(urls) {
          if (urls && urls.length > 0) {
            var downloadUrl = urls[0];
            domConstruct.empty(downloadContainer);
            domConstruct.create('a', {
              class: 'workspace-summary-link',
              href: downloadUrl,
              target: '_blank',
              download: fileName,
              innerHTML: '<i class="fa icon-download"></i> Download file'
            }, downloadContainer);
          }
        }));
      }), 0);
    },

    /**
     * Creates a button element with standard styling
     *
     *
     *
     */
    createMessageActionButtons: function(buttonContainer) {
      var copyButton = this.createButton('', 'copy-button', 'Copy message');
      var thumbUpButton = this.createButton('', 'thumb-up-button', 'Like response');
      var thumbDownButton = this.createButton('', 'thumb-down-button', 'Dislike response');

      // Highlight buttons based on existing rating
      if (this.message.rating === 1) {
        thumbUpButton.classList.add('highlighted');
      } else if (this.message.rating === -1) {
        thumbDownButton.classList.add('highlighted');
      }

      // Add click handler for copy button
      on(copyButton, 'click', lang.hitch(this, function(event) {
        topic.publish('copy-message', this.message.content);
        event.stopPropagation();
      }));

      on(thumbUpButton, 'click', lang.hitch(this, function(event) {
        // topic.publish('thumb-up-message', this.message.content);
        topic.publish('rate-message', {
          message_id: this.message.message_id,
          rating: 1
        });
        event.stopPropagation();
      }));

      on(thumbDownButton, 'click', lang.hitch(this, function(event) {
        // topic.publish('thumb-down-message', this.message.content);
        topic.publish('rate-message', {
          message_id: this.message.message_id,
          rating: -1
        });
        event.stopPropagation();
      }));

      domConstruct.place(copyButton, buttonContainer);
      domConstruct.place(thumbUpButton, buttonContainer);
      domConstruct.place(thumbDownButton, buttonContainer);
    },

    /**
     * Creates copy button for user messages
     */
    createUserMessageCopyButton: function(buttonContainer) {
      var copyButton = this.createButton('', 'copy-button', 'Copy message');

      // Add click handler for copy button
      on(copyButton, 'click', lang.hitch(this, function(event) {
        topic.publish('copy-message', this.message.content);
        event.stopPropagation();
      }));

      domConstruct.place(copyButton, buttonContainer);
    },

    /**
     * Creates a button element with standard styling
     * @param {string} text - The text to display on the button
     * @param {string} [additionalClass] - Optional additional CSS class
     * @returns {HTMLElement} Button element that can be added to a container
     */
    createButton: function(text, additionalClass, tooltip) {
      var className = 'message-action-button' + (additionalClass ? ' ' + additionalClass : '');
      var buttonAttrs = {
        innerHTML: text,
        class: className
      };
      if (tooltip) {
        buttonAttrs.title = tooltip;
      }
      return domConstruct.create('button', buttonAttrs);
    },

    /**
     * Creates collapsible content for system messages using proper DOM construction
     * @param {Object} message - The message object containing content
     * @returns {HTMLElement} DOM container with the system dialog content
     */
    createSystemDialogContent: function(message) {
      var container = domConstruct.create('div');

      // Create collapsible section for message content
      if (message.content) {
        var headerButton1 = domConstruct.create('button', {
          innerHTML: '► System Message Content',
          class: 'collapsible-header'
        }, container);

        var contentDiv1 = domConstruct.create('div', {
          innerHTML: this.md.render(message.content),
          class: 'collapsible-content'
        }, container);

        // Add click handler for toggle functionality
        on(headerButton1, 'click', lang.hitch(this, function() {
          if (contentDiv1.classList.contains('expanded')) {
            contentDiv1.classList.remove('expanded');
            headerButton1.innerHTML = headerButton1.innerHTML.replace('▼', '►');
          } else {
            contentDiv1.classList.add('expanded');
            headerButton1.innerHTML = headerButton1.innerHTML.replace('►', '▼');
          }
        }));
      }

      // Create collapsible section for copilot details if present
      if (message.copilotDetails) {
        var headerButton2 = domConstruct.create('button', {
          innerHTML: '► Copilot Details',
          class: 'collapsible-header'
        }, container);

        var copilotContent;
        if (typeof message.copilotDetails === 'string') {
          copilotContent = this.md.render(message.copilotDetails);
        } else {
          copilotContent = '<pre>' + JSON.stringify(message.copilotDetails, null, 2) + '</pre>';
        }

        var contentDiv2 = domConstruct.create('div', {
          innerHTML: copilotContent,
          class: 'collapsible-content'
        }, container);

        // Add click handler for toggle functionality
        on(headerButton2, 'click', lang.hitch(this, function() {
          if (contentDiv2.classList.contains('expanded')) {
            contentDiv2.classList.remove('expanded');
            headerButton2.innerHTML = headerButton2.innerHTML.replace('▼', '►');
          } else {
            contentDiv2.classList.add('expanded');
            headerButton2.innerHTML = headerButton2.innerHTML.replace('►', '▼');
          }
        }));
      }

      // Check for documents and create collapsible sections for each
      if (message.documents && Array.isArray(message.documents) && message.documents.length > 0) {
        for (var i = 0; i < message.documents.length; i++) {
          var doc = message.documents[i];
          var title = '► Document ' + (i + 1);
          if (doc.title || doc.name) {
            title += ': ' + (doc.title || doc.name);
          }

          var headerButton = domConstruct.create('button', {
            innerHTML: title,
            class: 'collapsible-header'
          }, container);

          var content;
          if (typeof doc === 'string') {
            content = this.md.render(doc);
          } else if (doc.content) {
            content = this.md.render(doc.content);
          } else {
            content = '<pre>' + JSON.stringify(doc, null, 2) + '</pre>';
          }

          var contentDiv = domConstruct.create('div', {
            innerHTML: content,
            class: 'collapsible-content'
          }, container);

          // Add click handler for toggle functionality
          (function(button, div) {
            on(button, 'click', lang.hitch(this, function() {
              if (div.classList.contains('expanded')) {
                div.classList.remove('expanded');
                button.innerHTML = button.innerHTML.replace('▼', '►');
              } else {
                div.classList.add('expanded');
                button.innerHTML = button.innerHTML.replace('►', '▼');
              }
            }));
          }.bind(this))(headerButton, contentDiv);
        }
      }

      return container;
    },

    _buildQueryLinkOpenPlan: function(opts) {
      var options = (opts && typeof opts === 'object') ? opts : {};
      var queryText = options.rqlReplay || null;
      var collection = options.collection || null;
      // Simple special handling: for genome, open GenomeList with query appended directly
      if (collection && collection.toLowerCase() === 'genome' && queryText) {
        var baseGenomeUrl = 'https://www.bv-brc.org/view/GenomeList/';
        return {
          url: baseGenomeUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      // Simple special handling: for taxonomy, open TaxonList with query appended directly
      else if (collection && collection.toLowerCase() === 'taxonomy' && queryText) {
        var baseTaxonomyUrl = 'https://www.bv-brc.org/view/TaxonList/';
        return {
          url: baseTaxonomyUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      // Simple special handling: for genome_feature, open FeatureList with query appended directly
      else if (collection && collection.toLowerCase() === 'genome_feature' && queryText) {
        var baseFeatureUrl = 'https://www.bv-brc.org/view/FeatureList/';
        return {
          url: baseFeatureUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'pathway' && queryText) {
        var basePathwayUrl = 'https://www.bv-brc.org/view/PathwayList/';
        return {
          url: basePathwayUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'protein_structure' && queryText) {
        var baseProteinStructureUrl = 'https://www.bv-brc.org/view/ProteinStructureList/';
        return {
          url: baseProteinStructureUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'strain' && queryText) {
        var baseStrainUrl = 'https://www.bv-brc.org/view/StrainList/';
        return {
          url: baseStrainUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'surveillance' && queryText) {
        var baseSurveillanceUrl = 'https://www.bv-brc.org/view/SurveillanceList/';
        return {
          url: baseSurveillanceUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'subsystem' && queryText) {
        var baseSubsystemUrl = 'https://www.bv-brc.org/view/SubsystemList/';
        return {
          url: baseSubsystemUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'serology' && queryText) {
        var baseSerologyUrl = 'https://www.bv-brc.org/view/SerologyList/';
        return {
          url: baseSerologyUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'epitope' && queryText) {
        var baseEpitopeUrl = 'https://www.bv-brc.org/view/EpitopeList/';
        return {
          url: baseEpitopeUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'sp_gene' && queryText) {
        var baseSpGeneUrl = 'https://www.bv-brc.org/view/SpecialtyGeneList/';
        return {
          url: baseSpGeneUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'sp_gene_ref' && queryText) {
        var baseSpGeneRefUrl = 'https://www.bv-brc.org/view/SpecialtyVFGeneList/';
        return {
          url: baseSpGeneRefUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else if (collection && collection.toLowerCase() === 'protein_feature' && queryText) {
        var baseDomainsMotifsUrl = 'https://www.bv-brc.org/view/DomainsAndMotifsList/';
        return {
          url: baseDomainsMotifsUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
      else {
        var baseUrl = 'https://www.bv-brc.org/search/';
        return {
          url: baseUrl + queryText,
          collection: collection,
          sourceTool: options.sourceTool || null
        };
      }
    },

    _openQueryLink: function(opts) {
      var openPlan = this._buildQueryLinkOpenPlan(opts);
      if (!openPlan || !openPlan.url) {
        return;
      }
      window.open(openPlan.url, '_blank', 'noopener,noreferrer');
    },

    renderQueryCollectionWidget: function(messageDiv) {
      var data = this.message.queryCollectionData || {};
      var summary = data.summary || {};
      var params = data.queryParameters || {};
      var toolCall = (this.message && this.message.tool_call && typeof this.message.tool_call === 'object')
        ? this.message.tool_call
        : null;
      var toolArgs = (toolCall && toolCall.arguments_executed && typeof toolCall.arguments_executed === 'object')
        ? toolCall.arguments_executed
        : {};
      var rqlReplay = (toolCall && toolCall.replay && toolCall.replay.rql_replay_query)
        ? toolCall.replay.rql_replay_query
        : null;
      var summaryText = this.message.chatSummary || 'Data query ready.';
      if (rqlReplay == null) {
        return;
      }
      var rqlQueryUrl = toolArgs.data_api_base_url ? toolArgs.data_api_base_url : "https://www.bv-brc.org/api-bulk";
      rqlQueryUrl = rqlQueryUrl + '/' + toolArgs.collection + '/';
      if (rqlReplay[0] === '?') {
        rqlQueryUrl = rqlQueryUrl + rqlReplay;
      } else {
        rqlQueryUrl = rqlQueryUrl + "?" + rqlReplay;
      }
      var inferCollectionFromUrl = function(rqlUrl) {
        if (!rqlUrl || typeof rqlUrl !== 'string') return null;
        var withoutQuery = rqlUrl.split('?')[0];
        var parts = withoutQuery.split('/').filter(function(part) { return !!part; });
        return parts.length ? parts[parts.length - 1] : null;
      };
      var collection = params.collection ||
        toolArgs.collection ||
        data.collection ||
        inferCollectionFromUrl(rqlQueryUrl) ||
        'query_collection';

      var rows = Array.isArray(data.resultRows) ? data.resultRows : [];
      var rowCount = summary.total !== undefined && summary.total !== null
        ? summary.total
        : rows.length;
      var collectionLabel = (collection || '').replace(/_/g, ' ');
      var detailLine = collectionLabel;

      var payload = {
        queryParameters: params,
        collection: collection,
        rqlQueryUrl: rqlQueryUrl,
        rqlReplay: rqlReplay,
        summary: summary,
        rows: rows
      };

      var container = domConstruct.create('div', {
        class: 'workspace-summary-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'tool-card-status-row workspace-summary-text',
        innerHTML: 'Review your results'
      }, container);

      domConstruct.create('div', {
        class: 'workspace-summary-path',
        innerHTML: this.escapeHtml(detailLine)
      }, container);

      var data_tab_list = ['genome', 'taxonomy', 'genome_feature'];
      if (toolArgs.collection && data_tab_list.includes(toolArgs.collection.toLowerCase())) {
        var dataTabButton = domConstruct.create('button', {
          type: 'button',
          class: 'workspace-summary-open-button',
          innerHTML: 'Open in Chat'
        }, container);
        on(dataTabButton, 'click', lang.hitch(this, function() {
          topic.publish('CopilotDataBrowseOpen', {
            uiPayload: payload,
            tool_call: toolCall,
            chatSummary: summaryText,
            uiAction: 'open_data_tab'
          });
        }));
      }

      if (rqlQueryUrl) {
        var queryLink = domConstruct.create('a', {
          class: 'workspace-summary-link',
          href: '#',
          innerHTML: 'Open in Website'
        }, container);
        on(queryLink, 'click', lang.hitch(this, function(evt) {
          evt.preventDefault();
          this._openQueryLink({
            rqlQueryUrl: rqlQueryUrl,
            rqlReplay: rqlReplay,
            collection: collection,
            sourceTool: this.message && this.message.source_tool ? this.message.source_tool : null
          });
        }));
      }

      if (collection && collection.toLowerCase() === 'genome_feature' && rqlQueryUrl) {
        var authParam = (window.App && window.App.authorizationToken)
          ? '&http_authorization=' + encodeURIComponent(window.App.authorizationToken)
          : '';
        var sep = rqlQueryUrl.indexOf('?') >= 0 ? '&' : '?';
        ['Download DNA Fasta', 'Download Protein Fasta'].forEach(function(linkLabel, idx) {
          var acceptType = idx === 0 ? 'application/dna+fasta' : 'application/protein+fasta';
          var fastaLink = domConstruct.create('a', {
            class: 'workspace-summary-link',
            href: '#',
            innerHTML: linkLabel
          }, container);
          on(fastaLink, 'click', lang.hitch(this, function(evt) {
            evt.preventDefault();
            var downloadUrl = rqlQueryUrl + sep + 'http_accept=' + encodeURIComponent(acceptType) + '&http_download=true';
            downloadUrl = downloadUrl + "&limit(100000)&sort(+patric_id)";
            downloadUrl = downloadUrl + authParam;
            window.open(downloadUrl, '_blank', 'noopener,noreferrer');
          }));
        });
      }
    },

    /**
     * Renders a workflow manifest card with workflow details
     * Displays workflow name, step count, output folder, and a Review & Submit button
     * @param {HTMLElement} messageDiv - Container to render widget into
     */
    renderWorkflowManifestCard: function(messageDiv) {
      var workflow = this.message.workflowData || {};
      var messageToolCall = this.message && this.message.tool_call && typeof this.message.tool_call === 'object'
        ? this.message.tool_call
        : null;
      var toolCallArgs = messageToolCall && messageToolCall.arguments_executed && typeof messageToolCall.arguments_executed === 'object'
        ? messageToolCall.arguments_executed
        : {};

      // Extract workflow information
      var workflowName = workflow.workflow_name || this.message.workflow_name || 'Workflow';
      var workflowDescription = workflow.workflow_description ||
        (workflow.execution_metadata && workflow.execution_metadata.workflow_description) ||
        '';
      var stepCount = 0;
      var outputFolder = '';

      // Count steps
      if (workflow.steps && Array.isArray(workflow.steps)) {
        stepCount = workflow.steps.length;
      }

      // Get output folder
      if (workflow.base_context && workflow.base_context.workspace_output_folder) {
        outputFolder = workflow.base_context.workspace_output_folder;
      }

      // Get status from execution metadata
      var isSubmitted = workflow.execution_metadata && workflow.execution_metadata.is_submitted;
      var isPlanned = workflow.execution_metadata && workflow.execution_metadata.is_planned;
      var statusUrl = (workflow.execution_metadata && workflow.execution_metadata.status_url) || workflow.status_url || null;

      var extractWorkflowIdFromStatusUrl = function(urlValue) {
        if (!urlValue || typeof urlValue !== 'string') {
          return null;
        }
        var match = urlValue.match(/\/workflows\/([^\/\?]+)(?:\/status)?(?:\?.*)?$/i);
        return match && match[1] ? decodeURIComponent(match[1]) : null;
      };

      var workflowId = workflow.workflow_id ||
        workflow.id ||
        (workflow.execution_metadata && (workflow.execution_metadata.workflow_id || workflow.execution_metadata.id)) ||
        toolCallArgs.workflow_id ||
        (messageToolCall && messageToolCall.workflow_id) ||
        this.message.workflow_id ||
        extractWorkflowIdFromStatusUrl(statusUrl) ||
        null;

      var normalizeStatus = function(rawStatus) {
        if (!rawStatus && rawStatus !== 0) return '';
        return String(rawStatus).toLowerCase();
      };

      var getStatusStyle = function(statusValue) {
        var status = normalizeStatus(statusValue);
        if (status === 'succeeded' || status === 'completed') {
          return 'background: #10b981; color: #fff;';
        }
        if (status === 'failed' || status === 'error') {
          return 'background: #ef4444; color: #fff;';
        }
        if (status === 'cancelled') {
          return 'background: #6b7280; color: #fff;';
        }
        if (status === 'running') {
          return 'background: #2563eb; color: #fff;';
        }
        if (status === 'queued' || status === 'pending') {
          return 'background: #f59e0b; color: #111827;';
        }
        if (status === 'submitted') {
          return 'background: #14b8a6; color: #fff;';
        }
        if (status === 'planned') {
          return 'background: #6366f1; color: #fff;';
        }
        return 'background: #9ca3af; color: #fff;';
      };

      var deriveStatus = function() {
        return (workflow.execution_metadata && workflow.execution_metadata.status) ||
          workflow.status ||
          (isSubmitted ? 'submitted' : '') ||
          (isPlanned ? 'planned' : '') ||
          '';
      };

      if (workflowDescription) {
        domConstruct.create('div', {
          innerHTML: this.escapeHtml(workflowDescription),
          style: 'margin: 0 0 8px 0; color: #4b5563; font-size: 13px; line-height: 1.35;'
        }, messageDiv);
      }

      // Create card container
      var card = domConstruct.create('div', {
        class: 'workflow-manifest-card',
        style: 'border: 1px solid #d1d5db; border-radius: 4px; padding: 10px; margin: 8px 0; background: #f9fafb;'
      }, messageDiv);

      // Workflow name header
      domConstruct.create('div', {
        innerHTML: '<strong style="color: #1f2937; font-size: 15px;">' + this.escapeHtml(workflowName) + '</strong>',
        style: 'margin-bottom: 8px;'
      }, card);

      // Details section
      var detailsContainer = domConstruct.create('div', {
        style: 'display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;'
      }, card);

      // Step count
      if (stepCount > 0) {
        domConstruct.create('div', {
          innerHTML: '<span style="color: #6b7280; font-size: 13px;">Steps:</span> <span style="color: #374151; font-size: 13px; font-weight: 500;">' + stepCount + '</span>',
          style: 'display: flex; gap: 4px;'
        }, detailsContainer);
      }

      // Output folder
      if (outputFolder) {
        domConstruct.create('div', {
          innerHTML: '<span style="color: #6b7280; font-size: 13px;">Output:</span> <span style="color: #374151; font-size: 13px; font-family: monospace;">' + this.escapeHtml(outputFolder) + '</span>',
          style: 'display: flex; gap: 4px;'
        }, detailsContainer);
      }

      // Status indicator
      var statusValue = deriveStatus();
      var statusBadgeLabel = statusValue ? this.escapeHtml(String(statusValue).toUpperCase()) : '';
      var statusContainer = null;
      if (statusBadgeLabel) {
        statusContainer = domConstruct.create('div', {
          style: 'margin-top: 2px;'
        }, detailsContainer);
        domConstruct.create('span', {
          innerHTML: statusBadgeLabel,
          style: 'padding: 2px 6px; font-size: 11px; border-radius: 3px; font-weight: 500; ' + getStatusStyle(statusValue)
        }, statusContainer);
      }

      // Button container
      var buttonContainer = domConstruct.create('div', {
        style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 8px; border-top: 1px solid #e5e7eb;'
      }, card);

      var leftActions = domConstruct.create('div', {
        style: 'display: flex; align-items: center; gap: 8px;'
      }, buttonContainer);

      var rightActions = domConstruct.create('div', {
        style: 'display: flex; align-items: center; gap: 8px;'
      }, buttonContainer);

      var checkStatusButton = null;
      if ((workflowId || statusUrl) && this.copilotApi && typeof this.copilotApi.getWorkflowStatus === 'function') {
        checkStatusButton = domConstruct.create('button', {
          innerHTML: 'Check Status',
          class: 'workflow-check-status-button',
          style: 'padding: 4px 10px; background: #ffffff; color: #374151; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.2s, border-color 0.2s;'
        }, leftActions);

        on(checkStatusButton, 'mouseenter', function() {
          if (!checkStatusButton.disabled) {
            checkStatusButton.style.background = '#f3f4f6';
            checkStatusButton.style.borderColor = '#9ca3af';
          }
        });
        on(checkStatusButton, 'mouseleave', function() {
          checkStatusButton.style.background = '#ffffff';
          checkStatusButton.style.borderColor = '#d1d5db';
        });

        on(checkStatusButton, 'click', lang.hitch(this, function() {
          // Non-blocking status refresh: update button state while request runs.
          checkStatusButton.disabled = true;
          checkStatusButton.style.cursor = 'default';
          checkStatusButton.innerHTML = 'Checking...';

          var resolvedWorkflowId = workflowId || extractWorkflowIdFromStatusUrl(statusUrl);
          if (!resolvedWorkflowId) {
            console.warn('[ChatMessage] Unable to determine workflow ID for status check');
            checkStatusButton.disabled = false;
            checkStatusButton.style.cursor = 'pointer';
            checkStatusButton.innerHTML = 'Check Status';
            return;
          }

          this.copilotApi.getWorkflowStatus(resolvedWorkflowId).then(lang.hitch(this, function(statusResponse) {
            var nextStatus = statusResponse && statusResponse.status ? statusResponse.status : null;
            var nextUpdatedAt = statusResponse && statusResponse.updated_at ? statusResponse.updated_at : null;
            var nextWorkflowName = statusResponse && statusResponse.workflow_name ? statusResponse.workflow_name : null;

            if (!workflow.execution_metadata) {
              workflow.execution_metadata = {};
            }
            if (nextStatus) {
              workflow.execution_metadata.status = nextStatus;
              workflow.status = nextStatus;
              workflow.execution_metadata.is_submitted = true;
              workflow.execution_metadata.is_planned = false;
            }
            if (!workflow.execution_metadata.workflow_id) {
              workflow.execution_metadata.workflow_id = resolvedWorkflowId;
            }
            if (!workflow.workflow_id) {
              workflow.workflow_id = resolvedWorkflowId;
            }
            if (nextUpdatedAt) {
              workflow.updated_at = nextUpdatedAt;
            }
            if (nextWorkflowName && !workflow.workflow_name) {
              workflow.workflow_name = nextWorkflowName;
            }

            var updatedStatus = nextStatus || deriveStatus();
            if (updatedStatus) {
              if (!statusContainer) {
                statusContainer = domConstruct.create('div', {
                  style: 'margin-top: 2px;'
                }, detailsContainer);
              } else {
                domConstruct.empty(statusContainer);
              }
              domConstruct.create('span', {
                innerHTML: this.escapeHtml(String(updatedStatus).toUpperCase()),
                style: 'padding: 2px 6px; font-size: 11px; border-radius: 3px; font-weight: 500; ' + getStatusStyle(updatedStatus)
              }, statusContainer);
            }

            topic.publish('CopilotWorkflowCardStatusUpdated', {
              session_id: this.sessionId || null,
              message_id: this.message && this.message.message_id ? this.message.message_id : null,
              workflow: workflow
            });
          })).catch(function(error) {
            console.error('[ChatMessage] Failed to fetch workflow status:', error);
          }).then(function() {
            checkStatusButton.disabled = false;
            checkStatusButton.style.cursor = 'pointer';
            checkStatusButton.innerHTML = 'Check Status';
          });
        }));
      }

      // Review & Submit button
      var reviewButton = domConstruct.create('button', {
        innerHTML: (isSubmitted ? 'View Workflow' : 'Review &amp; Submit'),
        class: 'workflow-review-button',
        style: 'padding: 4px 10px; background: #2563eb; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 13px; font-weight: 500; transition: background 0.2s;'
      }, rightActions);

      // Hover effect
      on(reviewButton, 'mouseenter', function() {
        reviewButton.style.background = '#1d4ed8';
      });
      on(reviewButton, 'mouseleave', function() {
        reviewButton.style.background = '#2563eb';
      });

      // Add click handler to show workflow dialog
      on(reviewButton, 'click', lang.hitch(this, function() {
        this.showWorkflowDialog();
      }));
    },

    /**
     * Shows a dialog displaying the workflow using WorkflowEngine widget
     */
    showWorkflowDialog: function() {
      var localWorkflowData = this.message.workflowData || {};
      var messageToolCall = this.message && this.message.tool_call && typeof this.message.tool_call === 'object'
        ? this.message.tool_call
        : null;
      var toolCallArgs = messageToolCall && messageToolCall.arguments_executed && typeof messageToolCall.arguments_executed === 'object'
        ? messageToolCall.arguments_executed
        : {};
      var workflowId = localWorkflowData.workflow_id ||
        (localWorkflowData.execution_metadata && localWorkflowData.execution_metadata.workflow_id) ||
        toolCallArgs.workflow_id ||
        (messageToolCall && messageToolCall.workflow_id) ||
        this.message.workflow_id ||
        null;

      if ((!localWorkflowData || Object.keys(localWorkflowData).length === 0) && workflowId) {
        localWorkflowData = { workflow_id: workflowId };
      }
      if (!workflowId && (!localWorkflowData || Object.keys(localWorkflowData).length === 0)) {
        console.error('[ChatMessage] ✗ No workflow identity available');
        return;
      }
      var hasWorkflowSteps = Array.isArray(localWorkflowData.steps) && localWorkflowData.steps.length > 0;
      var canHydrateById = !!(
        workflowId &&
        !hasWorkflowSteps &&
        this.copilotApi &&
        typeof this.copilotApi.getWorkflowById === 'function'
      );

      if (canHydrateById) {
        this.copilotApi.getWorkflowById(workflowId).then(lang.hitch(this, function(fullWorkflow) {
          if (fullWorkflow && typeof fullWorkflow === 'object') {
            this.message.workflowData = fullWorkflow;
          }
          this.showWorkflowDialog();
        })).catch(function(error) {
          console.error('[ChatMessage] Failed to hydrate workflow by id:', error);
        });
        return;
      }

      var workflowEngine = null;
      var overlayNode = null;
      var keyHandler = null;

      try {
        workflowEngine = new WorkflowEngine({
          workflowData: this.message.workflowData,
          copilotApi: this.copilotApi,
          sessionId: this.sessionId
        });

        overlayNode = domConstruct.create('div', {
          class: 'workflow-modal-overlay',
          style: 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 2147483000; display: flex; align-items: center; justify-content: center; padding: 24px;'
        }, document.body);

        var modalNode = domConstruct.create('div', {
          class: 'workflow-modal-dialog',
          style: 'background: #fff; width: min(980px, 95vw); max-height: 88vh; border-radius: 10px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; overflow: hidden;'
        }, overlayNode);

        var headerNode = domConstruct.create('div', {
          class: 'workflow-modal-header',
          style: 'display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #e5e7eb;'
        }, modalNode);

        domConstruct.create('div', {
          innerHTML: 'Workflow Review',
          style: 'font-size: 18px; font-weight: 600; color: #1f2937;'
        }, headerNode);

        var closeButton = domConstruct.create('button', {
          innerHTML: 'Close',
          style: 'padding: 8px 14px; background: #666; color: #fff; border: none; border-radius: 4px; cursor: pointer;'
        }, headerNode);

        var contentNode = domConstruct.create('div', {
          class: 'workflow-modal-content',
          style: 'padding: 16px; overflow-y: auto; overflow-x: hidden;'
        }, modalNode);

        domConstruct.place(workflowEngine.domNode, contentNode);

        var closeModal = function() {
          if (keyHandler) {
            keyHandler.remove();
            keyHandler = null;
          }
          if (workflowEngine) {
            workflowEngine.destroyRecursive();
            workflowEngine = null;
          }
          if (overlayNode && overlayNode.parentNode) {
            overlayNode.parentNode.removeChild(overlayNode);
            overlayNode = null;
          }
        };

        on(closeButton, 'click', closeModal);
        on(overlayNode, 'click', function(evt) {
          if (evt.target === overlayNode) {
            closeModal();
          }
        });
        keyHandler = on(document, 'keydown', function(evt) {
          if (evt.key === 'Escape') {
            closeModal();
          }
        });

        closeButton.focus();
      } catch (e) {
        if (keyHandler) {
          keyHandler.remove();
        }
        if (workflowEngine) {
          workflowEngine.destroyRecursive();
        }
        if (overlayNode && overlayNode.parentNode) {
          overlayNode.parentNode.removeChild(overlayNode);
        }
        console.error('[ChatMessage] ✗ Error showing workflow dialog:', e);
      }
    }
  });
});
