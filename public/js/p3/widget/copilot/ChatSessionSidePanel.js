define([
    'dojo/_base/declare',
    './ChatSessionContainer',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/Deferred',
    'dojo/topic',
    './CopilotInputSidePanel',
    'dijit/Dialog'
], function(
    declare,
    ChatSessionContainer,
    lang,
    domClass,
    Deferred,
    topic,
    CopilotInputSidePanel,
    Dialog
) {
    return declare([ChatSessionContainer], {
        selection: null,
        gutters: false,
        liveSplitters: true,
        style: 'height: 100%; width: 100%;',
        optionsBar: null,

        constructor: function(opts) {
            this.inherited(arguments);
            lang.mixin(this, opts);
        },

        postCreate: function() {
            this.inherited(arguments);
            if (this.optionsBar) {
                this.addChild(this.optionsBar);
            }
        },

        _createInputWidget: function() {
            // Create our custom input widget instead
            this.inputWidget = new CopilotInputSidePanel({
                region: 'bottom',
                splitter: true,
                style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',
                copilotApi: this.copilotApi,
                chatStore: this.chatStore,
                displayWidget: this.displayWidget,
                sessionId: this.sessionId
            });
            this.addChild(this.inputWidget);
        },

        _createModelText: function(currDiv) {
            // Create settings dialog if it doesn't exist
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

        _createRagText: function(currDiv) {
            // Create settings dialog if it doesn't exist
            if (!this.settingsDialog) {
                this._createSettingsDialog();
            }

            this.ragText = domConstruct.create('div', {
                innerHTML: 'RAG: OFF',
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

        _createSettingsDialog: function() {
            // Create dialog content
            var contentDiv = domConstruct.create('div', {
                style: 'padding: 10px;'
            });

            // Add model and RAG settings to dialog
            domConstruct.create('div', {
                innerHTML: 'Model Settings',
                style: 'font-weight: bold; margin-bottom: 10px;'
            }, contentDiv);

            // Create the dialog
            this.settingsDialog = new Dialog({
                title: "Chat Settings",
                content: contentDiv,
                style: "width: 300px"
            });
        },

        _setupContainerWatch: function() {
            this.watch('containerSelection', lang.hitch(this, function(prop, oldVal, selection) {
                if (this.inputWidget) {
                    this.inputWidget.setSystemPromptWithData(selection);
                }
            }));
        },

        clearSelection: function() {
            // Clear the display
            this.set('content', 'No selection');
        },

        displaySelection: function(item) {
            // Display single item details
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">Selected Item:</div>');

            // Add item properties you want to display
            Object.keys(item).forEach(function(key) {
                content.push('<div class="selectionField">' + key + ': ' + item[key] + '</div>');
            });

            content.push('</div>');
            this.set('content', content.join(''));
        },

        displayMultipleSelection: function(items) {
            // Display multiple items summary
            var content = ['<div class="selectionPane">'];
            content.push('<div class="selectionTitle">' + items.length + ' items selected</div>');
            // Add any summary information you want to display
            content.push('</div>');
            this.set('content', content.join(''));
        },

        _createSettingsDiv: function() {
            var settingsDiv = domConstruct.create('div', {
                style: 'display: flex; flex-direction: row; justify-content: center; margin-top: 10px; cursor: pointer; font-size: 0.9em;'
            }, wrapperDiv);
        }
    });
});