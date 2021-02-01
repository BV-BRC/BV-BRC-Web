define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/request', 'dojo/when', 'dojo/_base/Deferred',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './VariantLineageGridContainer', './VariantLineageChartContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup'
], function (
  declare, lang, on, Topic, domConstruct, xhr, when, Deferred,
  BorderContainer, StackContainer, TabController, ContentPane,
  TextBox, Button, Select,
  VariantLineageGridContainer, VariantLineageChartContainer, TooltipDialog, Dialog, popup
) {

  return declare([BorderContainer], {
    id: 'VariantLineageContainer',
    gutters: false,
    state: null,
    tgState: null,
    tooltip: '',
    apiServer: window.App.dataServiceURL,
    constructor: function () {
    },
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      if (state && !state.search) {
        return;
      }

      this._buildPanels(state);

      if (this.VariantLineageGridContainer) {
        this.VariantLineageGridContainer.set('state', state);
      }
      // if (this.VariantLineageChartContainer) {
      //   this.VariantLineageChartContainer.set('state', state);
      // }
      this._set('state', state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    },
    _buildPanels: function (state) {
      var self = this;
      var q = state.search + '&facet((field,country),(field,region),(field,month)(field,lineage),(field,sequence_features),(mincount,1))&json(nl,map)'
      xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {
        if (res && res.response.numFound == 0) {
          var messagePane = new ContentPane({
            region: 'top',
            content: '<p>No data found</p>'
          });
          self.addChild(messagePane);
        } else {

          // console.log(res)
          var dict =  {}
          dict['country'] = Object.keys(res.facet_counts.facet_fields.country).sort()
          dict['region'] = Object.keys(res.facet_counts.facet_fields.region).sort()
          dict['month'] = Object.keys(res.facet_counts.facet_fields.month).sort((a, b) => b - a)
          dict['lineage'] = Object.keys(res.facet_counts.facet_fields.lineage).sort()
          dict['sequence_features'] = Object.keys(res.facet_counts.facet_fields.sequence_features).sort()

          var filterPanel = self._buildFilterPanel(dict);

          self.tabContainer = new StackContainer({ region: 'center', id: self.id + '_TabContainer' });
          var tabController = new TabController({
            containerId: self.id + '_TabContainer',
            region: 'top',
            'class': 'TextTabButtons'
          });

          // for charts
          var chartContainer1 = new VariantLineageChartContainer({
            region: 'leading',
            style: 'height: 500px; width: 500px;',
            doLayout: false,
            id: self.id + '_chartContainer1',
            // region: "leading", style: "width: 500px;", doLayout: false, id: this.id + "_chartContainer1",
            title: 'By Country Chart',
            content: 'LoC By Country Chart',
            state: self.state,
            tgtate: self.tgState,
            apiServer: self.apiServer
          });
          chartContainer1.startup();

          var chartContainer2 = new VariantLineageChartContainer({
            region: 'leading',
            style: 'height: 500px; width: 500px;',
            doLayout: false,
            id: self.id + '_chartContainer2',
            // region: "leading", style: "width: 500px;", doLayout: false, id: this.id + "_chartContainer1",
            title: 'By Lineage Chart',
            content: 'LoC By Country Chart',
            state: self.state,
            tgtate: self.tgState,
            apiServer: self.apiServer
          });
          chartContainer2.startup();

          // for data grid
          self.VariantLineageGridContainer = new VariantLineageGridContainer({
            title: 'Table',
            content: 'Variant Lineage Table',
            visible: true,
            state: self.state,
            tgtate: self.tgState
          });
          self.VariantLineageGridContainer.startup();
          self.addChild(tabController);
          self.addChild(filterPanel);
          self.tabContainer.addChild(self.VariantLineageGridContainer);
          self.tabContainer.addChild(chartContainer1);
          self.tabContainer.addChild(chartContainer2);
          self.addChild(self.tabContainer);

          Topic.subscribe(self.id + '_TabContainer-selectChild', lang.hitch(self, function (page) {
            page.set('state', self.state);
            page.set('visible', true);
          }));
        }

      }, function (err) {
        var messagePane = new ContentPane({
          region: 'top',
          content: '<p>No data found</p>'
        });
        self.addChild(messagePane);
      });

    },

    _buildFilterPanel: function (filter_data) {
      // other filter items
      var otherFilterPanel = new ContentPane({
        region: 'top',
        'class': 'GeneExpFilterPanel'
      });

      /*
      // download dialog
      var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
      var downloadTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadTT);
        }
      });

      var _self = this;
      on(downloadTT.domNode, 'div:click', function (evt) {
        var rel = evt.target.attributes.rel.value;
        console.log('REL: ', rel);
        var dataType = 'transcriptomics_gene';

        var uf = _self.tgState.upFold,
          df = _self.tgState.downFold;
        var uz = _self.tgState.upZscore,
          dz = _self.tgState.downZscore;
        var keyword = _self.tgState.keyword;
        var range = '';
        if (keyword && keyword.length > 0) {
          range += '&keyword(' + encodeURIComponent(keyword) + ')';
        }

        if (uf > 0 && df < 0) {
          range += '&or(gt(log_ratio,' + uf + '),lt(log_ratio,' + df + '))';
        }
        else if (uf > 0) {
          range += '&gt(log_ratio,' + uf + ')';
        }
        else if (df < 0) {
          range += '&lt(log_ratio,' + df + ')';
        }
        if (uz > 0 && dz < 0) {
          range += '&or(gt(z_score,' + uz + '),lt(z_score,' + dz + '))';
        }
        else if (uz > 0) {
          range += '&gt(z_score,' + uz + ')';
        }
        else if (dz < 0) {
          range += '&lt(z_score,' + dz + ')';
        }
        var query = _self.state.search + range + '&sort(+id)&limit(25000)';

        // var query = "eq(FOO,bar)";
        console.log('DownloadQuery: ', dataType, query);

        var baseUrl = window.App.dataServiceURL;
        if (baseUrl.charAt(-1) !== '/') {
          baseUrl += '/';
        }
        baseUrl = baseUrl + dataType + '/?';

        if (window.App.authorizationToken) {
          baseUrl = baseUrl + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
        }

        baseUrl = baseUrl + '&http_accept=' + rel + '&http_download=true';
        console.log('DownloadQuery: ', query, ' baseUrl:', baseUrl);


        var form = domConstruct.create('form', {
          style: 'display: none;',
          id: 'downloadForm',
          enctype: 'application/x-www-form-urlencoded',
          name: 'downloadForm',
          method: 'post',
          action: baseUrl
        }, _self.domNode);
        domConstruct.create('input', { type: 'hidden', value: encodeURIComponent(query), name: 'rql' }, form);
        form.submit();

        popup.close(downloadTT);
      });

      // download button
      var wrapper = domConstruct.create('div', {
        'class': 'ActionButtonWrapper',
        rel: 'DownloadTable'
      });
      domConstruct.create('div', { 'class': 'fa icon-download fa-2x' }, wrapper);
      domConstruct.create('div', { innerHTML: 'DOWNLOAD', 'class': 'ActionButtonText' }, wrapper);
      on(wrapper, 'div:click', function (evt) {
        popup.open({
          popup: downloadTT,
          around: wrapper,
          orient: ['below']
        });
      });

      domConstruct.place(wrapper, otherFilterPanel.containerNode, 'last');
      */
      var keyword_textbox = new TextBox({
        name: 'keywordText',
        value: '',
        placeHolder: 'keyword',
        style: 'width: 300px; margin: 5px 0 5px 10px'
      });
      domConstruct.place(keyword_textbox.domNode, otherFilterPanel.containerNode, 'last');

      // lineage
      var select_lineage = new Select({
        name: 'selectLineage',
        id: 'selectLineage',
        options: [{label: 'Any', value: ''}].concat(filter_data['lineage'].map(function(c) { return {label: c, value: c}; })),
        style: 'width: 200px; margin: 5px 0'
      });
      var label_select_lineage = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Lineage: '
      });
      domConstruct.place(label_select_lineage, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_lineage.domNode, otherFilterPanel.containerNode, 'last');

      var select_sequence_features = new Select({
        name: 'selectSequenceFeatures',
        id: 'selectSequenceFeatures',
        options: [{label: 'Any', value: ''}].concat(filter_data['sequence_features'].map(function(c) { return {label: c, value: c}; })),
        style: 'width: 200px; margin: 5px 0'
      });
      var label_select_sequence_features = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Sequence Features: '
      });
      domConstruct.place(label_select_sequence_features, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_sequence_features.domNode, otherFilterPanel.containerNode, 'last');

      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      // country
      var select_country = new Select({
        name: 'selectCountry',
        id: 'selectCountry',
        options: [{label: 'Any', value:''}].concat(filter_data['country'].map(function(c) { return {label: c, value: c}; })),
        style: 'width: 100px; margin: 5px 0'
      });
      var label_select_country = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Country: '
      });
      domConstruct.place(label_select_country, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_country.domNode, otherFilterPanel.containerNode, 'last');

      // region -- need to be further filtered by country
      var select_region = new Select({
        name: 'selectRegion',
        id: 'selectRegion',
        options: [{label: 'Any', value:''}].concat(filter_data['region'].map(function(c) { return {label: c, value: c}; })),
        style: 'width: 100px; margin: 5px 0'
      });
      var label_select_region = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Region: '
      });
      domConstruct.place(label_select_region, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_region.domNode, otherFilterPanel.containerNode, 'last');

      // month -- need to be further filtered by country
      var select_month = new Select({
        name: 'selectMonth',
        id: 'selectMonth',
        options: [{label: 'Any', value:''}].concat(filter_data['month'].map(function(c) { return {label: c, value: c}; })),
        style: 'width: 100px; margin: 5px 0'
      });
      var label_select_month = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Month: '
      });
      domConstruct.place(label_select_month, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_month.domNode, otherFilterPanel.containerNode, 'last');

      // total isolate
      var select_total_isolates = new Select({
        name: 'selectTotalIsolates',
        id: 'selectTotalIsolates',
        options: [{ value: 0, label: '0'}, { value: 10, label: '10', selected: true }, { value: 100, label: '100' },
          { value: 1000, label: '1000' }],
        style: 'width: 40px; margin: 5px 0'
      });
      var label_total_isolates = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Total Isolates >= '
      });
      domConstruct.place(label_total_isolates, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_total_isolates.domNode, otherFilterPanel.containerNode, 'last');

      //  lineage_count
      var select_lineage_count = new Select({
        name: 'selectLineageCount',
        id: 'selectLineageCount',
        options: [{ value: 0, label: '0'}, { value: 5, label: '5', selected: true },
          { value: 10, label: '10' }, { value: 50, label: '50' },
          { value: 100, label: '100' }, { value: 100, label: '500' },
          { value: 1000, label: '1000' }],
        style: 'width: 40px; margin: 5px 0'
      });
      var label_lineage_count = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Lineage Count >= '
      });
      domConstruct.place(label_lineage_count, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_lineage_count.domNode, otherFilterPanel.containerNode, 'last');

      //  prevalence
      var select_prevalence = new Select({
        name: 'selectPrevalence',
        id: 'selectPrevalence',
        options: [{ value: 0, label: '0'},
          { value: 0.001, label: '0.001' }, { value: 0.001, label: '0.005' },
          { value: 0.01, label: '0.01' }, { value: 0.01, label: '0.05', selected: true },
          { value: 0.1, label: '0.1' }, { value: 0.1, label: '0.5' }],
        style: 'width: 40px; margin: 5px 0'
      });
      var label_prevalence = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Prevalence >= '
      });
      domConstruct.place(label_prevalence, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_prevalence.domNode, otherFilterPanel.containerNode, 'last');

      //  growth_rate
      var select_growth_rate = new Select({
        name: 'selectGrowthRate',
        options: [{ value: 0, label: '0'}, { value: 1, label: '1', selected: true }, { value: 2, label: '2' }, { value: 5, label: '5' },
          { value: 10, label: '10' }],
        style: 'width: 40px; margin: 5px 0'
      });
      var label_growth_rate = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Growth Rate >= '
      });
      domConstruct.place(label_growth_rate, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_growth_rate.domNode, otherFilterPanel.containerNode, 'last');

      var defaultFilterValue = {
        lineage: '',
        sequence_features: '',
        country: '',
        region: '',
        month: '',
        min_total_isolates: 10,
        min_lineage_count: 5,
        min_prevalence: 0.05,
        min_growth_rate: 0,
        keyword: ''
      };

      this.tgState = defaultFilterValue;
      var btn_submit = new Button({
        label: '&nbsp; &nbsp; Filter &nbsp; &nbsp;',
        style: 'margin-left: 10px;',
        onClick: lang.hitch(this, function () {

          var filter = {
            lineage: '',
            sequence_features: '',
            country: '',
            region: '',
            month: '',
            min_total_isolates: 0,
            min_lineage_count: 0,
            min_prevalence: 0,
            min_growth_rate: 0,
            keyword: ''
          };

          var total_isolates = parseInt(select_total_isolates.get('value'));
          if (total_isolates > 0) {
            filter.min_total_isolates = total_isolates;
          }
          var lineage_count = parseInt(select_lineage_count.get('value'));
          if (lineage_count > 0) {
            filter.min_lineage_count = lineage_count;
          }
          var prevalence = parseFloat(select_prevalence.get('value'));
          if (prevalence > 0) {
            filter.min_prevalence = prevalence;
          }
          var growth_rate = parseInt(select_growth_rate.get('value'));
          if (growth_rate > 0) {
            filter.min_growth_rate = growth_rate;
          }

          var keyword = keyword_textbox.get('value').trim();
          if (keyword) {
            filter.keyword = keyword;
          }
          var lineage = select_lineage.get('value').trim();
          if (lineage) {
            filter.lineage = lineage;
          }
          var sequence_features = select_sequence_features.get('value').trim();
          if (sequence_features) {
            filter.sequence_features = sequence_features;
          }
          var country = select_country.get('value').trim();
          if (country) {
            filter.country = country;
          }
          var region = select_region.get('value').trim();
          if (region) {
            filter.region = region;
          }
          var month = select_month.get('value').trim();
          if (month) {
            filter.month = month;
          }
          // console.log('submit btn clicked: filter', filter);

          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          Topic.publish('VariantLineage', 'updateTgState', this.tgState);
          // console.log('submit btn clicked: this.tgState', this.tgState);
        })
      });
      domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, 'last');

      var reset_submit = new Button({
        label: 'Reset Filter',
        style: 'margin-left: 10px;',
        type: 'reset',
        onClick: lang.hitch(this, function () {

          var filter = {
            lineage: '',
            country: '',
            region: '',
            month: '',
            min_total_isolates: 0,
            min_lineage_count: 0,
            min_prevalence: 0,
            min_growth_rate: 0,
            keyword: ''
          };
          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          Topic.publish('VariantLineage', 'updateTgState', this.tgState);

          keyword_textbox.reset();
          select_lineage.reset();
          select_sequence_features.reset();
          select_country.reset();
          select_region.reset();
          select_month.reset();
          select_total_isolates.reset();
          select_lineage_count.reset();
          select_prevalence.reset();
          select_growth_rate.reset();
        })
      });
      domConstruct.place(reset_submit.domNode, otherFilterPanel.containerNode, 'last');

      return otherFilterPanel;
    }
  });
});
