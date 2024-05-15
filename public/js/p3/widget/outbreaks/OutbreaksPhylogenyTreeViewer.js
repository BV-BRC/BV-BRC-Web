define.amd.jQuery = true;
define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dojo/request',
  'dojo/text!./OutbreaksPhylogenyTreeViewer.html'
], function (
  declare, WidgetBase, Templated, xhr,
  Template
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksPhylogenyTreeViewer',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    isLoaded: false,
    phyloxmlTreeURL: null,
    defaultOptions: {
      alignPhylogram: false, // We should launch with "regular" phylogram.
      branchDataFontSize: 9,
      defaultFont: ['Arial', 'Helvetica', 'Times'],
      initialNodeFillColorVisualization: 'PANGO VOC',
      minBranchLengthValueToShow: 0.000001,
      minConfidenceValueToShow: 50,
      phylogram: true, // We should launch with "regular" phylogram.
      showConfidenceValues: false,
      showExternalLabels: true,
      showNodeName: true,
      showLineage: false,  // NEW as of 1.8.7b1
      showMutations: false, // NEW as of 1.8.7b1
      showNodeVisualizations: true,
      showSequence: false, // Do not show "Sequence" upon launch.
      showSequenceAccession: true, // If user turns on "Sequence" display, accession will be shown.
      searchProperties: true,
      searchIsPartial: false,
      showBranchEvents: false,
      showVisualizationsLegend: true,
      visualizationsLegendOrientation: 'vertical',
      visualizationsLegendXpos: 160,
      visualizationsLegendYpos: 30
    },
    defaultSettings: {
      border: '1px solid #909090',
      controls0Top: 10,
      controls1Top: 10, // Should have both boxes in line.
      // displayHeight: 700,
      // displayWidth: 1200,
      enableAccessToDatabases: true,
      enableCollapseByFeature: false,
      enableDownloads: true,
      enableNodeVisualizations: true,
      enableDynamicSizing: true,
      enableSpecialVisualizations2: true,
      enableSpecialVisualizations3: true,
      enableSpecialVisualizations4: true,
      nhExportWriteConfidences: true,
      searchFieldWidth: '50px',
      collapseLabelWidth: '36px',
      textFieldHeight: '16px',
      showLineageButton: true,
      showMutationsButton: true,
      showShortenNodeNamesButton: false,
      showDynahideButton: false,
      showSearchPropertiesButton: true,
      dynamicallyAddNodeVisualizations: true,
      propertiesToIgnoreForNodeVisualization: ['AccessionNumber', 'Mutation']
    },
    nodeVisualizations: null,
    specialVisualizations: null,

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    },

    _setStateAttr: function () {
      if (!this.isLoaded) {
        this.loadOnce();
        this.isLoaded = true;
      }
    },

    loadOnce: function () {
      const options = {...this.defaultOptions, ...this.options};
      const settings = {
        ...this.defaultSettings, ...this.settings, ...{
          controls0: 'controls-' + this.id + '-0',
          controls1: 'controls-' + this.id + '-1'
        }
      };
      const nodeVisualizations = this.nodeVisualizations || {};
      const specialVisualizations = this.specialVisualizations || {};

      xhr.get(this.phyloxmlTreeURL)
        .then((data) => {
          let tree;
          try {
            tree = window.archaeopteryx.parsePhyloXML(data);
          } catch (e) {
            alert('Error while parsing tree: ' + e);
          }
          if (tree) {
            try {
              window.archaeopteryx.launch('#phylogramOutbreak-' + this.id, tree, options, settings, nodeVisualizations, specialVisualizations);
            } catch (e) {
              alert('Error while launching archaeopteryx: ' + e);
            }
          }
        });
    }
  });
});
