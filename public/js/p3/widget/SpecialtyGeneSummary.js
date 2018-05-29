define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/on', 'dojo/request',
  'dojo/fx/easing',
  'dijit/_WidgetBase',
  'dojox/charting/Chart2D', './PATRICTheme', 'dojox/charting/action2d/MoveSlice', 'dojox/charting/action2d/Tooltip',
  'dojox/charting/plot2d/Bars', './SummaryWidget'

], function (
  declare, lang,
  domClass, domConstruct, on, xhr,
  easing,
  WidgetBase,
  Chart2D, Theme, MoveSlice, ChartTooltip,
  Bars, SummaryWidget
) {

  return declare([SummaryWidget], {
    dataModel: 'sp_gene',
    query: '',
    view: 'table',
    baseQuery: '&limit(1)&facet((field,property_source),(mincount,1))&json(nl,map)',
    columns: [
      { label: ' ', field: 'category' },
      { label: 'Source', field: 'source_x' },
      {
        label: 'Genes',
        field: 'y',
        renderCell: function (obj, val, node) {
          node.innerHTML = '<a href="#view_tab=specialtyGenes&filter=and(eq(property,' + encodeURIComponent('"' + obj.category + '"') + '),eq(source,' + encodeURIComponent('"' + obj.source_x + '"') + '))" target="_blank">' + val + '</a>';
        }
      }
    ],
    processData: function (res) {
      var chartLabels = this._chartLabels = [];

      if (!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.property_source) {
        console.error('INVALID SUMMARY DATA');
        return;
      }
      var d = res.facet_counts.facet_fields.property_source; // now key-value pair

      var data = this._tableData = [];
      Object.keys(d).forEach(function (key, idx) {
        chartLabels.push({ text: key, value: idx + 1 });
        var val = key.split(': ');
        var cat = val[0];
        var source = val[1];

        data.push({
          category: cat, source_x: source, y: d[key], property_source: key
        });
      });

      this.set('data', data);
    },

    render_chart: function () {

      if (!this.chart) {
        this.chart = new Chart2D(this.chartNode)
          .setTheme(Theme)
          .addPlot('default', {
            type: Bars,
            markers: true,
            gap: 3,
            animate: { duration: 1000, easing: easing.linear }
          })
          .addAxis('x', {
            vertical: true,
            majorLabels: true,
            minorTicks: false,
            minorLabels: false,
            microTicks: false,
            labels: this._chartLabels
          })
          .addAxis('y', {
            minorTicks: false
          })
          .addSeries('source', this.data);

        new ChartTooltip(this.chart, 'default', {
          text: function (o) {
            var d = o.run.data[o.index];
            return d.property_source + ' (' + d.y + ')';
          }
        });

        this.chart.render();
      } else {

        this.chart.updateSeries('source', this.data);
        this.chart.render();
      }
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
      this.grid.sort([{ attribute: 'category', descending: true }]);
    }
  });
});
