require({cache:{
'url:p3/widget/templates/TaxonomyOverview.html':"<div>\n\n    <table style=\"margin:2px;\">\n        <tbody>\n        <tr>\n            <td style=\"padding:7px;vertical-align:top;min-width:350px;width:30%;\">\n                <div class=\"section\" style=\"\">\n                    <div style=\"padding:7px\" data-dojo-attach-point=\"taxonomySummaryNode\">\n                        Loading Genome Summary...\n                    </div>\n                </div>\n                <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n                <div class=\"section\">\n                    <div style=\"padding:7px\" data-dojo-attach-point=\"rgSummaryWidget\"\n                         data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n                    </div>\n                </div>\n                <div class=\"section\">\n                    <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n                    <div data-dojo-attach-point=\"pubmedSummaryNode\" style=\"margin:4px;padding:8px;margin-radius:4px;\">\n                        This feature will be returning soon.\n                    </div>\n                    <div data-dojo-attach-point=\"pubmedSummaryNode2\"\n                         style=\"margin:4px;padding:8px;margin-radius:4px;display:block\">\n                        <div>Show more <i data-dojo-attach-event=\"click:onShowMore\"\n                                          class=\"fa icon-plus-circle fa-lg\"></i></div>\n                        </br>\n                    </div>\n                </div>\n            </td>\n            <td style=\"padding:7px;vertical-align:top;width:70%;min-width:500px;\">\n\n                <div class=\"section\">\n                    <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Genome Metadata Top 5</span></h3>\n                    <div  class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\" data-dojo-type=\"p3/widget/GenomeMetaSummary\"\n                         style=\"margin:4px;width:100%;\">\n                    </div>\n                </div>\n\n                <div class=\"section\">\n                    <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n                    <div data-dojo-attach-point=\"spgSummaryWidget\" data-dojo-type=\"p3/widget/SpecialtyGeneSummary\"\n                         style=\"margin:4px;\">\n                    </div>\n                </div>\n\n            </td>\n        </tr>\n        </tbody>\n    </table>\n</div>\n"}});
define("p3/widget/TaxonomyOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/TaxonomyOverview.html",
	"dojo/request", "dojo/_base/lang",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "./GenomeFeatureSummary", "./DataItemFormatter", "./ExternalItemFormatter",
	"p3/widget/ReferenceGenomeSummary","p3/widget/GenomeMetaSummary","p3/widget/SpecialtyGeneSummary"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang,
			ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
			ExternalItemFormatter,
			ReferenceGenomeSummary,GenomeMetaSummary,SpecialtyGeneSummary
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

			var sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget"];

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
