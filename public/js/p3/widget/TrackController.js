define([
	"dojo/_base/declare", "dijit/_WidgetBase","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin","dojo/topic",
	"dojo/dom-construct","dojo/_base/lang", "dojo/dom-geometry","dojo/dom-style","dojo/text!./templates/TrackController.html",
    "./ColorPicker","dojo/on","dojo/dom-class",'dijit/Dialog'
],function(
	declare,WidgetBase,Templated,WidgetsInTemplate,Topic,
	domConstruct,lang,domGeometry,domStyle,Template,ColorPicker,on,domClass,
	Dialog
){

	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		templateString: Template,
		postCreate: function(){
			this.inherited(arguments);
			Topic.subscribe("/addTrack", lang.hitch(this,"onAddTrack"));
		},

		visibleIconClass: "icon-eye2",
		hiddenIconClass: "icon-eye-slash",

		onAddTrack: function(event){
			console.log("addTrack Event: ", event)
			var tr = domConstruct.create("tr",{style:{width: "1.1em"}},this.trackTable);
			var color = domConstruct.create("td",{}, tr);
			if (typeof event.track.fill == 'function'){
				domConstruct.create("span", {innerHTML: "F", style: {border: "1px solid black", "font-size": ".85em", "font-weight": "600", padding: "2px", width: "20px",height: "20px", "vertical-align": "middle", "text-align": "center", margin: "2px"}},color)
			}else{
				var colorPicker = new ColorPicker({style: "margin: 2px; border: 1px solid #333;width:1em;height:1em;",color: event.track.fill || event.track.background.fill});
				domConstruct.place(colorPicker.domNode, color);
			}
			domConstruct.create("td", {innerHTML: event.track.title},tr)
			var td = domConstruct.create('td', {style:{"word-wrap": "nowrap","text-align": "right", "font-size": ".85em"}},tr);

			var visibleButton = domConstruct.create("i", {'class': "fa " + (event.track.visible?this.visibleIconClass:this.hiddenIconClass) + " fa-2x", style: {margin: "2px"}}, td);
			on(visibleButton,"click", lang.hitch(this,function(evt){
				if (event.isReferenceTrack) {
					domClass.add(visibleButton, this.visibleIconClass);
					domClass.add(visibleButton, "disabled");
				}
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


			var settingsButton = domConstruct.create("i", {'class': "fa icon-cog2 fa-2x", style: {margin: "2px"}}, td);
			on(settingsButton,"click", function(evt){
				new Dialog({content: "Track Settings not yet Implemented", title: "Track Settings"}).show();

			})

			domConstruct.create("i", {'class': "fa icon-close fa-2x"+(event.isReferenceTrack?" disabled":""), style: {margin: "2px"}}, td);
		}

	});
});