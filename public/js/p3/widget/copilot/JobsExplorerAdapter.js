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
    loadingMessage: 'Loading jobs...',
    noDataMessage: 'No jobs found',
    selectionMode: 'none',
    allowSelectAll: false,

    jobsData: null,
    _pendingSelectedJobs: null,
    _isApplyingPendingSelection: false,

    constructor: function(args) {
      this.jobsData = [];
      this._pendingSelectedJobs = [];
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
      this.sort = [{ attribute: 'submit_time', descending: true }];
    },

    _buildColumns: function() {
      return {
        __copilotRowSelect: selector({
          selectorType: 'checkbox',
          label: '',
          sortable: false,
          unhidable: true,
          className: 'jobs-grid-checkbox-col',
          width: '32px',
          minWidth: 32,
          maxWidth: 32
        }),
        status: {
          label: 'Status',
          field: 'status',
          className: 'jobs-grid-status-col'
        },
        id: {
          label: 'Job ID',
          field: 'id',
          className: 'jobs-grid-id-col'
        },
        application_name: {
          label: 'Service',
          field: 'application_name',
          className: 'jobs-grid-service-col'
        },
        submit_time: {
          label: 'Submit',
          field: 'submit_time',
          formatter: lang.hitch(this, this._formatDate),
          className: 'jobs-grid-submit-col'
        },
        completed_time: {
          label: 'Completed',
          field: 'completed_time',
          formatter: lang.hitch(this, this._formatDate),
          className: 'jobs-grid-completed-col'
        }
      };
    },

    _formatDate: function(value) {
      if (!value) {
        return '';
      }
      var date = new Date(value);
      if (isNaN(date.getTime())) {
        return value;
      }
      return date.toLocaleString();
    },

    _normalizeJob: function(job) {
      if (!job) {
        return null;
      }
      var id = job.id || job.job_id || job.task_id;
      if (id === null || id === undefined || id === '') {
        return null;
      }
      return {
        id: String(id),
        status: job.status || '',
        application_name: job.application_name || job.app || job.service || '',
        submit_time: job.submit_time || '',
        start_time: job.start_time || '',
        completed_time: job.completed_time || '',
        parameters: job.parameters || null,
        raw: job
      };
    },

    _buildSelectedIdMapFromItems: function(items) {
      var selectedIds = {};
      if (!Array.isArray(items)) {
        return selectedIds;
      }
      items.forEach(function(job) {
        if (job && job.id !== undefined && job.id !== null) {
          selectedIds[String(job.id)] = true;
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
        if (expected.hasOwnProperty(key) && !current[key]) {
          return false;
        }
      }
      for (key in current) {
        if (current.hasOwnProperty(key) && !expected[key]) {
          return false;
        }
      }
      return true;
    },

    isApplyingSelectionSync: function() {
      return !!this._isApplyingPendingSelection;
    },

    _applyPendingSelection: function() {
      if (!Array.isArray(this._pendingSelectedJobs) || this._isApplyingPendingSelection) {
        return;
      }

      var selectedIds = this._buildSelectedIdMapFromItems(this._pendingSelectedJobs);
      var currentSelectionIds = this._getCurrentSelectedIdMap();
      if (this._selectedIdMapsMatch(selectedIds, currentSelectionIds)) {
        return;
      }

      this._isApplyingPendingSelection = true;
      try {
        if (typeof this.clearSelection === 'function') {
          this.clearSelection();
        }
        this.jobsData.forEach(lang.hitch(this, function(job) {
          if (job && selectedIds[job.id]) {
            this.select(job.id);
          }
        }));
      } finally {
        this._isApplyingPendingSelection = false;
      }
    },

    _getJobIdMapFromItems: function(items) {
      var idMap = {};
      if (!Array.isArray(items)) {
        return idMap;
      }
      items.forEach(function(item) {
        if (item && item.id !== undefined && item.id !== null) {
          idMap[String(item.id)] = true;
        }
      });
      return idMap;
    },

    setJobsData: function(jobs) {
      var normalized = [];
      if (Array.isArray(jobs)) {
        jobs.forEach(lang.hitch(this, function(job) {
          var mapped = this._normalizeJob(job);
          if (mapped) {
            normalized.push(mapped);
          }
        }));
      }
      this.jobsData = normalized;
      if (this.store) {
        this.store.setData(normalized);
      }
      if (this._started) {
        this.refresh();
      }
      this._applyPendingSelection();
    },

    getSelectedJobs: function() {
      var selected = [];
      var selectionMap = this.selection || {};
      for (var rowId in selectionMap) {
        if (!selectionMap.hasOwnProperty(rowId) || !selectionMap[rowId]) {
          continue;
        }
        var row = this.row(rowId);
        if (row && row.data) {
          selected.push(row.data);
        }
      }
      return selected;
    },

    setSelectedJobs: function(items) {
      var currentPendingMap = this._getJobIdMapFromItems(this._pendingSelectedJobs);
      var nextPendingMap = this._getJobIdMapFromItems(items);
      if (this._selectedIdMapsMatch(nextPendingMap, currentPendingMap)) {
        return;
      }
      this._pendingSelectedJobs = Array.isArray(items) ? items.slice() : [];
      if (!this._started || this._isApplyingPendingSelection) {
        return;
      }
      this._applyPendingSelection();
    },

    startup: function() {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      if (this.jobsData && this.jobsData.length > 0) {
        this.setJobsData(this.jobsData);
      } else {
        this.refresh();
      }
      this._applyPendingSelection();
    }
  });
});


