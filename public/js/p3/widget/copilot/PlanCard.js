/**
 * PlanCard — Interactive plan card widget for the Planning Agent.
 *
 * Three visual modes:
 *   - Display: Shows the plan with steps, agent badges, status icons.
 *     Buttons: Edit Plan, Approve & Execute, Regenerate
 *   - Edit: Steps are draggable, editable, deletable. Add Step button.
 *   - Execution: Steps update in-place with status. Auto-advance between steps.
 *
 * Subscribes to CopilotPlanStepUpdate topic for real-time step status updates.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dijit/_WidgetBase',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/dom-attr',
  'dojo/on',
  'dojo/topic',
  'dojo/query',
  'p3/widget/copilot/PlanResultSanitizer'
], function (
  declare, lang, array, _WidgetBase,
  domConstruct, domClass, domAttr, on, topic, dojoQuery, PlanResultSanitizer
) {

  // Agent badge colors
  var AGENT_COLORS = {
    data: '#3b82f6',
    service: '#22c55e',
    workspace: '#a855f7',
    helpdesk: '#f59e0b',
    analysis: '#ef4444',
    review: '#0ea5e9',
    direct: '#6b7280'
  };

  // Status icons
  var STATUS_ICONS = {
    pending: '\u25CB',     // ○
    running: '\u23F3',     // ⏳
    completed: '\u2705',   // ✅
    needs_input: '\u270B', // ✋
    awaiting_approval: '\u23F8', // ⏸ (D4 Phase 3: the step's question is waiting)
    failed: '\u274C',      // ❌
    skipped: '\u2298'      // ⊘
  };

  return declare([_WidgetBase], {

    plan: null,              // Plan object
    copilotApi: null,        // CopilotApi instance
    sessionId: null,
    containerNode: null,

    // Internal state
    _mode: 'display',        // 'display' | 'edit' | 'executing'
    _paused: false,
    _completedResults: null,  // {step_id: result_data}
    _stepNodes: null,         // Map of step_id -> DOM node
    _topicHandles: null,
    _waitingForWorkflow: null, // DEPRECATED: single-workflow compat; use _waitingForWorkflows
    _waitingForWorkflows: null, // {submission_id: {status: 'active'|'completed'|'failed'}} — batch support
    _waitingStepId: null,     // step_id of the step that submitted workflow(s)
    _waitingStepIndex: null,  // step_index of the step that submitted workflow(s)
    _workflowPollInterval: null, // setInterval handle for polling workflow status
    _needsInputStepIndex: null, // step_index of a step paused for user input

    constructor: function (params) {
      this.plan = params.plan || {};
      this.copilotApi = params.copilotApi || null;
      this.sessionId = params.sessionId || null;
      this._completedResults = PlanResultSanitizer.sanitizeCompletedResults(
        params.completedResults || {}
      );
      this._stepNodes = {};
      this._topicHandles = [];

      // Restore workflow waiting state from persisted plan data.
      // Polling will be started in postCreate after topics are subscribed.
      if (this.plan._waitingForWorkflows) {
        // New batch format: {submission_id: {status: 'active'|'completed'|'failed'}}
        this._waitingForWorkflows = this.plan._waitingForWorkflows;
        this._waitingStepId = this.plan._waitingStepId || null;
        this._waitingStepIndex = this.plan._waitingStepIndex != null ? this.plan._waitingStepIndex : null;
        this._paused = true;
      } else if (this.plan._waitingForWorkflow) {
        // Legacy single-workflow format — convert to new batch format
        var legacyWf = this.plan._waitingForWorkflow;
        if (legacyWf.submission_id) {
          this._waitingForWorkflows = {};
          this._waitingForWorkflows[legacyWf.submission_id] = { status: 'active' };
          this._waitingStepId = legacyWf.step_id || null;
          this._waitingStepIndex = legacyWf.step_index != null ? legacyWf.step_index : null;
          this._paused = true;
        }
        // Also set legacy field for backward compat during transition
        this._waitingForWorkflow = legacyWf;
      }
      this._workflowPollInterval = null;

      // Restore needs_input state from persisted plan data.
      if (this.plan._needsInputStepIndex != null) {
        this._needsInputStepIndex = this.plan._needsInputStepIndex;
        this._paused = true;
      }
      // A step paused on its Yes / No / Other question stays paused.
      if ((this.plan.steps || []).some(function (s) { return s.status === 'awaiting_approval'; })) {
        this._paused = true;
      }

      // Infer initial mode from persisted plan/step statuses.
      // On page reload, steps may already be completed/failed/skipped.
      var planStatus = this.plan.status || 'draft';
      if (planStatus === 'completed') {
        this._mode = 'display';
      } else if (planStatus === 'executing' || planStatus === 'approved') {
        // Plan was mid-execution when page was reloaded.
        // Check if any steps are still pending/running/needs_input.
        var hasActive = (this.plan.steps || []).some(function (s) {
          return s.status === 'pending' || s.status === 'running' || s.status === 'needs_input' ||
            s.status === 'awaiting_approval';
        });
        // If a step was 'running' at persist time, it was interrupted by
        // the reload -- revert it to 'pending' so it can be re-executed.
        (this.plan.steps || []).forEach(function (s) {
          if (s.status === 'running') {
            s.status = 'pending';
          }
        });
        if (hasActive) {
          this._mode = 'executing';
        } else {
          // All steps finished but plan status wasn't updated -- fix it
          this.plan.status = 'completed';
          this._mode = 'display';
        }
      }
    },

    postCreate: function () {
      this.inherited(arguments);

      // Subscribe to step update events
      var handle = topic.subscribe('CopilotPlanStepUpdate', lang.hitch(this, '_onStepUpdate'));
      this._topicHandles.push(handle);

      // Subscribe to plan exit events (from PlanTracker)
      var exitHandle = topic.subscribe('CopilotPlanExit', lang.hitch(this, '_onPlanExit'));
      this._topicHandles.push(exitHandle);

      // Subscribe to workflow submitted events (pauses plan for long-running workflows)
      var wfSubHandle = topic.subscribe('CopilotPlanWorkflowSubmitted', lang.hitch(this, '_onWorkflowSubmitted'));
      this._topicHandles.push(wfSubHandle);

      // Subscribe to workflow completion events (resumes paused plan)
      var wfCompleteHandle = topic.subscribe('CopilotWorkflowComplete', lang.hitch(this, '_onWorkflowComplete'));
      this._topicHandles.push(wfCompleteHandle);

      // If the plan was mid-execution when the page was reloaded,
      // re-activate the sticky tracker so the user can see progress
      // and resume execution.
      if (this._mode === 'executing') {
        var self = this;
        setTimeout(function () {
          topic.publish('CopilotPlanTrackerActivate', {
            plan: self.plan,
            sessionId: self.sessionId,
            planCardNode: self.domNode,
            completedResults: self._completedResultsForPublish()
          });
        }, 500);  // Small delay to let CopilotDisplay finish mounting
      }

      // If we restored a workflow waiting state from a page reload,
      // start polling for completion now that everything is set up.
      if (this._waitingForWorkflows) {
        this._startWorkflowPoll();
      }
    },

    buildRendering: function () {
      this.domNode = domConstruct.create('div', {
        'class': 'plan-card'
      });
      this._render();
    },

    _render: function () {
      this.domNode.innerHTML = '';
      this._stepNodes = {};

      if (this._mode === 'edit') {
        this._renderEditMode();
      } else {
        this._renderDisplayMode();
      }
    },

    // =========================================================================
    // Display Mode
    // =========================================================================

    _renderDisplayMode: function () {
      var self = this;
      var plan = this.plan;

      // Title bar
      var titleBar = domConstruct.create('div', {
        'class': 'plan-card-title-bar'
      }, this.domNode);

      domConstruct.create('span', {
        'class': 'plan-card-title',
        innerHTML: plan.title || 'Untitled Plan'
      }, titleBar);

      // Status badge
      var statusText = plan.status || 'draft';
      if (this._mode === 'executing') {
        var completedCount = 0;
        (plan.steps || []).forEach(function (s) {
          if (s.status === 'completed' || s.status === 'skipped') completedCount++;
        });
        if (this._waitingForWorkflows) {
          var totalWf = Object.keys(this._waitingForWorkflows).length;
          var doneWf = 0;
          for (var wid in this._waitingForWorkflows) {
            if (this._waitingForWorkflows[wid].status !== 'active') doneWf++;
          }
          statusText = totalWf > 1
            ? 'Waiting for workflows ' + doneWf + '/' + totalWf + ' (' + completedCount + '/' + plan.steps.length + ' steps)'
            : 'Waiting for workflow (' + completedCount + '/' + plan.steps.length + ')';
        } else if (this._workflowCompleteData) {
          statusText = 'Workflow done (' + completedCount + '/' + plan.steps.length + ')';
        } else {
          statusText = 'Executing (' + completedCount + '/' + plan.steps.length + ')';
        }
      }
      domConstruct.create('span', {
        'class': 'plan-card-status plan-card-status-' + (plan.status || 'draft'),
        innerHTML: statusText
      }, titleBar);

      // Steps list
      var stepsList = domConstruct.create('div', {
        'class': 'plan-card-steps'
      }, this.domNode);

      (plan.steps || []).forEach(function (step, idx) {
        self._renderStep(step, idx, stepsList);
      });

      // Action buttons
      var actions = domConstruct.create('div', {
        'class': 'plan-card-actions'
      }, this.domNode);

      if (this._mode === 'executing') {
        // Executing mode buttons
        if (this._waitingForWorkflows) {
          // Waiting for one or more long-running workflows to complete
          var batchTotal = Object.keys(this._waitingForWorkflows).length;
          var batchDone = 0;
          for (var bwid in this._waitingForWorkflows) {
            if (this._waitingForWorkflows[bwid].status !== 'active') batchDone++;
          }
          var waitingMsg = batchTotal > 1
            ? batchDone + '/' + batchTotal + ' workflows complete — waiting for remaining...'
            : 'Workflow running — waiting for completion...';
          domConstruct.create('span', {
            'class': 'plan-card-workflow-waiting',
            innerHTML: waitingMsg
          }, actions);
        } else if (this._workflowCompleteData) {
          // Workflow finished — show Continue button
          var wfStatus = this._workflowCompleteData.status || 'completed';
          var wfLabel = (wfStatus === 'completed' || wfStatus === 'succeeded')
            ? 'Workflow completed'
            : wfStatus === 'failed' ? 'Workflow failed' : 'Workflow ' + wfStatus;

          domConstruct.create('span', {
            'class': 'plan-card-workflow-done plan-card-workflow-' + wfStatus,
            innerHTML: wfLabel + '.'
          }, actions);

          var continueBtn = domConstruct.create('button', {
            'class': 'plan-card-btn plan-card-btn-primary',
            innerHTML: 'Continue Plan'
          }, actions);
          on(continueBtn, 'click', function () {
            self._paused = false;
            self._workflowCompleteData = null;
            self._executeNextPendingStep();
          });
        } else if (!this._paused) {
          var pauseBtn = domConstruct.create('button', {
            'class': 'plan-card-btn plan-card-btn-secondary',
            innerHTML: 'Pause'
          }, actions);
          on(pauseBtn, 'click', function () {
            self._paused = true;
            self._render();
          });
        } else {
          var resumeBtn = domConstruct.create('button', {
            'class': 'plan-card-btn plan-card-btn-primary',
            innerHTML: 'Resume'
          }, actions);
          on(resumeBtn, 'click', function () {
            self._paused = false;
            self._executeNextPendingStep();
          });
        }

        var editRemBtn = domConstruct.create('button', {
          'class': 'plan-card-btn plan-card-btn-secondary',
          innerHTML: 'Edit Remaining Steps'
        }, actions);
        on(editRemBtn, 'click', function () {
          self._mode = 'edit';
          self._render();
        });


      } else {
        // Draft display mode — action buttons are rendered externally
        // as an inline chat action block by ChatMessage.renderPlanCard().
        // No buttons needed here.
      }
    },

    _renderStep: function (step, idx, parentNode) {
      var stepNode = domConstruct.create('div', {
        'class': 'plan-step plan-step-' + (step.status || 'pending'),
        'data-step-id': step.step_id
      }, parentNode);

      this._stepNodes[step.step_id] = stepNode;

      // Status icon
      var icon = STATUS_ICONS[step.status] || STATUS_ICONS.pending;
      domConstruct.create('span', {
        'class': 'plan-step-status-icon',
        innerHTML: icon
      }, stepNode);

      // Step number + description
      var textNode = domConstruct.create('div', {
        'class': 'plan-step-text'
      }, stepNode);

      domConstruct.create('span', {
        'class': 'plan-step-number',
        innerHTML: (idx + 1) + '. '
      }, textNode);

      domConstruct.create('span', {
        'class': 'plan-step-description',
        innerHTML: step.description || ''
      }, textNode);

      // Agent badge
      var agentColor = AGENT_COLORS[step.agent] || AGENT_COLORS.direct;
      domConstruct.create('span', {
        'class': 'plan-step-badge',
        innerHTML: (step.agent || 'unknown').toUpperCase(),
        style: 'background-color: ' + agentColor
      }, stepNode);

      // Dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        domConstruct.create('div', {
          'class': 'plan-step-deps',
          innerHTML: 'depends on: ' + step.depends_on.join(', ')
        }, stepNode);
      }

      // Result summary (for completed steps)
      if (step.status === 'completed' && step.result_summary) {
        var resultDiv = domConstruct.create('div', {
          'class': 'plan-step-result'
        }, stepNode);

        var summary = step.result_summary;
        if (summary.length > 200) {
          summary = summary.substring(0, 200) + '...';
        }
        domConstruct.create('span', {
          innerHTML: summary
        }, resultDiv);
      }

      // Waiting for user input (for needs_input steps)
      if (step.status === 'needs_input') {
        domConstruct.create('div', {
          'class': 'plan-step-needs-input',
          innerHTML: 'Waiting for your reply in the chat below...',
          style: 'color: #b45309; font-size: 12px; margin-top: 4px; font-style: italic;'
        }, stepNode);
      }

      // D4 Phase 3: the step prepared jobs or groups and is waiting for the
      // Yes / No / Other question below.  Skip moves on without them.
      if (step.status === 'awaiting_approval') {
        domConstruct.create('div', {
          'class': 'plan-step-needs-input',
          innerHTML: 'Waiting for your answer to the question below. ' +
            'Yes runs it and the plan continues.',
          style: 'color: #b45309; font-size: 12px; margin-top: 4px; font-style: italic;'
        }, stepNode);
        var awaitActions = domConstruct.create('div', {
          'class': 'plan-step-fail-actions'
        }, stepNode);
        var selfAwait = this;
        var skipAwaitBtn = domConstruct.create('button', {
          'class': 'plan-card-btn plan-card-btn-small plan-card-btn-secondary',
          innerHTML: 'Skip this step'
        }, awaitActions);
        on(skipAwaitBtn, 'click', function () {
          selfAwait._skipStep(step);
        });
      }

      // Error message (for failed steps)
      if (step.status === 'failed') {
        var errorDiv = domConstruct.create('div', {
          'class': 'plan-step-error'
        }, stepNode);

        domConstruct.create('span', {
          innerHTML: step.error_message || 'Step failed'
        }, errorDiv);

        // Retry/Skip buttons for failed steps
        var failActions = domConstruct.create('div', {
          'class': 'plan-step-fail-actions'
        }, stepNode);

        var self = this;
        var retryBtn = domConstruct.create('button', {
          'class': 'plan-card-btn plan-card-btn-small',
          innerHTML: 'Retry'
        }, failActions);
        on(retryBtn, 'click', function () {
          self._retryStep(step, idx);
        });

        var skipBtn = domConstruct.create('button', {
          'class': 'plan-card-btn plan-card-btn-small plan-card-btn-secondary',
          innerHTML: 'Skip'
        }, failActions);
        on(skipBtn, 'click', function () {
          self._skipStep(step);
        });
      }

      // "Edit & Resubmit" button for the last executed step
      if (this._isLastExecutedStep(idx) && this._mode === 'executing') {
        var editResubActions = domConstruct.create('div', {
          'class': 'plan-step-edit-resubmit-actions'
        }, stepNode);

        var self = this;
        var editResubBtn = domConstruct.create('button', {
          'class': 'plan-card-btn plan-card-btn-small plan-card-btn-edit-resubmit',
          innerHTML: '\u270E Edit & Resubmit'
        }, editResubActions);
        on(editResubBtn, 'click', function () {
          self._showEditResubmit(step, idx, stepNode);
        });
      }
    },

    // =========================================================================
    // Edit Mode
    // =========================================================================

    _renderEditMode: function () {
      var self = this;
      var plan = this.plan;

      // Title
      var titleBar = domConstruct.create('div', {
        'class': 'plan-card-title-bar'
      }, this.domNode);

      domConstruct.create('span', {
        'class': 'plan-card-title',
        innerHTML: 'Edit Plan: ' + (plan.title || 'Untitled')
      }, titleBar);

      // Editable steps
      var stepsList = domConstruct.create('div', {
        'class': 'plan-card-steps plan-card-steps-edit'
      }, this.domNode);

      (plan.steps || []).forEach(function (step, idx) {
        // Only allow editing pending steps
        if (step.status !== 'pending') {
          // Render completed/running steps as non-editable
          self._renderStep(step, idx, stepsList);
          return;
        }

        var stepNode = domConstruct.create('div', {
          'class': 'plan-step plan-step-editable',
          draggable: 'true',
          'data-step-index': idx
        }, stepsList);

        // Drag handle
        domConstruct.create('span', {
          'class': 'plan-step-drag-handle',
          innerHTML: '\u2261'  // ≡
        }, stepNode);

        // Step number
        domConstruct.create('span', {
          'class': 'plan-step-number',
          innerHTML: (idx + 1) + '. '
        }, stepNode);

        // Editable description
        var descInput = domConstruct.create('input', {
          'class': 'plan-step-edit-input',
          type: 'text',
          value: step.description || ''
        }, stepNode);

        on(descInput, 'change', function () {
          step.description = descInput.value;
        });

        // Agent dropdown
        var agentSelect = domConstruct.create('select', {
          'class': 'plan-step-agent-select'
        }, stepNode);

        ['data', 'service', 'workspace', 'helpdesk', 'analysis', 'review', 'direct'].forEach(function (agentKey) {
          var opt = domConstruct.create('option', {
            value: agentKey,
            innerHTML: agentKey.charAt(0).toUpperCase() + agentKey.slice(1)
          }, agentSelect);
          if (agentKey === step.agent) {
            domAttr.set(opt, 'selected', 'selected');
          }
        });

        on(agentSelect, 'change', function () {
          step.agent = agentSelect.value;
        });

        // Delete button
        var deleteBtn = domConstruct.create('button', {
          'class': 'plan-step-delete-btn',
          innerHTML: '\u2715',  // ✕
          title: 'Delete step'
        }, stepNode);

        on(deleteBtn, 'click', function () {
          plan.steps.splice(idx, 1);
          self._render();
        });
      });

      // Add step button
      var addRow = domConstruct.create('div', {
        'class': 'plan-card-add-step'
      }, this.domNode);

      var addBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-secondary',
        innerHTML: '+ Add Step'
      }, addRow);

      on(addBtn, 'click', function () {
        plan.steps.push({
          step_id: 'step_' + (plan.steps.length + 1),
          description: '',
          agent: 'data',
          reasoning: 'User-added step',
          depends_on: [],
          status: 'pending'
        });
        self._render();
      });

      // Save / Cancel buttons
      var actions = domConstruct.create('div', {
        'class': 'plan-card-actions'
      }, this.domNode);

      var saveBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-primary',
        innerHTML: 'Save Changes'
      }, actions);
      on(saveBtn, 'click', function () {
        self._mode = (plan.status === 'executing') ? 'executing' : 'display';
        self._render();
        if (self.onEditDone) { self.onEditDone(); }
        // Publish edit event
        topic.publish('CopilotPlanEdited', {
          plan: self.plan,
          sessionId: self.sessionId
        });
      });

      var cancelBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-secondary',
        innerHTML: 'Cancel'
      }, actions);
      on(cancelBtn, 'click', function () {
        self._mode = (plan.status === 'executing') ? 'executing' : 'display';
        self._render();
        if (self.onEditDone) { self.onEditDone(); }
      });
    },

    // =========================================================================
    // Step Update Handler (from SSE events via topic)
    // =========================================================================

    _onStepUpdate: function (data) {
      if (!data || data.plan_id !== this.plan.plan_id) return;

      var step = this._findStep(data.step_id);
      if (!step) return;

      switch (data.event) {
        case 'started':
          step.status = 'running';
          // Ensure the PlanTracker is activated on first step execution.
          // Covers cases where execution starts without _approvePlan
          // (e.g. backend auto-execution or session restoration).
          if (this._mode !== 'executing') {
            topic.publish('CopilotPlanTrackerActivate', {
              plan: this.plan,
              sessionId: this.sessionId,
              planCardNode: this.domNode,
              completedResults: this._completedResultsForPublish()
            });
          }
          this._mode = 'executing';
          this.plan.status = 'executing';
          break;

        case 'completed':
          // Yes on a step's question completes it: the plan resumes.
          if (step.status === 'awaiting_approval') {
            this._paused = false;
          }
          step.status = 'completed';
          step.result_summary = data.result_summary || '';
          if (data.agent_result) {
            this._storeCompletedResult(
              data.step_id,
              data.agent_result,
              data.structured_data,
              data.step_outputs
            );
          }
          // Auto-advance to next step if not paused
          if (!this._paused) {
            var self = this;
            // Check if the next step is a review step -- don't auto-advance
            // into review steps (the plan_review_ready event will handle it)
            var nextPending = null;
            for (var j = 0; j < this.plan.steps.length; j++) {
              if (this.plan.steps[j].status === 'pending') {
                nextPending = this.plan.steps[j];
                break;
              }
            }
            if (nextPending && nextPending.agent === 'review') {
              // Still auto-advance -- the review step will trigger
              // plan_review_ready which will pause execution
            }
            setTimeout(function () {
              self._executeNextPendingStep();
            }, 1000);
          }
          break;

        case 'needs_input':
          step.status = 'needs_input';
          step.question = data.question || '';
          // Pause auto-advancement — we need the user's answer.
          // The question text appears as a normal chat message (via
          // synthesis).  The user replies in the chat input, which
          // triggers re-execution of this same step.
          this._paused = true;
          this._needsInputStepIndex = data.step_index;
          // Persist on plan object so it survives page reload
          this.plan._needsInputStepIndex = data.step_index;
          break;

        case 'blocked':
          // D4 Phase 3: the step prepared jobs or groups under the plan
          // gate.  Pause until the user answers the question below it.
          step.status = 'awaiting_approval';
          step.result_summary = data.result_summary || step.result_summary || '';
          this._paused = true;
          break;

        case 'failed':
          step.status = 'failed';
          step.error_message = data.error || 'Step failed';
          break;
      }

      // Check if all steps are done (needs_input is NOT done)
      var allDone = this.plan.steps.every(function (s) {
        return s.status === 'completed' || s.status === 'skipped' || s.status === 'failed';
      });
      if (allDone) {
        this.plan.status = 'completed';
        this._mode = 'display';
      }

      // Persist step status to MongoDB so progress survives page reload
      this._persistPlanState();

      this._render();
    },

    // =========================================================================
    // Plan Execution
    // =========================================================================

    _approvePlan: function () {
      this.plan.status = 'approved';
      this._mode = 'executing';
      this._render();

      // Activate the sticky plan tracker
      topic.publish('CopilotPlanTrackerActivate', {
        plan: this.plan,
        sessionId: this.sessionId,
        planCardNode: this.domNode,
        completedResults: this._completedResultsForPublish()
      });

      topic.publish('CopilotPlanApproved', {
        plan: this.plan,
        sessionId: this.sessionId
      });
    },

    _executeNextPendingStep: function () {
      // Don't submit if paused (waiting for review)
      if (this._paused) return;

      // Don't submit if a step is already running
      var hasRunning = this.plan.steps.some(function (s) { return s.status === 'running'; });
      if (hasRunning) return;

      var nextStep = null;
      var nextIndex = -1;

      for (var i = 0; i < this.plan.steps.length; i++) {
        if (this.plan.steps[i].status === 'pending') {
          nextStep = this.plan.steps[i];
          nextIndex = i;
          break;
        }
      }

      if (!nextStep) {
        // All steps done
        this.plan.status = 'completed';
        this._mode = 'display';
        this._render();
        return;
      }

      topic.publish('CopilotPlanExecuteNext', {
        plan: this.plan,
        currentStepIndex: nextIndex,
        completedResults: this._completedResultsForPublish(),
        sessionId: this.sessionId
      });
    },

    _retryStep: function (step, idx) {
      step.status = 'pending';
      step.error_message = null;

      topic.publish('CopilotPlanExecuteNext', {
        plan: this.plan,
        currentStepIndex: idx,
        completedResults: this._completedResultsForPublish(),
        sessionId: this.sessionId
      });
    },

    _skipStep: function (step) {
      // Skipping a step that waited on its question resumes the plan.
      if (step.status === 'awaiting_approval') {
        this._paused = false;
      }
      topic.publish('CopilotPlanSkipStep', {
        plan: this.plan,
        stepId: step.step_id,
        completedResults: this._completedResultsForPublish(),
        sessionId: this.sessionId
      });
    },

    /**
     * Handle plan exit from the PlanTracker. The tracker has already
     * marked remaining steps as skipped and set status to completed.
     * We just need to sync our local state and re-render.
     */
    _onPlanExit: function (data) {
      if (!data || !data.plan) return;
      if (data.plan.plan_id !== this.plan.plan_id) return;

      // Sync step statuses from the tracker's copy
      var exitedSteps = data.plan.steps || [];
      for (var i = 0; i < exitedSteps.length; i++) {
        if (i < this.plan.steps.length) {
          this.plan.steps[i].status = exitedSteps[i].status;
        }
      }
      this.plan.status = 'completed';

      // Clear any active workflow state
      this._stopWorkflowPoll();
      this._waitingForWorkflow = null;
      this._waitingForWorkflows = null;
      this._waitingStepId = null;
      this._waitingStepIndex = null;
      this._workflowCompleteData = null;
      delete this.plan._waitingForWorkflow;
      delete this.plan._waitingForWorkflows;
      delete this.plan._waitingStepId;
      delete this.plan._waitingStepIndex;
      this._paused = false;
      this._mode = 'display';

      // Persist final state to MongoDB
      this._persistPlanState();

      this._render();
    },

    // =========================================================================
    // Workflow waiting (pause / resume for long-running workflows)
    // =========================================================================

    /**
     * Called when a plan step submits a long-running workflow.
     * Pauses plan execution and shows a "waiting" indicator.
     */
    _onWorkflowSubmitted: function (data) {
      if (!data || !data.plan_id) return;
      if (data.plan_id !== (this.plan.plan_id || this.plan.plan_name)) return;

      var submissionIds = data.submission_ids || (data.submission_id ? [data.submission_id] : []);
      if (submissionIds.length === 0) return;

      console.log('[PlanCard] Workflow(s) submitted, pausing plan', {
        count: submissionIds.length,
        submission_ids: submissionIds
      });

      // Build the batch tracking map
      this._waitingForWorkflows = {};
      for (var i = 0; i < submissionIds.length; i++) {
        this._waitingForWorkflows[submissionIds[i]] = { status: 'active' };
      }
      this._waitingStepId = data.step_id;
      this._waitingStepIndex = data.step_index;
      this._paused = true;

      // Also set legacy field for backward compat
      this._waitingForWorkflow = {
        submission_id: submissionIds[0],
        workflow_id: data.workflow_id,
        step_id: data.step_id,
        step_index: data.step_index
      };

      // Persist the waiting state so it survives page reload
      this.plan._waitingForWorkflows = this._waitingForWorkflows;
      this.plan._waitingStepId = this._waitingStepId;
      this.plan._waitingStepIndex = this._waitingStepIndex;
      this.plan._waitingForWorkflow = this._waitingForWorkflow;
      this._persistPlanState();

      // Start polling for workflow completion
      this._startWorkflowPoll();

      this._render();
    },

    /**
     * Called when a watched workflow reaches a terminal state.
     * Unpauses the plan and shows a "Continue Plan" button.
     */
    _onWorkflowComplete: function (data) {
      if (!data || !this._waitingForWorkflows) return;

      // Match by submission_id against our tracked set
      var matchId = null;
      if (data.submission_id && this._waitingForWorkflows[data.submission_id]) {
        matchId = data.submission_id;
      }
      if (!matchId) return;

      var completedStatus = (data.status === 'failed') ? 'failed' : 'completed';
      this._waitingForWorkflows[matchId].status = completedStatus;

      console.log('[PlanCard] Workflow completed: ' + matchId + ' (' + completedStatus + ')');

      // Check if all workflows are done
      var allDone = true;
      var totalCount = 0;
      var doneCount = 0;
      for (var sid in this._waitingForWorkflows) {
        totalCount++;
        if (this._waitingForWorkflows[sid].status === 'active') {
          allDone = false;
        } else {
          doneCount++;
        }
      }

      console.log('[PlanCard] Batch progress: ' + doneCount + '/' + totalCount);

      if (allDone) {
        // All workflows finished — stop polling, show Continue button
        this._stopWorkflowPoll();

        // Store the workflow result for the step
        if (this._waitingStepId) {
          this._storeCompletedResult(this._waitingStepId, data);
        }

        // Clear waiting state but keep paused — let the user click "Continue"
        this._workflowCompleteData = data;
        this._waitingForWorkflows = null;
        this._waitingForWorkflow = null;
        delete this.plan._waitingForWorkflows;
        delete this.plan._waitingStepId;
        delete this.plan._waitingStepIndex;
        delete this.plan._waitingForWorkflow;
      } else {
        // Persist intermediate progress
        this.plan._waitingForWorkflows = this._waitingForWorkflows;
      }

      this._persistPlanState();
      this._render();
    },

    /**
     * Start polling the gateway for workflow watch status.
     * Called when entering _waitingForWorkflow state.
     */
    _startWorkflowPoll: function () {
      this._stopWorkflowPoll();  // Clear any existing interval

      if (!this._waitingForWorkflows) {
        return;
      }
      if (!this.copilotApi) {
        console.warn('[PlanCard] No copilotApi — cannot poll for workflow status');
        return;
      }

      var self = this;
      var pollIntervalMs = 30000;  // 30 seconds
      var activeIds = Object.keys(this._waitingForWorkflows);

      console.log('[PlanCard] Starting workflow status poll', {
        count: activeIds.length,
        pollIntervalMs: pollIntervalMs
      });

      this._workflowPollInterval = setInterval(function () {
        if (!self._waitingForWorkflows) {
          self._stopWorkflowPoll();
          return;
        }

        // Poll each still-active submission
        Object.keys(self._waitingForWorkflows).forEach(function (subId) {
          if (self._waitingForWorkflows[subId].status !== 'active') return;

          self.copilotApi.checkWorkflowWatchStatus(subId).then(function (watch) {
            if (!watch || !watch.status) return;

            // Terminal states: watch.status is "completed" or "failed"
            if (watch.status === 'completed' || watch.status === 'failed') {
              console.log('[PlanCard] Workflow poll detected completion', {
                submission_id: subId,
                status: watch.status
              });

              // Synthesize a workflow_complete event for _onWorkflowComplete
              self._onWorkflowComplete({
                workflow_id: watch.workflow_id || '',
                submission_id: watch.submission_id || subId,
                status: watch.gowe_state ? watch.gowe_state.toLowerCase() : watch.status,
                completed_at: watch.completed_at,
                plan_id: watch.plan_id || null,
                step_id: watch.step_id || null,
                step_index: watch.step_index
              });
            }
          }).catch(function (err) {
            // Don't stop polling on transient errors
            console.warn('[PlanCard] Workflow poll error for ' + subId + ' (will retry)', err);
          });
        });
      }, pollIntervalMs);
    },

    /**
     * Stop the workflow status polling interval.
     */
    _stopWorkflowPoll: function () {
      if (this._workflowPollInterval) {
        clearInterval(this._workflowPollInterval);
        this._workflowPollInterval = null;
      }
    },

    // =========================================================================
    // Edit & Resubmit
    // =========================================================================

    /**
     * Check if the step at `idx` is the last completed or failed step
     * (i.e., the most recently executed step).
     */
    _isLastExecutedStep: function (idx) {
      var steps = this.plan.steps || [];
      var lastExecutedIdx = -1;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].status === 'completed' || steps[i].status === 'failed') {
          lastExecutedIdx = i;
        }
      }
      return idx === lastExecutedIdx && lastExecutedIdx >= 0;
    },

    /**
     * Show an inline editor below the step for editing its description
     * and resubmitting.
     */
    _showEditResubmit: function (step, idx, stepNode) {
      // Prevent opening multiple editors
      if (this._editResubmitNode) {
        domConstruct.destroy(this._editResubmitNode);
        this._editResubmitNode = null;
      }

      var self = this;
      var editor = domConstruct.create('div', {
        'class': 'plan-step-edit-resubmit-editor'
      }, stepNode);
      this._editResubmitNode = editor;

      domConstruct.create('label', {
        'class': 'plan-step-edit-resubmit-label',
        innerHTML: 'Edit the prompt for this step:'
      }, editor);

      var textarea = domConstruct.create('textarea', {
        'class': 'plan-step-edit-resubmit-textarea',
        value: step.description || '',
        rows: 3
      }, editor);

      var btnRow = domConstruct.create('div', {
        'class': 'plan-step-edit-resubmit-btns'
      }, editor);

      var submitBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-small plan-card-btn-primary',
        innerHTML: 'Resubmit'
      }, btnRow);
      on(submitBtn, 'click', function () {
        var newDesc = textarea.value.trim();
        if (!newDesc) return;
        self._submitEditResubmit(step, idx, newDesc);
      });

      var cancelBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-small plan-card-btn-secondary',
        innerHTML: 'Cancel'
      }, btnRow);
      on(cancelBtn, 'click', function () {
        domConstruct.destroy(editor);
        self._editResubmitNode = null;
      });

      // Focus the textarea
      setTimeout(function () { textarea.focus(); }, 50);
    },

    /**
     * Submit the edited step: update description, reset status, and
     * publish a topic so CopilotInput re-executes this step.
     */
    _submitEditResubmit: function (step, idx, newDescription) {
      // Update the step in the plan
      step.description = newDescription;
      step.status = 'pending';
      step.error_message = null;
      step.result_summary = null;

      // Remove completed result for this step so the agent re-executes it
      delete this._completedResults[step.step_id];

      // Clean up the editor
      if (this._editResubmitNode) {
        domConstruct.destroy(this._editResubmitNode);
        this._editResubmitNode = null;
      }

      // Persist the updated plan to MongoDB
      this._persistPlanState();

      // Re-render to reflect the updated step
      this._render();

      // Publish topic to execute the step with the new description
      topic.publish('CopilotPlanEditResubmit', {
        plan: this.plan,
        currentStepIndex: idx,
        completedResults: this._completedResultsForPublish(),
        sessionId: this.sessionId,
        editedDescription: newDescription
      });
    },

    // =========================================================================
    // Helpers
    // =========================================================================

    _storeCompletedResult: function (stepId, result, structuredDataOverride, stepOutputs) {
      if (!stepId) return;
      var withOutputs = result;
      if (stepOutputs && typeof result === 'object' && result) {
        withOutputs = lang.mixin({}, result, { step_outputs: stepOutputs });
      }
      this._completedResults[stepId] = PlanResultSanitizer.sanitizeResult(
        withOutputs,
        structuredDataOverride
      );
    },

    _completedResultsForPublish: function () {
      return PlanResultSanitizer.sanitizeCompletedResults(this._completedResults);
    },

    _findStep: function (stepId) {
      for (var i = 0; i < this.plan.steps.length; i++) {
        if (this.plan.steps[i].step_id === stepId) {
          return this.plan.steps[i];
        }
      }
      return null;
    },

    /**
     * Persist current plan state (step statuses, plan status) to MongoDB
     * via the editPlan API. Called after step status changes so that
     * progress survives page reloads.
     *
     * Debounced: rapid successive calls (e.g. step started + completed
     * in quick succession) are collapsed into a single API call.
     */
    _persistPlanState: function () {
      if (!this.copilotApi || !this.plan || !this.plan.plan_id) {
        return;
      }

      // Debounce: wait 500ms for additional changes before persisting
      if (this._persistTimeout) {
        clearTimeout(this._persistTimeout);
      }

      var self = this;
      this._persistTimeout = setTimeout(function () {
        self._persistTimeout = null;
        if (!self.copilotApi || !self.plan) return;

        self.copilotApi.editPlan(
          self.plan.plan_id,
          self.plan,
          self.sessionId
        ).then(
          function () {
            // Silent success -- no need to notify user
          },
          function (err) {
            console.warn('[PlanCard] Failed to persist plan state:', err);
          }
        );
      }, 500);
    },

    destroy: function () {
      this._stopWorkflowPoll();
      if (this._persistTimeout) {
        clearTimeout(this._persistTimeout);
      }
      if (this._editResubmitNode) {
        domConstruct.destroy(this._editResubmitNode);
        this._editResubmitNode = null;
      }
      this._topicHandles.forEach(function (h) {
        h.remove();
      });
      this._topicHandles = [];
      this.inherited(arguments);
    }
  });
});
