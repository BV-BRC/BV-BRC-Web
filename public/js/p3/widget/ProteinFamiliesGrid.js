define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/dom-class", "dojo/dom-construct", "dojo/aspect", "dojo/request", "dojo/topic",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"./PageGrid", "./formatter", "../store/ProteinFamiliesMemoryStore"
], function(declare, lang, Deferred,
			on, domClass, domConstruct, aspect, request, Topic,
			BorderContainer, ContentPane,
			Grid, formatter, Store){
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: null,
		dataModel: "genome_feature",
		primaryKey: "feature_id",
		deselectOnRefresh: true,
		columns: {
			// "Selection Checkboxes": selector({}),
			family_id: {label: 'ID', field: 'family_id'},
			feature_count: {label: 'Proteins', field: 'feature_count'},
			genome_count: {label: 'Genomes', field: 'genome_count'},
			description: {label: 'Description', field: 'description'},
			aa_length_min: {label: 'Min AA Length', field: 'aa_length_min'},
			aa_length_max: {label: 'Max AA Length', field: 'aa_length_max'},
			aa_length_avg: {label: 'Mean', field: 'aa_length_mean', formatter: formatter.toInteger},
			aa_length_std: {label: 'Std Dev', field: 'aa_length_std', formatter: formatter.toInteger}
		},
		constructor: function(options){
			//console.log("ProteinFamiliesGrid Ctor: ", options);
			if(options && options.apiServer){
				this.apiServer = options.apiServer;
			}

			Topic.subscribe("ProteinFamilies", lang.hitch(this, function(){
				// console.log("ProteinFamiliesGrid:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updateMainGridOrder":
						this.set("sort", []);
						this.store.arrange(value);
						this.refresh();
						break;
					default:
						break;
				}
			}));
		},
		startup: function(){
			var _self = this;
/*
			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				// console.log('after emit');
			});
*/

			this.on("dgrid-sort", function(evt){
				_self.store.query("", {sort: evt.sort});
			});

			this.on("dgrid-select", function(evt){
				//console.log('dgrid-select: ', evt);
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "select", newEvt);
			});

/*
			this.on("dgrid-deselect", function(evt){
				//console.log("dgrid-deselect");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
			});
*/
			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			this.inherited(arguments);
			this._started = true;
		},

		state: null,
		postCreate: function(){
			this.inherited(arguments);
		},
		_setApiServer: function(server){
			this.apiServer = server;
		},
		_setState: function(state){
			if(!this.store){
				this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
			}else{
				// console.log("ProteinFamiliesGrid _setState()");
				this.store.set('state', state);

				// console.log("ProteinFamiliesGrid Call Grid Refresh()");
				this.refresh();
			}
		},
		_setSort: function(sort){
			this.inherited(arguments);
			// console.log("_setSort", sort);
			this.store.sort = sort;
		},
		createStore: function(server, token, state){

			var store = new Store({
				token: window.App.authorizationToken,
				apiServer: this.apiServer || window.App.dataServiceURL,
				state: state || this.state
			});
			store.watch('refresh', lang.hitch(this, "refresh"));

			return store;
		}
	});
});
