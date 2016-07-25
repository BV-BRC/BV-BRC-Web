require({cache:{
'url:p3/widget/templates/GenomeOverview.html':"<div>\n    <div class=\"column-sub\">\n        <div class=\"section\">\n            <div data-dojo-attach-point=\"genomeSummaryNode\">\n                Loading Genome Summary...\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-prime\">\n        <div class=\"section hidden\">\n            <h3 class=\"section-title\"><span class=\"wrap\">AMR Panel Summary</span></h3>\n            <div data-dojo-attach-point=\"apSummaryWidget\"\n                 data-dojo-type=\"p3/widget/AMRPanelSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Genomic Feature Summary</span></h3>\n            <div data-dojo-attach-point=\"gfSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeFeatureSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Protein Feature Summary</span></h3>\n            <div class=\"pfSummaryWidget\" data-dojo-attach-point=\"pfSummaryWidget\"\n                 data-dojo-type=\"p3/widget/ProteinFeatureSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n            <div data-dojo-attach-point=\"spgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/SpecialtyGeneSummary\"></div>\n        </div>\n    </div>\n\n    <div class=\"column-opt\">\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n            <div data-dojo-attach-point=\"pubmedSummaryNode\">\n                Loading...\n            </div>\n        </div>\n    </div>\n</div>\n"}});
define("p3/widget/GenomeOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/GenomeOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "./GenomeFeatureSummary", "./DataItemFormatter",
	"./ExternalItemFormatter"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
			ExternalItemFormatter){

	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		genome: null,
		state: null,

		_setStateAttr: function(state){
			this._set("state", state);
			if(state.genome){
				this.set("genome", state.genome);
			}
		},

		"_setGenomeAttr": function(genome){
			if (this.genome && (this.genome.genome_id == genome.genome_id)){
				// console.log("Genome ID Already Set")
				return;
			}
			this.genome = genome;
			this.createSummary(genome);

			var sumWidgets = ["apSummaryWidget", "gfSummaryWidget", "pfSummaryWidget", "spgSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', "eq(genome_id," + this.genome.genome_id + ")")
				}
			}, this)

		},

		"createSummary": function(genome){
			domConstruct.empty(this.genomeSummaryNode);
			domConstruct.place(DataItemFormatter(genome, "genome_data", {}), this.genomeSummaryNode, "first");
			domConstruct.empty(this.pubmedSummaryNode);
			domConstruct.place(ExternalItemFormatter(genome, "pubmed_data", {}), this.pubmedSummaryNode, "first");
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
