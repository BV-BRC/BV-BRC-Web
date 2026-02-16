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
      var sourceTool = this.message.source_tool;
      var contentToProcess = this.message.content;

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

      // Process content based on source_tool using tool handler
      // Skip processing if the message already has processed tool data (uiPayload/workspaceBrowseResult)
      // This happens when SSE handler already processed the tool output
      var alreadyProcessed = false;
      if (sourceTool === 'bvbrc_server.workspace_browse_tool' && this.message.uiPayload && this.message.workspaceBrowseResult) {
        console.log('[ChatMessage] Workspace browse already processed by SSE handler, skipping re-processing');
        alreadyProcessed = true;
      }

      if (sourceTool && !alreadyProcessed) {
        // If content is an object with nested structure, extract the actual content
        if (typeof contentToProcess === 'object' && contentToProcess.content) {
          contentToProcess = contentToProcess.content;
        }

        var processedData = this.toolHandler.processMessageContent(contentToProcess, sourceTool);

        this.message.content = processedData.content;
        this.message.isWorkflow = typeof processedData.isWorkflow !== 'undefined' ? processedData.isWorkflow : this.message.isWorkflow;
        this.message.workflowData = typeof processedData.workflowData !== 'undefined' ? processedData.workflowData : this.message.workflowData;
        this.message.isWorkspaceBrowse = typeof processedData.isWorkspaceBrowse !== 'undefined' ? processedData.isWorkspaceBrowse : this.message.isWorkspaceBrowse;
        this.message.workspaceBrowseResult = typeof processedData.workspaceBrowseResult !== 'undefined' ? processedData.workspaceBrowseResult : this.message.workspaceBrowseResult;
        this.message.chatSummary = typeof processedData.chatSummary !== 'undefined' ? processedData.chatSummary : this.message.chatSummary;
        this.message.uiPayload = typeof processedData.uiPayload !== 'undefined' ? processedData.uiPayload : this.message.uiPayload;
        this.message.uiAction = typeof processedData.uiAction !== 'undefined' ? processedData.uiAction : this.message.uiAction;
        this.message.isWorkspaceListing = typeof processedData.isWorkspaceListing !== 'undefined' ? processedData.isWorkspaceListing : this.message.isWorkspaceListing;
        this.message.workspaceData = typeof processedData.workspaceData !== 'undefined' ? processedData.workspaceData : this.message.workspaceData;
        this.message.isQueryCollection = typeof processedData.isQueryCollection !== 'undefined' ? processedData.isQueryCollection : this.message.isQueryCollection;
        this.message.queryCollectionData = typeof processedData.queryCollectionData !== 'undefined' ? processedData.queryCollectionData : this.message.queryCollectionData;

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
      // Check if this is a workflow message

      if (this.message.isWorkflow && this.message.workflowData) {
        // Show a "Review Workflow" button instead of displaying the content
        var workflowButtonContainer = domConstruct.create('div', {
          class: 'workflow-button-container',
          style: 'margin: 10px 0;'
        }, messageDiv);

        var reviewWorkflowButton = domConstruct.create('button', {
          innerHTML: 'Review Workflow',
          class: 'review-workflow-button',
          style: 'padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;'
        }, workflowButtonContainer);

        // Add click handler to show workflow dialog
        on(reviewWorkflowButton, 'click', lang.hitch(this, function() {
          this.showWorkflowDialog();
        }));
      } else if (
        this.message.uiAction === 'show_file_metadata' &&
        this.message.uiPayload
      ) {
        this.renderFileMetadataWidget(messageDiv);
      } else if (
        (this.message.isWorkspaceBrowse && this.message.uiPayload) ||
        (this.message.isWorkspaceListing && this.message.workspaceData)
      ) {
        this.renderWorkspaceBrowseSummaryWidget(messageDiv);
      } else if (this.message.isQueryCollection && this.message.queryCollectionData) {
        // Render query collection file reference widget
        this.renderQueryCollectionWidget(messageDiv);
      } else {
        // Normal message rendering

        // Ensure content is a string before rendering with markdown
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

        domConstruct.create('div', {
          innerHTML: contentToRender ? this.md.render(contentToRender) : '',
          class: 'markdown-content',
          style: 'font-size: ' + this.fontSize + 'px;'
        }, messageDiv);
      }

      if (this.message.role === 'assistant') {
        // Create button container for assistant messages
        var buttonContainer = domConstruct.create('div', {
          class: 'message-button-container'
        }, messageDiv);

        // Add copy text button
        this.createMessageActionButtons(buttonContainer);
      }
    },

    /**
     * Renders a compact workspace browse summary with an action button.
     * @param {HTMLElement} messageDiv - Container to render widget into
     */
    renderWorkspaceBrowseSummaryWidget: function(messageDiv) {
      var payload = this.message.uiPayload || {
        path: this.message.workspaceData && this.message.workspaceData.path ? this.message.workspaceData.path : null,
        items: this.message.workspaceData && Array.isArray(this.message.workspaceData.items) ? this.message.workspaceData.items : [],
        count: this.message.workspaceData && Array.isArray(this.message.workspaceData.items) ? this.message.workspaceData.items.length : 0,
        result_type: 'list_result'
      };

      var countValue = this._getWorkspaceBrowseCount(payload);
      var pathValue = payload.path || 'unknown path';
      var summaryText = this.message.chatSummary || ('Found ' + countValue + ' ' + (countValue === 1 ? 'result' : 'results') + ' in ' + pathValue);
      var workspaceBrowserUrl = this._buildWorkspaceBrowserUrl(payload.path);

      var container = domConstruct.create('div', {
        class: 'workspace-summary-card'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'workspace-summary-text',
        innerHTML: this.escapeHtml(summaryText)
      }, container);

      domConstruct.create('div', {
        class: 'workspace-summary-path',
        innerHTML: 'Path: ' + this.escapeHtml(pathValue)
      }, container);

      if (workspaceBrowserUrl) {
        domConstruct.create('a', {
          class: 'workspace-summary-link',
          href: workspaceBrowserUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
          innerHTML: 'Open in Workspace Browser'
        }, container);
      }

      var openButton = domConstruct.create('button', {
        type: 'button',
        class: 'workspace-summary-open-button',
        innerHTML: 'Open Workspace Tab'
      }, container);

      on(openButton, 'click', lang.hitch(this, function() {
        topic.publish('CopilotWorkspaceBrowseOpen', {
          uiPayload: payload,
          chatSummary: summaryText,
          uiAction: this.message.uiAction || 'open_workspace_tab'
        });
      }));
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
        class: 'file-metadata-card'
      }, messageDiv);

      // File info header - show immediately (non-blocking)
      domConstruct.create('div', {
        class: 'file-metadata-header',
        innerHTML: '<strong>' + this.escapeHtml(fileName) + '</strong>'
      }, container);

      domConstruct.create('div', {
        class: 'file-metadata-type',
        innerHTML: 'Type: ' + this.escapeHtml(fileType)
      }, container);

      domConstruct.create('div', {
        class: 'file-metadata-path',
        innerHTML: 'Path: ' + this.escapeHtml(filePath)
      }, container);

      // Download link container - will be populated async
      var downloadContainer = domConstruct.create('div', {
        class: 'file-metadata-download'
      }, container);

      // Preview container - will be populated async
      var previewContainer = domConstruct.create('div', {
        class: 'file-preview-container'
      }, container);

      domConstruct.create('div', {
        class: 'file-preview-loading',
        innerHTML: 'Loading preview...'
      }, previewContainer);

      // Non-blocking async fetch of download URL and preview
      setTimeout(lang.hitch(this, function() {
        WorkspaceManager.getDownloadUrls([filePath]).then(lang.hitch(this, function(urls) {
          if (urls && urls.length > 0) {
            var downloadUrl = urls[0];

            // Add download link
            domConstruct.empty(downloadContainer);
            domConstruct.create('a', {
              href: downloadUrl,
              target: '_blank',
              download: fileName,
              innerHTML: '<i class="fa icon-download"></i> Download file'
            }, downloadContainer);

            // Fetch preview with byte-range request (first 2KB)
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
              domConstruct.empty(previewContainer);

              domConstruct.create('div', {
                class: 'file-preview-label',
                innerHTML: 'Preview (first 2KB):'
              }, previewContainer);

              domConstruct.create('pre', {
                class: 'file-preview-content',
                innerHTML: this.escapeHtml(previewText)
              }, previewContainer);
            })).catch(lang.hitch(this, function() {
              domConstruct.empty(previewContainer);
              domConstruct.create('div', {
                class: 'file-preview-error',
                innerHTML: 'There was an issue previewing this file'
              }, previewContainer);
            }));
          } else {
            domConstruct.empty(previewContainer);
            domConstruct.create('div', {
              class: 'file-preview-error',
              innerHTML: 'There was an issue previewing this file'
            }, previewContainer);
          }
        })).catch(lang.hitch(this, function() {
          domConstruct.empty(previewContainer);
          domConstruct.create('div', {
            class: 'file-preview-error',
            innerHTML: 'There was an issue previewing this file'
          }, previewContainer);
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

    /**
     * Renders a query collection file reference widget
     * Displays workspace URL, workspace path, and summary metadata
     * @param {HTMLElement} messageDiv - Container to render widget into
     */
    renderQueryCollectionWidget: function(messageDiv) {
      var data = this.message.queryCollectionData;
      if (!data) {
        console.warn('[ChatMessage] No query collection data available');
        return;
      }

      // Create container for the query collection widget
      var widgetContainer = domConstruct.create('div', {
        class: 'query-collection-container',
        style: 'border: 1px solid #ddd; border-radius: 4px; padding: 15px; margin: 10px 0; background: #f9f9f9;'
      }, messageDiv);

      // Create header
      var header = domConstruct.create('div', {
        class: 'query-collection-header',
        style: 'font-weight: bold; font-size: 16px; margin-bottom: 15px; color: #333;'
      }, widgetContainer);
      domConstruct.create('span', {
        innerHTML: 'Query Collection Results',
        style: 'display: inline-block;'
      }, header);

      // Display workspace information
      if (data.workspace) {
        var workspaceSection = domConstruct.create('div', {
          class: 'query-collection-workspace',
          style: 'margin-bottom: 15px;'
        }, widgetContainer);

        // Workspace URL (clickable link)
        if (data.workspace.workspaceUrl) {
          var urlLabel = domConstruct.create('div', {
            innerHTML: '<strong>Workspace URL:</strong>',
            style: 'margin-bottom: 5px; font-size: 14px;'
          }, workspaceSection);
          var urlLink = domConstruct.create('a', {
            innerHTML: data.workspace.workspaceUrl,
            href: data.workspace.workspaceUrl,
            target: '_blank',
            style: 'color: #0066cc; text-decoration: none; word-break: break-all; display: block; margin-left: 10px;'
          }, workspaceSection);
          urlLink.onmouseover = function() { this.style.textDecoration = 'underline'; };
          urlLink.onmouseout = function() { this.style.textDecoration = 'none'; };
        }

        // Workspace Path
        if (data.workspace.workspacePath) {
          var pathLabel = domConstruct.create('div', {
            innerHTML: '<strong>Workspace Path:</strong>',
            style: 'margin-top: 10px; margin-bottom: 5px; font-size: 14px;'
          }, workspaceSection);
          var pathValue = domConstruct.create('div', {
            innerHTML: data.workspace.workspacePath,
            style: 'margin-left: 10px; font-family: monospace; word-break: break-all; color: #666;'
          }, workspaceSection);
        }

        // Uploaded At
        if (data.workspace.uploadedAt) {
          var uploadedLabel = domConstruct.create('div', {
            innerHTML: '<strong>Uploaded:</strong> ' + new Date(data.workspace.uploadedAt).toLocaleString(),
            style: 'margin-top: 10px; font-size: 14px; color: #666;'
          }, workspaceSection);
        }
      }

      // Display summary metadata
      if (data.summary) {
        var summarySection = domConstruct.create('div', {
          class: 'query-collection-summary',
          style: 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;'
        }, widgetContainer);

        var summaryHeader = domConstruct.create('div', {
          innerHTML: '<strong>Summary:</strong>',
          style: 'font-size: 14px; margin-bottom: 10px;'
        }, summarySection);

        // Record count
        if (data.summary.recordCount !== undefined) {
          var recordCountDiv = domConstruct.create('div', {
            innerHTML: '<strong>Records:</strong> ' + data.summary.recordCount.toLocaleString(),
            style: 'margin-bottom: 5px; font-size: 14px;'
          }, summarySection);
        }

        // Size
        if (data.summary.sizeFormatted) {
          var sizeDiv = domConstruct.create('div', {
            innerHTML: '<strong>Size:</strong> ' + data.summary.sizeFormatted,
            style: 'margin-bottom: 5px; font-size: 14px;'
          }, summarySection);
        }

        // Data type
        if (data.summary.dataType) {
          var dataTypeDiv = domConstruct.create('div', {
            innerHTML: '<strong>Data Type:</strong> ' + data.summary.dataType,
            style: 'margin-bottom: 5px; font-size: 14px;'
          }, summarySection);
        }

        // Fields
        if (data.summary.fields && Array.isArray(data.summary.fields) && data.summary.fields.length > 0) {
          var fieldsLabel = domConstruct.create('div', {
            innerHTML: '<strong>Fields (' + data.summary.fields.length + '):</strong>',
            style: 'margin-top: 10px; margin-bottom: 5px; font-size: 14px;'
          }, summarySection);
          // Show first 10 fields, then "... and X more" if there are more
          var fieldsToShow = data.summary.fields.slice(0, 10);
          var fieldsText = fieldsToShow.join(', ');
          if (data.summary.fields.length > 10) {
            fieldsText += ' ... and ' + (data.summary.fields.length - 10) + ' more';
          }
          var fieldsDiv = domConstruct.create('div', {
            innerHTML: fieldsText,
            style: 'margin-left: 10px; font-size: 13px; color: #666; font-family: monospace; word-break: break-all;'
          }, summarySection);
        }

        // Sample record (collapsible)
        if (data.summary.sampleRecord) {
          var sampleHeader = domConstruct.create('button', {
            innerHTML: '► Sample Record',
            class: 'collapsible-header',
            style: 'margin-top: 10px; padding: 5px 10px; background: #e9e9e9; border: 1px solid #ccc; border-radius: 3px; cursor: pointer; font-size: 13px;'
          }, summarySection);

          var sampleContent = domConstruct.create('div', {
            innerHTML: '<pre style="margin: 10px 0; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 3px; overflow-x: auto; font-size: 12px; max-height: 300px; overflow-y: auto;">' +
              JSON.stringify(data.summary.sampleRecord, null, 2) + '</pre>',
            class: 'collapsible-content',
            style: 'display: none;'
          }, summarySection);

          on(sampleHeader, 'click', lang.hitch(this, function() {
            if (sampleContent.style.display === 'none') {
              sampleContent.style.display = 'block';
              sampleHeader.innerHTML = '▼ Sample Record';
            } else {
              sampleContent.style.display = 'none';
              sampleHeader.innerHTML = '► Sample Record';
            }
          }));
        }
      }

      // Display query parameters if available
      if (data.queryParameters) {
        var queryParamsSection = domConstruct.create('div', {
          class: 'query-collection-query-params',
          style: 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;'
        }, widgetContainer);

        var queryParamsHeader = domConstruct.create('div', {
          innerHTML: '<strong>Query Parameters:</strong>',
          style: 'font-size: 14px; margin-bottom: 10px;'
        }, queryParamsSection);

        // Filter out internal pagination parameters like cursorId
        var filteredParams = {};
        for (var key in data.queryParameters) {
          if (data.queryParameters.hasOwnProperty(key) && key !== 'cursorId') {
            filteredParams[key] = data.queryParameters[key];
          }
        }

        // Display each parameter on its own line
        for (var paramKey in filteredParams) {
          if (filteredParams.hasOwnProperty(paramKey)) {
            var paramValue = filteredParams[paramKey];
            var paramLabel = domConstruct.create('div', {
              innerHTML: '<strong>' + paramKey + ':</strong>',
              style: 'margin-top: 5px; margin-bottom: 2px; font-size: 14px;'
            }, queryParamsSection);
            var paramValueDiv = domConstruct.create('div', {
              innerHTML: typeof paramValue === 'string' ? paramValue : JSON.stringify(paramValue),
              style: 'margin-left: 10px; margin-bottom: 8px; font-family: monospace; word-break: break-all; color: #666; font-size: 13px;'
            }, queryParamsSection);
          }
        }
      }

      // Display message if available
      if (data.message) {
        var messageSection = domConstruct.create('div', {
          class: 'query-collection-message',
          style: 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 14px; color: #666;'
        }, widgetContainer);
        domConstruct.create('div', {
          innerHTML: data.message
        }, messageSection);
      }
    },

    /**
     * Shows a dialog displaying the workflow using WorkflowEngine widget
     */
    showWorkflowDialog: function() {
      if (!this.message.workflowData) {
        console.error('[ChatMessage] ✗ No workflow data available');
        console.error('[ChatMessage] Message properties:', Object.keys(this.message));
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
