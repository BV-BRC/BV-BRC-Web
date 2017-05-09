define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./PageGrid", "./formatter", "../store/SubSystemMemoryStore", "dojo/request",
	"dojo/aspect", "./GridSelector", "dojo/when"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect, selector, when){
	return declare([Grid], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: null,
		dataModel: "subsystem",
		primaryKey: "subsystem_id",
		selectionModel: "extended",
		loadingMessage: "Loading subsystems.  This may take several minutes...",
		deselectOnRefresh: true,
		fullSelectAll: true,
		columns: {
			"Selection Checkboxes": selector({unhidable: true}),
			class: {label: "Class", field: "class"},
			subclass: {label: 'Subclass', field: 'subclass'},
			subsystem_id: {label: 'Subsystem ID', field: 'subsystem_id', hidden: true},
			subsystem_name: {label: 'Subsystem Name', field: 'subsystem_name'},
			role_id: {label: "Role ID", field: "role_id", hidden: true},
			role_name: {label: "Role Name", field: "role_name"},
			active: {label: "Active", field: "active"},
			patric_id: {label: "Patric ID", field: "patric_id"},
			gene: {label: "Gene", field: "gene"},
			product: {label: "Product", field: "product"}
			
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

			var ov, nv;
			if(oldState){
				ov = oldState.search;
				if(oldState.hashParams.filter){
					ov = ov + oldState.hashParams.filter;
				}
			}

			if(state){
				nv = state.search;
				if(state.hashParams.filter){
					nv = nv + state.hashParams.filter;
				}
			}

			this.state = state;

			if(ov != nv){
				//console.log("New State in subsystems Memory Grid: ", nv);

				if(!this.store){
					this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
				}else{
					this.store.set("state", lang.mixin({}, state));
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
		},
		_selectAll: function(){
			var _self = this;
			var def = new Deferred();
			when(this.store.query({}, this.queryOptions), function(results){
				_self._unloadedData = {};

				def.resolve(results.map(function(obj){
					_self._unloadedData[obj[_self.primaryKey]] = obj;
					return obj[_self.primaryKey];
				}));
			});
			return def.promise;
		}
	});
});
