/**
 * @module p3/widget/copilot/WorkflowEngine
 * @description Widget that displays workflow JSON data in a visual pipeline view
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/dom-class',
  'dojo/on',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/form/Button',
  './workflowForms/ServiceFormRegistry'
], function(
  declare,
  lang,
  domConstruct,
  domStyle,
  domClass,
  on,
  _WidgetBase,
  _TemplatedMixin,
  Button,
  ServiceFormRegistry
) {
  /**
   * @class WorkflowEngine
   * @description Renders workflow JSON data in a visual pipeline format
   */
  return declare([_WidgetBase, _TemplatedMixin], {

    /** @property {string} templateString - Widget template */
    templateString: '<div class="workflow-engine-container"></div>',

    /** @property {Object|string} workflowData - The workflow JSON data to display */
    workflowData: null,

    /** @property {Object} selectedStep - Currently selected step for detail panel */
    selectedStep: null,

    /** @property {number} selectedStepIndex - Index of currently selected step */
    selectedStepIndex: -1,

    /** @property {DOMNode} detailPanel - Reference to the detail panel DOM node */
    detailPanel: null,

    /** @property {Object} Tracks first and current form states per step */
    stepFormStateByIndex: null,

    /** @property {Object} Reference to CopilotAPI for workflow submission */
    copilotApi: null,

    /** @property {string} Session ID for workflow submission context */
    sessionId: null,

    /**
     * Called after widget creation
     */
    postCreate: function() {
      console.log('[WorkflowEngine] postCreate() called');
      console.log('[WorkflowEngine] Initial workflowData:', this.workflowData);
      this.stepFormStateByIndex = {};
      this.inherited(arguments);
      this.render();
    },

    /**
     * Renders the workflow data
     */
    render: function() {
      console.log('[WorkflowEngine] render() called');
      console.log('[WorkflowEngine] workflowData type:', typeof this.workflowData);
      console.log('[WorkflowEngine] workflowData:', this.workflowData);

      if (!this.workflowData) {
        console.error('[WorkflowEngine] ✗ No workflow data available');
        domConstruct.create('div', {
          innerHTML: '<p>No workflow data available</p>',
          class: 'workflow-empty'
        }, this.domNode);
        return;
      }

      // Parse JSON if it's a string
      var data = this.workflowData;
      if (typeof data === 'string') {
        console.log('[WorkflowEngine] workflowData is a string, attempting to parse JSON');
        try {
          data = JSON.parse(data);
          console.log('[WorkflowEngine] ✓ Successfully parsed JSON');
          console.log('[WorkflowEngine] Parsed data type:', typeof data);
          console.log('[WorkflowEngine] Parsed data keys:', data ? Object.keys(data) : 'null');
        } catch (e) {
          console.error('[WorkflowEngine] ✗ Failed to parse workflow data:', e);
          console.error('[WorkflowEngine] Error details:', e.message, e.stack);
          domConstruct.create('div', {
            innerHTML: '<p>Error: Invalid workflow data</p>',
            class: 'workflow-error'
          }, this.domNode);
          return;
        }
      } else {
        console.log('[WorkflowEngine] workflowData is already an object');
        console.log('[WorkflowEngine] Data keys:', data ? Object.keys(data) : 'null');
      }

      // Log workflow structure
      if (data) {
        console.log('[WorkflowEngine] Workflow structure:');
        console.log('[WorkflowEngine]   - workflow_name:', data.workflow_name);
        console.log('[WorkflowEngine]   - workflow_id:', data.workflow_id);
        console.log('[WorkflowEngine]   - version:', data.version);
        console.log('[WorkflowEngine]   - has steps:', data.steps ? 'yes (' + data.steps.length + ')' : 'no');
        console.log('[WorkflowEngine]   - has base_context:', !!data.base_context);
        console.log('[WorkflowEngine]   - has workflow_outputs:', data.workflow_outputs ? 'yes (' + data.workflow_outputs.length + ')' : 'no');
        console.log('[WorkflowEngine] Full workflow data:', JSON.stringify(data, null, 2));
      }

      // Create visual workflow display
      this.renderWorkflowView(data);
    },

    /**
     * Renders the workflow in a visual pipeline format
     * @param {Object} workflow - Parsed workflow data
     */
    renderWorkflowView: function(workflow) {
      // Create main wrapper with content area and detail panel
      var wrapper = domConstruct.create('div', {
        class: 'workflow-wrapper'
      }, this.domNode);

      // Create main container
      var container = domConstruct.create('div', {
        class: 'workflow-visual-container'
      }, wrapper);

      // Render workflow header
      this.renderWorkflowHeader(workflow, container);

      // Render workflow steps
      this.renderWorkflowSteps(workflow, container);

      // Render workflow outputs
      this.renderWorkflowOutputs(workflow, container);

      // Create detail panel (initially hidden)
      this.renderDetailPanel(wrapper);
    },

    /**
     * Renders the workflow header with metadata
     * @param {Object} workflow - Workflow data
     * @param {DOMNode} container - Parent container
     */
    renderWorkflowHeader: function(workflow, container) {
      console.log('[WorkflowEngine] renderWorkflowHeader() called');
      console.log('[WorkflowEngine] workflow.workflow_name:', workflow.workflow_name);
      console.log('[WorkflowEngine] workflow object keys:', Object.keys(workflow));

      var header = domConstruct.create('div', {
        class: 'workflow-header'
      }, container);

      var workflowName = workflow.workflow_name || 'Untitled Workflow';
      if (!workflow.workflow_name) {
        console.warn('[WorkflowEngine] ⚠ workflow_name is missing, using default "Untitled Workflow"');
        console.warn('[WorkflowEngine] Available workflow properties:', Object.keys(workflow));
      } else {
        console.log('[WorkflowEngine] ✓ Using workflow_name:', workflowName);
      }

      domConstruct.create('div', {
        class: 'workflow-title',
        innerHTML: this.escapeHtml(workflowName)
      }, header);

      var metaContainer = domConstruct.create('div', {
        class: 'workflow-metadata'
      }, header);

      // Display execution metadata if available (from plan_workflow or submit_workflow tools)
      if (workflow.execution_metadata) {
        var execMeta = workflow.execution_metadata;
        if (execMeta.workflow_id) {
          domConstruct.create('div', {
            class: 'workflow-execution-id',
            innerHTML: '<strong>Workflow ID:</strong> ' + this.escapeHtml(execMeta.workflow_id)
          }, metaContainer);
        }
        if (execMeta.status) {
          var statusClass = 'workflow-status workflow-status-' + execMeta.status.toLowerCase();
          domConstruct.create('div', {
            class: statusClass,
            innerHTML: '<strong>Status:</strong> <span class="status-value">' + this.escapeHtml(execMeta.status) + '</span>'
          }, metaContainer);
        }
        if (execMeta.submitted_at) {
          var submittedDate = new Date(execMeta.submitted_at);
          domConstruct.create('div', {
            class: 'workflow-submitted-at',
            innerHTML: '<strong>Submitted:</strong> ' + this.escapeHtml(submittedDate.toLocaleString())
          }, metaContainer);
        }
        if (execMeta.status_url) {
          var statusLink = domConstruct.create('a', {
            href: execMeta.status_url,
            target: '_blank',
            innerHTML: 'View Status',
            class: 'workflow-status-link',
            style: 'color: #0066cc; text-decoration: none; margin-left: 10px;'
          });
          statusLink.onmouseover = function() { this.style.textDecoration = 'underline'; };
          statusLink.onmouseout = function() { this.style.textDecoration = 'none'; };
          domConstruct.create('div', {
            class: 'workflow-status-url',
            style: 'margin-top: 5px;'
          }, metaContainer).appendChild(statusLink);
        }
        if (execMeta.message) {
          domConstruct.create('div', {
            class: 'workflow-message',
            innerHTML: '<strong>Message:</strong> ' + this.escapeHtml(execMeta.message),
            style: 'margin-top: 5px; color: #666;'
          }, metaContainer);
        }
      }

      if (workflow.version) {
        domConstruct.create('span', {
          class: 'workflow-version',
          innerHTML: 'Version: ' + this.escapeHtml(workflow.version)
        }, metaContainer);
      }

      if (workflow.base_context && workflow.base_context.workspace_output_folder) {
        domConstruct.create('div', {
          class: 'workflow-output-folder',
          innerHTML: '<strong>Output Folder:</strong> ' + this.escapeHtml(workflow.base_context.workspace_output_folder)
        }, metaContainer);
      }

      // Add submit button if workflow is not yet submitted
      var isSubmitted = workflow.execution_metadata &&
                       workflow.execution_metadata.is_submitted;
      var isPlanned = workflow.execution_metadata &&
                     workflow.execution_metadata.is_planned;

      if (!isSubmitted || isPlanned) {
        var buttonContainer = domConstruct.create('div', {
          style: 'margin-top: 15px; text-align: left;'
        }, header);

        var submitButton = new Button({
          label: 'Submit',
          type: 'submit',
          onClick: lang.hitch(this, function() {
            this.submitWorkflowForExecution(workflow);
          })
        });
        submitButton.placeAt(buttonContainer);
      }
    },

    /**
     * Renders the workflow steps as a visual pipeline
     * @param {Object} workflow - Workflow data
     * @param {DOMNode} container - Parent container
     */
    renderWorkflowSteps: function(workflow, container) {
      if (!workflow.steps || workflow.steps.length === 0) {
        return;
      }

      var stepsContainer = domConstruct.create('div', {
        class: 'workflow-steps-container'
      }, container);

      domConstruct.create('h3', {
        class: 'workflow-section-title',
        innerHTML: 'Pipeline Steps'
      }, stepsContainer);

      var pipelineContainer = domConstruct.create('div', {
        class: 'workflow-pipeline-grid'
      }, stepsContainer);

      // Render each step as a card
      workflow.steps.forEach(lang.hitch(this, function(step, index) {
        this.renderStep(step, index, pipelineContainer);
      }));
    },

    /**
     * Renders a single workflow step
     * @param {Object} step - Step data
     * @param {number} index - Step index
     * @param {DOMNode} container - Parent container
     */
    renderStep: function(step, index, container) {
      var stepCard = domConstruct.create('div', {
        class: 'workflow-step-card',
        tabindex: 0,
        role: 'button'
      }, container);

      // Add click handler to open detail panel
      stepCard.onclick = lang.hitch(this, function() {
        this.showStepDetails(step, index);
      });

      // Add keyboard support
      stepCard.onkeypress = lang.hitch(this, function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.showStepDetails(step, index);
        }
      });

      // Step number badge
      domConstruct.create('div', {
        class: 'workflow-step-number',
        innerHTML: (index + 1)
      }, stepCard);

      // Step name
      domConstruct.create('div', {
        class: 'workflow-step-name',
        innerHTML: this.escapeHtml(step.step_name || 'Step ' + (index + 1))
      }, stepCard);

      // App name
      domConstruct.create('div', {
        class: 'workflow-step-app',
        innerHTML: this.escapeHtml(step.app)
      }, stepCard);

      // Status (if available from execution metadata)
      if (step.status) {
        domConstruct.create('div', {
          class: 'workflow-step-status workflow-step-status-' + step.status.toLowerCase(),
          innerHTML: '<strong>Status:</strong> ' + this.escapeHtml(step.status)
        }, stepCard);
      }

      // Dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        var depsContainer = domConstruct.create('div', {
          class: 'workflow-step-dependencies'
        }, stepCard);

        domConstruct.create('div', {
          class: 'workflow-step-dependencies-label',
          innerHTML: 'Depends on:'
        }, depsContainer);

        var depsList = domConstruct.create('div', {
          class: 'workflow-dependencies-list'
        }, depsContainer);

        step.depends_on.forEach(lang.hitch(this, function(dep) {
          domConstruct.create('span', {
            class: 'workflow-dependency-badge',
            innerHTML: this.escapeHtml(dep)
          }, depsList);
        }));
      }
    },

    /**
     * Renders a parameter key-value pair
     * @param {string} key - Parameter key
     * @param {*} value - Parameter value
     * @param {DOMNode} container - Parent container
     */
    renderParameter: function(key, value, container) {
      var paramItem = domConstruct.create('div', {
        class: 'workflow-param-item'
      }, container);

      domConstruct.create('span', {
        class: 'workflow-param-key',
        innerHTML: this.escapeHtml(key) + ':'
      }, paramItem);

      var valueStr = this.formatValue(value);
      var isVariable = this.isVariableReference(valueStr);

      domConstruct.create('span', {
        class: 'workflow-param-value' + (isVariable ? ' workflow-variable-ref' : ''),
        innerHTML: this.escapeHtml(valueStr)
      }, paramItem);
    },

    /**
     * Renders an output key-value pair
     * @param {string} key - Output key
     * @param {*} value - Output value
     * @param {DOMNode} container - Parent container
     */
    renderOutput: function(key, value, container) {
      var outputItem = domConstruct.create('div', {
        class: 'workflow-output-item'
      }, container);

      domConstruct.create('span', {
        class: 'workflow-output-key',
        innerHTML: this.escapeHtml(key) + ':'
      }, outputItem);

      var valueStr = this.formatValue(value);
      domConstruct.create('span', {
        class: 'workflow-output-value',
        innerHTML: this.escapeHtml(valueStr)
      }, outputItem);
    },

    /**
     * Renders a connector arrow between steps
     * @param {DOMNode} container - Parent container
     */
    renderStepConnector: function(container) {
      domConstruct.create('div', {
        class: 'workflow-step-connector',
        innerHTML: '→'
      }, container);
    },

    /**
     * Renders the workflow outputs section
     * @param {Object} workflow - Workflow data
     * @param {DOMNode} container - Parent container
     */
    renderWorkflowOutputs: function(workflow, container) {
      if (!workflow.workflow_outputs || workflow.workflow_outputs.length === 0) {
        return;
      }

      var outputsContainer = domConstruct.create('div', {
        class: 'workflow-final-outputs-container'
      }, container);

      domConstruct.create('h3', {
        class: 'workflow-section-title',
        innerHTML: 'Final Workflow Outputs'
      }, outputsContainer);

      var outputsList = domConstruct.create('div', {
        class: 'workflow-final-outputs-list'
      }, outputsContainer);

      workflow.workflow_outputs.forEach(lang.hitch(this, function(output) {
        domConstruct.create('div', {
          class: 'workflow-final-output-item',
          innerHTML: this.escapeHtml(this.formatValue(output))
        }, outputsList);
      }));
    },

    /**
     * Renders the detail panel (initially hidden)
     * @param {DOMNode} wrapper - Parent wrapper
     */
    renderDetailPanel: function(wrapper) {
      this.detailPanel = domConstruct.create('div', {
        class: 'workflow-detail-panel'
      }, wrapper);

      // Panel header
      var header = domConstruct.create('div', {
        class: 'workflow-detail-header'
      }, this.detailPanel);

      // Close button
      var closeBtn = domConstruct.create('button', {
        class: 'workflow-detail-close',
        innerHTML: '&times;',
        title: 'Close'
      }, header);

      closeBtn.onclick = lang.hitch(this, function() {
        this.hideStepDetails();
      });

      // Title
      domConstruct.create('h3', {
        class: 'workflow-detail-title',
        id: 'workflow-detail-title'
      }, header);

      // Navigation buttons
      var navContainer = domConstruct.create('div', {
        class: 'workflow-detail-nav'
      }, header);

      var prevBtn = domConstruct.create('button', {
        class: 'workflow-detail-nav-btn workflow-detail-prev',
        innerHTML: '← Previous',
        title: 'Previous step',
        id: 'workflow-detail-prev-btn'
      }, navContainer);

      prevBtn.onclick = lang.hitch(this, function() {
        this.navigateStep(-1);
      });

      var nextBtn = domConstruct.create('button', {
        class: 'workflow-detail-nav-btn workflow-detail-next',
        innerHTML: 'Next →',
        title: 'Next step',
        id: 'workflow-detail-next-btn'
      }, navContainer);

      nextBtn.onclick = lang.hitch(this, function() {
        this.navigateStep(1);
      });

      // Panel content
      domConstruct.create('div', {
        class: 'workflow-detail-content',
        id: 'workflow-detail-content'
      }, this.detailPanel);
    },

    /**
     * Shows the detail panel for a specific step
     * @param {Object} step - Step data
     * @param {number} index - Step index
     */
    showStepDetails: function(step, index) {
      this.selectedStep = step;
      this.selectedStepIndex = index;

      // Update panel title
      var title = document.getElementById('workflow-detail-title');
      if (title) {
        title.innerHTML = 'Step ' + (index + 1) + ': ' + this.escapeHtml(step.step_name || 'Untitled');
      }

      // Update navigation buttons
      var prevBtn = document.getElementById('workflow-detail-prev-btn');
      var nextBtn = document.getElementById('workflow-detail-next-btn');

      if (prevBtn) {
        prevBtn.disabled = (index === 0);
      }

      if (nextBtn) {
        var totalSteps = this.getParsedWorkflowData().steps.length;
        nextBtn.disabled = (index >= totalSteps - 1);
      }

      // Populate content
      this.populateDetailContent(step, index);

      // Show panel
      if (this.detailPanel) {
        this.detailPanel.classList.add('workflow-detail-panel-open');
      }
    },

    /**
     * Hides the detail panel
     */
    hideStepDetails: function() {
      if (this.detailPanel) {
        this.detailPanel.classList.remove('workflow-detail-panel-open');
      }
      this.selectedStep = null;
      this.selectedStepIndex = -1;
    },

    /**
     * Navigates to the previous or next step
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigateStep: function(direction) {
      var workflow = this.getParsedWorkflowData();
      var newIndex = this.selectedStepIndex + direction;

      if (newIndex >= 0 && newIndex < workflow.steps.length) {
        this.showStepDetails(workflow.steps[newIndex], newIndex);
      }
    },

    /**
     * Populates the detail panel content
     * @param {Object} step - Step data
     * @param {number} index - Step index
     */
    populateDetailContent: function(step, index) {
      var content = document.getElementById('workflow-detail-content');
      if (!content) return;

      // Clear existing content
      domConstruct.empty(content);

      // Step number and app
      var metaSection = domConstruct.create('div', {
        class: 'workflow-detail-section'
      }, content);

      domConstruct.create('div', {
        class: 'workflow-detail-meta-item',
        innerHTML: '<strong>Step Number:</strong> ' + (index + 1)
      }, metaSection);

      domConstruct.create('div', {
        class: 'workflow-detail-meta-item',
        innerHTML: '<strong>Application:</strong> ' + this.escapeHtml(step.app)
      }, metaSection);

      if (step.step_name) {
        domConstruct.create('div', {
          class: 'workflow-detail-meta-item',
          innerHTML: '<strong>Name:</strong> ' + this.escapeHtml(step.step_name)
        }, metaSection);
      }

      // Status
      if (step.status) {
        domConstruct.create('div', {
          class: 'workflow-detail-meta-item workflow-detail-status workflow-detail-status-' + step.status.toLowerCase(),
          innerHTML: '<strong>Status:</strong> ' + this.escapeHtml(step.status)
        }, metaSection);
      }

      // Dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        var depsSection = domConstruct.create('div', {
          class: 'workflow-detail-section'
        }, content);

        domConstruct.create('h4', {
          class: 'workflow-detail-section-title',
          innerHTML: 'Dependencies'
        }, depsSection);

        var depsList = domConstruct.create('div', {
          class: 'workflow-detail-deps-list'
        }, depsSection);

        step.depends_on.forEach(lang.hitch(this, function(dep) {
          domConstruct.create('div', {
            class: 'workflow-detail-dep-item',
            innerHTML: this.escapeHtml(dep)
          }, depsList);
        }));
      }

      // Parameters
      if (step.params && Object.keys(step.params).length > 0) {
        var paramsSection = domConstruct.create('div', {
          class: 'workflow-detail-section'
        }, content);

        domConstruct.create('h4', {
          class: 'workflow-detail-section-title',
          innerHTML: 'Parameters'
        }, paramsSection);
        this.renderEditableParams(step, index, paramsSection);
      }

      // Outputs
      if (step.outputs && Object.keys(step.outputs).length > 0) {
        var outputsSection = domConstruct.create('div', {
          class: 'workflow-detail-section'
        }, content);

        domConstruct.create('h4', {
          class: 'workflow-detail-section-title',
          innerHTML: 'Outputs'
        }, outputsSection);

        var outputsList = domConstruct.create('div', {
          class: 'workflow-detail-outputs-list'
        }, outputsSection);

        for (var outputKey in step.outputs) {
          if (step.outputs.hasOwnProperty(outputKey)) {
            var outputItem = domConstruct.create('div', {
              class: 'workflow-detail-output-item'
            }, outputsList);

            domConstruct.create('div', {
              class: 'workflow-detail-output-key',
              innerHTML: this.escapeHtml(outputKey)
            }, outputItem);

            domConstruct.create('div', {
              class: 'workflow-detail-output-value',
              innerHTML: this.escapeHtml(this.formatValue(step.outputs[outputKey]))
            }, outputItem);
          }
        }
      }
    },

    /**
     * Gets the parsed workflow data
     * @returns {Object} Parsed workflow data
     */
    getParsedWorkflowData: function() {
      var data = this.workflowData;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          return { steps: [] };
        }
      }
      return data || { steps: [] };
    },

    cloneValue: function(value) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (err) {
        return value;
      }
    },

    getStepFormState: function(step, index) {
      if (!this.stepFormStateByIndex.hasOwnProperty(index)) {
        var initialParams = this.cloneValue(step.params || {});
        this.stepFormStateByIndex[index] = {
          original: this.cloneValue(initialParams),
          current: this.cloneValue(initialParams)
        };
      }
      return this.stepFormStateByIndex[index];
    },

    renderEditableParams: function(step, index, paramsSection) {
      var state = this.getStepFormState(step, index);
      var editableParams = state.current;
      var serviceMeta = ServiceFormRegistry.getDefinition(step.app || '');
      var supported = serviceMeta && serviceMeta.isSupported;

      var subtitle = supported
        ? ('Using custom form: ' + this.escapeHtml(serviceMeta.displayName))
        : 'Using generic parameter editor';
      domConstruct.create('div', {
        class: 'workflow-form-subtitle',
        innerHTML: subtitle
      }, paramsSection);

      var actionRow = domConstruct.create('div', {
        class: 'workflow-form-actions'
      }, paramsSection);

      var applyBtn = domConstruct.create('button', {
        type: 'button',
        class: 'workflow-form-action-btn',
        innerHTML: 'Apply Edits'
      }, actionRow);

      var resetBtn = domConstruct.create('button', {
        type: 'button',
        class: 'workflow-form-action-btn workflow-form-action-btn-secondary',
        innerHTML: 'Reset Step'
      }, actionRow);

      applyBtn.onclick = lang.hitch(this, function() {
        this.applyStepEdits(step, index, editableParams);
      });

      resetBtn.onclick = lang.hitch(this, function() {
        this.resetStepEdits(step, index);
      });
      this.renderGroupedFields(serviceMeta, editableParams, step.params || {}, paramsSection, index, supported);
    },

    renderGroupedFields: function(serviceMeta, editableParams, originalParams, paramsSection, stepIndex, supported) {
      var seen = {};
      var groups = supported ? (serviceMeta.groups || []) : [];

      if (!supported || groups.length === 0) {
        groups = [{
          key: 'parameters',
          label: 'Parameters',
          fields: []
        }];
      }

      groups.forEach(lang.hitch(this, function(group) {
        var sectionNode = domConstruct.create('div', {
          class: 'workflow-form-group'
        }, paramsSection);

        var headerNode = domConstruct.create('div', {
          class: 'workflow-form-group-header' + (group.collapsible ? ' workflow-form-group-header-collapsible' : ''),
          innerHTML: this.escapeHtml(group.label || 'Parameters')
        }, sectionNode);

        var bodyNode = domConstruct.create('div', {
          class: 'workflow-form-group-body' + (group.collapsible && group.collapsed ? ' workflow-form-group-collapsed' : '')
        }, sectionNode);

        if (group.collapsible) {
          var toggle = domConstruct.create('span', {
            class: 'workflow-form-group-toggle',
            innerHTML: group.collapsed ? 'Show' : 'Hide'
          }, headerNode);
          headerNode.onclick = function() {
            var collapsed = bodyNode.classList.toggle('workflow-form-group-collapsed');
            toggle.innerHTML = collapsed ? 'Show' : 'Hide';
          };
        }

        var fieldsGrid = domConstruct.create('div', {
          class: 'workflow-detail-params-list workflow-form-compact-grid'
        }, bodyNode);

        (group.fields || []).forEach(lang.hitch(this, function(fieldDef) {
          seen[fieldDef.name] = true;
          this.renderEditableField(fieldDef, editableParams, originalParams, fieldsGrid, stepIndex);
        }));
      }));

      // Always include unmapped params under an "Additional Parameters" compact group.
      var remaining = [];
      for (var key in editableParams) {
        if (!editableParams.hasOwnProperty(key) || seen[key]) continue;
        remaining.push({
          name: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, function(ch) { return ch.toUpperCase(); }),
          type: this.inferFieldType(originalParams[key], key),
          help: 'Additional workflow parameter',
          options: []
        });
      }
      if (remaining.length > 0) {
        var additionalSection = domConstruct.create('div', {
          class: 'workflow-form-group'
        }, paramsSection);
        domConstruct.create('div', {
          class: 'workflow-form-group-header',
          innerHTML: 'Additional Parameters'
        }, additionalSection);
        var additionalGrid = domConstruct.create('div', {
          class: 'workflow-detail-params-list workflow-form-compact-grid'
        }, additionalSection);
        remaining.forEach(lang.hitch(this, function(fieldDef) {
          this.renderEditableField(fieldDef, editableParams, originalParams, additionalGrid, stepIndex);
        }));
      }
    },

    inferFieldType: function(value, key) {
      if (typeof value === 'boolean') return 'checkbox';
      if (typeof value === 'number') return 'number';
      if (Array.isArray(value) || (typeof key === 'string' && (key.indexOf('_libs') !== -1 || key.indexOf('_ids') !== -1))) {
        return 'textarea';
      }
      if (typeof value === 'object' && value !== null) return 'textarea';
      return 'text';
    },

    renderEditableField: function(fieldDef, editableParams, originalParams, paramsList, stepIndex) {
      var paramItem = domConstruct.create('div', {
        class: 'workflow-detail-param-item workflow-form-field'
      }, paramsList);

      var label = fieldDef.label || fieldDef.name;
      domConstruct.create('label', {
        class: 'workflow-detail-param-key workflow-form-label',
        innerHTML: this.escapeHtml(label)
      }, paramItem);

      var currentValue = editableParams.hasOwnProperty(fieldDef.name)
        ? editableParams[fieldDef.name]
        : '';
      var originalValue = originalParams.hasOwnProperty(fieldDef.name)
        ? originalParams[fieldDef.name]
        : undefined;

      var type = fieldDef.type || this.inferFieldType(originalValue, fieldDef.name);
      var inputNode;
      if (type === 'checkbox') {
        inputNode = domConstruct.create('input', {
          class: 'workflow-form-input workflow-form-checkbox',
          type: 'checkbox'
        }, paramItem);
        inputNode.checked = this.toBoolean(currentValue);
        inputNode.onchange = lang.hitch(this, function(evt) {
          this.onFieldChanged(stepIndex, fieldDef.name, evt.target.checked);
        });
      } else if (type === 'textarea') {
        inputNode = domConstruct.create('textarea', {
          class: 'workflow-form-input workflow-form-textarea'
        }, paramItem);
        inputNode.value = this.stringifyEditableValue(currentValue, type);
        inputNode.oninput = lang.hitch(this, function(evt) {
          var newValue = this.coerceInputValue(evt.target.value, originalValue, type);
          this.onFieldChanged(stepIndex, fieldDef.name, newValue);
        });
      } else if (type === 'select' && fieldDef.options && fieldDef.options.length > 0) {
        inputNode = domConstruct.create('select', {
          class: 'workflow-form-input workflow-form-select'
        }, paramItem);
        fieldDef.options.forEach(function(optValue) {
          domConstruct.create('option', {
            value: optValue,
            innerHTML: optValue
          }, inputNode);
        });
        if (currentValue !== undefined && currentValue !== null && String(currentValue) !== '') {
          inputNode.value = String(currentValue);
          if (inputNode.value !== String(currentValue)) {
            domConstruct.create('option', {
              value: String(currentValue),
              innerHTML: String(currentValue)
            }, inputNode);
            inputNode.value = String(currentValue);
          }
        }
        inputNode.onchange = lang.hitch(this, function(evt) {
          var newSelectValue = this.coerceInputValue(evt.target.value, originalValue, type);
          this.onFieldChanged(stepIndex, fieldDef.name, newSelectValue);
        });
      } else {
        inputNode = domConstruct.create('input', {
          class: 'workflow-form-input',
          type: type === 'number' ? 'number' : 'text'
        }, paramItem);
        inputNode.value = this.stringifyEditableValue(currentValue, type);
        inputNode.oninput = lang.hitch(this, function(evt) {
          var inputValue = this.coerceInputValue(evt.target.value, originalValue, type);
          this.onFieldChanged(stepIndex, fieldDef.name, inputValue);
        });
      }

      if (this.isVariableReference(this.stringifyEditableValue(currentValue, type))) {
        inputNode.className += ' workflow-variable-ref';
      }

      if (fieldDef.help) {
        domConstruct.create('div', {
          class: 'workflow-form-help',
          innerHTML: this.escapeHtml(fieldDef.help)
        }, paramItem);
      }
    },

    stringifyEditableValue: function(value, type) {
      if (value === null || typeof value === 'undefined') return '';
      if (Array.isArray(value)) return value.join('\n');
      if (typeof value === 'object') return JSON.stringify(value, null, 2);
      if (type === 'checkbox') return this.toBoolean(value) ? 'true' : 'false';
      return String(value);
    },

    toBoolean: function(value) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value !== 0;
      if (typeof value === 'string') {
        var normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes';
      }
      return Boolean(value);
    },

    coerceInputValue: function(raw, originalValue, type) {
      if (type === 'checkbox') {
        return this.toBoolean(raw);
      }
      if (type === 'number') {
        if (raw === '') return raw;
        var parsedNumber = Number(raw);
        return isNaN(parsedNumber) ? raw : parsedNumber;
      }
      if (Array.isArray(originalValue)) {
        return raw
          .split(/\n|,/)
          .map(function(item) { return item.trim(); })
          .filter(function(item) { return item.length > 0; });
      }
      if (typeof originalValue === 'object' && originalValue !== null) {
        try {
          return JSON.parse(raw);
        } catch (err) {
          return raw;
        }
      }
      return raw;
    },

    onFieldChanged: function(stepIndex, key, value) {
      var state = this.stepFormStateByIndex[stepIndex];
      if (!state) {
        state = this.getStepFormState(this.selectedStep || { params: {} }, stepIndex);
      }
      state.current[key] = value;
    },

    applyStepEdits: function(step, stepIndex, editableParams) {
      var updated = this.cloneValue(editableParams || {});
      step.params = updated;
      this.stepFormStateByIndex[stepIndex] = {
        original: this.cloneValue(updated),
        current: this.cloneValue(updated)
      };
      this.workflowData = this.getParsedWorkflowData();
    },

    resetStepEdits: function(step, stepIndex) {
      var state = this.stepFormStateByIndex[stepIndex];
      var original = state ? this.cloneValue(state.original) : {};
      step.params = this.cloneValue(original);
      this.stepFormStateByIndex[stepIndex] = {
        original: this.cloneValue(original),
        current: this.cloneValue(original)
      };
      this.showStepDetails(step, stepIndex);
    },

    /**
     * Formats a value for display
     * @param {*} value - Value to format
     * @returns {string} Formatted string
     */
    formatValue: function(value) {
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value);
    },

    /**
     * Checks if a string is a variable reference (contains ${...})
     * @param {string} str - String to check
     * @returns {boolean} True if contains variable reference
     */
    isVariableReference: function(str) {
      return typeof str === 'string' && str.indexOf('${') !== -1;
    },

    /**
     * Escapes HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml: function(text) {
      var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    },

    /**
     * Updates the workflow data and re-renders
     * @param {Object|string} newData - New workflow data
     */
    setWorkflowData: function(newData) {
      console.log('[WorkflowEngine] setWorkflowData() called');
      console.log('[WorkflowEngine] newData type:', typeof newData);
      console.log('[WorkflowEngine] newData:', newData);
      this.workflowData = newData;
      this.stepFormStateByIndex = {};
      // Clear existing content
      domConstruct.empty(this.domNode);
      // Re-render
      this.render();
    },

    /**
     * Submits the workflow for execution directly to the workflow engine API
     * @param {Object} workflow - The workflow data to submit
     */
    submitWorkflowForExecution: function(workflow) {
      console.log('[WorkflowEngine] submitWorkflowForExecution() called');
      console.log('[WorkflowEngine] Workflow to submit:', workflow);

      // Validate that copilotApi is available
      if (!this.copilotApi) {
        console.error('[WorkflowEngine] No copilotApi reference available');
        this._showSubmissionError('Cannot submit workflow: Copilot API not available');
        return;
      }

      // Prepare the workflow JSON for submission
      // Remove execution metadata that was added by plan_workflow
      var workflowToSubmit = this.cloneValue(workflow);
      delete workflowToSubmit.execution_metadata;

      // Show submission status
      this._showSubmissionStatus('Submitting workflow to workflow engine...');

      console.log('[WorkflowEngine] Calling copilotApi.submitWorkflowForExecution');

      // Submit directly to workflow engine API via copilotApi
      var _self = this;
      this.copilotApi.submitWorkflowForExecution(workflowToSubmit)
        .then(function(response) {
          console.log('[WorkflowEngine] Submit workflow response:', response);

          if (response.error) {
            _self._showSubmissionError('Submission failed: ' + response.error);
            return;
          }

          // Response from workflow engine should contain:
          // { workflow_id, status, message }
          var workflowId = response.workflow_id;
          var status = response.status || 'pending';
          var message = response.message || 'Workflow submitted successfully';

          if (workflowId) {
            // Construct status URL
            var workflowEngineUrl = window.App.workflow_url || 'https://dev-7.bv-brc.org/api/v1';
            var statusUrl = workflowEngineUrl + '/workflows/' + workflowId + '/status';

            // Update the workflow data with the submission response
            _self.workflowData.execution_metadata = {
              workflow_id: workflowId,
              status: status,
              submitted_at: new Date().toISOString(),
              message: message,
              status_url: statusUrl,
              is_submitted: true,
              is_planned: false
            };

            // Re-render to show updated status and hide submit button
            domConstruct.empty(_self.domNode);
            _self.render();

            var successMsg = 'Workflow submitted successfully!<br>Workflow ID: ' + _self.escapeHtml(workflowId);
            successMsg += '<br><a href="' + statusUrl + '" target="_blank" style="color: white; text-decoration: underline;">View Status</a>';
            _self._showSubmissionSuccess(successMsg);
          } else {
            // No workflow_id in response, but no error either
            _self._showSubmissionSuccess(_self.escapeHtml(message));
          }
        })
        .catch(function(error) {
          console.error('[WorkflowEngine] Error submitting workflow:', error);
          _self._showSubmissionError('Submission error: ' + _self.escapeHtml(error.message || error));
        });
    },

    /**
     * Shows submission status message
     * @param {string} message - Status message to display
     */
    _showSubmissionStatus: function(message) {
      // Find or create status container
      var statusContainer = this._getOrCreateStatusContainer();
      statusContainer.innerHTML = '<div class="workflow-submission-status">' +
        '<span class="status-spinner">⏳</span> ' +
        this.escapeHtml(message) +
        '</div>';
      domStyle.set(statusContainer, 'display', 'block');
    },

    /**
     * Shows submission success message
     * @param {string} message - Success message to display
     */
    _showSubmissionSuccess: function(message) {
      var statusContainer = this._getOrCreateStatusContainer();
      statusContainer.innerHTML = '<div class="workflow-submission-success">' +
        '<span class="status-icon">✓</span> ' +
        message +
        '</div>';
      domStyle.set(statusContainer, 'display', 'block');

      // Auto-hide after 10 seconds
      setTimeout(function() {
        domStyle.set(statusContainer, 'display', 'none');
      }, 10000);
    },

    /**
     * Shows submission error message
     * @param {string} message - Error message to display
     */
    _showSubmissionError: function(message) {
      var statusContainer = this._getOrCreateStatusContainer();
      statusContainer.innerHTML = '<div class="workflow-submission-error">' +
        '<span class="status-icon">✗</span> ' +
        this.escapeHtml(message) +
        '</div>';
      domStyle.set(statusContainer, 'display', 'block');

      // Auto-hide after 10 seconds
      setTimeout(function() {
        domStyle.set(statusContainer, 'display', 'none');
      }, 10000);
    },

    /**
     * Gets or creates the status message container
     * @returns {DOMNode} Status container element
     */
    _getOrCreateStatusContainer: function() {
      var existing = this.domNode.querySelector('.workflow-submission-status-container');
      if (existing) {
        return existing;
      }

      var container = domConstruct.create('div', {
        class: 'workflow-submission-status-container',
        style: 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;'
      });

      // Insert at the beginning of the workflow engine container
      domConstruct.place(container, this.domNode, 'first');
      return container;
    }
  });
});

