define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/on', 'dojo/request', 'dojo/topic',
  'dojox/charting/Chart2D', './PATRICTheme', 'dojox/charting/plot2d/Pie',
  './SummaryWidget'

], function (
  declare, lang,
  domClass, domConstruct, on, xhr, Topic,
  Chart2D, Theme, Pie,
  SummaryWidget
) {

  return declare([SummaryWidget], {
    dataModel: 'genome',
    query: '',
    view: 'table',
    baseQuery: '&eq(reference_genome,*)&select(reference_genome,genome_name,genome_id)&limit(25000)&facet((field,reference_genome),(mincount,1))&json(nl,map)',
    columns: [
      { label: 'Type', field: 'reference_genome' },
      {
        label: 'Genome Name',
        field: 'genome_name',
        renderCell: function (obj, val, node) {
          node.innerHTML = '<a href="/view/Genome/' + obj.genome_id + '" target=_blank">' + val + '</a>';
        }
      }
    ],
    processData: function (res) {

      if (!res || !res.facet_counts || !res.facet_counts.facet_fields || !res.facet_counts.facet_fields.reference_genome) {
        console.error('INVALID SUMMARY DATA');
        return;
      }

      this._tableData = res.response.docs;
      var d = res.facet_counts.facet_fields.reference_genome; // now key-value pair

      var data = [];
      Object.keys(d).forEach(function (key) {
        data.push({
          text: key + ' (' + d[key] + ')',
          x: key,
          y: d[key],
          link: '#view_tab=genomes&filter=eq(reference_genome,' + encodeURIComponent(key) + ')'
        });
      });

      this.set('data', data);
    },

    render_chart: function () {

      if (!this.chart) {

        this.DonutChart = declare(Pie, {
          render: function (dim, offsets) {
            this.inherited(arguments);

            var rx = (dim.width - offsets.l - offsets.r) / 2;
            var ry = (dim.height - offsets.t - offsets.b) / 2;
            // var r = Math.min(rx, ry) / 2;
            var circle = {
              cx: offsets.l + rx,
              cy: offsets.t + ry,
              r: '30px'
            };
            var s = this.group;

            s.createCircle(circle).setFill('#fff').setStroke('#fff');
          }
        });

        var onClickEventHandler = function (evt) {
          if (evt.type == 'onclick' && evt.element == 'slice') {
            // console.log(evt);
            var target = evt.run.data[evt.index].link;
            if (target) {
              Topic.publish('/navigate', { href: window.location.pathname + target });
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

        this.chart = new Chart2D(this.chartNode)
          .setTheme(Theme)
          .addPlot('default', {
            type: this.DonutChart,
            radius: 70,
            label: true,
            labelStyle: 'columns'
          });

        this.chart.connectToPlot('default', onClickEventHandler);

        this.chart.addSeries('x', this.data);
        this.chart.render();
      } else {

        this.chart.updateSeries('x', this.data);
        this.chart.render();
      }
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
      this.grid.sort([{ attribute: 'reference_genome' }]);
    }
  });
});
