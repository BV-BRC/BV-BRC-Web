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

    /**
     * Called after widget creation
     */
    postCreate: function() {
      this.inherited(arguments);
      this.render();
    },

    /**
     * Renders the workflow data
     */
    render: function() {
      if (!this.workflowData) {
        domConstruct.create('div', {
          innerHTML: '<p>No workflow data available</p>',
          class: 'workflow-empty'
        }, this.domNode);
        return;
      }

      // Parse JSON if it's a string
      var data = this.workflowData;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('[WorkflowEngine] Failed to parse workflow data:', e);
          domConstruct.create('div', {
            innerHTML: '<p>Error: Invalid workflow data</p>',
            class: 'workflow-error'
          }, this.domNode);
          return;
        }
      }

      // Create visual workflow display
      this.renderWorkflowView(data);
    },

    /**
     * Renders the workflow in a visual pipeline format
     * @param {Object} workflow - Parsed workflow data
     */
    renderWorkflowView: function(workflow) {
      // Create main container
      var container = domConstruct.create('div', {
        class: 'workflow-visual-container'
      }, this.domNode);

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
      var header = domConstruct.create('div', {
        class: 'workflow-header'
      }, container);

      domConstruct.create('div', {
        class: 'workflow-title',
        innerHTML: this.escapeHtml(workflow.workflow_name || 'Untitled Workflow')
      }, header);

      var metaContainer = domConstruct.create('div', {
        class: 'workflow-metadata'
      }, header);

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
        class: 'workflow-pipeline'
      }, stepsContainer);

      // Render each step
      workflow.steps.forEach(lang.hitch(this, function(step, index) {
        this.renderStep(step, index, pipelineContainer);

        // Add connector arrow if not the last step
        if (index < workflow.steps.length - 1) {
          this.renderStepConnector(pipelineContainer);
        }
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
        class: 'workflow-step-card'
      }, container);

      // Step header
      var stepHeader = domConstruct.create('div', {
        class: 'workflow-step-header'
      }, stepCard);

      domConstruct.create('div', {
        class: 'workflow-step-number',
        innerHTML: (index + 1)
      }, stepHeader);

      domConstruct.create('div', {
        class: 'workflow-step-name',
        innerHTML: this.escapeHtml(step.step_name || 'Step ' + (index + 1))
      }, stepHeader);

      // App name
      domConstruct.create('div', {
        class: 'workflow-step-app',
        innerHTML: '<strong>App:</strong> ' + this.escapeHtml(step.app)
      }, stepCard);

      // Parameters
      if (step.params && Object.keys(step.params).length > 0) {
        var paramsSection = domConstruct.create('div', {
          class: 'workflow-step-section'
        }, stepCard);

        domConstruct.create('div', {
          class: 'workflow-section-label',
          innerHTML: 'Parameters:'
        }, paramsSection);

        var paramsList = domConstruct.create('div', {
          class: 'workflow-params-list'
        }, paramsSection);

        for (var key in step.params) {
          if (step.params.hasOwnProperty(key)) {
            this.renderParameter(key, step.params[key], paramsList);
          }
        }
      }

      // Outputs
      if (step.outputs && Object.keys(step.outputs).length > 0) {
        var outputsSection = domConstruct.create('div', {
          class: 'workflow-step-section'
        }, stepCard);

        domConstruct.create('div', {
          class: 'workflow-section-label',
          innerHTML: 'Outputs:'
        }, outputsSection);

        var outputsList = domConstruct.create('div', {
          class: 'workflow-outputs-list'
        }, outputsSection);

        for (var outputKey in step.outputs) {
          if (step.outputs.hasOwnProperty(outputKey)) {
            this.renderOutput(outputKey, step.outputs[outputKey], outputsList);
          }
        }
      }

      // Dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        var depsSection = domConstruct.create('div', {
          class: 'workflow-step-section workflow-dependencies-section'
        }, stepCard);

        domConstruct.create('div', {
          class: 'workflow-section-label',
          innerHTML: 'Depends on:'
        }, depsSection);

        var depsList = domConstruct.create('div', {
          class: 'workflow-dependencies-list'
        }, depsSection);

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
      this.workflowData = newData;
      // Clear existing content
      domConstruct.empty(this.domNode);
      // Re-render
      this.render();
    }
  });
});

