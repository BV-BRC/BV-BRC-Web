define("cid/widget/FilterPanel", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dijit/layout/BorderContainer",
	"dojo/dom-class", "dojo/store/Memory",
	"dijit/tree/ObjectStoreModel", "dijit/layout/ContentPane"

], function(
	declare, WidgetBase, on,BorderContainer,
	domClass,Memory,
	ObjectStoreModel, ContentPane
){

	return declare([BorderContainer], {
		"class": "FilterPanel",
		gutters: false,
		postCreate: function(){
			this.inherited(arguments);
			this.addChild(new ContentPane({region: "top",content: "SearchBox"}))
			this.addChild(new ContentPane({region: "center",content: "Facet Area"}))
		}
	});

});
