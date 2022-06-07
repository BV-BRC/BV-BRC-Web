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
      if (this.type === 'subsystems') {
        if (!this._loaded) {
          this.setData([]);
          this.loadSubsystemsData().then(lang.hitch(this, function (res) {
            // this.state.data['parsed_subsystem_table'] = parsedData;
            this._loaded = true;
            this.setData(this.state.data['parsed_subsystem_table']);
            Topic.publish(this.topicId, 'refreshGrid');
          }));
        }
      } else if (this.type === 'genes') {
        if (!this._loaded) {
          this.setData(this.state.data['genes_table']);
          this._loaded = true;
          Topic.publish(this.topicId, 'refreshGrid');
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
      // TODO: insert condition filter
      var total_length = this.data.length;
      var data;
      if (this.type === 'subsystems') {
        data = this.state.data['parsed_subsystem_table'];
      }
      if (this.type === 'genes') {
        data = this.state.data['genes_table'];
      }
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
          }
          def.resolve(true);
          worker.terminate();
        });
        // TODO: add genome filter
        var payload = { data: this.state.data['subsystem_table'] };
        worker.postMessage(JSON.stringify({ type: 'parse_subsystems', payload: payload }));
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
    }
  });
});
