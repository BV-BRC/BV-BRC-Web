require({cache:{
'url:p3/widget/app/templates/Annotation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"TitleSection\">\n\t\t<h3>Annotate Genome</h3>\n  \t  \t<p>Calls genes and functionally annotates an input contig set.</p>\n    </div>\n  \n\t<div style=\"width:300px;margin:auto;padding:10px; border-radius:4px; text-align:left;\">\n\t\t<div style=\"display:inline-block; padding:8px; border:1px solid #ddd;margin:auto\" class=\"formFieldsContainer\">\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Contigs</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['contigs'],multi:false\"></div>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Scientific Name</label><br>\n\t\t\t\t<div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Scientific name of the organism',missingMessage:'Scientific Name must be provided.',trim:true,placeHolder:'Bacillus Cereus'\"></div>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Genetic Code</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"geneticCode\" data-dojo-attach-point=\"workspaceName\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"11\">11</option>\n\t\t\t\t\t<option value=\"4\">4</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Domain</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"domain\" data-dojo-attach-point=\"workspaceName\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"bacteria\">Bacteria</option>\n\t\t\t\t\t<option value=\"archaea\">Archaea</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Output Location</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_location\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}'\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Output Name</label><br>\n\t\t\t\t<div data-dojo-attach-point=\"output_nameWidget\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"output_file\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Prefix for the output files',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t</div>\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n            Submitting Annotation Job\n        </div>\n\n        <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n                Error Submitting Job\n        </div>\n        <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n                Annotation Job has been queued.\n        </div>\n        <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Annotate</div>\n        </div>\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/Annotation", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Annotation.html","./AppBase"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,AppBase
){
	return declare([AppBase], {
		"baseClass": "Annotation",
		templateString: Template,
		applicationName: "GenomeAnnotation",
		constructor: function(){
			this._selfSet=true;
		},	
	
		onSuggestNameChange: function(val){
			if (val && !this.output_nameWidget.get('value') || (this.output_nameWidget.get('value')&&this._selfSet)  ){
				this._selfSet=true;	
				this.output_nameWidget.set('value', val);
			}
		},

		getValues: function(){
			var vals = this.inherited(arguments);
			vals.contigs = "_uuid/" + vals.contigs;
			vals.output_location = "_uuid/" + vals.output_location;
			return vals;
		}
	});
});

