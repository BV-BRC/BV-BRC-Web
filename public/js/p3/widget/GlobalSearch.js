define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/dom-construct",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/GlobalSearch.html","./Button","dijit/registry","dojo/_base/lang",
	"dojo/dom","dojo/topic","dijit/form/TextBox","dojo/keys","dijit/_FocusMixin","dijit/focus"
], function(
	declare, WidgetBase, on,domConstruct,
	domClass,Templated,WidgetsInTemplate,
	template,Button,Registry,lang,
	dom,Topic,TextBox,keys,FocusMixin,focusUtil
){
	return declare([WidgetBase,Templated,WidgetsInTemplate,FocusMixin], {
		templateString: template,
		constructor: function(){
		},
		"baseClass": "GlobalSearch",
		"disabled":false,
		"value": "",
		_setValueAttr: function(q){
			this.query=q;	
			this.searchInput.set("value", q);
		},

		onKeypress: function(evt){
			if (evt.charOrCode==keys.ENTER) {
				focusUtil.curNode.blur();
			}
		},

		onInputChange: function(val){
			val = val.replace(/\ /g, "&");
			var dest = window.location.pathname + "?" + val;
			console.log("New Search Value",val,dest );
			Topic.publish("/navigate", {href: dest, set: "query", value: "?"+val});
		}
	});
});


