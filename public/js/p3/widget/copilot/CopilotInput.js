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

      /** @property {string} model - The model to use for the chat session */
      model: 'llama3.1-70b',

      /** @property {string} ragDb - The RAG database to use for the chat session */
      ragDb: null,


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
          style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Create settings div instead of RAG button
        var settingsDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: column; margin-right: 10px; cursor: pointer; font-size: 0.9em;'
        }, wrapperDiv);

        // Create Model text
        this._createModelText(settingsDiv);

        // Create RAG text
        this._createRagText(settingsDiv);

        // Create Textarea widget
        this.textArea = new Textarea({
          style: 'width: 60%; min-height: 40px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
          rows: 3, // Changed from 1 to 2 rows
          maxLength: 10000,
          placeholder: 'Enter your text here...'
        });

        // Place the textarea in the wrapper div
        this.textArea.placeAt(wrapperDiv);

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

      _createModelText: function(currDiv) {
        this.modelText = domConstruct.create('div', {
          innerHTML: 'Model: None',
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
        }, currDiv);
      },

      _createRagText: function(currDiv) {
        this.ragText = domConstruct.create('div', {
          innerHTML: 'RAG: OFF',
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
        }, currDiv);
      },

      _handleRagSubmit: function() {
        console.log('this.ragDb=', this.ragDb);
        var inputText = this.textArea.get('value');
        var _self = this;

        // TODO: If state is provided, add it to the query: Maybe for assistants
        if (this.state) {
          console.log('state', this.state);
        }

        // Disable input while submitting
        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        // Show loading indicator
        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        // Submit query to API and handle response
        this.copilotApi.submitRagQuery(inputText, 'cancer_papers', this.sessionId, this.model).then(lang.hitch(this, function(response) {

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
            topic.publish('generateSessionTitle');
          }
        })).finally(lang.hitch(this, function() {
          // Hide loading indicator
          this.displayWidget.hideLoadingIndicator();

          // Re-enable input after response or error
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      _handleRegularSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;
        // TODO: If state is provided, add it to the query: Maybe for assistants
        if (this.state) {
          console.log('state', this.state);
        }

        // Disable input while submitting
        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        // Show loading indicator
        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        // Submit query to API and handle response
        // previous conversation is added server side
        this.copilotApi.submitQuery(inputText, this.sessionId, this.systemPrompt, this.model).then(lang.hitch(this, function(response) {
          // Add user query and assistant response to chat store
          this.chatStore.addMessages([
            {
              role: 'user',
              content: inputText
            },
            {
              role: 'assistant',
              content: response.response
            }
          ]);
          _self.textArea.set('value', '');
          this.displayWidget.showMessages(this.chatStore.query());

          // If this was a new chat, trigger session reload
          if (_self.new_chat) {
            _self.new_chat = false;
            topic.publish('reloadUserSessions');
            topic.publish('generateSessionTitle');
          }
        })).finally(lang.hitch(this, function() {
          // Hide loading indicator
          this.displayWidget.hideLoadingIndicator();

          // Re-enable input after response or error
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
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
          this.systemPrompt = '';
          return;
        }

        let promptStr = "Use the following information to answer the user's question:\n";
        data.forEach(function(item) {
          promptStr += JSON.stringify(item) + '\n';
        });

        this.systemPrompt = promptStr;
      },

      setSystemPrompt: function(systemPrompt) {
        this.systemPrompt = systemPrompt;
      },

      setModel: function(model) {
        console.log('setModel=', model);
        this.model = model;
        this.setModelText(model);
      },

      getModel: function() {
        return this.model;
      },

      setRagDb: function(ragDb) {
        console.log('setRagDb=', ragDb);
        if (ragDb == 'null') {
          this.ragDb = null;
        } else {
          this.ragDb = ragDb;
        }
        this.setRagButtonLabel(ragDb);
      },

      setRagButtonLabel: function(ragDb) {
        if (ragDb && ragDb !== 'null') {
          this.ragText.innerHTML = 'RAG: ' + ragDb;
        } else {
          this.ragText.innerHTML = 'RAG: OFF';
        }
      },

      setModelText: function(model) {
        if (model) {
          this.modelText.innerHTML = 'Model: ' + model;
        } else {
          this.modelText.innerHTML = 'Model: None';
        }
      }
    });
  });
