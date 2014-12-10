define("cid/widget/SlideShow", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class"
], function(
	declare, WidgetBase, on,
	domClass
){
	return declare([WidgetBase], {
		"baseClass": "SlideShow",
		"disabled":false
	});
});
