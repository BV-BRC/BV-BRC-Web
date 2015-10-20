define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./Grid", "./formatter", "../store/ProteinFamiliesMemoryStore", "dojo/request",
	"dojo/aspect"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect){
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		store: null,
		dataModel: "genome_feature",
		primaryKey: "id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		columns: {
			family_id: {label: 'ID', field: 'family_id'},
			feature_count: {label: 'Proteins', field: 'feature_count'},
			genome_count: {label: 'Genomes', field: 'genome_count'},
			description: {label: 'Description', field: 'description'},
			aa_length_min: {label: 'Min AA Length', field: 'aa_length_min'},
			aa_length_max: {label: 'Max AA Length', field: 'aa_length_max'},
			aa_length_avg: {label: 'Mean', field: 'aa_length_mean'},
			aa_length_std: {label: 'Std', field: 'aa_length_std'}
		},
		startup: function(){
			var _self = this;

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log('after emit');
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
			var _self = this;

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			this.inherited(arguments);
			this._started = true;
		},

		query: "",
		params: null,
		apiServer: window.App.dataServiceURL,
		_setParams: function(params){
			console.log("SET PARAMS for ProteinFamiliesGrid: ", params, window);
			this.params = params;
			this.set('store', this.createStore(this.apiServer || window.App.dataServiceURL, this.apiToken || window.App.authorizationToken, params));
			this.refresh();
		},
		_setApiServer: function(server, token){
			console.log("_setapiServerAttr: ", server);
			this.apiServer = server;
			var t = token || this.apiToken || "";

			this.set('store', this.createStore(server, token || window.App.authorizationToken, this.params));
			this.refresh();
		},

		createStore: function(server, token, params){
			var self = this;
			if(!server){
				console.log("No API Server yet");
				return;
			}
			if(!params || (params && !params.genome_id)){
				console.log("No genome_id yet");
				return;
			}
			console.log("Create Store for ProteinFamilies at ", server, " TOKEN: ", token, " ProteinFamiliesGrid for genome_id: ", params.genome_id);

			var store = new Store({token: token, apiServer: server, genome_id: params.genome_id});
			return store;
		}
	});
});
