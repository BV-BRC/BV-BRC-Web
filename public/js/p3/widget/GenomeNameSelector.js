define([
	"dijit/form/FilteringSelect", "dojo/_base/declare",
	"dojo/store/JsonRest", "dojo/dom-construct", "dijit/TooltipDialog",
	"dojo/on", "dijit/popup", "dojo/_base/lang", "dojo/dom-construct",
	"dijit/form/CheckBox", "dojo/string", "dojo/when", "dijit/form/_AutoCompleterMixin",
	"../util/PathJoin"
], function(FilteringSelect, declare,
			Store, domConstr, TooltipDialog,
			on, popup, lang, domConstr, Checkbox,
			string, when, AutoCompleterMixin,
			PathJoin){

	return declare([FilteringSelect, AutoCompleterMixin], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage: 'Genome name.',
		missingMessage: 'Specify genome name.',
		placeHolder: 'e.g. Mycobacterium tuberculosis H37Rv',
		searchAttr: "genome_name",
		extraSearch: ["genome_id"],
		queryExpr: "*${0}*",
		queryFilter: "",
		resultFields: ["genome_id", "genome_name", "strain", "public", "owner"],
		includePrivate: true,
		includePublic: true,
		includeReference: true,
		includeRepresentative: true,
		pageSize: 25,
		highlightMatch: "all",
		autoComplete: false,
		store: null,
		labelType: 'html',
		constructor: function(){
			var _self = this;
			if(!this.store){

				this.store = new Store({
					target: PathJoin(this.apiServiceUrl, "genome") + "/",
					idProperty: "genome_id",
					headers: {accept: "application/json", "Authorization": (window.App.authorizationToken || "")}
				});

			}

			var orig = this.store.query;
			this.store.query = lang.hitch(this.store, function(query, options){
				// console.log("query: ", query);
				// console.log("Store Headers: ", _self.store.headers);
				var q = "";
				var searchAttrStripped = "";

				if(query[_self.searchAttr] && query[_self.searchAttr] != ""){

					// strip the non-alphanumeric characters from the query string
					searchAttrStripped = "*".concat(query[_self.searchAttr].toString().replace(/\W/g, ''), "*");

					if(_self.extraSearch){
						var components = ["eq(" + _self.searchAttr + "," + searchAttrStripped + ")"];
						_self.extraSearch.forEach(lang.hitch(this, function(attr){
							components.push("eq(" + attr, searchAttrStripped + ")");
						}));
						q = "?or(" + components.join(",") + ")";
					}
					else{
						q = "?eq(" + _self.searchAttr + "," + searchAttrStripped + ")";
					}
				}
				else{
					return [];
				}
				if(_self.queryFilter){
					q += _self.queryFilter
				}

				if(_self.resultFields && _self.resultFields.length > 0){
					q += "&select(" + _self.resultFields.join(",") + ")";
				}
				// console.log("Q: ", q);
				return orig.apply(_self.store, [q, options]);
			});
		},

		_setIncludePublicAttr: function(val){
			this.includePublic = val;
			this._setQueryFilter();
		},

		_setIncludePrivateAttr: function(val){
			this.includePrivate = val;
			this._setQueryFilter();
		},

		_setIncludeReferenceAttr: function(val){
			this.includeReference = val;
			this._setQueryFilter();
		},

		_setIncludeRepresentativeAttr: function(val){
			this.includeRepresentative = val;
			this._setQueryFilter();
		},

		_setQueryFilter: function(){
				var queryFilterComponents = []

				// this block should include all 4 combinations of selection of public
				// and private; both unchecked means you get nothing!
				if (!this.includePublic) {
					queryFilterComponents.push("eq(public," + this.includePublic + ")");
				}
				if (!this.includePrivate) {
					queryFilterComponents.push("eq(public," + !this.includePrivate + ")");
				}

				// this block should include all 4 combinations of selection of reference
				// and representative; both unchecked means you get nothing!
				if (!this.includeRepresentative) {
					queryFilterComponents.push("eq(reference_genome,%22Reference%22)");
				}
				if (!this.includeReference) {
					queryFilterComponents.push("eq(reference_genome,%22Representative%22)");
				}

				// assemble the query filter
				if (queryFilterComponents.length == 0) {
					this.queryFilter = "";
				} else if (queryFilterComponents.length == 1) {
					this.queryFilter = queryFilterComponents.join("")
				} else {
					this.queryFilter = "&and(" + queryFilterComponents.join(",") + ")";
				}

				console.log("Query Filter set to: " + this.queryFilter);
		},

		postCreate: function(){
			this.inherited(arguments);
			this.filterButton = domConstr.create("i", {
				"class": "fa icon-filter fa-1x",
				style: {"float": "left", "font-size": "1.2em", "margin": "2px"}
			});
			domConstr.place(this.filterButton, this.domNode, "first");

			//var dfc = '<div>Filter Genomes</div><div class="wsActionTooltip" rel="Public">Public</div><div class="wsActionTooltip" rel="private">My Genomes</div>'
			var dfc = domConstr.create("div");
			domConstr.create("div", {innerHTML: "Include in Search", style: {"font-weight": 900}}, dfc);

			// public genomes
			var publicDiv = domConstr.create('div', {});
			domConstr.place(publicDiv, dfc, "last");
			var publicCB = new Checkbox({checked: true})
			publicCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Public Genomes to " + val);
				this.set("includePublic", val);
			}));
			domConstr.place(publicCB.domNode, publicDiv, "first");
			domConstr.create("span", {innerHTML: "Public Genomes"}, publicDiv);

			// private genomes
			var privateDiv = domConstr.create('div', {});
			domConstr.place(privateDiv, dfc, "last");
			var privateCB = new Checkbox({checked: true})
			privateCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Private Genomes to " + val);
				this.set("includePrivate", val);
			}));
			domConstr.place(privateCB.domNode, privateDiv, "first");
			domConstr.create("span", {innerHTML: "My Genomes"}, privateDiv);

			// reference genomes
			var referenceDiv = domConstr.create('div', {});
			domConstr.place(referenceDiv, dfc, "last");
			var referenceCB = new Checkbox({checked: true})
			referenceCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Reference Genomes to " + val);
				this.set("includeReference", val);
			}));
			domConstr.place(referenceCB.domNode, referenceDiv, "first");
			domConstr.create("span", {innerHTML: "Reference Genomes"}, referenceDiv);

			// representative genomes
			var representativeDiv = domConstr.create('div', {});
			domConstr.place(representativeDiv, dfc, "last");
			var representativeCB = new Checkbox({checked: true})
			representativeCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Representative Genomes to " + val);
				this.set("includeRepresentative", val);
			}));
			domConstr.place(representativeCB.domNode, representativeDiv, "first");
			domConstr.create("span", {innerHTML: "Representative Genomes"}, representativeDiv);

			var filterTT = new TooltipDialog({
				content: dfc, onMouseLeave: function(){
					popup.close(filterTT);
				}
			})

			on(this.filterButton, "click", lang.hitch(this, function(){
				popup.open({
					popup: filterTT,
					around: this.domNode,
					orient: ["below"]
				});
			}));
		},

		/*isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},*/
		labelFunc: function(item, store){
			var label = "";
			if(!item['public'] && (typeof item['public'] != 'undefined')){
				label += "<i class='fa icon-lock fa-1x' />&nbsp;";
			}
			else{
				label += "<i class='fa fa-1x'> &nbsp; </i>&nbsp;";
			}

			label += item.genome_name;
			var strainAppended = false;
			if(item.strain){
				strainAppended = (item.genome_name.indexOf(item.strain, item.genome_name.length - item.strain.length) !== -1);
				if(!strainAppended){
					label += " " + item.strain;
					strainAppended = true;
				}
			}
			label += " [" + item.genome_id + "]";
			/*else if(!strainAppended){
				if(item.genbank_accessions){
					label+=" "+item.genbank_accessions;
				}
				else if(item.biosample_accession){
					label+=" "+item.biosample_accession;
				}
				else if(item.bioproject_accession){
					label+=" "+item.bioproject_accession;
				}
				else if(item.assembly_accession){
					label+=" "+item.assembly_accession;
				}
				else{
					label+=" "+item.genome_id;
				}
			}*/
			return label;
		}

	});
});
