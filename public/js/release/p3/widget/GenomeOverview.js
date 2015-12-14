require({cache:{
'url:p3/widget/templates/GenomeOverview.html':"<div style=\"overflow: auto;\">\n\n    <table style=\"margin:2px;\">\n        <tbody>\n            <tr>\n                <td style=\"width:35%;padding:4px;vertical-align:top;\">\n                    <div class=\"section\">\n                       <!-- <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Genome Summary</span></h3>-->\n                        <div style=\"padding:7px\" data-dojo-attach-point=\"genomeSummaryNode\">\n                            Loading Genome Summary...\n                        </div>\n                    </div>\n                </td>\n                <td style=\"width:40%;padding:4px;vertical-align:top;\">\n  \n                    <div class=\"section\" >\n                        <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Genomic Feature Summary</span></h3>\n                        <div data-dojo-attach-point=\"gfSummaryWidget\" data-dojo-type=\"p3/widget/GenomeFeatureSummary\" style=\"height:205px;margin:4px;\">\n                        </div>\n                    </div>\n\n\n                    <div class=\"section \">\n                        <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Protein Feature Summary</span></h3>\n                          <div data-dojo-attach-point=\"pfSummaryWidgetD\" style=\"background:#FFF889;margin:4px;padding:8px;margin-radius:4px;\">\n                          This feature will be returning soon.\n                        </div>\n                    </div>\n\n                    <div class=\"section \">\n                        <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n                          <div data-dojo-attach-point=\"spgSummaryWidget\" data-dojo-type=\"p3/widget/SpecialtyGeneSummary\" style=\"height:205px;margin:4px;\">\n                        </div>\n                    </div>\n\n                </td>\n                <td style=\"width:25%;padding:4px;vertical-align:top;\">\n                    <div class=\"section \">\n                     <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n                      <div  style=\"background:#FFF889;margin:4px;padding:8px;margin-radius:4px;\">\n                          This feature will be returning soon.\n                        </div>\n                    </div>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>\n"}});
define("p3/widget/GenomeOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on","dijit/_WidgetsInTemplateMixin",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dojo/text!./templates/GenomeOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct","../util/PathJoin","./GenomeFeatureSummary","./DataItemFormatter","./SpecialtyGeneSummary"

], function(declare, WidgetBase, on,_WidgetsInTemplateMixin,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct,PathJoin,GenomeFeatureSummary,DataItemFormatter,
			SpecialtyGeneSummary) {

	return declare([WidgetBase,Templated,_WidgetsInTemplateMixin], {
		baseClass: "GenomeOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		genome: null,
		state: null,

		_setStateAttr: function(state){
			this._set("state", state);
			if (state.genome){
				this.set("genome", state.genome);
			}
		},

		"_setGenomeAttr": function(genome) {
			this.genome = genome;
			this.createSummary(genome);
		
			var sumWidgets = ["gfSummaryWidget", "pfSummaryWidget", "spgSummaryWidget"];

			sumWidgets.forEach(function(w){
					if (this[w]){
						this[w].set('query', "eq(genome_id," + this.genome.genome_id + ")")
					}
			},this)

		},

		"createSummary": function(genome) {
			domConstruct.empty(this.genomeSummaryNode);
			domConstruct.place(DataItemFormatter(genome, "genome_data",{hideExtra:true}), this.genomeSummaryNode,"first");
		},

		startup: function(){
			if (this._started){ return; }
			this.inherited(arguments);

			if (this.genome) { this.set("genome", this.genome); }
		}
	});
});
