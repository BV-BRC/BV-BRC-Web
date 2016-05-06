define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./PageGrid", "./formatter", "../store/PathwayMemoryStore", "dojo/request",
	"dojo/aspect", "dgrid/selector"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect, selector){
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: null,
		dataModel: "pathway",
		primaryKey: "pathway_id",
		selectionModel: "extended",
		loadingMessage: "Loading pathways.  This may take several minutes...",
		deselectOnRefresh: true,
		store: null,
		columns: {
			// "Selection Checkboxes": selector({}),
			pathway_id: {label: 'Pathway ID', field: 'pathway_id'},
			pathway_name: {label: 'Pathway Name', field: 'pathway_name'},
			pathway_class: {label: 'Pathway Class', field: 'pathway_class'},
			annotation: {label: 'Annotation', field: 'annotation'},
			genome_count: {label: 'Unique Genome Count', field: 'genome_count'},
			gene_count: {label: 'Unique Gene Count', field: 'gene_count'},
			ec_count: {label: 'Unique EC Count', field: 'ec_count'},
			ec_cons: {label: 'EC Conservation', field: 'ec_cons'},
			gene_cons: {label: 'Gene Conservation', field: 'gene_cons'}
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

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			this._started = true;
		},
		state: null,

		_setApiServer: function(server){
			this.apiServer = server;
		},

		_setState: function(state){
			console.log("PMS SET STATE: ", state, this.store)
			if(!this.store){
				console.log("CREATE STORE FROM PMG _setState()")
				this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
			}else{
				this.store.set("state", state);
				this.refresh();
			}
		},

		createStore: function(server, token, state){
			console.log("createStore()")
			//console.log("CreateStore() server: ", server);
			//console.log("CreateStore() token: ", token);
			//console.log("CreateStore() state: ", state);
			//console.log("Create Store for Pathways at server: ", server, " apiServer: ", this.apiServer, " global API Server: ", window.App.dataServiceURL, " TOKEN: ", token, " Base Query ", state || this.state);
			if(this.store){
				return this.store
			}

			return new Store({
				token: token,
				apiServer: this.apiServer || window.App.dataServiceURL,
				state: state || this.state
			});
		}
	});
});
