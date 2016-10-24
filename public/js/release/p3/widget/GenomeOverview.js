require({cache:{
'url:p3/widget/templates/GenomeOverview.html':"<div>\n    <div class=\"column-sub\">\n        <div class=\"section\">\n            <div data-dojo-attach-point=\"genomeSummaryNode\">\n                Loading Genome Summary...\n            </div>\n        </div>\n    </div>\n\n    <div class=\"column-prime\">\n        <div class=\"section hidden\">\n            <h3 class=\"close section-title\" title=\"Antimicrobial resistance data from antimicrobial susceptibility testing\"><span class=\"wrap\">Antimicrobial Resistance</span></h3>\n            <div class=\"apSummaryWidget\" data-dojo-attach-point=\"apSummaryWidget\"\n                 data-dojo-type=\"p3/widget/AMRPanelSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"close section-title\" title=\"Summary of genomic features annotated by PATRIC and GenBank/RefSeq\"><span class=\"wrap\">Genomic Features</span></h3>\n            <div class=\"gfSummaryWidget\" data-dojo-attach-point=\"gfSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeFeatureSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"close section-title\" title=\"Summary of proteins by their functional attributes and protein family assignments\"><span class=\"wrap\">Protein Features</span></h3>\n            <div class=\"pfSummaryWidget\" data-dojo-attach-point=\"pfSummaryWidget\"\n                 data-dojo-type=\"p3/widget/ProteinFeatureSummary\"></div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"close section-title\" title=\"Genes of special interest to infectious disease researchers, such as virulence factors, antimicrobial resistance genes, human homologs, and potential drug targets\"><span class=\"wrap\">Specialty Genes</span></h3>\n            <div class=\"spgSummaryWidget\" data-dojo-attach-point=\"spgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/SpecialtyGeneSummary\"></div>\n        </div>\n    </div>\n\n    <div class=\"column-opt\">\n        <div class=\"section\">\n            <div class=\"BrowserHeader right\">\n                <div class=\"ActionButtonWrapper\" data-dojo-attach-event=\"onclick:onAddGenome\" style=\"margin-top: 2px\">\n                    <div class=\"ActionButton fa icon-object-group fa-2x\"></div>\n                    <div class=\"ActionButtonText\">Add To Group</div>\n                </div>\n\n                <div class=\"ActionButtonWrapper\" data-dojo-attach-event=\"onclick:onDownload\" style=\"margin-top: 2px\">\n                    <div class=\"ActionButton fa icon-download fa-2x\"></div>\n                    <div class=\"ActionButtonText\">Download</div>\n                </div>\n            </div>\n            <div class=\"clear\"></div>\n<!--\n            <div class=\"SummaryWidget\">\n                <button data-dojo-attach-event=\"onclick:onAddGenome\">Add Genome to Group</button>\n                <button data-dojo-attach-event=\"onclick:onDownload\">Download Genome</button>\n            </div>\n-->\n        </div>\n        <div class=\"section\">\n            <h3 class=\"section-title close2x\" title=\"Recent PubMed articles relevant to the current context\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n            <div data-dojo-attach-point=\"pubmedSummaryNode\">\n                Loading...\n            </div>\n        </div>\n    </div>\n</div>\n"}});
define("p3/widget/GenomeOverview", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/request", "dojo/topic",
	"dojo/dom-class", "dojo/text!./templates/GenomeOverview.html", "dojo/dom-construct",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dijit/Dialog",
	"../util/PathJoin", "./SelectionToGroup", "./GenomeFeatureSummary", "./DataItemFormatter",
	"./ExternalItemFormatter", "./AdvancedDownload"

], function(declare, lang, on, xhr, Topic,
			domClass, Template, domConstruct,
			WidgetBase, Templated, _WidgetsInTemplateMixin, Dialog,
			PathJoin, SelectionToGroup, GenomeFeatureSummary, DataItemFormatter,
			ExternalItemFormatter, AdvancedDownload){

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
			if(this.genome && (this.genome.genome_id == genome.genome_id)){
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

		onAddGenome: function(){

			if(!window.App.user || !window.App.user.id){
				Topic.publish("/login");
				return;
			}

			var dlg = new Dialog({title: "Add This Genome To Group"});
			var stg = new SelectionToGroup({
				selection: [this.genome],
				type: 'genome_group'
			});
			on(dlg.domNode, "dialogAction", function(){
				dlg.hide();
				setTimeout(function(){
					dlg.destroy();
				}, 2000);
			});
			domConstruct.place(stg.domNode, dlg.containerNode, "first");
			stg.startup();
			dlg.startup();
			dlg.show();
		},

		onDownload: function(){

			var dialog = new Dialog({title: "Download"});
			var advDn = new AdvancedDownload({selection: [this.genome], containerType: "genome_data"});
			domConstruct.place(advDn.domNode, dialog.containerNode);
			dialog.show();
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
