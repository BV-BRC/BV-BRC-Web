define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct',
  'dojo/when', 'dojo/request',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/Select',
  './D3BarChartRace', '../store/VariantChartMemoryStore'
], function (
  declare, lang, domConstruct,
  when, xhr,
  BorderContainer, ContentPane, Select,
  D3BarChartRace, Store
) {

  return declare([BorderContainer], {
    gutters: false,
    state: null,
    apiServer: window.App.dataServiceURL,
    visible: true,
    constructor: function () {
    },

    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state.search) {
        return;
      }

      // console.log("In VariantLineageChartContainer _setStateAttr: state", state);
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
      } else {
        this.store.set('state', state);
      }

      when(this.processData(), lang.hitch(this, function (chartData) {
        if (chartData) {
          this.barchart_r.setPeriod(parseInt(this.startMonth) / 100, parseInt(this.endMonth) / 100);
          this.barchart_r.render(chartData)
        } else {
          console.log('pass drawing since no data')
        }
      }));
    },

    startup: function () {
      if (this._started) { return; }

      if (this.state.groupBy == 'country') {
        this._buildFilterPanelByCountry()
      } else if (this.state.groupBy == 'lineage') {
        this._buildFilterPanelByLineage()
      } else {
        return;
      }

      this.viewer = new ContentPane({
        region: 'center'
      });

      this.addChild(this.viewer);

      this.barchart_r = new D3BarChartRace();
      this.barchart_r.init(this.viewer.domNode, `variant_chart_${this.state.groupBy}`)

      this.inherited(arguments);
      this._started = true;
    },
    _buildFilterPanelByLineage: function () {
      this.filterPanel = new ContentPane({
        region: 'top',
        style: 'height: 20px'
      })
      this.addChild(this.filterPanel)

      xhr.post(window.App.dataServiceURL + '/spike_variant/', {
        data: 'ne(country,All)&facet((field,aa_variant),(mincount,1))&json(nl,map)&limit(1)',
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (res) {

        var list = Object.keys(res.facet_counts.facet_fields.aa_variant).sort();

        var filterPanel = this.filterPanel;

        var select_lineage = new Select({
          name: 'selectLineage',
          options: [{ label: '&nbsp;', value: '' }].concat(list.map((c) => { return { label: c, value: c }; })),
          style: 'width: 100px; margin: 5px 0'
        });
        // select_lineage.attr('value', 'D614G');
        select_lineage.on('change', lang.hitch(this, function (value) {
          if (value == '') return;
          this.set('state', lang.mixin(this.state, {
            search: 'eq(aa_variant,' + encodeURIComponent( `"${value}"` ) + ')'
          }))
        }))
        var label_select_lineage = domConstruct.create('label', {
          style: 'margin-left: 10px;',
          innerHTML: 'Please select an AA variant: '
        });
        domConstruct.place(label_select_lineage, filterPanel.containerNode, 'last');
        domConstruct.place(select_lineage.domNode, filterPanel.containerNode, 'last');
      }))
    },
    _buildFilterPanelByCountry: function () {

      this.filterPanel = new ContentPane({
        region: 'top',
        style: 'height: 20px'
      })
      this.addChild(this.filterPanel)

      xhr.post(window.App.dataServiceURL + '/spike_variant/', {
        data: 'ne(country,All)&facet((field,country),(mincount,1))&json(nl,map)&limit(1)',
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (res) {

        var list = Object.keys(res.facet_counts.facet_fields.country).sort();

        var filterPanel = this.filterPanel;

        var select_country = new Select({
          name: 'selectCountry',
          options: [{ label: '&nbsp;', value: '' }].concat(list.map((c) => { return { label: c, value: c }; })),
          style: 'width: 100px; margin: 5px 0'
        });
        // select_country.attr('value', 'USA');
        select_country.on('change', lang.hitch(this, function (value) {
          if (value == '') return;
          this.set('state', lang.mixin(this.state, {
            search: 'eq(country,' + encodeURIComponent( `"${value}"` ) + ')'
          }))
        }))
        var label_select_country = domConstruct.create('label', {
          style: 'margin-left: 10px;',
          innerHTML: 'Please select a country: '
        });
        domConstruct.place(label_select_country, filterPanel.containerNode, 'last');
        domConstruct.place(select_country.domNode, filterPanel.containerNode, 'last');
      }))
    },

    postCreate: function () {
      this.inherited(arguments);
    },

    createStore: function (server, token, state) {
      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: this.state || state
      });

      return store;
    },

    processData: function () {
      return when(this.store.query({}), lang.hitch(this, function (data) {

        var startMonth, endMonth;
        data.forEach(function (el) {
          if (!startMonth) {
            startMonth = el.month
          } else if (startMonth > el.month) {
            startMonth = el.month;
          }
          if (!endMonth) {
            endMonth = el.month;
          } else if (endMonth < el.month) {
            endMonth = el.month;
          }
        })
        this.startMonth = startMonth;
        this.endMonth = endMonth;
        var groupBy = this.state.groupBy;

        return data.map(function (el) {
          el.year = parseInt(el.month) / 100;
          el.value = el.prevalence;
          el.lastValue = el.prevalence;
          el.name = (groupBy == 'country') ? el.aa_variant : el.country;

          delete el.id;
          delete el.prevalence;
          delete el.country;
          delete el.aa_variant;
          delete el.month;
          return el;
        })
      }))
    }
  });
});
