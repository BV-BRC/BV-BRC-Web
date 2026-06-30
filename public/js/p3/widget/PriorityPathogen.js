define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/request', 'dojo/_base/lang',
  'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/on',
  'dojo/window',
  './PriorityPathogenGrid'
], function (
  declare, BorderContainer, xhr, lang,
  ContentPane, domConstruct, on,
  win,
  PriorityPathogenGrid
) {
  return declare([BorderContainer], {
    title: 'Priority Pathogens',
    isLoaded: false,
    _loading: false,
    gutters: false,
    design: 'headline',
    _allHeaders: [],
    _allRows: [],
    filtersCollapsed: false,

    postCreate: function () {
      this.inherited(arguments);

      this.toolbar = new ContentPane({
        region: 'left',
        splitter: false,
        style: 'width: 240px; min-width: 240px; max-width: 240px; padding: 0; border: none; background: transparent; overflow: visible;'
      });
      this.addChild(this.toolbar);
      this._ensureToolbarStyles();
      this._buildFilterToolbar();

      this.grid = new PriorityPathogenGrid({
        region: 'center',
        id: this.id + '_grid',
        style: 'padding: 10px 12px 12px 12px;'
      });
      this.addChild(this.grid);
      this.own(on(window, 'resize', lang.hitch(this, this._applyResponsiveLayout)));
      this._applyResponsiveLayout();
    },

    _ensureToolbarStyles: function () {
      if (document.getElementById('priority-pathogen-toolbar-styles')) {
        return;
      }
      domConstruct.create('style', {
        id: 'priority-pathogen-toolbar-styles',
        innerHTML: [
          // Toggle button (circle on right edge of panel)
          '.pp-panel-titlebar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px 6px 16px;border-bottom:1px solid #e5e7eb;margin-bottom:4px;}',
          '.pp-panel-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;}',
          '.pp-toggle-btn{height:24px;padding:0 10px;border-radius:4px;background:#fff;border:1px solid #d1d5db;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none;font-size:11px;font-weight:600;color:#6b7280;line-height:1;white-space:nowrap;}',
          '.pp-toggle-btn:hover{background:#eef2f7;border-color:#2c7a7b;color:#2c7a7b;}',
          // Slim expand strip shown when collapsed
          '.pp-expand-strip{display:none;flex-shrink:0;width:28px;height:100%;min-height:100%;background:#f8fafb;border-right:1px solid #e5e7eb;box-sizing:border-box;align-items:flex-start;justify-content:center;padding-top:14px;cursor:pointer;}',
          '.pp-expand-strip:hover{background:#eef2f7;}',
          '.pp-expand-strip-icon{font-size:11px;font-weight:600;color:#6b7280;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);letter-spacing:.05em;user-select:none;pointer-events:none;}',
          // Filter panel
          '.pp-filter-panel{position:relative;flex-shrink:0;background:#f8fafb;border-right:1px solid #e5e7eb;box-sizing:border-box;align-self:stretch;width:240px;overflow:hidden;transition:width .2s ease;}',
          '.pp-filter-panel.pp-collapsed{width:0;border-right:none;}',
          '.pp-filter-inner{width:240px;padding:8px 0 14px;box-sizing:border-box;}',
          // Section headers
          '.pp-section-header{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;cursor:pointer;user-select:none;width:100%;box-sizing:border-box;background:transparent;}',
          '.pp-section-header:hover{background:#eef2f7;}',
          '.pp-section-header:hover .pp-chevron{color:#2c7a7b;}',
          '.pp-section-heading{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;pointer-events:none;}',
          '.pp-chevron{font-size:9px;color:#9ca3af;transition:transform .15s;line-height:1;pointer-events:none;}',
          '.pp-chevron.pp-chevron-closed{transform:rotate(-90deg);}',
          '.pp-section-body{overflow:hidden;transition:max-height .2s ease;max-height:600px;}',
          '.pp-section-body.pp-section-hidden{max-height:0;}',
          '.pp-divider{margin:12px 16px;border:none;border-top:1px solid #e5e7eb;}',
          // Field controls
          '.pp-field{display:flex;flex-direction:column;gap:4px;padding:4px 16px;}',
          '.pp-label{font-size:11px;font-weight:600;color:#6b7280;}',
          '.pp-control{height:28px;padding:4px 8px;border:1px solid #d1d5db;border-radius:3px;background:#fff;width:100%;box-sizing:border-box;font-size:12px;color:#374151;}',
          '.pp-control:focus{outline:none;border-color:#2c7a7b;}',
          '.pp-control:disabled{background:#f3f6f9;color:#9ca3af;}',
          '.pp-help{font-size:11px;color:#9ca3af;line-height:1.3;padding:2px 16px 8px;}',
          // Actions
          '.pp-actions{padding:8px 16px;display:flex;flex-direction:column;gap:8px;}',
          '.pp-reset-btn{height:30px;padding:0 12px;border-radius:3px;font-size:12px;font-weight:600;cursor:pointer;background:#fff;color:#2c7a7b;border:1px solid #d1d5db;width:100%;}',
          '.pp-reset-btn:hover{background:#eef2f7;border-color:#2c7a7b;}',
          '.pp-download-btn{height:30px;padding:0 12px;border-radius:3px;font-size:12px;font-weight:600;cursor:pointer;background:#2c7a7b;color:#fff;border:1px solid #2c7a7b;width:100%;}',
          '.pp-download-btn:hover{background:#235f60;}',
          '.pp-count{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:12px;color:#6b7280;}',
          '.pp-count-badge{font-size:11px;font-weight:700;background:#2c7a7b;color:#fff;border-radius:10px;padding:1px 8px;}'
        ].join('')
      }, document.head);
    },

    _toggleFilters: function () {
      this.filtersCollapsed = !this.filtersCollapsed;
      if (this.filtersCollapsed) {
        this.filterPanelNode.className = 'pp-filter-panel pp-collapsed';
        this.expandStripNode.style.display = 'flex';
        this.toggleBtnNode.innerHTML = 'Show';
        this.toggleBtnNode.title = 'Show search panel';
        // Shrink the BorderContainer left region to just the expand strip width
        this.toolbar.set('style', 'width:28px;min-width:28px;max-width:28px;padding:0;border:none;background:transparent;overflow:visible;');
      } else {
        this.filterPanelNode.className = 'pp-filter-panel';
        this.expandStripNode.style.display = 'none';
        this.toggleBtnNode.innerHTML = 'Hide';
        this.toggleBtnNode.title = 'Hide search panel';
        // Restore full width
        this.toolbar.set('style', 'width:240px;min-width:240px;max-width:240px;padding:0;border:none;background:transparent;overflow:visible;');
      }
      this.resize();
    },

    _applyResponsiveLayout: function () {
      if (!this.toolbar || !this.grid) {
        return;
      }
      this.resize();
    },

    _buildFilterToolbar: function () {
      var container = this.toolbar.containerNode;
      // Make the ContentPane's container a flex column so children can stretch to 100% height
      container.style.cssText += ';display:flex;flex-direction:row;height:100%;';

      // Slim expand strip (visible when collapsed)
      this.expandStripNode = domConstruct.create('div', { className: 'pp-expand-strip' }, container);
      domConstruct.create('span', {
        className: 'pp-expand-strip-icon',
        innerHTML: 'Show Search Panel'
      }, this.expandStripNode);
      on(this.expandStripNode, 'click', lang.hitch(this, this._toggleFilters));

      // Main filter panel
      this.filterPanelNode = domConstruct.create('div', { className: 'pp-filter-panel' }, container);

      // Title bar with "Hide" button
      var titleBar = domConstruct.create('div', { className: 'pp-panel-titlebar' }, this.filterPanelNode);
      domConstruct.create('span', { className: 'pp-panel-title', innerHTML: 'Search Panel' }, titleBar);
      this.toggleBtnNode = domConstruct.create('button', {
        type: 'button',
        className: 'pp-toggle-btn',
        innerHTML: 'Hide',
        title: 'Hide search panel'
      }, titleBar);
      on(this.toggleBtnNode, 'click', lang.hitch(this, this._toggleFilters));

      var inner = domConstruct.create('div', { className: 'pp-filter-inner' }, this.filterPanelNode);

      // ── Search section ──────────────────────────────────────────────
      var searchHeader = domConstruct.create('div', { className: 'pp-section-header' }, inner);
      domConstruct.create('span', { className: 'pp-section-heading', innerHTML: 'Search' }, searchHeader);
      this._searchChevron = domConstruct.create('span', { className: 'pp-chevron', innerHTML: '&#9660;' }, searchHeader);
      var searchBody = domConstruct.create('div', { className: 'pp-section-body' }, inner);
      on(searchHeader, 'click', lang.hitch(this, function () {
        var hidden = searchBody.className.indexOf('pp-section-hidden') > -1;
        searchBody.className = hidden ? 'pp-section-body' : 'pp-section-body pp-section-hidden';
        this._searchChevron.className = hidden ? 'pp-chevron' : 'pp-chevron pp-chevron-closed';
      }));

      var searchField = domConstruct.create('div', { className: 'pp-field' }, searchBody);
      var searchLabel = domConstruct.create('label', { innerHTML: 'Search Text', className: 'pp-label' }, searchField);
      this.searchInput = domConstruct.create('input', {
        type: 'text', placeholder: 'Type text to match', className: 'pp-control'
      }, searchField);
      this.searchInput.id = this.id + '_search_text';
      searchLabel.setAttribute('for', this.searchInput.id);

      var columnField = domConstruct.create('div', { className: 'pp-field' }, searchBody);
      var columnLabel = domConstruct.create('label', { innerHTML: 'Search In', className: 'pp-label' }, columnField);
      this.columnSelect = domConstruct.create('select', { className: 'pp-control' }, columnField);
      this.columnSelect.id = this.id + '_search_column';
      columnLabel.setAttribute('for', this.columnSelect.id);
      domConstruct.create('option', { value: '__all__', innerHTML: 'All Columns' }, this.columnSelect);

      // ── Priority section ────────────────────────────────────────────
      domConstruct.create('hr', { className: 'pp-divider' }, inner);
      var priorityHeader = domConstruct.create('div', { className: 'pp-section-header' }, inner);
      domConstruct.create('span', { className: 'pp-section-heading', innerHTML: 'Priority Filter' }, priorityHeader);
      this._priorityChevron = domConstruct.create('span', { className: 'pp-chevron', innerHTML: '&#9660;' }, priorityHeader);
      var priorityBody = domConstruct.create('div', { className: 'pp-section-body' }, inner);
      on(priorityHeader, 'click', lang.hitch(this, function () {
        var hidden = priorityBody.className.indexOf('pp-section-hidden') > -1;
        priorityBody.className = hidden ? 'pp-section-body' : 'pp-section-body pp-section-hidden';
        this._priorityChevron.className = hidden ? 'pp-chevron' : 'pp-chevron pp-chevron-closed';
      }));

      var sourceField = domConstruct.create('div', { className: 'pp-field' }, priorityBody);
      var sourceLabel = domConstruct.create('label', { innerHTML: 'Priority Source', className: 'pp-label' }, sourceField);
      this.prioritySourceSelect = domConstruct.create('select', { className: 'pp-control' }, sourceField);
      this.prioritySourceSelect.id = this.id + '_priority_source';
      sourceLabel.setAttribute('for', this.prioritySourceSelect.id);
      domConstruct.create('option', { value: '', innerHTML: 'Select Source (Optional)' }, this.prioritySourceSelect);
      domConstruct.create('option', { value: 'BV-BRC Priority', innerHTML: 'BV-BRC Priority' }, this.prioritySourceSelect);
      domConstruct.create('option', { value: 'NIH Priority', innerHTML: 'NIH Priority' }, this.prioritySourceSelect);
      domConstruct.create('option', { value: 'UKHSA (Pand/Epid)', innerHTML: 'UKHSA (Pand/Epid)' }, this.prioritySourceSelect);
      domConstruct.create('option', { value: 'WHO Risk', innerHTML: 'WHO Risk' }, this.prioritySourceSelect);

      var valueField = domConstruct.create('div', { className: 'pp-field' }, priorityBody);
      var valueLabel = domConstruct.create('label', { innerHTML: 'Priority Value', className: 'pp-label' }, valueField);
      this.priorityValueSelect = domConstruct.create('select', { className: 'pp-control' }, valueField);
      this.priorityValueSelect.id = this.id + '_priority_value';
      valueLabel.setAttribute('for', this.priorityValueSelect.id);
      domConstruct.create('option', { value: '', innerHTML: 'Priority Value (Any)' }, this.priorityValueSelect);
      this.priorityValueSelect.disabled = true;

      this.priorityHintNode = domConstruct.create('div', {
        innerHTML: 'Priority Value options are populated from selected Priority Source.',
        className: 'pp-help'
      }, priorityBody);

      // ── Actions section ─────────────────────────────────────────────
      domConstruct.create('hr', { className: 'pp-divider' }, inner);
      var actionsHeader = domConstruct.create('div', { className: 'pp-section-header' }, inner);
      domConstruct.create('span', { className: 'pp-section-heading', innerHTML: 'Actions' }, actionsHeader);

      var actionsBody = domConstruct.create('div', { className: 'pp-actions' }, inner);

      this.resetButton = domConstruct.create('button', {
        type: 'button', innerHTML: 'Reset', className: 'pp-reset-btn'
      }, actionsBody);

      this.downloadButton = domConstruct.create('button', {
        type: 'button', innerHTML: 'Download CSV', className: 'pp-download-btn'
      }, actionsBody);

      this.countNode = domConstruct.create('div', { className: 'pp-count' }, actionsBody);
      domConstruct.create('span', { innerHTML: 'Results' }, this.countNode);
      this.countBadgeNode = domConstruct.create('span', { className: 'pp-count-badge', innerHTML: '0' }, this.countNode);

      // ── Events ──────────────────────────────────────────────────────
      on(this.searchInput, 'input', lang.hitch(this, this.applyFilters));
      on(this.columnSelect, 'change', lang.hitch(this, this.applyFilters));
      on(this.prioritySourceSelect, 'change', lang.hitch(this, function () {
        this._populatePriorityValueOptions();
        this.applyFilters();
      }));
      on(this.priorityValueSelect, 'change', lang.hitch(this, this.applyFilters));
      on(this.resetButton, 'click', lang.hitch(this, function () {
        this.searchInput.value = '';
        this.columnSelect.value = '__all__';
        this.prioritySourceSelect.value = '';
        this._populatePriorityValueOptions();
        this.applyFilters();
      }));
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

    _populatePriorityValueOptions: function () {
      while (this.priorityValueSelect.options.length > 1) {
        this.priorityValueSelect.remove(1);
      }

      var source = this.prioritySourceSelect.value;
      if (!source || !this._allHeaders.length) {
        this.priorityValueSelect.disabled = true;
        return;
      }
      this.priorityValueSelect.disabled = false;

      var sourceIdx = this._allHeaders.indexOf(source);
      if (sourceIdx < 0) {
        this.priorityValueSelect.disabled = true;
        return;
      }

      var unique = {};
      this._allRows.forEach(function (row) {
        var value = (row[sourceIdx] || '').trim();
        if (value) {
          unique[value] = true;
        }
      });

      Object.keys(unique).sort().forEach(lang.hitch(this, function (value) {
        domConstruct.create('option', { value: value, innerHTML: value }, this.priorityValueSelect);
      }));
    },

    applyFilters: function () {
      if (!this._allRows.length || !this._allHeaders.length) {
        this.grid.setGridData([], []);
        this.countBadgeNode.innerHTML = '0';
        return;
      }

      var searchTerm = (this.searchInput.value || '').toLowerCase();
      var selectedColumn = this.columnSelect.value || '__all__';
      var source = this.prioritySourceSelect.value || '';
      var priorityValue = this.priorityValueSelect.value || '';
      var sourceIdx = source ? this._allHeaders.indexOf(source) : -1;
      var selectedColumnIdx = selectedColumn !== '__all__' ? this._allHeaders.indexOf(selectedColumn) : -1;

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

        var matchesPriority = true;
        if (sourceIdx > -1 && priorityValue) {
          matchesPriority = String(row[sourceIdx] || '').trim() === priorityValue;
        }

        return matchesSearch && matchesPriority;
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

      var csvContent = lines.join('\r\n');
      var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'priority_pathogens.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (!this.isLoaded) {
        this.loadPriorityPathogenGrid();
      }
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

    loadPriorityPathogenGrid: function () {
      if (this._loading) {
        return;
      }
      this._loading = true;

      xhr.get('https://www.bv-brc.org/api/content/data/human_viral_pathogens.csv', {
        headers: { accept: 'text/csv,text/plain,*/*' },
        handleAs: 'text'
      }).then(lang.hitch(this, function (csvText) {
        this._loading = false;
        var rows = this._parseCsvText(csvText || '');
        if (!rows.length) {
          this.grid.setGridData([], []);
          this.grid.set('noDataMessage', 'No data found in Priority Pathogens CSV.');
          return;
        }

        var headers = rows[0].map(function (header) {
          return header.replace(/^\uFEFF/, '');
        });
        var bodyRows = rows.slice(1);
        this._allHeaders = headers;
        this._allRows = bodyRows;
        this._populateColumnOptions(headers);
        this._populatePriorityValueOptions();
        this.applyFilters();
        this.isLoaded = true;
      }), lang.hitch(this, function () {
        this._loading = false;
        this._allHeaders = [];
        this._allRows = [];
        this.grid.setGridData([], []);
        this.grid.set('noDataMessage', 'Unable to load Priority Pathogens CSV.');
        this.countBadgeNode.innerHTML = '0';
      }));
    }
  });
});
