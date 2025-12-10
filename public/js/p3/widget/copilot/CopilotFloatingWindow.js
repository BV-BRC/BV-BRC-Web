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
    'dojox/layout/ResizeHandle',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/request',
    '../../util/PathJoin',
    'dojo/dom'
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
    ResizeHandle,
    TooltipDialog,
    popup,
    xhr,
    PathJoin,
    dom
) {
    return declare([BorderContainer], {
        baseClass: 'CopilotFloatingWindow',

        // Configuration properties
        gutters: false,

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

        // Controls the height distribution between the top and bottom panes of the options sidebar.
        //   Value should be between 0 and 1 where 0.3 = 30% of the sidebar height for the top pane.
        //   Change this value (or pass it in via the widget options) to alter the relative heights.
        topPaneHeightPercent: 0.1,

        // Advanced options dialog reference
        advancedOptionsDialog: null,

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
                className: 'copilotChatHeader'
            }, this.containerNode, 'first');

            // Create left side options button container FIRST
            var leftButtonContainer = domConstruct.create('div', {
                className: 'copilotLeftButtonContainer'
            }, this.headerNode);

            // Add options button to the left container
            var optionsButton = domConstruct.create('div', {
                className: 'copilotChatOptionsButton',
                innerHTML: '☰',
                title: 'Close/Open Sidebar'
            }, leftButtonContainer);

            // Add advanced options button (now visible and positioned correctly)
            var advancedOptionsButton = domConstruct.create('div', {
                className: 'copilotChatDevOptionsButton',
                innerHTML: '⚙',
                title: 'Advanced Options'
            }, leftButtonContainer);

            // Create advanced options dialog
            this.advancedOptionsDialog = this.createAdvancedOptionsDialog();

            // Add click handler for advanced options button
            on(advancedOptionsButton, 'click', lang.hitch(this, function(evt) {
                evt.stopPropagation();
                if (this.advancedOptionsDialog.visible) {
                    popup.close(this.advancedOptionsDialog);
                    this.advancedOptionsDialog.visible = false;
                    domClass.remove(advancedOptionsButton, 'active');
                } else {
                    setTimeout(lang.hitch(this, function() {
                        popup.open({
                            popup: this.advancedOptionsDialog,
                            around: advancedOptionsButton,
                            orient: ['below']
                        });
                        this.advancedOptionsDialog.visible = true;
                        domClass.add(advancedOptionsButton, 'active');
                    }), 100);
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

            // Handle clicks outside dialog to close it
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (this.advancedOptionsDialog && this.advancedOptionsDialog._rendered &&
                    !this.advancedOptionsDialog.domNode.contains(event.target) &&
                    !advancedOptionsButton.contains(event.target)) {
                    popup.close(this.advancedOptionsDialog);
                    this.advancedOptionsDialog.visible = false;
                    domClass.remove(advancedOptionsButton, 'active');
                }
            }));

            // Create draggable area (the title area that will be the drag handle) SECOND
            var titleNode = domConstruct.create('div', {
                className: 'copilotChatHeaderTitle copilotDragHandle',
                innerHTML: 'BV-BRC Copilot - BETA'
            }, this.headerNode);

            // Create buttons container in header THIRD (on the right)
            var buttonsContainer = domConstruct.create('div', {
                className: 'copilotChatButtonsContainer'
            }, this.headerNode);

            // Create control buttons container
            var controlButtonsContainer = domConstruct.create('div', {
                className: 'copilotControlButtonsContainer'
            }, buttonsContainer);

            // Add info button
            var infoButton = domConstruct.create('div', {
                className: 'copilotChatInfoButton',
                innerHTML: '<i class="fa icon-info-circle"></i>',
                title: 'Copilot Overview'
            }, controlButtonsContainer);

            // Add click handler for info button
            on(infoButton, 'click', lang.hitch(this, function(evt) {
                evt.stopPropagation();
                this.showOverviewDialog();
            }));

            // Add minimize button
            var minimizeButton = domConstruct.create('div', {
                className: 'copilotChatMinimizeButton',
                innerHTML: 'X',
                title: 'Close'
            }, controlButtonsContainer);

            // Create content container that will house the BorderContainer for main content + options
            this.contentContainer = domConstruct.create('div', {
                className: 'copilotChatContent'
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

            // Create comprehensive resize handles for all sides and corners
            this._createResizeHandles();
        },

        /**
         * Creates the advanced options dialog with text size functionality
         */
        createAdvancedOptionsDialog: function() {
            var advancedOptionsDialog = new TooltipDialog({
                style: "width: 200px;",
                content: document.createElement('div')
            });

            // Add Text Size section
            var textSizeContainer = domConstruct.create('div', {
                style: 'display: flex; align-items: center; gap: 10px; padding: 10px;'
            }, advancedOptionsDialog.containerNode);

            domConstruct.create('span', {
                innerHTML: 'Text Size:',
                style: 'white-space: nowrap; font-size: 14px;'
            }, textSizeContainer);

            // Load text size from localStorage or use default value of 14
            var savedTextSize = localStorage.getItem('copilot-text-size');
            var initialTextSize = savedTextSize ? parseInt(savedTextSize) : 14;

            // Ensure the value is within valid range
            if (initialTextSize < 1 || initialTextSize > 100) {
                initialTextSize = 14;
            }

            var textSizeInput = domConstruct.create('input', {
                type: 'number',
                value: initialTextSize,
                min: 1,
                max: 100,
                style: 'width: 60px; padding: 2px; font-size: 12px;'
            }, textSizeContainer);

            // Add change handler for text size
            on(textSizeInput, 'change', function(evt) {
                var newSize = parseInt(evt.target.value);
                if (newSize >= 1 && newSize <= 100) {
                    // Save to localStorage
                    localStorage.setItem('copilot-text-size', newSize.toString());
                    topic.publish('chatTextSizeChanged', newSize);
                }
            });

            // Publish the initial text size if it was saved
            if (savedTextSize) {
                setTimeout(function() {
                    topic.publish('chatTextSizeChanged', initialTextSize);
                }, 100);
            }

            return advancedOptionsDialog;
        },

                        /**
         * Shows the overview dialog using extracted AppBase help logic
         */
        showOverviewDialog: function() {
            // If dialog already exists and is open, just bring it to front
            if (this.overviewDialog && this.overviewDialog.open) {
                return;
            }

            // Load the help document (extracted from AppBase.gethelp)
            var docsServiceURL = window.App.docsServiceURL;
            var applicationHelp = 'quick_references/copilot/overview.md';

            var helprequest = xhr.get(PathJoin(docsServiceURL, applicationHelp), {
                handleAs: 'text'
            });

            helprequest.then(lang.hitch(this, function(data) {
                // Process the data (same as AppBase)
                data = data.replace('<img src="../../_static/patric_logo.png" class="logo" />', '');
                var help_doc = domConstruct.toDom(data);
                var help_text = help_doc || domConstruct.toDom('<div>Help text missing</div>');

                // Create the dialog (same pattern as AppBase)
                this.overviewDialog = new Dialog({
                    title: 'BV-BRC Copilot Overview',
                    content: help_text,
                    'class': 'helpModal',
                    draggable: true,
                    style: 'max-width: 600px;'
                });

                this.overviewDialog.show();

            }), lang.hitch(this, function(error) {
                // Handle error case
                console.error('Failed to load copilot overview:', error);

                this.overviewDialog = new Dialog({
                    title: 'BV-BRC Copilot Overview',
                    content: domConstruct.toDom('<div>Unable to load overview content. Please check that copilot/overview.md exists.</div>'),
                    'class': 'helpModal',
                    draggable: true,
                    style: 'max-width: 400px;'
                });

                this.overviewDialog.show();
            }));
        },

        /**
         * Creates resize handles for all sides and corners of the floating window
         */
        _createResizeHandles: function() {
            // Define the resize handle configurations
            var handles = [
                // Corners
                { className: 'copilot-resize-nw', cursor: 'nw-resize', position: { top: '-3px', left: '-3px' }, directions: ['n', 'w'] },
                { className: 'copilot-resize-ne', cursor: 'ne-resize', position: { top: '-3px', right: '-3px' }, directions: ['n', 'e'] },
                { className: 'copilot-resize-sw', cursor: 'sw-resize', position: { bottom: '-3px', left: '-3px' }, directions: ['s', 'w'] },
                { className: 'copilot-resize-se', cursor: 'se-resize', position: { bottom: '-3px', right: '-3px' }, directions: ['s', 'e'] },
                // Sides
                { className: 'copilot-resize-n', cursor: 'n-resize', position: { top: '-3px', left: '10px', right: '10px' }, directions: ['n'] },
                { className: 'copilot-resize-s', cursor: 's-resize', position: { bottom: '-3px', left: '10px', right: '10px' }, directions: ['s'] },
                { className: 'copilot-resize-w', cursor: 'w-resize', position: { left: '-3px', top: '10px', bottom: '10px' }, directions: ['w'] },
                { className: 'copilot-resize-e', cursor: 'e-resize', position: { right: '-3px', top: '10px', bottom: '10px' }, directions: ['e'] }
            ];

            // Store handles for cleanup
            this._resizeHandles = [];

            // Create each resize handle
            handles.forEach(lang.hitch(this, function(handleConfig) {
                var handle = domConstruct.create('div', {
                    className: 'copilot-resize-handle ' + handleConfig.className,
                    style: this._getHandleStyles(handleConfig.position, handleConfig.cursor)
                }, this.domNode);

                this._resizeHandles.push(handle);

                // Add mouse event listeners
                this.own(
                    on(handle, 'mousedown', lang.hitch(this, function(e) {
                        this._startResize(e, handleConfig.directions);
                    }))
                );
            }));
        },

        /**
         * Generates CSS styles for resize handles
         */
        _getHandleStyles: function(position, cursor) {
            var styles = {
                position: 'absolute',
                cursor: cursor,
                'background-color': 'transparent',
                'z-index': '1000'
            };

            // Set dimensions based on handle type
            if (position.top !== undefined && position.bottom === undefined && position.left !== undefined && position.right !== undefined) {
                // Top side handle
                styles.height = '6px';
            } else if (position.bottom !== undefined && position.top === undefined && position.left !== undefined && position.right !== undefined) {
                // Bottom side handle
                styles.height = '6px';
            } else if (position.left !== undefined && position.right === undefined && position.top !== undefined && position.bottom !== undefined) {
                // Left side handle
                styles.width = '6px';
            } else if (position.right !== undefined && position.left === undefined && position.top !== undefined && position.bottom !== undefined) {
                // Right side handle
                styles.width = '6px';
            } else {
                // Corner handles
                styles.width = '12px';
                styles.height = '12px';
            }

            // Apply position styles
            Object.keys(position).forEach(function(key) {
                styles[key] = position[key];
            });

            // Convert to CSS string
            var cssString = '';
            Object.keys(styles).forEach(function(key) {
                cssString += key + ': ' + styles[key] + '; ';
            });

            return cssString;
        },

        /**
         * Starts the resize operation
         */
        _startResize: function(e, directions) {
            e.preventDefault();
            e.stopPropagation();

            var startX = e.clientX;
            var startY = e.clientY;
            var startWidth = parseInt(domStyle.get(this.domNode, 'width'));
            var startHeight = parseInt(domStyle.get(this.domNode, 'height'));
            var startLeft = parseInt(domStyle.get(this.domNode, 'left') || 0);
            var startTop = parseInt(domStyle.get(this.domNode, 'top') || 0);

            // Minimum dimensions
            var minWidth = 300;
            var minHeight = 200;

            // Get viewport dimensions
            var viewport = {
                width: window.innerWidth || document.documentElement.clientWidth,
                height: window.innerHeight || document.documentElement.clientHeight
            };

            // Add visual feedback
            domClass.add(this.domNode, 'copilot-resizing');

            var mouseMoveHandle = on(document, 'mousemove', lang.hitch(this, function(e) {
                var deltaX = e.clientX - startX;
                var deltaY = e.clientY - startY;

                var newWidth = startWidth;
                var newHeight = startHeight;
                var newLeft = startLeft;
                var newTop = startTop;

                // Handle horizontal resizing
                if (directions.indexOf('e') !== -1) {
                    // Resize from right edge
                    newWidth = Math.max(minWidth, startWidth + deltaX);
                    newWidth = Math.min(newWidth, viewport.width - startLeft);
                } else if (directions.indexOf('w') !== -1) {
                    // Resize from left edge
                    var proposedWidth = startWidth - deltaX;
                    var proposedLeft = startLeft + deltaX;

                    if (proposedWidth >= minWidth && proposedLeft >= 0) {
                        newWidth = proposedWidth;
                        newLeft = proposedLeft;
                    } else if (proposedLeft < 0) {
                        newWidth = startWidth + startLeft;
                        newLeft = 0;
                    } else {
                        newWidth = minWidth;
                        newLeft = startLeft + startWidth - minWidth;
                    }
                }

                // Handle vertical resizing
                if (directions.indexOf('s') !== -1) {
                    // Resize from bottom edge
                    newHeight = Math.max(minHeight, startHeight + deltaY);
                    newHeight = Math.min(newHeight, viewport.height - startTop);
                } else if (directions.indexOf('n') !== -1) {
                    // Resize from top edge
                    var proposedHeight = startHeight - deltaY;
                    var proposedTop = startTop + deltaY;

                    if (proposedHeight >= minHeight && proposedTop >= 0) {
                        newHeight = proposedHeight;
                        newTop = proposedTop;
                    } else if (proposedTop < 0) {
                        newHeight = startHeight + startTop;
                        newTop = 0;
                    } else {
                        newHeight = minHeight;
                        newTop = startTop + startHeight - minHeight;
                    }
                }

                // Apply the new dimensions and position
                domStyle.set(this.domNode, {
                    width: newWidth + 'px',
                    height: newHeight + 'px',
                    left: newLeft + 'px',
                    top: newTop + 'px'
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

            var mouseUpHandle = on(document, 'mouseup', lang.hitch(this, function(e) {
                // Remove visual feedback
                domClass.remove(this.domNode, 'copilot-resizing');

                // Clean up event handlers
                mouseMoveHandle.remove();
                mouseUpHandle.remove();
            }));
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
                optionsBar: options.optionsBar,
                sessionId: options.currentSessionId || null // Pass through existing session if available
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
                        style: 'padding: 0px; background-color: #ffffff; overflow-y: none; margin-bottom: 0px;',
                        copilotApi: this.copilotApi
                    });
                }
                this.optionsSidebarContainer.addChild(this.topContentPane);

                // Create bottom content pane
                this.bottomContentPane = new ChatSessionScrollBar({
                    className: 'optionsBottomSection',
                    region: 'center',
                    style: 'min-height: 100px; padding: 0px; margin: 0px; border: 0px; background-color: #f0f0f0;',
                    copilotApi: this.copilotApi
                });
                this.optionsSidebarContainer.addChild(this.bottomContentPane);

                // Apply the initial height distribution between the two panes based on the
                // configurable `topPaneHeightPercent` value.
                setTimeout(lang.hitch(this, function() {
                    var topPercent = typeof this.topPaneHeightPercent === 'number' ? this.topPaneHeightPercent : 0.3;
                    // Clamp to sensible bounds (5% – 95%)
                    topPercent = Math.max(0.05, Math.min(topPercent, 0.95));
                    var bottomPercent = 1 - topPercent;

                    domStyle.set(this.topContentPane.domNode, 'height', (topPercent * 100) + '%');
                    domStyle.set(this.bottomContentPane.domNode, 'height', (bottomPercent * 100) + '%');

                    // Re-layout the sidebar container with the new sizes
                    if (this.optionsSidebarContainer && this.optionsSidebarContainer.resize) {
                        this.optionsSidebarContainer.resize();
                    }
                }), 0);

                // When the user toggles the advanced options we receive the new height via topic
                topic.subscribe('advancedOptionsHeightChanged', lang.hitch(this, function(data) {
                    // Determine the height of the top pane: use provided height when visible, otherwise 50px
                    var topHeight = (data && data.visible) ? (data.height || 250) : 50;

                    // Apply the new heights
                    domStyle.set(this.topContentPane.domNode, 'height', topHeight + 'px');
                    domStyle.set(this.bottomContentPane.domNode, 'height', 'calc(100% - ' + topHeight + 'px)');

                    // Ensure BorderContainer recalculates layout after the change
                    if (this.optionsSidebarContainer && this.optionsSidebarContainer.resize) {
                        this.optionsSidebarContainer.resize();
                    }
                }));

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
                        // If the controller panel is already on the desired session, avoid redundant reset
                        if (this.controllerPanel.getSessionId() !== options.currentSessionId) {
                            this.controllerPanel.changeSessionId(options.currentSessionId);
                        }
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
                            if (title_response.title && title_response.title.length > 0) {
                                var title = title_response.title[0].title;
                                if (this.controllerPanel.titleWidget) {
                                    this.controllerPanel.titleWidget.updateTitle(title);
                                }
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

            // Clean up the advanced options dialog
            if (this.advancedOptionsDialog) {
                if (this.advancedOptionsDialog.visible) {
                    popup.close(this.advancedOptionsDialog);
                }
                this.advancedOptionsDialog.destroyRecursive();
                this.advancedOptionsDialog = null;
            }

            // Clean up the overview dialog
            if (this.overviewDialog) {
                if (this.overviewDialog.open) {
                    this.overviewDialog.hide();
                }
                this.overviewDialog.destroyRecursive();
                this.overviewDialog = null;
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

            // Clean up the resize handles
            if (this._resizeHandles) {
                this._resizeHandles.forEach(function(handle) {
                    domConstruct.destroy(handle);
                });
                this._resizeHandles = null;
            }

            this.inherited(arguments);
        }
    });
});
