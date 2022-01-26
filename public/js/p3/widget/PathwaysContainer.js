define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/_base/lang',
  './ActionBar', './ContainerActionBar', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './PathwaysMemoryGridContainer', 'dijit/layout/ContentPane', './GridContainer', 'dijit/TooltipDialog',
  '../store/PathwayMemoryStore', 'dojo/dom-construct', 'dojo/topic', './GridSelector'
], function (
  declare, BorderContainer, on, lang,
  ActionBar, ContainerActionBar, TabContainer, StackController,
  PathwaysGridContainer, ContentPane, GridContainer, TooltipDialog,
  PathwayMemoryStore, domConstruct, topic, selector
) {

  return declare([BorderContainer], {
    gutters: false,
    state: null,
    tooltip: 'The "Pathways" tab contains a list of pathways for genomes associated with the current view',
    apiServer: window.App.dataServiceURL,
    defaultFilter: 'eq(annotation,%22PATRIC%22)',

    postCreate: function () {
      this.inherited(arguments);
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("PathwaysContainer set STATE.  state: ", state, " First View: ", this._firstView);

      if (!state) {
        return;
      }

      if (this.tabContainer && this.tabContainer.selectedChildWidget && this._firstView && this.tabContainer.selectedChildWidget.state != state) {
        this.tabContainer.selectedChildWidget.set('state', state);
      }

      if (state.autoFilterMessage) {
        var msg = '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + state.autoFilterMessage + "&nbsp;<i class='fa-1x icon-question-circle-o DialogButton' rel='help:/misc/GenomesLimit' /></div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-1x icon-cancel-circle close closeWarningBanner' style='color:#333;font-weight:200;'></td></tr></table>";
        // var msg = state.autoFilterMessage;
        if (!this.messagePanel) {
          this.messagePanel = new ContentPane({
            'class': 'WarningPanel',
            region: 'top',
            content: msg
          });

          var _self = this;
          on(this.messagePanel.domNode, '.closeWarningBanner:click', function (evt) {
            if (_self.messagePanel) {
              _self.removeChild(_self.messagePanel);
            }
          });
        } else {
          this.messagePanel.set('content', msg);
        }
        this.addChild(this.messagePanel);
      } else {
        if (this.messagePanel) {
          this.removeChild(this.messagePanel);
        }
      }

      // this._set("state", state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {

      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },

    selectChild: function (child) {
      topic.publish(this.id + '-selectChild', child);
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }
      // console.log("PathwaysContainer onFirstView()");
      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      var pathwayStore = this.pathwayStore = new PathwayMemoryStore({
        type: 'pathway'
      });

      var ecNumberStore = this.ecNumberStore = new PathwayMemoryStore({ type: 'ecnumber' });
      var geneStore = this.geneStore = new PathwayMemoryStore({ type: 'genes' });

      this.pathwaysGrid = new PathwaysGridContainer({
        title: 'Pathways',
        type: 'pathway',
        // state: this.state,
        apiServer: this.apiServer,
        defaultFilter: this.defaultFilter,
        store: pathwayStore,
        facetFields: ['annotation', 'pathway_class'],
        queryOptions: {
          sort: [{ attribute: 'pathway_id' }]
        },
        enableFilterPanel: true,
        visible: true
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);
      this.tabContainer.addChild(this.pathwaysGrid);

      this.ecNumbersGrid = new PathwaysGridContainer({
        title: 'EC Numbers',
        type: 'ec_number',
        // state: this.state,
        apiServer: this.apiServer,
        defaultFilter: this.defaultFilter,
        facetFields: ['annotation', 'pathway_class'],
        columns: {
          'Selection Checkboxes': selector({ unhidable: true }),
          idx: { label: 'Index', field: 'idx', hidden: true },
          pathway_id: { label: 'Pathway ID', field: 'pathway_id' },
          pathway_name: { label: 'Pathway Name', field: 'pathway_name' },
          pathway_class: { label: 'Pathway Class', field: 'pathway_class' },
          annotation: { label: 'Annotation', field: 'annotation' },
          ec_number: { label: 'EC Number', field: 'ec_number' },
          description: { label: 'Description', field: 'ec_description' }
        },
        store: ecNumberStore,
        enableFilterPanel: true,
        queryOptions: {
          sort: [{ attribute: 'pathway_id' }, { attribute: 'ec_number' }]
        }
      });

      this.genesGrid = new PathwaysGridContainer({
        title: 'Genes',
        type: 'gene',
        // state: this.state,
        apiServer: this.apiServer,
        defaultFilter: this.defaultFilter,
        facetFields: ['annotation', 'pathway_class'],
        columns: {
          'Selection Checkboxes': selector({ unhidable: true }),
          idx: { label: 'Index', field: 'idx', hidden: true },
          feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
          genome_name: { label: 'Genome Name', field: 'genome_name' },
          accession: { label: 'Accession', field: 'accession', hidden: true },
          patric_id: { label: 'BRC ID', field: 'patric_id' },
          refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag' },
          alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
          gene: { label: 'Gene', field: 'gene' },
          product: { label: 'Product', field: 'product' },
          annotation: { label: 'Annotation', field: 'annotation' },
          pathway_id: { label: 'Pathway ID', field: 'pathway_id' },
          pathway_name: { label: 'Pathway Name', field: 'pathway_name' },
          ec_number: { label: 'EC Number', field: 'ec_number' },
          ec_description: { label: 'EC Description', field: 'ec_description' }
        },
        store: geneStore,
        enableFilterPanel: true,
        queryOptions: {
          sort: [{ attribute: 'genome_name' }, { attribute: 'accession' }, { attribute: 'start' }]
        }
      });

      this.tabContainer.addChild(this.ecNumbersGrid);
      this.tabContainer.addChild(this.genesGrid);

      topic.subscribe(this.id + '_TabContainer-selectChild', lang.hitch(this, function (page) {
        page.set('state', this.state);
      }));

      this._firstView = true;
    }

  });
});
