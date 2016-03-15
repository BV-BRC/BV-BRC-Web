require({cache:{
'url:p3/widget/app/templates/SeqSimilarity.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 450px;margin:auto;\">\n\t<div class=\"apptitle\" id=\"apptitle\">\n\t    <h3>Sequence Similarity</h3>\n\t    <p>Sequence Similarity Search.</p>\n\t</div>\n  \n\t<div style=\"width:450px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div id=\"dataBox\" class=\"appbox appshadow\">\n\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label for=\"searchSequence\" class=\"paramlabel\">Query Sequence</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/SimpleTextarea\"  name=\"searchSequence\" data-dojo-attach-point=\"searchSequence\" rows=\"10\" style=\"width:95%\"></div>\n\t\t\t</div>\n\t\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label>Search By</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/Select\" name=\"searchBy\" style=\"width:95%\" data-dojo-attach-point=\"searchBy\" data-dojo-attach-event=\"onChange:onSearchByChange\">\n\t\t\t\t\t<option value=\"genome\" selected=\"true\">Genome</option>\n\t\t\t\t\t<option value=\"taxon\">Species or Genus</option>\n\t\t\t\t\t<option value=\"genomeGroup\">Genome Group</option>\n\t\t\t\t\t<option value=\"featureGroup\">Feature Group</option>\n\t\t\t\t\t<option value=\"specialtyDBs\">Specialty DBs</option>\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<div class=\"approw\"  data-dojo-attach-point=\"genome_id_container\">\n\t\t\t\t<label>Genome</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_id\" maxHeight=200 style=\"width:95%\" data-dojo-attach-point=\"genome_id\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw dijitHidden\"  data-dojo-attach-point=\"taxon_id_container\">\n\t\t\t\t<label>Species or Genus</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/TaxonNameSelector\" name=\"taxon_id\" maxHeight=200 style=\"width:95%\"  data-dojo-attach-point=\"taxon_id\"></div>\n\t\t\t</div>\n\n\t\t\t<div class=\"approw dijitHidden\"  data-dojo-attach-point=\"genomeGroup_container\">\n\t\t\t\t<label for=\"genomeGroup\" class=\"paramlabel\">Genome Group</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"genome_group\" data-dojo-attach-point=\"genomeGroup\"  data-dojo-props=\"type:['genome_group'],multi:false\"></div>\n\t\t\t</div>\n\n\t\t\t<div class=\"approw dijitHidden\"  data-dojo-attach-point=\"featureGroup_container\">\n\t\t\t\t<label for=\"featureGroup\" class=\"paramlabel\">Feature Group</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"feature_group\" data-dojo-attach-point=\"featureGroup\"  data-dojo-props=\"type:['feature_group'],multi:false\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\" >\n\t\t\t\t<label class=\"paramlabel\">Target Type</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/Select\" name=\"targetType\" style=\"width:95%\" data-dojo-attach-point=\"targetType\">\n\t\t\t\t\t<option value=\"genome\">Contigs</option>\n\t\t\t\t\t<option value=\"taxon\">Feature DNA</option>\n\t\t\t\t\t<option value=\"genomeGroup\" selected=\"true\">Proteins</option>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\n\t\t\t\n\t\t\t<!--\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\"  data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label class=\"paramlabel\">Output Name</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:85%\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\t\t\t-->\n\t\t</div>\n\t</div>\n\n\t<div class=\"appSubmissionArea\">\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t   \tSearching for Sequence Similarity... \n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tSequence Similarity search should be finished shortly. Check workspace for results.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\n\t</div>\n</form>\n\n"}});
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

