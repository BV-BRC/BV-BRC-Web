define([
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
			var sumWidgets = ["fpSummaryWidget", "tpSummaryWidget"];

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
