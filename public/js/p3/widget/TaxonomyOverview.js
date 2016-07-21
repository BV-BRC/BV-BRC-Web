define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/TaxonomyOverview.html",
	"dojo/request", "dojo/_base/lang", "dojo/when",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "./GenomeFeatureSummary", "./DataItemFormatter", "./ExternalItemFormatter"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang, when,
			ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
			ExternalItemFormatter
){

	let searchName = null;

	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "TaxonomyOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		genome: null,
		state: null,
		genome_ids: null,

		_setStateAttr: function(state){
			this._set("state", state);

			if(state.taxonomy){
				this.set("taxonomy", state.taxonomy);
			}

			searchName = this.genome.taxon_name; 

			const sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget", "apmSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', this.state.search)
				}
			}, this)
		},

		"_setTaxonomyAttr": function(genome){
			this.genome = genome;
			this.createSummary(genome);
			// this.getWikiDescription(genome);
		},

		"createSummary": function(genome){
			domConstruct.empty(this.taxonomySummaryNode);
			domConstruct.place(DataItemFormatter(genome, "taxonomy_data", {}), this.taxonomySummaryNode, "first");
			if(searchName != genome.taxon_name){
				domConstruct.empty(this.pubmedSummaryNode);
				domConstruct.place(ExternalItemFormatter(genome, "pubmed_data", {}), this.pubmedSummaryNode, "first");
			}
		},

		getWikiDescription: function(genome){

			const wikiApiUrl = "https://en.wikipedia.org/w/api.php";

			const token = "?action=centralauthtoken&format=json";
			const query = "?action=query&prop=extracts&exintro=&format=json&titles=";

			const origin = "&origin=" + window.location.origin;

			let taxonName = genome.taxon_name.split(" ").join("+");

			if(searchName != genome.taxon_name){

				// when(xhr.get(wikiApiUrl + token + origin, {
				// 	handleAs: 'json',
				// 	headers: {
				// 		'X-Requested-With': null,
				// 		'Accept': 'application/json'
				// 	}
				// }), function(data){
				// 	console.log(data);
					when(xhr.get(wikiApiUrl + query + taxonName + origin, {
						handleAs: 'json',
						headers: {
							'X-Requested-With': null,
							'Accept': 'application/json'
						}
					}), function(response){
						console.log("response: ", response);
					});
				// })
			}
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);

			if(this.genome){
				this.set("genome", this.genome);
			}
		}
	});
});
