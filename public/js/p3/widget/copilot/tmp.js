/**
 * @module p3/widget/copilot/CopilotSmallWindowContainer
 * @description A container widget for the small chat window view that includes the
 * ChatSessionControllerPanel and handles window controls like expand, minimize, and new session.
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/on',
    'dojo/_base/lang',
    'dojo/topic',
    '../copilot/ChatSessionControllerPanel'
], function(
    declare,
    WidgetBase,
    TemplatedMixin,
    domConstruct,
    domClass,
    domStyle,
    on,
    lang,
    Topic,
    ChatSessionControllerPanel
) {
    return declare([WidgetBase, TemplatedMixin], {
        // Base class for styling
        baseClass: 'CopilotSmallWindowContainer',

        // Template with main container structure
        templateString: '<div class="copilotSmallWindowContainer" data-dojo-attach-point="containerNode"></div>',

        // Properties
        width: '500px',
        height: '600px',
        position: 'fixed',
        top: '10vh',
        right: '50px',

        // Controller panel reference
        controllerPanel: null,

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Current session ID
        currentSessionId: null,

        // Constructor
        constructor: function(opts) {
            lang.mixin(this, opts);
        },

        // Post-create lifecycle method
        postCreate: function() {
            this.inherited(arguments);

            // Apply styling to container
            domStyle.set(this.containerNode, {
                position: this.position,
                width: this.width,
                height: this.height,
                zIndex: 800,
                top: this.top,
                right: this.right,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white',
                display: 'block'
            });

            // Create the controller panel
            this._createControllerPanel();

            // Add control buttons container
            this._addControlButtons();
        },

        _createControllerPanel: function() {
            // Create controller panel inside the div
            this.controllerPanel = new ChatSessionControllerPanel({
                style: "width: 100%; height: 100%;",
                copilotApi: this.copilotApi,
                optionsBar: this.optionsBar
            });

            // Add the control panel to the container
            this.controllerPanel.placeAt(this.containerNode);

            // If we have a current session, load it
            if (this.currentSessionId) {
                // Use setTimeout to ensure the controller panel is fully initialized
                setTimeout(lang.hitch(this, function() {
                    if (this.controllerPanel) {
                        this.controllerPanel.changeSessionId(this.currentSessionId);
                        this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                            if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                                var messages = messages.messages[0].messages;
                                this.controllerPanel.chatStore.addMessages(messages);
                                this.controllerPanel.displayWidget.showMessages(messages);
                            }
                        }));

                        // Set the title if available
                        this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                            var title = title_response.title[0].title;
                            if (this.controllerPanel.titleWidget) {
                                this.controllerPanel.titleWidget.updateTitle(title);
                            }
                        }));
                    }
                }), 500);
            }

            // Force resize of panel after placement
            setTimeout(lang.hitch(this, function() {
                if (this.controllerPanel && this.controllerPanel.resize) {
                    this.controllerPanel.resize();
                }
                this.currentSessionId = this.controllerPanel.getSessionId();
                Topic.publish('ChatSessionTitleMaxLengthChanged', 30);
            }), 200);
        },

        _addControlButtons: function() {
            // Add control buttons container
            var buttonsContainer = domConstruct.create('div', {
                className: 'copilotChatButtonsContainer',
                style: 'position: absolute; top: 5px; right: 5px; z-index: 10000; display: flex;'
            }, this.containerNode);

            // Add expand button
            var expandButton = domConstruct.create('div', {
                className: 'copilotChatExpandButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '↖︎',
                title: 'Expand to large view'
            }, buttonsContainer);

            // Add minimize button
            var minimizeButton = domConstruct.create('div', {
                className: 'copilotChatMinimizeButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%; margin-right: 8px;',
                innerHTML: '_',
                title: 'Minimize (keep session)'
            }, buttonsContainer);

            // Add close button
            var closeButton = domConstruct.create('div', {
                className: 'copilotChatCloseButton',
                style: 'width: 24px; height: 24px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '+',
                title: 'New Chat (start a new session)'
            }, buttonsContainer);

            // Expand button click handler - open large chat and hide small chat
            on(expandButton, 'click', lang.hitch(this, function(evt) {
                this.hide();
                // Signal parent to open large chat
                Topic.publish('CopilotSmallWindow:Expand', {
                    sessionId: this.getSessionId()
                });
                evt.stopPropagation();
            }));

            // Minimize button click handler - just hide the panel
            on(minimizeButton, 'click', lang.hitch(this, function(evt) {
                this.hide();
                // Signal parent that chat was minimized
                Topic.publish('CopilotSmallWindow:Minimize');
                evt.stopPropagation();
            }));

            // Close button click handler - hide panel and reset session
            on(closeButton, 'click', lang.hitch(this, function(evt) {
                // Create a new chat session immediately
                if (this.copilotApi) {
                    this.copilotApi.getNewSessionId().then(lang.hitch(this, function(sessionId) {
                        this.currentSessionId = sessionId;

                        // Reset everything in the controller panel for the new session
                        if (this.controllerPanel) {
                            this.controllerPanel.changeSessionId(sessionId);

                            // Reset input widget and display
                            if (this.controllerPanel.inputWidget) {
                                this.controllerPanel.inputWidget.startNewChat();
                            }
                            if (this.controllerPanel.displayWidget) {
                                this.controllerPanel.displayWidget.startNewChat();
                            }
                            if (this.controllerPanel.titleWidget) {
                                this.controllerPanel.titleWidget.startNewChat(sessionId);
                            }
                        }
                    }));
                }
                evt.stopPropagation();
            }));
        },

        show: function() {
            domStyle.set(this.containerNode, {
                display: 'block'
            });

            if (this.controllerPanel) {
                this.controllerPanel.changeSessionId(this.currentSessionId);
                this.copilotApi.getSessionMessages(this.currentSessionId).then(lang.hitch(this, function(messages) {
                    if (messages.messages && messages.messages.length > 0 && messages.messages[0].messages) {
                        var messages = messages.messages[0].messages;
                        this.controllerPanel.chatStore.addMessages(messages);
                        this.controllerPanel.displayWidget.showMessages(messages);
                    }
                }));

                // Set the title if available
                this.copilotApi.getSessionTitle(this.currentSessionId).then(lang.hitch(this, function(title_response) {
                    if (title_response.title && title_response.title.length > 0 && title_response.title[0].title) {
                        var title = title_response.title[0].title;
                        if (this.controllerPanel.titleWidget) {
                            this.controllerPanel.titleWidget.updateTitle(title);
                        }
                    }
                }));
            }
        },

        hide: function() {
            domStyle.set(this.containerNode, {
                display: 'none'
            });
        },

        setSessionId: function(sessionId) {
            this.currentSessionId = sessionId;
            if (this.controllerPanel) {
                this.controllerPanel.changeSessionId(sessionId);
            }
        },

        getSessionId: function() {
            if (this.controllerPanel) {
                return this.controllerPanel.getSessionId();
            }
            return this.currentSessionId;
        },

        resize: function() {
            if (this.controllerPanel && this.controllerPanel.resize) {
                this.controllerPanel.resize();
            }
        }
    });
});