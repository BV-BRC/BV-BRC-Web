/**
 * @module p3/widget/CopilotInputSidePanel
 * @description A widget that extends CopilotInput to provide a side panel interface for the PATRIC Copilot chat system.
 */
define([
  'dojo/_base/declare',
  './CopilotInput',
  'dojo/_base/lang',
  'dojo/topic',
  'dojo/dom-construct',
  'dijit/form/Button',
  'dijit/form/Textarea',
  'dojo/on'
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
   */
  return declare([CopilotInput], {

    baseClass: 'CopilotInputSidePanel',

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * @description Overrides parent postCreate to customize styling for side panel
     */
    postCreate: function() {
        // this.inherited(arguments);

        // Create a wrapper div to center the textarea and button both horizontally and vertically
        var wrapperDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Create input container for textarea and submit button
        var inputContainer = domConstruct.create('div', {
          style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%;'
        }, wrapperDiv);

        // Create Textarea widget
        this.textArea = new Textarea({
          style: 'width: 60%; min-height: 40px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
          rows: 3, // Changed from 1 to 2 rows
          maxLength: 10000,
          placeholder: 'Enter your text here...'
        });

        // Place the textarea in the input container
        this.textArea.placeAt(inputContainer);

        // Create Submit button
        this.submitButton = new Button({
          label: 'Submit',
          style: 'height: 30px; margin-right: 10px;',
          onClick: lang.hitch(this, function() {
            if (this.isSubmitting) return;

            if (this.copilotApi && this.ragDb) {
              this._handleRagSubmit();
            } else if (this.copilotApi) {
              this._handleRegularSubmit();
            } else {
              console.error('CopilotApi widget not initialized');
            }
          })
        });

        // Place the submit button in the input container
        this.submitButton.placeAt(inputContainer);

        // Create settings div below textarea
        var settingsDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: row; justify-content: center; margin-top: 10px; cursor: pointer; font-size: 0.9em;'
        }, wrapperDiv);

        // Create Model text
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

        // Create RAG text
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

        const maxHeight = 200; // Maximum height for textarea (approximately 9 rows)

        // Handle textarea auto-expansion
        on(this.textArea, 'input', function() {
          this.textArea.style.height = 'auto'; // Reset height to shrink when content is removed
          this.textArea.style.height = (this.textArea.scrollHeight) + 'px'; // Set height based on content

          // Enable scrolling if content exceeds max height
          if (this.textArea.scrollHeight > maxHeight) {
            this.textArea.style.height = maxHeight + 'px'; // Cap the height at 9 rows
            this.textArea.style.overflowY = 'auto'; // Enable scrolling after reaching 9 rows
          } else {
            this.textArea.style.overflowY = 'hidden'; // Hide scroll bar until max height is reached
          }
        }.bind(this));

        // Handle Enter key press for submission
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
          if (evt.keyCode === 13 && !evt.shiftKey && !this.isSubmitting) {
            evt.preventDefault();
            this.submitButton.onClick();
          }
        }));
    },

    // Override any CopilotInput properties or methods here
    // For example:
    style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',
    minSize: 40,
    maxSize: 200
  });
});
