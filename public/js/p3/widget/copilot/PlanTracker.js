/**
 * PlanTracker -- Sticky progress bar that stays visible at the top of the
 * chat area while a plan is executing.
 *
 * Shows:
 *   - Plan title + step progress (e.g., "Step 2/4")
 *   - Step status dots (completed/running/pending)
 *   - Current step description
 *   - Action button: "Execute Next" / "View Plan" / "Waiting for Review"
 *   - Exit button to abandon the plan
 *
 * Activated by PlanCard via 'CopilotPlanTrackerActivate' topic.
 * Deactivated when plan completes or user exits.
 *
 * This widget does NOT execute plan actions itself -- it publishes the same
 * topics that PlanCard does, so CopilotInput picks them up normally.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/on',
  'dojo/topic',
  'p3/widget/copilot/PlanResultSanitizer'
], function (
  declare, lang, _WidgetBase,
  domConstruct, domClass, domStyle, on, topic, PlanResultSanitizer
) {

  // Compact status indicators
  var DOT_CLASSES = {
    pending: 'plan-tracker-dot-pending',
    running: 'plan-tracker-dot-running',
    completed: 'plan-tracker-dot-completed',
    failed: 'plan-tracker-dot-failed',
    skipped: 'plan-tracker-dot-skipped'
  };

  return declare([_WidgetBase], {

    // --- State ---
    _plan: null,
    _active: false,
    _sessionId: null,
    _completedResults: null,
    _topicHandles: null,
    _paused: false,          // True when waiting for review or user action
    _planCardNode: null,     // DOM reference to scroll to

    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, 'plan-tracker');
      domStyle.set(this.domNode, 'display', 'none');

      this._completedResults = {};
      this._topicHandles = [];

      // Subscribe to plan lifecycle events
      this._topicHandles.push(
        topic.subscribe('CopilotPlanTrackerActivate', lang.hitch(this, '_onActivate'))
      );
      this._topicHandles.push(
        topic.subscribe('CopilotPlanTrackerDeactivate', lang.hitch(this, '_onDeactivate'))
      );

      // Subscribe to step updates (same events PlanCard listens to)
      this._topicHandles.push(
        topic.subscribe('CopilotPlanStepUpdate', lang.hitch(this, '_onStepUpdate'))
      );
      this._topicHandles.push(
        topic.subscribe('CopilotPlanReviewReady', lang.hitch(this, '_onReviewReady'))
      );
      // When review completes, resume tracker
      this._topicHandles.push(
        topic.subscribe('CopilotPlanContinueReview', lang.hitch(this, '_onReviewContinued'))
      );
    },

    // ---------------------------------------------------------------
    // Activation / Deactivation
    // ---------------------------------------------------------------

    /**
     * Activate the tracker for a plan.
     * DISABLED — the PlanTracker bar has been removed from the UI.
     * The PlanCard inline review panel and chat action block now
     * handle all plan interaction points directly.
     */
    _onActivate: function (/* data */) {
      // No-op: tracker bar is disabled.
      return;
    },

    _onDeactivate: function () {
      this._active = false;
      this._plan = null;
      this._planCardNode = null;
      this._completedResults = {};
      this._paused = false;
      domStyle.set(this.domNode, 'display', 'none');
      this.domNode.innerHTML = '';
    },

    // ---------------------------------------------------------------
    // Event handlers
    // ---------------------------------------------------------------

    _onStepUpdate: function (data) {
      if (!this._active || !this._plan) return;
      if (data.plan_id !== this._plan.plan_id) return;

      // Update step status in our local copy
      var steps = this._plan.steps || [];
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].step_id === data.step_id) {
          switch (data.event) {
            case 'started':
              steps[i].status = 'running';
              this._plan.status = 'executing';
              this._paused = false;
              break;
            case 'completed':
              steps[i].status = 'completed';
              steps[i].result_summary = data.result_summary || '';
              if (data.agent_result) {
                this._completedResults[data.step_id] = PlanResultSanitizer.sanitizeResult(
                  data.agent_result,
                  data.structured_data
                );
              }
              break;
            case 'failed':
              steps[i].status = 'failed';
              break;
          }
          break;
        }
      }

      // Check if plan is complete
      var allDone = steps.every(function (s) {
        return s.status === 'completed' || s.status === 'skipped' || s.status === 'failed';
      });
      if (allDone) {
        this._plan.status = 'completed';
        // Auto-deactivate after brief delay so user sees the completed state
        var self = this;
        this._render();
        setTimeout(function () {
          self._onDeactivate();
        }, 3000);
        return;
      }

      this._render();
    },

    _onReviewReady: function (data) {
      if (!this._active || !this._plan) return;
      if (data.plan_id !== this._plan.plan_id) return;
      this._paused = true;
      this._render();
    },

    _onReviewContinued: function (data) {
      if (!this._active || !this._plan) return;
      if (data && data.plan && data.plan.plan_id !== this._plan.plan_id) return;
      this._paused = false;
      this._render();
    },

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    _render: function () {
      if (!this._active || !this._plan) return;
      this.domNode.innerHTML = '';

      var plan = this._plan;
      var steps = plan.steps || [];
      var completedCount = 0;
      var currentStep = null;
      var currentIndex = -1;

      steps.forEach(function (s, idx) {
        if (s.status === 'completed' || s.status === 'skipped') completedCount++;
        if (!currentStep && (s.status === 'running' || s.status === 'pending')) {
          currentStep = s;
          currentIndex = idx;
        }
      });

      // If all steps done but we haven't deactivated yet, find the last step
      if (!currentStep && steps.length > 0) {
        currentStep = steps[steps.length - 1];
        currentIndex = steps.length - 1;
      }

      // --- Left section: title + progress ---
      var left = domConstruct.create('div', {
        'class': 'plan-tracker-left'
      }, this.domNode);

      domConstruct.create('span', {
        'class': 'plan-tracker-title',
        innerHTML: this._truncate(plan.title || 'Plan', 30)
      }, left);

      domConstruct.create('span', {
        'class': 'plan-tracker-progress',
        innerHTML: completedCount + '/' + steps.length
      }, left);

      // --- Center section: step dots + current step description ---
      var center = domConstruct.create('div', {
        'class': 'plan-tracker-center'
      }, this.domNode);

      // Step dots
      var dotsContainer = domConstruct.create('div', {
        'class': 'plan-tracker-dots'
      }, center);

      var self = this;
      steps.forEach(function (step, idx) {
        var dotClass = DOT_CLASSES[step.status] || DOT_CLASSES.pending;
        var dot = domConstruct.create('span', {
          'class': 'plan-tracker-dot ' + dotClass,
          title: (idx + 1) + '. ' + (step.description || step.step_id)
        }, dotsContainer);

        // Click on dot scrolls to plan card
        on(dot, 'click', lang.hitch(self, '_scrollToPlanCard'));
      });

      // Current step description
      if (currentStep) {
        var stepLabel = 'Step ' + (currentIndex + 1) + ': ' + this._truncate(currentStep.description || '', 50);
        domConstruct.create('div', {
          'class': 'plan-tracker-step-label',
          innerHTML: stepLabel
        }, center);
      }

      // --- Right section: action button + exit button ---
      var right = domConstruct.create('div', {
        'class': 'plan-tracker-right'
      }, this.domNode);

      // Action button
      if (plan.status === 'completed') {
        domConstruct.create('span', {
          'class': 'plan-tracker-status-text plan-tracker-status-done',
          innerHTML: 'Complete'
        }, right);
      } else if (this._paused) {
        var reviewBtn = domConstruct.create('button', {
          'class': 'plan-tracker-btn plan-tracker-btn-review',
          innerHTML: 'Review Step',
          title: 'Scroll to the review panel'
        }, right);
        on(reviewBtn, 'click', lang.hitch(this, '_scrollToPlanCard'));
      } else if (currentStep && currentStep.status === 'running') {
        domConstruct.create('span', {
          'class': 'plan-tracker-status-text plan-tracker-status-running',
          innerHTML: 'Running...'
        }, right);
      } else if (currentStep && currentStep.status === 'pending') {
        // This shouldn't normally show (auto-advance handles it) but just in case
        var execBtn = domConstruct.create('button', {
          'class': 'plan-tracker-btn plan-tracker-btn-execute',
          innerHTML: 'Execute Next'
        }, right);
        on(execBtn, 'click', lang.hitch(this, '_executeNext'));
      } else if (currentStep && currentStep.status === 'failed') {
        var viewBtn = domConstruct.create('button', {
          'class': 'plan-tracker-btn plan-tracker-btn-review',
          innerHTML: 'View Error',
          title: 'Scroll to the plan card to retry or skip'
        }, right);
        on(viewBtn, 'click', lang.hitch(this, '_scrollToPlanCard'));
      }

      // View plan button (always visible)
      var viewPlanBtn = domConstruct.create('button', {
        'class': 'plan-tracker-btn plan-tracker-btn-view',
        innerHTML: '\u2191 Plan',
        title: 'Scroll to the plan card'
      }, right);
      on(viewPlanBtn, 'click', lang.hitch(this, '_scrollToPlanCard'));

      // Exit button
      var exitBtn = domConstruct.create('button', {
        'class': 'plan-tracker-btn plan-tracker-btn-exit',
        innerHTML: '\u2715',
        title: 'Exit plan — cancel remaining steps'
      }, right);
      on(exitBtn, 'click', lang.hitch(this, '_onExit'));
    },

    // ---------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------

    _scrollToPlanCard: function () {
      // Find the plan card in the result container by class
      var planCards = document.querySelectorAll('.plan-card');
      var targetCard = null;

      // Find the plan card matching our plan_id (check data attribute or just use the latest)
      if (this._planCardNode && this._planCardNode.parentNode) {
        targetCard = this._planCardNode;
      } else if (planCards.length > 0) {
        // Use the last plan card as fallback
        targetCard = planCards[planCards.length - 1];
      }

      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },

    _executeNext: function () {
      if (!this._plan) return;

      // Don't submit if paused (waiting for review) or already running
      if (this._paused) {
        this._scrollToPlanCard();
        return;
      }

      var steps = this._plan.steps || [];

      // Check if any step is already running
      var hasRunning = steps.some(function (s) { return s.status === 'running'; });
      if (hasRunning) return;

      var nextIndex = -1;
      for (var i = 0; i < steps.length; i++) {
        if (steps[i].status === 'pending') {
          nextIndex = i;
          break;
        }
      }

      if (nextIndex >= 0) {
        topic.publish('CopilotPlanExecuteNext', {
          plan: this._plan,
          currentStepIndex: nextIndex,
          completedResults: PlanResultSanitizer.sanitizeCompletedResults(
            this._completedResults
          ),
          sessionId: this._sessionId
        });
      }
    },

    _onExit: function () {
      if (!this._plan) {
        this._onDeactivate();
        return;
      }

      // Mark all remaining pending steps as skipped
      var steps = this._plan.steps || [];
      steps.forEach(function (step) {
        if (step.status === 'pending' || step.status === 'running') {
          step.status = 'skipped';
        }
      });
      this._plan.status = 'completed';

      // Publish exit event so PlanCard can update its display
      topic.publish('CopilotPlanExit', {
        plan: this._plan,
        sessionId: this._sessionId
      });

      this._onDeactivate();
    },

    // ---------------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------------

    _truncate: function (text, maxLen) {
      if (!text) return '';
      if (text.length <= maxLen) return text;
      return text.substring(0, maxLen - 1) + '\u2026';
    },

    destroy: function () {
      if (this._topicHandles) {
        this._topicHandles.forEach(function (h) { h.remove(); });
        this._topicHandles = [];
      }
      this.inherited(arguments);
    }
  });
});
