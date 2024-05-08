define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/request', 'dojo/dom-construct',
  'dijit/layout/ContentPane', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './VariantGrid', '../../../GridContainer'
], function (
  declare, lang, on, Topic, xhr, domConstruct,
  ContentPane, TextBox, Button, Select,
  VariantGrid, GridContainer
) {

  return declare([GridContainer], {
    gridCtor: VariantGrid,
    containerType: 'variant_data',
    facetFields: [],
    tgState: null,
    enableFilterPanel: true,
    constructor: function () {
      var self = this;
      Topic.subscribe('Variant', lang.hitch(self, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            self.tgState = value;
            break;
          default:
            break;
        }
      }));
    },
    buildQuery: function () {
      // prevent further filtering. DO NOT DELETE
    },
    _setQueryAttr: function (query) {
      // block default query handler for now.
    },
    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      var self = this;
      if (this.grid) {
        this.grid.set('state', state);
      } else {
        console.log('No Grid Yet (VariantGridContainer), this is ', self);
      }

      this._set('state', state);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._set('state', this.get('state'));
    },
    createFilterPanel: function () {

      this.containerActionBar = new ContentPane({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        className: 'BrowserHeader',
        style: 'height:85px'
      });
      this.getFilterPanel()
    },
    getFilterPanel: function () {
      var self = this;
      var q = 'keyword(*)&facet((field,country),(field,region),(field,month)(field,sequence_features),(mincount,1))&json(nl,map)&limit(1)'
      xhr.post(window.App.dataServiceURL + '/spike_variant/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {

        var dict = {}
        dict['country'] = Object.keys(res.facet_counts.facet_fields.country).sort()
        dict['region'] = Object.keys(res.facet_counts.facet_fields.region).sort()
        dict['month'] = Object.keys(res.facet_counts.facet_fields.month).sort((a, b) => b - a)
        dict['sequence_features'] = Object.keys(res.facet_counts.facet_fields.sequence_features).sort()

        self._buildFilterPanel(dict);
      })
    },
    _buildFilterPanel: function (filter_data) {
      var otherFilterPanel = this.containerActionBar;

      var keyword_textbox = new TextBox({
        name: 'keywordText',
        value: '',
        placeHolder: 'keyword',
        style: 'width: 120px; margin: 5px 0 5px 10px'
      });
      domConstruct.place(keyword_textbox.domNode, otherFilterPanel.containerNode, 'last');

      var select_sequence_features = new Select({
        name: 'selectSequenceFeatures',
        id: 'selectVoCSequenceFeatures',
        options: [{ label: '&nbsp;', value: '' }, { label: 'Any', value: '*' }].concat(filter_data['sequence_features'].map((c) => { return { label: c, value: c }; })),
        style: 'width: 100px; margin: 5px 0'
      });
      var label_select_sequence_features = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Sequence Features: '
      });
      domConstruct.place(label_select_sequence_features, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_sequence_features.domNode, otherFilterPanel.containerNode, 'last');

      // country
      var select_country = new Select({
        name: 'selectCountry',
        id: 'selectVoCCountry',
        options: [{ label: '&nbsp;', value: '' }].concat(filter_data['country'].map((c) => { return { label: c, value: c }; })),
        style: 'width: 100px; margin: 5px 0'
      });
      select_country.attr('value', 'All')
      // select_country.on("change", function() {
      //   var selected_country = this.get("value");
      //   console.warn("selected country:", selected_country);
      // })
      var label_select_country = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Country: '
      });
      domConstruct.place(label_select_country, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_country.domNode, otherFilterPanel.containerNode, 'last');

      // region -- need to be further filtered by country
      var select_region = new Select({
        name: 'selectRegion',
        id: 'selectVoCRegion',
        options: [{ label: '&nbsp;', value: '' }].concat(filter_data['region'].map((c) => { return { label: c, value: c }; })),
        style: 'width: 100px; margin: 5px 0'
      });
      select_region.attr('value', 'All')
      var label_select_region = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Region: '
      });
      domConstruct.place(label_select_region, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_region.domNode, otherFilterPanel.containerNode, 'last');

      // month -- need to be further filtered by country
      var select_month = new Select({
        name: 'selectMonth',
        id: 'selectVoCMonth',
        options: [{ label: '&nbsp;', value: '' }].concat(filter_data['month'].map((c) => {
          let label = (c == 'All') ? c : `${c.substring(0, 4)}-${c.substring(4, 6)}`
          return { label: label, value: c };
        })),
        style: 'width: 100px; margin: 5px 0'
      });
      select_month.attr('value', 'All')
      var label_select_month = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Month: '
      });
      domConstruct.place(label_select_month, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_month.domNode, otherFilterPanel.containerNode, 'last');

      domConstruct.place('<br>', otherFilterPanel.containerNode, 'last');

      // total isolate
      var select_total_isolates = new Select({
        name: 'selectTotalIsolates',
        id: 'selectVoCTotalIsolates',
        options: [{ value: 0, label: '0' }, { value: 10, label: '10' }, { value: 100, label: '100' },
          { value: 1000, label: '1000' }],
        style: 'width: 40px; margin: 5px 0'
      });
      select_total_isolates.attr('value', 10)
      var label_total_isolates = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Total Sequences >= '
      });
      domConstruct.place(label_total_isolates, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_total_isolates.domNode, otherFilterPanel.containerNode, 'last');

      //  lineage_count
      var select_lineage_count = new Select({
        name: 'selectLineageCount',
        id: 'selectVoCLineageCount',
        options: [{ value: 0, label: '0' }, { value: 5, label: '5' },
          { value: 10, label: '10' }, { value: 50, label: '50' },
          { value: 100, label: '100' }, { value: 100, label: '500' },
          { value: 1000, label: '1000' }],
        style: 'width: 40px; margin: 5px 0'
      });
      select_lineage_count.attr('value', 10)
      var label_lineage_count = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Variant Sequences >= '
      });
      domConstruct.place(label_lineage_count, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_lineage_count.domNode, otherFilterPanel.containerNode, 'last');

      //  prevalence
      var select_prevalence = new Select({
        name: 'selectPrevalence',
        id: 'selectVoCPrevalence',
        options: [{ value: 0, label: '0' },
          { value: 0.001, label: '0.001' }, { value: 0.005, label: '0.005' },
          { value: 0.01, label: '0.01' }, { value: 0.05, label: '0.05' },
          { value: 0.1, label: '0.1' }, { value: 0.5, label: '0.5' }],
        style: 'width: 40px; margin: 5px 0'
      });
      select_prevalence.attr('value', 0.005)
      var label_prevalence = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Frequency >= '
      });
      domConstruct.place(label_prevalence, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_prevalence.domNode, otherFilterPanel.containerNode, 'last');

      //  growth_rate
      var select_growth_rate = new Select({
        name: 'selectGrowthRate',
        id: 'selectVocGrowthRate',
        options: [{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 5, label: '5' },
          { value: 10, label: '10' }],
        style: 'width: 40px; margin: 5px 0'
      });
      select_growth_rate.attr('value', 1)
      var label_growth_rate = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' Growth Rate >= '
      });
      domConstruct.place(label_growth_rate, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_growth_rate.domNode, otherFilterPanel.containerNode, 'last');

      const defaultFilterValue = {
        sequence_features: '',
        country: 'All',
        region: 'All',
        month: 'All',
        min_total_isolates: 10,
        min_lineage_count: 10,
        min_prevalence: 0.005,
        min_growth_rate: 1,
        keyword: ''
      };
      this.defaultFilterValue = defaultFilterValue;

      this.tgState = lang.mixin(this.tgState, this.defaultFilterValue);
      var btn_submit = new Button({
        label: '&nbsp; &nbsp; Filter &nbsp; &nbsp;',
        style: 'margin-left: 10px;',
        onClick: lang.hitch(this, function () {

          var filter = {
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
          if (total_isolates >= 0) {
            filter.min_total_isolates = total_isolates;
          }
          var lineage_count = parseInt(select_lineage_count.get('value'));
          if (lineage_count >= 0) {
            filter.min_lineage_count = lineage_count;
          }
          var prevalence = parseFloat(select_prevalence.get('value'));
          if (prevalence >= 0) {
            filter.min_prevalence = prevalence;
          }
          var growth_rate = parseInt(select_growth_rate.get('value'));
          if (growth_rate >= 0) {
            filter.min_growth_rate = growth_rate;
          }

          var keyword = keyword_textbox.get('value').trim();
          if (keyword) {
            filter.keyword = keyword;
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

          this.tgState = lang.mixin(this.tgState, this.defaultFilterValue, filter);
          Topic.publish('Variant', 'updateTgState', this.tgState);
          // console.log('submit btn clicked: this.tgState', this.tgState);
        })
      });
      domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, 'last');

      var reset_submit = new Button({
        label: 'Reset Filter',
        style: 'margin-left: 10px;',
        type: 'reset',
        onClick: lang.hitch(this, function () {

          this.tgState = lang.mixin(this.tgState, this.defaultFilterValue);
          Topic.publish('Variant', 'updateTgState', this.tgState);

          keyword_textbox.reset();
          select_sequence_features.attr('value', this.defaultFilterValue['sequence_features']);
          select_country.attr('value', this.defaultFilterValue['country']);
          select_region.attr('value', this.defaultFilterValue['region']);
          select_month.attr('value', this.defaultFilterValue['month']);
          select_total_isolates.attr('value', this.defaultFilterValue['min_total_isolates']);
          select_lineage_count.attr('value', this.defaultFilterValue['min_lineage_count']);
          select_prevalence.attr('value', this.defaultFilterValue['min_prevalence']);
          select_growth_rate.attr('value', this.defaultFilterValue['min_growth_rate']);
        })
      });
      domConstruct.place(reset_submit.domNode, otherFilterPanel.containerNode, 'last');

      // return otherFilterPanel;
    },
    containerActions: GridContainer.prototype.containerActions.concat([
    ])
  });
});
