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
        "baseClass": "GEXFView",
        "disabled": false,
        "path": "",
        "file": null,
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
                "ColorSelection",
                "fa icon-paint-brush fa-2x",
                {
                    label: "PIN",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes:["*"],
                    tooltip: "Color Current Graph Selection",
                    ignoreDataType: true
                },
                function (selection) {
                    // Open the tooltip dialog we built in postCreate
                    popup.open({
                        popup: this.colorMenu,
                        around: this.selectionActionBar._actions.ColorSelection.button,
                        orient: ["above", "below"] // Action bar is on bottom right, "above" works well
                    });
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
                    tooltip: "Add selection to a new or existing group",
                    validContainerTypes: ["feature_data", "genome_data"]
                },
                function(selection, containerWidget){
                    // This requires the SelectionToGroup widget (you may need to add it to imports if you use this)
                    // For now, this is a placeholder matching MSATree structure
                    console.log("Add Group clicked", selection);
                    // console.log("Add Items to Group", selection);
                    var dlg = new Dialog({ title: 'Add selected items to group' });
                    var type;

                    if (!containerWidget) {
                        // console.log("Container Widget not setup for addGroup");
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
                    var stg = new SelectionToGroup({
                        selection: selection,
                        selectType: true,
                        type: type,
                        inputType: containerWidget.containerType,
                        path: containerWidget.get('path')
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
                innerHTML: '<div style="padding: 8px; display: flex; align-items: center; white-space: nowrap;">' +
                           '<span style="margin-right: 10px; font-weight: bold;">Node/Edge Color:</span>' + 
                           '<input type="color" id="gexfColorPicker" value="#ff0000" style="cursor: pointer; margin-right: 15px; width: 30px; height: 30px; padding: 0; border: 1px solid #ccc;">' +
                           '<button id="gexfColorApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfColorCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div>'
            });

            this.colorMenu = new TooltipDialog({ content: colorMenuDiv });

            on(colorMenuDiv, "#gexfColorApply:click", lang.hitch(this, function() {
                var color = document.getElementById('gexfColorPicker').value;
                this.applyColorToGraph(color);
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
                           '<div style="margin-bottom: 10px;"><label>Text Size Multiplier: <input type="number" id="gexfLabelSize" value="1.0" step="0.2" min="0.2" max="5.0" style="width: 50px; text-align:center;"></label></div>' +
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
            

            this.viewerPane = new ContentPane({ region: "center", content: this.graphTemplateString, style: "padding:0; overflow:hidden;" });

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
                // Set content on the viewerPane, not 'this' (which is the BorderContainer)
                this.viewerPane.set("content", "<div>Loading GEXF file...</div>");
                
                WorkspaceManager.getObject(this.path, false).then(lang.hitch(this, function(res){
                    if (res && res.data){
                        // Reset the template into the center pane
                        this.viewerPane.set("content", this.graphTemplateString);
                        setTimeout(lang.hitch(this, function() { this.renderGraph(res.data); }), 50);
                    }
                }));
            }));
        },

        rebuildPinnedElements: function() {
            if (!window.GexfJS) return;
            GexfJS.params.pinnedElements = {};
            if (GexfJS.params.userPins) {
                Object.keys(GexfJS.params.userPins).forEach(function(pinName) {
                    var pinObj = GexfJS.params.userPins[pinName];
                    Object.keys(pinObj.elements).forEach(function(elId) {
                        GexfJS.params.pinnedElements[elId] = pinObj.color;
                    });
                });
            }
            if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel; 
        },

        applyColorToGraph: function(color) {
            if (!window.GexfJS || !GexfJS.params) return;
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            
            var name = GexfJS.params.currentHighlightName || "Custom Selection";
            var elementsToPin = {};
            var applied = false;

            if (GexfJS.params.path_active && GexfJS.params.activeEdges) {
                Object.keys(GexfJS.params.activeEdges).forEach(function(edgeId) {
                    elementsToPin['e_' + edgeId] = true;
                    applied = true;
                });
            } 
            if (GexfJS.params.activeNodes && Object.keys(GexfJS.params.activeNodes).length > 0) {
                Object.keys(GexfJS.params.activeNodes).forEach(function(nodeId) {
                     elementsToPin['n_' + nodeId] = true;
                     applied = true;
                });
            }

            if (applied) {
                // Save to persistent user pins, overwriting if the name already exists
                GexfJS.params.userPins[name] = { color: color, elements: elementsToPin };
                this.rebuildPinnedElements();
                
                // Refresh the summary panel to instantly show the new pin!
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Graph Summary") !== -1) {
                    this.showDefaultSummary();
                }
            }
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
            
            // Statistics Table
            html += '<table style="width:100%; font-size:0.95em; margin-bottom:15px; border-collapse: collapse;">';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Genomes:</b></td><td style="text-align:right;">' + (s.total_genomes || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Contigs:</b></td><td style="text-align:right;">' + (s.total_contigs || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Features:</b></td><td style="text-align:right;">' + (s.total_features || 0) + '</td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Total Nodes:</b></td><td style="text-align:right;">' + (s.total_nodes || 0) + '</td></tr>';
            
            // Special Interactive Stat Links
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>CNV Clusters:</b></td><td style="text-align:right;"><a href="javascript:void(0)" onclick="window.highlightSpecial(\'cnv\'); return false;" title="Highlight Nodes with CNV Clusters">' + (s.cnv_clusters || 0) + '</a></td></tr>';
            html += '<tr style="border-bottom: 1px solid #eee;"><td><b>Inversions:</b></td><td style="text-align:right;"><a href="javascript:void(0)" onclick="window.highlightSpecial(\'inversions\'); return false;" title="Highlight Inversion Edges">' + (s.inversions || 0) + '</a></td></tr>';
            html += '<tr><td><b>Translocations:</b></td><td style="text-align:right;"><a href="javascript:void(0)" onclick="window.highlightSpecial(\'translocations\'); return false;" title="Highlight Translocation Edges">' + (s.translocations || 0) + '</a></td></tr>';
            html += '</table>';

            // Parameters
            if (s.parameters) {
                var paramsText = JSON.stringify(s.parameters).replace(/[{""}]/g, '').replace(/:/g, ': ');
                html += '<div style="font-size:0.9em; margin-bottom:15px; color:#666;"><b>Params:</b> ' + paramsText + '</div>';
            }
            var pins = (window.GexfJS && GexfJS.params) ? GexfJS.params.userPins : {};
            
            html += '<h4 style="margin-bottom:5px;">Pinned Manifest</h4>';
            html += '<div style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px;">';
            
            if (pins && Object.keys(pins).length > 0) {
                html += '<ul style="margin:0; padding-left:5px; list-style-type: none;">';
                
                Object.keys(pins).forEach(function(pinName) {
                    var pinColor = pins[pinName].color;
                    html += '<li style="margin-bottom: 6px; display: flex; align-items: center;">';
                    // The color swatch
                    html += '<span style="display:inline-block; width:14px; height:14px; background-color:' + pinColor + '; border:1px solid #999; margin-right:8px; flex-shrink: 0;"></span>';
                    // The Name
                    html += '<span style="flex-grow: 1; word-wrap: break-word;">' + pinName + '</span>';
                    // The 'X' Button
                    html += '<a href="javascript:void(0)" onclick="window.removePin(\'' + pinName + '\'); return false;" style="color:#d9534f; text-decoration:none; font-weight:bold; font-size: 1.1em; padding-left: 8px;" title="Remove Pin">&#10006;</a>';
                    html += '</li>';
                });
                
                html += '</ul>';
            } else {
                // Show an empty state if nothing is pinned yet
                html += '<div style="color:#999; font-style:italic; padding-left:5px;">No pinned items.</div>';
            }
            html += '</div>';

            if (s['block_manifest'] && s['block_manifest'].length > 0) {
                html += '<h4 style="margin-bottom:5px;">Syntenic Block Manifest</h4>';
                // Using the same max-height and overflow-y: auto to ensure it scrolls!
                html += '<div style="max-height: 250px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px;">';
                html += '<ul style="margin:0; padding-left:5px; list-style-type: square;">';
                
                s['block_manifest'].forEach(function(blockName) {
                    // Pass the blockName as a second parameter to highlightSpecial
                    html += '<li><a href="javascript:void(0)" onclick="window.highlightSpecial(\'block\', \'' + blockName + '\'); return false;" title="Highlight Block: ' + blockName + '">' + blockName + '</a></li>';
                });
                
                html += '</ul>';
                html += '</div>';
            }
            
            // Genome Manifest (Collapsible)
            if (s.contig_map) {
                html += '<h4 style="margin-bottom:5px;">Genome Manifest</h4>';
                html += '<div style="max-height: 350px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa;">';
                
                Object.keys(s.contig_map).forEach(function(genomeId) {
                    var contigs = s.contig_map[genomeId];
                    // Using native HTML5 details/summary for expand & collapse
                    html += '<details style="margin-bottom: 4px;">';
                    html += '<summary style="cursor:pointer; outline:none; font-weight:bold;">';
                    html += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + genomeId + '\', \'' + genomeAttrId + '\', \'Genome: ' + genomeId + '\'); return false;" title="Highlight Genome">' + genomeId + '</a>';
                    html += ' <span style="font-weight:normal; color:#666;">(' + contigs.length + ' contigs)</span>';
                    html += '</summary>';
                    
                    html += '<ul style="margin-top:2px; padding-left:25px; list-style-type: square;">';
                    contigs.forEach(function(contigId) {
                        html += '<li><a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + contigId + '\', \'' + sequenceAttrId + '\', \'Contig: ' + contigId + '\'); return false;" title="Highlight Contig">' + contigId + '</a></li>';
                    });
                    html += '</ul>';
                    html += '</details>';
                });
                
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
                } catch(e) {
                    console.error("Error parsing GEXF summary:", e);
                    this.graphSummary = null;
                }
            }

            // --- 2. CREATE SPECIAL HIGHLIGHT FUNCTION ---
            window.highlightSpecial = lang.hitch(this, function(type, targetValue) {
                if (!window.GexfJS || !GexfJS.params) return;
                
                var hlName = type.charAt(0).toUpperCase() + type.slice(1);
                if (targetValue) hlName += ": " + targetValue;
                GexfJS.params.currentHighlightName = hlName;
                
                // Deep clear of ALL highlight states
                GexfJS.params.activeEdges = {};
                GexfJS.params.path_active = false;
                GexfJS.params.pinnedElements = {};
                GexfJS.params.activeNode = -1; 
                GexfJS.params.currentNode = -1;
                GexfJS.params.activeNodes = {}; // Clean slate!
                var hlColor = GexfJS.params.highlightColorOverride || '#ff00ff';
                this.rebuildPinnedElements();


                if (type === 'inversions') {
                    var attrId = GexfJS._edge_attr_value['is_inversion'];
                    if (typeof attrId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[attrId]) {
                        var edgesWithInversion = GexfJS.path_highlights[attrId]['true']; 
                        if (edgesWithInversion) {
                            for (var edgeId in edgesWithInversion) {
                                // 1. Activate the Edge
                                GexfJS.params.activeEdges[edgeId] = true;
                                
                                // 2. NEW: Activate the connected Nodes
                                var edgeObj = GexfJS.graph.edgeLookup[edgeId];
                                if (edgeObj) {
                                    var sourceNode = GexfJS.graph.nodeList[edgeObj.source];
                                    var targetNode = GexfJS.graph.nodeList[edgeObj.target];
                                    if (sourceNode) GexfJS.params.activeNodes[sourceNode.id] = true;
                                    if (targetNode) GexfJS.params.activeNodes[targetNode.id] = true;
                                }
                            }
                        }
                    }
                } else if (type === 'translocations') {
                    var attrId = GexfJS._edge_attr_value['is_translocation'];
                    if (typeof attrId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[attrId]) {
                        var edgesWithTranslocation = GexfJS.path_highlights[attrId]['true']; 
                        if (edgesWithTranslocation) {
                            for (var edgeId in edgesWithTranslocation) {
                                // 1. Activate the Edge
                                GexfJS.params.activeEdges[edgeId] = true;
                                
                                // 2. NEW: Activate the connected Nodes
                                var edgeObj = GexfJS.graph.edgeLookup[edgeId];
                                if (edgeObj) {
                                    var sourceNode = GexfJS.graph.nodeList[edgeObj.source];
                                    var targetNode = GexfJS.graph.nodeList[edgeObj.target];
                                    if (sourceNode) GexfJS.params.activeNodes[sourceNode.id] = true;
                                    if (targetNode) GexfJS.params.activeNodes[targetNode.id] = true;
                                }
                            }
                        }
                    }
                } else if (type === 'cnv') {
                    var attrId = GexfJS._node_attr_value['cnv_cluster_id'];
                    if (typeof attrId !== 'undefined') {
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[attrId] != null && node.attributes[attrId] !== "" && node.attributes[attrId] !== "0") {
                                GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                                GexfJS.params.activeNodes[node.id] = true; 
                            }
                        });
                    }
                }
                else if (type === 'block') {
                    // IMPORTANT: Change 'block_name' to whatever the actual Node attribute is called in your GEXF!
                    var attrId = GexfJS._node_attr_value['block'] || GexfJS._node_attr_value['block_id']; 
                    
                    if (typeof attrId !== 'undefined' && targetValue) {
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[attrId] === targetValue) {
                                // Pin the matching nodes to a color (e.g., Magenta, or pick a new hex code like '#00aaff' for cyan)
                                GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                                // Add to activeNodes so the rest of the graph fades out
                                GexfJS.params.activeNodes[node.id] = true; 
                            }
                        });
                    }
                }
                
                // Re-evaluate path_active based on whether edges were actually found
                GexfJS.params.path_active = !jQuery.isEmptyObject(GexfJS.params.activeEdges);
                
                delete GexfJS.oldParams.zoomLevel; // Force redraw
            });

            var originalDisplayNode = window.displayNode;

            // --- BRIDGE: Intercept Node Clicks ---
            window.displayNode = lang.hitch(this, function(nodeIndex) {
                if (originalDisplayNode) originalDisplayNode(nodeIndex);

                // Check for Deselect (Clicking the background passes -1 or undefined)
                if (nodeIndex === -1 || typeof nodeIndex === 'undefined') {
                    this.showDefaultSummary();
                    return;
                }

                var node = GexfJS.graph.nodeList[nodeIndex];
                if (!node) return;
                
                GexfJS.params.currentHighlightName = "Node: " + (node.label || node.id);

                var featureAttrIndex = null;
                if (GexfJS._node_attr_value && GexfJS._node_attr_value["features"]) {
                    featureAttrIndex = GexfJS._node_attr_value["features"];
                }

                // 1. Extract the raw Feature Mapping (JSON) to preserve hierarchy
                var featureMap = null;
                var targetIds = [];

                if (featureAttrIndex !== null && node.attributes[featureAttrIndex]) {
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

            // --- NEW: Global Pin Color Function ---
            window.pinColor = lang.hitch(this, function(ids, type, colorValue) {
                if (!window.GexfJS || !GexfJS.params.pinnedElements) return;

                // ids can be a single string or a comma-separated string
                var idList = ids.split(',');

                // 1. Convert HEX color to RGBA string (gexfjs usually prefers rgba)
                // Note: Input type="color" returns Hex (e.g. #ff0000). 
                // We can use it directly if gexfjs accepts hex, which canvas usually does.
                // If opacity issues arise, we might need to convert. 
                // For now, let's use the Hex string directly.
                var finalColor = colorValue;

                idList.forEach(function(targetId) {
                    if (type === 'node') {
                        // Easy: TargetId is the Node ID (e.g. "4748")
                        // Wait, our inputs usually use Labels or Feature IDs. 
                        // We need to look up the internal Node ID.
                        
                        // If targetId is the internal int index:
                        if (GexfJS.graph.nodeList[targetId]) {
                            GexfJS.params.pinnedElements['n_' + targetId] = finalColor;
                        } 
                        // If targetId is a label/feature ID:
                        else if (GexfJS.graph.nodeIndexByLabel && GexfJS.graph.nodeIndexByLabel[targetId] !== undefined) {
                             var idx = GexfJS.graph.nodeIndexByLabel[targetId];
                             GexfJS.params.pinnedElements[idx] = finalColor;
                        }
                    } 
                    else if (type === 'path') {
                        // Harder: TargetId is a Genome/Sequence ID (e.g. "NC_007624")
                        // We need to find all edges associated with this path.
                        
                        // We reuse the logic from displayPath to find the edges
                        var attr_id = GexfJS._edge_attr_value['sequences']; // or 'genomes'
                        if (GexfJS.path_highlights && GexfJS.path_highlights[attr_id]) {
                            
                            // Look up the edges for this path ID
                            // (Remember our quote cleaning logic!)
                            var cleanId = targetId.replace(/"/g, '');
                            var edges = GexfJS.path_highlights[attr_id][cleanId];
                            
                            // If direct lookup fails, try searching cleaned keys (from our previous fix)
                            if (!edges) {
                                for (var key in GexfJS.path_highlights[attr_id]) {
                                    if (key.replace(/"/g, '') === cleanId) {
                                        edges = GexfJS.path_highlights[attr_id][key];
                                        break;
                                    }
                                }
                            }

                            if (edges) {
                                Object.keys(edges).forEach(function(edgeId) {
                                    GexfJS.params.pinnedElements['e_' + edgeId] = finalColor;
                                });
                            }
                        }
                    }
                });
            });
            // --------------------------------------

            // (configuration logic...)
            var graph_params = {
                showEdges : true,
                zoomLevel : 0,
                edgeWidthFactor : 10,
                pathAttr : "sequences",
                colorNodeAttr : "diversity",
                nodeSizeFactor : 2,
                patric_on: true,
                genome_url: 'https://www.bv-brc.org/api/genome?in(genome_id,(GIDSTRING))&select(genome_id,genome_name)&limit(500)&http_accept=application/solr+json',
                location_url: 'https://www.bv-brc.org/api/genome_sequence?in(sequence_id,(SIDSTRING))&select(sequence_id,description)&facet((pivot,(genome_id,genome_name,sequence_id)))&http_accept=application/solr+json',
                replicon_url: 'https://www.bv-brc.org/api/genome_sequence?in(genome_id,(GIDSTRING))&select(sequence_id,description)&facet((pivot,(genome_id,genome_name,sequence_id)))&http_accept=application/solr+json',
                language: false,
                textDisplayThreshold: 12, // Leave this at its normal default
                showNodeLabels: true,    // NEW: Our dedicated toggle
                labelSizeFactor: 1.0    // NEW: Our size multiplier
            };
            setParams(graph_params);

            var originalSetInterval = window.setInterval;
            window.setInterval = function() { return 999; }; 

            var gexf_dom = (new window.DOMParser()).parseFromString(gexfXMLData, "text/xml");
            
            // Initialize persistent pin storage
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            GexfJS.params.currentHighlightName = "Selection";

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
                if (window.GexfJS) GexfJS.params.currentHighlightName = name || pstr;
                if (window.displayPath) window.displayPath(eid, pstr, pattr);
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

                        // Find all nodes belonging to this block
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[blockAttrId] === blockName) {
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

        applyColorToGraph: function(color) {
            if (!window.GexfJS || !GexfJS.params) return;
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            
            var name = GexfJS.params.currentHighlightName || "Custom Selection";
            var elementsToPin = {};
            var applied = false;

            // 1. Check for Active Edges (from displayPath links)
            if (GexfJS.params.path_active && GexfJS.params.activeEdges) {
                Object.keys(GexfJS.params.activeEdges).forEach(function(edgeId) {
                    elementsToPin['e_' + edgeId] = true;
                    applied = true;
                });
            } 
            // 2. Check for Active Nodes (from Special Highlights like CNV)
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
                // Save to persistent user pins, overwriting if the name already exists
                GexfJS.params.userPins[name] = { color: color, elements: elementsToPin };
                this.rebuildPinnedElements();
                
                // Refresh the summary panel to instantly show the new pin!
                if (this.itemDetailPanel.customDisplayNode && this.itemDetailPanel.customDisplayNode.innerHTML.indexOf("Graph Summary") !== -1) {
                    this.showDefaultSummary();
                }
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

            if (isFeature) {
                this.containerType = "feature_data";
                url = PathJoin(window.App.dataAPI, "genome_feature");
                // Get enough fields to display useful info
                query = "in(patric_id,(" + cleanIds.map(encodeURIComponent).join(",") + "))&select(patric_id,genome_name,product)&limit(25000)"; 
            } else {
                this.containerType = "genome_data";
                url = PathJoin(window.App.dataAPI, "genome");
                query = "in(genome_id,(" + cleanIds.map(encodeURIComponent).join(",") + "))&select(genome_id,genome_name)&limit(25000)";
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
                    this.updateSelection(records, featureMap, node);
                }
            }));
        },

        updateSelection: function(records, featureMap, node) {
            this.selection = records;
            
            // 1. Update ActionBar
            this.selectionActionBar.set("currentContainerType", this.containerType);
            this.selectionActionBar.set("selection", this.selection);
            this.itemDetailPanel.set("selection", this.selection);

            // --- Helper for Color Input ---
            var colorInput = function(ids, type) {
                // Returns an HTML5 color picker that triggers window.pinColor on change
                return '<input type="color" style="width:20px; height:20px; vertical-align:middle; border:none; padding:0; background:none; cursor:pointer;" onchange="window.pinColor(\'' + ids + '\', \'' + type + '\', this.value)"> ';
            };

            // 2. Prepare Data for HTML Construction
            
            // A. Helper to get attribute names from IDs
            var nodeAttrIdToName = {};
            if (window.GexfJS && GexfJS._node_attr_value) {
                Object.keys(GexfJS._node_attr_value).forEach(function(name){
                    nodeAttrIdToName[GexfJS._node_attr_value[name]] = name;
                });
            }

            // Lookup Edge Attribute IDs for displayPath
            var genomeAttrId = 'genomes';
            var sequenceAttrId = 'sequences';
            
            if (window.GexfJS && GexfJS._edge_attr_value) {
                if (GexfJS._edge_attr_value['genomes']) {
                    genomeAttrId = GexfJS._edge_attr_value['genomes'];
                }
                if (GexfJS._edge_attr_value['sequences']) {
                    sequenceAttrId = GexfJS._edge_attr_value['sequences'];
                }
            }

            // B. Build Attributes HTML
            var attrHtml = '<div style="margin-bottom:10px; font-size:0.9em; color:#555;">';
            attrHtml += '<div><b>Node ID:</b> ' + node.id + '</div>';
            
            if (node.attributes) {
                Object.keys(node.attributes).forEach(function(attrId){
                    var name = nodeAttrIdToName[attrId];
                    if (name && name !== 'features') {
                        attrHtml += '<div><b>' + name + ':</b> ' + node.attributes[attrId] + '</div>';
                    }
                });
            }
            attrHtml += '</div>';

            // C. Build Graph Links
            var linksHtml = '';
            var recordMap = {};
            records.forEach(function(rec) { 
                var key = rec.patric_id || rec.genome_id;
                recordMap[key] = rec; 
            });

            if (featureMap) {
                var allGenomes = Object.keys(featureMap);
                var allSequences = [];
                
                // Build Hierarchy HTML
                var hierarchyHtml = '<div class="graph-links" style="font-size:0.9em;">';
                
                Object.keys(featureMap).forEach(function(genomeId) {
                    //if genomeId is "info" skip it
                    if (genomeId === "info") return;
                    var contigs = featureMap[genomeId];
                    var genomeSequences = Object.keys(contigs);
                    allSequences = allSequences.concat(genomeSequences);
                    
                    // --- RESTORED LOGIC: Calculate genomeName ---
                    var genomeName = genomeId; 
                    var features = [];
                    // Flatten features to find a record to get the name from
                    Object.keys(contigs).forEach(function(k){ features = features.concat(contigs[k]); });
                    
                    if(features.length > 0 && recordMap[features[0]] && recordMap[features[0]].genome_name){
                        genomeName = recordMap[features[0]].genome_name;
                    }
                    // ---------------------------------------------

                    hierarchyHtml += '<div style="margin-top:5px;">';
                    // COLOR PICKER: Genome (Edge Group)
                    //hierarchyHtml += colorInput(genomeId, 'path');
                    hierarchyHtml += '<a href="javascript:void(0)" style="font-weight:bold;" onclick="window.doHighlightPath(undefined, \'' + genomeId + '\', \'' + genomeAttrId + '\', \'Genome: ' + genomeName + '\'); return false;">' + genomeName + '</a>:';
                    hierarchyHtml += '<div style="padding-left:20px;">';

                    Object.keys(contigs).forEach(function(contigId) {
                        hierarchyHtml += '<div>';
                        // COLOR PICKER: Sequence (Edge Group)
                        //hierarchyHtml += colorInput(contigId, 'path');
                        hierarchyHtml += '<a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + contigId + '\', \'' + sequenceAttrId + '\', \'Contig: ' + contigId + '\'); return false;">' + contigId + '</a>:';
                        hierarchyHtml += '</div>';
                        
                        var feats = contigs[contigId];
                        hierarchyHtml += '<div style="padding-left:10px; color:#666;">[' + feats.join(', ') + ']</div>';
                    });
                    hierarchyHtml += '</div></div>';
                });
                hierarchyHtml += '</div>';

                // Summary Header
                var summaryHtml = '<div style="margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #ccc;">';
                
                // COLOR PICKER: All Genomes
                //summaryHtml += '<div>' + colorInput(allGenomes.join(','), 'path');
                summaryHtml += '<b><a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allGenomes.join(',') + '\', \'' + genomeAttrId + '\', \'Genomes: ' + allGenomes.join(', ') + '\'); return false;">Genomes[' + allGenomes.length + ']</a></b></div>';
                
                // COLOR PICKER: All Sequences
                //summaryHtml += '<div>' + colorInput(allSequences.join(','), 'path');
                summaryHtml += '<b><a href="javascript:void(0)" onclick="window.doHighlightPath(undefined, \'' + allSequences.join(',') + '\', \'' + sequenceAttrId + '\', \'Sequences: ' + allSequences.join(', ') + '\'); return false;">Sequences[' + allSequences.length + ']</a></b></div>';
                
                summaryHtml += '</div>';

                linksHtml = summaryHtml + hierarchyHtml;
            }

            // 3. Assemble Content
            var content = '<div style="padding:10px;">';
            // COLOR PICKER: Title (Node)
            content += '<div style="margin-bottom:5px;">' + colorInput(node.id, 'node') + '<h3 style="margin:0; display:inline; word-wrap:break-word;">' + node.label + '</h3></div>';
            content += attrHtml;
            content += linksHtml;
            content += '</div>';

            // 4. Update IDP
            if (this.itemDetailPanel.customDisplayNode) {
                // Clear any previous selection logic to prevent conflicts
                //this.itemDetailPanel.set('selection', []); 
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