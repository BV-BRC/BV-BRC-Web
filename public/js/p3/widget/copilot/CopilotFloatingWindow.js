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
    'dojo/dom',
    './FloatingWindowGeometry'
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
    dom,
    Geometry
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
        modelSelectorDialog: null,
        modelSelectorDropdown: null,
        modelSelectorButton: null,
        ragSelectorDialog: null,
        ragSelectorDropdown: null,
        ragSelectorButton: null,
        showModelSelector: false,
        showRagSelector: false,

        constructor: function(options) {
            this.inherited(arguments);
            if (options) {
                lang.mixin(this, options);
            }
            if (window.App && window.App.copilotEnableModelSelector !== undefined) {
                this.showModelSelector = window.App.copilotEnableModelSelector === 'true';
            }
            if (window.App && window.App.copilotEnableRagSelector !== undefined) {
                this.showRagSelector = window.App.copilotEnableRagSelector === 'true';
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

            if (this.showModelSelector) {
                // Add model selector button
                this.modelSelectorButton = domConstruct.create('div', {
                    className: 'copilotChatModelButton',
                    innerHTML: 'Model',
                    title: 'Select chat model'
                }, leftButtonContainer);
                this.modelSelectorDialog = this.createModelSelectorDialog();
                this._refreshModelSelectorState();

                on(this.modelSelectorButton, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    if (!this.modelSelectorDialog) {
                        return;
                    }
                    if (this.modelSelectorDialog.visible) {
                        popup.close(this.modelSelectorDialog);
                        this.modelSelectorDialog.visible = false;
                        domClass.remove(this.modelSelectorButton, 'active');
                        return;
                    }
                    this._refreshModelSelectorState();
                    setTimeout(lang.hitch(this, function() {
                        popup.open({
                            popup: this.modelSelectorDialog,
                            around: this.modelSelectorButton,
                            orient: ['below']
                        });
                        this.modelSelectorDialog.visible = true;
                        domClass.add(this.modelSelectorButton, 'active');
                    }), 100);
                }));
            }

            if (this.showRagSelector) {
                // Add RAG selector button
                this.ragSelectorButton = domConstruct.create('div', {
                    className: 'copilotChatRagButton',
                    innerHTML: 'RAG',
                    title: 'Select RAG database'
                }, leftButtonContainer);
                this.ragSelectorDialog = this.createRagSelectorDialog();
                this._refreshRagSelectorState();

                on(this.ragSelectorButton, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    if (!this.ragSelectorDialog) {
                        return;
                    }
                    if (this.ragSelectorDialog.visible) {
                        popup.close(this.ragSelectorDialog);
                        this.ragSelectorDialog.visible = false;
                        domClass.remove(this.ragSelectorButton, 'active');
                        return;
                    }
                    this._refreshRagSelectorState();
                    setTimeout(lang.hitch(this, function() {
                        popup.open({
                            popup: this.ragSelectorDialog,
                            around: this.ragSelectorButton,
                            orient: ['below']
                        });
                        this.ragSelectorDialog.visible = true;
                        domClass.add(this.ragSelectorButton, 'active');
                    }), 100);
                }));
            }

            // Handle clicks outside dialog to close it
            document.addEventListener('click', lang.hitch(this, function(event) {
                if (this.advancedOptionsDialog && this.advancedOptionsDialog._rendered &&
                    !this.advancedOptionsDialog.domNode.contains(event.target) &&
                    !advancedOptionsButton.contains(event.target)) {
                    popup.close(this.advancedOptionsDialog);
                    this.advancedOptionsDialog.visible = false;
                    domClass.remove(advancedOptionsButton, 'active');
                }
                if (this.modelSelectorButton && this.modelSelectorDialog && this.modelSelectorDialog._rendered &&
                    !this.modelSelectorDialog.domNode.contains(event.target) &&
                    !this.modelSelectorButton.contains(event.target)) {
                    popup.close(this.modelSelectorDialog);
                    this.modelSelectorDialog.visible = false;
                    domClass.remove(this.modelSelectorButton, 'active');
                }
                if (this.ragSelectorButton && this.ragSelectorDialog && this.ragSelectorDialog._rendered &&
                    !this.ragSelectorDialog.domNode.contains(event.target) &&
                    !this.ragSelectorButton.contains(event.target)) {
                    popup.close(this.ragSelectorDialog);
                    this.ragSelectorDialog.visible = false;
                    domClass.remove(this.ragSelectorButton, 'active');
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

            // Keep the window inside the viewport while it is dragged.
            this._moveable.onMove = lang.hitch(this, function(mover, leftTop) {
                var r = Geometry.clampRect({
                    left: leftTop.l,
                    top: leftTop.t,
                    width: this.domNode.offsetWidth,
                    height: this.domNode.offsetHeight
                }, this._viewport());
                domStyle.set(this.domNode, {
                    left: r.left + 'px',
                    top: r.top + 'px'
                });
                return false; // Prevent default positioning
            });

            this._moveable.onMoveStart = lang.hitch(this, function(mover) {
                domClass.add(this.domNode, 'copilotDragging');
                domStyle.set(this.headerNode, 'background-color', '#e8e8e8');
            });

            this._moveable.onMoveStop = lang.hitch(this, function(mover) {
                domClass.remove(this.domNode, 'copilotDragging');
                domStyle.set(this.headerNode, 'background-color', '#f8f8f8');
                this._saveGeometry();
            });

            // Create comprehensive resize handles for all sides and corners
            this._createResizeHandles();

            // Sidebar overlay for narrow windows, size/position from storage,
            // and the browser-resize listener.  Done here rather than in
            // startup(): ChatButton places the window on <body>, so dijit
            // never calls startup() for it.
            this._initSidebarOverlay();
            this._initGeometry();
        },

        _parseListPayload: function(value) {
            if (Array.isArray(value)) {
                return value;
            }
            if (typeof value === 'string') {
                try {
                    var parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                    return [];
                }
            }
            return [];
        },

        _getAvailableModelList: function() {
            if (window && window.App && Array.isArray(window.App.copilotModelList) && window.App.copilotModelList.length > 0) {
                return window.App.copilotModelList.slice();
            }
            if (this.optionsBar && Array.isArray(this.optionsBar.modelList) && this.optionsBar.modelList.length > 0) {
                return this.optionsBar.modelList.slice();
            }
            return [];
        },

        _getAvailableRagList: function() {
            if (window && window.App && Array.isArray(window.App.copilotRagList) && window.App.copilotRagList.length > 0) {
                return window.App.copilotRagList.slice();
            }
            if (this.optionsBar && Array.isArray(this.optionsBar.ragList) && this.optionsBar.ragList.length > 0) {
                return this.optionsBar.ragList.slice();
            }
            return [];
        },

        _getDefaultModelFromList: function(modelList) {
            if (!Array.isArray(modelList) || modelList.length === 0) {
                return null;
            }
            var explicitDefault = modelList.find(function(entry) {
                return entry && entry.is_default === true && entry.active !== false;
            });
            if (explicitDefault && explicitDefault.model) {
                return explicitDefault.model;
            }
            var activeSorted = modelList
                .filter(function(entry) {
                    return entry && entry.model && entry.active !== false;
                })
                .sort(function(a, b) {
                    var pa = typeof a.priority === 'number' ? a.priority : Number.MAX_SAFE_INTEGER;
                    var pb = typeof b.priority === 'number' ? b.priority : Number.MAX_SAFE_INTEGER;
                    return pa - pb;
                });
            return activeSorted.length > 0 ? activeSorted[0].model : null;
        },

        _getCurrentSelectedModel: function(modelList) {
            var selected = window && window.App ? window.App.copilotSelectedModel : null;
            if (!selected) {
                selected = this._getDefaultModelFromList(modelList);
            }
            return selected;
        },

        _labelForModel: function(modelId) {
            if (!modelId) {
                return 'Model';
            }
            var shortName = modelId.split('/').reverse()[0] || modelId;
            if (shortName.length > 18) {
                shortName = shortName.substring(0, 18) + '...';
            }
            return shortName;
        },

        _updateModelButtonLabel: function(modelId) {
            if (!this.modelSelectorButton) {
                return;
            }
            this.modelSelectorButton.innerHTML = this._labelForModel(modelId);
            this.modelSelectorButton.title = modelId ? ('Selected model: ' + modelId) : 'Select chat model';
        },

        _sanitizeRagSelection: function(ragDb) {
            if (!ragDb || ragDb === 'null' || ragDb === 'none' || ragDb === 'bvbrc_helpdesk') {
                return null;
            }
            return ragDb;
        },

        _labelForRag: function(ragDb) {
            if (!ragDb) {
                return 'RAG';
            }
            var shortName = ragDb.split('/').reverse()[0] || ragDb;
            if (shortName.length > 18) {
                shortName = shortName.substring(0, 18) + '...';
            }
            return shortName;
        },

        _updateRagButtonLabel: function(ragDb) {
            if (!this.ragSelectorButton) {
                return;
            }
            var sanitized = this._sanitizeRagSelection(ragDb);
            this.ragSelectorButton.innerHTML = this._labelForRag(sanitized);
            this.ragSelectorButton.title = sanitized ? ('Selected RAG DB: ' + sanitized) : 'Select RAG database';
        },

        _refreshModelSelectorState: function() {
            if (!this.modelSelectorButton) {
                return;
            }
            var modelList = this._getAvailableModelList();
            if (modelList.length === 0 && this.copilotApi && this.copilotApi.getModelList) {
                this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                    var fetchedModels = this._parseListPayload(modelsAndRag.model_list || modelsAndRag.models);
                    var fetchedRags = this._parseListPayload(modelsAndRag.rag_list || modelsAndRag.vdb_list);
                    if (window && window.App) {
                        window.App.copilotModelList = fetchedModels.slice();
                        window.App.copilotRagList = fetchedRags.slice();
                    }
                    if (this.optionsBar) {
                        this.optionsBar.modelList = fetchedModels.slice();
                        this.optionsBar.ragList = fetchedRags.slice();
                    }
                    if (this.modelSelectorButton) {
                        this._refreshModelSelectorState();
                    }
                    if (this.ragSelectorButton) {
                        this._refreshRagSelectorState();
                    }
                })).catch(function() {
                    // Keep button usable even if model fetch fails.
                });
            }
            if (this.modelSelectorDropdown) {
                this.modelSelectorDropdown.innerHTML = '';
                if (modelList.length === 0) {
                    var noOption = document.createElement('option');
                    noOption.value = '';
                    noOption.text = 'No models available';
                    this.modelSelectorDropdown.add(noOption);
                    this.modelSelectorDropdown.disabled = true;
                } else {
                    this.modelSelectorDropdown.disabled = false;
                    modelList.forEach(function(modelEntry) {
                        if (!modelEntry || !modelEntry.model) {
                            return;
                        }
                        var option = document.createElement('option');
                        option.value = modelEntry.model;
                        option.text = modelEntry.model.split('/').reverse()[0];
                        this.modelSelectorDropdown.add(option);
                    }, this);
                }
            }
            var selectedModel = this._getCurrentSelectedModel(modelList);
            if (selectedModel && window && window.App) {
                window.App.copilotSelectedModel = selectedModel;
            }
            if (this.modelSelectorDropdown && selectedModel) {
                this.modelSelectorDropdown.value = selectedModel;
            }
            this._updateModelButtonLabel(selectedModel);
        },

        _refreshRagSelectorState: function() {
            if (!this.ragSelectorButton) {
                return;
            }
            var ragList = this._getAvailableRagList();
            if (ragList.length === 0 && this.copilotApi && this.copilotApi.getModelList) {
                this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {
                    var fetchedModels = this._parseListPayload(modelsAndRag.model_list || modelsAndRag.models);
                    var fetchedRags = this._parseListPayload(modelsAndRag.rag_list || modelsAndRag.vdb_list);
                    if (window && window.App) {
                        window.App.copilotModelList = fetchedModels.slice();
                        window.App.copilotRagList = fetchedRags.slice();
                    }
                    if (this.optionsBar) {
                        this.optionsBar.modelList = fetchedModels.slice();
                        this.optionsBar.ragList = fetchedRags.slice();
                    }
                    if (this.ragSelectorButton) {
                        this._refreshRagSelectorState();
                    }
                })).catch(function() {
                    // Keep button usable even if RAG fetch fails.
                });
            }

            if (this.ragSelectorDropdown) {
                this.ragSelectorDropdown.innerHTML = '';
                var noneOption = document.createElement('option');
                noneOption.value = 'null';
                noneOption.text = 'None';
                this.ragSelectorDropdown.add(noneOption);

                var seenNames = {};
                ragList.forEach(function(ragEntry) {
                    if (!ragEntry || !ragEntry.name) {
                        return;
                    }
                    var ragName = ragEntry.name;
                    // Filter out bvbrc_helpdesk
                    if (ragName === 'bvbrc_helpdesk') {
                        return;
                    }
                    if (seenNames[ragName]) {
                        return;
                    }
                    seenNames[ragName] = true;
                    var option = document.createElement('option');
                    option.value = ragName;
                    option.text = ragName.split('/').reverse()[0];
                    this.ragSelectorDropdown.add(option);
                }, this);
                this.ragSelectorDropdown.disabled = false;
            }

            var selectedRagDb = this._sanitizeRagSelection(window && window.App ? window.App.copilotSelectedRagDb : null);
            if (this.ragSelectorDropdown) {
                this.ragSelectorDropdown.value = selectedRagDb || 'null';
            }
            if (window && window.App) {
                window.App.copilotSelectedRagDb = selectedRagDb;
            }
            this._updateRagButtonLabel(selectedRagDb);
        },

        createModelSelectorDialog: function() {
            var modelDialog = new TooltipDialog({
                style: 'width: 300px;',
                content: document.createElement('div')
            });
            var modelLabel = document.createElement('div');
            modelLabel.textContent = 'Model:';
            modelLabel.style.marginBottom = '6px';
            modelDialog.containerNode.appendChild(modelLabel);

            var selectElement = document.createElement('select');
            selectElement.className = 'copilotSelectElement';
            selectElement.style.width = '100%';
            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var selectedModel = evt.target.value;
                if (!selectedModel) {
                    return;
                }
                if (window && window.App) {
                    window.App.copilotSelectedModel = selectedModel;
                }
                this._updateModelButtonLabel(selectedModel);
                topic.publish('ChatModel', selectedModel);
            }));
            modelDialog.containerNode.appendChild(selectElement);
            this.modelSelectorDropdown = selectElement;

            return modelDialog;
        },

        createRagSelectorDialog: function() {
            var ragDialog = new TooltipDialog({
                style: 'width: 300px;',
                content: document.createElement('div')
            });
            var ragLabel = document.createElement('div');
            ragLabel.textContent = 'RAG Database:';
            ragLabel.style.marginBottom = '6px';
            ragDialog.containerNode.appendChild(ragLabel);

            var selectElement = document.createElement('select');
            selectElement.className = 'copilotSelectElement';
            selectElement.style.width = '100%';
            selectElement.addEventListener('change', lang.hitch(this, function(evt) {
                var rawSelected = evt.target.value;
                var selectedRagDb = this._sanitizeRagSelection(rawSelected);
                if (window && window.App) {
                    window.App.copilotSelectedRagDb = selectedRagDb;
                }
                this._updateRagButtonLabel(selectedRagDb);
                topic.publish('ChatRagDb', selectedRagDb || 'null');
            }));
            ragDialog.containerNode.appendChild(selectElement);
            this.ragSelectorDropdown = selectElement;

            return ragDialog;
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

            // Add Show Tabs on/off control
            var tabsVisibilityContainer = domConstruct.create('div', {
                style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border-top: 1px solid #e5e7eb;'
            }, advancedOptionsDialog.containerNode);

            domConstruct.create('span', {
                innerHTML: 'Show Tabs:',
                style: 'white-space: nowrap; font-size: 14px;'
            }, tabsVisibilityContainer);

            var savedShowTabs = localStorage.getItem('copilot-show-panel-tabs');
            var initialShowTabs = savedShowTabs !== null ? savedShowTabs === 'true' : true;

            var showTabsInput = domConstruct.create('input', {
                type: 'checkbox',
                checked: initialShowTabs
            }, tabsVisibilityContainer);

            on(showTabsInput, 'change', function(evt) {
                var isVisible = Boolean(evt.target.checked);
                localStorage.setItem('copilot-show-panel-tabs', isVisible ? 'true' : 'false');
                topic.publish('copilotPanelTabsVisibilityChanged', isVisible);
            });

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
         * Starts the resize operation.  The dragged edges follow the mouse;
         * the result is clamped to the current viewport on every move and
         * saved (as fractions of the viewport) when the mouse is released.
         */
        _startResize: function(e, directions) {
            e.preventDefault();
            e.stopPropagation();

            var startX = e.clientX;
            var startY = e.clientY;
            var startWidth = this.domNode.offsetWidth;
            var startHeight = this.domNode.offsetHeight;
            var startLeft = parseInt(domStyle.get(this.domNode, 'left'), 10) || 0;
            var startTop = parseInt(domStyle.get(this.domNode, 'top'), 10) || 0;
            var minWidth = Geometry.MIN_W;
            var minHeight = Geometry.MIN_H;

            domClass.add(this.domNode, 'copilot-resizing');

            var mouseMoveHandle = on(document, 'mousemove', lang.hitch(this, function(e) {
                var viewport = this._viewport();
                var deltaX = e.clientX - startX;
                var deltaY = e.clientY - startY;
                var left = startLeft;
                var top = startTop;
                var width = startWidth;
                var height = startHeight;

                if (directions.indexOf('e') !== -1) {
                    width = Math.min(Math.max(minWidth, startWidth + deltaX), viewport.width - startLeft);
                } else if (directions.indexOf('w') !== -1) {
                    left = startLeft + deltaX;
                    width = startWidth - deltaX;
                    if (width < minWidth) {
                        left = startLeft + startWidth - minWidth;
                        width = minWidth;
                    }
                    if (left < 0) {
                        width += left;
                        left = 0;
                    }
                }

                if (directions.indexOf('s') !== -1) {
                    height = Math.min(Math.max(minHeight, startHeight + deltaY), viewport.height - startTop);
                } else if (directions.indexOf('n') !== -1) {
                    top = startTop + deltaY;
                    height = startHeight - deltaY;
                    if (height < minHeight) {
                        top = startTop + startHeight - minHeight;
                        height = minHeight;
                    }
                    if (top < 0) {
                        height += top;
                        top = 0;
                    }
                }

                this._applyRect({ left: left, top: top, width: width, height: height });
            }));

            var mouseUpHandle = on(document, 'mouseup', lang.hitch(this, function(e) {
                domClass.remove(this.domNode, 'copilot-resizing');
                mouseMoveHandle.remove();
                mouseUpHandle.remove();
                this._saveGeometry();
            }));
        },

        startup: function() {
            this.inherited(arguments);
            this._layoutNow();
        },

        /**
         * The window's own BorderContainer has no region children: its content
         * is laid out by this.layoutContainer (see _layoutNow).  Without this
         * override, resize() on the window threw "No region setting" for
         * layoutContainer (show() used to call it on every reopen), and in
         * narrow mode it would try to position the detached sidebar.
         */
        layout: function() {
        },

        // ---- Geometry (see FloatingWindowGeometry.js) ----------------------

        _viewport: function() {
            var de = document.documentElement;
            return {
                width: (de && de.clientWidth) || window.innerWidth,
                height: (de && de.clientHeight) || window.innerHeight
            };
        },

        _storage: function() {
            try {
                return window.localStorage;
            } catch (e) {
                return null; // storage blocked: the window is just not remembered
            }
        },

        /**
         * Size and position from storage (or the default), and re-derive them
         * from the stored fractions whenever the browser is resized, so the
         * window grows back after the browser does.
         */
        _initGeometry: function() {
            this._frac = Geometry.load(this._storage()) || Geometry.DEFAULT;
            this._applyRect(Geometry.fromFractions(this._frac, this._viewport()));

            this._windowResizeHandle = on(window, 'resize', lang.hitch(this, function() {
                if (this._resizeFrame) {
                    return;
                }
                var raf = window.requestAnimationFrame || function(fn) { return setTimeout(fn, 16); };
                this._resizeFrame = raf(lang.hitch(this, function() {
                    this._resizeFrame = null;
                    if (this._destroyed) {
                        return;
                    }
                    this._applyRect(Geometry.fromFractions(this._frac, this._viewport()));
                }));
            }));
        },

        /** Clamp a pixel rect to the viewport, apply it, and lay the content out. */
        _applyRect: function(rect) {
            var r = Geometry.clampRect(rect, this._viewport());
            domStyle.set(this.domNode, {
                left: r.left + 'px',
                top: r.top + 'px',
                width: r.width + 'px',
                height: r.height + 'px'
            });
            this._layoutNow();
            return r;
        },

        /** Remember the window as the user left it (after a drag or a resize only). */
        _saveGeometry: function() {
            this._frac = Geometry.toFractions({
                left: parseInt(domStyle.get(this.domNode, 'left'), 10) || 0,
                top: parseInt(domStyle.get(this.domNode, 'top'), 10) || 0,
                width: this.domNode.offsetWidth,
                height: this.domNode.offsetHeight
            }, this._viewport());
            Geometry.save(this._storage(), this._frac);
        },

        _layoutNow: function() {
            this._updateNarrowMode();
            if (this.layoutContainer && this.layoutContainer.resize) {
                this.layoutContainer.resize();
            }
            if (this._overlayOpen) {
                this._resizeSidebarContent();
            }
            if (this.controllerPanel && this.controllerPanel.displayWidget && this.controllerPanel.displayWidget.resize) {
                this.controllerPanel.displayWidget.resize();
            }
        },

        show: function() {
            domStyle.set(this.containerNode, {
                display: 'block'
            });
            // The browser may have been resized while the window was hidden.
            this._applyRect(Geometry.fromFractions(this._frac, this._viewport()));
        },

        hide: function() {
            this._closeSidebarOverlay();
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
                        options.copilotApi.getSessionMessages(options.currentSessionId).then(lang.hitch(this, function(res) {
                            var messages = [];
                            if (res && Array.isArray(res.messages)) {
                                if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                                    messages = res.messages[0].messages; // Legacy nested API shape
                                } else {
                                    messages = res.messages; // Current flat API shape
                                }
                            }
                            this.controllerPanel.chatStore.addMessages(messages);
                            this.controllerPanel.displayWidget.showMessages(messages);

                            // If the session has an in-flight turn, start polling
                            if (res.active_job_id && this.controllerPanel._pollUntilTurnComplete) {
                                this.controllerPanel._pollUntilTurnComplete(options.currentSessionId);
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

            // Lay the panel out once it is in the page (placeAt does not start it)
            setTimeout(lang.hitch(this, function() {
                this._layoutNow();
                try {
                    var savedTabs = localStorage.getItem('copilot-show-panel-tabs');
                    var showTabs = savedTabs !== null ? savedTabs === 'true' : true;
                    if (this.controllerPanel && this.controllerPanel.displayWidget && this.controllerPanel.displayWidget.setTabsVisible) {
                        this.controllerPanel.displayWidget.setTabsVisible(showTabs);
                    }
                } catch (e) {
                    // Ignore storage failures.
                }
                if (options.onResize) {
                    options.onResize(this.controllerPanel.getSessionId());
                }
                topic.publish('ChatSessionTitleMaxLengthChanged', 60);
            }), 200);

            return this.controllerPanel;
        },

        // ---- Sidebar: a left region when wide, an overlay when narrow -------

        _initSidebarOverlay: function() {
            this._sidebarAttached = true; // added to layoutContainer in postCreate
            this._sidebarWidth = 175;
            this._overlayOpen = false;
            this._narrow = null; // unknown until the first layout

            var saved = null;
            try {
                var storage = this._storage();
                saved = storage ? storage.getItem('copilot-floating-sidebar') : null;
            } catch (e) {
                saved = null;
            }
            this.optionsSidebarOpen = saved !== 'closed';

            this._sidebarBackdrop = domConstruct.create('div', {
                className: 'copilotSidebarBackdrop'
            }, this.contentContainer);
            this._sidebarOverlay = domConstruct.create('div', {
                className: 'copilotSidebarOverlay'
            }, this.contentContainer);

            on(this._sidebarBackdrop, 'click', lang.hitch(this, '_closeSidebarOverlay'));

            // Picking or starting a chat from the overlay closes it.
            this.own(
                topic.subscribe('ChatSession:Selected', lang.hitch(this, '_closeSidebarOverlay')),
                topic.subscribe('createNewChatSession', lang.hitch(this, '_closeSidebarOverlay'))
            );
        },

        /** Below Geometry.NARROW_BELOW px the sidebar leaves the layout; ☰ shows it as an overlay. */
        _updateNarrowMode: function() {
            if (!this.optionsBarContainer || this._sidebarAttached === undefined) {
                return;
            }
            // The inline width set by _applyRect: valid before the window is in the DOM.
            var width = parseInt(this.domNode.style.width, 10) || this.domNode.offsetWidth || 0;
            if (!width) {
                return;
            }
            var narrow = Geometry.isNarrow(width);
            if (narrow === this._narrow) {
                return;
            }
            this._narrow = narrow;
            domClass.toggle(this.domNode, 'copilotFloatingNarrow', narrow);
            this._closeSidebarOverlay();
            if (narrow || !this.optionsSidebarOpen) {
                this._detachSidebar();
            } else {
                this._attachSidebar();
            }
            this._updateOptionsButton();
        },

        _attachSidebar: function() {
            if (this._sidebarAttached) {
                return;
            }
            var node = this.optionsBarContainer.domNode;
            domStyle.set(node, { display: 'block', height: '', width: this._sidebarWidth + 'px' });
            this.layoutContainer.addChild(this.optionsBarContainer);
            this._sidebarAttached = true;
        },

        _detachSidebar: function() {
            if (!this._sidebarAttached) {
                return;
            }
            var node = this.optionsBarContainer.domNode;
            if (node.offsetWidth > 0) {
                this._sidebarWidth = node.offsetWidth; // keep what the splitter set
            }
            this.layoutContainer.removeChild(this.optionsBarContainer);
            domClass.remove(node, 'dijitAlignLeft');
            domStyle.set(node, {
                position: '', left: '', top: '', right: '', bottom: '',
                width: '100%', height: '100%', display: 'block'
            });
            this._sidebarOverlay.appendChild(node);
            this._sidebarAttached = false;
        },

        _resizeSidebarContent: function() {
            var w = this._sidebarOverlay.offsetWidth;
            var h = this._sidebarOverlay.offsetHeight;
            if (w > 0 && h > 0 && this.optionsBarContainer.resize) {
                this.optionsBarContainer.resize({ w: w, h: h });
            }
            if (this.optionsSidebarContainer && this.optionsSidebarContainer.resize) {
                this.optionsSidebarContainer.resize();
            }
        },

        _openSidebarOverlay: function() {
            this._detachSidebar();
            this._overlayOpen = true;
            domClass.add(this.domNode, 'copilotSidebarOverlayOpen');
            this._resizeSidebarContent();
            this._updateOptionsButton();
        },

        _closeSidebarOverlay: function() {
            if (!this._overlayOpen) {
                return;
            }
            this._overlayOpen = false;
            domClass.remove(this.domNode, 'copilotSidebarOverlayOpen');
            this._updateOptionsButton();
        },

        /**
         * ☰: when wide, show or hide the sidebar (the chat column takes the
         * space; the window keeps its size) and remember the choice; when
         * narrow, open or close the overlay.
         */
        toggleOptionsBar: function() {
            if (!this.optionsBarContainer) return;

            if (this._narrow) {
                if (this._overlayOpen) {
                    this._closeSidebarOverlay();
                } else {
                    this._openSidebarOverlay();
                }
                return;
            }

            this.optionsSidebarOpen = !this.optionsSidebarOpen;
            try {
                var storage = this._storage();
                if (storage) {
                    storage.setItem('copilot-floating-sidebar', this.optionsSidebarOpen ? 'open' : 'closed');
                }
            } catch (e) {
                // not remembered
            }
            if (this.optionsSidebarOpen) {
                this._attachSidebar();
            } else {
                this._detachSidebar();
            }
            this._layoutNow();
            this._updateOptionsButton();
        },

        _updateOptionsButton: function() {
            var optionsButton = this.headerNode && this.headerNode.querySelector('.copilotChatOptionsButton');
            if (!optionsButton) {
                return;
            }
            var open = this._narrow ? this._overlayOpen : this.optionsSidebarOpen;
            domStyle.set(optionsButton, { color: open ? '#2a7aeb' : 'inherit' });
        },

        destroy: function() {
            this._destroyed = true;
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
