define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'd3.v5/d3'
], function (
  declare, lang, domConstruct, d3
) {
  return declare([], {
    constructor: function (target, id, kwArgs) {
      this.node = domConstruct.place(`<div id=${id} class='sa_chart'></div>`, target, 'only');

      const defaultConfig = {
        height: 500,
        width: 960,
        margin: {
          top: 60,
          right: 150,
          bottom: 50,
          left: 40
        }
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
    },
    render: function (data, keyLabels, keyIndexes) {
      /*
        var keyLabels = ['S1', 'D3', 'H6']
        var keyIndexes = [0, 1, 2]
        var data = [
          {n: 0.01, name: 'S1', year:'2020.09'},
          {n: 0.12, name: 'S1', year:'2020.10'},
          {n: 0.23, name: 'S1',  year:'2020.11'},
          {n: 0.4, name: 'S1',  year:'2020.12'},
          {n: 0.5, name: 'S1',  year:'2021.01'},
          {n: 0.22, name: 'D3', year:'2020.09'},
          {n: 0.21, name: 'D3', year:'2020.10'},
          {n: 0.12, name: 'D3', year:'2020.11'},
          {n: 0.2, name: 'D3',  year:'2020.12'},
          {n: 0.1, name: 'D3',  year:'2021.01'},
          {n: 0.23, name: 'H6', year:'2020.09'},
          {n: 0.53, name: 'H6', year:'2020.10'},
          {n: 0.63, name: 'H6', year:'2020.11'},
          {n: 0.23, name: 'H6', year:'2020.12'},
          {n: 0.25, name: 'H6',  year:'2021.01'},
        ];
      */
      if (data.length == 0) return;
      // console.log(data, keyLabels, keyIndexes)

      // group the data: one array for each value of the X axis.
      var sumstat = d3.nest()
        .key((d) => { return d.year; })
        .entries(data);

      var maxYvalue = sumstat.reduce((a, b) => {
        var localMax = b.values.map((el) => el.n).reduce((a, b) => a + b, 0)
        return Math.max(a, localMax)
      }, 0)
      // console.log('sumstat', sumstat, maxYvalue);

      // Stack the data: each group will be represented on top of each other
      var stackedData = d3.stack()
        .keys(keyIndexes)
        .value((d, key) => {
          return d.values[key].n
        })(sumstat)
      // console.log('statckedData', stackedData)

      let x = d3.scalePoint()
        .domain(sumstat.map((el) => el.key))
        .range([this.config.margin.left, this.config.width - this.config.margin.right - 20])

      // remove old items
      this.canvas.selectAll('g').remove();
      this.canvas.selectAll('path').remove();
      this.canvas.selectAll('rect').remove();
      this.canvas.selectAll('text.legend').remove();
      this.canvas.selectAll('text.banner').remove();

      // Add X axis
      this.canvas.append('g')
        .attr('transform', 'translate(0,' + (this.config.height - this.config.margin.bottom) + ')')
        .call(d3.axisBottom(x)
          .tickFormat(d => d3.format('.2f')(d))
          .ticks(sumstat.length))
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')

      // Add Y axis
      let y = d3.scaleLinear()
        .domain([0, maxYvalue * 1.1])
        .range([this.config.height - this.config.margin.bottom, this.config.margin.top]);
      this.canvas.append('g')
        .attr('transform', `translate(${this.config.margin.left},0)`)
        .call(d3.axisLeft(y));


      let color = d3.scaleOrdinal()
        .domain(keyLabels)
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'])

      this.canvas
        .selectAll('layers')
        .data(stackedData)
        .enter()
        .append('path')
        .style('fill', (d) => {
          var name = keyLabels[d.key];
          return color(name);
        })
        .attr('d', d3.area()
          .x((d, i) => { return x(d.data.key); })
          .y0((d) => { return y(d[0]); })
          .y1((d) => { return y(d[1]); })
        )

      this.canvas
        .on('mouseover', (d) => {
          this.tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95)

          // invert
          const xPos = d3.event.layerX
          const xDomain = x.domain()
          const xRange = x.range()
          const rangePoint = d3.range(xRange[0], xRange[1], x.step())
          const month = xDomain[d3.bisect(rangePoint, xPos)]

          // retrieve values for corresponding month
          const dataByMonth = sumstat.filter((el) => el.key == month)
          if (dataByMonth.length == 0) return
          const data = dataByMonth[0]['values']
          const coord = [`<b>Month: ${month}</b>`, '<table>', '<tr><th>Covariant</th><td>Freq</td></tr>'].concat(data.map((el) => {
            return `<tr><th>${el.name}</th><td>${el.n}</td></tr>`
          })).concat(['</table>']).join('')

          const x0 = d3.event.pageX - d3.event.layerX + this.config.margin.left
          const y0 = d3.event.pageY - d3.event.layerY + this.config.margin.top
          // console.log(x0, y0, d3.event)

          this.tooltipLayer
            .html(coord)
            .style('left', x0 + 'px' )
            .style('top', y0 + 'px' )
        })
        .on('mouseout', () => {
          this.tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0)
        })

      // legend
      var size = 15;
      var topMargin = this.config.margin.top + 20;
      this.canvas.selectAll('rect.legend')
        .data(keyLabels)
        .enter()
        .append('rect')
        .attr('class', 'legend')
        .attr('x', this.config.width - this.config.margin.right - 10)
        .attr('y', (d, i) => { return topMargin + i * (size + 5) }) // 100 is where the first dot appears. 25 is the distance between dots
        .attr('width', size)
        .attr('height', size)
        .style('fill', (d) => color(d))

      this.canvas.selectAll('text.legend')
        .data(keyLabels)
        .enter()
        .append('text')
        .attr('class', 'legend')
        .attr('x', this.config.width - this.config.margin.right - 10 + size + 2)
        .attr('y', (d, i) => { return topMargin + i * (size + 5) + (size / 2) }) // 100 is where the first dot appears. 25 is the distance between dots
        .style('fill', (d) => { return color(d) })
        .text((d) => d)
        .attr('text-anchor', 'left')
        .style('alignment-baseline', 'middle')
    },
    hide: function () {
      this.canvas.selectAll('g').remove();
      this.canvas.selectAll('path').remove();
      this.canvas.selectAll('rect').remove();
      this.canvas.selectAll('text.legend').remove();
      this.canvas.selectAll('text.banner').remove();

      this.canvas.append('text')
        .attr('class', 'banner')
        .attr('x', this.config.width / 2)
        .attr('y', 60)
        .attr('text-anchor', 'middle')
        .html('We have not enough data to render this chart')
    }
  })
})
