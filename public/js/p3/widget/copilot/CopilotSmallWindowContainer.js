/**
 * @module p3/widget/copilot/CopilotSmallWindowContainer
 * @description A widget that provides a small floating window container for the PATRIC Copilot interface.
 * Designed to be a compact version of the chat interface that can be positioned anywhere on the screen.
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'dojo/_base/lang',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/on',
    'dojo/topic',
    './CopilotDisplay',
    './CopilotInput',
    'dojo/dom-construct',
    '../copilot/ChatSessionControllerPanel',
    '../copilot/ChatSessionScrollBarSmallWindow',
    '../copilot/ChatSessionOptionsBarSmallWindow',
    'dijit/Dialog',
    'dojo/fx',
    'dojo/_base/fx',
    'dojo/dnd/Moveable'
], function(
    declare,
    _WidgetBase,
    BorderContainer,
    ContentPane,
    lang,
    domClass,
    domStyle,
    on,
    topic,
    CopilotDisplay,
    CopilotInput,
    domConstruct,
    ChatSessionControllerPanel,
    ChatSessionScrollBar,
    ChatSessionOptionsBar,
    Dialog,
    fx,
    baseFx,
    Moveable
) {
    return declare([BorderContainer], {
        baseClass: 'CopilotSmallWindowContainer',

        // Configuration properties
        gutters: false,
        style: 'width: 1000px; height: 450px; position: absolute; bottom: 20px; right: 20px; overflow: hidden;',

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

        // Options sidebar state - start as open by default
        optionsSidebarOpen: true,

        // Options sidebar reference
        optionsSidebar: null,

        // Moveable reference for cleanup
        _moveable: null,

        // Top content pane reference for options sidebar
        topContentPane: null,

        // Bottom content pane reference for options sidebar
        bottomContentPane: null,

        constructor: function(options) {
            this.inherited(arguments);
            if (options) {
                lang.mixin(this, options);
            }
        },

        postCreate: function() {
            this.inherited(arguments);

            // Ensure the initial width is properly applied
            domStyle.set(this.domNode, {
                width: '650px',
                height: '600px'
            });

            // Create header
            this.headerNode = domConstruct.create('div', {
                className: 'copilotChatHeader',
                style: 'width: 100%; height: 30px; background-color: #f8f8f8; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; padding: 0 10px; cursor: move;'
            }, this.containerNode, 'first');

            // Create left side options button container FIRST
            var leftButtonContainer = domConstruct.create('div', {
                className: 'copilotLeftButtonContainer',
                style: 'display: flex;'
            }, this.headerNode);

            // Add options button to the left container
            var optionsButton = domConstruct.create('div', {
                className: 'copilotChatOptionsButton',
                style: 'font-size: 17px; width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8; border-radius: 50%;',
                innerHTML: '☰',
                title: 'Options'
            }, leftButtonContainer);

            // Create draggable area (the title area that will be the drag handle) SECOND
            var titleNode = domConstruct.create('div', {
                className: 'copilotChatHeaderTitle copilotDragHandle',
                innerHTML: 'BV-BRC Copilot',
                style: 'font-weight: bold; flex-grow: 1; text-align: center; cursor: move; user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;'
            }, this.headerNode);

            // Create buttons container in header THIRD (on the right)
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
                style: 'width: 100%; height: calc(100% - 30px); overflow: hidden; position: relative;'
            }, this.containerNode);

            // Create a BorderContainer within the content container for layout management
            this.layoutContainer = new BorderContainer({
                gutters: false,
                style: 'width: 100%; height: 100%;'
            });
            this.layoutContainer.placeAt(this.contentContainer);

            // Create options bar container (initially visible) - positioned on the left
            this.optionsBarContainer = new BorderContainer({
                region: 'left',
                splitter: false,
                style: 'width: 150px; overflow: hidden; background-color: #f8f8f8; border-right: 1px solid #ddd;'
            });
            this.layoutContainer.addChild(this.optionsBarContainer);

            // Create main content area that will house the controller panel
            this.mainContentContainer = new BorderContainer({
                region: 'center',
                gutters: false
            });
            this.layoutContainer.addChild(this.mainContentContainer);

            // Setup drag functionality - use the entire widget as the moveable node
            // but restrict the drag handle to the title area only
            this._moveable = new Moveable(this.domNode, {
                handle: titleNode
            });

            // Optional: Add visual feedback when dragging starts/stops
            this._moveable.onMoveStart = lang.hitch(this, function(mover) {
                domClass.add(this.domNode, 'copilotDragging');
                domStyle.set(this.headerNode, 'background-color', '#e8e8e8');
            });

            this._moveable.onMoveStop = lang.hitch(this, function(mover) {
                domClass.remove(this.domNode, 'copilotDragging');
                domStyle.set(this.headerNode, 'background-color', '#f8f8f8');
            });
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
                region: 'center',
                style: "width: 100%; height: 100%;",
                copilotApi: options.copilotApi,
                optionsBar: options.optionsBar
            });

            // Add the control panel to the main content container using addChild
            this.mainContentContainer.addChild(this.controllerPanel);

            // Store the options bar reference
            this.optionsBar = options.optionsBar;
            this.copilotApi = options.copilotApi;

            // Initialize the options bar container with its content panes
            if (this.optionsBarContainer && this.optionsBarContainer.getChildren().length === 0) {
                // Create top content pane
                this.topContentPane = new ChatSessionOptionsBar({
                    className: 'optionsTopSection',
                    region: 'top',
                    style: 'height: 20%; padding: 5px; background-color: #e8e8e8; overflow-y: auto;',
                    copilotApi: this.copilotApi
                });
                this.optionsBarContainer.addChild(this.topContentPane);

                // Create bottom content pane
                this.bottomContentPane = new ChatSessionScrollBar({
                    className: 'optionsBottomSection',
                    region: 'center',
                    style: 'padding: 0px; margin: 0px; height: 70%; border: 0px solid grey; background-color: #f0f0f0; border-bottom: 1px solid #ddd;',
                    copilotApi: this.copilotApi
                });
                this.optionsBarContainer.addChild(this.bottomContentPane);
            }

            // Set initial options button appearance to show it's active
            var optionsButton = this.headerNode.querySelector('.copilotChatOptionsButton');
            if (optionsButton) {
                domStyle.set(optionsButton, {
                    color: '#2a7aeb'  // Highlight color when open by default
                });
            }

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
                this.layoutContainer.resize();
                if (options.onResize) {
                    options.onResize(this.controllerPanel.getSessionId());
                }
                topic.publish('ChatSessionTitleMaxLengthChanged', 60);
            }), 200);

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
                // Show the options bar container
                domStyle.set(this.optionsBarContainer.domNode, {
                    display: 'block'
                });

                // Get current position and dimensions
                var currentContainerWidth = parseInt(domStyle.get(this.domNode, 'width') || 650);
                var currentLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
                var sidebarWidth = 150;
                var newWidth = currentContainerWidth + sidebarWidth;
                var newLeft = currentLeft - sidebarWidth; // Move left to keep right side fixed

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: newWidth,
                        left: newLeft
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

                // Get current position and dimensions
                var currentContainerWidth = parseInt(domStyle.get(this.domNode, 'width') || 650);
                var currentLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
                var sidebarWidth = 150;
                var originalWidth = currentContainerWidth - sidebarWidth;
                var originalLeft = currentLeft + sidebarWidth; // Move right to keep right side fixed

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: originalWidth,
                        left: originalLeft
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
        },

        destroy: function() {
            // Clean up the content panes
            if (this.topContentPane) {
                this.topContentPane.destroyRecursive();
                this.topContentPane = null;
            }
            if (this.bottomContentPane) {
                this.bottomContentPane.destroyRecursive();
                this.bottomContentPane = null;
            }

            // Clean up the moveable when the widget is destroyed
            if (this._moveable) {
                this._moveable.destroy();
                this._moveable = null;
            }
            this.inherited(arguments);
        }
    });
});
