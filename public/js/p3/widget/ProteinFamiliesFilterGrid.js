define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./Grid", "./formatter", "../store/GenomeJsonRest", "dojo/request",
	"dojo/aspect"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect){
	var store = new Store({});
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: store,
		dataModel: "genome",
		primaryKey: "genome_id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		columns: {
			genome_name: {label: 'Genome Name', field: 'genome_name'},
			genome_status: {label: 'Genome Status', field: 'genome_status'},
			isolation_country: {label: 'Isolation Country', field: 'isolation_country'},
			host_name: {label: 'Host', field: 'host_name'},
			disease: {label: 'Disease', field: 'disease'},
			collection_date: {label: 'Collection Date', field: 'collection_date'},
			completion_date: {label: 'Completion Date', field: 'completion_date'}
		},
		constructor: function(options){
			console.log("ProteinFamiliesFilterGrid Ctor: ", options);
			if(options && options.apiServer){
				this.apiServer = options.apiServer;
			}
		},
		startup: function(){
			var _self = this;

			//this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
			//	var row = _self.row(evt);
			//	//console.log("dblclick row:", row);
			//	on.emit(_self.domNode, "ItemDblClick", {
			//		item_path: row.data.path,
			//		item: row.data,
			//		bubbles: true,
			//		cancelable: true
			//	});
			//	console.log('after emit');
			//});
			this.on(".dgrid-cell:click", function(evt){
				var cell = _self.cell(evt);

				console.log(cell);
			});

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
				this.store.set('state', state);
			}
		},
		createStore: function(server, token, state){

			return new Store({
				token: token,
				apiServer: this.apiServer || window.App.dataServiceURL,
				state: state || this.state
			});
		}
	});
});
