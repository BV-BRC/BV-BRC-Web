/**
 * @module p3/widget/copilot/CopilotToolHandler
 * @description A widget class that handles special processing for specific tools in SSE events.
 * Processes tool-specific responses and transforms them as needed.
 *
 * Implementation:
 * - Accepts currentEvent and tool parameters
 * - Handles special cases for specific tools
 * - Returns processed data or null if no special handling needed
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang'
], function(
  declare, lang
) {
  /**
   * @class CopilotToolHandler
   * @description Handles special tool processing for SSE events
   */
  return declare(null, {
    /**
     * Helper function to process workflow manifest tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processWorkflowManifest: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // Finalized workflow responses are often markdown text. If this is clearly
      // not JSON, keep content as-is and let any persisted workflowData/tool_call
      // metadata drive UI rendering.
      if (typeof chunk === 'string') {
        var trimmedChunk = chunk.trim();
        if (!(trimmedChunk.startsWith('{') || trimmedChunk.startsWith('['))) {
          return {
            ...baseData,
            chunk: chunk
          };
        }
      }

      // Diagnostic logging
      console.log('[CopilotToolHandler] _processWorkflowManifest called');
      console.log('[CopilotToolHandler] chunk type:', typeof chunk);

      try {
        let content, parsedChunk;

        // If chunk is already a parsed object, normalize wrappers first.
        if (typeof chunk === 'object' && !chunk.content) {
          var topLevel = chunk || {};
          var payloadSource = (topLevel.result && typeof topLevel.result === 'object' && !Array.isArray(topLevel.result))
            ? topLevel.result
            : topLevel;
          var callInfo = (topLevel.call && typeof topLevel.call === 'object') ? topLevel.call : null;

          // New format from plan_workflow or submit_workflow: {workflow_json: {...}, ...}
          // Also detect plan_workflow payloads by presence of prompt_payload.
          if (payloadSource.workflow_json || payloadSource.prompt_payload) {
            console.log('[CopilotToolHandler] ✓ Path A1: Chunk is new format with workflow_json or prompt_payload');

            // For plan_workflow, the workflow_json contains the actual workflow
            // For submit_workflow, it has execution metadata too
            let workflowData;
            var workflowDescription = payloadSource.workflow_description || null;

            if (payloadSource.workflow_json) {
              // Extract workflow_json and merge with top-level metadata
              workflowData = {
                ...payloadSource.workflow_json,
                workflow_description: workflowDescription || payloadSource.workflow_json.workflow_description || null,
                // Add execution metadata to workflow data (some fields may be undefined for plan_workflow)
                execution_metadata: {
                  workflow_id: payloadSource.workflow_id,
                  status: payloadSource.status,
                  submitted_at: payloadSource.submitted_at,
                  message: payloadSource.message,
                  status_url: payloadSource.status_url,
                  source: payloadSource.source,
                  workflow_description: workflowDescription,
                  // Distinguish between planned and submitted workflows
                  is_planned: !payloadSource.status || payloadSource.status === 'planned',
                  is_submitted: !!(payloadSource.status && payloadSource.status !== 'planned')
                }
              };
            } else {
              // If only prompt_payload exists (or lightweight payload), preserve workflow identity fields.
              workflowData = {
                workflow_id: payloadSource.workflow_id || null,
                workflow_name: payloadSource.workflow_name || 'Planned Workflow',
                status: payloadSource.status || 'planned',
                step_count: payloadSource.step_count || null,
                workflow_description: workflowDescription,
                message: payloadSource.message || 'Workflow planned',
                execution_metadata: {
                  workflow_id: payloadSource.workflow_id || null,
                  status: payloadSource.status || 'planned',
                  message: payloadSource.message,
                  workflow_description: workflowDescription,
                  status_url: payloadSource.status_url || null,
                  is_planned: true,
                  is_submitted: false
                }
              };
            }
            return {
              ...baseData,
              chunk: JSON.stringify(chunk), // Store full response for display
              isWorkflow: true,
              workflowData: workflowData, // Store workflow_json with metadata
              tool_call: callInfo
            };
          }
          // Old format: direct workflow object
          if (payloadSource.workflow_id || payloadSource.steps) {
            console.log('[CopilotToolHandler] ✓ Path A2: Chunk is old format (direct workflow data)');
            return {
              ...baseData,
              chunk: JSON.stringify(chunk), // Store stringified version for display
              isWorkflow: true,
              workflowData: payloadSource, // Use normalized payload
              tool_call: callInfo
            };
          }
        }

        if (typeof chunk === 'object' && chunk.content) {
          console.log('[CopilotToolHandler] ✓ Path B: Chunk is object with .content property');
          // Handle case where chunk is already an object with content property
          let rawContent = chunk.content;
          // Trim whitespace before parsing if it's a string
          let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
          parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
          // Ensure content is always a string for return value
          content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        } else if (typeof chunk === 'string') {
          console.log('[CopilotToolHandler] ✓ Path C: Chunk is a string, will parse as JSON');
          // Handle case where chunk is a JSON string
          content = chunk.trim(); // Trim whitespace
          parsedChunk = JSON.parse(content);
        } else if (typeof chunk === 'object') {
          console.log('[CopilotToolHandler] ✓ Path D: Chunk is generic object, will stringify');
          // Chunk is already a parsed object but without .content property
          content = JSON.stringify(chunk);
          parsedChunk = chunk;
        } else {
          console.warn('[CopilotToolHandler] ✗ Unexpected chunk format:', chunk);
          return null;
        }

        console.log('[CopilotToolHandler] parsedChunk type:', typeof parsedChunk);
        console.log('[CopilotToolHandler] parsedChunk keys:', parsedChunk ? Object.keys(parsedChunk) : 'null');

        // Handle case where parsedChunk has nested structure: {source_tool: ..., content: {workflow data...}}
        // This happens when the SSE sends the full structure as a JSON string
        if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
          console.log('[CopilotToolHandler] ✓ Detected nested structure with source_tool and content');
          parsedChunk = parsedChunk.content; // Use the content object
          console.log('[CopilotToolHandler] ✓ Extracted content, keys:', Object.keys(parsedChunk));
        }

        var parsedTopLevel = (parsedChunk && typeof parsedChunk === 'object') ? parsedChunk : {};
        var parsedPayload = (parsedTopLevel.result && typeof parsedTopLevel.result === 'object' && !Array.isArray(parsedTopLevel.result))
          ? parsedTopLevel.result
          : parsedTopLevel;
        var parsedCallInfo = (parsedTopLevel.call && typeof parsedTopLevel.call === 'object') ? parsedTopLevel.call : null;

        // Handle new format: check if parsedChunk has workflow_json or prompt_payload
        if (parsedPayload && (parsedPayload.workflow_json || parsedPayload.prompt_payload)) {
          console.log('[CopilotToolHandler] ✓ Detected new format with workflow_json or prompt_payload');

          // For plan_workflow, the workflow_json contains the actual workflow
          // For submit_workflow, it has execution metadata too
          let workflowData;
          var parsedWorkflowDescription = parsedPayload.workflow_description || null;

          if (parsedPayload.workflow_json) {
            // Extract workflow_json and merge with top-level metadata
            workflowData = {
              ...parsedPayload.workflow_json,
              workflow_description: parsedWorkflowDescription || parsedPayload.workflow_json.workflow_description || null,
              // Add execution metadata to workflow data (some fields may be undefined for plan_workflow)
              execution_metadata: {
                workflow_id: parsedPayload.workflow_id,
                status: parsedPayload.status,
                submitted_at: parsedPayload.submitted_at,
                message: parsedPayload.message,
                status_url: parsedPayload.status_url,
                source: parsedPayload.source,
                workflow_description: parsedWorkflowDescription,
                // Distinguish between planned and submitted workflows
                is_planned: !parsedPayload.status || parsedPayload.status === 'planned',
                is_submitted: !!(parsedPayload.status && parsedPayload.status !== 'planned')
              }
            };
          } else {
            // If only prompt_payload/light payload exists, preserve workflow identity fields.
            workflowData = {
              workflow_id: parsedPayload.workflow_id || null,
              workflow_name: parsedPayload.workflow_name || 'Planned Workflow',
              status: parsedPayload.status || 'planned',
              step_count: parsedPayload.step_count || null,
              workflow_description: parsedWorkflowDescription,
              message: parsedPayload.message || 'Workflow planned',
              execution_metadata: {
                workflow_id: parsedPayload.workflow_id || null,
                status: parsedPayload.status || 'planned',
                message: parsedPayload.message,
                workflow_description: parsedWorkflowDescription,
                status_url: parsedPayload.status_url || null,
                is_planned: true,
                is_submitted: false
              }
            };
          }
          return {
            ...baseData,
            chunk: content,
            isWorkflow: true,
            workflowData: workflowData, // Store workflow_json with metadata
            tool_call: parsedCallInfo
          };
        }

        return {
          ...baseData,
          chunk: content,
          isWorkflow: true,
          workflowData: parsedPayload, // Store parsed data for easy access
          tool_call: parsedCallInfo
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse workflow chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        return null;
      }
    },

    _parseToolChunk: function(chunk) {
      let content;
      let parsedChunk;

      if (typeof chunk === 'object' && chunk && chunk.content) {
        let rawContent = chunk.content;
        let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
        parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
        content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      } else if (typeof chunk === 'string') {
        content = chunk.trim();
        parsedChunk = JSON.parse(content);
      } else if (typeof chunk === 'object' && chunk) {
        content = JSON.stringify(chunk);
        parsedChunk = chunk;
      } else {
        throw new Error('Unexpected chunk format');
      }

      // Handle nested structure: {source_tool: "...", content: {...}}
      if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
        parsedChunk = parsedChunk.content;
      }

      return {
        content: content,
        parsedChunk: parsedChunk
      };
    },

    _isLikelyJsonString: function(value) {
      if (typeof value !== 'string') {
        return false;
      }
      var trimmed = value.trim();
      return trimmed.startsWith('{') || trimmed.startsWith('[');
    },

    _previewForLog: function(value, maxLength) {
      var limit = typeof maxLength === 'number' ? maxLength : 180;
      if (value === null || value === undefined) {
        return String(value);
      }
      var stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (stringValue.length <= limit) {
        return stringValue;
      }
      return stringValue.substring(0, limit) + '... [truncated ' + stringValue.length + ' chars total]';
    },

    _normalizeWorkspaceBrowsePayload: function(parsedChunk) {
      var topLevel = (parsedChunk && typeof parsedChunk === 'object') ? parsedChunk : {};
      var payloadSource = (topLevel.result && typeof topLevel.result === 'object' && !Array.isArray(topLevel.result))
        ? topLevel.result
        : topLevel;
      var gridPayload = payloadSource && payloadSource.ui_grid ? payloadSource.ui_grid : null;
      var normalized = {
        tool_name: payloadSource && payloadSource.tool_name ? payloadSource.tool_name : 'workspace_browse_tool',
        result_type: payloadSource && payloadSource.result_type ? payloadSource.result_type : 'list_result',
        count: payloadSource && typeof payloadSource.count === 'number' ? payloadSource.count : null,
        path: payloadSource && payloadSource.path ? payloadSource.path : null,
        source: payloadSource && payloadSource.source ? payloadSource.source : null,
        items: [],
        grid: gridPayload,
        raw: payloadSource,
        call: topLevel && typeof topLevel.call === 'object' ? topLevel.call : null
      };

      if (payloadSource && Array.isArray(payloadSource.items)) {
        normalized.items = payloadSource.items;
      } else if (gridPayload && Array.isArray(gridPayload.items)) {
        normalized.items = gridPayload.items;
      } else if (Array.isArray(payloadSource)) {
        normalized.items = payloadSource;
      }

      if (typeof normalized.count !== 'number') {
        normalized.count = normalized.items.length;
      }

      return normalized;
    },

    _flattenWorkspaceBrowseItems: function(items) {
      if (!Array.isArray(items)) {
        return [];
      }

      var flattened = [];
      for (var i = 0; i < items.length; i++) {
        var item = items[i];

        if (Array.isArray(item)) {
          flattened.push(item);
          continue;
        }

        // Handle nested structure: [{ "/path": [row1, row2, ...] }]
        if (item && typeof item === 'object') {
          for (var key in item) {
            if (item.hasOwnProperty(key) && Array.isArray(item[key])) {
              flattened = flattened.concat(item[key]);
            }
          }
        }
      }

      return flattened;
    },

    _countWorkspaceBrowseItems: function(payload) {
      if (!payload || !Array.isArray(payload.items)) {
        return 0;
      }
      return this._flattenWorkspaceBrowseItems(payload.items).length;
    },

    _formatWorkspaceBrowseSummary: function(payload) {
      var inferredCount = this._countWorkspaceBrowseItems(payload);
      var count = typeof payload.count === 'number' ? payload.count : inferredCount;

      // For search results, count should reflect matching rows, not grouped path entries.
      if (payload && payload.result_type === 'search_result') {
        count = inferredCount;
      }

      var resultLabel = count === 1 ? 'result' : 'results';
      var pathText = payload.path || 'unknown path';
      return 'Found ' + count + ' ' + resultLabel + ' in ' + pathText;
    },

    _createWorkspaceBrowseResultHandlers: function() {
      return {
        list_result: lang.hitch(this, function(payload) {
          return {
            isWorkspaceListing: true,
            workspaceData: {
              path: payload.path || null,
              items: Array.isArray(payload.items) ? payload.items : []
            },
            chatSummary: this._formatWorkspaceBrowseSummary(payload),
            uiPayload: {
              tool_name: payload.tool_name,
              result_type: payload.result_type,
              count: payload.count,
              path: payload.path,
              source: payload.source,
              items: payload.items,
              call: payload.call || null
            },
            uiAction: 'open_workspace_tab'
          };
        }),
        search_result: lang.hitch(this, function(payload) {
          return {
            isWorkspaceListing: true,
            workspaceData: {
              path: payload.path || null,
              items: Array.isArray(payload.items) ? payload.items : []
            },
            chatSummary: this._formatWorkspaceBrowseSummary(payload),
            uiPayload: {
              tool_name: payload.tool_name,
              result_type: payload.result_type,
              count: this._countWorkspaceBrowseItems(payload),
              path: payload.path,
              source: payload.source,
              items: payload.items,
              call: payload.call || null
            },
            uiAction: 'open_workspace_tab'
          };
        }),
        metadata_result: lang.hitch(this, function(payload) {
          var metadata = (payload.raw && payload.raw.metadata) || {};
          var fileName = metadata.name || payload.path.split('/').pop() || 'Unknown file';
          var fileType = metadata.type || 'unknown';

          return {
            isWorkspaceListing: false,
            workspaceData: null,
            chatSummary: 'File: ' + fileName + ' (' + fileType + ')',
            uiPayload: {
              tool_name: payload.tool_name,
              result_type: payload.result_type,
              path: payload.path,
              source: payload.source,
              metadata: metadata,
              raw: payload.raw,
              call: payload.call || null
            },
            uiAction: 'show_file_metadata'
          };
        })
      };
    },

    _processWorkspaceBrowseResultType: function(payload) {
      var handlers = this._createWorkspaceBrowseResultHandlers();
      var handler = handlers[payload.result_type];

      if (handler) {
        return handler(payload);
      }

      // Debug breakpoint for unsupported result types

      return {
        isWorkspaceListing: false,
        workspaceData: null,
        chatSummary: 'Workspace browse result type "' + payload.result_type + '" is not yet supported in a dedicated view.',
        uiPayload: {
          tool_name: payload.tool_name,
          result_type: payload.result_type,
          count: payload.count,
          path: payload.path,
          source: payload.source,
          items: payload.items,
          call: payload.call || null
        },
        uiAction: null
      };
    },

    /**
     * Helper function to process workspace browse tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processWorkspaceBrowse: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // If chunk is already a plain text summary (e.g., "Found 1 result in..."),
      // just pass it through without trying to parse as JSON
      if (typeof chunk === 'string' && !chunk.trim().startsWith('{') && !chunk.trim().startsWith('[')) {
        console.log('[CopilotToolHandler] Chunk appears to be pre-formatted summary, passing through');
        return {
          ...baseData,
          chunk: chunk,
          isWorkspaceBrowse: false
        };
      }

      try {
        var parsed = this._parseToolChunk(chunk);
        var normalized = this._normalizeWorkspaceBrowsePayload(parsed.parsedChunk);
        var resultTypeOutput = this._processWorkspaceBrowseResultType(normalized);

        return {
          ...baseData,
          chunk: resultTypeOutput.chatSummary || parsed.content,
          isWorkspaceBrowse: true,
          workspaceBrowseResult: normalized,
          tool_call: normalized.call || null,
          chatSummary: resultTypeOutput.chatSummary,
          uiPayload: resultTypeOutput.uiPayload,
          uiAction: resultTypeOutput.uiAction,
          isWorkspaceListing: resultTypeOutput.isWorkspaceListing,
          workspaceData: resultTypeOutput.workspaceData
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse workspace listing chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        // If parsing fails, treat it as plain text
        return {
          ...baseData,
          chunk: typeof chunk === 'string' ? chunk : JSON.stringify(chunk),
          isWorkspaceBrowse: false
        };
      }
    },

    _extractJobsFromResult: function(parsedChunk) {
      if (!parsedChunk) {
        return [];
      }
      if (parsedChunk.ui_grid && Array.isArray(parsedChunk.ui_grid.items)) {
        return parsedChunk.ui_grid.items;
      }
      if (Array.isArray(parsedChunk.items)) {
        return parsedChunk.items;
      }
      if (Array.isArray(parsedChunk.jobs)) {
        return parsedChunk.jobs;
      }
      if (Array.isArray(parsedChunk.results)) {
        return parsedChunk.results;
      }
      if (Array.isArray(parsedChunk.tasks)) {
        return parsedChunk.tasks;
      }
      if (parsedChunk.data && Array.isArray(parsedChunk.data.items)) {
        return parsedChunk.data.items;
      }
      if (parsedChunk.data && Array.isArray(parsedChunk.data.jobs)) {
        return parsedChunk.data.jobs;
      }
      if (Array.isArray(parsedChunk)) {
        return parsedChunk;
      }
      return [];
    },

    _normalizeJobsPayload: function(parsedChunk) {
      var topLevel = (parsedChunk && typeof parsedChunk === 'object') ? parsedChunk : {};
      var payloadSource = (topLevel.result && typeof topLevel.result === 'object' && !Array.isArray(topLevel.result))
        ? topLevel.result
        : topLevel;
      var jobs = this._extractJobsFromResult(payloadSource).map(function(job) {
        if (!job) {
          return null;
        }
        var id = job.id || job.job_id || job.task_id;
        if (id === null || id === undefined || id === '') {
          return null;
        }
        return {
          id: String(id),
          status: job.status || null,
          application_name: job.application_name || job.app || job.service || null,
          submit_time: job.submit_time || null,
          start_time: job.start_time || null,
          completed_time: job.completed_time || null,
          parameters: job.parameters || null,
          raw: job
        };
      }).filter(function(job) { return job !== null; });

      var payload = {
        jobs: jobs,
        count: (payloadSource && typeof payloadSource.count === 'number') ? payloadSource.count : jobs.length,
        total: (payloadSource && typeof payloadSource.total === 'number') ? payloadSource.total : jobs.length,
        sort_by: payloadSource && (payloadSource.sort_by || payloadSource.sortBy || null),
        sort_dir: payloadSource && (payloadSource.sort_dir || payloadSource.sortDir || null),
        status: payloadSource && payloadSource.status ? payloadSource.status : null,
        service: payloadSource && (payloadSource.service || payloadSource.application_name || null),
        call: topLevel && typeof topLevel.call === 'object' ? topLevel.call : null
      };
      return payload;
    },

    _formatJobsSummary: function(payload) {
      var count = payload && typeof payload.count === 'number' ? payload.count : 0;
      var label = count === 1 ? 'job' : 'jobs';
      var bits = ['Found ' + count + ' ' + label];
      if (payload && payload.sort_by) {
        bits.push('sorted by ' + payload.sort_by + (payload.sort_dir ? ' (' + payload.sort_dir + ')' : ''));
      }
      if (payload && payload.status) {
        bits.push('status: ' + payload.status);
      }
      return bits.join(', ');
    },

    _isNumericOnlyChunk: function(chunk) {
      if (typeof chunk === 'number') {
        return isFinite(chunk);
      }
      if (typeof chunk !== 'string') {
        return false;
      }
      var trimmed = chunk.trim();
      if (!trimmed) {
        return false;
      }
      return /^-?\d+(\.\d+)?$/.test(trimmed);
    },

    _processListJobs: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // A plain numeric chunk (e.g. "0", "2025") can arrive as normal text.
      // Treat it as text, not as jobs payload, to avoid false "Found 0 jobs".
      if (this._isNumericOnlyChunk(chunk)) {
        return {
          ...baseData,
          chunk: typeof chunk === 'string' ? chunk : String(chunk),
          isJobsBrowse: false
        };
      }

      try {
        var parsed = this._parseToolChunk(chunk);
        if (
          typeof parsed.parsedChunk !== 'object' ||
          parsed.parsedChunk === null
        ) {
          return {
            ...baseData,
            chunk: parsed.content,
            isJobsBrowse: false
          };
        }
        var payload = this._normalizeJobsPayload(parsed.parsedChunk);
        var summary = this._formatJobsSummary(payload);
        return {
          ...baseData,
          chunk: summary,
          isJobsBrowse: true,
          jobsBrowseResult: payload,
          tool_call: payload.call || null,
          chatSummary: summary,
          uiPayload: payload,
          uiAction: 'open_jobs_tab'
        };
      } catch (e) {
        return {
          ...baseData,
          chunk: typeof chunk === 'string' ? chunk : JSON.stringify(chunk),
          isJobsBrowse: false
        };
      }
    },

    _isListJobsTool: function(toolId) {
      if (!toolId || typeof toolId !== 'string') {
        return false;
      }
      return toolId === 'bvbrc_server.list_jobs' ||
             toolId === 'bvbrc_server.get_recent_jobs' ||
             toolId.indexOf('list_jobs') !== -1;
    },

    _isQueryCollectionTool: function(toolId) {
      if (!toolId || typeof toolId !== 'string') {
        return false;
      }
      return toolId === 'bvbrc_server.bvbrc_search_data' ||
             toolId === 'bvbrc_server.bvbrc_query_collection' ||
             toolId === 'bvbrc_server.query_collection' ||
             toolId.indexOf('bvbrc_search_data') !== -1 ||
             toolId.indexOf('bvbrc_query_collection') !== -1 ||
             toolId.indexOf('query_collection') !== -1;
    },

    /**
     * Processes a tool-specific event
     * @param {string} currentEvent - The current SSE event type
     * @param {string} tool - The tool name
     * @param {Object} parsed - The parsed event data
     * @returns {Object|null} Processed data or null if no special handling
     */
    processToolEvent: function(currentEvent, tool, parsed) {
      if (this._isQueryCollectionTool(tool)) {
        var eventChunk = parsed ? parsed.chunk : null;
        console.log('[CopilotToolHandler][QueryCollection][processToolEvent] event=' + currentEvent + ', hasChunk=' + !!eventChunk + ', chunkType=' + typeof eventChunk + ', likelyJson=' + this._isLikelyJsonString(eventChunk));
        if (parsed && parsed.call && typeof parsed.call === 'object') {
          console.log('[CopilotToolHandler][QueryCollection][processToolEvent] call.id=' + (parsed.call.id || 'n/a') + ', call.tool=' + (parsed.call.tool || parsed.call.tool_name || 'n/a'));
        }
      }
      // Handle final_response event for workflow tools (plan_workflow and submit_workflow)
      if (currentEvent === 'final_response' &&
          (tool === 'bvbrc_server.plan_workflow' ||
           tool === 'bvbrc_server.submit_workflow') &&
          parsed.chunk) {
        const processed = this._processWorkflowManifest(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }
      // Handle final_response event for workspace browse tool
      if (currentEvent === 'final_response' &&
          tool === 'bvbrc_server.workspace_browse_tool' &&
          parsed.chunk) {
        const processed = this._processWorkspaceBrowse(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }
      // Handle final_response event for query collection tool
      if (currentEvent === 'final_response' &&
          this._isQueryCollectionTool(tool) &&
          parsed.chunk) {
        const processed = this._processQueryCollection(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        // Return original if parsing fails
        return parsed;
      }
      if (currentEvent === 'final_response' &&
          this._isListJobsTool(tool) &&
          parsed.chunk) {
        const processed = this._processListJobs(parsed.chunk, parsed);
        if (processed) {
          return processed;
        }
        return parsed;
      }

      // No special handling needed
      return null;
    },

    /**
     * Helper function to process query collection tool data
     * @param {string|Object} chunk - The JSON string to parse or an object with content
     * @param {Object} baseData - Base data object to extend
     * @returns {Object|null} Processed data or null if parsing fails
     */
    _processQueryCollection: function(chunk, baseData) {
      if (!chunk) {
        return null;
      }

      // Diagnostic logging
      console.log('[CopilotToolHandler] _processQueryCollection called');
      console.log('[CopilotToolHandler] chunk type:', typeof chunk);
      console.log('[CopilotToolHandler] baseData keys:', baseData ? Object.keys(baseData) : []);
      if (baseData && baseData.call && typeof baseData.call === 'object') {
        console.log('[CopilotToolHandler] baseData.call.id:', baseData.call.id || 'n/a');
        console.log('[CopilotToolHandler] baseData.call.tool:', baseData.call.tool || baseData.call.tool_name || 'n/a');
      }
      if (typeof chunk === 'object') {
        console.log('[CopilotToolHandler] chunk keys:', Object.keys(chunk));
        console.log('[CopilotToolHandler] has .content?', 'content' in chunk);
        console.log('[CopilotToolHandler] has .workspace?', 'workspace' in chunk);
        console.log('[CopilotToolHandler] has .summary?', 'summary' in chunk);
      } else if (typeof chunk === 'string') {
        console.log('[CopilotToolHandler] chunk preview:', this._previewForLog(chunk));
      }

      // Some query_collection final responses are LLM-authored markdown summaries.
      // These are not tool JSON payloads, so keep text as-is and log enough context
      // to diagnose routing upstream.
      if (typeof chunk === 'string' && !this._isLikelyJsonString(chunk)) {
        console.warn('[CopilotToolHandler] Query collection chunk is non-JSON text; skipping JSON.parse');
        console.warn('[CopilotToolHandler] Query collection text preview:', this._previewForLog(chunk, 260));
        var textModeCallInfo = (baseData && baseData.call && typeof baseData.call === 'object')
          ? baseData.call
          : ((baseData && baseData.tool_call && typeof baseData.tool_call === 'object') ? baseData.tool_call : null);
        return {
          ...baseData,
          chunk: chunk,
          isQueryCollection: false,
          queryCollectionData: null,
          tool_call: textModeCallInfo
        };
      }

      try {
        let content, parsedChunk;

        // If chunk is already a fully parsed object with workspace and summary, use it directly
        if (typeof chunk === 'object' && !chunk.content && (chunk.workspace || chunk.summary)) {
          console.log('[CopilotToolHandler] ✓ Path A: Chunk is already parsed query collection data');
          var directCallInfo = (chunk.call && typeof chunk.call === 'object')
            ? chunk.call
            : ((baseData && baseData.call && typeof baseData.call === 'object')
            ? baseData.call
            : ((baseData && baseData.tool_call && typeof baseData.tool_call === 'object') ? baseData.tool_call : null));
          return {
            ...baseData,
            chunk: JSON.stringify(chunk), // Store stringified version for display
            isQueryCollection: true,
            queryCollectionData: {
              workspace: chunk.workspace || null,
              summary: chunk.summary || null,
              fileName: chunk.fileName || null,
              fileId: chunk.fileId || null,
              message: chunk.message || null,
              queryParameters: chunk.queryParameters || null,
              rqlQueryUrl: chunk.rqlQueryUrl || chunk.rql_query_url || chunk.queryUrl || chunk.query_url || null,
              nextCursorId: chunk.nextCursorId || null,
              collection: chunk.collection || (chunk.queryParameters && chunk.queryParameters.collection) || null,
              resultRows: Array.isArray(chunk.results) ? chunk.results : []
            },
            tool_call: directCallInfo
          };
        }

        if (typeof chunk === 'object' && chunk.content) {
          console.log('[CopilotToolHandler] ✓ Path B: Chunk is object with .content property');
          // Handle case where chunk is already an object with content property
          let rawContent = chunk.content;
          // Trim whitespace before parsing if it's a string
          let contentToParse = typeof rawContent === 'string' ? rawContent.trim() : rawContent;
          parsedChunk = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;
          // Ensure content is always a string for return value
          content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        } else if (typeof chunk === 'string') {
          console.log('[CopilotToolHandler] ✓ Path C: Chunk is a string, will parse as JSON');
          // Handle case where chunk is a JSON string
          content = chunk.trim(); // Trim whitespace
          parsedChunk = JSON.parse(content);
        } else if (typeof chunk === 'object') {
          console.log('[CopilotToolHandler] ✓ Path D: Chunk is generic object, will stringify');
          // Chunk is already a parsed object but without .content property
          content = JSON.stringify(chunk);
          parsedChunk = chunk;
        } else {
          console.warn('[CopilotToolHandler] ✗ Unexpected chunk format:', chunk);
          return null;
        }

        console.log('[CopilotToolHandler] parsedChunk type:', typeof parsedChunk);
        console.log('[CopilotToolHandler] parsedChunk keys:', parsedChunk ? Object.keys(parsedChunk) : 'null');

        // Handle case where parsedChunk has nested structure: {source_tool: ..., content: {workspace, summary...}}
        // This happens when the SSE sends the full structure as a JSON string
        var parsedTopLevel = (parsedChunk && typeof parsedChunk === 'object') ? parsedChunk : {};
        var parsedCallInfo = (parsedTopLevel.call && typeof parsedTopLevel.call === 'object')
          ? parsedTopLevel.call
          : ((baseData && baseData.call && typeof baseData.call === 'object')
            ? baseData.call
            : ((baseData && baseData.tool_call && typeof baseData.tool_call === 'object') ? baseData.tool_call : null));

        if (parsedChunk && parsedChunk.source_tool && parsedChunk.content) {
          console.log('[CopilotToolHandler] ✓ Detected nested structure with source_tool and content');
          parsedChunk = parsedChunk.content; // Use the content object
          console.log('[CopilotToolHandler] ✓ Extracted content, keys:', Object.keys(parsedChunk));
        }

        // Extract workspace and summary data
        // The parsedChunk has structure: { type: "file_reference", workspace: {...}, summary: {...}, ... }
        var resolvedPayload = (parsedChunk && parsedChunk.result && typeof parsedChunk.result === 'object' && !Array.isArray(parsedChunk.result))
          ? parsedChunk.result
          : parsedChunk;

        let queryCollectionData = {
          workspace: resolvedPayload.workspace || null,
          summary: resolvedPayload.summary || null,
          fileName: resolvedPayload.fileName || null,
          fileId: resolvedPayload.fileId || null,
          message: resolvedPayload.message || null,
          queryParameters: resolvedPayload.queryParameters || null,
          rqlQueryUrl: resolvedPayload.rqlQueryUrl || resolvedPayload.rql_query_url || resolvedPayload.queryUrl || resolvedPayload.query_url || null,
          nextCursorId: resolvedPayload.nextCursorId || null,
          collection: resolvedPayload.collection || (resolvedPayload.queryParameters && resolvedPayload.queryParameters.collection) || null,
          resultRows: Array.isArray(resolvedPayload.results) ? resolvedPayload.results : []
        };

        console.log('[CopilotToolHandler] ✓ Extracted query collection data');
        console.log('[CopilotToolHandler] workspace:', queryCollectionData.workspace);
        console.log('[CopilotToolHandler] summary:', queryCollectionData.summary);

        return {
          ...baseData,
          chunk: content,
          isQueryCollection: true,
          queryCollectionData: queryCollectionData,
          tool_call: parsedCallInfo
        };
      } catch (e) {
        console.error('[CopilotToolHandler] ✗ Failed to parse query collection chunk:', e.message);
        console.error('[CopilotToolHandler] Error stack:', e.stack);
        return null;
      }
    },

    /**
     * Processes message content based on source_tool
     * Applies tool-specific transformations to the content for display in chat messages
     * @param {string} content - The message content
     * @param {string} sourceTool - The source_tool field from the message
     * @returns {Object} Object with processed content and metadata
     */
    processMessageContent: function(content, sourceTool) {
      if (!sourceTool || !content) {
        return { content: content };
      }
      // Handle workflow tools (plan_workflow and submit_workflow)
      if (sourceTool === 'bvbrc_server.plan_workflow' ||
          sourceTool === 'bvbrc_server.submit_workflow') {
        const baseData = { chunk: content };
        const processed = this._processWorkflowManifest(content, baseData);
        if (processed) {
          return {
            content: processed.chunk,
            isWorkflow: processed.isWorkflow,
            workflowData: processed.workflowData
          };
        }
      }

      // Handle workspace browse tool
      if (sourceTool === 'bvbrc_server.workspace_browse_tool') {
        console.log('[CopilotToolHandler] Processing workspace_browse_tool');
        console.log('[CopilotToolHandler] sourceTool:', sourceTool);
        console.log('[CopilotToolHandler] content type:', typeof content);
        console.log('[CopilotToolHandler] content value:', content);

        // If content is already an object with nested structure, extract it
        let contentToProcess = content;
        if (typeof content === 'object' && content.content) {
          console.log('[CopilotToolHandler] Content is object with nested .content, extracting');
          console.log('[CopilotToolHandler] Nested content keys:', Object.keys(content.content));
          console.log('[CopilotToolHandler] Nested content.items:', content.content.items);
          console.log('[CopilotToolHandler] Nested content.path:', content.content.path);
          contentToProcess = content.content;
        }

        const baseData = { chunk: contentToProcess };
        const processed = this._processWorkspaceBrowse(contentToProcess, baseData);
        console.log('[CopilotToolHandler] processed result:', processed);
        if (processed) {
          return {
            content: processed.chunk,
            isWorkspaceBrowse: processed.isWorkspaceBrowse,
            workspaceBrowseResult: processed.workspaceBrowseResult,
            chatSummary: processed.chatSummary,
            uiPayload: processed.uiPayload,
            uiAction: processed.uiAction,
            isWorkspaceListing: processed.isWorkspaceListing,
            workspaceData: processed.workspaceData
          };
        }
      }

      // Handle query collection tool
      if (this._isQueryCollectionTool(sourceTool)) {
        console.log('[CopilotToolHandler] Processing query_collection tool');
        console.log('[CopilotToolHandler] sourceTool:', sourceTool);
        console.log('[CopilotToolHandler] content type:', typeof content);
        console.log('[CopilotToolHandler] content preview:', this._previewForLog(content, 260));
        console.log('[CopilotToolHandler] content likelyJson?:', this._isLikelyJsonString(content));

        // If content is already an object with nested structure, extract it
        let contentToProcess = content;
        if (typeof content === 'object' && content.content) {
          console.log('[CopilotToolHandler] Content is object with nested .content, extracting');
          contentToProcess = content.content;
          console.log('[CopilotToolHandler] Nested content type:', typeof contentToProcess);
          console.log('[CopilotToolHandler] Nested content likelyJson?:', this._isLikelyJsonString(contentToProcess));
        }

        const baseData = { chunk: contentToProcess };
        const processed = this._processQueryCollection(contentToProcess, baseData);
        console.log('[CopilotToolHandler] processed result:', processed);
        console.log('[CopilotToolHandler] processed.chunk type:', processed ? typeof processed.chunk : 'null');
        console.log('[CopilotToolHandler] processed.chunk value:', processed ? processed.chunk : 'null');
        if (processed) {
          var result = {
            content: processed.chunk,
            isQueryCollection: processed.isQueryCollection,
            queryCollectionData: processed.queryCollectionData,
            tool_call: processed.tool_call
          };
          console.log('[CopilotToolHandler] Returning result:', result);
          console.log('[CopilotToolHandler] result.content type:', typeof result.content);
          return result;
        }
      }

      if (this._isListJobsTool(sourceTool)) {
        const baseData = { chunk: content };
        const processed = this._processListJobs(content, baseData);
        if (processed) {
          return {
            content: processed.chunk,
            isJobsBrowse: processed.isJobsBrowse,
            jobsBrowseResult: processed.jobsBrowseResult,
            chatSummary: processed.chatSummary,
            uiPayload: processed.uiPayload,
            uiAction: processed.uiAction
          };
        }
      }

      // No special handling for this tool, return original content
      return { content: content };
    }
  });
});

