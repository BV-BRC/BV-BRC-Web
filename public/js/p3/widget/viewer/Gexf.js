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
            html += '<div style="margin-bottom:5px;"><b>2. Repeats &amp; Paralog Expansion:</b><br>&bull; <i>Local / Tandem CNVs:</i> Co-localized tandem gene duplications and local paralogous copy-number expansions.<br>&bull; <i>Dispersed Repeats / MGEs (Fragmented CNV):</i> Mobile genetic elements (IS elements, transposases) or multi-locus paralogs split across separate genomic regions or contigs.</div>';
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
                    tsvReport: '*_cnv_metrics.tsv'
                },
                'fragmented_paralogs': {
                    label: 'Dispersed Repeats / MGEs',
                    graphTerm: 'Fragmented CNV',
                    subtitle: 'IS elements, transposases & paralogs split across loci or contigs',
                    count: countFragmented,
                    nodesDesc: 'Dispersed multi-locus paralogous families (conflict class 3)',
                    edgesDesc: 'Repeat fragmentation junctions connecting dispersed copies',
                    tsvReport: '*_cnv_metrics.tsv'
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
                    tsvReport: '*_inverted_blocks.tsv'
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
                        ? 'display:flex; align-items:center; justify-content:space-between; padding:5px 6px; margin-bottom:4px; background:#fdf0ff; border:1px solid #d580ff; border-radius:5px;'
                        : 'display:flex; align-items:center; justify-content:space-between; padding:4px 6px; margin-bottom:3px; border-bottom:1px solid #f0f0f0;';
                    var pillStyle = isActive
                        ? 'display:inline-block; min-width:28px; text-align:center; padding:2px 10px; background-color:#9c27b0; border:1px solid #7b1fa2; border-radius:12px; color:#fff; font-weight:bold; text-decoration:none; cursor:pointer; flex-shrink:0; margin-left:8px;'
                        : 'display:inline-block; min-width:28px; text-align:center; padding:2px 10px; background-color:#eef5fa; border:1px solid #bce8f1; border-radius:12px; color:#31708f; font-weight:bold; text-decoration:none; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor:pointer; flex-shrink:0; margin-left:8px;';

                    html += '<div style="' + rowStyle + '">';
                    html += '<div style="padding-right:4px;">';
                    html += '<div style="font-size:0.92em;"><b>' + item.label + '</b> <span style="font-size:0.85em; color:#666;">(' + item.graphTerm + ')</span></div>';
                    html += '<div style="font-size:0.78em; color:#666; line-height:1.25;">' + item.subtitle + '</div>';
                    html += '</div>';
                    html += '<a href="javascript:void(0)" style="' + pillStyle + '" onclick="window.highlightSpecial(\'' + key + '\'); return false;" title="' + (isActive ? 'Click to clear highlight' : 'Highlight ' + item.label + ' in graph') + '">' + item.count + '</a>';
                    html += '</div>';
                });
            });
            html += '</div>';

            // Active Phenomenon "What You're Seeing" Callout Banner
            if (activePhenom && phenomenaMeta[activePhenom]) {
                var activeMeta = phenomenaMeta[activePhenom];
                html += '<div style="margin-bottom:14px; padding:8px; background:#fcf4ff; border:1px solid #d580ff; border-radius:5px; font-size:0.83em; line-height:1.35; color:#333;">';
                html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">';
                html += '<b style="color:#6a1b9a;"><i class="fa icon-eye"></i> Viewing: ' + activeMeta.label + '</b>';
                html += '<a href="javascript:void(0)" onclick="window.displayNode(-1); return false;" style="color:#a94442; font-weight:bold; text-decoration:none; font-size:0.9em;" title="Clear active phenomenon highlight">Clear &#10006;</a>';
                html += '</div>';
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
                
                // Deep clear of ALL highlight states
                GexfJS.params.activeEdges = {};
                GexfJS.params.path_active = false;
                GexfJS.params.pinnedElements = {};
                GexfJS.params.activeNode = -1; 
                GexfJS.params.currentNode = -1;
                GexfJS.params.activeNodes = {}; // Clean slate!
                
                var hlColor = GexfJS.params.highlightColorOverride || '#ff00ff';
                this.rebuildPinnedElements();

                // --- HELPER: Safely lookup and activate edges by Attribute Name & Value ---
                var addEdgesByAttr = function(attrName, attrValue) {
                    var attrId = GexfJS._edge_attr_value[attrName];
                    if (typeof attrId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[attrId]) {
                        var edges = GexfJS.path_highlights[attrId][attrValue]; 
                        if (edges) {
                            for (var edgeId in edges) {
                                GexfJS.params.activeEdges[edgeId] = true;
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
                    addEdgesByAttr('is_superbubble', 'true');
                    GexfJS.graph.nodeList.forEach(function(node) {
                        if (checkNodeBool(node, 'is_superbubble')) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true;
                        }
                    });

                // --- 2. TANDEM REPEATS & SHIFTS ---
                } else if (type === 'tandem_repeats') {
                    addEdgesByAttr('repeat_ambiguity_detour', 'true'); // New Boolean
                    addEdgesByAttr('sv_class', 'repeat_ambiguity_detour'); // Old fallback
                    
                    var cnvId = GexfJS._node_attr_value['cnv_cluster_id'];
                    var conflictId = GexfJS._node_attr_value['conflict'];

                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'repeat_ambiguity')) isSpecial = true;
                        
                        // Fallback for old graphs using cnv_cluster_id
                        if (node.attributes && typeof cnvId !== 'undefined' && node.attributes[cnvId] != null && String(node.attributes[cnvId]) !== "" && String(node.attributes[cnvId]) !== "0") {
                            if (typeof conflictId === 'undefined' || String(node.attributes[conflictId]) !== "3") isSpecial = true;
                        }
                        
                        if (isSpecial) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true; 
                        }
                    });

                // --- 3. FRAGMENTED SYNTENY (PARALOGS) ---
                } else if (type === 'fragmented_paralogs') {
                    addEdgesByAttr('repeat_fragmentation_junction', 'true');
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'repeat_ambiguity_fragmentation')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "3") isSpecial = true;
                        
                        if (isSpecial) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true; 
                        }
                    });

                // --- 4. ALTERNATIVE PATHS ---
                } else if (type === 'alt_paths') {
                    addEdgesByAttr('alt_path_junction', 'true');
                    addEdgesByAttr('alternative_path', 'true'); // Edge check based on XML
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'alternative_path')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "4") isSpecial = true;
                        
                        if (isSpecial) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true; 
                        }
                    });

                // --- 5. STRUCTURAL REARRANGEMENTS ---
                } else if (type === 'rearrangements') {
                    addEdgesByAttr('breakpoint_junction', 'true');
                    addEdgesByAttr('genomic_rearrangement', 'true');
                    addEdgesByAttr('intra_contig_rearrangement', 'true');
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'synteny_breakpoint')) isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "1") isSpecial = true;
                        
                        if (isSpecial) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true; 
                        }
                    });

                // --- 6. INVERTED BLOCKS ---
                } else if (type === 'inversions') {
                    addEdgesByAttr('inverted_block', 'true'); 

                // --- 7. ASSEMBLY BREAKS & SCAFFOLDS ---
                } else if (type === 'breaks') {
                    addEdgesByAttr('is_scaffold_path', 'true'); // New
                    addEdgesByAttr('sv_class', 'potential_scaffold'); // Old
                    
                    var conflictId = GexfJS._node_attr_value['conflict'];
                    var bridgeId = GexfJS._node_attr_value['is_scaffold_bridge']; // Old
                    
                    GexfJS.graph.nodeList.forEach(function(node) {
                        var isSpecial = false;
                        if (checkNodeBool(node, 'assembly_repeat_break')) isSpecial = true;
                        if (checkNodeBool(node, 'is_scaffold_path')) isSpecial = true;
                        if (node.attributes && typeof bridgeId !== 'undefined' && String(node.attributes[bridgeId]).toLowerCase() === 'true') isSpecial = true;
                        if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "2") isSpecial = true;
                        
                        if (isSpecial) {
                            GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                            GexfJS.params.activeNodes[node.id] = true; 
                        }
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
                }
                
                GexfJS.params.path_active = !jQuery.isEmptyObject(GexfJS.params.activeEdges);
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

            var originalDisplayNode = window.displayNode;
            
            window.displayNode = lang.hitch(this, function(nodeIndex) {
                if (originalDisplayNode) originalDisplayNode(nodeIndex);

                // --- START FIX 1: Check for Deselect & Clean Up ---
                if (nodeIndex === -1 || typeof nodeIndex === 'undefined') {
                    if (window.GexfJS && GexfJS.params) {
                        // Ensure all temporary highlight arrays are wiped
                        GexfJS.params.activeEdges = {};
                        GexfJS.params.activeNodes = {};
                        GexfJS.params.path_active = false;
                        GexfJS.params.activePhenomenon = null;
                        
                        // CRITICAL: Wipe temporary pins and restore only persistent user pins
                        this.rebuildPinnedElements(); 
                    }
                    this.showDefaultSummary();
                    return;
                }

                var node = GexfJS.graph.nodeList[nodeIndex];
                if (!node) return;
                
                GexfJS.params.activePhenomenon = null;
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
                GexfJS.params.pinsMuted = false; 

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

            var attrHtml = '<div style="margin-bottom:10px; font-size:0.9em; color:#555;">';
            if (badges.length > 0) {
                attrHtml += '<div style="margin-bottom:6px;">' + badges.join('') + '</div>';
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
                html += '<ul style="margin-top:10px; padding-left:20px; list-style-type: square;">';
                (records || []).forEach(function(rec) {
                    var id = rec.genome_id || rec.patric_id;
                    var name = rec.genome_name || id;
                    // For pure genome nodes, pointing to the genome page
                    html += '<li><a href="/view/Genome/' + encodeURIComponent(id) + '" target="_blank" title="Open Genome Page in New Tab">' + name + '</a></li>';
                });
                html += '</ul>';
            }

            var titleSpinner = isLoading ? ' <i class="fa fa-spinner fa-spin" style="font-size:0.6em; color:#999;" title="Fetching extended annotations..."></i>' : '';

            var content = '<div style="padding:10px;">';
            // Inline color boxes removed from the title header as well
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
