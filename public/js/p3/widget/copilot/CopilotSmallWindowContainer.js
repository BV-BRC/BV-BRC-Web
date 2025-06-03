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
    'dijit/Dialog',
    'dojo/fx',
    'dojo/_base/fx'
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
    Dialog,
    fx,
    baseFx
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

        // Options sidebar state
        optionsSidebarOpen: false,

        // Options sidebar reference
        optionsSidebar: null,

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

            // Create content container that will house the BorderContainer for main content + options
            this.contentContainer = domConstruct.create('div', {
                className: 'copilotChatContent',
                style: 'width: 100%; height: 100%; overflow: hidden; position: relative;'
            }, this.containerNode);

            // Create a BorderContainer within the content container for layout management
            this.layoutContainer = new BorderContainer({
                gutters: false,
                style: 'width: 100%; height: 100%;'
            });
            this.layoutContainer.placeAt(this.contentContainer);

            // Create options bar container (initially hidden) - positioned on the left
            this.optionsBarContainer = new BorderContainer({
                region: 'left',
                splitter: false,
                style: 'width: 150px; overflow: hidden; background-color: #f8f8f8; border-right: 1px solid #ddd; display: none;'
            });
            this.layoutContainer.addChild(this.optionsBarContainer);

            // Create main content area that will house the controller panel
            this.mainContentContainer = new BorderContainer({
                region: 'center',
                gutters: false,
                style: 'width: 100%; height: 93%;'
            });
            this.layoutContainer.addChild(this.mainContentContainer);
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
            // Create controller panel inside the main content container
            this.controllerPanel = new ChatSessionControllerPanel({
                style: "width: 100%; height: 100%;",
                copilotApi: options.copilotApi,
                optionsBar: options.optionsBar
            });

            // Add the control panel to the main content container
            this.controllerPanel.placeAt(this.mainContentContainer.containerNode);

            // Store the options bar reference
            this.optionsBar = options.optionsBar;

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
            } else if (optionsButton) {
                // If no external handler is provided, use our internal toggle function
                on(optionsButton, 'click', lang.hitch(this, 'toggleOptionsBar'));
            }

            // Force resize of panel after placement
            setTimeout(lang.hitch(this, function() {
                /*
                if (this.layoutContainer && this.layoutContainer.resize) {
                    this.layoutContainer.resize();
                }
                */
                if (this.controllerPanel && this.controllerPanel.resize) {
                    this.controllerPanel.resize();
                }
                if (options.onResize) {
                    options.onResize(this.controllerPanel.getSessionId());
                }
                topic.publish('ChatSessionTitleMaxLengthChanged', 30);
            }), 100);

            return this.controllerPanel;
        },

        /**
         * Toggles the options bar open/closed by showing/hiding the container
         */
        toggleOptionsBar: function() {
            if (!this.optionsBarContainer) return;

            // Toggle the state
            this.optionsSidebarOpen = !this.optionsSidebarOpen;

            if (this.optionsSidebarOpen) {
                // Create two divs with random content instead of adding optionsBar widget
                if (this.optionsBarContainer.getChildren().length === 0) {
                    // Create top div (70% height)
                    var topDiv = domConstruct.create('div', {
                        className: 'optionsTopSection',
                        style: 'height: 70%; padding: 10px; background-color: #f0f0f0; border-bottom: 1px solid #ddd; overflow-y: auto;',
                        innerHTML: '<h4>Quick Actions</h4><p>• New conversation</p><p>• Clear history</p><p>• Export chat</p><p>• Settings</p><p>• Help & tutorials</p><p>• Keyboard shortcuts</p><p>• Theme options</p>'
                    }, this.optionsBarContainer.containerNode);

                    // Create bottom div (30% height)
                    var bottomDiv = domConstruct.create('div', {
                        className: 'optionsBottomSection',
                        style: 'height: 30%; padding: 10px; background-color: #e8e8e8; overflow-y: auto;',
                        innerHTML: '<h5>Status</h5><p>Session: Active</p><p>Model: GPT-4</p><p>Tokens: 1,250</p><p>Response time: 1.2s</p>'
                    }, this.optionsBarContainer.containerNode);
                }

                // Show the options bar container
                domStyle.set(this.optionsBarContainer.domNode, {
                    display: 'block'
                });

                // Expand the main container width to accommodate the sidebar
                var currentContainerWidth = parseInt(domStyle.get(this.domNode, 'width') || 350);
                var sidebarWidth = 150;
                var newWidth = currentContainerWidth + sidebarWidth;

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: newWidth,
                        right: parseInt(domStyle.get(this.domNode, 'right') || 20) + sidebarWidth
                    },
                    duration: 300,
                    onEnd: lang.hitch(this, function() {
                        // Force layout recalculation after animation
                        if (this.layoutContainer && this.layoutContainer.resize) {
                            this.layoutContainer.resize();
                        }
                    })
                });
                anim.play();
            } else {
                // Hide the options bar container
                domStyle.set(this.optionsBarContainer.domNode, {
                    display: 'none'
                });

                // Return container to original size
                var currentContainerWidth = parseInt(domStyle.get(this.domNode, 'width') || 350);
                var sidebarWidth = 150;
                var originalWidth = currentContainerWidth - sidebarWidth;

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: originalWidth,
                        right: parseInt(domStyle.get(this.domNode, 'right') || 20) - sidebarWidth
                    },
                    duration: 300,
                    onEnd: lang.hitch(this, function() {
                        // Remove the content divs to clean up
                        var topDiv = this.optionsBarContainer.containerNode.querySelector('.optionsTopSection');
                        var bottomDiv = this.optionsBarContainer.containerNode.querySelector('.optionsBottomSection');
                        if (topDiv) {
                            domConstruct.destroy(topDiv);
                        }
                        if (bottomDiv) {
                            domConstruct.destroy(bottomDiv);
                        }
                        // Force layout recalculation after animation
                        if (this.layoutContainer && this.layoutContainer.resize) {
                            this.layoutContainer.resize();
                        }
                    })
                });
                anim.play();
            }

            // Update the options button appearance when sidebar is open
            var optionsButton = this.headerNode.querySelector('.copilotChatOptionsButton');
            if (optionsButton) {
                if (this.optionsSidebarOpen) {
                    domStyle.set(optionsButton, {
                        color: '#2a7aeb'  // Highlight color when open
                    });
                } else {
                    domStyle.set(optionsButton, {
                        color: 'inherit'  // Return to default color
                    });
                }
            }
        }
    });
});
