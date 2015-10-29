define([
	"dojo/_base/declare","dojox/widget/ColorPicker","dijit/_Widget","dojo/dom-style",
	"dijit/popup", "dojo/on","dijit/ColorPalette","dojo/_base/lang"
],function(
	declare,ColorPicker,WidgetBase,domStyle,
	Popup,on,ColorPalette,lang
){
	return declare([WidgetBase],{
		color: "#ff0000",
		postCreate: function(){
			this.inherited(arguments);
			domStyle.set(this.domNode,"background", this.color);
			on(this.domNode,"click", lang.hitch(this, function(evt){
				var dd = new ColorPalette({});
				Popup.moveOffScreen(dd);
				if (dd.startup && !dd._started) { dd.startup() }
				Popup.open({
					// parent: this,
					popup: dd,
					around: this.domNode,
					onExecute: function() { Popup.close(dd) },
					onCancel: function() { Popup.close(dd) },
					onClose: function() { Popup.close(dd) }
				})
			}));
		}
	});
});
