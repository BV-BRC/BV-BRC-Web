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
    'dijit/popup'
], function (
    declare,
    ContentPane,
    Button,
    lang,
    topic,
    TooltipDialog,
    popup
) {
    /**
     * @class ChatSessionOptionsBar
     * @extends {dijit/layout/ContentPane}
     */
    return declare([ContentPane], {
        /** @property {string} style - CSS styling for the options bar */
        style: 'padding: 10px;',

        /**
         * @method createModelDropdown
         * @description Creates and returns the model selection dropdown
         */
        createModelDropdown: function() {
            var selectElement = document.createElement('select');
            selectElement.style.marginRight = '10px';
            selectElement.style.display = 'block';
            selectElement.style.marginBottom = '10px';

            var optionLLAMA31 = document.createElement('option');
            optionLLAMA31.value = 'llama3.1-70b';
            optionLLAMA31.text = 'LLAMA3.1-70B';
            selectElement.add(optionLLAMA31);

            var optionGPT4O = document.createElement('option');
            optionGPT4O.value = 'gpt4o';
            optionGPT4O.text = 'GPT-4o';
            selectElement.add(optionGPT4O);

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
            var label = document.createElement('span');
            label.textContent = 'RAG: ';
            label.style.marginRight = '5px';

            var selectElement = document.createElement('select');
            selectElement.style.marginRight = '10px';

            var optionNone = document.createElement('option');
            optionNone.value = null;
            optionNone.text = 'None';
            selectElement.add(optionNone);

            var optionCancer = document.createElement('option');
            optionCancer.value = 'cancer_papers';
            optionCancer.text = 'Cancer';
            selectElement.add(optionCancer);

            var wrapper = document.createElement('div');
            wrapper.style.display = 'block';
            wrapper.appendChild(label);
            wrapper.appendChild(selectElement);

            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var ragDb = evt.target.value;
                topic.publish('ChatRagDb', ragDb);
            }));

            return wrapper;
        },

        /**
         * @method postCreate
         * @description Sets up the widget after creation
         * Creates and adds the search and create new buttons
         */
        postCreate: function() {
            this.inherited(arguments);

            // Create tooltip dialog for advanced options
            var tooltipDialog = new TooltipDialog({
                style: "width: 250px;",
                content: document.createElement('div')
            });

            // Add model dropdown to tooltip
            var modelLabel = document.createElement('div');
            modelLabel.textContent = 'Model:';
            modelLabel.style.marginBottom = '5px';
            tooltipDialog.containerNode.appendChild(modelLabel);
            tooltipDialog.containerNode.appendChild(this.createModelDropdown());

            // Add RAG dropdown to tooltip
            tooltipDialog.containerNode.appendChild(this.createRagDropdown());

            // Create Advanced Options button
            var advancedButton = new Button({
                label: 'Advanced Options',
                onClick: lang.hitch(this, function() {
                    popup.open({
                        popup: tooltipDialog,
                        around: advancedButton.domNode
                    });
                })
            });
            this.addChild(advancedButton);
             // Listen for clicks outside the tooltip to close it
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (tooltipDialog._rendered && !tooltipDialog.domNode.contains(event.target) && !advancedButton.domNode.contains(event.target)) {
                    popup.close(tooltipDialog);
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
        }
    });
});
