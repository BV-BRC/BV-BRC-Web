define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  'dojo/topic',
  './PageGrid', './formatter', '../store/ProteinFeaturesJsonRest', './GridSelector'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Topic,
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
      id: { label: 'ID', field: 'id', hidden: true },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: true },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },
      aa_sequence_md5: { label: 'AA Sequence MD5', field: 'aa_sequence_md5', hidden: true },
      gene: { label: 'Gene', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },
      interpro_id: { label: 'Interpro ID', field: 'interpro_id', hidden: true },
      interpro_description: { label: 'Interpro Description', field: 'interpro_description', hidden: true },
      feature_type: { label: 'Feature Type', field: 'feature_type', hidden: true },
      source: { label: 'Source', field: 'source', hidden: false },
      source_id: { label: 'Source ID', field: 'source_id', hidden: false },
      description: { label: 'Description', field: 'description', hidden: false },
      classification: { label: 'Classification', field: 'classification', hidden: true },
      score: { label: 'Score', field: 'score', hidden: true },
      e_value: { label: 'E Value', field: 'e_value', hidden: false },
      evidence: { label: 'Evidence', field: 'evidence', hidden: false },
      publication: { label: 'Publication', field: 'publication', hidden: true },
      start: { label: 'Start', field: 'start', hidden: true },
      end: { label: 'End', field: 'end', hidden: true },
      segments: { label: 'Segments', field: 'segments', hidden: true },
      length: { label: 'Length', field: 'length', hidden: true },
      sequence: { label: 'Sequence', field: 'sequence', hidden: true },
      comments: { label: 'Comments', field: 'comments', hidden: true }
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

      // Row hover event for domain visualization sync
      this.on('.dgrid-content .dgrid-row:mouseover', function (evt) {
        var row = _self.row(evt);
        if (row && row.data) {
          Topic.publish('/domainGrid/hover', {
            id: row.data.id,
            domain: row.data
          });
        }
      });

      // Row mouseout to clear hover
      this.on('.dgrid-content .dgrid-row:mouseout', function (evt) {
        Topic.publish('/domainGrid/hover', { id: null });
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

        // Publish selection to domain visualization
        var selectedIds = Object.keys(evt.grid.selection);
        Topic.publish('/domainGrid/select', { ids: selectedIds });
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

        // Publish updated selection to domain visualization
        var selectedIds = Object.keys(evt.grid.selection);
        Topic.publish('/domainGrid/select', { ids: selectedIds });
      });

      // Subscribe to visualization selection events to highlight rows in grid
      Topic.subscribe('/domainViewer/hover', function (data) {
        // Could add row highlighting here if needed
      });

      this.inherited(arguments);
      this.refresh();
    }
  });
});
