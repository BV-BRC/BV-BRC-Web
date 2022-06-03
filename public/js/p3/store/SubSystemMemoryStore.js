define([
  'dojo/_base/declare',
  'dojo/request',
  'dojo/store/Memory',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/Stateful',
  '../util/PathJoin'

], function (
  declare,
  request,
  Memory,
  QueryResults,
  when, lang,
  Deferred, Stateful,
  PathJoin
) {
  return declare([Memory, Stateful], {
    baseQuery: {},
    idProperty: 'id',
    apiServer: window.App.dataServiceURL,
    state: null,
    genome_ids: null,
    type: 'subsystem',
    onSetState: function (attr, oldVal, state) {
      var ov,
        nv;
      if (oldVal) {
        ov = oldVal.search;
        if (oldVal.hashParams.filter) {
          ov += oldVal.hashParams.filter;
        }
      }
      if (state) {
        nv = state.search;
        if (state.hashParams.filter) {
          nv += state.hashParams.filter;
        }

      }

      this.state = state;

      if (!nv) {
        this.setData([]);
        this._loaded = true;
        if (this._loadingDeferred) {
          this.loadingDeferred.resolve(true);
        }
      } else if (ov != nv) {
        if (this._loaded) {
          this._loaded = false;
          delete this._loadingDeferred;
          this.loadData();
        } else {
          if (this._loadingDeferred) {
            var curDef = this._loadingDeferred;
            when(this.loadData(), function (r) {
              curDef.resolve(r);
            });
          } else {
            this.loadData();
          }
        }
      }
    },
    constructor: function (opts) {
      this.init(opts);
    },
    init: function (options) {
      options = options || {};
      this._loaded = false;
      this.genome_ids = [];
      lang.mixin(this, options);
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var _self = this;
      var results;
      var qr = QueryResults(when(this.loadData(), function () {
        results = _self.query(query || {}, opts);
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

    queryTypes: {

      subsystems: '&select(superclass,class,subclass,subsystem_name,active,subsystem_id)&limit(25000)' +
        '&json(facet,' + encodeURIComponent(JSON.stringify({
        stat: {
          field: {
            field: 'subsystem_id',
            limit: -1,
            facet: {
              gene_count: 'unique(feature_id)',
              role_count: 'unique(role_id)',
            }
          }
        }
      })) + ')',

      genes: '&select(superclass,class,subclass,subsystem_name,role_id,role_name,active,feature_id,patric_id,gene,refseq_locus_tag,alt_locus_tag,product,genome_id,genome_name,taxon_id,subsystem_id)&limit(25000)'
    },
    buildQuery: function () {
      var q = [];
      if (this.state) {
        if (this.state.search) {
          // q.push((this.state.search.charAt(0) == '?') ? this.state.search.substr(1) : this.state.search);
          q.push(`eq(subsystem_id,*)&genome(${this.state.search})`)
        } else if (this.state.genome_ids) {
          q.push('in(genome_id,(' + this.state.genome_ids.map(encodeURIComponent).join(',') + '))');
        }

        if (this.state.hashParams && this.state.hashParams.filter) {
          if (this.state.hashParams.filter != 'false') {
            q.push(this.state.hashParams.filter);
          }
        }
        if (q.length < 1) {
          q = '';
        }
        else if (q.length == 1) {
          q = q[0];
        }
        else {
          q = 'and(' + q.join(',') + ')';
        }
      } else {
        q = '';
      }
      q += this.queryTypes[this.type];

      return (q.charAt(0) == '?') ? q.substr(1) : q;
    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }
      var state = this.state || {};

      if (!state.search || !state.genome_ids || state.genome_ids.length < 1) {

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

      const q = this.buildQuery();

      const _self = this;
      this._loadingDeferred = when(request.post(PathJoin(this.apiServer, 'subsystem') + '/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: this.token ? this.token : (window.App.authorizationToken || '')
        },
        timeout: 1200000,
        data: q

      }), lang.hitch(this, function (response) {

        // flat queries return a different data format
        if (this.type === 'subsystems') {
          // subsystems tab
          const ds = response.response.docs;  // redundant list of superclass,class,subclass,subsystem_name,active,subsystem_id
          const docs = []

          if (response.facets.stat) {
            const buckets = response.facets.stat.buckets;
            const map = {};
            buckets.forEach(function (b) {
              map[b.val] = b;
              delete b.val;
            });

            const processed = {} // skip list

            ds.forEach(function (doc) {
              const pv = doc.subsystem_id

              if (map[pv] && !processed.hasOwnProperty(pv)) {
                lang.mixin(doc, map[pv] || {});

                doc.id = doc.subsystem_id
                doc.document_type = 'subsystems_subsystem'

                docs.push(doc)
                processed[pv] = true
              } else {
                // already exists skip
              }
            }, this);
          }
          else {
            this.state.filter = false;
          }

          _self.setData(docs);
          _self._loaded = true;
          return true;

        } else if (this.type === 'genes') {
          // genes tab
          const docs = response.response.docs.map(function (doc) {
            doc.id = doc.feature_id;
            doc.document_type = 'subsystems_gene';

            return doc;
          }, this);

          _self.setData(docs);
          _self._loaded = true;
          return true;
        }
        console.error('Unable to Process Response: ', response);
        _self.setData([]);
        _self._loaded = true;
        return false;


      }), lang.hitch(this, function (err) {
        console.error('Error Loading Data: ', err);
        _self.setData([]);
        _self._loaded = true;
        return err;
      }));

      return this._loadingDeferred;
    }


  });
});
