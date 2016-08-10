require({cache:{
'url:p3/widget/templates/TrackController.html':"<div style=\"text-align: center;\">\n\t<!-- <div data-dojo-type=\"dijit/form/Textbox\" style=\"width:98%;margin:auto;margin-top:2px;\"></div> -->\n\t<div style=\"font-size:1em;text-align:center;margin-bottom: 5px;\">AVAILABLE TRACKS</div>\n\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"trackTable\">\n\n\t\t</tbody>\n\t</table>\n\n\t<button data-dojo-attach-event=\"click:saveSVG\">Export SVG Image</button>\n\t<div data-dojo-attach-point=\"exportContainer\"></div>\n</div>\n"}});
define("p3/widget/TrackController", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/topic",
	"dojo/dom-construct", "dojo/_base/lang", "dojo/dom-geometry", "dojo/dom-style", "dojo/text!./templates/TrackController.html",
	"./ColorPicker", "dojo/on", "dojo/dom-class", 'dijit/Dialog', "dojo/dom", "dojo/when", "FileSaver"
], function(declare, WidgetBase, Templated, WidgetsInTemplate, Topic,
			domConstruct, lang, domGeometry, domStyle, Template,
			ColorPicker, on, domClass, Dialog, dom, when, saveAs){
	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		templateString: Template,
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

			domConstruct.create("td", {innerHTML: event.track.title}, tr)
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
