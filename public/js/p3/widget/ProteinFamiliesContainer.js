define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/RadioButton', 'dijit/form/Textarea', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  'dojox/widget/Standby', './ProteinFamiliesGridContainer', './ProteinFamiliesFilterGrid',
  './ProteinFamiliesHeatmapContainerNew'
], function (
  declare, lang, on, Topic, domConstruct,
  BorderContainer, TabContainer, StackController, ContentPane,
  RadioButton, TextArea, TextBox, Button, Select,
  Standby, MainGridContainer, FilterGrid,
  HeatmapContainerNew
) {

  return declare([BorderContainer], {
    tooltip: 'The "Protein Families" tab contains a list of Protein Families for genomes associated with the current view',

    gutters: false,
    state: null,
    pfState: null,
    loadingMask: null,
    apiServer: window.App.dataServiceURL,
    constructor: function (options) {
      // console.log(options);
      this.topicId = 'ProteinFamilies_' + options.id.split('_proteinFamilies')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'showMainGrid':
            this.tabContainer.selectChild(this.mainGridContainer);
            break;
          case 'updatePfState':
            this.pfState = value;
            this.updateFilterPanel(value);
            break;
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
            break;
          default:
            break;
        }
      }));
    },
    postCreate: function () {
      // create a loading mask
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();
    },
    onSetState: function (attr, oldVal, state) {

      if (this.mainGridContainer) {
        this.mainGridContainer.set('state', state);
      }

      if (state.autoFilterMessage) {
        var msg = '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + state.autoFilterMessage + "&nbsp;<i class='fa-1x icon-question-circle-o DialogButton' rel='help:GenomesLimit' /></div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-2x icon-cancel-circle close closeWarningBanner' style='color:#333;font-weight:200;'></td></tr></table>";
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
      // if (this.heatmapContainerNew) {
      //   this.heatmapContainerNew.set('visible', true);
      // }
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
        content: 'Protein Families Table',
        state: this.state,
        topicId: this.topicId,
        apiServer: this.apiServer
      });

      // <sup style="vertical-align: super; background: #76a72d; color: #fff; padding: 1px 3px 3px 3px; border-radius: 3px;">
      this.heatmapContainerNew = new HeatmapContainerNew({
        title: 'Heatmap',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        content: 'Heatmap'
      });

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.tabContainer.addChild(this.mainGridContainer);
      this.tabContainer.addChild(this.heatmapContainerNew);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.heatmapContainerNew.set('visible', true);

          if (!self._chartStaged) {
            setTimeout(function () {
              self.heatmapContainerNew.update();
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
    updateFilterPanel: function (pfState) {
      // console.log("update filter panel selections", pfState);

      this.family_type_selector._onChangeActive = false;
      this.family_type_selector.set('value', pfState.familyType);
      this.family_type_selector._onChangeActive = true;
      this.ta_keyword.set('value', pfState.keyword);
      this.rb_perfect_match.reset();
      this.rb_non_perfect_match.reset();
      this.rb_all_match.reset();
      switch (pfState.perfectFamMatch) {
        case 'A':
          this.rb_all_match.set('checked', true);
          break;
        case 'Y':
          this.rb_perfect_match.set('checked', true);
          break;
        case 'N':
          this.rb_non_perfect_match.set('checked', true);
          break;
        default:
          break;
      }
      this.tb_num_protein_family_min.set('value', pfState.min_member_count || '');
      this.tb_num_protein_family_max.set('value', pfState.max_member_count || '');
      this.tb_num_genome_family_min.set('value', pfState.min_genome_count || '');
      this.tb_num_genome_family_max.set('value', pfState.max_genome_count || '');

    },
    _buildFilterPanel: function () {

      var filterPanel = new ContentPane({
        region: 'left',
        title: 'filter',
        content: 'Filter By',
        style: 'width:283px; overflow: auto',
        splitter: true,
        'class': 'filterPanel'
      });

      var familyTypePanel = new ContentPane({
        region: 'top'
      });

      var cbType = this.family_type_selector = new Select({
        name: 'familyType',
        value: 'pgfam',
        options: [{
          value: 'plfam', label: 'PATRIC genus-specific families (PLfams)'
        }, {
          value: 'pgfam', label: 'PATRIC cross-genus families (PGfams)'
        }, {
          value: 'figfam', label: 'FIGfam'
        }]
      });
      cbType.on('change', lang.hitch(this, function (value) {

        this.pfState = lang.mixin({}, this.pfState, {
          familyType: value
        });
        Topic.publish(this.topicId, 'setFamilyType', this.pfState);
      }));
      domConstruct.place(cbType.domNode, familyTypePanel.containerNode, 'last');

      filterPanel.addChild(familyTypePanel);

      var filterGridDescriptor = new ContentPane({
        style: 'padding: 0',
        content: '<div class="pfFilterOptions"><div class="present"><b>Present</b> in all families</div><div class="absent"><b>Absent</b> from all families</div><div class="mixed"><b>Either/Mixed</b></div></div>'
      });
      filterPanel.addChild(filterGridDescriptor);

      // genome list grid
      var filterGrid = new FilterGrid({
        'class': 'pfFilterGrid',
        topicId: this.topicId,
        state: this.state
      });
      filterPanel.addChild(filterGrid);

      // // other filter items
      var otherFilterPanel = new ContentPane({
        region: 'bottom'
      });

      var ta_keyword = this.ta_keyword = new TextArea({
        style: 'width:272px; min-height:75px; margin-bottom: 10px'
      });
      var label_keyword = domConstruct.create('label', { innerHTML: 'Filter by one or more keywords' });
      domConstruct.place(label_keyword, otherFilterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, otherFilterPanel.containerNode, 'last');

      //
      domConstruct.place('<br/>', otherFilterPanel.containerNode, 'last');

      var rb_perfect_match = this.rb_perfect_match = new RadioButton({
        name: 'familyMatch',
        value: 'perfect'
      });

      var label_rb_perfect_match = domConstruct.create('label', { innerHTML: ' Perfect Families (One protein per genome)<br/>' });
      domConstruct.place(rb_perfect_match.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place(label_rb_perfect_match, otherFilterPanel.containerNode, 'last');

      var rb_non_perfect_match = this.rb_non_perfect_match = new RadioButton({
        name: 'familyMatch',
        value: 'non_perfect'
      });

      var label_rb_non_perfect_match = domConstruct.create('label', { innerHTML: ' Non perfect Families<br/>' });
      domConstruct.place(rb_non_perfect_match.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place(label_rb_non_perfect_match, otherFilterPanel.containerNode, 'last');

      var rb_all_match = this.rb_all_match = new RadioButton({
        name: 'familyMatch',
        value: 'all_match',
        checked: true
      });

      var label_rb_all_match = domConstruct.create('label', { innerHTML: ' All Families' });
      domConstruct.place(rb_all_match.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place(label_rb_all_match, otherFilterPanel.containerNode, 'last');

      domConstruct.place('<br/><br/>', otherFilterPanel.containerNode, 'last');

      var label_num_protein_family = domConstruct.create('label', { innerHTML: 'Number of Proteins per Family<br/>' });
      var tb_num_protein_family_min = this.tb_num_protein_family_min = new TextBox({
        name: 'numProteinFamilyMin',
        value: '',
        style: 'width: 40px'
      });
      var tb_num_protein_family_max = this.tb_num_protein_family_max = new TextBox({
        name: 'numProteinFamilyMax',
        value: '',
        style: 'width:40px'
      });
      domConstruct.place(label_num_protein_family, otherFilterPanel.containerNode, 'last');
      domConstruct.place(tb_num_protein_family_min.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place('<span> to </span>', otherFilterPanel.containerNode, 'last');
      domConstruct.place(tb_num_protein_family_max.domNode, otherFilterPanel.containerNode, 'last');

      var label_num_genome_family = domConstruct.create('label', { innerHTML: 'Number of Genomes per Family<br/>' });
      var tb_num_genome_family_min = this.tb_num_genome_family_min = new TextBox({
        name: 'numGenomeFamilyMin',
        value: '',
        style: 'width: 40px'
      });
      var tb_num_genome_family_max = this.tb_num_genome_family_max = new TextBox({
        name: 'numGenomeFamilyMax',
        value: '',
        style: 'width:40px'
      });
      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');
      domConstruct.place(label_num_genome_family, otherFilterPanel.containerNode, 'last');
      domConstruct.place(tb_num_genome_family_min.domNode, otherFilterPanel.containerNode, 'last');
      domConstruct.place('<span> to </span>', otherFilterPanel.containerNode, 'last');
      domConstruct.place(tb_num_genome_family_max.domNode, otherFilterPanel.containerNode, 'last');

      domConstruct.place('<br/><br/>', otherFilterPanel.containerNode, 'last');

      var defaultFilterValue = {
        keyword: '',
        clusterColumnOrder: [],
        perfectFamMatch: 'A',
        min_member_count: null,
        max_member_count: null,
        min_genome_count: null,
        max_genome_count: null
      };

      var btn_reset = new Button({
        label: 'Reset',
        onClick: lang.hitch(this, function () {

          ta_keyword.set('value', '');

          rb_perfect_match.reset();
          rb_non_perfect_match.reset();
          rb_all_match.reset();

          tb_num_protein_family_min.set('value', '');
          tb_num_protein_family_max.set('value', '');
          tb_num_genome_family_min.set('value', '');
          tb_num_genome_family_max.set('value', '');

          // reset store
          this.pfState = lang.mixin(this.pfState, defaultFilterValue);
          // console.log(this.pfState);
          Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
        })
      });
      domConstruct.place(btn_reset.domNode, otherFilterPanel.containerNode, 'last');

      var btn_submit = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function () {

          var filter = {};

          filter.keyword = ta_keyword.get('value');

          if (rb_perfect_match.get('value')) {
            filter.perfectFamMatch = 'Y';
          } else if (rb_non_perfect_match.get('value')) {
            filter.perfectFamMatch = 'N';
          } else if (rb_all_match.get('value')) {
            filter.perfectFamMatch = 'A';
          }

          var min_member_count = parseInt(tb_num_protein_family_min.get('value'));
          var max_member_count = parseInt(tb_num_protein_family_max.get('value'));
          var min_genome_count = parseInt(tb_num_genome_family_min.get('value'));
          var max_genome_count = parseInt(tb_num_genome_family_max.get('value'));

          !isNaN(min_member_count) ? filter.min_member_count = Math.min(min_member_count, max_member_count) : {};
          !isNaN(max_member_count) ? filter.max_member_count = Math.max(min_member_count, max_member_count) : {};

          !isNaN(min_genome_count) ? filter.min_genome_count = Math.min(min_genome_count, max_genome_count) : {};
          !isNaN(max_genome_count) ? filter.max_genome_count = Math.max(min_genome_count, max_genome_count) : {};

          this.pfState = lang.mixin(this.pfState, defaultFilterValue, filter);
          // console.log(this.pfState);
          Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
        })
      });
      domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, 'last');

      filterPanel.addChild(otherFilterPanel);

      return filterPanel;
    }
  });
});
