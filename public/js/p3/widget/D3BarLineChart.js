define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'd3.v5/d3'
], function (
  declare, lang, domConstruct, d3
) {
  return declare([], {
    constructor: function (target, id, kwArgs) {
      this.node = domConstruct.place(`<div id=${id} class='bl_chart'></div>`, target, 'only');

      const defaultConfig = {
        height: 500,
        width: 960,
        margin: {
          top: 60,
          right: 80,
          bottom: 50,
          left: 80
        },
        tooltip: null,
        bar_axis_title: '',
        line_axis_title: ''
      }
      this.config = lang.mixin({}, defaultConfig, kwArgs)

      this.canvas = d3.select(`#${id}`)
        .append('svg')
        .attr('width', this.config.width)
        .attr('height', this.config.height)

      // title
      if (kwArgs && kwArgs.hasOwnProperty('title')) {
        this.canvas.append('text')
          .attr('class', 'title')
          .attr('y', 24)
          .attr('x', this.config.width / 2)
          .attr('text-anchor', 'middle')
          .html(kwArgs['title'])
      }
      // tooltip
      if (d3.select('div.tooltip')[0]) {
        this.tooltipLayer = d3.select('div.tooltip')
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
      }
      // y_bar axis label
      this.canvas.append('text')
        .attr('class', 'y1Axis')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0)
        .attr('x', 0 - (this.config.height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text(this.config.bar_axis_title)

      this.canvas.append('text')
        .attr('class', 'y2Axis')
        .attr('transform', 'rotate(-90)')
        .attr('y', this.config.width - this.config.margin.right + 55)
        .attr('x', 0 - (this.config.height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text(this.config.line_axis_title)
    },
    render: function (data) {
      if (data.length == 0) return;

      // cleanup
      this.canvas.selectAll('g').remove();
      this.canvas.selectAll('rect.bar').remove();
      this.canvas.selectAll('path').remove();

      // add X axis
      let x = d3.scaleBand()
        .domain(data.map((el) => el.year))
        .range([this.config.margin.left, this.config.width - this.config.margin.right])
        .padding(0.2)
      this.canvas.append('g')
        .attr('class', 'xAxis')
        .attr('transform', 'translate(0,' + (this.config.height - this.config.margin.bottom) + ')')
        .call(d3.axisBottom(x)
          .tickFormat(d => d3.format('.2f')(d))
          .ticks(data.length))
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')

      // Add Y axis - bar
      let y_bar = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.bar_count)])
        .range([this.config.height - this.config.margin.bottom, this.config.margin.top]);
      this.canvas.append('g')
        .attr('transform', `translate(${this.config.margin.left},0)`)
        .call(d3.axisLeft(y_bar));

      // Add Y axis - line
      let y_line = d3.scaleLinear()
        .domain([0, d3.max(data, (d) => d.line_count)])
        .range([this.config.height - this.config.margin.bottom, this.config.margin.top]);
      this.canvas.append('g')
        .attr('transform', `translate(${this.config.width - this.config.margin.right},0)`)
        .call(d3.axisRight(y_line));

      // bars
      this.canvas.selectAll('rect.bar')
        .data(data, d => d.year)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.year))
        .attr('width', x.bandwidth())
        .attr('y', d => y_bar(d.bar_count))
        .attr('height', d => y_bar(0) - y_bar(d.bar_count))
        .style('fill', '#1f77b4')

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

      // line
      this.canvas
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', '#ff7f0e')
        .attr('stroke-miterlimit', 1)
        .attr('stroke-width', 3)
        .attr('d', d3.line()
          .x(d => x(d.year) + x.bandwidth() / 2)
          .y(d => y_line(d.line_count))(data)
        )
    }
  })
})
