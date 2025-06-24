/**
 * @module p3/widget/ChatSessionOptionsBar
 * @description A ContentPane-based widget that provides action buttons for chat session management.
 * Contains buttons for searching sessions and creating new chat sessions.
 *
 * Key features:
 * - Model selection dropdown for choosing AI model
 * - RAG (Retrieval Augmented Generation) database selection
 * - System prompt management with save/load functionality
 * - New chat session creation
 */
define([
    'dojo/_base/declare',
    'dijit/layout/ContentPane',
    'dijit/form/Button',
    'dojo/_base/lang',
    'dojo/topic',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dijit/Dialog',
    'dojo/dom-construct',
    'dojo/Deferred',
    'dojo/dom-style',
    'dojo/dom-class'
], function (
    declare,
    ContentPane,
    Button,
    lang,
    topic,
    TooltipDialog,
    popup,
    Dialog,
    domConstruct,
    Deferred,
    domStyle,
    domClass
) {
    /**
     * @class ChatSessionOptionsBar
     * @extends {dijit/layout/ContentPane}d
     *
     * Main widget class that provides the options bar interface.
     * Handles model selection, RAG database selection
     */
    return declare([ContentPane], {
        /** @property {string} title - Widget title */
        title: 'Basic Chat Options',

        /** @property {Object} copilotApi - Reference to CopilotAPI instance */
        copilotApi: null,

        /** @property {Array} modelList - Available models list */
        modelList: null,

        /** @property {Array} ragList - Available RAG databases list */
        ragList: null,

        /** @property {Object} pageContentToggle - CheckBox for page content functionality */
        pageContentToggle: null,

        /** @property {boolean} helpdeskSelected - Tracks if helpdesk button is selected */
        helpdeskSelected: true,

        /** @property {boolean} cepiSelected - Tracks if CEPI button is selected */
        cepiSelected: false,

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options to mix into the widget
         */
        constructor: function(opts) {
            if (opts) {
                lang.mixin(this, opts);
            }
        },

        /**
         * Creates and configures the model selection dropdown
         * - Populates with models from modelList if provided
         * - Otherwise adds default LLAMA and GPT4 options
         * - Publishes selected model on change
         *
         * @returns {HTMLElement} Configured select element for model choice
         */
        createModelDropdown: function() {
            var selectElement = document.createElement('select');
            selectElement.className = 'copilotSelectElement';
            // Add models from provided list or use defaults
            if (this.modelList) {
                this.modelList.forEach(lang.hitch(this, function(model) {
                    var option = document.createElement('option');
                    option.value = model.model;
                    var modelName = model.model.split('/').reverse()[0];
                    option.text = modelName.substring(0, 30);
                    selectElement.add(option);
                }));
            } else {
                // Add 'No Models Available' option
                var optionNoModels = document.createElement('option');
                optionNoModels.value = null;
                optionNoModels.text = 'No Models Available';
                selectElement.add(optionNoModels);
            }

            // Publish selected model when changed
            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var model = evt.target.value;
                topic.publish('ChatModel', model);
            }));

            return selectElement;
        },

        /**
         * Creates and configures the RAG database selection dropdown
         * - Adds 'None' option by default
         * - Populates with RAG DBs from ragList if provided
         * - Otherwise adds default Cancer papers option
         * - Publishes selected RAG DB and updates button label on change
         *
         * @returns {HTMLElement} Configured select element for RAG choice
         */
        createRagDropdown: function() {
            var selectElement = document.createElement('select');
            selectElement.className = 'copilotSelectElement';

            // Add None option
            var optionNone = document.createElement('option');
            optionNone.value = 'null';
            optionNone.text = 'None';
            selectElement.add(optionNone);

            // Add RAG DBs from provided list or use defaults
            if (this.ragList) {
                var check_names = [];
                this.ragList.forEach(lang.hitch(this, function(ragdb) {
                    var option = document.createElement('option');
                    option.value = ragdb.name;
                    option.text = ragdb.name.split('/').reverse()[0];
                    if (!check_names.includes(option.text)) {
                        check_names.push(option.text);
                        selectElement.add(option);
                    }
                }));
            } else {
                // Add default None option
                var optionNone = document.createElement('option');
                optionNone.value = null;
                optionNone.text = 'None';
                selectElement.add(optionNone);

                // Add default Cancer papers option
                var optionCancer = document.createElement('option');
                optionCancer.value = 'cancer_papers';
                optionCancer.text = 'Cancer';
                selectElement.add(optionCancer);
            }

            // Handle selection changes
            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var ragDb = evt.target.value;
                topic.publish('ChatRagDb', ragDb);
            }));

            return selectElement;
        },

        /**
         * Creates dialog for managing RAG selection
         * - Includes RAG selection dropdown
         * - Publishes selected RAG DB on change
         *
         * @returns {TooltipDialog} Configured dialog for RAG selection
         */
        createRagDialog: function() {
            var ragDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add RAG selection
            var ragLabel = document.createElement('div');
            ragLabel.textContent = 'Database:';
            ragLabel.style.marginBottom = '5px';
            ragLabel.title = 'Select the database to use for the RAG query';
            ragDialog.containerNode.appendChild(ragLabel);
            this.ragDropdown = this.createRagDropdown();
            ragDialog.containerNode.appendChild(this.ragDropdown);

            // Add Number of Documents section
            var numDocsContainer = document.createElement('div');
            numDocsContainer.style.display = 'flex';
            numDocsContainer.style.alignItems = 'center';
            numDocsContainer.style.marginTop = '10px';
            numDocsContainer.style.marginBottom = '10px';
            numDocsContainer.style.gap = '10px';
            ragDialog.containerNode.appendChild(numDocsContainer);

            var numDocsLabel = document.createElement('div');
            numDocsLabel.textContent = 'Number of Documents:';
            numDocsLabel.title = 'Number of documents to retrieve from the database';
            numDocsContainer.appendChild(numDocsLabel);

            var numDocsInput = document.createElement('input');
            numDocsInput.type = 'number';
            numDocsInput.min = '1';
            numDocsInput.max = '10';
            numDocsInput.value = '3';
            numDocsInput.style.width = '60px';
            numDocsInput.addEventListener('change', lang.hitch(this, function(evt) {
                var numDocs = evt.target.value;
                topic.publish('ChatNumDocs', numDocs);
            }));
            this.numDocsInput = numDocsInput;
            numDocsContainer.appendChild(numDocsInput);

            // Add Summarize Documents checkbox
            var summarizeContainer = document.createElement('div');
            summarizeContainer.style.display = 'flex';
            summarizeContainer.style.alignItems = 'center';
            summarizeContainer.style.marginTop = '10px';
            summarizeContainer.style.marginBottom = '10px';
            summarizeContainer.style.gap = '10px';
            ragDialog.containerNode.appendChild(summarizeContainer);

            var summarizeLabel = document.createElement('div');
            summarizeLabel.textContent = 'Summarize Documents';
            summarizeLabel.title = 'Summarize each matched document; takes longer but may improve generated response';
            summarizeContainer.appendChild(summarizeLabel);

            var summarizeCheckbox = document.createElement('input');
            summarizeCheckbox.type = 'checkbox';
            summarizeCheckbox.checked = false;
            summarizeCheckbox.addEventListener('change', lang.hitch(this, function(evt) {
                var shouldSummarize = evt.target.checked;
                topic.publish('ChatSummarizeDocs', shouldSummarize);
            }));
            summarizeContainer.appendChild(summarizeCheckbox);

            return ragDialog;
        },

        /**
         * Creates dialog for managing model selection
         * - Includes model selection dropdown
         * - Publishes selected model on change
         *
         * @returns {TooltipDialog} Configured dialog for model selection
         */
        createModelDialog: function() {
            var modelDialog = new TooltipDialog({
                style: "width: 275px;",
                content: document.createElement('div')
            });

            // Add model selection
            var modelLabel = document.createElement('div');
            modelLabel.textContent = 'Model:';
            modelLabel.style.marginBottom = '5px';
            modelDialog.containerNode.appendChild(modelLabel);
            this.modelDropdown = this.createModelDropdown();
            modelDialog.containerNode.appendChild(this.modelDropdown);

            return modelDialog;
        },

        /**
         * Called after widget creation
         * Override to add custom functionality
         */
        postCreate: function() {
            // Initialize CopilotAPI if not provided
            if (!this.copilotApi) {
                this.copilotApi = new CopilotAPI({
                    user_id: window.App.user ? window.App.user.l_id : null
                });
            }

            this.name_map = {
                "Llama-4-Scout-17B-16E-Instruct-quantized.w4a16": "Llama-4-Scout",
                "Llama-3.3-70B-Instruct": "Llama-3.3-70B"
            };

            // Create model and RAG dialogs
            var modelDialog = this.createModelDialog();
            var ragDialog = this.createRagDialog();

            // Create container for text buttons
            var buttonsContainer = domConstruct.create('div', {
                style: 'display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; margin-top: 10px; font-size: 0.9em; gap: 2px;'
            }, this.containerNode);

            // Add New Chat button with hover effects (moved to be first)
            this.newChatButton = domConstruct.create('div', {
                innerHTML: 'New Chat',
                className: 'chat-window-options-button',
                onclick: lang.hitch(this, function() {
                    // Create a new chat session immediately
                    if (this.copilotApi) {
                        // Publish reloadUserSessions to remove session highlight
                        topic.publish('reloadUserSessions');

                        // Publish the createNewChatSession topic
                        topic.publish('createNewChatSession');
                    }
                })
            }, buttonsContainer);

            // Create container for model and RAG text elements
            this.advancedOptionsContainer = domConstruct.create('div', {
                style: 'display: none; width: 100%;'
            }, buttonsContainer);

            // Add Model text display with hover effects
            this.modelText = domConstruct.create('div', {
                innerHTML: 'Model: Loading...',
                className: 'chat-window-options-button',
                onclick: lang.hitch(this, function() {
                    topic.publish('modelButtonPressed', this.modelText, ['below']);
                })
            }, this.advancedOptionsContainer);

            // Add RAG text display with hover effects
            this.ragText = domConstruct.create('div', {
                innerHTML: 'RAG: Loading...',
                className: 'chat-window-options-button',
                onclick: lang.hitch(this, function() {
                    topic.publish('ragButtonPressed', this.ragText, ['below']);
                })
            }, this.advancedOptionsContainer);

            // add a text size input field
            var textSizeContainer = domConstruct.create('div', {
                className: 'chat-window-options-button',
                style: 'display: flex; align-items: center; gap: 5px;'
            }, this.advancedOptionsContainer);

            domConstruct.create('span', {
                innerHTML: 'Text Size: ',
                style: 'white-space: nowrap;'
            }, textSizeContainer);

            this.textSizeInput = domConstruct.create('input', {
                type: 'number',
                value: 13,
                min: 1,
                max: 100,
                style: 'width: 50px; padding: 2px;',
                onchange: lang.hitch(this, function(evt) {
                    var newSize = parseInt(evt.target.value);
                    if (newSize >= 1 && newSize <= 100) {
                        topic.publish('chatTextSizeChanged', newSize);
                    }
                })
            }, textSizeContainer);

            // Add a level input field (uses number counter similar to Text Size)
            var levelContainer = domConstruct.create('div', {
                className: 'chat-window-options-button',
                style: 'display: flex; align-items: center; gap: 5px;'
            }, this.advancedOptionsContainer);

            domConstruct.create('span', {
                innerHTML: 'Level: ',
                style: 'white-space: nowrap;'
            }, levelContainer);

            this.levelInput = domConstruct.create('input', {
                type: 'number',
                value: 0,
                min: 0,
                max: 2,
                style: 'width: 50px; padding: 2px;',
                onchange: lang.hitch(this, function(evt) {
                    var newLevel = parseInt(evt.target.value);
                    // Publish the levelChanged topic as used by CopilotInput
                    if (!isNaN(newLevel)) {
                        topic.publish('levelChanged', newLevel);
                    }
                })
            }, levelContainer);

            // Publish initial level value
            topic.publish('levelChanged', 0);

            // Add CEPI journal rag button
            this.cepiText = domConstruct.create('div', {
                innerHTML: 'Publications',
                className: 'chat-window-options-button',
                onclick: lang.hitch(this, function() {
                    this.cepiSelected = !this.cepiSelected;
                    domClass.toggle(this.cepiText, 'selected', this.cepiSelected);

                    if (this.cepiSelected && this.helpdeskSelected) {
                        this.helpdeskSelected = false;
                        domClass.remove(this.helpdeskButton, 'selected');
                    }

                    topic.publish(
                        'ChatRagDb',
                        this.cepiSelected ? 'cepi_journals' : 'null'
                    );
                })
            }, this.advancedOptionsContainer);

            // Add Helpdesk button with hover effects
            this.helpdeskButton = domConstruct.create('div', {
                innerHTML: 'Help Center',
                className: 'chat-window-options-button selected',
                onclick: lang.hitch(this, function() {
                    this.helpdeskSelected = !this.helpdeskSelected;
                    domClass.toggle(this.helpdeskButton, 'selected', this.helpdeskSelected);

                    if (this.helpdeskSelected && this.cepiSelected) {
                        this.cepiSelected = false;
                        domClass.remove(this.cepiText, 'selected');
                    }

                    topic.publish('ChatRagDb', this.helpdeskSelected ? 'bvbrc_helpdesk' : 'null');
                })
            }, this.advancedOptionsContainer);

            // Publish initial helpdesk selection since it's on by default
            topic.publish('ChatRagDb', 'bvbrc_helpdesk');

            // Handle clicks outside dialogs to close them
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (modelDialog._rendered && !modelDialog.domNode.contains(event.target) && !this.modelText.contains(event.target)) {
                    popup.close(modelDialog);
                    modelDialog.visible = false;
                }
                if (ragDialog._rendered && !ragDialog.domNode.contains(event.target) && !this.ragText.contains(event.target)) {
                    popup.close(ragDialog);
                    ragDialog.visible = false;
                }
            }));

            // Handle RAG button clicks
            topic.subscribe('ragButtonPressed', lang.hitch(this, function(buttonNode, orient) {
                console.log('rag pressed');
                if (ragDialog.visible) {
                    popup.close(ragDialog);
                    ragDialog.visible = false;
                } else {
                    if (!buttonNode) {
                        buttonNode = this.ragText;
                    }
                    setTimeout(function() {
                        popup.open({
                            popup: ragDialog,
                            around: buttonNode,
                            orient: orient
                        });
                        ragDialog.visible = true;
                    }, 100);
                }
            }));

            // Handle model button clicks
            topic.subscribe('modelButtonPressed', lang.hitch(this, function(buttonNode, orient) {
                console.log('model pressed');
                if (modelDialog.visible) {
                    popup.close(modelDialog);
                    modelDialog.visible = false;
                } else {
                    if (!buttonNode) {
                        buttonNode = this.modelText;
                    }
                    setTimeout(function() {
                        popup.open({
                            popup: modelDialog,
                            around: buttonNode,
                            orient: orient
                        });
                        modelDialog.visible = true;
                    }, 100);
                }
            }));

            // Subscribe to topic changes to update display text
            topic.subscribe('ChatModel', lang.hitch(this, function(model) {
                // Update model display text with just the model name (last part after /)
                var modelName = model.split('/').reverse()[0];
                if (this.name_map[modelName]) {
                    modelName = this.name_map[modelName];
                }
                this.modelText.innerHTML = 'Model: ' + modelName;
            }));

            topic.subscribe('ChatRagDb', lang.hitch(this, function(ragDb) {
                // Update RAG display text
                this.ragText.innerHTML = 'RAG: ' + (ragDb === 'null' ? 'None' : ragDb);
            }));

            // Subscribe to topic to control model/rag container visibility
            topic.subscribe('toggleModelRagVisibility', lang.hitch(this, function(visible) {
                domStyle.set(this.advancedOptionsContainer, 'display', visible ? 'block' : 'none');

                // Adjust containerNode size to accommodate advanced options
                if (visible) {
                    // Increase height when advanced options are shown
                    domStyle.set(this.containerNode, {
                        'min-height': '250px',
                        'transition': 'min-height 0.3s ease-in-out',
                        'overflow': 'hidden'
                    });
                } else {
                    // Reset to smaller height when advanced options are hidden
                    domStyle.set(this.containerNode, {
                        'min-height': '50px',
                        'transition': 'min-height 0.3s ease-in-out',
                        'overflow': 'hidden'
                    });
                }
            }));

            // Additional topic subscriptions from older version
            topic.subscribe('get_model_list', lang.hitch(this, function() {
                topic.publish('return_model_list', this.modelList);
            }));

            topic.subscribe('get_rag_list', lang.hitch(this, function() {
                topic.publish('return_rag_list', this.ragList);
            }));

            // Set initial model
            topic.subscribe('SetInitialChatModel', lang.hitch(this, function() {
                if (this.modelDropdown && this.modelDropdown.options && this.modelDropdown.options.length > 0) {
                    topic.publish('ChatModel', this.modelDropdown.options[0].value);
                }
            }));

            // Fetch model and RAG lists from API
            this._loadModelAndRagLists();
        },

        /**
         * Loads model and RAG lists from the CopilotAPI
         * @private
         */
        _loadModelAndRagLists: function() {

            if (this.copilotApi) {
                this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                    try {
                        // Parse the response
                        this.modelList = JSON.parse(modelsAndRag.models);
                        this.ragList = JSON.parse(modelsAndRag.vdb_list);

                        // Update displays with first available options or "None" if empty
                        var defaultModel = this.modelList && this.modelList.length > 0 ? this.modelList[0] : 'None';
                        var defaultRag = this.ragList && this.ragList.length > 0 ? this.ragList[0] : 'None';
                        var modelName = defaultModel.model.split('/').reverse()[0];
                        if (this.name_map[modelName]) {
                            modelName = this.name_map[modelName];
                        }
                        this.modelText.innerHTML = 'Model: ' + modelName;
                        // this.ragText.innerHTML = 'RAG: ' + defaultRag.name;
                        this.ragText.innerHTML = 'RAG: None';

                        console.log('Model and RAG lists loaded successfully', {
                            models: this.modelList,
                            rags: this.ragList
                        });
                    } catch (error) {
                        console.error('Error parsing model/RAG lists:', error);
                        this.modelText.innerHTML = 'Model: Error';
                        this.ragText.innerHTML = 'RAG: Error';
                    }
                })).catch(lang.hitch(this, function(error) {
                    console.error('Error fetching model/RAG lists:', error);
                    this.modelText.innerHTML = 'Model: Error';
                    this.ragText.innerHTML = 'RAG: Error';
                }));
            } else {
                console.error('CopilotAPI not available');
                this.modelText.innerHTML = 'Model: N/A';
                this.ragText.innerHTML = 'RAG: N/A';
            }
        }
    });
});
