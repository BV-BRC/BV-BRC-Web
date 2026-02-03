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

      // Process content based on source_tool using tool handler
      if (this.message.source_tool) {
        console.log('[ChatMessage] Processing message with source_tool:', this.message.source_tool);
        console.log('[ChatMessage] Original content type:', typeof this.message.content);
        console.log('[ChatMessage] Original content (first 200 chars):',
          typeof this.message.content === 'string' ? this.message.content.substring(0, 200) : this.message.content);

        var processedData = this.toolHandler.processMessageContent(this.message.content, this.message.source_tool);

        console.log('[ChatMessage] Processed data:', processedData);
        console.log('[ChatMessage] processedData.isWorkflow:', processedData.isWorkflow);
        console.log('[ChatMessage] processedData.workflowData:', processedData.workflowData);
        console.log('[ChatMessage] processedData.workflowData type:', typeof processedData.workflowData);

        this.message.content = processedData.content;
        this.message.isWorkflow = processedData.isWorkflow;
        this.message.workflowData = processedData.workflowData;
        this.message.isWorkspaceListing = processedData.isWorkspaceListing;
        this.message.workspaceData = processedData.workspaceData;

        if (processedData.workflowData) {
          console.log('[ChatMessage] ✓ Workflow data set on message');
          console.log('[ChatMessage] workflowData keys:', Object.keys(processedData.workflowData));
          console.log('[ChatMessage] workflowData.workflow_name:', processedData.workflowData.workflow_name);
        } else {
          console.warn('[ChatMessage] ⚠ No workflowData in processed data');
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
      } else {
        // Normal message rendering
        domConstruct.create('div', {
          innerHTML: this.message.content ? this.md.render(this.message.content) : '',
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
