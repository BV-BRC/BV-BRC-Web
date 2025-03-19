/**
 * @module p3/widget/CopilotInput
 * @description A widget that provides a text input interface for the PATRIC Copilot chat system.
 * Includes an auto-expanding textarea and submit button for sending queries to the Copilot API.
 *
 * Implementation:
 * - Extends ContentPane to provide base widget functionality
 * - Creates a textarea and submit button interface
 * - Handles auto-expansion of textarea based on content
 * - Manages submission of both regular and RAG-enhanced queries
 * - Maintains chat session state and history
 * - Provides model and RAG database selection UI
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
      /** Reference to the CopilotAPI instance for making backend requests */
      copilotApi: null,

      /** Flag indicating if this is a new chat session that needs initialization */
      new_chat: true,

      /** Flag to prevent multiple simultaneous submissions */
      isSubmitting: false,

      /** Custom system prompt to prepend to queries */
      systemPrompt: null,

      /** Selected language model for chat completion */
      model: 'llama3.1-70b',

      /** Selected RAG database for enhanced responses */
      ragDb: null,

      /**
       * Constructor that initializes the widget with provided options
       * Uses safeMixin to safely merge configuration arguments
       */
      constructor: function(args) {
        declare.safeMixin(this, args);
      },

      /**
       * Sets up the widget UI after DOM creation
       * Implementation:
       * - Creates centered wrapper div for components
       * - Adds settings panel with model/RAG selection
       * - Creates auto-expanding textarea with max height
       * - Adds submit button with loading state
       * - Sets up event handlers for submission
       */
      postCreate: function() {
        this.inherited(arguments);

        // Create centered wrapper div
        var wrapperDiv = domConstruct.create('div', {
          style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Create settings panel
        var settingsDiv = domConstruct.create('div', {
          style: 'display: flex; flex-direction: column; margin-right: 10px; cursor: pointer; font-size: 0.9em;'
        }, wrapperDiv);

        // Add model selector
        this._createModelText(settingsDiv);

        // Add RAG database selector
        this._createRagText(settingsDiv);

        // Create expandable textarea
        this.textArea = new Textarea({
          style: 'width: 60%; min-height: 40px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
          rows: 3,
          maxLength: 10000,
          placeholder: 'Enter your text here...'
        });
        this.textArea.placeAt(wrapperDiv);

        // Create submit button
        this.submitButton = new Button({
          label: 'Submit',
          style: 'height: 30px; margin-right: 10px;',
          onClick: lang.hitch(this, function() {
            if (this.isSubmitting) return;

            // Handle submission based on RAG status
            if (this.copilotApi && this.ragDb) {
              this._handleRagSubmit();
            } else if (this.copilotApi) {
              this._handleRegularSubmit();
            } else {
              console.error('CopilotApi widget not initialized');
            }
          })
        });
        this.submitButton.placeAt(wrapperDiv);

        // Configure textarea auto-expansion
        const maxHeight = 200; // Max height ~9 rows

        // Handle textarea resizing
        on(this.textArea, 'input', function() {
          this.textArea.style.height = 'auto';
          this.textArea.style.height = (this.textArea.scrollHeight) + 'px';

          if (this.textArea.scrollHeight > maxHeight) {
            this.textArea.style.height = maxHeight + 'px';
            this.textArea.style.overflowY = 'auto';
          } else {
            this.textArea.style.overflowY = 'hidden';
          }
        }.bind(this));

        // Handle Enter key submission
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
          if (evt.keyCode === 13 && !evt.shiftKey && !this.isSubmitting) {
            evt.preventDefault();
            this.submitButton.onClick();
          }
        }));
      },

      /**
       * Creates the model selection text element
       * Implementation:
       * - Adds hoverable/clickable div showing current model
       * - Triggers model selection dialog on click
       */
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

      /**
       * Creates the RAG database selection text element
       * Implementation:
       * - Adds hoverable/clickable div showing current RAG DB
       * - Triggers RAG selection dialog on click
       */
      _createRagText: function(currDiv) {
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
        }, currDiv);
      },

      /**
       * Handles submission of RAG-enhanced queries
       * Implementation:
       * - Disables input during submission
       * - Shows loading indicator
       * - Makes RAG query to get relevant documents
       * - Uses documents to build system prompt
       * - Makes LLM query with enhanced prompt
       * - Updates chat store with messages
       * - Handles new chat initialization
       */
      _handleRagSubmit: function() {
        console.log('this.ragDb=', this.ragDb);
        var inputText = this.textArea.get('value');
        var _self = this;

        if (this.state) {
          console.log('state', this.state);
        }

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        this.copilotApi.submitRagQuery(inputText, this.ragDb, this.sessionId, this.model).then(lang.hitch(this, function(response) {
          var system_prompt = 'Using the following documents as context, answer the user questions. Do not use any other sources of information:\n\n';
          if (this.systemPrompt && this.systemPrompt.length > 1) {
            system_prompt = this.systemPrompt + '\n\n' + system_prompt;
          }
          response['documents'][0].forEach(function(doc) {
            system_prompt += doc + '\n';
          });

          this.copilotApi.submitQuery(inputText, this.sessionId, system_prompt, this.model).then(lang.hitch(this, function(llm_response) {

            this.chatStore.addMessages([
              {
                role: 'user',
                content: inputText
              },
              {
                role: 'system',
                content: system_prompt
              },
              {
                role: 'assistant',
                content: llm_response.response
              }
            ]);
            _self.textArea.set('value', '');
            this.displayWidget.showMessages(this.chatStore.query());

            if (_self.new_chat) {
              _self.new_chat = false;
              topic.publish('reloadUserSessions');
              topic.publish('generateSessionTitle');
            }
          }));
        })).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      /**
       * Handles submission of regular (non-RAG) queries
       * Implementation:
       * - Disables input during submission
       * - Shows loading indicator
       * - Makes LLM query with basic system prompt
       * - Updates chat store with messages
       * - Handles new chat initialization
       */
      _handleRegularSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;

        if (this.state) {
          console.log('state', this.state);
        }

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        this.copilotApi.submitQuery(inputText, this.sessionId, this.systemPrompt, this.model).then(lang.hitch(this, function(response) {
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

          if (_self.new_chat) {
            _self.new_chat = false;
            topic.publish('reloadUserSessions');
            topic.publish('generateSessionTitle');
          }
        })).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      /**
       * Resets widget state for new chat session
       * Clears textarea and sets new chat flag
       */
      startNewChat: function() {
        this.new_chat = true;
        this.textArea.set('value', '');
      },

      /**
       * Updates the current session identifier
       * @param {string} sessionId - New session ID
       */
      setSessionId: function(sessionId) {
        this.sessionId = sessionId;
      },

      /**
       * Sets system prompt from structured data
       * Implementation:
       * - Takes array of data objects
       * - Builds prompt string with JSON stringified data
       * - Sets as system prompt
       */
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

      /**
       * Sets raw system prompt string
       */
      setSystemPrompt: function(systemPrompt) {
        this.systemPrompt = systemPrompt;
      },

      /**
       * Updates selected model and UI
       */
      setModel: function(model) {
        console.log('setModel=', model);
        this.model = model;
        this.setModelText(model);
      },

      /**
       * Returns currently selected model
       */
      getModel: function() {
        return this.model;
      },

      /**
       * Updates selected RAG database and UI
       */
      setRagDb: function(ragDb) {
        console.log('setRagDb=', ragDb);
        if (ragDb == 'null') {
          this.ragDb = null;
        } else {
          this.ragDb = ragDb;
        }
        this.setRagButtonLabel(ragDb);
      },

      /**
       * Updates RAG selection UI text
       */
      setRagButtonLabel: function(ragDb) {
        if (ragDb && ragDb !== 'null') {
          this.ragText.innerHTML = 'RAG: ' + ragDb;
        } else {
          this.ragText.innerHTML = 'RAG: None';
        }
      },

      /**
       * Updates model selection UI text
       */
      setModelText: function(model) {
        if (model) {
          this.modelText.innerHTML = 'Model: ' + model;
        } else {
          this.modelText.innerHTML = 'Model: None';
        }
      }
    });
  });
