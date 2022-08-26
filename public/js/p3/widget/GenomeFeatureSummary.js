define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', './SummaryWidget',
  'dojo/request', 'dojo/_base/lang', 'dojox/charting/Chart2D', './PATRICTheme', 'dojox/charting/action2d/MoveSlice',
  'dojox/charting/action2d/Tooltip', 'dojo/dom-construct', '../util/PathJoin', 'dojo/fx/easing'

], function (
  declare, WidgetBase, on,
  domClass, SummaryWidget,
  xhr, lang, Chart2D, Theme, MoveSlice,
  ChartTooltip, domConstruct, PathJoin, easing
) {
  var LOG10 = Math.log(10);

  return declare([SummaryWidget], {
    dataModel: 'genome_feature',
    query: '',
    view: 'table',
    baseQuery: '&limit(1)&in(annotation,(PATRIC,RefSeq))&ne(feature_type,source)&facet((pivot,(annotation,feature_type)),(mincount,0))',
    columns: [{
      label: ' ',
      field: 'feature_type'
    }, {
      label: 'BV-BRC',
      field: 'PATRIC',
      renderCell: function (obj, val, node) {
        node.innerHTML = obj.PATRIC ? ('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,PATRIC))">' + obj.PATRIC + '</a>') : '0';
      }
    }, {
      label: 'GenBank / RefSeq',
      field: 'RefSeq',
      renderCell: function (obj, val, node) {
        node.innerHTML = obj.RefSeq ? ('<a href="#view_tab=features&filter=and(eq(feature_type,' + obj.feature_type + '),eq(annotation,RefSeq))">' + obj.RefSeq + '</a>') : '0';
      }
    }],
    processData: function (data) {
      if (!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['annotation,feature_type']) {
        console.log('INVALID SUMMARY DATA', data);
        return;
      }
      data = data.facet_counts.facet_pivot['annotation,feature_type'];
      var gfData = {};
      this._chartLabels = [];
      var byFeature = {};

      var values = {};

      data.forEach(function (summary) {
        summary.pivot.forEach(function (pv, idx) {
          values[pv.value] = true;
          byFeature[pv.value] = { feature_type: pv.value };
        });
      });

      var values = Object.keys(values);

      values.forEach(function (val, idx) {
        this._chartLabels.push({ text: val, value: idx + 1 });
      }, this);

      data.forEach(function (summary) {
        if (!gfData[summary.value]) {
          gfData[summary.value] = [];
        }

        values.forEach(function (val, idx) {
          if (!summary.pivot.some(function (pv) {
            if (pv.value == val) {
              gfData[summary.value].push({
                text: pv.value,
                x: idx,
                y: Math.log(pv.count) / LOG10,
                count: pv.count,
                annotation: summary.value
              });
              byFeature[pv.value][summary.value] = pv.count;
              return true;
            }
            return false;
          })) {
            gfData[summary.value].push({
              text: val, y: 0, x: idx, annotation: summary.value
            });
          }
        });
      });

      this._tableData = Object.keys(byFeature).map(function (f) {
        return byFeature[f];
      });

      this.set('data', gfData);
    },

    render_chart: function () {

      if (!this.chart) {
        this.chart = new Chart2D(this.chartNode)
          .setTheme(Theme)
          .addPlot('default', {
            type: 'ClusteredColumns',
            markers: true,
            gap: 3,
            animate: { duration: 1000, easing: easing.linear }
          })
          .addAxis('x', {
            majorLabels: false,
            minorTicks: false,
            minorLabels: false,
            microTicks: false,
            labels: this._chartLabels
          })
          .addAxis('y', {
            title: 'Feature Count',
            vertical: true,
            majorLabels: true,
            minorTicks: true,
            minorLabels: true,
            microTicks: true,
            natural: true,
            includeZero: true,
            labels: [
              { value: 0, text: '1' },
              { value: 1, text: '10' },
              { value: 2, text: '100' },
              { value: 3, text: '1000' },
              { value: 4, text: '10^4' },
              { value: 5, text: '10^5' },
              { value: 6, text: '10^6' },
              { value: 7, text: '10^7' },
              { value: 8, text: '10^8' },
              { value: 9, text: '10^9' }
            ]
          });

        new ChartTooltip(this.chart, 'default', {
          text: function (o) {
            var d = o.run.data[o.index];
            return '[' + d.annotation + '] ' + d.text + 's (' + d.count + ')';
          }
        });

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          this.chart.addSeries(key, this.data[key]);
        }));

        this.chart.render();
      } else {

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          this.chart.updateSeries(key, this.data[key]);
        }));
        this.chart.render();

      }
    },

    render_table: function () {
      this.inherited(arguments);
      // console.log("RenderArray: ", this._tableData);
      this.grid.refresh();
      this.grid.renderArray(this._tableData);
      this.grid.sort([{ attribute: 'PATRIC', descending: true }]);
    }
  });
});
