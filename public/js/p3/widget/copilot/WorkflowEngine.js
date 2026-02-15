/**
 * @module p3/widget/copilot/WorkflowEngine
 * @description Widget that displays workflow JSON data in a visual pipeline view
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin'
], function(
  declare,
  lang,
  domConstruct,
  domStyle,
  _WidgetBase,
  _TemplatedMixin
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

    /**
     * Called after widget creation
     */
    postCreate: function() {
      console.log('[WorkflowEngine] postCreate() called');
      console.log('[WorkflowEngine] Initial workflowData:', this.workflowData);
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

        var paramsList = domConstruct.create('div', {
          class: 'workflow-detail-params-list'
        }, paramsSection);

        for (var key in step.params) {
          if (step.params.hasOwnProperty(key)) {
            var paramItem = domConstruct.create('div', {
              class: 'workflow-detail-param-item'
            }, paramsList);

            domConstruct.create('div', {
              class: 'workflow-detail-param-key',
              innerHTML: this.escapeHtml(key)
            }, paramItem);

            var valueStr = this.formatValue(step.params[key]);
            var isVariable = this.isVariableReference(valueStr);

            domConstruct.create('div', {
              class: 'workflow-detail-param-value' + (isVariable ? ' workflow-variable-ref' : ''),
              innerHTML: this.escapeHtml(valueStr)
            }, paramItem);
          }
        }
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
      // Clear existing content
      domConstruct.empty(this.domNode);
      // Re-render
      this.render();
    }
  });
});

