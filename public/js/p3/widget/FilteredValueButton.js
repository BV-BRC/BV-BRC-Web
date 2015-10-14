define([
	"dojo/_base/declare", "dojo/on","dojo/_base/Deferred","dijit/_Templated",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_WidgetBase",
	"dojo/_base/xhr", "dojo/_base/lang", "dojo/dom-attr","dojo/query",
	"dojo/dom-geometry", "dojo/dom-style","dojo/when"
], function(declare, on, Deferred,Templated,
			domClass, domConstruct,WidgetBase,
			xhr, lang, domAttr,Query,
			domGeometry,domStyle, when) {

	return declare([WidgetBase,Templated], {
		templateString: '<div style="padding:2px;font-size=1em;" class="${baseClass}"><div data-dojo-attach-point="valueNode" style: "margin:2px;font-size:.9em;">${value}</div><div data-dojo-attach-point="categoryNode" style="margin: 2px; font-size: 0.75em; color: rgb(52, 105, 142);">${category}</div></div>',
		baseClass: "FilteredValueButton",
		category: "",
		value: null,
		selected: null,

		postCreate: function(){
			this.inherited(arguments);
			
		}
	})
});
