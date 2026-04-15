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
  './AccessionConfiguratorStep',
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
  AccessionConfiguratorStep,
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

  var WizardDialog = declare([Dialog], {
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
      this.domNode.style.width = '900px';
      this.containerNode.style.minHeight = '400px';

      // Build the wizard UI inside the dialog's containerNode
      this._buildWizardUI();

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
     * Build the wizard UI structure inside the dialog
     */
    _buildWizardUI: function () {
      var container = this.containerNode;
      domClass.add(container, 'unifiedDownloadWizard');

      // Header with step indicators
      var header = domConstruct.create('div', {
        'class': 'downloadWizardHeader'
      }, container);

      this.stepIndicatorNode = domConstruct.create('div', {
        'class': 'downloadWizardSteps'
      }, header);

      // Content area
      this.contentNode = domConstruct.create('div', {
        'class': 'downloadWizardContent'
      }, container);

      // Footer with buttons
      var footer = domConstruct.create('div', {
        'class': 'downloadWizardFooter'
      }, container);

      this.infoNode = domConstruct.create('div', {
        'class': 'downloadWizardInfo'
      }, footer);

      var buttons = domConstruct.create('div', {
        'class': 'downloadWizardButtons'
      }, footer);

      // Back button
      this.backButton = domConstruct.create('button', {
        type: 'button',
        'class': 'downloadWizardButton backButton',
        innerHTML: '<span class="fa icon-arrow-left"></span> Back'
      }, buttons);
      on(this.backButton, 'click', lang.hitch(this, 'onBack'));

      // Next button
      this.nextButton = domConstruct.create('button', {
        type: 'button',
        'class': 'downloadWizardButton nextButton primary',
        innerHTML: 'Next <span class="fa icon-arrow-right"></span>'
      }, buttons);
      on(this.nextButton, 'click', lang.hitch(this, 'onNext'));

      // Download button
      this.downloadButton = domConstruct.create('button', {
        type: 'button',
        'class': 'downloadWizardButton downloadButton primary dijitHidden',
        innerHTML: '<span class="fa icon-download"></span> Download'
      }, buttons);
      on(this.downloadButton, 'click', lang.hitch(this, 'onDownload'));

      // Cancel button
      this.cancelButton = domConstruct.create('button', {
        type: 'button',
        'class': 'downloadWizardButton cancelButton',
        innerHTML: 'Cancel'
      }, buttons);
      on(this.cancelButton, 'click', lang.hitch(this, 'onCancel'));
    },

    /**
     * Build context object from constructor arguments
     */
    _buildContext: function () {
      var context = {
        queryDescriptor: this.queryDescriptor,
        selection: [],
        containerType: this.containerType,
        grid: this.grid,
        dataType: null,
        preselectedFormat: this.preselectedFormat
      };

      // If we have a query descriptor, use it as the primary source of truth
      if (this.queryDescriptor) {
        context.dataType = this.queryDescriptor.dataType;

        // Extract selection from queryDescriptor.selectedIds
        if (this.queryDescriptor.selectedIds && this.queryDescriptor.selectedIds.length > 0) {
          context.selection = this.queryDescriptor.selectedIds;
        }
      } else {
        // Fall back to containerType for data type
        if (this.containerType) {
          context.dataType = DownloadFormats.containerTypeToDataType(this.containerType);
        } else if (this.dataType) {
          context.dataType = this.dataType;
        }

        // Build query descriptor if not provided
        if (context.dataType) {
          // Get the RQL query string - prefer the explicitly passed rqlQuery
          var rqlQuery = '';
          if (this.rqlQuery && typeof this.rqlQuery === 'string') {
            rqlQuery = this.rqlQuery;
          } else if (this.grid && this.grid.state && this.grid.state.search) {
            rqlQuery = this.grid.state.search;
          }

          context.queryDescriptor = QueryDescriptor.create({
            dataType: context.dataType,
            rqlQuery: rqlQuery,
            source: 'download_wizard'
          });
        }
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

      // Determine which configurator to use based on format type
      var StepClass;
      if (formatType === 'bundle') {
        StepClass = GenomeBundleConfiguratorStep;
      } else if (DownloadFormats.isFastaFormat(formatType)) {
        // All FASTA formats use the FASTA configurator
        StepClass = FASTAConfiguratorStep;
      } else if (DownloadFormats.isAccessionFormat(formatType)) {
        // Accession lists use a simple skippable configurator
        StepClass = AccessionConfiguratorStep;
      } else {
        // Tables (CSV, TSV, Excel) use the table configurator with column selection
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
        domClass.add(this.backButton, 'dijitHidden');
      } else {
        domClass.remove(this.backButton, 'dijitHidden');
      }

      // Next/Download button
      if (isLastStep) {
        domClass.add(this.nextButton, 'dijitHidden');
        domClass.remove(this.downloadButton, 'dijitHidden');
      } else {
        domClass.remove(this.nextButton, 'dijitHidden');
        domClass.add(this.downloadButton, 'dijitHidden');
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
      console.log('onNext: currentStepIndex =', this.currentStepIndex, 'stepId =', currentStep.stepId);

      // Validate current step
      var validation = currentStep.validate();
      console.log('onNext: validation =', validation);
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
      console.log('onNext: stepData =', this.stepData);

      // If moving from step 0 (format selection), update options step
      if (this.currentStepIndex === 0) {
        var formatData = this.stepData.dataType || {};
        var format = formatData.format || 'tsv';
        console.log('onNext: creating options step for format =', format);
        this._createOptionsStep(format);
      }

      // Check if we should skip the options step
      var nextStepIndex = this.currentStepIndex + 1;
      console.log('onNext: nextStepIndex =', nextStepIndex, 'steps.length =', this.steps.length);
      if (nextStepIndex < this.steps.length) {
        var nextStep = this.steps[nextStepIndex];
        console.log('onNext: nextStep.stepId =', nextStep.stepId, 'canSkip =', nextStep.canSkip ? nextStep.canSkip() : 'no canSkip method');
        if (nextStep.canSkip && nextStep.canSkip()) {
          console.log('onNext: skipping step', nextStepIndex);
          nextStepIndex++;
        }
      }

      console.log('onNext: final nextStepIndex =', nextStepIndex);
      // Go to next step, or trigger download if we've skipped past the last step
      if (nextStepIndex < this.steps.length) {
        console.log('onNext: going to step', nextStepIndex);
        this._goToStep(nextStepIndex);
      } else {
        // All remaining steps can be skipped - proceed directly to download
        console.log('onNext: triggering download');
        this.onDownload();
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

      // Get query descriptor for data
      var qd = this.context.queryDescriptor || {};

      // Get selected IDs if scope is 'selected'
      // These come from the queryDescriptor (already extracted as primary key values)
      var selectedIds = [];
      if (recordsData.scope === 'selected') {
        if (qd.selectedIds && qd.selectedIds.length > 0) {
          selectedIds = qd.selectedIds;
        } else if (this.context.selection && this.context.selection.length > 0) {
          // Fall back to context.selection (which should already be IDs)
          selectedIds = this.context.selection;
        }
      }

      return {
        // Format info
        format: dataTypeData.format || 'tsv',
        category: dataTypeData.category || 'table',

        // Record scope (executor expects 'scope', not 'recordScope')
        scope: recordsData.scope || 'all',
        randomLimit: recordsData.randomLimit || 2000,

        // Data context from queryDescriptor
        dataType: qd.dataType || this.context.dataType,
        rqlQuery: qd.rqlQuery || '',
        primaryKey: qd.primaryKey || 'id',
        selectedIds: selectedIds,
        totalCount: recordsData.totalCount,

        // Column selection (for table downloads)
        columns: optionsData.columns || null,

        // FASTA configuration
        fastaConfig: optionsData.sequenceIdField ? {
          defLineFields: [optionsData.sequenceIdField].concat(optionsData.descriptionFields || []),
          delimiter: '|'
        } : null,

        // Bundle configuration
        bundleConfig: optionsData.bundleConfig || null
      };
    },

    /**
     * Execute the download
     */
    _executeDownload: function (downloadSpec) {
      var self = this;

      // Show loading state
      this.downloadButton.disabled = true;
      this.downloadButton.innerHTML = '<span class="fa icon-spinner"></span> Downloading...';

      // Dynamically load and use DownloadExecutor
      require(['p3/util/DownloadExecutor'], function (DownloadExecutor) {
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
            self.downloadButton.disabled = false;
            self.downloadButton.innerHTML = '<span class="fa icon-download"></span> Download';
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
