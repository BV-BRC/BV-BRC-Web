require({cache:{
'url:p3/widget/app/templates/Annotation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"TitleSection\">\n\t\t<h3>Genome Annotation</h3>\n  \t  \t<p>Calls and annotates genes using RAST.</p>\n    </div>\n  \n\t<div style=\"width:300px;margin:auto;padding:10px; border-radius:4px; text-align:left;\">\n\t\t<div style=\"display:inline-block; padding:8px; border:1px solid #ddd;margin:auto\" class=\"formFieldsContainer\">\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Contigs</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['contigs'],multi:false,promptMessage:'Select or Upload Contigs to your workspace for Annotation',missingMessage:'Contigs must be provided.'\"></div>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Organism Name</label><br>\n\t\t\t\t<div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"scientific_name\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Scientific name of the organism being annotated.',missingMessage:'Scientific Name must be provided.',trim:true,placeHolder:'Bacillus Cereus'\"></div>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Genetic Code</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"code\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"11\">11</option>\n\t\t\t\t\t<option value=\"4\">4</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Domain</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"domain\" data-dojo-attach-point=\"workspaceName\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"bacteria\">Bacteria</option>\n\t\t\t\t\t<option value=\"archaea\">Archaea</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Output Folder</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your Annotation Results',missingMessage:'Output Folder must be selected.'\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t<label>Output Name</label><br>\n\t\t\t\t<div data-dojo-attach-point=\"output_nameWidget\" data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'The output name for your Annotation Results',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t</div>\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n            Submitting Annotation Job\n        </div>\n\n        <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n                Error Submitting Job\n        </div>\n        <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n                Annotation Job has been queued.\n        </div>\n        <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Annotate</div>\n        </div>\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/Annotation", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Annotation.html","./AppBase","p3/widget/WorkspaceFilenameValidationTextBox"
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
		}

	});
});

