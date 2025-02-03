define([
  'dojo/_base/declare', 'dojo/_base/lang', '../../viewer/TabViewerBase', '../../GenomeBrowser',
  '../OutbreaksOverview', '../OutbreaksPhylogenyTreeViewer', '../OutbreaksTabContainer', '../OutbreaksTab',
  './LineagesOfConcern', './variants/VariantByCountryChartContainer', './variants/VariantByLineageChartContainer',
  './variants/VariantGridContainer', './covariants/VariantLineageByCountryChartContainer',
  './covariants/VariantLineageByLineageChartContainer', './covariants/VariantLineageGridContainer',
  'dojo/text!./OverviewDetails.html', 'dojo/text!./Resources.html', 'dojo/text!./HelpDocuments.html',
  'dojo/text!./ProteinStructure.html'
], function (
  declare, lang, TabViewerBase, GenomeBrowser,
  OutbreaksOverview, OutbreaksPhylogenyTreeViewer, OutbreaksTabContainer, OutbreaksTab,
  LineagesOfConcern, VariantByCountryChartContainer, VariantByLineageChartContainer,
  VariantGridContainer, VariantLineageByCountryChartContainer,
  VariantLineageByLineageChartContainer, VariantLineageGridContainer,
  OverviewDetailsTemplate, ResourcesTemplate, HelpDocumentsTemplate,
  ProteinStructureTemplate
) {
  return declare([TabViewerBase], {
    perspectiveLabel: '',
    perspectiveIconClass: '',
    title: '<h1 class="appHeader" style="color: #2a6d9e; margin-top: 10px; font-weight: bold;">SARS-CoV-2 Variants and Lineages of Concern</h1>',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this.buildHeaderContent();

      if (state.hashParams && state.hashParams.view_tab) {
        if (this[state.hashParams.view_tab]) {
          let vt = this[state.hashParams.view_tab];

          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }

      this.setActivePanelState();
    },

    setActivePanelState: function () {
      let activeQueryState;

      const active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      let activeTab = this[active];

      activeQueryState = lang.mixin({}, this.state);

      switch (active) {
        case 'lineage_prevalence':
          if (!this.state.search && this.state.hashParams.filter) {
            this.state.search = this.state.hashParams.filter;
          } else {
            this.state.search = 'keyword(*)';
          }
          this.variantLineageGridContainer.set('state', lang.mixin({}, this.state));
          break;

        case 'variant_prevalence':
          this.state.search = 'keyword(*)';
          this.variantGridContainer.set('state', lang.mixin({}, this.state));
          break;

        case 'jbrowse':
          activeQueryState = lang.mixin(this.state, {
            genome_id: '2697049.107626',
            hashParams: {
              view_tab: 'jbrowse',
              loc: 'NC_045512%3A1..29903',
              tracks: 'RefSeqGFF%2CActivesite%2CRegionofinterest%2CDomains%2CMutagenesisSite%2CVOCMarkers%2CHumanBCellEpitopes%2CClasses1to4AbEscape'
            }
          });
          activeTab.set('state', activeQueryState);
          break;

        default:
          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.error('Missing Active Query State for: ', active);
          }
          break;
      }
    },

    buildHeaderContent: function () {
      this.queryNode.innerHTML = '<span class="searchField" style="font-size:large">' + this.title + '</span>';
      this.totalCountNode.innerHTML = '';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments); // creates this.viewer

      this.overview = new OutbreaksOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview',
        detailsHTML: OverviewDetailsTemplate,
        rightPanelContent: [HelpDocumentsTemplate],
        pubmedTerm: 'sars cov2 variants',
        acknowledgements: 'We gratefully acknowledge the authors, originating and submitting laboratories that have ' +
          'shared their SARS-CoV-2 genomic data via <a href="https://www.ncbi.nlm.nih.gov/sars-cov-2/" target=_blank>' +
          'GenBank and SRA</a> and <a href="https://www.cogconsortium.uk/" target=_blank>COG-UK</a>, which is used to ' +
          'build this system.'
      });

      this.lineage = new LineagesOfConcern({
        title: 'Lineages of Concern/Interest',
        id: this.viewer.id + '_lineage'
      });

      // Initialize covariants tab
      let variantLineageByCountryChartContainer = new VariantLineageByCountryChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer1',
        title: 'Chart By Country',
        apiServer: this.apiServer
      });

      let variantLineageByLineageChartContainer = new VariantLineageByLineageChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer2',
        title: 'Chart By Covariant',
        apiServer: this.apiServer
      });

      this.variantLineageGridContainer = new VariantLineageGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true
      });

      this.lineage_prevalence = new OutbreaksTabContainer({
        title: 'Covariants',
        id: this.viewer.id + '_lineage_prevalence',
        tabContainers: [this.variantLineageGridContainer, variantLineageByCountryChartContainer, variantLineageByLineageChartContainer]
      });

      // Initialize variants tabs
      let variantByCountryChartContainer = new VariantByCountryChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_variantByCountryChartContainer',
        title: 'Chart By Country',
        visible: false,
        apiServer: this.apiServer
      });

      let variantByLineageChartContainer = new VariantByLineageChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_variantByLineageChartContainer',
        title: 'Chart By Variant',
        visible: false,
        apiServer: this.apiServer
      });

      this.variantGridContainer = new VariantGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true,
      });

      this.variant_prevalence = new OutbreaksTabContainer({
        title: 'Variants',
        id: this.viewer.id + '_variant_prevalence',
        tabContainers: [this.variantGridContainer, variantByCountryChartContainer, variantByLineageChartContainer]
      });

      this.jbrowse = new GenomeBrowser({
        title: 'Genome Browser',
        id: this.viewer.id + '_jbrowse'
      });

      this.structure = new OutbreaksTab({
        title: 'Protein Structure',
        id: this.viewer.id + '_structure',
        templateString: ProteinStructureTemplate
      });

      // Initialize Phylogenetic Tree Viewer
      const decorator = 'vipr:';
      const nodeVisualizations = {};

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

      nodeVisualizations['PANGO_Select_Lineage'] = {
        label: 'PANGO VOC',
        description: 'PANGO VOC',
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

      const specialVisualizations = {};

      specialVisualizations['Mutations'] = {
        label: 'Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#0000FF',
        property_values: ['S:-142A', 'S:-246R', 'S:-247S', 'S:-248Y', 'S:-249L', 'S:-24L', 'S:-250T', 'S:-251P', 'S:-252G', 'S:-25P', 'S:-26P', 'S:A1020D', 'S:A1056V', 'S:A1070S',
          'S:A1070V', 'S:A1078T', 'S:A1078V', 'S:A1087S', 'S:A1174V', 'S:A123D', 'S:A163V', 'S:A243S', 'S:A260V', 'S:A263V', 'S:A264S', 'S:A264V', 'S:A288T', 'S:A352V', 'S:A372P',
          'S:A435S', 'S:A475V', 'S:A484R', 'S:A484T', 'S:A570V', 'S:A626T', 'S:A67-', 'S:A684T', 'S:A694V', 'S:A735S', 'S:A783T', 'S:A829T', 'S:A831V', 'S:A852S', 'S:A871S',
          'S:A890T', 'S:A903S', 'S:A93S', 'S:A944S', 'S:A958S', 'S:A982S', 'S:C1236S', 'S:C1240F', 'S:C1243Y', 'S:C1247R', 'S:C1247Y', 'S:C1248R', 'S:C1250Y', 'S:C1253Y',
          'S:C1254W', 'S:D1084G', 'S:D1084Y', 'S:D1127A', 'S:D1127G', 'S:D1146H', 'S:D1146Y', 'S:D1163V', 'S:D1168G', 'S:D1168N', 'S:D1184Y', 'S:D1199H', 'S:D1199Y',
          'S:D1259V', 'S:D1260H', 'S:D1260Y', 'S:D138-', 'S:D138G', 'S:D178G', 'S:D178H', 'S:D178N', 'S:D215-', 'S:D215H', 'S:D228E', 'S:D253A', 'S:D287G', 'S:D339N',
          'S:D427G', 'S:D53N', 'S:D574V', 'S:D583E', 'S:D614N', 'S:D627Y', 'S:D745G', 'S:D796G', 'S:D796N', 'S:D808H', 'S:D80A', 'S:D839V', 'S:D936G', 'S:D979E', 'S:E1092K',
          'S:E1111G', 'S:E1111K', 'S:E1111Q', 'S:E1150D', 'S:E1195Q', 'S:E1207D', 'S:E1258Q', 'S:E1258V', 'S:E1262D', 'S:E1262K', 'S:E154G', 'S:E154V', 'S:E156-', 'S:E156Q',
          'S:E180Q', 'S:E309K', 'S:E324V', 'S:E340K', 'S:E406Q', 'S:E484D', 'S:E554D', 'S:E554Q', 'S:E619Q', 'S:E654K', 'S:E654Q', 'S:E654V', 'S:E661D', 'S:E780A', 'S:E780D', 'S:E868G',
          'S:E918G', 'S:E918V', 'S:E96D', 'S:E96V', 'S:F1052Y', 'S:F1062L', 'S:F1103L', 'S:F140-', 'S:F140L', 'S:F186L', 'S:F201L', 'S:F32L', 'S:F338L', 'S:F374L', 'S:F375S', 'S:F486I',
          'S:F486L', 'S:F486Y', 'S:F59Y', 'S:F6V', 'S:F888L', 'S:F981L', 'S:G1085R', 'S:G1167A', 'S:G1167S', 'S:G1167V', 'S:G1171V', 'S:G1223S', 'S:G181E', 'S:G181R', 'S:G184S', 'S:G184V',
          'S:G199R', 'S:G213V', 'S:G219D', 'S:G252-', 'S:G257D', 'S:G261C', 'S:G261D', 'S:G261R', 'S:G35R', 'S:G446R', 'S:G485R', 'S:G593S', 'S:G72E', 'S:G72R', 'S:G72V', 'S:G75D',
          'S:G769R', 'S:G838S', 'S:G842V', 'S:G946V', 'S:H1058Y', 'S:H1083Q', 'S:H146-', 'S:H146Q', 'S:H146R', 'S:H245N', 'S:H449N', 'S:H625Y', 'S:H677Q', 'S:I1027T', 'S:I1081V',
          'S:I1114S', 'S:I1130M', 'S:I1130V', 'S:I1179V', 'S:I1221V', 'S:I1227T', 'S:I1232F', 'S:I197V', 'S:I19L', 'S:I19T', 'S:I210T', 'S:I210V', 'S:I584V', 'S:I651V', 'S:I664V',
          'S:I666V', 'S:I670V', 'S:I68-', 'S:I714V', 'S:I716T', 'S:I76T', 'S:I834F', 'S:I844V', 'S:I850L', 'S:I931V', 'S:K1038R', 'S:K1045N', 'S:K113N', 'S:K1157N', 'S:K1181T',
          'S:K1245R', 'S:K129R', 'S:K147E', 'S:K150E', 'S:K202T', 'S:K278E', 'S:K300R', 'S:K346R', 'S:K417T', 'S:K478R', 'S:K537R', 'S:K558R', 'S:K77M', 'S:K77T', 'S:K921Q', 'S:K969N',
          'S:K97M', 'S:K97Q', 'S:K97T', 'S:L1049I', 'S:L1141W', 'S:L118I', 'S:L1224S', 'S:L1234F', 'S:L1244V', 'S:L141F', 'S:L141V', 'S:L189F', 'S:L18R', 'S:L216F', 'S:L229F', 'S:L24-',
          'S:L241F', 'S:L242P', 'S:L244F', 'S:L244S', 'S:L249-', 'S:L293H', 'S:L368I', 'S:L371S', 'S:L441F', 'S:L455F', 'S:L585F', 'S:L858I', 'S:L8V', 'S:L922F', 'S:L981F', 'S:M1029S',
          'S:M1050I', 'S:M1229L', 'S:M1229T', 'S:M1237V', 'S:M177T', 'S:M452L', 'S:M731I', 'S:M731T', 'S:M900I', 'S:N1023D', 'S:N1023S', 'S:N1074S', 'S:N1158S', 'S:N1173K', 'S:N1187H',
          'S:N1192S', 'S:N148Y', 'S:N164K', 'S:N185K', 'S:N211Y', 'S:N253D', 'S:N30K', 'S:N334K', 'S:N370S', 'S:N394S', 'S:N450K', 'S:N460I', 'S:N460Y', 'S:N501H', 'S:N556K', 'S:N556Y',
          'S:N641D', 'S:N641S', 'S:N658D', 'S:N679Y', 'S:N703D', 'S:N710S', 'S:N710T', 'S:N717S', 'S:N74K', 'S:N751D', 'S:N751K', 'S:N856K', 'S:N856S', 'S:N925S', 'S:P1112Q', 'S:P1143S',
          'S:P139-', 'S:P174S', 'S:P209L', 'S:P25-', 'S:P251-', 'S:P251H', 'S:P251L', 'S:P25H', 'S:P25L', 'S:P25S', 'S:P25T', 'S:P26-', 'S:P330S', 'S:P373S', 'S:P384S', 'S:P463S',
          'S:P479L', 'S:P499R', 'S:P499S', 'S:P521R', 'S:P57S', 'S:P621S', 'S:P728S', 'S:P792Q', 'S:P82L', 'S:P9S', 'S:Q1071H', 'S:Q1071L', 'S:Q1113K', 'S:Q1201H', 'S:Q1201L',
          'S:Q1208R', 'S:Q146K', 'S:Q173H', 'S:Q173K', 'S:Q183E', 'S:Q218R', 'S:Q239R', 'S:Q23H', 'S:Q23L', 'S:Q314R', 'S:Q321-', 'S:Q321L', 'S:Q414K', 'S:Q452R', 'S:Q493E',
          'S:Q52H', 'S:Q613R', 'S:Q675K', 'S:Q677E', 'S:Q677P', 'S:Q690L', 'S:Q804H', 'S:Q836R', 'S:Q954H', 'S:Q957R', 'S:R1014K', 'S:R102G', 'S:R102K', 'S:R102S', 'S:R158S',
          'S:R190K', 'S:R19I', 'S:R21I', 'S:R237S', 'S:R246G', 'S:R246T', 'S:R273K', 'S:R273S', 'S:R34C', 'S:R34L', 'S:R34P', 'S:R403G', 'S:R403K', 'S:R408I', 'S:R408K', 'S:R634L',
          'S:R646P', 'S:R681H', 'S:R682W', 'S:R78G', 'S:R78S', 'S:R847K', 'S:S112A', 'S:S112L', 'S:S1147A', 'S:S1170F', 'S:S1261F', 'S:S1261Y', 'S:S12C', 'S:S151T', 'S:S155R',
          'S:S158R', 'S:S162I', 'S:S190R', 'S:S247N', 'S:S255P', 'S:S27A', 'S:S373L', 'S:S486F', 'S:S486P', 'S:S486V', 'S:S494L', 'S:S50T', 'S:S514F', 'S:S520A', 'S:S640P',
          'S:S658N', 'S:S689N', 'S:S691F', 'S:S698L', 'S:S732A', 'S:S735A', 'S:S813I', 'S:S813N', 'S:S884F', 'S:S929T', 'S:S937L', 'S:S937T', 'S:S982L', 'S:T1009S', 'S:T1116N',
          'S:T1117R', 'S:T1120I', 'S:T1120S', 'S:T1238N', 'S:T1273I', 'S:T20N', 'S:T240P', 'S:T250-', 'S:T250A', 'S:T250I', 'S:T250P', 'S:T250S', 'S:T259A', 'S:T259I', 'S:T259R',
          'S:T274N', 'S:T284I', 'S:T33A', 'S:T33I', 'S:T356K', 'S:T385S', 'S:T444K', 'S:T470N', 'S:T478A', 'S:T549S', 'S:T572S', 'S:T618I', 'S:T638A', 'S:T638I', 'S:T638R',
          'S:T63I', 'S:T676S', 'S:T678I', 'S:T723I', 'S:T724A', 'S:T732A', 'S:T732S', 'S:T73I', 'S:T761I', 'S:T768I', 'S:T76S', 'S:T778I', 'S:T791I', 'S:T881P', 'S:T941A', 'S:T95N',
          'S:T961M', 'S:V1040F', 'S:V1128A', 'S:V1128I', 'S:V1129I', 'S:V1133I', 'S:V1230M', 'S:V127F', 'S:V143F', 'S:V159I', 'S:V171I', 'S:V213A', 'S:V213L', 'S:V222A', 'S:V227L',
          'S:V308I', 'S:V308L', 'S:V320A', 'S:V320I', 'S:V36F', 'S:V382L', 'S:V395I', 'S:V445F', 'S:V445I', 'S:V445P', 'S:V483F', 'S:V486F', 'S:V486I', 'S:V503G', 'S:V615I',
          'S:V622G', 'S:V622I', 'S:V635I', 'S:V67A', 'S:V67F', 'S:V687I', 'S:V687L', 'S:V6I', 'S:V701A', 'S:V772I', 'S:V826L', 'S:V83A', 'S:V83F', 'S:Y1155F', 'S:Y138D', 'S:Y248N',
          'S:Y265C', 'S:Y28F', 'S:Y28H', 'S:Y396H', 'S:Y660F', 'S:Y789H', 'S:Y904C']
      };

      specialVisualizations['Convergent_Mutations'] = {
        label: 'Convergent Mutations',
        applies_to_ref: decorator + 'Mutation',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['S:-142D', 'S:-142G', 'S:-143V', 'S:-144Y', 'S:-145Y', 'S:-157F', 'S:-158R', 'S:-69H', 'S:-70V', 'S:A1020S', 'S:A1078S', 'S:A222V', 'S:A243-',
          'S:A243V', 'S:A262S', 'S:A27S', 'S:A27V', 'S:A344S', 'S:A348S', 'S:A411S', 'S:A475S', 'S:A484V', 'S:A520S', 'S:A522S', 'S:A522V', 'S:A570D', 'S:A623S', 'S:A623V',
          'S:A626S', 'S:A647S', 'S:A653V', 'S:A67S', 'S:A67V', 'S:A684V', 'S:A688T', 'S:A688V', 'S:A701S', 'S:A701T', 'S:A701V', 'S:A706V', 'S:A771S', 'S:A845S', 'S:A845V',
          'S:A846S', 'S:A879S', 'S:A879V', 'S:A892S', 'S:A892V', 'S:A899S', 'S:C1235F', 'S:C1236F', 'S:C1247F', 'S:C1250F', 'S:C136F', 'S:D1118H', 'S:D1118Y', 'S:D111N',
          'S:D1153Y', 'S:D1163Y', 'S:D1184N', 'S:D1199N', 'S:D1259Y', 'S:D138H', 'S:D138Y', 'S:D215A', 'S:D215E', 'S:D215G', 'S:D215Y', 'S:D253G', 'S:D253N', 'S:D339G',
          'S:D339H', 'S:D405N', 'S:D574Y', 'S:D614G', 'S:D737Y', 'S:D796H', 'S:D796Y', 'S:D808G', 'S:D80G', 'S:D80N', 'S:D80Y', 'S:D839Y', 'S:D88H', 'S:D936H', 'S:D936N',
          'S:D936Y', 'S:D950H', 'S:D950N', 'S:E1202Q', 'S:E154K', 'S:E156G', 'S:E215-', 'S:E224Q', 'S:E309Q', 'S:E471Q', 'S:E484A', 'S:E484K', 'S:E484Q', 'S:E583D',
          'S:E780Q', 'S:E96Q', 'S:F157-', 'S:F157L', 'S:F157S', 'S:F186S', 'S:F306L', 'S:F371Y', 'S:F486S', 'S:F486V', 'S:F490S', 'S:F565L', 'S:F5L', 'S:G1124V', 'S:G1219C',
          'S:G1219V', 'S:G1251V', 'S:G156E', 'S:G181A', 'S:G181V', 'S:G213E', 'S:G252V', 'S:G257S', 'S:G261V', 'S:G339D', 'S:G446D', 'S:G446S', 'S:G446V', 'S:G476S', 'S:G496S',
          'S:G614D', 'S:G75R', 'S:G75V', 'S:G769V', 'S:G798D', 'S:H1101Y', 'S:H146Y', 'S:H245-', 'S:H245Y', 'S:H49Y', 'S:H655Y', 'S:H681P', 'S:H681R', 'S:H69-', 'S:H69Y',
          'S:H954Q', 'S:I119V', 'S:I1221T', 'S:I210-', 'S:I233V', 'S:I68T', 'S:I68V', 'S:I818V', 'S:I834T', 'S:I834V', 'S:I934V', 'S:I95T', 'S:K1073N', 'S:K1191N', 'S:K147N',
          'S:K182R', 'S:K356T', 'S:K417N', 'S:K440N', 'S:K444M', 'S:K444N', 'S:K444R', 'S:K444T', 'S:K460N', 'S:K478T', 'S:K484E', 'S:K558N', 'S:K679N', 'S:K764N', 'S:K854N',
          'S:K856N', 'S:K97E', 'S:K97N', 'S:L1063F', 'S:L1265F', 'S:L141-', 'S:L176F', 'S:L18F', 'S:L212I', 'S:L212S', 'S:L241-', 'S:L242-', 'S:L242F', 'S:L244-', 'S:L249S',
          'S:L452M', 'S:L452Q', 'S:L452R', 'S:L54F', 'S:L5F', 'S:L822F', 'S:L84I', 'S:L8F', 'S:L938F', 'S:L948I', 'S:M1229I', 'S:M1237I', 'S:M153I', 'S:M153T', 'S:M177I', 'S:N1187Y',
          'S:N148T', 'S:N185S', 'S:N211-', 'S:N211K', 'S:N354D', 'S:N405D', 'S:N417K', 'S:N417T', 'S:N439K', 'S:N440K', 'S:N450D', 'S:N460K', 'S:N477S', 'S:N501T', 'S:N501Y',
          'S:N658S', 'S:N679K', 'S:N764K', 'S:N950D', 'S:N969K', 'S:N978S', 'S:P1112L', 'S:P1162L', 'S:P1162S', 'S:P1263L', 'S:P1263Q', 'S:P217S', 'S:P251S', 'S:P26L', 'S:P26S',
          'S:P384L', 'S:P479S', 'S:P681H', 'S:P681L', 'S:P681R', 'S:P809S', 'S:P812L', 'S:P812S', 'S:P9L', 'S:Q1201K', 'S:Q1208H', 'S:Q183H', 'S:Q271R', 'S:Q414R', 'S:Q452L',
          'S:Q493R', 'S:Q498R', 'S:Q52R', 'S:Q613H', 'S:Q628K', 'S:Q675H', 'S:Q675R', 'S:Q677H', 'S:Q677R', 'S:Q957L', 'S:R102I', 'S:R158-', 'S:R18L', 'S:R190S', 'S:R19T',
          'S:R214L', 'S:R21T', 'S:R246-', 'S:R346I', 'S:R346K', 'S:R346S', 'S:R346T', 'S:R357K', 'S:R408S', 'S:R452L', 'S:R493Q', 'S:R681P', 'S:R78M', 'S:S1242I', 'S:S1252F',
          'S:S12F', 'S:S13I', 'S:S151I', 'S:S221L', 'S:S247-', 'S:S247I', 'S:S254F', 'S:S255F', 'S:S256L', 'S:S371F', 'S:S371L', 'S:S373P', 'S:S375F', 'S:S408R', 'S:S446G',
          'S:S477I', 'S:S477N', 'S:S494P', 'S:S50L', 'S:S640F', 'S:S673T', 'S:S680F', 'S:S689I', 'S:S704L', 'S:S71F', 'S:S929I', 'S:S939F', 'S:S940F', 'S:S982A', 'S:S98F',
          'S:T1006I', 'S:T1027I', 'S:T1117I', 'S:T19I', 'S:T19R', 'S:T20I', 'S:T22I', 'S:T22N', 'S:T236S', 'S:T299I', 'S:T29A', 'S:T29I', 'S:T307I', 'S:T323I', 'S:T346R',
          'S:T376A', 'S:T385I', 'S:T478I', 'S:T478K', 'S:T478R', 'S:T51I', 'S:T547I', 'S:T547K', 'S:T572I', 'S:T573I', 'S:T604I', 'S:T716I', 'S:T719I', 'S:T747I', 'S:T76I',
          'S:T859I', 'S:T859N', 'S:T883I', 'S:T941S', 'S:T95A', 'S:T95I', 'S:V1104L', 'S:V1122L', 'S:V1133F', 'S:V1176F', 'S:V1228L', 'S:V1264L', 'S:V143-', 'S:V16F',
          'S:V213G', 'S:V289I', 'S:V362F', 'S:V367F', 'S:V367L', 'S:V3G', 'S:V445A', 'S:V483A', 'S:V503I', 'S:V622F', 'S:V688A', 'S:V6F', 'S:V70-', 'S:V70F', 'S:V70I',
          'S:W152C', 'S:W152L', 'S:W152R', 'S:W258L', 'S:W64L', 'S:W64R', 'S:Y144-', 'S:Y144F', 'S:Y145-', 'S:Y145H', 'S:Y248-', 'S:Y248H', 'S:Y248S', 'S:Y449H', 'S:Y453F',
          'S:Y505H', 'S:Y655H', 'S:Y796D']
      };

      specialVisualizations[decorator + 'PANGO_Lineage'] = {
        label: 'PANGO VOC',
        applies_to_ref: decorator + 'PANGO_Lineage',
        property_datatype: 'xsd:string',
        property_applies_to: 'node',
        color: '#FF0000',
        property_values: ['BA.1', 'BA.2', 'BA.2.75', 'BA.2.3.20', 'BA.3', 'BA.4', 'BA.4.6', 'BA.5', 'B.1.1.7', 'B.1.351', 'P.1', 'B.1.617.2', 'B.1.1.529', 'BQ.1', 'XB', 'XBB.1.5']
      };

      this.phylogeny = new OutbreaksPhylogenyTreeViewer({
        title: 'Phylogenetic Tree',
        id: this.viewer.id + '_phylogeny',
        phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/SARSCoV2/sarscov2.xml',
        nodeVisualizations: nodeVisualizations,
        specialVisualizations: specialVisualizations,
        settings: {
          filterValues: [
            {
              source: 'vipr:PANGO_Lineage',
              target: 'vipr:PANGO_Select_Lineage',
              pass: ['BA.1', 'BA.2', 'BA.2.75', 'BA.2.3.20', 'BA.3', 'BA.4', 'BA.4.6', 'BA.5', 'B.1.1.7', 'B.1.351', 'P.1', 'B.1.617.2', 'B.1.1.529', 'BQ.1', 'XB', 'XBB.1.5']
            }]
        }
      });

      this.resources = new OutbreaksTab({
        title: 'Resources',
        id: this.viewer.id + '_resources',
        templateString: ResourcesTemplate
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.lineage);
      this.viewer.addChild(this.lineage_prevalence);
      this.viewer.addChild(this.variant_prevalence);
      this.viewer.addChild(this.jbrowse);
      this.viewer.addChild(this.structure);
      this.viewer.addChild(this.phylogeny);
      this.viewer.addChild(this.resources);
    }
  });
});
