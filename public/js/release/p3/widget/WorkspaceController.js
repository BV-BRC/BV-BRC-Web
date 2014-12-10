define("p3/widget/WorkspaceController", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class"
], function(
	declare, WidgetBase, on,
	domClass
){
	return declare([WidgetBase], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		postCreate: function(){
			this.domNode.innerHTML = "WorkspaceController";
		}
	});
});
