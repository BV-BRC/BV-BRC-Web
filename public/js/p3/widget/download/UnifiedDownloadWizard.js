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
  './GenbankConfiguratorStep',
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
  GenbankConfiguratorStep,
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
        // Carry selected row objects (transient) for cross-collection linkField remapping
        if (this.queryDescriptor.selectedRows && this.queryDescriptor.selectedRows.length > 0) {
          context.selectedRows = this.queryDescriptor.selectedRows;
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
    _createOptionsStep: function (formatType, effectiveDataType) {
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
        StepClass = FASTAConfiguratorStep;
      } else if (formatType === 'genbank') {
        StepClass = GenbankConfiguratorStep;
      } else if (formatType === 'gff' || DownloadFormats.isAccessionFormat(formatType)) {
        StepClass = AccessionConfiguratorStep;
      } else {
        StepClass = TableConfiguratorStep;
      }

      // For cross-collection formats, override dataType so the configurator
      // shows fields from the target collection (e.g., genome_feature fields
      // when downloading features from the genome grid)
      var stepContext = this.context;
      if (effectiveDataType && effectiveDataType !== this.context.dataType) {
        stepContext = lang.mixin({}, this.context, { dataType: effectiveDataType });
      }

      var step3 = new StepClass({
        stepId: 'options',
        stepNumber: 2,
        wizard: this,
        context: stepContext
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
      // Options step (index 2) may have an overridden context for cross-collection
      // formats — don't reset it with the wizard's base context
      if (stepIndex !== 2) {
        newStep.setContext(this.context);
      }

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

        // Determine the effective target data type for cross-collection formats
        var sourceDataType = (this.context.queryDescriptor && this.context.queryDescriptor.dataType) ||
                             this.context.dataType;
        var formatOverride = DownloadFormats.getFormatOverride(sourceDataType, format);
        var effectiveDataType = (formatOverride && formatOverride.dataEndpoint) || sourceDataType;
        this._createOptionsStep(format, effectiveDataType);
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

      // Get format definition for accession-specific properties
      var formatId = dataTypeData.format || 'tsv';
      var format = DownloadFormats.getFormat(formatId);

      // Determine data type and query — may be overridden for cross-collection formats
      var dataType = qd.dataType || this.context.dataType;
      var rqlQuery = qd.rqlQuery || '';
      var primaryKey = qd.primaryKey || 'id';

      // Get selected IDs if scope is 'selected'
      var selectedIds = [];
      if (recordsData.scope === 'selected') {
        if (qd.selectedIds && qd.selectedIds.length > 0) {
          selectedIds = qd.selectedIds;
        } else if (this.context.selection && this.context.selection.length > 0) {
          selectedIds = this.context.selection;
        }
      }

      // Only apply column selection for table formats — sequence formats (FASTA, genbank, gff)
      // must not have a select() clause as their serializers handle field selection internally
      var columns = (format && format.category === 'table') ? (optionsData.columns || null) : null;
      var sourceDataType = null;
      var sourcePrimaryKey = null;
      if (format && format.field) {
        columns = [format.field];

        if (format.dataEndpoint) {
          sourceDataType = qd.dataType || this.context.dataType;
          sourcePrimaryKey = qd.primaryKey || 'id';
          dataType = format.dataEndpoint;

          if (recordsData.scope === 'selected' && format.linkField) {
            primaryKey = format.linkField;
          }
        }
      }

      // Check for data-type-specific format overrides (cross-collection sequence downloads)
      var formatOverride = DownloadFormats.getFormatOverride(
        qd.dataType || this.context.dataType, formatId
      );
      if (formatOverride && formatOverride.dataEndpoint) {
        sourceDataType = qd.dataType || this.context.dataType;
        sourcePrimaryKey = qd.primaryKey || 'id';
        dataType = formatOverride.dataEndpoint;

        if (recordsData.scope === 'selected' && formatOverride.linkField) {
          primaryKey = formatOverride.linkField;
        }
      }

      var linkField = (formatOverride && formatOverride.linkField) ||
                      (format && format.linkField) || null;
      var targetSortField = (formatOverride && formatOverride.sortField) || null;

      // Cross-collection + selected scope: the target is queried by linkField, but the
      // selection holds SOURCE-collection primary keys (e.g. sp_gene 'id' UUIDs). The
      // selected grid rows carry the linkField directly, so remap selectedIds to those
      // values here — the executor then queries the target directly, no source prefetch.
      // Skip when linkField === sourcePrimaryKey (selectedIds are already linkField values,
      // e.g. genome grid → feature accession, both 'genome_id').
      if (recordsData.scope === 'selected' && sourceDataType
          && linkField && linkField !== sourcePrimaryKey) {
        var rows = qd.selectedRows || this.context.selectedRows;
        if (rows && rows.length > 0) {
          var mapped = rows
            .map(function (r) { return r && typeof r === 'object' ? r[linkField] : null; })
            .filter(function (v) { return v !== null && v !== undefined && v !== ''; });
          if (mapped.length > 0) {
            selectedIds = mapped;
            primaryKey = linkField;
          }
        }
      }

      return {
        // Format info
        format: formatId,
        category: dataTypeData.category || 'table',

        // Record scope
        scope: recordsData.scope || 'all',
        randomLimit: recordsData.randomLimit || 2000,

        // Data context
        dataType: dataType,
        rqlQuery: rqlQuery,
        primaryKey: primaryKey,
        selectedIds: selectedIds,
        totalCount: recordsData.totalCount,
        sourceDataType: sourceDataType,
        sourcePrimaryKey: sourcePrimaryKey,
        linkField: linkField,
        targetSortField: targetSortField,

        // Column selection
        columns: columns,

        // FASTA configuration — maps to http_fasta_* query parameters
        fastaConfig: optionsData.sequenceIdField ? {
          idFields: [optionsData.sequenceIdField],
          descriptionFields: optionsData.descriptionFields || []
        } : null,

        // GenBank merged mode
        genbankMerged: optionsData.genbankMerged || false,

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
