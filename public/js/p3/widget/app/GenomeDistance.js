define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/query", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style", "dojo/topic",
	"./AppBase",
	"dojo/text!./templates/GenomeDistance.html", "dijit/form/Form",
	"../viewer/GenomeDistance", "../../util/PathJoin", "../../WorkspaceManager", "../WorkspaceObjectSelector"
], function(declare, lang, Deferred,
			on, query, domClass, domConstruct, domStyle, Topic,
			AppBase,
			Template, FormMixin,
			ResultContainer, PathJoin, WorkspaceManager, WorkspaceObjectSelector){

	return declare([AppBase], {
		"baseClass": "App GenomeDistance",
		templateString: Template,
		tutorialLink: "tutorial/similar_genome_finder/similar_genome_finder.html",
		loadingMask: null,
		result_store: null,
		result_grid: null,
		defaultPath: "",

		startup: function(){
			if (this._started) { return; }
			this.inherited(arguments);

			// activate genome group selector when user is logged in
			if(window.App.user){
				this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

				var fastaDom = query('div[name="fasta"]')[0];

				this.fasta = new WorkspaceObjectSelector();
				// console.log("default path: ", this.defaultPath);
				this.fasta.set('path', this.defaultPath);
				this.fasta.set('type', ['contigs']);
				this.fasta.set('required', false);
				this.fasta.on('change', lang.hitch(this, "onFastaChange"));
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
			// console.log("validate", this.genome_id.get('value'), this.fasta.get('value'), !(this.genome_id.get('value') == '' && this.fasta.get('value') == ''));

			return !(this.genome_id.get('value') == '' && this.fasta.get('value') == '');
		},

		submit: function(){
			var _self = this;

			var selectedGenomeId = this.genome_id.get('value');

			// params
			var max_pvalue = parseFloat(this.pvalue.get('value')) || 0.01;
			var max_distance = parseFloat(this.distance.get('value')) || 0.01;
			var max_hits = parseInt(this.max_hits.get('value'));
			var scope_ref = this.scope_ref.get('value');
			var scope_all = this.scope_all.get('value');
			var include_reference, include_representative;
			if(scope_ref == "ref" && scope_all === false){
				include_reference = 1;
				include_representative = 1;
			}else{
				include_reference = 0;
				include_representative = 0;
			}

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
				// log GA
				if(window.gtag){
					gtag('event', 'SimilarGenomeFinder', {'event_category': 'Services', 'method': q.method});
				}

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
			query(".service_error h3")[0].innerHTML = "Similar Genome Finder returned no hit. Please revise parameters and submit again.";
			domClass.add(query(".service_message")[0], "hidden");

			query(".genomedistance_result .GridContainer").style("visibility", "hidden");
		},

		hideResultGridContainer: function(){
			domStyle.set(this.result.domNode, 'visibility', 'hidden');
		},

		onFastaChange: function(){
			// when fasta file chosen
			// console.log("onFastaChange", this.fasta.get('value'), this.genome_id.get('value'));
			if(this.genome_id.get('value') !== '' && this.fasta.get('value') !== ''){
				this.genome_id.reset();
			}
			// 2nd call due to the genome name change
			// if(this.genome_id.get('value') !== '' && this.fasta.get('value') == ''){
			// 	console.log("2nd call");
			// }
			this.validate();
		},

		onSuggestNameChange: function(){
			// console.log("onGenomeIDChange", this.fasta.get('value'), this.genome_id.get('value'));
			if(this.fasta && this.fasta.get('value') !== '' && this.genome_id.get('value') !== ''){
				this.fasta.reset();
			}
			this.validate();
		}
	});
});
