define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/store/Memory',
  'dgrid/OnDemandGrid',
  'dgrid/Selection',
  'dgrid/extensions/ColumnResizer',
  'dgrid/extensions/ColumnHider',
  'dgrid/extensions/DijitRegistry',
  'dgrid/selector'
], function (
  declare, lang, Memory, OnDemandGrid, Selection, ColumnResizer, ColumnHider, DijitRegistry, selector
) {
  return declare([OnDemandGrid, Selection, ColumnResizer, ColumnHider, DijitRegistry], {
    minRowsPerPage: 20,
    maxRowsPerPage: 100,
    bufferRows: 30,
    keepScrollPosition: true,
    loadingMessage: 'Loading files...',
    noDataMessage: 'No files found',
    selectionMode: 'none',
    allowSelectAll: false,

    filesData: null,
    _pendingSelectedFiles: null,
    _isApplyingPendingSelection: false,

    constructor: function(args) {
      this.filesData = [];
      this._pendingSelectedFiles = [];
      this._isApplyingPendingSelection = false;
      if (args) {
        lang.mixin(this, args);
      }
      if (!this.store) {
        this.store = new Memory({
          idProperty: 'id',
          data: []
        });
      }
      this.columns = this._buildColumns();
      this.sort = [{ attribute: 'created_at', descending: true }];
    },

    _buildColumns: function() {
      return {
        __copilotRowSelect: selector({
          selectorType: 'checkbox',
          label: '',
          sortable: false,
          unhidable: true,
          className: 'files-grid-checkbox-col',
          width: '32px',
          minWidth: 32,
          maxWidth: 32
        }),
        file_name: {
          label: 'File',
          field: 'file_name',
          className: 'files-grid-name-col'
        },
        tool_id: {
          label: 'Tool',
          field: 'tool_id',
          className: 'files-grid-tool-col'
        },
        created_at: {
          label: 'Created',
          field: 'created_at',
          formatter: lang.hitch(this, this._formatDate),
          className: 'files-grid-created-col'
        },
        size_display: {
          label: 'Size',
          field: 'size_display',
          className: 'files-grid-size-col'
        },
        record_count: {
          label: 'Records',
          field: 'record_count',
          formatter: function(value) {
            if (typeof value !== 'number') return '';
            return value.toLocaleString();
          },
          className: 'files-grid-records-col'
        },
        data_type: {
          label: 'Type',
          field: 'data_type',
          className: 'files-grid-type-col'
        },
        is_error: {
          label: 'Error',
          field: 'is_error',
          formatter: function(value) {
            return value ? 'Yes' : '';
          },
          className: 'files-grid-error-col'
        }
      };
    },

    _formatDate: function(value) {
      if (!value) return '';
      var date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString();
    },

    _normalizeFile: function(file) {
      if (!file) return null;
      var rowId = file.file_id || file.id || (file.file_name + '|' + (file.created_at || ''));
      if (!rowId) return null;
      var sizeDisplay = file.size_formatted;
      if (!sizeDisplay && typeof file.size_bytes === 'number') {
        sizeDisplay = file.size_bytes.toLocaleString() + ' bytes';
      }
      return {
        id: String(rowId),
        file_id: file.file_id || null,
        file_name: file.file_name || 'Untitled file',
        tool_id: file.tool_id || '',
        created_at: file.created_at || '',
        size_bytes: typeof file.size_bytes === 'number' ? file.size_bytes : null,
        size_display: sizeDisplay || '',
        record_count: typeof file.record_count === 'number' ? file.record_count : null,
        data_type: file.data_type || '',
        is_error: file.is_error === true,
        workspace_path: file.workspace_path || '',
        workspace_url: file.workspace_url || '',
        raw: file
      };
    },

    _buildSelectedIdMapFromItems: function(items) {
      var selectedIds = {};
      if (!Array.isArray(items)) return selectedIds;
      items.forEach(function(row) {
        if (row && row.id !== undefined && row.id !== null) {
          selectedIds[String(row.id)] = true;
        }
      });
      return selectedIds;
    },

    _getCurrentSelectedIdMap: function() {
      var selectionMap = this.selection || {};
      var selectedIds = {};
      for (var rowId in selectionMap) {
        if (selectionMap.hasOwnProperty(rowId) && selectionMap[rowId]) {
          selectedIds[String(rowId)] = true;
        }
      }
      return selectedIds;
    },

    _selectedIdMapsMatch: function(expected, current) {
      var key;
      for (key in expected) {
        if (expected.hasOwnProperty(key) && !current[key]) return false;
      }
      for (key in current) {
        if (current.hasOwnProperty(key) && !expected[key]) return false;
      }
      return true;
    },

    isApplyingSelectionSync: function() {
      return !!this._isApplyingPendingSelection;
    },

    _applyPendingSelection: function() {
      if (!Array.isArray(this._pendingSelectedFiles) || this._isApplyingPendingSelection) {
        return;
      }
      var selectedIds = this._buildSelectedIdMapFromItems(this._pendingSelectedFiles);
      var currentSelectionIds = this._getCurrentSelectedIdMap();
      if (this._selectedIdMapsMatch(selectedIds, currentSelectionIds)) {
        return;
      }
      this._isApplyingPendingSelection = true;
      try {
        if (typeof this.clearSelection === 'function') this.clearSelection();
        this.filesData.forEach(lang.hitch(this, function(row) {
          if (row && selectedIds[row.id]) {
            this.select(row.id);
          }
        }));
      } finally {
        this._isApplyingPendingSelection = false;
      }
    },

    setFilesData: function(files) {
      var normalized = [];
      if (Array.isArray(files)) {
        files.forEach(lang.hitch(this, function(file) {
          var row = this._normalizeFile(file);
          if (row) normalized.push(row);
        }));
      }
      this.filesData = normalized;
      if (this.store) this.store.setData(normalized);
      if (this._started) this.refresh();
      this._applyPendingSelection();
    },

    getSelectedFiles: function() {
      var selected = [];
      var selectionMap = this.selection || {};
      for (var rowId in selectionMap) {
        if (!selectionMap.hasOwnProperty(rowId) || !selectionMap[rowId]) continue;
        var row = this.row(rowId);
        if (row && row.data) selected.push(row.data);
      }
      return selected;
    },

    setSelectedFiles: function(items) {
      var currentPendingMap = this._buildSelectedIdMapFromItems(this._pendingSelectedFiles);
      var nextPendingMap = this._buildSelectedIdMapFromItems(items);
      if (this._selectedIdMapsMatch(nextPendingMap, currentPendingMap)) {
        return;
      }
      this._pendingSelectedFiles = Array.isArray(items) ? items.slice() : [];
      if (!this._started || this._isApplyingPendingSelection) {
        return;
      }
      this._applyPendingSelection();
    },

    startup: function() {
      if (this._started) return;
      this.inherited(arguments);
      if (this.filesData && this.filesData.length > 0) {
        this.setFilesData(this.filesData);
      } else {
        this.refresh();
      }
      this._applyPendingSelection();
    }
  });
});

