define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'markdown-it/dist/markdown-it.min' // Markdown parser and renderer
], function (
  declare, domConstruct, on, markdownit
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

      // Render appropriate message type
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
      var isExpanded = false;

      // Create collapsible content container
      var systemContentDiv = domConstruct.create('div', {
        class: 'system-content',
        style: 'max-height: 24px; overflow: hidden; transition: max-height 0.3s ease-out;'
      }, messageDiv);

      // Add placeholder text shown when collapsed
      var placeholderText = domConstruct.create('div', {
        innerHTML: 'Show the System Message',
        class: 'placeholder-text'
      }, systemContentDiv);

      // Container for markdown content (initially hidden)
      var markdownContainer = domConstruct.create('div', {
        class: 'markdown-content',
        style: 'display: none;'
      }, systemContentDiv);

      // Toggle button for expand/collapse
      var toggleButton = domConstruct.create('button', {
        innerHTML: 'Show More',
        style: 'display: block; margin-top: 5px; cursor: pointer;'
      }, messageDiv);

      // Handle toggle button clicks
      on(toggleButton, 'click', function() {
        if (!isExpanded) {
          // Expand content
          systemContentDiv.style.maxHeight = '9999px';
          placeholderText.style.display = 'none';
          markdownContainer.style.display = 'block';
          markdownContainer.innerHTML = this.message.content ? this.md.render(this.message.content) : '';
          toggleButton.innerHTML = 'Show Less';
        } else {
          // Collapse content
          systemContentDiv.style.maxHeight = '24px';
          placeholderText.style.display = 'block';
          markdownContainer.style.display = 'none';
          markdownContainer.innerHTML = '';
          toggleButton.innerHTML = 'Show More';
        }
        isExpanded = !isExpanded;
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
    }
  });
});
