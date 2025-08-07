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
  'dojo/on', // Event handling
  '../../JobManager',
  'html2canvas/dist/html2canvas.min'
], function (
  declare,
  CopilotInput,
  lang,
  topic,
  domConstruct,
  Button,
  Textarea,
  on,
  JobManager,
  html2canvas
) {

  /**
   * @class CopilotInputSidePanel
   * @extends {p3/widget/CopilotInput}
   * @description Extends CopilotInput to create a side panel interface for chat input
   */
  return declare([CopilotInput], {

    //================================================================
    // WIDGET CONFIGURATION & STATE PROPERTIES
    //================================================================

    /** CSS class for styling */
    baseClass: 'CopilotInputSidePanel',

    /** Widget styling */
    style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

    /** Size constraints for the widget */
    minSize: 40,
    maxSize: 200,

    //================================================================
    // COPILOT API & SESSION PROPERTIES
    //================================================================

    /** Current selection for job manager context */
    currentSelection: null,

    /** Selected RAG database for enhanced responses */
    ragDb: null,

    //================================================================
    // UI STATE PROPERTIES
    //================================================================

    /** Flag to track page content toggle state */
    pageContentEnabled: false,

    //================================================================
    // LIFECYCLE METHODS
    //================================================================

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
            this.ragDb = null;
            if (this.pageContentEnabled) {
                this._handlePageSubmitStream();
            } else if (this.copilotApi && this.ragDb) {
              this._handleRagSubmitStream();
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

        setTimeout(lang.hitch(this, function() {
          topic.publish('setInitialJobSelection');
        }), 100);

        // Subscribe to side panel suggestion selection to populate input text area
        topic.subscribe('populateInputSuggestionSidePanel', lang.hitch(this, function(suggestion) {
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
     * Handles submission of regular (non-RAG) queries with streaming
     * Routes to appropriate handler based on context
     */
    _handleRegularSubmitStream: function() {
      try {
        if (this.context === 'grid-container') {
          this._submitToGridContainerStream();
        } else if (this.context === 'job-manager') {
          this._submitToJobManagerStream();
        } else {
          throw new Error('Unsupported context: ' + (this.context || 'undefined'));
        }
      } catch (error) {
        console.error('Error in _handleRegularSubmitStream:', error.message);
        topic.publish('CopilotApiError', { error: error });
        this.isSubmitting = false;
        this.submitButton.set('disabled', false);
      }
    },

    /**
     * Handles submission of RAG queries with streaming
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
      this.submitButton.set('disabled', true);
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
              this.submitButton.set('disabled', false);
          },
          (error) => {
              topic.publish('CopilotApiError', { error: error });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.submitButton.set('disabled', false);
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
     * Handles submission of page content with screenshot capture using streaming
     */
    _handlePageSubmitStream: function() {
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
        this.submitButton.set('disabled', true);

        html2canvas(document.body).then(lang.hitch(this, function(canvas) {
            var base64Image = canvas.toDataURL('image/png');

            this.displayWidget.showLoadingIndicator(this.chatStore.query());

            var imageSystemPrompt = 'You are a helpful assistant that can answer questions about the attached screenshot.\\n' +
                                'Analyze the screenshot and respond to the user\'s query.';
            if (this.systemPrompt) {
                imageSystemPrompt += '\\n' + this.systemPrompt;
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
                inputText: inputText,
                sessionId: this.sessionId,
                systemPrompt: imageSystemPrompt,
                model: imgtxt_model,
                save_chat: true,
                image: base64Image
            };

            this.copilotApi.submitCopilotQueryStream(params,
                lang.hitch(this, function(chunk) {
                    assistantMessage.content += chunk;
                    this.displayWidget.hideLoadingIndicator();
                    this.displayWidget.showMessages(this.chatStore.query());
                }),
                lang.hitch(this, function() {
                    if (_self.new_chat) {
                        _self._finishNewChat();
                    }
                    this.isSubmitting = false;
                    this.submitButton.set('disabled', false);
                    this.pageContentEnabled = false;
                    this._updateToggleButtonStyle();
                    topic.publish('pageContentToggleChanged', false);
                }),
                lang.hitch(this, function(error) {
                    topic.publish('CopilotApiError', { error: error });
                    this.displayWidget.hideLoadingIndicator();
                    this.isSubmitting = false;
                    this.submitButton.set('disabled', false);
                }),
                lang.hitch(this, function(setupMetadata) {
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
                })
            );
        })).catch(lang.hitch(this, function(error) {
            console.error('Error capturing or processing screenshot:', error);
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
          message_id: null,
          timestamp: new Date().toISOString()
        };

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        const pageHtml = document.documentElement.innerHTML;

        var imageSystemPrompt = 'You are a helpful assistant that can answer questions about the page content.\\n' +
            'Answer questions as if you were a user viewing the page.\\n' +
            'The page content is:\\n' +
            pageHtml;
        if (this.systemPrompt) {
            imageSystemPrompt += '\\n' + this.systemPrompt;
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
            systemPrompt: imageSystemPrompt,
            model: this.model,
            save_chat: true
        };

        this.copilotApi.submitCopilotQueryStream(params,
            lang.hitch(this, function(chunk) {
                assistantMessage.content += chunk;
                this.displayWidget.hideLoadingIndicator();
                this.displayWidget.showMessages(this.chatStore.query());
            }),
            lang.hitch(this, function() {
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                this.isSubmitting = false;
                this.submitButton.set('disabled', false);
                this.pageContentEnabled = false;
                this._updateToggleButtonStyle();
                topic.publish('pageContentToggleChanged', false);
            }),
            lang.hitch(this, function(error) {
                topic.publish('CopilotApiError', { error: error });
                this.displayWidget.hideLoadingIndicator();
                this.isSubmitting = false;
                this.submitButton.set('disabled', false);
            }),
            lang.hitch(this, function(setupMetadata) {
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
            })
        );
    },

    /**
     * Handles submission for grid-container context using streaming
     */
    _submitToGridContainerStream: function() {
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
      this.submitButton.set('disabled', true);
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
          systemPrompt: this.systemPrompt,
          model: this.model,
          save_chat: true
      };

      this.copilotApi.submitCopilotQueryStream(params,
          lang.hitch(this, function(chunk) {
              assistantMessage.content += chunk;
              this.displayWidget.hideLoadingIndicator();
              this.displayWidget.showMessages(this.chatStore.query());
          }),
          lang.hitch(this, function() {
              if (_self.new_chat) {
                  _self._finishNewChat();
              }
              this.isSubmitting = false;
              this.submitButton.set('disabled', false);
          }),
          lang.hitch(this, function(error) {
              topic.publish('CopilotApiError', { error: error });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.submitButton.set('disabled', false);
          }),
          lang.hitch(this, function(setupMetadata) {
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
          })
      );
    },

    /**
     * Handles submission for job-manager context using streaming with job details
     */
    _submitToJobManagerStream: function() {
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
      this.submitButton.set('disabled', true);
      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      var job_id = this.currentSelection[0].id;

      JobManager.queryTaskDetail(job_id, true, true).then(function(response) {
        var stdout = response.stdout || '';
        var stderr = response.stderr || '';
        const currMaxLength = 100000;
        if (stdout.length > currMaxLength) {
          stdout = stdout.substring(stdout.length - currMaxLength);
        }
        if (stderr.length > currMaxLength) {
          stderr = stderr.substring(stderr.length - currMaxLength);
        }

        // Combine stdout and stderr as system prompt
        var jobSystemPrompt = 'Job stdout:\\n' + stdout + '\\n\\nJob stderr:\\n' + stderr;

        // Create messages for streaming
        let systemMessage = {
            role: 'system',
            message_id: null,
            content: '',
            copilotDetails: null,
            ragDocs: null,
            timestamp: new Date().toISOString()
        };
        _self.chatStore.addMessage(systemMessage);

        let assistantMessage = {
            role: 'assistant',
            content: '',
            message_id: null,
            timestamp: new Date().toISOString()
        };
        _self.chatStore.addMessage(assistantMessage);
        _self.displayWidget.hideLoadingIndicator();

        const params = {
            inputText: inputText,
            sessionId: _self.sessionId,
            systemPrompt: jobSystemPrompt,
            model: _self.model,
            save_chat: true
        };

        _self.copilotApi.submitCopilotQueryStream(params,
            function(chunk) {
                assistantMessage.content += chunk;
                _self.displayWidget.showMessages(_self.chatStore.query());
            },
            function() {
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                _self.isSubmitting = false;
                _self.submitButton.set('disabled', false);
            },
            function(error) {
                topic.publish('noJobDataError', error);
                _self.displayWidget.hideLoadingIndicator();
                _self.isSubmitting = false;
                _self.submitButton.set('disabled', false);
            },
            function(setupMetadata) {
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
                    _self.displayWidget.showMessages(_self.chatStore.query());
                }
            }
        );
      });
    },

    //================================================================
    // SESSION MANAGEMENT METHODS
    //================================================================

    /**
     * Finalizes creation of a brand-new chat, mirroring CopilotInput._finishNewChat
     * but scoped to the side-panel input.
     */
    _finishNewChat: function(generateTitleImmediately = true) {
      this.new_chat = false;

      // Add the new session to the global sessions store
      if (window && window.App && window.App.chatSessionsStore) {
        window.App.chatSessionsStore.addSession({
          session_id: this.sessionId,
          title: 'New Chat',
          created_at: Date.now()
        });
      }

      // Tell the scroll-bar to reload and highlight this new session
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
     * Updates selected model and UI
     */
    setModel: function(model) {
      console.log('setModel=', model);
      this.model = model;
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
    },

    /**
     * Sets the current selection for job manager context
     */
    setCurrentSelection: function(selection) {
      this.currentSelection = selection;
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