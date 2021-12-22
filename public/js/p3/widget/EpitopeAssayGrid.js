define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/EpitopeAssayJsonRest', './GridSelector'
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
    dataModel: 'epitope_assay',
    primaryKey: 'epitope_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      assay_id: { label: 'Assay ID', field: 'assay_id', hidden: false },
      assay_type: { label: 'Assay Type', field: 'assay_type', hidden: false },

      // epitope_id: { label: 'Epitope ID', field: 'epitope_id', hidden: true },
      // epitope_type: { label: 'Epitope Type', field: 'epitope_type', hidden: true },
      // epitope_sequence: { label: 'Epitope Sequence', field: 'epitope_sequence', hidden: true },

      // organism: { label: 'Organism', field: 'organism', hidden: true },
      // taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      // taxon_lineage_ids: { label: 'Taxon Lineage IDs', field: 'taxon_lineage_ids', hidden: true },
      // taxon_lineage_names: { label: 'Taxon Lineage Names', field: 'taxon_lineage_names', hidden: true },

      // protein_name: { label: 'Protein Name', field: 'protein_name', hidden: true },
      // protein_id: { label: 'Protein ID', field: 'protein_id', hidden: true },
      // protein_accession: { label: 'Protein Accession', field: 'protein_accession', hidden: true },
      // pdb_id: { label: 'PDB ID', field: 'pdb_id', hidden: true },

      // start: { label: 'Start', field: 'start', hidden: true },
      // end: { label: 'End', field: 'end', hidden: true },

      host_name: { label: 'Host Name', field: 'host_name', hidden: false },
      host_taxon_id: { label: 'Host Taxon ID', field: 'host_taxon_id', hidden: true },

      assay_group: { label: 'Assay Group', field: 'assay_group', hidden: false },
      assay_method: { label: 'Assay Method', field: 'assay_method', hidden: false },
      assay_result: { label: 'Assay Result', field: 'assay_result', hidden: false },
      assay_measurement: { label: 'Assay Measurement', field: 'assay_measurement', hidden: false },
      assay_measurement_unit: { label: 'Assay Measurement Unit', field: 'assay_measurement_unit', hidden: false },
      mhc_allele: { label: 'MHC Allele', field: 'mhc_allele', hidden: false },
      mhc_allele_class: { label: 'MHC Allele Class', field: 'mhc_allele_class', hidden: false },

      pmid: { label: 'PMID', field: 'pmid', hidden: false },
      authors: { label: 'Authors', field: 'authors', hidden: true },
      title: { label: 'Title', field: 'title', hidden: true },
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
