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
		templateString: '<div class="${baseClass}"><div data-dojo-attach-point="containerNode">${value}</div>',
		baseClass: "FilteredValueButton",
		category: "",
		value: null,
		selected: null,
		postCreate: function(){
			this.inherited(arguments);
			
		}
	})
});
