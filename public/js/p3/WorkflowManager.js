define([
  'dojo/_base/Deferred', 'dojo/topic', 'dojo/request/xhr',
  'dojo/when', 'dojo/_base/lang', 'dojo/store/Memory'
], function (
  Deferred, Topic, xhr,
  When, lang, Memory
) {
  var self = this;
  var TIME_OUT = 30000; // 30s
  var _allWorkflows = [];

  self.filters = {
    status: null,
    keyword: ''
  };

  var _DataStore = new Memory({
    idProperty: 'id',
    data: []
  });

  function getAuthHeader() {
    return (window.App && window.App.authorizationToken) || localStorage.getItem('tokenstring') || '';
  }

  function getUserId() {
    return localStorage.getItem('userid') || '';
  }

  function normalizeStatus(rawStatus) {
    var value = (rawStatus || '').toLowerCase();
    if (value === 'queued' || value === 'init' || value === 'pending') {
      return 'pending';
    }
    if (value === 'in-progress' || value === 'running') {
      return 'running';
    }
    if (value === 'completed' || value === 'complete' || value === 'success' || value === 'succeeded') {
      return 'completed';
    }
    if (value === 'failed' || value === 'error' || value === 'cancelled' || value === 'canceled') {
      return 'failed';
    }
    return value || 'unknown';
  }

  function normalizeWorkflow(workflow) {
    if (!workflow) {
      return null;
    }
    var id = workflow.workflow_id || workflow.id;
    if (!id) {
      return null;
    }
    var status = normalizeStatus(workflow.status);
    var name = workflow.workflow_name || workflow.name || 'Workflow';
    var submittedAt = workflow.submitted_at || workflow.created_at || '';
    var completedAt = workflow.completed_at || '';
    var stepCount = Array.isArray(workflow.steps) ? workflow.steps.length :
      (typeof workflow.step_count === 'number' ? workflow.step_count : '');

    return {
      id: String(id),
      workflow_id: String(id),
      name: name,
      workflow_name: name,
      type: 'workflow',
      status: status,
      raw_status: workflow.status || '',
      submitted_at: submittedAt,
      creation_time: submittedAt,
      completed_at: completedAt,
      step_count: stepCount,
      search_text: [
        String(id),
        name,
        status,
        submittedAt,
        completedAt
      ].join(' ').toLowerCase(),
      raw: workflow
    };
  }

  function buildSummary(items) {
    var summary = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0
    };
    (items || []).forEach(function (item) {
      if (!item || !item.status) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(summary, item.status)) {
        summary[item.status]++;
      }
    });
    return summary;
  }

  function applyFilters(items, filters) {
    var activeFilters = filters || {};
    var keyword = (activeFilters.keyword || '').trim().toLowerCase();
    var status = activeFilters.status || null;

    return (items || []).filter(function (item) {
      if (status && item.status !== status) {
        return false;
      }
      if (keyword && item.search_text.indexOf(keyword) === -1) {
        return false;
      }
      return true;
    });
  }

  function publishStatus() {
    Topic.publish('/WorkflowStatus', buildSummary(_allWorkflows));
  }

  function updateStoreFromCurrentData() {
    var filtered = applyFilters(_allWorkflows, self.filters);
    _DataStore.setData(filtered);
    Topic.publish('/Workflows', { status: 'updated' });
    publishStatus();
  }

  function updateWorkflowsList() {
    if (!getAuthHeader() || !getUserId()) {
      _allWorkflows = [];
      updateStoreFromCurrentData();
      return Deferred.when([]);
    }

    Topic.publish('/Workflows', { status: 'loading' });
    var url = (window.App && window.App.copilotApiURL ? window.App.copilotApiURL : '') + '/get-user-workflows';
    var query = '?user_id=' + encodeURIComponent(getUserId()) + '&limit=1000&offset=0';

    return xhr.get(url + query, {
      headers: {
        Authorization: getAuthHeader()
      },
      handleAs: 'json'
    }).then(function (res) {
      var rows = Array.isArray(res && res.workflows) ? res.workflows : [];
      _allWorkflows = rows.map(normalizeWorkflow).filter(function (item) { return item !== null; });
      _allWorkflows.sort(function (a, b) {
        return Date.parse(b.submitted_at || 0) - Date.parse(a.submitted_at || 0);
      });
      updateStoreFromCurrentData();
      return _allWorkflows;
    }, function (err) {
      Topic.publish('/Workflows', { status: 'failed' });
      Topic.publish('/WorkflowStatus', 'failed');
      return err;
    });
  }

  function pollWorkflows() {
    if (!(window.App && window.App.copilotApiURL)) {
      setTimeout(pollWorkflows, TIME_OUT);
      return;
    }
    var prom = updateWorkflowsList();
    When(prom, function () {
      setTimeout(pollWorkflows, TIME_OUT);
    }, function () {
      setTimeout(pollWorkflows, TIME_OUT);
    });
  }

  Topic.subscribe('/WorkflowFilter', function (filters) {
    self.filters = lang.mixin({}, self.filters, filters || {});
    updateStoreFromCurrentData();
  });

  setTimeout(pollWorkflows, 1000);

  return {
    getStore: function () {
      return _DataStore;
    },
    getWorkflows: function () {
      return updateWorkflowsList();
    },
    getStatus: function () {
      publishStatus();
      return Deferred.when(buildSummary(_allWorkflows));
    },
    refreshWorkflows: function () {
      return updateWorkflowsList();
    }
  };
});

