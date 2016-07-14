require({cache:{
'url:p3/widget/templates/TaxonomyOverview.html':"<div>\n    <div class=\"column-sub\">\n        <div class=\"section\">\n            <div data-dojo-attach-point=\"taxonomySummaryNode\">\n                Loading Taxonomy Summary...\n            </div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n            <div data-dojo-attach-point=\"rgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-prime\">\n        <div class=\"section hidden\">\n            <h3 class=\"section-title\"><span class=\"wrap\">AMR Panel Summary</span></h3>\n            <div class=\"apmSummaryWidget\" data-dojo-attach-point=\"apmSummaryWidget\"\n                 data-dojo-type=\"p3/widget/AMRPanelMetaSummary\">\n            </div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Genome Metadata Summary</span></h3>\n            <div class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeMetaSummary\">\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-opt\">\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n            <div data-dojo-attach-point=\"pubmedSummaryNode\">\n                Loading...\n            </div>\n        </div>\n    </div>\n</div>\n"}});
define("p3/widget/TaxonomyOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/TaxonomyOverview.html",
	"dojo/request", "dojo/_base/lang",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "./GenomeFeatureSummary", "./DataItemFormatter", "./ExternalItemFormatter"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang,
			ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
			ExternalItemFormatter
){

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

			if(state.taxonomy){
				this.set("taxonomy", state.taxonomy);
			}

			searchName = this.genome.taxon_name; 

			var sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget", "apmSummaryWidget"];

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
				domConstruct.place(ExternalItemFormatter(genome, "pubmed_data", {}), this.pubmedSummaryNode, "first");
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
