define([
  'dojo/_base/declare', 'dgrid/OnDemandGrid', 'dgrid/tree', 'dojo/on', 'dgrid/Selection',
  '../store/TaxonomyJsonRest', 'dgrid/extensions/DijitRegistry', 'dojo/_base/lang', './GridSelector'

], function (
  declare, Grid, Tree, on, Selection,
  Store, DijitRegistryExt, lang, selector
) {
  return declare([Grid, DijitRegistryExt, Selection], {
    constructor: function () {
      this.queryOptions = {
        sort: [{ attribute: 'taxon_name', descending: false }]
      };
      // console.log("this.queryOptions: ", this.queryOptions);
    },
    store: new Store({}),
    columns: [
      selector({ unhidable: true }),
      Tree({
        label: 'Name',
        field: 'taxon_name',
        shouldExpand: function (row, level, prevExpanded) {
          // console.log("Should Expand? ", row, level, prevExpanded)
          return (prevExpanded || (level < 1));
        }
      }),
      { label: 'Rank', field: 'taxon_rank' },
      { label: 'Genomes', field: 'genomes', style: 'width:50px;' }
    ],
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
        console.log('CLICK TREE ITEM: ', row.data);
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
    }

  });
});
