/**
 * @module p3/widget/ChatSessionContainerSidePanel
 * @description A BorderContainer-based widget that extends ChatSessionContainer to provide a side panel interface.
 * Manages chat session display, input, and settings for the side panel view.
 */
define([
    'dojo/_base/declare',
    './ChatSessionContainer',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/Deferred',
    'dojo/topic',
    './CopilotInputSidePanel',
    './CopilotDisplay',
    'dijit/Dialog'
], function(
    declare,
    ChatSessionContainer,
    lang,
    domClass,
    Deferred,
    topic,
    CopilotInputSidePanel,
    CopilotDisplay,
    Dialog
) {
    /**
     * @class ChatSessionContainerSidePanel
     * @extends {ChatSessionContainer}
     *
     * Main widget class that provides side panel chat interface.
     * Handles session display, input, and settings management.
     */
    return declare([ChatSessionContainer], {
        /** @property {Object} selection - Currently selected item data */
        selection: null,

        /** @property {boolean} gutters - Whether to show gutters between regions */
        gutters: false,

        /** @property {boolean} liveSplitters - Enable live updates when dragging splitters */
        liveSplitters: true,

        /** @property {string} style - CSS styling for container dimensions */
        style: 'height: 100%; width: 100%; min-height:',

        /** @property {Object} optionsBar - Reference to options bar widget */
        optionsBar: null,

        /** @property {string} model - Current model */
        model: "RedHatAI/Llama-4-Scout-17B-16E-Instruct-quantized.w4a16",

        /** @property {string} ragDb - Current RAG database */
        ragDb: 'bvbrc_helpdesk',

        /**
         * @constructor
         * Initializes the widget with provided options
         * @param {Object} opts - Configuration options
         */
        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        /**
         * Called after widget creation to set up initial state
         * Adds options bar if provided
         */
        postCreate: function() {
            this.inherited(arguments);
            if (this.optionsBar) {
                this.addChild(this.optionsBar);
            }

            // Subscribe to RAG database changes
            topic.subscribe('ChatRagDb', lang.hitch(this, function(ragDb) {
                this.ragDb = ragDb;
                if (this.inputWidget) {
                    this.inputWidget.setRagDb(ragDb);
                    if (this.inputWidget.setRagButtonLabel) {
                        this.inputWidget.setRagButtonLabel(ragDb);
                    }
                }
            }));
        },

        /**
         * Creates the input widget for the side panel
         * Uses CopilotInputSidePanel instead of default input widget
         * Configures region, styling and required dependencies
         */
        _createInputWidget: function() {
            if (!this.context) {
                this.context = 'grid-container';
            }
            this.inputWidget = new CopilotInputSidePanel({
                region: 'bottom',
                splitter: true,
                style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId,
                context: this.context,
                model: this.model,
                ragDb: this.ragDb
            });
            this.addChild(this.inputWidget);
        },

        _createDisplayWidget: function() {
            // Determine context-specific suggested questions for the empty state
            var suggestedQuestions;
            var ctx = this.context || 'grid-container';
            if (ctx === 'job-manager') {
                suggestedQuestions = [
                    'How do I check the status of my submitted jobs?',
                    'Can I filter jobs by status or date?',
                    'How do I rerun a completed or failed job?',
                    'What do the different job statuses mean?',
                    'How can I download the results of a completed job?'
                ];
            } else if (ctx === 'grid-container') {
                suggestedQuestions = [
                    'How do I filter this table to refine my results?',
                    'How can I download the selected rows?',
                    'What do the columns in this table represent?',
                    'How do I add the selected items to my workspace?',
                    'How can I run an analysis on the selected items?'
                ];
            }

            // Base options for the display widget
            var displayOpts = {
                region: 'center',
                style: 'padding: 0 5px 5px 5px; border: 0; background-color: #ffffff; opacity: 1;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                sessionId: this.sessionId,
                context: 'side-panel'  // Mark this as side panel context
            };

            // Include suggested questions only if we determined a list for the current context
            if (suggestedQuestions) {
                displayOpts.suggestedQuestions = suggestedQuestions;
            }

            this.displayWidget = new CopilotDisplay(displayOpts);
            this.addChild(this.displayWidget);
        },

        /**
         * Creates model selection text display
         * Shows current model and handles click to open settings
         * @param {HTMLElement} currDiv - Container element for text
         */
        _createModelText: function(currDiv) {
            if (!this.settingsDialog) {
                this._createSettingsDialog();
            }

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
                    this.settingsDialog.show();
                })
            }, currDiv);
        },

        /**
         * Creates RAG database selection text display
         * Shows current RAG DB and handles click to open settings
         * @param {HTMLElement} currDiv - Container element for text
         */
        _createRagText: function(currDiv) {
            if (!this.settingsDialog) {
                this._createSettingsDialog();
            }

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
                    this.settingsDialog.show();
                })
            }, currDiv);
        },

        /**
         * Creates settings dialog for model and RAG configuration
         * Sets up dialog with basic content structure
         */
        _createSettingsDialog: function() {
            var contentDiv = domConstruct.create('div', {
                style: 'padding: 10px;'
            });

            domConstruct.create('div', {
                innerHTML: 'Model Settings',
                style: 'font-weight: bold; margin-bottom: 10px;'
            }, contentDiv);

            this.settingsDialog = new Dialog({
                title: "Chat Settings",
                content: contentDiv,
                style: "width: 300px"
            });
        },

        /**
         * Sets up watcher for container selection changes
         * Updates input widget system prompt when selection changes
         */
        _setupContainerWatch: function() {
            this.watch('containerSelection', lang.hitch(this, function(prop, oldVal, selection) {
                if (this.inputWidget) {
                    this.inputWidget.setSystemPromptWithData(selection);
                    this.inputWidget.setCurrentSelection(selection);
                }
            }));
        },

        /**
         * Clears the current selection display
         */
        clearSelection: function() {
            this.set('content', 'No selection');
        },

        /**
         * Displays details for a single selected item
         * Creates HTML content showing item properties
         * @param {Object} item - Selected item data to display
         */
        displaySelection: function(item) {
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">Selected Item:</div>');

            Object.keys(item).forEach(function(key) {
                content.push('<div class="selectionField">' + key + ': ' + item[key] + '</div>');
            });

            content.push('</div>');
            this.set('content', content.join(''));
        },

        /**
         * Displays summary for multiple selected items
         * Shows count of selected items
         * @param {Array} items - Array of selected items
         */
        displayMultipleSelection: function(items) {
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">' + items.length + ' items selected</div>');
            content.push('</div>');
            this.set('content', content.join(''));
        },

        /**
         * Creates settings div container
         * Sets up flex layout for settings content
         */
        _createSettingsDiv: function() {
            var settingsDiv = domConstruct.create('div', {
                style: 'display: flex; flex-direction: row; justify-content: center; margin-top: 10px; cursor: pointer; font-size: 0.9em;'
            }, wrapperDiv);
        }
    });
});