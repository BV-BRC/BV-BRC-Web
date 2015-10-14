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
	
		constructor: function(){
			console.log(this.id, "base ctor() this: ", this);
		},
		_setParamsAttr: function(params) {			
			this.params = params;
			if (!this._started){ return; }
			this._set("params", params);
			
			if (this.paramsMap && typeof this.paramsMap=="string"){
				console.log(this.id, " Set Params: ", params, " mapped to ", this.paramsMap, " Widget: ", this)
				this.set(this.paramsMap, params);
			}
		},
	
		refresh: function() {},
		
		postCreate: function() {
			this.inherited(arguments);

			on(this.domNode, "UpdateHash", lang.hitch(this, "onUpdateHash"));
			on(this.domNode, "SetAnchor", lang.hitch(this, "onSetAnchor"));
		},

		onUpdateHash: function(evt){
			console.log("OnUpdateHash: ", evt);
			this.hashParams[evt.hashProperty]=evt.value;
			l= window.location.pathname + window.location.search + "#" + Object.keys(this.hashParams).map(function(key){
				return key + "=" + this.hashParams[key]
			},this).join("&");
			console.log("onUpdateHash. nav to: ", l);
            Topic.publish("/navigate", {href: l});
		},

		startup: function() {
			if(this._started){ return; }
			this.inherited(arguments);
			this.set("params", this.params||{});
		}
	});
});
