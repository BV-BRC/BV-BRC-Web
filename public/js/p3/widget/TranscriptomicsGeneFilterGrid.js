define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/request", "dojo/dom-construct", "dojo/dom-class", "dojo/aspect", "dojo/topic",
	"dojo/store/Memory",
	"dijit/layout/BorderContainer", "dijit/layout/ContentPane",
	"dgrid/CellSelection", "dgrid/selector", "put-selector/put",
	"./Grid"
], function(declare, lang, Deferred,
			on, request, domConstruct, domClass, aspect, Topic,
			Store,
			BorderContainer, ContentPane,
			CellSelection, selector, put,
			Grid){

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

	var store = new Store({
		idProperty: "pid"
	});

	return declare([Grid, CellSelection], {
		region: "center",
		query: (this.query || ""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataServiceURL,
		store: store,
		tgState: null,
		dataModel: "transcriptomics_sample",
		primaryKey: "pid",
		selectionModel: "extended",
		deselectOnRefresh: true,
		selectionMode: 'none',
		columns: {
			present: selector({label: '', field: 'present', selectorType: 'radio'}, filterSelector),
			absent: selector({label: '', field: 'absent', selectorType: 'radio'}, filterSelector),
			mixed: selector({label: '', field: 'mixed', selectorType: 'radio'}, filterSelectorChecked),
			source: {label: 'Source', field: 'source'},
			title: {label: 'Title', field: 'expname'},
			strain: {label: 'Strain', field: 'strain'},
			modification: {label: 'Modification', field: 'mutant'},
			condition: {label: 'Condition', field: 'condition'},
			timepoint: {label: 'Time Point', field: 'timepoint'}
		},
		constructor: function(options){
			if(options && options.state){
				this.state = options.state;
			}

			Topic.subscribe("TranscriptomicsGene", lang.hitch(this, function(){
				// console.log("TranscriptomicsGeneFilterGrid:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "tgState":
						this.tgState = value;
						break;
					case "filterGridData":
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
						_self.tgState.comparisonIds.forEach(function(genomeId){
							if(_self.cell(genomeId, el).element.input.checked == false){
								allSelected = false;
							}
						});
						toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, allSelected);
					});

				}else{
					// if header is clicked, reset the selections & update
					_self.tgState.comparisonIds.forEach(function(genomeId){
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
				Object.keys(_self.tgState.comparisonFilterStatus).forEach(function(genomeId){
					var status = options.findIndex(function(el){
						if(_self.cell(genomeId, el).element.input.checked){
							return el;
						}
					});
					//console.log(genomeId, status);
					_self.tgState.comparisonFilterStatus[genomeId].setStatus(status);
				});

				Object.keys(_self.tgState.comparisonFilterStatus).forEach(function(el){
					// console.log(_self.tgState.comparisonFilterStatus[el].getLabel(), _self.tgState.genomeFilterStatus[el].getStatus());
				});
				Topic.publish("TranscriptomicsGene", "comparisonFilter", _self.tgState.comparisonFilterStatus);
			});

			aspect.before(_self, 'renderArray', function(results){
				Deferred.when(results.total, function(x){
					_self.set("totalRows", x);
				});
			});

			// this.inherited(arguments);
			this._started = true;
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
