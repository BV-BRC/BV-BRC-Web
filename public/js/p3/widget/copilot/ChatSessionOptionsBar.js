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
    'dojo/Deferred'
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
    Deferred
) {
    /**
     * @class ChatSessionOptionsBar
     * @extends {dijit/layout/ContentPane}
     *
     * Main widget class that provides the options bar interface.
     * Handles model selection, RAG database selection, and system prompts.
     */
    return declare([ContentPane], {
        /** @property {string} style - CSS styling for the options bar */
        style: 'padding: 10px;',

        /** @property {Array} modelList - List of available AI models */
        modelList: null,

        /** @property {Array} ragList - List of available RAG databases */
        ragList: null,

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options to mix into the widget
         */
        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
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
            selectElement.style.marginRight = '10px';
            selectElement.style.display = 'block';
            selectElement.style.marginBottom = '10px';

            // Add models from provided list or use defaults
            if (this.modelList) {
                this.modelList.forEach(lang.hitch(this, function(model) {
                    var option = document.createElement('option');
                    option.value = model.model;
                    option.text = model.model.split('/').reverse()[0];
                    selectElement.add(option);
                }));
            } else {
                // Add default LLAMA model option
                var optionLLAMA31 = document.createElement('option');
                optionLLAMA31.value = 'meta-llama/Llama-3.3-70B-Instruct';
                optionLLAMA31.text = 'LLAMA3.3-70B';
                selectElement.add(optionLLAMA31);

                // Add default GPT4 option
                var optionGPT4O = document.createElement('option');
                optionGPT4O.value = 'gpt4o';
                optionGPT4O.text = 'GPT-4o';
                selectElement.add(optionGPT4O);
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
            selectElement.style.marginRight = '10px';
            selectElement.style.display = 'block';
            selectElement.style.marginBottom = '10px';

            // Add None option
            var optionNone = document.createElement('option');
            optionNone.value = 'null';
            optionNone.text = 'None';
            selectElement.add(optionNone);

            // Add RAG DBs from provided list or use defaults
            if (this.ragList) {
                this.ragList.forEach(lang.hitch(this, function(ragdb) {
                    var option = document.createElement('option');
                    option.value = ragdb.name;
                    option.text = ragdb.name.split('/').reverse()[0];
                    selectElement.add(option);
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
                if (ragDb != 'null') {
                    topic.publish('changeRagButtonLabel', ragDb);
                } else {
                    topic.publish('changeRagButtonLabel', 'None');
                }
            }));

            return selectElement;
        },

        /**
         * Creates dialog for managing system prompts
         * - Includes prompt type selection dropdown
         * - Text area for editing prompt content
         * - Save button to store custom prompts
         *
         * @returns {TooltipDialog} Configured dialog for prompt management
         */
        createPromptsDialog: function() {
            var promptsDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add prompt type selection UI
            var promptTypeWrapper = document.createElement('div');
            promptTypeWrapper.style.display = 'flex';
            promptTypeWrapper.style.alignItems = 'center';
            promptTypeWrapper.style.marginBottom = '10px';

            var promptTypeLabel = document.createElement('span');
            promptTypeLabel.textContent = 'Select Prompt:';
            promptTypeLabel.style.marginRight = '5px';
            promptTypeWrapper.appendChild(promptTypeLabel);

            // Configure prompt type dropdown
            var promptTypeSelect = document.createElement('select');
            promptTypeSelect.style.width = '40%';
            promptTypeWrapper.appendChild(promptTypeSelect);
            this.promptTypeSelect = promptTypeSelect;
            this.promptTypeSelect.addEventListener('change', lang.hitch(this, function(evt) {
                var prompt = evt.target.value;
                var promptName = this.promptTypeSelect.options[this.promptTypeSelect.selectedIndex].text;
                this.updatePromptText(promptName, prompt);
                topic.publish('ChatSystemPrompt', prompt);
            }));
            promptsDialog.containerNode.appendChild(promptTypeWrapper);

            // Add system prompt editing area
            var promptLabel = document.createElement('div');
            promptLabel.textContent = 'System Prompt:';
            promptLabel.style.marginBottom = '5px';
            promptsDialog.containerNode.appendChild(promptLabel);
            var promptTextArea = document.createElement('textarea');
            promptTextArea.style.width = '100%';
            promptTextArea.style.height = '100px';
            promptTextArea.style.marginBottom = '10px';
            promptTextArea.addEventListener('change', lang.hitch(this, function(evt) {
                var systemPrompt = evt.target.value;
                topic.publish('ChatSystemPrompt', systemPrompt);
            }));
            this.promptTextArea = promptTextArea;
            promptsDialog.containerNode.appendChild(promptTextArea);

            // Add button container
            var buttonWrapper = document.createElement('div');
            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.gap = '10px';

            // Add save prompt button
            var saveButton = document.createElement('button');
            saveButton.textContent = 'Save Prompt';
            saveButton.style.flex = '1';
            saveButton.addEventListener('click', lang.hitch(this, function() {
                var promptNameDialog = this.createPromptNameDialog();
                promptNameDialog.show();
            }));
            buttonWrapper.appendChild(saveButton);

            promptsDialog.containerNode.appendChild(buttonWrapper);

            return promptsDialog;
        },

        /**
         * Creates dialog for naming and saving a new prompt
         * - Input field for prompt name
         * - Save/Cancel buttons
         * - Handles saving prompt and updating prompt list
         *
         * @returns {Dialog} Configured dialog for prompt naming
         */
        createPromptNameDialog: function() {
            var contentDiv = domConstruct.create('div', {});

            var labelDiv = domConstruct.create('div', {
                innerHTML: 'Enter a name for this prompt:',
                style: {
                    marginBottom: '10px'
                }
            }, contentDiv);

            var input = domConstruct.create('input', {
                type: 'text',
                style: {
                    width: '100%'
                },
                'data-dojo-attach-point': 'promptNameInput'
            }, contentDiv);

            var promptNameDialog = new Dialog({
                title: "Save Prompt",
                content: contentDiv,
                style: "width: 300px"
            });

            // Add button container
            var buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.gap = '10px';

            // Configure save button
            var saveButton = document.createElement('button');
            saveButton.innerHTML = "Save";
            saveButton.onclick = lang.hitch(this, function() {
                promptNameDialog.hide();
                this.copilotApi.savePrompt(input.value, this.promptTextArea.value).then(lang.hitch(this, function(response) {
                    this.resetPromptList().then(lang.hitch(this, function() {
                        this.updatePromptText(input.value, this.promptTextArea.value);
                        // Select the new prompt in dropdown
                        for (var i = 0; i < this.promptTypeSelect.options.length; i++) {
                            if (this.promptTypeSelect.options[i].text === input.value) {
                                this.promptTypeSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }));
                }));
            });

            // Configure cancel button
            var cancelButton = document.createElement('button');
            cancelButton.innerHTML = "Cancel";
            cancelButton.onclick = function() {
                promptNameDialog.hide();
            };

            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(saveButton);
            promptNameDialog.containerNode.appendChild(buttonContainer);

            return promptNameDialog;
        },

        /**
         * Sets up the widget after creation
         * - Creates options dialog with model and RAG selection
         * - Creates prompts dialog for system prompt management
         * - Adds buttons for prompts, model selection and new chat
         * - Sets up event handlers for dialogs
         */
        postCreate: function() {
            this.inherited(arguments);

            // Create options dialog
            var optionsDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add model selection
            var modelLabel = document.createElement('div');
            modelLabel.textContent = 'Model:';
            modelLabel.style.marginBottom = '5px';
            optionsDialog.containerNode.appendChild(modelLabel);
            this.modelDropdown = this.createModelDropdown();
            optionsDialog.containerNode.appendChild(this.modelDropdown);

            // Add RAG selection
            var ragLabel = document.createElement('div');
            ragLabel.textContent = 'RAG:';
            ragLabel.style.marginBottom = '5px';
            optionsDialog.containerNode.appendChild(ragLabel);
            this.ragDropdown = this.createRagDropdown();
            optionsDialog.containerNode.appendChild(this.ragDropdown);

            // Create and add prompts dialog
            var promptsDialog = this.createPromptsDialog();

            // Add Prompts button
            var promptsButton = new Button({
                label: 'Prompts',
                onClick: lang.hitch(this, function() {
                    popup.open({
                        popup: promptsDialog,
                        around: promptsButton.domNode
                    });
                })
            });
            this.addChild(promptsButton);

            // Add Model button
            var modelButton = new Button({
                label: 'Model',
                onClick: lang.hitch(this, function() {
                    popup.open({
                        popup: optionsDialog,
                        around: modelButton.domNode
                    });
                    modelButton.visible = true;
                }),
                visible: false
            });
            this.addChild(modelButton);

            // Handle clicks outside dialogs
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (optionsDialog._rendered && !optionsDialog.domNode.contains(event.target) && !modelButton.domNode.contains(event.target)) {
                    popup.close(optionsDialog);
                    modelButton.visible = false;
                }
                if (promptsDialog._rendered && !promptsDialog.domNode.contains(event.target) && !promptsButton.domNode.contains(event.target)) {
                    popup.close(promptsDialog);
                }
            }));

            // Handle RAG button clicks
            topic.subscribe('ragButtonPressed', lang.hitch(this, function() {
                console.log('rag pressed');
                if (optionsDialog.visible) {
                    popup.close(optionsDialog);
                    modelButton.visible = false;
                } else {
                    setTimeout(function() {
                        popup.open({
                            popup: optionsDialog,
                            around: modelButton.domNode
                        });
                    }, 100);
                    modelButton.visible = true;
                }
            }));

            // Add New Chat button
            this.createNewButton = new Button({
                label: 'New Chat',
                onClick: lang.hitch(this, function() {
                    topic.publish('createNewChatSession');
                })
            });
            this.addChild(this.createNewButton);

            // Initialize prompts
            this.resetPromptList();

            // Set initial model
            topic.subscribe('SetInitialChatModel', lang.hitch(this, function() {
                topic.publish('ChatModel', this.modelDropdown.options[0].value);
            }));
        },

        /**
         * Resets the prompt list by fetching latest prompts from API
         * @returns {Promise} Resolves when prompt list is updated
         */
        resetPromptList: function() {
            var deferred = new Deferred();
            if (this.copilotApi) {
                this.copilotApi.getUserPrompts().then(lang.hitch(this, function(response) {
                    var prompt_list = response.saved_prompts;
                    this.updatePromptList(prompt_list);
                    deferred.resolve(prompt_list);
                })).otherwise(function(err) {
                    deferred.reject(err);
                });
            } else {
                deferred.resolve(true);
            }
            return deferred.promise;
        },

        /**
         * Updates the prompt type dropdown with provided prompt list
         * @param {Array} prompt_list List of prompts to add to dropdown
         */
        updatePromptList: function(prompt_list) {
            // Clear existing options
            while (this.promptTypeSelect.options.length >= 1) {
                this.promptTypeSelect.remove(0);
            }

            // Add None option
            var noneOption = document.createElement('option');
            noneOption.text = 'None';
            noneOption.value = 'None';
            this.promptTypeSelect.add(noneOption);

            // Add prompts from list
            if (prompt_list && prompt_list.length) {
                prompt_list.forEach(lang.hitch(this, function(prompt) {
                    var option = document.createElement('option');
                    option.text = prompt.title;
                    option.value = prompt.text;
                    this.promptTypeSelect.add(option);
                }));
            }
        },

        /**
         * Updates the prompt text area with selected prompt
         * @param {string} promptName Name of selected prompt
         * @param {string} promptText Text content of selected prompt
         */
        updatePromptText: function(promptName, promptText) {
            if (promptName === 'None') {
                this.promptTextArea.value = '';
            } else {
                this.promptTextArea.value = `${promptText}`;
            }
        }
    });
});
