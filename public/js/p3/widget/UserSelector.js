define([
	"dijit/form/FilteringSelect", "dojo/_base/declare",  "dojo/topic",
	"dojo/store/JsonRest", "dojo/dom-construct", "dijit/TooltipDialog",
	"dojo/on", "dijit/popup", "dojo/_base/lang", "dojo/dom-construct",
	"dijit/form/CheckBox", "dojo/string", "dojo/when", "dijit/form/_AutoCompleterMixin",
	"../util/PathJoin",
], function(FilteringSelect, declare, Topic,
			Store, domConstr, TooltipDialog,
			on, popup, lang, domConstr, Checkbox,
			string, when, AutoCompleterMixin,
			PathJoin){

	return declare([FilteringSelect, AutoCompleterMixin], {
		apiServiceUrl: window.App.accountURL,
		//promptMessage: 'Select a user...',
		missingMessage: 'Select a user...',
		placeHolder: 'Search for a user...',
		searchAttr: "id",
		extraSearch: ["name"],
		queryExpr: "re:%5e${0}",
		queryFilter: "",
		resultFields: ["name", "id"],
		includePrivate: true,
		includePublic: true,
		pageSize: 25,
		highlightMatch: "all",
		autoComplete: false,
		store: null,
		labelType: 'html',
		constructor: function(){
			var _self = this;
			if(!this.store){
			//https://user.patricbrc.org/user/?or(eq(last_name,re:%5eMac),eq(first_name,re:%5eMac))&http_accept=application/json
				this.store = new Store({
					target: PathJoin(this.apiServiceUrl, "user") + "/",
					idProperty: "id",
					headers: {accept: "application/json", "Authorization": (window.App.authorizationToken || "")}
				});

			}

			var orig = this.store.query;
			this.store.query = lang.hitch(this.store, function(query, options){
				//console.log('query', query, options)

				// console.log("Store Headers: ", _self.store.headers);
				var q = "";
				if(query[_self.searchAttr] && query[_self.searchAttr] != ""){
					if(_self.extraSearch){
						var components = ["eq(" + _self.searchAttr + "," + query[_self.searchAttr] + ")"];
						_self.extraSearch.forEach(lang.hitch(this, function(attr){
							components.push("eq(" + attr,  query[_self.searchAttr] + ")");
						}));
						q = "?or(" + components.join(",") + ")";
					}
					else{
						q = "?eq(" + _self.searchAttr + "," + query[_self.searchAttr] + ")";
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

				q += "&limit("+_self.pageSize+")";
				// console.log("Q: ", q);
				return orig.apply(_self.store, [q, options]);
			});
		},

		_setIncludePublicAttr: function(val){
			this.includePublic = val;
			if(this.includePublic && this.includePrivate){
				this.queryFilter = "";
			}else if(this.includePublic && !this.includePrivate){
				this.queryFilter = "&eq(public,true)"
			}else if(this.includePrivate && !this.includePublic){
				this.queryFilter = "&eq(public,false)"
			}else{
				this.queryFilter = "&and(eq(public,true),eq(public,false))";
			}
		},

		_setIncludePrivateAttr: function(val){
			this.includePrivate = val;
			if(this.includePublic && this.includePrivate){
				this.queryFilter = "";
			}else if(this.includePublic && !this.includePrivate){
				this.queryFilter = "&eq(public,true)"
			}else if(this.includePrivate && !this.includePublic){
				this.queryFilter = "&eq(private,false)"
			}else{
				this.queryFilter = "&and(eq(private,true),eq(private,false))";
			}
		},

		postCreate: function(){
			this.inherited(arguments);

			/*
			this.filterButton = domConstr.create("i", {
				"class": "fa icon-filter fa-1x",
				style: {"float": "left", "font-size": "1.2em", "margin": "2px"}
			});
			domConstr.place(this.filterButton, this.domNode, "first");


			var dfc = domConstr.create("div");
			domConstr.create("div", {innerHTML: "Include in Search", style: {"font-weight": 900}}, dfc);

			var publicDiv = domConstr.create('div', {});
			domConstr.place(publicDiv, dfc, "last");
			var publicCB = new Checkbox({checked: true})
			publicCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Public Genomes to " + val);
				this.set("includePublic", val);
			}));

			domConstr.place(publicCB.domNode, publicDiv, "first");
			domConstr.create("span", {innerHTML: "Public Genomes"}, publicDiv);

			var privateDiv = domConstr.create('div', {});
			domConstr.place(privateDiv, dfc, "last");
			var privateCB = new Checkbox({checked: true})
			privateCB.on("change", lang.hitch(this, function(val){
				console.log("Toggle Private Genomes to " + val);
				this.set("includePrivate", val);
			}));
			domConstr.place(privateCB.domNode, privateDiv, "first");
			domConstr.create("span", {innerHTML: "My Genomes"}, privateDiv);

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
			*/
		},

		/*isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},*/

		getSelected: function(){
			return this.attr('value');
		},

		labelFunc: function(item, store){

			//console.log('item', item)
			var label = item.id + ('name' in item ? ' <<i>' + item.name + '</i>>' : '');

			return label;
		},
		onChange: function(userName){
            console.log('there was a change:', userName)
			Topic.publish("/addUserPermission", {id: userName});
        }


	});
});
