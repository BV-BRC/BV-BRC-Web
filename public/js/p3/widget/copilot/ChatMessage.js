define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/dom-class', // DOM class manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Topic messaging
  'dojo/_base/lang', // Language utilities
  'markdown-it/dist/markdown-it.min', // Markdown parser and renderer
  'markdown-it-link-attributes/dist/markdown-it-link-attributes.min', // Plugin to add attributes to links
  'dijit/Dialog', // Dialog widget
  './CopilotToolHandler', // Tool handler for special tool processing
  './WorkflowEngine', // Workflow engine widget for displaying workflows
  './WorkspaceExplorerAdapter' // Workspace explorer adapter for displaying workspace contents
], function (
  declare, domConstruct, domClass, on, topic, lang, markdownit, linkAttributes, Dialog, CopilotToolHandler, WorkflowEngine, WorkspaceExplorerAdapter
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
      this.copilotEnableShowPromptDetails = window.App && window.App.copilotEnableShowPromptDetails === 'true';
      this.toolHandler = new CopilotToolHandler();
      this.renderMessage(); // Immediately render on construction
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
      // Check for source_tool field and log it if it exists
      if (this.message.source_tool) {
        console.log('[ChatMessage] source_tool:', this.message.source_tool);
      }

      // Check if content is a JSON string containing source_tool (for real-time results)
      var sourceTool = this.message.source_tool;
      var contentToProcess = this.message.content;

      if (!sourceTool && typeof this.message.content === 'string') {
        try {
          // Try to parse the content as JSON to see if source_tool is inside
          var parsedContent = JSON.parse(this.message.content);
          if (parsedContent && parsedContent.source_tool) {
            console.log('[ChatMessage] Found source_tool inside JSON string content:', parsedContent.source_tool);
            sourceTool = parsedContent.source_tool;
            // Set it on the message object for consistency
            this.message.source_tool = sourceTool;
            // Use the parsed content for processing
            contentToProcess = parsedContent;
          }
        } catch (e) {
          // Not valid JSON, continue with normal processing
          console.log('[ChatMessage] Content is not valid JSON, skipping source_tool extraction');
        }
      }

      // Process content based on source_tool using tool handler
      if (sourceTool) {
        console.log('[ChatMessage] Processing message with source_tool:', sourceTool);
        console.log('[ChatMessage] Original content type:', typeof this.message.content);
        console.log('[ChatMessage] Original content (first 200 chars):',
          typeof this.message.content === 'string' ? this.message.content.substring(0, 200) : this.message.content);

        // If content is an object with nested structure, extract the actual content
        if (typeof contentToProcess === 'object' && contentToProcess.content) {
          console.log('[ChatMessage] Content is object with nested .content, extracting');
          console.log('[ChatMessage] Nested content:', contentToProcess.content);
          contentToProcess = contentToProcess.content;
        }

        var processedData = this.toolHandler.processMessageContent(contentToProcess, sourceTool);

        console.log('[ChatMessage] Processed data:', processedData);
        console.log('[ChatMessage] processedData type:', typeof processedData);
        console.log('[ChatMessage] processedData keys:', processedData ? Object.keys(processedData) : 'null');
        console.log('[ChatMessage] processedData.isWorkflow:', processedData.isWorkflow);
        console.log('[ChatMessage] processedData.workflowData:', processedData.workflowData);
        console.log('[ChatMessage] processedData.workflowData type:', typeof processedData.workflowData);
        console.log('[ChatMessage] processedData.isWorkspaceListing:', processedData.isWorkspaceListing);
        console.log('[ChatMessage] processedData.isQueryCollection:', processedData.isQueryCollection);
        console.log('[ChatMessage] processedData.queryCollectionData:', processedData.queryCollectionData);
        console.log('[ChatMessage] processedData.content type:', typeof processedData.content);
        console.log('[ChatMessage] processedData.content value:', processedData.content);
        console.log('[ChatMessage] processedData.content is string?', typeof processedData.content === 'string');

        this.message.content = processedData.content;
        this.message.isWorkflow = processedData.isWorkflow;
        this.message.workflowData = processedData.workflowData;
        this.message.isWorkspaceListing = processedData.isWorkspaceListing;
        this.message.workspaceData = processedData.workspaceData;
        this.message.isQueryCollection = processedData.isQueryCollection;
        this.message.queryCollectionData = processedData.queryCollectionData;

        if (processedData.workflowData) {
          console.log('[ChatMessage] ✓ Workflow data set on message');
          console.log('[ChatMessage] workflowData keys:', Object.keys(processedData.workflowData));
          console.log('[ChatMessage] workflowData.workflow_name:', processedData.workflowData.workflow_name);
        } else {
          console.warn('[ChatMessage] ⚠ No workflowData in processed data');
        }

        if (processedData.queryCollectionData) {
          console.log('[ChatMessage] ✓ Query collection data set on message');
          console.log('[ChatMessage] queryCollectionData keys:', Object.keys(processedData.queryCollectionData));
          console.log('[ChatMessage] queryCollectionData.workspace:', processedData.queryCollectionData.workspace);
          console.log('[ChatMessage] queryCollectionData.summary:', processedData.queryCollectionData.summary);
        }
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
      console.log('[ChatMessage] renderUserOrAssistantMessage() - checking for workflow');
      console.log('[ChatMessage] isWorkflow:', this.message.isWorkflow);
      console.log('[ChatMessage] workflowData exists:', !!this.message.workflowData);

      if (this.message.isWorkflow && this.message.workflowData) {
        console.log('[ChatMessage] ✓ Rendering workflow button');
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
          console.log('[ChatMessage] Review Workflow button clicked');
          this.showWorkflowDialog();
        }));
      } else if (this.message.isWorkspaceListing && this.message.workspaceData) {
        // Add a class to the message div to allow wider display for workspace listings
        domClass.add(messageDiv, 'workspace-listing-message');

        // Show workspace explorer adapter directly in the message
        var workspaceWidget = new WorkspaceExplorerAdapter({
          region: 'center',
          allowDragAndDrop: false, // Disable drag-and-drop in chat context
          onlyWritable: false
        });

        // Set the MCP data (path and items)
        if (this.message.workspaceData && typeof this.message.workspaceData === 'object') {
          workspaceWidget.setMcpData(this.message.workspaceData);
        } else if (Array.isArray(this.message.workspaceData)) {
          // Backward compatibility: if it's just an array, treat as items
          workspaceWidget.setMcpData({ items: this.message.workspaceData });
        }

        // Create a container for the workspace widget
        // Make it wider by using full width and overriding any parent constraints
        // Reduced height for more compact display
        var workspaceContainer = domConstruct.create('div', {
          class: 'workspace-explorer-container',
          style: 'min-height: 200px; max-height: 400px; width: 100%; max-width: 100%; overflow-x: auto; overflow-y: auto;'
        }, messageDiv);

        // Place the widget's domNode in the container
        domConstruct.place(workspaceWidget.domNode, workspaceContainer);

        // Start the widget (required for Dojo widgets)
        workspaceWidget.startup();
      } else if (this.message.isQueryCollection && this.message.queryCollectionData) {
        // Render query collection file reference widget
        this.renderQueryCollectionWidget(messageDiv);
      } else {
        // Normal message rendering
        console.log('[ChatMessage] renderUserOrAssistantMessage - Normal message rendering');
        console.log('[ChatMessage] this.message.content type:', typeof this.message.content);
        console.log('[ChatMessage] this.message.content value:', this.message.content);
        console.log('[ChatMessage] this.message.content is string?', typeof this.message.content === 'string');
        console.log('[ChatMessage] this.message keys:', Object.keys(this.message));

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
              console.log('[ChatMessage] ✓ Detected rag_result type, extracting summary');
              contentToRender = this.message.content.summary || '';
            } else {
              // Convert to string - if it's an object, stringify it
              contentToRender = typeof this.message.content === 'object'
                ? JSON.stringify(this.message.content, null, 2)
                : String(this.message.content);
            }
          }
        }

        console.log('[ChatMessage] contentToRender type:', typeof contentToRender);
        console.log('[ChatMessage] contentToRender (first 200 chars):', contentToRender.substring(0, 200));

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
      console.log('[ChatMessage] showWorkflowDialog() called');
      console.log('[ChatMessage] message object:', this.message);
      console.log('[ChatMessage] message.workflowData:', this.message.workflowData);
      console.log('[ChatMessage] message.workflowData type:', typeof this.message.workflowData);
      console.log('[ChatMessage] message.isWorkflow:', this.message.isWorkflow);
      console.log('[ChatMessage] message.source_tool:', this.message.source_tool);

      if (!this.message.workflowData) {
        console.error('[ChatMessage] ✗ No workflow data available');
        console.error('[ChatMessage] Message properties:', Object.keys(this.message));
        return;
      }

      console.log('[ChatMessage] ✓ Workflow data exists, creating WorkflowEngine');
      console.log('[ChatMessage] Workflow data content:', JSON.stringify(this.message.workflowData, null, 2));

      // Create WorkflowEngine widget
      var workflowEngine = new WorkflowEngine({
        workflowData: this.message.workflowData
      });

      console.log('[ChatMessage] ✓ WorkflowEngine created');
      console.log('[ChatMessage] workflowEngine.domNode:', workflowEngine.domNode);

      // Create dialog
      var workflowDialog = new Dialog({
        title: 'Workflow Review',
        style: 'width: 700px; max-height: 80vh;',
        content: workflowEngine.domNode
      });

      console.log('[ChatMessage] ✓ Dialog created');

      // Add close button
      var buttonContainer = domConstruct.create('div', {
        style: 'text-align: right; margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;'
      });

      var closeButton = domConstruct.create('button', {
        innerHTML: 'Close',
        style: 'padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;'
      });

      closeButton.onclick = function() {
        workflowDialog.hide();
        workflowDialog.destroy();
        workflowEngine.destroy();
      };

      buttonContainer.appendChild(closeButton);
      workflowDialog.containerNode.appendChild(buttonContainer);

      // Show dialog
      workflowDialog.startup();
      workflowDialog.show();
    }
  });
});
