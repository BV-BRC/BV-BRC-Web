define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on","dojo/topic",
	"dojo/dom-class", "dojo/dom-construct", "dojo/_base/lang"
], function(declare, BorderContainer, on,Topic,
			domClass, domConstruct, lang
) {
	return declare([BorderContainer], {
		"baseClass": "ViewerApp",
		params: null,
		paramsMap: null,
		apiServiceUrl: window.App.dataAPI,
	
		_setParamsAttr: function(params) {			
			this.params = params;
			if (this.paramsMap && typeof this.paramsMap=="string"){
				this.set(this.paramsMap, params);
			}
			
		},
	
		refresh: function() {},
		
		postCreate: function() {
			this.inherited(arguments);
			on(this.domNode, "UpdateHash", lang.hitch(this, "onUpdateHash"));
		},

		onUpdateHash: function(evt){
			this.hashParams[evt.hashProperty]=evt.value;
			location = window.location.pathname + window.location.search + "#" + Object.keys(this.hashParams).map(function(key){
				return key + "=" + this.hashParams[key]
			},this).join("&");

            Topic.publish("/navigate", {href: location});
		},

		startup: function() {
			if(this._started){ return; }
			this.inherited(arguments);
			this.set("hashParams", this.hashParams||{});
		}
	});
});
