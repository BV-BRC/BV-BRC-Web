define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SurveillanceJsonRest', './GridSelector'
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
    dataModel: 'surveillance',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      id: { label: 'ID', field: 'id', hidden: true },

      collection: { label: 'Collection', field: 'collection', hidden: true },

      collector_name: { label: 'Collector Name', field: 'collector_name', hidden: true },
      collector_institution: { label: 'Collector Institution', field: 'collector_insitution', hidden: true },
      collection_date: { label: 'Collection Date', field: 'collection_date', hidden: true },
      receipt_date: { label: 'Receipt Date', field: 'receipt_date', hidden: true },
      rationale: { label: 'Rationale', field: 'rationale', hidden: true },

      city: { label: 'City', field: 'city', hidden: true },
      state: { label: 'State', field: 'state', hidden: true },
      country: { label: 'Country', field: 'country', hidden: true },
      latitude: { label: 'Latitude', field: 'latitude', hidden: true },
      longitude: { label: 'Longitude', field: 'longitude', hidden: true },

      host_identifier: { label: 'Host Identifier', field: 'host_identifier', hidden: true },
      common_name: { label: 'Common Name', field: 'common_name', hidden: true },
      scientific_name: { label: 'Scientific Name', field: 'scientific_name', hidden: true },
      order: { label: 'Order', field: 'order', hidden: true },
      family: { label: 'Family', field: 'family', hidden: true },
      age_class: { label: 'Age Class', field: 'age_class', hidden: true },
      age: { label: 'Age', field: 'age', hidden: true },
      sex: { label: 'Sex', field: 'sex', hidden: true },
      health: { label: 'Health', field: 'health', hidden: true },
      temperature: { label: 'Temperature', field: 'temperature', hidden: true },
      fever: { label: 'Fever', field: 'fever', hidden: true },
      symptoms: { label: 'Symptoms', field: 'symptoms', hidden: true },
      diagnosis: { label: 'Diagnosis', field: 'diagnosis', hidden: true },
      behavior: { label: 'Behavior', field: 'behavior', hidden: true },
      post_visit_medications: { label: 'Post Visit Medications', field: 'post_visit_medications', hidden: true },

      sample_id: { label: 'Sample ID', field: 'sample_id', hidden: true },
      sample_accession: { label: 'Sample Accession', field: 'sample_accession', hidden: true },
      sample_source: { label: 'Sample Source', field: 'sample_source', hidden: true },
      test_type: { label: 'Test Type', field: 'test_type', hidden: true },
      test_results: { label: 'Test Results', field: 'test_results', hidden: true },
      positive_flu: { label: 'Positive Flu', field: 'positive_flu', hidden: true },
      serotype: { label: 'Serotype', field: 'serotype', hidden: true },
      sero_positive_definition: { label: 'Sero Positive Definition', field: 'sero_positive_definition', hidden: true },

      virus_type: { label: 'Virus Type', field: 'virus_type', hidden: true },
      virus_subtype: { label: 'Virus Subtype', field: 'virus_subtype', hidden: true },
      virus_strain: { label: 'Virus Strain', field: 'virus_strain', hidden: true },
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
