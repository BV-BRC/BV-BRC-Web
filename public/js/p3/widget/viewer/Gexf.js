define([
    "dojo/_base/declare", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", 
    "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/request", "dojo/when",
    "../../WorkspaceManager", "../../util/PathJoin", 
    "dojo/query", "dojo/dom-geometry", "dojo/dom-style", "dojo/dom-construct",
    "../ActionBar", "../ItemDetailPanel", "../PerspectiveToolTip", "dojo/dom-class",
    "../SelectionToGroup", "dijit/Dialog",
    "dijit/TooltipDialog", "dijit/popup"
 

], function(
    declare, BorderContainer, ContentPane, 
    lang, on, Topic, xhr, when,
    WorkspaceManager, PathJoin, 
    query, domGeom, domStyle, domConstruct,
    ActionBar, ItemDetailPanel, PerspectiveToolTipDialog, domClass,
    SelectionToGroup, Dialog,
    TooltipDialog, popup
){
    var scriptsReady = false;
    var pendingCallbacks = [];

    var originalJQuery;
    var original$;
    
var loadGexfDependencies = function(callback) {
        if (scriptsReady) { callback(); return; }
        pendingCallbacks.push(callback);
        if (pendingCallbacks.length > 1) { return; }

        // --- NEW: Snapshot the original, site-wide jQuery before legacy scripts overwrite it ---
        if (typeof originalJQuery === 'undefined') {
            originalJQuery = window.jQuery;
            original$ = window.$;
        }
        
        var stylesToLoad =[
            '/vendor/gexf-js/styles/jquery-ui-1.10.3.custom.min.css',
            '/vendor/gexf-js/styles/gexfjs.css'
        ];

        stylesToLoad.forEach(function(href){
            if (!document.querySelector('link[href="' + href + '"]')) {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = href;
                
                // --- NEW: Tag the CSS element ---
                link.setAttribute('data-gexf-dep', 'true'); 
                
                document.getElementsByTagName('head')[0].appendChild(link);
            }
        });
        
        var scriptsToLoad =[
            '/vendor/gexf-js/js/jquery-2.0.2.min.js',
            '/vendor/gexf-js/js/jquery-ui-1.10.4.custom.min.js',
            '/vendor/gexf-js/js/jquery.mousewheel.min.js',
            '/vendor/gexf-js/js/gexfjs.js'
        ];
        
        var loadScript = function(index) {
            if (index >= scriptsToLoad.length) {
                scriptsReady = true;
                pendingCallbacks.forEach(function(cb){ cb(); });
                pendingCallbacks =[];
                return;
            }
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = scriptsToLoad[index];
            
            // --- NEW: Tag the Script element ---
            script.setAttribute('data-gexf-dep', 'true');
            
            script.onload = function() { loadScript(index + 1); };
            script.onerror = function() { console.error("Failed to load:", scriptsToLoad[index]); };
            document.getElementsByTagName('head')[0].appendChild(script);
        };
        loadScript(0);
    };

    // INHERITANCE CHANGE: Inherit from BorderContainer to manage layout
    return declare([BorderContainer], { 
        "baseClass": "Gexf",
        "disabled": false,
        "path": "",
        "file": null,
        "genomeNameMap": null,
        "sequenceNameMap": null,
        "namesLoading": false,
        "gutters": false, // No spacing between regions
        "graphSummary": null,
        "design": "headline",
        _resizeHandle: null,
        
        // Data management properties
        selection: null,
        containerType: "feature_data", // Default assumption

        // HTML Template for the CENTER region (The Graph)
        // Note: We hide the old #leftcolumn sidebar here
        graphTemplateString: `
            <div style="width: 100%; height: 100%; overflow: hidden;">
                <style>
                    /* Force canvas container to top-left of the CENTER pane */
                    #zonecentre { top: 0 !important; left: 0 !important; }
                    
                    #overviewzone {
                        top: 50px !important;
                        left: 10px !important;
                        bottom: auto !important;
                        right: auto !important;
                        background: rgba(255,255,255,0.7);
                        border: 1px solid #999;
                    }

                    /* HIDE THE OLD LEGACY SIDEBAR - We use ItemDetailPanel now */
                    #leftcolumn, #unfold {
                        display: none !important;
                    }
                    #titlebar {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 0px !important; /* Don't take up space */
                        
                        margin: 0 !important;
                        padding: 0 !important;
                        
                        /* CRITICAL: Allow children to be seen outside this 0px box */
                        overflow: visible !important;
                        
                        pointer-events: none !important;
                        z-index: 2000 !important; /* Highest layer */
                    }

                    /* Hide Main Title */
                    #maintitle {
                        display: none !important;
                    }
                    /* Search Bar Styling */
                    #recherche {
                        position: absolute !important;
                        top: 20px !important;
                        left: 240px !important;
                        right: auto !important;
                        bottom: auto !important;
                        display: block !important;
                        background: rgba(255,255,255,0.8);
                        padding: 5px;
                        border-radius: 4px;
                        pointer-events: auto !important;
                        z-index: 2001 !important;
                    }

                    #searchinput, #searchsubmit {
                        position: static !important; 
                        float: none !important;
                        top: auto !important; left: auto !important;
                        display: inline-block !important;
                        vertical-align: middle !important;
                        margin: 0 2px !important;
                        pointer-events: auto !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                </style>
                <div id="zonecentre" class="gradient" style="position: relative; width: 100%; height: 100%;">
                    <canvas id="carte" width="0" height="0"></canvas>
                    <ul id="ctlzoom">
                        <li><a href="#" id="zoomPlusButton"></a></li>
                        <li id="zoomSliderzone"><div id="zoomSlider"></div></li>
                        <li><a href="#" id="zoomMinusButton"></a></li>
                        <li><a href="#" id="lensButton"></a></li>
                        <li><a href="#" id="edgesButton"></a></li>
                    </ul>
                </div>
                <div id="overviewzone" class="gradient">
                    <canvas id="overview" width="0" height="0"></canvas>
                </div>
                <div id="titlebar"><div id="maintitle"></div><form id="recherche"><input id="searchinput" class="grey" autocomplete="off" /><input id="searchsubmit" type="submit" /></form></div>
                <ul id="autocomplete"></ul>
            </div>
        `,

        // Define Actions (copied and adapted from MSATree/GenomeList)
        selectionActions: [
            [
                "ToggleItemDetail",
                "fa icon-chevron-circle-right fa-2x",
                {
                    label: "HIDE",
                    persistent: true,
                    validTypes: ["*"],
                    tooltip: "Toggle Details Pane"
                },
                function(selection, container, button){
                    var children = this.getChildren();
                    if(children.some(function(child){ return this.itemDetailPanel && (child.id == this.itemDetailPanel.id); }, this)){
                        this.removeChild(this.itemDetailPanel);
                        query(".ActionButtonText", button).forEach(function(node){ node.innerHTML = "DETAILS"; });
                        query(".ActionButton", button).forEach(function(node){ domClass.remove(node, "icon-chevron-circle-right"); domClass.add(node, "icon-chevron-circle-left"); });
                    }else{
                        this.addChild(this.itemDetailPanel);
                        query(".ActionButtonText", button).forEach(function(node){ node.innerHTML = "HIDE"; });
                        query(".ActionButton", button).forEach(function(node){ domClass.remove(node, "icon-chevron-circle-left"); domClass.add(node, "icon-chevron-circle-right"); });
                    }
                },
                true
            ],
            [
                "BoxSelect",
                "fa icon-object-ungroup fa-2x",
                {
                    label: "SELECT",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes: ["*"],
                    tooltip: "Toggle Box Selection Tool (Drag box to select nodes; Shift/Cmd+Drag or Shift/Cmd+Click to add/toggle nodes)",
                    ignoreDataType: true
                },
                function(selection, container, button) {
                    if (window.GexfJS && GexfJS.params) {
                        GexfJS.params.boxSelectMode = !GexfJS.params.boxSelectMode;
                        var isActive = Boolean(GexfJS.params.boxSelectMode);
                        var carte = document.getElementById("carte");
                        if (carte) {
                            carte.style.cursor = isActive ? "crosshair" : "default";
                        }
                        document.body.style.cursor = isActive ? "crosshair" : "default";
                        var btnNode = button || (this.selectionActionBar._actions.BoxSelect && this.selectionActionBar._actions.BoxSelect.button);
                        if (btnNode) {
                            domStyle.set(btnNode, {
                                background: isActive ? "rgba(142, 36, 170, 0.28)" : "",
                                borderRadius: isActive ? "4px" : "",
                                boxShadow: isActive ? "inset 0 0 0 1px #8e24aa" : ""
                            });
                        }
                    }
                },
                true
            ],
            [
                "ColorSelection",
                "fa icon-paint-brush fa-2x",
                {
                    label: "PIN",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes:["*"],
                    tooltip: "Pin & Color Current Graph Selection",
                    ignoreDataType: true
                },
                function (selection) {
                    // Open the tooltip dialog we built in postCreate
                    popup.open({
                        popup: this.colorMenu,
                        around: this.selectionActionBar._actions.ColorSelection.button,
                        orient: ["above", "below"] // Action bar is on bottom right, "above" works well
                    });
                    if (window.GexfJS && GexfJS.params) {
                        var nameInput = document.getElementById("gexfPinNameInput");
                        if (nameInput) {
                            nameInput.value = GexfJS.params.currentHighlightName || "Custom Selection";
                        }
                    }
                },
                true
            ],
            [
                "HighlightColor",
                "fa icon-eye fa-2x", // Or any icon you prefer, e.g., icon-magic
                {
                    label: "HIGHLIGHT",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes:["*"],
                    tooltip: "Set Highlight Color Override",
                    ignoreDataType: true
                },
                function (selection) {
                    popup.open({
                        popup: this.hlColorMenu,
                        around: this.selectionActionBar._actions.HighlightColor.button,
                        orient: ["above", "below"]
                    });
                },
                true
            ],
            [
                "ResetColors",
                "fa icon-reset fa-2x",
                {
                    label: "RESET COLORS",
                    validTypes: ["*"],
                    multiple: true, // Allow it to work regardless of selection count
                    tooltip: "Clear all pinned colors",
                    validContainerTypes: ["feature_data", "genome_data"]
                },
                function(selection){
                    if (window.GexfJS && GexfJS.params) {
                        GexfJS.params.userPins = {}; // Clear user pins
                        this.rebuildPinnedElements(); // Rebuilds the graph to empty
                        
                        if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Graph Summary") !== -1) {
                            this.showDefaultSummary(); // Clear the Pinned Manifest UI
                        }
                    }
                },
                true
            ],
            [
                "BackgroundColor",
                "fa icon-desktop fa-2x", // Standard icon for background/display 
                {
                    label: "BG COLOR",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes:["*"],
                    tooltip: "Set Graph Background Color",
                    ignoreDataType: true
                },
                function (selection) {
                    popup.open({
                        popup: this.bgColorMenu,
                        around: this.selectionActionBar._actions.BackgroundColor.button,
                        orient: ["above", "below"]
                    });
                },
                true // Enabled by default
            ],
            [
                "ViewFeatureItem",
                "MultiButton fa icon-selection-Feature fa-2x",
                {
                    label: "FEATURE",
                    validTypes: ["*"],
                    multiple: false,
                    tooltip: "Switch to Feature View. Press and Hold for more options.",
                    validContainerTypes: ["feature_data"],
                    pressAndHold: function(selection, button, opts, evt){
                        popup.open({
                            popup: new PerspectiveToolTipDialog({ perspective: "Feature", perspectiveUrl: "/view/Feature/" + selection[0].feature_id }),
                            around: button,
                            orient: ["below"]
                        });
                    }
                },
                function(selection){
                    var sel = selection[0];
                    Topic.publish("/navigate", { href: "/view/Feature/" + sel.patric_id + "#view_tab=overview", target: "blank" });
                },
                false
            ],
            [
                "AddGroup",
                "fa icon-object-group fa-2x",
                {
                    label: "GROUP",
                    ignoreDataType: true,
                    multiple: true,
                    validTypes: ["*"],
                    requireAuth: true,
                    max: 10000,
                    tooltip: "Add selection to a new or existing Feature or Genome group",
                    validContainerTypes: ["feature_data", "genome_data"]
                },
                function(selection, containerWidget){
                    var dlg = new Dialog({ title: 'Add selected items to group' });
                    var type;

                    if (!containerWidget) {
                        return;
                    }

                    if (containerWidget.containerType == 'genome_data') {
                        type = 'genome_group';
                    } else if (containerWidget.containerType == 'feature_data') {
                        type = 'feature_group';
                    }

                    if (!type) {
                        console.error('Missing type for AddGroup');
                        return;
                    }
                    var defaultFolder = WorkspaceManager.getDefaultFolder(type);
                    var stg = new SelectionToGroup({
                        selection: selection,
                        selectType: true,
                        type: type,
                        inputType: containerWidget.containerType,
                        path: defaultFolder
                    });
                    on(dlg.domNode, 'dialogAction', function (evt) {
                        dlg.hide();
                        setTimeout(function () {
                        dlg.destroy();
                        }, 2000);
                    });
                    domConstruct.place(stg.domNode, dlg.containerNode, 'first');
                    stg.startup();
                    dlg.startup();
                    dlg.show();

                },
                false
            ],
            [
            "LabelSettings",
                "fa icon-tag fa-2x", 
                {
                    label: "LABELS",
                    persistent: true,
                    validTypes:["*"],
                    validContainerTypes:["*"],
                    tooltip: "Adjust Node Labels",
                    ignoreDataType: true
                },
                function (selection) {
                    // 1. OPEN THE POPUP FIRST
                    // This injects the tooltip into the actual page DOM.
                    popup.open({
                        popup: this.labelMenu,
                        around: this.selectionActionBar._actions.LabelSettings.button,
                        orient: ["above", "below"]
                    });
                    
                    // 2. SET THE VALUES AFTER IT IS OPEN
                    // Now document.getElementById will successfully find the elements.
                    if (window.GexfJS && GexfJS.params) {
                        var toggleInput = document.getElementById('gexfLabelToggle');
                        if (toggleInput) {
                            // Use the dedicated boolean we set up in the last step
                            toggleInput.checked = (GexfJS.params.showNodeLabels !== false); 
                        }
                        
                        var sizeInput = document.getElementById('gexfLabelSize');
                        if (sizeInput) {
                            sizeInput.value = GexfJS.params.labelSizeFactor || 1.0;
                        }
                    }
                },
                true
            ]
        ],
        

        setupActions: function () {
            this.selectionActions.forEach(function (a) {
                this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5], a[6], a[7], a[8], a[9], a[10]);
            }, this);
        },

        postCreate: function(){
            this.inherited(arguments); // Calls BorderContainer postCreate

            // --- 1. Pinned Color Menu ---
            var colorMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 8px; display: flex; flex-direction: column; gap: 6px; white-space: nowrap;">' +
                           '<div style="display: flex; align-items: center;">' +
                           '<span style="margin-right: 8px; font-weight: bold;">Pin Label:</span>' +
                           '<input type="text" id="gexfPinNameInput" placeholder="Pin name..." style="width: 170px; padding: 3px 6px; border: 1px solid #ccc; border-radius: 3px;">' +
                           '</div>' +
                           '<div style="display: flex; align-items: center;">' +
                           '<span style="margin-right: 10px; font-weight: bold;">Node/Edge Color:</span>' + 
                           '<input type="color" id="gexfColorPicker" value="#ff0000" style="cursor: pointer; margin-right: 15px; width: 30px; height: 30px; padding: 0; border: 1px solid #ccc;">' +
                           '<button id="gexfColorApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfColorCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div>' +
                           '</div>'
            });

            this.colorMenu = new TooltipDialog({ content: colorMenuDiv });

            on(colorMenuDiv, "#gexfColorApply:click", lang.hitch(this, function() {
                var color = document.getElementById('gexfColorPicker').value;
                var nameInput = document.getElementById('gexfPinNameInput');
                var customName = (nameInput && nameInput.value) ? nameInput.value.trim() : null;
                this.applyColorToGraph(color, customName);
                popup.close(this.colorMenu);
            }));

            // Explicit Close button handler
            on(colorMenuDiv, "#gexfColorCancel:click", lang.hitch(this, function() {
                popup.close(this.colorMenu);
            }));

            // --- 2. Highlight Color Override Menu ---
            var hlColorMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 8px; display: flex; align-items: center; white-space: nowrap;">' +
                           '<span style="margin-right: 10px; font-weight: bold;">Highlight Color:</span>' + 
                           '<input type="color" id="gexfHlColorPicker" value="#ff00ff" style="cursor: pointer; margin-right: 15px; width: 30px; height: 30px; padding: 0; border: 1px solid #ccc;">' +
                           '<button id="gexfHlColorApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfHlColorClear" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Clear</button>' +
                           '<button id="gexfHlColorCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div>'
            });

            this.hlColorMenu = new TooltipDialog({ content: hlColorMenuDiv });

            on(hlColorMenuDiv, "#gexfHlColorApply:click", lang.hitch(this, function() {
                var color = document.getElementById('gexfHlColorPicker').value;
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.highlightColorOverride = color;
                    delete GexfJS.oldParams.zoomLevel;
                }
                popup.close(this.hlColorMenu);
            }));

            on(hlColorMenuDiv, "#gexfHlColorClear:click", lang.hitch(this, function() {
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.highlightColorOverride = null;
                    delete GexfJS.oldParams.zoomLevel;
                }
                popup.close(this.hlColorMenu);
            }));

            // Explicit Close button handler
            on(hlColorMenuDiv, "#gexfHlColorCancel:click", lang.hitch(this, function() {
                popup.close(this.hlColorMenu);
            }));

            
            // --- 3. Background Color Menu ---
            var bgColorMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 8px; display: flex; align-items: center; white-space: nowrap;">' +
                           '<span style="margin-right: 10px; font-weight: bold;">Background:</span>' + 
                           '<input type="color" id="gexfBgColorPicker" value="#ffffff" style="cursor: pointer; margin-right: 15px; width: 30px; height: 30px; padding: 0; border: 1px solid #ccc;">' +
                           '<button id="gexfBgColorApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfBgColorReset" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Reset</button>' +
                           '<button id="gexfBgColorCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div>'
            });

            this.bgColorMenu = new TooltipDialog({ content: bgColorMenuDiv });

            on(bgColorMenuDiv, "#gexfBgColorApply:click", lang.hitch(this, function() {
                var color = document.getElementById('gexfBgColorPicker').value;
                var zc = document.getElementById('zonecentre');
                var oc = document.getElementById('overviewzone');
                
                if (zc) { domClass.remove(zc, 'gradient'); domStyle.set(zc, 'background', color); }
                if (oc) { domClass.remove(oc, 'gradient'); domStyle.set(oc, 'background', color); }
                popup.close(this.bgColorMenu);
            }));

            on(bgColorMenuDiv, "#gexfBgColorReset:click", lang.hitch(this, function() {
                var zc = document.getElementById('zonecentre');
                var oc = document.getElementById('overviewzone');
                
                if (zc) { domStyle.set(zc, 'background', ''); domClass.add(zc, 'gradient'); }
                if (oc) { domStyle.set(oc, 'background', ''); domClass.add(oc, 'gradient'); }
                popup.close(this.bgColorMenu);
            }));

            // Explicit Close button handler
            on(bgColorMenuDiv, "#gexfBgColorCancel:click", lang.hitch(this, function() {
                popup.close(this.bgColorMenu);
            }));

            var labelMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 8px; white-space: nowrap;">' +
                           '<div style="margin-bottom: 5px;"><label><input type="checkbox" id="gexfLabelToggle" checked style="vertical-align:middle; cursor:pointer;"> Show Node Labels</label></div>' +
                           '<div style="margin-bottom: 10px;"><label>Text Size Multiplier: <input type="number" id="gexfLabelSize" value="0.6" step="0.2" min="0.2" max="5.0" style="width: 50px; text-align:center;"></label></div>' +
                           '<div style="text-align:right;">' +
                           '<button id="gexfLabelApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfLabelCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div></div>'
            });

            this.labelMenu = new TooltipDialog({ content: labelMenuDiv });

            on(labelMenuDiv, "#gexfLabelApply:click", lang.hitch(this, function() {
                var showLabels = document.getElementById('gexfLabelToggle').checked;
                var labelSize = parseFloat(document.getElementById('gexfLabelSize').value) || 1.0;
                
                if (window.GexfJS && GexfJS.params) {
                    // --- CHANGED: Use a dedicated boolean, don't touch the threshold ---
                    GexfJS.params.showNodeLabels = showLabels; 
                    GexfJS.params.labelSizeFactor = labelSize;
                    
                    delete GexfJS.oldParams.zoomLevel; // Force redraw
                }
                popup.close(this.labelMenu);
            }));

            // Close Button Logic
            on(labelMenuDiv, "#gexfLabelCancel:click", lang.hitch(this, function() {
                popup.close(this.labelMenu);
            }));
            

            // 1. Create the Center Pane (The Graph)
            this.viewerPane = new ContentPane({
                region: "center",
                content: this.graphTemplateString,
                style: "padding:0; overflow:hidden;"
            });
            this.addChild(this.viewerPane);

            // 2. Create the Right Pane (ActionBar)
            this.selectionActionBar = new ActionBar({
                region: "right",
                layoutPriority: 2,
                style: "width:56px; text-align:center;",
                splitter: false,
                currentContainerWidget: this
            });
            this.addChild(this.selectionActionBar);

            // 3. Create the Right Pane (ItemDetailPanel)
            this.itemDetailPanel = new ItemDetailPanel({
                region: "right",
                style: "width:300px",
                splitter: true,
                layoutPriority: 1,
                containerWidget: this
            });
            this.addChild(this.itemDetailPanel);
            // 1. Add a unique class to our specific ItemDetailPanel's DOM node
            domClass.add(this.itemDetailPanel.domNode, "gexf-custom-idp");
            
            // 2. Create a style element
            var styleNode = document.createElement('style');
            styleNode.type = 'text/css';
            
            // 3. Write a rule that ONLY targets .noItemSelection inside our unique class
            var cssRule = ".gexf-custom-idp .noItemSelection { display: none !important; }";
            
            // 4. Safely append it
            if (styleNode.styleSheet) {
                styleNode.styleSheet.cssText = cssRule; // IE support
            } else {
                styleNode.appendChild(document.createTextNode(cssRule)); // Modern browsers
            }
            
            // 5. Inject directly into the document <head> so Dojo can't strip it
            document.getElementsByTagName('head')[0].appendChild(styleNode);

            this.setupActions();
            this.watch("state", lang.hitch(this, "onSetState"));
        },

        startup: function(){
            if (this._started){ return; }
            this.inherited(arguments);
            
            // Bind resize to the window to handle outer layout changes
            this._resizeHandle = on(window, 'resize', lang.hitch(this, function(){ this.resize(); }));
            
            this.itemDetailPanel.startup();
            this.selectionActionBar.startup();
            
            this.onSetState("state", null, this.state);
        },
        
        destroy: function(){
            // Clear resize listeners and rendering timers
            if (this._resizeHandle){ this._resizeHandle.remove(); }
            if (window.GexfJS && GexfJS.timeRefresh) { clearInterval(GexfJS.timeRefresh); }
            
            // --- START PRIORITY 1 CLEANUP ---
            
            // 1. Physically remove all legacy CSS and JS tags from the browser <head>
            var deps = document.querySelectorAll('[data-gexf-dep="true"]');
            for (var i = 0; i < deps.length; i++) {
                if (deps[i].parentNode) {
                    deps[i].parentNode.removeChild(deps[i]);
                }
            }

            // 2. Restore the original BV-BRC jQuery so the rest of the site works perfectly
            if (typeof originalJQuery !== 'undefined') window.jQuery = originalJQuery;
            if (typeof original$ !== 'undefined') window.$ = original$;

            // 3. Nuke the legacy global namespace to free up browser memory
            window.GexfJS = undefined;
            window.startGraphViewer = undefined;
            
            // 4. Clean up our custom monkey-patched global functions
            window.displayNode = undefined;
            window.highlightSpecial = undefined;
            window.removePin = undefined;
            window.doHighlightPath = undefined;
            window.toggleMutePins = undefined;
            window.toggleMuteDefaultColors = undefined;
            window.toggleGenomeFilter = undefined;
            window.toggleContigFilter = undefined;
            window.resetManifestFilter = undefined;
            window.onGenomeDetailsToggle = undefined;
            window.onGuideDetailsToggle = undefined;
            window.selectPhenomenonLocus = undefined;
            window.stepPhenomenonLocus = undefined;
            window.inspectNodeFromLocus = undefined;
            window.restorePhenomenonContext = undefined;
            window.setLocusFilterMode = undefined;
            window.toggleLocusGenomeSpotlight = undefined;
            window.onBoxSelectNodes = undefined;
            window.onAdditiveNodeClick = undefined;
            window.removeNodeFromSelection = undefined;

            // 5. Reset the module loader flag!
            // This guarantees that if the user clicks back to the graph later, 
            // the dependencies will be freshly injected and the legacy jQuery will be re-established.
            scriptsReady = false; 
            
            // --- END PRIORITY 1 CLEANUP ---

            this.inherited(arguments);
        },

        onSetState: function(attr, oldVal, state){
            if (!state || !state.search) return;
            var params = new URLSearchParams(state.search);
            var workspacePath = params.get('path');
            if (workspacePath) { this.loadAndRender(workspacePath); }
        },

        loadAndRender: function(path) {
            this.path = path;
            loadGexfDependencies(lang.hitch(this, function() {
                this.viewerPane.set("content", "<div style='padding:20px;'><i class='fa fa-spinner fa-spin'></i> Loading GEXF file...</div>");
                
                WorkspaceManager.getObject(this.path, false).then(
                    // Success Callback
                    lang.hitch(this, function(res){
                        if (res && res.data){
                            this.viewerPane.set("content", this.graphTemplateString);
                            setTimeout(lang.hitch(this, function() { this.renderGraph(res.data); }), 50);
                        } else {
                            this.viewerPane.set("content", "<div style='padding:20px; color:red;'>Error: File is empty or invalid.</div>");
                        }
                    }),
                    // --- NEW: Error Callback ---
                    lang.hitch(this, function(err) {
                        console.error("Workspace Fetch Error:", err);
                        this.viewerPane.set("content", "<div style='padding:20px; color:#d9534f;'><b>Workspace Error:</b> Could not retrieve file. The server may be experiencing issues or the file is too large to process.<br><br><i>" + err + "</i></div>");
                    })
                    // ---------------------------
                );
            }));
        },

        rebuildPinnedElements: function() {
            if (!window.GexfJS) return;
            GexfJS.params.pinnedElements = {};
            if (!GexfJS.params.pinsMuted && GexfJS.params.userPins) {
                Object.keys(GexfJS.params.userPins).forEach(function(pinName) {
                    var pinObj = GexfJS.params.userPins[pinName];
                    Object.keys(pinObj.elements).forEach(function(elId) {
                        GexfJS.params.pinnedElements[elId] = pinObj.color;
                    });
                });
            }
            if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel; 
        },

        buildPhenomenonLoci: function(type, rawEdges, explicitNodes) {
            if (!window.GexfJS || !GexfJS.graph) return [];
            var nodeList = GexfJS.graph.nodeList || [];
            var edgeList = GexfJS.graph.edgeList || [];
            var nodeById = {};
            var nodeIdxById = {};
            nodeList.forEach(function(n, idx) {
                nodeById[n.id] = n;
                nodeIdxById[n.id] = idx;
            });

            // Collect all nodes directly touched by either explicitNodes or rawEdges
            var involvedNodes = {};
            Object.keys(explicitNodes).forEach(function(nid) { involvedNodes[nid] = true; });
            Object.keys(rawEdges).forEach(function(eid) {
                var e = GexfJS.graph.edgeLookup[eid];
                if (e) {
                    var sn = nodeList[e.source];
                    var tn = nodeList[e.target];
                    if (sn) involvedNodes[sn.id] = true;
                    if (tn) involvedNodes[tn.id] = true;
                }
            });

            var involvedIds = Object.keys(involvedNodes);
            if (involvedIds.length === 0) return [];

            // Adjacency map across the full graph for 1-hop anchor discovery and degree analysis
            var adjEdgesByNodeId = {};
            edgeList.forEach(function(e) {
                var sn = nodeList[e.source];
                var tn = nodeList[e.target];
                if (!sn || !tn) return;
                if (!adjEdgesByNodeId[sn.id]) adjEdgesByNodeId[sn.id] = [];
                if (!adjEdgesByNodeId[tn.id]) adjEdgesByNodeId[tn.id] = [];
                adjEdgesByNodeId[sn.id].push({ edge: e, neighborId: tn.id });
                adjEdgesByNodeId[tn.id].push({ edge: e, neighborId: sn.id });
            });

            // Union-Find over involvedIds
            var parent = {};
            involvedIds.forEach(function(nid) { parent[nid] = nid; });
            var find = function(x) {
                while (parent[x] !== x) {
                    parent[x] = parent[parent[x]];
                    x = parent[x];
                }
                return x;
            };
            var union = function(a, b) {
                if (!(a in parent) || !(b in parent)) return;
                var ra = find(a), rb = find(b);
                if (ra !== rb) parent[ra] = rb;
            };

            // 1. Union endpoints of rawEdges
            Object.keys(rawEdges).forEach(function(eid) {
                var e = GexfJS.graph.edgeLookup[eid];
                if (e) {
                    var sn = nodeList[e.source];
                    var tn = nodeList[e.target];
                    if (sn && tn) union(sn.id, tn.id);
                }
            });

            // 2. Union adjacent involved nodes
            edgeList.forEach(function(e) {
                var sn = nodeList[e.source];
                var tn = nodeList[e.target];
                if (sn && tn && involvedNodes[sn.id] && involvedNodes[tn.id]) {
                    union(sn.id, tn.id);
                }
            });

            // 3. Union by shared superbubble_id or cnv_cluster_id when applicable
            var sbAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['superbubble_id'] : undefined;
            var cnvAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['cnv_cluster_id'] : undefined;
            var breakAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['assembly_repeat_break'] : undefined;
            if (type === 'superbubbles' && typeof sbAttrId !== 'undefined') {
                var bySb = {};
                involvedIds.forEach(function(nid) {
                    var n = nodeById[nid];
                    var val = (n && n.attributes && n.attributes[sbAttrId]) ? String(n.attributes[sbAttrId]).trim() : '';
                    if (val && val !== 'None' && val !== '0') {
                        val.split(',').forEach(function(tok) {
                            var t = tok.trim();
                            if (!t) return;
                            if (bySb[t]) union(bySb[t], nid);
                            else bySb[t] = nid;
                        });
                    }
                });
            } else if ((type === 'tandem_repeats' || type === 'fragmented_paralogs') && typeof cnvAttrId !== 'undefined') {
                var byCnv = {};
                involvedIds.forEach(function(nid) {
                    var n = nodeById[nid];
                    var val = (n && n.attributes && n.attributes[cnvAttrId]) ? String(n.attributes[cnvAttrId]).trim() : '';
                    if (val && val !== 'None' && val !== '0') {
                        if (byCnv[val]) union(byCnv[val], nid);
                        else byCnv[val] = nid;
                    }
                });
            }

            // Group nodes and edges into connected components
            var compMap = {};
            involvedIds.forEach(function(nid) {
                var r = find(nid);
                if (!compMap[r]) compMap[r] = { nodeIds: [], edgeIds: {} };
                compMap[r].nodeIds.push(nid);
            });

            Object.keys(rawEdges).forEach(function(eid) {
                var e = GexfJS.graph.edgeLookup[eid];
                if (e && nodeList[e.source]) {
                    var r = find(nodeList[e.source].id);
                    if (compMap[r]) compMap[r].edgeIds[eid] = true;
                }
            });

            var loci = [];
            Object.keys(compMap).forEach(function(rootId) {
                var c = compMap[rootId];

                // Distinguish Focal Variant Nodes from Boundary Conserved Anchor Nodes
                var focalIds = [];
                var boundaryAnchorSet = {};

                if (type === 'superbubbles') {
                    var hasExplicitSb = c.nodeIds.some(function(nid) { return Boolean(explicitNodes[nid]); });
                    var allExplicitSb = c.nodeIds.every(function(nid) { return Boolean(explicitNodes[nid]); });
                    if (hasExplicitSb && !allExplicitSb) {
                        // Interior variant nodes have is_superbubble=true; entry/exit pinch-point anchors are untagged endpoints of rawEdges
                        c.nodeIds.forEach(function(nid) {
                            if (explicitNodes[nid]) focalIds.push(nid);
                            else boundaryAnchorSet[nid] = true;
                        });
                    } else {
                        // Fallback for legacy GEXF files where entry/exit anchors also had is_superbubble=true
                        var interior = [];
                        var boundary = [];
                        c.nodeIds.forEach(function(nid) {
                            var inc = adjEdgesByNodeId[nid] || [];
                            var touchesExterior = inc.some(function(item) { return !rawEdges[item.edge.id]; });
                            if (touchesExterior) boundary.push(nid);
                            else interior.push(nid);
                        });
                        if (interior.length > 0) {
                            focalIds = interior;
                            boundary.forEach(function(bid) { boundaryAnchorSet[bid] = true; });
                        } else {
                            focalIds = c.nodeIds.slice();
                        }
                    }
                } else {
                    var hasExplicitInComp = c.nodeIds.some(function(nid) { return Boolean(explicitNodes[nid]); });
                    if (hasExplicitInComp && (type === 'alt_paths' || type === 'fragmented_paralogs' || type === 'tandem_repeats' || type === 'inversions')) {
                        c.nodeIds.forEach(function(nid) {
                            if (explicitNodes[nid]) focalIds.push(nid);
                            else boundaryAnchorSet[nid] = true;
                        });
                    } else {
                        focalIds = c.nodeIds.slice();
                    }
                }

                var focalSet = {};
                focalIds.forEach(function(nid) { focalSet[nid] = true; });

                // Discover 1-hop flanking conserved anchor nodes connected to focal nodes
                focalIds.forEach(function(nid) {
                    var inc = adjEdgesByNodeId[nid] || [];
                    inc.forEach(function(item) {
                        if (!focalSet[item.neighborId]) {
                            boundaryAnchorSet[item.neighborId] = true;
                        }
                        if (focalSet[item.neighborId] || Object.keys(c.edgeIds).length === 0) {
                            c.edgeIds[item.edge.id] = true;
                        }
                    });
                });

                var anchorIds = Object.keys(boundaryAnchorSet);
                var activeEdgeIds = Object.keys(c.edgeIds);

                // Discover Reference / Conserved Backbone Edges connecting the flanking anchors (or anchors to focal nodes along non-active edges)
                var referenceEdgeSet = {};
                anchorIds.forEach(function(aid) {
                    var inc = adjEdgesByNodeId[aid] || [];
                    inc.forEach(function(item) {
                        var eid = item.edge.id;
                        if (c.edgeIds[eid]) return;
                        if (boundaryAnchorSet[item.neighborId] || focalSet[item.neighborId]) {
                            referenceEdgeSet[eid] = true;
                        }
                    });
                });

                // Compute per-genome & per-contig copy counts (max per family/CNV cluster) and classify Event Carriers vs. Reference/Backbone
                var genomeCopies = {};
                var clusterCopiesByGenome = {};
                var genomeFocalContigs = {};
                var contigToGenome = {};
                focalIds.forEach(function(nid) {
                    var n = nodeById[nid];
                    if (n && n.featureMap) {
                        var cnvClusterKey = (typeof cnvAttrId !== 'undefined' && n.attributes && n.attributes[cnvAttrId] != null && String(n.attributes[cnvAttrId]) !== '' && String(n.attributes[cnvAttrId]) !== '0')
                            ? ('cnv_' + String(n.attributes[cnvAttrId]))
                            : ('node_' + nid);
                        for (var gid in n.featureMap) {
                            if (gid === 'info') continue;
                            var cMap = n.featureMap[gid];
                            if (cMap && typeof cMap === 'object') {
                                if (!genomeFocalContigs[gid]) genomeFocalContigs[gid] = {};
                                if (!clusterCopiesByGenome[gid]) clusterCopiesByGenome[gid] = {};
                                var nodeCopySum = 0;
                                for (var sid in cMap) {
                                    genomeFocalContigs[gid][sid] = true;
                                    contigToGenome[sid] = gid;
                                    var fArr = cMap[sid];
                                    var cnt = Array.isArray(fArr) ? fArr.length : 1;
                                    nodeCopySum += cnt;
                                }
                                clusterCopiesByGenome[gid][cnvClusterKey] = (clusterCopiesByGenome[gid][cnvClusterKey] || 0) + nodeCopySum;
                                if (clusterCopiesByGenome[gid][cnvClusterKey] > (genomeCopies[gid] || 0)) {
                                    genomeCopies[gid] = clusterCopiesByGenome[gid][cnvClusterKey];
                                }
                            }
                        }
                    }
                });
                anchorIds.forEach(function(aid) {
                    var n = nodeById[aid];
                    if (n && n.featureMap) {
                        for (var gid in n.featureMap) {
                            if (gid === 'info') continue;
                            var cMap = n.featureMap[gid];
                            if (cMap && typeof cMap === 'object') {
                                for (var sid in cMap) {
                                    contigToGenome[sid] = gid;
                                }
                            }
                        }
                    }
                });

                var eventGenomesSet = {};
                var eventContigsSet = {};
                var refGenomesSet = {};
                var refContigsSet = {};
                var eventRoleTitle = 'Variant / Event Carriers';
                var refRoleTitle = 'Flanking / Backbone Reference';

                // Collect all anchor genomes/contigs first
                var allAnchorGenomes = {};
                var allAnchorContigs = {};
                anchorIds.forEach(function(aid) {
                    var n = nodeById[aid];
                    if (n && n.genomes) Object.keys(n.genomes).forEach(function(g) { allAnchorGenomes[g] = true; });
                    if (n && n.sequences) Object.keys(n.sequences).forEach(function(s) { allAnchorContigs[s] = true; });
                });

                if (type === 'tandem_repeats' || type === 'fragmented_paralogs') {
                    eventRoleTitle = (type === 'fragmented_paralogs') ? 'Fragmented / Multi-Contig Carriers' : 'Multi-Copy CNV Carriers';
                    refRoleTitle = (type === 'fragmented_paralogs') ? 'Contiguous Reference Carriers' : 'Single-Copy / Collinear Reference';
                    var detourGenomes = {};
                    var detourContigs = {};
                    Object.keys(rawEdges).forEach(function(eid) {
                        if (!c.edgeIds[eid]) return;
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { detourGenomes[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { detourContigs[s] = true; });
                    });
                    Object.keys(genomeCopies).forEach(function(gid) {
                        var cSet = genomeFocalContigs[gid] || {};
                        var numContigs = Object.keys(cSet).length;
                        var isEvent = (type === 'fragmented_paralogs')
                            ? (numContigs > 1 || Boolean(detourGenomes[gid]))
                            : (genomeCopies[gid] > 1 || Boolean(detourGenomes[gid]));
                        if (isEvent) {
                            eventGenomesSet[gid] = true;
                            Object.keys(cSet).forEach(function(s) { eventContigsSet[s] = true; });
                        } else {
                            refGenomesSet[gid] = true;
                            Object.keys(cSet).forEach(function(s) { refContigsSet[s] = true; });
                        }
                    });
                    Object.keys(detourContigs).forEach(function(s) { eventContigsSet[s] = true; });
                    // If all genomes had 1 copy per node (e.g., 2 separate paralog nodes), fallback to showing all focal as event
                    if (Object.keys(eventGenomesSet).length === 0) {
                        Object.keys(genomeCopies).forEach(function(gid) {
                            eventGenomesSet[gid] = true;
                            Object.keys(genomeFocalContigs[gid] || {}).forEach(function(s) { eventContigsSet[s] = true; });
                        });
                        refGenomesSet = {};
                        refContigsSet = {};
                    }
                } else if (type === 'breaks') {
                    eventRoleTitle = 'Fragmented / Repeat-Broken Contigs';
                    refRoleTitle = 'Bridging Scaffold Reference';
                    var bridgeContigs = {};
                    var bridgeGenomes = {};
                    Object.keys(rawEdges).forEach(function(eid) {
                        if (!c.edgeIds[eid]) return;
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { bridgeGenomes[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { bridgeContigs[s] = true; });
                    });
                    focalIds.forEach(function(nid) {
                        var n = nodeById[nid];
                        if (!n) return;
                        var isBreakNode = (typeof breakAttrId !== 'undefined' && n.attributes && String(n.attributes[breakAttrId]).toLowerCase() === 'true');
                        if (n.sequences) {
                            Object.keys(n.sequences).forEach(function(s) {
                                if (bridgeContigs[s] && !isBreakNode) {
                                    refContigsSet[s] = true;
                                    if (contigToGenome[s]) refGenomesSet[contigToGenome[s]] = true;
                                } else if (!bridgeContigs[s]) {
                                    eventContigsSet[s] = true;
                                    if (contigToGenome[s]) eventGenomesSet[contigToGenome[s]] = true;
                                }
                            });
                        }
                    });
                    Object.keys(bridgeContigs).forEach(function(s) {
                        refContigsSet[s] = true;
                        if (contigToGenome[s]) refGenomesSet[contigToGenome[s]] = true;
                    });
                    Object.keys(bridgeGenomes).forEach(function(g) { refGenomesSet[g] = true; });
                    if (Object.keys(eventContigsSet).length === 0) {
                        focalIds.forEach(function(nid) {
                            var n = nodeById[nid];
                            if (n && n.sequences) Object.keys(n.sequences).forEach(function(s) { eventContigsSet[s] = true; });
                            if (n && n.genomes) Object.keys(n.genomes).forEach(function(g) { eventGenomesSet[g] = true; });
                        });
                    }
                } else if (type === 'inversions') {
                    // Recover relative orientation split across undirected inverted_block edges using sequential feature positions
                    eventRoleTitle = 'Inverted / Minority Orientation (-)';
                    refRoleTitle = 'Majority / Consensus Orientation (+)';

                    var getFeatPos = function(nodeObj, gid, sid) {
                        if (!nodeObj || !nodeObj.featureMap) return null;
                        if (nodeObj.featureMap.info && nodeObj.featureMap.info[gid] && nodeObj.featureMap.info[gid][sid] &&
                            nodeObj.featureMap.info[gid][sid][0] && typeof nodeObj.featureMap.info[gid][sid][0].start !== 'undefined') {
                            var st = parseInt(nodeObj.featureMap.info[gid][sid][0].start, 10);
                            if (!isNaN(st)) return st;
                        }
                        if (nodeObj.featureMap[gid] && nodeObj.featureMap[gid][sid] && nodeObj.featureMap[gid][sid][0]) {
                            var fid = String(nodeObj.featureMap[gid][sid][0]);
                            var m = fid.match(/(\d+)$/);
                            if (m) return parseInt(m[1], 10);
                        }
                        return null;
                    };

                    var pairSigns = {};
                    var allInvGenomes = Object.keys(genomeFocalContigs);
                    allInvGenomes.forEach(function(g) { pairSigns[g] = {}; });

                    // 1. Compare coordinate step direction (pv - pu) across every internal edge of the inverted block
                    activeEdgeIds.forEach(function(eid) {
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (!e) return;
                        var uNode = GexfJS.graph.nodeList[e.source];
                        var vNode = GexfJS.graph.nodeList[e.target];
                        if (!uNode || !vNode || !uNode.featureMap || !vNode.featureMap) return;

                        var edgeDirs = {};
                        allInvGenomes.forEach(function(g) {
                            var uContigs = uNode.featureMap[g];
                            var vContigs = vNode.featureMap[g];
                            if (!uContigs || !vContigs) return;
                            for (var sid in uContigs) {
                                if (vContigs[sid]) {
                                    var pu = getFeatPos(uNode, g, sid);
                                    var pv = getFeatPos(vNode, g, sid);
                                    if (pu !== null && pv !== null && pv !== pu) {
                                        edgeDirs[g] = (pv > pu) ? 1 : -1;
                                        break;
                                    }
                                }
                            }
                        });

                        var dirGens = Object.keys(edgeDirs);
                        for (var i = 0; i < dirGens.length; i++) {
                            for (var j = i + 1; j < dirGens.length; j++) {
                                var g1 = dirGens[i], g2 = dirGens[j];
                                var prod = edgeDirs[g1] * edgeDirs[g2];
                                pairSigns[g1][g2] = (pairSigns[g1][g2] || 0) + prod;
                                pairSigns[g2][g1] = (pairSigns[g2][g1] || 0) + prod;
                            }
                        }
                    });

                    // 2. Reinforce with boundary edges connecting flanking anchors to opposite ends of the inverted block
                    anchorIds.forEach(function(aid) {
                        var inc = adjEdgesByNodeId[aid] || [];
                        var boundaryEdges = [];
                        inc.forEach(function(item) {
                            if (focalSet[item.neighborId] && item.edge && item.edge.genomes) {
                                boundaryEdges.push(Object.keys(item.edge.genomes));
                            }
                        });
                        if (boundaryEdges.length > 1) {
                            for (var b1 = 0; b1 < boundaryEdges.length; b1++) {
                                var gens1 = boundaryEdges[b1];
                                for (var p = 0; p < gens1.length; p++) {
                                    for (var q = p + 1; q < gens1.length; q++) {
                                        if (pairSigns[gens1[p]] && pairSigns[gens1[q]]) {
                                            pairSigns[gens1[p]][gens1[q]] = (pairSigns[gens1[p]][gens1[q]] || 0) + 2;
                                            pairSigns[gens1[q]][gens1[p]] = (pairSigns[gens1[q]][gens1[p]] || 0) + 2;
                                        }
                                    }
                                }
                                for (var b2 = b1 + 1; b2 < boundaryEdges.length; b2++) {
                                    var gens2 = boundaryEdges[b2];
                                    gens1.forEach(function(ga) {
                                        gens2.forEach(function(gb) {
                                            if (ga !== gb && pairSigns[ga] && pairSigns[gb]) {
                                                pairSigns[ga][gb] = (pairSigns[ga][gb] || 0) - 2;
                                                pairSigns[gb][ga] = (pairSigns[gb][ga] || 0) - 2;
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    });

                    // 3. Partition genomes into two orientation groups (grpA vs grpB)
                    if (allInvGenomes.length > 0) {
                        var seedG = allInvGenomes[0];
                        var bestScore = -1;
                        allInvGenomes.forEach(function(g) {
                            var sScore = 0;
                            for (var other in pairSigns[g]) {
                                sScore += Math.abs(pairSigns[g][other]);
                            }
                            if (sScore > bestScore) {
                                bestScore = sScore;
                                seedG = g;
                            }
                        });

                        var grpA = [seedG];
                        var grpB = [];
                        allInvGenomes.forEach(function(g) {
                            if (g === seedG) return;
                            var rel = (pairSigns[seedG] && typeof pairSigns[seedG][g] === 'number') ? pairSigns[seedG][g] : 0;
                            if (rel < 0) {
                                grpB.push(g);
                            } else {
                                grpA.push(g);
                            }
                        });

                        if (grpB.length > 0) {
                            var invGrp = grpB;
                            var refGrp = grpA;
                            if (grpA.length < grpB.length) {
                                invGrp = grpA;
                                refGrp = grpB;
                            } else if (grpA.length === grpB.length) {
                                eventRoleTitle = 'Orientation B (Inverted vs. A)';
                                refRoleTitle = 'Orientation A (Reference)';
                            }
                            invGrp.forEach(function(g) {
                                eventGenomesSet[g] = true;
                                Object.keys(genomeFocalContigs[g] || {}).forEach(function(s) { eventContigsSet[s] = true; });
                            });
                            refGrp.forEach(function(g) {
                                refGenomesSet[g] = true;
                                Object.keys(genomeFocalContigs[g] || {}).forEach(function(s) { refContigsSet[s] = true; });
                            });

                            // Highlight boundary crossover edges carried strictly by the inverted orientation as dashed active edges
                            Object.keys(referenceEdgeSet).forEach(function(reid) {
                                var reObj = GexfJS.graph.edgeLookup[reid];
                                if (!reObj || !reObj.genomes) return;
                                var reGens = Object.keys(reObj.genomes);
                                var hasInv = false, hasRef = false;
                                reGens.forEach(function(rg) {
                                    if (eventGenomesSet[rg]) hasInv = true;
                                    if (refGenomesSet[rg]) hasRef = true;
                                });
                                if (hasInv && !hasRef) {
                                    delete referenceEdgeSet[reid];
                                    if (activeEdgeIds.indexOf(reid) === -1) activeEdgeIds.push(reid);
                                    if (GexfJS.params.allPhenomDashedEdges) GexfJS.params.allPhenomDashedEdges[reid] = true;
                                }
                            });
                        } else {
                            // Fallback if only one orientation is present on the internal edge (e.g., single-strain edge): contrast against flanking anchors
                            allInvGenomes.forEach(function(g) {
                                eventGenomesSet[g] = true;
                                Object.keys(genomeFocalContigs[g] || {}).forEach(function(s) { eventContigsSet[s] = true; });
                            });
                        }
                    }
                } else {
                    // Superbubbles, Alt Paths, Rearrangements
                    if (type === 'superbubbles') {
                        eventRoleTitle = 'Interior Allele / Cassette Carriers';
                        refRoleTitle = 'Conserved Boundary / Alternate Carriers';
                    } else if (type === 'alt_paths') {
                        eventRoleTitle = 'Accessory Island / Indel Carriers';
                        refRoleTitle = 'Backbone Reference (Without Detour)';
                    } else if (type === 'rearrangements') {
                        eventRoleTitle = 'Rearranged / Breakpoint Carriers';
                        refRoleTitle = 'Collinear Reference Flanking Blocks';
                    }

                    focalIds.forEach(function(nid) {
                        var n = nodeById[nid];
                        if (n && n.genomes) Object.keys(n.genomes).forEach(function(g) { eventGenomesSet[g] = true; });
                        if (n && n.sequences) Object.keys(n.sequences).forEach(function(s) { eventContigsSet[s] = true; });
                    });
                    activeEdgeIds.forEach(function(eid) {
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { eventGenomesSet[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { eventContigsSet[s] = true; });
                    });
                }

                // Any genome/contig on the flanking anchors not already in eventContigsSet is part of the flanking reference context
                Object.keys(allAnchorGenomes).forEach(function(g) {
                    if (!eventGenomesSet[g]) refGenomesSet[g] = true;
                });
                Object.keys(allAnchorContigs).forEach(function(s) {
                    if (!eventContigsSet[s]) refContigsSet[s] = true;
                });

                // Union of all genomes and contigs involved in this locus (Event + Flanking Anchor Reference)
                var allLocusGenomes = {};
                var allLocusContigs = {};
                Object.keys(eventGenomesSet).forEach(function(g) { allLocusGenomes[g] = true; });
                Object.keys(refGenomesSet).forEach(function(g) { allLocusGenomes[g] = true; });
                Object.keys(eventContigsSet).forEach(function(s) { allLocusContigs[s] = true; });
                Object.keys(refContigsSet).forEach(function(s) { allLocusContigs[s] = true; });

                // Build a concise human-readable locus summary label
                var pickLabels = function(ids) {
                    var named = [];
                    var fallback = [];
                    ids.forEach(function(nid) {
                        var n = nodeById[nid];
                        if (!n) return;
                        var lbl = String(n.label || n.id).trim();
                        if (lbl.toLowerCase().indexOf('hypothetical') === -1 && lbl.toLowerCase().indexOf('fig|') === -1) {
                            if (named.indexOf(lbl) === -1) named.push(lbl);
                        } else if (fallback.indexOf(lbl) === -1) {
                            fallback.push(lbl);
                        }
                    });
                    return named.length > 0 ? named : fallback;
                };

                var repLabels = pickLabels(focalIds);
                if (repLabels.length === 0 || (repLabels.length === 1 && repLabels[0].toLowerCase().indexOf('hypothetical') !== -1 && anchorIds.length > 0)) {
                    var anchorLabels = pickLabels(anchorIds);
                    if (anchorLabels.length > 0) repLabels = anchorLabels;
                }
                var shortTitle = repLabels.slice(0, 2).map(function(l) {
                    return l.length > 26 ? l.substr(0, 24) + '...' : l;
                }).join(' / ');
                if (!shortTitle) shortTitle = 'Node ' + focalIds[0];

                var evGenCount = Object.keys(eventGenomesSet).length;
                var totGenCount = Object.keys(allLocusGenomes).length;

                loci.push({
                    focalNodeIds: focalIds,
                    anchorNodeIds: anchorIds,
                    activeEdgeIds: activeEdgeIds,
                    referenceEdgeIds: Object.keys(referenceEdgeSet),
                    eventGenomes: Object.keys(eventGenomesSet),
                    eventContigs: Object.keys(eventContigsSet),
                    refGenomes: Object.keys(refGenomesSet),
                    refContigs: Object.keys(refContigsSet),
                    allLocusContigs: allLocusContigs,
                    eventOnlyContigs: eventContigsSet,
                    genomeCopies: genomeCopies,
                    genomeFocalContigs: genomeFocalContigs,
                    contigToGenome: contigToGenome,
                    eventRoleTitle: eventRoleTitle,
                    refRoleTitle: refRoleTitle,
                    genomeCount: evGenCount || totGenCount,
                    totalLocusGenomes: totGenCount,
                    contigCount: Object.keys(eventContigsSet).length || Object.keys(allLocusContigs).length,
                    totalLocusContigs: Object.keys(allLocusContigs).length,
                    shortTitle: shortTitle,
                    nodeIdxById: nodeIdxById,
                    nodeById: nodeById
                });
            });

            // Sort loci: largest / most connected first, then by genome count
            loci.sort(function(a, b) {
                var scoreA = a.focalNodeIds.length * 2 + a.activeEdgeIds.length;
                var scoreB = b.focalNodeIds.length * 2 + b.activeEdgeIds.length;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return b.genomeCount - a.genomeCount;
            });

            loci.forEach(function(loc, idx) {
                loc.index = idx;
                loc.dropdownLabel = '#' + (idx + 1) + ': ' + loc.shortTitle + ' (' + loc.focalNodeIds.length + (loc.focalNodeIds.length === 1 ? ' gene, ' : ' genes, ') + loc.genomeCount + ' gen)';
            });

            return loci;
        },

        applyPhenomenonLocusState: function(autoPan) {
            if (!window.GexfJS || !GexfJS.params || !GexfJS.graph) return;
            var loci = GexfJS.params.phenomenonLoci || [];
            var idx = (typeof GexfJS.params.activeLocusIndex === 'number') ? GexfJS.params.activeLocusIndex : -1;
            var hlColor = GexfJS.params.highlightColorOverride || '#d500f9';
            var filterMode = GexfJS.params.locusFilterMode || 'locus'; // 'locus' (Event + Ref), 'event' (Event only), 'subgraph', or 'off'

            GexfJS.params.activeEdges = {};
            GexfJS.params.activeNodes = {};
            GexfJS.params.anchorNodes = {};
            GexfJS.params.dashedEdges = {};
            GexfJS.params.referenceEdges = {};
            GexfJS.params.locusContigFilter = {};
            GexfJS.params.locusSpotlightActive = false;
            GexfJS.params.locusNodeSpotlight = {};
            GexfJS.params.locusEdgeSpotlight = {};
            GexfJS.params.activeNode = -1;
            GexfJS.params.currentNode = -1;
            this.rebuildPinnedElements();

            var isSingleLocus = (idx >= 0 && idx < loci.length);
            GexfJS.params.focusLocusActive = isSingleLocus;
            var targetLoci = isSingleLocus ? [loci[idx]] : loci;

            targetLoci.forEach(function(loc) {
                loc.focalNodeIds.forEach(function(nid) {
                    GexfJS.params.activeNodes[nid] = true;
                    GexfJS.params.pinnedElements['n_' + nid] = hlColor;
                });
                loc.anchorNodeIds.forEach(function(aid) {
                    if (!GexfJS.params.activeNodes[aid]) {
                        GexfJS.params.anchorNodes[aid] = true;
                    }
                });
                loc.activeEdgeIds.forEach(function(eid) {
                    GexfJS.params.activeEdges[eid] = true;
                    GexfJS.params.pinnedElements['e_' + eid] = hlColor;
                    if (GexfJS.params.allPhenomDashedEdges && GexfJS.params.allPhenomDashedEdges[eid]) {
                        GexfJS.params.dashedEdges[eid] = true;
                    }
                });
                if (isSingleLocus && loc.referenceEdgeIds) {
                    loc.referenceEdgeIds.forEach(function(reid) {
                        if (!GexfJS.params.activeEdges[reid]) {
                            GexfJS.params.referenceEdges[reid] = true;
                        }
                    });
                }
            });

            // Apply dynamic contig filtering when focused on a single locus
            if (isSingleLocus && filterMode !== 'off' && filterMode !== 'subgraph') {
                var activeLoc = loci[idx];
                var sourceContigSet = (filterMode === 'event' && Object.keys(activeLoc.eventOnlyContigs).length > 0)
                    ? activeLoc.eventOnlyContigs
                    : activeLoc.allLocusContigs;
                Object.keys(sourceContigSet).forEach(function(cid) {
                    GexfJS.params.locusContigFilter[cid] = true;
                });
            }

            // Compute Locus Contig Spotlight (dynamic highlighting of selected contig(s) within and beyond the focused locus)
            var spotMap = GexfJS.params.locusSpotlightContigs || {};
            var spotContigIds = isSingleLocus ? Object.keys(spotMap) : [];
            if (isSingleLocus && spotContigIds.length > 0) {
                var sLoc = loci[idx];
                var allLocNodeIds = sLoc.focalNodeIds.concat(sLoc.anchorNodeIds);
                var locNodeSet = {};
                allLocNodeIds.forEach(function(nid) { locNodeSet[nid] = true; });

                var extractFeatInfo = function(nodeObj, cid) {
                    if (!nodeObj || !nodeObj.featureMap) return null;
                    var gid = sLoc.contigToGenome[cid];
                    var fList = null;
                    if (gid && nodeObj.featureMap[gid] && nodeObj.featureMap[gid][cid]) {
                        fList = nodeObj.featureMap[gid][cid];
                    } else {
                        for (var gKey in nodeObj.featureMap) {
                            if (gKey === 'info') continue;
                            if (nodeObj.featureMap[gKey] && nodeObj.featureMap[gKey][cid]) {
                                gid = gKey;
                                fList = nodeObj.featureMap[gKey][cid];
                                break;
                            }
                        }
                    }
                    if (!fList || !fList.length) return null;
                    var pos = null;
                    if (gid && nodeObj.featureMap.info && nodeObj.featureMap.info[gid] && nodeObj.featureMap.info[gid][cid] &&
                        nodeObj.featureMap.info[gid][cid][0] && typeof nodeObj.featureMap.info[gid][cid][0].start !== 'undefined') {
                        var st = parseInt(nodeObj.featureMap.info[gid][cid][0].start, 10);
                        if (!isNaN(st)) pos = st;
                    }
                    var pegNums = [];
                    fList.forEach(function(fid) {
                        var m = String(fid).match(/(\d+)$/);
                        if (m) pegNums.push(parseInt(m[1], 10));
                    });
                    if (pos === null && pegNums.length > 0) pos = pegNums[0];
                    var tag = pegNums.length > 0 ? ('peg.' + pegNums.join(',')) : cid;
                    return { pos: pos, tag: tag };
                };

                var anyFound = false;
                GexfJS.graph.nodeList.forEach(function(nObj) {
                    if (!nObj) return;
                    var inLocus = Boolean(locNodeSet[nObj.id]);
                    var hasEv = false, hasRf = false;
                    var tags = [];
                    spotContigIds.forEach(function(cid) {
                        var role = spotMap[cid];
                        var hasSeq = Boolean(nObj.sequences && nObj.sequences[cid]);
                        var fInfo = (inLocus || hasSeq) ? extractFeatInfo(nObj, cid) : null;
                        var onNode = Boolean(hasSeq || fInfo);
                        if (onNode) {
                            if (role === 'event') hasEv = true;
                            else hasRf = true;
                            if (inLocus && fInfo && fInfo.tag && tags.indexOf(fInfo.tag) === -1) {
                                tags.push(fInfo.tag);
                            }
                        }
                    });
                    if (hasEv || hasRf) {
                        anyFound = true;
                        GexfJS.params.locusNodeSpotlight[nObj.id] = {
                            hasEvent: hasEv,
                            hasRef: hasRf,
                            inLocus: inLocus,
                            featTag: inLocus ? tags.slice(0, 2).join(' | ') : ''
                        };
                    }
                });

                GexfJS.graph.edgeList.forEach(function(e) {
                    var uNode = GexfJS.graph.nodeList[e.source];
                    var vNode = GexfJS.graph.nodeList[e.target];
                    if (!uNode || !vNode) return;
                    var inLocus = Boolean(locNodeSet[uNode.id] && locNodeSet[vNode.id]);

                    var hasEv = false, hasRf = false;
                    var evDir = 0, rfDir = 0;
                    spotContigIds.forEach(function(cid) {
                        var role = spotMap[cid];
                        var onEdge = Boolean(e.sequences && e.sequences[cid]);
                        var uInfo = (inLocus || onEdge) ? extractFeatInfo(uNode, cid) : null;
                        var vInfo = (inLocus || onEdge) ? extractFeatInfo(vNode, cid) : null;
                        // Also highlight edge if both endpoint locus nodes contain this contig and the edge is an active/reference locus edge
                        if (!onEdge && inLocus && uInfo && vInfo && (GexfJS.params.activeEdges[e.id] || GexfJS.params.referenceEdges[e.id])) {
                            if (uInfo.pos !== null && vInfo.pos !== null && Math.abs(vInfo.pos - uInfo.pos) <= 15) {
                                onEdge = true;
                            }
                        }
                        if (onEdge) {
                            var dir = 0;
                            if (uInfo && vInfo && uInfo.pos !== null && vInfo.pos !== null && uInfo.pos !== vInfo.pos) {
                                dir = (vInfo.pos > uInfo.pos) ? 1 : -1;
                            }
                            if (role === 'event') {
                                hasEv = true;
                                if (dir !== 0) evDir = dir;
                            } else {
                                hasRf = true;
                                if (dir !== 0) rfDir = dir;
                            }
                        }
                    });
                    if (hasEv || hasRf) {
                        GexfJS.params.locusEdgeSpotlight[e.id] = {
                            hasEvent: hasEv,
                            hasRef: hasRf,
                            inLocus: inLocus,
                            eventDir: evDir,
                            refDir: rfDir
                        };
                    }
                });

                GexfJS.params.locusSpotlightActive = anyFound;
            }

            GexfJS.params.path_active = !jQuery.isEmptyObject(GexfJS.params.activeEdges);

            // Auto-pan & high-magnification auto-zoom to frame the active locus and its flanking anchors
            if (autoPan && isSingleLocus) {
                var loc = loci[idx];
                var frameNodeIds = loc.focalNodeIds.concat(loc.anchorNodeIds);
                var xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9, count = 0;
                frameNodeIds.forEach(function(nid) {
                    var nIdx = loc.nodeIdxById[nid];
                    var n = (typeof nIdx !== 'undefined') ? GexfJS.graph.nodeList[nIdx] : null;
                    if (n && n.coords && n.coords.base) {
                        var bx = n.coords.base.x;
                        var by = n.coords.base.y;
                        var br = n.coords.base.r || 2;
                        xmin = Math.min(xmin, bx - br);
                        xmax = Math.max(xmax, bx + br);
                        ymin = Math.min(ymin, by - br);
                        ymax = Math.max(ymax, by + br);
                        count++;
                    }
                });
                if (count > 0) {
                    GexfJS.params.centreX = (xmin + xmax) / 2;
                    GexfJS.params.centreY = (ymin + ymax) / 2;
                    var rawW = Math.max(1.5, xmax - xmin);
                    var rawH = Math.max(1.5, ymax - ymin);
                    var padX = Math.max(2.5, rawW * 0.25);
                    var padY = Math.max(2.5, rawH * 0.25);
                    var spanX = rawW + padX * 2;
                    var spanY = rawH + padY * 2;
                    var gw = (GexfJS.graphZone && GexfJS.graphZone.width > 100) ? GexfJS.graphZone.width : 800;
                    var gh = (GexfJS.graphZone && GexfJS.graphZone.height > 100) ? GexfJS.graphZone.height : 600;
                    var targetScale = Math.min((gw * 0.72) / spanX, (gh * 0.72) / spanY);
                    var idealZoom = Math.round(Math.log(targetScale) / Math.log(Math.SQRT2));
                    GexfJS.params.zoomLevel = Math.max(8, Math.min(15, idealZoom));
                }
            }

            delete GexfJS.oldParams.zoomLevel;
        },

        fetchManifestNames: function(contigMap) {
            this.namesLoading = true;
            this.genomeNameMap = {};
            this.sequenceNameMap = {};

            var seqIds = [];
            Object.keys(contigMap).forEach(function(gid) {
                seqIds = seqIds.concat(contigMap[gid]);
            });

            if (seqIds.length === 0) {
                this.namesLoading = false;
                return;
            }

            // Solr typically crashes if an in() clause exceeds 1024 items.
            // We cap it at 1000. Any contigs beyond 1000 will just safely 
            // fall back to displaying their raw Accession ID in the UI.
            if (seqIds.length > 1000) {
                seqIds = seqIds.slice(0, 1000);
            }

            // A single query to 'genome_sequence' returns BOTH the sequence description AND its parent genome name!
            var url = PathJoin(window.App.dataAPI, "genome_sequence");
            var query = "in(sequence_id,(" + seqIds.map(encodeURIComponent).join(",") + "))&select(sequence_id,description,genome_id,genome_name)&limit(25000)";

            xhr.post(url, {
                headers: {
                    accept: "application/json",
                    "X-Requested-With": null,
                    Authorization: (window.App.authorizationToken || "")
                },
                handleAs: "json",
                data: query
            }).then(lang.hitch(this, function(records) {
                // Populate the dictionaries
                records.forEach(lang.hitch(this, function(rec) {
                    if (rec.genome_id && rec.genome_name) {
                        this.genomeNameMap[rec.genome_id] = rec.genome_name;
                    }
                    if (rec.sequence_id && rec.description) {
                        this.sequenceNameMap[rec.sequence_id] = rec.description;
                    }
                }));
                
                this.namesLoading = false;
                
                // Repaint the panel if the user is currently looking at the Graph Summary
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Genome Manifest") !== -1) {
                    this.showDefaultSummary();
                }
            }), lang.hitch(this, function(err) {
                console.error("Failed to fetch manifest names", err);
                this.namesLoading = false;
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Genome Manifest") !== -1) {
                    this.showDefaultSummary();
                }
            }));
        },

        showDefaultSummary: function() {
            if (!this.graphSummary || !this.itemDetailPanel || !this.itemDetailPanel.customDisplayNode) {
                // If no summary exists, default to clearing the panel
                this.itemDetailPanel.set('selection',[]);
                return;
            }

            var s = this.graphSummary;
            
            // Resolve edge attribute IDs for safe displayPath calls
            var genomeAttrId = 'genomes';
            var sequenceAttrId = 'sequences';
            if (window.GexfJS && GexfJS._edge_attr_value) {
                if (GexfJS._edge_attr_value['genomes']) genomeAttrId = GexfJS._edge_attr_value['genomes'];
                if (GexfJS._edge_attr_value['sequences']) sequenceAttrId = GexfJS._edge_attr_value['sequences'];
            }

            var html = '<div style="padding:10px;">';
            html += '<h3 style="margin-top:0;">Graph Summary</h3>';
            
            // Basic Statistics ("Total" counts)
            html += '<table style="width:100%; font-size:0.95em; margin-bottom:12px; border-collapse: collapse;">';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Genomes:</b></td><td style="text-align:right;">' + (s.total_genomes || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Contigs:</b></td><td style="text-align:right;">' + (s.total_contigs || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Features:</b></td><td style="text-align:right;">' + (s.total_features || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Nodes:</b></td><td style="text-align:right;">' + (s.total_nodes || 0) + '</td></tr>';
            html += '</table>';

            // Collapsible Biological Phenomena Guide (placed directly between Total counts and Phenomena menu)
            var guideOpenAttr = this.guideExpanded ? ' open' : '';
            html += '<details' + guideOpenAttr + ' ontoggle="window.onGuideDetailsToggle(this.open)" style="margin-bottom:12px; font-size:0.84em; background:#f4f8fb; border:1px solid #d9e8f5; border-radius:4px; padding:6px 8px;">';
            html += '<summary style="cursor:pointer; font-weight:bold; color:#2b5c8f; outline:none;"><i class="fa icon-info-circle"></i> Guide to Biological Phenomena</summary>';
            html += '<div style="margin-top:6px; line-height:1.38; color:#444;">';
            html += '<div style="margin-bottom:5px;"><b>1. Accessory &amp; Allelic Variation:</b><br>&bull; <i>Bounded Variable Loci (Superbubbles):</i> Cleanly bounded multi-allelic replacements, metabolic cassettes, or small indels flanked by the same conserved core anchor genes.<br>&bull; <i>Accessory Islands &amp; Indels (Alt Paths):</i> Asymmetric minority detours, genomic islands, prophages, or HGT insertions branching off the conserved chromosomal backbone.</div>';
            html += '<div style="margin-bottom:5px;"><b>2. Repeats &amp; Paralog Expansion:</b><br>&bull; <i>Local / Tandem CNVs:</i> Co-localized tandem gene duplications and local paralogous copy-number expansions.<br>&bull; <i>Fragmented Localized Repeats (Fragmented CNV):</i> Localized repeats that are contiguous on reference contigs but split across multiple contigs in incomplete or misassembled genomes.</div>';
            html += '<div style="margin-bottom:5px;"><b>3. Chromosomal Architecture:</b><br>&bull; <i>Synteny Breakpoints (Rearrangements):</i> Large-scale chromosomal translocations, NAHR-mediated fusions, or chimeric misassemblies joining distinct syntenic blocks.<br>&bull; <i>Inverted Syntenic Blocks:</i> Contiguous gene chains reversed in orientation relative to the consensus pan-genome coordinate frame.</div>';
            html += '<div><b>4. Assembly &amp; Scaffolding:</b><br>&bull; <i>Repeat Breaks &amp; Scaffolds:</i> Contig ends shattered inside shared repetitive elements paired with candidate reference-guided scaffold bridges.</div>';
            html += '</div></details>';

            // Map the old/new summary counts safely
            var countSuperbubbles = s.superbubbles || s.is_superbubble || 0;
            var countTandem = s.copy_number_variants || s.tandem_repeats || s.cnv_clusters || 0; 
            var countFragmented = s.fragmented_cnv || s.repeat_fragmentation || 0; 
            var countAltPaths = s.alternative_paths || s.alt_paths || 0;
            var countRearrangements = s.structural_rearrangements || s.rearrangements || 0;
            var countInversions = s.inverted_blocks || s.inversions || 0;
            var countBreaks = s.assembly_breaks || s.scaffolds || 0;

            var activePhenom = (window.GexfJS && GexfJS.params) ? GexfJS.params.activePhenomenon : null;

            var phenomenaMeta = {
                'superbubbles': {
                    label: 'Bounded Variable Loci',
                    graphTerm: 'Superbubbles',
                    subtitle: 'Allelic swaps, cassettes & small indels between conserved anchors',
                    count: countSuperbubbles,
                    nodesDesc: 'Conserved core boundary anchors and interior allelic/cassette gene families',
                    edgesDesc: 'Alternative allelic paths traversing the bounded variable locus',
                    tsvReport: '*_superbubbles.tsv'
                },
                'alt_paths': {
                    label: 'Accessory Islands & Indels',
                    graphTerm: 'Alt Paths',
                    subtitle: 'Strain-specific genomic islands, prophages & HGT detours off backbone',
                    count: countAltPaths,
                    nodesDesc: 'Accessory genes and backbone branch points',
                    edgesDesc: 'Minority structural detours and horizontal insertion junctions',
                    tsvReport: '*_structural_variants.tsv'
                },
                'tandem_repeats': {
                    label: 'Local / Tandem CNVs',
                    graphTerm: 'Repeat Loops',
                    subtitle: 'Tandem gene duplications & local paralogous copy-number expansions',
                    count: countTandem,
                    nodesDesc: 'Multi-copy paralogous gene nodes within local CNV clusters',
                    edgesDesc: 'Local repeat routing detours and tandem copy transitions',
                    tsvReport: '*_structural_variants.tsv'
                },
                'fragmented_paralogs': {
                    label: 'Fragmented Localized Repeats',
                    graphTerm: 'Fragmented CNV',
                    subtitle: 'Localized repeats contiguous in reference contigs but split across contigs in fragmented assemblies',
                    count: countFragmented,
                    nodesDesc: 'Localized repeat alternate nodes split across multiple contigs (conflict class 3)',
                    edgesDesc: 'Repeat fragmentation junctions connecting split repeat copies',
                    tsvReport: '*_mobilized_gene_families.tsv'
                },
                'rearrangements': {
                    label: 'Synteny Breakpoints',
                    graphTerm: 'Rearrangements',
                    subtitle: 'Translocations, NAHR fusions, or chimeric joins between blocks',
                    count: countRearrangements,
                    nodesDesc: 'Flanking anchor genes at inter-block synteny breakpoints',
                    edgesDesc: 'Inter-contig and intra-contig rearrangement junctions',
                    tsvReport: '*_structural_variants.tsv'
                },
                'inversions': {
                    label: 'Inverted Syntenic Blocks',
                    graphTerm: 'Inversions',
                    subtitle: 'Contiguous gene blocks reversed in orientation relative to consensus',
                    count: countInversions,
                    nodesDesc: 'Gene families belonging to reverse-complement syntenic segments',
                    edgesDesc: 'Edges traversed in inverted orientation by subset of genomes',
                    tsvReport: '*_structural_variants.tsv'
                },
                'breaks': {
                    label: 'Repeat Breaks & Scaffolds',
                    graphTerm: 'Bridges',
                    subtitle: 'Contig ends shattered at repeats with reference-guided scaffold paths',
                    count: countBreaks,
                    nodesDesc: 'Contig terminal repeat nodes and candidate scaffold bridge nodes',
                    edgesDesc: 'Inferred syntenic scaffold paths bridging fragmented contigs',
                    tsvReport: '*_scaffold_recommendations.tsv'
                }
            };

            var categories = [
                { title: '1. Accessory & Allelic Variation', keys: ['superbubbles', 'alt_paths'] },
                { title: '2. Repeats & Paralog Expansion', keys: ['tandem_repeats', 'fragmented_paralogs'] },
                { title: '3. Chromosomal Architecture', keys: ['rearrangements', 'inversions'] },
                { title: '4. Assembly & Scaffolding', keys: ['breaks'] }
            ];

            html += '<div style="margin-bottom:12px;">';
            categories.forEach(function(cat) {
                html += '<div style="font-size:0.76em; font-weight:bold; text-transform:uppercase; letter-spacing:0.4px; color:#5a738e; background:#eef4f9; padding:3px 6px; border-left:3px solid #31708f; margin:8px 0 4px 0;">' + cat.title + '</div>';
                cat.keys.forEach(function(key) {
                    var item = phenomenaMeta[key];
                    var isActive = (activePhenom === key);
                    var rowStyle = isActive
                        ? 'padding:5px 6px; margin-bottom:4px; background:#fdf0ff; border:1px solid #d580ff; border-radius:5px;'
                        : 'padding:3px 6px; margin-bottom:2px; border-bottom:1px solid #f0f0f0;';
                    var pillStyle = isActive
                        ? 'display:inline-block; min-width:28px; text-align:center; padding:2px 10px; background-color:#9c27b0; border:1px solid #7b1fa2; border-radius:12px; color:#fff; font-weight:bold; text-decoration:none; cursor:pointer; flex-shrink:0; margin-left:8px;'
                        : 'display:inline-block; min-width:28px; text-align:center; padding:2px 10px; background-color:#eef5fa; border:1px solid #bce8f1; border-radius:12px; color:#31708f; font-weight:bold; text-decoration:none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor:pointer; flex-shrink:0; margin-left:8px;';

                    html += '<div style="' + rowStyle + '">';
                    html += '<div style="display:flex; align-items:center; justify-content:space-between;">';
                    html += '<div style="font-size:0.92em; padding-right:4px;"><b>' + item.label + '</b></div>';
                    html += '<a href="javascript:void(0)" style="' + pillStyle + '" onclick="window.highlightSpecial(\'' + key + '\'); return false;" title="' + (isActive ? 'Click to clear highlight' : 'Highlight ' + item.label + ' in graph') + '">' + item.count + '</a>';
                    html += '</div>';
                    if (isActive) {
                        html += '<div style="font-size:0.82em; color:#555; margin-top:2px;">(' + item.graphTerm + ')</div>';
                        html += '<div style="font-size:0.78em; color:#666; line-height:1.25; margin-top:1px;">' + item.subtitle + '</div>';
                    }
                    html += '</div>';
                });
            });
            html += '</div>';

            // Active Phenomenon "What You're Seeing" Callout Banner + Locus Stepper
            if (activePhenom && phenomenaMeta[activePhenom]) {
                var activeMeta = phenomenaMeta[activePhenom];
                var loci = (window.GexfJS && GexfJS.params && GexfJS.params.phenomenonLoci) ? GexfJS.params.phenomenonLoci : [];
                var activeLocusIdx = (window.GexfJS && GexfJS.params && typeof GexfJS.params.activeLocusIndex === 'number') ? GexfJS.params.activeLocusIndex : -1;
                var filterMode = (window.GexfJS && GexfJS.params && GexfJS.params.locusFilterMode) ? GexfJS.params.locusFilterMode : 'locus';
                var hasDashed = (activePhenom === 'breaks' || activePhenom === 'rearrangements' || activePhenom === 'inversions');
                var self = this;

                html += '<div style="margin-bottom:14px; padding:8px; background:#fcf4ff; border:1px solid #d580ff; border-radius:5px; font-size:0.83em; line-height:1.35; color:#333;">';
                html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">';
                html += '<b style="color:#6a1b9a;"><i class="fa icon-eye"></i> Viewing: ' + activeMeta.label + '</b>';
                html += '<a href="javascript:void(0)" onclick="window.displayNode(-1); return false;" style="color:#a94442; font-weight:bold; text-decoration:none; font-size:0.9em;" title="Clear active phenomenon highlight">Clear &#10006;</a>';
                html += '</div>';

                // Visual Role Legend (3 Distinct Roles: Focal Event [Magenta], Reference Path [Ocean Blue], Flanking Anchor [Emerald Ring])
                html += '<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:4px 6px; margin-bottom:6px; background:#fff; border:1px solid #ead1f5; border-radius:4px; font-size:0.9em;">';
                html += '<span style="display:inline-flex; align-items:center;" title="' + activeMeta.nodesDesc + '"><span style="display:inline-block; width:10px; height:10px; background:#d500f9; border:2px solid #6a1b9a; border-radius:50%; margin-right:4px;"></span><b>Event / Variant</b></span>';
                html += '<span style="display:inline-flex; align-items:center;" title="1-hop conserved core anchor boundary genes (Emerald outer ring)"><span style="display:inline-block; width:10px; height:10px; background:#ff7f00; border:2px solid #2e7d32; border-radius:50%; margin-right:4px;"></span><b>Flanking Anchor</b></span>';
                html += '<span style="display:inline-flex; align-items:center;" title="Reference / Consensus orientation or backbone path"><span style="display:inline-block; width:14px; border-top:3px solid #0288d1; margin-right:4px;"></span><b>Ref / Consensus</b></span>';
                if (hasDashed) {
                    html += '<span style="display:inline-flex; align-items:center;" title="Dashed edges indicate scaffold bridges or inter-block breakpoint junctions"><span style="display:inline-block; width:14px; border-top:2px dashed #d500f9; margin-right:4px;"></span><b>Junction</b></span>';
                }
                html += '</div>';

                // Locus Stepper Bar
                if (loci.length > 0) {
                    var btnStyle = 'padding:3px 7px; background:#fff; border:1px solid #b388ff; border-radius:4px; color:#4a148c; font-weight:bold; cursor:pointer; font-size:0.92em; flex-shrink:0;';
                    html += '<div style="margin-bottom:6px; padding:5px; background:#f3e5f5; border:1px solid #ce93d8; border-radius:4px;">';
                    html += '<div style="font-size:0.9em; font-weight:bold; color:#4a148c; margin-bottom:3px; display:flex; justify-content:space-between;">';
                    html += '<span>Locus Explorer (' + loci.length + (loci.length === 1 ? ' discrete locus' : ' discrete loci') + ')</span>';
                    if (activeLocusIdx >= 0) {
                        html += '<a href="javascript:void(0)" onclick="window.selectPhenomenonLocus(-1); return false;" style="font-weight:normal; color:#6a1b9a; text-decoration:underline;" title="Zoom out to show all loci at once">Show All</a>';
                    }
                    html += '</div>';
                    html += '<div style="display:flex; align-items:center; gap:4px;">';
                    html += '<button type="button" style="' + btnStyle + '" onclick="window.stepPhenomenonLocus(-1);" title="Step to previous locus and auto-center">&#9664; Prev</button>';
                    html += '<select onchange="window.selectPhenomenonLocus(this.value);" style="flex-grow:1; min-width:0; padding:3px 4px; border:1px solid #b388ff; border-radius:4px; font-size:0.92em; background:#fff; color:#333;">';
                    html += '<option value="-1"' + (activeLocusIdx === -1 ? ' selected' : '') + '>All ' + loci.length + ' Loci (Global View)</option>';
                    loci.forEach(function(loc) {
                        var sel = (loc.index === activeLocusIdx) ? ' selected' : '';
                        var safeOpt = loc.dropdownLabel.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        html += '<option value="' + loc.index + '"' + sel + '>' + safeOpt + '</option>';
                    });
                    html += '</select>';
                    html += '<button type="button" style="' + btnStyle + '" onclick="window.stepPhenomenonLocus(1);" title="Step to next locus and auto-center">Next &#9654;</button>';
                    html += '</div>';

                    // Focused Single-Locus Anatomy Card + Dynamic Contig Filter + Relative Genomes/Contigs
                    if (activeLocusIdx >= 0 && loci[activeLocusIdx]) {
                        var curLoc = loci[activeLocusIdx];
                        var spotContigs = (window.GexfJS && GexfJS.params && GexfJS.params.locusSpotlightContigs) ? GexfJS.params.locusSpotlightContigs : {};
                        var hasSpot = Object.keys(spotContigs).length > 0;
                        html += '<div style="margin-top:6px; padding:6px; background:#fff; border:1px solid #e1bee7; border-radius:4px;">';

                        // Dynamic Graph Canvas Filter Selector
                        html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #f0e6f5;">';
                        html += '<span style="font-weight:bold; color:#4a148c;" title="Controls which nodes and contigs remain visible on the main graph canvas while inspecting this locus"><i class="fa icon-filter"></i> Canvas Filter:</span>';
                        html += '<select onchange="window.setLocusFilterMode(this.value);" style="padding:2px 4px; border:1px solid #ce93d8; border-radius:4px; font-size:0.9em; background:#fcf4ff; color:#333;">';
                        html += '<option value="locus"' + (filterMode === 'locus' ? ' selected' : '') + '>Locus Contigs (Event + Ref) [' + curLoc.totalLocusContigs + ']</option>';
                        html += '<option value="event"' + (filterMode === 'event' ? ' selected' : '') + '>Event Contigs Only [' + curLoc.eventContigs.length + ']</option>';
                        html += '<option value="subgraph"' + (filterMode === 'subgraph' ? ' selected' : '') + '>Locus Nodes Only (Focal + Anchors)</option>';
                        html += '<option value="off"' + (filterMode === 'off' ? ' selected' : '') + '>Full Graph (No Filter)</option>';
                        html += '</select>';
                        html += '</div>';

                        var renderNodeChips = function(nodeIds, isAnchor) {
                            var maxChips = 10;
                            var shown = nodeIds.slice(0, maxChips);
                            var chipHtml = '';
                            shown.forEach(function(nid) {
                                var nObj = curLoc.nodeById[nid];
                                var nIdx = curLoc.nodeIdxById[nid];
                                if (!nObj || typeof nIdx === 'undefined') return;
                                var rawLbl = String(nObj.label || nid);
                                var shortLbl = rawLbl.length > 28 ? rawLbl.substr(0, 26) + '...' : rawLbl;
                                var safeLbl = shortLbl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                var fullTitle = (rawLbl + ' (Click to inspect features)').replace(/"/g, '&quot;');
                                var cStyle = isAnchor
                                    ? 'display:inline-block; margin:2px 3px 2px 0; padding:1px 6px; background:#e8f5e9; border:1px solid #2e7d32; border-radius:10px; color:#1b5e20; font-weight:bold; text-decoration:none; font-size:0.9em;'
                                    : 'display:inline-block; margin:2px 3px 2px 0; padding:1px 6px; background:#f3e5f5; border:1px solid #ab47bc; border-radius:10px; color:#4a148c; font-weight:bold; text-decoration:none; font-size:0.9em;';
                                chipHtml += '<a href="javascript:void(0)" style="' + cStyle + '" onclick="window.inspectNodeFromLocus(' + nIdx + '); return false;" title="' + fullTitle + '">' + safeLbl + '</a>';
                            });
                            if (nodeIds.length > maxChips) {
                                chipHtml += '<span style="font-size:0.85em; color:#777;"> +' + (nodeIds.length - maxChips) + ' more</span>';
                            }
                            return chipHtml;
                        };

                        html += '<div style="margin-bottom:4px;"><b>Focal Genes (' + curLoc.focalNodeIds.length + '):</b><br>' + renderNodeChips(curLoc.focalNodeIds, false) + '</div>';
                        if (curLoc.anchorNodeIds.length > 0) {
                            html += '<div style="margin-bottom:5px;"><b style="color:#1b5e20;">Flanking Anchors (' + curLoc.anchorNodeIds.length + '):</b><br>' + renderNodeChips(curLoc.anchorNodeIds, true) + '</div>';
                        }

                        // Relative Genome & Contig Comparison (Event Carriers vs. Flanking / Backbone Reference)
                        var formatGenomeList = function(gids, cids, isEvent) {
                            if (gids.length === 0 && cids.length === 0) return '<span style="color:#888; font-style:italic;">None</span>';
                            var maxItems = 6;
                            var items = [];
                            var byGenome = {};
                            cids.forEach(function(cid) {
                                var gid = curLoc.contigToGenome[cid] || 'unknown';
                                if (!byGenome[gid]) byGenome[gid] = [];
                                if (byGenome[gid].indexOf(cid) === -1) byGenome[gid].push(cid);
                            });
                            gids.forEach(function(gid) {
                                if (!byGenome[gid]) {
                                    byGenome[gid] = [];
                                    Object.keys(curLoc.allLocusContigs || {}).forEach(function(cid) {
                                        if (curLoc.contigToGenome[cid] === gid && byGenome[gid].indexOf(cid) === -1) {
                                            byGenome[gid].push(cid);
                                        }
                                    });
                                }
                            });
                            var gKeys = Object.keys(byGenome);
                            gKeys.slice(0, maxItems).forEach(function(gid) {
                                var gName = (self.genomeNameMap && self.genomeNameMap[gid]) ? self.genomeNameMap[gid] : gid;
                                var shortG = gName.length > 26 ? gName.substr(0, 24) + '...' : gName;
                                var safeShortG = shortG.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                var copies = curLoc.genomeCopies[gid] || 0;
                                var copyBadge = (copies > 1 && (activePhenom === 'tandem_repeats' || activePhenom === 'fragmented_paralogs'))
                                    ? ' <span style="color:#6a1b9a; font-weight:bold;">[' + copies + 'x]</span>'
                                    : '';
                                var roleKey = isEvent ? 'event' : 'reference';
                                var gContigs = byGenome[gid] || [];
                                var allGSelected = gContigs.length > 0 && gContigs.every(function(c) { return Boolean(spotContigs[c]); });
                                var anyGSelected = gContigs.some(function(c) { return Boolean(spotContigs[c]); });
                                var safeContigCsv = gContigs.join(',').replace(/'/g, "&apos;");
                                var gLinkStyle = allGSelected
                                    ? (isEvent
                                        ? 'font-weight:bold; color:#6a1b9a; background:#f3e5f5; padding:0px 4px; border-radius:4px; text-decoration:underline; cursor:pointer;'
                                        : 'font-weight:bold; color:#01579b; background:#b3e5fc; padding:0px 4px; border-radius:4px; text-decoration:underline; cursor:pointer;')
                                    : (anyGSelected
                                        ? (isEvent ? 'font-weight:bold; color:#6a1b9a; text-decoration:underline dotted; cursor:pointer;' : 'font-weight:bold; color:#01579b; text-decoration:underline dotted; cursor:pointer;')
                                        : 'color:#222; text-decoration:underline dotted #888; cursor:pointer;');
                                var gTitle = (gName + (gContigs.length > 0 ? ' — Click to spotlight all ' + gContigs.length + ' implicated contig(s) (Shift+Click to compare)' : '')).replace(/"/g, '&quot;');
                                var gNameHtml = (gContigs.length > 0)
                                    ? '<a href="javascript:void(0)" onclick="window.toggleLocusGenomeSpotlight(\'' + safeContigCsv + '\', \'' + roleKey + '\', event); return false;" style="' + gLinkStyle + '" title="' + gTitle + '">' + safeShortG + '</a>'
                                    : '<span title="' + gTitle + '">' + safeShortG + '</span>';

                                var contigLinks = gContigs.slice(0, 3).map(function(cid) {
                                    var safeCid = cid.replace(/'/g, "&apos;");
                                    var isSelected = Boolean(spotContigs[cid]);
                                    var pillStyle;
                                    if (isSelected) {
                                        pillStyle = isEvent
                                            ? 'display:inline-block; padding:0px 5px; background:#d500f9; color:#fff; border:1px solid #6a1b9a; border-radius:8px; font-weight:bold; text-decoration:none;'
                                            : 'display:inline-block; padding:0px 5px; background:#0288d1; color:#fff; border:1px solid #01579b; border-radius:8px; font-weight:bold; text-decoration:none;';
                                    } else {
                                        pillStyle = isEvent
                                            ? 'display:inline-block; padding:0px 5px; background:#fff; color:#6a1b9a; border:1px solid #ce93d8; border-radius:8px; text-decoration:none;'
                                            : 'display:inline-block; padding:0px 5px; background:#fff; color:#01579b; border:1px solid #81d4fa; border-radius:8px; text-decoration:none;';
                                    }
                                    return '<a href="javascript:void(0)" onclick="window.toggleLocusContigSpotlight(\'' + safeCid + '\', \'' + roleKey + '\', event); return false;" style="' + pillStyle + '" title="Click to highlight ' + safeCid + ' path &amp; direction in this locus (Shift+Click to compare multiple)">' + cid + (isSelected ? ' &#10003;' : '') + '</a>';
                                }).join(' ');
                                if (gContigs.length > 3) contigLinks += ' +' + (gContigs.length - 3);
                                items.push('<div style="margin-bottom:3px;">&bull; ' + gNameHtml + copyBadge + (contigLinks ? ' ' + contigLinks : '') + '</div>');
                            });
                            if (gKeys.length > maxItems) {
                                items.push('<div style="color:#777; font-style:italic;">+ ' + (gKeys.length - maxItems) + ' more genomes</div>');
                            }
                            return items.join('');
                        };

                        html += '<details open style="margin-top:4px; padding-top:4px; border-top:1px solid #f0e6f5; font-size:0.92em;">';
                        html += '<summary style="cursor:pointer; font-weight:bold; color:#333; outline:none; display:flex; justify-content:space-between; align-items:center;">';
                        html += '<span>Relative Genomes &amp; Contigs at Locus</span>';
                        if (hasSpot) {
                            html += '<a href="javascript:void(0)" onclick="window.clearLocusContigSpotlight(event); return false;" style="font-size:0.88em; color:#a94442; font-weight:bold; text-decoration:underline;" title="Reset contig spotlight and restore full locus colors">Reset Spotlight</a>';
                        }
                        html += '</summary>';
                        html += '<div style="font-size:0.84em; color:#666; margin:2px 0 4px 0;">Click any <b>genome name</b> or <b>contig ID</b> to spotlight its path &amp; direction (vivid in locus, softer tint outside; Shift+Click to compare):</div>';
                        html += '<div style="margin-top:4px;">';
                        html += '<div style="margin-bottom:4px; padding:4px; background:#fdf4ff; border-left:3px solid #d500f9;"><b style="color:#6a1b9a;">' + curLoc.eventRoleTitle + ' (' + curLoc.eventGenomes.length + ' gen, ' + curLoc.eventContigs.length + ' seq):</b>' + formatGenomeList(curLoc.eventGenomes, curLoc.eventContigs, true) + '</div>';
                        if (curLoc.refGenomes.length > 0 || curLoc.refContigs.length > 0) {
                            html += '<div style="padding:4px; background:#e1f5fe; border-left:3px solid #0288d1;"><b style="color:#01579b;">' + curLoc.refRoleTitle + ' (' + curLoc.refGenomes.length + ' gen, ' + curLoc.refContigs.length + ' seq):</b>' + formatGenomeList(curLoc.refGenomes, curLoc.refContigs, false) + '</div>';
                        }
                        html += '</div></details>';

                        html += '</div>';
                    }
                    html += '</div>';
                }

                html += '<div style="margin-bottom:3px;"><b>Highlighted Nodes:</b> ' + activeMeta.nodesDesc + '</div>';
                html += '<div style="margin-bottom:3px;"><b>Highlighted Edges:</b> ' + activeMeta.edgesDesc + '</div>';
                html += '<div style="color:#555;"><b>Workspace Report:</b> <code>' + activeMeta.tsvReport + '</code></div>';
                html += '</div>';
            }

            // Parameters
            if (s.parameters) {
                var paramsText = JSON.stringify(s.parameters).replace(/[{""}]/g, '').replace(/:/g, ': ');
                html += '<div style="font-size:0.9em; margin-bottom:14px; color:#666;"><b>Params:</b> ' + paramsText + '</div>';
            }
            
            var isDefMuted = (window.GexfJS && GexfJS.params) ? GexfJS.params.muteDefaultColors : false;
            var defEyeIcon = isDefMuted ? 'fa icon-eye-slash' : 'fa icon-eye';
            var defEyeColor = isDefMuted ? '#999' : '#333';
            var defEyeTitle = isDefMuted ? 'Show Core Conservation Heatmap Colors' : 'Mute Core Conservation Heatmap Colors';

            html += '<div style="margin-bottom:14px;">';
            html += '<h4 style="margin:0 0 3px 0; display:flex; align-items:center;">';
            html += 'Core Conservation Heatmap <span style="font-weight:normal; font-size:0.85em; color:#666; margin-left:4px;">(Default Colors)</span>';
            html += '<i class="fa ' + defEyeIcon + '" style="cursor:pointer; margin-left:8px; color:' + defEyeColor + ';" onclick="window.toggleMuteDefaultColors();" title="' + defEyeTitle + '"></i>';
            html += '</h4>';
            html += '<div style="font-size:0.78em; color:#555; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">';
            html += '<span style="display:inline-block; width:10px; height:10px; background:#999; border-radius:2px; border:1px solid #777;"></span>Grey &rarr; ';
            html += '<span style="display:inline-block; width:10px; height:10px; background:#e5e300; border-radius:2px; border:1px solid #b5b300;"></span>Yellow &rarr; ';
            html += '<span style="display:inline-block; width:10px; height:10px; background:#ff7f00; border-radius:2px; border:1px solid #cc6600;"></span>Orange &rarr; ';
            html += '<span style="display:inline-block; width:10px; height:10px; background:#ff0028; border-radius:2px; border:1px solid #b3001c;"></span>Red ';
            html += '<span style="color:#666;">(increasingly conserved)</span>';
            html += '</div>';
            html += '</div>';

            var pins = (window.GexfJS && GexfJS.params) ? GexfJS.params.userPins : {};
            var isMuted = (window.GexfJS && GexfJS.params) ? GexfJS.params.pinsMuted : false;
            
            var eyeIcon = isMuted ? 'fa icon-eye-slash' : 'fa icon-eye';
            var eyeColor = isMuted ? '#999' : '#333';
            var eyeTitle = isMuted ? 'Show Pinned Colors' : 'Mute Pinned Colors';
            var listOpacity = isMuted ? '0.5' : '1.0';

            // 1. Single Header (with Flexbox and Eye Icon)
            html += '<h4 style="margin-bottom:5px; display:flex; align-items:center;">';
            html += 'Pinned Manifest ';
            // Only show the eye icon if there are actually pins to mute
            if (pins && Object.keys(pins).length > 0) {
                html += '<i class="fa ' + eyeIcon + '" style="cursor:pointer; margin-left:10px; color:' + eyeColor + ';" onclick="window.toggleMutePins();" title="' + eyeTitle + '"></i>';
            }
            html += '</h4>';

            // 2. Single scrollable container (with dynamic opacity applied)
            html += '<div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px; transition: opacity 0.2s; opacity: ' + listOpacity + ';">';

            if (pins && Object.keys(pins).length > 0) {
                // We have pins, draw the list
                html += '<ul style="margin:0; padding-left:5px; list-style-type: none;">';
                Object.keys(pins).forEach(function(pinName) {
                    var pinColor = pins[pinName].color;
                    html += '<li style="margin-bottom: 6px; display: flex; align-items: center;">';
                    html += '<span style="display:inline-block; width:14px; height:14px; background-color:' + pinColor + '; border:1px solid #999; margin-right:8px; flex-shrink: 0;"></span>';
                    html += '<span style="flex-grow: 1; word-wrap: break-word;">' + pinName + '</span>';
                    html += '<a href="javascript:void(0)" onclick="window.removePin(\'' + pinName + '\'); return false;" style="color:#d9534f; text-decoration:none; font-weight:bold; font-size: 1.1em; padding-left: 8px;" title="Remove Pin">&#10006;</a>';
                    html += '</li>';
                });
                html += '</ul>';
            } else {
                // No pins, show the empty state message inside the same box
                html += '<div style="color:#999; font-style:italic; padding-left:5px;">No pinned items.</div>';
            }
            
            html += '</div>';

            if (s['block_manifest'] && s['block_manifest'].length > 0) {
                html += '<h4 style="margin-bottom:2px;">Collinear Syntenic Blocks</h4>';
                html += '<div style="font-size:0.78em; color:#666; margin-bottom:5px;">Auto-pinned by block color; click a block to highlight its conserved gene chain</div>';
                html += '<div style="max-height: 250px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px;">';
                html += '<ul style="margin:0; padding-left:20px; list-style-type: square;">';
                
                s['block_manifest'].forEach(function(blockName) {
                    html += '<li><a href="javascript:void(0)" onclick="window.highlightSpecial(\'block\', \'' + blockName + '\'); return false;" title="Highlight Block: ' + blockName + '">' + blockName + '</a></li>';
                });
                
                html += '</ul>';
                html += '</div>';
            }
            
            // Genome Manifest (Collapsible with Eyeball Solo/Isolate Graph Filter)
            if (s.contig_map) {
                var loaderHtml = this.namesLoading ? ' <span style="font-size:0.8em; color:#666; font-weight:normal; margin-left:6px;"><i class="fa fa-spinner fa-spin"></i> getting names...</span>' : '';
                var activeGenomes = (window.GexfJS && GexfJS.params && GexfJS.params.activeGenomeFilter) ? GexfJS.params.activeGenomeFilter : {};
                var activeContigs = (window.GexfJS && GexfJS.params && GexfJS.params.activeContigFilter) ? GexfJS.params.activeContigFilter : {};
                var filterCount = Object.keys(activeGenomes).length + Object.keys(activeContigs).length;
                var filterActive = filterCount > 0;
                this.expandedGenomes = this.expandedGenomes || {};

                html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">';
                html += '<h4 style="margin:0;">Genome Manifest' + loaderHtml + '</h4>';
                if (filterActive) {
                    html += '<a href="javascript:void(0)" onclick="window.resetManifestFilter(); return false;" style="font-size:0.8em; padding:2px 8px; background:#d9534f; color:#fff; border-radius:10px; text-decoration:none; font-weight:bold;" title="Clear all active genome/contig filters and restore the full graph">Reset Filter (' + filterCount + ')</a>';
                } else {
                    html += '<span style="font-size:0.78em; color:#777;" title="Click an eye icon next to any genome or contig to isolate it in the graph"><i class="fa icon-eye"></i> click eye to filter</span>';
                }
                html += '</div>';
                html += '<div style="max-height: 350px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px;">';
                
                Object.keys(s.contig_map).forEach(lang.hitch(this, function(genomeId) {
                    var contigs = s.contig_map[genomeId];
                    var displayGenomeName = (this.genomeNameMap && this.genomeNameMap[genomeId]) ? this.genomeNameMap[genomeId] : genomeId;
                    var safeGenomeName = displayGenomeName.replace(/'/g, "&apos;");

                    var isGenomeActive = Boolean(activeGenomes[genomeId]);
                    var hasActiveChildContig = contigs.some(function(cid) { return Boolean(activeContigs[cid]); });
                    var gEyeClass = (filterActive && !isGenomeActive) ? 'fa icon-eye-slash' : 'fa icon-eye';
                    var gEyeStyle = isGenomeActive
                        ? 'cursor:pointer; margin-right:6px; color:#1f77b4; background:#dbeeff; padding:2px 4px; border-radius:4px; border:1px solid #90caf9;'
                        : (filterActive
                            ? 'cursor:pointer; margin-right:6px; color:#bbb; padding:2px 4px;'
                            : 'cursor:pointer; margin-right:6px; color:#888; padding:2px 4px;');
                    var gEyeTitle = isGenomeActive
                        ? 'Genome is visible in graph filter (click to remove from filter)'
                        : (filterActive
                            ? 'Genome is hidden (click to add this genome to the visible graph)'
                            : 'Isolate this genome in the graph (hide unselected genomes)');
                    var rowOpacity = (filterActive && !isGenomeActive && !hasActiveChildContig) ? '0.6' : '1.0';
                    var openAttr = this.expandedGenomes[genomeId] ? ' open' : '';
                    
                    html += '<details' + openAttr + ' ontoggle="window.onGenomeDetailsToggle(\'' + genomeId + '\', this.open)" style="margin-bottom: 4px; opacity:' + rowOpacity + ';">';
                    html += '<summary style="cursor:pointer; outline:none; font-weight:bold;">';
                    html += '<i class="' + gEyeClass + '" style="' + gEyeStyle + '" onclick="window.toggleGenomeFilter(\'' + genomeId + '\', event); return false;" title="' + gEyeTitle + '"></i>';
                    html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + genomeId + '\', \'' + genomeAttrId + '\', \'Genome: ' + safeGenomeName + '\'); return false;" title="Highlight Genome Path">' + displayGenomeName + '</a>';
                    html += ' <span style="font-weight:normal; color:#666;">(' + contigs.length + ' contigs)</span>';
                    html += '</summary>';
                    
                    html += '<ul style="margin-top:2px; padding-left:22px; list-style-type: none;">';
                    contigs.forEach(lang.hitch(this, function(contigId) {
                        var seqDesc = (this.sequenceNameMap && this.sequenceNameMap[contigId]) ? this.sequenceNameMap[contigId] : '';
                        var safeContigName = contigId.replace(/'/g, "&apos;");
                        var isContigActive = Boolean(activeContigs[contigId]);
                        var cEyeClass = (filterActive && !isContigActive && !isGenomeActive) ? 'fa icon-eye-slash' : 'fa icon-eye';
                        var cEyeStyle = isContigActive
                            ? 'cursor:pointer; margin-right:5px; color:#1f77b4; background:#dbeeff; padding:1px 3px; border-radius:3px; border:1px solid #90caf9;'
                            : (filterActive && !isGenomeActive
                                ? 'cursor:pointer; margin-right:5px; color:#ccc;'
                                : 'cursor:pointer; margin-right:5px; color:#888;');
                        var cEyeTitle = isContigActive
                            ? 'Contig is visible in graph filter (click to remove)'
                            : 'Isolate/Add this contig in the graph filter';
                        var descSpan = seqDesc ? ' <span style="color:#666; font-size:0.88em;" title="' + seqDesc.replace(/"/g, '&quot;') + '">&mdash; ' + seqDesc + '</span>' : '';
                        
                        html += '<li style="margin-bottom:2px;">';
                        html += '<i class="' + cEyeClass + '" style="' + cEyeStyle + '" onclick="window.toggleContigFilter(\'' + contigId + '\', event); return false;" title="' + cEyeTitle + '"></i>';
                        html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + contigId + '\', \'' + sequenceAttrId + '\', \'Contig: ' + safeContigName + '\'); return false;" title="Highlight Contig Path' + (seqDesc ? ': ' + seqDesc.replace(/"/g, '&quot;') : '') + '">' + contigId + '</a>' + descSpan;
                        html += '</li>';
                    }));
                    html += '</ul>';
                    html += '</details>';
                }));
                
                html += '</div>';
            }

            html += '</div>';
            
            // Clear current selection state to reset action bar
            this.itemDetailPanel.set('selection',[]);
            this.itemDetailPanel.customDisplayNode.innerHTML = html;
        },
        
        renderGraph: function(gexfXMLData){
            if (!window.startGraphViewer || !window.GexfJS) return;

            var gexf_dom = (new window.DOMParser()).parseFromString(gexfXMLData, "text/xml");

            // ---  EXTRACT SUMMARY JSON ---
            var summaryNode = gexf_dom.querySelector("meta > summary");
            if (summaryNode) {
                try {
                    this.graphSummary = JSON.parse(summaryNode.textContent);
                    if (this.graphSummary && this.graphSummary.contig_map) {
                        this.fetchManifestNames(this.graphSummary.contig_map);
                    }
                } catch(e) {
                    console.error("Error parsing GEXF summary:", e);
                    this.graphSummary = null;
                }
            }

            // --- 2. CREATE SPECIAL HIGHLIGHT FUNCTION ---
            window.highlightSpecial = lang.hitch(this, function(type, targetValue) {
                if (!window.GexfJS || !GexfJS.params) return;
                
                // Toggle off if the user clicks the already-active phenomenon pill
                if (!targetValue && GexfJS.params.activePhenomenon === type) {
                    window.displayNode(-1);
                    return;
                }

                var labelMap = {
                    'superbubbles': 'Bounded Variable Loci (Superbubbles)',
                    'alt_paths': 'Accessory Islands & Indels (Alt Paths)',
                    'tandem_repeats': 'Local / Tandem CNVs',
                    'fragmented_paralogs': 'Dispersed Repeats / MGEs (Fragmented CNV)',
                    'rearrangements': 'Synteny Breakpoints (Rearrangements)',
                    'inversions': 'Inverted Syntenic Blocks',
                    'breaks': 'Repeat Breaks & Scaffolds'
                };
                var hlName = labelMap[type] || (type.charAt(0).toUpperCase() + type.slice(1));
                if (targetValue) hlName = "Block: " + targetValue;
                GexfJS.params.currentHighlightName = hlName;
                GexfJS.params.activePhenomenon = targetValue ? null : type;
                GexfJS.params.activeLocusIndex = -1;
                GexfJS.params.phenomenonLoci = [];
                GexfJS.params.allPhenomDashedEdges = {};
                this.savedPhenomenonContext = null;
                
                // Deep clear of ALL highlight states
                GexfJS.params.activeEdges = {};
                GexfJS.params.referenceEdges = {};
                GexfJS.params.locusContigFilter = {};
                GexfJS.params.locusSpotlightContigs = {};
                GexfJS.params.locusSpotlightActive = false;
                GexfJS.params.locusNodeSpotlight = {};
                GexfJS.params.locusEdgeSpotlight = {};
                GexfJS.params.path_active = false;
                GexfJS.params.pinnedElements = {};
                GexfJS.params.activeNode = -1; 
                GexfJS.params.currentNode = -1;
                GexfJS.params.activeNodes = {};
                GexfJS.params.anchorNodes = {};
                GexfJS.params.dashedEdges = {};
                GexfJS.params.focusLocusActive = false;
                
                var hlColor = GexfJS.params.highlightColorOverride || '#d500f9';
                this.rebuildPinnedElements();

                var rawEdges = {};
                var explicitNodes = {};
                var dashedEdges = {};

                // --- HELPER: Safely lookup and collect edges by Attribute Name & Value ---
                var addEdgesByAttr = function(attrName, attrValue, isDashed) {
                    var attrId = GexfJS._edge_attr_value[attrName];
                    if (typeof attrId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[attrId]) {
                        var edges = GexfJS.path_highlights[attrId][attrValue]; 
                        if (edges) {
                            for (var edgeId in edges) {
                                rawEdges[edgeId] = true;
                                if (isDashed) dashedEdges[edgeId] = true;
                            }
                        }
                    }
                };

                // --- HELPER: Safely lookup boolean node attributes ---
                var checkNodeBool = function(nodeObj, attrName) {
                    var aId = GexfJS._node_attr_value[attrName];
                    if (typeof aId !== 'undefined' && nodeObj.attributes) {
                        return String(nodeObj.attributes[aId]).toLowerCase() === 'true';
                    }
                    return false;
                };

                // --- 1. SUPERBUBBLES ---
                if (type === 'superbubbles') {
                    addEdgesByAttr('is_superbubble', 'true', false);
                    GexfJS.graph.nodeList.forEach(function(node) {
                        if (checkNodeBool(node, 'is_superbubble')) {
                            explicitNodes[node.id] = true;
                        }
                    });

                // --- 2. TANDEM REPEATS & SHIFTS ---
                } else if (type === 'tandem_repeats') {
                    addEdgesByAttr('repeat_ambiguity_detour', 'true', false);
                    addEdgesByAttr('sv_class', 'repeat_ambiguity_detour', false);
                    
                    var cnvId = GexfJS._node_attr_value['cnv_cluster_id'];
                    var conflictId = GexfJS._node_attr_value['conflict'];

                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'repeat_ambiguity')) isSpecial = true;
                        if (node.attributes && typeof cnvId !== 'undefined' && node.attributes[cnvId] != null && String(node.attributes[cnvId]) !== "" && String(node.attributes[cnvId]) !== "0") {
                            if (typeof conflictId === 'undefined' || String(node.attributes[conflictId]) !== "3") isSpecial = true;
                        }
                        if (isSpecial) explicitNodes[node.id] = true;
                    });

                // --- 3. FRAGMENTED SYNTENY (PARALOGS) ---
                } else if (type === 'fragmented_paralogs') {
                    addEdgesByAttr('repeat_fragmentation_junction', 'true', false);
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'repeat_ambiguity_fragmentation')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "3") isSpecial = true;
                        if (isSpecial) explicitNodes[node.id] = true;
                    });

                // --- 4. ALTERNATIVE PATHS ---
                } else if (type === 'alt_paths') {
                    addEdgesByAttr('alt_path_junction', 'true', false);
                    addEdgesByAttr('alternative_path', 'true', false);
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'alternative_path')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "4") isSpecial = true;
                        if (isSpecial) explicitNodes[node.id] = true;
                    });

                // --- 5. STRUCTURAL REARRANGEMENTS ---
                } else if (type === 'rearrangements') {
                    addEdgesByAttr('breakpoint_junction', 'true', true);
                    addEdgesByAttr('inter_contig_rearrangement', 'true', true);
                    addEdgesByAttr('intra_contig_rearrangement', 'true', true);
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'synteny_breakpoint')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "1") isSpecial = true;
                        if (isSpecial) explicitNodes[node.id] = true;
                    });

                // --- 6. INVERTED BLOCKS ---
                } else if (type === 'inversions') {
                    addEdgesByAttr('inverted_block', 'true', false); 
                    GexfJS.graph.nodeList.forEach(function(node) {
                        if (checkNodeBool(node, 'inverted_block')) {
                            explicitNodes[node.id] = true;
                        }
                    });

                // --- 7. ASSEMBLY BREAKS & SCAFFOLDS ---
                } else if (type === 'breaks') {
                    addEdgesByAttr('is_scaffold_path', 'true', true);
                    addEdgesByAttr('sv_class', 'potential_scaffold', true);
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    var bridgeId = GexfJS._node_attr_value['is_scaffold_bridge'];
                    
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'assembly_repeat_break')) isSpecial = true;
                        if (checkNodeBool(node, 'is_scaffold_path')) isSpecial = true;
                        if (node.attributes && typeof bridgeId !== 'undefined' && String(node.attributes[bridgeId]).toLowerCase() === 'true') isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "2") isSpecial = true;
                        if (isSpecial) explicitNodes[node.id] = true;
                    });

                // --- BLOCK MANIFEST SUPPORT ---
                } else if (type === 'block') {
                    var attrId = GexfJS._node_attr_value['block_name'] || GexfJS._node_attr_value['block_id'] || GexfJS._node_attr_value['block']; 
                    if (typeof attrId !== 'undefined' && targetValue) {
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[attrId] && String(node.attributes[attrId]).split(',').indexOf(targetValue) !== -1) {
                                GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                                GexfJS.params.activeNodes[node.id] = true; 
                            }
                        });
                    }
                    GexfJS.params.path_active = !jQuery.isEmptyObject(GexfJS.params.activeEdges);
                    delete GexfJS.oldParams.zoomLevel;
                    this.showDefaultSummary();
                    return;
                }
                
                GexfJS.params.allPhenomDashedEdges = dashedEdges;
                GexfJS.params.phenomenonLoci = this.buildPhenomenonLoci(type, rawEdges, explicitNodes);
                GexfJS.params.activeLocusIndex = -1;
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            // --- LOCUS STEPPER & NAVIGATION FUNCTIONS ---
            window.selectPhenomenonLocus = lang.hitch(this, function(locusIdx) {
                if (!window.GexfJS || !GexfJS.params || !GexfJS.params.activePhenomenon) return;
                var idx = parseInt(locusIdx, 10);
                if (isNaN(idx)) idx = -1;
                if (GexfJS.params.activeLocusIndex !== idx) {
                    GexfJS.params.locusSpotlightContigs = {};
                }
                GexfJS.params.activeLocusIndex = idx;

                var baseType = GexfJS.params.activePhenomenon;
                var labelMap = {
                    'superbubbles': 'Bounded Variable Loci',
                    'alt_paths': 'Accessory Islands & Indels',
                    'tandem_repeats': 'Local / Tandem CNVs',
                    'fragmented_paralogs': 'Dispersed Repeats / MGEs',
                    'rearrangements': 'Synteny Breakpoints',
                    'inversions': 'Inverted Syntenic Blocks',
                    'breaks': 'Repeat Breaks & Scaffolds'
                };
                var baseTitle = labelMap[baseType] || baseType;
                GexfJS.params.currentHighlightName = (idx >= 0) ? (baseTitle + ' (Locus #' + (idx + 1) + ')') : baseTitle;

                this.applyPhenomenonLocusState(idx >= 0);
                this.showDefaultSummary();
            });

            window.stepPhenomenonLocus = lang.hitch(this, function(delta) {
                if (!window.GexfJS || !GexfJS.params || !GexfJS.params.phenomenonLoci) return;
                var loci = GexfJS.params.phenomenonLoci;
                if (loci.length === 0) return;
                var cur = (typeof GexfJS.params.activeLocusIndex === 'number') ? GexfJS.params.activeLocusIndex : -1;
                var nextIdx;
                if (cur === -1) {
                    nextIdx = (delta >= 0) ? 0 : (loci.length - 1);
                } else {
                    nextIdx = (cur + delta + loci.length) % loci.length;
                }
                window.selectPhenomenonLocus(nextIdx);
            });

            window.setLocusFilterMode = lang.hitch(this, function(mode) {
                if (!window.GexfJS || !GexfJS.params) return;
                GexfJS.params.locusFilterMode = mode || 'locus';
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            window.toggleLocusContigSpotlight = lang.hitch(this, function(contigId, role, evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (!window.GexfJS || !GexfJS.params || !contigId) return;
                if (!GexfJS.params.locusSpotlightContigs) GexfJS.params.locusSpotlightContigs = {};
                var current = GexfJS.params.locusSpotlightContigs;
                var isMulti = evt && (evt.shiftKey || evt.metaKey || evt.ctrlKey);
                var targetRole = (role === 'reference' || role === 'ref') ? 'reference' : 'event';

                if (isMulti) {
                    if (current[contigId]) {
                        delete current[contigId];
                    } else {
                        current[contigId] = targetRole;
                    }
                } else {
                    var keys = Object.keys(current);
                    if (keys.length === 1 && current[contigId] === targetRole) {
                        GexfJS.params.locusSpotlightContigs = {};
                    } else {
                        var nextMap = {};
                        nextMap[contigId] = targetRole;
                        GexfJS.params.locusSpotlightContigs = nextMap;
                    }
                }
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            window.toggleLocusGenomeSpotlight = lang.hitch(this, function(contigCsv, role, evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (!window.GexfJS || !GexfJS.params || !contigCsv) return;
                var cids = String(contigCsv).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                if (cids.length === 0) return;
                if (!GexfJS.params.locusSpotlightContigs) GexfJS.params.locusSpotlightContigs = {};
                var current = GexfJS.params.locusSpotlightContigs;
                var isMulti = evt && (evt.shiftKey || evt.metaKey || evt.ctrlKey);
                var targetRole = (role === 'reference' || role === 'ref') ? 'reference' : 'event';
                var allAlreadyActive = cids.every(function(c) { return current[c] === targetRole; });

                if (isMulti) {
                    if (allAlreadyActive) {
                        cids.forEach(function(c) { delete current[c]; });
                    } else {
                        cids.forEach(function(c) { current[c] = targetRole; });
                    }
                } else {
                    var keys = Object.keys(current);
                    if (keys.length === cids.length && allAlreadyActive) {
                        GexfJS.params.locusSpotlightContigs = {};
                    } else {
                        var nextMap = {};
                        cids.forEach(function(c) { nextMap[c] = targetRole; });
                        GexfJS.params.locusSpotlightContigs = nextMap;
                    }
                }
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            window.clearLocusContigSpotlight = lang.hitch(this, function(evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (!window.GexfJS || !GexfJS.params) return;
                GexfJS.params.locusSpotlightContigs = {};
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            window.inspectNodeFromLocus = lang.hitch(this, function(nodeIndex) {
                if (!window.GexfJS || !GexfJS.params || !GexfJS.graph) return;
                var n = GexfJS.graph.nodeList[nodeIndex];
                if (n && n.coords && n.coords.base) {
                    GexfJS.params.centreX = n.coords.base.x;
                    GexfJS.params.centreY = n.coords.base.y;
                }
                window.displayNode(nodeIndex);
            });

            window.selectFamilyNodes = lang.hitch(this, function(familyId) {
                if (!window.GexfJS || !GexfJS.graph || !familyId) return;
                var famAttrId = (GexfJS._node_attr_value && GexfJS._node_attr_value['family']) ? GexfJS._node_attr_value['family'] : 'family';
                var matched = [];
                GexfJS.graph.nodeList.forEach(function(n, idx) {
                    var nFam = (n.attributes && n.attributes[famAttrId]) ? n.attributes[famAttrId] : n.label;
                    if (String(nFam) === String(familyId)) {
                        matched.push(idx);
                    }
                });
                if (matched.length > 0) {
                    this.multiSelectedNodeIndices = matched;
                    this.applyMultiNodeSelection();
                }
            });

            window.restorePhenomenonContext = lang.hitch(this, function() {
                if (!this.savedPhenomenonContext || !window.GexfJS || !GexfJS.params) {
                    window.displayNode(-1);
                    return;
                }
                var ctx = this.savedPhenomenonContext;
                this.savedPhenomenonContext = null;
                GexfJS.params.activePhenomenon = null; // Ensure highlightSpecial doesn't toggle off
                window.highlightSpecial(ctx.type);
                if (typeof ctx.locusIndex === 'number' && ctx.locusIndex >= 0) {
                    if (ctx.spotlightContigs) {
                        GexfJS.params.activeLocusIndex = ctx.locusIndex;
                        GexfJS.params.locusSpotlightContigs = jQuery.extend({}, ctx.spotlightContigs);
                    }
                    window.selectPhenomenonLocus(ctx.locusIndex);
                }
            });

            var originalDisplayNode = window.displayNode;
            this.multiSelectedNodeIndices = [];
            
            window.displayNode = lang.hitch(this, function(nodeIndex) {
                if (originalDisplayNode) originalDisplayNode(nodeIndex);

                // --- START FIX 1: Check for Deselect & Clean Up ---
                if (nodeIndex === -1 || typeof nodeIndex === 'undefined') {
                    this.multiSelectedNodeIndices = [];
                    this.selection = [];
                    if (this.selectionActionBar) {
                        this.selectionActionBar.set("selection", []);
                    }
                    this.savedPhenomenonContext = null;
                    if (window.GexfJS && GexfJS.params) {
                        // Ensure all temporary highlight arrays are wiped
                        GexfJS.params.activeEdges = {};
                        GexfJS.params.referenceEdges = {};
                        GexfJS.params.locusContigFilter = {};
                        GexfJS.params.locusSpotlightContigs = {};
                        GexfJS.params.locusSpotlightActive = false;
                        GexfJS.params.locusNodeSpotlight = {};
                        GexfJS.params.locusEdgeSpotlight = {};
                        GexfJS.params.activeNodes = {};
                        GexfJS.params.anchorNodes = {};
                        GexfJS.params.dashedEdges = {};
                        GexfJS.params.focusLocusActive = false;
                        GexfJS.params.path_active = false;
                        GexfJS.params.activePhenomenon = null;
                        GexfJS.params.activeLocusIndex = -1;
                        GexfJS.params.phenomenonLoci = [];
                        
                        // CRITICAL: Wipe temporary pins and restore only persistent user pins
                        this.rebuildPinnedElements(); 
                    }
                    this.showDefaultSummary();
                    return;
                }

                var node = GexfJS.graph.nodeList[nodeIndex];
                if (!node) return;

                this.multiSelectedNodeIndices = [nodeIndex];
                
                // Save active phenomenon & locus context so the user can return to their exact locus after inspecting a gene
                if (GexfJS.params.activePhenomenon) {
                    this.savedPhenomenonContext = {
                        type: GexfJS.params.activePhenomenon,
                        locusIndex: (typeof GexfJS.params.activeLocusIndex === 'number') ? GexfJS.params.activeLocusIndex : -1,
                        highlightName: GexfJS.params.currentHighlightName,
                        spotlightContigs: jQuery.extend({}, GexfJS.params.locusSpotlightContigs || {})
                    };
                }

                GexfJS.params.activePhenomenon = null;
                GexfJS.params.focusLocusActive = false;
                GexfJS.params.referenceEdges = {};
                GexfJS.params.locusContigFilter = {};
                GexfJS.params.locusSpotlightContigs = {};
                GexfJS.params.locusSpotlightActive = false;
                GexfJS.params.locusNodeSpotlight = {};
                GexfJS.params.locusEdgeSpotlight = {};
                GexfJS.params.currentHighlightName = "Node: " + (node.label || node.id);

                // 1. Extract the raw Feature Mapping (JSON) to preserve hierarchy
                var featureAttrIndex = GexfJS._node_attr_value ? GexfJS._node_attr_value["features"] : null;
                var featureMap = null;
                var targetIds = [];

                if (featureAttrIndex !== null && typeof featureAttrIndex !== 'undefined' && node.attributes[featureAttrIndex]) {
                    try {
                        var rawJson = node.attributes[featureAttrIndex].replace(/""/g, '"');
                        featureMap = JSON.parse(rawJson);
                        
                        // Flatten to get IDs for API query
                        Object.keys(featureMap).forEach(function(genomeId) {
                            var contigs = featureMap[genomeId];
                            //if it is "info" go to the next genomeId
                            if (genomeId === "info") return;
                            Object.keys(contigs).forEach(function(contigId) {
                                var features = contigs[contigId];
                                features.forEach(function(fid) {
                                    targetIds.push(fid);
                                });
                            });
                        });
                    } catch (e) {
                        console.error("Error parsing features JSON:", e);
                    }
                }

                // 2. Pass the full NODE object (added as 3rd arg)
                if (targetIds.length > 0) {
                    this.onGraphSelection(targetIds, featureMap, node);
                } else if (node.label) {
                    this.onGraphSelection([node.label], null, node);
                }
            });

            window.onBoxSelectNodes = lang.hitch(this, function(boxedIndices, isAdditive) {
                if (!window.GexfJS || !GexfJS.graph) return;
                var incoming = Array.isArray(boxedIndices) ? boxedIndices : [];
                var current = Array.isArray(this.multiSelectedNodeIndices) ? this.multiSelectedNodeIndices.slice() : [];

                if (!isAdditive) {
                    current = incoming.slice();
                } else {
                    if (current.length === 0 && typeof GexfJS.params.currentNode === 'number' && GexfJS.params.currentNode >= 0) {
                        current.push(GexfJS.params.currentNode);
                    }
                    incoming.forEach(function(idx) {
                        if (current.indexOf(idx) === -1) {
                            current.push(idx);
                        }
                    });
                }

                this.multiSelectedNodeIndices = current;
                if (current.length === 0) {
                    if (!isAdditive) {
                        window.displayNode(-1);
                    }
                } else {
                    this.applyMultiNodeSelection();
                }
            });

            window.onAdditiveNodeClick = lang.hitch(this, function(nodeIndex) {
                if (!window.GexfJS || !GexfJS.graph || typeof nodeIndex !== 'number' || nodeIndex < 0) return;
                var current = Array.isArray(this.multiSelectedNodeIndices) ? this.multiSelectedNodeIndices.slice() : [];
                if (current.length === 0 && typeof GexfJS.params.currentNode === 'number' && GexfJS.params.currentNode >= 0) {
                    current.push(GexfJS.params.currentNode);
                }
                var existingPos = current.indexOf(nodeIndex);
                if (existingPos !== -1) {
                    current.splice(existingPos, 1);
                } else {
                    current.push(nodeIndex);
                }
                this.multiSelectedNodeIndices = current;
                if (current.length === 0) {
                    window.displayNode(-1);
                } else if (current.length === 1) {
                    window.displayNode(current[0]);
                } else {
                    this.applyMultiNodeSelection();
                }
            });

            window.removeNodeFromSelection = lang.hitch(this, function(nodeIndex) {
                if (!Array.isArray(this.multiSelectedNodeIndices)) return;
                var pos = this.multiSelectedNodeIndices.indexOf(nodeIndex);
                if (pos !== -1) {
                    this.multiSelectedNodeIndices.splice(pos, 1);
                }
                if (this.multiSelectedNodeIndices.length === 0) {
                    window.displayNode(-1);
                } else if (this.multiSelectedNodeIndices.length === 1) {
                    window.displayNode(this.multiSelectedNodeIndices[0]);
                } else {
                    this.applyMultiNodeSelection();
                }
            });

            var graph_params = {
                showEdges : true,
                zoomLevel : 0,
                edgeWidthFactor : 10,
                pathAttr : "sequences",
                colorNodeAttr : "diversity",
                nodeSizeFactor : 2,
                patric_on: true,
                language: false,
                textDisplayThreshold: 12,
                showNodeLabels: true,
                labelSizeFactor: 0.6
            };
            setParams(graph_params);

            var originalSetInterval = window.setInterval;
            window.setInterval = function() { return 999; }; 

            // Initialize persistent pin and filter storage
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            if (typeof GexfJS.params.pinsMuted === 'undefined') GexfJS.params.pinsMuted = false;
            GexfJS.params.currentHighlightName = "Selection";
            GexfJS.params.activePhenomenon = null;
            GexfJS.params.activeLocusIndex = -1;
            GexfJS.params.phenomenonLoci = [];
            GexfJS.params.anchorNodes = {};
            GexfJS.params.dashedEdges = {};
            GexfJS.params.referenceEdges = {};
            GexfJS.params.locusContigFilter = {};
            GexfJS.params.locusSpotlightContigs = {};
            GexfJS.params.locusSpotlightActive = false;
            GexfJS.params.locusNodeSpotlight = {};
            GexfJS.params.locusEdgeSpotlight = {};
            if (!GexfJS.params.locusFilterMode) GexfJS.params.locusFilterMode = 'locus';
            GexfJS.params.focusLocusActive = false;
            GexfJS.params.boxSelectMode = false;
            this.savedPhenomenonContext = null;
            if (typeof GexfJS.params.muteDefaultColors === 'undefined') GexfJS.params.muteDefaultColors = false; 
            GexfJS.params.activeGenomeFilter = {};
            GexfJS.params.activeContigFilter = {};
            this.expandedGenomes = {};
            this.guideExpanded = false;

            // Preserve <details> open state for Guide and Genome Manifest across re-renders
            window.onGuideDetailsToggle = lang.hitch(this, function(isOpen) {
                this.guideExpanded = Boolean(isOpen);
            });
            window.onGenomeDetailsToggle = lang.hitch(this, function(genomeId, isOpen) {
                this.expandedGenomes = this.expandedGenomes || {};
                this.expandedGenomes[genomeId] = Boolean(isOpen);
            });

            // Global Eyeball Filter Toggles for Genome Manifest
            window.toggleGenomeFilter = lang.hitch(this, function(genomeId, evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (evt && evt.preventDefault) evt.preventDefault();
                if (!window.GexfJS || !GexfJS.params) return;
                if (!GexfJS.params.activeGenomeFilter) GexfJS.params.activeGenomeFilter = {};
                if (GexfJS.params.activeGenomeFilter[genomeId]) {
                    delete GexfJS.params.activeGenomeFilter[genomeId];
                } else {
                    GexfJS.params.activeGenomeFilter[genomeId] = true;
                }
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

            window.toggleContigFilter = lang.hitch(this, function(contigId, evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (evt && evt.preventDefault) evt.preventDefault();
                if (!window.GexfJS || !GexfJS.params) return;
                if (!GexfJS.params.activeContigFilter) GexfJS.params.activeContigFilter = {};
                if (GexfJS.params.activeContigFilter[contigId]) {
                    delete GexfJS.params.activeContigFilter[contigId];
                } else {
                    GexfJS.params.activeContigFilter[contigId] = true;
                }
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

            window.resetManifestFilter = lang.hitch(this, function() {
                if (!window.GexfJS || !GexfJS.params) return;
                GexfJS.params.activeGenomeFilter = {};
                GexfJS.params.activeContigFilter = {};
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

            //Global Toggle Mute Function (The Eye Icon)
            window.toggleMutePins = lang.hitch(this, function() {
                if (window.GexfJS) {
                    GexfJS.params.pinsMuted = !GexfJS.params.pinsMuted;
                    this.rebuildPinnedElements(); // Pushes the state to the graph
                    this.showDefaultSummary();    // Updates the eye icon
                }
            });
            // Global Toggle Mute Default Colors
             window.toggleMuteDefaultColors = lang.hitch(this, function() {
                if (window.GexfJS) {
                    GexfJS.params.muteDefaultColors = !GexfJS.params.muteDefaultColors;
                    delete GexfJS.oldParams.zoomLevel; // Force redraw
                    this.showDefaultSummary();         // Update the eye icon
                }
            });

            // Global function to Remove a Pin
            window.removePin = lang.hitch(this, function(pinName) {
                if (window.GexfJS && GexfJS.params.userPins) {
                    delete GexfJS.params.userPins[pinName];
                    this.rebuildPinnedElements();
                    this.showDefaultSummary(); // Refresh the manifest
                }
            });

            // Global wrapper for displayPath that captures the Name
            window.doHighlightPath = lang.hitch(this, function(eid, pstr, pattr, name) {
                if (window.GexfJS) {
                    GexfJS.params.currentHighlightName = name || pstr;
                    GexfJS.params.activePhenomenon = null;
                }
                if (window.displayPath) window.displayPath(eid, pstr, pattr);
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Graph Summary") !== -1) {
                    this.showDefaultSummary();
                }
            });
            startGraphViewer(gexf_dom);

            // --- START: AUTO-PIN BLOCKS ---
            if (this.graphSummary && this.graphSummary['block_manifest'] && this.graphSummary['block_manifest'].length > 0) {
                // Determine the correct attribute ID for your blocks
                var blockAttrId = GexfJS._node_attr_value['block'] || GexfJS._node_attr_value['block_id'] || GexfJS._node_attr_value['block_name'];
                
                if (typeof blockAttrId !== 'undefined') {
                    // A pleasant, distinct categorical color palette (D3's Category 10)
                    var palette =['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
                    var colorIndex = 0;

                    this.graphSummary['block_manifest'].forEach(function(blockName) {
                        var elementsToPin = {};
                        var applied = false;

                        // Find all nodes belonging to this block (including multi-block paralog hubs)
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[blockAttrId] && String(node.attributes[blockAttrId]).split(',').indexOf(blockName) !== -1) {
                                elementsToPin['n_' + node.id] = true;
                                applied = true;
                            }
                        });

                        // If we found nodes, pin them with the next color in the palette
                        if (applied) {
                            var color = palette[colorIndex % palette.length];
                            GexfJS.params.userPins["Block: " + blockName] = { color: color, elements: elementsToPin };
                            colorIndex++;
                        }
                    });

                    // Push these newly created pins to the renderer's active list
                    this.rebuildPinnedElements();
                }
            }

            window.setInterval = originalSetInterval;

            this.resize();
            GexfJS.timeRefresh = setInterval(window.traceMap, 60);
            this.showDefaultSummary();

        },

        applyColorToGraph: function(color, customName) {
            if (!window.GexfJS || !GexfJS.params) return;
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            
            var name = customName || GexfJS.params.currentHighlightName || "Custom Selection";
            var elementsToPin = {};
            var applied = false;

            // 1. Check for Active Edges (from displayPath links or induced multi-node selection)
            if (GexfJS.params.path_active && GexfJS.params.activeEdges) {
                Object.keys(GexfJS.params.activeEdges).forEach(function(edgeId) {
                    elementsToPin['e_' + edgeId] = true;
                    applied = true;
                });
            } 
            // 2. Check for Active Nodes (from Box/Multi-Node Selection or Special Highlights)
            if (GexfJS.params.activeNodes && Object.keys(GexfJS.params.activeNodes).length > 0) {
                Object.keys(GexfJS.params.activeNodes).forEach(function(nodeId) {
                     elementsToPin['n_' + nodeId] = true;
                     applied = true;
                });
            }
            if (!applied && GexfJS.params.currentNode !== -1) {
                var n = GexfJS.graph.nodeList[GexfJS.params.currentNode];
                if (n) {
                    elementsToPin['n_' + n.id] = true;
                    applied = true;
                }
            }

            if (applied) {
                GexfJS.params.pinsMuted = false; 

                // Save to persistent user pins, overwriting if the name already exists
                GexfJS.params.userPins[name] = { color: color, elements: elementsToPin };
                this.rebuildPinnedElements();
                
                // Refresh the summary panel to instantly show the new pin!
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Graph Summary") !== -1) {
                    this.showDefaultSummary();
                } else if (Array.isArray(this.multiSelectedNodeIndices) && this.multiSelectedNodeIndices.length > 0 && GexfJS.params.currentNode === -1) {
                    this.updateMultiNodeSelection(this.selection, this.multiSelectedNodeIndices, false, false, name, color);
                }
            }
        },

        applyMultiNodeSelection: function() {
            if (!window.GexfJS || !GexfJS.graph) return;
            var indices = Array.isArray(this.multiSelectedNodeIndices) ? this.multiSelectedNodeIndices : [];
            if (indices.length === 0) {
                window.displayNode(-1);
                return;
            }

            // Clear phenomenon states and single-node neighbor lens
            GexfJS.params.currentNode = -1;
            GexfJS.params.activePhenomenon = null;
            GexfJS.params.focusLocusActive = false;
            GexfJS.params.referenceEdges = {};
            GexfJS.params.locusContigFilter = {};
            GexfJS.params.locusSpotlightContigs = {};
            GexfJS.params.locusSpotlightActive = false;
            GexfJS.params.locusNodeSpotlight = {};
            GexfJS.params.locusEdgeSpotlight = {};
            GexfJS.params.anchorNodes = {};
            GexfJS.params.dashedEdges = {};

            var activeNodes = {};
            var selectedIdxSet = {};
            var selectedNodes = [];
            indices.forEach(function(idx) {
                var n = GexfJS.graph.nodeList[idx];
                if (n) {
                    activeNodes[n.id] = true;
                    selectedIdxSet[idx] = true;
                    selectedNodes.push({ index: idx, node: n });
                }
            });

            // Highlight induced edges connecting selected nodes
            var activeEdges = {};
            if (GexfJS.graph.edgeList) {
                GexfJS.graph.edgeList.forEach(function(e) {
                    if (e && selectedIdxSet[e.source] && selectedIdxSet[e.target]) {
                        activeEdges[e.id] = true;
                    }
                });
            }

            GexfJS.params.activeNodes = activeNodes;
            GexfJS.params.activeEdges = activeEdges;
            GexfJS.params.path_active = Object.keys(activeEdges).length > 0;
            GexfJS.params.currentHighlightName = selectedNodes.length === 1
                ? ("Node: " + (selectedNodes[0].node.label || selectedNodes[0].node.id))
                : ("Selected Nodes (" + selectedNodes.length + ")");
            delete GexfJS.oldParams.zoomLevel;

            var featureAttrIndex = GexfJS._node_attr_value ? GexfJS._node_attr_value["features"] : null;
            var fallbackRecords = [];
            var seenFeatureIds = {};
            var targetIds = [];
            var pureGenomeIds = [];
            var seenGenomeIds = {};

            selectedNodes.forEach(lang.hitch(this, function(entry) {
                var node = entry.node;
                var hasFeatures = false;
                if (featureAttrIndex !== null && typeof featureAttrIndex !== 'undefined' && node.attributes && node.attributes[featureAttrIndex]) {
                    try {
                        var rawJson = node.attributes[featureAttrIndex].replace(/""/g, '"');
                        var featureMap = JSON.parse(rawJson);
                        Object.keys(featureMap).forEach(lang.hitch(this, function(genomeId) {
                            if (genomeId === "info") return;
                            seenGenomeIds[genomeId] = true;
                            var gName = (this.genomeNameMap && this.genomeNameMap[genomeId]) ? this.genomeNameMap[genomeId] : genomeId;
                            var contigs = featureMap[genomeId] || {};
                            Object.keys(contigs).forEach(function(contigId) {
                                var feats = contigs[contigId] || [];
                                feats.forEach(function(fid) {
                                    var cleanFid = String(fid).replace(/"/g, '');
                                    hasFeatures = true;
                                    if (!seenFeatureIds[cleanFid]) {
                                        seenFeatureIds[cleanFid] = true;
                                        targetIds.push(cleanFid);
                                        fallbackRecords.push({
                                            feature_id: cleanFid,
                                            patric_id: cleanFid,
                                            genome_id: genomeId,
                                            genome_name: gName,
                                            contig_id: contigId,
                                            node_id: node.id,
                                            node_label: node.label || node.id
                                        });
                                    }
                                });
                            });
                        }));
                    } catch (e) {
                        console.error("Error parsing features JSON in multi-node selection:", e);
                    }
                }
                if (!hasFeatures && node.label) {
                    var cleanLbl = String(node.label).replace(/"/g, '');
                    if (!seenGenomeIds[cleanLbl]) {
                        seenGenomeIds[cleanLbl] = true;
                        pureGenomeIds.push(cleanLbl);
                    }
                }
            }));

            var MAX_QUERY_FEATURES = 2500;
            var isTruncated = targetIds.length > MAX_QUERY_FEATURES;
            var queryIds = isTruncated ? targetIds.slice(0, MAX_QUERY_FEATURES) : targetIds;

            if (targetIds.length > 0) {
                this.containerType = "feature_data";
                this.updateMultiNodeSelection(fallbackRecords, indices, true, isTruncated);

                var url = PathJoin(window.App.dataAPI, "genome_feature");
                var queryStr = "in(patric_id,(" + queryIds.map(encodeURIComponent).join(",") + "))&select(feature_id,patric_id,genome_id,genome_name,product,gene,refseq_locus_tag)&limit(25000)";
                xhr.post(url, {
                    headers: {
                        accept: "application/json",
                        "X-Requested-With": null,
                        Authorization: (window.App.authorizationToken || "")
                    },
                    handleAs: "json",
                    data: queryStr
                }).then(lang.hitch(this, function(records) {
                    var byPatricId = {};
                    (records || []).forEach(function(rec) {
                        if (rec && rec.patric_id) {
                            byPatricId[rec.patric_id] = rec;
                        }
                    });
                    var merged = fallbackRecords.map(function(fb) {
                        var apiRec = byPatricId[fb.patric_id];
                        if (apiRec) {
                            return lang.mixin({}, fb, apiRec, {
                                feature_id: apiRec.feature_id || fb.feature_id,
                                patric_id: apiRec.patric_id || fb.patric_id,
                                genome_id: apiRec.genome_id || fb.genome_id,
                                genome_name: apiRec.genome_name || fb.genome_name
                            });
                        }
                        return fb;
                    });
                    this.updateMultiNodeSelection(merged, indices, false, isTruncated);
                }), lang.hitch(this, function() {
                    this.updateMultiNodeSelection(fallbackRecords, indices, false, isTruncated);
                }));
            } else if (pureGenomeIds.length > 0) {
                this.containerType = "genome_data";
                var genomeFallback = pureGenomeIds.map(lang.hitch(this, function(gid) {
                    return {
                        genome_id: gid,
                        genome_name: (this.genomeNameMap && this.genomeNameMap[gid]) ? this.genomeNameMap[gid] : gid
                    };
                }));
                this.updateMultiNodeSelection(genomeFallback, indices, false, false);
            } else {
                this.updateMultiNodeSelection([], indices, false, false);
            }
        },

        updateMultiNodeSelection: function(records, nodeIndices, isLoading, isTruncated, pinnedName, pinnedColor) {
            this.selection = records || [];
            this.selectionActionBar.set("currentContainerType", this.containerType);
            this.selectionActionBar.set("selection", this.selection);

            var indices = Array.isArray(nodeIndices) ? nodeIndices : (this.multiSelectedNodeIndices || []);
            var featureAttrIndex = (window.GexfJS && GexfJS._node_attr_value) ? GexfJS._node_attr_value["features"] : null;
            var genomeAttrId = (window.GexfJS && GexfJS._edge_attr_value && GexfJS._edge_attr_value['genomes']) ? GexfJS._edge_attr_value['genomes'] : 'genomes';
            var sequenceAttrId = (window.GexfJS && GexfJS._edge_attr_value && GexfJS._edge_attr_value['sequences']) ? GexfJS._edge_attr_value['sequences'] : 'sequences';

            var recordMap = {};
            this.selection.forEach(function(rec) {
                var key = rec.patric_id || rec.feature_id || rec.genome_id;
                if (key) recordMap[key] = rec;
            });

            var uniqueGenomes = {};
            var uniqueContigs = {};
            var genomeToContigs = {};
            var totalFeatureCount = 0;
            var nodeRowsHtml = '';

            indices.forEach(lang.hitch(this, function(idx) {
                var node = (window.GexfJS && GexfJS.graph && GexfJS.graph.nodeList) ? GexfJS.graph.nodeList[idx] : null;
                if (!node) return;
                var nodeGenomes = {};
                var nodeFeatCount = 0;

                if (featureAttrIndex !== null && typeof featureAttrIndex !== 'undefined' && node.attributes && node.attributes[featureAttrIndex]) {
                    try {
                        var rawJson = node.attributes[featureAttrIndex].replace(/""/g, '"');
                        var fMap = JSON.parse(rawJson);
                        Object.keys(fMap).forEach(function(gid) {
                            if (gid === "info") return;
                            uniqueGenomes[gid] = true;
                            nodeGenomes[gid] = true;
                            if (!genomeToContigs[gid]) genomeToContigs[gid] = {};
                            var contigs = fMap[gid] || {};
                            Object.keys(contigs).forEach(function(cid) {
                                uniqueContigs[cid] = true;
                                if (!genomeToContigs[gid][cid]) genomeToContigs[gid][cid] = [];
                                var feats = contigs[cid] || [];
                                nodeFeatCount += feats.length;
                                totalFeatureCount += feats.length;
                                feats.forEach(function(fid) {
                                    var cleanFid = String(fid).replace(/"/g, '');
                                    if (genomeToContigs[gid][cid].indexOf(cleanFid) === -1) {
                                        genomeToContigs[gid][cid].push(cleanFid);
                                    }
                                });
                            });
                        });
                    } catch (e) {}
                }

                var nodeGCount = Object.keys(nodeGenomes).length;
                nodeRowsHtml += '<div style="display:flex; align-items:center; justify-content:space-between; padding:4px 6px; border-bottom:1px solid #eee; font-size:0.84em; gap:6px;">';
                nodeRowsHtml += '<div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">';
                nodeRowsHtml += '<a href="javascript:void(0)" onclick="window.inspectNodeFromLocus(' + idx + '); return false;" style="color:#4a148c; font-weight:bold; text-decoration:none;" title="Inspect single node details">' + (node.label || node.id) + '</a>';
                nodeRowsHtml += ' <span style="color:#777; font-size:0.9em;">(' + nodeGCount + ' gen, ' + nodeFeatCount + ' feat)</span>';
                nodeRowsHtml += '</div>';
                nodeRowsHtml += '<a href="javascript:void(0)" onclick="window.removeNodeFromSelection(' + idx + '); return false;" style="color:#c62828; font-weight:bold; text-decoration:none; padding:0 4px;" title="Remove node from selection">&times;</a>';
                nodeRowsHtml += '</div>';
            }));

            var allGenomeIds = Object.keys(uniqueGenomes);
            var allContigIds = Object.keys(uniqueContigs);
            var inducedEdgeCount = (window.GexfJS && GexfJS.params && GexfJS.params.activeEdges) ? Object.keys(GexfJS.params.activeEdges).length : 0;
            var titleSpinner = isLoading ? ' <i class="fa fa-spinner fa-spin" style="font-size:0.75em; color:#8e24aa;" title="Loading feature annotations..."></i>' : '';

            var html = '<div style="padding:10px; font-family:inherit;">';
            html += '<div style="margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">';
            html += '<a href="javascript:void(0)" onclick="window.displayNode(-1); return false;" style="display:inline-block; padding:2px 8px; background:#eef4f9; border:1px solid #bce8f1; border-radius:4px; color:#31708f; font-weight:bold; font-size:0.82em; text-decoration:none;" title="Clear selection and return to Graph Summary">&#9664; Clear &amp; Back to Summary</a>';
            html += '</div>';

            html += '<div style="background:#f3e5f5; border:1px solid #ce93d8; border-left:4px solid #8e24aa; border-radius:4px; padding:8px 10px; margin-bottom:10px;">';
            html += '<div style="font-weight:bold; color:#4a148c; font-size:1.0em; margin-bottom:4px;">Selected Nodes (' + indices.length + ')' + titleSpinner + '</div>';
            html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:4px; font-size:0.83em; color:#333; margin-bottom:6px;">';
            html += '<div><b>Nodes:</b> ' + indices.length + (inducedEdgeCount > 0 ? ' <span style="color:#666;">(' + inducedEdgeCount + ' edges)</span>' : '') + '</div>';
            html += '<div><b>Features:</b> ' + totalFeatureCount + '</div>';
            html += '<div><b>Genomes:</b> ' + allGenomeIds.length + '</div>';
            html += '<div><b>Contigs:</b> ' + allContigIds.length + '</div>';
            html += '</div>';
            html += '<div style="font-size:0.78em; color:#555; background:rgba(255,255,255,0.7); padding:5px 7px; border-radius:3px; line-height:1.35;">';
            html += '<div>&bull; <b>Add / Toggle Nodes:</b> <code>Shift+Click</code> or <code>Cmd/Ctrl+Click</code> a node, or <code>Shift+Drag</code> a box.</div>';
            html += '<div>&bull; <b>Create Group:</b> Click <b>GROUP</b> on the Action Bar to create a <b>Feature Group</b> (' + totalFeatureCount + ') or <b>Genome Group</b> (' + allGenomeIds.length + ').</div>';
            html += '<div>&bull; <b>Pin Selection:</b> Click <b>PIN</b> on the Action Bar to color and save this selection.</div>';
            html += '</div>';
            if (pinnedName) {
                html += '<div style="margin-top:6px; padding:4px 7px; background:#e8f5e9; border:1px solid #a5d6a7; border-radius:3px; font-size:0.8em; color:#1b5e20;">';
                html += '<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:' + (pinnedColor || '#8e24aa') + '; margin-right:5px; vertical-align:middle;"></span>';
                html += 'Pinned as <b>' + pinnedName + '</b>';
                html += '</div>';
            }
            html += '</div>';

            if (isTruncated) {
                html += '<div style="color:#856404; font-size:0.8em; margin-bottom:8px; padding:5px 7px; background:#fff3cd; border:1px solid #ffeeba; border-radius:3px;">';
                html += 'Extended annotations fetched for first 2,500 features; all ' + totalFeatureCount + ' features and ' + allGenomeIds.length + ' genomes are included in group actions.';
                html += '</div>';
            }

            // Collapsible list of Selected Nodes
            html += '<details open style="margin-bottom:10px; border:1px solid #ddd; border-radius:4px; background:#fff;">';
            html += '<summary style="padding:6px 8px; font-weight:bold; font-size:0.88em; cursor:pointer; background:#fafafa; color:#333;">Selected Nodes [' + indices.length + ']</summary>';
            html += '<div style="max-height:180px; overflow-y:auto;">' + nodeRowsHtml + '</div>';
            html += '</details>';

            // Collapsible list of Implicated Genomes & Contigs
            if (allGenomeIds.length > 0) {
                html += '<details open style="margin-bottom:10px; border:1px solid #ddd; border-radius:4px; background:#fff;">';
                html += '<summary style="padding:6px 8px; font-weight:bold; font-size:0.88em; cursor:pointer; background:#fafafa; color:#333;">Implicated Genomes [' + allGenomeIds.length + '] &amp; Contigs [' + allContigIds.length + ']</summary>';
                html += '<div style="padding:6px 8px; max-height:260px; overflow-y:auto; font-size:0.84em;">';
                html += '<div style="margin-bottom:6px; padding-bottom:4px; border-bottom:1px solid #eee; display:flex; gap:10px;">';
                html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allGenomeIds.join(',') + '\', \'' + genomeAttrId + '\', \'Selected Genomes (' + allGenomeIds.length + ')\'); return false;" style="color:#1565c0; font-weight:bold; text-decoration:none;" title="Highlight full paths of all genomes in selection">Highlight All Genomes</a>';
                html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allContigIds.join(',') + '\', \'' + sequenceAttrId + '\', \'Selected Contigs (' + allContigIds.length + ')\'); return false;" style="color:#1565c0; font-weight:bold; text-decoration:none;" title="Highlight full paths of all contigs in selection">Highlight All Contigs</a>';
                html += '</div>';

                allGenomeIds.forEach(lang.hitch(this, function(gid) {
                    var gName = (this.genomeNameMap && this.genomeNameMap[gid]) ? this.genomeNameMap[gid] : gid;
                    var contigsObj = genomeToContigs[gid] || {};
                    var cIds = Object.keys(contigsObj);
                    html += '<div style="margin-bottom:5px;">';
                    html += '<a href="javascript:void(0)" style="font-weight:bold; color:#222;" onclick="window.doHighlightPath(undefined, \'' + gid + '\', \'' + genomeAttrId + '\', \'Genome: ' + gName.replace(/'/g, "&apos;") + '\'); return false;" title="Highlight Genome Edges">' + gName + '</a>';
                    html += ' <span style="color:#777; font-size:0.9em;">(' + cIds.length + ' contig' + (cIds.length === 1 ? '' : 's') + ')</span>';
                    html += '<div style="padding-left:12px; color:#555;">';
                    cIds.forEach(function(cid) {
                        var feats = contigsObj[cid] || [];
                        html += '<div style="margin-top:2px;">';
                        html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + cid + '\', \'' + sequenceAttrId + '\', \'Contig: ' + cid.replace(/'/g, "&apos;") + '\'); return false;" title="Highlight Contig Edges">' + cid + '</a>';
                        html += ' <span style="color:#888; font-size:0.88em;">[' + feats.length + ' feat]</span>';
                        html += '</div>';
                    });
                    html += '</div></div>';
                }));
                html += '</div></details>';
            }

            html += '</div>';

            if (this.itemDetailPanel.customDisplayNode) {
                this.itemDetailPanel.set('selection', []);
                this.itemDetailPanel.customDisplayNode.innerHTML = html;
            } else {
                this.itemDetailPanel.set('content', html);
            }
        },

        // --- UPDATED SELECTION LOGIC ---
        onGraphSelection: function(ids, featureMap, node) {
            if (!ids || ids.length === 0) return;
            
            // Ensure inputs are strings and clean them up
            var cleanIds = ids.map(function(id) { return String(id).replace(/"/g, ''); });
            var isFeature = cleanIds[0].match(/^fig\|\d+\.\d+/);
            
            var query = "";
            var url = "";
            var fallbackRecords = [];

            if (isFeature) {
                this.containerType = "feature_data";
                url = PathJoin(window.App.dataAPI, "genome_feature");
                // Include feature_id and genome_id so both Feature Group and Genome Group creation work cleanly
                query = "in(patric_id,(" + cleanIds.map(encodeURIComponent).join(",") + "))&select(feature_id,patric_id,genome_id,genome_name,product,gene,refseq_locus_tag)&limit(25000)";
                if (featureMap) {
                    Object.keys(featureMap).forEach(lang.hitch(this, function(genomeId) {
                        if (genomeId === "info") return;
                        var gName = (this.genomeNameMap && this.genomeNameMap[genomeId]) ? this.genomeNameMap[genomeId] : genomeId;
                        var contigs = featureMap[genomeId] || {};
                        Object.keys(contigs).forEach(function(contigId) {
                            var feats = contigs[contigId] || [];
                            feats.forEach(function(fid) {
                                var cleanFid = String(fid).replace(/"/g, '');
                                fallbackRecords.push({
                                    feature_id: cleanFid,
                                    patric_id: cleanFid,
                                    genome_id: genomeId,
                                    genome_name: gName
                                });
                            });
                        });
                    }));
                } else {
                    fallbackRecords = cleanIds.map(function(fid) {
                        var m = fid.match(/^fig\|(\d+\.\d+)/);
                        return {
                            feature_id: fid,
                            patric_id: fid,
                            genome_id: m ? m[1] : undefined
                        };
                    });
                }
            } else {
                this.containerType = "genome_data";
                url = PathJoin(window.App.dataAPI, "genome");
                query = "in(genome_id,(" + cleanIds.map(encodeURIComponent).join(",") + "))&select(genome_id,genome_name)&limit(25000)";
                fallbackRecords = cleanIds.map(lang.hitch(this, function(gid) {
                    return {
                        genome_id: gid,
                        genome_name: (this.genomeNameMap && this.genomeNameMap[gid]) ? this.genomeNameMap[gid] : gid
                    };
                }));
            }

            if (fallbackRecords.length > 0) {
                this.updateSelection(fallbackRecords, featureMap, node, true, false);
            }

            // Execute the query
            xhr.post(url, {
                headers: {
                    accept: "application/json",
                    "X-Requested-With": null,
                    Authorization: (window.App.authorizationToken || "")
                },
                handleAs: "json",
                data: query
            }).then(lang.hitch(this, function(records) {
                if (records && records.length > 0) {
                    if (isFeature && fallbackRecords.length > 0) {
                        var byPatric = {};
                        records.forEach(function(r) {
                            if (r && r.patric_id) byPatric[r.patric_id] = r;
                        });
                        var merged = fallbackRecords.map(function(fb) {
                            var apiRec = byPatric[fb.patric_id];
                            return apiRec ? lang.mixin({}, fb, apiRec) : fb;
                        });
                        this.updateSelection(merged, featureMap, node, false, false);
                    } else {
                        this.updateSelection(records, featureMap, node, false, false);
                    }
                } else if (fallbackRecords.length > 0) {
                    this.updateSelection(fallbackRecords, featureMap, node, false, false);
                }
            }), lang.hitch(this, function() {
                if (fallbackRecords.length > 0) {
                    this.updateSelection(fallbackRecords, featureMap, node, false, false);
                }
            }));
        },

        updateSelection: function(records, featureMap, node, isLoading, isTruncated) {
            this.selection = records || [];
            
            this.selectionActionBar.set("currentContainerType", this.containerType);
            this.selectionActionBar.set("selection", this.selection);

            var nodeAttrIdToName = {};
            if (window.GexfJS && GexfJS._node_attr_value) {
                Object.keys(GexfJS._node_attr_value).forEach(function(name){
                    nodeAttrIdToName[GexfJS._node_attr_value[name]] = name;
                });
            }

            var genomeAttrId = (window.GexfJS && GexfJS._edge_attr_value && GexfJS._edge_attr_value['genomes']) ? GexfJS._edge_attr_value['genomes'] : 'genomes';
            var sequenceAttrId = (window.GexfJS && GexfJS._edge_attr_value && GexfJS._edge_attr_value['sequences']) ? GexfJS._edge_attr_value['sequences'] : 'sequences';

            var namedAttrs = {};
            if (node.attributes) {
                Object.keys(node.attributes).forEach(function(attrId){
                    var name = nodeAttrIdToName[attrId];
                    if (name && name !== 'features') {
                        namedAttrs[name] = node.attributes[attrId];
                    }
                });
            }

            // Build discrete biological phenomenon badges for this locus
            var badges = [];
            var badgeStyle = 'display:inline-block; margin:2px 4px 2px 0; padding:2px 7px; border-radius:10px; font-size:0.8em; font-weight:bold;';
            if (String(namedAttrs['is_superbubble']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#e3f2fd; color:#1565c0; border:1px solid #90caf9;" title="Bounded allelic or accessory variation flanked by conserved core anchors">Superbubble' + (namedAttrs['superbubble_id'] ? ' (' + namedAttrs['superbubble_id'] + ')' : '') + '</span>');
            }
            if (String(namedAttrs['repeat_ambiguity']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#fff3e0; color:#e65100; border:1px solid #ffcc80;" title="Multi-copy gene family participating in a local tandem repeat or copy number variant">Copy Number Variant' + (namedAttrs['cnv_cluster_id'] ? ' (' + namedAttrs['cnv_cluster_id'] + ')' : '') + '</span>');
            }
            if (String(namedAttrs['repeat_ambiguity_fragmentation']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#fce4ec; color:#ad1457; border:1px solid #f48fb1;" title="Dispersed paralogous family split across separate loci or contigs">Fragmented CNV' + (namedAttrs['cnv_cluster_id'] ? ' (' + namedAttrs['cnv_cluster_id'] + ')' : '') + '</span>');
            }
            if (String(namedAttrs['alternative_path']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#f3e5f5; color:#6a1b9a; border:1px solid #ce93d8;" title="Minority accessory path or horizontal gene transfer (HGT) insertion">Alternative Path</span>');
            }
            if (String(namedAttrs['synteny_breakpoint']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#ffebee; color:#c62828; border:1px solid #ef9a9a;" title="Boundary of a large-scale chromosomal rearrangement or translocation">Synteny Breakpoint</span>');
            }
            if (String(namedAttrs['assembly_repeat_break']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#fff8e1; color:#f57f17; border:1px solid #ffe082;" title="Contig terminus inside a repetitive gene family">Assembly Repeat Break</span>');
            }
            if (String(namedAttrs['is_scaffold_path']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#e8f5e9; color:#2e7d32; border:1px solid #a5d6a7;" title="Candidate syntenic scaffold bridge connecting fragmented contigs">Scaffold Bridge</span>');
            }
            if (String(namedAttrs['inverted_block']).toLowerCase() === 'true') {
                badges.push('<span style="' + badgeStyle + ' background:#ede7f6; color:#4527a0; border:1px solid #b39ddb;" title="Locus participating in a chromosomal inversion relative to reference consensus">Inverted Block</span>');
            }

            // Detect paralogous loci sharing the same protein family across the graph
            var curFamily = namedAttrs['family'] || node.label;
            var paralogNodes = [];
            if (curFamily && window.GexfJS && GexfJS.graph && Array.isArray(GexfJS.graph.nodeList)) {
                var famAttrId = (GexfJS._node_attr_value && GexfJS._node_attr_value['family']) ? GexfJS._node_attr_value['family'] : 'family';
                GexfJS.graph.nodeList.forEach(function(n, idx) {
                    if (String(n.id) === String(node.id)) return;
                    var nFam = (n.attributes && n.attributes[famAttrId]) ? n.attributes[famAttrId] : n.label;
                    if (String(nFam) === String(curFamily)) {
                        paralogNodes.push({ idx: idx, id: n.id, label: n.label || n.id });
                    }
                });
            }
            if (paralogNodes.length > 0) {
                badges.push('<span style="' + badgeStyle + ' background:#e0f7fa; color:#006064; border:1px solid #80deea;" title="Gene family appears at multiple distinct syntenic loci across the graph">Paralogous Loci (' + (paralogNodes.length + 1) + ')</span>');
            }

            var attrHtml = '<div style="margin-bottom:10px; font-size:0.9em; color:#555;">';
            if (badges.length > 0) {
                attrHtml += '<div style="margin-bottom:6px;">' + badges.join('') + '</div>';
            }
            if (paralogNodes.length > 0) {
                var famEsc = String(curFamily).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                var paralogLinks = paralogNodes.map(function(p) {
                    return '<a href="#" onclick="window.inspectNodeFromLocus(' + p.idx + '); return false;" style="color:#006064; text-decoration:underline; margin-right:6px;" title="Center and inspect node ' + p.id + '">Node ' + p.id + '</a>';
                }).join('');
                attrHtml += '<div style="margin-bottom:6px; padding:4px 6px; background:#f0fbfc; border:1px solid #b2ebf2; border-radius:4px;">' +
                    '<b>Other Paralogous Loci (' + paralogNodes.length + '):</b> ' + paralogLinks +
                    '<a href="#" onclick="window.selectFamilyNodes(\'' + famEsc + '\'); return false;" style="color:#0277bd; font-weight:bold; text-decoration:underline; margin-left:4px;" title="Select all ' + (paralogNodes.length + 1) + ' nodes of this family for comparative analysis">[Select all ' + (paralogNodes.length + 1) + ']</a>' +
                    '</div>';
            }
            attrHtml += '<div><b>Node ID:</b> ' + node.id + '</div>';
            Object.keys(namedAttrs).forEach(function(name){
                attrHtml += '<div><b>' + name + ':</b> ' + namedAttrs[name] + '</div>';
            });
            attrHtml += '</div>';

            var linksHtml = '';
            var recordMap = {};
            this.selection.forEach(function(rec) { 
                var key = rec.patric_id || rec.genome_id;
                recordMap[key] = rec; 
            });

            if (featureMap) {
                var allGenomes = Object.keys(featureMap);
                var allSequences = [];
                var hierarchyHtml = '<div class="graph-links" style="font-size:0.9em;">';
                
                Object.keys(featureMap).forEach(lang.hitch(this, function(genomeId) {
                    var contigs = featureMap[genomeId];
                    var genomeSequences = Object.keys(contigs);
                    allSequences = allSequences.concat(genomeSequences);
                    
                    var genomeName = genomeId;
                    if (this.genomeNameMap && this.genomeNameMap[genomeId]) {
                        genomeName = this.genomeNameMap[genomeId];
                    } else {
                        var firstSeq = genomeSequences[0];
                        if(firstSeq && contigs[firstSeq][0] && recordMap[contigs[firstSeq][0]] && recordMap[contigs[firstSeq][0]].genome_name){
                            genomeName = recordMap[contigs[firstSeq][0]].genome_name;
                        }
                    }

                    hierarchyHtml += '<div style="margin-top:5px;">';
                    // Inline color boxes removed
                    hierarchyHtml += '<a href="javascript:void(0)" style="font-weight:bold;" onclick="window.doHighlightPath(undefined, \'' + genomeId + '\', \'' + genomeAttrId + '\', \'Genome: ' + genomeName.replace(/'/g, "&apos;") + '\'); return false;" title="Highlight Genome Edges">' + genomeName + '</a>:';
                    hierarchyHtml += '<div style="padding-left:20px;">';

                    Object.keys(contigs).forEach(function(contigId) {
                        hierarchyHtml += '<div>';
                        // Inline color boxes removed
                        hierarchyHtml += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + contigId + '\', \'' + sequenceAttrId + '\', \'Contig: ' + contigId.replace(/'/g, "&apos;") + '\'); return false;" title="Highlight Contig Edges">' + contigId + '</a>:';
                        hierarchyHtml += '</div>';
                        
                        var feats = contigs[contigId];
                        
                        feats.forEach(function(fid) {
                            var displayLabel = "[" + fid + "]";
                            
                            if(recordMap[fid]) {
                                var extras = [];
                                if (recordMap[fid].gene) extras.push(recordMap[fid].gene);
                                if (recordMap[fid].refseq_locus_tag) extras.push(recordMap[fid].refseq_locus_tag);
                                if (recordMap[fid].product) extras.push(recordMap[fid].product);
                                
                                if (extras.length > 0) {
                                    displayLabel += " <span style='color:#666;'>(" + extras.join(" | ") + ")</span>";
                                }
                            } 

                            hierarchyHtml += '<div style="padding-left:10px; margin-bottom: 2px;">';
                            // --- CHANGED: Standard hyperlink opening in a new tab to the Feature page ---
                            hierarchyHtml += '<a href="/view/Feature/' + encodeURIComponent(fid) + '" target="_blank" title="Open Feature Page in New Tab">' + displayLabel + '</a>';
                            hierarchyHtml += '</div>';
                        });
                    });
                    hierarchyHtml += '</div></div>';
                }));
                hierarchyHtml += '</div>';

                var summaryHtml = '<div style="margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #ccc;">';
                summaryHtml += '<div style="margin-bottom:4px;"><b><a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allGenomes.join(',') + '\', \'' + genomeAttrId + '\', \'Genomes: ' + allGenomes.length + '\'); return false;">Genomes[' + allGenomes.length + ']</a></b></div>';
                summaryHtml += '<div><b><a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allSequences.join(',') + '\', \'' + sequenceAttrId + '\', \'Sequences: ' + allSequences.length + '\'); return false;">Sequences[' + allSequences.length + ']</a></b></div>';
                
                if (isTruncated) {
                    summaryHtml += '<div style="color:#d9534f; font-size:0.85em; margin-top:5px; padding:3px; background:#fdf0f0; border:1px solid #ebccd1; border-radius:3px;">';
                    summaryHtml += '<i class="fa fa-exclamation-triangle"></i> Node contains too many features. Display truncated to first 500 to maintain performance.';
                    summaryHtml += '</div>';
                }
                
                summaryHtml += '</div>';
                linksHtml = summaryHtml + hierarchyHtml;
            } else {
                linksHtml += '<ul style="margin-top:10px; padding-left:20px; list-style-type: square;">';
                (records || []).forEach(function(rec) {
                    var id = rec.genome_id || rec.patric_id;
                    var name = rec.genome_name || id;
                    // For pure genome nodes, pointing to the genome page
                    linksHtml += '<li><a href="/view/Genome/' + encodeURIComponent(id) + '" target="_blank" title="Open Genome Page in New Tab">' + name + '</a></li>';
                });
                linksHtml += '</ul>';
            }

            var titleSpinner = isLoading ? ' <i class="fa fa-spinner fa-spin" style="font-size:0.6em; color:#999;" title="Fetching extended annotations..."></i>' : '';

            var content = '<div style="padding:10px;">';
            if (this.savedPhenomenonContext && this.savedPhenomenonContext.type) {
                var backLabel = this.savedPhenomenonContext.highlightName || 'Phenomenon';
                content += '<div style="margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:4px;">';
                content += '<a href="javascript:void(0)" onclick="window.restorePhenomenonContext(); return false;" style="display:inline-block; padding:3px 8px; background:#f3e5f5; border:1px solid #ce93d8; border-radius:4px; color:#4a148c; font-weight:bold; font-size:0.82em; text-decoration:none;" title="Return to the active phenomenon &amp; locus stepper">&#9664; Back to ' + backLabel + '</a>';
                content += '<a href="javascript:void(0)" onclick="window.displayNode(-1); return false;" style="font-size:0.8em; color:#666; text-decoration:none;" title="Return to full Graph Summary">Summary</a>';
                content += '</div>';
            } else {
                content += '<div style="margin-bottom:8px;">';
                content += '<a href="javascript:void(0)" onclick="window.displayNode(-1); return false;" style="display:inline-block; padding:2px 8px; background:#eef4f9; border:1px solid #bce8f1; border-radius:4px; color:#31708f; font-weight:bold; font-size:0.82em; text-decoration:none;" title="Clear selection and return to Graph Summary">&#9664; Back to Summary</a>';
                content += '</div>';
            }
            content += '<div style="margin-bottom:5px;"><h3 style="margin:0; display:inline; word-wrap:break-word;">' + node.label + titleSpinner + '</h3></div>';
            content += attrHtml;
            content += linksHtml;
            content += '</div>';

            if (this.itemDetailPanel.customDisplayNode) {
                this.itemDetailPanel.set('selection', []); 
                this.itemDetailPanel.customDisplayNode.innerHTML = content;
            } else {
                this.itemDetailPanel.set('content', content);
            }
        },

        resize: function(){
            this.inherited(arguments);
            if (!window.GexfJS) return;

            // We resize based on the viewerPane (Center Region), not the whole widget
            if (!this.viewerPane || !this.viewerPane.domNode) return;

            var box = this.viewerPane.domNode.getBoundingClientRect();
            var footer = query(".WorkspaceController.dijitAlignBottom")[0];
            var footerHeight = footer ? domGeom.getMarginBox(footer).h : 0;
            var availH = window.innerHeight - box.top - footerHeight;

            if (availH > 0) {
                // Resize the DOM Node of the center pane
                domStyle.set(this.viewerPane.domNode, "height", availH + "px");
                
                // Update Canvas
                var carte = document.getElementById("carte");
                if (carte) {
                    carte.width = box.width;
                    carte.height = availH;
                }
                
                // Update GEXF internal state
                GexfJS.graphZone.width = box.width;
                GexfJS.graphZone.height = availH;
                delete GexfJS.oldParams.zoomLevel;
            }
        }
    });
});
