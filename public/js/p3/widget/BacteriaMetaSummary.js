define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/promise/all', 'dojo/when', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/request',
  'dojo/topic', 'dojo/query', 'dojo/dom-style',
  'dijit/_WidgetBase', 'dijit/layout/ContentPane',
  'dojox/charting/Chart2D', 'dojox/charting/action2d/MoveSlice', 'dojox/charting/plot2d/Pie',
  'dojox/charting/action2d/Tooltip', 'dojo/fx/easing',
  '../util/PathJoin', './SummaryWidget', './PATRICTheme',
], function (
  declare, lang,
  on, All, when, domClass, domConstruct, xhr,
  Topic, domQuery, domStyle,
  WidgetBase, ContentPane,
  Chart2D, MoveSlice, Pie,
  ChartTooltip, easing,
  PathJoin, SummaryWidget, Theme,
) {

  var categoryName = {
    genus: 'Genus',
    host_group: 'Host Group',
    isolation_country: 'Isolation Country',
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

      var url = PathJoin(this.apiServiceUrl, this.dataModel) + '/';

      var defMetadata = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&facet((field,genus),(field,host_group),(field,isolation_country),(mincount,1))' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields;
      });

      return when(All([defMetadata]), lang.hitch(this, 'processData'));
    },
    processData: function (results) {

      this._tableData = Object.keys(results[0]).map(function (cat) {
        var categories = [];
        var others = { count: 0 };
        Object.keys(results[0][cat]).forEach(function (d) {
          if (d) {
            if (categories.length < 4) {
              categories.push({
                label: d,
                count: results[0][cat][d],
                link: '#view_tab=genomes&filter=eq(' + cat + ',' + encodeURIComponent(d) + ')'
              });
            }
            others.count += results[0][cat][d];
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
      Object.keys(results[0]).forEach(function (cat) {
        var m = results[0][cat];
        var categories = [];
        var others = { x: 'Others', y: 0 };
        Object.keys(m).forEach(function (val) {
          if (val) {
            if (categories.length < 4) {
              categories.push({
                text: val + ' (' + m[val] + ')',
                link: '#view_tab=genomes&filter=eq(' + cat + ',' + encodeURIComponent(val) + ')',
                x: val,
                y: m[val]
              });
            } else {
              others.y += m[val];
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
        var cpBacteriaGenus = domConstruct.create('div', { 'class': 'pie-chart-widget genus' });
        domConstruct.place(cpBacteriaGenus, this.chartNode, 'last');
        this.bacteria_genus_chart = new Chart2D(cpBacteriaGenus, {
          title: 'Genus',
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
        // new MoveSlice(this.bacteria_genus_chart, "default");
        this.bacteria_genus_chart.connectToPlot('default', onClickEventHandler);

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
        // new MoveSlice(this.host_chart, "default");
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
        // new MoveSlice(this.isolation_country_chart, "default");
        this.isolation_country_chart.connectToPlot('default', onClickEventHandler);

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          switch (key) {
            case 'genus':
              this.bacteria_genus_chart.addSeries(key, this.data[key]);
              this.bacteria_genus_chart.render();
              break;
            case 'host_group':
              this.host_chart.addSeries(key, this.data[key]);
              this.host_chart.render();
              break;
            case 'isolation_country':
              this.isolation_country_chart.addSeries(key, this.data[key]);
              this.isolation_country_chart.render();
              break;
            default:
              break;
          }
        }));

      } else {

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          switch (key) {
            case 'genus':
              this.bacteria_genus_chart.addSeries(key, this.data[key]);
              this.bacteria_genus_chart.render();
              break;
            case 'host_group':
              this.host_chart.updateSeries(key, this.data[key]);
              this.host_chart.render();
              break;
            case 'isolation_country':
              this.isolation_country_chart.updateSeries(key, this.data[key]);
              this.isolation_country_chart.render();
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
