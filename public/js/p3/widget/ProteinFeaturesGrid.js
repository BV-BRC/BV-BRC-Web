define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/ProteinFeaturesJsonRest', './GridSelector'
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
    dataModel: 'protein_feature',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      id: { label: 'ID', field: 'id', hidden: false },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: false },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: false },
      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: false },
      patric_id: { label: 'Patric ID', field: 'patric_id', hidden: false },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },
      aa_sequence_md5: { label: 'AA Sequence MD5', field: 'aa_sequence_md5', hidden: false },
      gene: { label: 'Gene', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },
      interpro_id: { label: 'Interpro ID', field: 'interpro_id', hidden: false },
      interpro_description: { label: 'Interpro Description', field: 'interpro_description', hidden: false },
      feature_type: { label: 'Feature Type', field: 'feature_type', hidden: false },
      source: { label: 'Source', field: 'source', hidden: false },
      source_id: { label: 'Source ID', field: 'source_id', hidden: false },
      description: { label: 'Description', field: 'description', hidden: false },
      classification: { label: 'Classification', field: 'classification', hidden: false },
      score: { label: 'Score', field: 'score', hidden: false },
      e_value: { label: 'E Value', field: 'e_value', hidden: false },
      evidence: { label: 'Evidence', field: 'evidence', hidden: false },
      publication: { label: 'Publication', field: 'publication', hidden: false },
      start: { label: 'Start', field: 'start', hidden: false },
      end: { label: 'End', field: 'end', hidden: false },
      segments: { label: 'Segments', field: 'segments', hidden: false },
      length: { label: 'Length', field: 'length', hidden: false },
      sequence: { label: 'Sequence', field: 'sequence', hidden: false },
      comments: { label: 'Comments', field: 'comments', hidden: false },
      text: { label: 'Text', field: 'text', hidden: true },
      _version_: { label: 'Version', field: '_version_', hidden: true },
      date_inserted: { label: 'Date Inserted', field: 'date_inserted', hidden: true },
      date_modified: { label: 'Date Modified', field: 'date_modfied', hidden: true },


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