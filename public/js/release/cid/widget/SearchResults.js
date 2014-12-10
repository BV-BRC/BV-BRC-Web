require({cache:{
'url:cid/widget/templates/GlobalSearch.html':"<div class=\"GlobalSearch\">\n\t<input data-dojo-type=\"dijit/form/TextBox\" data-dojo-attach-event=\"onChange:onInputChange,keypress:onKeypress\" data-dojo-attach-point=\"searchInput\" style=\"width:100%\" />\n</div>\n"}});
define("cid/widget/SearchResults", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/dom-construct",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/GlobalSearch.html","./Button","dijit/registry","dojo/_base/lang",
	"dojo/dom","dojo/topic"
], function(
	declare, WidgetBase, on,domConstruct,
	domClass,Templated,WidgetsInTemplate,
	template,Button,Registry,lang,
	dom,Topic
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		templateString: template,
		constructor: function(){
		},
		"baseClass": "GlobalSearch",
		"disabled":false,
		onInputChange: function(val){
			console.log("New Search Value",val);
		}
	});
});


