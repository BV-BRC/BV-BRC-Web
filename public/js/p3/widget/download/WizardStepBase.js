define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/topic',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin'
], function (
  declare,
  lang,
  on,
  domClass,
  Topic,
  _WidgetBase,
  _TemplatedMixin
) {
  /**
   * WizardStepBase - Base class for wizard step components
   *
   * Each step must implement:
   * - validate(): Returns true if step is valid to proceed
   * - getData(): Returns the data collected in this step
   * - reset(): Resets the step to initial state
   *
   * Optional overrides:
   * - onShow(): Called when step becomes active
   * - onHide(): Called when step is hidden
   * - canSkip(): Returns true if step can be skipped
   */

  return declare([_WidgetBase, _TemplatedMixin], {
    // Step identification
    stepId: '',
    stepTitle: 'Step',
    stepDescription: '',
    stepNumber: 0,

    // Step state
    isActive: false,
    isCompleted: false,
    isSkippable: false,

    // Wizard reference
    wizard: null,

    // Data from previous steps (set by wizard)
    previousStepData: null,

    // Initial context (set by wizard)
    context: null,

    /**
     * Lifecycle: Build the step's DOM
     */
    buildRendering: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, 'wizardStep');
      domClass.add(this.domNode, 'wizardStep-' + this.stepId);
    },

    /**
     * Lifecycle: After DOM is ready
     */
    postCreate: function () {
      this.inherited(arguments);
    },

    /**
     * Set the wizard context (called by wizard before showing)
     * @param {Object} context - Context from wizard (queryDescriptor, selection, etc.)
     */
    setContext: function (context) {
      this.context = context;
      this.onContextSet(context);
    },

    /**
     * Called when context is set - override in subclasses
     * @param {Object} context
     */
    onContextSet: function (context) {
      // Override in subclasses
    },

    /**
     * Set data from previous steps
     * @param {Object} data - Combined data from all previous steps
     */
    setPreviousStepData: function (data) {
      this.previousStepData = data;
      this.onPreviousStepDataSet(data);
    },

    /**
     * Called when previous step data is set - override in subclasses
     * @param {Object} data
     */
    onPreviousStepDataSet: function (data) {
      // Override in subclasses
    },

    /**
     * Called when this step becomes active
     */
    onShow: function () {
      this.isActive = true;
      domClass.add(this.domNode, 'active');
      // Override in subclasses for custom behavior
    },

    /**
     * Called when this step is hidden
     */
    onHide: function () {
      this.isActive = false;
      domClass.remove(this.domNode, 'active');
      // Override in subclasses for custom behavior
    },

    /**
     * Validate the step - must be implemented by subclasses
     * @returns {boolean|Object} True if valid, or {valid: false, message: 'error'}
     */
    validate: function () {
      // Override in subclasses
      return true;
    },

    /**
     * Get the data collected in this step - must be implemented by subclasses
     * @returns {Object} Step data
     */
    getData: function () {
      // Override in subclasses
      return {};
    },

    /**
     * Reset the step to initial state
     */
    reset: function () {
      this.isCompleted = false;
      domClass.remove(this.domNode, 'completed');
      // Override in subclasses for custom reset logic
    },

    /**
     * Mark step as completed
     */
    markCompleted: function () {
      this.isCompleted = true;
      domClass.add(this.domNode, 'completed');
    },

    /**
     * Check if this step can be skipped
     * @returns {boolean}
     */
    canSkip: function () {
      return this.isSkippable;
    },

    /**
     * Notify wizard that step data has changed
     */
    notifyDataChanged: function () {
      if (this.wizard && this.wizard.onStepDataChanged) {
        this.wizard.onStepDataChanged(this);
      }
      Topic.publish('/DownloadWizard/stepDataChanged', {
        stepId: this.stepId,
        data: this.getData()
      });
    },

    /**
     * Show a validation error message
     * @param {string} message - Error message
     */
    showError: function (message) {
      if (this.errorNode) {
        this.errorNode.innerHTML = message;
        domClass.remove(this.errorNode, 'dijitHidden');
      }
    },

    /**
     * Clear validation error message
     */
    clearError: function () {
      if (this.errorNode) {
        this.errorNode.innerHTML = '';
        domClass.add(this.errorNode, 'dijitHidden');
      }
    },

    /**
     * Show loading state
     */
    showLoading: function () {
      domClass.add(this.domNode, 'loading');
      if (this.loadingNode) {
        domClass.remove(this.loadingNode, 'dijitHidden');
      }
    },

    /**
     * Hide loading state
     */
    hideLoading: function () {
      domClass.remove(this.domNode, 'loading');
      if (this.loadingNode) {
        domClass.add(this.loadingNode, 'dijitHidden');
      }
    },

    /**
     * Utility: Format number with commas
     */
    formatNumber: function (num) {
      if (num === null || num === undefined) return '—';
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Destroy the widget
     */
    destroy: function () {
      this.inherited(arguments);
    }
  });
});
