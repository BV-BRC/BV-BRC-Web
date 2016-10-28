define("p3/store/ProteinFamiliesMemoryStore", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/request", "dojo/when", "dojo/Stateful", "dojo/topic",
	"dojo/store/Memory", "dojo/store/util/QueryResults",
	"./ArrangeableMemoryStore", "./HeatmapDataTypes"
], function(declare, lang, Deferred,
			request, when, Stateful, Topic,
			Memory, QueryResults,
			ArrangeableMemoryStore){

	var pfStateDefault = {
		familyType: 'pgfam', // default
		heatmapAxis: '',
		genomeIds: [],
		genomeFilterStatus: {},
		clusterRowOrder: [],
		clusterColumnOrder: [],
		keyword: '',
		perfectFamMatch: 'A',
		min_member_count: null,
		max_member_count: null,
		min_genome_count: null,
		max_genome_count: null
	};
	var pfState = {};

	return declare([ArrangeableMemoryStore, Stateful], {
		baseQuery: {},
		apiServer: window.App.dataServiceURL,
		idProperty: "family_id",
		state: null,
		pfState: null,

		onSetState: function(attr, oldVal, state){
			// console.warn("onSetState", state, state.genome_ids);
			// TODO: not just state contains genome_ids, but check when it changes to reset pfState
			// TODO: change to relies on this.pfState, not the global pfState.
			if(state && state.genome_ids){
				this._loaded = false;
				this.pfState = pfState = lang.mixin(this.pfState, {}, pfStateDefault);
				pfState.genomeFilterStatus = {}; // lang.mixin does not override deeply
				this._filtered = undefined; // reset flag prevent to read stored _original
				delete this._loadingDeferred;
			}

			if(state && state.hashParams && state.hashParams.params){
				var params = JSON.parse(state.hashParams.params);

				params.family_type ? pfState.familyType = params.family_type : {};
				// params.keyword ? pfState.keyword = params.keyword : {};
			}
		},

		constructor: function(options){
			this._loaded = false;
			if(options.apiServer){
				this.apiServer = options.apiServer;
			}

			var self = this;

			Topic.subscribe("ProteinFamilies", function(){
				// console.log("received:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "setFamilyType":
						Topic.publish("ProteinFamilies", "showLoadingMask");
						self.pfState.familyType = value;
						self.reload();
						Topic.publish("ProteinFamilies", "showMainGrid");
						break;
					case "anchorByGenome":
						self.anchorByGenome(value);
						break;
					case "applyConditionFilter":
						self.pfState = value;
						self.conditionFilter(value);
						self.currentData = self.getHeatmapData(self.pfState);
						Topic.publish("ProteinFamilies", "updatePfState", self.pfState);
						Topic.publish("ProteinFamilies", "updateHeatmapData", self.currentData);
						break;
					case "requestHeatmapData":
						self.currentData = self.getHeatmapData(value);
						Topic.publish("ProteinFamilies", "updateHeatmapData", self.currentData);
						break;
					default:
						break;
				}
			});

			this.watch("state", lang.hitch(this, "onSetState"));
		},
		conditionFilter: function(pfState){
			var self = this;
			if(self._filtered == undefined){ // first time
				self._filtered = true;
				self._original = this.query("", {});
			}
			var data = self._original;
			var newData = [];
			var gfs = pfState.genomeFilterStatus;

			// var tsStart = window.performance.now();
			var keywordRegex = pfState.keyword.trim().toLowerCase().replace(/,/g, "~").replace(/\n/g, "~").replace(/ /g, "~").split("~");

			data.forEach(function(family){

				var skip = false;

				// genomes
				Object.keys(gfs).forEach(function(genomeId){
					var index = gfs[genomeId].getIndex();
					var status = gfs[genomeId].getStatus();
					//console.log(family.family_id, genomeId, index, status, family.genomes, parseInt(family.genomes.substr(index * 2, 2), 16));
					if(status == 1 && parseInt(family.genomes.substr(index * 2, 2), 16) > 0){
						skip = true;
					}
					else if(status == 0 && parseInt(family.genomes.substr(index * 2, 2), 16) == 0){
						skip = true;
					}
				});

				// keyword search
				if(pfState.keyword !== ''){
					skip = !keywordRegex.some(function(needle){
						return needle && (family.description.toLowerCase().indexOf(needle) >= 0 || family.family_id.toLowerCase().indexOf(needle) >= 0);
					});
				}

				// perfect family
				if(pfState.perfectFamMatch === 'Y'){
					family.feature_count !== family.genome_count ? skip = true : {};
				}else if(pfState.perfectFamMatch === 'N'){
					family.feature_count === family.genome_count ? skip = true : {};
				}

				// num proteins per family
				if(pfState.min_member_count){
					family.feature_count < pfState.min_member_count ? skip = true : {};
				}
				if(pfState.max_member_count){
					family.feature_count > pfState.max_member_count ? skip = true : {};
				}

				// num genomes per family
				if(pfState.min_genome_count){
					family.genome_count < pfState.min_genome_count ? skip = true : {};
				}
				if(pfState.max_genome_count){
					family.genome_count > pfState.max_genome_count ? skip = true : {};
				}

				if(!skip){
					newData.push(family);
				}
			});
			// console.log("genomeFilter took " + (window.performance.now() - tsStart), " ms");

			self.setData(newData);
			self.set("refresh");
		},
		reload: function(){
			var self = this;

			if(!self._loadingDeferred.isResolved()){
				self._loadingDeferred.cancel('reloaded');
				// console.log(self._loadingDeferred.isResolved(), self._loadingDeferred.isCanceled(), self._loadingDeferred.isRejected());
			}

			delete self._loadingDeferred;
			self._loaded = false;
			self.loadData();
			self.set("refresh");
		},

		query: function(query, opts){
			query = query || {};
			if(this._loaded){
				return this.inherited(arguments);
			}
			else{
				var _self = this;
				var results;
				var qr = QueryResults(when(this.loadData(), function(){
					results = _self.query(query, opts);
					qr.total = when(results, function(results){
						return results.total || results.length
					});
					return results;
				}));

				return qr;
			}
		},

		get: function(id, opts){
			if(this._loaded){
				return this.inherited(arguments);
			}else{
				var _self = this;
				return when(this.loadData(), function(){
					return _self.get(id, options)
				})
			}
		},

		loadData: function(){
			if(this._loadingDeferred){
				return this._loadingDeferred;
			}

			var _self = this;

			// console.warn(this.state.genome_ids, !this.state.genome_ids);
			if(!this.state || !this.state.genome_ids){
				// console.log("No Genome IDS, use empty data set for initial store");

				//this is done as a deferred instead of returning an empty array
				//in order to make it happen on the next tick.  Otherwise it
				//in the query() function above, the callback happens before qr exists
				var def = new Deferred();
				setTimeout(lang.hitch(_self, function(){
					this.setData([]);
					this._loaded = true;
					// def.resolve(true);
				}), 0);
				return def.promise;
			}

			this._loadingDeferred = when(request.post(_self.apiServer + '/genome/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
				},
				data: {
					q: "genome_id:(" + _self.state.genome_ids.join(" OR ") + ")",
					rows: _self.state.genome_ids.length,
					sort: "genome_name asc"
				}
			}), function(genomes){

				genomes.forEach(function(genome, idx){
					var gfs = new FilterStatus();
					gfs.init(idx, genome.genome_name);
					_self.pfState.genomeFilterStatus[genome.genome_id] = gfs;
					// _self.pfState.genomeIds.push(genome.genome_id);
				});
				_self.pfState.genomeIds = Object.keys(_self.pfState.genomeFilterStatus);
				// publish pfState & update filter panel
				Topic.publish("ProteinFamilies", "updatePfState", _self.pfState);
				Topic.publish("ProteinFamilies", "updateFilterGrid", genomes);

				// _self.pfState, _self.token
				var opts = {
					token: window.App.authorizationToken || ""
				};
				return when(window.App.api.data("proteinFamily", [_self.pfState, opts]), lang.hitch(this, function(data){
					_self.setData(data);
					_self._loaded = true;
					Topic.publish("ProteinFamilies", "hideLoadingMask");
				}));

			});
			return this._loadingDeferred;
		},

		getHeatmapData: function(pfState){

			var rows = [];
			var cols = [];
			var maxIntensity = 0; // global and will be modified inside createColumn function
			var keeps = []; // global and will be referenced inside createColumn function
			var colorStop = [];

			var isTransposed = (pfState.heatmapAxis === 'Transposed');
			// var start = window.performance.now();

			// assumes axises are corrected
			var familyOrder = pfState.clusterColumnOrder;
			var genomeOrder = pfState.clusterRowOrder;

			var createColumn = function(order, colId, label, distribution, meta){
				// this reads global variable keeps, and update global variable maxIntensity
				var filtered = [], isEven = (order % 2) === 0;

				keeps.forEach(function(idx, i){ // idx is a start position of distribution. 2 * gfs.getIndex();
					filtered[i] = distribution.substr(idx, 2);
					var val = parseInt(filtered[i], 16);

					if(maxIntensity < val){
						maxIntensity = val;
					}
				});

				return new Column(order, colId, label, filtered.join(''),
					((isEven) ? 0x000066 : null) /* label color */,
					((isEven) ? 0xF4F4F4 : 0xd6e4f4) /*bg color */,
					meta);
			};

			// rows - genomes
			// if genome order is changed, then needs to or-organize distribution in columns.
			var genomeOrderChangeMap = [];

			if(genomeOrder !== [] && genomeOrder.length > 0){
				pfState.genomeIds = genomeOrder;
				genomeOrder.forEach(function(genomeId, idx){
					// console.log(genomeId, pfState.genomeFilterStatus[genomeId], idx);
					genomeOrderChangeMap.push(pfState.genomeFilterStatus[genomeId].getIndex()); // keep the original position
					pfState.genomeFilterStatus[genomeId].setIndex(idx);
				});
			}

			pfState.genomeIds.forEach(function(genomeId, idx){
				var gfs = pfState.genomeFilterStatus[genomeId];
				if(gfs.getStatus() != '1'){
					keeps.push(2 * gfs.getIndex());
					var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
					var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

					//console.log("row: ", gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor);
					rows.push(new Row(gfs.getIndex(), genomeId, gfs.getLabel(), labelColor, rowColor));
				}
			});

			// cols - families
			// console.warn(this);
			var opts = {};
			if(this.sort.length > 0){
				opts.sort = this.sort;
			}
			var data = this.query("", opts);

			var familyOrderMap = {};
			if(familyOrder !== [] && familyOrder.length > 0){
				familyOrder.forEach(function(familyId, idx){
					familyOrderMap[familyId] = idx;
				});
			}else{
				data.forEach(function(family, idx){
					familyOrderMap[family.family_id] = idx;
				})
			}

			data.forEach(function(family){
				var meta = {
					'instances': family.feature_count,
					'members': family.genome_count,
					'min': family.aa_length_min,
					'max': family.aa_length_max
				};
				if(genomeOrderChangeMap.length > 0){
					family.genomes = distributionTransformer(family.genomes, genomeOrderChangeMap);
				}
				var order = familyOrderMap[family.family_id];
				cols[order] = createColumn(order, family.family_id, family.description, family.genomes, meta);
			});

			// colorStop
			if(maxIntensity == 1){
				colorStop = [new ColorStop(1, 0xfadb4e)];
			}else if(maxIntensity == 2){
				colorStop = [new ColorStop(0.5, 0xfadb4e), new ColorStop(1, 0xf6b437)];
			}else if(maxIntensity >= 3){
				colorStop = [new ColorStop(1 / maxIntensity, 0xfadb4e), new ColorStop(2 / maxIntensity, 0xf6b437), new ColorStop(3 / maxIntensity, 0xff6633), new ColorStop(maxIntensity / maxIntensity, 0xff6633)];
			}

			//console.log(rows, cols, colorStop);

			var currentData = {
				'rows': rows,
				'columns': cols,
				'colorStops': colorStop,
				'rowLabel': 'Genomes',
				'colLabel': 'Protein Families',
				'rowTrunc': 'mid',
				'colTrunc': 'end',
				'offset': 1,
				'digits': 2,
				'countLabel': 'Members',
				'negativeBit': false,
				'cellLabelField': '',
				'cellLabelsOverrideCount': false,
				'beforeCellLabel': '',
				'afterCellLabel': ''
			};

			if(isTransposed){

				var flippedDistribution = []; // new Array(currentData.rows.length);
				currentData.rows.forEach(function(row, rowIdx){
					var distribution = [];
					currentData.columns.forEach(function(col){
						distribution.push(col.distribution.substr(rowIdx * 2, 2));
					});
					flippedDistribution[rowIdx] = distribution.join("");
				});

				// create new rows
				var newRows = [];
				currentData.columns.forEach(function(col, colID){
					newRows.push(new Row(colID, col.colID, col.colLabel, col.labelColor, col.bgColor, col.meta));
				});
				// create new columns
				var newColumns = [];
				currentData.rows.forEach(function(row, rowID){
					newColumns.push(new Column(rowID, row.rowID, row.rowLabel, flippedDistribution[rowID], row.labelColor, row.bgColor, row.meta))
				});

				currentData = lang.mixin(currentData, {
					'rows': newRows,
					'columns': newColumns,
					'rowLabel': 'Protein Families',
					'colLabel': 'Genomes',
					'rowTrunc': 'end',
					'colTrunc': 'mid'
				});
			}

			// var end = window.performance.now();
			// console.log('getHeatmapData() took: ', (end - start), "ms");

			return currentData;
		},

		getSyntenyOrder: function(genomeId){

			var _self = this;
			var familyIdName = this.pfState.familyType + '_id';

			return when(request.post(_self.apiServer + '/genome_feature/', {
				handleAs: 'json',
				headers: {
					'Accept': "application/solr+json",
					'Content-Type': "application/solrquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
				},
				data: {
					q: 'genome_id:' + genomeId + ' AND annotation:PATRIC AND feature_type:CDS AND ' + familyIdName + ':[* TO *]',
					fl: familyIdName,
					sort: 'accession asc,start asc',
					rows: 1000000
				}
			}), function(res){

				var familyIdSet = {};
				var idx = 0;
				// var order = [];

				// var start = window.performance.now();

				res.response.docs.forEach(function(doc){
					var fId = doc[familyIdName];

					if(!familyIdSet.hasOwnProperty(fId)){
						familyIdSet[fId] = idx;
						// order.push({groupId: fId, syntonyAt: idx});
						idx++;
					}
				});

				// order.sort(function(a, b){
				// 	if(a.groupId > b.groupId) return 1;
				// 	if(a.groupId < b.groupId) return -1;
				// 	return 0;
				// });

				// var end = window.performance.now();
				// console.log('performance: ', (end - start));
				// console.log(order);

				// return order; // original implementation
				return familyIdSet;
			});
		},

		anchorByGenome: function(genomeId){

			Topic.publish("ProteinFamilies", "showLoadingMask");

			var self = this;
			when(this.getSyntenyOrder(genomeId), lang.hitch(self, function(newFamilyOrderSet){

				var pfState = this.pfState;
				var isTransposed = pfState.heatmapAxis === 'Transposed';

				var currentFamilyOrder, adjustedFamilyOrder, leftOver = [];
				if(isTransposed){
					currentFamilyOrder = this.currentData.rows.map(function(row){
						return row.rowID;
					});
				}else{
					currentFamilyOrder = this.currentData.columns.map(function(col){
						return col.colID;
					});
				}

				currentFamilyOrder.forEach(function(id){
					if(!newFamilyOrderSet.hasOwnProperty(id)){
						leftOver.push(id);
					}
				});

				adjustedFamilyOrder = Object.keys(newFamilyOrderSet).concat(leftOver);

				// clusterRow/ColumnOrder assumes corrected axises
				pfState.clusterColumnOrder = adjustedFamilyOrder;

				// update main grid
				Topic.publish("ProteinFamilies", "updateMainGridOrder", adjustedFamilyOrder);

				// re-draw heatmap
				self.currentData = this.getHeatmapData(pfState);
				Topic.publish("ProteinFamilies", "updateHeatmapData", self.currentData);
			}));
		}
	});
});