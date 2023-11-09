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
    idProperty: 'family_id',
    pfState: null,
    state: null,
    genome_ids: null,
    is_first_load: true,
    primaryKey: 'family_id',
    data: [],
    loaded: false,
    pgfam_data: null,
    plfam_data: null,
    // figfam_data: null
    pgfam_key: '',
    plfam_key: '',
    // figfam_key: '',
    useGenomeGroupNames: false,
    baseQuery: {},
    startup: true,
    apiServer: window.App.dataServiceURL,

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      if (this.is_first_load) {
        this.genome_ids = state.data.genome_ids; // copy elements
        this.is_first_load = false;
      } else if (arraysEqual(state.data.genome_ids, this.genome_ids)) {
        this._loaded = true;
        // Topic.publish(this.topicId, 'hideLoadingMask');
        return;
      }

      if (state && state.data.genome_ids) {
        this._loaded = false;
        this.pfState = lang.mixin({}, this.pfState, pfStateDefault);
        this.pfState.genomeFilterStatus = {}; // lang.mixin does not override deeply
        this._filtered = undefined; // reset flag prevent to read stored _original
        this.setGenomeIds();
      }
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;

      this.onSetState(null, null, options.state);

      this.currentType = null;
      // TODO: figfam

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("received:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            break;
          case 'setFamilyType':
            this.pfState = value;
            this._filtered = null;

            this.setData(this.query({ 'familyType': this.pfState.familyType }));
            Topic.publish(this.topicId, 'updatePfState', this.pfState);
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          case 'anchorByGenome':
            this.anchorByGenome(value);
            break;
          case 'applyConditionFilter':
            // includes feature group filtering
            this.setData(this.query({ 'familyType': this.pfState.familyType }));
            Topic.publish(this.topicId, 'applyConditionFilterRefresh', this.pfState);
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          case 'applyGenomeSelector':
            this.pfState = value;
            this.changeData({ 'familyType': this.pfState.familyType });
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          case 'requestHeatmapData':
            this.pfState = value;
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          case 'changeHeatmapLabels':
            this.useGenomeGroupNames = !this.useGenomeGroupNames;
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            break;
          default:
            break;
        }
      }));

      this.currentFilter = JSON.parse(JSON.stringify(this.pfState.genomeFilterStatus));
    },

    featureGroupFilter: function (data) {
      if (!this.pfState.feature_group || this.pfState.feature_group === '') {
        return data;
      }
      // I think this is right?
      if (!this.pfState.feature_group_data || this.pfState.feature_group_data.length == 0) {
        return data;
      }
      var newData = [];
      var family_ids;
      if (this.pfState.familyType === 'pgfam') {
        family_ids = this.pfState.feature_group_data.map(x => x.pgfam_id);
      } else { // plfam
        family_ids = this.pfState.feature_group_data.map(x => x.plfam_id);
      }
      data.forEach(lang.hitch(this, function (row) {
        if (family_ids.includes(row.family_id)) {
          newData.push(row);
        }
      }));
      return newData;
    },

    conditionFilter: function (data) {

      if (this._filtered == undefined) { // first time: I don't think it's really used
        this._filtered = true;
      }
      var newData = [];
      // var gfs = this.pfState.genomeFilterStatus;

      // var tsStart = window.performance.now();
      var keywordRegex = this.pfState.keyword.trim().toLowerCase().replace(/,/g, '~').replace(/\n/g, '~')
        .split('~')
        .map(function (k) { return k.trim(); });

      Object.keys(data).forEach(function (family) {

        var skip = false;
        family = data[family];
        /*
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
        */

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

      return newData;
    },

    // Unused I think
    reload: function () {
      console.log('reloading');
      this._loaded = false;

    },


    // TODO: remove, pretty sure unused
    loadGenomeData: function () {
      var data = this.state.data['table'];
      var plfam_data = this.queryEngine({ 'familyType': 'plfam' }, {})(data);
      var pgfam_data = this.queryEngine({ 'familyType': 'pgfam' }, {})(data);
      this.plfam_data = this.parseData(plfam_data);
      this.pgfam_data = this.parseData(pgfam_data);
    },

    loadGenomeDataBackground: function () {
      console.log('window worker');
      var def = new Deferred();
      var worker = new window.Worker('/public/worker/ProteinFamiliesServiceWorker.js', { type: 'module' });
      worker.onerror = (err) => console.log(err);
      worker.onmessage = lang.hitch(this, function (e) {
        this.pgfam_data = e.data['pgfam'];
        this.plfam_data = e.data['plfam'];
        def.resolve(true);
        worker.terminate();
      });
      var family_genomes = { 'plfam': this.state.data.plfam_genomes, 'pgfam': this.state.data.pgfam_genomes };
      var payload = { genomeFilter: this.pfState.genomeFilterStatus, data: this.state.data['table'], family_genomes: family_genomes };
      worker.postMessage(JSON.stringify({ type: 'process_data', payload: payload }));
      return def;
    },

    getFamilyData: function (familyType) {
      if (familyType === 'plfam') {
        return QueryResults(this.plfam_data);
      }
      if (familyType === 'pgfam') {
        return QueryResults(this.pgfam_data);
      }
    },

    changeData: function (query) {
      var change_genomes = this.checkChangeGenomeFilter();
      if (change_genomes) {
        if (window.Worker) {
          Topic.publish(this.topicId, 'showLoadingMask');
          this.loadGenomeDataBackground().then(lang.hitch(this, function (res) {
            Topic.publish(this.topicId, 'updatePfState', this.pfState);
            Topic.publish(this.topicId, 'applyConditionFilterRefresh', this.pfState);
            var currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', currentData);
            Topic.publish(this.topicId, 'hideLoadingMask');
          }));
        } else {
          console.log('window.Worker not enabled');
        }
      }
    },

    query: function (query, opts) {
      console.log('query = ', query);
      console.log('opts = ', opts);
      // add fields if needed
      // TODO: unnecessary, can be removed
      if (query === '' || query === undefined) {
        query = { 'familyType': this.pfState.familyType };
      }
      if (!Object.keys(query).includes('familyType')) {
        query = { 'familyType': this.pfState.familyType };
      }

      // set data to family data
      var data = null;
      if (query.familyType === 'pgfam') {
        data = this.pgfam_data;
      }
      if (query.familyType === 'plfam') {
        data = this.plfam_data;
        // debugger;
      }
      data = this.conditionFilter(data);
      data = this.featureGroupFilter(data);
      var total_length = data.length;
      // if opts.sort, apply remaining filters
      if (opts && opts.sort) {
        var sort_field = opts.sort[0].attribute;
        if (opts.sort[0].descending) {
          data = data.sort((a, b) => (a[sort_field] < b[sort_field]) ? 1 : -1);
        } else {
          data = data.sort((a, b) => (a[sort_field] > b[sort_field]) ? 1 : -1);
        }
      }
      var start = 0;
      var count = 200;
      if (opts && opts.start) {
        start = opts.start;
      }
      if (opts && opts.count) {
        count = opts.count;
      }
      var query_data = null;
      if (opts && opts.selectAll) {
        if (start > 0) {
          query_data = data.slice(start).concat(data.slice(0, start - 1));
        }
        else {
          query_data = data;
        }
      }
      else {
        query_data = data.slice(start, start + count);
      }
      query_data = QueryResults(query_data);
      query_data.total = total_length; // sets table total
      return query_data;
    },

    checkChangeGenomeFilter: function () {
      var filter_data = false;
      var current_filter = this.currentFilter ? JSON.stringify(this.currentFilter) : JSON.stringify({});
      var genome_filter = JSON.stringify(this.pfState.genomeFilterStatus);
      if (current_filter !== genome_filter) {
        // make deep copy
        this.currentFilter = JSON.parse(JSON.stringify(this.pfState.genomeFilterStatus));
        filter_data = true;
      }
      return filter_data;
    },

    filter: function (filter) {
      console.log('filter = ', filter);
      // this.inherited(arguments);
    },

    setGenomeIds: function () {
      if (!this.state.data.genome_ids) {
        console.log('state does not have genome_ids');
        return;
      }
      var filterGenomes = [];
      var curr_genomes = [];
      var genome_data_keys = ['genome_status', 'isolation_country', 'host_group', 'collection_year', 'genome_groups'];
      // TODO: change to be more efficient: get list of unique genome ids first?
      this.state.data.genome_ids.forEach(lang.hitch(this, function (genomeId, idx) {
        if (!curr_genomes.includes(genomeId)) {
          // var genome_data = this.state.data.genome_data[idx];
          var genome_name = this.state.genome_names[idx];
          var genome_group = 'None';
          var genome_data = {};
          if (this.state.genome_data) {
            genome_data_keys.forEach(lang.hitch(this, function (k) {
              if (k === 'genome_groups') {
                genome_data['genome_group'] = this.state.genome_data[k][idx];
              }
              else {
                genome_data[k] = this.state.genome_data[k][idx];
              }
            }));
          }
          else {
            genome_data_keys.forEach(function (k) {
              genome_data[k] = 'None';
            });
          }
          genome_data = lang.mixin(genome_data, {
            'genome_name': genome_name,
            'genome_id': genomeId
          });
          curr_genomes.push(genomeId);
          var gfs = new HeatmapDataTypes.FilterStatus();
          gfs.init(idx, genome_name, genome_group);
          this.pfState.genomeFilterStatus[genomeId] = gfs;
          filterGenomes.push(genome_data);
        }
      }));

      this.pfState.genomeIds = Object.keys(this.pfState.genomeFilterStatus);
      // publish pfState & update filter panel
      Topic.publish(this.topicId, 'updatePfState', this.pfState);
      Topic.publish(this.topicId, 'updateFilterGrid', filterGenomes);
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

        res.response.docs.forEach(function (doc) {
          var fId = doc[familyIdName];
          if (fId === '') return;

          if (!Object.prototype.hasOwnProperty.call(familyIdSet, fId)) {
            familyIdSet[fId] = idx;
            // order.push({groupId: fId, syntonyAt: idx});
            idx++;
          }
        });

        return familyIdSet;
      });
    },

    anchorByGenome: function (genomeId) {

      Topic.publish(this.topicId, 'showLoadingMask');

      when(this.getSyntenyOrder(genomeId), lang.hitch(this, function (newFamilyOrderSet) {
        var highlighted = [],
          leftOver = [];
        this.query('', { 'selectAll': true }).forEach(function (d) {
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

      var _self = this;
      this.pfState.genomeIds.forEach(function (genomeId, idx) {
        var gfs = thisGFS[genomeId];
        if (gfs.getStatus() != '1') {
          keeps.push(2 * gfs.getIndex());
          var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
          var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;
          var altLabel = gfs.altLabel ? gfs.altLabel : 'None';
          var meta = { groupLabel: altLabel, nameLabel: gfs.getLabel(), useGroupName: _self.useGenomeGroupNames };
          // console.log("row: ", gfs.getIndex(), genomeId, gfs.getGenomeName(), labelColor, rowColor);
          rows.push(new HeatmapDataTypes.Row(gfs.getIndex(), genomeId, gfs.getLabel(), labelColor, rowColor, meta));
        }
      });

      // cols - families
      // console.warn(this);
      var opts = {};
      if (this.pfState.columnSort && this.pfState.columnSort.length > 0) {
        opts.sort = this.pfState.columnSort;
      }

      var data;
      if (this.pfState.sort) {
        data = this.query({ 'familyType': this.pfState.familyType }, { 'selectAll': true, 'sort': this.pfState.sort } )
      }
      else {
        data = this.query({ 'familyType': this.pfState.familyType }, { 'selectAll': true });
      }
      // console.log('heatmap data', data);

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
      var print_one = false;
      data.filter(function (f) {
        return f !== undefined && f.family_id !== undefined;
      }).forEach(function (family) {
        var meta = {
          instances: family.feature_count,
          members: family.genome_count,
          min: family.aa_length_min,
          max: family.aa_length_max
        };
        if (print_one) {
          console.log('family: ', family);
          print_one = false;
        }
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
  });
});
