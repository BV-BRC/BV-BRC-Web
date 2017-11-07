define("p3/widget/Grid", [
	"dojo/_base/declare", "dgrid/OnDemandGrid", "dojo/store/JsonRest", "dgrid/extensions/DijitRegistry",
	"dgrid/Keyboard", "dgrid/Selection", "./formatter", "dgrid/extensions/ColumnResizer",
	"dgrid/extensions/ColumnHider", "dgrid/extensions/DnD", "dojo/dnd/Source",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "../util/PathJoin"
],
function(declare, Grid, Store, DijitRegistry,
		 Keyboard, Selection, formatter, ColumnResizer,
		 ColumnHider, DnD, DnDSource,
		 Deferred, aspect, lang, PathJoin){
	return declare([Grid, ColumnHider, Keyboard, ColumnResizer, DijitRegistry, Selection], {
		constructor: function(){
			this.dndParams.creator = lang.hitch(this, function(item, hint){
				//console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
				var avatar = dojo.create("div", {
					innerHTML: item.organism_name || item.ncbi_taxon_id || item.id
				});
				avatar.data = item;
				if(hint == 'avatar'){
					// create your avatar if you want
				}

				return {
					node: avatar,
					data: item,
					type: this.dndDataType
				}
			})

		},
		store: null,
		selectionMode: "extended",
		allowTextSelection: false,
		allowSelectAll: true,
		deselectOnRefresh: false,
		minRowsPerPage: 50,
		bufferRows: 100,
		maxRowsPerPage: 1000,
		pagingDelay: 250,
		//		pagingMethod: "throttleDelayed",
		farOffRemoval: 2000,
		keepScrollPosition: true,
		rowHeight: 24,
		loadingMessage: "Loading...",
		dndDataType: "genome",
		dndParams: {
			accept: "none",
			selfAccept: false,
			copyOnly: true
		},
		apiServer: window.App.dataServiceURL,

		_setApiServer: function(server){
			console.log("_setApiServer ", server)
			this.apiServer = server;
			this.set('store', this.createStore(this.dataModel), this.buildQuery());
		},

		_setTotalRows: function(rows){
			this.totalRows = rows;
			console.log("Total Rows: ", rows);
			if(this.controlButton){
				console.log("this.controlButton: ", this.controlButton);
				if(!this._originalTitle){
					this._originalTitle = this.controlButton.get('label');
				}
				this.controlButton.set('label', this._originalTitle + " (" + rows + ")");

				console.log(this.controlButton);
			}
		},

		startup: function(){
			if(this._started){
				return;
			}
			var _self = this;

			// console.log("this.hiderToggleNode: ", this.hiderToggleNode);
			// add hint for the show/hide column button
			this.hiderToggleNode.title = "Click to show or hide columns";

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total || results.length, function(x){
					_self.set("totalRows", x);
				});
			});

			if(!this.store && this.dataModel){
				this.store = this.createStore(this.dataModel);
			}
			this.inherited(arguments);
			this._started = true;

		},
		_setActiveFilter: function(filter){
			console.log("Set Active Filter: ", filter, "started:", this._started);
			this.activeFilter = filter;
			this.set("query", this.buildQuery());
		},

		buildQuery: function(table, extra){
			var q = "?" + (this.activeFilter ? ("in(gid,query(genomesummary,and(" + this.activeFilter + ",limit(Infinity),values(genome_info_id))))") : "") + (this.extra || "");
			return q;
		},

		createStore: function(dataModel){
			console.log("Create Store for ", dataModel, " at ", this.apiServer);

			var store = new Store({
				target: PathJoin((this.apiServer ? (this.apiServer) : ""), dataModel) + "/",
				idProperty: "rownum",
				headers: {
					"accept": "application/json",
					"content-type": "application/json",
					"Authorization": (window.App.authorizationToken || ""),
					'X-Requested-With': null
				}
			});
			console.log("store: ", store);
			return store;
		},

		getFilterPanel: function(){
			console.log("getFilterPanel()");
			return FilterPanel;
		}

	});

});
