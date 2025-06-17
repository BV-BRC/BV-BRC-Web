define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Topic messaging
  'dojo/_base/lang', // Language utilities
  'markdown-it/dist/markdown-it.min', // Markdown parser and renderer
  'dijit/Dialog' // Dialog widget
], function (
  declare, domConstruct, on, topic, lang, markdownit, Dialog
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
    md: markdownit(),

    /**
     * @constructor
     * Creates a new ChatMessage instance
     * @param {Object} message - Message object containing content, role and message_id
     * @param {HTMLElement} container - DOM element to render the message into
     */
    constructor: function(message, container) {
      this.message = message;
      this.container = container;
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
        this.renderSystemMessage(messageDiv);
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
        innerHTML: 'Show Retrieved Documents',
        class: 'show-docs-button'
      }, messageDiv);

      // Handle button click
      on(showDocsButton, 'click', function() {
        // Create dialog to show markdown content
        var docsDialog = new Dialog({
          title: "Retrieved Documents",
          style: "width: 600px; max-height: 80vh;",
          content: domConstruct.create('div', {
            innerHTML: this.message.content,
            style: 'background-color: white; padding: 20px; overflow-y: auto; max-height: 70vh;'
          })
        });

        // Add close button
        var buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '20px';

        var closeButton = document.createElement('button');
        closeButton.innerHTML = "Close";
        closeButton.style.backgroundColor = '#4CAF50';
        closeButton.style.color = 'white';
        closeButton.style.padding = '8px 24px';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';

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
     * Renders a standard user or assistant message
     * - Simply displays markdown content in a styled container
     * - No collapsible functionality
     * @param {HTMLElement} messageDiv - Container to render message into
     */
    renderUserOrAssistantMessage: function(messageDiv) {
      domConstruct.create('div', {
        innerHTML: this.message.content ? this.md.render(this.message.content) : '',
        class: 'markdown-content'
      }, messageDiv);

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
      var copyButton = this.createButton('', 'copy-button');
      var thumbUpButton = this.createButton('', 'thumb-up-button');
      var thumbDownButton = this.createButton('', 'thumb-down-button');

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
    createButton: function(text, additionalClass) {
      var className = 'message-action-button' + (additionalClass ? ' ' + additionalClass : '');

      return domConstruct.create('button', {
        innerHTML: text,
        class: className
      });
    }
  });
});
