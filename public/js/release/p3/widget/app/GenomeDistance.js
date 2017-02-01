require({cache:{
'url:p3/widget/app/templates/GenomeDistance.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Genome Distance</h3>\n            <p>...</p>\n        </div>\n\n        <div class=\"service_form\">\n            <div class=\"appBox appShadow\">\n                <div class=\"headerrow\"  style=\"margin-bottom: 7px\">\n                    <label class=\"appBoxLabel\">Select a Genome</label>\n                </div>\n                <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                     data-dojo-type=\"p3/widget/GenomeNameSelector\"\n                     data-dojo-attach-point=\"genome_id\"\n                     data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"\n                     style=\"width:600px;\">\n                </div>\n                <div class=\"form_msg_warning\" data-dojo-attach-point=\"genome_message\"></div>\n            </div>\n\n            <div class=\"appBox appShadow hidden\" data-dojo-attach-point=\"fasta_wrapper\">\n                <div class=\"headerrow\" style=\"margin-bottom: 7px\">\n                    <label class=\"appBoxLabel\">Upload FASTA</label>\n                </div>\n                <div name=\"fasta\" style=\"width:100%\"></div>\n\n                <div class=\"form_msg_warning\" data-dojo-attach-point=\"fasta_message\"></div>\n            </div>\n\n            <div class=\"appRow\" style=\"text-align:center\">\n                <div class=\"appRowSegment\" data-dojo-attach-point=\"advanced\">\n                    <label class=\"largelabel\">Advanced options</label>\n                    <div class=\"iconbox\" style=\"margin-left:0\">\n                        <i data-dojo-attach-point=\"advancedOptionIcon\" class=\"fa icon-caret-down fa-1\"></i>\n                    </div>\n                </div>\n            </div>\n\n            <div data-dojo-attach-point=\"advancedOptions\" style=\"display: none\">\n                <div class=\"appBox appShadow\">\n                    <div class=\"headerrow\">\n                        <label class=\"appBoxLabel\">Parameters</label>\n                    </div>\n                    <div class=\"left third\">\n                        <label class=\"paramlabel\">Max hits: </label><br/>\n                        <select name=\"max_target\" style=\"width: 100px\"\n                                data-dojo-type=\"dijit/form/Select\"\n                                data-dojo-attach-point=\"max_hits\">\n                            <option value=\"1\">1</option>\n                            <option value=\"10\">10</option>\n                            <option value=\"50\" selected=\"selected\">50</option>\n                            <option value=\"100\">100</option>\n                            <option value=\"500\">500</option>\n                        </select>\n                    </div>\n\n                    <div class=\"left third\">\n                        <label class=\"paramlabel\">E value threshold: </label><br/>\n                        <select name=\"threshold\" type=\"text\" value=0.01 style=\"width:50px\"\n                               data-dojo-type=\"dijit/form/Select\"\n                               data-dojo-attach-point=\"evalue\">\n                            <option value=0.0001>0.0001</option>\n                            <option value=0.001>0.001</option>\n                            <option value=0.01 selected=\"selected\">0.01</option>\n                            <option value=0.1>0.1</option>\n                            <option value=1>1</option>\n                            <option value=10>10</option>\n                        </select>\n                    </div>\n                    <div class=\"clear\"></div>\n                </div>\n            </div>\n\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-type=\"dijit/form/Button\"\n                     data-dojo-attach-point=\"mapButton\"\n                     data-dojo-attach-event=\"onClick:submit\"\n                     data-dojo-props=\"disabled:false\">\n                    Search\n                </div>\n            </div>\n        </div>\n        <div class=\"reSubmitBtn\" style=\"visibility: hidden\"\n             data-dojo-type=\"dijit/form/Button\"\n             data-dojo-attach-event=\"onClick:resubmit\">Edit form and resubmit\n        </div>\n    </div>\n\n    <div class=\"service_error hidden\">\n        <h3></h3>\n        <div class=\"service_message\"></div>\n    </div>\n    <div class=\"genomedistance_result\"></div>\n</form>\n\n"}});
define("p3/widget/app/GenomeDistance", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/query", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style", "dojo/topic",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/GenomeDistance.html", "dijit/form/Form",
	"../viewer/GenomeDistance", "../../util/PathJoin", "../../WorkspaceManager", "../WorkspaceObjectSelector"
], function(declare, lang, Deferred,
			on, query, domClass, domConstruct, domStyle, Topic,
			WidgetBase, Templated, WidgetsInTemplate,
			Template, FormMixin,
			ResultContainer, PathJoin, WorkspaceManager, WorkspaceObjectSelector){

	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "GenomeDistance",
		templateString: Template,
		loadingMask: null,
		result_store: null,
		result_grid: null,
		defaultPath: "",

		startup: function(){

			// activate genome group selector when user is logged in
			if(window.App.user){
				this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

				var fastaDom = query('div[name="fasta"]')[0];

				this.fasta = new WorkspaceObjectSelector();
				// console.log("default path: ", this.defaultPath);
				this.fasta.set('path', this.defaultPath);
				this.fasta.set('type', ['contigs']);
				this.fasta.placeAt(fastaDom, "only");

				domClass.remove(this.fasta_wrapper, "hidden");
			}

			on(this.advanced, 'click', lang.hitch(this, function(){
				this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
			}));

			this.result = new ResultContainer({
				id: this.id + "_genomedistanceResult",
				style: "min-height: 700px; visibility:hidden;"
			});
			this.result.placeAt(query(".genomedistance_result")[0]);
			this.result.startup();

			Topic.subscribe("GenomeDistance_UI", lang.hitch(this, function(){
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "showErrorMessage":
						this.showErrorMessage(value);
						this.hideResultGridContainer();
						break;
					case "showNoResultMessage":
						this.showNoResultMessage();
						this.hideResultGridContainer();
						break;
					default:
						break;
				}
			}));
		},

		toggleAdvanced: function(flag){
			if(flag){
				this.advancedOptions.style.display = 'block';
				this.advancedOptionIcon.className = "fa icon-caret-left fa-1";
			}
			else{
				this.advancedOptions.style.display = 'none';
				this.advancedOptionIcon.className = "fa icon-caret-down fa-1";
			}
		},

		validate: function(){
			// console.log("validate", this.sequence.get('value'), (this.sequence.get('value')).length,  this.database.get('value'), this.program.get('value'));

			// var sequence = this.sequence.get('value');
			//
			// if(sequence && sequence.length > 1
			// 	&& this.database.get('value')
			// 	&& this.program.get('value')
			// 	&& this.hasSingleFastaSequence(sequence)){
			//
			// 	// console.log("validation passed");
			// 	this.mapButton.set('disabled', false);
				return true;
			// }else{
			// 	this.mapButton.set('disabled', true);
			// 	return false;
			// }
		},

		submit: function(){
			var _self = this;

			var selectedGenomeId = this.genome_id.get('value');

			// params
			var max_pvalue = this.evalue.get('value');
			var max_distance = 0.01;
			var max_hits = parseInt(this.max_hits.get('value'));
			var include_reference = 0;
			var include_representative = 0;

			var def = new Deferred();
			var resultType = "genome";

			if(selectedGenomeId !== ""){

				var q = {
					method: "Minhash.compute_genome_distance_for_genome",
					params: [selectedGenomeId, max_pvalue, max_distance, max_hits, include_reference, include_representative]
				};
				def.resolve(q)
			}else{

				var path = this.fasta.get('value');

				if(path === ''){
					this.fasta_message.innerHTML = "No FASTA file has selected";
					return;
				}

				WorkspaceManager.getObject(path, true).then(lang.hitch(this, function(file){

					if(file.link_reference && file.size > 0 && file.type == "contigs"){
						var q = {
							method: "Minhash.compute_genome_distance_for_fasta",
							params: [path, max_pvalue, max_distance, max_hits, include_reference, include_representative]
						};
						def.resolve(q);
					}else{
						Topic.publish("GenomeDistance_UI", "showErrorMessage", "File is not loaded completely.");
						def.reject();
					}
				}));
			}

			//
			// _self.result.loadingMask.show();
			query(".genomedistance_result .GridContainer").style("visibility", "visible");
			domClass.add(query(".service_form")[0], "hidden");
			domClass.add(query(".appSubmissionArea")[0], "hidden");
			domClass.add(query(".service_error")[0], "hidden");
			query(".reSubmitBtn").style("visibility", "visible");

			def.promise.then(function(q){
				_self.result.set('state', {query: q, resultType: resultType});
			});

		},

		resubmit: function(){
			domClass.remove(query(".service_form")[0], "hidden");
			domClass.remove(query(".appSubmissionArea")[0], "hidden");
			query(".reSubmitBtn").style("visibility", "hidden");
		},

		showErrorMessage: function(err){
			domClass.remove(query(".service_error")[0], "hidden");
			domClass.remove(query(".service_message")[0], "hidden");
			query(".service_error h3")[0].innerHTML = "We were not able to complete your request. Please let us know with detail message below.";
			query(".service_message")[0].innerHTML = err;//.response.data.error.message;

			query(".genomedistance_result .GridContainer").style("visibility", "hidden");
		},

		showNoResultMessage: function(){
			domClass.remove(query(".service_error")[0], "hidden");
			query(".service_error h3")[0].innerHTML = "Genome Distance Service has no match. Please revise query and submit again.";
			domClass.add(query(".service_message")[0], "hidden");

			query(".genomedistance_result .GridContainer").style("visibility", "hidden");
		},

		hideResultGridContainer: function(){
			domStyle.set(this.result.domNode, 'visibility', 'hidden');
		},

		onSuggestNameChange: function(){
			this.validate();
		}
	});
});
