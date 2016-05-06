require({cache:{
'url:p3/widget/app/templates/Sleep.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n\t\t<h2>Sleep</h2>\n\t\t<p>Sleep Application For Testing Purposes</p>\n\t\t<div style=\"margin-top:10px;text-align:left\">\n\t\t\t<label>Sleep Time</label><br>\n\t\t\t<input data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" name=\"sleep_time\" require=\"true\" data-dojo-props=\"constraints:{min:1,max:100}\" />\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSubmitting Sleep Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\t\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSleep Job has been queued.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n\t\t</div>\t\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/Sleep", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Sleep.html", "./AppBase"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase){
	return declare([AppBase], {
		"baseClass": "App Sleep",
		templateString: Template,
		applicationName: "Sleep"
	});
});
