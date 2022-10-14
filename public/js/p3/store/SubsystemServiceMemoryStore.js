define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dojo/_base/lang', 'dojo/topic',
  'dojo/store/util/QueryResults', './SubSystemMemoryStore'
], function (
  declare, Deferred, lang, Topic, QueryResults, oldSubsystemMemoryStore
) {
  return declare([oldSubsystemMemoryStore], {

    idProperty: 'id',
    primaryKey: 'id',
    _loaded: false,

    onSetState: function (attr, oldVal, state) {
      console.log('memory store set state');
      this.currentFilter = {};
      if (this.type === 'subsystems') {
        if (!this._loaded) {
          this.setData([]);
          this.loadSubsystemsData().then(lang.hitch(this, function (res) {
            // this.state.data['parsed_subsystem_table'] = parsedData;
            this._loaded = true;
            this.setData(this.state.data['parsed_subsystem_table']);
            Topic.publish(this.topicId, 'refreshGrid');
            Topic.publish(this.topicId, 'createFilterPanel');
          }));
        }
      } else if (this.type === 'genes') {
        if (!this._loaded) {
          this.setData([]);
          this.loadGenesData().then(lang.hitch(this, function (res) {
            this._loaded = true;
            this.setData(this.state.data['parsed_genes_table']);
            Topic.publish(this.topicId, 'refreshGrid');
            Topic.publish(this.topicId, 'createFilterPanel');
          }));
          // TODO: service worker??
          // this.loadGenesData();
        }
      } else {
        console.log('invalid subsystems memory store');
      }
    },

    query: function (query, opts) {
      if (!this._loaded) {
        return QueryResults([]);
      }
      console.log('query = ', query);
      console.log('opts = ', opts);
      var data;
      if (this.type === 'subsystems') {
        data = this.state.data['parsed_subsystem_table'];
      }
      if (this.type === 'genes') {
        data = this.state.data['parsed_genes_table'];
      }
      // TODO: insert condition filter
      // this.checkChangeFilter(query);
      data = this.filterData(data);
      if (opts && opts.sort) {
        var sort_field = opts.sort[0].attribute;
        if (opts.sort[0].descending) {
          data = data.sort((a, b) => (a[sort_field] < b[sort_field]) ? 1 : -1);
        } else {
          data = data.sort((a, b) => (a[sort_field] > b[sort_field]) ? 1 : -1);
        }
      }
      var total_length = data.length;
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
        query_data = data.slice(start).concat(data.slice(0, start));
      }
      else {
        query_data = data.slice(start, start + count);
      }
      query_data = QueryResults(query_data);
      query_data.total = total_length; // sets table total
      return query_data;
    },

    loadData: function () {
      console.log('memory store load data')
    },

    loadSubsystemsData: function () {
      if (!this.state.data.hasOwnProperty('subsystem_table')) {
        console.log('state missing subsystems table');
      }
      else {
        var def = new Deferred();
        var worker = new window.Worker('/public/worker/SubsystemServiceWorker.js', { type: 'module' });
        worker.onerror = (err) => console.log(err);
        worker.onmessage = lang.hitch(this, function (e) {
          if (e.data.type === 'processed_subsystem_data') {
            this.state.data['parsed_subsystem_table'] = e.data['parsed_data'];
            this.state.facetCounts = e.data['facet_counts'];
          }
          def.resolve(true);
          worker.terminate();
        });
        // TODO: add genome filter
        var facet_fields = this.facetFields;
        var payload = { data: this.state.data['subsystem_table'], facetFields: facet_fields };
        worker.postMessage(JSON.stringify({ type: 'parse_subsystems', payload: payload }));
        return def;
      }
    },

    loadGenesData: function () {
      if (!this.state.data.hasOwnProperty('genes_table')) {
        console.log('state missing genes table');
      }
      else {
        var def = new Deferred();
        var worker = new window.Worker('/public/worker/SubsystemServiceWorker.js', { type: 'module' });
        worker.onerror = (err) => console.log(err);
        worker.onmessage = lang.hitch(this, function (e) {
          if (e.data.type === 'processed_genes_data') {
            this.state.data['parsed_genes_table'] = e.data['parsed_data'];
            this.state.facetCounts = e.data['facet_counts'];
          }
          def.resolve(true);
          worker.terminate();
        });
        // TODO: add genome filter
        var facet_fields = this.facetFields;
        var payload = { data: this.state.data['genes_table'], facetFields: facet_fields };
        worker.postMessage(JSON.stringify({ type: 'parse_genes', payload: payload }));
        return def;
      }
    },

    setTopicId: function (topicId) {
      this.topicId = topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0], value = arguments[1];
        switch (key) {
          case 'refreshGrid':
            console.log('refresh grid');
            break;
          default:
            break;
        }
      }));
    },

    updateDataFilter: function (filter) {
      this.currentFilter = filter;
      this.setData(this.query());
      Topic.publish(this.topicId, 'refreshGrid');
    },

    filterData: function (data) {
      if (JSON.stringify(this.currentFilter) === '{}') {
        return data;
      }
      if (!this.currentFilter['fwks'] && !this.currentFilter['facets']) {
        return data;
      }
      var query_filter = this.currentFilter;
      var keyword_filter = query_filter['fwks'];
      var facet_filter = {};
      Object.keys(query_filter['facets']).forEach(lang.hitch(this, function (facet) {
        facet_filter[facet] = [];
        query_filter['facets'][facet].forEach(lang.hitch(this, function (x) {
          facet_filter[facet].push(x);
        }));
      }));
      // debugger;
      // Facets looks like this:
      // - {'annotation':['PATRIC'],'pathway_class':['Carbohydrate Metabolism','Lipid Mtabolism'],etc}
      var filtered_data = data;
      if (facet_filter) {
        filtered_data = filtered_data.filter(lang.hitch(this, function (el) {
          var facet_match = true;
          Object.keys(facet_filter).forEach(lang.hitch(this, function (cat) {
            var ff_list = facet_filter[cat];
            if (!ff_list.includes(el[cat])) {
              facet_match = false;
            }
          }));
          return facet_match;
        }));
      }
      if (keyword_filter) {
        filtered_data = filtered_data.filter(function (el) {
          var keyword_found = false;
          Object.values(el).forEach(lang.hitch(this, function (val) {
            keyword_filter.forEach(lang.hitch(this, function (kwd) {
              if (typeof val === 'string' || val instanceof String) {
                if (val.toLocaleLowerCase().includes(kwd.toLocaleLowerCase())) {
                  keyword_found = true;
                }
              }
            }));
          }));
          return keyword_found;
        });
      }
      return filtered_data;
    },
  });
});
