define([
  'dojo/_base/declare', 'dojo/on',
  'dojo/store/Memory',
  './PageGrid', './GridSelector'
], function (
  declare, on,
  Memory,
  Grid, selector
) {

  // Module-level promise cache: "rank:name" -> Promise<taxon_id|null>
  // One HTTP request per unique (rank, name) pair across the whole session.
  var _taxonIdCache = {};

  function lookupTaxonId(rank, name) {
    var key = rank + ':' + name;
    if (!(key in _taxonIdCache)) {
      var base = (window.App && window.App.dataAPI) || 'https://www.bv-brc.org/api/';
      if (base[base.length - 1] !== '/') { base += '/'; }
      var url = base + 'taxonomy/?eq(taxon_rank,' + rank + ')' +
                '&eq(taxon_name,' + encodeURIComponent(name) + ')' +
                '&select(taxon_id)';
      _taxonIdCache[key] = fetch(url, { headers: { accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          return (data && data.length > 0) ? String(data[0].taxon_id) : null;
        })
        .catch(function () { return null; });
    }
    return _taxonIdCache[key];
  }

  var TAXON_RANK_HEADERS = ['order', 'family', 'genus', 'species'];
  var HIDDEN_COLUMNS = ['genbank accession'];

  return declare([Grid], {
    region: 'center',
    query: '',
    primaryKey: 'RowNumber',
    deselectOnRefresh: true,
    store: null,
    columns: {},

    constructor: function () {
      this.store = new Memory({
        idProperty: this.primaryKey,
        data: []
      });
    },

    _priorityFieldKey: null,
    _speciesFieldKey: null,

    renderRow: function (item, options) {
      var row = this.inherited(arguments);
      if (this._priorityFieldKey) {
        var val = (item[this._priorityFieldKey] || '').trim().toLowerCase();
        if (val.indexOf('high') === 0) {
          row.style.backgroundColor = '#fde8e8';
        }
      }
      return row;
    },

    // Overridable hook for subclasses to decorate a column definition
    // (e.g. add a renderCell). No-op by default.
    _postProcessColumn: function (/* colDef, rank, header, key */) {},

    setGridData: function (headers, dataRows) {
      var cols = {};
      var mappedRows = [];
      this._priorityFieldKey = null;
      this._speciesFieldKey = null;

      headers.forEach(function (header, idx) {
        var key = 'col_' + idx;
        var rank = header.trim().toLowerCase();

        if (rank === 'bv-brc priority') {
          this._priorityFieldKey = key;
        }
        if (rank === 'species') {
          this._speciesFieldKey = key;
        }
        var colDef = {
          label: header,
          field: key,
          hidden: HIDDEN_COLUMNS.indexOf(rank) > -1
        };

        if (rank === 'bv-brc genome') {
          colDef.renderCell = function (object, value) {
            var wrapper = document.createElement('span');
            wrapper.style.display = 'inline-block';
            wrapper.style.minWidth = '135px';

            if (!value || !value.trim()) {
              return wrapper;
            }

            // Values can be a plain ID, or one or more labeled entries:
            //   "83332.12"
            //   "Seg1: 83332.12; Seg2: 67890.2"
            //   "RNA1: 83332.12;RNA2: 67890.2"
            var parts = value.split(';');

            var makeLink = function (id) {
              var a = document.createElement('a');
              a.href = 'https://www.bv-brc.org/view/Genome/' + id;
              a.textContent = id;
              a.title = id;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              return a;
            };

            // Single plain ID (no colon, no semicolons)
            if (parts.length === 1 && value.indexOf(':') === -1) {
              wrapper.appendChild(makeLink(value.trim()));
              return wrapper;
            }

            // One or more entries, possibly labeled ("Label: id")
            wrapper.title = value.trim();
            parts.forEach(function (part, i) {
              part = part.trim();
              if (!part) { return; }

              if (i > 0) {
                wrapper.appendChild(document.createTextNode('; '));
              }

              var colonIdx = part.indexOf(':');
              if (colonIdx > -1) {
                var label = part.substring(0, colonIdx).trim();
                var id = part.substring(colonIdx + 1).trim();
                wrapper.appendChild(document.createTextNode(label + ': '));
                wrapper.appendChild(makeLink(id));
              } else {
                wrapper.appendChild(makeLink(part));
              }
            });
            return wrapper;
          };

        } else if (TAXON_RANK_HEADERS.indexOf(rank) > -1) {
          if (rank === 'species') {
            colDef.width = 145;
          }
          colDef.renderCell = (function (r) {
            return function (object, value) {
              if (!value || !value.trim()) {
                return document.createTextNode('');
              }
              var name = value.trim();
              var node = document.createElement('span');
              node.textContent = name;
              node.title = name;

              lookupTaxonId(r, name).then(function (taxonId) {
                if (!taxonId || !node.parentNode) { return; }
                var a = document.createElement('a');
                a.href = 'https://www.bv-brc.org/view/Taxonomy/' + taxonId;
                a.textContent = name;
                a.title = name;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                node.parentNode.replaceChild(a, node);
              });

              return node;
            };
          }(rank));

        } else if (rank === 'virus') {
          // Truncate long virus names; show full text as tooltip
          colDef.style = 'max-width:220px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;';
          colDef.renderCell = function (object, value) {
            var text = value || '';
            var span = document.createElement('span');
            span.textContent = text;
            span.title = text;
            span.style.cssText = 'display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;';
            return span;
          };

        } else {
          // Default: show full value as tooltip for any column that may truncate
          colDef.renderCell = function (object, value) {
            var text = value || '';
            var span = document.createElement('span');
            span.textContent = text;
            if (text) { span.title = text; }
            return span;
          };
        }

        this._postProcessColumn(colDef, rank, header, key);
        cols[key] = colDef;
      }, this);

      dataRows.forEach(function (row, rowIdx) {
        var out = { RowNumber: rowIdx + 1 };
        headers.forEach(function (_, idx) {
          out['col_' + idx] = row[idx] || '';
        });
        mappedRows.push(out);
      });

      this.set('columns', cols);
      this.store.setData(mappedRows);
      if (this._speciesFieldKey) {
        this.set('sort', [{ attribute: this._speciesFieldKey, descending: false }]);
      } else {
        this.refresh();
      }
    },

    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row && row.data && row.data.path,
          item: row && row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
        on.emit(_self.domNode, 'select', {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-deselect', function (evt) {
        on.emit(_self.domNode, 'deselect', {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        });
      });

      this.inherited(arguments);
      this.refresh();
    }
  });
});
