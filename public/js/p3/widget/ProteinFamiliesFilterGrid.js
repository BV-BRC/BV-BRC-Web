define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/Deferred",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"dojo/_base/xhr", "dojo/_base/lang", "./Grid", "./formatter", "../store/ProteinFamiliesFilterMemoryStore", "dojo/request",
	"dojo/aspect", "dgrid/CellSelection", "dgrid/selector", "put-selector/put", "dojo/topic"
], function(declare, BorderContainer, on, Deferred,
			domClass, ContentPane, domConstruct,
			xhr, lang, Grid, formatter, Store, request,
			aspect, CellSelection, selector, put, Topic){

	var filterSelector = function(value, cell, object){
		var parent = cell.parentNode;

		// must set the class name on the outer cell in IE for keystrokes to be intercepted
		put(parent && parent.contents ? parent : cell, ".dgrid-selector");
		var input = cell.input || (cell.input = put(cell, "input[type=radio]", {
				tabIndex: -1,
				checked: value
			}));
		input.setAttribute("aria-checked", !!value);

		return input;
	};

	var filterSelectorChecked = function(value, cell, object){
		return filterSelector(true, cell, object);
	};

	return declare([Grid, CellSelection], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: null,
		dataModel: "genome",
		primaryKey: "genome_id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		selectionMode: 'none',
		columns: {
			present: selector({label: '', field: 'present', selectorType: 'radio'}, filterSelector),
			absent: selector({label: '', field: 'absent', selectorType: 'radio'}, filterSelector),
			mixed: selector({label: '', field: 'mixed', selectorType: 'radio'}, filterSelectorChecked),
			genome_name: {label: 'Genome Name', field: 'genome_name'}/*,
			genome_status: {label: 'Genome Status', field: 'genome_status'},
			isolation_country: {label: 'Isolation Country', field: 'isolation_country'},
			host_name: {label: 'Host', field: 'host_name'},
			disease: {label: 'Disease', field: 'disease'},
			collection_date: {label: 'Collection Date', field: 'collection_date'},
			completion_date: {label: 'Completion Date', field: 'completion_date'}*/
		},
		constructor: function(options){
			//console.log("ProteinFamiliesFilterGrid Ctor: ", options);
			if(options && options.apiServer){
				this.apiServer = options.apiServer;
			}
		},
		startup: function(){
			var _self = this;
			var options = ['present', 'absent', 'mixed'];
			var toggleSelection = function(element, value){
				element.checked = value;
				element.setAttribute("aria-checked", value);
			};

			this.on(".dgrid-cell:click", function(evt){
				var cell = _self.cell(evt);
				var colId = cell.column.id;
				var columnHeaders = cell.column.grid.columns;
				var state = _self.store.state;

				if(cell.row){
					// data row is clicked
					var rowId = cell.row.id;

					// deselect other radio in the same row
					options.forEach(function(el){
						if(el != colId && _self.cell(rowId, el).element.input.checked){
							toggleSelection(_self.cell(rowId, el).element.input, false);
						}
					});

					// check whether entire rows are selected & mark as needed
					options.forEach(function(el){
						var allSelected = true;
						state.genome_ids.forEach(function(genomeId){
							if(_self.cell(genomeId, el).element.input.checked == false){
								allSelected = false;
							}
						});
						toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, allSelected);
					});

				}else{
					// if header is clicked, reset the selections & update
					state.genome_ids.forEach(function(genomeId){
						options.forEach(function(el){
							if(el === colId){
								toggleSelection(_self.cell(genomeId, el).element.input, true);
							}else{
								toggleSelection(_self.cell(genomeId, el).element.input, false);
							}
						});
					});

					// deselect other radio in the header
					options.forEach(function(el){
						if(el != colId && columnHeaders[el].headerNode.firstChild.firstElementChild.checked){
							toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, false);
						}
					});
				}

				// update filter
				Object.keys(state.genomeFilterStatus).forEach(function(genomeId){
					var status = options.findIndex(function(el){
						if(_self.cell(genomeId, el).element.input.checked) {
							return el;
						}
					});
					//console.log(genomeId, status);
					state.genomeFilterStatus[genomeId].setStatus(status);
				});

				//Object.keys(state.genomeFilterStatus).forEach(function(el){
				//	console.warn(state.genomeFilterStatus[el].getGenomeName(), state.genomeFilterStatus[el].getStatus());
				//});
				Topic.publish("ProteinFamilies", "genomeFilter", state.genomeFilterStatus);
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
				this.refresh();
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
