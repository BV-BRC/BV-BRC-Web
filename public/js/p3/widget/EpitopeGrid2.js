define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/EpitopeJsonRest', './GridSelector'
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
    dataModel: 'epitope',
    primaryKey: 'epitope_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      epitope_id: { label: 'Epitope ID', field: 'epitope_id', hidden: false },
      epitope_type: { label: 'Epitope Type', field: 'epitope_type', hidden: false },
      epitope_sequence: { label: 'Epitope Sequence', field: 'epitope_sequence', hidden: false },

      organism: { label: 'Organism', field: 'organism', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },

      protein_name: { label: 'Protein Name', field: 'protein_name', hidden: false },
      protein_id: { label: 'Protein ID', field: 'protein_id', hidden: true },
      protein_accession: { label: 'Protein Accession', field: 'protein_accession', hidden: true },

      start: { label: 'Start', field: 'start', hidden: true },
      end: { label: 'End', field: 'end', hidden: true },
      host_name: { label: 'Host Name', field: 'host_name', hidden: true },
      total_assays: { label: 'Total Assays', field: 'total_assays', hidden: false },
      assay_results: { label: 'Assay Results', field: 'assay_results', hidden: true },

      bcell_assays: { label: 'Bcell Assays', field: 'bcell_assays', hidden: false },
      tcell_assays: { label: 'Tcell Assays', field: 'tcell_assays', hidden: false },
      mhc_assays: { label: 'MHC Assays', field: 'mhc_assays', hidden: false },

      comments: { label: 'Comments', field: 'comments', hidden: true },
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
