/**
 * @module p3/widget/CopilotInput
 * @description A widget that provides a text input interface for the PATRIC Copilot chat system.
 * Includes an auto-expanding textarea and submit button for sending queries to the Copilot API.
 */
define([
    'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'dijit/layout/ContentPane', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic', 'dojo/_base/lang'
  ], function (
    declare, domConstruct, on, ContentPane, Textarea, Button, topic, lang
  ) {
    /**
     * @class CopilotInput
     * @extends {dijit/layout/ContentPane}
     */
    return declare([ContentPane], {
      /** @property {Object} copilotApi - Reference to the CopilotAPI instance */
      copilotApi: null,

      /** @property {boolean} new_chat - Flag indicating if this is a new chat session */
      new_chat: true,

      /** @property {boolean} isSubmitting - Flag indicating if a query is being submitted */
      isSubmitting: false,

      /** @property {string} systemPrompt - The system prompt to use for the chat session */
      systemPrompt: null,

      /**
       * @constructor
       * @param {Object} args - Configuration arguments
       * @description Initializes the widget and mixes in provided options
       */
      constructor: function(args) {
        declare.safeMixin(this, args);
      },

      /**
       * @method postCreate
       * @description Sets up the widget after creation. Creates and configures the textarea and submit button.
       * Handles auto-expansion of textarea and Enter key submission.
       */
      postCreate: function() {
        this.inherited(arguments);

        // Create a wrapper div to center the textarea and button both horizontally and vertically
        var wrapperDiv = domConstruct.create('div', {
          style: 'display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; border: 0;'
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
          onClick: lang.hitch(this, function() {
            if (this.isSubmitting) return;

            if (this.copilotApi) {
              var inputText = this.textArea.get('value');
              var _self = this;

              // If state is provided, add it to the query
              if (this.state) {
                console.log('state', this.state);
              }

              // Disable input while submitting
              this.isSubmitting = true;
              this.submitButton.set('disabled', true);

              // Show loading indicator
              this.displayWidget.showLoadingIndicator(this.chatStore.query());

              // Submit query to API and handle response
              this.copilotApi.submitQuery(inputText, this.sessionId, this.system_prompt).then(lang.hitch(this, function(response) {
                // Add user query and assistant response to chat store
                this.chatStore.addMessages([
                  {
                    role: 'user',
                    content: inputText
                  },
                  {
                    role: 'assistant',
                    content: response.response.content
                  }
                ]);
                _self.textArea.set('value', '');
                this.displayWidget.showMessages(this.chatStore.query());

                // If this was a new chat, trigger session reload
                if (_self.new_chat) {
                  _self.new_chat = false;
                  topic.publish('reloadUserSessions');
                }
              })).finally(lang.hitch(this, function() {
                // Hide loading indicator
                this.displayWidget.hideLoadingIndicator();

                // Re-enable input after response or error
                this.isSubmitting = false;
                this.submitButton.set('disabled', false);
              }));
            } else {
              console.error('CopilotApi widget not initialized');
            }
          })
        });

        // Place the submit button in the wrapper div
        this.submitButton.placeAt(wrapperDiv);

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

      /**
       * @method startNewChat
       * @description Resets the widget state for a new chat session
       */
      startNewChat: function() {
        this.new_chat = true;
        this.textArea.set('value', '');
      },

      /**
       * @method setSessionId
       * @param {string} sessionId - The ID of the current chat session
       * @description Updates the current session identifier
       */
      setSessionId: function(sessionId) {
        this.sessionId = sessionId;
      },

      setSystemPromptWithData: function(data) {
        if (!data || !data.length) {
          this.system_prompt = '';
          return;
        }

        let promptStr = "Use the following information to answer the user's question:\n";
        data.forEach(function(item) {
          promptStr += JSON.stringify(item) + '\n';
        });

        this.system_prompt = promptStr;
      }
    });
  });
