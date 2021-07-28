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
        property_values: ['S:A1020D', 'S:A1020S', 'S:A1078T', 'S:A1174V', 'S:A163V', 'S:A243S', 'S:A243V',
          'S:A27S', 'S:A288T', 'S:A344S', 'S:A348S', 'S:A352V', 'S:A522S', 'S:A522V', 'S:A570V', 'S:A647V',
          'S:A672V', 'S:A684V', 'S:A706V', 'S:A732T', 'S:A771S', 'S:A829T', 'S:A846V', 'S:A879V', 'S:A892S',
          'S:A892V', 'S:A899S', 'S:A903S', 'S:A958S', 'S:C1243Y', 'S:C1248F', 'S:C1254W', 'S:D1146H',
          'S:D1153Y', 'S:D1259Y', 'S:D1260N', 'S:D178G', 'S:D215Y', 'S:D570A', 'S:D614G', 'S:D614N',
          'S:D627H', 'S:D737Y', 'S:D796G', 'S:D796H', 'S:D80G', 'S:D839Y', 'S:D936N', 'S:D950H', 'S:E1072K',
          'S:E1072V', 'S:E1092K', 'S:E1111K', 'S:E132D', 'S:E154K', 'S:E154V', 'S:E156G', 'S:E406D',
          'S:E554D', 'S:E654K', 'S:E96D', 'S:E96Q', 'S:F1062L', 'S:F1176V', 'S:F140L', 'S:F157L', 'S:F175S',
          'S:F186S', 'S:F338L', 'S:F490S', 'S:F565L', 'S:F59I', 'S:F59Y', 'S:F888L', 'S:G1124V', 'S:G1167A',
          'S:G1167S', 'S:G1251V', 'S:G1267R', 'S:G142D', 'S:G156E', 'S:G181A', 'S:G184S', 'S:G252-',
          'S:G252V', 'S:G257S', 'S:G261D', 'S:G261S', 'S:G446D', 'S:G485R', 'S:G72R', 'S:G75R', 'S:G769R',
          'S:G932S', 'S:H1083Q', 'S:H1101D', 'S:H1118D', 'S:H681P', 'S:H681R', 'S:H796Y', 'S:I101M',
          'S:I1114T', 'S:I1130V', 'S:I119V', 'S:I1221T', 'S:I1232F', 'S:I233V', 'S:I931V', 'S:I95T',
          'S:K1038R', 'S:K1073N', 'S:K113N', 'S:K1181T', 'S:K1191N', 'S:K182R', 'S:K41R', 'S:K444N',
          'S:K537R', 'S:K77N', 'S:K786N', 'S:L118F', 'S:L141F', 'S:L176F', 'S:L189F', 'S:L212I', 'S:L216F',
          'S:L229F', 'S:L242F', 'S:L249-', 'S:L441F', 'S:L452Q', 'S:L585F', 'S:L822F', 'S:L8F', 'S:L8V',
          'S:L938F', 'S:M1229I', 'S:M153T', 'S:M731I', 'S:M900I', 'S:N1023D', 'S:N1074S', 'S:N1119S',
          'S:N1173K', 'S:N1187H', 'S:N148S', 'S:N148T', 'S:N211-', 'S:N211Y', 'S:N354D', 'S:N370S',
          'S:N417K', 'S:N477S', 'S:N679K', 'S:N710T', 'S:N74K', 'S:N978S', 'S:P1112Q', 'S:P1162L',
          'S:P1162Q', 'S:P1162S', 'S:P251-', 'S:P26S', 'S:P330S', 'S:P384S', 'S:P521R', 'S:P561S',
          'S:P728S', 'S:P793L', 'S:Q1071H', 'S:Q115E', 'S:Q1201R', 'S:Q23H', 'S:Q271R', 'S:Q314R',
          'S:Q414R', 'S:Q484E', 'S:Q498R', 'S:Q52H', 'S:Q52R', 'S:Q677P', 'S:Q677R', 'S:Q690L', 'S:Q779H',
          'S:Q779K', 'S:Q804H', 'S:R102G', 'S:R102I', 'S:R102S', 'S:R102T', 'S:R21I', 'S:R246-', 'S:R246K',
          'S:R346S', 'S:R34C', 'S:R403K', 'S:R408I', 'S:R408K', 'S:R452L', 'S:R634L', 'S:R681H', 'S:R682W',
          'S:R847K', 'S:S1147A', 'S:S1175L', 'S:S1242I', 'S:S13I', 'S:S190R', 'S:S247-', 'S:S247R',
          'S:S254F', 'S:S50L', 'S:S659L', 'S:S673T', 'S:S689I', 'S:S698L', 'S:S884F', 'S:S937T',
          'S:S940F', 'S:T1116N', 'S:T1120I', 'S:T1120S', 'S:T1238I', 'S:T20N', 'S:T22N', 'S:T236S',
          'S:T250-', 'S:T299I', 'S:T29A', 'S:T307I', 'S:T323I', 'S:T385I', 'S:T415A', 'S:T478A', 'S:T573I',
          'S:T604A', 'S:T604I', 'S:T618I', 'S:T638A', 'S:T638I', 'S:T676S', 'S:T723I', 'S:T732A', 'S:T732S',
          'S:T761R', 'S:T778I', 'S:T95N', 'S:V1040F', 'S:V143-', 'S:V213G', 'S:V213L', 'S:V289I', 'S:V308I',
          'S:V367I', 'S:V382L', 'S:V395I', 'S:V3G', 'S:V483F', 'S:V483I', 'S:V608I', 'S:V635I', 'S:V687I',
          'S:V769G', 'S:V772I', 'S:V83I', 'S:W152C', 'S:Y1155F', 'S:Y145-', 'S:Y145H', 'S:Y248-', 'S:Y265C',
          'S:Y28F', 'S:Y28H', 'S:Y449H', 'S:Y789H']
      };

      specialVisualizations['Convergent_Mutations'] = {
        label: 'Convergent Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['S:A1020V', 'S:A1078S', 'S:A222V', 'S:A243-', 'S:A262S', 'S:A520S', 'S:A570D',
          'S:A626S', 'S:A653V', 'S:A67S', 'S:A67V', 'S:A688V', 'S:A701T', 'S:A701V', 'S:A845S', 'S:A879S',
          'S:C1235F', 'S:C1250F', 'S:D1118H', 'S:D1118Y', 'S:D111N', 'S:D138H', 'S:D138Y', 'S:D142G',
          'S:D178N', 'S:D215G', 'S:D253G', 'S:D253N', 'S:D796Y', 'S:D80A', 'S:D80Y', 'S:D936Y', 'S:D950N',
          'S:E1111A', 'S:E1202Q', 'S:E309Q', 'S:E484K', 'S:E484Q', 'S:E583D', 'S:E654Q', 'S:E780Q',
          'S:F157-', 'S:F157S', 'S:G1219C', 'S:G1219V', 'S:G142-', 'S:G614D', 'S:G75V', 'S:G769V',
          'S:G946V', 'S:H1101Y', 'S:H146Y', 'S:H49Y', 'S:H655Y', 'S:H69-', 'S:I210-', 'S:K417N',
          'S:K417T', 'S:K484E', 'S:K854N', 'S:L1063F', 'S:L141-', 'S:L18F', 'S:L241-', 'S:L242-',
          'S:L452M', 'S:L452R', 'S:L54F', 'S:L5F', 'S:M1237I', 'S:M153I', 'S:N1187Y', 'S:N439K',
          'S:N440K', 'S:N501T', 'S:N501Y', 'S:N856S', 'S:P1263L', 'S:P26L', 'S:P384L', 'S:P479S',
          'S:P681H', 'S:P681L', 'S:P681R', 'S:P809S', 'S:P812S', 'S:Q613H', 'S:Q675H', 'S:Q675R',
          'S:Q677H', 'S:Q957L', 'S:Q957R', 'S:R158-', 'S:R190S', 'S:R214L', 'S:R21T', 'S:S12F',
          'S:S151I', 'S:S155R', 'S:S255F', 'S:S477N', 'S:S494P', 'S:S640F', 'S:S704L', 'S:S939F',
          'S:S982A', 'S:S98F', 'S:T1027I', 'S:T1117I', 'S:T19R', 'S:T20I', 'S:T22I', 'S:T29I',
          'S:T478I', 'S:T478K', 'S:T572I', 'S:T716I', 'S:T76I', 'S:T859I', 'S:T859N', 'S:T95A',
          'S:T95I', 'S:V1104L', 'S:V1176F', 'S:V1228L', 'S:V1264L', 'S:V308L', 'S:V367F', 'S:V503I',
          'S:V6F', 'S:V70-', 'S:V70F', 'S:W152L', 'S:W152R', 'S:W258L', 'S:Y144-', 'S:Y144F', 'S:Y453F']
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

      xhr.get('/public/js/p3/widget/templates/Archaeopteryx/SARS2_IT4_29400_09999_cdh_pango_3_MAFFT_05_GTR_fme_pdvxvm.xml')
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
