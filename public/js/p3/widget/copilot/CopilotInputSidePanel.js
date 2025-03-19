/**
 * @module p3/widget/CopilotInputSidePanel
 * @description A widget that extends CopilotInput to provide a side panel interface for the PATRIC Copilot chat system.
 * Provides a customized input interface with:
 * - Auto-expanding textarea
 * - Submit button
 * - Model and RAG database selection options
 * - Enter key submission handling
 */
define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  './CopilotInput', // Parent class that provides core chat input functionality
  'dojo/_base/lang', // Language utilities like hitch
  'dojo/topic', // Pub/sub messaging
  'dojo/dom-construct', // DOM manipulation utilities
  'dijit/form/Button', // Button widget
  'dijit/form/Textarea', // Textarea widget
  'dojo/on' // Event handling
], function (
  declare,
  CopilotInput,
  lang,
  topic,
  domConstruct,
  Button,
  Textarea,
  on
) {

  /**
   * @class CopilotInputSidePanel
   * @extends {p3/widget/CopilotInput}
   * @description Extends CopilotInput to create a side panel interface for chat input
   */
  return declare([CopilotInput], {

    // CSS class for styling
    baseClass: 'CopilotInputSidePanel',

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     * @description Safely mixes in provided configuration options
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * @description Creates and configures the widget's DOM structure and components
     * Implementation:
     * - Creates flex container layout
     * - Adds auto-expanding textarea
     * - Adds submit button
     * - Creates model/RAG selection UI
     * - Sets up event handlers
     */
    postCreate: function() {
        // Intentionally not calling inherited to override parent completely
        // this.inherited(arguments);

        // Create main wrapper with flex layout
        var wrapperDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Container for input elements with flex layout
        var inputContainer = domConstruct.create('div', {
          style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%;'
        }, wrapperDiv);

        // Configure textarea with auto-expansion and styling
        this.textArea = new Textarea({
          style: 'width: 60%; min-height: 40px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
          rows: 3, // Default visible rows
          maxLength: 10000,
          placeholder: 'Enter your text here...'
        });

        // Add textarea to container
        this.textArea.placeAt(inputContainer);

        // Configure submit button with click handler
        this.submitButton = new Button({
          label: 'Submit',
          style: 'height: 30px; margin-right: 10px;',
          onClick: lang.hitch(this, function() {
            // Prevent multiple simultaneous submissions
            if (this.isSubmitting) return;

            // Handle different submission types based on configuration
            if (this.copilotApi && this.ragDb) {
              this._handleRagSubmit();
            } else if (this.copilotApi) {
              this._handleRegularSubmit();
            } else {
              console.error('CopilotApi widget not initialized');
            }
          })
        });

        // Add button to container
        this.submitButton.placeAt(inputContainer);

        // Create container for model/RAG selection UI
        var settingsDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: row; justify-content: center; margin-top: 10px; cursor: pointer; font-size: 0.9em;'
        }, wrapperDiv);

        // Add model selection text with hover effects
        this.modelText = domConstruct.create('div', {
          innerHTML: 'Model: None',
          style: 'padding: 2px 5px; transition: color 0.2s; margin-right: 10px;',
          onmouseover: function(evt) {
            evt.target.style.color = '#2196F3';
          },
          onmouseout: function(evt) {
            evt.target.style.color = '';
          },
          onclick: lang.hitch(this, function() {
            topic.publish('ragButtonPressed');
          })
        }, settingsDiv);

        // Add RAG selection text with hover effects
        this.ragText = domConstruct.create('div', {
          innerHTML: 'RAG: None',
          style: 'padding: 2px 5px; transition: color 0.2s;',
          onmouseover: function(evt) {
            evt.target.style.color = '#2196F3';
          },
          onmouseout: function(evt) {
            evt.target.style.color = '';
          },
          onclick: lang.hitch(this, function() {
            topic.publish('ragButtonPressed');
          })
        }, settingsDiv);

        // Maximum height for textarea before scrolling
        const maxHeight = 200; // ~9 rows

        // Handle textarea auto-expansion on input
        on(this.textArea, 'input', function() {
          this.textArea.style.height = 'auto'; // Reset height
          this.textArea.style.height = (this.textArea.scrollHeight) + 'px'; // Expand to content

          // Enable scrolling if content exceeds max height
          if (this.textArea.scrollHeight > maxHeight) {
            this.textArea.style.height = maxHeight + 'px';
            this.textArea.style.overflowY = 'auto';
          } else {
            this.textArea.style.overflowY = 'hidden';
          }
        }.bind(this));

        // Handle Enter key for submission (except with Shift)
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
          if (evt.keyCode === 13 && !evt.shiftKey && !this.isSubmitting) {
            evt.preventDefault();
            this.submitButton.onClick();
          }
        }));
    },

    // Widget styling
    style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

    // Size constraints for the widget
    minSize: 40,
    maxSize: 200
  });
});
