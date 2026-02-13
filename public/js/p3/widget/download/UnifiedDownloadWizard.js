define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/topic',
  'dojo/when',
  'dijit/Dialog',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/UnifiedDownloadWizard.html',
  '../../util/QueryDescriptor',
  '../../util/DownloadFormats',
  './DataTypeSelectorStep',
  './RecordSelectorStep',
  './FASTAConfiguratorStep',
  './TableConfiguratorStep',
  './GenomeBundleConfiguratorStep',
  'dijit/form/Button'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  Topic,
  when,
  Dialog,
  _TemplatedMixin,
  _WidgetsInTemplateMixin,
  template,
  QueryDescriptor,
  DownloadFormats,
  DataTypeSelectorStep,
  RecordSelectorStep,
  FASTAConfiguratorStep,
  TableConfiguratorStep,
  GenomeBundleConfiguratorStep
) {
  /**
   * UnifiedDownloadWizard - Main wizard dialog for downloads
   *
   * Usage:
   * ```javascript
   * // From saved search
   * UnifiedDownloadWizard.show({
   *   queryDescriptor: savedSearch
   * });
   *
   * // From grid selection
   * UnifiedDownloadWizard.show({
   *   selection: grid.selection,
   *   containerType: 'genome_data',
   *   grid: grid
   * });
   * ```
   */

  var WizardDialog = declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    title: 'Download Data',
    'class': 'downloadWizardDialog',

    // Configuration
    queryDescriptor: null,
    selection: null,
    containerType: null,
    grid: null,
    preselectedFormat: null,

    // State
    currentStepIndex: 0,
    steps: null,
    stepData: null,

    // Step configurations
    stepConfigs: [
      { id: 'dataType', title: 'Data Type', StepClass: null }, // Set in postMixInProperties
      { id: 'records', title: 'Records', StepClass: null },
      { id: 'options', title: 'Options', StepClass: null } // Dynamic based on format
    ],

    postMixInProperties: function () {
      this.inherited(arguments);
      this.steps = [];
      this.stepData = {};
    },

    postCreate: function () {
      this.inherited(arguments);

      // Set dialog dimensions
      this.domNode.style.width = '700px';
      this.containerNode.style.minHeight = '400px';

      // Build context from inputs
      this._buildContext();

      // Create step indicators
      this._createStepIndicators();

      // Create steps
      this._createSteps();

      // Initialize first step
      this._goToStep(0);
    },

    /**
     * Build context object from constructor arguments
     */
    _buildContext: function () {
      var context = {
        queryDescriptor: this.queryDescriptor,
        selection: this.selection || [],
        containerType: this.containerType,
        grid: this.grid,
        dataType: null,
        preselectedFormat: this.preselectedFormat
      };

      // Determine data type
      if (this.queryDescriptor) {
        context.dataType = this.queryDescriptor.dataType;
      } else if (this.containerType) {
        context.dataType = DownloadFormats.containerTypeToDataType(this.containerType);
      }

      // Build query descriptor if not provided
      if (!context.queryDescriptor && context.dataType) {
        var rqlQuery = '';
        if (this.grid && this.grid.store && this.grid.store.query) {
          rqlQuery = this.grid.store.query;
        } else if (this.grid && this.grid.state && this.grid.state.search) {
          rqlQuery = this.grid.state.search;
        }

        context.queryDescriptor = QueryDescriptor.create({
          dataType: context.dataType,
          rqlQuery: rqlQuery,
          source: 'download_wizard'
        });
      }

      this.context = context;
    },

    /**
     * Create step indicator UI
     */
    _createStepIndicators: function () {
      var self = this;
      domConstruct.empty(this.stepIndicatorNode);

      var stepTitles = ['Data Type', 'Records', 'Options'];

      stepTitles.forEach(function (title, idx) {
        var indicator = domConstruct.create('div', {
          'class': 'stepIndicator' + (idx === 0 ? ' active' : ''),
          'data-step': idx,
          innerHTML: '<span class="stepNumber">' + (idx + 1) + '</span>' +
                     '<span class="stepTitle">' + title + '</span>'
        }, self.stepIndicatorNode);

        // Allow clicking on completed steps to go back
        on(indicator, 'click', function () {
          var stepIdx = parseInt(this.getAttribute('data-step'), 10);
          if (stepIdx < self.currentStepIndex) {
            self._goToStep(stepIdx);
          }
        });
      });
    },

    /**
     * Create step widgets
     */
    _createSteps: function () {
      var self = this;

      // Step 1: Data Type Selection
      var step1 = new DataTypeSelectorStep({
        stepId: 'dataType',
        stepNumber: 0,
        wizard: this,
        context: this.context
      });
      step1.placeAt(this.contentNode);
      step1.startup();
      this.steps.push(step1);

      // Step 2: Record Selection
      var step2 = new RecordSelectorStep({
        stepId: 'records',
        stepNumber: 1,
        wizard: this,
        context: this.context
      });
      step2.placeAt(this.contentNode);
      step2.startup();
      domClass.add(step2.domNode, 'dijitHidden');
      this.steps.push(step2);

      // Step 3: Options (created dynamically based on format)
      // Placeholder - will be replaced when format is selected
      this._createOptionsStep('default');
    },

    /**
     * Create or replace the options step based on format
     */
    _createOptionsStep: function (formatType) {
      var self = this;

      // Remove existing options step if any
      if (this.steps.length > 2) {
        var oldStep = this.steps.pop();
        oldStep.destroy();
      }

      // Determine which configurator to use
      var StepClass;
      if (formatType === 'bundle') {
        StepClass = GenomeBundleConfiguratorStep;
      } else if (formatType === 'dna+fasta' || formatType === 'protein+fasta' ||
                 formatType === 'cds+fasta' || formatType === 'rna+fasta') {
        StepClass = FASTAConfiguratorStep;
      } else {
        StepClass = TableConfiguratorStep;
      }

      var step3 = new StepClass({
        stepId: 'options',
        stepNumber: 2,
        wizard: this,
        context: this.context
      });
      step3.placeAt(this.contentNode);
      step3.startup();
      domClass.add(step3.domNode, 'dijitHidden');
      this.steps.push(step3);
    },

    /**
     * Go to a specific step
     */
    _goToStep: function (stepIndex) {
      var self = this;

      // Validate range
      if (stepIndex < 0 || stepIndex >= this.steps.length) {
        return;
      }

      // Hide current step
      if (this.currentStepIndex < this.steps.length) {
        var currentStep = this.steps[this.currentStepIndex];
        domClass.add(currentStep.domNode, 'dijitHidden');
        currentStep.onHide();
      }

      // Update step indicators
      var indicators = this.stepIndicatorNode.querySelectorAll('.stepIndicator');
      for (var i = 0; i < indicators.length; i++) {
        domClass.remove(indicators[i], 'active');
        domClass.remove(indicators[i], 'completed');
        if (i < stepIndex) {
          domClass.add(indicators[i], 'completed');
        } else if (i === stepIndex) {
          domClass.add(indicators[i], 'active');
        }
      }

      // Show new step
      this.currentStepIndex = stepIndex;
      var newStep = this.steps[stepIndex];

      // Pass accumulated data to the step
      newStep.setPreviousStepData(this._getAccumulatedData());
      newStep.setContext(this.context);

      domClass.remove(newStep.domNode, 'dijitHidden');
      newStep.onShow();

      // Update buttons
      this._updateButtons();
    },

    /**
     * Get accumulated data from all completed steps
     */
    _getAccumulatedData: function () {
      var data = {};
      for (var i = 0; i < this.currentStepIndex; i++) {
        lang.mixin(data, this.steps[i].getData());
      }
      return data;
    },

    /**
     * Update button visibility and labels
     */
    _updateButtons: function () {
      var isFirstStep = this.currentStepIndex === 0;
      var isLastStep = this.currentStepIndex === this.steps.length - 1;

      // Back button
      if (isFirstStep) {
        domClass.add(this.backButton.domNode, 'dijitHidden');
      } else {
        domClass.remove(this.backButton.domNode, 'dijitHidden');
      }

      // Next/Download button
      if (isLastStep) {
        domClass.add(this.nextButton.domNode, 'dijitHidden');
        domClass.remove(this.downloadButton.domNode, 'dijitHidden');
      } else {
        domClass.remove(this.nextButton.domNode, 'dijitHidden');
        domClass.add(this.downloadButton.domNode, 'dijitHidden');
      }
    },

    /**
     * Handle Back button click
     */
    onBack: function () {
      if (this.currentStepIndex > 0) {
        this._goToStep(this.currentStepIndex - 1);
      }
    },

    /**
     * Handle Next button click
     */
    onNext: function () {
      var currentStep = this.steps[this.currentStepIndex];

      // Validate current step
      var validation = currentStep.validate();
      if (validation !== true) {
        var message = (typeof validation === 'object' && validation.message)
          ? validation.message
          : 'Please complete this step before continuing.';
        currentStep.showError(message);
        return;
      }

      currentStep.clearError();
      currentStep.markCompleted();

      // Store step data
      this.stepData[currentStep.stepId] = currentStep.getData();

      // If moving from step 1 (format selection), update options step
      if (this.currentStepIndex === 0) {
        var formatData = this.stepData.dataType || {};
        var format = formatData.format || 'tsv';
        this._createOptionsStep(format);
      }

      // Check if we should skip the options step
      var nextStepIndex = this.currentStepIndex + 1;
      if (nextStepIndex < this.steps.length) {
        var nextStep = this.steps[nextStepIndex];
        if (nextStep.canSkip && nextStep.canSkip()) {
          nextStepIndex++;
        }
      }

      // Go to next step
      if (nextStepIndex < this.steps.length) {
        this._goToStep(nextStepIndex);
      }
    },

    /**
     * Handle Download button click
     */
    onDownload: function () {
      var self = this;
      var currentStep = this.steps[this.currentStepIndex];

      // Validate current step
      var validation = currentStep.validate();
      if (validation !== true) {
        var message = (typeof validation === 'object' && validation.message)
          ? validation.message
          : 'Please complete this step before downloading.';
        currentStep.showError(message);
        return;
      }

      currentStep.clearError();

      // Collect all step data
      this.stepData[currentStep.stepId] = currentStep.getData();

      // Build download specification
      var downloadSpec = this._buildDownloadSpec();

      // Execute download
      this._executeDownload(downloadSpec);
    },

    /**
     * Build download specification from collected data
     */
    _buildDownloadSpec: function () {
      var dataTypeData = this.stepData.dataType || {};
      var recordsData = this.stepData.records || {};
      var optionsData = this.stepData.options || {};

      return {
        // Format info
        format: dataTypeData.format || 'tsv',
        category: dataTypeData.category || 'table',

        // Record scope
        recordScope: recordsData.scope || 'all',
        randomLimit: recordsData.randomLimit || 2000,

        // Data context
        dataType: this.context.dataType,
        query: this.context.queryDescriptor ? this.context.queryDescriptor.rqlQuery : '',
        selection: recordsData.scope === 'selected' ? this.context.selection : [],

        // Format-specific options
        config: optionsData
      };
    },

    /**
     * Execute the download
     */
    _executeDownload: function (downloadSpec) {
      var self = this;

      // Show loading state
      this.downloadButton.set('disabled', true);
      this.downloadButton.set('label', '<i class="fa fa-spinner fa-spin"></i> Downloading...');

      // Dynamically load and use DownloadExecutor
      require(['../../util/DownloadExecutor'], function (DownloadExecutor) {
        when(
          DownloadExecutor.execute(downloadSpec),
          function (result) {
            // Success - close dialog
            Topic.publish('/Notification', {
              message: 'Download started',
              type: 'message'
            });
            self.hide();
          },
          function (err) {
            // Error
            console.error('Download failed:', err);
            Topic.publish('/Notification', {
              message: 'Download failed: ' + (err.message || err),
              type: 'error'
            });
            self.downloadButton.set('disabled', false);
            self.downloadButton.set('label', '<i class="fa fa-download"></i> Download');
          }
        );
      });
    },

    /**
     * Handle Cancel button click
     */
    onCancel: function () {
      this.hide();
    },

    /**
     * Handle step data changes
     */
    onStepDataChanged: function (step) {
      // Can be used to update summary or enable/disable buttons
    },

    /**
     * Override hide to cleanup
     */
    hide: function () {
      this.inherited(arguments);
    },

    /**
     * Destroy the wizard
     */
    destroy: function () {
      // Destroy all steps
      this.steps.forEach(function (step) {
        step.destroy();
      });
      this.steps = [];
      this.inherited(arguments);
    }
  });

  // Static method to show the wizard
  WizardDialog.show = function (options) {
    var wizard = new WizardDialog(options);
    wizard.show();
    return wizard;
  };

  // Convenience method
  WizardDialog.open = WizardDialog.show;

  return WizardDialog;
});
