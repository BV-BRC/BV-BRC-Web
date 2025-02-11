/**
 * @module p3/widget/ChatSessionOptionsBar
 * @description A ContentPane-based widget that provides action buttons for chat session management.
 * Contains buttons for searching sessions and creating new chat sessions.
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
     */
    return declare([ContentPane], {
        /** @property {string} style - CSS styling for the options bar */
        style: 'padding: 10px;',
        modelList: null,
        ragList: null,

        /**
         * @constructor
         * @param {Object} opts - Configuration options
         * @description Initializes the widget and mixes in provided options
         */
        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        /**
         * @method createModelDropdown
         * @description Creates and returns the model selection dropdown
         */
        createModelDropdown: function() {
            var selectElement = document.createElement('select');
            selectElement.style.marginRight = '10px';
            selectElement.style.display = 'block';
            selectElement.style.marginBottom = '10px';

            if (this.modelList) {
                this.modelList.forEach(lang.hitch(this, function(model) {
                    var option = document.createElement('option');
                    option.value = model.model;
                    option.text = model.model.split('/').reverse()[0];
                    selectElement.add(option);
                }));
            } else {
                var optionLLAMA31 = document.createElement('option');
                // optionLLAMA31.value = 'meta-llama/Meta-Llama-3.1-70B-Instruct';
                // optionLLAMA31.text = 'LLAMA3.1-70B';
                optionLLAMA31.value = 'meta-llama/Llama-3.3-70B-Instruct';
                optionLLAMA31.text = 'LLAMA3.3-70B';
                selectElement.add(optionLLAMA31);

                var optionGPT4O = document.createElement('option');
                optionGPT4O.value = 'gpt4o';
                optionGPT4O.text = 'GPT-4o';
                selectElement.add(optionGPT4O);
            }

            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var model = evt.target.value;
                topic.publish('ChatModel', model);
            }));

            return selectElement;
        },

        /**
         * @method createRagDropdown
         * @description Creates and returns the RAG selection dropdown
         */
        createRagDropdown: function() {
            var selectElement = document.createElement('select');
            selectElement.style.marginRight = '10px';
            selectElement.style.display = 'block';
            selectElement.style.marginBottom = '10px';

            var optionNone = document.createElement('option');
            optionNone.value = 'null';
            optionNone.text = 'None';
            selectElement.add(optionNone);

            if (this.ragList) {
                this.ragList.forEach(lang.hitch(this, function(ragdb) {
                    var option = document.createElement('option');
                    option.value = ragdb.name;
                    option.text = ragdb.name.split('/').reverse()[0];
                    selectElement.add(option);
                }));
            } else {
                var optionNone = document.createElement('option');
                optionNone.value = null;
                optionNone.text = 'None';
                selectElement.add(optionNone);

                var optionCancer = document.createElement('option');
                optionCancer.value = 'cancer_papers';
                optionCancer.text = 'Cancer';
                selectElement.add(optionCancer);
            }

            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var ragDb = evt.target.value;
                topic.publish('ChatRagDb', ragDb);
                if (ragDb != 'null') {
                    topic.publish('changeRagButtonLabel', ragDb);
                } else {
                    topic.publish('changeRagButtonLabel', 'OFF');
                }
            }));

            return selectElement;
        },

        /**
         * @method createPromptsDialog
         * @description Creates and returns the prompts dialog
         */
        createPromptsDialog: function() {
            var promptsDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add prompt type dropdown
            var promptTypeWrapper = document.createElement('div');
            promptTypeWrapper.style.display = 'flex';
            promptTypeWrapper.style.alignItems = 'center';
            promptTypeWrapper.style.marginBottom = '10px';

            var promptTypeLabel = document.createElement('span');
            promptTypeLabel.textContent = 'Select Prompt:';
            promptTypeLabel.style.marginRight = '5px';
            promptTypeWrapper.appendChild(promptTypeLabel);

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

            // Add system prompt input
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
            this.promptTextArea = promptTextArea; // Store reference to promptTextArea
            promptsDialog.containerNode.appendChild(promptTextArea);

            // Add button wrapper div
            var buttonWrapper = document.createElement('div');
            buttonWrapper.style.display = 'flex';
            buttonWrapper.style.gap = '10px';

            // Add apply button
            /*
            var applyButton = document.createElement('button');
            applyButton.textContent = 'Apply Prompt';
            applyButton.style.flex = '1';
            applyButton.addEventListener('click', lang.hitch(this, function() {
                var systemPrompt = promptTextArea.value;
                topic.publish('ChatSystemPrompt', systemPrompt);
            }));
            buttonWrapper.appendChild(applyButton);
            */

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
         * @method createPromptNameDialog
         * @description Creates and returns a dialog for naming a prompt
         * @returns {Dialog} The prompt naming dialog
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

            // var input = promptNameDialog.promptNameInput;

            // Create button container
            var buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.marginTop = '20px';
            buttonContainer.style.gap = '10px';

            // Save button
            var saveButton = document.createElement('button');
            saveButton.innerHTML = "Save";
            saveButton.onclick = lang.hitch(this, function() {
                promptNameDialog.hide();
                this.copilotApi.savePrompt(input.value, this.promptTextArea.value).then(lang.hitch(this, function(response) {
                    this.resetPromptList().then(lang.hitch(this, function() {
                        this.updatePromptText(input.value, this.promptTextArea.value);
                        // Select the prompt option matching the promptName after list is updated
                        for (var i = 0; i < this.promptTypeSelect.options.length; i++) {
                            if (this.promptTypeSelect.options[i].text === input.value) {
                                this.promptTypeSelect.selectedIndex = i;
                                break;
                            }
                        }
                    }));
                }));
            });
            // Cancel button
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
         * @method postCreate
         * @description Sets up the widget after creation
         * Creates and adds the search and create new buttons
         */
        postCreate: function() {
            this.inherited(arguments);

            // Create tooltip dialog for advanced options
            var optionsDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add model dropdown to tooltip
            var modelLabel = document.createElement('div');
            modelLabel.textContent = 'Model:';
            modelLabel.style.marginBottom = '5px';
            optionsDialog.containerNode.appendChild(modelLabel);
            this.modelDropdown = this.createModelDropdown();
            optionsDialog.containerNode.appendChild(this.modelDropdown);

            // Add RAG dropdown to tooltip
            var ragLabel = document.createElement('div');
            ragLabel.textContent = 'RAG:';
            ragLabel.style.marginBottom = '5px';
            optionsDialog.containerNode.appendChild(ragLabel);
            this.ragDropdown = this.createRagDropdown();
            optionsDialog.containerNode.appendChild(this.ragDropdown);
            // optionsDialog.containerNode.appendChild(this.createRagDropdown());

            // Create prompts dialog
            var promptsDialog = this.createPromptsDialog();

            // Create Prompts button
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

            // Create Options button
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
             // Listen for clicks outside the tooltip to close it
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (optionsDialog._rendered && !optionsDialog.domNode.contains(event.target) && !modelButton.domNode.contains(event.target)) {
                    popup.close(optionsDialog);
                    modelButton.visible = false;
                }
                if (promptsDialog._rendered && !promptsDialog.domNode.contains(event.target) && !promptsButton.domNode.contains(event.target)) {
                    popup.close(promptsDialog);
                }
            }));
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

            // Create 'Create New' button
            this.createNewButton = new Button({
                label: 'New Chat',
                onClick: lang.hitch(this, function() {
                    // Publish event to create new chat session
                    topic.publish('createNewChatSession');
                })
            });
            this.addChild(this.createNewButton);

            // get user prompts
            this.resetPromptList();

            // set model to first option in model dropdown
            topic.subscribe('SetInitialChatModel', lang.hitch(this, function() {
                topic.publish('ChatModel', this.modelDropdown.options[0].value);
            }));
        },
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

        updatePromptList: function(prompt_list) {
            // Clear existing options except the default 'None' option
            while (this.promptTypeSelect.options.length >= 1) {
                this.promptTypeSelect.remove(0);
            }

            var noneOption = document.createElement('option');
            noneOption.text = 'None';
            noneOption.value = 'None';
            this.promptTypeSelect.add(noneOption);
            // Add new options from prompt_list
            if (prompt_list && prompt_list.length) {
                prompt_list.forEach(lang.hitch(this, function(prompt) {
                    var option = document.createElement('option');
                    option.text = prompt.title;
                    option.value = prompt.text;
                    this.promptTypeSelect.add(option);
                }));
            }
        },

        updatePromptText: function(promptName, promptText) {
            if (promptName === 'None') {
                this.promptTextArea.value = '';
            } else {
                this.promptTextArea.value = `${promptText}`;
            }
        }
    });
});
