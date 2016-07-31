define([
	"dojo/_base/declare", "dgrid/Grid", "dojo/store/JsonRest", "dgrid/extensions/DijitRegistry", "dgrid/extensions/Pagination",
	"dgrid/Keyboard", "dgrid/Selection", "./formatter", "dgrid/extensions/ColumnResizer", "dgrid/extensions/ColumnHider",
	"dgrid/extensions/DnD", "dojo/dnd/Source", "dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "../util/PathJoin",
	"dgrid/extensions/ColumnReorder"
],
function(declare, Grid, Store, DijitRegistry, Pagination,
		 Keyboard, Selection, formatter, ColumnResizer,
		 ColumnHider, DnD, DnDSource,
		 Deferred, aspect, lang, PathJoin,
		 ColumnReorder

){
	return declare([Grid, Pagination, ColumnReorder, ColumnHider, Keyboard, ColumnResizer,DijitRegistry, Selection], {
		constructor: function(){
			this.dndParams.creator = lang.hitch(this, function(item, hint){
				//console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
				var avatar = dojo.create("div", {innerHTML: item.organism_name || item.ncbi_taxon_id || item.id});
				avatar.data = item;
				if(hint == 'avatar'){
					// create your avatar if you want
				}
				return {node: avatar, data: item, type: this.dndDataType}
			})
		},
		store: null,
		selectionMode: "extended",
		allowTextSelection: false,
		allowSelectAll: true,
		deselectOnRefresh: false,
		rowsPerPage: 200,
		minRowsPerPage: 25,
		bufferRows: 100,
		maxRowsPerPage: 200,
		pagingDelay: 250,
//		pagingMethod: "throttleDelayed",
		farOffRemoval: 2000,
		// pageSizeOptions: [100,200,500],
		keepScrollPosition: true,
		rowHeight: 24,
		loadingMessage: "Loading...",
		primaryKey: "id",
		dndDataType: "genome",
		dndParams: {
			accept: "none",
			selfAccept: false,
			copyOnly: true
		},
		_setApiServer: function(server, token){
			//console.log("_setapiServerAttr: ", server);
			this.apiServer = server;
			var t = token || this.apiToken || "";
			this.set('store', this.createStore(this.dataModel, this.primaryKey, t), this.buildQuery());
		},

		apiToken: "",
		_setTotalRows: function(rows){
			// console.log("this.id:", this.id, "_setTotalRows()");
			if(rows){
				this.totalRows = rows;
				// console.log("Total Rows: ", rows);
				if(this.controlButton){
					//console.log("this.controlButton: ", this.controlButton);
					if(!this._originalTitle){
						this._originalTitle = this.controlButton.get('label');
					}
					this.controlButton.set('label', this._originalTitle + " (" + rows + ")");
					//console.log(this.controlButton);
				}
			}
		},

		startup: function(){
			if(this._started){
				return;
			}
			var _self = this;
			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			if(!this.store && this.dataModel){
				this.store = this.createStore(this.dataModel, this.primaryKey);
			}
			this.inherited(arguments);
			this._started = true;

		},

		createStore: function(dataModel, pk, token){
			// console.log("Create Store for ", dataModel, " at ", this.apiServer, " TOKEN: ", token);
			var store = new Store({
				target: PathJoin((this.apiServer ? (this.apiServer) : ""), dataModel) + "/",
				idProperty: pk,
				headers: {
					"accept": "application/json",
					"content-type": "application/json",
					'X-Requested-With': null,
					'Authorization': token ? token : (window.App.authorizationToken || "")
				}
			});
			//console.log("store: ", store);
			return store;
		}
	});
});
