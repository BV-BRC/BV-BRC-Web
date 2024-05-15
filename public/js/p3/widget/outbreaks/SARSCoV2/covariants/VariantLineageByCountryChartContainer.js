define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/dom-construct', 'dojo/when', 'dojo/request',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/Select',
  '../../../D3VerticalBarChart', '../../../D3StackedAreaChart'
], function (
  declare, lang, Deferred,
  domConstruct, when, xhr,
  BorderContainer, ContentPane, Select,
  VBarChart, StackedAreaChart
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
      when(this.processLineChartData(state), lang.hitch(this, function (result) {

        const rawData = result['rawData']
        const yearRange = new Set(rawData.map((el) => el.year))
        const grouped = {}
        rawData.forEach((el) => {
          if (grouped.hasOwnProperty(el.name)) {
            grouped[el.name].push(el)
          } else {
            grouped[el.name] = [el]
          }
        })
        Object.entries(grouped).forEach(([key, values]) => {
          if (values.length == yearRange.size) {
            // pass
          } else {
            const years = new Set( yearRange )
            values.forEach((el) => {
              years.delete(el.year)
            })
            years.forEach((el) => {
              // impute for the missing data point.
              rawData.push({ name: key, n: 0, year: el })
            })
          }
        })
        rawData.sort((a, b) => {
          if (a.name === b.name) {
            if (a.year > b.year) {
              return 1
            } else {
              return -1
            }
          } else if (a.name > b.name) {
            return 1
          } else {
            return -1
          }
        })
        // console.log(rawData)
        if (rawData.length > 8) {
          this.line_chart.render(rawData, result['keyLabels'], result['keyIndexes']);
        } else {
          this.line_chart.hide();
        }
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

      this.vbar_chart = new VBarChart(this.bc_viewer.domNode, 'variant_lineage_country_barchart', {
        top_n: 20,
        title: 'Covariant Frequencies',
        width: 700,
        tooltip: function (d) {
          return `Covariant: ${d.label}<br/>Total Sequences: ${d.total_isolates}<br/>Covariant Sequences: ${d.lineage_count}<br/>Frequency: ${d.value}`
        }
      });

      this.line_chart = new StackedAreaChart(this.lc_viewer.domNode, 'variant_lineage_country_linechart', {
        title: 'Covariant Frequencies by Month',
        width: 800
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

      xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
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
        select_country.attr('value', 'USA')

        select_country.on('change', lang.hitch(this, function (value) {
          if (value == '') return;
          this.set('state', lang.mixin(this.state, {
            search: 'eq(country,' + encodeURIComponent( `"${value}"` ) + ')'
          }))
        }))
        var label_select_country = domConstruct.create('label', {
          style: 'margin-left: 10px;',
          innerHTML: 'Country: '
        });
        domConstruct.place(label_select_country, filterPanel.containerNode, 'last');
        domConstruct.place(select_country.domNode, filterPanel.containerNode, 'last');
      }))
    },

    postCreate: function () {
      this.inherited(arguments);
    },

    processBarChartData: function (state) {
      return xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
        data: state.search + '&ne(lineage,D614G)&eq(region,All)&eq(month,All)&select(lineage,prevalence,lineage_count,total_isolates)&sort(-prevalence)&limit(20)',
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then((data) => {

        return data.map((el, i) => {
          el.label = el.lineage;
          el.value = el.prevalence;
          el.rank = i;

          delete el.lineage;
          delete el.prevalence;

          return el;
        })
      })
    },

    processLineChartData: function (state) {
      const def = new Deferred();

      xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
        data: state.search + '&ne(month,All)&eq(month,*)&facet((field,month),(mincount,1))&limit(1)&json(nl,map)',
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then((res1) => {
        // console.log(res1)
        if (res1.response.numFound == 0) {
          def.resolve({
            'keyLabels': [],
            'keyIndexes': [],
            'rawData': []
          })
          return;
        }

        const latest_months = Object.keys(res1.facet_counts.facet_fields.month).sort((a, b) => b - a).slice(0, 3).join(',')

        xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
          data: state.search + `&ne(lineage,D614G)&eq(region,All)&in(month,(${latest_months}))&sort(-prevalence)&select(lineage,prevalence)&limit(100)`,
          headers: {
            accept: 'application/json',
            'content-type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json'
        }).then((res2) => {
          if (res2.length == 0) {
            def.resolve({
              'keyLabels': [],
              'keyIndexes': [],
              'rawData': []
            })

            return;
          }
          // console.log(res2)
          const reduced = res2.reduce((a, b) => {
            if (a.indexOf(b.lineage) < 0) {
              a.push(b.lineage)
            }
            return a
          }, [])
          const keyLabels = reduced.slice(0, 10);
          const subq = '&in(lineage,(' + keyLabels.map((el) => encodeURIComponent(`"${el}"`)).join(',') + '))'

          xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
            data: state.search + subq + '&ne(lineage,D614G)&eq(region,All)&ne(month,All)&eq(month,*)&select(lineage,prevalence,month)&limit(25000)',
            headers: {
              accept: 'application/json',
              'content-type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then((data) => {
            // console.log(data)
            var rawData = data.map((el) => {
              el.name = el.lineage;
              el.n = el.prevalence;
              el.year = `${el.month.substring(0, 4)}.${el.month.substring(4, 6)}`;

              delete el.lineage;
              delete el.month;
              delete el.prevalence;
              delete el.lineage_count

              return el;
            })

            const result = {
              'keyLabels': keyLabels.sort(),
              'keyIndexes': Object.keys(keyLabels).map((el) => parseInt(el)),
              'rawData': rawData
            }
            def.resolve(result)
          })
        })
      })
      return def.promise;
    }
  });
});
