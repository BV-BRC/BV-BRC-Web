define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/dom-construct', 'dojo/when', 'dojo/request',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/Select',
  '../../../D3VerticalBarChart', '../../../D3BarLineChart'
], function (
  declare, lang, Deferred,
  domConstruct, when, xhr,
  BorderContainer, ContentPane, Select,
  VBarChart, D3BarLineChart
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
      if (!state || !state.search) {
        return;
      }

      // update bar chart
      when(this.processBarChartData(state), lang.hitch(this, function (data) {
        if (data) {
          this.vbar_chart.render(data)
        }
      }));

      // update line chart
      when(this.processTimeChartData(state), lang.hitch(this, function (data) {
        // console.log(data)
        this.line_chart.render(data)
      }))
    },

    startup: function () {
      if (this._started) { return; }

      this._buildFilterPanel()

      this.bc_viewer = new ContentPane({
        region: 'left'
      });
      this.lc_viewer = new ContentPane({
        region: 'right'
      })

      this.addChild(this.bc_viewer);
      this.addChild(this.lc_viewer);

      this.vbar_chart = new VBarChart(this.bc_viewer.domNode, 'variant_lineage_vbarchart', {
        top_n: 20,
        title: 'Variant Sequences by Country',
        width: 700,
        margin: {
          top: 60,
          right: 50,
          bottom: 10,
          left: 130
        },
        x_axis_scale: 'log',
        tooltip: function (d) {
          return `Country: ${d.label}<br/>Count: ${d.value}`
        }
      });

      this.line_chart = new D3BarLineChart(this.lc_viewer.domNode, 'variant_lineage_dualchart', {
        title: 'Variant Sequences by Month',
        width: 800,
        tooltip: function (d) {
          return `Month: ${d.year}<br/>Variant Sequences: ${d.bar_count}<br/>Frequency: ${d.line_count}`
        },
        bar_axis_title: 'Variant Sequences (Bar)',
        line_axis_title: 'Frequency (Line)'
      });

      this.inherited(arguments);
      this._started = true;
    },
    _buildFilterPanel: function () {

      this.filterPanel = new ContentPane({
        region: 'top',
        style: 'height: 20px;text-align:center'
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

        var select_variant = new Select({
          name: 'selectVariant',
          options: [{ label: '&nbsp;', value: '' }].concat(list.map((c) => { return { label: c, value: c }; })),
          style: 'width: 100px; margin: 5px 0'
        });
        select_variant.attr('value', 'D614G')

        select_variant.on('change', lang.hitch(this, function (value) {
          if (value == '') return;
          this.set('state', lang.mixin(this.state, {
            search: 'eq(aa_variant,' + encodeURIComponent( `"${value}"` ) + ')'
          }))
        }))
        var label_select_variant = domConstruct.create('label', {
          style: 'margin-left: 10px;',
          innerHTML: 'Variant: '
        });
        domConstruct.place(label_select_variant, filterPanel.containerNode, 'last');
        domConstruct.place(select_variant.domNode, filterPanel.containerNode, 'last');
      }))
    },

    postCreate: function () {
      this.inherited(arguments);
    },

    processBarChartData: function (state) {
      return xhr.post(window.App.dataServiceURL + '/spike_variant/', {
        data: state.search + '&ne(country,All)&eq(region,All)&eq(month,All)&select(country,lineage_count)&sort(-lineage_count)&limit(20)',
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then((data) => {

        return data.map((el, i) => {
          el.label = el.country;
          el.value = el.lineage_count;
          el.rank = i;

          delete el.country;
          delete el.lineage_count;

          return el;
        })
      })
    },

    processTimeChartData: function (state) {

      return xhr.post(window.App.dataServiceURL + '/spike_variant/', {
        data: state.search + '&eq(country,All)&eq(region,All)&eq(month,*)&ne(month,All)&select(month,lineage_count,prevalence)&limit(100)',
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then((data) => {

        return data.map((el) => {
          el.bar_count = el.lineage_count;
          el.line_count = el.prevalence;
          el.year = `${el.month.substring(0, 4)}.${el.month.substring(4, 6)}`;

          delete el.month;
          delete el.lineage_count
          delete el.prevalence

          return el;
        })
      })
    }
  });
});
