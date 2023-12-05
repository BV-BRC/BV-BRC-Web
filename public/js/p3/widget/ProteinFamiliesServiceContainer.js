define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/RadioButton', 'dijit/form/Textarea', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select', 'dojo/_base/Deferred',
  'dojox/widget/Standby', '../store/ProteinFamiliesServiceMemoryStore', './ProteinFamiliesServiceGridContainer', './ProteinFamiliesServiceFilterGrid',
  './ProteinFamiliesServiceHeatmapContainer', '../WorkspaceManager', '../DataAPI', './WorkspaceObjectSelector'
], function (
  declare, lang, on, Topic, domConstruct,
  BorderContainer, TabContainer, StackController, ContentPane,
  RadioButton, TextArea, TextBox, Button, Select, Deferred,
  Standby, MainMemoryStore, MainGridContainer, FilterGrid,
  HeatmapContainer, WorkspaceManager, DataAPI, WorkspaceObjectSelector
) {

  return declare([BorderContainer], {
    'class': 'GridContainer proteinfamily_view', // TODO: don't think I need this
    tooltip: 'Protein Families',
    gutters: false,
    containerType: '',
    visible: true,
    state: null,
    store: null,
    loaded: false,

    // NOTES:
    // - This container contains the tables and switch between heatmap view and table view

    constructor: function (options) {
      this.topicId = 'pgfam';

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

    setLoaded: function () {
      this.loaded = true;
    },

    postCreate: function () {
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.show();
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("ProteinFamiliesServiceContainer set STATE.  state: ", state, " First View: ", this._firstView);
      // console.log('loaded = ', this.loaded);
      if (!this.loaded) {
        // wait for directory contents to load
        return;
      }
      if (state) {
        this.state = state;
        this.onFirstView();
      }
      // TODO: breadcrumb?
    },

    selectChild: function (child) {
      Topic.publish('tab_container-selectChild', child);
    },

    onFirstView: function () {
      console.log('onFirstView');
      if (this.firstView) {
        return;
      }

      // add breadcrumb
      var breadCrumbContainer = new ContentPane({ 'content': this.generatePathLinks(this.state.path), 'region': 'top' });

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + 'tab_container' });

      var tabController = new StackController({
        containerId: this.id +  'tab_container',
        region: 'top',
        'class': 'TextTabButtonsViewer'
      });

      this.tabController = tabController;

      this.addChild(breadCrumbContainer);
      this.addChild(this.tabController);
      this.addChild(this.tabContainer);

      Topic.subscribe('tab_container-selectChild', lang.hitch(this, function (page) {
        page.set('state', this.state);
      }));

      var filterPanel = this._buildFilterPanel();
      this.addChild(filterPanel);

      this.loadWorkspaceData(); // Grid container and heatmap set in this function

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.heatmapContainer.set('visible', true);

          if (!self._chartStaged) {
            setTimeout(function () {
              self.heatmapContainer.update();
              self._chartStaged = true;
            });
          }
        }
      });

      this.firstView = true;
    },

    loadWorkspaceData: function () {

      this.state.data['table'] = [];

      // set data in state
      // TODO: background process for initial parsing
      console.log('parsing pgfam_data');
      this.loadPGFamData();

      console.log('parsing plfam_data');
      this.loadPLFamData();

      console.log('this.state = ', this.state);

      // Query for genome information then start
      // TODO: remove getGenome call, use genome_names in job data
      // DataAPI.getGenome(this.state.data.genome_ids).then(lang.hitch(this, function (res) {
      // this.state.data.genome_data = res;
      this.heatmapContainer = new HeatmapContainer({
        title: 'Heatmap',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        content: 'Heatmap'
      });
      this.mainGridContainer = new MainGridContainer({
        title: 'Table',
        content: 'Protein Families Table',
        state: this.state,
        topicId: this.topicId
      });
      this.tabContainer.addChild(this.mainGridContainer);
      this.tabContainer.addChild(this.heatmapContainer);

      Topic.publish(this.topicId, 'updatePfState', this.pfState);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.heatmapContainer.set('visible', true);

          if (!self._chartStaged) {
            setTimeout(function () {
              self.heatmapContainer.update();
              self._chartStaged = true;
            });
          }
        }
      });
      // }));

    },

    // TODO: how to make as a 'background' process
    loadPLFamData: function () {
      var def = new Deferred();
      var plfam_data = [];
      var header = true;
      var plfam_keys = null;
      this.state.data['plfam'].split('\n').forEach(function (line) {
        if (header) {
          plfam_keys = line.split('\t');
          header = false;
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          var skip = false;
          plfam_keys.forEach(lang.hitch(this, function (key, index) {
            if (key === 'plfam_id') {
              key = 'family_id';
              if (l[index] === undefined || l[index] === '') {
                skip = true;
              }
            }
            new_data[key] = l[index];
          }));
          new_data['familyType'] = 'plfam';
          if (!skip) {
            plfam_data.push(new_data);
          }
        }
      });
      this.state.data['table'] = this.state.data['table'].concat(plfam_data);
      def.resolve();
      return def;
    },

    // TODO: how to make as a 'background' process
    loadPGFamData: function () {
      var def = new Deferred();
      var pgfam_data = [];
      var header = true;
      var pgfam_keys = null;
      this.state.data['pgfam'].split('\n').forEach(function (line) {
        if (header) {
          pgfam_keys = line.split('\t');
          header = false;
          console.log(pgfam_keys);
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          var skip = false;
          pgfam_keys.forEach(lang.hitch(this, function (key, index) {
            if (key === 'pgfam_id') {
              key = 'family_id';
              if (l[index] === undefined || l[index] === '') {
                skip = true;
              }
            }
            new_data[key] = l[index];
          }));
          new_data['familyType'] = 'pgfam';
          if (!skip) {
            pgfam_data.push(new_data);
          }
        }
      });
      this.state.data['table'] = this.state.data['table'].concat(pgfam_data);
      def.resolve();
      return def;
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
      console.log('buildFilterPanel state: ', this.state);
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
        value: 'pgfam', // default value on load
        options: [{
          value: 'plfam', label: 'PATRIC genus-specific families (PLfams)'
        }, {
          value: 'pgfam', label: 'PATRIC cross-genus families (PGfams)'
        }]
      });
      cbType.on('change', lang.hitch(this, function (value) {

        this.pfState = lang.mixin({}, this.pfState, {
          familyType: value
        });
        Topic.publish(this.topicId, 'setFamilyType', this.pfState); // subscribed in ProteinFamiliesServiceMemoryStore
      }));
      domConstruct.place(cbType.domNode, familyTypePanel.containerNode, 'last');

      filterPanel.addChild(familyTypePanel);

      // feature group selector
      var featureGroupPanel = new ContentPane({
        region: 'top'
      });
      var fg_label = domConstruct.create('label', { innerHTML: 'Filter by Feature Group' });
      domConstruct.place(fg_label, featureGroupPanel.containerNode, 'last');
      var feature_group_selector = this.fg_selector = new WorkspaceObjectSelector({
        style: 'width: 280px',
        type: ['feature_group'],
        allowUpload: false,
        multi: false
      });
      var fg_dom = domConstruct.create('div');
      feature_group_selector.placeAt(fg_dom);
      var filter_btn_fg = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function (evt) {
          Topic.publish(this.topicId, 'showLoadingMask', this.pfState);
          var feature_group = this.pfState.feature_group = this.fg_selector.get('value');
          WorkspaceManager.getObject(feature_group).then(lang.hitch(this, function (res) {
            var obj = JSON.parse(res.data);
            var feature_ids = obj.id_list.feature_id;
            // console.log('feature_ids length = ' + feature_ids.length)
            var query = `in(feature_id,(${(feature_ids.map(encodeURIComponent).join(','))}))&limit(${feature_ids.length})`;
            DataAPI.queryGenomeFeatures(query).then(lang.hitch(this, function (res2) {
              Topic.publish(this.topicId, 'hideLoadingMask', this.pfState);
              this.pfState.feature_group_data = res2.items;
              Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
            }), lang.hitch(this, function (err) {
              this.pfState.feature_group = '';
              this.pfState.feature_group_data = [];
              console.log('error getting feature data: ', err);
              Topic.publish(this.topicId, 'hideLoadingMask', this.pfState);
            }));
          }), lang.hitch(this, function (err) {
            this.pfState.feature_group = '';
            this.pfState.feature_group_data = [];
            console.log('error getting feature ids from feature group: ', err);
            Topic.publish(this.topicId, 'hideLoadingMask', this.pfState);
          }));
        })
      });
      var filter_dom = domConstruct.create('div');
      filter_btn_fg.placeAt(filter_dom);
      var clear_btn_fg = new Button({
        label: 'Clear',
        onClick: lang.hitch(this, function (evt) {
          this.pfState.feature_group = '';
          this.pfState.feature_group_data = [];
          this.fg_selector.set('value', '');
          Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
        })
      });
      clear_btn_fg.placeAt(filter_dom);
      domConstruct.place(fg_dom, featureGroupPanel.containerNode, 'last');
      domConstruct.place(filter_dom, featureGroupPanel.containerNode, 'last');

      filterPanel.addChild(featureGroupPanel);

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
      // this.filterGrid = filterGrid;

      // genome list grid filter button
      /*
      var genome_btn_submit = new Button({
        label: 'Filter Genomes',
        onClick: lang.hitch(this, function () {
          Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
        })
      });
      filterPanel.addChild(genome_btn_submit);
      */

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
    },

    generatePathLinks: function (path) {
      // strip out /public/ of parts array
      var parts = path.replace(/\/+/g, '/').split('/');
      if (parts[1] == 'public') {
        parts.splice(1, 1);
      }

      if (parts[0] == '') {
        parts.shift();
      }

      var out = ["<span class='wsBreadCrumb'>"];
      var bp = ['workspace'];
      var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

      // if viewing all public workspaces, just create header
      if (path == '/public/') {
        out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>');

        // if viewing a specific public workspace, create bread crumbs with additional url params
      } else if (isPublic) {
        out.push('<i class="icon-globe"></i> ' +
          '<a class="navigationLink perspective" href="/' + bp.join('/') + '/public">Public Workspaces</a>' +
          ' <i class="icon-caret-right"></i> ');
        bp.push('public', parts[0]);
      }
      parts.push(''); // job result folder wont link without an added element
      parts.forEach(function (part, idx) {
        // part is already encoded
        if (idx == (parts.length - 1)) {
          out.push('<b class="perspective">' + part.replace('@' + localStorage.getItem('realm'), '') + '</b>');
          return;
        }

        // don't create links for top level path of public path
        if (isPublic && idx == 0) {
          out.push('<b class="perspective">' + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</b> / ');
          return;
        }

        out.push("<a class='navigationLink' href='");
        bp.push(part);
        out.push('/' + bp.join('/'));
        out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : decodeURIComponent(part)) + '</a> / ');
      });
      return out.join('');
    }

  });
});
