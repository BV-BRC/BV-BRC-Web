define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SpecialtyVFGeneJsonRest', './GridSelector'
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
    dataModel: 'sp_gene_ref',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      id: { label: 'ID', field: 'id', hidden: true },
      property: { label: 'Property', field: 'property', hidden: true },
      source: { label: 'Source', field: 'source', hidden: true },
      source_id: { label: 'Source ID', field: 'source_id', hidden: false },
      organism: { label: 'Organism', field: 'organism', hidden: false },
      gene_name: { label: 'Gene', field: 'gene_name', hidden: false },
      genus: { label: 'Genus', field: 'genus', hidden: true },
      species: { label: 'Species', field: 'species', hidden: true },
      locus_tag: { label: 'Locus Tag', field: 'locus_tag', hidden: false },
      gene_id: { label: 'Gene ID', field: 'gene_id', hidden: true },
      gi: { label: 'GI', field: 'gi', hidden: true },
      product: { label: 'Product', field: 'product', hidden: false },
      'function': { label: 'Function', field: 'function', hidden: true },
      classification: { label: 'Classification', field: 'classification', hidden: true },
      pmid: { label: 'Pubmed', field: 'pmid', hidden: false },
      assertion: { label: 'Assertion', field: 'assertion', hidden: true }
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
        console.log('selected', newEvt);
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
