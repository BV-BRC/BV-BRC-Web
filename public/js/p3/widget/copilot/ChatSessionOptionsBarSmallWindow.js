/**
 * @module BasicChatOptionsWidget
 * @description A basic widget template extending ChatSessionOptionsBar
 * Provides a simplified starting point for creating chat option widgets
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/dom-construct',
    'p3/widget/copilot/ChatSessionOptionsBar',
    'p3/widget/copilot/CopilotApi',
    'dijit/popup',
    'dijit/form/CheckBox',
    'dojo/dom-style'
], function (
    declare,
    lang,
    topic,
    domConstruct,
    ChatSessionOptionsBar,
    CopilotAPI,
    popup,
    CheckBox,
    domStyle
) {
    /**
     * @class BasicChatOptionsWidget
     * @extends {p3/widget/copilot/ChatSessionOptionsBar}
     *
     * A basic template widget that extends ChatSessionOptionsBar
     * Customize this template for your specific needs
     */
    return declare([ChatSessionOptionsBar], {

        /** @property {string} baseClass - CSS class for styling */
        baseClass: 'basicChatOptionsWidget',

        /** @property {string} title - Widget title */
        title: 'Basic Chat Options',

        /** @property {Object} customOptions - Custom configuration options */
        customOptions: null,

        /** @property {Object} copilotApi - Reference to CopilotAPI instance */
        copilotApi: null,

        /** @property {Array} modelList - Available models list */
        modelList: null,

        /** @property {Array} ragList - Available RAG databases list */
        ragList: null,

        /** @property {Object} pageContentToggle - CheckBox for page content functionality */
        pageContentToggle: null,

        /** @property {boolean} helpdeskSelected - Tracks if helpdesk button is selected */
        helpdeskSelected: false,

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

            // Create container for text buttons
            var buttonsContainer = domConstruct.create('div', {
                style: 'display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; margin-top: 10px; font-size: 0.9em; padding-left: 5px;'
            }, this.containerNode);

            // Add Model text display with hover effects
            this.modelText = domConstruct.create('div', {
                innerHTML: 'Model: Loading...',
                style: 'display: block; width: 90%; margin: 0px; padding: 2px 0; font-size: 14px; font-weight: 7; color: #374151; background: #f8f9fa; border: 4px solid #e3e8ea; border-radius: 999px; text-align: center; box-shadow: none; cursor: pointer; transition: background 0.2s, border 0.2s; margin-bottom: 3px;',
                onmouseover: function(evt) {
                    evt.target.style.background = '#e3e8ea';
                },
                onmouseout: function(evt) {
                    evt.target.style.background = '#f8f9fa';
                },
                onclick: lang.hitch(this, function() {
                    topic.publish('modelButtonPressed', this.modelText, ['below']);
                })
            }, buttonsContainer);

            // Add RAG text display with hover effects
            this.ragText = domConstruct.create('div', {
                innerHTML: 'RAG: Loading...',
                style: 'display: block; width: 90%; margin: 0px; padding: 2px 0; font-size: 14px; font-weight: 7; color: #374151; background: #f8f9fa; border: 4px solid #e3e8ea; border-radius: 999px; text-align: center; box-shadow: none; cursor: pointer; transition: background 0.2s, border 0.2s; margin-bottom: 3px;',
                onmouseover: function(evt) {
                    evt.target.style.background = '#e3e8ea';
                },
                onmouseout: function(evt) {
                    evt.target.style.background = '#f8f9fa';
                },
                onclick: lang.hitch(this, function() {
                    topic.publish('ragButtonPressed', this.ragText, ['below']);
                })
            }, buttonsContainer);

            // Add Helpdesk button with hover effects
            this.helpdeskButton = domConstruct.create('div', {
                innerHTML: 'Ask Helpdesk?',
                style: 'display: block; width: 90%; margin: 0px; padding: 2px 0; font-size: 14px; font-weight: 7; color: #374151; background: #f8f9fa; border: 4px solid #e3e8ea; border-radius: 999px; text-align: center; box-shadow: none; cursor: pointer; transition: background 0.2s, border 0.2s; margin-bottom: 3px;',
                onmouseover: lang.hitch(this, function(evt) {
                    if (!this.helpdeskSelected) {
                        evt.target.style.background = '#e3e8ea';
                    }
                }),
                onmouseout: lang.hitch(this, function(evt) {
                    if (!this.helpdeskSelected) {
                        evt.target.style.background = '#f8f9fa';
                    }
                }),
                onclick: lang.hitch(this, function() {
                    this.helpdeskSelected = !this.helpdeskSelected;
                    if (this.helpdeskSelected) {
                        domStyle.set(this.helpdeskButton, {
                            background: '#2a7aeb',
                            color: '#ffffff'
                        });
                        // Publish the helpdesk RAG selection
                        topic.publish('ChatRagDb', 'bvbrc_helpdesk');
                    } else {
                        domStyle.set(this.helpdeskButton, {
                            background: '#f8f9fa',
                            color: '#374151'
                        });
                        // Publish null RAG selection
                        topic.publish('ChatRagDb', 'null');
                    }
                })
            }, buttonsContainer);

            // Add New Chat button with hover effects
            this.newChatButton = domConstruct.create('div', {
                innerHTML: 'New Chat',
                style: 'display: block; width: 90%; margin: 0px; padding: 2px 0; font-size: 14px; font-weight: 7; color: #374151; background: #f8f9fa; border: 4px solid #e3e8ea; border-radius: 999px; text-align: center; box-shadow: none; cursor: pointer; transition: background 0.2s, border 0.2s; margin-bottom: 3px;',
                onmouseover: function(evt) {
                    evt.target.style.background = '#e3e8ea';
                },
                onmouseout: function(evt) {
                    evt.target.style.background = '#f8f9fa';
                },
                onclick: lang.hitch(this, function() {
                    // Temporarily change button color
                    domStyle.set(this.newChatButton, {
                        background: '#2a7aeb',
                        color: '#ffffff'
                    });

                    // Create a new chat session immediately
                    if (this.copilotApi) {
                        // Publish the createNewChatSession topic
                        topic.publish('createNewChatSession');

                        // Publish reloadUserSessions to remove session highlight
                        topic.publish('reloadUserSessions');

                        // Revert button color after a short delay
                        setTimeout(lang.hitch(this, function() {
                            domStyle.set(this.newChatButton, {
                                background: '#f8f9fa',
                                color: '#374151'
                            });
                        }), 500);
                    }
                })
            }, buttonsContainer);

            /*
            // Add container for the "Ask about this page" toggle switch and label
            var toggleContainer = domConstruct.create('div', {
                style: 'display: flex; align-items: center; margin-top: 5px; padding-left: 5px;'
            }, buttonsContainer);

            // Add label for the page content toggle
            var toggleLabel = domConstruct.create('span', {
                innerHTML: 'Ask about this page',
                style: 'margin-right: 5px; cursor: pointer; font-size: 0.9em;',
                title: 'Sends page content to help answer your question.',
                onclick: lang.hitch(this, function() {
                    // Toggle the checkbox when label is clicked
                    this.pageContentToggle.set('checked', !this.pageContentToggle.get('checked'));
                    topic.publish('pageContentToggleChanged', this.pageContentToggle.get('checked'));
                })
            }, toggleContainer);

            // Create the page content toggle switch
            this.pageContentToggle = new CheckBox({
                checked: false,
                style: 'cursor: pointer;',
                title: 'Sends page content to help answer your question.',
                onChange: lang.hitch(this, function(checked) {
                    // Publish topic when toggle state changes
                    topic.publish('pageContentToggleChanged', checked);
                })
            });
            this.pageContentToggle.placeAt(toggleContainer);

            topic.subscribe('pageContentToggleStateChange', lang.hitch(this, function(checked) {
                // Handle external changes to page content toggle state
                this.pageContentToggle.set('checked', checked);
            }));
            */

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