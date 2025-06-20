/**
 * @module p3/widget/copilot/CopilotFloatingWindow
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
    '../copilot/ChatSessionContainer',
    '../copilot/ChatSessionScrollBar',
    '../copilot/ChatSessionOptionsBar',
    'dijit/Dialog',
    'dojo/fx',
    'dojo/_base/fx',
    'dojo/dnd/Moveable',
    'dojox/layout/ResizeHandle'
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
    ChatSessionContainer,
    ChatSessionScrollBar,
    ChatSessionOptionsBar,
    Dialog,
    fx,
    baseFx,
    Moveable,
    ResizeHandle
) {
    return declare([BorderContainer], {
        baseClass: 'CopilotFloatingWindow',

        // Configuration properties
        gutters: false,
        style: 'width: 1000px; height: 450px; position: relative; bottom: 20px; right: 20px; overflow: hidden;',

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

        // Tracks if model/RAG container is visible
        modelRagVisible: false,

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
                width: '80%',
                height: '70%'
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
                style: 'font-size: 17px; width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8;',
                innerHTML: '☰',
                title: 'Close/Open Sidebar'
            }, leftButtonContainer);

            // Add developer options button
            var devOptionsButton = domConstruct.create('div', {
                className: 'copilotChatDevOptionsButton',
                innerHTML: '⚙',
                title: 'Advanced Options'
            }, leftButtonContainer);

            // Add click handler for developer options button
            on(devOptionsButton, 'click', lang.hitch(this, function() {
                this.modelRagVisible = !this.modelRagVisible;
                topic.publish('toggleModelRagVisibility', this.modelRagVisible);

                // Update the button color based on state
                if (this.modelRagVisible) {
                    domClass.add(devOptionsButton, 'active');
                } else {
                    domClass.remove(devOptionsButton, 'active');
                }
            }));

            // Add Report Issue button
            var reportIssueButton = domConstruct.create('div', {
                className: 'copilotChatReportIssueButton',
                innerHTML: '<i class="fa icon-commenting-o"></i>',
                title: 'Report an issue with the chat session'
            }, leftButtonContainer);

            // Add click handler for report issue button
            on(reportIssueButton, 'click', lang.hitch(this, function() {
                topic.publish('openReportIssueDialog');
                domClass.add(reportIssueButton, 'active');
            }));

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

            // Add minimize button
            var minimizeButton = domConstruct.create('div', {
                className: 'copilotChatMinimizeButton',
                style: 'width: 20px; height: 20px; cursor: pointer; text-align: center; line-height: 20px; background-color: #f8f8f8;margin-right: 2px;',
                innerHTML: 'X',
                title: 'Close'
            }, controlButtonsContainer);

            // Create content container that will house the BorderContainer for main content + options
            this.contentContainer = domConstruct.create('div', {
                className: 'copilotChatContent',
                style: 'width: 100%; height: calc(100% - 30px); overflow: hidden; position: relative;'
            }, this.containerNode);

            // Create a BorderContainer within the content container for layout management
            this.layoutContainer = new BorderContainer({
                design: 'sidebar',
                gutters: true,
                liveSplitters: true,
                style: 'width: 100%; height: 100%;'
            });
            this.layoutContainer.placeAt(this.contentContainer);

            // Create options bar container (initially visible) - positioned on the left
            this.optionsBarContainer = new ContentPane({
                region: 'left',
                splitter: true,
                gutters: false,
                style: 'width: 175px; overflow: hidden; background-color: #ffffff; border: 0px;padding:0px;'
            });
            this.layoutContainer.addChild(this.optionsBarContainer);

            // Create main content area that will house the controller panel
            this.mainContentContainer = new ContentPane({
                region: 'center',
                style: 'border: 0px;'
            });
            this.layoutContainer.addChild(this.mainContentContainer);

            // Start up the layout container to initialize splitters
            this.layoutContainer.startup();

            // Setup drag functionality - use the entire widget as the moveable node
            // but restrict the drag handle to the title area only
            this._moveable = new Moveable(this.domNode, {
                handle: titleNode
            });

            // Add bounds checking to prevent dragging outside viewport
            this._moveable.onMove = lang.hitch(this, function(mover, leftTop) {
                var viewport = {
                    width: window.innerWidth || document.documentElement.clientWidth,
                    height: window.innerHeight || document.documentElement.clientHeight
                };

                var widgetWidth = parseInt(domStyle.get(this.domNode, 'width')) || 650;
                var widgetHeight = parseInt(domStyle.get(this.domNode, 'height')) || 450;

                // Constrain horizontal position
                var newLeft = Math.max(0, Math.min(leftTop.l, viewport.width - widgetWidth));
                // Constrain vertical position
                var newTop = Math.max(0, Math.min(leftTop.t, viewport.height - widgetHeight));

                // Apply the constrained position
                domStyle.set(this.domNode, {
                    left: newLeft + 'px',
                    top: newTop + 'px'
                });

                return false; // Prevent default positioning
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

            // Add resize handle
            var resizeHandle = new ResizeHandle({
                targetId: this.id,
                activeResize: true,
                intermediateChanges: true
            }).placeAt(this.domNode);

            resizeHandle.on('resize', lang.hitch(this, function(e){
                // Force layout recalculation when resizing
                if (this.layoutContainer && this.layoutContainer.resize) {
                    this.layoutContainer.resize();
                }

                // Notify any listeners that the widget has been resized
                if (this.controllerPanel && this.controllerPanel.displayWidget) {
                    this.controllerPanel.displayWidget.resize();
                }
            }));

            // Create a custom resize handle that's more visible and user-friendly
            this.resizeHandleNode = domConstruct.create('div', {
                className: 'copilotResizeHandle',
                style: 'position: absolute; bottom: 0px; right: 0px; width: 16px; height: 16px; cursor: nw-resize; ' +
                       'background-color: transparent; border: 0px; border-bottom-right-radius: 3px; z-index: 1000; ' +
                       'display: flex; align-items: center; justify-content: center; font-size: 12px; background-color: transparent;' +
                       'background-image: url("/public/icon_source/corner_lines.svg"); background-size: 16px; background-position: center; background-repeat: no-repeat;',
                innerHTML: ''
            }, this.domNode);

            // Add mouse events for custom resize functionality
            var isResizing = false;
            var startX, startY, startWidth, startHeight, startLeft, startTop;

            this.own(
                on(this.resizeHandleNode, 'mousedown', lang.hitch(this, function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    isResizing = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startWidth = parseInt(domStyle.get(this.domNode, 'width'));
                    startHeight = parseInt(domStyle.get(this.domNode, 'height'));
                    startLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
                    startTop = parseInt(domStyle.get(this.domNode, 'top') || 0);

                    // Add global mouse events
                    var mouseMoveHandle = on(document, 'mousemove', lang.hitch(this, function(e) {
                        if (!isResizing) return;

                        var deltaX = e.clientX - startX;
                        var deltaY = e.clientY - startY;

                        // Get viewport dimensions
                        var viewport = {
                            width: window.innerWidth || document.documentElement.clientWidth,
                            height: window.innerHeight || document.documentElement.clientHeight
                        };

                        // Calculate proposed new dimensions
                        var proposedWidth = Math.max(300, startWidth + deltaX);  // Minimum width of 300px
                        var proposedHeight = Math.max(200, startHeight + deltaY); // Minimum height of 200px

                        // Get current position
                        var currentLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
                        var currentTop = parseInt(domStyle.get(this.domNode, 'top') || 0);

                        // Constrain width to not exceed viewport boundaries
                        var maxWidth = viewport.width - currentLeft;
                        var newWidth = Math.min(proposedWidth, maxWidth);

                        // Constrain height to not exceed viewport boundaries
                        var maxHeight = viewport.height - currentTop;
                        var newHeight = Math.min(proposedHeight, maxHeight);

                        domStyle.set(this.domNode, {
                            width: newWidth + 'px',
                            height: newHeight + 'px'
                        });

                        // Force layout recalculation
                        if (this.layoutContainer && this.layoutContainer.resize) {
                            this.layoutContainer.resize();
                        }

                        // Notify any listeners that the widget has been resized
                        if (this.controllerPanel && this.controllerPanel.displayWidget) {
                            this.controllerPanel.displayWidget.resize();
                        }
                    }));

                    var mouseUpHandle = on(document, 'mouseup', function(e) {
                        isResizing = false;
                        mouseMoveHandle.remove();
                        mouseUpHandle.remove();
                    });
                }))
            );
        },

        startup: function() {
            this.inherited(arguments);
            this.resize();

            // Add window resize listener to keep widget within bounds
            this._windowResizeHandle = on(window, 'resize', lang.hitch(this, '_constrainToBounds'));
        },

        /**
         * Constrains the widget to stay within viewport boundaries
         */
        _constrainToBounds: function() {
            var viewport = {
                width: window.innerWidth || document.documentElement.clientWidth,
                height: window.innerHeight || document.documentElement.clientHeight
            };

            var widgetWidth = parseInt(domStyle.get(this.domNode, 'width')) || 650;
            var widgetHeight = parseInt(domStyle.get(this.domNode, 'height')) || 450;
            var currentLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
            var currentTop = parseInt(domStyle.get(this.domNode, 'top') || 0);

            // Check if widget extends beyond viewport and adjust position
            var newLeft = Math.max(0, Math.min(currentLeft, viewport.width - widgetWidth));
            var newTop = Math.max(0, Math.min(currentTop, viewport.height - widgetHeight));

            // Also constrain size if needed
            var maxWidth = viewport.width - newLeft;
            var maxHeight = viewport.height - newTop;
            var newWidth = Math.min(widgetWidth, maxWidth);
            var newHeight = Math.min(widgetHeight, maxHeight);

            domStyle.set(this.domNode, {
                left: newLeft + 'px',
                top: newTop + 'px',
                width: newWidth + 'px',
                height: newHeight + 'px'
            });

            // Force layout recalculation
            if (this.layoutContainer && this.layoutContainer.resize) {
                this.layoutContainer.resize();
            }
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
            this.controllerPanel = new ChatSessionContainer({
                style: "width: 100%; height: 100%;",
                copilotApi: options.copilotApi,
                optionsBar: options.optionsBar
            });

            // Place the control panel directly in the main content container
            this.controllerPanel.placeAt(this.mainContentContainer.domNode);

            // Store the options bar reference
            this.optionsBar = options.optionsBar;
            this.copilotApi = options.copilotApi;

            // Initialize the options bar container with its content panes
            if (this.optionsBarContainer && this.optionsBarContainer.getChildren().length === 0) {
                // Create a BorderContainer for the options sidebar to contain the two sections
                this.optionsSidebarContainer = new BorderContainer({
                    gutters: false,
                    style: 'width: 100%; height: 100%;border: 0px;'
                });
                this.optionsSidebarContainer.placeAt(this.optionsBarContainer.domNode);

                // Create top content pane
                if (this.optionsBar) {
                    this.topContentPane = this.optionsBar;
                } else {
                    this.topContentPane = new ChatSessionOptionsBar({
                        region: 'top',
                        style: 'height: 27%; padding: 0px; background-color: #ffffff; overflow-y: auto; margin-bottom: 5px;',
                        copilotApi: this.copilotApi
                    });
                }
                this.optionsSidebarContainer.addChild(this.topContentPane);

                // Create bottom content pane
                this.bottomContentPane = new ChatSessionScrollBar({
                    className: 'optionsBottomSection',
                    region: 'center',
                    style: 'padding: 0px; margin: 0px; height: 73%; border: 0px; background-color: #f0f0f0;',
                    copilotApi: this.copilotApi
                });
                this.optionsSidebarContainer.addChild(this.bottomContentPane);

                // Start up the options sidebar container
                this.optionsSidebarContainer.startup();
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
            var minimizeButton = this.headerNode.querySelector('.copilotChatMinimizeButton');
            var optionsButton = this.headerNode.querySelector('.copilotChatOptionsButton');

            if (options.onMinimizeClick && minimizeButton) {
                on(minimizeButton, 'click', options.onMinimizeClick);
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
                var sidebarWidth = 150;
                var newWidth = currentContainerWidth + sidebarWidth;

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: newWidth
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
                var sidebarWidth = 150;
                var originalWidth = currentContainerWidth - sidebarWidth;

                var anim = baseFx.animateProperty({
                    node: this.domNode,
                    properties: {
                        width: originalWidth
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
            // Clean up the window resize listener
            if (this._windowResizeHandle) {
                this._windowResizeHandle.remove();
                this._windowResizeHandle = null;
            }

            // Clean up the options sidebar container
            if (this.optionsSidebarContainer) {
                this.optionsSidebarContainer.destroyRecursive();
                this.optionsSidebarContainer = null;
            }

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

            // Clean up the custom resize handle
            if (this.resizeHandleNode) {
                domConstruct.destroy(this.resizeHandleNode);
                this.resizeHandleNode = null;
            }

            this.inherited(arguments);
        }
    });
});
