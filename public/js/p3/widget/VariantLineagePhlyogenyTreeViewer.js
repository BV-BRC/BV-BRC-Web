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
      options.initialNodeFillColorVisualization = 'PANGO Lineage of Concern/Interest';
      options.minBranchLengthValueToShow = 0.000001;
      options.minConfidenceValueToShow = 50;
      options.phylogram = true; // We should launch with "regular" phylogram.
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showLineage = false;  // NEW as of 1.8.7b1
      options.showMutations = false; // NEW as of 1.8.7b1
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
      settings.enableCollapseByFeature = false;
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
      settings.showLineageButton = true;  // NEW as of 1.8.7b1
      settings.showMutationsButton = true; // NEW as of 1.8.7b1
      settings.showShortenNodeNamesButton = false;
      settings.showDynahideButton = false;
      settings.showSearchPropertiesButton = true;
      settings.dynamicallyAddNodeVisualizations = true;
      settings.propertiesToIgnoreForNodeVisualization = ['AccessionNumber', 'Mutation'];
      settings.filterValues = [
        {
          source: 'vipr:PANGO_Lineage',
          target: 'vipr:PANGO_Lineage_of_Concern',
          pass: ['B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.2',
            'B.1.617.3', 'P.1', 'P.2']
        },
        {
          source: 'vipr:PANGO_Lineage',
          target: 'vipr:PANGO_Select_Lineage',
          pass: ['A.23.1', 'A.27', 'AY.1', 'AY.2', 'B.1.1.318', 'B.1.1.519', 'B.1.1.7', 'B.1.351', 'B.1.427',
            'B.1.429', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.2', 'B.1.617.3', 'C.37', 'P.1', 'P.2',
            'P.3', 'R.1']
        }];

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

      nodeVisualizations['PANGO_Lineage_of_Concern'] = {
        label: 'PANGO Lineage of Concern/Interest',
        description: 'PANGO Lineage of Concern',
        field: null,
        cladeRef: decorator + 'PANGO_Lineage_of_Concern',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['PANGO_Select_Lineage'] = {
        label: 'PANGO Select Lineage',
        description: 'PANGO Select Lineage',
        field: null,
        cladeRef: decorator + 'PANGO_Select_Lineage',
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

      var specialVisualizations = {};

      specialVisualizations['Mutations'] = {
        label: 'Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#0000FF',
        property_values: ['S:-156E', 'S:-157F', 'S:-69H', 'S:-70I', 'S:-70V', 'S:A1020D', 'S:A1020S', 'S:A1078T',
          'S:A1174V', 'S:A215D', 'S:A243S', 'S:A243V', 'S:A262V', 'S:A27S', 'S:A288T', 'S:A348S', 'S:A352V', 'S:A411S',
          'S:A475S', 'S:A522S', 'S:A522V', 'S:A647V', 'S:A67-', 'S:A672V', 'S:A684V', 'S:A688S', 'S:A701T', 'S:A771S',
          'S:A829T', 'S:A845V', 'S:A846V', 'S:A899S', 'S:A903S', 'S:A958S', 'S:C1235F', 'S:C1236F', 'S:C1247F', 'S:C1250F',
          'S:C1254W', 'S:C152W', 'S:D1146H', 'S:D1146Y', 'S:D1153Y', 'S:D1259Y', 'S:D178G', 'S:D198Y', 'S:D215A',
          'S:D215G', 'S:D215H', 'S:D215Y', 'S:D614N', 'S:D627H', 'S:D737Y', 'S:D796G', 'S:D796H', 'S:D80A', 'S:D80H',
          'S:D80N', 'S:D839V', 'S:D88A', 'S:D936N', 'S:E1092K', 'S:E1111A', 'S:E1111K', 'S:E1111Q', 'S:E1207D', 'S:E132D',
          'S:E154G', 'S:E154K', 'S:E154V', 'S:E406D', 'S:E406Q', 'S:E484Q', 'S:E554D', 'S:E654K', 'S:E780A', 'S:E96D',
          'S:E96V', 'S:F1052Y', 'S:F1062L', 'S:F1103L', 'S:F157S', 'S:F175S', 'S:F186S', 'S:F189L', 'S:F18L', 'S:F220I',
          'S:F220L', 'S:F306L', 'S:F338L', 'S:F490L', 'S:F565L', 'S:F59Y', 'S:F888L', 'S:G1167A', 'S:G1167S', 'S:G1167V',
          'S:G1219C', 'S:G1251V', 'S:G158-', 'S:G181A', 'S:G184S', 'S:G252-', 'S:G252V', 'S:G257C', 'S:G257D', 'S:G257S',
          'S:G261S', 'S:G35R', 'S:G446D', 'S:G446V', 'S:G485R', 'S:G72-', 'S:G72R', 'S:G75-', 'S:G75R', 'S:G769R', 'S:G932S',
          'S:H1071Q', 'S:H1083Q', 'S:H1271N', 'S:H146R', 'S:H245Y', 'S:H66-', 'S:H675Q', 'S:H677Q', 'S:H681P', 'S:H681R',
          'S:H69P', 'S:I1130V', 'S:I119V', 'S:I1221T', 'S:I1232F', 'S:I468V', 'S:I68M', 'S:I68T', 'S:I70-', 'S:I834V',
          'S:I870V', 'S:I931V', 'S:I95T', 'S:K1073T', 'S:K1181T', 'S:K202T', 'S:K417T', 'S:K439N', 'S:K458N', 'S:K537R',
          'S:K558R', 'S:K77N', 'S:K77T', 'S:K786N', 'S:L1063F', 'S:L118F', 'S:L1265G', 'S:L141F', 'S:L189F', 'S:L216F',
          'S:L229F', 'S:L241-', 'S:L242F', 'S:L249-', 'S:L303F', 'S:L441F', 'S:L585F', 'S:L754F', 'S:L7S', 'S:L822F',
          'S:L877M', 'S:L8F', 'S:L8V', 'S:L8W', 'S:L922F', 'S:M1237I', 'S:M177T', 'S:M731T', 'S:N1023D', 'S:N1074S',
          'S:N1187H', 'S:N1187Y', 'S:N1192S', 'S:N148T', 'S:N188K', 'S:N211K', 'S:N211Y', 'S:N354D', 'S:N370S', 'S:N440Y',
          'S:N460I', 'S:N477S', 'S:N658Y', 'S:N679-', 'S:N703D', 'S:N710T', 'S:N710Y', 'S:N74-', 'S:N856S', 'S:N978S',
          'S:P1069S', 'S:P1112Q', 'S:P1162L', 'S:P209H', 'S:P251-', 'S:P26H', 'S:P384S', 'S:P521R', 'S:P728S', 'S:P793L',
          'S:P809S', 'S:P812L', 'S:P9S', 'S:Q1071H', 'S:Q1208H', 'S:Q23H', 'S:Q23R', 'S:Q314R', 'S:Q321L', 'S:Q414R',
          'S:Q52H', 'S:Q52L', 'S:Q675-', 'S:Q677-', 'S:Q677P', 'S:Q690L', 'S:Q779E', 'S:Q779K', 'S:Q804H', 'S:Q836E',
          'S:Q926H', 'S:R102K', 'S:R102S', 'S:R1107S', 'S:R158-', 'S:R19T', 'S:R21T', 'S:R246-', 'S:R246K', 'S:R346K',
          'S:R346S', 'S:R34C', 'S:R34P', 'S:R403K', 'S:R408I', 'S:R408K', 'S:R634L', 'S:R681H', 'S:R682Q', 'S:R682W',
          'S:S1252F', 'S:S13I', 'S:S151I', 'S:S151T', 'S:S190R', 'S:S247-', 'S:S255P', 'S:S255Y', 'S:S50L', 'S:S520A',
          'S:S689I', 'S:S698L', 'S:S704L', 'S:S71-', 'S:S735A', 'S:S884F', 'S:S929I', 'S:S940F', 'S:T1116N', 'S:T1120S',
          'S:T20N', 'S:T236S', 'S:T240I', 'S:T250-', 'S:T250A', 'S:T250I', 'S:T307I', 'S:T415A', 'S:T478I', 'S:T51I',
          'S:T547I', 'S:T547K', 'S:T573I', 'S:T588A', 'S:T638A', 'S:T638I', 'S:T676-', 'S:T678-', 'S:T678I', 'S:T723I',
          'S:T73-', 'S:T732I', 'S:T732S', 'S:T76-', 'S:T761R', 'S:T941I', 'S:T95N', 'S:V1122L', 'S:V1164I', 'S:V1230M',
          'S:V1268D', 'S:V126I', 'S:V227L', 'S:V308I', 'S:V382L', 'S:V395I', 'S:V483F', 'S:V503I', 'S:V635I', 'S:V656A',
          'S:V687I', 'S:V687L', 'S:V6A', 'S:V6F', 'S:V70I', 'S:V772I', 'S:W152C', 'S:W64R', 'S:Y1155F', 'S:Y144F',
          'S:Y144V', 'S:Y145H', 'S:Y248-', 'S:Y265C', 'S:Y28F', 'S:Y28H']
      };

      specialVisualizations['Convergent_Mutations'] = {
        label: 'Convergent Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['S:A1020V', 'S:A1078S', 'S:A222V', 'S:A243-', 'S:A262S', 'S:A344S', 'S:A520S', 'S:A570D',
          'S:A626S', 'S:A653V', 'S:A67S', 'S:A67V', 'S:A688V', 'S:A701V', 'S:A845S', 'S:A879S', 'S:A892S', 'S:A892V',
          'S:D1118H', 'S:D1118Y', 'S:D111N', 'S:D1163Y', 'S:D138H', 'S:D138Y', 'S:D142G', 'S:D178N', 'S:D253G', 'S:D253N',
          'S:D253Y', 'S:D614G', 'S:D796Y', 'S:D808G', 'S:D80G', 'S:D80Y', 'S:D839Y', 'S:D936Y', 'S:D950H', 'S:D950N',
          'S:E1202Q', 'S:E156-', 'S:E309Q', 'S:E484K', 'S:E583D', 'S:E654Q', 'S:E780Q', 'S:F157-', 'S:F157L', 'S:F490S',
          'S:G1124V', 'S:G1219V', 'S:G142-', 'S:G142D', 'S:G261D', 'S:G614D', 'S:G75V', 'S:G769A', 'S:G769V', 'S:H1101Y',
          'S:H146Y', 'S:H49Y', 'S:H655Y', 'S:H69-', 'S:I210-', 'S:I233V', 'S:I68-', 'S:K1038R', 'S:K1073N', 'S:K1191N',
          'S:K417N', 'S:K484E', 'S:K558N', 'S:K854N', 'S:L141-', 'S:L176F', 'S:L18F', 'S:L242-', 'S:L452M', 'S:L452Q',
          'S:L452R', 'S:L54F', 'S:L5F', 'S:M1229I', 'S:M153I', 'S:M153T', 'S:M177I', 'S:M731I', 'S:N439K', 'S:N440K',
          'S:N501T', 'S:N501Y', 'S:N74K', 'S:P1162S', 'S:P1263L', 'S:P26L', 'S:P26S', 'S:P384L', 'S:P479S', 'S:P681H',
          'S:P681L', 'S:P681R', 'S:P812S', 'S:Q14H', 'S:Q52R', 'S:Q613H', 'S:Q675H', 'S:Q675R', 'S:Q677H', 'S:Q957L',
          'S:Q957R', 'S:R102I', 'S:R158G', 'S:R190S', 'S:R214L', 'S:R21I', 'S:R452L', 'S:R78M', 'S:S1242I', 'S:S12F',
          'S:S155R', 'S:S254F', 'S:S255F', 'S:S477N', 'S:S494P', 'S:S640F', 'S:S813I', 'S:S939F', 'S:S982A', 'S:S98F',
          'S:T1027I', 'S:T1117I', 'S:T19R', 'S:T20I', 'S:T22I', 'S:T22N', 'S:T299I', 'S:T29I', 'S:T385I', 'S:T478K',
          'S:T572I', 'S:T716I', 'S:T732A', 'S:T76I', 'S:T859I', 'S:T859N', 'S:T95A', 'S:T95I', 'S:V1104L', 'S:V1176F',
          'S:V1228L', 'S:V1264L', 'S:V143-', 'S:V143F', 'S:V213L', 'S:V308L', 'S:V367F', 'S:V3G', 'S:V622F', 'S:V70-',
          'S:V70F', 'S:W152L', 'S:W152R', 'S:W258L', 'S:Y144-', 'S:Y145-', 'S:Y453F']
      };

      specialVisualizations[decorator + 'PANGO_Lineage'] = {
        label: 'Select Lineages',
        applies_to_ref: decorator + 'PANGO_Lineage',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['A.23.1', 'A.27', 'AY.1', 'AY.2', 'B.1.1.318', 'B.1.1.519',
          'B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'B.1.525', 'B.1.526', 'B.1.617.1',
          'B.1.617.2', 'B.1.617.3', 'C.37', 'P.1', 'P.2', 'P.3', 'R.1']
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

      xhr.get('/public/js/p3/widget/templates/Archaeopteryx/SARS2_IT5_29400_09999_cdh_pango_4_MAFFT_05_GTR_fme_pdvxvm.xml')
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
