define([
  'dojo/_base/declare', 'dojo/on',
  './PageGrid', './formatter', '../store/TaxonomyJsonRest', './GridSelector'
], function (
  declare, on,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    constructor: function () {
      this.queryOptions = {
        sort: [{ attribute: 'genomes', descending: true }]
      };
    },
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    dataModel: 'taxonomy',
    primaryKey: 'taxon_id',
    deselectOnRefresh: true,
    store: store,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: false },
      taxon_name: { label: 'Taxon Name', field: 'taxon_name', hidden: false },
      taxon_rank: { label: 'Taxon Rank', field: 'taxon_rank', hidden: false },
      other_names: { label: 'Other Names', field: 'other_names', hidden: false },
      genetic_code: { label: 'Genetic Code', field: 'genetic_code', hidden: false },
      parent_id: { label: 'Parent ID', field: 'parent_id', hidden: true },
      division: { label: 'Division', field: 'division', hidden: true },
      description: { label: 'Description', field: 'description', hidden: true },
      genomes: { label: 'Genomes', field: 'genomes', hidden: false },
    },

    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        // console.log("dblclick row:", row);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
        // console.log('after emit');
      });

      this.on('dgrid-select', function (evt) {
        // console.log('dgrid-select: ', evt);
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
        // console.log("dgrid-select");
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
