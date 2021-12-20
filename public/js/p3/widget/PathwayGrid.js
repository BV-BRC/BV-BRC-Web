define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/PathwayJsonRest', './GridSelector'
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
    dataModel: 'pathway',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },

      sequence_id: { label: 'Sequence ID', field: 'sequence_id', hidden: true },
      accession: { label: 'Accession', field: 'accession', hidden: true },

      annotation: { label: 'Annotation', field: 'annotation', hidden: true },

      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },

      gene: { label: 'Gene', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },

      ec_number: { label: 'EC Number', field: 'ec_number', hidden: false },
      ec_description: { label: 'EC Description', field: 'ec_description', hidden: false },

      pathway_id: { label: 'Pathway ID', field: 'pathway_id', hidden: false },
      pathway_name: { label: 'Pathway Name', field: 'pathway_name', hidden: false },
      pathway_class: { label: 'Pathway Class', field: 'pathway_class', hidden: true },
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
