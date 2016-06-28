require({cache:{
'url:p3/widget/templates/GenomeListOverview.html':"<div>\n    <table style=\"margin:2px;\">\n        <tbody>\n        <tr>\n            <td style=\"padding:7px;vertical-align:top;min-width:350px;width:30%;\">\n                <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n                <div class=\"section\">\n                    <div style=\"padding:7px\" data-dojo-attach-point=\"rgSummaryWidget\"\n                         data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n                    </div>\n                </div>\n            </td>\n            <td style=\"padding:7px;vertical-align:top;width:70%;min-width:500px;\">\n\n                <div class=\"section\">\n                    <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Genome Metadata Top 5</span></h3>\n                    <div  class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\" data-dojo-type=\"p3/widget/GenomeMetaSummary\"\n                         style=\"margin:4px;width:100%;\">\n                    </div>\n                </div>\n\n                <div class=\"section\">\n                    <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n                    <div data-dojo-attach-point=\"spgSummaryWidget\" data-dojo-type=\"p3/widget/SpecialtyGeneSummary\"\n                         style=\"margin:4px;\">\n                    </div>\n                </div>\n\n            </td>\n        </tr>\n        </tbody>\n    </table>\n</div>\n"}});
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

			var sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget"];

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
