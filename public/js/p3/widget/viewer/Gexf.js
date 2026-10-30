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

        if (scriptsReady) { callback(); return; }
        pendingCallbacks.push(callback);
        if (pendingCallbacks.length > 1) { return; }

        // --- NEW: Snapshot the original, site-wide jQuery before legacy scripts overwrite it ---
        if (typeof originalJQuery === 'undefined') {
            originalJQuery = window.jQuery;
            original$ = window.$;
        }
        
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
            <div class="GEXFView" style="width: 100%; height: 100%; overflow: hidden;">
                <style>
                    /* Default graph background to clean white instead of legacy grey gradient */
                    .GEXFView,
                    .GEXFView .gradient {
                        background-color: #ffffff !important;
                        background-image: none !important;
                    }

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

                    /* Ensure vertical zoom slider track, fill range, and handle always render cleanly */
                    #zoomSlider {
                        position: relative !important;
                        width: 10px !important;
                        height: 120px !important;
                        margin: 0 auto !important;
                        background: #ffffff !important;
                        border: 1px solid #aaa !important;
                        border-radius: 4px !important;
                    }

                    #zoomSlider .ui-slider-range {
                        position: absolute !important;
                        z-index: 1 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        width: 100% !important;
                        display: block !important;
                        border: 0 !important;
                        background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%) !important;
                        border-bottom-left-radius: 3px !important;
                        border-bottom-right-radius: 3px !important;
                    }

                    #zoomSlider .ui-slider-handle {
                        position: absolute !important;
                        z-index: 2 !important;
                        width: 16px !important;
                        height: 16px !important;
                        left: -4px !important;
                        margin-left: 0 !important;
                        margin-bottom: -8px !important;
                        background: #f8fafc !important;
                        border: 1px solid #94a3b8 !important;
                        border-radius: 4px !important;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
                        cursor: pointer !important;
                        outline: none !important;
                    }

                    #zoomSlider .ui-slider-handle:hover,
                    #zoomSlider .ui-slider-handle:focus {
                        background: #fef3c7 !important;
                        border-color: #f59e0b !important;
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
                        top: 14px !important;
                        left: 225px !important;
                        right: auto !important;
                        bottom: auto !important;
                        display: flex !important;
                        align-items: center !important;
                        gap: 4px !important;
                        background: rgba(255, 255, 255, 0.96) !important;
                        padding: 4px 6px 4px 12px !important;
                        border: 1px solid #cbd5e1 !important;
                        border-radius: 20px !important;
                        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12) !important;
                        pointer-events: auto !important;
                        z-index: 2001 !important;
                        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;
                    }

                    #recherche:focus-within {
                        border-color: #7b1fa2 !important;
                        box-shadow: 0 3px 12px rgba(123, 31, 162, 0.22) !important;
                    }

                    #searchinput {
                        position: static !important;
                        float: none !important;
                        top: auto !important; left: auto !important;
                        display: inline-block !important;
                        vertical-align: middle !important;
                        width: 310px !important;
                        height: 24px !important;
                        line-height: 24px !important;
                        font-size: 13px !important;
                        color: #1e293b !important;
                        background: transparent !important;
                        border: none !important;
                        outline: none !important;
                        padding: 0 4px !important;
                        margin: 0 !important;
                        pointer-events: auto !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }

                    #searchinput::placeholder {
                        color: #94a3b8 !important;
                        font-style: normal !important;
                    }

                    #searchclear {
                        position: static !important;
                        display: none;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 20px !important;
                        height: 20px !important;
                        border: none !important;
                        border-radius: 50% !important;
                        background: #e2e8f0 !important;
                        color: #475569 !important;
                        font-size: 14px !important;
                        line-height: 1 !important;
                        padding: 0 !important;
                        margin: 0 2px !important;
                        cursor: pointer !important;
                        pointer-events: auto !important;
                    }

                    #searchclear:hover {
                        background: #cbd5e1 !important;
                        color: #0f172a !important;
                    }

                    #searchsubmit {
                        position: static !important;
                        float: none !important;
                        top: auto !important; left: auto !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: auto !important;
                        height: 24px !important;
                        padding: 0 11px !important;
                        margin: 0 !important;
                        border: none !important;
                        border-radius: 14px !important;
                        background: #6a1b9a !important;
                        color: #ffffff !important;
                        font-size: 12px !important;
                        font-weight: 600 !important;
                        text-indent: 0 !important;
                        cursor: pointer !important;
                        pointer-events: auto !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        transition: background 0.15s ease !important;
                    }

                    #searchsubmit:hover {
                        background: #4a148c !important;
                    }

                    /* Autocomplete Dropdown Styling */
                    #autocomplete {
                        position: absolute !important;
                        top: 52px !important;
                        left: 225px !important;
                        width: 430px !important;
                        max-height: 360px !important;
                        overflow-y: auto !important;
                        display: none;
                        background: #ffffff !important;
                        border: 1px solid #cbd5e1 !important;
                        border-radius: 10px !important;
                        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18) !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        z-index: 2002 !important;
                        pointer-events: auto !important;
                        list-style: none !important;
                    }

                    #autocomplete .ac-container {
                        float: none !important;
                        width: 100% !important;
                        border: none !important;
                        background: transparent !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #autocomplete .ac-header {
                        position: sticky !important;
                        top: 0 !important;
                        z-index: 2 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        padding: 6px 12px !important;
                        background: #f8fafc !important;
                        border-bottom: 1px solid #e2e8f0 !important;
                        font-size: 11.5px !important;
                        color: #475569 !important;
                        float: none !important;
                    }

                    #autocomplete .ac-select-all {
                        display: inline-block !important;
                        padding: 2px 8px !important;
                        background: #f3e5f5 !important;
                        border: 1px solid #ce93d8 !important;
                        border-radius: 10px !important;
                        color: #6a1b9a !important;
                        font-weight: 600 !important;
                        font-size: 11px !important;
                        text-decoration: none !important;
                    }

                    #autocomplete .ac-select-all:hover {
                        background: #6a1b9a !important;
                        color: #ffffff !important;
                        border-color: #6a1b9a !important;
                    }

                    #autocomplete ul.ac-list {
                        float: none !important;
                        width: 100% !important;
                        list-style: none !important;
                        margin: 0 !important;
                        padding: 4px 0 !important;
                    }

                    #autocomplete li.ac-item {
                        float: none !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border-bottom: 1px solid #f1f5f9 !important;
                    }

                    #autocomplete li.ac-item:last-child {
                        border-bottom: none !important;
                    }

                    #autocomplete li.ac-item a {
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        box-sizing: border-box !important;
                        padding: 6px 12px !important;
                        background: #ffffff !important;
                        color: #1e293b !important;
                        text-decoration: none !important;
                        font-weight: normal !important;
                    }

                    #autocomplete li.ac-item.hover a,
                    #autocomplete li.ac-item a:hover {
                        background: #f3e5f5 !important;
                        color: #38006b !important;
                    }

                    #autocomplete .ac-row-top {
                        display: flex !important;
                        align-items: center !important;
                        gap: 8px !important;
                        float: none !important;
                        border: none !important;
                        background: transparent !important;
                    }

                    #autocomplete .ac-color-dot {
                        display: inline-block !important;
                        width: 10px !important;
                        height: 10px !important;
                        border-radius: 50% !important;
                        border: 1px solid rgba(0,0,0,0.25) !important;
                        flex-shrink: 0 !important;
                        float: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #autocomplete .ac-title {
                        font-size: 12.5px !important;
                        font-weight: 500 !important;
                        color: inherit !important;
                        line-height: 1.3 !important;
                        word-break: break-word !important;
                        float: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #autocomplete .ac-match {
                        color: #6a1b9a !important;
                        font-weight: 700 !important;
                        background: rgba(213, 0, 249, 0.10) !important;
                        padding: 0 1px !important;
                        border-radius: 2px !important;
                    }

                    #autocomplete .ac-row-sub {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        align-items: center !important;
                        gap: 5px !important;
                        margin-top: 3px !important;
                        padding-left: 18px !important;
                        float: none !important;
                        border: none !important;
                        background: transparent !important;
                    }

                    #autocomplete .ac-badge {
                        display: inline-block !important;
                        font-size: 10.5px !important;
                        line-height: 1.2 !important;
                        padding: 1px 6px !important;
                        border-radius: 4px !important;
                        float: none !important;
                        margin: 0 !important;
                    }

                    #autocomplete .ac-badge-id {
                        background: #f1f5f9 !important;
                        color: #475569 !important;
                        border: 1px solid #cbd5e1 !important;
                    }

                    #autocomplete .ac-badge-fam {
                        background: #e0f2fe !important;
                        color: #0369a1 !important;
                        border: 1px solid #bae6fd !important;
                    }

                    #autocomplete .ac-badge-block {
                        background: #fef3c7 !important;
                        color: #92400e !important;
                        border: 1px solid #fde68a !important;
                    }

                    #autocomplete .ac-badge-gen {
                        background: #dcfce7 !important;
                        color: #166534 !important;
                        border: 1px solid #bbf7d0 !important;
                    }

                    #autocomplete .ac-badge-feat {
                        background: #fae8ff !important;
                        color: #86198f !important;
                        border: 1px solid #f5d0fe !important;
                    }

                    #autocomplete .ac-badge-filtered {
                        background: #fee2e2 !important;
                        color: #991b1b !important;
                        border: 1px solid #fecaca !important;
                    }

                    #autocomplete .ac-empty {
                        padding: 12px 14px !important;
                        font-size: 12.5px !important;
                        color: #64748b !important;
                        text-align: center !important;
                        float: none !important;
                        border: none !important;
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
                <div id="titlebar">
                    <div id="maintitle"></div>
                    <form id="recherche">
                        <i class="fa icon-search" style="color:#64748b; font-size:13px; margin-right:2px; pointer-events:none;"></i>
                        <input id="searchinput" autocomplete="off" placeholder="Search gene, product, family (PGF), or feature ID..." />
                        <button id="searchclear" type="button" title="Clear search">&times;</button>
                        <button id="searchsubmit" type="submit" title="Center and inspect matching node (Enter)">Find</button>
                    </form>
                </div>
                <div id="autocomplete"></div>
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
                    if (window.GexfJS && GexfJS.params && this.colorMenuDiv) {
                        var nameInput = this.colorMenuDiv.querySelector("#gexfPinNameInput");
                        if (nameInput) {
                            nameInput.value = GexfJS.params.currentHighlightName || "Custom Selection";
                        }
                    }
                },
                true
            ],
            [
                "VisualSettings",
                "fa icon-eye fa-2x",
                {
                    label: "VISUALS",
                    persistent: true,
                    validTypes: ["*"],
                    validContainerTypes: ["*"],
                    tooltip: "Adjust Graph Visuals (Background, Highlight, Edge Color & Weight, Label Color)",
                    ignoreDataType: true
                },
                function (selection) {
                    popup.open({
                        popup: this.visualsMenu,
                        around: this.selectionActionBar._actions.VisualSettings.button,
                        orient: ["above", "below"]
                    });
                    if (this.visualsMenuDiv) {
                        var bgPicker = this.visualsMenuDiv.querySelector('#gexfBgColorPicker');
                        if (bgPicker) bgPicker.value = this.customBgColor || '#ffffff';

                        var hlVal = (window.GexfJS && GexfJS.params && GexfJS.params.highlightColorOverride) || this.customHlColor || '#d500f9';
                        var hlPicker = this.visualsMenuDiv.querySelector('#gexfHlColorPicker');
                        if (hlPicker) hlPicker.value = hlVal;

                        var edgeVal = (window.GexfJS && GexfJS.params && GexfJS.params.edgeColorOverride) || this.customEdgeColor || '#6e7681';
                        var edgePicker = this.visualsMenuDiv.querySelector('#gexfEdgeColorPicker');
                        if (edgePicker) edgePicker.value = edgeVal;

                        var ewVal = (window.GexfJS && GexfJS.params && typeof GexfJS.params.defaultEdgeWidth === 'number' && !isNaN(GexfJS.params.defaultEdgeWidth))
                            ? GexfJS.params.defaultEdgeWidth
                            : (this.customEdgeWidth || 1.0);
                        var ewSlider = this.visualsMenuDiv.querySelector('#gexfEdgeWeightSlider');
                        if (ewSlider) ewSlider.value = ewVal;
                        var ewInput = this.visualsMenuDiv.querySelector('#gexfEdgeWeightInput');
                        if (ewInput) ewInput.value = ewVal;

                        var lblVal = (window.GexfJS && GexfJS.params && GexfJS.params.labelColorOverride) || this.customLblColor || '#000000';
                        var lblPicker = this.visualsMenuDiv.querySelector('#gexfLblColorPicker');
                        if (lblPicker) lblPicker.value = lblVal;
                    }
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
                "ViewFeatureItem",
                "MultiButton fa icon-selection-Feature fa-2x",
                {
                    label: "FEATURE",
                    validTypes: ["*"],
                    multiple: false,
                    tooltip: "Switch to Feature View. Press and Hold for more options.",
                    validContainerTypes: ["feature_data"],
                    pressAndHold: function(selection, button, opts, evt){
                        var sel = selection && selection[0];
                        var featureId = sel && (sel.feature_id || sel.patric_id);
                        if (!featureId) return;
                        popup.open({
                            popup: new PerspectiveToolTipDialog({
                                perspective: "Feature",
                                perspectiveUrl: "/view/Feature/" + featureId
                            }),
                            around: button,
                            orient: ["below"]
                        });
                    }
                },
                function(selection){
                    var sel = selection && selection[0];
                    var featureId = sel && (sel.feature_id || sel.patric_id);
                    if (!featureId) return;
                    Topic.publish("/navigate", { href: "/view/Feature/" + featureId + "#view_tab=overview", target: "blank" });
                },
                false
            ],
            [
                "ViewFeatureItems",
                "MultiButton fa icon-selection-FeatureList fa-2x",
                {
                    label: "FEATURES",
                    validTypes: ["*"],
                    multiple: true,
                    min: 2,
                    max: 10000,
                    ignoreDataType: true,
                    tooltip: "Switch to Feature List View. Press and Hold for more options.",
                    validContainerTypes: ["feature_data"],
                    pressAndHold: function(selection, button, opts, evt){
                        var realFeatureIds = [];
                        var patricIds = [];
                        (selection || []).forEach(function(x){
                            if (!x) return;
                            if (x.feature_id && String(x.feature_id).indexOf("fig|") !== 0) {
                                realFeatureIds.push(x.feature_id);
                            } else if (x.patric_id || x.feature_id) {
                                patricIds.push(encodeURIComponent(x.patric_id || x.feature_id));
                            }
                        });
                        var queryPart = "";
                        if (realFeatureIds.length > 0 && patricIds.length === 0) {
                            queryPart = "in(feature_id,(" + realFeatureIds.join(",") + "))";
                        } else if (patricIds.length > 0 && realFeatureIds.length === 0) {
                            queryPart = "in(patric_id,(" + patricIds.join(",") + "))";
                        } else if (realFeatureIds.length > 0 && patricIds.length > 0) {
                            queryPart = "or(in(feature_id,(" + realFeatureIds.join(",") + ")),in(patric_id,(" + patricIds.join(",") + ")))";
                        }
                        if (!queryPart) return;
                        popup.open({
                            popup: new PerspectiveToolTipDialog({
                                perspective: "FeatureList",
                                perspectiveUrl: "/view/FeatureList/?" + queryPart
                            }),
                            around: button,
                            orient: ["below"]
                        });
                    }
                },
                function(selection){
                    var realFeatureIds = [];
                    var patricIds = [];
                    (selection || []).forEach(function(x){
                        if (!x) return;
                        if (x.feature_id && String(x.feature_id).indexOf("fig|") !== 0) {
                            realFeatureIds.push(x.feature_id);
                        } else if (x.patric_id || x.feature_id) {
                            patricIds.push(encodeURIComponent(x.patric_id || x.feature_id));
                        }
                    });
                    var queryPart = "";
                    if (realFeatureIds.length > 0 && patricIds.length === 0) {
                        queryPart = "in(feature_id,(" + realFeatureIds.join(",") + "))";
                    } else if (patricIds.length > 0 && realFeatureIds.length === 0) {
                        queryPart = "in(patric_id,(" + patricIds.join(",") + "))";
                    } else if (realFeatureIds.length > 0 && patricIds.length > 0) {
                        queryPart = "or(in(feature_id,(" + realFeatureIds.join(",") + ")),in(patric_id,(" + patricIds.join(",") + ")))";
                    }
                    if (!queryPart) return;
                    Topic.publish("/navigate", {
                        href: "/view/FeatureList/?" + queryPart + "#view_tab=features",
                        target: "blank"
                    });
                },
                false
            ],
            [
                "ViewGenomeItem",
                "MultiButton fa icon-selection-Genome fa-2x",
                {
                    label: "GENOME",
                    validTypes: ["*"],
                    multiple: false,
                    ignoreDataType: true,
                    tooltip: "Switch to Genome View. Press and Hold for more options.",
                    validContainerTypes: ["feature_data", "genome_data"],
                    pressAndHold: function(selection, button, opts, evt){
                        var sel = selection && selection[0];
                        if (!sel || !sel.genome_id) return;
                        popup.open({
                            popup: new PerspectiveToolTipDialog({
                                perspective: "Genome",
                                perspectiveUrl: "/view/Genome/" + sel.genome_id
                            }),
                            around: button,
                            orient: ["below"]
                        });
                    }
                },
                function(selection){
                    var sel = selection && selection[0];
                    if (!sel || !sel.genome_id) return;
                    Topic.publish("/navigate", { href: "/view/Genome/" + sel.genome_id, target: "blank" });
                },
                false
            ],
            [
                "ViewGenomeItems",
                "MultiButton fa icon-selection-GenomeList fa-2x",
                {
                    label: "GENOMES",
                    validTypes: ["*"],
                    multiple: true,
                    min: 2,
                    max: 0,
                    ignoreDataType: true,
                    tooltip: "Switch to Genome List View. Press and Hold for more options.",
                    validContainerTypes: ["feature_data", "genome_data"],
                    pressAndHold: function(selection, button, opts, evt){
                        var genome_ids = [];
                        (selection || []).forEach(function(sel){
                            if (sel && sel.genome_id && genome_ids.indexOf(sel.genome_id) === -1) {
                                genome_ids.push(sel.genome_id);
                            }
                        });
                        if (genome_ids.length === 0) return;
                        popup.open({
                            popup: new PerspectiveToolTipDialog({
                                perspective: "GenomeList",
                                perspectiveUrl: "/view/GenomeList/?eq(*,*)&genome(in(genome_id,(" + genome_ids.join(",") + ")))"
                            }),
                            around: button,
                            orient: ["below"]
                        });
                    }
                },
                function(selection){
                    var genome_ids = [];
                    (selection || []).forEach(function(sel){
                        if (sel && sel.genome_id && genome_ids.indexOf(sel.genome_id) === -1) {
                            genome_ids.push(sel.genome_id);
                        }
                    });
                    if (genome_ids.length === 0) return;
                    Topic.publish("/navigate", {
                        href: "/view/GenomeList/?eq(*,*)&genome(in(genome_id,(" + genome_ids.join(",") + ")))#view_tab=genomes",
                        target: "blank"
                    });
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
                    tooltip: "Adjust Node Labels (Toggle On/Off, Text Size & Zoom Threshold)",
                    ignoreDataType: true
                },
                function (selection) {
                    // 1. OPEN THE POPUP FIRST
                    popup.open({
                        popup: this.labelMenu,
                        around: this.selectionActionBar._actions.LabelSettings.button,
                        orient: ["above", "below"]
                    });
                    
                    // 2. SET THE VALUES AFTER IT IS OPEN (scoped to this.labelMenuDiv to avoid stale DOM ID collisions)
                    if (window.GexfJS && GexfJS.params && this.labelMenuDiv) {
                        var toggleInput = this.labelMenuDiv.querySelector('#gexfLabelToggle');
                        if (toggleInput) {
                            toggleInput.checked = (GexfJS.params.showNodeLabels !== false); 
                        }
                        
                        var sizeInput = this.labelMenuDiv.querySelector('#gexfLabelSize');
                        if (sizeInput) {
                            sizeInput.value = GexfJS.params.labelSizeFactor || 0.6;
                        }

                        var threshVal = (typeof GexfJS.params.textDisplayThreshold === "number" && !isNaN(GexfJS.params.textDisplayThreshold))
                            ? GexfJS.params.textDisplayThreshold
                            : 12;
                        var threshInput = this.labelMenuDiv.querySelector('#gexfLabelThreshold');
                        if (threshInput) {
                            threshInput.value = threshVal;
                        }
                        var threshSlider = this.labelMenuDiv.querySelector('#gexfLabelThresholdSlider');
                        if (threshSlider) {
                            threshSlider.value = threshVal;
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

        updateLabelButtonState: function() {
            if (!this.selectionActionBar || !this.selectionActionBar._actions || !this.selectionActionBar._actions.LabelSettings) return;
            var btnNode = this.selectionActionBar._actions.LabelSettings.button;
            if (!btnNode) return;
            var isShown = !(window.GexfJS && GexfJS.params && GexfJS.params.showNodeLabels === false);
            domStyle.set(btnNode, {
                opacity: isShown ? "1.0" : "0.55"
            });
            query(".ActionButtonText", btnNode).forEach(function(node) {
                node.innerHTML = isShown ? "LABELS" : "LABELS OFF";
            });
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
            this.colorMenuDiv = colorMenuDiv;
            this.colorMenu = new TooltipDialog({ content: colorMenuDiv });

            on(colorMenuDiv, "#gexfColorApply:click", lang.hitch(this, function() {
                var picker = colorMenuDiv.querySelector('#gexfColorPicker');
                var color = picker ? picker.value : '#ff0000';
                var nameInput = colorMenuDiv.querySelector('#gexfPinNameInput');
                var customName = (nameInput && nameInput.value) ? nameInput.value.trim() : null;
                this.applyColorToGraph(color, customName);
                popup.close(this.colorMenu);
            }));

            // Explicit Close button handler
            on(colorMenuDiv, "#gexfColorCancel:click", lang.hitch(this, function() {
                popup.close(this.colorMenu);
            }));

            // --- 2. Combined Graph Visuals Menu (Background, Highlight, Edge Color, Default Edge Weight, Label Color) ---
            var visualsMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 10px 12px; white-space: nowrap; font-size: 0.92em; min-width: 265px;">' +
                           '<div style="font-weight: bold; font-size: 1.02em; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 8px;">Graph Visuals</div>' +
                           '<div style="margin-bottom: 7px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">' +
                           '<label for="gexfBgColorPicker" style="font-weight: 600; color: #333;">Background Color:</label>' +
                           '<div style="display: flex; align-items: center; gap: 6px;">' +
                           '<input type="color" id="gexfBgColorPicker" value="#ffffff" style="cursor: pointer; width: 28px; height: 24px; padding: 0; border: 1px solid #ccc; border-radius: 3px;">' +
                           '<button id="gexfBgColorReset" type="button" style="padding: 2px 7px; font-size: 0.85em; cursor: pointer;" title="Reset background to default gradient">Default</button>' +
                           '</div></div>' +
                           '<div style="margin-bottom: 7px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">' +
                           '<label for="gexfHlColorPicker" style="font-weight: 600; color: #333;">Highlight Color:</label>' +
                           '<div style="display: flex; align-items: center; gap: 6px;">' +
                           '<input type="color" id="gexfHlColorPicker" value="#d500f9" style="cursor: pointer; width: 28px; height: 24px; padding: 0; border: 1px solid #ccc; border-radius: 3px;">' +
                           '<button id="gexfHlColorReset" type="button" style="padding: 2px 7px; font-size: 0.85em; cursor: pointer;" title="Reset highlight color to default magenta (#d500f9)">Default</button>' +
                           '</div></div>' +
                           '<div style="margin-bottom: 7px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">' +
                           '<label for="gexfEdgeColorPicker" style="font-weight: 600; color: #333;">Edge Color:</label>' +
                           '<div style="display: flex; align-items: center; gap: 6px;">' +
                           '<input type="color" id="gexfEdgeColorPicker" value="#6e7681" style="cursor: pointer; width: 28px; height: 24px; padding: 0; border: 1px solid #ccc; border-radius: 3px;">' +
                           '<button id="gexfEdgeColorReset" type="button" style="padding: 2px 7px; font-size: 0.85em; cursor: pointer;" title="Reset default edge color">Default</button>' +
                           '</div></div>' +
                           '<div style="margin-bottom: 7px; display: flex; align-items: center; justify-content: space-between; gap: 10px;" title="Stroke width (px) for default graph edges">' +
                           '<label for="gexfEdgeWeightInput" style="font-weight: 600; color: #333;">Default Edge Weight:</label>' +
                           '<div style="display: flex; align-items: center; gap: 5px;">' +
                           '<input type="range" id="gexfEdgeWeightSlider" value="1.0" min="0.2" max="5.0" step="0.2" style="width: 75px; vertical-align: middle; cursor: pointer;">' +
                           '<input type="number" id="gexfEdgeWeightInput" value="1.0" min="0.2" max="8.0" step="0.2" style="width: 48px; text-align: center;">' +
                           '<button id="gexfEdgeWeightReset" type="button" style="padding: 2px 7px; font-size: 0.85em; cursor: pointer;" title="Reset edge weight to 1.0px">Default</button>' +
                           '</div></div>' +
                           '<div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">' +
                           '<label for="gexfLblColorPicker" style="font-weight: 600; color: #333;">Label Color:</label>' +
                           '<div style="display: flex; align-items: center; gap: 6px;">' +
                           '<input type="color" id="gexfLblColorPicker" value="#000000" style="cursor: pointer; width: 28px; height: 24px; padding: 0; border: 1px solid #ccc; border-radius: 3px;">' +
                           '<button id="gexfLblColorReset" type="button" style="padding: 2px 7px; font-size: 0.85em; cursor: pointer;" title="Reset node label color to default">Default</button>' +
                           '</div></div>' +
                           '<div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 8px;">' +
                           '<button id="gexfVisualsResetAll" type="button" style="padding: 4px 10px; cursor: pointer;">Reset All</button>' +
                           '<button id="gexfVisualsClose" type="button" style="padding: 4px 12px; cursor: pointer; font-weight: bold;">Close</button>' +
                           '</div></div>'
            });
            this.visualsMenuDiv = visualsMenuDiv;
            this.visualsMenu = new TooltipDialog({ content: visualsMenuDiv });

            var applyBgColor = lang.hitch(this, function(colorOrNull) {
                this.customBgColor = colorOrNull || null;
                var zc = document.getElementById('zonecentre');
                var oc = document.getElementById('overviewzone');
                if (this.customBgColor) {
                    if (zc) { domClass.remove(zc, 'gradient'); domStyle.set(zc, 'background', this.customBgColor); }
                    if (oc) { domClass.remove(oc, 'gradient'); domStyle.set(oc, 'background', this.customBgColor); }
                } else {
                    if (zc) { domStyle.set(zc, 'background', ''); domClass.add(zc, 'gradient'); }
                    if (oc) { domStyle.set(oc, 'background', ''); domClass.add(oc, 'gradient'); }
                }
            });

            var refreshHighlightVisuals = lang.hitch(this, function(colorOrNull) {
                this.customHlColor = colorOrNull || null;
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.highlightColorOverride = this.customHlColor;
                    if (GexfJS.params.activePhenomenon && GexfJS.params.activePhenomenon !== 'block') {
                        this.applyPhenomenonLocusState(false);
                    }
                    if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
                }
            });

            var refreshEdgeColorVisuals = lang.hitch(this, function(colorOrNull) {
                this.customEdgeColor = colorOrNull || null;
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.edgeColorOverride = this.customEdgeColor;
                    if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
                }
            });

            var refreshEdgeWeightVisuals = lang.hitch(this, function(weightVal) {
                var parsed = parseFloat(weightVal);
                var w = (!isNaN(parsed) && parsed > 0) ? parsed : 1.0;
                this.customEdgeWidth = w;
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.defaultEdgeWidth = w;
                    if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
                }
            });

            var refreshLabelColorVisuals = lang.hitch(this, function(colorOrNull) {
                this.customLblColor = colorOrNull || null;
                if (window.GexfJS && GexfJS.params) {
                    GexfJS.params.labelColorOverride = this.customLblColor;
                    if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
                }
            });

            on(visualsMenuDiv, "#gexfBgColorPicker:input, #gexfBgColorPicker:change", lang.hitch(this, function(evt) {
                if (evt && evt.target) applyBgColor(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfBgColorReset:click", lang.hitch(this, function() {
                var picker = visualsMenuDiv.querySelector('#gexfBgColorPicker');
                if (picker) picker.value = '#ffffff';
                applyBgColor(null);
            }));

            on(visualsMenuDiv, "#gexfHlColorPicker:input, #gexfHlColorPicker:change", lang.hitch(this, function(evt) {
                if (evt && evt.target) refreshHighlightVisuals(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfHlColorReset:click", lang.hitch(this, function() {
                var picker = visualsMenuDiv.querySelector('#gexfHlColorPicker');
                if (picker) picker.value = '#d500f9';
                refreshHighlightVisuals(null);
            }));

            on(visualsMenuDiv, "#gexfEdgeColorPicker:input, #gexfEdgeColorPicker:change", lang.hitch(this, function(evt) {
                if (evt && evt.target) refreshEdgeColorVisuals(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfEdgeColorReset:click", lang.hitch(this, function() {
                var picker = visualsMenuDiv.querySelector('#gexfEdgeColorPicker');
                if (picker) picker.value = '#6e7681';
                refreshEdgeColorVisuals(null);
            }));

            on(visualsMenuDiv, "#gexfEdgeWeightSlider:input, #gexfEdgeWeightSlider:change", lang.hitch(this, function(evt) {
                var numEl = visualsMenuDiv.querySelector('#gexfEdgeWeightInput');
                if (numEl && evt && evt.target) numEl.value = evt.target.value;
                if (evt && evt.target) refreshEdgeWeightVisuals(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfEdgeWeightInput:input, #gexfEdgeWeightInput:change", lang.hitch(this, function(evt) {
                var sliderEl = visualsMenuDiv.querySelector('#gexfEdgeWeightSlider');
                if (sliderEl && evt && evt.target) sliderEl.value = evt.target.value;
                if (evt && evt.target) refreshEdgeWeightVisuals(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfEdgeWeightReset:click", lang.hitch(this, function() {
                var sliderEl = visualsMenuDiv.querySelector('#gexfEdgeWeightSlider');
                var numEl = visualsMenuDiv.querySelector('#gexfEdgeWeightInput');
                if (sliderEl) sliderEl.value = 1.0;
                if (numEl) numEl.value = 1.0;
                refreshEdgeWeightVisuals(1.0);
            }));

            on(visualsMenuDiv, "#gexfLblColorPicker:input, #gexfLblColorPicker:change", lang.hitch(this, function(evt) {
                if (evt && evt.target) refreshLabelColorVisuals(evt.target.value);
            }));
            on(visualsMenuDiv, "#gexfLblColorReset:click", lang.hitch(this, function() {
                var picker = visualsMenuDiv.querySelector('#gexfLblColorPicker');
                if (picker) picker.value = '#000000';
                refreshLabelColorVisuals(null);
            }));

            on(visualsMenuDiv, "#gexfVisualsResetAll:click", lang.hitch(this, function() {
                var bgPicker = visualsMenuDiv.querySelector('#gexfBgColorPicker');
                var hlPicker = visualsMenuDiv.querySelector('#gexfHlColorPicker');
                var edgePicker = visualsMenuDiv.querySelector('#gexfEdgeColorPicker');
                var ewSlider = visualsMenuDiv.querySelector('#gexfEdgeWeightSlider');
                var ewInput = visualsMenuDiv.querySelector('#gexfEdgeWeightInput');
                var lblPicker = visualsMenuDiv.querySelector('#gexfLblColorPicker');
                if (bgPicker) bgPicker.value = '#ffffff';
                if (hlPicker) hlPicker.value = '#d500f9';
                if (edgePicker) edgePicker.value = '#6e7681';
                if (ewSlider) ewSlider.value = 1.0;
                if (ewInput) ewInput.value = 1.0;
                if (lblPicker) lblPicker.value = '#000000';
                applyBgColor(null);
                refreshHighlightVisuals(null);
                refreshEdgeColorVisuals(null);
                refreshEdgeWeightVisuals(1.0);
                refreshLabelColorVisuals(null);
            }));

            on(visualsMenuDiv, "#gexfVisualsClose:click", lang.hitch(this, function() {
                popup.close(this.visualsMenu);
            }));

            // --- 3. Node Labels Menu ---
            var labelMenuDiv = domConstruct.create("div", {
                innerHTML: '<div style="padding: 8px; white-space: nowrap; font-size: 0.92em;">' +
                           '<div style="margin-bottom: 6px;"><label style="cursor:pointer; font-weight:bold;"><input type="checkbox" id="gexfLabelToggle" checked style="vertical-align:middle; cursor:pointer;"> Show Node Labels</label></div>' +
                           '<div style="margin-bottom: 6px; display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                           '<label for="gexfLabelSize">Text Size Multiplier:</label>' +
                           '<input type="number" id="gexfLabelSize" value="0.6" step="0.1" min="0.2" max="5.0" style="width: 55px; text-align:center;">' +
                           '</div>' +
                           '<div style="margin-bottom: 3px; display:flex; align-items:center; justify-content:space-between; gap:8px;" title="Minimum rendered node radius (px) required before labels appear when zooming">' +
                           '<label for="gexfLabelThreshold">Zoom Threshold (px):</label>' +
                           '<div style="display:flex; align-items:center; gap:5px;">' +
                           '<input type="range" id="gexfLabelThresholdSlider" value="12" min="0" max="40" step="1" style="width: 80px; vertical-align:middle; cursor:pointer;">' +
                           '<input type="number" id="gexfLabelThreshold" value="12" step="1" min="0" max="50" style="width: 48px; text-align:center;">' +
                           '</div>' +
                           '</div>' +
                           '<div style="margin-bottom: 8px; font-size: 0.8em; color: #666;">Lower = show when zoomed out &middot; Higher = zoom in closer</div>' +
                           '<div style="text-align:right;">' +
                           '<button id="gexfLabelApply" style="padding: 4px 10px; cursor: pointer; margin-right: 5px;">Apply</button>' +
                           '<button id="gexfLabelCancel" style="padding: 4px 10px; cursor: pointer;">Close</button>' +
                           '</div></div>'
            });
            this.labelMenuDiv = labelMenuDiv;
            this.labelMenu = new TooltipDialog({ content: labelMenuDiv });

            var syncLabelSettingsToGraph = lang.hitch(this, function() {
                if (!window.GexfJS || !GexfJS.params) return;
                var toggleEl = labelMenuDiv.querySelector('#gexfLabelToggle');
                var sizeEl = labelMenuDiv.querySelector('#gexfLabelSize');
                var threshEl = labelMenuDiv.querySelector('#gexfLabelThreshold');

                var showLabels = toggleEl ? Boolean(toggleEl.checked) : true;
                var parsedSize = sizeEl ? parseFloat(sizeEl.value) : 0.6;
                var labelSize = (!isNaN(parsedSize) && parsedSize > 0) ? parsedSize : 0.6;
                var parsedThresh = threshEl ? parseFloat(threshEl.value) : 12;
                var labelThresh = (!isNaN(parsedThresh) && parsedThresh >= 0) ? parsedThresh : 12;

                GexfJS.params.showNodeLabels = showLabels;
                GexfJS.params.labelSizeFactor = labelSize;
                GexfJS.params.textDisplayThreshold = labelThresh;

                this.updateLabelButtonState();
                if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
            });

            on(labelMenuDiv, "#gexfLabelToggle:change", lang.hitch(this, function() {
                syncLabelSettingsToGraph();
            }));

            on(labelMenuDiv, "#gexfLabelSize:input, #gexfLabelSize:change", lang.hitch(this, function() {
                syncLabelSettingsToGraph();
            }));

            on(labelMenuDiv, "#gexfLabelThresholdSlider:input, #gexfLabelThresholdSlider:change", lang.hitch(this, function(evt) {
                var threshEl = labelMenuDiv.querySelector('#gexfLabelThreshold');
                if (threshEl && evt && evt.target) {
                    threshEl.value = evt.target.value;
                }
                syncLabelSettingsToGraph();
            }));

            on(labelMenuDiv, "#gexfLabelThreshold:input, #gexfLabelThreshold:change", lang.hitch(this, function(evt) {
                var sliderEl = labelMenuDiv.querySelector('#gexfLabelThresholdSlider');
                if (sliderEl && evt && evt.target) {
                    sliderEl.value = evt.target.value;
                }
                syncLabelSettingsToGraph();
            }));

            on(labelMenuDiv, "#gexfLabelApply:click", lang.hitch(this, function() {
                syncLabelSettingsToGraph();
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

            // Cleanly close and destroy TooltipDialog popups so no duplicate DOM IDs remain in document.body
            ["colorMenu", "visualsMenu", "labelMenu"].forEach(lang.hitch(this, function(menuKey) {
                if (this[menuKey]) {
                    try { popup.close(this[menuKey]); } catch (e) {}
                    try { this[menuKey].destroyRecursive(); } catch (e) {}
                    this[menuKey] = null;
                }
            }));
            
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

        getCnvClassification: function() {
            if (!window.GexfJS || !GexfJS.graph || !GexfJS.graph.nodeList) {
                return { localNodes: {}, fragNodes: {}, remoteNodes: {}, localClusterCount: 0, fragClusterCount: 0, remoteClusterCount: 0 };
            }
            if (this._phenomenonDataCache && this._phenomenonDataCache._cnvClass) {
                return this._phenomenonDataCache._cnvClass;
            }

            var nodeList = GexfJS.graph.nodeList || [];
            var edgeList = GexfJS.graph.edgeList || [];
            var cnvIdAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['cnv_cluster_id'];
            var remoteAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['remote_cnv'];
            var repAmbigAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['repeat_ambiguity'];
            var repFragAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['repeat_ambiguity_fragmentation'];
            var conflictAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['conflict'];

            var localNodes = {};
            var fragNodes = {};
            var remoteNodes = {};
            var localClusters = {};
            var fragClusters = {};
            var remoteClusters = {};

            // Build undirected adjacency and partition cnv_cluster_id groups into spatially localized sub-components (<= 4 hops)
            var adj = {};
            var fragJuncNodes = {};
            var fragJuncEdgeAttr = GexfJS._edge_attr_value && GexfJS._edge_attr_value['repeat_fragmentation_junction'];
            var fragJuncEdges = (typeof fragJuncEdgeAttr !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[fragJuncEdgeAttr] && GexfJS.path_highlights[fragJuncEdgeAttr]['true'])
                ? GexfJS.path_highlights[fragJuncEdgeAttr]['true']
                : {};

            edgeList.forEach(function(e) {
                var sn = nodeList[e.source];
                var tn = nodeList[e.target];
                if (!sn || !tn) return;
                if (!adj[sn.id]) adj[sn.id] = {};
                if (!adj[tn.id]) adj[tn.id] = {};
                adj[sn.id][tn.id] = true;
                adj[tn.id][sn.id] = true;
                if (fragJuncEdges[e.id]) {
                    fragJuncNodes[sn.id] = true;
                    fragJuncNodes[tn.id] = true;
                }
            });

            var nodeById = {};
            var byCnv = {};
            nodeList.forEach(function(node) {
                nodeById[node.id] = node;
                var attrs = node.attributes || {};
                var cVal = (typeof cnvIdAttr !== 'undefined' && attrs[cnvIdAttr] != null) ? String(attrs[cnvIdAttr]).trim() : '';
                if (cVal && cVal !== '0' && cVal !== 'None') {
                    if (!byCnv[cVal]) byCnv[cVal] = [];
                    byCnv[cVal].push(node.id);
                }
                if (typeof remoteAttr !== 'undefined') {
                    var hasCnv = (cVal !== '' && cVal !== '0' && cVal !== 'None');
                    if (typeof repAmbigAttr !== 'undefined' && String(attrs[repAmbigAttr]).toLowerCase() === 'true') {
                        localNodes[node.id] = true;
                        if (hasCnv) localClusters[cVal] = true;
                    }
                } else if (typeof conflictAttr !== 'undefined' && String(attrs[conflictAttr]) === '3') {
                    fragNodes[node.id] = true;
                }
            });

            Object.keys(byCnv).forEach(function(cVal) {
                var nlist = byCnv[cVal];
                var clusterGenCopies = {};
                nlist.forEach(function(nid) {
                    var n = nodeById[nid];
                    var fmap = (n && n.featureMap) ? n.featureMap : {};
                    for (var gid in fmap) {
                        if (gid === 'info') continue;
                        var cMap = fmap[gid];
                        if (cMap && typeof cMap === 'object') {
                            for (var sid in cMap) {
                                var fArr = cMap[sid];
                                clusterGenCopies[gid] = (clusterGenCopies[gid] || 0) + (Array.isArray(fArr) ? fArr.length : 1);
                            }
                        }
                    }
                });
                var hasMultiCopyInCluster = Object.keys(clusterGenCopies).some(function(g) { return clusterGenCopies[g] > 1; });
                if (!hasMultiCopyInCluster) return;

                var parent = {};
                var inCluster = {};
                nlist.forEach(function(nid) {
                    parent[nid] = nid;
                    inCluster[nid] = true;
                });
                var find = function(x) {
                    while (parent[x] !== x) {
                        parent[x] = parent[parent[x]];
                        x = parent[x];
                    }
                    return x;
                };
                // Union cluster nodes within <= 4 hops in the graph
                nlist.forEach(function(startId) {
                    var q = [{ id: startId, d: 0 }];
                    var seen = {};
                    seen[startId] = true;
                    for (var qi = 0; qi < q.length; qi++) {
                        var item = q[qi];
                        if (item.d >= 4) continue;
                        var nbrs = adj[item.id] || {};
                        for (var nb in nbrs) {
                            if (!seen[nb]) {
                                seen[nb] = true;
                                if (inCluster[nb]) {
                                    var ra = find(startId), rb = find(nb);
                                    if (ra !== rb) parent[ra] = rb;
                                }
                                q.push({ id: nb, d: item.d + 1 });
                            }
                        }
                    }
                });

                var subcomps = {};
                nlist.forEach(function(nid) {
                    var r = find(nid);
                    if (!subcomps[r]) subcomps[r] = [];
                    subcomps[r].push(nid);
                });

                var scKeys = Object.keys(subcomps);
                var genomeSubcomps = {};
                scKeys.forEach(function(rk) {
                    var scNodes = subcomps[rk];
                    var scCopies = {};
                    var scContigs = {};
                    scNodes.forEach(function(nid) {
                        var n = nodeById[nid];
                        var fmap = (n && n.featureMap) ? n.featureMap : {};
                        for (var gid in fmap) {
                            if (gid === 'info') continue;
                            var cMap = fmap[gid];
                            if (cMap && typeof cMap === 'object') {
                                if (!genomeSubcomps[gid]) genomeSubcomps[gid] = {};
                                genomeSubcomps[gid][rk] = true;
                                if (!scContigs[gid]) scContigs[gid] = {};
                                for (var sid in cMap) {
                                    scContigs[gid][sid] = true;
                                    var fArr = cMap[sid];
                                    scCopies[gid] = (scCopies[gid] || 0) + (Array.isArray(fArr) ? fArr.length : 1);
                                }
                            }
                        }
                    });
                    if (typeof remoteAttr === 'undefined') {
                        if (Object.keys(scCopies).some(function(g) { return scCopies[g] > 1; })) {
                            localClusters[cVal] = true;
                            scNodes.forEach(function(nid) { localNodes[nid] = true; });
                        }
                    }
                    var scGenKeys = Object.keys(scContigs);
                    var hasMultiContigGen = scGenKeys.some(function(g) { return Object.keys(scContigs[g]).length > 1; });
                    var hasSingleContigGen = scGenKeys.some(function(g) { return Object.keys(scContigs[g]).length === 1; });
                    if (hasMultiContigGen && hasSingleContigGen) {
                        fragClusters[cVal] = true;
                        scNodes.forEach(function(nid) { fragNodes[nid] = true; });
                    }
                });

                var hasGenomeAcrossMultipleSubcomps = scKeys.length > 1 && Object.keys(genomeSubcomps).some(function(g) {
                    return Object.keys(genomeSubcomps[g]).length > 1;
                });
                if (hasGenomeAcrossMultipleSubcomps) {
                    remoteClusters[cVal] = true;
                    nlist.forEach(function(nid) { remoteNodes[nid] = true; });
                }
            });

            var res = {
                localNodes: localNodes,
                fragNodes: fragNodes,
                remoteNodes: remoteNodes,
                localClusterCount: Object.keys(localClusters).length,
                fragClusterCount: Object.keys(fragClusters).length,
                remoteClusterCount: Object.keys(remoteClusters).length
            };
            if (!this._phenomenonDataCache) this._phenomenonDataCache = {};
            this._phenomenonDataCache._cnvClass = res;
            return res;
        },

        getContigPolarities: function() {
            if (!window.GexfJS || !GexfJS.graph || !GexfJS.graph.nodeList || !GexfJS.graph.edgeList) {
                return {};
            }
            if (this._phenomenonDataCache && this._phenomenonDataCache._contigPolarities) {
                return this._phenomenonDataCache._contigPolarities;
            }

            var invEdgeAttr = GexfJS._edge_attr_value && GexfJS._edge_attr_value['inverted_block'];
            var invNodeAttr = GexfJS._node_attr_value && GexfJS._node_attr_value['inverted_block'];

            var getNodeContigMap = function(nodeObj) {
                if (!nodeObj || !nodeObj.featureMap) return {};
                if (nodeObj._cachedContigPos) return nodeObj._cachedContigPos;
                var map = {};
                for (var gKey in nodeObj.featureMap) {
                    if (gKey === 'info' || gKey === 'md5' || gKey === 'start' || gKey === 'end') continue;
                    var cMap = nodeObj.featureMap[gKey];
                    if (!cMap || typeof cMap !== 'object') continue;
                    for (var sid in cMap) {
                        var fArr = cMap[sid];
                        if (!fArr || !fArr.length) continue;
                        var peg = null;
                        var m = String(fArr[0]).match(/(\d+)$/);
                        if (m) peg = parseInt(m[1], 10);
                        var pos = peg;
                        if (nodeObj.featureMap.info && nodeObj.featureMap.info[gKey] && nodeObj.featureMap.info[gKey][sid] &&
                            nodeObj.featureMap.info[gKey][sid][0] && typeof nodeObj.featureMap.info[gKey][sid][0].start !== 'undefined') {
                            var st = parseInt(nodeObj.featureMap.info[gKey][sid][0].start, 10);
                            if (!isNaN(st)) pos = st;
                        }
                        if (pos !== null) {
                            map[sid] = { gid: gKey, pos: pos, peg: peg };
                        }
                    }
                }
                nodeObj._cachedContigPos = map;
                return map;
            };

            var pairVotes = {};
            var contigWeight = {};
            var edgeFwdVotes = {};

            GexfJS.graph.edgeList.forEach(function(e) {
                var uNode = GexfJS.graph.nodeList[e.source];
                var vNode = GexfJS.graph.nodeList[e.target];
                if (!uNode || !vNode) return;

                var isInv = false;
                if (typeof invEdgeAttr !== 'undefined' && e.attributes && String(e.attributes[invEdgeAttr]).toLowerCase() === 'true') isInv = true;
                if (typeof invNodeAttr !== 'undefined') {
                    if (uNode.attributes && String(uNode.attributes[invNodeAttr]).toLowerCase() === 'true') isInv = true;
                    if (vNode.attributes && String(vNode.attributes[invNodeAttr]).toLowerCase() === 'true') isInv = true;
                }
                var w = isInv ? 1 : 100;

                var uMap = getNodeContigMap(uNode);
                var vMap = getNodeContigMap(vNode);
                var dirs = {};
                for (var sid in uMap) {
                    if (!vMap[sid]) continue;
                    var uEntry = uMap[sid];
                    var vEntry = vMap[sid];
                    if (uEntry.pos === vEntry.pos) continue;
                    if (uEntry.peg !== null && vEntry.peg !== null && Math.abs(vEntry.peg - uEntry.peg) > 15) continue;
                    var dVal = (vEntry.pos > uEntry.pos) ? 1 : -1;
                    dirs[sid] = dVal;
                    contigWeight[sid] = (contigWeight[sid] || 0) + (isInv ? 1 : 10);
                    edgeFwdVotes[sid] = (edgeFwdVotes[sid] || 0) + dVal * w;
                }

                var cList = Object.keys(dirs).sort();
                for (var i = 0; i < cList.length; i++) {
                    var ca = cList[i];
                    if (!pairVotes[ca]) pairVotes[ca] = {};
                    for (var j = i + 1; j < cList.length; j++) {
                        var cb = cList[j];
                        if (!pairVotes[cb]) pairVotes[cb] = {};
                        var prod = dirs[ca] * dirs[cb] * w;
                        pairVotes[ca][cb] = (pairVotes[ca][cb] || 0) + prod;
                        pairVotes[cb][ca] = (pairVotes[cb][ca] || 0) + prod;
                    }
                }
            });

            var contigPol = {};
            var allContigs = Object.keys(contigWeight).sort(function(a, b) {
                var diff = (contigWeight[b] || 0) - (contigWeight[a] || 0);
                return diff !== 0 ? diff : a.localeCompare(b);
            });

            allContigs.forEach(function(seed) {
                if (contigPol[seed]) return;
                contigPol[seed] = ((edgeFwdVotes[seed] || 0) >= 0) ? 1 : -1;
                var assigned = [seed];
                while (true) {
                    var bestC = null;
                    var bestSc = 0;
                    var bestP = 1;
                    for (var ai = 0; ai < assigned.length; ai++) {
                        var u = assigned[ai];
                        var nbs = pairVotes[u] || {};
                        for (var v in nbs) {
                            if (contigPol[v]) continue;
                            var sc = 0;
                            for (var bi = 0; bi < assigned.length; bi++) {
                                var a = assigned[bi];
                                sc += ((pairVotes[v] && pairVotes[v][a]) || 0) * contigPol[a];
                            }
                            if (Math.abs(sc) > Math.abs(bestSc)) {
                                bestSc = sc;
                                bestC = v;
                                bestP = (sc >= 0) ? 1 : -1;
                            }
                        }
                    }
                    if (!bestC) break;
                    contigPol[bestC] = bestP;
                    assigned.push(bestC);
                }
            });

            if (!this._phenomenonDataCache) this._phenomenonDataCache = {};
            this._phenomenonDataCache._contigPolarities = contigPol;
            return contigPol;
        },

        getPhenomenonData: function(type) {
            if (!window.GexfJS || !GexfJS.graph || !GexfJS.graph.nodeList) {
                return { rawEdges: {}, explicitNodes: {}, dashedEdges: {}, loci: [] };
            }
            if (!this._phenomenonDataCache) {
                this._phenomenonDataCache = {};
            }
            if (this._phenomenonDataCache[type]) {
                return this._phenomenonDataCache[type];
            }

            var rawEdges = {};
            var explicitNodes = {};
            var dashedEdges = {};

            var addEdgesByAttr = function(attrName, attrValue, isDashed) {
                var attrId = GexfJS._edge_attr_value && GexfJS._edge_attr_value[attrName];
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

            var checkNodeBool = function(nodeObj, attrName) {
                var aId = GexfJS._node_attr_value && GexfJS._node_attr_value[attrName];
                if (typeof aId !== 'undefined' && nodeObj.attributes) {
                    return String(nodeObj.attributes[aId]).toLowerCase() === 'true';
                }
                return false;
            };

            if (type === 'superbubbles') {
                addEdgesByAttr('is_superbubble', 'true', false);
                addEdgesByAttr('alt_path_junction', 'true', false);
                addEdgesByAttr('alternative_path', 'true', false);
                var conflictId = GexfJS._node_attr_value && GexfJS._node_attr_value['conflict'];
                GexfJS.graph.nodeList.forEach(function(node) {
                    var isSpecial = false;
                    if (checkNodeBool(node, 'is_superbubble')) isSpecial = true;
                    if (checkNodeBool(node, 'alternative_path')) isSpecial = true;
                    if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "4") isSpecial = true;
                    if (isSpecial) explicitNodes[node.id] = true;
                });
            } else if (type === 'tandem_repeats') {
                addEdgesByAttr('repeat_ambiguity_detour', 'true', false);
                addEdgesByAttr('sv_class', 'repeat_ambiguity_detour', false);
                var cnvClass = this.getCnvClassification();
                Object.keys(cnvClass.localNodes).forEach(function(nid) {
                    explicitNodes[nid] = true;
                });
            } else if (type === 'fragmented_paralogs') {
                var cnvClass = this.getCnvClassification();
                Object.keys(cnvClass.fragNodes).forEach(function(nid) {
                    explicitNodes[nid] = true;
                });
                if (Object.keys(explicitNodes).length === 0) {
                    addEdgesByAttr('repeat_fragmentation_junction', 'true', false);
                }
            } else if (type === 'remote_cnv') {
                var cnvClass = this.getCnvClassification();
                Object.keys(cnvClass.remoteNodes).forEach(function(nid) {
                    explicitNodes[nid] = true;
                });
            } else if (type === 'alt_paths') {
                addEdgesByAttr('alt_path_junction', 'true', false);
                addEdgesByAttr('alternative_path', 'true', false);
                var conflictId = GexfJS._node_attr_value && GexfJS._node_attr_value['conflict'];
                GexfJS.graph.nodeList.forEach(function(node) {
                    var isSpecial = false;
                    if (checkNodeBool(node, 'alternative_path')) isSpecial = true;
                    if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "4") isSpecial = true;
                    if (isSpecial) explicitNodes[node.id] = true;
                });
            } else if (type === 'translocation_bridges') {
                addEdgesByAttr('bridge_junction', 'true', true);
                addEdgesByAttr('translocation_bridge', 'true', false);
                GexfJS.graph.nodeList.forEach(function(node) {
                    if (checkNodeBool(node, 'translocation_bridge')) {
                        explicitNodes[node.id] = true;
                    }
                });
            } else if (type === 'rearrangements') {
                addEdgesByAttr('breakpoint_junction', 'true', true);
                var conflictId = GexfJS._node_attr_value && GexfJS._node_attr_value['conflict'];
                GexfJS.graph.nodeList.forEach(function(node) {
                    var isSpecial = false;
                    if (checkNodeBool(node, 'synteny_breakpoint')) isSpecial = true;
                    if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "1") isSpecial = true;
                    if (isSpecial) explicitNodes[node.id] = true;
                });
            } else if (type === 'rearrangement_junctions') {
                addEdgesByAttr('inter_contig_rearrangement', 'true', true);
                addEdgesByAttr('intra_contig_rearrangement', 'true', true);
                // Guard against legacy GEXF files where superbubbles or alt paths were also tagged with intra/inter_contig_rearrangement
                var excludeEdgeAttrs = ['is_superbubble', 'alternative_path', 'alt_path_junction', 'translocation_bridge', 'bridge_junction', 'breakpoint_junction'];
                excludeEdgeAttrs.forEach(function(exAttr) {
                    var exId = GexfJS._edge_attr_value && GexfJS._edge_attr_value[exAttr];
                    if (typeof exId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[exId] && GexfJS.path_highlights[exId]['true']) {
                        for (var eid in GexfJS.path_highlights[exId]['true']) {
                            delete rawEdges[eid];
                            delete dashedEdges[eid];
                        }
                    }
                });
            } else if (type === 'inversions') {
                addEdgesByAttr('inverted_block', 'true', false);
                GexfJS.graph.nodeList.forEach(function(node) {
                    if (checkNodeBool(node, 'inverted_block')) {
                        explicitNodes[node.id] = true;
                    }
                });
            } else if (type === 'breaks') {
                addEdgesByAttr('is_scaffold_path', 'true', true);
                addEdgesByAttr('sv_class', 'potential_scaffold', true);
                var conflictId = GexfJS._node_attr_value && GexfJS._node_attr_value['conflict'];
                var bridgeId = GexfJS._node_attr_value && GexfJS._node_attr_value['is_scaffold_bridge'];
                GexfJS.graph.nodeList.forEach(function(node) {
                    var isSpecial = false;
                    if (checkNodeBool(node, 'assembly_repeat_break')) isSpecial = true;
                    if (checkNodeBool(node, 'is_scaffold_path')) isSpecial = true;
                    if (node.attributes && typeof bridgeId !== 'undefined' && String(node.attributes[bridgeId]).toLowerCase() === 'true') isSpecial = true;
                    if (node.attributes && typeof conflictId !== 'undefined' && String(node.attributes[conflictId]) === "2") isSpecial = true;
                    if (isSpecial) explicitNodes[node.id] = true;
                });
            }

            var loci = this.buildPhenomenonLoci(type, rawEdges, explicitNodes, dashedEdges);
            var res = {
                rawEdges: rawEdges,
                explicitNodes: explicitNodes,
                dashedEdges: dashedEdges,
                loci: loci
            };
            this._phenomenonDataCache[type] = res;
            return res;
        },

        buildPhenomenonLoci: function(type, rawEdges, explicitNodes, dashedEdges) {
            if (!window.GexfJS || !GexfJS.graph) return [];
            var _self = this;
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

            // 3. Union by shared superbubble_id, alt_path_event_id, bridge_event_id, or cnv_cluster_id when applicable
            var sbAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['superbubble_id'] : undefined;
            var altEvAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['alt_path_event_id'] : undefined;
            var brEvAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['bridge_event_id'] : undefined;
            var cnvAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['cnv_cluster_id'] : undefined;
            var breakAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['assembly_repeat_break'] : undefined;
            var unionByCsvNodeAttr = function(attrId) {
                if (typeof attrId === 'undefined') return;
                var byTok = {};
                involvedIds.forEach(function(nid) {
                    var n = nodeById[nid];
                    var val = (n && n.attributes && n.attributes[attrId]) ? String(n.attributes[attrId]).trim() : '';
                    if (val && val !== 'None' && val !== '0') {
                        val.split(',').forEach(function(tok) {
                            var t = tok.trim();
                            if (!t) return;
                            if (byTok[t]) union(byTok[t], nid);
                            else byTok[t] = nid;
                        });
                    }
                });
            };
            if (type === 'superbubbles') {
                unionByCsvNodeAttr(sbAttrId);
                unionByCsvNodeAttr(altEvAttrId);
            } else if (type === 'alt_paths') {
                unionByCsvNodeAttr(altEvAttrId);
            } else if (type === 'translocation_bridges') {
                unionByCsvNodeAttr(brEvAttrId);
            } else if (type === 'remote_cnv') {
                // Union all copies sharing a cnv_cluster_id across the graph so each Remote CNV Cluster locus
                // highlights its dispersed paralogous copies together across the genome.
                unionByCsvNodeAttr(cnvAttrId);
            } else if ((type === 'tandem_repeats' || type === 'fragmented_paralogs') && typeof cnvAttrId !== 'undefined') {
                // Only union nodes sharing a cnv_cluster_id if they are locally proximate in the graph (distance <= 4 hops).
                // Distant paralogous operons that share a cnv_cluster_id remain separate spatial loci in Local / Fragmented views.
                var byCnvList = {};
                involvedIds.forEach(function(nid) {
                    var n = nodeById[nid];
                    var val = (n && n.attributes && n.attributes[cnvAttrId]) ? String(n.attributes[cnvAttrId]).trim() : '';
                    if (val && val !== 'None' && val !== '0') {
                        if (!byCnvList[val]) byCnvList[val] = [];
                        byCnvList[val].push(nid);
                    }
                });
                Object.keys(byCnvList).forEach(function(val) {
                    var list = byCnvList[val];
                    var inList = {};
                    list.forEach(function(id) { inList[id] = true; });
                    list.forEach(function(startId) {
                        var q = [{ id: startId, d: 0 }];
                        var seen = {};
                        seen[startId] = true;
                        for (var qi = 0; qi < q.length; qi++) {
                            var item = q[qi];
                            if (item.d >= 4) continue;
                            var inc = adjEdgesByNodeId[item.id] || [];
                            for (var ii = 0; ii < inc.length; ii++) {
                                var nb = inc[ii].neighborId;
                                if (!seen[nb]) {
                                    seen[nb] = true;
                                    if (inList[nb]) union(startId, nb);
                                    q.push({ id: nb, d: item.d + 1 });
                                }
                            }
                        }
                    });
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
                    if (hasExplicitInComp && (type === 'alt_paths' || type === 'translocation_bridges' || type === 'rearrangements' || type === 'fragmented_paralogs' || type === 'tandem_repeats' || type === 'remote_cnv' || type === 'inversions')) {
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
                    var hasFocalNeighbor = inc.some(function(item) { return Boolean(focalSet[item.neighborId]); });
                    inc.forEach(function(item) {
                        if (!focalSet[item.neighborId]) {
                            boundaryAnchorSet[item.neighborId] = true;
                        }
                        if ((type !== 'rearrangement_junctions' && (focalSet[item.neighborId] || !hasFocalNeighbor)) || Object.keys(c.edgeIds).length === 0) {
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

                if (type === 'tandem_repeats' || type === 'fragmented_paralogs' || type === 'remote_cnv') {
                    eventRoleTitle = (type === 'fragmented_paralogs')
                        ? 'Fragmented / Multi-Contig Carriers'
                        : (type === 'remote_cnv' ? 'Multi-Locus CNV Carriers' : 'Multi-Copy CNV Carriers');
                    refRoleTitle = (type === 'fragmented_paralogs')
                        ? 'Contiguous Reference Carriers'
                        : 'Single-Copy / Collinear Reference';
                    var detourGenomes = {};
                    var detourContigs = {};
                    Object.keys(rawEdges).forEach(function(eid) {
                        if (!c.edgeIds[eid]) return;
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { detourGenomes[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { detourContigs[s] = true; });
                    });
                    // Also check cluster-wide contigs/copies across all involved nodes sharing this locus's cnv_cluster_id(s)
                    var locusCnvIds = {};
                    if (typeof cnvAttrId !== 'undefined') {
                        focalIds.forEach(function(nid) {
                            var n = nodeById[nid];
                            var val = (n && n.attributes && n.attributes[cnvAttrId]) ? String(n.attributes[cnvAttrId]).trim() : '';
                            if (val && val !== 'None' && val !== '0') locusCnvIds[val] = true;
                        });
                    }
                    var clusterGlobalContigs = {};
                    var clusterGlobalCopies = {};
                    if (Object.keys(locusCnvIds).length > 0) {
                        involvedIds.forEach(function(nid) {
                            var n = nodeById[nid];
                            if (!n || !n.featureMap) return;
                            var val = (n.attributes && n.attributes[cnvAttrId]) ? String(n.attributes[cnvAttrId]).trim() : '';
                            if (!locusCnvIds[val]) return;
                            for (var gid in n.featureMap) {
                                if (gid === 'info') continue;
                                var cMap = n.featureMap[gid];
                                if (cMap && typeof cMap === 'object') {
                                    if (!clusterGlobalContigs[gid]) clusterGlobalContigs[gid] = {};
                                    if (!clusterGlobalCopies[gid]) clusterGlobalCopies[gid] = {};
                                    for (var sid in cMap) {
                                        clusterGlobalContigs[gid][sid] = true;
                                        var fArr = cMap[sid];
                                        var cnt = Array.isArray(fArr) ? fArr.length : 1;
                                        clusterGlobalCopies[gid][val] = (clusterGlobalCopies[gid][val] || 0) + cnt;
                                    }
                                }
                            }
                        });
                    }
                    Object.keys(genomeCopies).forEach(function(gid) {
                        var cSet = genomeFocalContigs[gid] || {};
                        var numContigs = Object.keys(cSet).length;
                        var globalNumContigs = clusterGlobalContigs[gid] ? Object.keys(clusterGlobalContigs[gid]).length : numContigs;
                        var maxGlobalCopies = genomeCopies[gid] || 0;
                        if (clusterGlobalCopies[gid]) {
                            for (var cv in clusterGlobalCopies[gid]) {
                                if (clusterGlobalCopies[gid][cv] > maxGlobalCopies) maxGlobalCopies = clusterGlobalCopies[gid][cv];
                            }
                        }
                        var isEvent = (type === 'fragmented_paralogs')
                            ? (numContigs > 1)
                            : (type === 'remote_cnv'
                                ? (maxGlobalCopies > 1 || globalNumContigs > 1)
                                : (genomeCopies[gid] > 1 || Boolean(detourGenomes[gid])));
                        if (isEvent) {
                            eventGenomesSet[gid] = true;
                            Object.keys(cSet).forEach(function(s) { eventContigsSet[s] = true; });
                        } else {
                            refGenomesSet[gid] = true;
                            Object.keys(cSet).forEach(function(s) { refContigsSet[s] = true; });
                        }
                    });
                    if (type !== 'fragmented_paralogs') {
                        Object.keys(detourContigs).forEach(function(s) { eventContigsSet[s] = true; });
                    }
                    // If all genomes had 1 copy per node (e.g., 2 separate paralog nodes), fallback to showing all focal as event
                    if (Object.keys(eventGenomesSet).length === 0) {
                        Object.keys(genomeCopies).forEach(function(gid) {
                            eventGenomesSet[gid] = true;
                            Object.keys(genomeFocalContigs[gid] || {}).forEach(function(s) { eventContigsSet[s] = true; });
                        });
                        refGenomesSet = {};
                        refContigsSet = {};
                    }
                    // For Fragmented Localized Repeats, highlight edges carried by fragmented event contigs as active (purple)
                    // and edges carried exclusively by contiguous reference contigs (bridging the contig break) as reference (green dashed)
                    if (type === 'fragmented_paralogs' && Object.keys(eventContigsSet).length > 0 && Object.keys(refContigsSet).length > 0) {
                        var newActiveEdgeSet = {};
                        var newRefEdgeSet = {};
                        var checkLocusEdge = function(eid) {
                            var eObj = GexfJS.graph.edgeLookup[eid];
                            if (!eObj || !eObj.sequences) return;
                            var hasEvSeq = false, hasRefSeq = false;
                            for (var seqId in eObj.sequences) {
                                if (eventContigsSet[seqId]) hasEvSeq = true;
                                if (refContigsSet[seqId]) hasRefSeq = true;
                            }
                            if (hasEvSeq) {
                                newActiveEdgeSet[eid] = true;
                            } else if (hasRefSeq) {
                                newRefEdgeSet[eid] = true;
                            }
                        };
                        focalIds.forEach(function(nid) {
                            (adjEdgesByNodeId[nid] || []).forEach(function(item) {
                                if (focalSet[item.neighborId] || boundaryAnchorSet[item.neighborId]) {
                                    checkLocusEdge(item.edge.id);
                                }
                            });
                        });
                        if (Object.keys(newActiveEdgeSet).length > 0) {
                            c.edgeIds = newActiveEdgeSet;
                            activeEdgeIds = Object.keys(newActiveEdgeSet);
                            Object.keys(newRefEdgeSet).forEach(function(reid) { referenceEdgeSet[reid] = true; });
                            Object.keys(newActiveEdgeSet).forEach(function(aeid) { delete referenceEdgeSet[aeid]; });
                        }
                    }
                } else if (type === 'breaks') {
                    eventRoleTitle = 'Fragmented / Repeat-Broken Contigs';
                    refRoleTitle = 'Bridging Scaffold Reference';
                    var bridgeContigs = {};
                    var bridgeGenomes = {};
                    var scaffoldTargetGenomes = {};
                    var svEntAttrId = GexfJS._edge_attr_value ? (GexfJS._edge_attr_value['sv_entities'] || GexfJS._edge_attr_value['scaffold_entities']) : undefined;
                    Object.keys(rawEdges).forEach(function(eid) {
                        if (!c.edgeIds[eid]) return;
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (!e) return;
                        if (e.genomes) Object.keys(e.genomes).forEach(function(g) { bridgeGenomes[g] = true; });
                        if (e.sequences) Object.keys(e.sequences).forEach(function(s) { bridgeContigs[s] = true; });
                        if (typeof svEntAttrId !== 'undefined' && e.attributes && e.attributes[svEntAttrId]) {
                            String(e.attributes[svEntAttrId]).split(',').forEach(function(tok) {
                                var g = tok.trim();
                                if (g && g !== 'None') scaffoldTargetGenomes[g] = true;
                            });
                        }
                    });
                    var locusContigsByGenome = {};
                    focalIds.concat(anchorIds).forEach(function(nid) {
                        var n = nodeById[nid];
                        if (!n || !n.sequences) return;
                        Object.keys(n.sequences).forEach(function(s) {
                            var g = contigToGenome[s];
                            if (g) {
                                if (!locusContigsByGenome[g]) locusContigsByGenome[g] = {};
                                locusContigsByGenome[g][s] = true;
                            }
                        });
                    });
                    focalIds.forEach(function(nid) {
                        var n = nodeById[nid];
                        if (!n) return;
                        var isBreakNode = (typeof breakAttrId !== 'undefined' && n.attributes && String(n.attributes[breakAttrId]).toLowerCase() === 'true');
                        if (n.sequences) {
                            Object.keys(n.sequences).forEach(function(s) {
                                var g = contigToGenome[s];
                                var gLocusContigCount = (g && locusContigsByGenome[g]) ? Object.keys(locusContigsByGenome[g]).length : 0;
                                if ((g && scaffoldTargetGenomes[g]) || gLocusContigCount > 1 || (!bridgeContigs[s] && isBreakNode)) {
                                    if (g) {
                                        eventGenomesSet[g] = true;
                                        if (locusContigsByGenome[g]) {
                                            Object.keys(locusContigsByGenome[g]).forEach(function(cs) { eventContigsSet[cs] = true; });
                                        }
                                    }
                                    eventContigsSet[s] = true;
                                }
                            });
                        }
                    });
                    Object.keys(scaffoldTargetGenomes).forEach(function(g) {
                        eventGenomesSet[g] = true;
                        if (locusContigsByGenome[g]) {
                            Object.keys(locusContigsByGenome[g]).forEach(function(cs) { eventContigsSet[cs] = true; });
                        }
                    });
                    Object.keys(locusContigsByGenome).forEach(function(g) {
                        if (!eventGenomesSet[g]) {
                            refGenomesSet[g] = true;
                            Object.keys(locusContigsByGenome[g]).forEach(function(cs) {
                                if (!eventContigsSet[cs]) refContigsSet[cs] = true;
                            });
                        }
                    });
                    Object.keys(bridgeContigs).forEach(function(s) {
                        var g = contigToGenome[s];
                        if (!eventContigsSet[s] && (!g || !eventGenomesSet[g])) {
                            refContigsSet[s] = true;
                            if (g) refGenomesSet[g] = true;
                        }
                    });
                    Object.keys(bridgeGenomes).forEach(function(g) {
                        if (!eventGenomesSet[g]) refGenomesSet[g] = true;
                    });
                    if (Object.keys(eventContigsSet).length === 0) {
                        focalIds.forEach(function(nid) {
                            var n = nodeById[nid];
                            if (n && n.sequences) Object.keys(n.sequences).forEach(function(s) { eventContigsSet[s] = true; });
                            if (n && n.genomes) Object.keys(n.genomes).forEach(function(g) { eventGenomesSet[g] = true; });
                        });
                    }
                } else if (type === 'inversions') {
                    // Recover relative orientation split across undirected inverted_block edges using polarity-normalized sequential feature positions
                    eventRoleTitle = 'Inverted / Minority Orientation (-)';
                    refRoleTitle = 'Majority / Consensus Orientation (+)';

                    var contigPol = _self.getContigPolarities();
                    var getFeatPosAndPeg = function(nodeObj, gid, sid) {
                        if (!nodeObj || !nodeObj.featureMap) return null;
                        var peg = null;
                        if (nodeObj.featureMap[gid] && nodeObj.featureMap[gid][sid] && nodeObj.featureMap[gid][sid][0]) {
                            var fid = String(nodeObj.featureMap[gid][sid][0]);
                            var m = fid.match(/(\d+)$/);
                            if (m) peg = parseInt(m[1], 10);
                        }
                        var pos = peg;
                        if (nodeObj.featureMap.info && nodeObj.featureMap.info[gid] && nodeObj.featureMap.info[gid][sid] &&
                            nodeObj.featureMap.info[gid][sid][0] && typeof nodeObj.featureMap.info[gid][sid][0].start !== 'undefined') {
                            var st = parseInt(nodeObj.featureMap.info[gid][sid][0].start, 10);
                            if (!isNaN(st)) pos = st;
                        }
                        return pos !== null ? { pos: pos, peg: peg } : null;
                    };

                    var allInvGenomes = Object.keys(genomeFocalContigs);
                    var focalContigToGenome = {};
                    allInvGenomes.forEach(function(g) {
                        Object.keys(genomeFocalContigs[g] || {}).forEach(function(s) {
                            focalContigToGenome[s] = g;
                        });
                    });

                    var contigPairSigns = {};
                    var contigSteps = {};
                    var contigNetNorm = {};

                    // 1. Compare polarity-normalized coordinate step direction across every internal edge of the inverted block
                    activeEdgeIds.forEach(function(eid) {
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (!e) return;
                        var uNode = GexfJS.graph.nodeList[e.source];
                        var vNode = GexfJS.graph.nodeList[e.target];
                        if (!uNode || !vNode || !uNode.featureMap || !vNode.featureMap) return;

                        var edgeContigDirs = {};
                        allInvGenomes.forEach(function(g) {
                            var uContigs = uNode.featureMap[g];
                            var vContigs = vNode.featureMap[g];
                            if (!uContigs || !vContigs) return;
                            for (var sid in uContigs) {
                                if (vContigs[sid]) {
                                    var uEntry = getFeatPosAndPeg(uNode, g, sid);
                                    var vEntry = getFeatPosAndPeg(vNode, g, sid);
                                    if (uEntry && vEntry && uEntry.pos !== vEntry.pos) {
                                        if (uEntry.peg !== null && vEntry.peg !== null && Math.abs(vEntry.peg - uEntry.peg) > 15) continue;
                                        var rawDir = (vEntry.pos > uEntry.pos) ? 1 : -1;
                                        var normDir = rawDir * (contigPol[sid] || 1);
                                        edgeContigDirs[sid] = normDir;
                                        contigSteps[sid] = (contigSteps[sid] || 0) + 1;
                                        contigNetNorm[sid] = (contigNetNorm[sid] || 0) + normDir;
                                        focalContigToGenome[sid] = g;
                                        if (!contigPairSigns[sid]) contigPairSigns[sid] = {};
                                    }
                                }
                            }
                        });

                        var dirContigs = Object.keys(edgeContigDirs);
                        for (var i = 0; i < dirContigs.length; i++) {
                            var c1 = dirContigs[i];
                            for (var j = i + 1; j < dirContigs.length; j++) {
                                var c2 = dirContigs[j];
                                var prod = edgeContigDirs[c1] * edgeContigDirs[c2];
                                contigPairSigns[c1][c2] = (contigPairSigns[c1][c2] || 0) + prod;
                                contigPairSigns[c2][c1] = (contigPairSigns[c2][c1] || 0) + prod;
                            }
                        }
                    });

                    // 2. Reinforce with boundary edges connecting flanking anchors to opposite ends of the inverted block
                    anchorIds.forEach(function(aid) {
                        var inc = adjEdgesByNodeId[aid] || [];
                        var boundaryContigGroups = [];
                        inc.forEach(function(item) {
                            if (focalSet[item.neighborId] && item.edge) {
                                var bContigs = [];
                                if (item.edge.sequences && Object.keys(item.edge.sequences).length > 0) {
                                    Object.keys(item.edge.sequences).forEach(function(s) {
                                        if (focalContigToGenome[s]) bContigs.push(s);
                                    });
                                } else if (item.edge.genomes) {
                                    Object.keys(item.edge.genomes).forEach(function(g) {
                                        Object.keys(genomeFocalContigs[g] || {}).forEach(function(s) {
                                            bContigs.push(s);
                                        });
                                    });
                                }
                                if (bContigs.length > 0) {
                                    bContigs.forEach(function(s) {
                                        if (!contigPairSigns[s]) contigPairSigns[s] = {};
                                        if (!contigSteps[s]) contigSteps[s] = 1;
                                    });
                                    boundaryContigGroups.push(bContigs);
                                }
                            }
                        });
                        if (boundaryContigGroups.length > 1) {
                            for (var b1 = 0; b1 < boundaryContigGroups.length; b1++) {
                                var cs1 = boundaryContigGroups[b1];
                                for (var p = 0; p < cs1.length; p++) {
                                    for (var q = p + 1; q < cs1.length; q++) {
                                        var s1 = cs1[p], s2 = cs1[q];
                                        contigPairSigns[s1][s2] = (contigPairSigns[s1][s2] || 0) + 2;
                                        contigPairSigns[s2][s1] = (contigPairSigns[s2][s1] || 0) + 2;
                                    }
                                }
                                for (var b2 = b1 + 1; b2 < boundaryContigGroups.length; b2++) {
                                    var cs2 = boundaryContigGroups[b2];
                                    cs1.forEach(function(sa) {
                                        cs2.forEach(function(sb) {
                                            if (sa !== sb) {
                                                contigPairSigns[sa][sb] = (contigPairSigns[sa][sb] || 0) - 2;
                                                contigPairSigns[sb][sa] = (contigPairSigns[sb][sa] || 0) - 2;
                                            }
                                        });
                                    });
                                }
                            }
                        }
                    });

                    // 3. Partition active locus contigs into two orientation groups (grpA vs grpB)
                    var activeInvContigs = Object.keys(contigSteps);
                    if (activeInvContigs.length > 0) {
                        var seedC = activeInvContigs[0];
                        var bestScore = -1;
                        var bestSteps = -1;
                        activeInvContigs.forEach(function(c) {
                            var sScore = 0;
                            for (var other in contigPairSigns[c]) {
                                sScore += Math.abs(contigPairSigns[c][other]);
                            }
                            var st = contigSteps[c] || 0;
                            if (sScore > bestScore || (sScore === bestScore && st > bestSteps)) {
                                bestScore = sScore;
                                bestSteps = st;
                                seedC = c;
                            }
                        });

                        var grpA = [seedC];
                        var grpB = [];
                        activeInvContigs.forEach(function(c) {
                            if (c === seedC) return;
                            var rel = (contigPairSigns[seedC] && typeof contigPairSigns[seedC][c] === 'number') ? contigPairSigns[seedC][c] : 0;
                            if (rel < 0) {
                                grpB.push(c);
                            } else {
                                grpA.push(c);
                            }
                        });

                        if (grpB.length > 0) {
                            var minMainSteps = Math.max(1, Math.floor(focalIds.length * 0.05));
                            var getMainGenomes = function(cArr) {
                                var gSet = {};
                                cArr.forEach(function(c) {
                                    if ((contigSteps[c] || 0) >= minMainSteps && focalContigToGenome[c]) {
                                        gSet[focalContigToGenome[c]] = true;
                                    }
                                });
                                if (Object.keys(gSet).length === 0) {
                                    cArr.forEach(function(c) {
                                        if (focalContigToGenome[c]) gSet[focalContigToGenome[c]] = true;
                                    });
                                }
                                return gSet;
                            };

                            var gASet = getMainGenomes(grpA);
                            var gBSet = getMainGenomes(grpB);
                            var gACount = Object.keys(gASet).length;
                            var gBCount = Object.keys(gBSet).length;
                            var stepsA = 0, stepsB = 0, netNormA = 0, netNormB = 0;
                            grpA.forEach(function(c) { stepsA += (contigSteps[c] || 0); netNormA += (contigNetNorm[c] || 0); });
                            grpB.forEach(function(c) { stepsB += (contigSteps[c] || 0); netNormB += (contigNetNorm[c] || 0); });

                            var invContigs = grpB;
                            var refContigs = grpA;
                            if (gACount < gBCount || (gACount === gBCount && (stepsA < stepsB || (stepsA === stepsB && netNormA < netNormB)))) {
                                invContigs = grpA;
                                refContigs = grpB;
                            }
                            if (gACount === gBCount) {
                                eventRoleTitle = 'Orientation B (Inverted vs. A)';
                                refRoleTitle = 'Orientation A (Reference)';
                            }

                            var invMainGenomes = getMainGenomes(invContigs);
                            var refMainGenomes = getMainGenomes(refContigs);

                            invContigs.forEach(function(s) {
                                var g = focalContigToGenome[s];
                                if ((contigSteps[s] || 0) < minMainSteps && g && refMainGenomes[g] && !invMainGenomes[g]) return;
                                eventContigsSet[s] = true;
                                if (g) eventGenomesSet[g] = true;
                            });
                            refContigs.forEach(function(s) {
                                var g = focalContigToGenome[s];
                                if ((contigSteps[s] || 0) < minMainSteps && g && invMainGenomes[g] && !refMainGenomes[g]) return;
                                refContigsSet[s] = true;
                                if (g) refGenomesSet[g] = true;
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
                                    if (dashedEdges) dashedEdges[reid] = true;
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
                } else if (type === 'rearrangement_junctions') {
                    eventRoleTitle = 'Rearrangement Junction Carriers';
                    refRoleTitle = 'Collinear Reference Flanking Blocks';
                    activeEdgeIds.forEach(function(eid) {
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { eventGenomesSet[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { eventContigsSet[s] = true; });
                    });
                    focalIds.forEach(function(nid) {
                        var n = nodeById[nid];
                        if (n && n.genomes) {
                            Object.keys(n.genomes).forEach(function(g) {
                                if (!eventGenomesSet[g]) refGenomesSet[g] = true;
                            });
                        }
                        if (n && n.sequences) {
                            Object.keys(n.sequences).forEach(function(s) {
                                if (!eventContigsSet[s]) refContigsSet[s] = true;
                            });
                        }
                    });
                } else if (type === 'rearrangements') {
                    eventRoleTitle = 'Anchor Collision / Breakpoint Carriers';
                    refRoleTitle = 'Single-Locus Reference Flanking Blocks';
                    var bpJuncGenomes = {};
                    var bpJuncContigs = {};
                    activeEdgeIds.forEach(function(eid) {
                        var e = GexfJS.graph.edgeLookup[eid];
                        if (e && e.genomes) Object.keys(e.genomes).forEach(function(g) { bpJuncGenomes[g] = true; });
                        if (e && e.sequences) Object.keys(e.sequences).forEach(function(s) { bpJuncContigs[s] = true; });
                    });
                    var locusContigsByG = {};
                    focalIds.concat(anchorIds).forEach(function(nid) {
                        var n = nodeById[nid];
                        if (!n || !n.sequences) return;
                        Object.keys(n.sequences).forEach(function(s) {
                            var g = contigToGenome[s];
                            if (g) {
                                if (!locusContigsByG[g]) locusContigsByG[g] = {};
                                locusContigsByG[g][s] = true;
                            }
                        });
                    });
                    var multiOrJuncG = {};
                    var singleRefG = {};
                    Object.keys(locusContigsByG).forEach(function(g) {
                        var cCount = Object.keys(locusContigsByG[g]).length;
                        var fCount = genomeFocalContigs[g] ? Object.keys(genomeFocalContigs[g]).length : 0;
                        if (bpJuncGenomes[g] || fCount > 1 || cCount > 1 || (genomeCopies[g] || 0) > 1) {
                            multiOrJuncG[g] = true;
                        } else {
                            singleRefG[g] = true;
                        }
                    });
                    if (Object.keys(multiOrJuncG).length > 0 && Object.keys(singleRefG).length > 0) {
                        Object.keys(multiOrJuncG).forEach(function(g) {
                            eventGenomesSet[g] = true;
                            Object.keys(locusContigsByG[g] || {}).forEach(function(s) { eventContigsSet[s] = true; });
                        });
                        Object.keys(bpJuncContigs).forEach(function(s) { eventContigsSet[s] = true; });
                        Object.keys(singleRefG).forEach(function(g) {
                            refGenomesSet[g] = true;
                            Object.keys(locusContigsByG[g] || {}).forEach(function(s) {
                                if (!eventContigsSet[s]) refContigsSet[s] = true;
                            });
                        });
                    } else {
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
                } else {
                    // Superbubbles, Alt Paths, Translocation Bridges
                    if (type === 'superbubbles') {
                        eventRoleTitle = 'Interior Allele / Cassette Carriers';
                        refRoleTitle = 'Conserved Boundary / Alternate Carriers';
                    } else if (type === 'alt_paths') {
                        eventRoleTitle = 'Accessory Island / Indel Carriers';
                        refRoleTitle = 'Backbone Reference (Without Detour)';
                    } else if (type === 'translocation_bridges') {
                        eventRoleTitle = 'Translocation / Replicon Bridge Carriers';
                        refRoleTitle = 'Unbridged / Separate Replicon Reference';
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

                // Any genome/contig on the flanking anchors not already in eventGenomesSet/eventContigsSet is part of the flanking reference context;
                // anchor contigs belonging to an event-only genome stay in eventContigsSet so all locus contigs of that genome remain grouped together.
                Object.keys(allAnchorGenomes).forEach(function(g) {
                    if (!eventGenomesSet[g]) refGenomesSet[g] = true;
                });
                Object.keys(allAnchorContigs).forEach(function(s) {
                    if (eventContigsSet[s] || refContigsSet[s]) return;
                    var g = contigToGenome[s];
                    if (g && eventGenomesSet[g] && !refGenomesSet[g]) {
                        eventContigsSet[s] = true;
                    } else {
                        refContigsSet[s] = true;
                    }
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
                var cnvSet = {};
                if (typeof cnvAttrId !== 'undefined') {
                    focalIds.forEach(function(nid) {
                        var n = nodeById[nid];
                        var val = (n && n.attributes && n.attributes[cnvAttrId]) ? String(n.attributes[cnvAttrId]).trim() : '';
                        if (val && val !== 'None' && val !== '0') cnvSet[val] = true;
                    });
                }

                // For Remote CNV Clusters, partition focalIds into spatially distinct copy sites (<= 4 hops)
                var remoteSites = [];
                if (type === 'remote_cnv' && focalIds.length > 1) {
                    var sParent = {};
                    var inFocal = {};
                    focalIds.forEach(function(id) { sParent[id] = id; inFocal[id] = true; });
                    var sFind = function(x) {
                        while (sParent[x] !== x) {
                            sParent[x] = sParent[sParent[x]];
                            x = sParent[x];
                        }
                        return x;
                    };
                    focalIds.forEach(function(startId) {
                        var q = [{ id: startId, d: 0 }];
                        var seen = {};
                        seen[startId] = true;
                        for (var qi = 0; qi < q.length; qi++) {
                            var item = q[qi];
                            if (item.d >= 4) continue;
                            var inc = adjEdgesByNodeId[item.id] || [];
                            for (var ii = 0; ii < inc.length; ii++) {
                                var nb = inc[ii].neighborId;
                                if (!seen[nb]) {
                                    seen[nb] = true;
                                    if (inFocal[nb]) {
                                        var ra = sFind(startId), rb = sFind(nb);
                                        if (ra !== rb) sParent[ra] = rb;
                                    }
                                    q.push({ id: nb, d: item.d + 1 });
                                }
                            }
                        }
                    });
                    var siteGroups = {};
                    focalIds.forEach(function(id) {
                        var r = sFind(id);
                        if (!siteGroups[r]) siteGroups[r] = [];
                        siteGroups[r].push(id);
                    });
                    var blockAttrId = GexfJS._node_attr_value ? GexfJS._node_attr_value['block'] : undefined;
                    Object.keys(siteGroups).forEach(function(rk) {
                        var sFocal = siteGroups[rk];
                        var sAnchors = {};
                        var sBlocks = {};
                        sFocal.forEach(function(fid) {
                            var nObj = nodeById[fid];
                            if (nObj && nObj.attributes && typeof blockAttrId !== 'undefined' && nObj.attributes[blockAttrId]) {
                                var bVal = String(nObj.attributes[blockAttrId]).trim();
                                if (bVal && bVal !== 'None') sBlocks[bVal] = true;
                            }
                            (adjEdgesByNodeId[fid] || []).forEach(function(item) {
                                if (!inFocal[item.neighborId]) sAnchors[item.neighborId] = true;
                            });
                        });
                        var blkKeys = Object.keys(sBlocks);
                        remoteSites.push({
                            focalNodeIds: sFocal,
                            anchorNodeIds: Object.keys(sAnchors),
                            blockLabel: blkKeys.length > 0 ? blkKeys.join('/') : 'Locus'
                        });
                    });
                    remoteSites.sort(function(a, b) { return b.focalNodeIds.length - a.focalNodeIds.length; });
                }

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
                    cnvClusters: Object.keys(cnvSet),
                    remoteSites: remoteSites,
                    relatedParalogLoci: [],
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
                var siteTag = (loc.remoteSites && loc.remoteSites.length > 1) ? (loc.remoteSites.length + ' sites, ') : '';
                loc.dropdownLabel = '#' + (idx + 1) + ': ' + loc.shortTitle + ' (' + siteTag + loc.focalNodeIds.length + (loc.focalNodeIds.length === 1 ? ' gene, ' : ' genes, ') + loc.genomeCount + ' gen)';
            });

            // Cross-reference spatially separated loci that share any cnv_cluster_id
            for (var li = 0; li < loci.length; li++) {
                var lA = loci[li];
                if (!lA.cnvClusters || lA.cnvClusters.length === 0) continue;
                var setA = {};
                lA.cnvClusters.forEach(function(cid) { setA[cid] = true; });
                for (var lj = 0; lj < loci.length; lj++) {
                    if (li === lj) continue;
                    var lB = loci[lj];
                    if (!lB.cnvClusters || lB.cnvClusters.length === 0) continue;
                    var shared = lB.cnvClusters.filter(function(cid) { return Boolean(setA[cid]); });
                    if (shared.length > 0) {
                        lA.relatedParalogLoci.push({
                            index: lB.index,
                            shortTitle: lB.shortTitle,
                            sharedClusters: shared
                        });
                    }
                }
            }

            return loci;
        },

        getRoleGenomeContigs: function(loc, isEvent, phenomType) {
            if (!loc) return { gKeys: [], byGenome: {} };
            var gids = isEvent ? (loc.eventGenomes || []) : (loc.refGenomes || []);
            var cids = isEvent ? (loc.eventContigs || []) : (loc.refContigs || []);
            var oppositeContigSet = {};
            var oppList = isEvent ? (loc.refContigs || []) : (loc.eventContigs || []);
            oppList.forEach(function(c) { oppositeContigSet[c] = true; });

            var byGenome = {};
            cids.forEach(function(cid) {
                var gid = (loc.contigToGenome && loc.contigToGenome[cid]) ? loc.contigToGenome[cid] : 'unknown';
                if (!byGenome[gid]) byGenome[gid] = [];
                if (byGenome[gid].indexOf(cid) === -1) byGenome[gid].push(cid);
            });
            gids.forEach(function(gid) {
                if (!byGenome[gid]) byGenome[gid] = [];
                Object.keys(loc.allLocusContigs || {}).forEach(function(cid) {
                    if (loc.contigToGenome && loc.contigToGenome[cid] === gid && !oppositeContigSet[cid]) {
                        if (byGenome[gid].indexOf(cid) === -1) byGenome[gid].push(cid);
                    }
                });
                if (byGenome[gid].length === 0) {
                    Object.keys(loc.allLocusContigs || {}).forEach(function(cid) {
                        if (loc.contigToGenome && loc.contigToGenome[cid] === gid && byGenome[gid].indexOf(cid) === -1) {
                            byGenome[gid].push(cid);
                        }
                    });
                }
            });

            var gKeys = Object.keys(byGenome);
            var preferMultiContigEvent = Boolean(
                isEvent && (phenomType === 'fragmented_paralogs' || phenomType === 'breaks' || phenomType === 'rearrangements') &&
                gKeys.some(function(g) { return (byGenome[g] || []).length >= 2; })
            );
            var totalAssemblyContigs = function(gid) {
                if (window.GexfJS && GexfJS.graph && GexfJS.graph.contig_map && GexfJS.graph.contig_map[gid]) {
                    return GexfJS.graph.contig_map[gid].length;
                }
                return 999999;
            };

            gKeys.sort(function(a, b) {
                var lenA = (byGenome[a] || []).length;
                var lenB = (byGenome[b] || []).length;
                if ((lenA === 0) !== (lenB === 0)) return lenA === 0 ? 1 : -1;
                if (preferMultiContigEvent) {
                    var multiA = lenA >= 2 ? 0 : 1;
                    var multiB = lenB >= 2 ? 0 : 1;
                    if (multiA !== multiB) return multiA - multiB;
                }
                if (lenA !== lenB) return lenA - lenB;
                var totA = totalAssemblyContigs(a);
                var totB = totalAssemblyContigs(b);
                if (totA !== totB) return totA - totB;
                return String(a).localeCompare(String(b));
            });

            return { gKeys: gKeys, byGenome: byGenome };
        },

        getDefaultLocusSpotlightContigs: function(loc, phenomType) {
            var exemplarTypes = {
                'tandem_repeats': true,
                'fragmented_paralogs': true,
                'rearrangements': true,
                'rearrangement_junctions': true,
                'translocation_bridges': true,
                'inversions': true,
                'breaks': true
            };
            if (!loc || !exemplarTypes[phenomType]) return {};

            var spot = {};
            var evRole = this.getRoleGenomeContigs(loc, true, phenomType);
            var refRole = this.getRoleGenomeContigs(loc, false, phenomType);

            var pickedEvGid = null;
            for (var i = 0; i < evRole.gKeys.length; i++) {
                var eg = evRole.gKeys[i];
                if (evRole.byGenome[eg] && evRole.byGenome[eg].length > 0) {
                    pickedEvGid = eg;
                    evRole.byGenome[eg].forEach(function(cid) {
                        spot[cid] = 'event';
                    });
                    break;
                }
            }

            var pickedRefGid = null;
            for (var j = 0; j < refRole.gKeys.length; j++) {
                var rg = refRole.gKeys[j];
                if (rg === pickedEvGid) continue;
                if (refRole.byGenome[rg] && refRole.byGenome[rg].length > 0) {
                    pickedRefGid = rg;
                    refRole.byGenome[rg].forEach(function(cid) {
                        if (!spot[cid]) spot[cid] = 'reference';
                    });
                    break;
                }
            }
            if (!pickedRefGid) {
                for (var k = 0; k < refRole.gKeys.length; k++) {
                    var rg2 = refRole.gKeys[k];
                    if (refRole.byGenome[rg2] && refRole.byGenome[rg2].length > 0) {
                        refRole.byGenome[rg2].forEach(function(cid) {
                            if (!spot[cid]) spot[cid] = 'reference';
                        });
                        break;
                    }
                }
            }

            return spot;
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
                var contigPol = this.getContigPolarities();
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
                    var peg = pegNums.length > 0 ? pegNums[0] : null;
                    if (pos === null && peg !== null) pos = peg;
                    var tag = pegNums.length > 0 ? ('peg.' + pegNums.join(',')) : cid;
                    return { pos: pos, peg: peg, tag: tag };
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
                                if (uInfo.peg === null || vInfo.peg === null || Math.abs(vInfo.peg - uInfo.peg) <= 50) {
                                    var rawDir = (vInfo.pos > uInfo.pos) ? 1 : -1;
                                    var cPol = (contigPol && contigPol[cid]) ? contigPol[cid] : 1;
                                    dir = rawDir * cPol;
                                }
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
                var siteIdx = (typeof GexfJS.params.activeRemoteSiteIndex === 'number') ? GexfJS.params.activeRemoteSiteIndex : -1;
                var frameNodeIds = (loc.remoteSites && siteIdx >= 0 && siteIdx < loc.remoteSites.length)
                    ? loc.remoteSites[siteIdx].focalNodeIds.concat(loc.remoteSites[siteIdx].anchorNodeIds)
                    : loc.focalNodeIds.concat(loc.anchorNodeIds);
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
                    GexfJS.params.zoomLevel = Math.max(0, Math.min(15, idealZoom));
                    if (window.$ && $("#zoomSlider").length) {
                        try { $("#zoomSlider").slider("value", GexfJS.params.zoomLevel); } catch (e) {}
                    }
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
            html += '<div style="margin-bottom:5px;"><b>1. Accessory &amp; Allelic Variation:</b><br>&bull; <i>Bounded Variable Loci (Superbubbles &amp; Local Islands/Indels):</i> Cleanly bounded multi-allelic replacements, metabolic cassettes, strain-specific genomic islands, prophages, or local indels flanked by conserved collinear anchor genes on the same replicon.</div>';
            html += '<div style="margin-bottom:5px;"><b>2. Repeats &amp; Paralog Expansion:</b><br>&bull; <i>Local / Tandem CNVs:</i> Co-localized tandem gene duplications and local paralogous copy-number expansions.<br>&bull; <i>Fragmented Localized Repeats (Fragmented CNV):</i> Localized repeats that are contiguous on reference contigs but split across multiple contigs in incomplete or misassembled genomes.<br>&bull; <i>Remote CNV Clusters (Segmental Paralogs):</i> Multi-gene (&ge;<i>k</i>) paralogous operons, segmental duplications, or mobile cassettes present at two or more spatially disconnected chromosomal loci.</div>';
            html += '<div style="margin-bottom:5px;"><b>3. Chromosomal Architecture:</b><br>&bull; <i>Synteny Breakpoints (Anchor Collisions):</i> Conserved multi-gene anchor sequences where TFS homology signals from different contigs/loci collide.<br>&bull; <i>Rearrangement Junctions (Jump Edges):</i> Direct non-bubble transition edges jumping across inversion or translocation boundaries without intervening bridge genes.<br>&bull; <i>Translocation &amp; Replicon Bridges:</i> Multi-gene bridge paths connecting flanking anchors that reside on different replicons/contigs or distant chromosomal loci in reference genomes.<br>&bull; <i>Inverted Syntenic Blocks:</i> Contiguous gene chains reversed in orientation relative to the polarity-normalized contig walk.</div>';
            html += '<div><b>4. Assembly &amp; Scaffolding:</b><br>&bull; <i>Repeat Breaks &amp; Scaffolds:</i> Contig ends shattered inside shared repetitive elements paired with candidate reference-guided scaffold bridges.</div>';
            html += '</div></details>';

            // Map the old/new summary counts safely
            var cnvClass = this.getCnvClassification();
            var countSuperbubbles = s.superbubbles || s.is_superbubble || 0;
            var countTandem = (typeof s.local_cnv !== 'undefined') ? s.local_cnv : (cnvClass.localClusterCount || s.copy_number_variants || s.tandem_repeats || s.cnv_clusters || 0);
            var countFragmented = (typeof s.remote_cnv !== 'undefined') ? (s.fragmented_cnv || 0) : cnvClass.fragClusterCount;
            var countRemoteCnv = (typeof s.remote_cnv !== 'undefined') ? s.remote_cnv : cnvClass.remoteClusterCount;
            var countAltPaths = s.alternative_paths || s.alt_paths || 0;
            var unifiedBoundedLoci = this.getPhenomenonData('superbubbles').loci.length;
            var countBoundedVariableLoci = unifiedBoundedLoci > 0 ? unifiedBoundedLoci : (countSuperbubbles + countAltPaths);
            var countRearrangements = (typeof s.rearrangement_junctions !== 'undefined')
                ? (s.structural_rearrangements || 0)
                : this.getPhenomenonData('rearrangements').loci.length;
            var countRearrangementJunctions = (typeof s.rearrangement_junctions !== 'undefined')
                ? s.rearrangement_junctions
                : Object.keys(this.getPhenomenonData('rearrangement_junctions').rawEdges || {}).length;
            var countTranslocationBridges = (typeof s.translocation_bridges !== 'undefined')
                ? s.translocation_bridges
                : this.getPhenomenonData('translocation_bridges').loci.length;
            var countInversions = s.inverted_blocks || s.inversions || 0;
            var countBreaks = s.assembly_breaks || s.scaffolds || 0;

            var activePhenom = (window.GexfJS && GexfJS.params) ? GexfJS.params.activePhenomenon : null;

            var phenomenaMeta = {
                'superbubbles': {
                    label: 'Bounded Variable Loci',
                    graphTerm: 'Superbubbles & Local Indels / Islands',
                    subtitle: 'Allelic swaps, cassettes, local genomic islands & indels between collinear anchors',
                    count: countBoundedVariableLoci,
                    nodesDesc: 'Conserved collinear boundary anchors and interior allelic, cassette, or island gene families',
                    edgesDesc: 'Alternative allelic paths, local island insertions, and indel bypass edges',
                    tsvReport: '*_superbubbles.tsv, *_structural_variants.tsv'
                },
                'alt_paths': {
                    label: 'Accessory Islands & Indels',
                    graphTerm: 'Alt Paths',
                    subtitle: 'Local genomic islands, prophages & HGT insertions between collinear anchors',
                    count: countAltPaths,
                    nodesDesc: 'Inserted accessory island genes and collinear flanking backbone anchors',
                    edgesDesc: 'Internal island edges and entry/exit insertion junctions',
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
                    nodesDesc: 'Localized repeat alternate nodes split across multiple contigs',
                    edgesDesc: 'Repeat fragmentation junctions connecting split repeat copies',
                    tsvReport: '*_mobilized_gene_families.tsv'
                },
                'remote_cnv': {
                    label: 'Remote CNV Clusters',
                    graphTerm: 'Segmental Paralogs',
                    subtitle: 'Multi-gene paralogous operons, segmental duplications & dispersed repeat cassettes at distant loci',
                    count: countRemoteCnv,
                    nodesDesc: 'Multi-gene repeat clusters resolved into two or more spatially separate chromosomal loci',
                    edgesDesc: 'Internal cassette edges and flanking chromosomal connections at each paralogous locus',
                    tsvReport: '*_mobilized_gene_families.tsv'
                },
                'rearrangements': {
                    label: 'Synteny Breakpoints',
                    graphTerm: 'Anchor Collisions',
                    subtitle: 'Conserved multi-gene anchor nodes where cross-contig TFS signals collide',
                    count: countRearrangements,
                    nodesDesc: 'Anchor-collision synteny breakpoint nodes (c1_conflict)',
                    edgesDesc: 'Incident breakpoint junction edges connecting divergent genomic contexts',
                    tsvReport: '*_structural_variants.tsv'
                },
                'rearrangement_junctions': {
                    label: 'Rearrangement Junctions',
                    graphTerm: 'Jump Edges',
                    subtitle: 'Direct non-bubble transition edges across inversion or translocation boundaries',
                    count: countRearrangementJunctions,
                    nodesDesc: 'Conserved boundary genes joined directly across a rearrangement seam',
                    edgesDesc: 'Direct intra-contig and inter-contig rearrangement jump edges',
                    tsvReport: '*_structural_variants.tsv'
                },
                'translocation_bridges': {
                    label: 'Translocation & Replicon Bridges',
                    graphTerm: 'Cross-Locus Bridges',
                    subtitle: 'Multi-gene paths welding together separate replicons or distant chromosomal loci',
                    count: countTranslocationBridges,
                    nodesDesc: 'Bridge-specific genes and flanking anchors on the bridged replicons/loci',
                    edgesDesc: 'Internal bridge path edges and entry/exit bridge junctions',
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
                    graphTerm: 'Scaffold Bridges',
                    subtitle: 'Contig ends shattered at repeats with reference-guided scaffold paths',
                    count: countBreaks,
                    nodesDesc: 'Contig terminal repeat nodes and candidate scaffold bridge nodes',
                    edgesDesc: 'Inferred syntenic scaffold paths bridging fragmented contigs',
                    tsvReport: '*_scaffold_recommendations.tsv'
                }
            };

            var categories = [
                { title: '1. Accessory & Allelic Variation', keys: ['superbubbles'] },
                { title: '2. Repeats & Paralog Expansion', keys: ['tandem_repeats', 'fragmented_paralogs', 'remote_cnv'] },
                { title: '3. Chromosomal Architecture', keys: ['rearrangements', 'rearrangement_junctions', 'translocation_bridges', 'inversions'] },
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
                var hasDashed = (activePhenom === 'breaks' || activePhenom === 'rearrangements' || activePhenom === 'rearrangement_junctions' || activePhenom === 'translocation_bridges' || activePhenom === 'inversions');
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
                        if (curLoc.remoteSites && curLoc.remoteSites.length > 1) {
                            var curSiteIdx = (window.GexfJS && GexfJS.params && typeof GexfJS.params.activeRemoteSiteIndex === 'number') ? GexfJS.params.activeRemoteSiteIndex : -1;
                            html += '<div style="margin-bottom:5px;"><b style="color:#01579b;">Remote Copy Sites (' + curLoc.remoteSites.length + '):</b><br>';
                            var allSiteStyle = (curSiteIdx === -1)
                                ? 'display:inline-block; margin:2px 3px 2px 0; padding:1px 7px; background:#0277bd; border:1px solid #01579b; border-radius:10px; color:#fff; font-weight:bold; text-decoration:none; font-size:0.86em;'
                                : 'display:inline-block; margin:2px 3px 2px 0; padding:1px 7px; background:#e1f5fe; border:1px solid #0288d1; border-radius:10px; color:#01579b; font-weight:bold; text-decoration:none; font-size:0.86em;';
                            html += '<a href="javascript:void(0)" style="' + allSiteStyle + '" onclick="window.focusRemoteSite(-1); return false;" title="Zoom out to frame all ' + curLoc.remoteSites.length + ' remote copy sites of this cluster">All ' + curLoc.remoteSites.length + ' Sites</a>';
                            curLoc.remoteSites.slice(0, 10).forEach(function(st, sIdx) {
                                var isSelSite = (curSiteIdx === sIdx);
                                var sStyle = isSelSite
                                    ? 'display:inline-block; margin:2px 3px 2px 0; padding:1px 7px; background:#0277bd; border:1px solid #01579b; border-radius:10px; color:#fff; font-weight:bold; text-decoration:none; font-size:0.86em;'
                                    : 'display:inline-block; margin:2px 3px 2px 0; padding:1px 7px; background:#e1f5fe; border:1px solid #0288d1; border-radius:10px; color:#01579b; font-weight:bold; text-decoration:none; font-size:0.86em;';
                                var sLabel = 'Site #' + (sIdx + 1) + ': ' + st.blockLabel + ' (' + st.focalNodeIds.length + ')';
                                html += '<a href="javascript:void(0)" style="' + sStyle + '" onclick="window.focusRemoteSite(' + sIdx + '); return false;" title="Zoom camera to remote copy Site #' + (sIdx + 1) + ' while keeping all remote copies highlighted">' + sLabel + '</a>';
                            });
                            if (curLoc.remoteSites.length > 10) {
                                html += '<span style="font-size:0.85em; color:#777;"> +' + (curLoc.remoteSites.length - 10) + ' more</span>';
                            }
                            html += '</div>';
                        }
                        if (curLoc.relatedParalogLoci && curLoc.relatedParalogLoci.length > 0) {
                            html += '<div style="margin-bottom:5px;"><b style="color:#0277bd;">Distant Paralogous Loci (' + curLoc.relatedParalogLoci.length + '):</b><br>';
                            var maxRel = 8;
                            curLoc.relatedParalogLoci.slice(0, maxRel).forEach(function(rel) {
                                var relNum = rel.index + 1;
                                var cText = rel.sharedClusters && rel.sharedClusters.length > 0 ? (' [CNV ' + rel.sharedClusters.slice(0, 3).join(',') + ']') : '';
                                var safeRelLbl = ('Locus #' + relNum + ': ' + rel.shortTitle + cText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                                html += '<a href="javascript:void(0)" style="display:inline-block; margin:2px 3px 2px 0; padding:1px 6px; background:#e1f5fe; border:1px solid #0288d1; border-radius:10px; color:#01579b; font-weight:bold; text-decoration:none; font-size:0.88em;" onclick="window.selectPhenomenonLocus(' + rel.index + '); return false;" title="Jump to distant paralogous copy at Locus #' + relNum + '">' + safeRelLbl + ' &#8599;</a>';
                            });
                            if (curLoc.relatedParalogLoci.length > maxRel) {
                                html += '<span style="font-size:0.85em; color:#777;"> +' + (curLoc.relatedParalogLoci.length - maxRel) + ' more</span>';
                            }
                            html += '</div>';
                        }

                        // Relative Genome & Contig Comparison (Event Carriers vs. Flanking / Backbone Reference)
                        var formatGenomeList = function(gids, cids, isEvent) {
                            if (gids.length === 0 && cids.length === 0) return '<span style="color:#888; font-style:italic;">None</span>';
                            var maxItems = 6;
                            var items = [];
                            var roleData = self.getRoleGenomeContigs(curLoc, isEvent, activePhenom);
                            var byGenome = roleData.byGenome;
                            var gKeys = roleData.gKeys;
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
                var activeBlocks = (window.GexfJS && GexfJS.params && GexfJS.params.activeBlockFilter) ? GexfJS.params.activeBlockFilter : {};
                var blockFilterCount = Object.keys(activeBlocks).length;
                var blockFilterActive = blockFilterCount > 0;

                html += '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">';
                html += '<h4 style="margin:0;">Syntenic Blocks</h4>';
                if (blockFilterActive) {
                    html += '<a href="javascript:void(0)" onclick="window.resetBlockFilter(); return false;" style="font-size:0.8em; padding:2px 8px; background:#d9534f; color:#fff; border-radius:10px; text-decoration:none; font-weight:bold;" title="Clear all active block filters and restore the full graph">Reset Filter (' + blockFilterCount + ')</a>';
                } else {
                    html += '<span style="font-size:0.78em; color:#777;" title="Click an eye icon next to any block to isolate it in the graph"><i class="fa icon-eye"></i> click eye to filter</span>';
                }
                html += '</div>';
                html += '<div style="font-size:0.78em; color:#666; margin-bottom:5px;">Auto-pinned by block color; click a block to highlight or its eye icon to filter</div>';
                html += '<div style="max-height: 250px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; font-size: 0.9em; background-color: #fafafa; margin-bottom: 15px;">';
                html += '<ul style="margin:0; padding-left:4px; list-style-type: none;">';
                
                s['block_manifest'].forEach(function(blockName) {
                    var isBlockActive = Boolean(activeBlocks[blockName]);
                    var bEyeClass = (blockFilterActive && !isBlockActive) ? 'fa icon-eye-slash' : 'fa icon-eye';
                    var bEyeStyle = isBlockActive
                        ? 'cursor:pointer; margin-right:6px; color:#1f77b4; background:#dbeeff; padding:2px 4px; border-radius:4px; border:1px solid #90caf9;'
                        : (blockFilterActive
                            ? 'cursor:pointer; margin-right:6px; color:#bbb; padding:2px 4px;'
                            : 'cursor:pointer; margin-right:6px; color:#888; padding:2px 4px;');
                    var bEyeTitle = isBlockActive
                        ? 'Block is visible in graph filter (click to remove from filter)'
                        : (blockFilterActive
                            ? 'Block is hidden (click to add this block to the visible graph)'
                            : 'Isolate this block in the graph (hide unselected blocks)');
                    var bRowOpacity = (blockFilterActive && !isBlockActive) ? '0.6' : '1.0';

                    html += '<li style="margin-bottom:3px; display:flex; align-items:center; opacity:' + bRowOpacity + ';">';
                    html += '<i class="' + bEyeClass + '" style="' + bEyeStyle + '" onclick="window.toggleBlockFilter(\'' + blockName + '\', event); return false;" title="' + bEyeTitle + '"></i>';
                    html += '<a href="javascript:void(0)" onclick="window.highlightSpecial(\'block\', \'' + blockName + '\'); return false;" title="Highlight Block: ' + blockName + '">' + blockName + '</a>';
                    html += '</li>';
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
            this.selection = [];
            if (this.selectionActionBar) {
                this.selectionActionBar.set('selection', []);
            }
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
                    'fragmented_paralogs': 'Fragmented Localized Repeats (Fragmented CNV)',
                    'rearrangements': 'Synteny Breakpoints (Anchor Collisions)',
                    'rearrangement_junctions': 'Rearrangement Junctions (Jump Edges)',
                    'translocation_bridges': 'Translocation & Replicon Bridges',
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

                // --- BLOCK MANIFEST SUPPORT ---
                if (type === 'block') {
                    var attrId = GexfJS._node_attr_value['block_name'] || GexfJS._node_attr_value['block_id'] || GexfJS._node_attr_value['block']; 
                    if (typeof attrId !== 'undefined' && targetValue) {
                        GexfJS.graph.nodeList.forEach(function(node) {
                            if (node.attributes && node.attributes[attrId] && String(node.attributes[attrId]).split(',').indexOf(targetValue) !== -1) {
                                GexfJS.params.pinnedElements['n_' + node.id] = hlColor;
                                GexfJS.params.activeNodes[node.id] = true; 
                            }
                        });
                    }
                    var edgeBlockAttrId = GexfJS._edge_attr_value && (GexfJS._edge_attr_value['block_name'] || GexfJS._edge_attr_value['block_id'] || GexfJS._edge_attr_value['block']);
                    if (typeof edgeBlockAttrId !== 'undefined' && targetValue && GexfJS.path_highlights && GexfJS.path_highlights[edgeBlockAttrId]) {
                        var matchingEdges = GexfJS.path_highlights[edgeBlockAttrId][targetValue];
                        if (matchingEdges) {
                            for (var edgeId in matchingEdges) {
                                GexfJS.params.activeEdges[edgeId] = true;
                                GexfJS.params.pinnedElements['e_' + edgeId] = hlColor;
                                if (targetValue === 'Replicon Bridge' && GexfJS.graph.edgeLookup && GexfJS.graph.edgeLookup[edgeId]) {
                                    var eObj = GexfJS.graph.edgeLookup[edgeId];
                                    var sNode = GexfJS.graph.nodeList[eObj.source];
                                    var tNode = GexfJS.graph.nodeList[eObj.target];
                                    if (sNode) {
                                        GexfJS.params.activeNodes[sNode.id] = true;
                                        if (!GexfJS.params.pinnedElements['n_' + sNode.id]) GexfJS.params.pinnedElements['n_' + sNode.id] = '#2e7d32';
                                    }
                                    if (tNode) {
                                        GexfJS.params.activeNodes[tNode.id] = true;
                                        if (!GexfJS.params.pinnedElements['n_' + tNode.id]) GexfJS.params.pinnedElements['n_' + tNode.id] = '#2e7d32';
                                    }
                                }
                            }
                        }
                    }
                    GexfJS.params.path_active = !jQuery.isEmptyObject(GexfJS.params.activeEdges);
                    delete GexfJS.oldParams.zoomLevel;
                    this.showDefaultSummary();
                    return;
                }
                
                var pData = this.getPhenomenonData(type);
                GexfJS.params.allPhenomDashedEdges = jQuery.extend({}, pData.dashedEdges);
                GexfJS.params.phenomenonLoci = pData.loci;
                GexfJS.params.activeLocusIndex = -1;
                this.applyPhenomenonLocusState(false);
                this.showDefaultSummary();
            });

            // --- LOCUS STEPPER & NAVIGATION FUNCTIONS ---
            window.selectPhenomenonLocus = lang.hitch(this, function(locusIdx) {
                if (!window.GexfJS || !GexfJS.params || !GexfJS.params.activePhenomenon) return;
                var idx = parseInt(locusIdx, 10);
                if (isNaN(idx)) idx = -1;
                var baseType = GexfJS.params.activePhenomenon;
                if (GexfJS.params.activeLocusIndex !== idx) {
                    if (idx >= 0 && GexfJS.params.phenomenonLoci && GexfJS.params.phenomenonLoci[idx]) {
                        GexfJS.params.locusSpotlightContigs = this.getDefaultLocusSpotlightContigs(GexfJS.params.phenomenonLoci[idx], baseType);
                    } else {
                        GexfJS.params.locusSpotlightContigs = {};
                    }
                }
                GexfJS.params.activeLocusIndex = idx;
                GexfJS.params.activeRemoteSiteIndex = -1;

                var labelMap = {
                    'superbubbles': 'Bounded Variable Loci',
                    'alt_paths': 'Accessory Islands & Indels',
                    'tandem_repeats': 'Local / Tandem CNVs',
                    'fragmented_paralogs': 'Fragmented Localized Repeats',
                    'remote_cnv': 'Remote CNV Clusters',
                    'rearrangements': 'Synteny Breakpoints',
                    'rearrangement_junctions': 'Rearrangement Junctions',
                    'translocation_bridges': 'Translocation & Replicon Bridges',
                    'inversions': 'Inverted Syntenic Blocks',
                    'breaks': 'Repeat Breaks & Scaffolds'
                };
                var baseTitle = labelMap[baseType] || baseType;
                GexfJS.params.currentHighlightName = (idx >= 0) ? (baseTitle + ' (Locus #' + (idx + 1) + ')') : baseTitle;

                this.applyPhenomenonLocusState(idx >= 0);
                this.showDefaultSummary();
            });

            window.focusRemoteSite = lang.hitch(this, function(siteIdx) {
                if (!window.GexfJS || !GexfJS.params || !GexfJS.params.activePhenomenon) return;
                var sIdx = parseInt(siteIdx, 10);
                if (isNaN(sIdx)) sIdx = -1;
                GexfJS.params.activeRemoteSiteIndex = sIdx;
                this.applyPhenomenonLocusState(true);
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

                if (current[contigId]) {
                    // Clicking an already-checked contig always unchecks it; unchecking all returns to the default locus view
                    delete current[contigId];
                } else if (isMulti) {
                    current[contigId] = targetRole;
                } else {
                    // Plain-clicking an unchecked contig replaces the active selection in that role (preserving the other role's exemplar)
                    Object.keys(current).forEach(function(k) {
                        if (current[k] === targetRole) delete current[k];
                    });
                    current[contigId] = targetRole;
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
                var allAlreadyActive = cids.every(function(c) { return Boolean(current[c]); });

                if (allAlreadyActive) {
                    // Clicking an already-checked genome always unchecks its contigs; unchecking all returns to the default locus view
                    cids.forEach(function(c) { delete current[c]; });
                } else if (isMulti) {
                    cids.forEach(function(c) { current[c] = targetRole; });
                } else {
                    // Plain-clicking an unchecked genome replaces the active selection in that role (preserving the other role's exemplar)
                    Object.keys(current).forEach(function(k) {
                        if (current[k] === targetRole) delete current[k];
                    });
                    cids.forEach(function(c) { current[c] = targetRole; });
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

            window.openPhenomenonLocusFromNode = lang.hitch(this, function(type, locusIdx) {
                if (!window.GexfJS || !GexfJS.params || !type) return;
                this.multiSelectedNodeIndices = [];
                this.savedPhenomenonContext = null;
                GexfJS.params.activePhenomenon = null; // Ensure highlightSpecial activates rather than toggles off
                window.highlightSpecial(type);
                if (typeof locusIdx === 'number' && locusIdx >= 0 && GexfJS.params.phenomenonLoci && locusIdx < GexfJS.params.phenomenonLoci.length) {
                    window.selectPhenomenonLocus(locusIdx);
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
            
            window.displayNode = lang.hitch(this, function(nodeIndex, recentre) {
                if (typeof nodeIndex === 'string') {
                    var pIdx = parseInt(nodeIndex, 10);
                    nodeIndex = isNaN(pIdx) ? -1 : pIdx;
                }
                if (originalDisplayNode) originalDisplayNode(nodeIndex, recentre);

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

            var initShowLabels = true;
            var initLabelSize = 0.6;
            var initLabelThresh = 12;
            if (this.labelMenuDiv) {
                var tEl = this.labelMenuDiv.querySelector('#gexfLabelToggle');
                var sEl = this.labelMenuDiv.querySelector('#gexfLabelSize');
                var thEl = this.labelMenuDiv.querySelector('#gexfLabelThreshold');
                if (tEl) initShowLabels = Boolean(tEl.checked);
                if (sEl && !isNaN(parseFloat(sEl.value))) initLabelSize = parseFloat(sEl.value);
                if (thEl && !isNaN(parseFloat(thEl.value))) initLabelThresh = parseFloat(thEl.value);
            }

            var graph_params = {
                showEdges : true,
                zoomLevel : 0,
                edgeWidthFactor : 10,
                defaultEdgeWidth : this.customEdgeWidth || 1.0,
                pathAttr : "sequences",
                colorNodeAttr : "diversity",
                nodeSizeFactor : 2,
                patric_on: true,
                language: false,
                textDisplayThreshold: initLabelThresh,
                showNodeLabels: initShowLabels,
                labelSizeFactor: initLabelSize
            };
            setParams(graph_params);
            this.updateLabelButtonState();

            var originalSetInterval = window.setInterval;
            window.setInterval = function() { return 999; }; 

            // Initialize persistent pin and filter storage
            if (!GexfJS.params.userPins) GexfJS.params.userPins = {};
            if (typeof GexfJS.params.pinsMuted === 'undefined') GexfJS.params.pinsMuted = false;
            GexfJS.params.highlightColorOverride = this.customHlColor || null;
            GexfJS.params.edgeColorOverride = this.customEdgeColor || null;
            GexfJS.params.labelColorOverride = this.customLblColor || null;
            GexfJS.params.defaultEdgeWidth = this.customEdgeWidth || 1.0;
            if (this.customBgColor) {
                var zcInit = document.getElementById('zonecentre');
                var ocInit = document.getElementById('overviewzone');
                if (zcInit) { domClass.remove(zcInit, 'gradient'); domStyle.set(zcInit, 'background', this.customBgColor); }
                if (ocInit) { domClass.remove(ocInit, 'gradient'); domStyle.set(ocInit, 'background', this.customBgColor); }
            }
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
            GexfJS.params.activeBlockFilter = {};
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

            // Global Eyeball Filter Toggles for Syntenic Blocks & Genome Manifest
            window.toggleBlockFilter = lang.hitch(this, function(blockName, evt) {
                if (evt && evt.stopPropagation) evt.stopPropagation();
                if (evt && evt.preventDefault) evt.preventDefault();
                if (!window.GexfJS || !GexfJS.params) return;
                if (!GexfJS.params.activeBlockFilter) GexfJS.params.activeBlockFilter = {};
                if (GexfJS.params.activeBlockFilter[blockName]) {
                    delete GexfJS.params.activeBlockFilter[blockName];
                } else {
                    GexfJS.params.activeBlockFilter[blockName] = true;
                }
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

            window.resetBlockFilter = lang.hitch(this, function() {
                if (!window.GexfJS || !GexfJS.params) return;
                GexfJS.params.activeBlockFilter = {};
                delete GexfJS.oldParams.zoomLevel;
                this.showDefaultSummary();
            });

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

            // Global wrapper for displayPath that captures the Name and preserves Node Details view
            window.doHighlightPath = lang.hitch(this, function(eid, pstr, pattr, name) {
                if (window.GexfJS) {
                    GexfJS.params.currentHighlightName = name || pstr;
                    GexfJS.params.activePhenomenon = null;
                }
                if (window.displayPath) window.displayPath(eid, pstr, pattr);
                if (window.GexfJS && GexfJS.oldParams) {
                    delete GexfJS.oldParams.zoomLevel;
                }
                var isSummaryView = Boolean(
                    window.GexfJS &&
                    GexfJS.params &&
                    GexfJS.params.currentNode === -1 &&
                    (!Array.isArray(this.multiSelectedNodeIndices) || this.multiSelectedNodeIndices.length === 0)
                );
                if (isSummaryView && this.itemDetailPanel.customDisplayNode) {
                    this.showDefaultSummary();
                } else {
                    var barEl = document.getElementById('node-active-highlight-bar');
                    if (barEl && window.GexfJS && GexfJS.params && GexfJS.params.path_active) {
                        var edgeCount = GexfJS.params.activeEdges ? Object.keys(GexfJS.params.activeEdges).length : 0;
                        var hlLabel = String(name || pstr || 'Path');
                        barEl.style.display = 'flex';
                        barEl.innerHTML = '<span><i class="fa icon-bullseye" style="color:#d500f9;"></i> <b>Highlighting:</b> ' + hlLabel + ' <span style="color:#666;">(' + edgeCount + ' edges)</span></span>' +
                            '<a href="javascript:void(0)" onclick="window.clearNodePathHighlight(); return false;" style="color:#c62828; font-weight:bold; text-decoration:none; margin-left:8px;" title="Clear path highlight and stay on this view">[Clear]</a>';
                    }
                }
            });

            window.clearNodePathHighlight = lang.hitch(this, function() {
                if (!window.GexfJS || !GexfJS.params) return;
                var barEl = document.getElementById('node-active-highlight-bar');
                if (barEl) {
                    barEl.style.display = 'none';
                    barEl.innerHTML = '';
                }
                if (GexfJS.params.currentNode === -1 && Array.isArray(this.multiSelectedNodeIndices) && this.multiSelectedNodeIndices.length > 0) {
                    this.applyMultiNodeSelection();
                    return;
                }
                GexfJS.params.activeEdges = {};
                GexfJS.params.activeNodes = {};
                GexfJS.params.path_active = false;
                if (GexfJS.params.currentNode !== -1 && GexfJS.graph && GexfJS.graph.nodeList[GexfJS.params.currentNode]) {
                    var curN = GexfJS.graph.nodeList[GexfJS.params.currentNode];
                    GexfJS.params.currentHighlightName = "Node: " + (curN.label || curN.id);
                }
                if (GexfJS.oldParams) delete GexfJS.oldParams.zoomLevel;
            });

            startGraphViewer(gexf_dom);
            this._phenomenonDataCache = {};

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
                
                var isSummaryView = Boolean(
                    GexfJS.params.currentNode === -1 &&
                    (!Array.isArray(this.multiSelectedNodeIndices) || this.multiSelectedNodeIndices.length === 0)
                );
                // Refresh the summary panel if currently on the summary view, or refresh multi-node selection
                if (isSummaryView && this.itemDetailPanel.customDisplayNode) {
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
            html += '<div>&bull; <b>View Tables:</b> Click <b>FEATURES</b> (' + totalFeatureCount + ') or <b>GENOMES</b> (' + allGenomeIds.length + ') on the Action Bar.</div>';
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
                html += '<div id="node-active-highlight-bar" style="display:none; align-items:center; justify-content:space-between; margin-bottom:6px; padding:4px 7px; background:#fdf2ff; border:1px solid #e1bee7; border-left:3px solid #d500f9; border-radius:4px; font-size:0.92em; color:#4a148c;"></div>';
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
                // Guard against overwriting panel if the user navigated away (e.g., clicked a phenomenon pill) while XHR was in flight
                if (!window.GexfJS || !GexfJS.params || GexfJS.params.currentNode === -1 || GexfJS.graph.nodeList[GexfJS.params.currentNode] !== node) {
                    return;
                }
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
                if (!window.GexfJS || !GexfJS.params || GexfJS.params.currentNode === -1 || GexfJS.graph.nodeList[GexfJS.params.currentNode] !== node) {
                    return;
                }
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

            // Build discrete biological phenomenon badges for this locus (including edge-implicated and boundary anchor roles)
            var badges = [];
            var badgeStyle = 'display:inline-block; margin:2px 4px 2px 0; padding:2px 8px; border-radius:10px; font-size:0.8em; font-weight:bold; text-decoration:none; cursor:pointer;';
            var curNodeId = String(node.id);
            var cnvClusterSuffix = (namedAttrs['cnv_cluster_id'] && String(namedAttrs['cnv_cluster_id']) !== '0' && String(namedAttrs['cnv_cluster_id']) !== 'None')
                ? (' (Cluster ' + namedAttrs['cnv_cluster_id'] + ')')
                : '';
            var isAltPathNode = String(namedAttrs['alternative_path']).toLowerCase() === 'true' || String(namedAttrs['conflict']) === '4';
            var sbIdSuffix = (namedAttrs['superbubble_id'] && String(namedAttrs['superbubble_id']) !== '0' && String(namedAttrs['superbubble_id']) !== 'None')
                ? (' (' + namedAttrs['superbubble_id'] + ')')
                : (isAltPathNode ? ' (Accessory Island / Indel)' : '');

            var phenomConfigs = [
                {
                    type: 'superbubbles',
                    focalLabel: 'Bounded Variable Locus' + sbIdSuffix,
                    anchorLabel: 'Bounded Variable Locus Anchor',
                    bg: '#e3f2fd', fg: '#1565c0', border: '#64b5f6',
                    desc: 'Bounded allelic variation, cassette, or local accessory island/indel flanked by collinear conserved anchors'
                },
                {
                    type: 'tandem_repeats',
                    focalLabel: 'Local / Tandem CNV' + cnvClusterSuffix,
                    anchorLabel: 'Local CNV Anchor',
                    bg: '#fff3e0', fg: '#e65100', border: '#ffb74d',
                    desc: 'Multi-copy gene family participating in a local tandem repeat or copy number variant'
                },
                {
                    type: 'fragmented_paralogs',
                    focalLabel: 'Fragmented CNV' + cnvClusterSuffix,
                    anchorLabel: 'Fragmented CNV Anchor',
                    bg: '#fce4ec', fg: '#ad1457', border: '#f06292',
                    desc: 'Localized repeat contiguous in reference contigs but split across contigs in fragmented assemblies'
                },
                {
                    type: 'remote_cnv',
                    focalLabel: 'Remote CNV Cluster' + cnvClusterSuffix,
                    anchorLabel: 'Remote CNV Anchor',
                    bg: '#e1f5fe', fg: '#01579b', border: '#4fc3f7',
                    desc: 'Multi-gene paralogous operon, segmental duplication, or dispersed repeat cassette present at distant chromosomal loci'
                },
                {
                    type: 'rearrangements',
                    focalLabel: 'Synteny Breakpoint',
                    anchorLabel: 'Synteny Breakpoint Anchor',
                    bg: '#ffebee', fg: '#c62828', border: '#e57373',
                    desc: 'Conserved multi-gene anchor node where TFS homology signals from different contigs collide'
                },
                {
                    type: 'rearrangement_junctions',
                    focalLabel: 'Rearrangement Junction',
                    anchorLabel: 'Rearrangement Junction Flank',
                    bg: '#fbe9e7', fg: '#bf360c', border: '#ff8a65',
                    desc: 'Boundary gene connected across a direct intra-contig or inter-contig rearrangement jump edge'
                },
                {
                    type: 'translocation_bridges',
                    focalLabel: 'Translocation / Replicon Bridge',
                    anchorLabel: 'Bridge Flanking Anchor',
                    bg: '#e0f2f1', fg: '#00695c', border: '#4db6ac',
                    desc: 'Multi-gene bridge path connecting separate replicons or distant chromosomal loci'
                },
                {
                    type: 'inversions',
                    focalLabel: 'Inverted Block',
                    anchorLabel: 'Inverted Block Anchor',
                    bg: '#ede7f6', fg: '#4527a0', border: '#9575cd',
                    desc: 'Locus participating in a chromosomal inversion relative to the consensus coordinate frame'
                },
                {
                    type: 'breaks',
                    focalLabel: 'Scaffold Bridge',
                    anchorLabel: 'Scaffold / Break Anchor',
                    bg: '#e8f5e9', fg: '#2e7d32', border: '#81c784',
                    desc: 'Candidate syntenic scaffold bridge or contig terminus inside a repetitive gene family'
                }
            ];

            phenomConfigs.forEach(lang.hitch(this, function(cfg) {
                var pData = this.getPhenomenonData(cfg.type);
                var loci = (pData && pData.loci) ? pData.loci : [];
                var matchedAnyLocus = false;

                loci.forEach(function(loc) {
                    var isFocal = loc.focalNodeIds && loc.focalNodeIds.indexOf(curNodeId) !== -1;
                    var isAnchor = !isFocal && loc.anchorNodeIds && loc.anchorNodeIds.indexOf(curNodeId) !== -1;
                    if (!isFocal && !isAnchor) return;
                    matchedAnyLocus = true;
                    var locNum = loc.index + 1;

                    if (cfg.type === 'breaks' && isFocal) {
                        var isRepeatBreak = String(namedAttrs['assembly_repeat_break']).toLowerCase() === 'true';
                        var isScaffoldPath = String(namedAttrs['is_scaffold_path']).toLowerCase() === 'true' || !isRepeatBreak;
                        if (isRepeatBreak) {
                            badges.push(
                                '<a href="javascript:void(0)" onclick="window.openPhenomenonLocusFromNode(\'breaks\', ' + loc.index + '); return false;" ' +
                                'style="' + badgeStyle + ' background:#fff8e1; color:#f57f17; border:1px solid #ffd54f;" ' +
                                'title="Contig terminus inside a repetitive gene family — click to open Locus #' + locNum + ' in Dynamic Visit View">' +
                                'Assembly Repeat Break &middot; Locus #' + locNum + ' &#8599;</a>'
                            );
                        }
                        if (isScaffoldPath) {
                            badges.push(
                                '<a href="javascript:void(0)" onclick="window.openPhenomenonLocusFromNode(\'breaks\', ' + loc.index + '); return false;" ' +
                                'style="' + badgeStyle + ' background:#e8f5e9; color:#2e7d32; border:1px solid #81c784;" ' +
                                'title="Candidate syntenic scaffold bridge connecting fragmented contigs — click to open Locus #' + locNum + ' in Dynamic Visit View">' +
                                'Scaffold Bridge &middot; Locus #' + locNum + ' &#8599;</a>'
                            );
                        }
                        return;
                    }

                    var lbl = (isFocal ? cfg.focalLabel : cfg.anchorLabel) + ' &middot; Locus #' + locNum;
                    var bdrStyle = isAnchor ? '1px dashed ' + cfg.border : '1px solid ' + cfg.border;
                    var roleNote = isAnchor ? ' (Flanking / Boundary Anchor)' : '';
                    badges.push(
                        '<a href="javascript:void(0)" onclick="window.openPhenomenonLocusFromNode(\'' + cfg.type + '\', ' + loc.index + '); return false;" ' +
                        'style="' + badgeStyle + ' background:' + cfg.bg + '; color:' + cfg.fg + '; border:' + bdrStyle + ';" ' +
                        'title="' + cfg.desc + roleNote + ' — click to open Locus #' + locNum + ' in Dynamic Visit View">' +
                        lbl + ' &#8599;</a>'
                    );
                });

                // Fallback if node has explicit attribute flag even without a multi-element locus
                if (!matchedAnyLocus && pData && pData.explicitNodes && pData.explicitNodes[curNodeId]) {
                    badges.push(
                        '<a href="javascript:void(0)" onclick="window.openPhenomenonLocusFromNode(\'' + cfg.type + '\', 0); return false;" ' +
                        'style="' + badgeStyle + ' background:' + cfg.bg + '; color:' + cfg.fg + '; border:1px solid ' + cfg.border + ';" ' +
                        'title="' + cfg.desc + ' — click to open in Dynamic Visit View">' +
                        cfg.focalLabel + ' &#8599;</a>'
                    );
                }
            }));

            // Check if node or any incident edge is classified as a cross-block Replicon Bridge
            var isRepliconBridgeNode = String(namedAttrs['block'] || '').split(',').map(function(s) { return s.trim(); }).indexOf('Replicon Bridge') !== -1;
            if (!isRepliconBridgeNode && window.GexfJS && GexfJS.graph && GexfJS._edge_attr_value) {
                var eBlockAttrId = GexfJS._edge_attr_value['block_name'] || GexfJS._edge_attr_value['block_id'] || GexfJS._edge_attr_value['block'];
                var rbEdges = (typeof eBlockAttrId !== 'undefined' && GexfJS.path_highlights && GexfJS.path_highlights[eBlockAttrId])
                    ? GexfJS.path_highlights[eBlockAttrId]['Replicon Bridge']
                    : null;
                if (rbEdges) {
                    for (var rbEid in rbEdges) {
                        var rbE = GexfJS.graph.edgeLookup && GexfJS.graph.edgeLookup[rbEid];
                        if (rbE) {
                            var sN = GexfJS.graph.nodeList[rbE.source];
                            var tN = GexfJS.graph.nodeList[rbE.target];
                            if ((sN && String(sN.id) === curNodeId) || (tN && String(tN.id) === curNodeId)) {
                                isRepliconBridgeNode = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (isRepliconBridgeNode) {
                badges.push(
                    '<a href="javascript:void(0)" onclick="window.highlightSpecial(\'block\', \'Replicon Bridge\'); return false;" ' +
                    'style="' + badgeStyle + ' background:#fff3e0; color:#bf360c; border:1px solid #ffab91;" ' +
                    'title="Cross-replicon bridge or mobile hub connecting distinct Major Blocks — click to highlight all Replicon Bridges">' +
                    'Replicon Bridge &#8599;</a>'
                );
            }

            // Detect paralogous loci sharing the same protein family across the graph
            var curFamily = namedAttrs['family'] || node.label;
            var famEsc = curFamily ? String(curFamily).replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
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
                badges.push(
                    '<a href="javascript:void(0)" onclick="window.selectFamilyNodes(\'' + famEsc + '\'); return false;" ' +
                    'style="' + badgeStyle + ' background:#e0f7fa; color:#006064; border:1px solid #80deea;" ' +
                    'title="Gene family appears at multiple distinct syntenic loci across the graph — click to select all ' + (paralogNodes.length + 1) + ' paralogous nodes">' +
                    'Paralogous Loci (' + (paralogNodes.length + 1) + ') &#8599;</a>'
                );
            }

            var attrHtml = '<div style="margin-bottom:10px; font-size:0.9em; color:#555;">';
            if (badges.length > 0) {
                attrHtml += '<div style="margin-bottom:6px;">' + badges.join('') + '</div>';
            }
            if (paralogNodes.length > 0) {
                var maxParalogs = 10;
                var renderParalogLink = function(p) {
                    return '<a href="#" onclick="window.inspectNodeFromLocus(' + p.idx + '); return false;" style="color:#006064; text-decoration:underline; margin-right:6px;" title="Center and inspect node ' + p.id + '">Node ' + p.id + '</a>';
                };
                var paralogLinks = paralogNodes.slice(0, maxParalogs).map(renderParalogLink).join('');
                if (paralogNodes.length > maxParalogs) {
                    var extraCount = paralogNodes.length - maxParalogs;
                    var extraLinks = paralogNodes.slice(maxParalogs).map(renderParalogLink).join('');
                    paralogLinks += '<a href="#" onclick="this.style.display=\'none\'; this.nextElementSibling.style.display=\'inline\'; return false;" style="color:#666; font-size:0.9em; text-decoration:none; margin-right:6px;" title="Click to show remaining ' + extraCount + ' paralogous loci">... +' + extraCount + ' more</a>' +
                        '<span style="display:none;">' + extraLinks + '</span>';
                }
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
                var allGenomes = Object.keys(featureMap).filter(function(k) {
                    return k !== "info" && k !== "md5" && k !== "start" && k !== "end";
                });
                var allSequences = [];
                var hierarchyHtml = '<div class="graph-links" style="font-size:0.9em;">';
                
                allGenomes.forEach(lang.hitch(this, function(genomeId) {
                    var contigs = featureMap[genomeId];
                    if (!contigs || typeof contigs !== 'object') return;
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

                var isPathActiveNow = Boolean(window.GexfJS && GexfJS.params && GexfJS.params.path_active);
                var activeEdgeCountNow = (isPathActiveNow && GexfJS.params.activeEdges) ? Object.keys(GexfJS.params.activeEdges).length : 0;
                var activeHlNameNow = (isPathActiveNow && GexfJS.params.currentHighlightName) ? String(GexfJS.params.currentHighlightName) : '';
                var barDisplay = isPathActiveNow ? 'flex' : 'none';
                var barInner = isPathActiveNow
                    ? ('<span><i class="fa icon-bullseye" style="color:#d500f9;"></i> <b>Highlighting:</b> ' + activeHlNameNow + ' <span style="color:#666;">(' + activeEdgeCountNow + ' edges)</span></span>' +
                       '<a href="javascript:void(0)" onclick="window.clearNodePathHighlight(); return false;" style="color:#c62828; font-weight:bold; text-decoration:none; margin-left:8px;" title="Clear path highlight and stay on this view">[Clear]</a>')
                    : '';

                var summaryHtml = '<div style="margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #ccc;">';
                summaryHtml += '<div id="node-active-highlight-bar" style="display:' + barDisplay + '; align-items:center; justify-content:space-between; margin-bottom:6px; padding:4px 7px; background:#fdf2ff; border:1px solid #e1bee7; border-left:3px solid #d500f9; border-radius:4px; font-size:0.84em; color:#4a148c;">' + barInner + '</div>';
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
