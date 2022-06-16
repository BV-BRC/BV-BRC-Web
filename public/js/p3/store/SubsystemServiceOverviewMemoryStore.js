define([
  'dojo/_base/declare',
  'dojo/request',
  'dojo/store/Memory',
  'dojo/store/util/QueryResults',
  'dojo/when', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/Stateful',
  '../util/PathJoin', './SubsystemsOverviewMemoryStore'
], function (
  declare,
  request,
  Memory,
  QueryResults,
  when, lang,
  Deferred, Stateful,
  PathJoin, querySubMemoryStore
) {
  return declare([Memory, Stateful, querySubMemoryStore], {
    idProperty: 'id',
    state: null,
    genome_ids: null,
    type: 'subsystem',
    overview_data: null,

    // TODO: load data into store while this._loaded = false
    onSetState: function (attr, oldVal, state) {
      console.log('on set state');
      if (!this._loaded && this.state) {
        this.loadData();
        this._loaded = true;
      }
    },

    query: function (query, opts) {
      console.log('query');
      // debugger;
      if (this.data) {
        return QueryResults(this.data);
      }
      else {
        return null;
      }
    },

    loadData: function () {
      console.log('loadData');
      var data = this.state.data.overview;
      var parsed_data = [];
      var value_dict = {};
      Object.keys(data).forEach(lang.hitch(this, function (genome_id) {
        var genome_data = data[genome_id];
        Object.keys(genome_data).forEach(lang.hitch(this, function (superclass) {
          if (superclass === 'superclass_counts' || superclass === 'gene_counts') {
            return;
          }
          var superclass_dict;
          var superclass_data = genome_data[superclass];
          if (value_dict.hasOwnProperty(superclass)) {
            superclass_dict = parsed_data.find(entry => entry.name === superclass);
            superclass_dict['gene_count'] += parseInt(superclass_data['gene_counts']);
            superclass_dict['subsystem_count'] += parseInt(superclass_data['class_counts']);
          } else {
            var new_superclass = {};
            new_superclass['name'] = superclass;
            new_superclass['gene_count'] = parseInt(superclass_data['gene_counts']);
            new_superclass['subsystem_count'] = parseInt(superclass_data['class_counts']);
            // new_superclass['class'] = {};
            new_superclass['children'] = [];
            parsed_data.push(new_superclass);
            value_dict[superclass] = {};
            superclass_dict = new_superclass;
          }
          Object.keys(superclass_data).forEach(lang.hitch(this, function (clss) {
            if (clss === 'class_counts' || clss === 'gene_counts') {
              return;
            }
            var class_dict;
            var class_data = superclass_data[clss];
            if (value_dict[superclass].hasOwnProperty(clss)) { // if superclass is new then it should not have this class
              class_dict = superclass_dict['children'].find(entry => entry.name === clss);
              class_dict['gene_count'] += class_data['gene_counts'];
              class_dict['subsystem_count'] += class_data['subclass_counts'];
            } else {
              var new_class = {};
              new_class['name'] = clss;
              new_class['gene_count'] = class_data['gene_counts'];
              new_class['subsystem_count'] = class_data['subclass_counts'];
              // new_class['subclass'] = {};
              new_class['children'] = [];
              superclass_dict['children'].push(new_class);
              value_dict[superclass][clss] = {};
              class_dict = new_class;
            }
            Object.keys(class_data).forEach(lang.hitch(this, function (subclass) {
              if (subclass === 'subclass_counts' || subclass === 'gene_counts') {
                return;
              }
              var subclass_dict;
              var subclass_data = class_data[subclass];
              if (value_dict[superclass][clss].hasOwnProperty(subclass)) {
                subclass_dict = class_dict['children'].find(entry => entry.name === subclass);
                subclass_dict['gene_count'] += subclass_data['gene_counts'];
                subclass_dict['subsystem_count'] += subclass_data['subsystem_name_counts'];
              } else {
                var new_subclass = {};
                new_subclass['name'] = subclass;
                new_subclass['gene_count'] = subclass_data['gene_counts'];
                new_subclass['subsystem_count'] = subclass_data['subsystem_name_counts'];
                class_dict['children'].push(new_subclass);
                value_dict[superclass][clss][subclass] = class_data[subclass];
                subclass_dict = new_subclass;
              }
            }));
          }));
        }));
      }));

      this.setData(parsed_data);
    }
  });
});
