define([
	"dojo/_base/declare", "dijit/_WidgetBase","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin","dojo/topic",
	"dojo/dom-construct","dojo/_base/lang", "dojo/dom-geometry","dojo/dom-style","dojo/text!./templates/TrackController.html",
    "./ColorPicker","dojo/on","dojo/dom-class",'dijit/Dialog',"dojo/dom","dojo/when"
],function(
	declare,WidgetBase,Templated,WidgetsInTemplate,Topic,
	domConstruct,lang,domGeometry,domStyle,Template,ColorPicker,on,domClass,
	Dialog,dom,when
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		templateString: Template,
		postCreate: function(){
			this.inherited(arguments);
			dom.setSelectable(this.domNode,false);
			Topic.subscribe("/addTrack", lang.hitch(this,"onAddTrack"));
		},

		visibleIconClass: "icon-eye2",
		hiddenIconClass: "icon-eye-slash",

		saveSVG: function(){
			console.log("saveSVG()")
			if (this.viewer){
				console.log("Call Export SVG")
				var svg = this.viewer.exportSVG()
				console.log("SVG BEGIN: ", svg.substr(0,50));
				var encoded = window.btoa(svg);
				console.log("Completed Encoding SVG.  Length: ", encoded.length)
				var e=domConstruct.create("a", {download: "CircularGenome.svg",href: "data:image/svg+xml;base64,\n"+encoded, style: {margin: "4px", border: "1px solid #333",padding: "4px"}, innerHTML: "Save Image", alt: "ExportedCircularGenome.svg"})
				new Dialog({content: e}).show();
				console.log("E: ", e)
				//domConstruct.place(e,this.exportContainer,"first");
			}
		},
		onAddTrack: function(event){
			if (!this.viewer){
				this.viewer = event.track.viewer;
			}
			console.log("addTrack Event: ", event)
			var tr = domConstruct.create("tr",{},this.trackTable);
			var color = domConstruct.create("td",{}, tr);
				var fg,bg;
				var foregroundIsStroke=false;

				if (event.track){
					if (event.track.fill){
						fg=event.track.fill;
					}else if (event.track.stroke){
						fg = event.track.stroke.color || event.track.stroke;
						foregroundIsStroke=true;
					}else{
						fg = null;
					}

					if (event.track.background){
						bg = event.track.background.fill ||  null;
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

				colorPicker.watch("backgroundColor", function(attr,oldVal,color){
					console.log("COLOR PICKER VALUE: ", color)
					event.track.set('backgroundColor', color)
				})

				colorPicker.watch("foregroundColor", function(attr,oldVal,color){
					event.track.set("foregroundColor", color)
				})
			
			domConstruct.create("td", {innerHTML: event.track.title},tr)
			var td = domConstruct.create('td', {style:{"word-wrap": "nowrap","text-align": "right", "font-size": ".85em"}},tr);

			if (!event.isReferenceTrack) {
				var visibleButton = domConstruct.create("i", {'class': "fa " + (event.track.visible?this.visibleIconClass:this.hiddenIconClass) + " fa-2x", style: {margin: "2px"}}, td);
				on(visibleButton,"click", lang.hitch(this,function(evt){
					console.log("Click Visible")
					if (domClass.contains(visibleButton,this.visibleIconClass)){
						// hide
						domClass.remove(visibleButton,this.visibleIconClass);
						domClass.add(visibleButton, this.hiddenIconClass)
						event.track.set('visible',false)
					}else{
						domClass.remove(visibleButton, this.hiddenIconClass)
						domClass.add(visibleButton,this.visibleIconClass);
						event.track.set('visible',true)
					}
				}))
			}


			// var settingsButton = domConstruct.create("i", {'class': "fa icon-cog2 fa-2x", style: {margin: "2px"}}, td);
			// on(settingsButton,"click", function(evt){
			// 	new Dialog({content: "Track Settings not yet Implemented", title: "Track Settings"}).show();

			// })
			if (!event.isReferenceTrack) {
				domConstruct.create("i", {'class': "fa icon-close fa-2x"+(event.isReferenceTrack?" disabled":""), style: {margin: "2px"}}, td);
			}
		}

	});
});