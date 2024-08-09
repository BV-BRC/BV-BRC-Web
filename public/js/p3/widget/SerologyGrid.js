define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SerologyJsonRest', './GridSelector'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    store: store,
    dataModel: 'serology',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),

      project_identifier: { label: 'Project Identifier', field: 'project_identifier', hidden: true },
      contributing_institution: { label: 'Contributing Institution', field: 'contributing_institution', hidden: true },
      sample_identifier: { label: 'Sample Identifier', field: 'sample_identifier', hidden: false },

      host_identifier: { label: 'Host Identifier', field: 'host_identifier', hidden: false },
      host_type: { label: 'Host Type', field: 'host_type', hidden: false },
      host_species: { label: 'Host Species', field: 'host_species', hidden: false },
      host_common_name: { label: 'Host Common Name', field: 'host_common_name', hidden: false },
      host_sex: { label: 'Host Sex', field: 'host_sex', hidden: false },
      host_age: { label: 'Host Age', field: 'host_age', hidden: false },
      host_age_group: { label: 'Host Age Group', field: 'host_age_group', hidden: false },
      host_health: { label: 'Host Health', field: 'host_health', hidden: false },

      collection_country: { label: 'Collection Country', field: 'collection_country', hidden: true },
      collection_state: { label: 'Collection State', field: 'collection_state', hidden: true },
      collection_city: { label: 'Collection City', field: 'collection_city', hidden: true },
      collection_date: { label: 'Collection Date', field: 'collection_date', hidden: false },
      collection_year: { label: 'Collection Year', field: 'collection_year', hidden: true },
      geographic_group: { label: 'Geographic Group', field: 'geographic_group', hidden: true },

      test_type: { label: 'Test Type', field: 'test_type', hidden: false },
      test_result: { label: 'Test Result', field: 'test_result', hidden: false },
      test_interpretation: { label: 'Test Interpretation', field: 'test_interpretation', hidden: false },
      serotype: { label: 'Serotype', field: 'serotype', hidden: false },

      comments: { label: 'Comments', field: 'comments', hidden: true },
      date_inserted: { label: 'Date Inserted', field: 'date_inserted', hidden: true },
      date_updated: { label: 'Date Updated', field: 'date_updated', hidden: true },
    },
    startup: function () {
      var _self = this;
      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
        console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.on('dgrid-deselect', function (evt) {
        console.log('dgrid-select');
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.inherited(arguments);
      this.refresh();
    }
  });
});
