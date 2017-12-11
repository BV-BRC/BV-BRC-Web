require({cache:{
'url:p3/widget/app/templates/Reconstruct.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\" style=\"width: 340px;\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Reconstruct Metabolic Model\n              <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n                  <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n              </div>\n              <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n              </div>\n            </h3>\n            <p>Reconstruct a Metabolic Model</p>\n        </div>\n\n        <div class=\"formFieldsContainer\">\n\n            <div class=\"appBox appShadow\">\n                <label class=\"appBoxLabel\">Select a Genome</label>\n                <div name=\"select-a-genome\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                </div>\n\n                <div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Genome</label><br>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                             data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome\" maxHeight=200 style=\"width:100%\"\n                             required=\"true\" data-dojo-attach-point=\"genome_nameWidget\"></div>\n                    </div>\n                </div>\n                <!--\n\n                <div class=\"appField\">\n                    <label for=\"genome\">Genome from Workspaces</label>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n                         name=\"genome\"\n                         style=\"width:100%\"\n                         required=\"true\"\n                         data-dojo-props=\"type:['job_result'],multi:false,promptMessage:'Select a genome job result in your workspace for Model Reconstruction',missingMessage:'Genome job result must be provided.'\">\n                    </div>\n                </div>\n                <div class=\"appRow\" style=\"margin-left: 145px;\">\n                    OR\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Genome from Data API</label><br>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/TaxonNameSelector\" name=\"genome\" maxHeight=200 style=\"width:100%\" data-dojo-attach-point=\"scientific_nameWidget\"></div>\n                    </div>\n                </div>\n                -->\n            </div>\n        </div>\n\n\n        <div style=\"width: 340px; margin:auto;\" class=\"formFieldsContainer\">\n            <div class=\"appBox appShadow\">\n                <label class=\"appBoxLabel\">Optional Parameters</label>\n                <div name=\"optional-parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                </div>\n\n                <!--\n                <div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Output Folder</label><br>\n                        <div data-dojo-attach-point=\"output_pathWidget\"\n                             data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n                             name=\"output_path\"\n                             style=\"width:100%\"\n                             data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your model. This will be a directory.',missingMessage:'Output Folder must be selected.'\"\n                             data-dojo-attach-event=\"onChange:onOutputPathChange\">\n                        </div>\n                    </div>\n                </div>\n                -->\n                <div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Media</label><br>\n                        <div data-dojo-type=\"p3/widget/MediaSelector\" name=\"media\" style=\"width:100%\"\n                             data-dojo-attach-point=\"mediaSelector\"></div>\n                    </div>\n                </div>\n\n                <div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Output Folder</label>\n                        <div data-dojo-attach-point=\"output_pathWidget\"\n                             data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" style=\"width:100%\"\n                             required=\"true\"\n                             data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your Reconstruction Results',missingMessage:'Output Folder must be selected.'\"\n                             data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\n\n                        <label>Output Name</label>\n                        <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n                                name=\"output_file\" data-dojo-attach-point=\"output_file\"\n                                style=\"width:85%\" required=\"true\"\n                                data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                    </div>\n                </div>\n\n                <!--<div class=\"appRow\">\n                    <div class=\"appField\">\n                        <label>Template Model</label><br>\n                        <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"template_model\" style=\"width:100%\" data-dojo-props=\"type:['genome'],multi:false,promptMessage:'Optionally select a template from which model should be constructed.'\"></div>\n                    </div>\n                </div>-->\n                <!--<div class=\"appRow\">\n                    <div class=\"appField\">\n                        <input name=\"core_model\" data-dojo-type=\"dijit/form/CheckBox\" value=\"true\" />\n                        <label for=\"coreModel\">Construct Core Model?</label>\n                    </div>\n                </div>-->\n\n                <!--<div class=\"appRow\">\n                    <div class=\"appField\">\n                        <input name=\"fulldb\" data-dojo-type=\"dijit/form/CheckBox\" checked=\"false\" />\n                        <label for=\"fulldb\">Include Full Database?</label>\n                    </div>\n                </div>-->\n            </div>\n        </div>\n\n\n        <div class=\"appSubmissionArea\">\n            <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Submitting Model Reconstruction Job\n            </div>\n\n            <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Error Submitting Job\n            </div>\n            <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Model Reconstruction Job has been queued.\n            </div>\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\"\n                     data-dojo-type=\"dijit/form/Button\">Cancel\n                </div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Reconstruct\n                </div>\n            </div>\n        </div>\n    </div>\n</form>\n"}});
define("p3/widget/app/Reconstruct", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Reconstruct.html", "./AppBase",
	"dojo/_base/lang", "../../WorkspaceManager",
	"../GenomeNameSelector", "../MediaSelector"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase,
			lang, WorkspaceManager,
			genomeSelector, MediaSelector){
	return declare([AppBase], {
		baseClass: "Modeling",
		templateString: Template,
		applicationName: "ModelReconstruction",
		applicationHelp: "user_guide/genome_data_and_tools/model_reconstruction_service.html",
		tutorialLink: "tutorial/metabolic_model_reconstruction/metabolic_model_reconstruction.html",
		pageTitle: "Reconstruct Metabolic Model",
		required: true,
		code_four: false,
		constructor: function(){

		},

		onSuggestNameChange: function(){
		},

		startup: function(){

			var _self = this;
			if(this._started){
				return;
			}

			this.inherited(arguments);
			this.mediaSelector.set("selected", "Complete");

			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_pathWidget.set('value', _self.defaultPath);
		},
		getValues: function(){
			var values = this.inherited(arguments);

			var gID = values.genome;
			values.genome = 'PATRICSOLR:' + gID;
			values.fulldb = (values.fulldb && values.fulldb.length) ? 1 : 0;

			if(values.output_file === '')
				values.output_file = gID + '_model';

			var mediaItem = this.mediaSelector.store.get(this.mediaSelector.get('value'));
			values.media = mediaItem.path;

			console.log('Running reconstruct with', values)
			return values;
		}

	});
});
