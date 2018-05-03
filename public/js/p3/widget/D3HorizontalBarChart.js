define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
  'd3/d3'
], function (
  declare, lang,
  dom, domClass, domConstruct, domStyle, Topic,
  d3
) {

  return declare([], {
    maxBarWidth: 30,
    init: function (target, className, margin) {
      target = (typeof target == 'string') ? d3.select(target)[0][0] : target;

      this.node = domConstruct.place('<div class="chart ' + className + '"></div>', target, 'last');

      this.nodeWidth = domStyle.get(this.node, 'width');
      this.nodeHeight = domStyle.get(this.node, 'height') || 250;
      this.margin = lang.mixin({
        top: 0, right: 10, bottom: 20, left: 250
      }, margin);

      this.canvas = d3.select('.chart.' + className)
        .insert('svg', ':first-child')
        .attr('width', this.nodeWidth)
        .attr('height', this.nodeHeight);

      if (d3.select('div.tooltip')[0][0]) {
        this.tooltipLayer = d3.select('div.tooltip');
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
      }
    },
    renderTitle: function (xAxisTitle, yAxisTitle) {
      if (xAxisTitle) {
        this.canvas.append('text')
          .attr('transform', 'translate(' + (this.nodeWidth / 2 - 20) + ',' + (this.nodeHeight - 10) + ')')

          .text(xAxisTitle);
      }

      if (yAxisTitle) {
        this.canvas.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('x', 0 - (this.nodeWidth / 2))
          .attr('y', 10)
          .text(yAxisTitle);
      }
    },
    /*
      expect data:[{label: [string], tooltip: [string or func], count: [number]},,,]
      // will use '{label} ({count})' if tooltip is omitted.
    */
    render: function (data) {
      if (this.data !== data) {
        this.data = data;
      } else {
        return;
      }

      var self = this;

      var maxValue = data.map(function (d) {
        return d.count;
      })
        .reduce(function (a, b) {
          return Math.max(a, b);
        });
      var labels = data.map(function (d) {
        return d.label;
      });

      this.y_scale = d3.scale.ordinal()
        .rangeRoundBands([self.margin.top, (self.nodeHeight - self.margin.top - self.margin.bottom)], 0.3, 0)
        .domain(labels);
      this.y_scale_range = this.y_scale.range();
      // console.log(this.y_scale.rangeBand(), this.y_scale_range);

      var barWidth = Math.max(1, 0.85 * Math.min(this.y_scale.rangeBand(), this.maxBarWidth));
      var halfGap = Math.max(0, this.y_scale.rangeBand() - barWidth) / 2;

      this.x_scale = d3.scale.linear()
        .range([0, (self.nodeWidth - self.margin.right - self.margin.left)])
        .domain([0, maxValue]);

      this.yAxis = d3.svg.axis()
        .scale(this.y_scale)
        .orient('left')
        .tickFormat(function (d) {
          return (d.length > 32) ? d.substr(0, 32) + '...' : d;
        })
        .tickPadding(2)
        .tickSize(1);

      this.xAxis = d3.svg.axis()
        .scale(this.x_scale)
        .orient('bottom')
        .tickFormat(d3.format(',.0d'))
        .tickPadding(2)
        .tickSize(1);

      this.canvas.selectAll('g.axis').remove();
      this.canvas.select('g.bars').remove();

      this.canvas.append('g')
        .attr('transform', lang.replace('translate({0}, {1})', [self.margin.left, self.margin.top]))
        .call(this.yAxis)
        .attr('class', 'y axis');

      this.canvas.append('g')
        .attr('transform', lang.replace('translate({0}, {1})', [self.margin.left, self.nodeHeight - self.margin.bottom]))
        .call(this.xAxis)
        .attr('class', 'x axis');

      this.canvas.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', function () {
          return self.margin.left;
        })
        .attr('y', function (d, i) {
          // return self.y_scale_range[i] + self.margin.top;
          return (self.y_scale(d.label) + halfGap) + self.margin.top - 1;
        })
        .attr('width', function (d) {
          return self.x_scale(d.count) < 0 ? 0 : self.x_scale(d.count);
        })
        .attr('height', Math.min(self.y_scale.rangeBand(), self.maxBarWidth))
        .attr('fill', '#1976D2')
        .on('click', function (d, i) {
          if (d.link) {
            var url;
            if (typeof d.link == 'function') {
              url = d.link.apply(this, arguments);
            } else {
              url = d.link;
            }
            // console.log(url);
            Topic.publish('/navigate', { href: url });
          }
        })
        .on('mouseover', function (d, i) {
          self.tooltipLayer.transition()
            .duration(200)
            .style('opacity', 0.95);

          var content = (self.data[i].tooltip) ? self.data[i].tooltip.apply(this, arguments) : lang.replace('{label} ({count})', self.data[i]);

          self.tooltipLayer.html(content)
            .style('left', d3.event.pageX + 'px')
            .style('top', d3.event.pageY + 'px');
        })
        .on('mouseout', function () {
          self.tooltipLayer.transition()
            .duration(500)
            .style('opacity', 0);
        });
    },
    resize: function () {
      var self = this;
      clearTimeout(this.resizer);

      this.resizer = setTimeout(function () {
        self.doResize();
      }, 300);
    },

    update: function (data) {
      if (this.canvas.select('g.bars').selectAll('rect').length === 0) {
        this.render(data);
        return;
      }
      this.data = data;

      var maxValue = data.map(function (d) {
        return d.count;
      })
        .reduce(function (a, b) {
          return Math.max(a, b);
        });
      var labels = data.map(function (d) {
        return d.label;
      });
      var self = this;

      this.x_scale.domain([0, maxValue]);
      this.y_scale.domain(labels);
      this.y_scale_range = this.y_scale.range();
      this.xAxis.scale(this.x_scale);
      this.yAxis.scale(this.y_scale);

      this.canvas.select('g.x').transition().duration(600).call(this.xAxis);
      this.canvas.select('g.y').transition().duration(600).call(this.yAxis);

      this.canvas.select('g.bars').selectAll('rect').transition().duration(600)
        .attr('width', function (d, i) {
          return (data[i] != undefined) ? self.x_scale(data[i].count) : 0;
        })
        .attr('y', function (d, i) {
          return (data[i] != undefined) ? self.y_scale_range[i] + self.margin.top : 0;
        });
    },

    doResize: function () {
      var self = this;

      this.nodeWidth = domStyle.get(this.node, 'width');

      // update chart and canvas width
      this.canvas.attr('width', this.nodeWidth);

      // update axis
      this.x_scale.range([0, (self.nodeWidth - self.margin.right - self.margin.left)]);
      this.xAxis.scale(this.x_scale);
      this.canvas.select('g.x').transition().call(this.xAxis);

      // update bars
      this.canvas.selectAll('rect').transition()
        .attr('width', function (d) {
          return self.x_scale(d.count);
        });
    }
  });
});
