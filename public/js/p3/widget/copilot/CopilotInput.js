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
      //================================================================
      // WIDGET CONFIGURATION & STATE PROPERTIES
      //================================================================

      /** Widget styling */
      style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

      /** Size constraints for the widget */
      minSize: 40,
      maxSize: 200,

      //================================================================
      // COPILOT API & SESSION PROPERTIES
      //================================================================

      /** Reference to the CopilotAPI instance for making backend requests */
      copilotApi: null,

      /** Flag indicating if this is a new chat session that needs initialization */
      new_chat: true,

      /** Flag to prevent multiple simultaneous submissions */
      isSubmitting: false,

      //================================================================
      // PROMPT & MODEL CONFIGURATION
      //================================================================

      /** Custom system prompt to prepend to queries */
      systemPrompt: null,

      /** State-specific prompt context */
      statePrompt: null,

      /** Enhanced prompt for advanced query processing */
      enhancedPrompt: null,

      /** Selected language model for chat completion */
      model: null,

      /** Selected RAG database for enhanced responses */
      ragDb: 'bvbrc_helpdesk',

      /** Number of documents to use for RAG queries */
      numDocs: 3,

      //================================================================
      // UI STATE PROPERTIES
      //================================================================

      /** Flag to track page content toggle state */
      pageContentEnabled: false,

      //================================================================
      // LIFECYCLE METHODS
      //================================================================

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
                // If currently streaming, stop the stream
                if (this.isSubmitting) {
                    this._stopStream();
                    return;
                }

                // Prevent multiple simultaneous submissions
                if (this.isSubmitting) return;

                // Handle different submission types based on configuration
                if (this.pageContentEnabled) {
                    this._handlePageSubmitStream();
                } else if (this.copilotApi && this.ragDb) {
                    this._handleRagSubmitStream();
                    // this._handleRagSubmit();
                } else if (this.copilotApi) {
                    this._handleRegularSubmitStream();
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

      //================================================================
      // SUBMISSION HANDLER METHODS
      //================================================================

      /**
       * Stops the current streaming request and resets the UI
       */
      _stopStream: function() {
          if (this.copilotApi && this.copilotApi.stopCurrentStream()) {
              console.log('Stream stopped by user');
          }

          // Reset UI state
          this.isSubmitting = false;
          this.submitButton.set('label', 'Submit');
          this.submitButton.set('disabled', false);
          this.displayWidget.hideLoadingIndicator();
      },

      /**
       * Updates the submit button to show "Stop" during streaming
       */
      _setButtonToStop: function() {
          this.submitButton.set('label', 'Stop');
          this.submitButton.set('disabled', false); // Keep enabled so user can stop
      },

      /**
       * Updates the submit button to show "Submit" when not streaming
       */
      _setButtonToSubmit: function() {
          this.submitButton.set('label', 'Submit');
          this.submitButton.set('disabled', false);
      },

      /**
       * Handles streaming submission of RAG queries with document retrieval
       */
      _handleRagSubmitStream: function() {
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
          message_id: null,
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this._setButtonToStop();
        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\\n\\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }

        // Create messages for streaming
        let systemMessage = {
            role: 'system',
            message_id: null,
            content: '',
            copilotDetails: null,
            ragDocs: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(systemMessage);

        let assistantMessage = {
            role: 'assistant',
            content: '',
            message_id: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(assistantMessage);

        const params = {
          inputText: inputText,
          sessionId: this.sessionId,
          systemPrompt: systemPrompt,
          model: this.model,
          save_chat: true,
          ragDb: this.ragDb,
          numDocs: this.numDocs,
          enhancedPrompt: this.enhancedPrompt
        };

        this.copilotApi.submitCopilotQueryStream(params,
            (chunk) => {
                assistantMessage.content += chunk;
                this.displayWidget.hideLoadingIndicator();
                this.displayWidget.showMessages(this.chatStore.query());
            },
            () => {
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                this.isSubmitting = false;
                this._setButtonToSubmit();
            },
            (error) => {
                topic.publish('CopilotApiError', { error: error });
                this.displayWidget.hideLoadingIndicator();
                this.isSubmitting = false;
                this._setButtonToSubmit();
            },
            (setupMetadata) => {
              if (setupMetadata) {
                if (setupMetadata.assistantMessage && setupMetadata.assistantMessage.message_id) {
                  assistantMessage.message_id = setupMetadata.assistantMessage.message_id;
                }
                if (setupMetadata.userMessage && setupMetadata.userMessage.message_id) {
                  userMessage.message_id = setupMetadata.userMessage.message_id;
                }
                if (setupMetadata.systemMessage) {
                  systemMessage.message_id = setupMetadata.systemMessage.message_id;
                  systemMessage.content = setupMetadata.systemMessage.content || '';
                  systemMessage.copilotDetails = setupMetadata.copilot_details;
                  systemMessage.documents = setupMetadata.rag_docs;
                  systemMessage.timestamp = setupMetadata.systemMessage.timestamp || new Date().toISOString();
                } else if (setupMetadata.copilot_details) {
                  assistantMessage.copilotDetails = setupMetadata.copilot_details;
                }
                this.displayWidget.showMessages(this.chatStore.query());
              }
            }
        );
      },

      /**
       * Handles streaming submission of regular (non-RAG) queries
       */
      _handleRegularSubmitStream: function() {
        var inputText = this.textArea.get('value');
        var _self = this;

        // Immediately show user message and clear text area
        var userMessage = {
          role: 'user',
          content: inputText,
          message_id: null,
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this._setButtonToStop();
        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\\n\\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }

        // Create messages for streaming
        let systemMessage = {
            role: 'system',
            message_id: null,
            content: '',
            copilotDetails: null,
            ragDocs: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(systemMessage);

        let assistantMessage = {
            role: 'assistant',
            content: '',
            message_id: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(assistantMessage);

        const params = {
            inputText: inputText,
            sessionId: this.sessionId,
            systemPrompt: systemPrompt,
            model: this.model,
            save_chat: true
        };

        this.copilotApi.submitCopilotQueryStream(params,
            (chunk) => {
                assistantMessage.content += chunk;
                this.displayWidget.hideLoadingIndicator();
                this.displayWidget.showMessages(this.chatStore.query());
            },
            () => {
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                this.isSubmitting = false;
                this._setButtonToSubmit();
            },
            (error) => {
                topic.publish('CopilotApiError', { error: error });
                this.displayWidget.hideLoadingIndicator();
                this.isSubmitting = false;
                this._setButtonToSubmit();
            },
            (setupMetadata) => {
              if (setupMetadata) {
                if (setupMetadata.assistantMessage && setupMetadata.assistantMessage.message_id) {
                  assistantMessage.message_id = setupMetadata.assistantMessage.message_id;
                }
                if (setupMetadata.userMessage && setupMetadata.userMessage.message_id) {
                  userMessage.message_id = setupMetadata.userMessage.message_id;
                }
                if (setupMetadata.systemMessage) {
                  systemMessage.message_id = setupMetadata.systemMessage.message_id;
                  systemMessage.content = setupMetadata.systemMessage.content || '';
                  systemMessage.copilotDetails = setupMetadata.copilot_details;
                  systemMessage.documents = setupMetadata.rag_docs;
                  systemMessage.timestamp = setupMetadata.systemMessage.timestamp || new Date().toISOString();
                } else if (setupMetadata.copilot_details) {
                  assistantMessage.copilotDetails = setupMetadata.copilot_details;
                }
                this.displayWidget.showMessages(this.chatStore.query());
              }
            }
        );
      },

      /**
       * Handles submission of page content with screenshot capture
       */
      _handlePageSubmitStream: function() {
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

        this.isSubmitting = true;
        this._setButtonToStop();

        topic.publish('hideChatPanel');

        html2canvas(document.body).then(lang.hitch(this, function(canvas) {
          var base64Image = canvas.toDataURL('image/png');
          topic.publish('showChatPanel');

          this.displayWidget.showLoadingIndicator(this.chatStore.query());
          var imageSystemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center. You can also answer questions about the attached screenshot.\\n' +
          'Analyze the screenshot and respond to the user\'s query.';

          if (this.systemPrompt) {
              imageSystemPrompt += '\\n\\n' + this.systemPrompt;
          }
          if (this.statePrompt) {
              imageSystemPrompt = imageSystemPrompt + '\\n\\n' + this.statePrompt;
          }

          var imgtxt_model = 'RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16';

          // Create messages for streaming
          let systemMessage = {
              role: 'system',
              message_id: null,
              content: '',
              copilotDetails: null,
              ragDocs: null,
              timestamp: new Date().toISOString()
          };
          this.chatStore.addMessage(systemMessage);

          let assistantMessage = {
              role: 'assistant',
              content: '',
              message_id: null,
              timestamp: new Date().toISOString()
          };
          this.chatStore.addMessage(assistantMessage);

          const params = {
              stream: true,
              inputText: inputText,
              sessionId: this.sessionId,
              systemPrompt: imageSystemPrompt,
              model: imgtxt_model,
              save_chat: true,
              ragDb: this.ragDb,
              numDocs: this.numDocs,
              image: base64Image,
              enhancedPrompt: this.enhancedPrompt
          };

          this.copilotApi.submitCopilotQueryStream(params,
              (chunk) => {
                  assistantMessage.content += chunk;
                  console.log('chunk=', chunk);
                  this.displayWidget.hideLoadingIndicator();
                  this.displayWidget.showMessages(this.chatStore.query());
              },
              () => {
                  if (_self.new_chat) {
                      _self._finishNewChat();
                  }
                  this.isSubmitting = false;
                  this._setButtonToSubmit();
                  this.pageContentEnabled = false;
                  this._updateToggleButtonStyle();
                  topic.publish('pageContentToggleChanged', false);
              },
              (error) => {
                  topic.publish('CopilotApiError', { error: error });
                  this.displayWidget.hideLoadingIndicator();
                  this.isSubmitting = false;
                  this._setButtonToSubmit();
              },
              (setupMetadata) => {
                  if (setupMetadata) {
                      if (setupMetadata.assistantMessage && setupMetadata.assistantMessage.message_id) {
                          assistantMessage.message_id = setupMetadata.assistantMessage.message_id;
                      }
                      if (setupMetadata.userMessage && setupMetadata.userMessage.message_id) {
                          userMessage.message_id = setupMetadata.userMessage.message_id;
                      }
                      if (setupMetadata.systemMessage) {
                          systemMessage.message_id = setupMetadata.systemMessage.message_id;
                          systemMessage.content = setupMetadata.systemMessage.content || '';
                          systemMessage.copilotDetails = setupMetadata.copilot_details;
                          systemMessage.documents = setupMetadata.rag_docs;
                          systemMessage.timestamp = setupMetadata.systemMessage.timestamp || new Date().toISOString();
                      } else if (setupMetadata.copilot_details) {
                          assistantMessage.copilotDetails = setupMetadata.copilot_details;
                      }
                      this.displayWidget.showMessages(this.chatStore.query());
                  }
              }
            );
        })).catch(lang.hitch(this, function(error) {
            console.error('Error capturing or processing screenshot:', error);
            topic.publish('showChatPanel');
            console.log('Falling back to HTML content');
            this._handlePageContentSubmitStream();
        }));
      },

      /**
       * Handles streaming submission of page content (HTML) as fallback
       */
      _handlePageContentSubmitStream: function() {
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

        var systemPrompt = 'You are a helpful assistant that can answer questions about the page content.\\n' +
            'Answer questions as if you were a user viewing the page.\\n' +
            'The page content is:\\n' +
            pageHtml;
        if (this.systemPrompt) {
            systemPrompt += '\\n' + this.systemPrompt;
        }
        if (this.statePrompt) {
          systemPrompt = this.statePrompt + '\\n\\n' + systemPrompt;
        }

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        // Create messages for streaming
        let systemMessage = {
            role: 'system',
            message_id: null,
            content: '',
            copilotDetails: null,
            ragDocs: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(systemMessage);

        let assistantMessage = {
            role: 'assistant',
            content: '',
            message_id: null,
            timestamp: new Date().toISOString()
        };
        this.chatStore.addMessage(assistantMessage);

        const params = {
            inputText: inputText,
            sessionId: this.sessionId,
            systemPrompt: systemPrompt,
            model: this.model,
            save_chat: true,
            ragDb: this.ragDb,
            numDocs: this.numDocs,
            enhancedPrompt: this.enhancedPrompt
        };

        this.copilotApi.submitCopilotQueryStream(params,
            (chunk) => {
                assistantMessage.content += chunk;
                this.displayWidget.hideLoadingIndicator();
                this.displayWidget.showMessages(this.chatStore.query());
            },
            () => {
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                this.isSubmitting = false;
                this._setButtonToSubmit();
                this.pageContentEnabled = false;
                this._updateToggleButtonStyle();
                topic.publish('pageContentToggleChanged', false);
            },
            (error) => {
                topic.publish('CopilotApiError', { error: error });
                this.displayWidget.hideLoadingIndicator();
                this.isSubmitting = false;
                this._setButtonToSubmit();
            },
            (setupMetadata) => {
                if (setupMetadata) {
                    if (setupMetadata.assistantMessage && setupMetadata.assistantMessage.message_id) {
                        assistantMessage.message_id = setupMetadata.assistantMessage.message_id;
                    }
                    if (setupMetadata.userMessage && setupMetadata.userMessage.message_id) {
                        userMessage.message_id = setupMetadata.userMessage.message_id;
                    }
                    if (setupMetadata.systemMessage) {
                        systemMessage.message_id = setupMetadata.systemMessage.message_id;
                        systemMessage.content = setupMetadata.systemMessage.content || '';
                        systemMessage.copilotDetails = setupMetadata.copilot_details;
                        systemMessage.documents = setupMetadata.rag_docs;
                        systemMessage.timestamp = setupMetadata.systemMessage.timestamp || new Date().toISOString();
                    } else if (setupMetadata.copilot_details) {
                        assistantMessage.copilotDetails = setupMetadata.copilot_details;
                    }
                    this.displayWidget.showMessages(this.chatStore.query());
                }
            }
        );
      },

      //================================================================
      // SESSION MANAGEMENT METHODS
      //================================================================

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

      //================================================================
      // CONFIGURATION METHODS (SETTERS/GETTERS)
      //================================================================

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

      /**
       * Sets state-specific prompt context
       */
      setStatePrompt: function(statePrompt) {
        this.statePrompt = statePrompt;
      },

      //================================================================
      // UTILITY METHODS
      //================================================================

      /**
       * Updates the toggle button's visual state based on pageContentEnabled
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