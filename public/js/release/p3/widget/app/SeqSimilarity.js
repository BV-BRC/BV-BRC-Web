require({cache:{
'url:p3/widget/app/templates/SeqSimilarity.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"appTemplate\" style=\"width: 450px;\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Sequence Similarity</h3>\n            <p>Sequence Similarity Search.</p>\n        </div>\n\n        <div class=\"formFieldsContainer\">\n            <div class=\"appBox appShadow\">\n\n                <div class=\"appRow\">\n                    <label class=\"paramlabel\">Query Sequence</label><br>\n                    <div data-dojo-type=\"dijit/form/SimpleTextarea\" name=\"searchSequence\"\n                         data-dojo-attach-point=\"searchSequence\" rows=\"10\" style=\"width:95%\"></div>\n                </div>\n\n                <div class=\"appRow\">\n                    <label>Search By</label><br>\n                    <div data-dojo-type=\"dijit/form/Select\" name=\"searchBy\" style=\"width:95%\"\n                         data-dojo-attach-point=\"searchBy\" data-dojo-attach-event=\"onChange:onSearchByChange\">\n                        <option value=\"genome\" selected=\"true\">Genome</option>\n                        <option value=\"taxon\">Species or Genus</option>\n                        <option value=\"genomeGroup\">Genome Group</option>\n                        <option value=\"featureGroup\">Feature Group</option>\n                        <option value=\"specialtyDBs\">Specialty DBs</option>\n                    </div>\n                </div>\n\n                <div class=\"appRow\" data-dojo-attach-point=\"genome_id_container\">\n                    <label>Genome</label><br>\n                    <div data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_id\" maxHeight=200 style=\"width:95%\"\n                         data-dojo-attach-point=\"genome_id\"></div>\n                </div>\n                <div class=\"appRow dijitHidden\" data-dojo-attach-point=\"taxon_id_container\">\n                    <label>Species or Genus</label><br>\n                    <div data-dojo-type=\"p3/widget/TaxonNameSelector\" name=\"taxon_id\" maxHeight=200 style=\"width:95%\"\n                         data-dojo-attach-point=\"taxon_id\"></div>\n                </div>\n\n                <div class=\"appRow dijitHidden\" data-dojo-attach-point=\"genomeGroup_container\">\n                    <label class=\"paramlabel\">Genome Group</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"genome_group\"\n                         data-dojo-attach-point=\"genomeGroup\" data-dojo-props=\"type:['genome_group'],multi:false\"></div>\n                </div>\n\n                <div class=\"appRow dijitHidden\" data-dojo-attach-point=\"featureGroup_container\">\n                    <label class=\"paramlabel\">Feature Group</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"feature_group\"\n                         data-dojo-attach-point=\"featureGroup\"\n                         data-dojo-props=\"type:['feature_group'],multi:false\"></div>\n                </div>\n                <div class=\"appRow\">\n                    <label class=\"paramlabel\">Target Type</label><br>\n                    <div data-dojo-type=\"dijit/form/Select\" name=\"targetType\" style=\"width:95%\"\n                         data-dojo-attach-point=\"targetType\">\n                        <option value=\"genome\">Contigs</option>\n                        <option value=\"taxon\">Feature DNA</option>\n                        <option value=\"genomeGroup\" selected=\"true\">Proteins</option>\n                    </div>\n                </div>\n\n\n                <!--\n                <div class=\"appRow\">\n                    <label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\"  data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                </div>\n                <div class=\"appRow\">\n                    <label class=\"paramlabel\">Output Name</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:85%\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                </div>\n                -->\n            </div>\n        </div>\n\n        <div class=\"appSubmissionArea\">\n\n            <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Searching for Sequence Similarity...\n            </div>\n            <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Error Submitting Job\n            </div>\n            <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Sequence Similarity search should be finished shortly. Check workspace for results.\n            </div>\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n            </div>\n        </div>\n    </div>\n</form>\n\n"}});
define("p3/widget/app/SeqSimilarity", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/SeqSimilarity.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog",
	"dojo/NodeList-traverse", "../../WorkspaceManager", "dojo/store/Memory", "dojox/widget/Standby"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstruct,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog,
			children, WorkspaceManager, Memory, Standby){
	return declare([AppBase], {
		"baseClass": "App SeqSimilarity",
		templateString: Template,
		applicationName: "Sequence Similarity",
		defaultPath: "",

		onSearchByChange: function(newVal){
			domClass.add(this.taxon_id_container, "dijitHidden");
			domClass.add(this.genomeGroup_container, "dijitHidden");
			domClass.add(this.featureGroup_container, "dijitHidden");
			domClass.add(this.genome_id_container, "dijitHidden");
			switch(newVal){
				case "genome":
					domClass.remove(this.genome_id_container, "dijitHidden");
					break;
				case "taxon":
					domClass.remove(this.taxon_id_container, "dijitHidden");
					break;

				case "genomeGroup":
					domClass.remove(this.genomeGroup_container, "dijitHidden");
					break;

				case "featureGroup":
					domClass.remove(this.featureGroup_container, "dijitHidden");
					break;

				case "specialtyDBs":
					break;
			}
		},
		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();
				domClass.add(this.domNode, "Working");
				domClass.remove(this.domNode, "Error");
				domClass.remove(this.domNode, "Submitted");

				if(window.App.noJobSubmission){
					var dlg = new Dialog({
						title: "Job Submission Params: ",
						content: "<pre>" + JSON.stringify(values, null, 4) + "</pre>"
					});
					dlg.startup();
					dlg.show();
					return;
				}
				this.submitButton.set("disabled", true);
				window.App.api.service("AppService.start_app", [this.applicationName, values]).then(function(results){
					console.log("Job Submission Results: ", results);
					domClass.remove(_self.domNode, "Working")
					domClass.add(_self.domNode, "Submitted");
					_self.submitButton.set("disabled", false);
					registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
						obj.reset();
					});
				}, function(err){
					console.log("Error:", err)
					domClass.remove(_self.domNode, "Working");
					domClass.add(_self.domNode, "Error");
					_self.errorMessage.innerHTML = err;
				})
			}else{
				domClass.add(this.domNode, "Error");
				console.log("Form is incomplete");
			}

		}
	});
});

