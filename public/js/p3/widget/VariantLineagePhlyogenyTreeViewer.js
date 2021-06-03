define.amd.jQuery = true
define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/text!./templates/VariantLineagePhlyogenyTreeViewer.html', 'dijit/_TemplatedMixin',
  'dojo/request',
], function (
  declare, WidgetBase, Template, Templated,
  xhr
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'VariantLineagePhlyogenyTreeViewer',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    constructor: function () {
    },
    isloaded: false,
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.pre_build_options();
    },
    pre_build_options: function () {
      var options = {};
      options.alignPhylogram = false; // We should launch with "regular" phylogram.
      options.branchDataFontSize = 9;
      options.defaultFont = ['Arial', 'Helvetica', 'Times'];
      options.initialNodeFillColorVisualization = 'PANGO Lineage of Concern';
      options.minBranchLengthValueToShow = 0.000001;
      options.minConfidenceValueToShow = 50;
      options.phylogram = true; // We should launch with "regular" phylogram.
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showLineage = false;  //NEW as of 1.8.7b1
      options.showMutations = false; //NEW as of 1.8.7b1
      options.showNodeVisualizations = true;
      options.showSequence = false; // Do not show "Sequence" upon launch.
      options.showSequenceAccession = true; // If user turns on "Sequence" display, accession will be shown.
      options.searchProperties = true;
      options.searchIsPartial = false;
      options.showBranchEvents = false;
      options.showVisualizationsLegend = true;
      options.visualizationsLegendOrientation = 'vertical';
      options.visualizationsLegendXpos = 160;
      options.visualizationsLegendYpos = 30;

      var settings = {};
      settings.border = '1px solid #909090';
      settings.controls0Top = 10;
      settings.controls1Top = 10; // Should have both boxes in line.
      // settings.displayHeight = 700;
      // settings.displayWidth = 1200;
      settings.enableAccessToDatabases = true;
      settings.enableCollapseByFeature = true;
      settings.enableDownloads = true;
      settings.enableNodeVisualizations = true;
      settings.enableDynamicSizing = true;
      settings.enableSpecialVisualizations2 = true;
      settings.enableSpecialVisualizations3 = true;
      settings.enableSpecialVisualizations4 = true;
      settings.nhExportWriteConfidences = true;
      settings.searchFieldWidth = '50px';
      settings.collapseLabelWidth = '36px';
      settings.textFieldHeight = '16px';
      settings.showLineageButton = true;  //NEW as of 1.8.7b1
      settings.showMutationsButton = true; //NEW as of 1.8.7b1
      settings.showShortenNodeNamesButton = false;
      settings.showDynahideButton = false;
      settings.showSearchPropertiesButton = true;
      settings.dynamicallyAddNodeVisualizations = true;
      settings.propertiesToIgnoreForNodeVisualization = ['AccessionNumber', 'Mutation'];
      settings.filterValues = {
        source: 'vipr:PANGO_Lineage',
        target: 'vipr:PANGO_Lineage_of_Concern',
        pass: ['A.23.1', 'A.27', 'B.1.1.318', 'B.1.1.519', 'B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'B.1.525', 'B.1.526', 'B.1.526.1', 'B.1.526.2', 'B.1.617.1', 'B.1.617.2', 'C.37', 'P.1', 'P.2', 'P.3', 'R.1']
      };

      var decorator = 'vipr:';

      var nodeVisualizations = {};

      nodeVisualizations['PANGO_Lineage'] = {
        label: 'PANGO Lineage',
        description: 'the PANGO Lineage',
        field: null,
        cladeRef: decorator + 'PANGO_Lineage',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['PANGO_Lineage_L0'] = {
        label: 'PANGO Lineage Lvl 0',
        description: 'the PANGO Lineage Level 0',
        field: null,
        cladeRef: decorator + 'PANGO_Lineage_L0',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['PANGO_Lineage_L1'] = {
        label: 'PANGO Lineage Lvl 1',
        description: 'the PANGO Lineage Level 1',
        field: null,
        cladeRef: decorator + 'PANGO_Lineage_L1',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Host'] = {
        label: 'Host',
        description: 'the host of the virus',
        field: null,
        cladeRef: decorator + 'Host',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category10',
        sizes: null
      };

      nodeVisualizations['Country'] = {
        label: 'Country',
        description: 'the country of the virus',
        field: null,
        cladeRef: decorator + 'Country',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Year'] = {
        label: 'Year',
        description: 'the year of the virus',
        field: null,
        cladeRef: decorator + 'Year',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        colorsAlt: ['#000000', '#00FF00'],
        sizes: [10, 40]
      };

      nodeVisualizations['Region'] = {
        label: 'Region',
        description: 'the region of change',
        field: null,
        cladeRef: decorator + 'Region',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['PANGO_Lineage_of_Concern'] = {
        label: 'PANGO Lineage of Concern',
        description: 'PANGO Lineage of Concern',
        field: null,
        cladeRef: decorator + 'PANGO_Lineage_of_Concern',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      var specialVisualizations = {};

      specialVisualizations['Mutations'] = {
        label: 'Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#0000FF',
        property_values: ['S:A243-', 'S:A570D', 'S:A701V', 'S:D1118H', 'S:D138Y', 'S:D215G', 'S:D614G',
          'S:D80A', 'S:E484K', 'S:H655Y', 'S:H69-', 'S:K417N', 'S:K417T', 'S:L18F', 'S:L242-', 'S:L244-',
          'S:L452R', 'S:N501Y', 'S:P26S', 'S:P681H', 'S:R190S', 'S:R246I', 'S:S13I', 'S:S982A',
          'S:T1027I', 'S:T20N', 'S:T716I', 'S:V1176F', 'S:V70-', 'S:W152C']
      };

      specialVisualizations['Convergent_Mutations'] = {
        label: 'Convergent Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['S:D614G', 'S:E484K', 'S:H69-', 'S:K417N', 'S:K417T', 'S:L18F', 'S:N501Y', 'S:V70-']
      };

      specialVisualizations[decorator + 'PANGO_Lineage'] = {
        label: 'Lineages of Concern',
        applies_to_ref: decorator + 'PANGO_Lineage',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['A.23.1', 'A.27', 'B.1.1.318', 'B.1.1.519', 'B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'B.1.525', 'B.1.526', 'B.1.526.1', 'B.1.526.2', 'B.1.617.1', 'B.1.617.2', 'C.37', 'P.1', 'P.2', 'P.3', 'R.1']
      };

      this.options = options;
      this.settings = settings;
      this.nodeVisualizations = nodeVisualizations;
      this.specialVisualizations = specialVisualizations;
    },
    _setStateAttr: function () {
      if (!this.isloaded) {
        this.load_once();
        this.isloaded = true;
      }
    },
    load_once: function () {
      var options = this.options;
      var settings = this.settings;
      var nodeVisualizations = this.nodeVisualizations;
      var specialVisualizations = this.specialVisualizations;

      xhr.get('/public/js/p3/widget/templates/Archaeopteryx/SARS2_5_19_21_29400_09999_pango_3_a_MAFFT_05_GTR_fme_pdvxvm.xml')
        .then((data) => {
          var tree;
          try {
            tree = window.archaeopteryx.parsePhyloXML(data);
          }
          catch (e) {
            alert('error while parsing tree: ' + e);
          }
          if (tree) {
            try {
              window.archaeopteryx.launch('#phylogram1', tree, options, settings, nodeVisualizations, specialVisualizations);
            }
            catch (e) {
              alert('error while launching archaeopteryx: ' + e);
            }
          }
        })
    }
  });
});
