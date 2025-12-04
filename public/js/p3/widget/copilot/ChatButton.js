define([
    'dojo/_base/declare',
    'dijit/form/Button',
    'dojo/dom-class',
    'dojo/on',
    'dojo/topic',
    'dijit/layout/ContentPane',
    'dojo/dom-construct',
    'dojo/_base/lang',
    '../copilot/ChatSessionContainer',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/dom-style',
    './CopilotApi',
    './ChatSessionOptionsBar',
    './CopilotFloatingWindow',
    'require'
], function(
    declare,
    Button,
    domClass,
    on,
    topic,
    ContentPane,
    domConstruct,
    lang,
    ChatSessionContainer,
    TooltipDialog,
    popup,
    domStyle,
    CopilotAPI,
    ChatSessionOptionsBar,
    CopilotFloatingWindow,
    require
) {
    return declare([Button], {
        // Base class for styling
        baseClass: 'ChatButton',

        // Controller panel reference
        controllerPanel: null,

        // Copilot API reference
        copilotApi: null,

        // Options bar reference
        optionsBar: null,

        // Current session ID
        currentSessionId: null,

        // one chat window is open
        chatOpen: false,

        // Tooltip element reference
        errorTooltip: null,

        // Constructor
        constructor: function(opts) {
            // Add any initialization logic here
            lang.mixin(this, opts);
        },

        // Post-create lifecycle method
        postCreate: function() {
            this.inherited(arguments);

            // Set the button icon
            this.set('label', '<i class="fa fa-comments"></i>');
            domClass.add(this.domNode, 'ChatButton');

            topic.subscribe('hideChatPanel', lang.hitch(this, function(checked) {
                this._hideControllerPanel();
            }));

            topic.subscribe('showChatPanel', lang.hitch(this, function(checked) {
                this._showControllerPanel();
            }));

            // Subscribe to copilot service unavailable errors
            topic.subscribe('CopilotServiceUnavailable', lang.hitch(this, function(message) {
                this.showErrorTooltip(message || 'The BV-BRC Copilot service is currently unavailable. Please try again later.');
            }));

            // Initialize footer overlap detection
            this._initFooterOverlapDetection();
        },

        _initFooterOverlapDetection: function() {
            // Wait for DOM to be ready
            var self = this;
            setTimeout(function() {
                self._setupFooterOverlapDetection();
            }, 100);
        },

        _setupFooterOverlapDetection: function() {
            var footer = document.getElementById('bv-brc-footer') ||
                        document.querySelector('footer.main-footer') ||
                        document.querySelector('footer');

            if (!footer) {
                // If no footer found, try again later
                var self = this;
                setTimeout(function() {
                    self._setupFooterOverlapDetection();
                }, 1000);
                return;
            }

            // Use Intersection Observer if available, otherwise fall back to scroll detection
            if (window.IntersectionObserver) {
                this._useIntersectionObserver(footer);
            } else {
                this._useScrollDetection(footer);
            }
        },

        _useIntersectionObserver: function(footer) {
            var self = this;
            var observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        domClass.add(self.domNode, 'inverted');
                    } else {
                        domClass.remove(self.domNode, 'inverted');
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            });

            observer.observe(footer);
            this._intersectionObserver = observer;
        },

        _useScrollDetection: function(footer) {
            var self = this;
            var checkOverlap = function() {
                var buttonRect = self.domNode.getBoundingClientRect();
                var footerRect = footer.getBoundingClientRect();

                // Check if button overlaps with footer
                var overlaps = !(buttonRect.right < footerRect.left ||
                               buttonRect.left > footerRect.right ||
                               buttonRect.bottom < footerRect.top ||
                               buttonRect.top > footerRect.bottom);

                if (overlaps) {
                    domClass.add(self.domNode, 'inverted');
                } else {
                    domClass.remove(self.domNode, 'inverted');
                }
            };

            // Check on scroll and resize
            on(window, 'scroll', checkOverlap);
            on(window, 'resize', checkOverlap);

            // Initial check
            checkOverlap();

            this._scrollHandler = checkOverlap;
        },

        _openSmallChat: function() {
            // Attempt to restore a previously saved session ID, if available
            try {
                var savedSessionId = (window && window.localStorage) ? localStorage.getItem('copilot-current-session-id') : null;
                if (savedSessionId) {
                    this.currentSessionId = savedSessionId;
                }
            } catch (e) {
                console.warn('Unable to access localStorage to retrieve chat session id', e);
            }

            // If controller panel already exists, just show it
            if (this.controllerPanel && this.controllerPanel.domNode) {
                if (this.chatContainer) {
                    this._showControllerPanel();
                }
                return;
            }

            // Initialize copilotApi if it doesn't exist
            if (!this.copilotApi) {
                this.copilotApi = new CopilotAPI({
                    user_id: window.App.user.l_id
                });
            }

            // Initialize optionsBar if it doesn't exist
            if (!this.optionsBar) {
                // Fetch model list and RAG database list
                this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                    var modelList = JSON.parse(modelsAndRag.models);
                    var ragList = JSON.parse(modelsAndRag.vdb_list);

                    // Create options bar
                    this.optionsBar = new ChatSessionOptionsBar({
                        className: 'ChatSessionOptionsBar',
                        region: 'top',
                        copilotApi: this.copilotApi,
                        modelList: modelList,
                        ragList: ragList
                    });

                    // Create and show controller panel via container
                    this._initializeSmallWindowContainer();

                })).catch(lang.hitch(this, function(err) {
                    this.showErrorTooltip('The BV-BRC Copilot service is currently unavailable. Please try again later.');
                    console.error('Error setting up chat panel:', err);
                }));
            } else {
                // If we already have optionsBar, just create controller panel via container
                this._initializeSmallWindowContainer();
            }
        },

        _initializeSmallWindowContainer: function() {
            // Create a container div for the chat panel using CopilotFloatingWindow
            this.chatContainer = new CopilotFloatingWindow({
                className: 'ChatContainerFloatingWindow'
            });
            this.chatContainer.placeAt(document.body);

            // Create the controller panel via the container's method
            this.controllerPanel = this.chatContainer.createControllerPanel({
                copilotApi: this.copilotApi,
                optionsBar: this.optionsBar,
                currentSessionId: this.currentSessionId,
                onMinimizeClick: lang.hitch(this, function(evt) {
                    this._hideControllerPanel();
                    this.chatOpen = false;
                    evt.stopPropagation();
                }),
                onResize: lang.hitch(this, function(sessionId) {
                    this.currentSessionId = sessionId;
                })
            });
        },

        _hideControllerPanel: function() {
            if (this.chatContainer) {
                this.chatContainer.hide();
            }
        },

        _showControllerPanel: function() {
            if (this.chatContainer) {
                this.chatContainer.show();
            }
        },

        // Override onClick to show the controller panel
        onClick: function(evt) {
            this.inherited(arguments);
            if (!this.chatOpen) {
                this._openSmallChat();
                this.chatOpen = true;
                evt.stopPropagation();
            } else {
                this._hideControllerPanel();
                this.chatOpen = false;
            }
            evt.stopPropagation();
        },

        // Method to update button state
        updateState: function(isOpen) {
            domClass.toggle(this.domNode, 'active', isOpen);
        },

        /**
         * Shows a non-modal tooltip above the chat button
         * @param {string} message - The error message to display
         */
        showErrorTooltip: function(message) {
            // Hide any existing tooltip first
            this.hideErrorTooltip();

            // Create tooltip element
            this.errorTooltip = domConstruct.create('div', {
                class: 'copilot-error-tooltip',
                innerHTML: message,
                style: {
                    position: 'fixed',
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: '10000',
                    maxWidth: '300px',
                    fontSize: '14px',
                    color: '#333',
                    pointerEvents: 'auto'
                }
            }, document.body);

            // Position tooltip above the chat button
            this._positionTooltip();

            // Reposition tooltip on window resize or scroll
            var self = this;
            this._tooltipResizeHandler = on(window, 'resize', function() {
                if (self.errorTooltip) {
                    self._positionTooltip();
                }
            });
            this._tooltipScrollHandler = on(window, 'scroll', function() {
                if (self.errorTooltip) {
                    self._positionTooltip();
                }
            }, true);

            // Auto-hide after 5 seconds
            this._tooltipTimeout = setTimeout(function() {
                self.hideErrorTooltip();
            }, 5000);

            // Hide tooltip when clicking anywhere
            this._tooltipClickHandler = on(document, 'click', function(evt) {
                if (self.errorTooltip && !self.errorTooltip.contains(evt.target) && evt.target !== self.domNode) {
                    self.hideErrorTooltip();
                }
            });
        },

        /**
         * Positions the tooltip above the chat button
         * @private
         */
        _positionTooltip: function() {
            if (!this.errorTooltip || !this.domNode) return;

            var buttonRect = this.domNode.getBoundingClientRect();
            var tooltipRect = this.errorTooltip.getBoundingClientRect();

            // Position above the button, centered horizontally
            var left = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2);
            var top = buttonRect.top - tooltipRect.height - 10; // 10px gap above button

            // Ensure tooltip doesn't go off-screen
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
            if (top < 10) {
                // If not enough space above, show below button instead
                top = buttonRect.bottom + 10;
            }

            domStyle.set(this.errorTooltip, {
                left: left + 'px',
                top: top + 'px'
            });
        },

        /**
         * Hides and removes the error tooltip
         */
        hideErrorTooltip: function() {
            if (this._tooltipTimeout) {
                clearTimeout(this._tooltipTimeout);
                this._tooltipTimeout = null;
            }

            if (this._tooltipClickHandler) {
                this._tooltipClickHandler.remove();
                this._tooltipClickHandler = null;
            }

            if (this._tooltipResizeHandler) {
                this._tooltipResizeHandler.remove();
                this._tooltipResizeHandler = null;
            }

            if (this._tooltipScrollHandler) {
                this._tooltipScrollHandler.remove();
                this._tooltipScrollHandler = null;
            }

            if (this.errorTooltip) {
                domConstruct.destroy(this.errorTooltip);
                this.errorTooltip = null;
            }
        },

        // Cleanup method
        destroy: function() {
            // Hide and clean up tooltip
            this.hideErrorTooltip();

            // Clean up intersection observer
            if (this._intersectionObserver) {
                this._intersectionObserver.disconnect();
                this._intersectionObserver = null;
            }

            // Clean up scroll handlers would be handled by dojo's on.remove if we stored the handles
            // For simplicity, we'll rely on the browser's cleanup when the widget is destroyed

            this.inherited(arguments);
        }
    });
});