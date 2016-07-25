define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/dom-class", "dojo/request",
	"dijit/_WidgetBase", "dijit/_WidgetsInTemplateMixin", "dijit/_TemplatedMixin",
	"dojo/text!./templates/GenomeListOverview.html"

], function(declare, lang,
			on, domClass, xhr,
			WidgetBase, _WidgetsInTemplateMixin, Templated,
			Template){

	return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
		baseClass: "GenomeListOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		state: null,
		genome_ids: null,
		isGenomeGroup: false,

		constructor: function(opts){
			this.isGenomeGroup = opts && opts.isGenomeGroup || false;
			this.inherited(arguments);
		},

		_setStateAttr: function(state){
			this._set("state", state);

			var sumWidgets = ["rgSummaryWidget", "gmSummaryWidget", "spgSummaryWidget", "apmSummaryWidget"];

			sumWidgets.forEach(function(w){
				if(this[w]){
					this[w].set('query', this.state.search)
				}
			}, this);

			if(this.isGenomeGroup){
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
