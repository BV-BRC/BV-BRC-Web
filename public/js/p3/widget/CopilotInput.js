define([
    'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'dijit/layout/ContentPane', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic', 'dojo/_base/lang'
  ], function (
    declare, domConstruct, on, ContentPane, Textarea, Button, topic, lang
  ) {
    return declare([ContentPane], {
      copilotApi: null,

      constructor: function(args) {
        declare.safeMixin(this, args);
      },

      postCreate: function() {
        this.inherited(arguments);

        // Create a wrapper div to center the textarea and button both horizontally and vertically
        var wrapperDiv = domConstruct.create('div', {
          style: 'display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; border: 2px solid green;'
        }, this.containerNode);

        // Create Textarea widget
        this.textArea = new Textarea({
          style: 'width: 60%; min-height: 10px; max-height: 200px; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
          rows: 1, // Start with 1 row
          maxLength: 10000,
          placeholder: 'Enter your text here...'
        });

        // Place the textarea in the wrapper div
        this.textArea.placeAt(wrapperDiv);

        // Create Submit button
        this.submitButton = new Button({
          label: 'Submit',
          style: 'height: 30px; align-self: center;', // Added align-self: center to vertically center the button
          onClick: function() {
            if (this.copilotApi) {
              var inputText = this.textArea.get('value');
              var _self = this;
              this.copilotApi.submitQuery(inputText).then(function(response) {
                // Publish the query data to the 'query' topic
                topic.publish('CopilotApi', {
                  input: inputText,
                  response: response
                });
                _self.textArea.set('value', '');
              });
            } else {
              console.error('CopilotApi widget not initialized');
            }
          }.bind(this)
        });

        // Place the submit button in the wrapper div
        this.submitButton.placeAt(wrapperDiv);

        const maxHeight = 200; // Approximate height for 9 rows (can be adjusted as needed)

        // Adjust height based on content
        on(this.textArea, 'input', function() {
          this.textArea.style.height = 'auto'; // Reset height to shrink when content is removed
          this.textArea.style.height = (this.textArea.scrollHeight) + 'px'; // Set the height based on the content

          // Limit to maximum height for 9 rows and enable scrolling
          if (this.textArea.scrollHeight > maxHeight) {
            this.textArea.style.height = maxHeight + 'px'; // Cap the height at 9 rows
            this.textArea.style.overflowY = 'auto'; // Enable scrolling after reaching 9 rows
          } else {
            this.textArea.style.overflowY = 'hidden'; // Hide scroll bar until max height is reached
          }
        }.bind(this));

        // Handle Enter key press
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
          // Check if Enter was pressed without Shift key
          if (evt.keyCode === 13 && !evt.shiftKey) {
            evt.preventDefault(); // Prevent default Enter behavior
            this.submitButton.onClick(); // Trigger the submit button's click handler
          }
        }));
      }
    });
  });
