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
    'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'dijit/layout/ContentPane', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic', 'dojo/_base/lang', 'html2canvas/dist/html2canvas.min'
  ], function (
    declare, domConstruct, on, ContentPane, Textarea, Button, topic, lang, html2canvas
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
      model: null,

      /** Selected RAG database for enhanced responses */
      ragDb: 'bvbrc_helpdesk',

      statePrompt: null,

      /** Number of documents to use for RAG queries */
      numDocs: 3,

      // Widget styling
      style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

      // Size constraints for the widget
      minSize: 40,
      maxSize: 200,

      // Flag to track page content toggle state
      pageContentEnabled: false,

      enhancedPrompt: null,

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
       * - Creates flex container layout
       * - Adds auto-expanding textarea
       * - Adds submit button
       * - Creates model/RAG selection UI
       * - Sets up event handlers
       */
      postCreate: function() {
        // Create main wrapper with flex layout
        var wrapperDiv = domConstruct.create('div', {
            style: 'display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Container for input elements with flex layout
        var inputContainer = domConstruct.create('div', {
            style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%;'
        }, wrapperDiv);

        // Add container for the toggle switch and label on the left side
        var toggleContainer = domConstruct.create('div', {
            style: 'width: auto; height: 35px; display: flex; flex-direction: column; align-items: center; margin-right: 15px;'
        }, inputContainer);

        // Create screenshot div above the toggle button
        var screenshotDiv = domConstruct.create('div', {
            'class': 'screenshotDivAboveToggle',
            innerHTML: 'Include<br>Screenshot'
        });

        // Create the page content toggle using the screenshot div
        this.pageContentToggle = {
            domNode: screenshotDiv,
            placeAt: function(container) {
                container.appendChild(screenshotDiv);
            }
        };

        // Add click handler and properties to screenshot div
        screenshotDiv.title = 'Sends a screenshot of the current BV-BRC page to help answer your question.';
        screenshotDiv.style.cursor = 'pointer';
        on(screenshotDiv, 'click', lang.hitch(this, function() {
            topic.publish('pageContentToggleChanged', !this.pageContentEnabled);
        }));

        this.pageContentToggle.placeAt(toggleContainer);

        // Initialize button style
        this._updateToggleButtonStyle();

        // Configure textarea with auto-expansion and styling
        this.textArea = new Textarea({
            style: 'width: 60%; min-height: 50px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
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
            if (this.pageContentEnabled) {
                this._handlePageSubmit();
            } else if (this.copilotApi && this.ragDb) {
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

        // Subscribe to page content toggle changes from ChatSessionOptionsBar
        topic.subscribe('pageContentToggleChanged', lang.hitch(this, function(checked) {
            this.pageContentEnabled = checked;
            this._updateToggleButtonStyle();
            console.log('Page content toggle changed to:', checked);
        }));

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

        topic.subscribe('enhancePromptChange', lang.hitch(this, function(enhancedPrompt) {
          this.enhancedPrompt = enhancedPrompt;
        }));

        // Subscribe to main chat suggestion selection to populate input text area
        topic.subscribe('populateInputSuggestion', lang.hitch(this, function(suggestion) {
          if (this.textArea) {
            this.textArea.set('value', suggestion);
            // Focus on the text area and place cursor at the end
            this.textArea.focus();
            if (this.textArea.textbox) {
              var textbox = this.textArea.textbox;
              textbox.selectionStart = textbox.selectionEnd = suggestion.length;
            }
          }
        }));
      },

      /**
       * Handles submission of RAG queries with document retrieval
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Disables input during submission
       * - Shows loading indicator
       * - Retrieves documents via RAG API
       * - Builds system prompt with document context
       * - Makes follow-up LLM query with enhanced context
       * - Updates chat store with assistant/system messages only
       */
      _handleRagSubmit: function() {
        console.log('this.ragDb=', this.ragDb);
        var inputText = this.textArea.get('value');
        var _self = this;

        if (this.state) {
          console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = {
          role: 'user',
          content: inputText,
          message_id: 'user_' + Date.now(),
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\n\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }

        this.copilotApi.submitCopilotQuery(inputText, this.sessionId, systemPrompt, this.model, true, this.ragDb, this.numDocs, null, this.enhancedPrompt).then(lang.hitch(this, function(response) {
          // Only add assistant message and system message (if present) - user message was already added
          var messagesToAdd = [];
          if (response.systemMessage) {
            messagesToAdd.push(response.systemMessage);
          }
          if (response.assistantMessage) {
            messagesToAdd.push(response.assistantMessage);
          }

          if (messagesToAdd.length > 0) {
            this.chatStore.addMessages(messagesToAdd);
          }

          this.displayWidget.showMessages(this.chatStore.query());

          if (_self.new_chat) {
            _self._finishNewChat();
          }
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      /**
       * Handles submission of regular (non-RAG) queries
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Disables input during submission
       * - Shows loading indicator
       * - Makes LLM query with basic system prompt
       * - Updates chat store with assistant/system messages only
       * - Handles new chat initialization
       */
      _handleRegularSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;
        if (this.state) {
          console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = {
          role: 'user',
          content: inputText,
          message_id: 'user_' + Date.now(),
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\n\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }

        this.copilotApi.submitCopilotQuery(inputText, this.sessionId, systemPrompt, this.model, true, null, null).then(lang.hitch(this, function(response) {
          // Only add assistant message and system message (if present) - user message was already added
          var messagesToAdd = [];
          if (response.systemMessage) {
            messagesToAdd.push(response.systemMessage);
          }
          if (response.assistantMessage) {
            messagesToAdd.push(response.assistantMessage);
          }

          if (messagesToAdd.length > 0) {
            this.chatStore.addMessages(messagesToAdd);
          }

          this.displayWidget.showMessages(this.chatStore.query());

          if (_self.new_chat) {
            _self._finishNewChat();
          }
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
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
       * Returns currently selected model
       */
      getModel: function() {
        return this.model;
      },

      /**
       * Updates selected model and UI
       */
      setModel: function(model) {
        this.model = model;
      },


      /**
       * Updates selected RAG database and UI
       */
      setRagDb: function(ragDb) {
        if (ragDb == 'null') {
          this.ragDb = null;
        } else {
          this.ragDb = ragDb;
        }
      },

      /**
       * Updates RAG selection UI text
       */
      setRagButtonLabel: function(ragDb) {
        if (!this.ragText) {
          return;
        }
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
        if (!this.modelText) {
          return;
        }
        if (model) {
          model = model.split('/').reverse()[0];
          if (model.length > 30) {
            model = model.substring(0, 30) + '...';
          }
          this.modelText.innerHTML = 'Model: ' + model;
        } else {
          this.modelText.innerHTML = 'Model: None';
        }
      },

      /**
       * Updates the number of documents to use for RAG queries
       */
      setNumDocs: function(numDocs) {
        this.numDocs = numDocs;
      },

      setStatePrompt: function(statePrompt) {
        this.statePrompt = statePrompt;
      },

      /**
       * Finalizes creation of a brand-new chat after the first successful response.
       * Adds the session to the global sessions memory store, publishes reload event,
       * then triggers title generation.
       * @param {boolean} generateTitleImmediately – if false, skip title generation (default true)
       */
      _finishNewChat: function(generateTitleImmediately = true) {
        this.new_chat = false;

        // Add to global sessions store
        if (window && window.App && window.App.chatSessionsStore) {
          window.App.chatSessionsStore.addSession({
            session_id: this.sessionId,
            title: 'New Chat',
            created_at: Date.now()
          });
        }

        // Reload scroll bar and highlight
        topic.publish('reloadUserSessions', { highlightSessionId: this.sessionId });

        if (generateTitleImmediately) {
          setTimeout(function() {
            topic.publish('generateSessionTitle');
          }, 100);
        }
      },

      /**
       * @method _handlePageSubmit
       * @description Handles submission about the current page (screenshot first, HTML fallback)
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Takes screenshot and makes API call
       * - Updates chat store with assistant/system messages only
       **/
      _handlePageSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;

        if (this.state) {
            console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = {
          role: 'user',
          content: inputText,
          message_id: 'user_' + Date.now(),
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        topic.publish('hideChatPanel'); // Hide panel before taking screenshot

        html2canvas(document.body).then(lang.hitch(this, function(canvas) {
          var base64Image = canvas.toDataURL('image/png');

          topic.publish('showChatPanel'); // Show panel again

          this.displayWidget.showLoadingIndicator(this.chatStore.query());
          var imageSystemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center. You can also answer questions about the attached screenshot.\n' +
          'Analyze the screenshot and respond to the user\'s query.';

          if (this.systemPrompt) {
              imageSystemPrompt += '\n\n' + this.systemPrompt;
          }
          if (this.statePrompt) {
              imageSystemPrompt = imageSystemPrompt + '\n\n' + this.statePrompt;
          }

          var imgtxt_model = 'RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16';

          this.copilotApi.submitCopilotQuery(inputText, this.sessionId, imageSystemPrompt, imgtxt_model, true, this.ragDb, this.numDocs, base64Image, this.enhancedPrompt)
              .then(lang.hitch(this, function(response) {
                  // Only add assistant message and system message (if present) - user message was already added
                  var messagesToAdd = [];
                  if (response.systemMessage) {
                      messagesToAdd.push(response.systemMessage);
                  }
                  if (response.assistantMessage) {
                      messagesToAdd.push(response.assistantMessage);
                  }

                  if (messagesToAdd.length > 0) {
                      this.chatStore.addMessages(messagesToAdd);
                  }

                  this.displayWidget.showMessages(this.chatStore.query());

                  if (_self.new_chat) {
                      _self._finishNewChat();
                  }
              })).catch(function(error) {
                  topic.publish('CopilotApiError', { error: error });
              }).finally(lang.hitch(this, function() {
                  this.displayWidget.hideLoadingIndicator();
                  this.isSubmitting = false;
                  this.submitButton.set('disabled', false);

                  // Deselect the pageContentToggle after submission
                  this.pageContentEnabled = false;
                  this._updateToggleButtonStyle();
                  topic.publish('pageContentToggleChanged', false);
              }));
      })).catch(lang.hitch(this, function(error) {
          console.error('Error capturing or processing screenshot:', error);
          topic.publish('showChatPanel'); // Ensure panel is shown even on error

          // Fall back to HTML content if screenshot fails
          console.log('Falling back to HTML content');
          this._handlePageContentSubmit();
      }));
    },

    /**
     * @method _handlePageContentSubmit
     * @description Handles submission of page content (HTML)
     * Used as a fallback when screenshot fails
     * Implementation:
     * - Immediately shows user message and clears text area
     * - Makes API call with page content
     * - Updates chat store with assistant/system messages only
     **/
    _handlePageContentSubmit: function() {
      var inputText = this.textArea.get('value');
      var _self = this;

      // Immediately show user message and clear text area
      var userMessage = {
        role: 'user',
        content: inputText,
        message_id: 'user_' + Date.now(),
        timestamp: new Date().toISOString()
      };

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');

      const pageHtml = document.documentElement.innerHTML;

      var imageSystemPrompt = 'You are a helpful assistant that can answer questions about the page content.\n' +
          'Answer questions as if you were a user viewing the page.\n' +
          'The page content is:\n' +
          pageHtml;
      if (this.systemPrompt) {
          imageSystemPrompt += '\n' + this.systemPrompt;
      }
      if (this.statePrompt) {
        imageSystemPrompt = this.statePrompt + '\n\n' + imageSystemPrompt;
      }

      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      this.copilotApi.submitCopilotQuery(inputText, this.sessionId, this.systemPrompt, this.model, true, this.ragDb, this.numDocs, null, this.enhancedPrompt).then(lang.hitch(this, function(response) {
          // Only add assistant message and system message (if present) - user message was already added
          var messagesToAdd = [];
          if (response.systemMessage) {
              messagesToAdd.push(response.systemMessage);
          }
          if (response.assistantMessage) {
              messagesToAdd.push(response.assistantMessage);
          }

          if (messagesToAdd.length > 0) {
              this.chatStore.addMessages(messagesToAdd);
          }

          this.displayWidget.showMessages(this.chatStore.query());

          if (_self.new_chat) {
              _self._finishNewChat();
          }
      })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
      }).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);

          // Deselect the pageContentToggle after submission
          this.pageContentEnabled = false;
          this._updateToggleButtonStyle();
          topic.publish('pageContentToggleChanged', false);
      }));
    },

    /**
       * @method _updateToggleButtonStyle
       * @description Updates the toggle button's visual state based on pageContentEnabled
       */
    _updateToggleButtonStyle: function() {
      var buttonNode = this.pageContentToggle.domNode;
      if (this.pageContentEnabled) {
          buttonNode.classList.remove('pageContentToggleInactive');
          buttonNode.classList.add('pageContentToggleActive');
      } else {
          buttonNode.classList.remove('pageContentToggleActive');
          buttonNode.classList.add('pageContentToggleInactive');
      }
    }
  });
});
