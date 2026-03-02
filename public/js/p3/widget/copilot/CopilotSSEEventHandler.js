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
  'dojo/_base/lang'
], function(
  declare, lang
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
        save_chat: false  // Don't persist to backend
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

      return this.currentStatusMessage;
    },

    /**
     * Gets the current status message for removal
     * @returns {Object|null} Current status message
     */
    getStatusMessageForRemoval: function() {
      return this.currentStatusMessage;
    },

    // ==================== Event Formatters ====================

    /**
     * Formats 'queued' event
     */
    format_queued: function(data) {
      if (!this.config.showQueuedStatus) return null;

      this.agentState.status = 'queued';
      var content = 'Request queued...';

      return this.createStatusMessage(content, 'queued');
    },

    /**
     * Formats 'started' event
     */
    format_started: function(data) {
      this.agentState.status = 'processing';
      var content = 'Processing started...';

      return this.updateStatusMessage(content, 'started');
    },

    /**
     * Formats 'progress' event
     */
    format_progress: function(data) {
      if (!this.config.showProgressUpdates) return null;

      this.agentState.currentIteration = data.iteration || 0;
      this.agentState.maxIterations = data.max_iterations || 10;
      this.agentState.percentage = data.percentage || 0;
      this.agentState.currentTool = data.tool || null;

      var content = 'Processing: Iteration ' +
                    this.agentState.currentIteration + '/' +
                    this.agentState.maxIterations +
                    ' (' + Math.round(this.agentState.percentage) + '%)';

      if (this.agentState.currentTool) {
        content += '\nStatus: ' + data.status;
      }

      return this.updateStatusMessage(content, 'progress');
    },

    /**
     * Formats 'tool_selected' event
     */
    format_tool_selected: function(data) {
      if (!this.config.showToolSelection) return null;

      this.agentState.currentIteration = data.iteration || this.agentState.currentIteration;
      this.agentState.currentTool = data.tool;
      this.agentState.currentToolReasoning = data.reasoning;

      var content = 'Tool Selected: **' + data.tool + '**\n';
      content += 'Iteration: ' + data.iteration + '\n';

      if (data.reasoning) {
        content += 'Reasoning: ' + data.reasoning + '\n';
      }

      if (data.parameters && Object.keys(data.parameters).length > 0) {
        content += 'Parameters:\n';
        content += '```json\n' + JSON.stringify(data.parameters, null, 2) + '\n```';
      }

      return this.updateStatusMessage(content, 'tool_selected');
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
        iteration: data.iteration,
        status: data.status
      });

      var content = '';

      if (data.status === 'success') {
        content = 'Tool Executed: **' + tool + '** (Success)\n';
        content += 'Iteration: ' + data.iteration + '\n';

        // Show result preview if available
        if (data.result) {
          var resultStr = typeof data.result === 'string'
            ? data.result
            : JSON.stringify(data.result);

          // Truncate long results
          if (resultStr.length > 200) {
            resultStr = resultStr.substring(0, 200) + '...';
          }

          content += 'Result: ' + resultStr;
        }
      } else {
        content = 'Tool Executed: **' + tool + '** (Failed)\n';
        content += 'Iteration: ' + data.iteration + '\n';

        if (data.error) {
          content += 'Error: ' + data.error;
        }
      }

      return this.updateStatusMessage(content, 'tool_executed');
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

      // Create a final summary (optional, can be displayed briefly before removal)
      var content = 'Complete\n';
      content += (data.iterations || this.agentState.currentIteration) + ' iterations\n';
      content += (data.tools_used || this.agentState.toolsUsed.length) + ' tools used';

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

      var content = 'Downloading ' + current + ' of ' + total +
                    ' results (' + percentage + '%)';

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
    }

  });
});

