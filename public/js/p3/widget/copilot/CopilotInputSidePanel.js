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

    // CSS class for styling
    baseClass: 'CopilotInputSidePanel',

    // Widget styling
    style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

    // Size constraints for the widget
    minSize: 40,
    maxSize: 200,

    currentSelection: null,

    // Flag to track page content toggle state
    pageContentEnabled: false,

    ragDb: null,

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

        html2canvas(document.body).then(lang.hitch(this, function(canvas) {
            var base64Image = canvas.toDataURL('image/png');

            this.displayWidget.showLoadingIndicator(this.chatStore.query());

            var imageSystemPrompt = 'You are a helpful assistant that can answer questions about the attached screenshot.\n' +
                                'Analyze the screenshot and respond to the user\'s query.';
            if (this.systemPrompt) {
                imageSystemPrompt += '\n' + this.systemPrompt;
            }
            var imgtxt_model = 'RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16';

            this.copilotApi.submitCopilotQuery(inputText, this.sessionId, imageSystemPrompt, imgtxt_model, true, null, null, base64Image)
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

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        this.copilotApi.submitCopilotQuery(inputText, this.sessionId, imageSystemPrompt, this.model).then(lang.hitch(this, function(response) {
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
     * Handles submission of regular (non-RAG) queries
     * Implementation:
     * - Checks context to determine submission type
     * - Routes to appropriate handler based on context
     * - Throws error for unsupported contexts
     */
    _handleRegularSubmit: function() {
      try {
        if (this.context === 'grid-container') {
          this._submitToGridContainer();
        } else if (this.context === 'job-manager') {
          this._submitToJobManager();
        } else {
          throw new Error('Unsupported context: ' + (this.context || 'undefined'));
        }
      } catch (error) {
        console.error('Error in _handleRegularSubmit:', error.message);
        topic.publish('CopilotApiError', { error: error });
        this.isSubmitting = false;
        this.submitButton.set('disabled', false);
      }
    },

    /**
     * Handles submission for grid-container context using copilotAPI
     * Implementation:
     * - Immediately shows user message and clears text area
     * - Disables input during submission
     * - Shows loading indicator
     * - Makes LLM query with basic system prompt
     * - Updates chat store with assistant/system messages only
     * - Handles new chat initialization
     */
    _submitToGridContainer: function() {
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
      this.copilotApi.submitCopilotQuery(inputText, this.sessionId, this.systemPrompt, this.model).then(lang.hitch(this, function(response) {
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
     * Handles submission for job-manager context using copilotAPI with job details
     * Implementation:
     * - Immediately shows user message and clears text area
     * - Disables input during submission
     * - Shows loading indicator
     * - Queries job details to get stdout/stderr
     * - Makes LLM query with stdout/stderr as system prompt
     * - Updates chat store with assistant/system messages only
     * - Handles new chat initialization
     */
    _submitToJobManager: function() {
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
        var jobSystemPrompt = 'Job stdout:\n' + stdout + '\n\nJob stderr:\n' + stderr;

        // Submit query with job details as system prompt
        return _self.copilotApi.submitCopilotQuery(inputText, _self.sessionId, jobSystemPrompt, _self.model);
      }).then(lang.hitch(this, function(response) {
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
        topic.publish('noJobDataError', error);
      }).finally(lang.hitch(this, function() {
        this.displayWidget.hideLoadingIndicator();
        this.isSubmitting = false;
        this.submitButton.set('disabled', false);
      }));
    },

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
    },

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

    setCurrentSelection: function(selection) {
      this.currentSelection = selection;
    }
  });
});
