define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/GenomeBundleConfiguratorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  query,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * GenomeBundleConfiguratorStep - Step 3 configurator for genome bundle downloads
   *
   * Allows users to:
   * - Select file types to include (FASTA, GFF, tab files, etc.)
   * - Choose annotation source (BV-BRC, RefSeq, All)
   * - Select archive format (ZIP, TGZ)
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure genome package options',

    // State
    selectedFileTypes: null,
    annotationType: 'PATRIC',
    archiveType: 'zip',

    // Event handlers
    _handlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this.selectedFileTypes = [];
      this._renderFileTypes();
      this._setupEventHandlers();
    },

    /**
     * Render file type checkboxes
     */
    _renderFileTypes: function () {
      var self = this;
      domConstruct.empty(this.fileTypesNode);

      // Get bundle types from DownloadFormats
      var bundleTypes = DownloadFormats.getBundleTypes('genome');

      if (!bundleTypes || bundleTypes.length === 0) {
        // Fallback to default types
        bundleTypes = [
          { label: 'Genomic Sequences in FASTA (*.fna)', type: 'fna', skipAnnotation: true },
          { label: 'Protein Sequences in FASTA (*.faa)', type: 'faa' },
          { label: 'Genomic features in GFF format (*.gff)', type: 'gff' },
          { label: 'Genomic features in tab-delimited format (*.features.tab)', type: 'features.tab' },
          { label: 'DNA Sequences of Protein Coding Genes (*.ffn)', type: 'ffn' },
          { label: 'DNA Sequences of RNA Coding Genes (*.frn)', type: 'frn' },
          { label: 'Pathway assignments in tab-delimited format (*.pathway.tab)', type: 'pathway.tab' }
        ];
      }

      bundleTypes.forEach(function (fileType) {
        var typeNode = domConstruct.create('div', {
          'class': 'fileTypeOption',
          innerHTML: '<label>' +
                     '<input type="checkbox" name="fileType" value="' + fileType.type + '" ' +
                     'data-skip-annotation="' + (fileType.skipAnnotation ? 'true' : 'false') + '">' +
                     ' ' + fileType.label +
                     '</label>'
        }, self.fileTypesNode);

        var checkbox = typeNode.querySelector('input[type="checkbox"]');
        var handler = on(checkbox, 'change', function () {
          self._updateSelectedTypes();
        });
        self._handlers.push(handler);
      });
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Annotation type radios
      ['patricRadio', 'refseqRadio', 'allAnnotationRadio'].forEach(function (radioName) {
        if (self[radioName]) {
          var handler = on(self[radioName], 'change', function () {
            if (this.checked) {
              self.annotationType = this.value;
              self.notifyDataChanged();
            }
          });
          self._handlers.push(handler);
        }
      });

      // Archive type radios
      ['zipRadio', 'tarRadio'].forEach(function (radioName) {
        if (self[radioName]) {
          var handler = on(self[radioName], 'change', function () {
            if (this.checked) {
              self.archiveType = this.value;
              self.notifyDataChanged();
            }
          });
          self._handlers.push(handler);
        }
      });
    },

    /**
     * Update selected file types list
     */
    _updateSelectedTypes: function () {
      var checkboxes = this.fileTypesNode.querySelectorAll('input[type="checkbox"]:checked');
      this.selectedFileTypes = [];
      for (var i = 0; i < checkboxes.length; i++) {
        this.selectedFileTypes.push(checkboxes[i].value);
      }

      // Update ready message visibility
      if (this.selectedFileTypes.length > 0) {
        domClass.remove(this.readyMessage, 'dijitHidden');
        this.clearError();
      } else {
        domClass.add(this.readyMessage, 'dijitHidden');
      }

      this.notifyDataChanged();
    },

    /**
     * Called when previous step data is set
     */
    onPreviousStepDataSet: function (data) {
      this._updateSummary(data);
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._updateSummary(this.previousStepData);
    },

    /**
     * Update the summary display
     */
    _updateSummary: function (data) {
      if (!data) return;

      // Genomes count
      if (this.genomesValueNode) {
        var genomesText = 'All genomes';
        if (data.scope === 'selected') {
          genomesText = this.formatNumber(data.selectionCount) + ' selected genomes';
        } else if (data.scope === 'random') {
          genomesText = 'Random ' + this.formatNumber(data.randomLimit) + ' genomes';
        } else if (data.totalCount) {
          genomesText = this.formatNumber(data.totalCount) + ' genomes';
        }
        this.genomesValueNode.textContent = genomesText;
      }
    },

    /**
     * Validate
     */
    validate: function () {
      if (!this.selectedFileTypes || this.selectedFileTypes.length === 0) {
        return {
          valid: false,
          message: 'Please select at least one file type to include in the download.'
        };
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        fileTypes: this.selectedFileTypes,
        annotationType: this.annotationType,
        archiveType: this.archiveType
      };
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
      this.selectedFileTypes = [];
      this.annotationType = 'PATRIC';
      this.archiveType = 'zip';

      // Reset checkboxes
      var checkboxes = this.fileTypesNode.querySelectorAll('input[type="checkbox"]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
      }

      // Reset radios
      if (this.patricRadio) this.patricRadio.checked = true;
      if (this.zipRadio) this.zipRadio.checked = true;

      domClass.add(this.readyMessage, 'dijitHidden');
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._handlers.forEach(function (h) {
        h.remove();
      });
      this._handlers = [];
      this.inherited(arguments);
    }
  });
});
