require({cache:{
'url:p3/widget/templates/GenomeListOverview.html':"<div>\n    <div class=\"column-sub\">\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n            <div data-dojo-attach-point=\"rgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-prime\">\n\n        <div class=\"section hidden\">\n            <h3 class=\"section-title\"><span class=\"wrap\">AMR Panel Summary</span></h3>\n            <div class=\"apmSummaryWidget\" data-dojo-attach-point=\"apmSummaryWidget\"\n                 data-dojo-type=\"p3/widget/AMRPanelMetaSummary\">\n            </div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Genome Metadata Top 5</span></h3>\n            <div class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeMetaSummary\">\n            </div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n            <div data-dojo-attach-point=\"spgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/SpecialtyGeneSummary\">\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-opt\">\n\n    </div>\n</div>\n"}});
define("p3/widget/GenomeListOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/GenomeListOverview.html",
	"dojo/request", "dojo/_base/lang"

], function(declare, WidgetBase, on, _WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang
){

	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeListOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		state: null,
		genome_ids: null,

		_setStateAttr: function(state){
			this._set("state", state);

			var sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget", "apmSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', this.state.search)
				}
			}, this)
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
