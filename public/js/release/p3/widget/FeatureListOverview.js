require({cache:{
'url:p3/widget/templates/FeatureListOverview.html':"<div>\n    <div class=\"column-sub\">\n        <div class=\"section hidden\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Feature Group Info</span></h3>\n            <div data-dojo-attach-point=\"ggiSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeGroupInfoSummary\"></div>\n        </div>\n\n<!--\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n            <div data-dojo-attach-point=\"rgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n            </div>\n        </div>\n-->\n    </div>\n\n    <div class=\"column-prime\">\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Function Profile</span></h3>\n            <div data-dojo-attach-point=\"fpSummaryWidget\"\n                 data-dojo-type=\"p3/widget/FunctionalProfile\">\n            </div>\n        </div>\n<!--\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Genomes by Metadata</span></h3>\n            <div class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\"\n                 data-dojo-type=\"p3/widget/GenomeMetaSummary\">\n            </div>\n        </div>\n\n        <div class=\"section\">\n            <h3 class=\"section-title\"><span class=\"wrap\">Specialty Gene Summary</span></h3>\n            <div data-dojo-attach-point=\"spgSummaryWidget\"\n                 data-dojo-type=\"p3/widget/SpecialtyGeneSummary\">\n            </div>\n        </div>-->\n    </div>\n\n    <div class=\"column-opt\"></div>\n</div>\n"}});
define("p3/widget/FeatureListOverview", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/dom-class", "dojo/request",
	"dijit/_WidgetBase", "dijit/_WidgetsInTemplateMixin", "dijit/_TemplatedMixin",
	"dojo/text!./templates/FeatureListOverview.html"

], function(declare, lang,
			on, domClass, xhr,
			WidgetBase, _WidgetsInTemplateMixin, Templated,
			Template){

	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "FeatureListOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		state: null,
		genome_ids: null,
		isFeatureGroup: false,

		constructor: function(opts){
			this.isFeatureGroup = opts && opts.isFeatureGroup || false;
			this.inherited(arguments);
		},

		_setStateAttr: function(state){
			this._set("state", state);

			// console.log(state.search);
			var sumWidgets = ["fpSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', this.state.search)
				}
			}, this);

			if(this.isFeatureGroup){
				// TODO: implement feature group summary when it requires feature group specific info. currently re-use genome group info, since it is same.
				domClass.remove(this.ggiSummaryWidget.domNode.parentNode, "hidden");
				this.ggiSummaryWidget.set('state', this.state);
			}
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
