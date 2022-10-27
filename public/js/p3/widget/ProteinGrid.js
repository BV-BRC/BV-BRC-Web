define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/GenomeFeatureJsonRest', './GridSelector'
], function (
  declare, lang, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    constructor: function () {
      this.queryOptions = {
        // sort: [{attribute: "score", descending: true}]

        sort: [{ attribute: 'genome_name', descending: false },
          { attribute: 'accession', descending: false },
          { attribute: 'start', descending: false }]
      };
      // console.log("this.queryOptions: ", this.queryOptions);
    },
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    dataModel: 'genome_feature',
    primaryKey: 'feature_id',
    deselectOnRefresh: true,
    selectAllFields: ['patric_id', 'genome_id', 'genome_name', 'refseq_locus_tag'],
    store: store,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: false },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },

      sequence_id: { label: 'Sequence ID', field: 'sequence_id', hidden: true },
      accession: { label: 'Accession', field: 'accession', hidden: false },

      annotation: { label: 'Annotation', field: 'annotation', hidden: true },
      feature_type: { label: 'Feature Type', field: 'feature_type', hidden: false },

      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },
      // brc_id: { label: 'BRC ID', field: 'brc_id', hidden: true },

      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },

      protein_id: { label: 'Protein ID', field: 'protein_id', hidden: false },
      gene_id: { label: 'Gene ID', field: 'gene_id', hidden: true },
      uniprotkb_accession: { label: 'UniProtKB Accession', field: 'uniprotkb_accession', hidden: true },
      pdb_accession: { label: 'PDB Accession', field: 'pdb_accession', hidden: true },

      start: { label: 'Start', field: 'start', hidden: true },
      end: { label: 'End', field: 'end', hidden: true },
      strand: { label: 'Strand', field: 'strand', hidden: true },
      location: { label: 'Location', field: 'location', hidden: true },
      segments: { label: 'Segments', field: 'segments', hidden: true },
      codon_start: { label: 'Codon Start', field: 'Codon Start', hidden: true },

      na_length: { label: 'Length (NA)', field: 'na_length', hidden: true },
      aa_length: { label: 'Length (AA)', field: 'aa_length', hidden: false },
      na_sequence_md5: { label: 'NA Sequence MD5', field: 'na_sequence_md5', hidden: true },
      aa_sequence_md5: { label: 'AA Sequence MD5', field: 'aa_sequence_md5', hidden: true },

      gene: { label: 'Gene Symbol', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },

      plfam_id: { label: 'PATRIC Local Family', field: 'plfam_id', hidden: true },
      pgfam_id: { label: 'PATRIC Global Family', field: 'pgfam_id', hidden: true },
      sog_id: { label: 'SOG ID', field: 'sog_id', hidden: true },
      og_id: { label: 'OG ID', field: 'og_id', hidden: true },
      go: {
        label: 'GO Terms', field: 'go', sortable: false, hidden: true
      },

      property: { label: 'Property', field: 'property', hidden: true },
      notes: { label: 'Notes', field: 'notes', hidden: true },

      classifier_score: { label: 'Classifier Score', field: 'classifier_score', hidden: true },
      classifier_round: { label: 'Classifier Round', field: 'classifier_round', hidden: true }
    },
    _setQuery: function (query) {
      this.inherited(arguments);
      this.updateColumnHiddenState(query);
    },
    updateColumnHiddenState: function (query) {
      // console.log("updateColumnHiddenState: ", query);
      if (this._updatedColumnHiddenState) {
        return;
      }
      var _self = this;
      if (!query) {
        return;
      }
      // console.log(query.match(/CDS/), query.match(/eq\(genome_id/))
      // show or hide columns based on CDS vs Non-CDS feature type
      if (query.match(/CDS/)) {
        // _self.toggleColumnHiddenState('plfam_id', false);
        // _self.toggleColumnHiddenState('pgfam_id', false);

        // _self.toggleColumnHiddenState('feature_type', true);
        // _self.toggleColumnHiddenState('start', true);
        // _self.toggleColumnHiddenState('end', true);
        // _self.toggleColumnHiddenState('strand', true);
      } else if (query.match(/eq\(feature_type,%22classifier_predicted_region%22\)/)) {
        _self.toggleColumnHiddenState('refseq_locus_tag', true);
        _self.toggleColumnHiddenState('gene', true);

        // _self.toggleColumnHiddenState('plfam_id', true);
        // _self.toggleColumnHiddenState('pgfam_id', true);

        // _self.toggleColumnHiddenState('feature_type', false);
        // _self.toggleColumnHiddenState('start', false);
        // _self.toggleColumnHiddenState('end', false);
        // _self.toggleColumnHiddenState('strand', false);

        _self.toggleColumnHiddenState('classifier_score', false);
        _self.toggleColumnHiddenState('classifier_round', false);
      } else {
        // _self.toggleColumnHiddenState('plfam_id', true);
        // _self.toggleColumnHiddenState('pgfam_id', true);

        // _self.toggleColumnHiddenState('feature_type', false);
        // _self.toggleColumnHiddenState('start', false);
        // _self.toggleColumnHiddenState('end', false);
        // _self.toggleColumnHiddenState('strand', false);
      }

      // hide genome_name and genome_id if feature list is rendered genome view
      if (query.match(/eq\(genome_id/)) {
        // _self.toggleColumnHiddenState('genome_name', true);
        _self.toggleColumnHiddenState('genome_id', true);
      } else {
        // _self.toggleColumnHiddenState('genome_name', false);
        _self.toggleColumnHiddenState('genome_id', false);
      }

      this._updatedColumnHiddenState = true;
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
