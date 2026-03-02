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
  'dojo/topic',
  'dojo/promise/all',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/form/Button',
  './workflowForms/ServiceFormRegistry',
  './ServiceValidationRules',
  '../../WorkspaceManager'
], function(
  declare,
  lang,
  domConstruct,
  domStyle,
  domClass,
  on,
  topic,
  all,
  _WidgetBase,
  _TemplatedMixin,
  Button,
  ServiceFormRegistry,
  ServiceValidationRules,
  WorkspaceManager
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

    /** @property {DOMNode} detailPanel - Reference to the inline detail panel DOM node */
    detailPanel: null,

    /** @property {DOMNode|null} Inline detail title node */
    detailTitleNode: null,

    /** @property {DOMNode|null} Inline detail content node */
    detailContentNode: null,

    /** @property {DOMNode|null} Inline detail previous button */
    detailPrevBtn: null,

    /** @property {DOMNode|null} Inline detail next button */
    detailNextBtn: null,

    /** @property {Object} Tracks first and current form states per step */
    stepFormStateByIndex: null,

    /** @property {Object} Tracks latest validation result per step */
    stepValidationByIndex: null,

    /** @property {Object} Tracks step card nodes for status updates */
    stepCardNodesByIndex: null,

    /** @property {Object} Debounce timers for per-step validation */
    stepValidationTimers: null,

    /** @property {dijit/form/Button|null} Reference to submit button */
    submitWorkflowButton: null,

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
      this.stepValidationByIndex = {};
      this.stepCardNodesByIndex = {};
      this.stepValidationTimers = {};
      this.submitWorkflowButton = null;
      this.detailPanel = null;
      this.detailTitleNode = null;
      this.detailContentNode = null;
      this.detailPrevBtn = null;
      this.detailNextBtn = null;
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
      this.validateAllSteps({ updateUI: true });
    },

    /**
     * Renders the workflow in a visual pipeline format
     * @param {Object} workflow - Parsed workflow data
     */
    renderWorkflowView: function(workflow) {
      // Create main wrapper with content area
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
      var workflowDescription = workflow.workflow_description ||
        (workflow.execution_metadata && workflow.execution_metadata.workflow_description) ||
        '';
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

      if (workflowDescription) {
        domConstruct.create('div', {
          class: 'workflow-description',
          innerHTML: this.escapeHtml(workflowDescription),
          style: 'margin-top: 6px; color: #4b5563; font-size: 13px; line-height: 1.35;'
        }, header);
      }

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

        this.submitWorkflowButton = new Button({
          label: 'Submit',
          type: 'submit',
          onClick: lang.hitch(this, function() {
            this.validateWorkflowBeforeSubmit(workflow);
          })
        });
        this.submitWorkflowButton.placeAt(buttonContainer);
        this.submitWorkflowButton.set('disabled', true);
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

      // Add click handler to toggle inline detail panel.
      stepCard.onclick = lang.hitch(this, function(evt) {
        var node = evt && evt.target;
        while (node) {
          if (node.classList && node.classList.contains('workflow-step-inline-detail')) {
            return;
          }
          node = node.parentNode;
        }
        if (this.selectedStepIndex === index) {
          this.hideStepDetails();
          return;
        }
        this.showStepDetails(step, index);
      });

      // Add keyboard support
      stepCard.onkeypress = lang.hitch(this, function(e) {
        if (e.target !== stepCard) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.selectedStepIndex === index) {
            this.hideStepDetails();
          } else {
            this.showStepDetails(step, index);
          }
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

      var errorSummaryNode = domConstruct.create('div', {
        class: 'workflow-step-errors workflow-step-errors-hidden',
        innerHTML: '0 Error(s)'
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

      var inlineDetailHost = domConstruct.create('div', {
        class: 'workflow-step-inline-detail workflow-step-inline-detail-hidden'
      }, stepCard);

      this.stepCardNodesByIndex[index] = {
        card: stepCard,
        errorSummaryNode: errorSummaryNode,
        inlineDetailHost: inlineDetailHost
      };
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

    createDetailPanel: function() {
      if (this.detailPanel) {
        return this.detailPanel;
      }
      this.detailPanel = domConstruct.create('div', {
        class: 'workflow-detail-panel workflow-detail-panel-inline'
      });

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
      this.detailTitleNode = domConstruct.create('h3', {
        class: 'workflow-detail-title'
      }, header);

      // Navigation buttons
      var navContainer = domConstruct.create('div', {
        class: 'workflow-detail-nav'
      }, header);

      this.detailPrevBtn = domConstruct.create('button', {
        class: 'workflow-detail-nav-btn workflow-detail-prev',
        innerHTML: '← Previous',
        title: 'Previous step'
      }, navContainer);

      this.detailPrevBtn.onclick = lang.hitch(this, function() {
        this.navigateStep(-1);
      });

      this.detailNextBtn = domConstruct.create('button', {
        class: 'workflow-detail-nav-btn workflow-detail-next',
        innerHTML: 'Next →',
        title: 'Next step'
      }, navContainer);

      this.detailNextBtn.onclick = lang.hitch(this, function() {
        this.navigateStep(1);
      });

      // Panel content
      this.detailContentNode = domConstruct.create('div', {
        class: 'workflow-detail-content'
      }, this.detailPanel);
      return this.detailPanel;
    },

    /**
     * Shows the detail panel for a specific step
     * @param {Object} step - Step data
     * @param {number} index - Step index
     */
    showStepDetails: function(step, index) {
      var cardData = this.stepCardNodesByIndex[index];
      if (!cardData || !cardData.card || !cardData.inlineDetailHost) {
        return;
      }

      if (this.selectedStepIndex !== -1 && this.selectedStepIndex !== index) {
        this.hideStepDetails();
      }

      this.selectedStep = step;
      this.selectedStepIndex = index;

      this.createDetailPanel();
      domConstruct.place(this.detailPanel, cardData.inlineDetailHost, 'only');

      // Update panel title
      if (this.detailTitleNode) {
        this.detailTitleNode.innerHTML = 'Step ' + (index + 1) + ': ' + this.escapeHtml(step.step_name || 'Untitled');
      }

      // Update navigation buttons
      if (this.detailPrevBtn) {
        this.detailPrevBtn.disabled = (index === 0);
      }

      if (this.detailNextBtn) {
        var totalSteps = this.getParsedWorkflowData().steps.length;
        this.detailNextBtn.disabled = (index >= totalSteps - 1);
      }

      // Populate content
      this.populateDetailContent(step, index);
      this.validateStep(index, { updateUI: true });

      domClass.add(cardData.card, 'workflow-step-card-expanded');
      domClass.remove(cardData.inlineDetailHost, 'workflow-step-inline-detail-hidden');
    },

    /**
     * Hides the detail panel
     */
    hideStepDetails: function() {
      var currentIndex = this.selectedStepIndex;
      if (currentIndex >= 0) {
        var cardData = this.stepCardNodesByIndex[currentIndex];
        if (cardData && cardData.card) {
          domClass.remove(cardData.card, 'workflow-step-card-expanded');
        }
        if (cardData && cardData.inlineDetailHost) {
          domClass.add(cardData.inlineDetailHost, 'workflow-step-inline-detail-hidden');
          if (this.detailPanel && this.detailPanel.parentNode === cardData.inlineDetailHost) {
            domConstruct.empty(cardData.inlineDetailHost);
          }
        }
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
      var content = this.detailContentNode;
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

      this.renderStepValidationDetails(content, step, index);

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
      if (Array.isArray(value)) {
        if (value.length === 0) return '';
        var hasComplexItems = value.some(function(item) {
          return typeof item === 'object' && item !== null;
        });
        if (hasComplexItems) {
          return JSON.stringify(value, null, 2);
        }
        return value.join('\n');
      }
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
        if (raw.trim() === '') {
          return [];
        }
        // Allow editing complex arrays (e.g. paired_end_libs) as JSON.
        try {
          var parsedArray = JSON.parse(raw);
          if (Array.isArray(parsedArray)) {
            return parsedArray;
          }
        } catch (err) {
          // Fall back to simple newline/comma parsing for string arrays.
        }
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
      this.scheduleStepValidation(stepIndex);
    },

    applyStepEdits: function(step, stepIndex, editableParams) {
      var updated = this.cloneValue(editableParams || {});
      step.params = updated;
      this.stepFormStateByIndex[stepIndex] = {
        original: this.cloneValue(updated),
        current: this.cloneValue(updated)
      };
      this.workflowData = this.getParsedWorkflowData();
      this.validateStep(stepIndex, { updateUI: true });
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
      this.validateStep(stepIndex, { updateUI: true });
    },

    isWorkflowSubmitted: function(workflow) {
      var wf = workflow || this.getParsedWorkflowData();
      return !!(wf && wf.execution_metadata && wf.execution_metadata.is_submitted);
    },

    emptyValidationResult: function() {
      return {
        valid: true,
        errors: [],
        warnings: [],
        checked_output_target: null
      };
    },

    addValidationError: function(result, code, message, field) {
      result.errors.push({
        code: code || 'validation_error',
        message: message || 'Validation error',
        field: field || ''
      });
      result.valid = false;
    },

    addValidationWarning: function(result, code, message, field) {
      result.warnings.push({
        code: code || 'validation_warning',
        message: message || 'Validation warning',
        field: field || ''
      });
    },

    isEmptyValue: function(value) {
      if (value === null || typeof value === 'undefined') return true;
      if (typeof value === 'string') return value.trim() === '';
      if (Array.isArray(value)) return value.length === 0;
      return false;
    },

    toArrayValue: function(value) {
      if (Array.isArray(value)) return value;
      if (this.isEmptyValue(value)) return [];
      return [value];
    },

    parseRequiredFields: function(serviceMeta) {
      var required = {};
      if (!serviceMeta || !Array.isArray(serviceMeta.fields)) return required;
      serviceMeta.fields.forEach(function(field) {
        var help = field && field.help ? String(field.help).toLowerCase() : '';
        if (help.indexOf('(required') !== -1) {
          required[field.name] = true;
        }
      });
      return required;
    },

    getStepValidationParams: function(step, index) {
      var state = this.stepFormStateByIndex[index];
      if (state && state.current) {
        return state.current;
      }
      return step && step.params ? step.params : {};
    },

    scheduleStepValidation: function(stepIndex) {
      if (this.stepValidationTimers[stepIndex]) {
        clearTimeout(this.stepValidationTimers[stepIndex]);
      }
      this.stepValidationTimers[stepIndex] = setTimeout(lang.hitch(this, function() {
        delete this.stepValidationTimers[stepIndex];
        this.validateStep(stepIndex, { updateUI: true });
      }), 350);
    },

    buildOutputTargetPath: function(outputPath, outputFile) {
      var pathPart = String(outputPath || '').trim();
      var filePart = String(outputFile || '').trim();
      if (!pathPart || !filePart) return '';
      if (pathPart.slice(-1) === '/') {
        return pathPart + filePart;
      }
      return pathPart + '/' + filePart;
    },

    collectUnresolvedVariableWarnings: function(result, params, skipWarnings) {
      if (skipWarnings) return;
      var seen = {};

      function walk(value, path, self) {
        if (typeof value === 'string') {
          var matches = value.match(/\$\{[^}]+\}/g) || [];
          matches.forEach(function(match) {
            var expr = match.slice(2, -1).trim();
            var key = expr + '::' + path;
            if (!seen[key]) {
              seen[key] = true;
              self.addValidationWarning(
                result,
                'unresolved_variable',
                'Unresolved variable reference: ${' + expr + '}',
                path
              );
            }
          });
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(function(item, idx) {
            walk(item, path + '[' + idx + ']', self);
          });
          return;
        }
        if (value && typeof value === 'object') {
          Object.keys(value).forEach(function(key) {
            walk(value[key], path ? (path + '.' + key) : key, self);
          });
        }
      }

      walk(params, '', this);
    },

    validateLibraryObjects: function(result, fieldName, entries, requireSampleId) {
      var list = this.toArrayValue(entries);
      for (var i = 0; i < list.length; i++) {
        var entry = list[i];
        if (!entry || typeof entry !== 'object') {
          this.addValidationError(result, 'invalid_library_entry', fieldName + '[' + i + '] must be an object', fieldName);
          continue;
        }
        if (fieldName === 'paired_end_libs') {
          if (this.isEmptyValue(entry.read1)) {
            this.addValidationError(result, 'missing_read1', 'Missing read1 in paired_end_libs[' + i + ']', fieldName);
          }
          if (this.isEmptyValue(entry.read2)) {
            this.addValidationError(result, 'missing_read2', 'Missing read2 in paired_end_libs[' + i + ']', fieldName);
          }
          if (!this.isEmptyValue(entry.read1) && !this.isEmptyValue(entry.read2) && String(entry.read1) === String(entry.read2)) {
            this.addValidationError(result, 'duplicate_pair_reads', 'read1 and read2 cannot be the same in paired_end_libs[' + i + ']', fieldName);
          }
        } else if (fieldName === 'single_end_libs') {
          if (this.isEmptyValue(entry.read)) {
            this.addValidationError(result, 'missing_read', 'Missing read in single_end_libs[' + i + ']', fieldName);
          }
        }
        if (requireSampleId && this.isEmptyValue(entry.sample_id)) {
          this.addValidationError(result, 'missing_sample_id', 'Missing sample_id in ' + fieldName + '[' + i + ']', fieldName);
        }
      }
    },

    runGenericValidation: function(step, index, params, workflow, serviceMeta, result) {
      var requiredFields = this.parseRequiredFields(serviceMeta);
      Object.keys(requiredFields).forEach(lang.hitch(this, function(fieldName) {
        if (this.isEmptyValue(params[fieldName])) {
          this.addValidationError(result, 'required_field', 'Missing required field: ' + fieldName, fieldName);
        }
      }));

      if (serviceMeta && Array.isArray(serviceMeta.fields)) {
        serviceMeta.fields.forEach(lang.hitch(this, function(fieldDef) {
          if (!fieldDef || !fieldDef.name) return;
          var fieldName = fieldDef.name;
          var value = params[fieldName];
          if (this.isEmptyValue(value)) return;
          if (fieldDef.type === 'number' && isNaN(Number(value))) {
            this.addValidationError(result, 'invalid_number', fieldName + ' must be numeric', fieldName);
          }
          if (fieldDef.type === 'checkbox') {
            var validBool = typeof value === 'boolean' ||
              value === 'true' || value === 'false' ||
              value === 1 || value === 0 ||
              value === '1' || value === '0';
            if (!validBool) {
              this.addValidationError(result, 'invalid_boolean', fieldName + ' must be boolean', fieldName);
            }
          }
        }));
      }

      this.validateLibraryObjects(result, 'paired_end_libs', params.paired_end_libs, false);
      this.validateLibraryObjects(result, 'single_end_libs', params.single_end_libs, false);
    },

    /**
     * Creates a helpers object with validation utility functions.
     * These helpers are passed to service-specific validation rules.
     */
    getValidationHelpers: function() {
      return {
        toArrayValue: lang.hitch(this, this.toArrayValue),
        isEmptyValue: lang.hitch(this, this.isEmptyValue),
        addValidationError: lang.hitch(this, this.addValidationError),
        addValidationWarning: lang.hitch(this, this.addValidationWarning),
        validateLibraryObjects: lang.hitch(this, this.validateLibraryObjects)
      };
    },

    runTaxonomicClassificationStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runTaxonomicClassificationStrictValidation(step, index, params, workflow, result, helpers);
    },

    runComprehensiveGenomeAnalysisStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runComprehensiveGenomeAnalysisStrictValidation(step, index, params, workflow, result, helpers);
    },

    runGenomeAssemblyStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runGenomeAssemblyStrictValidation(step, index, params, workflow, result, helpers);
    },

    runGenomeAnnotationStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runGenomeAnnotationStrictValidation(step, index, params, workflow, result, helpers);
    },

    runBlastStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runBlastStrictValidation(step, index, params, workflow, result, helpers);
    },

    runPrimerDesignStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runPrimerDesignStrictValidation(step, index, params, workflow, result, helpers);
    },

    runVariationStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runVariationStrictValidation(step, index, params, workflow, result, helpers);
    },

    runTnSeqStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runTnSeqStrictValidation(step, index, params, workflow, result, helpers);
    },

    runBacterialGenomeTreeStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runBacterialGenomeTreeStrictValidation(step, index, params, workflow, result, helpers);
    },

    runCoreGenomeMLSTStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runCoreGenomeMLSTStrictValidation(step, index, params, workflow, result, helpers);
    },

    runWholeGenomeSNPStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runWholeGenomeSNPStrictValidation(step, index, params, workflow, result, helpers);
    },

    runMSAandSNPAnalysisStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runMSAandSNPAnalysisStrictValidation(step, index, params, workflow, result, helpers);
    },

    runMetaCATSStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runMetaCATSStrictValidation(step, index, params, workflow, result, helpers);
    },

    runGeneTreeStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runGeneTreeStrictValidation(step, index, params, workflow, result, helpers);
    },

    runProteomeComparisonStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runProteomeComparisonStrictValidation(step, index, params, workflow, result, helpers);
    },

    runComparativeSystemsStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runComparativeSystemsStrictValidation(step, index, params, workflow, result, helpers);
    },

    runDockingStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runDockingStrictValidation(step, index, params, workflow, result, helpers);
    },

    runMetagenomicBinningStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runMetagenomicBinningStrictValidation(step, index, params, workflow, result, helpers);
    },

    runMetagenomicReadMappingStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runMetagenomicReadMappingStrictValidation(step, index, params, workflow, result, helpers);
    },

    runRNASeqStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runRNASeqStrictValidation(step, index, params, workflow, result, helpers);
    },

    runSARSGenomeAnalysisStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runSARSGenomeAnalysisStrictValidation(step, index, params, workflow, result, helpers);
    },

    runSARSWastewaterAnalysisStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runSARSWastewaterAnalysisStrictValidation(step, index, params, workflow, result, helpers);
    },

    runViralAssemblyStrictValidation: function(step, index, params, workflow, result) {
      var helpers = this.getValidationHelpers();
      ServiceValidationRules.runViralAssemblyStrictValidation(step, index, params, workflow, result, helpers);
    },

    validateOutputTarget: function(params, result, suppressWarnings) {
      var outputPath = params.output_path;
      var outputFile = params.output_file;
      if (this.isEmptyValue(outputPath) || this.isEmptyValue(outputFile)) {
        return Promise.resolve();
      }

      var outputFileString = String(outputFile).trim();
      if (/[()/:\\]/.test(outputFileString)) {
        this.addValidationError(result, 'invalid_output_file_name', 'output_file contains invalid characters ( ) / : \\', 'output_file');
        return Promise.resolve();
      }

      var pathString = String(outputPath).trim();
      var unresolvedPath = pathString.match(/\$\{[^}]+\}/g) || [];
      var unresolvedFile = outputFileString.match(/\$\{[^}]+\}/g) || [];
      if (unresolvedPath.length > 0 || unresolvedFile.length > 0) {
        if (!suppressWarnings) {
          unresolvedPath.concat(unresolvedFile).forEach(lang.hitch(this, function(token) {
            this.addValidationWarning(result, 'unresolved_output_target', 'Unable to resolve output target reference: ' + token, 'output');
          }));
        }
        return Promise.resolve();
      }

      var fullPath = this.buildOutputTargetPath(pathString, outputFileString);
      if (!fullPath) {
        return Promise.resolve();
      }
      result.checked_output_target = fullPath;

      if (!WorkspaceManager || typeof WorkspaceManager.objectsExist !== 'function') {
        this.addValidationError(result, 'workspace_check_unavailable', 'Unable to verify output target in workspace', 'output');
        return Promise.resolve();
      }

      return Promise.resolve(WorkspaceManager.objectsExist(fullPath))
        .then(lang.hitch(this, function(existsMap) {
          var state = existsMap && existsMap[fullPath] ? existsMap[fullPath] : null;
          if (state && state.exists) {
            this.addValidationError(result, 'output_exists', 'Output target already exists: ' + fullPath, 'output');
          } else if (state && state.error) {
            this.addValidationError(result, 'output_check_error', 'Unable to verify output target: ' + state.error, 'output');
          }
        }))
        .catch(lang.hitch(this, function(err) {
          this.addValidationError(
            result,
            'output_check_failed',
            'Unable to verify output target existence' + (err && err.message ? (': ' + err.message) : ''),
            'output'
          );
        }));
    },

    validateStep: function(stepIndex, options) {
      var opts = options || {};
      var workflow = this.getParsedWorkflowData();
      var step = workflow && workflow.steps ? workflow.steps[stepIndex] : null;
      if (!step) {
        return Promise.resolve(this.emptyValidationResult());
      }

      var result = this.emptyValidationResult();
      var params = this.getStepValidationParams(step, stepIndex) || {};
      var serviceMeta = ServiceFormRegistry.getDefinition(step.app || '');
      var serviceKey = serviceMeta && serviceMeta.serviceKey ? serviceMeta.serviceKey : '';
      var skipVariableWarnings = this.isWorkflowSubmitted(workflow);

      this.runGenericValidation(step, stepIndex, params, workflow, serviceMeta, result);

      if (serviceKey === 'taxonomic_classification') {
        this.runTaxonomicClassificationStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'comprehensive_genome_analysis') {
        this.runComprehensiveGenomeAnalysisStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'genome_assembly') {
        this.runGenomeAssemblyStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'genome_annotation') {
        this.runGenomeAnnotationStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'blast') {
        this.runBlastStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'primer_design') {
        this.runPrimerDesignStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'variation') {
        this.runVariationStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'tnseq') {
        this.runTnSeqStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'bacterial_genome_tree') {
        this.runBacterialGenomeTreeStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'core_genome_mlst') {
        this.runCoreGenomeMLSTStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'whole_genome_snp') {
        this.runWholeGenomeSNPStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'msa_snp_analysis') {
        this.runMSAandSNPAnalysisStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'metacats') {
        this.runMetaCATSStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'gene_tree') {
        this.runGeneTreeStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'proteome_comparison') {
        this.runProteomeComparisonStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'comparative_systems') {
        this.runComparativeSystemsStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'docking') {
        this.runDockingStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'metagenomic_binning') {
        this.runMetagenomicBinningStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'metagenomic_read_mapping') {
        this.runMetagenomicReadMappingStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'rnaseq') {
        this.runRNASeqStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'sars_genome_analysis') {
        this.runSARSGenomeAnalysisStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'sars_wastewater_analysis') {
        this.runSARSWastewaterAnalysisStrictValidation(step, stepIndex, params, workflow, result);
      } else if (serviceKey === 'viral_assembly') {
        this.runViralAssemblyStrictValidation(step, stepIndex, params, workflow, result);
      }

      this.collectUnresolvedVariableWarnings(result, params, skipVariableWarnings);

      return this.validateOutputTarget(params, result, skipVariableWarnings).then(lang.hitch(this, function() {
        if (skipVariableWarnings) {
          result.warnings = [];
        }
        result.valid = result.errors.length === 0;
        this.stepValidationByIndex[stepIndex] = result;
        if (opts.updateUI !== false) {
          this.updateStepValidationUI(stepIndex);
        }
        return result;
      }));
    },

    validateAllSteps: function(options) {
      var workflow = this.getParsedWorkflowData();
      var steps = workflow && Array.isArray(workflow.steps) ? workflow.steps : [];
      if (steps.length === 0) {
        this.updateSubmitButtonValidationState();
        return Promise.resolve({ allValid: true, firstInvalidIndex: -1 });
      }

      var promises = [];
      for (var i = 0; i < steps.length; i++) {
        promises.push(this.validateStep(i, options || { updateUI: true }));
      }

      return all(promises).then(lang.hitch(this, function(results) {
        var firstInvalidIndex = -1;
        var allValid = true;
        for (var i = 0; i < results.length; i++) {
          if (!results[i] || results[i].errors.length > 0) {
            allValid = false;
            if (firstInvalidIndex === -1) {
              firstInvalidIndex = i;
            }
          }
        }
        this.updateSubmitButtonValidationState();
        return {
          allValid: allValid,
          firstInvalidIndex: firstInvalidIndex
        };
      }));
    },

    validateWorkflowBeforeSubmit: function(workflow) {
      this.validateAllSteps({ updateUI: true }).then(lang.hitch(this, function(summary) {
        if (!summary.allValid) {
          this._showSubmissionError('Cannot submit workflow: one or more steps failed validation.');
          if (summary.firstInvalidIndex >= 0) {
            var parsedWorkflow = this.getParsedWorkflowData();
            var firstStep = parsedWorkflow.steps[summary.firstInvalidIndex];
            if (firstStep) {
              this.showStepDetails(firstStep, summary.firstInvalidIndex);
            }
          }
          return;
        }
        this.submitWorkflowForExecution(workflow);
      }));
    },

    updateStepValidationUI: function(stepIndex) {
      var cardData = this.stepCardNodesByIndex[stepIndex];
      var validation = this.stepValidationByIndex[stepIndex] || this.emptyValidationResult();
      if (cardData && cardData.card) {
        domClass.toggle(cardData.card, 'workflow-step-has-errors', validation.errors.length > 0);
        domClass.toggle(cardData.card, 'workflow-step-has-warnings', validation.errors.length === 0 && validation.warnings.length > 0);
      }
      if (cardData && cardData.errorSummaryNode) {
        if (validation.errors.length > 0) {
          cardData.errorSummaryNode.innerHTML = validation.errors.length + ' Error(s)';
          domClass.remove(cardData.errorSummaryNode, 'workflow-step-errors-hidden');
        } else {
          cardData.errorSummaryNode.innerHTML = '0 Error(s)';
          domClass.add(cardData.errorSummaryNode, 'workflow-step-errors-hidden');
        }
      }
      if (this.selectedStepIndex === stepIndex && this.selectedStep) {
        this.populateDetailContent(this.selectedStep, stepIndex);
      }
      this.updateSubmitButtonValidationState();
    },

    updateSubmitButtonValidationState: function() {
      if (!this.submitWorkflowButton) return;
      var workflow = this.getParsedWorkflowData();
      var steps = workflow && Array.isArray(workflow.steps) ? workflow.steps : [];
      if (steps.length === 0) {
        this.submitWorkflowButton.set('disabled', true);
        return;
      }
      var anyMissing = false;
      var hasErrors = false;
      for (var i = 0; i < steps.length; i++) {
        var validation = this.stepValidationByIndex[i];
        if (!validation) {
          anyMissing = true;
          continue;
        }
        if (validation.errors && validation.errors.length > 0) {
          hasErrors = true;
        }
      }
      this.submitWorkflowButton.set('disabled', anyMissing || hasErrors);
    },

    renderStepValidationDetails: function(contentNode, step, index) {
      var validation = this.stepValidationByIndex[index];
      if (!validation) {
        return;
      }
      var section = domConstruct.create('div', {
        class: 'workflow-detail-section workflow-detail-validation-section'
      }, contentNode);

      domConstruct.create('h4', {
        class: 'workflow-detail-section-title',
        innerHTML: 'Validation'
      }, section);

      domConstruct.create('div', {
        class: 'workflow-validation-summary',
        innerHTML: '<strong>' + validation.errors.length + ' error(s)</strong>, ' + validation.warnings.length + ' warning(s)'
      }, section);

      if (validation.errors.length > 0) {
        var errorList = domConstruct.create('ul', {
          class: 'workflow-validation-list workflow-validation-list-errors'
        }, section);
        validation.errors.forEach(lang.hitch(this, function(issue) {
          domConstruct.create('li', {
            innerHTML: this.escapeHtml(issue.message + (issue.field ? (' [' + issue.field + ']') : ''))
          }, errorList);
        }));
      }

      if (validation.warnings.length > 0) {
        var warningList = domConstruct.create('ul', {
          class: 'workflow-validation-list workflow-validation-list-warnings'
        }, section);
        validation.warnings.forEach(lang.hitch(this, function(issue) {
          domConstruct.create('li', {
            innerHTML: this.escapeHtml(issue.message + (issue.field ? (' [' + issue.field + ']') : ''))
          }, warningList);
        }));
      }
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
      if (text === null || typeof text === 'undefined') return '';
      text = String(text);
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
      this.stepValidationByIndex = {};
      this.stepCardNodesByIndex = {};
      this.stepValidationTimers = {};
      this.submitWorkflowButton = null;
      this.detailPanel = null;
      this.detailTitleNode = null;
      this.detailContentNode = null;
      this.detailPrevBtn = null;
      this.detailNextBtn = null;
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

            // Associate the workflow with the active chat session so it appears in Context > Workflows.
            if (_self.sessionId && _self.copilotApi && typeof _self.copilotApi.addWorkflowToSession === 'function') {
              _self.copilotApi.addWorkflowToSession(_self.sessionId, workflowId)
                .then(function() {
                  topic.publish('CopilotSessionWorkflowCreated', {
                    session_id: _self.sessionId,
                    workflow: {
                      id: workflowId,
                      workflow_id: workflowId,
                      workflow_name: _self.workflowData && _self.workflowData.workflow_name ? _self.workflowData.workflow_name : 'Workflow',
                      status: status,
                      submitted_at: _self.workflowData &&
                        _self.workflowData.execution_metadata &&
                        _self.workflowData.execution_metadata.submitted_at
                        ? _self.workflowData.execution_metadata.submitted_at
                        : new Date().toISOString(),
                      selected: true
                    }
                  });
                })
                .catch(function(associationError) {
                  console.error('[WorkflowEngine] Failed to associate workflow with session:', associationError);
                });
            }
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
      statusContainer.innerHTML = '';
      var successNode = domConstruct.create('div', {
        class: 'workflow-submission-success',
        style: 'position: relative; padding-right: 32px;'
      }, statusContainer);
      domConstruct.create('span', {
        class: 'status-icon',
        innerHTML: '✓'
      }, successNode);
      domConstruct.create('span', {
        innerHTML: ' ' + message
      }, successNode);
      var closeButton = domConstruct.create('button', {
        type: 'button',
        innerHTML: '&times;',
        title: 'Close',
        style: 'position: absolute; top: 6px; right: 8px; border: 0; background: transparent; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; padding: 0;'
      }, successNode);
      on(closeButton, 'click', function() {
        domStyle.set(statusContainer, 'display', 'none');
      });
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
      statusContainer.innerHTML = '';
      var errorNode = domConstruct.create('div', {
        class: 'workflow-submission-error',
        style: 'position: relative; padding-right: 32px;'
      }, statusContainer);
      domConstruct.create('span', {
        class: 'status-icon',
        innerHTML: '✗'
      }, errorNode);
      domConstruct.create('span', {
        innerHTML: ' ' + this.escapeHtml(message)
      }, errorNode);
      var closeButton = domConstruct.create('button', {
        type: 'button',
        innerHTML: '&times;',
        title: 'Close',
        style: 'position: absolute; top: 6px; right: 8px; border: 0; background: transparent; color: inherit; font-size: 18px; line-height: 1; cursor: pointer; padding: 0;'
      }, errorNode);
      on(closeButton, 'click', function() {
        domStyle.set(statusContainer, 'display', 'none');
      });
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

