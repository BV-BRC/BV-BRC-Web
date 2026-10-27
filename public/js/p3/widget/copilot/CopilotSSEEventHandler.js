/**
 * @module p3/widget/copilot/CopilotSSEEventHandler
 * @description Handles SSE (Server-Sent Events) from the Copilot agent orchestrator.
 * Converts SSE events into formatted status messages that can be displayed in the chat.
 * Manages the lifecycle of status messages (create, update, remove).
 *
 * Features:
 * - Single updating status message throughout agent execution
 * - Detailed tool parameter display
 * - Iteration tracking
 * - Automatic cleanup when done
 * - Not persisted to backend (ephemeral session messages)
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/topic',
  './ProgressView'
], function(
  declare, lang, topic, ProgressView
) {

  return declare(null, {

    /** Current status message ID being updated */
    currentStatusMessageId: null,

    /** Reference to the current status message object */
    currentStatusMessage: null,

    /** Agent state tracking */
    agentState: null,

    /** Configuration options */
    config: null,

    /**
     * Constructor - initializes the event handler
     * @param {Object} config - Configuration options
     */
    constructor: function(config) {
      this.config = lang.mixin({
        showQueuedStatus: true,
        showProgressUpdates: true,
        showToolSelection: true,
        showToolResults: true,
        showDuplicateWarnings: true
      }, config || {});

      this.resetState();
    },

    /**
     * Resets agent state for a new query
     */
    resetState: function() {
      this.agentState = {
        currentIteration: 0,
        maxIterations: 10,
        toolsUsed: [],
        currentTool: null,
        currentToolReasoning: null,
        status: 'idle',
        percentage: 0
      };
      this.currentStatusMessageId = null;
      this.currentStatusMessage = null;
      // Structured steps this turn (ProgressView), merged by step_id.
      this.steps = [];
      this.startedAt = null;
    },

    /**
     * Main entry point - handles any SSE event
     * @param {string} eventName - The event type
     * @param {Object} eventData - The event data
     * @returns {Object|null} Status message object if one should be created/updated
     */
    handleEvent: function(eventName, eventData) {
      var formatter = this['format_' + eventName];
      if (formatter) {
        return formatter.call(this, eventData);
      }
      console.warn('No formatter for event:', eventName);
      return null;
    },

    /**
     * Creates a new status message object
     * @param {string} content - Message content
     * @param {string} eventType - Original event type
     * @returns {Object} Message object
     */
    createStatusMessage: function(content, eventType) {
      var messageId = 'status_' + Date.now();
      this.currentStatusMessageId = messageId;

      this.currentStatusMessage = {
        role: 'status',
        content: content,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        event_type: eventType,
        is_temporary: true,
        save_chat: false,  // Don't persist to backend
        steps: this.steps.slice(),
        started_at: this.startedAt
      };

      return this.currentStatusMessage;
    },

    /**
     * Updates the current status message
     * @param {string} content - New content
     * @param {string} eventType - Event type that triggered update
     * @returns {Object} Updated message object
     */
    updateStatusMessage: function(content, eventType) {
      if (!this.currentStatusMessage) {
        return this.createStatusMessage(content, eventType);
      }

      this.currentStatusMessage.content = content;
      this.currentStatusMessage.event_type = eventType;
      this.currentStatusMessage.timestamp = new Date().toISOString();
      this.currentStatusMessage.steps = this.steps.slice();
      this.currentStatusMessage.started_at = this.startedAt;

      return this.currentStatusMessage;
    },

    // ==================== Event Formatters ====================

    /**
     * Formats 'queued' event
     */
    format_queued: function(data) {
      if (!this.config.showQueuedStatus) return null;

      this.agentState.status = 'queued';
      var content = (data && data.message)
        ? data.message
        : 'High usage \u2014 responses will be slower.';

      return this.createStatusMessage(content, 'queued');
    },

    /**
     * Formats 'started' event
     */
    format_started: function(data) {
      this.agentState.status = 'processing';
      if (!this.startedAt) {
        this.startedAt = Date.now();
      }
      var content = 'Starting\u2026';

      return this.updateStatusMessage(content, 'started');
    },

    /**
     * Formats 'progress' event: one structured step (step_id, phase,
     * status, label, detail, result, took_ms; see ProgressView) merged into
     * the turn's step list.  A legacy string-only event becomes a transient
     * note so the live line still updates.
     */
    format_progress: function(data) {
      if (!this.config.showProgressUpdates) return null;
      data = data || {};
      if (!this.startedAt) {
        this.startedAt = Date.now();
      }

      var step;
      if (typeof data.step_id === 'string' && typeof data.label === 'string') {
        step = {};
        ['step_id', 'phase', 'status', 'label', 'detail', 'result', 'agent_label',
          'ts_ms', 'took_ms', 'transient', 'tool'].forEach(function(key) {
          if (data[key] !== undefined && data[key] !== null) step[key] = data[key];
        });
      } else {
        step = {
          step_id: 'legacy_' + Date.now(),
          phase: 'note',
          status: 'done',
          label: data.message || 'Processing\u2026',
          transient: true
        };
      }
      this.steps = ProgressView.mergeStep(this.steps, step);

      // Plain-text fallback for anything that reads content.
      var content = step.label;
      if (step.result) {
        content += ' \u2014 ' + step.result;
      }

      return this.updateStatusMessage(content, 'progress');
    },

    /**
     * Formats 'tool_selected' event
     */
    format_tool_selected: function(data) {
      if (!this.config.showToolSelection) return null;

      this.agentState.currentTool = data.tool;
      this.agentState.currentToolReasoning = data.reasoning;
      // Shown through the structured progress steps instead (the routing
      // and agent-start events carry no `tool` and rendered "undefined").
      return null;
    },

    /**
     * Formats 'tool_executed' event
     */
    format_tool_executed: function(data) {
      if (!this.config.showToolResults) return null;

      var tool = data.tool || this.agentState.currentTool;

      // Track tool usage
      this.agentState.toolsUsed.push({
        tool: tool,
        status: data.status
      });
      // Shown through the structured progress steps instead.
      return null;
    },

    /**
     * Formats 'duplicate_detected' event
     */
    format_duplicate_detected: function(data) {
      if (!this.config.showDuplicateWarnings) return null;

      var content = 'Duplicate Action Detected\n';
      content += 'Current Iteration: ' + data.iteration + '\n';
      content += 'Duplicate of Iteration: ' + data.duplicateIteration + '\n';
      content += (data.message || 'Skipping duplicate action');

      return this.updateStatusMessage(content, 'duplicate_detected');
    },

    /**
     * Formats 'forced_finalize' event
     */
    format_forced_finalize: function(data) {
      var content = 'Finalization Forced\n';
      content += 'Reason: ' + (data.reason || 'duplicate_with_data') + '\n';
      content += (data.message || 'Agent has sufficient data to respond');

      return this.updateStatusMessage(content, 'forced_finalize');
    },

    /**
     * Formats 'final_response' event
     * Note: This is handled separately by the streaming logic
     */
    format_final_response: function(data) {
      // Update status to indicate response generation
      var content = 'Generating response...\n';
      content += 'Analysis complete (' + this.agentState.toolsUsed.length + ' tools used)';

      return this.updateStatusMessage(content, 'final_response');
    },

    /**
     * Formats 'done' event
     * Returns null because we want to remove the status message
     */
    format_done: function(data) {
      // Update agent state
      this.agentState.status = 'complete';

      // Create a final summary (displayed briefly before removal)
      var content = 'Complete';
      if (this.agentState.toolsUsed.length > 0) {
        content += ' (' + this.agentState.toolsUsed.length + ' tools used)';
      }

      // Return updated message, but mark for removal
      var message = this.updateStatusMessage(content, 'done');
      message.should_remove = true;  // Signal that this should be removed

      return message;
    },

    /**
     * Formats 'error' event
     */
    format_error: function(data) {
      var content = 'Error\n';
      content += (data.error || 'An error occurred');

      if (data.retry_attempt) {
        content += '\nRetry attempt: ' + data.retry_attempt;
      }

      if (data.will_retry) {
        content += '\nWill retry...';
      }

      return this.updateStatusMessage(content, 'error');
    },

    /**
     * Formats 'content' event (fallback)
     * This is handled by the normal streaming logic
     */
    format_content: function(data) {
      // This is handled separately, return null
      return null;
    },

    /**
     * Formats 'query_progress' event
     * Displays real-time pagination progress for query operations
     */
    format_query_progress: function(data) {
      var current = data.current || 0;
      var total = data.total || 0;
      var percentage = Math.round(data.percentage || 0);
      var collection = data.collection || '';

      var content;
      if (current === 0 && collection) {
        content = 'Querying ' + collection.replace(/_/g, ' ') + '...';
      } else if (total > 0) {
        content = 'Fetched ' + current + ' of ' + total +
                  ' results (' + percentage + '%)';
      } else {
        content = 'Fetching results...';
      }

      // Optionally include batch number if available
      if (data.batchNumber) {
        content += '\nBatch: ' + data.batchNumber;
      }

      return this.updateStatusMessage(content, 'query_progress');
    },

    /**
     * Formats 'abort_requested' event
     */
    format_abort_requested: function(data) {
      var content = 'Abort requested...';
      if (data && Array.isArray(data.scopes) && data.scopes.length > 0) {
        content += '\nScope: ' + data.scopes.join(', ');
      }
      return this.updateStatusMessage(content, 'abort_requested');
    },

    /**
     * Formats 'query_aborted' event
     */
    format_query_aborted: function(data) {
      var total = data && data.expectedTotal ? data.expectedTotal : 0;
      var current = data && data.totalResults ? data.totalResults : 0;
      var content = 'Query aborted. Partial results were saved.';

      if (total > 0) {
        content += '\nDownloaded: ' + current + ' of ' + total;
      } else if (current > 0) {
        content += '\nDownloaded: ' + current;
      }

      return this.updateStatusMessage(content, 'query_aborted');
    },

    /**
     * Formats 'image_context' event
     * Used to notify users when image analysis is integrated or skipped.
     */
    format_image_context: function(data) {
      var message = data && data.message
        ? data.message
        : 'Image context status updated.';

      if (data && data.skipped === true) {
        message = 'Image note: ' + message;
      }

      return this.updateStatusMessage(message, 'image_context');
    },

    /**
     * Formats 'cancelled' event (from API)
     */
    format_cancelled: function(data) {
      var content = data && data.message ? data.message : 'Job cancelled by user';

      if (data && data.job_id) {
        content += '\nJob ID: ' + data.job_id;
      }

      return this.updateStatusMessage(content, 'cancelled');
    },

    // ==================== Planning Agent Event Formatters ====================

    /**
     * Formats 'ask_questions' event (planning agent clarification questions)
     * Returns null because CopilotApi.js handles this via onData() directly,
     * which creates the assistant message with clarificationData for ChatMessage
     * to render as ClarificationChips.
     */
    format_ask_questions: function(data) {
      return null;
    },

    /**
     * Formats 'execution_blocked' event (gated tool refused in plan mode).
     * Returns null because CopilotApi.js forwards the card via onData()
     * directly; ChatMessage renders it as an ExecutionBlockedCard.
     */
    format_execution_blocked: function(data) {
      return null;
    },

    /**
     * Formats 'plan_created' event (planning agent produced a plan)
     */
    format_plan_created: function(data) {
      return {
        role: 'assistant',
        type: 'plan_created',
        plan: data.plan || {},
        should_remove: false
      };
    },

    /**
     * Formats 'plan_step_started' event
     */
    format_plan_step_started: function(data) {
      topic.publish('CopilotPlanStepUpdate', {
        event: 'started',
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index
      });

      var stepNum = (data.step_index !== undefined ? data.step_index + 1 : '?');
      var content = 'Executing step ' + stepNum + '...';
      if (data.agent) {
        content += ' (**' + data.agent + '** agent)';
      }
      return this.updateStatusMessage(content, 'plan_step_started');
    },

    /**
     * Formats 'plan_step_completed' event
     */
    format_plan_step_completed: function(data) {
      topic.publish('CopilotPlanStepUpdate', {
        event: 'completed',
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index,
        result_summary: data.result_summary,
        agent_result: data.agent_result,
        structured_data: data.structured_data || null,
        step_outputs: data.step_outputs || null
      });

      var doneNum = (data.step_index !== undefined ? data.step_index + 1 : '?');
      return this.updateStatusMessage('Step ' + doneNum + ' done.', 'plan_step_completed');
    },

    /**
     * Formats 'plan_step_blocked' event (D4 Phase 3).
     * The step prepared jobs or groups; the plan pauses until the user
     * answers the question card that arrives with it.
     */
    format_plan_step_blocked: function(data) {
      topic.publish('CopilotPlanStepUpdate', {
        event: 'blocked',
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index,
        summaries: data.summaries || [],
        result_summary: data.result_summary || '',
        step_outputs: data.step_outputs || null
      });

      return {
        role: 'status',
        type: 'plan_step_blocked',
        content: '',
        should_remove: true
      };
    },

    // format_plan_review_ready removed — review steps are no longer used.

    /**
     * Formats 'plan_step_needs_input' event.
     * The delegated agent called ask_clarification — it needs user input
     * before it can finish the current step.  Pauses plan execution.
     */
    format_plan_step_needs_input: function(data) {
      topic.publish('CopilotPlanStepUpdate', {
        event: 'needs_input',
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index,
        question: data.question,
        agent: data.agent
      });

      return {
        role: 'status',
        type: 'plan_step_needs_input',
        content: '',
        should_remove: false
      };
    },

    /**
     * Formats 'plan_step_failed' event
     */
    format_plan_step_failed: function(data) {
      topic.publish('CopilotPlanStepUpdate', {
        event: 'failed',
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index,
        error: data.error
      });

      return {
        role: 'assistant',
        type: 'plan_step_failed',
        should_remove: true
      };
    },

    /**
     * Formats 'plan_workflow_submitted' event.
     * A plan step submitted a long-running workflow to GoWe.
     * Pauses plan execution until the workflow completes.
     */
    format_plan_workflow_submitted: function(data) {
      var submissionIds = data.submission_ids || (data.submission_id ? [data.submission_id] : []);
      var count = submissionIds.length;

      topic.publish('CopilotPlanWorkflowSubmitted', {
        plan_id: data.plan_id,
        step_id: data.step_id,
        step_index: data.step_index,
        workflow_id: data.workflow_id,
        submission_id: data.submission_id,
        submission_ids: submissionIds,
        result_summary: data.result_summary || ''
      });

      return {
        role: 'status',
        type: 'plan_workflow_submitted',
        content: count > 1
          ? count + ' workflows submitted. Waiting for them to complete...'
          : 'Workflow submitted. Waiting for it to complete...',
        should_remove: false
      };
    },

    /**
     * Formats 'workflow_complete' event.
     * A watched workflow reached a terminal state (completed/failed/cancelled).
     * Signals the PlanCard to allow the user to resume plan execution.
     */
    format_workflow_complete: function(data) {
      topic.publish('CopilotWorkflowComplete', {
        // PlanCard matches a waiting step on submission_id; without it a
        // plan resumed only through its 30 s poll (D4 Phase 3).
        submission_id: data.submission_id || null,
        workflow_id: data.workflow_id,
        workflow_name: data.workflow_name || '',
        status: data.status,
        output_paths: data.output_paths || [],
        steps: data.steps || [],
        message_id: data.message_id || '',
        plan_id: data.plan_id || null,
        step_id: data.step_id || null,
        step_index: data.step_index
      });

      var statusText = data.status === 'completed' || data.status === 'succeeded'
        ? 'Workflow completed successfully.'
        : data.status === 'failed'
          ? 'Workflow failed.'
          : 'Workflow ' + (data.status || 'finished') + '.';

      return {
        role: 'status',
        type: 'workflow_complete',
        content: statusText,
        should_remove: false
      };
    }

  });
});

