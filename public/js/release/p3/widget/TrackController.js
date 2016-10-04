require({cache:{
'url:p3/widget/templates/TrackController.html':"<div style=\"text-align: center;\">\n\t<!-- <div data-dojo-type=\"dijit/form/Textbox\" style=\"width:98%;margin:auto;margin-top:2px;\"></div> -->\n\t<div style=\"font-size:1em; font-weight: bold; text-align:center;margin-bottom: 5px;background: #efefef\">Available tracks</div>\n\t<table>\n\t\t<tbody data-dojo-attach-point=\"trackTable\">\n\n\t\t</tbody>\n\t</table>\n\t<div data-dojo-attach-point=\"customTrackInfo\" style=\"font-size:1em; font-weight: bold; text-align:center;margin-bottom: 5px; margin-top:15px;background: #efefef\">\n\tCustom tracks\n\t</div>\n\t<div style=\"text-align:left; margin-top:2px;padding:2px;\" data-dojo-attach-point=\"customTrackSection\">\n\t\t<select required name=\"type\" style=\"width:25%;\" data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"onChange:validateCustomSelection\" data-dojo-attach-point=\"track_type_select\" data-dojo-props=\"intermediateChanges:true,promptMessage:'select type',missingMessage:'select type'\">\n\t\t\t<option value=\"\" default selected hidden>Type</option>\n\t\t\t<option value=\"CDS\">CDS</option>\n\t\t\t<option value=\"RNA\">RNA</option>\n\t\t\t<option value=\"Miscellaneous\">Misc</option>\n\t\t</select>\n\t\t<select required name=\"strand\" style=\"width:25%; margin-left:2px;\" data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"onChange:validateCustomSelection\" data-dojo-attach-point=\"track_strand_select\" data-dojo-props=\"intermediateChanges:true,promptMessage:'select strand',missingMessage:'select strand'\">\n\t\t\t<option value=\"\" default selected hidden>Strand</option>\n\t\t\t<option value=\"both\">both</option>\n\t\t\t<option value=\"+\">forward</option>\n\t\t\t<option value=\"-\">reverse</option>\n\t\t</select>\n\t\t<input required type=\"text\" style=\"width:30%; margin-left:2px;\" data-dojo-attach-event=\"onChange:validateCustomSelection\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Enter keywords. For examples, secretion, membrane, transposon',missingMessage:'Keyword must be provided. For examples, secretion, membrane, transposon OR transposase OR insertion OR mobile',trim:true,placeHolder:'Keyword'\" data-dojo-type=\"dijit/form/ValidationTextBox\" id=\"keyword\" name=\"keyword\" data-dojo-attach-point=\"keyword_box\"/>\n\t\t<button style=\"margin-left:2px\" data-dojo-type=\"dijit/form/Button\"  data-dojo-attach-event=\"onClick:onAddCustomTrack\" data-dojo-attach-point=\"customTrackButton\" data-dojo-props=\"disabled:true\">+</button>\n\t</div>\n<!--\n\t<div data-dojo-attach-point=\"userTrackInfo\" style=\"font-size:1em; font-weight: bold; text-align:center;margin-bottom: 5px;margin-top:20px; background: #efefef\">\n\tUpload your own data\n\t</div>\n\t<div style=\"text-align:left;margin-top:2px;padding:2px;\" data-dojo-attach-point=\"userTrackSection\">\n\t\t<select required name=\"plot_type\" style=\"width:35%;\" data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"plot_type_select\">\n\t\t\t<option value=\"Tiles\" default selected hidden>Tiles</option>\n\t\t\t<option value=\"Line Plot\">Line Plot</option>\n\t\t\t<option value=\"Histogram\">Histogram</option>\n\t\t\t<option value=\"Heatmap\">Heatmap</option>\n\t\t</select>\n\t\t<input type=\"file\" style=\"width:50%; margin-left:2px;\" name=\"data_file\" id=\"data_file\" accept=\"text/plain\" data-dojo-attach-event=\"onChange:validateUserFileSelection\" data-dojo-attach-point=\"data_file_select\"/>\n\t\t<button style=\"margin-left:2px\" data-dojo-type=\"dijit/form/Button\"  data-dojo-attach-event=\"onClick:onAddUserFileTrack\" data-dojo-attach-point=\"userFileButton\" data-dojo-props=\"disabled:true\">+</button>\n\t</div>\t\n-->\n\t<button style=\"margin-top:25px;\" data-dojo-attach-event=\"click:saveSVG\">Export SVG Image</button>\n\t<div data-dojo-attach-point=\"exportContainer\"></div>\t\n\n</div>"}});
define("p3/widget/TrackController", [
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

            var customTrackHelp = "Add custom tracks by selecting feature type, strand and keywords to show genes of interest."; 
            var customTT = new TooltipDialog({
                content: customTrackHelp, 
                onMouseLeave: function(){
                    popup.close(customTT);
                }
            });
            on(this.customTrackInfo, 'mouseover', function(){
                //console.log("customTrackInfo", customTT.content);
                popup.open({
                    popup: customTT,
                    around: this,
                    orient: ["below-centered"]                    
                });
            });	
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
