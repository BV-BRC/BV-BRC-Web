/**
 * @module p3/widget/copilot/CopilotSmallWindowContainer
 * @description A widget that provides a small floating window container for the PATRIC Copilot interface.
 * Designed to be a compact version of the chat interface that can be positioned anywhere on the screen.
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/layout/BorderContainer',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/on',
    'dojo/topic',
    './CopilotDisplay',
    './CopilotInput',
    'dojo/dom-construct',
    '../copilot/ChatSessionControllerPanel',
    'dijit/Dialog'
], function(
    declare,
    _WidgetBase,
    BorderContainer,
    lang,
    domClass,
    domStyle,
    on,
    topic,
    CopilotDisplay,
    CopilotInput,
    domConstruct,
    ChatSessionControllerPanel,
    Dialog
) {
    return declare([BorderContainer], {
        baseClass: 'CopilotSmallWindowContainer',

        // Configuration properties
        gutters: false,
        style: 'width: 350px; height: 450px; position: absolute; bottom: 20px; right: 20px;',

        // Controller panel reference
        controllerPanel: null,

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Current session ID
        currentSessionId: null,

        // Header reference
        headerNode: null,

        // Content container reference
        contentContainer: null,

        constructor: function(options) {
            this.inherited(arguments);
            if (options) {
                lang.mixin(this, options);
            }
        },

        postCreate: function() {
            this.inherited(arguments);

            // Create header
            this.headerNode = domConstruct.create('div', {
                className: 'copilotChatHeader',
                style: 'width: 100%; height: 30px; background-color: #f8f8f8; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; padding: 0 10px;'
            }, this.containerNode, 'first');

            // Create left side options button container
            var leftButtonContainer = domConstruct.create('div', {
                className: 'copilotLeftButtonContainer',
                style: 'display: flex;'
            }, this.headerNode);

            // Add options button
            var optionsButton = domConstruct.create('div', {
                className: 'copilotChatOptionsButton',
                style: 'font-size: 17px; width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '☰',
                title: 'Options'
            }, leftButtonContainer);

            // Create title in header with centered style
            var titleNode = domConstruct.create('div', {
                className: 'copilotChatHeaderTitle',
                innerHTML: 'BV-BRC Copilot',
                style: 'font-weight: bold; flex-grow: 1; text-align: center;'
            }, this.headerNode);

            // Create buttons container in header
            var buttonsContainer = domConstruct.create('div', {
                className: 'copilotChatButtonsContainer',
                style: 'display: flex;'
            }, this.headerNode);

            // Create control buttons container
            var controlButtonsContainer = domConstruct.create('div', {
                className: 'copilotControlButtonsContainer',
                style: 'display: flex;padding-right: 15px;'
            }, buttonsContainer);

            // Add expand button
            var expandButton = domConstruct.create('div', {
                className: 'copilotChatExpandButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '↖︎',
                title: 'Expand to large view'
            }, controlButtonsContainer);

            // Add minimize button
            var minimizeButton = domConstruct.create('div', {
                className: 'copilotChatMinimizeButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '_',
                title: 'Minimize (keep session)'
            }, controlButtonsContainer);

            // Add close button
            var closeButton = domConstruct.create('div', {
                className: 'copilotChatCloseButton',
                style: 'width: 24px; height: 24px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '+',
                title: 'New Chat (start a new session)'
            }, controlButtonsContainer);

            // Create content container
            this.contentContainer = domConstruct.create('div', {
                className: 'copilotChatContent',
                style: 'width: 100%; height: calc(100% - 30px); overflow: hidden;'
            }, this.containerNode);
        },

        startup: function() {
            this.inherited(arguments);
            this.resize();
        },

        show: function() {
            domStyle.set(this.containerNode, {
                display: 'block'
            });
        },

        hide: function() {
            domStyle.set(this.containerNode, {
                display: 'none'
            });
        },

        createControllerPanel: function(options) {
            // Create controller panel inside the content container
            this.controllerPanel = new ChatSessionControllerPanel({
                style: "width: 100%; height: 100%;",
                copilotApi: options.copilotApi,
                optionsBar: options.optionsBar
            });

            // Add the control panel to the content container
            this.controllerPanel.placeAt(this.contentContainer);

            // If we have a current session ID, load it
            if (options.currentSessionId) {
                // Use setTimeout to ensure the controller panel is fully initialized
                setTimeout(lang.hitch(this, function() {
                    if (this.controllerPanel) {
                        this.controllerPanel.changeSessionId(options.currentSessionId);
                        console.log('get session messages', options.currentSessionId);
                        options.copilotApi.getSessionMessages(options.currentSessionId).then(lang.hitch(this, function(messages) {
                            if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                                var messages = messages.messages[0].messages;
                                this.controllerPanel.chatStore.addMessages(messages);
                                this.controllerPanel.displayWidget.showMessages(messages);
                            }
                        }));

                        // Set the title if available
                        options.copilotApi.getSessionTitle(options.currentSessionId).then(lang.hitch(this, function(title_response) {
                            var title = title_response.title[0].title;
                            if (this.controllerPanel.titleWidget) {
                                this.controllerPanel.titleWidget.updateTitle(title);
                            }
                        }));
                    }
                }), 500);
            }

            // Setup event handlers for the buttons in the header
            var expandButton = this.headerNode.querySelector('.copilotChatExpandButton');
            var minimizeButton = this.headerNode.querySelector('.copilotChatMinimizeButton');
            var closeButton = this.headerNode.querySelector('.copilotChatCloseButton');
            var optionsButton = this.headerNode.querySelector('.copilotChatOptionsButton');

            if (options.onExpandClick && expandButton) {
                on(expandButton, 'click', options.onExpandClick);
            }

            if (options.onMinimizeClick && minimizeButton) {
                on(minimizeButton, 'click', options.onMinimizeClick);
            }

            if (options.onCloseClick && closeButton) {
                on(closeButton, 'click', options.onCloseClick);
            }

            if (options.onOptionsClick && optionsButton) {
                on(optionsButton, 'click', options.onOptionsClick);
            }

            // Force resize of panel after placement
            // Also get the session ID from the controller panel
            setTimeout(lang.hitch(this, function() {
                if (this.controllerPanel && this.controllerPanel.resize) {
                    this.controllerPanel.resize();
                }
                if (options.onResize) {
                    options.onResize(this.controllerPanel.getSessionId());
                }
                topic.publish('ChatSessionTitleMaxLengthChanged', 30);
            }), 200);

            return this.controllerPanel;
        }
    });
});
