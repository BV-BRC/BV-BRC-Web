require({cache:{
'url:p3/widget/templates/DeveloperPanel.html':"<div class=\"DeveloperPanel\">\n\t<table style=\"width: 100%\">\n\t\t<tr>\n\t\t\t<td style=\"text-align:center;\"><input data-dojo-type=\"dijit/form/CheckBox\" value=\"showHiddenFiles\" checked=\"false\" data-dojo-attach-event=\"onChange:onChangeShowHidden\" /></td>\n\t\t\t<td style=\"text-align: left;\">Show Hidden Files</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td style=\"text-align:center;\"><input data-dojo-type=\"dijit/form/CheckBox\" value=\"noJobSubmmisions\" checked=\"false\" data-dojo-attach-event=\"onChange:onChangeNoJobSubmission\" /></td>\n\t\t\t<td style=\"text-align: left;\">Don't Submit Jobs (print to params to console)</td>\n\t\t</tr>\n\t\n\t</table>\n</div>\n"}});
define("p3/widget/DeveloperPanel", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/DeveloperPanel.html", "dojo/topic"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, Topic){
	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		"baseClass": "DeveloperPanel",
		templateString: Template,
		showHiddenFiles: false,
		noJobSubmission: false,
		postMixInProperties: function(){
			this.inherited(arguments);
			this.showHiddenFiles = window.App.showHiddenFiles || false;
			this.noJobSubmission = window.App.noJobSubmission || false;
		},
		onChangeShowHidden: function(val){
			this.showHiddenFiles = window.App.showHiddenFiles = val;
			console.log("toggle showHiddenFiles", this.showHiddenFiles);
			Topic.publish("/refreshWorkspace", {});
		},
		onChangeNoJobSubmission: function(val){
			this.noJobSubmission = window.App.noJobSubmission = val;
			console.log("toggle noJobSubmission", this.noJobSubmission);
		}
	});
});

