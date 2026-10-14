(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CopilotPlanResultSanitizer = factory();
  }
}(this, function() {
  var MAX_ANSWER_CHARS = 4000;
  var MAX_SOURCE_ITEMS = 20;
  var MAX_ID_ITEMS = 200;
  var IDENTIFIER_KEYS = [
    'service', 'service_id', 'service_name', 'app', 'app_name',
    'workflow', 'workflow_id', 'workflow_name', 'submission_id',
    'job_id', 'task_id', 'result_id',
    // D4 Phase 3: a plan's next step needs these exactly.
    'submission_ids', 'result_summary'
  ];

  function truncateString(value, maxChars) {
    var suffix = '... [truncated]';
    if (typeof value !== 'string' || value.length <= maxChars) return value;
    return value.substring(0, maxChars - suffix.length) + suffix;
  }

  function sanitizeValue(value, depth) {
    var currentDepth = depth || 0;
    var result;

    if (typeof value === 'string') return truncateString(value, 2000);
    if (value === null || typeof value !== 'object') return value;
    if (currentDepth >= 5) return '[nested value omitted]';
    if (Array.isArray(value)) {
      return value.slice(0, MAX_ID_ITEMS).map(function(item) {
        return sanitizeValue(item, currentDepth + 1);
      });
    }

    result = {};
    Object.keys(value).slice(0, 100).forEach(function(key) {
      result[key] = sanitizeValue(value[key], currentDepth + 1);
    });
    return result;
  }

  function sanitizeStructuredData(structuredData) {
    var result;
    if (!structuredData || typeof structuredData !== 'object' || Array.isArray(structuredData)) {
      return sanitizeValue(structuredData, 0);
    }

    result = sanitizeValue(structuredData, 0);
    Object.keys(structuredData).forEach(function(key) {
      var value = structuredData[key];
      var isIdList = key === 'ids' || /_ids$/.test(key);
      if (isIdList && Array.isArray(value) && value.length > MAX_ID_ITEMS) {
        result[key] = value.slice(0, MAX_ID_ITEMS).map(function(item) {
          return sanitizeValue(item, 1);
        });
        result[key + '_total'] = value.length;
        result[key + '_note'] = 'Showing first ' + MAX_ID_ITEMS + ' of ' + value.length + ' IDs.';
      }
    });
    return result;
  }

  function sanitizeResult(agentResult, structuredDataOverride) {
    var source = agentResult && typeof agentResult === 'object' && !Array.isArray(agentResult)
      ? agentResult
      : {};
    var result = {};
    var structuredData = structuredDataOverride !== undefined
      ? structuredDataOverride
      : source.structured_data;

    if (typeof source.answer === 'string') {
      result.answer = truncateString(source.answer, MAX_ANSWER_CHARS);
    }
    if (source.status !== undefined) {
      result.status = sanitizeValue(source.status, 0);
    }
    if (Array.isArray(source.sources)) {
      result.sources = source.sources.slice(0, MAX_SOURCE_ITEMS).map(function(item) {
        return sanitizeValue(item, 0);
      });
      if (source.sources.length > MAX_SOURCE_ITEMS) {
        result.sources_total = source.sources.length;
      }
    }
    if (structuredData && typeof structuredData === 'object') {
      result.structured_data = sanitizeStructuredData(structuredData);
    }
    // step_outputs (D4 Phase 3) are bounded server-side (<= 200 ids per
    // list); the gateway also merges its stored copy into execute_next.
    if (source.step_outputs && typeof source.step_outputs === 'object' && !Array.isArray(source.step_outputs)) {
      result.step_outputs = sanitizeStructuredData(source.step_outputs);
    }
    IDENTIFIER_KEYS.forEach(function(key) {
      if (source[key] !== undefined) {
        result[key] = sanitizeValue(source[key], 0);
      }
    });
    return result;
  }

  function sanitizeCompletedResults(completedResults) {
    var source = completedResults && typeof completedResults === 'object'
      ? completedResults
      : {};
    var result = {};
    Object.keys(source).forEach(function(stepId) {
      result[stepId] = sanitizeResult(source[stepId]);
    });
    return result;
  }

  return {
    sanitizeResult: sanitizeResult,
    sanitizeCompletedResults: sanitizeCompletedResults
  };
}));
