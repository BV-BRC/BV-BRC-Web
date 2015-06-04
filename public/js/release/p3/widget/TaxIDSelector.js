define("p3/widget/TaxIDSelector", [
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest","dojo/_base/lang","dojo/dom-construct",
	"./TaxonNameSelector","dojo/on","dijit/TooltipDialog",
	"dijit/popup"
], function(
	FilteringSelect, declare, 
	Store,lang,domConstr,
	TaxonNameSelector,on,TooltipDialog,
	popup
){
	
	return declare([FilteringSelect], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'NCBI Taxonomy ID.',
		missingMessage:'NCBI Tax ID is not specified.',
		placeHolder:'',
		searchAttr: "taxon_id",
		//query: "?&select(taxon_id)",
		resultFields: ["taxon_id","taxon_name"],
		sort: [{attribute: "taxon_id"}],
		queryExpr: "${0}",
		pageSize: 25,
		autoComplete: false,
		store: null,
		required: false,

		constructor: function(){
			var _self=this;
			if (!this.store){
				this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", headers: {accept: "application/json", "Authorization":(window.App.authorizationToken||"")}});
			}
                        var orig = this.store.query;
                        this.store.query = lang.hitch(this.store, function(query,options){
                                console.log("query: ", query);
                                console.log("Store Headers: ", _self.store.headers);
                                var q = "?gt(" + _self.searchAttr + "," + query[_self.searchAttr] + ")";
                                if (_self.queryFilter) {
                                        q+=_self.queryFilter
                                }

                                if (_self.resultFields && _self.resultFields.length>0) {
                                        q += "&select(" + _self.resultFields.join(",") + ")";
                                }
				q += "&sort(+taxon_id)";
                                console.log("Q: ", q);
                                return orig.apply(_self.store,[q,options]);
                        });
		},

		postCreate: function(){
			var _self=this;
			this.inherited(arguments);
			this.filterButton = domConstr.create("i", {"class": "fa icon-search fa-1x", style: {"float":"right","font-size": "1.2em","margin": "2px"}});
			domConstr.place(this.filterButton,this.domNode,"after");
			var nameSearch = new TaxonNameSelector({});	
			nameSearch.on("change", function(val){
				_self.set('value', nameSearch.item[_self.searchAttr]);	
			});
			var searchTT=  new TooltipDialog({content: nameSearch.domNode, onMouseLeave: function(){ popup.close(searchTT); }})

			on(this.filterButton, "click", lang.hitch(this,function() {
	                     popup.open({
                                        popup: searchTT,
                                        around: this.domNode,
                                        orient: ["below"]
                                });
			}));

		},
		/*
		validate: function (){
			// Overrides `dijit/form/TextBox.validate`
			this.valueNode.value = this.toString();
			return this.inherited(arguments);
		}*/

		labelFunc: function(item, store){
			var label=item.taxon_id + " [" + item.taxon_name + "]";
			return label;
		},
		isValid: function (){
			// Overrides ValidationTextBox.isValid()
			var error= !this.inherited(arguments);
			return !(error && this.required);
			//return !!this.item || (!this.required && this.get('displayedValue') == ""); // #5974
		}
	});
});
