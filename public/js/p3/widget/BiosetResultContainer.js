define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/Textarea', 'dijit/form/Button', 'dijit/form/Select', 'dojox/widget/Standby', 'dijit/form/ComboBox', 'dojo/store/Memory',
  './BiosetResultGridContainer', './BiosetResultFilterGrid',
  './BiosetResultHeatmapContainer'
], function (
  declare, lang, Topic, domConstruct,
  BorderContainer, TabContainer, StackController, ContentPane,
  TextArea, Button, Select, Standby, ComboBox, Memory,
  MainGridContainer, FilterGrid,
  HeatmapContainer
) {

  return declare([BorderContainer], {
    gutters: false,
    state: null,
    tgState: null,
    loadingMask: null,
    apiServer: window.App.dataServiceURL,
    constructor: function (options) {

      this.topicId = 'TranscriptomicsGene_' + options.id.split('_TranscriptomicsGene')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            this.tgState = value;
            this.updateFilterPanel(value);
            break;
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
            break;
          case 'updateGenomeFilter':
            this.updateGenomeFilter(value);
            break;
          default:
            break;
        }
      }));
    },
    postCreate: function () {
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();

      this.loadingMask.show(); // this widget is opened by new window/tab
    },
    onSetState: function (attr, oldVal, state) {
      if (this.mainGridContainer) {
        this.mainGridContainer.set('state', state);
      }
      this._set('state', state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
      if (this.mainGridContainer) {
        this.mainGridContainer.set('visible', true);
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      var filterPanel = this._buildFilterPanel();

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      this.mainGridContainer = new MainGridContainer({
        title: 'Table',
        content: 'Bioset Result Table',
        state: this.state,
        topicId: this.topicId,
        apiServer: this.apiServer
      });

      this.HeatmapContainer = new HeatmapContainer({
        title: 'Heatmap',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        content: 'Heatmap'
      });

      this.watch('state', lang.hitch(this, 'onSetState'));

      this.tabContainer.addChild(this.mainGridContainer);
      this.tabContainer.addChild(this.HeatmapContainer);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.HeatmapContainer.set('visible', true);

          if (!self._chartStaged) {
            setTimeout(function () {
              self.HeatmapContainer.update();
              self._chartStaged = true;
            });
          }
        }
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);
      this.addChild(filterPanel);

      this.inherited(arguments);
      this._firstView = true;
    },
    updateFilterPanel: function (tgState) {

      this.ta_keyword.set('value', tgState.keyword);
      this.filter_log_ratio.set('value', tgState.upFold || 0);
      this.filter_z_score.set('value', tgState.upZscore || 0);
      this.filter_p_value.set('value', tgState.gtePvalue || 0);
    },
    _buildFilterPanel: function () {

      var filterPanel = new ContentPane({
        region: 'left',
        title: 'filter',
        content: 'Filter By',
        style: 'width:283px; overflow:auto',
        splitter: true,
        'class': 'filterPanel'
      });

      var filterGridDescriptor = new ContentPane({
        style: 'padding: 0',
        content: '<div class="tgFilterOptions"><div><img src="/public/js/p3/resources/images/expression_data_up.png" alt="Up regulate" title="Up regulate"></div><div><img src="/public/js/p3/resources/images/expression_data_down.png" alt="Down regulate" title="Down regulate"></div><div><img src="/public/js/p3/resources/images/expression_data_mixed.png" alt="Don\'t care" title="Don\'t care"></div></div>'
      });
      filterPanel.addChild(filterGridDescriptor);

      // genome list grid
      var filterGrid = new FilterGrid({
        'class': 'tgFilterGrid',
        topicId: this.topicId,
        state: this.state
      });
      filterPanel.addChild(filterGrid);

      // other filter items
      var otherFilterPanel = new ContentPane({
        region: 'bottom'
      });

      // var select_genome_filter = this.filter_genome = new Select({
      //   name: 'selectGenomeFilter',
      //   options: [{ value: '', label: 'Select a genome to filter' }],
      //   style: 'width: 272px; margin: 5px 0'
      // });
      // var label_select_genome_filter = domConstruct.create('label', { innerHTML: 'Filer by Genome: ' });
      // domConstruct.place(label_select_genome_filter, otherFilterPanel.containerNode, 'last');
      // domConstruct.place(select_genome_filter.domNode, otherFilterPanel.containerNode, 'last');
      // domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      var ta_keyword = this.ta_keyword = new TextArea({
        style: 'width:272px; min-height:75px; margin-bottom: 10px'
      });
      var label_keyword = domConstruct.create('label', { innerHTML: 'Filter by one or more keywords or locus tags' });
      domConstruct.place(label_keyword, otherFilterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, otherFilterPanel.containerNode, 'last');

      var select_log_ratio = this.filter_log_ratio = new Select({
        name: 'selectLogRatio',
        options: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' },
          { value: 1.5, label: '1.5' }, { value: 2, label: '2' }, { value: 2.5, label: '2.5' },
          { value: 3, label: '3' }
        ],
        style: 'width: 80px; margin: 5px 0'
      });
      var label_select_log_ratio = domConstruct.create('label', { innerHTML: 'Filter by |Log Ratio|: ' });
      domConstruct.place(label_select_log_ratio, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_log_ratio.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      var select_p_value = this.filter_p_value = new ComboBox({
        name: 'selectPValue',
        store: Memory({
          data: [{ name: 0, id: '0' }, { name: 0.1, id: '0.1' }, { name: 0.2, id: '0.2' },
            { name: 0.3, id: '0.3' }, { name: 0.4, id: '0.4' }, { name: 0.5, id: '0.5' },
            { name: 0.6, id: '0.6' }, { name: 0.7, id: '0.7' }, { name: 0.8, id: '0.8' },
            { name: 0.9, id: '0.9' }, { name: 1, id: '1' }
          ]
        }),
        style: 'width: 80px; margin: 5px 0'
      });
      var label_select_p_value = domConstruct.create('label', { innerHTML: 'Filter by P value >= ' });
      domConstruct.place(label_select_p_value, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_p_value.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      var select_z_score = this.filter_z_score = new Select({
        name: 'selectZScore',
        options: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' },
          { value: 1.5, label: '1.5' }, { value: 2, label: '2' }, { value: 2.5, label: '2.5' },
          { value: 3, label: '3' }
        ],
        style: 'width: 80px; margin: 5px 0'
      });
      var label_select_z_score = domConstruct.create('label', { innerHTML: 'Filter by |Z-score|: ' });
      domConstruct.place(label_select_z_score, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_z_score.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      var defaultFilterValue = {
        keyword: '',
        filterGenome: null,
        clusterColumnOrder: [],
        upFold: 0,
        downFold: 0,
        upZscore: 0,
        downZscore: 0,
        gtePvalue: 0,
      };

      var btn_submit = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function () {

          var filter = {};
          // filter.filterGenome = select_genome_filter.get('value');
          filter.keyword = ta_keyword.get('value');

          var lr = parseFloat(select_log_ratio.get('value'));
          var zs = parseFloat(select_z_score.get('value'));
          var pv = parseFloat(select_p_value.get('value'));

          !isNaN(lr) ? (filter.upFold = lr, filter.downFold = -lr) : {};
          !isNaN(zs) ? (filter.upZscore = zs, filter.downZscore = -zs) : {};
          !isNaN(pv) ? (filter.gtePvalue = pv) : {};

          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          // console.log(this.tgState)

          Topic.publish(this.topicId, 'applyConditionFilter', this.tgState);
        })
      });
      domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, 'last');

      filterPanel.addChild(otherFilterPanel);

      return filterPanel;
    },
    // updateGenomeFilter: function (data) {
    //   this.filter_genome.addOption(data);
    // }
  });
});
