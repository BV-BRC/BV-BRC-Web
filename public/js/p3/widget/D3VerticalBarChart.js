define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'd3.v5/d3'
], function (
  declare, lang, domConstruct, d3
) {
  return declare([], {
    constructor: function (target, id, kwArgs) {
      this.node = domConstruct.place(`<div id=${id} class='v_bar_chart'></div>`, target, 'only');

      const defaultConfig = {
        top_n: 10,
        height: 500,
        width: 960,
        margin: {
          top: 60,
          right: 50,
          bottom: 10,
          left: 300
        },
        x_axis_scale: 'linear', // or log
        tooltip: null
      }
      this.config = lang.mixin({}, defaultConfig, kwArgs)

      this.canvas = d3.select(`#${id}`)
        .append('svg')
        .attr('width', this.config.width)
        .attr('height', this.config.height);

      // title
      if (kwArgs && kwArgs.hasOwnProperty('title')) {
        this.canvas.append('text')
          .attr('class', 'title')
          .attr('y', 24)
          .attr('x', this.config.width / 2)
          .attr('text-anchor', 'middle')
          .html(kwArgs['title']);
      }

      // tooltip
      if (d3.select('div.tooltip')[0]) {
        this.tooltipLayer = d3.select('div.tooltip')
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
      }

      this.barPadding = (this.config.height - (this.config.margin.bottom + this.config.margin.top)) / (this.config.top_n * 5);
    },
    render: function (data) {
      if (data.length == 0) return;

      const x_base_val = (this.config.x_axis_scale == 'log') ? 1 : 0;
      let x = ((this.config.x_axis_scale == 'log') ? d3.scaleLog() : d3.scaleLinear())
        .domain([x_base_val, d3.max(data, d => d.value)])
        .range([this.config.margin.left, this.config.width - this.config.margin.right - 65]);

      let y = d3.scaleLinear()
        .domain([this.config.top_n, 0])
        .range([this.config.height - this.config.margin.bottom, this.config.margin.top]);

      let xAxis = d3.axisTop()
        .scale(x)
        .ticks((this.config.x_axis_scale == 'log') ? 2 : (this.config.width > 500) ? 5 : 2)
        .tickSize(-(this.config.height - this.config.margin.top - this.config.margin.bottom))
        .tickFormat(d => d3.format(',')(d));

      this.canvas.selectAll('g.axis').remove();
      this.canvas.selectAll('rect.bar').remove();
      this.canvas.selectAll('text.value').remove();
      this.canvas.selectAll('text.label').remove();

      this.canvas.append('g')
        .attr('class', 'axis xAxis')
        .attr('transform', `translate(0, ${this.config.margin.top})`)
        .call(xAxis)
        .selectAll('.tick line')
        .classed('origin', d => d == 0)

      this.canvas.selectAll('rect.bar')
        .data(data, d => d.name)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', x(x_base_val) + 1)
        .attr('width', d => x(d.value) - x(x_base_val) - 1)
        .attr('y', d => y(d.rank) + 5)
        .attr('height', y(1) - y(0) - this.barPadding)
        .style('fill', '#1f77b4')

      // add tooltip when tooltip function is defined
      if (this.config.tooltip) {
        this.canvas.selectAll('rect.bar')
          .on('mouseover', (d) => {
            this.tooltipLayer.transition()
              .duration(200)
              .style('opacity', 0.95)

            this.tooltipLayer
              .html(this.config.tooltip(d))
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY + 'px')
          })
          .on('mouseout', () => {
            this.tooltipLayer.transition()
              .duration(500)
              .style('opacity', 0)
          })
      }

      this.canvas.selectAll('text.value')
        .data(data, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'value')
        .attr('x', d => x(d.value) + 5)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .style('text-anchor', 'start')
        .text(d => d.value);

      this.canvas.selectAll('text.label')
        .data(data, d => d.label)
        .enter()
        .append('text')
        .attr('class', 'label')
        .style('text-anchor', 'end')
        .attr('x', this.config.margin.left - 5)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .text(d => d.label)
    }
  })
})
