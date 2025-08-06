define([
    'dojo/_base/declare',
    'dijit/form/Button',
    'dojo/dom-class',
    'dojo/on',
    'dojo/topic',
    'dijit/Dialog',
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
    Dialog,
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

        // localStorage key for button visibility state
        _visibilityStorageKey: 'copilot-chat-button-visible',

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

            // Create and add the hide text element
            this._createHideText();

            topic.subscribe('hideChatPanel', lang.hitch(this, function(checked) {
                this._hideControllerPanel();
            }));

            topic.subscribe('showChatPanel', lang.hitch(this, function(checked) {
                this._showControllerPanel();
            }));

            // Initialize button visibility from localStorage
            this._initializeVisibilityFromStorage();

            // Initialize footer overlap detection
            this._initFooterOverlapDetection();
        },

        _createHideText: function() {
            // Create the hide text element
            this.hideText = domConstruct.create('span', {
                innerHTML: 'hide',
                className: 'chat-button-hide-text'
            });

            // Add the hide text to the button's container
            domConstruct.place(this.hideText, this.domNode, 'first');

            // Set up hover event handlers
            this._setupHoverEvents();

            // Add click handler to the hide text
            on(this.hideText, 'click', lang.hitch(this, function(evt) {
                topic.publish('hideChatButton', true);
                evt.stopPropagation();
            }));
        },

                _setupHoverEvents: function() {
            var self = this;

            // Initialize timer variables
            this._showTimer = null;
            this._hideTimer = null;

            // Show hide text on button hover (with 1 second delay)
            on(this.domNode, 'mouseenter', function(evt) {
                // Clear any existing hide timer
                if (self._hideTimer) {
                    clearTimeout(self._hideTimer);
                    self._hideTimer = null;
                }

                // Set show timer for 1 second delay
                self._showTimer = setTimeout(function() {
                    domStyle.set(self.hideText, 'display', 'block');
                    self._showTimer = null;
                }, 1000);
            });

            // Hide hide text when leaving button area (with 1 second delay)
            on(this.domNode, 'mouseleave', function(evt) {
                // Clear any existing show timer
                if (self._showTimer) {
                    clearTimeout(self._showTimer);
                    self._showTimer = null;
                }

                // Only set hide timer if text is currently visible
                if (domStyle.get(self.hideText, 'display') === 'block') {
                    self._hideTimer = setTimeout(function() {
                        domStyle.set(self.hideText, 'display', 'none');
                        self._hideTimer = null;
                    }, 1000);
                }
            });

            // Keep hide text visible when hovering over it
            on(this.hideText, 'mouseenter', function(evt) {
                // Clear any existing hide timer
                if (self._hideTimer) {
                    clearTimeout(self._hideTimer);
                    self._hideTimer = null;
                }
                // Ensure text stays visible
                domStyle.set(self.hideText, 'display', 'block');
            });

            // Start hide timer when leaving hide text
            on(this.hideText, 'mouseleave', function(evt) {
                self._hideTimer = setTimeout(function() {
                    domStyle.set(self.hideText, 'display', 'none');
                    self._hideTimer = null;
                }, 1000);
            });
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
                    new Dialog({
                        title: "Service Unavailable",
                        content: "The BV-BRC Copilot service is currently unavailable. Please try again later.",
                        style: "width: 300px"
                    }).show();
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

        // Initialize button visibility from localStorage
        _initializeVisibilityFromStorage: function() {
            try {
                var isVisible = this._getVisibilityFromStorage();
                if (isVisible !== null) {
                    if (isVisible) {
                        this.show();
                    } else {
                        this.hide();
                    }
                }
                // If no stored preference, default to visible (no action needed)
            } catch (e) {
                console.warn('Unable to access localStorage for chat button visibility', e);
            }
        },

        // Get visibility state from localStorage
        _getVisibilityFromStorage: function() {
            try {
                if (window && window.localStorage) {
                    var stored = localStorage.getItem(this._visibilityStorageKey);
                    return stored !== null ? (stored === 'true') : null;
                }
            } catch (e) {
                console.warn('Unable to read chat button visibility from localStorage', e);
            }
            return null;
        },

        // Save visibility state to localStorage
        _saveVisibilityToStorage: function(isVisible) {
            try {
                if (window && window.localStorage) {
                    localStorage.setItem(this._visibilityStorageKey, isVisible.toString());
                }
            } catch (e) {
                console.warn('Unable to save chat button visibility to localStorage', e);
            }
        },

        // Hide the chat button
        hide: function() {
            domStyle.set(this.domNode, 'display', 'none');
            this._saveVisibilityToStorage(false);
        },

        // Show the chat button
        show: function() {
            domStyle.set(this.domNode, 'display', 'block');
            this._saveVisibilityToStorage(true);
        },

        // Cleanup method
        destroy: function() {
            // Clean up intersection observer
            if (this._intersectionObserver) {
                this._intersectionObserver.disconnect();
                this._intersectionObserver = null;
            }

            // Clean up hide text timers
            if (this._showTimer) {
                clearTimeout(this._showTimer);
                this._showTimer = null;
            }
            if (this._hideTimer) {
                clearTimeout(this._hideTimer);
                this._hideTimer = null;
            }

            // Clean up hide text element
            if (this.hideText) {
                domConstruct.destroy(this.hideText);
                this.hideText = null;
            }

            // Clean up scroll handlers would be handled by dojo's on.remove if we stored the handles
            // For simplicity, we'll rely on the browser's cleanup when the widget is destroyed

            this.inherited(arguments);
        }
    });
});