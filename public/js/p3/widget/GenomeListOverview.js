define([
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
