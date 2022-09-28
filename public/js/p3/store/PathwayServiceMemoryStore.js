define([
  'dojo/_base/declare',
  'dojo/request',
  'dojo/store/Memory',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang', 'dojo/on',
  'dojo/_base/Deferred', 'dojo/Stateful',
  '../util/PathJoin', '../WorkspaceManager'

], function (
  declare,
  request,
  Memory,
  QueryResults,
  when, lang, on,
  Deferred, Stateful,
  PathJoin, WorkspaceManager
) {
  return declare([Memory, Stateful], {
    idProperty: '_id',
    storeType: '',
    primaryKey: '',
    data: null,
    currentData: null,
    currentFilter: null,
    startup: true,
    container: null,

    constructor: function (options) {
      this.data = options.data
      this.storeType = options.storeType;
      this.primaryKey = options.primaryKey;
      this.state = options.state;
      this.startup = true;
      // this.setGenomeData(this.data, this.state.data.genome_ids);
      // this.setData(this.data);

    },

    setContainer: function (container) {
      this.container = container;
    },

    checkChangeFilter: function (query) {
      var filter_data = false;
      var curr_filter = this.currentFilter ? JSON.stringify(this.currentFilter) : JSON.stringify({});
      if (Object.keys(query).length > 0 && Object.keys(query).includes('filter')) {
        // TODO: temporary check for if filter hasn't changed: make more robust
        if (curr_filter !== JSON.stringify(query['filter'])) {
          filter_data = true;
          this.currentFilter = JSON.parse(JSON.stringify(query['filter'])); // make deep copy
        }
      }
      return filter_data;
    },

    loadDataBackground: function (data, genome_ids) {
      console.log('window worker');
      var def = new Deferred();
      var worker = new window.Worker('/public/worker/PathwayServiceWorker.js', { type: 'module' });
      worker.onerror = (err) => console.log(err);
      worker.onmessage = lang.hitch(this, function (e) {
        // console.log('return message', e);
        // do something with data
        this.setData(e.data.data); // e.data contains { type, data }
        this.currentData = this.data;
        def.resolve(true);
        worker.terminate();
      });
      // var payload = { data: data, genome_ids: genome_ids, primaryKey: this.primaryKey };
      var payload = { data: data, primaryKey: this.primaryKey };
      worker.postMessage(JSON.stringify({ type: 'parse_data_v2', payload: payload }));
      return def;
    },

    filterData: function (data) {
      var query_filter = this.currentFilter;
      var keyword_filter = query_filter['fwks'];
      var facet_filter = query_filter['facets'];
      // Facets looks like this:
      // - {'annotation':['PATRIC'],'pathway_class':['Carbohydrate Metabolism','Lipid Mtabolism'],etc}
      var filtered_data = data;
      if (facet_filter) {
        Object.keys(facet_filter).forEach(lang.hitch(this, function (cat) {
          var ff_list = facet_filter[cat];
          filtered_data = filtered_data.filter(function (el) {
            return ff_list.includes(el[cat]);
          });
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
      return filtered_data
    },

    // query and filter must be defined or it all breaks
    // Currently, we do not have a genome fitler so changed_genome_ids should always be false
    // will need to rework a bit for a genome_filter to apply
    // TODO: rework and apply service worker
    query: function (query, opts) {
      // debugger;
      if (query === '') { // don't remove
        query = {};
      }
      console.log('query = ', query);
      console.log('opts = ', opts);
      // Get data counts by genome_id
      // Call this block when changing genome_ids or removing filters

      var data = null;
      // var changed_genome_ids = false;
      var filter_data = this.checkChangeFilter(query);
      if (filter_data) { // reset to initial data for adding/subtracting filters
        data = this.data;
      }
      else {
        data = this.currentData;
      }
      /*
      else if (Object.keys(query).length > 0 && Object.keys(query).includes('genome_ids')) { // reparse data with different genome_ids
        console.log('changed genome ids');
        var genome_ids = query['genome_ids'];
        this.data = this.parseData(this.state.data['pathway'], genome_ids);
        data = this.data;
        changed_genome_ids = true;
      }
      */

      // Apply Filters
      // TODO: adjust for changed_genome_ids
      if (filter_data) {
        data = this.filterData(data);
      }
      // Sort Data
      if (opts && opts.sort) {
        var sort_field = opts.sort[0].attribute;
        if (opts.sort[0].descending) {
          data = data.sort((a, b) => (a[sort_field] < b[sort_field]) ? 1 : -1);
        } else {
          data = data.sort((a, b) => (a[sort_field] > b[sort_field]) ? 1 : -1);
        }
      }
      this.currentData = data;
      var total_length = data.length;
      var start = 0;
      var count = 200;
      if (opts && opts.start) {
        start = opts.start;
      }
      if (opts && opts.count) {
        count = opts.count;
      } var query_data = null;
      if (opts && opts.selectAll) {
        query_data = data.slice(start).concat(data.slice(0, start));
      }
      else {
        query_data = data.slice(start, start + count);
      }
      query_data = QueryResults(data);
      query_data.total = total_length;
      return query_data;
    },

    filter: function (filter) {
      return this.inherited(arguments);
    }
  });
});
