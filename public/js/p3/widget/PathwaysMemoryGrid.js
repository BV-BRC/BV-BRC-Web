define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./PageGrid", "./formatter", "../store/PathwayMemoryStore", "dojo/request",
	"dojo/aspect", "./GridSelector"
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
		primaryKey: "idx",
		selectionModel: "extended",
		loadingMessage: "Loading pathways.  This may take several minutes...",
		deselectOnRefresh: true,
		columns: {
			"Selection Checkboxes": selector({}),
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

			var oldState = this.get('state');

			var ov,nv;
			if (oldState){
				ov = oldState.search;
				if (oldState.hashParams.filter){
					ov = ov + oldState.hashParams.filter;
				}
			}

			if (state){
				nv = state.search;
				if (state.hashParams.filter){
					nv = nv + state.hashParams.filter;
				}
			}

			this.state = state;

			if (ov!=nv){
				//console.log("New State in Pathways Memory Grid: ", nv);
			
				if(!this.store){
					this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
				}else{
					this.store.set("state", lang.mixin({},state));
				}

				this.refresh()
			}else{
				this.refresh()
			}


		},

		refresh: function(){
			this.inherited(arguments);

		},

		createStore: function(server, token, state){
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
