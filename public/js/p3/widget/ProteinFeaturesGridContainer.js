define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './ProteinFeaturesGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin',
  './viewer/DomainVisualizationPanel',
  'xstyle/css!../resources/domain-viewer.css'

], function (
  declare, on, domConstruct, Topic,
  popup, TooltipDialog,
  ProteinFeaturesGrid, AdvancedSearchFields, GridContainer,
  PathJoin,
  DomainVisualizationPanel
) {

  const dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: ProteinFeaturesGrid,
    containerType: 'proteinFeatures_data',
    tutorialLink: 'quick_references/organisms_taxon/domains_and_motifs.html',
    facetFields: AdvancedSearchFields['protein_feature'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['protein_feature'].filter((ff) => ff.search),
    filter: '',
    dataModel: 'protein_feature',
    primaryKey: 'id',
    defaultFilter: '',
    tooltip: 'The "Domains and Motifs" tab shows predicted domains and motifs for proteins from reference and representative genomes associated with the current view.',

    // Use sidebar design so right panels extend to top, and visualization aligns with grid
    design: 'sidebar',

    // Visualization panel (only created for single-feature view)
    visualizationPanel: null,
    // Flag to track if this is a single-feature context
    isSingleFeatureView: false,

    postCreate: function () {
      this.inherited(arguments);

      // Subscribe to grid data refresh events to update visualization
      this._setupVisualizationSync();
    },

    /**
     * Check if the current state represents a single-feature view
     * @param {Object} state - The current state object
     * @returns {boolean} True if viewing domains for a single feature
     */
    _isSingleFeatureState: function (state) {
      if (!state || !state.search) {
        return false;
      }
      // Check if the search query is for a single feature_id
      // Pattern: eq(feature_id,xxx) where xxx is a single ID (not a list)
      var search = state.search;
      var singleFeaturePattern = /^eq\(feature_id,([^,)]+)\)$/;
      return singleFeaturePattern.test(search);
    },

    /**
     * Override onFirstView - don't create visualization panel here,
     * wait until we know if it's a single-feature view
     */
    onFirstView: function () {
      // Call parent to create the grid
      this.inherited(arguments);
    },

    /**
     * Create the domain visualization panel (only for single-feature view)
     */
    _createVisualizationPanel: function () {
      if (this.visualizationPanel) {
        return; // Already created
      }

      // Create the visualization panel as a ContentPane with region: 'top'
      // layoutPriority 5 is higher than the right panels (3 and 4), so the
      // visualization will be positioned after them (closer to center),
      // giving it the same width as the grid
      this.visualizationPanel = new DomainVisualizationPanel({
        title: 'Domain Map',
        region: 'top',
        splitter: false,
        layoutPriority: 5
      });

      // Add as child of this BorderContainer
      this.addChild(this.visualizationPanel);

      // Trigger resize to adjust layout
      this.resize();
    },

    /**
     * Remove the visualization panel if it exists
     */
    _removeVisualizationPanel: function () {
      if (this.visualizationPanel) {
        this.removeChild(this.visualizationPanel);
        this.visualizationPanel.destroyRecursive();
        this.visualizationPanel = null;
        this.resize();
      }
    },

    /**
     * Set up synchronization between grid and visualization
     */
    _setupVisualizationSync: function () {
      var self = this;

      // Listen for grid refresh/data load events
      Topic.subscribe('/domainViewer/select', function (data) {
        if (data && data.domain && self.grid) {
          // Find the row in the grid and select it
          var id = data.domain.id;
          if (id) {
            self.grid.select(id);
          }
        }
      });
    },

    /**
     * Update visualization when grid data changes
     */
    _updateVisualization: function () {
      var self = this;

      if (!this.visualizationPanel || !this.grid) {
        return;
      }

      // Get visible data from the grid
      var domains = [];
      var proteinLength = 0;

      // Try to get data from the grid store
      if (this.grid.store) {
        var query = this.grid.get('query');
        this.grid.store.query(query, { count: 1000 }).then(function (results) {
          if (results && results.length > 0) {
            domains = results;
            // Estimate protein length from max domain end
            domains.forEach(function (d) {
              if (d.end && d.end > proteinLength) {
                proteinLength = d.end;
              }
            });
            // Add some padding
            proteinLength = Math.ceil(proteinLength * 1.05);

            // Update the visualization panel
            self.visualizationPanel.setData(domains, proteinLength);

            // Publish data loaded event
            Topic.publish('/domainGrid/dataLoaded', {
              domains: domains,
              proteinLength: proteinLength
            });
          } else {
            // No domains found
            self.visualizationPanel.setData([], 0);
          }
        });
      }
    },

    /**
     * Override onSetState to conditionally show visualization
     */
    onSetState: function (attr, oldState, state) {
      // Call parent's onSetState first
      this.inherited(arguments);

      var self = this;
      var isSingleFeature = this._isSingleFeatureState(state);

      if (isSingleFeature !== this.isSingleFeatureView) {
        this.isSingleFeatureView = isSingleFeature;

        if (isSingleFeature) {
          // Create visualization panel for single-feature view
          this._createVisualizationPanel();
        } else {
          // Remove visualization panel for multi-feature view
          this._removeVisualizationPanel();
        }
      }

      // Update visualization after a short delay to allow grid to update
      if (this.visualizationPanel && state && isSingleFeature) {
        setTimeout(function () {
          self._updateVisualization();
        }, 500);
      }
    },

    getFilterPanel: function (opts) {

    },
    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {
          const _self = this;

          const totalRows = _self.grid.totalRows;
          const dataType = _self.dataModel
          const primaryKey = _self.primaryKey
          const currentQuery = _self.grid.get('query')
          const query = `${currentQuery}&sort(${primaryKey})&limit(${totalRows})`

          on(downloadTT.domNode, 'div:click', function (evt) {
            const typeAccept = evt.target.attributes.rel.value

            const baseUrl = `${PathJoin(window.App.dataServiceURL, dataType)}/?http_accept=${typeAccept}&http_download=true`

            const form = domConstruct.create('form', {
              style: 'display: none;',
              id: 'downloadForm',
              enctype: 'application/x-www-form-urlencoded',
              name: 'downloadForm',
              method: 'post',
              action: baseUrl
            }, _self.domNode);
            domConstruct.create('input', {
              type: 'hidden',
              value: encodeURIComponent(query),
              name: 'rql'
            }, form);
            // Add authorization as form field for POST requests
            if (window.App.authorizationToken) {
              domConstruct.create('input', {
                type: 'hidden',
                value: window.App.authorizationToken,
                name: 'http_authorization'
              }, form);
            }
            form.submit();

            popup.close(downloadTT);
          });

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true,
        'left'
      ]
    ])
  });
});
