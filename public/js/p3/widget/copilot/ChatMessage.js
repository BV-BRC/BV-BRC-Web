define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'markdown-it/dist/markdown-it.min'
], function (
  declare, domConstruct, on, markdownit
) {
  /**
   * @class ChatMessage
   * @description Handles rendering of individual chat messages
   */
  return declare(null, {
    /** @property {Object} message - The message object to display */
    message: null,

    /** @property {Object} md - Markdown-it instance for rendering markdown */
    md: markdownit(),

    /**
     * @constructor
     * @param {Object} message - The message object to display
     * @param {HTMLElement} container - The container to append the message to
     */
    constructor: function(message, container) {
      this.message = message;
      this.container = container;
      this.renderMessage();
    },

    /**
     * @method renderMessage
     * @description Renders the message in the container
     */
    renderMessage: function() {
      var marginTop = this.container.children.length === 0 ? '20px' : '5px';

      var messageDiv = domConstruct.create('div', {
        class: 'message ' + this.message.role,
        style: 'margin-top: ' + marginTop + ';'
      }, this.container);

      if (this.message.message_id === 'loading-indicator') {
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
     * @method renderSystemMessage
     * @description Renders a system message with toggle functionality
     */
    renderSystemMessage: function(messageDiv) {
      var isExpanded = false;
      var systemContentDiv = domConstruct.create('div', {
        class: 'system-content',
        style: 'max-height: 24px; overflow: hidden; transition: max-height 0.3s ease-out;'
      }, messageDiv);

      var placeholderText = domConstruct.create('div', {
        innerHTML: 'Show the System Message',
        class: 'placeholder-text'
      }, systemContentDiv);

      var markdownContainer = domConstruct.create('div', {
        class: 'markdown-content',
        style: 'display: none;'
      }, systemContentDiv);

      var toggleButton = domConstruct.create('button', {
        innerHTML: 'Show More',
        style: 'display: block; margin-top: 5px; cursor: pointer;'
      }, messageDiv);

      on(toggleButton, 'click', function() {
        if (!isExpanded) {
          systemContentDiv.style.maxHeight = '9999px';
          placeholderText.style.display = 'none';
          markdownContainer.style.display = 'block';
          markdownContainer.innerHTML = this.message.content ? this.md.render(this.message.content) : '';
          toggleButton.innerHTML = 'Show Less';
        } else {
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
     * @method renderUserOrAssistantMessage
     * @description Renders a user or assistant message
     */
    renderUserOrAssistantMessage: function(messageDiv) {
      domConstruct.create('div', {
        innerHTML: this.message.content ? this.md.render(this.message.content) : '',
        class: 'markdown-content'
      }, messageDiv);
    }
  });
});
