define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults',
  '../util/arraysEqual', './ArrangeableMemoryStore', './HeatmapDataTypes'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic,
  Memory, QueryResults,
  arraysEqual, ArrangeableMemoryStore, HeatmapDataTypes
) {

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

  return declare([ArrangeableMemoryStore, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'family_id',
    state: null,
    genome_ids: null,
    is_first_load: true,
    pfState: null,

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      // console.warn('onSetState', state.genome_ids);
      if (this.is_first_load) {
        this.genome_ids = state.genome_ids; // copy elements
        this.is_first_load = false;
      } else if (arraysEqual(state.genome_ids, this.genome_ids)) {
        // console.log("do not duplicate");
        this._loaded = true;
        Topic.publish(this.topicId, 'hideLoadingMask');
        return;
      }
      // console.log(this.genome_ids.length, state.genome_ids.length, arraysEqual(this.genome_ids, state.genome_ids));

      if (state && state.genome_ids) {
        this._loaded = false;
        this.pfState = lang.mixin({}, this.pfState, pfStateDefault);
        this.pfState.genomeFilterStatus = {}; // lang.mixin does not override deeply
        this._filtered = undefined; // reset flag prevent to read stored _original
        delete this._loadingDeferred;
      }

      if (state && state.hashParams && state.hashParams.params) {
        var params = JSON.parse(decodeURIComponent(state.hashParams.params));

        params.family_type ? this.pfState.familyType = params.family_type : {};
        // params.keyword ? pfState.keyword = params.keyword : {};
      }
    },

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      this.topicId = options.topicId;
      // console.log('pfs store created.', this.topicId);

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("received:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'setFamilyType':
            Topic.publish(this.topicId, 'showLoadingMask');
            this.pfState = value;
            this._filtered = null;
            if (arraysEqual(this.genome_ids, this.pfState.genomeIds)) {
              this.reload();
              Topic.publish(this.topicId, 'showMainGrid');
            }
            break;
          case 'anchorByGenome':
            this.anchorByGenome(value);
            break;
          case 'applyConditionFilter':
            this.pfState = value;
            this.conditionFilter();
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updatePfState', this.pfState);
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          case 'requestHeatmapData':
            this.pfState = value;
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          default:
            break;
        }
      }));

      this.watch('state', lang.hitch(this, 'onSetState'));
    },
    conditionFilter: function () {

      if (this._filtered == undefined) { // first time
        this._filtered = true;
        this._original = this.query('', {});
      }
      var data = this._original;
      var newData = [];
      var gfs = this.pfState.genomeFilterStatus;

      // var tsStart = window.performance.now();
      var keywordRegex = this.pfState.keyword.trim().toLowerCase().replace(/,/g, '~').replace(/\n/g, '~')
        .split('~')
        .map(function (k) { return k.trim(); });

      data.forEach(function (family) {

        var skip = false;

        // genomes
        Object.keys(gfs).forEach(function (genomeId) {
          var index = gfs[genomeId].getIndex();
          var status = gfs[genomeId].getStatus();
          // console.log(family.family_id, genomeId, index, status, family.genomes, parseInt(family.genomes.substr(index * 2, 2), 16));
          if (status == 1 && parseInt(family.genomes.substr(index * 2, 2), 16) > 0) {
            skip = true;
          }
          else if (status == 0 && parseInt(family.genomes.substr(index * 2, 2), 16) == 0) {
            skip = true;
          }
        });

        // keyword search
        if (!skip && this.pfState.keyword !== '') {
          skip = !keywordRegex.some(function (needle) {
            return needle && (family.description.toLowerCase().indexOf(needle) >= 0 || family.family_id.toLowerCase().indexOf(needle) >= 0);
          });
        }

        // perfect family
        if (this.pfState.perfectFamMatch === 'Y') {
          family.feature_count !== family.genome_count ? skip = true : {};
        } else if (this.pfState.perfectFamMatch === 'N') {
          family.feature_count === family.genome_count ? skip = true : {};
        }

        // num proteins per family
        if (this.pfState.min_member_count) {
          family.feature_count < this.pfState.min_member_count ? skip = true : {};
        }
        if (this.pfState.max_member_count) {
          family.feature_count > this.pfState.max_member_count ? skip = true : {};
        }

        // num genomes per family
        if (this.pfState.min_genome_count) {
          family.genome_count < this.pfState.min_genome_count ? skip = true : {};
        }
        if (this.pfState.max_genome_count) {
          family.genome_count > this.pfState.max_genome_count ? skip = true : {};
        }

        if (!skip) {
          newData.push(family);
        }
      }, this);
      // console.log("after all filtering", newData.length);
      // console.log("genomeFilter took " + (window.performance.now() - tsStart), " ms");

      this.setData(newData);
      this.set('refresh');
    },
    reload: function () {

      if (!this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }

      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = this.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      })));

      return qr;

    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      return when(this.loadData(), lang.hitch(this, function () {
        return this.get(id, opts);
      }));

    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      // console.warn(this.state.genome_ids, !this.state.genome_ids);
      if (!this.state || !this.state.genome_ids) {
        // console.log("No Genome IDS, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      Topic.publish(this.topicId, 'showLoadingMask');

      this._loadingDeferred = when(request.post(this.apiServer + '/genome/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: {
          q: 'genome_id:(' + this.state.genome_ids.join(' OR ') + ')',
          rows: this.state.genome_ids.length,
          sort: 'genome_name asc'
        }
      }), lang.hitch(this, function (genomes) {

        genomes.forEach(function (genome, idx) {
          var gfs = new HeatmapDataTypes.FilterStatus();
          gfs.init(idx, genome.genome_name);
          this.pfState.genomeFilterStatus[genome.genome_id] = gfs;
        }, this);

        this.pfState.genomeIds = Object.keys(this.pfState.genomeFilterStatus);
        // publish pfState & update filter panel
        Topic.publish(this.topicId, 'updatePfState', this.pfState);
        Topic.publish(this.topicId, 'updateFilterGrid', genomes);

        var opts = {
          token: window.App.authorizationToken || ''
        };
        return when(window.App.api.data('proteinFamily', [this.pfState, opts]), lang.hitch(this, function (data) {
          this.setData(data);
          this._loaded = true;
          Topic.publish(this.topicId, 'hideLoadingMask');
        }));

      }));
      return this._loadingDeferred;
    },

    getHeatmapData: function () {

      var rows = [];
      var cols = [];
      var maxIntensity = 0; // global and will be modified inside createColumn function
      var keeps = []; // global and will be referenced inside createColumn function
      var colorStop = [];

      var isTransposed = (this.pfState.heatmapAxis === 'Transposed');
      // var start = window.performance.now();

      // assumes axises are corrected
      var familyOrder = this.pfState.clusterColumnOrder;
      var genomeOrder = this.pfState.clusterRowOrder;

      var createColumn = function (order, colId, label, distribution, meta) {
        // this reads global variable keeps, and update global variable maxIntensity
        var filtered = [],
          isEven = (order % 2) === 0;

        keeps.forEach(function (idx, i) { // idx is a start position of distribution. 2 * gfs.getIndex();
          filtered[i] = distribution.substr(idx, 2);
          var val = parseInt(filtered[i], 16);

          if (maxIntensity < val) {
            maxIntensity = val;
          }
        });

        return new HeatmapDataTypes.Column(
          order, colId, label, filtered.join(''),
          ((isEven) ? 0x000066 : null) /* label color */,
          ((isEven) ? 0xF4F4F4 : 0xd6e4f4) /* bg color */,
          meta
        );
      };

      // rows - genomes
      // if genome order is changed, then needs to or-organize distribution in columns.
      var thisGFS = this.pfState.genomeFilterStatus;
      // this is needed only for protein family since transcriptomics re-generate dist on the fly
      var genomeOrderChangeMap = [];
      if (genomeOrder !== [] && genomeOrder.length > 0) {
        this.pfState.genomeIds = genomeOrder;
        genomeOrder.forEach(function (genomeId, idx) {
          genomeOrderChangeMap.push(thisGFS[genomeId].getIndex());
          thisGFS[genomeId].setIndex(idx);
        });
      }

      this.pfState.genomeIds.forEach(function (genomeId, idx) {
        var gfs = thisGFS[genomeId];
        if (gfs.getStatus() != '1') {
          keeps.push(2 * gfs.getIndex());
          var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
          var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

          // console.log("row: ", gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor);
          rows.push(new HeatmapDataTypes.Row(gfs.getIndex(), genomeId, gfs.getLabel(), labelColor, rowColor));
        }
      });

      // cols - families
      // console.warn(this);
      var opts = {};
      if (this.pfState.columnSort && this.pfState.columnSort.length > 0) {
        opts.sort = this.pfState.columnSort;
      }
      var data = this.query('', opts);

      var familyOrderMap = {};
      if (familyOrder !== [] && familyOrder.length > 0) {
        familyOrder.forEach(function (familyId, idx) {
          familyOrderMap[familyId] = idx;
        });
      } else {
        data.forEach(function (family, idx) {
          familyOrderMap[family.family_id] = idx;
        });
      }

      data.filter(function (f) {
        return f !== undefined;
      }).forEach(function (family) {
        var meta = {
          instances: family.feature_count,
          members: family.genome_count,
          min: family.aa_length_min,
          max: family.aa_length_max
        };
        if (genomeOrderChangeMap.length > 0) {
          family.genomes = HeatmapDataTypes.distributionTransformer(family.genomes, genomeOrderChangeMap);
        }

        var order = familyOrderMap[family.family_id];
        cols[order] = createColumn(order, family.family_id, family.description, family.genomes, meta);
      });

      // work around for flash bug
      if (maxIntensity == 70) {
        maxIntensity = 69;
      }

      // colorStop
      if (maxIntensity == 1) {
        colorStop = [new HeatmapDataTypes.ColorStop(1, 0xfadb4e)];
      } else if (maxIntensity == 2) {
        colorStop = [new HeatmapDataTypes.ColorStop(0.5, 0xfadb4e), new HeatmapDataTypes.ColorStop(1, 0xf6b437)];
      } else if (maxIntensity >= 3) {
        colorStop = [new HeatmapDataTypes.ColorStop(1 / maxIntensity, 0xfadb4e), new HeatmapDataTypes.ColorStop(2 / maxIntensity, 0xf6b437), new HeatmapDataTypes.ColorStop(3 / maxIntensity, 0xff6633), new HeatmapDataTypes.ColorStop(maxIntensity / maxIntensity, 0xff6633)];
      }

      // console.log(rows, cols, colorStop);

      var currentData = {
        rows: rows,
        columns: cols,
        colorStops: colorStop,
        rowLabel: 'Genomes',
        colLabel: 'Protein Families',
        rowTrunc: 'mid',
        colTrunc: 'end',
        offset: 1,
        digits: 2,
        countLabel: 'Members',
        negativeBit: false,
        cellLabelField: '',
        cellLabelsOverrideCount: false,
        beforeCellLabel: '',
        afterCellLabel: ''
      };

      if (isTransposed) {

        var flippedDistribution = []; // new Array(currentData.rows.length);
        currentData.rows.forEach(function (row, rowIdx) {
          var distribution = [];
          currentData.columns.forEach(function (col) {
            distribution.push(col.distribution.substr(rowIdx * 2, 2));
          });
          flippedDistribution[rowIdx] = distribution.join('');
        });

        // create new rows
        var newRows = [];
        currentData.columns.forEach(function (col, colID) {
          newRows.push(new HeatmapDataTypes.Row(colID, col.colID, col.colLabel, col.labelColor, col.bgColor, col.meta));
        });
        // create new columns
        var newColumns = [];
        currentData.rows.forEach(function (row, rowID) {
          newColumns.push(new HeatmapDataTypes.Column(rowID, row.rowID, row.rowLabel, flippedDistribution[rowID], row.labelColor, row.bgColor, row.meta));
        });

        currentData = lang.mixin(currentData, {
          rows: newRows,
          columns: newColumns,
          rowLabel: 'Protein Families',
          colLabel: 'Genomes',
          rowTrunc: 'end',
          colTrunc: 'mid'
        });
      }

      // var end = window.performance.now();
      // console.log('getHeatmapData() took: ', (end - start), "ms");

      return currentData;
    },

    getSyntenyOrder: function (genomeId) {

      var familyIdName = this.pfState.familyType + '_id';

      return when(request.post(this.apiServer + '/genome_feature/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: {
          q: 'genome_id:' + genomeId + ' AND annotation:PATRIC AND feature_type:CDS AND ' + familyIdName + ':[* TO *]',
          fl: familyIdName,
          sort: 'accession asc,start asc',
          rows: 25000
        }
      }), function (res) {

        var familyIdSet = {};
        var idx = 0;
        // var order = [];

        // var start = window.performance.now();

        res.response.docs.forEach(function (doc) {
          var fId = doc[familyIdName];
          if (fId === '') return;

          if (!Object.prototype.hasOwnProperty.call(familyIdSet, fId)) {
            familyIdSet[fId] = idx;
            // order.push({groupId: fId, syntonyAt: idx});
            idx++;
          }
        });

        // order.sort(function(a, b){
        //   if(a.groupId > b.groupId) return 1;
        //   if(a.groupId < b.groupId) return -1;
        //     return 0;
        // });

        // var end = window.performance.now();
        // console.log('performance: ', (end - start));
        // console.log(order);

        // return order; // original implementation
        return familyIdSet;
      });
    },

    anchorByGenome: function (genomeId) {

      Topic.publish(this.topicId, 'showLoadingMask');

      when(this.getSyntenyOrder(genomeId), lang.hitch(this, function (newFamilyOrderSet) {

        var highlighted = [],
          leftOver = [];
        this.query('', {}).forEach(function (d) {

          if (Object.prototype.hasOwnProperty.call(newFamilyOrderSet, d.family_id)) {
            highlighted[newFamilyOrderSet[d.family_id]] = d.family_id;
          } else {
            leftOver.push(d.family_id);
          }
        });

        var adjustedFamilyOrder = highlighted.concat(leftOver);

        // clusterRow/ColumnOrder assumes corrected axises
        var pfState = lang.mixin({}, this.pfState, { clusterColumnOrder: adjustedFamilyOrder });

        // update main grid
        Topic.publish(this.topicId, 'updatePfState', pfState);
        Topic.publish(this.topicId, 'updateMainGridOrder', adjustedFamilyOrder);

        // re-draw heatmap
        var currentData = this.getHeatmapData();
        Topic.publish(this.topicId, 'updateHeatmapData', currentData);
      }));
    }
  });
});
