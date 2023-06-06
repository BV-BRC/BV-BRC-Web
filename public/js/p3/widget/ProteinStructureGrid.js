define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/ProteinStructureJsonRest', './GridSelector'
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
    dataModel: 'protein_structure',
    primaryKey: 'pdb_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      pdb_id: { label: 'PDB ID', field: 'pdb_id', hidden: false },
      title: { label: 'Title', field: 'title', hidden: false },

      organism_name: { label: 'Organism Name', field: 'organism_name', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      taxon_lineage_ids: { label: 'Taxon Lineage IDs', field: 'taxon_lineage_ids', hidden: true },
      taxon_lineage_names: { label: 'Taxon Lineage Names', field: 'taxon_lineage_names', hidden: true },

      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },
      uniprotkb_accession: { label: 'UniProtKB Accession', field: 'uniprotkb_accession', hidden: false },
      gene: { label: 'Gene', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },
      sequence_md5: { label: 'Sequence MD5', field: 'sequence_md5', hidden: true },
      sequence: { label: 'Sequence', field: 'sequence', hidden: true },


      alignments: { label: 'Alignments', field: 'alignments', hidden: true },

      method: { label: 'Method', field: 'method', hidden: false },
      resolution: { label: 'Resolution', field: 'resolution', hidden: true },
      pmid: { label: 'PMID', field: 'pmid', hidden: true },
      institution: { label: 'Institution', field: 'institution', hidden: true },
      authors: { label: 'Authors', field: 'authors', hidden: true },
      release_date: { label: 'Release Date', field: 'release_date', hidden: false },
      file_path: { label: 'File Path', field: 'file_path', hidden: true },
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
