define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/ContentPane', 'd3.v5/d3',
  '../WorkspaceManager'
], function (
  declare, BorderContainer, lang,
  StackContainer, ContentPane, d3,
  WorkspaceManager
) {
  return declare([BorderContainer], {

    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);

      this.tabContainer = new StackContainer({ region: 'center', id: this.id + '_TabContainer' });
      this.addChild(this.tabContainer);

      this.setupPlots();
    },

    setupPlots: function () {

      this.plotContainer = new ContentPane({
        'region': 'center'
      });

      /*
      var svg = d3.select(plotContainer.domNode).append('svg');
      svg.append('circle').attr("cx", 50).attr("cy", 50).attr("r", 40).style("fill", "blue");
      */

      this.volcanoPlot();

      this.tabContainer.addChild(this.plotContainer);
    },

    volcanoPlot: function () {
      var dataPath = '/clark.cucinell@patricbrc.org/home/DevTest/RNASeq_Test/.test_amr_workshop_haemophilus_example/727.3012_6hr_inf_vs_control.deseq2.tsv';
      WorkspaceManager.getObject(dataPath, false).then(lang.hitch(this, function (obj) {
        var data = d3.tsvParse(obj.data);
        data = data.filter(d => !isNaN(d.log2FoldChange));
        data = data.filter(d => !isNaN(d.padj));

        const width = 600;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 40, left: 40};

        const svg = d3.select(this.plotContainer.domNode).append('svg');

        const x = d3.scaleLinear().domain([d3.min(data, d => d.log2FoldChange), d3.max(data, d => d.log2FoldChange)]).range([margin.left, width - margin.right]);

        const y = d3.scaleLinear().domain([0, d3.max(data, d => -Math.log10(d.padj))]).range([height - margin.bottom, margin.top]);

        svg.append('g').attr('transform', `translate(6,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5));
        svg.append('g').attr('transform', `translate(${margin.left},6)`).call(d3.axisLeft(y).ticks(5));

        const circles = svg.selectAll('.dot').data(data);
        circles.enter().append('circle')
          .attr('class', 'dot')
          .attr('cx', d => x(d.log2FoldChange))
          .attr('cy', d => y(-Math.log10(d.padj)))
          .attr('r', 3)
          .style('fill', d => (d.padj < 0.05 && Math.abs(d.log2FoldChange) > 1) ? 'red' : 'grey');
      }));
    }
  });
});
