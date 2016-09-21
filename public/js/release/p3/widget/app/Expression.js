require({cache:{
'url:p3/widget/app/templates/Expression.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 670px;margin:auto;\">\n\t<div class=\"apptitle\" id=\"apptitle\">\n\t    <h3>Differential Expression Import</h3>\n\t    <p>Transform differential expression data for viewing on PATRIC</p>\n\t</div>\n  \n\t<div style=\"width:670px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<table class=\"assemblyblocks\">\n\t\t<tr>\n\t\t<td style=\"height:150px;\">\n\n\t\t<div id=\"dataBox\" style=\"width:300px\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Experiment Data</label>\n\t\t\t\t\t<div name=\"datainfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div style=\"text-align:left;\">\n\t\t\t\t\t<label>Experiment Data File</label><br>\n\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"xfile\" name=\"xfile\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['expression_gene_matrix', 'expression_gene_list', 'diffexp_input_data'],multi:false,promptMessage:'Select or Upload an comparison data file to your workspace',missingMessage:'An comparison file must be provided.'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"halfAppRow\">\n\t\t\t\t\t<label>Experiment Type</label><br>\n\t\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"data_type\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t\t<option value=\"transcriptomics\">Transcriptomics</option>\n\t\t\t\t\t\t<option value=\"proteomics\">Proteomics</option>\n\t\t\t\t\t\t<option value=\"phenomics\">Phenomics</option>\n\t\t\t\t\t</select>\n\t\t\t\t</div>\n\t\t\t</div>\n            <div class=\"approw\">\n                <div class=\"text-align:left;\">\n                    <label>Target Genome</label><br>\n                    <div data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_id\" maxHeight=200 style=\"width:90%\" data-dojo-props=\"placeHolder: 'Optional'\", required=\"false\" data-dojo-attach-point=\"genome_nameWidget\"></div>\n                </div> \n            </div>\n\t\t\t\n\t\t</div>\n\t\t</td>\n\t\t<td rowspan=\"2\">\n\t\t<div id=\"experimentBox\" style=\"margin-left:0px\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Experiment Information</label>\n\t\t\t\t\t<div name=\"experimentinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"appField\">\n\t\t\t\t<label>Experiment Title</label><br>\n\t\t\t\t<div data-dojo-attach-point=\"output_nameWidget\" data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"experiment_title\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Title of the experiment',missingMessage:'Experiment title must be provided',trim:true,placeHolder:'Title'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"appField\">\n\t\t\t\t<label>Experiment Description</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"experiment_description\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Description of the experiment.',missingMessage:'Experiment description must be provided.',trim:true,placeHolder:'Description'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n            <div class=\"approw\">\n                    <div class=\"appField\">\n                            <label>Organism Name</label><br>\n                            <div data-dojo-type=\"p3/widget/TaxonNameSelector\" name=\"organism\" maxHeight=200 style=\"width:100%\" required=\"false\" data-dojo-attach-point=\"scientific_nameWidget\"></div>\n                    </div>\n            </div>\n\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"appField\">\n\t\t\t\t<label>Pubmed ID</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"pmid\" style=\"width:100%\" required=\"false\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Pubmed ID is optional',missingMessage:'A taxonmic name must be provided.',trim:true,placeHolder:'Optional'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label>Output Folder</label><br>\n\t\t\t\t<div data-dojo-attach-point=\"output_pathWidget\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your Annotation Results',missingMessage:'Output Folder must be selected.'\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\t\t\t</div>\n\t\t\t\n\t\t</div>\n\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t<td>\n\t\t<div id=\"metaBox\" style=\"width:300px\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Optional Metadata</label>\n\t\t\t\t\t<div name=\"optionalinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label>Metadata File</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"mfile\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['expression_experiment_metadata', 'diffexp_input_metadata'],multi:false,promptMessage:'Select or Upload an comparison data file to your workspace',missingMessage:'Comparison metadata is optional.'\"></div>\n\t\t\t</div>\n\t\t</td>\n\t\t</table>\n\t</div>\n\t</div>\n\n\t<div class=\"appSubmissionArea\">\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t    Converting Expression Data\n\t\t</div>\n\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tConversion should be finished shortly. Check workspace for results.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/Expression", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Expression.html", "./AppBase", "p3/widget/WorkspaceFilenameValidationTextBox", "../../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase, WorkspaceFilenameValidationTextBox, WorkspaceManager){
	return declare([AppBase], {
		"baseClass": "Expression",
		templateString: Template,
		applicationName: "DifferentialExpression",
		pageTitle: "Differential Expression Import",
		defaultPath: "",
		constructor: function(){
			this._selfSet = true;
		},
		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);
			_self.defaultPath = WorkspaceManager.getDefaultFolder("experiment_folder") || _self.activeWorkspacePath;
			_self.output_pathWidget.set('value', _self.defaultPath);
		},
		getValues: function(){
			var values = this.inherited(arguments);
			var exp_values = {};
			var ustring_keys = ["xformat", "source_id_type", "data_type", "experiment_title", "experiment_description", "organism", "metadata_format", "genome_id"];
			var ustring = {};
			ustring_keys.forEach(function(k){
				ustring[k] = values[k];
			});
			//get xsetup from object type
			ustring["xsetup"] = this.xfile.searchBox.get("item").type == 'expression_gene_matrix' ? 'gene_matrix' : 'gene_list'; // should be this.xfile.get("selection").type but need to fix on quick drop
			ustring["organism"] = this.scientific_nameWidget.get('displayedValue');
			exp_values["ustring"] = JSON.stringify(ustring);
			exp_values["xfile"] = values["xfile"];
			exp_values["mfile"] = values["mfile"];
			exp_values["output_path"] = values["output_path"];
			exp_values["output_file"] = values["experiment_title"];

			return exp_values;
		}

	});
});

