define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/Stateful', 'dojo/topic', 'dojo/promise/all',
  'dojo/store/Memory', 'dojo/store/util/QueryResults',
  './ArrangeableMemoryStore', '../WorkspaceManager', './HeatmapDataTypes'
], function (
  declare, lang, Deferred,
  request, when, Stateful, Topic, All,
  Memory, QueryResults,
  ArrangeableMemoryStore, WorkspaceManager, HeatmapDataTypes
) {

  var tgStateDefault = {
    heatmapAxis: '',
    comparisonIds: [],
    comparisonFilterStatus: {},
    clusterRowOrder: [],
    clusterColumnOrder: [],
    significantGenes: 'Y',
    colorScheme: 'rgb',
    maxIntensity: 0,
    keyword: '',
    filterGenome: null, // this should not "", since it means no filter
    upFold: 0,
    downFold: 0,
    upZscore: 0,
    downZscore: 0
  };

  return declare([ArrangeableMemoryStore, Stateful], {
    baseQuery: {},
    apiServer: window.App.dataServiceURL,
    idProperty: 'feature_id',
    state: null,
    state_search: null,
    tgState: null,

    constructor: function (options) {
      this._loaded = false;
      if (options.apiServer) {
        this.apiServer = options.apiServer;
      }

      this.topicId = options.topicId;
      // console.log("tg store created.", this.topicId);

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("received:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'applyConditionFilter':
            this.tgState = value;
            this.conditionFilter();
            this.currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateTgState', this.tgState);
            Topic.publish(this.topicId, 'updateHeatmapData', this.currentData);
            break;
          case 'requestHeatmapData':
            this.tgState = value;
            this.currentData = this.getHeatmapData();
            Topic.publish(this.topicId, 'updateHeatmapData', this.currentData);
            break;
          default:
            break;
        }
      }));
    },
    conditionFilter: function () {

      if (this._filtered == undefined) { // first time
        this._filtered = true;
        this._original = this.query('', {});
      }
      var data = this._original;
      var newData = [];
      var gfs = this.tgState.comparisonFilterStatus;

      // var tsStart = window.performance.now();
      var keywordRegex = this.tgState.keyword.trim().toLowerCase().replace(/,/g, '~').replace(/\n/g, '~')
        .split('~')
        .map(function (k) { return k.trim(); });

      data.forEach(function (gene) {

        var skip = true;
        var up_r = 0,
          down_r = 0,
          total_samples = 0;

        // comparisons
        for (var i = 0, len = this.tgState.comparisonIds.length; i < len; i++) {
          var comparisonId = this.tgState.comparisonIds[i];
          var index = gfs[comparisonId].getIndex();
          var status = gfs[comparisonId].getStatus();
          var comparison = gene.samples[comparisonId];
          // console.log(gene, gene.feature_id, comparisonId, index, status, gene.sample_binary, parseInt(gene.sample_binary.substr(index * 1, 1), 16));

          var expression = gene.sample_binary.substr(index, 1);
          if (expression == '1') {
            if (status != 2) {
              skip = !this._thresholdFilter(comparison, this.tgState, status);
              if (skip) {
                break;
              }
            } else {
              // status == 2, don't care
              if (skip) {
                skip = !this._thresholdFilter(comparison, this.tgState, status);
              }
            }
          } else {
            if (status != 2) {
              skip = true;
              break;
            }
          }
          // console.log(gene.feature_id, comparisonId, expression, status, skip);

          if (comparison) {
            var value = parseFloat(comparison.log_ratio);

            if (value > this.tgState.upFold) {
              up_r++;
            }
            if (value < this.tgState.downFold) {
              down_r++;
            }
            total_samples++;
          }
        }
        // console.log("after comparison filter", gene.patric_id, skip);

        if (!skip && this.tgState.keyword !== '') {
          skip = !keywordRegex.some(function (needle) {
            return needle && ((gene.product || '').toLowerCase().indexOf(needle) >= 0
              || (gene.patric_id || '').toLowerCase().indexOf(needle) >= 0
              || (gene.alt_locus_tag || '').toLowerCase().indexOf(needle) >= 0
              || (gene.refseq_locus_tag || '').toLowerCase().indexOf(needle) >= 0);
          });
        }
        // console.log("after keyword filter", this.tgState.keyword !== '', skip);

        if (!skip && this.tgState.filterGenome !== null) {
          skip = (gene.genome_id !== this.tgState.filterGenome && this.tgState.filterGenome !== '');
        }
        // console.log("after genome filter", this.tgState.filterGenome !== '', skip);

        gene.up = up_r;
        gene.down = down_r;
        gene.sample_size = total_samples;

        if (!skip) {
          newData.push(gene);
        }
      }, this);

      // console.log("after conditionFilter: ", newData.length);
      // console.log("conditionFilter took " + (window.performance.now() - tsStart), " ms");

      this.setData(newData);
      this.set('refresh');
    },
    _thresholdFilter: function (comparison, tgState, filterStatus) {
      var uf = tgState.upFold,
        df = tgState.downFold;
      var uz = tgState.upZscore,
        dz = tgState.downZscore;
      var l = (comparison && !isNaN(parseFloat(comparison.log_ratio))) ? parseFloat(comparison.log_ratio) : 0;
      var z = (comparison && !isNaN(parseFloat(comparison.z_score))) ? parseFloat(comparison.z_score) : 0;
      if (!comparison) return false;

      var pass = false;
      switch (filterStatus) {
        case 2: // don't care (' ')
          pass = (dz === uz && df === uf)
            || ((z >= uz || z <= dz) && (l >= uf || l <= df));
          break;
        case 0: // up-regulated (1)
          pass = ((uz != 0 ? z >= uz : true) && l >= uf);
          break;
        case 1: // down-regulated (0)
          pass = ((dz != 0 ? z <= dz : true) && l <= df);
          break;
        default:
          break;
      }
      // console.log("_thresholdFilter: [", filterStatus, pass, "] ", uf, l, df, ",", uz, z, dz);
      return pass;
    },
    reload: function () {
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

      if (!this.state || this.state.search == null) {
        // console.log("No State, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          def.resolve(true);
        }), 0);
        return def.promise;
      }

      // check state.search to reset tgState
      // console.log(this.state.search, ",", this.state_search, ", resetting?", (this.state.search !== this.state_search));
      if (this.state.search !== this.state_search) {
        this._loaded = false;
        this.tgState = lang.mixin(this.tgState, {}, tgStateDefault);
        this.tgState.comparisonFilterStatus = {};
        delete this.tgState.wsExpIds;
        delete this.tgState.wsComaprisons;
        delete this.tgState.query;
        delete this.tgState.pbExpIds;
        delete this.tgState.pbComparisons;
        this._filtered = undefined;
        delete this._loadingDeferred;
        this.state_search = this.state.search;
      }

      var params = this.state.search.split('&');
      var wsExperiments = params.filter(function (s) {
        return s.match(/wsExpId=.*/);
      });
      var wsComparisons = params.filter(function (s) {
        return s.match(/wsComparisonId=.*/);
      });
      var wsExpIds,
        wsComparisonIds;
      if (wsExperiments.length > 0) {
        wsExpIds = wsExperiments[0].replace('wsExpId=', '').split(',');
      }
      if (wsComparisons.length > 0) {
        wsComparisonIds = wsComparisons[0].replace('wsComparisonId=', '').split(',');
      }

      // console.log(this.state.search, "wsExpIds: ", wsExpIds, "wsComparisonIds: ", wsComparisonIds);

      var wsRequest = new Deferred();

      if (wsExpIds) {
        var comparisonFiles = [];
        wsExpIds.forEach(function (exp_id) {
          var parts = exp_id.split('/'),
            jobName = parts.pop(),
            dotPath = parts.join('/') + '/.' + jobName + '/sample.json';
          comparisonFiles.push(dotPath);
        });

        wsRequest = when(WorkspaceManager.getObjects(comparisonFiles, false), function (results) {
          return results.map(function (d) {
            if (!wsComparisonIds) {
              return JSON.parse(d.data).sample;
            }
            return JSON.parse(d.data).sample.filter(function (s) {
              // console.log(wsComparisonIds.indexOf(s.pid), s.pid);
              return wsComparisonIds.indexOf(s.pid) >= 0;
            });

          });
        });
      } else {
        wsRequest.resolve([]);
      }

      var query = this.state.search.replace(/&wsExpId=.*/, '');

      var pbRequest = new Deferred();
      var pbExperiments = params.filter(function (s) {
        return s.match(/eid,\(.*\)/);
      });
      var pbComparisons = params.filter(function (s) {
        return s.match(/pid,\(.*\)/);
      });
      if (pbExperiments.length > 0) {
        pbRequest = when(request.post(this.apiServer + '/transcriptomics_sample/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          data: query + '&select(eid,pid,expname,expmean,timepoint,mutant,strain,condition)&limit(99999)'
        }), function (results) {
          var comparisons;
          if (pbComparisons.length > 0) {
            comparisons = results.filter(function (d) {
              return pbComparisons.indexOf(d.pid) >= 0;
            });
          } else {
            comparisons = results;
          }
          comparisons = comparisons.map(function (d) {
            if (typeof d.pid == 'number') {
              d.pid = d.pid.toString();
            }
            return d;
          });
          // console.log("comparisons: ", comparisons);
          return comparisons;
        });
      } else {
        pbRequest.resolve([]);
      }

      this._loadingDeferred = when(All([wsRequest, pbRequest]), lang.hitch(this, function (results) {

        // console.log("get all results:", results);

        var wsComparisons = [].concat.apply([], results[0]);
        var pbComparisons = [].concat.apply([], results[1]);
        var allComparisons = [].concat.apply(wsComparisons, pbComparisons);

        var comparisonIdList = [];
        if (wsComparisons.length) {
          comparisonIdList = [].concat.apply(comparisonIdList, wsComparisons.map(function (d) {
            return d.pid;
          }));
          this.tgState.wsExpIds = wsExpIds; // extra reference
          this.tgState.wsComaprisons = wsComparisons; // extra reference
        }

        if (pbComparisons.length) {
          comparisonIdList = [].concat.apply(comparisonIdList, pbComparisons.map(function (d) {
            return d.pid;
          }));
          var pbExpIds = {};
          pbComparisons.forEach(function (d) {
            if (!Object.prototype.hasOwnProperty.call(pbExpIds, d.eid)) {
              pbExpIds[d.eid] = true;
            }
          });
          this.tgState.query = query;
          this.tgState.pbExpIds = Object.keys(pbExpIds);
          this.tgState.pbComparisons = pbComparisons;
        }

        this.tgState.comparisonIds = comparisonIdList;
        allComparisons.forEach(function (comparison, idx) {
          var cfs = new HeatmapDataTypes.FilterStatus();
          cfs.init(idx, comparison.expname);
          this.tgState.comparisonFilterStatus[comparison.pid.toString()] = cfs;
        }, this);

        Topic.publish(this.topicId, 'updateTgState', this.tgState);
        Topic.publish(this.topicId, 'updateFilterGrid', allComparisons);

        var opts = {
          token: window.App.authorizationToken || ''
        };

        return when(window.App.api.data('transcriptomicsGene', [this.tgState, opts]), lang.hitch(this, function (data) {
          this.setData(data);
          this._loaded = true;
          this._buildGenomeFilter(data);
          Topic.publish(this.topicId, 'hideLoadingMask');
        }));
      }));

      return this._loadingDeferred;
    },

    _buildGenomeFilter: function (data) {
      if (data.length == 0) {
        return;
      }
      // console.log("_buildGenomeFilter", data.length);

      var genomeNameMap = {},
        genomeCountMap = {};
      data.forEach(function (d) {
        if (!Object.prototype.hasOwnProperty.call(genomeCountMap, d.genome_id)) {
          genomeNameMap[d.genome_id] = d.genome_name;
          genomeCountMap[d.genome_id] = 1;
        } else {
          genomeCountMap[d.genome_id]++;
        }
      });

      var genomes = Object.keys(genomeCountMap).map(function (k) {
        return { value: k, label: genomeNameMap[k] + ' (' + genomeCountMap[k] + ')' };
      });

      // console.log(genomes);
      Topic.publish(this.topicId, 'updateGenomeFilter', genomes);
    },

    getHeatmapData: function () {

      var rows = [];
      var cols = [];
      var maxIntensity = 0; // global and will be modified inside createColumn function
      var keeps = []; // global and will be referenced inside createColumn function

      var isTransposed = (this.tgState.heatmapAxis === 'Transposed');
      // var start = window.performance.now();

      // assumes axises are corrected
      // use clusterColumnOrder only for clustering and use tgState.columnSort for sorting.
      // clusterRowOrder will be used for both clustering and filter condition sorting.
      var geneOrder = this.tgState.clusterColumnOrder;
      var comparisonOrder = this.tgState.clusterRowOrder;

      var createColumn = function (order, colId, label, distribution, meta) {
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

      // rows - comparisons
      // if comparison order is changed, then needs to or-organize distribution in columns.
      var thisGFS = this.tgState.comparisonFilterStatus;

      if (comparisonOrder !== [] && comparisonOrder.length > 0) {
        this.tgState.comparisonIds = comparisonOrder;
        comparisonOrder.forEach(function (comparisonId, idx) {
          thisGFS[comparisonId].setIndex(idx);
        });
      }

      this.tgState.comparisonIds.forEach(function (comparisonId, idx) {
        var gfs = thisGFS[comparisonId];
        // if(gfs.getStatus() != '1'){
        keeps.push(2 * gfs.getIndex());
        var labelColor = ((idx % 2) == 0) ? 0x000066 : null;
        var rowColor = ((idx % 2) == 0) ? 0xF4F4F4 : 0xd6e4f4;

        rows.push(new HeatmapDataTypes.Row(gfs.getIndex(), comparisonId, gfs.getLabel(), labelColor, rowColor));
        // }
      });

      // cols - genes
      // console.warn(this);
      var opts = {};
      if (this.tgState.columnSort && this.tgState.columnSort.length > 0) {
        opts.sort = this.tgState.columnSort;
      }
      var data = this.query('', opts);

      if (this.tgState.significantGenes == 'N') {
        data = this._original; // if show all genes, then bypass filter conditions
      }

      var geneOrderMap = {};
      if (geneOrder !== [] && geneOrder.length > 0) {
        geneOrder.forEach(function (geneId, idx) {
          geneOrderMap[geneId] = idx;
        });
      } else {
        data.forEach(function (gene, idx) {
          geneOrderMap[gene.feature_id] = idx;
        });
      }

      data.forEach(function (gene) {
        var meta = {
          samples: gene.samples
        };
        var push_flag = false;

        // calculate distribution based on the threshold. gene.dist
        var dist = [];
        var labels = [];
        // gene.samples.forEach(function(sample, idx){
        this.tgState.comparisonIds.forEach(function (comparisonId, idx) {
          var comparison = gene.samples[comparisonId];
          var all_genes_flag = false;
          var status = this.tgState.comparisonFilterStatus[comparisonId].getStatus();
          var expression = gene.sample_binary.substr(idx, 1);
          // console.log(comparisonId, filterStatus, expression);

          if (this.tgState.significantGenes === 'N') {
            if (expression === '1') {
              if (this._thresholdFilter(comparison, this.tgState, status)) {
                push_flag = true;
                all_genes_flag = false;
              } else {
                if (this.tgState.significantGenes === 'N') {
                  push_flag = true;
                  all_genes_flag = true;
                }
              }
            } else {
              if (status != 2) {
                push_flag = false;
              } else {
                if (this.tgState.significantGenes === 'N') {
                  all_genes_flag = true;
                }
              }
            }
          } else {
            all_genes_flag = false;
            push_flag = true;
          }

          var val;
          if (comparison) {
            var lr = parseFloat(comparison.log_ratio);
            if (isNaN(lr)) {
              lr = 0;
            }

            // skip checking all vs significant genes
            if (all_genes_flag) {
              val = '0B';
            } else {
              // skip checking threshold
              // console.log("threshold: ", this._thresholdFilter(comparison, this.tgState, filterStatus));
              if (!this._thresholdFilter(comparison, this.tgState, status)) {
                val = '0B';
              } else {
                if (lr < 0 && lr >= -1) {
                  val = '01';
                } else if (lr < -1 && lr >= -2) {
                  val = '02';
                } else if (lr < -2 && lr >= -3) {
                  val = '03';
                } else if (lr < -3 && lr >= -4) {
                  val = '04';
                } else if (lr < -4) {
                  val = '05';
                } else if (lr > 0 && lr <= 1) {
                  val = '06';
                } else if (lr > 1 && lr <= 2) {
                  val = '07';
                } else if (lr > 2 && lr <= 3) {
                  val = '08';
                } else if (lr > 3 && lr <= 4) {
                  val = '09';
                } else if (lr > 4) {
                  val = '0A';
                } else {
                  val = '0B';
                }
              }
            }
            dist[idx] = val;
            labels[idx] = lr;
          } else {
            dist[idx] = '0B';
            labels[idx] = '0';
          }
        }, this);
        gene.dist = dist.join('');
        meta.labels = labels.join('|');

        if (push_flag) {
          var order = geneOrderMap[gene.feature_id];
          if (gene.patric_id) {
            cols[order] = createColumn(order, gene.feature_id, gene.patric_id.replace('|', '') + ' - ' + gene.product, gene.dist, meta);
          } else {
            cols[order] = createColumn(order, gene.feature_id, gene.gene + ' - ' + gene.product, gene.dist, meta);
          }
        }
      }, this);

      this.tgState.maxIntensity = maxIntensity; // store for later use
      var colorStop = HeatmapDataTypes.getColorStops(this.tgState.colorScheme, maxIntensity);

      // console.warn(rows, cols, colorStop);

      var currentData = {
        rows: rows,
        columns: cols,
        colorStops: colorStop,
        rowLabel: 'Comparison',
        colLabel: 'Gene',
        rowTrunc: 'end',
        colTrunc: 'end',
        offset: 1,
        digits: 2,
        countLabel: 'Log ratio',
        negativeBit: false,
        cellLabelField: 'labels',
        cellLabelsOverrideCount: true,
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
          rowLabel: 'Gene',
          colLabel: 'Comparison'
        });
      }

      // var end = window.performance.now();
      // console.log('getHeatmapData() took: ', (end - start), "ms");

      return currentData;
    }
  });
});
