define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/TaxonomyOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "./GenomeFeatureSummary", "./DataItemFormatter", "./SpecialtyGeneSummary", "./ExternalItemFormatter"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
			SpecialtyGeneSummary, ExternalItemFormatter){

	var searchName = null;

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

			console.log("TAXON OVERVIEW SET STATE: ", state)
			if(state.taxonomy){
				this.set("taxonomy", state.taxonomy);
			}

			searchName = this.genome.taxon_name;
			console.log("pubmed search term = ", searchName);

			var sumWidgets = ["gfSummaryWidget", "pfSummaryWidget", "spgSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', this.state.search)
				}
			}, this)
		},

		"_setTaxonomyAttr": function(genome){
			this.genome = genome;
			this.createSummary(genome);

		},

		"createSummary": function(genome){
			domConstruct.empty(this.taxonomySummaryNode);
			domConstruct.place(DataItemFormatter(genome, "taxonomy_data", {hideExtra: true}), this.taxonomySummaryNode, "first");
			if(searchName != genome.taxon_name){
				domConstruct.empty(this.pubmedSummaryNode);
				domConstruct.place(ExternalItemFormatter(genome, "pubmed_data", {hideExtra: true}, this.pubmedSummaryNode2), this.pubmedSummaryNode, "first");
				this.pubmedSummaryNode2.style.display = 'block';
			}
		},

		onShowMore: function(){
			domConstruct.empty(this.pubmedSummaryNode);
			domConstruct.place(ExternalItemFormatter(this.genome, "pubmed_data", {hideExtra: false}, this.pubmedSummaryNode2), this.pubmedSummaryNode, "first");
			this.pubmedSummaryNode2.style.display = 'none';
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
