define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/popup',
  './download/UnifiedDownloadWizard',
  './download/SaveSearchDialog',
  '../util/QueryDescriptor'
], function (
  declare,
  lang,
  popup,
  UnifiedDownloadWizard,
  SaveSearchDialog,
  QueryDescriptor
) {
  /**
   * _SavedSearchMixin - Adds saved search and advanced download capabilities to GridContainer
   *
   * This mixin adds:
   * - "Save Search" action to save the current query
   * - "Advanced Download" action to open the unified download wizard
   *
   * Usage:
   *   declare([GridContainer, _SavedSearchMixin], { ... })
   *
   * Or dynamically apply to an existing grid:
   *   _SavedSearchMixin.applyTo(gridContainer);
   */

  var Mixin = declare(null, {

    // Additional selection actions for saved search functionality
    savedSearchSelectionActions: [
      [
        'SaveSearch',
        'fa icon-bookmark fa-2x',
        {
          label: 'SAVE',
          multiple: false,
          validTypes: ['*'],
          ignoreDataType: true,
          tooltip: 'Save Current Search',
          validContainerTypes: ['sequence_feature_data', 'genome_data', 'sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'spgene_ref_data', 'transcriptomics_experiment_data', 'transcriptomics_sample_data', 'experiment_data', 'bioset_data', 'pathway_data', 'transcriptomics_gene_data', 'gene_expression_data', 'interaction_data', 'genome_amr_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data', 'epitope_data', 'surveillance_data', 'serology_data']
        },
        function (selection, container) {
          // Create descriptor from grid context
          var descriptor = QueryDescriptor.createFromGrid(this.grid);

          // Add metadata
          if (this.state) {
            descriptor.metadata = descriptor.metadata || {};
            if (selection && selection.length > 0) {
              descriptor.metadata.selectionCount = selection.length;
            }
          }

          // Show save dialog
          SaveSearchDialog.show({
            queryDescriptor: descriptor,
            onSave: lang.hitch(this, function (saved) {
              // Optional: Show notification
              if (window.App && window.App.showMessage) {
                window.App.showMessage('Search saved: ' + saved.name);
              }
            })
          });
        },
        true // Show even without selection
      ],
      [
        'AdvancedDownload',
        'fa icon-download fa-2x',
        {
          label: 'ADV DWNLD',
          multiple: true,
          validTypes: ['*'],
          ignoreDataType: true,
          tooltip: 'Advanced Download Options',
          max: 100000,
          validContainerTypes: ['sequence_feature_data', 'genome_data', 'sequence_data', 'feature_data', 'protein_data', 'spgene_data', 'spgene_ref_data', 'transcriptomics_experiment_data', 'transcriptomics_sample_data', 'experiment_data', 'bioset_data', 'pathway_data', 'transcriptomics_gene_data', 'gene_expression_data', 'interaction_data', 'genome_amr_data', 'structure_data', 'proteinFeatures_data', 'pathwayTab_data', 'subsystemTab_data', 'epitope_data', 'surveillance_data', 'serology_data']
        },
        function (selection, container) {
          // Build context for wizard
          var context = {
            grid: this.grid,
            selection: selection,
            containerType: this.containerType
          };

          // Extract data type from container type
          var dataType = this._getDataTypeFromContainer();
          if (dataType) {
            context.dataType = dataType;
          }

          // Get RQL query from state
          if (this.state && this.state.search) {
            context.rqlQuery = this.state.search;
          } else if (this.grid && this.grid.store && this.grid.store.query) {
            context.rqlQuery = this.grid.store.query;
          }

          // Open the unified download wizard
          UnifiedDownloadWizard.show(context);
        },
        false
      ]
    ],

    /**
     * Get data type from container type
     * @returns {string} Data type for the download system
     */
    _getDataTypeFromContainer: function () {
      var containerTypeMap = {
        'genome_data': 'genome',
        'sequence_data': 'genome_sequence',
        'feature_data': 'genome_feature',
        'protein_data': 'genome_feature',
        'sequence_feature_data': 'genome_feature',
        'spgene_data': 'sp_gene',
        'spgene_ref_data': 'sp_gene',
        'pathway_data': 'pathway',
        'pathwayTab_data': 'pathway',
        'subsystemTab_data': 'subsystem',
        'transcriptomics_experiment_data': 'experiment',
        'transcriptomics_sample_data': 'experiment',
        'experiment_data': 'experiment',
        'bioset_data': 'bioset',
        'transcriptomics_gene_data': 'genome_feature',
        'gene_expression_data': 'genome_feature',
        'interaction_data': 'interaction',
        'genome_amr_data': 'genome_amr',
        'structure_data': 'protein_structure',
        'proteinFeatures_data': 'protein_feature',
        'epitope_data': 'epitope',
        'surveillance_data': 'surveillance',
        'serology_data': 'serology'
      };

      return containerTypeMap[this.containerType] || 'genome_feature';
    },

    /**
     * Override postCreate to add saved search actions
     */
    postCreate: function () {
      this.inherited(arguments);
      this._addSavedSearchActions();
    },

    /**
     * Add saved search actions to the selection action bar
     */
    _addSavedSearchActions: function () {
      if (!this.selectionActionBar) return;

      var self = this;
      this.savedSearchSelectionActions.forEach(function (action) {
        // Check if action already exists
        if (self.selectionActionBar._actions && self.selectionActionBar._actions[action[0]]) {
          return;
        }

        self.selectionActionBar.addAction(
          action[0],  // name
          action[1],  // icon class
          action[2],  // options
          lang.hitch(self, action[3]),  // handler
          action[4],  // persist (show without selection)
          action[5]   // position
        );
      });
    }
  });

  /**
   * Static method to apply mixin to an existing GridContainer instance
   * @param {Object} gridContainer - GridContainer instance to extend
   */
  Mixin.applyTo = function (gridContainer) {
    // Mix in the properties and methods
    lang.mixin(gridContainer, {
      savedSearchSelectionActions: Mixin.prototype.savedSearchSelectionActions,
      _getDataTypeFromContainer: Mixin.prototype._getDataTypeFromContainer,
      _addSavedSearchActions: Mixin.prototype._addSavedSearchActions
    });

    // Add the actions
    gridContainer._addSavedSearchActions();
  };

  /**
   * Factory method to create saved search actions array
   * Can be concatenated with existing selectionActions
   * @returns {Array} Array of action definitions
   */
  Mixin.getSelectionActions = function () {
    return Mixin.prototype.savedSearchSelectionActions;
  };

  return Mixin;
});
