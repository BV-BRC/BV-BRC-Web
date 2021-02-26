define([
  'dojo/_base/declare', 'dojo/dom-construct', 'd3.v5/d3'
], function (
  declare, domConstruct, d3
) {
  return declare([], {
    init: function (target, id) {
      // https://bl.ocks.org/jrzief/70f1f8a5d066a286da3a1e699823470f
      this.node = domConstruct.place(`<div id=${id} class='bar_chart_r'></div>`, target, 'only');
      function colores(n) {
        var palette = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395', '#994499', '#22aa99', '#aaaa11', '#6633cc', '#e67300', '#8b0707', '#651067', '#329262', '#5574a6', '#3b3eac'];
        return palette[n % palette.length];
      }
      this.config = {
        top_n: 15,
        height: 500,
        width: 960,
        margin: {
          top: 20,
          right: 150,
          bottom: 5,
          left: 0
        },
        valueOffset: -8,
        valueLableOffset: 5,
        tickPause: 1500,
        tickDuration: 700,
        startYear: 2020.01,
        stopYear: 2021.01,
        colorScheme: colores
      };

      this.canvas = d3.select(`#${id}`)
        .append('svg')
        .attr('width', this.config.width)
        .attr('height', this.config.height);
      this.barPadding = (this.config.height - (this.config.margin.bottom + this.config.margin.top)) / (this.config.top_n * 5);

      this.halo = function (text, strokeWidth) {
        text.select(function () { return this.parentNode.insertBefore(this.cloneNode(true), this); })
          .style('fill', '#ffffff')
          .style('stroke', '#ffffff')
          .style('stroke-width', strokeWidth)
          .style('stroke-linejoin', 'round')
          .style('opacity', 1);
      }
    },
    setPeriod: function (start, end) {
      this.config.startYear = start;
      this.config.stopYear = end;
    },
    render: function (data) {
      let year = this.config.startYear;
      if (data.length == 0) return;

      // console.log('rendering for ', this.config.startYear, this.config.stopYear)
      data.forEach(d => {
        d.value = +d.value;
        d.lastValue = +d.lastValue;
        d.value = isNaN(d.value) ? 0 : d.value;
        d.year = +d.year
      });

      // console.log(data);

      let yearSlice = data.filter(d => d.year == year && !isNaN(d.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, this.config.top_n);

      yearSlice.forEach((d, i) => d.rank = i);

      let x = d3.scaleLinear()
        .domain([0, d3.max(yearSlice, d => d.value)])
        .range([this.config.margin.left, this.config.width - this.config.margin.right - 65]);

      let y = d3.scaleLinear()
        .domain([this.config.top_n, 0])
        .range([this.config.height - this.config.margin.bottom, this.config.margin.top]);

      let xAxis = d3.axisTop()
        .scale(x)
        .ticks(this.config.width > 500 ? 5 : 2)
        .tickSize(-(this.config.height - this.config.margin.top - this.config.margin.bottom))
        .tickFormat(d => d3.format(',')(d));

      // remove old
      this.canvas.selectAll('g.axis').remove();
      this.canvas.selectAll('text.yearText').remove();
      this.canvas.selectAll('rect.bar').remove();

      this.canvas.append('g')
        .attr('class', 'axis xAxis')
        .attr('transform', `translate(0, ${this.config.margin.top})`)
        .call(xAxis)
        .selectAll('.tick line')
        .classed('origin', d => d == 0);

      this.canvas.selectAll('rect.bar')
        .data(yearSlice, d => d.name)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', x(0) + 1)
        .attr('width', d => x(d.value) - x(0) - 1)
        .attr('y', d => y(d.rank) + 5)
        .attr('height', y(1) - y(0) - this.barPadding)
        .style('fill', (d, i) => this.config.colorScheme(i))

      this.canvas.selectAll('text.label')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.value) + this.config.valueOffset)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .style('text-anchor', 'end')
        .text(d => d.value);

      this.canvas.selectAll('text.valueLabel')
        .data(yearSlice, d => d.name)
        .enter()
        .append('text')
        .attr('class', 'valueLabel')
        .attr('x', d => x(d.value) + this.config.valueLableOffset)
        .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
        .text(d => d.name)

      let yearText = this.canvas.append('text')
        .attr('class', 'yearText')
        .attr('x', this.config.width - this.config.margin.right)
        .attr('y', this.config.height - 25)
        .style('text-anchor', 'end')
        .html(year || '')
        .call(this.halo, 10);

      var svg = this.canvas;
      let ticker = d3.interval(e => {
        yearSlice = data.filter(d => d.year == year && !isNaN(d.value))
          .sort((a, b) => b.value - a.value)
          .slice(0, this.config.top_n);

        yearSlice.forEach((d, i) => d.rank = i);

        // console.log('IntervalYear: ', yearSlice);

        x.domain([0, d3.max(yearSlice, d => d.value)]);

        svg.select('.xAxis')
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .call(xAxis);

        let bars = svg.selectAll('.bar').data(yearSlice, d => d.name);

        bars
          .enter()
          .append('rect')
          .attr('class', d => `bar ${d.name.replace(/\s/g, '_')}`)
          .attr('x', x(0) + 1)
          .attr('width', d => x(d.value) - x(0) - 1)
          .attr('y', d => y(this.config.top_n + 1) + 5)
          .attr('height', y(1) - y(0) - this.barPadding)
          .style('fill', (d, i) => this.config.colorScheme(i))
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('y', d => y(d.rank) + 5);

        bars
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('width', d => x(d.value) - x(0) - 1)
          .attr('y', d => y(d.rank) + 5);

        bars
          .exit()
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('width', d => x(d.value) - x(0) - 1)
          .attr('y', d => y(this.config.top_n + 1) + 5)
          .remove();

        let labels = svg.selectAll('.label')
          .data(yearSlice, d => d.name);

        labels
          .enter()
          .append('text')
          .attr('class', 'label')
          .attr('x', d => x(d.value) + this.config.valueOffset)
          .attr('y', d => y(this.config.top_n + 1) + 5 + ((y(1) - y(0)) / 2))
          .style('text-anchor', 'end')
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

        labels
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('x', d => x(d.value) + this.config.valueOffset)
          .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)
          .text(d => d3.format('.4f')(d.value))

        labels
          .exit()
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('x', d => x(d.value) + this.config.valueOffset)
          .attr('y', d => y(this.config.top_n + 1) + 5)
          .remove();

        let valueLabels = svg.selectAll('.valueLabel').data(yearSlice, d => d.name);
        valueLabels
          .enter()
          .append('text')
          .attr('class', 'valueLabel')
          .attr('x', d => x(d.value) + this.config.valueLableOffset)
          .attr('y', d => y(this.config.top_n + 1) + 5)
          .text(d => d.name)
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1);

        valueLabels
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('x', d => x(d.value) + this.config.valueLableOffset)
          .attr('y', d => y(d.rank) + 5 + ((y(1) - y(0)) / 2) + 1)

        valueLabels
          .exit()
          .transition()
          .duration(this.config.tickDuration)
          .ease(d3.easeLinear)
          .attr('x', d => x(d.value) + this.config.valueLableOffset)
          .attr('y', d => y(this.config.top_n + 1) + 5)
          .remove();

        yearText.html(year || '');

        if (year >= this.config.stopYear) {
          ticker.stop();
        }
        if (year % 1 <= 0.11) {
          year = d3.format('.2f')((+year) + 0.01);
        } else {
          year = d3.format('.2f')((+year) + 1 - 0.11);
        }
        // console.log('draw year', year)
      }, this.config.tickPause);

    }
  })
})
