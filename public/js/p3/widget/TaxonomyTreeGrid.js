define([
  'dojo/_base/declare', 'dgrid/OnDemandGrid', 'dgrid/tree', 'dojo/on', 'dgrid/Selection',
  '../store/TaxonomyJsonRest', 'dgrid/extensions/DijitRegistry', 'dojo/_base/lang', './GridSelector',
  'dojo/dom-construct', 'dojo/dom-class', 'dojo/query'

], function (
  declare, Grid, Tree, on, Selection,
  Store, DijitRegistryExt, lang, selector,
  domConstruct, domClass, query
) {
  return declare([Grid, DijitRegistryExt, Selection], {
    _phyloManifest: null,
    _phyloTreeCount: null, // pre-computed map: taxon_id (string) → count of manifest families in subtree

    _setPhyloManifest: function (manifest) {
      if (this._phyloManifest === manifest) {
        return;
      }
      this._phyloManifest = manifest;
      if (this._started) {
        this._updateManifestCells();
      }
    },

    _setPhyloManifestData: function (data) {
      if (!this._phyloTreeCount) {
        // Pre-compute a count map: for each ancestor taxon ID, how many manifest families live under it.
        var treeCount = {};
        (data || []).forEach(function (f) {
          var lid = f.lineage_ids;
          if (!lid) {
            return;
          }
          lid.forEach(function (ancestorId) {
            var key = String(ancestorId);
            treeCount[key] = (treeCount[key] || 0) + 1;
          });
        });
        this._phyloTreeCount = treeCount;
      }

      if (this._started) {
        this._updateTreeCountCells();
      }
    },

    _createPhyloLink: function (taxonId, familyName, container) {
      domConstruct.create('a', {
        className: 'fa icon-tree2',
        href: '/view/Taxonomy/' + taxonId + '#view_tab=phylogenyVirus',
        title: 'View phylogenetic trees for ' + familyName,
        style: 'color:#2c7a7b; font-size:13px; text-decoration:none; display:inline-block; padding:2px 4px;'
      }, container);
    },

    // Patch cells for rows that have a direct tree in the manifest (called instead of refresh())
    _updateManifestCells: function () {
      var _self = this;
      var manifest = this._phyloManifest;
      if (!manifest) {
        return;
      }

      var rows = query('.dgrid-row', this.domNode);

      rows.forEach(function (rowNode) {
        var rowObj = _self.row(rowNode);
        if (!rowObj || !rowObj.data) {
          return;
        }

        var sid = String(rowObj.data.taxon_id);
        if (!manifest.hasOwnProperty(sid)) {
          return;
        }

        var cell = query('.field-phylo_trees', rowNode)[0];
        if (!cell || cell.querySelector('a.fa')) {
          return; // already rendered
        }

        _self._createPhyloLink(sid, manifest[sid] || 'Phylogeny', cell);
        domClass.add(rowNode, 'has-phylo');
      });
    },

    // Update cells that were already rendered before manifestData arrived
    _updateTreeCountCells: function () {
      var _self = this;
      var treeCount = this._phyloTreeCount;
      var manifest = this._phyloManifest;
      if (!treeCount) {
        return;
      }

      var rows = query('.dgrid-row', this.domNode);

      rows.forEach(function (rowNode) {
        var rowObj = _self.row(rowNode);
        if (!rowObj || !rowObj.data) {
          return;
        }

        var taxonId = rowObj.data.taxon_id;
        var sid = String(taxonId);

        // Skip rows that already have a direct tree icon
        if (manifest && manifest.hasOwnProperty(sid)) {
          return;
        }

        var cell = query('.field-phylo_trees', rowNode)[0];
        if (!cell) {
          return;
        }

        var count = treeCount[sid] || 0;
        cell.textContent = count > 0 ? String(count) : '';
        if (count > 0) {
          cell.title = count + ' famil' + (count === 1 ? 'y has' : 'ies have') + ' phylogenetic trees in this group';
          domClass.add(rowNode, 'has-phylo');
        }
      });
    },

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
          // Expand the whole tree at once when search is active
          if (this.grid && this.grid._searchExpandAll) { return true; }
          return (prevExpanded || (level < 1));
        }
      }),
      { label: 'Rank', field: 'taxon_rank' },
      { label: 'Genomes', field: 'genomes', style: 'width:50px;' },
      {
        label: 'Trees',
        field: 'phylo_trees',
        get: function (item) {
          return item.taxon_id;
        },
        sortable: false,
        renderCell: function (item, value, td) {
          var grid = this.grid;
          var manifest = grid && grid._phyloManifest;
          var treeCount = grid && grid._phyloTreeCount;
          if (!manifest) {
            return;
          }

          var sid = String(value);
          var shouldMark = false;

          if (manifest.hasOwnProperty(sid)) {
            // Direct phylogenetic tree — show clickable icon
            grid._createPhyloLink(value, manifest[sid] || 'Phylogeny', td);
            shouldMark = true;
          } else if (treeCount) {
            var count = treeCount[sid] || 0;
            if (count > 0) {
              td.textContent = String(count);
              td.title = count + ' famil' + (count === 1 ? 'y has' : 'ies have') + ' phylogenetic trees in this group';
              shouldMark = true;
            }
          }

          // td.parentNode is null at renderCell time (dgrid appends td to tr *after*
          // the callback returns), so defer the row marking until the row is in the DOM.
          if (shouldMark) {
            var taxonId = item.taxon_id;
            setTimeout(function () {
              var rowObj = grid.row(taxonId);
              if (rowObj && rowObj.element) {
                domClass.add(rowObj.element, 'has-phylo');
              }
            }, 0);
          }
        }
      }
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
