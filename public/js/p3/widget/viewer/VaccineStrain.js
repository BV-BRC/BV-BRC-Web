define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/request',
  'dojo/dom-construct', 'dijit/layout/ContentPane',
  './Base', '../VaccineStrainGrid'
], function (
  declare, lang, on, xhr,
  domConstruct, ContentPane,
  ViewerBase, VaccineStrainGrid
) {
  return declare([ViewerBase], {
    title: 'Influenza Vaccine Strains',
    gutters: false,
    design: 'headline',
    isLoaded: false,
    _loading: false,
    filtersCollapsed: false,
    _allHeaders: [],
    _allRows: [],

    // CSV source
    csvUrl: 'https://www.bv-brc.org/api/content/data/influenza_vaccine_strain_sequences.csv',
    downloadFileName: 'influenza_vaccine_strain_sequences.csv',

    // Columns rendered as facet dropdowns (add more here later).
    facetColumns: ['Flu Season', 'Hemisphere', 'Components', 'Subtype'],

    postCreate: function () {
      this.inherited(arguments);

      this._ensureToolbarStyles();

      this.headerPane = new ContentPane({
        region: 'top',
        splitter: false,
        style: 'padding: 0; border: none;',
        content: '<div class="vs-page-header">' +
          '<h2>Influenza Vaccine Strains</h2>' +
          /*'<p>Recommended influenza vaccine strains compositions by flu season, hemisphere, and subtype.</p>' +*/
          '</div>'
      });
      this.addChild(this.headerPane);

      this.toolbar = new ContentPane({
        region: 'left',
        splitter: false,
        style: 'width: 240px; min-width: 240px; max-width: 240px; padding: 0; border: none; background: transparent; overflow: visible;'
      });
      this.addChild(this.toolbar);
      this._buildFilterToolbar();

      this.grid = new VaccineStrainGrid({
        region: 'center',
        id: this.id + '_grid',
        style: 'padding: 10px 12px 12px 12px;'
      });
      this.addChild(this.grid);
    },

    _ensureToolbarStyles: function () {
      if (document.getElementById('vaccine-strain-toolbar-styles')) {
        return;
      }
      domConstruct.create('style', {
        id: 'vaccine-strain-toolbar-styles',
        innerHTML: [
          '.vs-page-header{padding:12px 16px;border-bottom:1px solid #e5e7eb;background:#fff;}',
          '.vs-page-header h2{margin:0;font-size:18px;font-weight:700;color:#2c3e50;}',
          '.vs-page-header p{margin:4px 0 0;font-size:12px;color:#6b7280;}',
          '.vs-panel-titlebar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px 6px 16px;border-bottom:1px solid #e5e7eb;margin-bottom:4px;}',
          '.vs-panel-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;}',
          '.vs-toggle-btn{height:24px;padding:0 10px;border-radius:4px;background:#fff;border:1px solid #d1d5db;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none;font-size:11px;font-weight:600;color:#6b7280;line-height:1;white-space:nowrap;}',
          '.vs-toggle-btn:hover{background:#eef2f7;border-color:#2c7a7b;color:#2c7a7b;}',
          '.vs-expand-strip{display:none;flex-shrink:0;width:28px;height:100%;min-height:100%;background:#f8fafb;border-right:1px solid #e5e7eb;box-sizing:border-box;align-items:flex-start;justify-content:center;padding-top:14px;cursor:pointer;}',
          '.vs-expand-strip:hover{background:#eef2f7;}',
          '.vs-expand-strip-icon{font-size:11px;font-weight:600;color:#6b7280;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);letter-spacing:.05em;user-select:none;pointer-events:none;}',
          '.vs-filter-panel{position:relative;flex-shrink:0;background:#f8fafb;border-right:1px solid #e5e7eb;box-sizing:border-box;align-self:stretch;width:240px;overflow:hidden;transition:width .2s ease;}',
          '.vs-filter-panel.vs-collapsed{width:0;border-right:none;}',
          '.vs-filter-inner{width:240px;padding:8px 0 14px;box-sizing:border-box;}',
          '.vs-section-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;cursor:pointer;user-select:none;width:100%;box-sizing:border-box;background:transparent;}',
          '.vs-section-header:hover{background:#eef2f7;}',
          '.vs-section-header:hover .vs-chevron{color:#2c7a7b;}',
          '.vs-section-heading{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;pointer-events:none;}',
          '.vs-chevron{font-size:9px;color:#9ca3af;transition:transform .15s;line-height:1;pointer-events:none;}',
          '.vs-chevron.vs-chevron-closed{transform:rotate(-90deg);}',
          '.vs-section-body{overflow:hidden;transition:max-height .2s ease;max-height:600px;}',
          '.vs-section-body.vs-section-hidden{max-height:0;}',
          '.vs-divider{margin:12px 16px;border:none;border-top:1px solid #e5e7eb;}',
          '.vs-field{display:flex;flex-direction:column;gap:4px;padding:4px 16px;}',
          '.vs-label{font-size:11px;font-weight:600;color:#6b7280;}',
          '.vs-control{height:28px;padding:4px 8px;border:1px solid #d1d5db;border-radius:3px;background:#fff;width:100%;box-sizing:border-box;font-size:12px;color:#374151;}',
          '.vs-control:focus{outline:none;border-color:#2c7a7b;}',
          '.vs-control:disabled{background:#f3f6f9;color:#9ca3af;}',
          '.vs-actions{padding:8px 16px;display:flex;flex-direction:column;gap:8px;}',
          '.vs-reset-btn{height:30px;padding:0 12px;border-radius:3px;font-size:12px;font-weight:600;cursor:pointer;background:#fff;color:#2c7a7b;border:1px solid #d1d5db;width:100%;}',
          '.vs-reset-btn:hover{background:#eef2f7;border-color:#2c7a7b;}',
          '.vs-download-btn{height:30px;padding:0 12px;border-radius:3px;font-size:12px;font-weight:600;cursor:pointer;background:#2c7a7b;color:#fff;border:1px solid #2c7a7b;width:100%;}',
          '.vs-download-btn:hover{background:#235f60;}',
          '.vs-count{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;color:#6b7280;}',
          '.vs-count-badge{font-size:11px;font-weight:700;background:#2c7a7b;color:#fff;border-radius:10px;padding:1px 8px;}'
        ].join('')
      }, document.head);
    },

    _toggleFilters: function () {
      this.filtersCollapsed = !this.filtersCollapsed;
      if (this.filtersCollapsed) {
        this.filterPanelNode.className = 'vs-filter-panel vs-collapsed';
        this.expandStripNode.style.display = 'flex';
        this.toggleBtnNode.innerHTML = 'Show';
        this.toggleBtnNode.title = 'Show search panel';
        this.toolbar.set('style', 'width:28px;min-width:28px;max-width:28px;padding:0;border:none;background:transparent;overflow:visible;');
      } else {
        this.filterPanelNode.className = 'vs-filter-panel';
        this.expandStripNode.style.display = 'none';
        this.toggleBtnNode.innerHTML = 'Hide';
        this.toggleBtnNode.title = 'Hide search panel';
        this.toolbar.set('style', 'width:240px;min-width:240px;max-width:240px;padding:0;border:none;background:transparent;overflow:visible;');
      }
      this.resize();
    },

    _buildFilterToolbar: function () {
      var container = this.toolbar.containerNode;
      container.style.cssText += ';display:flex;flex-direction:row;height:100%;';

      // Slim expand strip (visible when collapsed)
      this.expandStripNode = domConstruct.create('div', { className: 'vs-expand-strip' }, container);
      domConstruct.create('span', {
        className: 'vs-expand-strip-icon',
        innerHTML: 'Show Search Panel'
      }, this.expandStripNode);
      on(this.expandStripNode, 'click', lang.hitch(this, this._toggleFilters));

      // Main filter panel
      this.filterPanelNode = domConstruct.create('div', { className: 'vs-filter-panel' }, container);

      var titleBar = domConstruct.create('div', { className: 'vs-panel-titlebar' }, this.filterPanelNode);
      domConstruct.create('span', { className: 'vs-panel-title', innerHTML: 'Search Panel' }, titleBar);
      this.toggleBtnNode = domConstruct.create('button', {
        type: 'button', className: 'vs-toggle-btn', innerHTML: 'Hide', title: 'Hide search panel'
      }, titleBar);
      on(this.toggleBtnNode, 'click', lang.hitch(this, this._toggleFilters));

      var inner = domConstruct.create('div', { className: 'vs-filter-inner' }, this.filterPanelNode);

      // Search section
      var searchHeader = domConstruct.create('div', { className: 'vs-section-header' }, inner);
      domConstruct.create('span', { className: 'vs-section-heading', innerHTML: 'Search' }, searchHeader);
      this._searchChevron = domConstruct.create('span', { className: 'vs-chevron', innerHTML: '&#9660;' }, searchHeader);
      var searchBody = domConstruct.create('div', { className: 'vs-section-body' }, inner);
      on(searchHeader, 'click', lang.hitch(this, function () {
        var hidden = searchBody.className.indexOf('vs-section-hidden') > -1;
        searchBody.className = hidden ? 'vs-section-body' : 'vs-section-body vs-section-hidden';
        this._searchChevron.className = hidden ? 'vs-chevron' : 'vs-chevron vs-chevron-closed';
      }));

      var searchField = domConstruct.create('div', { className: 'vs-field' }, searchBody);
      var searchLabel = domConstruct.create('label', { innerHTML: 'Search Text', className: 'vs-label' }, searchField);
      this.searchInput = domConstruct.create('input', {
        type: 'text', placeholder: 'Type text to match', className: 'vs-control'
      }, searchField);
      this.searchInput.id = this.id + '_search_text';
      searchLabel.setAttribute('for', this.searchInput.id);

      var columnField = domConstruct.create('div', { className: 'vs-field' }, searchBody);
      var columnLabel = domConstruct.create('label', { innerHTML: 'Search In', className: 'vs-label' }, columnField);
      this.columnSelect = domConstruct.create('select', { className: 'vs-control' }, columnField);
      this.columnSelect.id = this.id + '_search_column';
      columnLabel.setAttribute('for', this.columnSelect.id);
      domConstruct.create('option', { value: '__all__', innerHTML: 'All Columns' }, this.columnSelect);

      // Facet section
      domConstruct.create('hr', { className: 'vs-divider' }, inner);
      var facetHeader = domConstruct.create('div', { className: 'vs-section-header' }, inner);
      domConstruct.create('span', { className: 'vs-section-heading', innerHTML: 'Filters' }, facetHeader);
      this._facetChevron = domConstruct.create('span', { className: 'vs-chevron', innerHTML: '&#9660;' }, facetHeader);
      this.facetBody = domConstruct.create('div', { className: 'vs-section-body' }, inner);
      on(facetHeader, 'click', lang.hitch(this, function () {
        var hidden = this.facetBody.className.indexOf('vs-section-hidden') > -1;
        this.facetBody.className = hidden ? 'vs-section-body' : 'vs-section-body vs-section-hidden';
        this._facetChevron.className = hidden ? 'vs-chevron' : 'vs-chevron vs-chevron-closed';
      }));
      // facet selects are created in _buildFacetControls once headers are known
      this._facetSelects = [];

      // Actions section
      domConstruct.create('hr', { className: 'vs-divider' }, inner);
      var actionsHeader = domConstruct.create('div', { className: 'vs-section-header' }, inner);
      domConstruct.create('span', { className: 'vs-section-heading', innerHTML: 'Actions' }, actionsHeader);
      var actionsBody = domConstruct.create('div', { className: 'vs-actions' }, inner);

      this.resetButton = domConstruct.create('button', {
        type: 'button', innerHTML: 'Reset', className: 'vs-reset-btn'
      }, actionsBody);
      this.downloadButton = domConstruct.create('button', {
        type: 'button', innerHTML: 'Download CSV', className: 'vs-download-btn'
      }, actionsBody);

      this.countNode = domConstruct.create('div', { className: 'vs-count' }, actionsBody);
      domConstruct.create('span', { innerHTML: 'Results' }, this.countNode);
      this.countBadgeNode = domConstruct.create('span', { className: 'vs-count-badge', innerHTML: '0' }, this.countNode);

      // Events
      on(this.searchInput, 'input', lang.hitch(this, this.applyFilters));
      on(this.columnSelect, 'change', lang.hitch(this, this.applyFilters));
      on(this.resetButton, 'click', lang.hitch(this, this._resetFilters));
      on(this.downloadButton, 'click', lang.hitch(this, this._downloadCSV));
    },

    _populateColumnOptions: function (headers) {
      while (this.columnSelect.options.length > 1) {
        this.columnSelect.remove(1);
      }
      headers.forEach(lang.hitch(this, function (header) {
        domConstruct.create('option', { value: header, innerHTML: header }, this.columnSelect);
      }));
    },

    _buildFacetControls: function (headers) {
      domConstruct.empty(this.facetBody);
      this._facetSelects = [];

      this.facetColumns.forEach(lang.hitch(this, function (colName) {
        var colIdx = headers.indexOf(colName);
        if (colIdx < 0) {
          return;
        }

        var field = domConstruct.create('div', { className: 'vs-field' }, this.facetBody);
        var label = domConstruct.create('label', { innerHTML: colName, className: 'vs-label' }, field);
        var select = domConstruct.create('select', { className: 'vs-control' }, field);
        select.id = this.id + '_facet_' + colIdx;
        label.setAttribute('for', select.id);
        domConstruct.create('option', { value: '', innerHTML: 'All' }, select);

        var unique = {};
        this._allRows.forEach(function (row) {
          var value = (row[colIdx] || '').trim();
          if (value) {
            unique[value] = true;
          }
        });
        Object.keys(unique).sort().forEach(function (value) {
          domConstruct.create('option', { value: value, innerHTML: value }, select);
        });

        on(select, 'change', lang.hitch(this, this.applyFilters));
        this._facetSelects.push({ idx: colIdx, node: select });
      }));
    },

    _resetFilters: function () {
      this.searchInput.value = '';
      this.columnSelect.value = '__all__';
      this._facetSelects.forEach(function (f) {
        f.node.value = '';
      });
      this.applyFilters();
    },

    applyFilters: function () {
      if (!this._allRows.length || !this._allHeaders.length) {
        this.grid.setGridData([], []);
        this.countBadgeNode.innerHTML = '0';
        return;
      }

      var searchTerm = (this.searchInput.value || '').toLowerCase();
      var selectedColumn = this.columnSelect.value || '__all__';
      var selectedColumnIdx = selectedColumn !== '__all__' ? this._allHeaders.indexOf(selectedColumn) : -1;
      var activeFacets = this._facetSelects
        .filter(function (f) { return f.node.value; })
        .map(function (f) { return { idx: f.idx, value: f.node.value }; });

      var filtered = this._allRows.filter(function (row) {
        var matchesSearch = true;
        if (searchTerm) {
          if (selectedColumnIdx > -1) {
            matchesSearch = String(row[selectedColumnIdx] || '').toLowerCase().indexOf(searchTerm) > -1;
          } else {
            matchesSearch = row.some(function (cell) {
              return String(cell || '').toLowerCase().indexOf(searchTerm) > -1;
            });
          }
        }

        var matchesFacets = activeFacets.every(function (f) {
          return String(row[f.idx] || '').trim() === f.value;
        });

        return matchesSearch && matchesFacets;
      });

      this._filteredRows = filtered;
      this.grid.setGridData(this._allHeaders, filtered);
      this.countBadgeNode.innerHTML = filtered.length;
    },

    _downloadCSV: function () {
      var headers = this._allHeaders;
      var rows = this._filteredRows || this._allRows;
      if (!headers || !headers.length) {
        return;
      }

      var escapeField = function (value) {
        var str = String(value == null ? '' : value);
        if (str.indexOf(',') > -1 || str.indexOf('"') > -1 || str.indexOf('\n') > -1 || str.indexOf('\r') > -1) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };

      var lines = [headers.map(escapeField).join(',')];
      rows.forEach(function (row) {
        lines.push(row.map(escapeField).join(','));
      });

      var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = this.downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    _parseCsvText: function (csvText) {
      var rows = [];
      var row = [];
      var field = '';
      var inQuotes = false;

      for (var i = 0; i < csvText.length; i++) {
        var ch = csvText[i];
        var next = csvText[i + 1];

        if (ch === '"') {
          if (inQuotes && next === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(field);
          field = '';
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          if (ch === '\r' && next === '\n') {
            i++;
          }
          row.push(field);
          field = '';
          if (row.some(function (value) { return value !== ''; })) {
            rows.push(row);
          }
          row = [];
        } else {
          field += ch;
        }
      }

      if (field.length > 0 || row.length > 0) {
        row.push(field);
        if (row.some(function (value) { return value !== ''; })) {
          rows.push(row);
        }
      }

      return rows;
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (!this.isLoaded) {
        this.loadGrid();
      }
    },

    loadGrid: function () {
      if (this._loading) {
        return;
      }
      this._loading = true;

      xhr.get(this.csvUrl, {
        headers: { accept: 'text/csv,text/plain,*/*' },
        handleAs: 'text'
      }).then(lang.hitch(this, function (csvText) {
        this._loading = false;
        var rows = this._parseCsvText(csvText || '');
        if (!rows.length) {
          this.grid.setGridData([], []);
          this.grid.set('noDataMessage', 'No data found in Influenza Vaccine Strains CSV.');
          return;
        }

        var headers = rows[0].map(function (header) {
          return header.replace(/^\uFEFF/, '');
        });
        this._allHeaders = headers;
        this._allRows = rows.slice(1);
        this._populateColumnOptions(headers);
        this._buildFacetControls(headers);
        this.applyFilters();
        this.isLoaded = true;
      }), lang.hitch(this, function () {
        this._loading = false;
        this._allHeaders = [];
        this._allRows = [];
        this.grid.setGridData([], []);
        this.grid.set('noDataMessage', 'Unable to load Influenza Vaccine Strains CSV.');
        this.countBadgeNode.innerHTML = '0';
      }));
    }
  });
});
