define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SpecialtyGeneJsonRest', './GridSelector'
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
    dataModel: 'sp_gene',
    primaryKey: 'id',
    deselectOnRefresh: true,
    selectAllFields: ['patric_id', 'genome_id', 'feature_id'],
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      evidence: { label: 'Evidence', field: 'evidence', hidden: false },
      property: { label: 'Property', field: 'property', hidden: false },
      source: { label: 'Source', field: 'source', hidden: false },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      source_id: { label: 'Source ID', field: 'source_id', hidden: false },
      source_org: { label: 'Source Organism', field: 'organism', hidden: true },
      gene: { label: 'Gene', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },
      'function': { label: 'Function', field: 'function', hidden: true },
      classification: {
        label: 'Classification', field: 'classification', sortable: false, hidden: true
      },
      antibiotics_class: { label: 'Antibiotics Class', field: 'antibiotics_class', hidden: true },
      antibiotics: {
        label: 'Antibiotics', field: 'antibiotics', sortable: false, hidden: true
      },
      pubmed: {
        label: 'Pubmed', field: 'pmid', sortable: false, hidden: false
      },
      subj_coverage: { label: 'Subject Coverage', field: 'subject_coverage', hidden: true },
      query_coverage: { label: 'Query Coverage', field: 'query_coverage', hidden: true },
      identity: { label: 'Identity', field: 'identity', hidden: false },
      evalue: { label: 'E-value', field: 'e_value', hidden: false }
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

      if (query.match(/eq\(property,%22Antibiotic%20Resistance%22\)/)) {
        _self.toggleColumnHiddenState('property', true);
      } else {
        _self.toggleColumnHiddenState('property', false);
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
