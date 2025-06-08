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
    'dojo/topic',
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
    topic,
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

        // Flag to track page content toggle state
        pageContentEnabled: false,

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
                style: 'width: 35px; height: 35px; display: flex; flex-direction: column; align-items: center; margin-right: 15px;'
            }, inputContainer);

            // Create camera div above the toggle button
            var cameraDiv = domConstruct.create('div', {
                'class': 'cameraDivAboveToggle'
            });

            // Create the page content toggle using the camera div
            this.pageContentToggle = {
                domNode: cameraDiv,
                placeAt: function(container) {
                    container.appendChild(cameraDiv);
                }
            };

            // Add click handler and properties to camera div
            cameraDiv.title = 'Ask about page - Sends page content to help answer your question.';
            cameraDiv.style.cursor = 'pointer';
            on(cameraDiv, 'click', lang.hitch(this, function() {
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

            // Create container for model/RAG selection UI
            var settingsDiv = domConstruct.create('div', {
                style: 'display: flex; flex-direction: row; justify-content: center; align-items: center; margin-top: 10px; cursor: pointer; font-size: 0.9em;'
            }, wrapperDiv);

            // Subscribe to page content toggle changes from ChatSessionOptionsBarSmallWindow
            topic.subscribe('pageContentToggleChanged', lang.hitch(this, function(checked) {
                this.pageContentEnabled = checked;
                this._updateToggleButtonStyle();
                console.log('Page content toggle changed to:', checked);
            }));

            /*

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
                    topic.publish('modelButtonPressed', this.modelText, ['above']);
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
                    topic.publish('ragButtonPressed', this.ragText, ['above']);
                })
            }, settingsDiv);

            */

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

        /**
         * @method _handlePageSubmit
         * @description Handles submission about the current page (screenshot first, HTML fallback)
         *
         **/
        _handlePageSubmit: function() {
            var inputText = this.textArea.get('value');
            var _self = this;

            if (this.state) {
                console.log('state', this.state);
            }

            this.isSubmitting = true;
            this.submitButton.set('disabled', true);

            topic.publish('hideChatPanel'); // Hide panel before taking screenshot

            html2canvas(document.body).then(lang.hitch(this, function(canvas) {
                var base64Image = canvas.toDataURL('image/png');

                topic.publish('showChatPanel'); // Show panel again

                this.systemPrompt = 'You are a helpful assistant that can answer questions about the attached screenshot.\n' +
                                    'Analyze the screenshot and respond to the user\'s query.';
                var imgtxt_model = 'RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16';

                this.displayWidget.showLoadingIndicator(this.chatStore.query());

                this.copilotApi.submitQueryWithImage(inputText, this.sessionId, this.systemPrompt, imgtxt_model, base64Image)
                    .then(lang.hitch(this, function(response) {
                        this.chatStore.addMessages([
                            {
                                role: 'user',
                                content: inputText
                            },
                            {
                                role: 'assistant',
                                content: response
                            }
                        ]);
                        _self.textArea.set('value', '');
                        this.displayWidget.showMessages(this.chatStore.query());

                        if (_self.new_chat) {
                            _self.new_chat = false;
                            topic.publish('reloadUserSessions');
                            setTimeout(() => {
                                topic.publish('generateSessionTitle');
                            }, 100);
                        }
                    })).catch(function(error) {
                        topic.publish('CopilotApiError', { error: error });
                    }).finally(lang.hitch(this, function() {
                        this.displayWidget.hideLoadingIndicator();
                        this.isSubmitting = false;
                        this.submitButton.set('disabled', false);
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
         **/
        _handlePageContentSubmit: function() {
            var inputText = this.textArea.get('value');
            var _self = this;

            const pageHtml = document.documentElement.innerHTML;

            this.systemPrompt = 'You are a helpful assistant that can answer questions about the page content.\n' +
                'Answer questions as if you were a user viewing the page.\n' +
                'The page content is:\n' +
                pageHtml;

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
                setTimeout(() => {
                    topic.publish('generateSessionTitle');
                }, 100);
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
    });
  });
