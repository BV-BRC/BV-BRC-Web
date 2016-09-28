define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/topic",
	"dojo/dom-construct", "dojo/_base/lang", "dojo/dom-geometry", "dojo/dom-style", "dojo/text!./templates/TrackController.html",
	"./ColorPicker", "dijit/popup","dijit/TooltipDialog", "dojo/on", "dojo/dom-class", 'dijit/Dialog', "dojo/dom", "dojo/when", "FileSaver",  "dijit/form/Select"
], function(declare, WidgetBase, Templated, WidgetsInTemplate, Topic,
			domConstruct, lang, domGeometry, domStyle, Template,
			ColorPicker, popup,TooltipDialog, on, domClass, Dialog, dom, when, saveAs, Select){
	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		templateString: Template,
		customTrackIndex: 0,
		postCreate: function(){
			this.inherited(arguments);
			dom.setSelectable(this.domNode, false);
			Topic.subscribe("/addTrack", lang.hitch(this, "onAddTrack"));
		},

		visibleIconClass: "icon-eye",
		hiddenIconClass: "icon-eye-slash",

		saveSVG: function(){
			// console.log("saveSVG()");
			if(this.viewer){
				console.log("Call Export SVG");
				var svg = this.viewer.exportSVG();
				console.log("SVG BEGIN: ", svg.substr(0, 50));
                saveAs(new Blob([svg]), "CircularGenome.svg");
				//domConstruct.place(e,this.exportContainer,"first");
			}
		},

        validateCustomSelection: function(){
			var type = this.track_type_select.get('value');
			var strand = this.track_strand_select.get('value');
			var keyword = this.keyword_box.get('value');
			if (type && strand && keyword) {
			    this.customTrackButton.set("disabled", false);
			}
			
            console.log("onAddCustomTrack: type =, strand =, keyword =", type, strand, keyword);
		},
		
		onAddCustomTrack: function(){
			var type = this.track_type_select.get('value');
			var strand = this.track_strand_select.get('value');
			var keyword = this.keyword_box.get('value');			
		    this.customTrackButton.set("disabled", true);
		    
		    this.customTrackIndex ++;
		    var customTrackSelection = {
						index: this.customTrackIndex,
						type: type,
						strand: strand,
						keyword: keyword
			};
			Topic.publish("/Notification", {message: "Adding a custom track", type: "message"});
            Topic.publish("CircularView", "addCustomTrack", customTrackSelection);
            
            console.log("onAddCustomTrack: type =, strand =, keyword =", type, strand, keyword);
		},

		onAddTrack: function(event){
			if(!this.viewer){
				this.viewer = event.track.viewer;
			}
			// console.log("addTrack Event: ", event);
			var tr = domConstruct.create("tr", {}, this.trackTable);
			var color = domConstruct.create("td", {}, tr);
			var fg, bg;
			var foregroundIsStroke = false;

			if(event.track){
				if(event.track.fill){
					fg = event.track.fill;
				}else if(event.track.stroke){
					fg = event.track.stroke.color || event.track.stroke;
					foregroundIsStroke = true;
				}else{
					fg = null;
				}

				if(event.track.background){
					bg = event.track.background.fill || null;
				}else{
					bg = null;
				}

			}

			var colorPicker = new ColorPicker({
				style: "margin:2px;",
				enableBackgroundSelector: true,
				enableForegroundSelector: !(typeof event.track.fill == 'function'),
				foregroundColor: fg,
				backgroundColor: bg
			});

			domConstruct.place(colorPicker.domNode, color);

			colorPicker.watch("backgroundColor", function(attr, oldVal, color){
				console.log("COLOR PICKER VALUE: ", color)
				event.track.set('backgroundColor', color)
			});

			colorPicker.watch("foregroundColor", function(attr, oldVal, color){
				event.track.set("foregroundColor", color)
			});

			var tdinfo = domConstruct.create("td", {innerHTML: event.track.title}, tr);
			if (event.track.title_tooltip) {
                var titleTT = new TooltipDialog({
                    content: event.track.title_tooltip, 
                    onMouseLeave: function(){
                        popup.close(titleTT);
                    }
                });

                on(tdinfo, 'mouseover', function(){
                    popup.open({
                        popup: titleTT,
                        around: tdinfo,
                        orient: ["below-centered"]                    
                    });
                });	
            }  
  
 // this part is for adding plot type selection for GC Content and GC Skew. Temporarily comment out. Waiting for the new implementation of removing and adding track           
/*            if (event.track.title === "GC Content" || event.track.title === "GC Skew") {
                var name;
                var id;
                if (event.track.title === "GC Content") {
                    name = "selectGCContentPlot";
                    id = "selectGCContentPlot";
                } else {
                    name = "selectGCSkewPlot";
                    id = "selectGCSkewPlot";                
                }
                             
                var select_plot = new Select({
                    name: name,
                    id: id,
                    options: [{value: "line", label: "Line Plot"}, {value: "histogram", label: "Histogram"}, {value: "heatmap", label: "Heatmap"}],
                    style: "width: 50px; margin-left: 5px;"
                });
			    domConstruct.place(select_plot.domNode, tdinfo, "last");

                select_plot.on("change", function(){
                    Topic.publish("CircularView", "name", select_plot.get("value"));
                    console.log("select_plot my value: ", select_plot.get("value"));
                })
            } 
*/
    		
			var td = domConstruct.create('td', {
				style: {
					"word-wrap": "nowrap",
					"text-align": "right",
					"font-size": ".85em"
				}
			}, tr);

			console.log("Track check event.track", event.track);
			console.log("Track check event.track.hideable", event.track.hideable);

			if(!event.isReferenceTrack && event.track.hideable != false){
				var visibleButton = domConstruct.create("i", {
					'class': "fa " + (event.track.visible ? this.visibleIconClass : this.hiddenIconClass) + " fa-2x",
					style: {margin: "2px"}
				}, td);
				on(visibleButton, "click", lang.hitch(this, function(evt){
					console.log("Click Visible");
					if(domClass.contains(visibleButton, this.visibleIconClass)){
						// hide
						console.log("hide");
						domClass.remove(visibleButton, this.visibleIconClass);
						domClass.add(visibleButton, this.hiddenIconClass);
						event.track.set('visible', false)
					}else{
						console.log("show");
						domClass.remove(visibleButton, this.hiddenIconClass);
						domClass.add(visibleButton, this.visibleIconClass);
						event.track.set('visible', true)
					}
				}))
			}

			// var settingsButton = domConstruct.create("i", {'class': "fa icon-cog fa-2x", style: {margin: "2px"}}, td);
			// on(settingsButton,"click", function(evt){
			// 	new Dialog({content: "Track Settings not yet Implemented", title: "Track Settings"}).show();

			// })
			if(!event.isReferenceTrack){
				domConstruct.create("i", {
					'class': "fa icon-close fa-2x" + (event.isReferenceTrack ? " disabled" : ""),
					style: {margin: "2px"}
				}, td);
			}
		}

	});
});
