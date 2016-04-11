define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/request", "dojo/dom-style", "dojo/aspect", "dojo/topic",
	"dojo/store/Memory",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"dgrid/CellSelection", "dgrid/selector", "put-selector/put",
	"./Grid", "./formatter"
], function(declare, lang, Deferred,
			on, request, domStyle, aspect, Topic,
			Store,
			BorderContainer, ContentPane,
			CellSelection, selector, put,
			Grid, formatter){

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

	// create empty Memory Store
	var store = new Store({
		idProperty: "genome_id"
	});

	return declare([Grid, CellSelection], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: store,
		pfState: null,
		dataModel: "genome",
		primaryKey: "genome_id",
		selectionModel: "extended",
		deselectOnRefresh: true,
		selectionMode: 'none',
		columns: {
			present: selector({label: '', field: 'present', selectorType: 'radio'}, filterSelector),
			absent: selector({label: '', field: 'absent', selectorType: 'radio'}, filterSelector),
			mixed: selector({label: '', field: 'mixed', selectorType: 'radio'}, filterSelectorChecked),
			genome_name: {label: 'Genome Name', field: 'genome_name'},
			genome_status: {label: 'Genome Status', field: 'genome_status'},
			isolation_country: {label: 'Isolation Country', field: 'isolation_country'},
			host_name: {label: 'Host', field: 'host_name'},
			disease: {label: 'Disease', field: 'disease'},
			collection_date: {label: 'Collection Date', field: 'collection_date'},
			completion_date: {label: 'Completion Date', field: 'completion_date', formatter: formatter.dateOnly}
		},
		constructor: function(options){
			if(options && options.state){
				this.state = options.state;
			}

			Topic.subscribe("ProteinFamilies", lang.hitch(this, function(){
				// console.log("ProteinFamiliesFilterGrid:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "updatePfState":
						this.pfState = value;
						break;
					case "updateFilterGrid":
						this.store.setData(value);
						this.store._loaded = true;
						this.refresh();
						break;
					default:
						break;
				}
			}));
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

				var conditionIds = _self.pfState.genomeIds;
				var conditionStatus = _self.pfState.genomeFilterStatus;

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
						conditionIds.forEach(function(conditionId){
							if(_self.cell(conditionId, el).element.input.checked == false){
								allSelected = false;
							}
						});
						toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, allSelected);
					});

				}else{
					// if header is clicked, reset the selections & update
					conditionIds.forEach(function(conditionId){
						options.forEach(function(el){
							if(el === colId){
								toggleSelection(_self.cell(conditionId, el).element.input, true);
							}else{
								toggleSelection(_self.cell(conditionId, el).element.input, false);
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
				Object.keys(conditionStatus).forEach(function(conditionId){
					var status = options.findIndex(function(el){
						if(_self.cell(conditionId, el).element.input.checked){
							return el;
						}
					});

					conditionStatus[conditionId].setStatus(status);
				});

				Topic.publish("ProteinFamilies", "applyConditionFilter", conditionStatus);
			});

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			// this.inherited(arguments);
			this._started = true;

			// increase grid width after rendering content-pane
			domStyle.set(this.id, "width", "650px");
		},

		state: null,
		postCreate: function(){
			this.inherited(arguments);
		},
		_setApiServer: function(server){
			this.apiServer = server;
		}
	});
});
