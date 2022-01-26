define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/topic', 'dojo/query', 'dojo/dom-style',
  'dojox/charting/Chart2D', 'dojox/charting/plot2d/Pie',
  '../DataAPI',
  './SummaryWidget', './PATRICTheme'
], function (
  declare, lang,
  domConstruct,
  Topic, domQuery, domStyle,
  Chart2D, Pie,
  DataAPI,
  SummaryWidget, Theme
) {

  var categoryName = {
    host_group: 'Host',
    isolation_country: 'Isolation Country',
    collection_year: 'Collection Year'
  };

  return declare([SummaryWidget], {
    dataModel: 'genome',
    query: '',
    baseQuery: '&limit(1)&json(nl,map)',
    columns: [{
      label: 'Metadata Category',
      field: 'category',
      renderCell: function (obj, val, node) {
        node.innerHTML = categoryName[val];
      }
    }, {
      label: '',
      field: 'value',
      renderCell: function (obj, val, node) {
        node.innerHTML = val.map(function (d) {
          return '<a href="' + d.link + '">' + d.label + ' (' + d.count + ')</a>';
        }).join('<br/>');
      }
    }],
    onSetQuery: function (attr, oldVal, query) {

      return DataAPI.query('genome',
        `${this.query}&facet((field,host_group),(field,isolation_country),(field,collection_year),(mincount,1))${this.baseQuery}`,
        {
          accept: 'application/solr+json'
        })
        .then((res) => {
          const facets = res.facet_counts.facet_fields;
          return this.processData(facets)
        })
    },
    processData: function (results) {

      this._tableData = Object.keys(results).map(function (cat) {
        var categories = [];
        var others = { count: 0 };
        var sorted = Object.entries(results[cat]).sort(([, a], [, b]) => b - a)
        sorted.forEach(function ([label, val]) {
          if (label) {
            if (categories.length < 4) {
              categories.push({
                label: label,
                count: val,
                link: `#view_tab=genomes&filter=eq(${cat},${encodeURIComponent(label)})`
              });
            }
            others.count += val;
          }
        });
        if (others.count > 0) {
          others.label = 'See all genomes with ' + categoryName[cat];
          others.link = '#view_tab=genomes&filter=eq(' + cat + ',*)';
          categories.push(others);
        }
        return { category: cat, value: categories };
      });

      var data = {};
      Object.keys(results).forEach(function (cat) {
        var categories = [];
        var others = { x: 'Others', y: 0 };
        var sorted = Object.entries(results[cat]).sort(([, a], [, b]) => b - a)
        sorted.forEach(function ([label, val]) {
          if (label) {
            if (categories.length < 4) {
              categories.push({
                text: `${label} (${val})`,
                link: `#view_tab=genomes&filter=eq(${cat},${encodeURIComponent(label)})`,
                x: label,
                y: val
              });
            } else {
              others.y += val;
            }
          }
        });
        if (others.y > 0) {
          others.text = 'Others (' + others.y + ')';
          categories.push(others);
        }

        data[cat] = categories;
      });

      this.set('data', data);
    },

    render_chart: function () {

      if (!this.DonutChart) {
        this.DonutChart = declare(Pie, {
          render: function (dim, offsets) {
            this.inherited(arguments);

            var rx = (dim.width - offsets.l - offsets.r) / 2;
            var ry = (dim.height - offsets.t - offsets.b) / 2;
            // var r = Math.min(rx, ry) / 2;
            var circle = {
              cx: offsets.l + rx,
              cy: offsets.t + ry,
              r: '20px'
            };
            var s = this.group;

            s.createCircle(circle).setFill('#fff').setStroke('#fff');
          }
        });
      }

      var onClickEventHandler = function (evt) {
        if (evt.type == 'onclick' && evt.element == 'slice') {
          // console.log(evt);
          var target = evt.run.data[evt.index].link;
          if (target) {
            var baseUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
            var url = (window.location.href).split(baseUrl)[1].replace(window.location.hash, target);
            Topic.publish('/navigate', { href: url });
          }
        }
        else if (evt.type == 'onmouseover') {
          var target = evt.run.data[evt.index].link;
          if (target && !evt.eventMask.rawNode.style.cursor) {
            // console.log(evt.eventMask.rawNode);
            evt.eventMask.rawNode.style.cursor = 'pointer';
          }
        }
      };

      if (!this.host_chart) {
        var cpHostNode = domConstruct.create('div', { 'class': 'pie-chart-widget host_group' });
        domConstruct.place(cpHostNode, this.chartNode, 'last');

        this.host_chart = new Chart2D(cpHostNode, {
          title: 'Host',
          titleGap: 30,
          titleFontColor: '#424242',
          titleFont: 'normal normal bold 12pt Tahoma',
          titlePos: 'top'
        })
          .setTheme(Theme)
          .addPlot('default', {
            type: this.DonutChart,
            radius: 70,
            labelStyle: 'columns'
          });
        this.host_chart.connectToPlot('default', onClickEventHandler);

        var cpIsolationCountry = domConstruct.create('div', { 'class': 'pie-chart-widget isolation_country' });
        domConstruct.place(cpIsolationCountry, this.chartNode, 'last');
        this.isolation_country_chart = new Chart2D(cpIsolationCountry, {
          title: 'Isolation Country',
          titleFontColor: '#424242',
          titleFont: 'normal normal bold 12pt Tahoma',
          titlePos: 'top'
        })
          .setTheme(Theme)
          .addPlot('default', {
            type: this.DonutChart,
            radius: 70,
            labelStyle: 'columns'
          });
        this.isolation_country_chart.connectToPlot('default', onClickEventHandler);

        var cpCollectionYear = domConstruct.create('div', { 'class': 'pie-chart-widget collection_year' });
        domConstruct.place(cpCollectionYear, this.chartNode, 'last');
        this.collection_year_chart = new Chart2D(cpCollectionYear, {
          title: 'Collection Year',
          titleFontColor: '#424242',
          titleFont: 'normal normal bold 12pt Tahoma',
          titlePos: 'top'
        })
          .setTheme(Theme)
          .addPlot('default', {
            type: this.DonutChart,
            radius: 70,
            labelStyle: 'columns'
          });
        this.collection_year_chart.connectToPlot('default', onClickEventHandler);

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          switch (key) {
            case 'host_group':
              this.host_chart.addSeries(key, this.data[key]);
              this.host_chart.render();
              break;
            case 'isolation_country':
              this.isolation_country_chart.addSeries(key, this.data[key]);
              this.isolation_country_chart.render();
              break;
            case 'collection_year':
              this.collection_year_chart.addSeries(key, this.data[key]);
              this.collection_year_chart.render();
              break;
            default:
              break;
          }
        }));

      } else {
        // update existing chart
        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          switch (key) {
            case 'host_group':
              this.host_chart.updateSeries(key, this.data[key]);
              this.host_chart.render();
              break;
            case 'isolation_country':
              this.isolation_country_chart.updateSeries(key, this.data[key]);
              this.isolation_country_chart.render();
              break;
            case 'collection_year':
              this.collection_year_chart.updateSeries(key, this.data[key]);
              this.collection_year_chart.render();
              break;
            default:
              break;
          }
        }));
      }

      // check data exists and hide it
      Object.keys(this.data).forEach(lang.hitch(this, function (key) {
        var target = domQuery('.pie-chart-widget.' + key)[0];
        if (this.data[key].length === 0) {
          domStyle.set(target, 'display', 'none');
        } else {
          domStyle.set(target, 'display', 'inline-block');
        }
      }));
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    }
  });
});
