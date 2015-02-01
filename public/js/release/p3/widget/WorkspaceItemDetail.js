define("p3/widget/WorkspaceItemDetail", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class"
], function(
	declare, WidgetBase, on,
	domClass
){
	return declare([WidgetBase], {
		"baseClass": "WorkspaceItemDetail",
		"disabled":false,
		postCreate: function(){
			this.domNode.innerHTML = "WorkspaceItemDetail";
		}
	});
});
