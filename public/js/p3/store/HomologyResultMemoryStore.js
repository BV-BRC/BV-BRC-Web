define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/Stateful', 'dojo/when',
  'dojo/store/Memory', 'dojo/store/util/QueryResults', '../WorkspaceManager', 'dojo/topic'
], function (
  declare, lang, Deferred,
  request, Stateful, when,
  Memory, QueryResults, WorkspaceManager, topic
) {

  return declare([Memory, Stateful], {
    loaded: false,
    type: 'genome_feature',
    primaryKey: '_id',
    idProperty: '_id',
    dataPath: '',
    queryOptions: {
      sort: [{ attribute: 'pident', descending: true }]
    },

    onSetDataPath: function (attr, oldVal, dataPath) {
      if (!dataPath) {
        return;
      }
      this.dataPath = dataPath;
      var parts = dataPath.split('/')
      parts[parts.length - 1] = '.' + parts[parts.length - 1]
      this.hiddenPath = parts.join('/')
      this.reload();
    },

    onSetLoaded: function (attr, oldVal, loaded) {
    },

    constructor: function (options) {
      this.watch('dataPath', lang.hitch(this, 'onSetDataPath'));
      this.watch('loaded', lang.hitch(this, 'onSetLoaded'))
    },

    reload: function () {
      if (this._loadingDeferred && !this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }

      delete this._loadingDeferred;
      this.set('loaded', false)
      this.loadWorkspaceData();
    },

    query: function (query, opts) {
      opts = opts || {}
      query = query || {};
      var _self = this;
      if (!this.dataPath) {
        return QueryResults([])
      }

      if (this.loaded) {
        return this.inherited(arguments);
      }
      var wsd = this.loadWorkspaceData()

      return wsd.then(function () {
        console.log('loadWorkspaceData returned.  Query: ', query)
        return _self.query(query, opts)
      }, function (err) {
        console.log('Error retrieving workspace contents: ', err)
        throw Error('Unable to retreive workspace contents: ' + err)
      })
        .then(function (res) {
          return QueryResults(res);
        })
    },

    get: function (id, opts) {
      var _self = this;
      if (this.loaded) {
        return this.inherited(arguments);
      }

      var wsd = this.loadWorkspaceData()
      return wsd.then(function () {
        return _self.get(id, opts)
      }, function (err) {
        console.log('Error retrieving workspace contents: ', err)
        throw Error('Unable to retreive workspace contents: ' + err)
      })
    },

    getBlankMeta: function (id_list) {
      var result = {};
      var blank_record = {
        'function': 'status unknown', 'genome_name': 'genome unknown', 'genome_id': 'genome unknown', 'alt_locus_tag': 'alias unknown'
      };
      id_list.forEach(function (cur_id) {
        result[cur_id] = blank_record;
      });
      return result;
    },

    defaultLoadData: function (res) {
      var data = this.formatJSONResult(res);
      if (data.length == 0) {
        this.emptySetData();
        return;
      }
      data = data.map(function (d, idx) {
        d._id = idx;
        return d;
      })
      this.setData(data);
      topic.publish('homology_data', true);
      this.set('loaded', true);
      this._loadingDeferred.resolve(true);
    },

    emptySetData: function () {
      this.setData([]);
      topic.publish('homology_data', false);
      this.set('loaded', true);
      this._loadingDeferred.resolve(true);
    },

    loadWorkspaceData: function () {

      if (this._loadingDeferred) {
        console.log('this._loadingDeferred already exists, load in progress')
        return this._loadingDeferred;
      }

      this._loadingDeferred = new Deferred();

      if (!this.dataPath || !this.hiddenPath) {
        return;
      }

      WorkspaceManager.getObject(this.dataPath, true).then(lang.hitch(this, function (job_obj) {

        /* extract the database type */
        // console.log(job_obj);
        var db_type = job_obj.autoMeta.parameters.db_type;
        // var db_source = job_obj.autoMeta.parameters.db_source;
        // console.log(db_source);
        if (db_type == 'ffn' || db_type == 'faa') {
          this.type = 'genome_feature'
        } else if (db_type == 'fna') {
          this.type = 'genome_sequence'
        }

        WorkspaceManager.getFolderContents([this.hiddenPath], false, false, false).then(lang.hitch(this, function (paths) {

          var filtered = paths.filter(function (f) {
            if ('path' in f && f.path.match('blast_out.json')) {
              return true;
            }
            return false;
          }).map(function (f) {
            return f.path;
          });
          filtered.sort();

          return WorkspaceManager.getObjects(filtered).then(lang.hitch(this, function (objs) {
            objs.forEach(function (obj) {
              if (typeof obj.data == 'string') {
                obj.data = JSON.parse(obj.data);
              }
            });
            var res = objs[0];

            if ((res.data).length == 0) {
              this.emptySetData();
              return;
            }

            res.lookups = [];
            var resultIds = [];
            res.data.forEach(function (query_section) {
              resultIds = resultIds.concat(query_section.report.results.search.hits.map(element => { return element.description[0].id }));
            });

            if (this.type == 'genome_feature') {
              res.lookups.push(this.getBlankMeta(resultIds));
            }

            var query = { rows: 25000 };

            // var doQuery = false;
            if (this.type == 'genome_sequence') {
              // doQuery = true;
              resultIds = resultIds.map(function (d) {
                if (d.includes('accn|')) {
                  return d.replace('accn|', '');
                } else if (d.includes('.con.')) {
                  return d;
                } else {
                  return d.replace(/^\d+.\d+./, '');
                }
              }).filter(function (d) {
                return d !== '';
              });
              if (resultIds.length <= 0) {
                this.type = 'no_ids';
                this.defaultLoadData(res);
              } else {
                query.q = (resultIds.length > 0) ? 'sequence_id:(' + resultIds.join(' OR ') + ')' : {};
                // query.fl = 'genome_id,genome_name,taxon_id,sequence_id,accession,sequence_type,description';
              }
            } else if (this.type == 'genome_feature') {
              // doQuery = true;
              var patric_ids = [];
              var refseq_locus_tags = [];
              resultIds.forEach(function (id) {
                if (id.indexOf('gi|') > -1) {
                  refseq_locus_tags.push(id.split('|')[2]);
                } else if (id.indexOf('fig|') > -1) {
                  patric_ids.push(id);
                }
              });
              if (patric_ids.length <= 0) {
                this.type = 'no_ids';
                this.defaultLoadData(res);
              } else {
                query.q = (patric_ids.length > 0) ? 'patric_id:(' + patric_ids.join(' OR ') + ')' : {};
                (refseq_locus_tags.length > 0 && patric_ids.length > 0) ? query.q += ' OR ' : {};
                (refseq_locus_tags.length > 0) ? query.q += '(refseq_locus_tag:(' + refseq_locus_tags.join(' OR ') + ') AND annotation:RefSeq)' : {};
                query.fl = 'feature_id,patric_id,genome_id,genome_name,refseq_locus_tag,pgfam_id,plfam_id,figfam_id,gene,product,annotation,feature_type,gene_id,taxon_id,accession,start,end,strand,location,na_length,na_sequence_md5,aa_length,aa_sequence_md5';
              }
            } else if (this.type == 'specialty_genes') {
              this.defaultLoadData(res);
            } else {
              console.log('Unrecognized type.');
              this.defaultLoadData(res);
            }

            if (this.type != 'no_ids') {
              return request.post(window.App.dataAPI + this.type + '/', {
                handleAs: 'json',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/solrquery+x-www-form-urlencoded',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                data: query
              }).then(lang.hitch(this, function (keys) {
                var keyMap = {};
                keys.forEach(function (f) {
                  if (this.type == 'genome_sequence') {
                    keyMap[f.sequence_id] = f;
                  } else {
                    if (f.annotation == 'RefSeq') {
                      keyMap[f.refseq_locus_tag] = f;
                    } else {
                      keyMap[f.patric_id] = f;
                      //console.log('Map key:' + f.patric_id);
                    }
                  }
                }, this);
                res.lookups.push(keyMap);
                this.defaultLoadData(res);
              }));
            }
          }), function (err) {
            this.emptySetData();
          });
        }), lang.hitch(this, function (err) {
          this.emptySetData();
        }));
      }))
      return this._loadingDeferred;
    },

    formatEvalue: function (evalue) {
      if (evalue.toString().includes('e')) {
        var val = evalue.toString().split('e');
        return parseInt(val[0]) + 'e' + val[1];
      } else if (evalue !== 0) {
        return evalue.toFixed(4);
      }
      return evalue;
    },

    formatJSONResult: function (json) {
      // console.log(json);
      // NEED LOGIC to determine whether ID fetch is likely to work

      // NEED ANOTHER LOOP HERE TO ACCOUNT FOR THE MULTIPLE QUERIES
      // AND TO FIGURE OUT WHICH GRID YOU SHOULD USE FOR NON-DECORATING RESULTS
      var metadata = json.lookups[0];
      var identical = {}; // NEED TO FIND OUT WHEN / HOW IDENTICAL IS POPULATED
      var features = json.lookups[1] || {};
      var entries = [];
      var query_id = null;
      var query_length = null;
      var target_id = null;
      var report = null;
      var search = null;
      var hits = null;
      json.data.forEach(function (query_section) {
        report = query_section.report;
        search = report.results.search;
        hits = search.hits;
        hits.forEach(function (hit) {
          // metadata doesn't exist right now from the DB
          query_id = search.query_id;
          query_length = search.query_len;
          target_id = hit.description[0].id;
          // metadata doesn't exist right now from the DB
          var m = Object.prototype.hasOwnProperty.call(metadata, target_id) ? metadata[target_id] : { genome_id: '', genome_name: '', 'function': '' };
          var entry = {
            qseqid: query_id,
            sseqid: target_id,
            pident: Math.round(hit.hsps[0].identity / hit.hsps[0].align_len * 100),
            query_coverage: ((Math.abs(hit.hsps[0].query_to - hit.hsps[0].query_from) + 1) / query_length * 100).toFixed(2),
            subject_coverage: ((Math.abs(hit.hsps[0].hit_to - hit.hsps[0].hit_from) + 1) / hit.len * 100).toFixed(2),
            length: hit.len,
            q_length: query_length,
            evalue: this.formatEvalue(hit.hsps[0].evalue),
            bitscore: Math.round(hit.hsps[0].bit_score),
            genome_id: m.genome_id,
            genome_name: m.genome_name,
            'function': m['function'],
            hit_from: hit.hsps[0].hit_from,
            hit_to: hit.hsps[0].hit_to,
            detail: {
              match_count: m.match_count || 0,
              matches: identical[target_id] || [],
              hsps: hit.hsps,
              query_len: query_length,
              subject_len: hit.len
            }
          };
          if (this.type === 'genome_feature') {
            if (Object.prototype.hasOwnProperty.call(features, target_id)) {
              entry.feature_id = features[target_id].feature_id;
              entry.function = features[target_id].product;
              entry = lang.mixin(entry, features[target_id]);
            } else if (target_id.indexOf('gi|') > -1) {
              var refseq_locus_tag = target_id.split('|')[2];
              entry.feature_id = features[refseq_locus_tag].feature_id;
              entry = lang.mixin(entry, features[refseq_locus_tag]);
            } else {
              console.warn('missing patric_id in header', target_id);
            }
          } else if (this.type === 'no_ids') {
            delete entry.genome_id;
            delete entry.genome_name;
          } else if (this.type === 'genome_sequence') {
            target_id = target_id.replace('accn|', '');
            if (target_id.includes('accn|')) {
              target_id = target_id.replace('accn|', '');
            } else if (target_id.includes('.con.')) {
              target_id = target_id;
            } else {
              target_id = target_id.replace(/^\d+.\d+./, '');
            }
            if (Object.prototype.hasOwnProperty.call(metadata, target_id)) {
              entry.genome_id = metadata[target_id].genome_id;
              entry.sequence_type = metadata[target_id].sequence_type;
              entry.description = metadata[target_id].description;
              entry = lang.mixin(entry, metadata[target_id]);
            } else {
              console.log('missing id: ', target_id);
            }
          } else if (this.type === 'specialty_genes' || this.state.submit_values.db_source === 'fasta_data') {
            if (Object.prototype.hasOwnProperty.call(metadata, target_id)) {
              var m = metadata[target_id];
              var parts = hit.description[0].title.match(/\[(.*)\]/);
              var org = 'NA';
              if (parts && parts.length > 1) {
                org = parts[1];
              }
              entry = lang.mixin(entry, { database: m.locus_tag, source_id: m.alt_locus_tag, organism: org });
              delete entry.genome_id;
              delete entry.genome_name;
            } else {
              var database = 'custom db';
              var source_id = 'changeme1';
              org = 'unknown';
              var desc = 'changeme2';
              if (hit.description[0].title) {
                var title = hit.description[0].title;
                var id = title.split(' ')[0];
                desc = title.split(' ')[1].split(' [')[0];
                database = id.split('|')[0];
                source_id = id.split('|')[1];
                var orgs = title.match(/\[(.*)\]/);
                org = (orgs) ? orgs[1] : '';
              }
              entry = lang.mixin(entry, {
                database: database, source_id: source_id, organism: org, function: desc
              });
              delete entry.genome_id;
              delete entry.genome_name;
            }
          }
          entries.push(entry);
        }, this);
      }, this);
      return entries;
    }
  });
});
