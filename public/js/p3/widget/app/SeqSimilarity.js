define([
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
		tutorialLink: "tutorial/similar_genome_finder/similar_genome_finder.html",
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

