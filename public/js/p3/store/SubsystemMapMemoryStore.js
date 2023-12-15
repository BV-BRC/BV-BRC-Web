define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic', 'dojo/promise/all',
  'dojo/store/Memory', 'dojo/store/util/QueryResults',
  './HeatmapDataTypes'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic, All,
  Memory, QueryResults,
  HeatmapDataTypes
) {

  var pmState = {
    heatmapAxis: 'Transposed',
    genome_ids: [],
    genomeFilterStatus: {},
    clusterRowOrder: [],
    clusterColumnOrder: []
  };

  return declare([Memory, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'subsystem_id',
    state: null,
    pmState: pmState,

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      var self = this;

      Topic.subscribe('SubSystemMap', function () {
        // console.log("SubsystemMapMemStore received:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'requestHeatmapData':
            Deferred.when(self.getHeatmapData(value), function (response) {
              console.log('** Publishing that heatmap data is done.');
              Topic.publish('SubSystemMap', 'updateHeatmapData', response);
            },  function (error) {
              console.error('Subsystem request error:', error);
              alert('Sorry, there was an issue fetching subsystem data (heatmap data) from the Data API.');
            });
            break;
          default:
            break;
        }
      });

      this.loadData();
    },

    reload: function () {
      var self = this;
      delete self._loadingDeferred;
      self._loaded = false;
      self.loadData();
      self.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var _self = this;
      var results;
      var qr = QueryResults(when(this.loadData(), function () {
        results = _self.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      }));

      return qr;

    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      var _self = this;
      return when(this.loadData(), function () {
        return _self.get(id, opts);
      });

    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      var _self = this;

      // console.warn(this.state, this.state.genome_ids, !this.state.genome_ids);
      if (!this.state.genome_ids) {
        // console.log("No Genome IDS, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(_self, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      (this.state.subsystem_id) ? _self.pmState.subsystem_id = this.state.subsystem_id : {};
      (this.state.genome_ids) ? _self.pmState.genome_ids = this.state.genome_ids : {};
      (this.state.taxon_id) ? _self.pmState.taxon_id = this.state.taxon_id : {};

      this._loadingDeferred = when(request.post(_self.apiServer + '/genome/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
        },
        data: {
          q: 'genome_id:(' + _self.state.genome_ids.join(' OR ') + ')',
          rows: _self.state.genome_ids.length,
          sort: 'genome_name asc'
        }
      }), function (genomes) {

        var genomeIndexMap = {};
        _self.state.genome_ids.forEach(function (genome_id, idx) {
          genomeIndexMap[genome_id] = idx;
        });

        genomes.forEach(function (genome, idx) {
          var gfs = new HeatmapDataTypes.FilterStatus();
          gfs.init(genomeIndexMap[genome.genome_id], genome.genome_name);
          _self.pmState.genomeFilterStatus[genome.genome_id] = gfs;
        });

        _self.pmState.genome_ids = _self.state.genome_ids;
        Topic.publish('SubSystemMap', 'updatePmState', _self.pmState);

        // sub query - genome distribution
        var query = {
          q: 'genome_id:(' + _self.state.genome_ids.join(' OR ') + ') AND subsystem_id:"' + encodeURIComponent(_self.state.subsystem_id) + '"',
          rows: 0,
          facet: true,
          'json.facet': '{stat:{type:field,field:role_id,limit:-1,sort:{index:asc},facet:{families:{type:field,field:genome_id,limit:-1}}}}'
        };

        var q = Object.keys(query).map(function (p) {
          return p + '=' + query[p];
        }).join('&');

        return when(request.post(_self.apiServer + '/subsystem/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
          },
          data: q
        }), function (response) {

          var roleGenomeDist = response.facets.stat.buckets;
          var roleIDs = [];

          roleGenomeDist.forEach(function (el) {
            if (el.val != '') {
              roleIDs.push(el.val);
            }
          });

          var roleGenomeIdCountMap = {};
          var roleGenomeIdSet = {};
          var genomePosMap = {};
          var genome_ids = _self.pmState.genome_ids;
          genome_ids.forEach(function (genomeId, idx) {
            genomePosMap[genomeId] = idx;
          });

          roleGenomeDist.forEach(function (el) {
            var role = el.val;
            var buckets = el.families.buckets;

            buckets.forEach(function (bucket) {
              var genomeId = bucket.val;

              var genomeCount = bucket.count.toString(16);
              if (genomeCount.length < 2) genomeCount = '0' + genomeCount;

              if (role in roleGenomeIdCountMap) {
                roleGenomeIdCountMap[role][genomePosMap[genomeId]] = genomeCount;
              }
              else {
                var genomeIdCount = new Array(genome_ids.length).fill('00');
                genomeIdCount[genomePosMap[genomeId]] = genomeCount;
                roleGenomeIdCountMap[role] = genomeIdCount;
              }

              if (role in roleGenomeIdSet) {
                roleGenomeIdSet[role].push(genomeId);
              }
              else {
                var genomeIds = [];
                genomeIds.push(genomeId);
                roleGenomeIdSet[role] = genomeIds;
              }
            });
          });

          // var roleIDsInQuote = roleIDs.map(function (idstr) {
          //   return '"' + idstr + '"';
          // }).join(' OR ');

          var data = [];
          roleGenomeDist.forEach(function (element) {
            var role = element.val;
            if (role != '') {
              var roleCount = element.count;
              var clean_name = role.replace(/_/g, ' ');

              var row = {
                role_name: role,
                role_count: roleCount,
                genome_count: roleGenomeIdSet[role].length,
                genome_missing: (genome_ids.length - roleGenomeIdSet[role].length),
                description: clean_name,
                genomes: roleGenomeIdCountMap[role].join('')
              };
              data.push(row);
            }
          });

          _self.setData(data);
          _self._loaded = true;
          return true;
        });
      });
      return this._loadingDeferred;
    },

    getHeatmapData: function (pmState) {
      console.log('getHeatmapData: fetching heatmap data', pmState);
      var def = new Deferred();

      // used to toggle display reference genomes
      // if (this.state.display_reference_genomes) {
      //   pmState.genome_ids = this.state.genome_ids_with_reference;
      // }
      // else {
      //   pmState.genome_ids = this.state.genome_ids_without_reference;
      // }

      if (this.state.display_alphabetically) {

        var sortable_genes = [];
        for (var key in pmState.genomeFilterStatus) {
          if (Object.prototype.hasOwnProperty.call(pmState.genomeFilterStatus, key) && this.state.genome_ids_without_reference.indexOf(key) > -1) {
            sortable_genes.push({ gene_id: key, genome_name: pmState.genomeFilterStatus[key].label });
          }
        }

        sortable_genes.sort(function (a, b) {
          var textA = a.genome_name.toUpperCase();
          var textB = b.genome_name.toUpperCase();
          return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });

        var sorted_gene_ids = [];
        sortable_genes.forEach(function (gene) {
          sorted_gene_ids.push(gene.gene_id);
        });

        pmState.genome_ids = sorted_gene_ids;
      } else {
        pmState.genome_ids = this.state.genome_ids;
      }

      /*
      if (this.state.display_alphabetically && this.state.display_reference_genomes) {
        pmState.genome_ids = this.state.alphabetical_genome_ids_with_reference;
      }
      else if (this.state.display_alphabetically && !this.state.display_reference_genomes) {
        pmState.genome_ids = this.state.alphabetical_genome_ids_without_reference;
      }
      else if (!this.state.display_alphabetically && this.state.display_reference_genomes) {
        pmState.genome_ids = this.state.genome_ids_with_reference;
      }
      else if (!this.state.display_alphabetically && !this.state.display_reference_genomes) {
        pmState.genome_ids = this.state.genome_ids_without_reference;
      }
      */

      var rows = [];
      var cols = [];
      var maxIntensity = 0; // global and will be modified inside createColumn function
      var keeps = []; // global and will be referenced inside createColumn function
      var colorStop = [];

      var isTransposed = (pmState.heatmapAxis === 'Transposed');
      // var start = window.performance.now();

      // assumes axises are corrected
      var roleOrder = pmState.clusterColumnOrder;
      var genomeOrder = pmState.clusterRowOrder;

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
      var genomeOrderChangeMap = [];

      if (genomeOrder !== [] && genomeOrder.length > 0) {
        pmState.genome_ids = genomeOrder;
        genomeOrder.forEach(function (genomeId, idx) {
          // console.log(genomeId, pmState.genomeFilterStatus[genomeId], idx);
          genomeOrderChangeMap.push(pmState.genomeFilterStatus[genomeId].getIndex()); // keep the original position
          pmState.genomeFilterStatus[genomeId].setIndex(idx);
        });
      }

      pmState.genome_ids.forEach(function (genomeId, idx) {
        var gfs = pmState.genomeFilterStatus[genomeId];
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
      if (this.sort && this.sort.length > 0) {
        opts.sort = this.sort;
      }

      var roleOrderMap = {};


      if (roleOrder !== [] && roleOrder.length > 0) {
        roleOrder.forEach(function (roleId, idx) {
          roleOrderMap[roleId] = idx;
        });
      } else {
        this.data.forEach(function (role, idx) {
          roleOrderMap[role.role_name] = idx;
        });
      }

      // if (!this.data || this.data.length < 1) {

      // }

      this.data.forEach(function (role) {
        var meta = {
          instances: role.role_count,
          members: role.genome_count
        };
        if (genomeOrderChangeMap.length > 0) {
          role.genomes = HeatmapDataTypes.distributionTransformer(role.genomes, genomeOrderChangeMap);
        }
        var order = roleOrderMap[role.role_name];
        cols[order] = createColumn(order, role.role_name, role.description, role.genomes, meta);
      });

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
        colLabel: 'Roles ',
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
          rowLabel: 'Roles',
          colLabel: 'Genomes',
          rowTrunc: 'end',
          colTrunc: 'mid'
        });
      }

      // var end = window.performance.now();
      // console.log('getHeatmapData() took: ', (end - start), "ms");

      def.resolve(currentData);
      return def.promise;
    }
  });
});
