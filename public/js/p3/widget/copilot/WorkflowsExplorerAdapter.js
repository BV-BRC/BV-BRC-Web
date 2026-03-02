define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/store/Memory',
  'dojo/request',
  'dgrid/OnDemandGrid',
  'dgrid/Selection',
  'dgrid/extensions/ColumnResizer',
  'dgrid/extensions/ColumnHider',
  'dgrid/extensions/DijitRegistry',
  'dgrid/selector'
], function (
  declare, lang, Memory, request, OnDemandGrid, Selection, ColumnResizer, ColumnHider, DijitRegistry, selector
) {
  return declare([OnDemandGrid, Selection, ColumnResizer, ColumnHider, DijitRegistry], {
    minRowsPerPage: 20,
    maxRowsPerPage: 100,
    bufferRows: 30,
    keepScrollPosition: true,
    loadingMessage: 'Loading workflows...',
    noDataMessage: 'No workflows found',
    selectionMode: 'none',
    allowSelectAll: false,

    workflowData: null,
    _pendingSelectedWorkflows: null,
    _isApplyingPendingSelection: false,
    _loadToken: 0,

    constructor: function(args) {
      this.workflowData = [];
      this._pendingSelectedWorkflows = [];
      this._isApplyingPendingSelection = false;
      this._loadToken = 0;
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
      this.sort = [{ attribute: 'submitted_at', descending: true }];
    },

    _buildColumns: function() {
      return {
        __copilotRowSelect: selector({
          selectorType: 'checkbox',
          label: '',
          sortable: false,
          unhidable: true,
          className: 'workflows-grid-checkbox-col',
          width: '32px',
          minWidth: 32,
          maxWidth: 32
        }),
        status: {
          label: 'Status',
          field: 'status',
          className: 'workflows-grid-status-col'
        },
        workflow_id: {
          label: 'Workflow ID',
          field: 'workflow_id',
          className: 'workflows-grid-id-col'
        },
        workflow_name: {
          label: 'Name',
          field: 'workflow_name',
          className: 'workflows-grid-name-col'
        },
        step_count: {
          label: 'Steps',
          field: 'step_count',
          className: 'workflows-grid-steps-col'
        },
        submitted_at: {
          label: 'Submitted',
          field: 'submitted_at',
          formatter: lang.hitch(this, this._formatDate),
          className: 'workflows-grid-submitted-col'
        },
        completed_at: {
          label: 'Completed',
          field: 'completed_at',
          formatter: lang.hitch(this, this._formatDate),
          className: 'workflows-grid-completed-col'
        }
      };
    },

    _formatDate: function(value) {
      if (!value) return '';
      var date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString();
    },

    _normalizeWorkflow: function(workflow) {
      if (!workflow) return null;
      var workflowId = workflow.workflow_id || workflow.id;
      if (!workflowId) return null;
      return {
        id: String(workflowId),
        workflow_id: String(workflowId),
        workflow_name: workflow.workflow_name || 'Workflow',
        status: workflow.status || '',
        submitted_at: workflow.submitted_at || workflow.created_at || '',
        completed_at: workflow.completed_at || '',
        step_count: Array.isArray(workflow.steps) ? workflow.steps.length : (typeof workflow.step_count === 'number' ? workflow.step_count : ''),
        raw: workflow
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
      if (!Array.isArray(this._pendingSelectedWorkflows) || this._isApplyingPendingSelection) {
        return;
      }
      var selectedIds = this._buildSelectedIdMapFromItems(this._pendingSelectedWorkflows);
      var currentSelectionIds = this._getCurrentSelectedIdMap();
      if (this._selectedIdMapsMatch(selectedIds, currentSelectionIds)) {
        return;
      }
      this._isApplyingPendingSelection = true;
      try {
        if (typeof this.clearSelection === 'function') this.clearSelection();
        this.workflowData.forEach(lang.hitch(this, function(row) {
          if (row && selectedIds[row.id]) {
            this.select(row.id);
          }
        }));
      } finally {
        this._isApplyingPendingSelection = false;
      }
    },

    setWorkflowData: function(workflows) {
      var normalized = [];
      if (Array.isArray(workflows)) {
        workflows.forEach(lang.hitch(this, function(workflow) {
          var row = this._normalizeWorkflow(workflow);
          if (row) normalized.push(row);
        }));
      }
      this.workflowData = normalized;
      if (this.store) this.store.setData(normalized);
      if (this._started) this.refresh();
      this._applyPendingSelection();
    },

    setWorkflowIds: function(workflowIds) {
      var ids = Array.isArray(workflowIds) ? workflowIds.filter(function(id) { return typeof id === 'string' && id.trim().length > 0; }) : [];
      var loadToken = ++this._loadToken;
      var workflowUrl = (window && window.App && window.App.workflow_url) ? window.App.workflow_url : 'https://dev-7.bv-brc.org/api/v1';
      var headers = { 'Accept': 'application/json' };
      if (window && window.App && window.App.authorizationToken) {
        headers.Authorization = window.App.authorizationToken;
      }

      var placeholders = ids.map(function(id) {
        return {
          id: id,
          workflow_id: id,
          workflow_name: 'Loading...',
          status: 'loading',
          step_count: '',
          submitted_at: '',
          completed_at: ''
        };
      });
      this.setWorkflowData(placeholders);

      if (ids.length === 0) {
        return Promise.resolve([]);
      }

      return Promise.all(ids.map(function(id) {
        var url = workflowUrl + '/workflows/' + encodeURIComponent(id);
        return request.get(url, {
          headers: headers,
          handleAs: 'json'
        }).then(function(workflowData) {
          return workflowData;
        }).catch(function() {
          return {
            workflow_id: id,
            workflow_name: 'Unavailable',
            status: 'error',
            step_count: '',
            submitted_at: '',
            completed_at: ''
          };
        });
      })).then(lang.hitch(this, function(rows) {
        if (loadToken !== this._loadToken) {
          return [];
        }
        this.setWorkflowData(rows);
        return rows;
      }));
    },

    getSelectedWorkflows: function() {
      var selected = [];
      var selectionMap = this.selection || {};
      for (var rowId in selectionMap) {
        if (!selectionMap.hasOwnProperty(rowId) || !selectionMap[rowId]) continue;
        var row = this.row(rowId);
        if (row && row.data) selected.push(row.data);
      }
      return selected;
    },

    setSelectedWorkflows: function(items) {
      var currentPendingMap = this._buildSelectedIdMapFromItems(this._pendingSelectedWorkflows);
      var nextPendingMap = this._buildSelectedIdMapFromItems(items);
      if (this._selectedIdMapsMatch(nextPendingMap, currentPendingMap)) {
        return;
      }
      this._pendingSelectedWorkflows = Array.isArray(items) ? items.slice() : [];
      if (!this._started || this._isApplyingPendingSelection) {
        return;
      }
      this._applyPendingSelection();
    },

    startup: function() {
      if (this._started) return;
      this.inherited(arguments);
      if (this.workflowData && this.workflowData.length > 0) {
        this.setWorkflowData(this.workflowData);
      } else {
        this.refresh();
      }
      this._applyPendingSelection();
    }
  });
});

