define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/query!css3', 'dojo/dom-style', 'dojo/topic',
  'd3/d3',
  'dojo/text!./templates/D3StackedBarChart.html'
], function (
  declare, lang,
  dom, domClass, domConstruct, domQuery, domStyle, Topic,
  d3,
  Template
) {

  return declare([], {
    data: null,
    templateString: Template,
    minBarWidth: 25,
    dataSet: 'dist',

    init: function (target, className, margin) {
      target = (typeof target == 'string') ? d3.select(target)[0][0] : target;

      this.node = domConstruct.place(this.templateString, target, 'only');

      this.currentSort = 'label';
      this.ascendSort = true;
      this.normalize = false;

      this.margin = margin = lang.mixin({
        top: 10, right: 0, bottom: 0, left: 40
      }, margin);

      var container = domQuery('.chart', this.node)[0];

      var containerWidth = domStyle.get(container, 'width');
      var containerHeight = domStyle.get(container, 'height');

      this.canvasWidth = containerWidth - margin.right - margin.left;
      this.canvasHeight = containerHeight - margin.top - margin.bottom;

      // console.log(containerWidth, containerHeight, this.canvasWidth, this.canvasHeight);

      if (className) {
        d3.select('.chart-wrapper').attr('class', 'chart-wrapper ' + className);
      }

      this.chart = d3.select('.chart')
        .insert('svg', ':first-child')
        .attr('class', 'svgChartContainer')
        .attr('width', containerWidth)
        .attr('height', containerHeight);

      this.canvas = this.chart.append('g')
        .attr('class', 'svgChartCanvas')
        .attr('width', this.canvasWidth)
        .attr('height', this.canvasHeight)
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      if (d3.select('div.tooltip')[0][0]) {
        this.tooltipLayer = d3.select('div.tooltip');
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
      }
    },

    render: function (data) {
      if (this.data !== data) {
        this.data = data;
      } else {
        return;
      }

      // remove existing bars and yAxis
      d3.select('g.y').remove();
      d3.selectAll('g.bar').remove();

      // reset scale params
      this.normalize = domQuery('.chart-wrapper nav .scale .active')[0].className.split(' ')[0] === 'normalize' || false;

      this.maxValue = (this.normalize) ? 100 : this.data.map(function (d) {
        return d.total || 0;
      }).reduce(function (a, b) {
        return Math.max(a, b);
      });

      // reset sort condition
      var sortToggle = domQuery('.chart-wrapper nav .sort li');
      sortToggle.removeClass('active');
      domClass.add(domQuery('.chart-wrapper nav .sort .label')[0], 'active');

      // axis
      this.pf_y_scale = d3.scale.linear().range([0, this.canvasHeight]).domain([this.maxValue, 0]);
      this.pf_x_scale = d3.scale.linear().range([0, this.canvasWidth]).domain([0, this.data.length]);

      this._resizeChart();

      // draw bars
      this.canvas.selectAll('g.bar').data(this.data).enter().append('g')
        .attr('class', 'bar');
      this.bars = this.canvas.selectAll('g.bar').data(this.data);

      var self = this;

      this._barWidth();

      this.yAxis = d3.svg.axis()
        .scale(this.pf_y_scale)
        .orient('left')
        .tickFormat(d3.format(',.0d'))
        .tickPadding(0)
        .tickSize(0);

      this.chart.append('g')
        .attr('transform', lang.replace('translate({0},{1})', [this.margin.left, this.margin.top]))
        .call(this.yAxis)
        .attr('class', 'y axis');

      this.seriesSize = this.data.map(function (d) {
        return d[self.dataSet].length;
      })
        .reduce(function (a, b) {
          return Math.max(a, b);
        });
      var series = [];
      for (var index = 0; index < this.seriesSize; index++) {
        series.push(index);
      }
      series.forEach(function (index) {

        self.bars.append('rect')
          .attr('class', 'block-' + index)
          .attr('y', function (d) {
            var ancestorHeight = self.barHeight(d3.sum(d[self.dataSet].slice(0, index)), d.total);
            return Math.round(self.canvasHeight - self.barHeight(d[self.dataSet][index], d.total) - ancestorHeight);
          })
          .attr('x', function (d, i) {
            return self.barPosition(i);
          })
          .attr('width', function () {
            return self.barWidth();
          })
          .attr('height', function (d) {
            return Math.round(self.barHeight(d[self.dataSet][index], d.total));
          })
          .on('click', function (d) {
            if (d.link) {
              var url;
              if (typeof d.link == 'function') {
                arguments[1] = index;
                url = d.link.apply(this, arguments);
              } else {
                url = d.link;
              }
              // console.log(url);
              Topic.publish('/navigate', { href: url });
            }
          })
          .on('mouseover', function (d) {
            self.tooltipLayer.transition()
              .duration(200)
              .style('opacity', 0.95);
            // console.log(d);

            arguments[1] = index;
            arguments[2] = self.dataSet;
            var content = (d.tooltip) ? d.tooltip.apply(this, arguments) : lang.replace('{label} ({count})', d);

            self.tooltipLayer.html(content)
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY + 'px');
          })
          .on('mouseout', function () {
            self.tooltipLayer.transition()
              .duration(500)
              .style('opacity', 0);
          });
      });

      // Place the text. We have a little height adjustment on the dy
      // to make sure text is centered in the block rather than set
      // along the baseline.

      this.bars.append('text').text(function (d) {
        return d.label;
      })
        .attr('y', Math.round(this.canvasHeight - 11))
        .attr('x', function (d, i) {
          return self.textPosition(i);
        })
        .attr('transform', function (d, i) {
          var y = Math.round(self.canvasHeight - 11);
          var x = self.textPosition(i);
          return lang.replace('rotate(270, {0}, {1})', [x, y]);
        })
        .attr('dy', '.35em');

    },

    update: function (data) {

      if (typeof data == 'string') {
        data = JSON.parse(data);
      }

      if (this.canvas.select('g.bar').selectAll('rect').length === 0) {
        this.render(data);
        return;
      }

      this.data = data;

      this.maxValue = (this.normalize) ? 100 : this.data.map(function (d) {
        return d.total || 0;
      }).reduce(function (a, b) {
        return Math.max(a, b);
      });
      // console.log("maxValue: ", this.maxValue, "data length: ", this.data.length);

      var self = this;

      // update axis
      this.pf_y_scale.domain([this.maxValue, 0]);
      this.pf_x_scale.domain([0, this.data.length]);

      this._resizeChart();

      this.yAxis.scale(this.pf_y_scale);
      // this.xAxis.scale(this.pf_x_scale);
      this._barWidth();

      this.chart.select('g.y').transition().duration(600).call(this.yAxis);
      // this.chart.select("g.x").transition().duration(600).call(this.xAxis);

      // update bars
      var series = [];
      for (var index = 0; index < this.seriesSize; index++) {
        series.push(index);
      }

      //
      var nodeCountDiff = this.data.length - this.bars[0].length;
      if (nodeCountDiff > 0) {

        for (var i = 0; i < nodeCountDiff; i++) {
          this.canvas.insert('g').attr('class', 'bar');
        }
        var newBars = this.canvas.selectAll('g.bar:empty');

        series.forEach(function (index) {
          newBars.append('rect')
            .attr('class', 'block-' + index);
        });
        newBars.append('text')
          .attr('y', Math.round(this.canvasHeight - 11))
          .attr('x', function (d, i) {
            return self.textPosition(i);
          })
          .attr('transform', function (d, i) {
            var y = Math.round(self.canvasHeight - 11);
            var x = self.textPosition(i);
            return lang.replace('rotate(270, {0}, {1})', [x, y]);
          })
          .attr('dy', '.35em');
      } else if (nodeCountDiff < 0) {
        // remove
        // console.log(this.canvas.selectAll("g.bar:nth-last-child(-n + " + Math.abs(checkToAppend) + ")"));
        this.canvas.selectAll('g.bar:nth-last-child(-n + ' + Math.abs(nodeCountDiff) + ')').remove();
      }

      self.bars = this.canvas.selectAll('g.bar').data(this.data);

      series.forEach(function (index) {
        self.bars.select(lang.replace('rect.block-{0}', [index]))
          .transition().duration(600)
          .attr('y', function (d, i) {
            if (data[i] != undefined) {
              var ancestorHeight = self.barHeight(d3.sum(data[i][self.dataSet].slice(0, index)), data[i].total);
              return Math.round(self.canvasHeight - self.barHeight(data[i][self.dataSet][index], data[i].total) - ancestorHeight);
            }
            return 0;

          })
          .attr('x', function (d, i) {
            return self.barPosition(i);
          })
          .attr('width', function (d, i) {
            return self.barWidth();
          })
          .attr('height', function (d, i) {
            return (data[i] != undefined) ? Math.round(self.barHeight(data[i][self.dataSet][index], data[i].total)) : 0;
          });
      });

      this.bars.select('text').transition().duration(600)
        .text(function (d) {
          return d.label;
        })
        .delay(function (d, i) {
          return 10 * i;
        })
        .attr('x', function (d, i) {
          return self.textPosition(i);
        })
        .attr('transform', function (d, i) {
          var y = Math.round(self.canvasHeight - 11);
          var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
          return lang.replace('rotate(270, {0}, {1})', [x, y]);
        });
    },

    _barWidth: function () {
      this.full_barWidth = this.pf_x_scale(1);
      this.drawn_barWidth = this.full_barWidth * 0.6;
      this.center_correction = (this.full_barWidth - this.drawn_barWidth) / 2;
    },

    _resizeChart: function () {
      if (this.pf_x_scale(1) < this.minBarWidth) {
        // too thin bar width
        this.canvasWidth = this.minBarWidth * this.data.length;
        var containerWidth = this.canvasWidth + this.margin.left + this.margin.right;
        this.chart.attr('width', containerWidth);
        this.canvas.attr('width', this.canvasWidth);

        this.pf_x_scale.range([0, this.canvasWidth]);
      }
    },

    textPosition: function (index) {
      return Math.floor((this.full_barWidth * index) + this.drawn_barWidth - 2);
    },
    barPosition: function (index) {
      return Math.floor(this.full_barWidth * index + this.center_correction);
    },
    barWidth: function () {
      return Math.floor(this.drawn_barWidth);
    },
    barHeight: function (value, total) {
      if (this.normalize) {
        return this.canvasHeight - this.pf_y_scale((value / total) * 100);
      }
      return this.canvasHeight - this.pf_y_scale(value);

    },
    scale: function () {

      this.maxValue = (this.normalize) ? 100 : this.data.map(function (d) {
        return d.total || 0;
      }).reduce(function (a, b) {
        return Math.max(a, b);
      });

      var self = this;

      // update axis
      this.pf_y_scale.domain([this.maxValue, 0]);
      this.yAxis.scale(this.pf_y_scale);
      this.chart.select('g.y').transition().duration(600).call(this.yAxis);

      // update bars
      var series = [];
      for (var index = 0; index < this.seriesSize; index++) {
        series.push(index);
      }
      series.forEach(function (index) {
        self.bars.select(lang.replace('rect.block-{0}', [index]))
          .transition().duration(600)
          .attr('y', function (d) {
            var ancestorHeight = self.barHeight(d3.sum(d[self.dataSet].slice(0, index)), d.total);
            return Math.round(self.canvasHeight - self.barHeight(d[self.dataSet][index], d.total) - ancestorHeight);
          })
          .attr('height', function (d) {
            return Math.round(self.barHeight(d[self.dataSet][index], d.total));
          });
      });
    },
    sort: function () {
      var self = this;

      var sortCriteria = domQuery('.chart-wrapper .sort .active')[0].className.split(' ')[0];

      if (sortCriteria === this.currentSort) {
        this.ascendSort = !this.ascendSort;
      } else {
        this.currentSort = sortCriteria;
      }

      if (this.currentSort === 'label') {
        this.bars.sort(function (a, b) {
          var orderCode = 0;
          if (a.label < b.label) {
            orderCode = -1;
          } else if (a.label > b.label) {
            orderCode = 1;
          }

          if (!self.ascendSort) {
            orderCode *= -1;
          }
          return orderCode;
        });
      } else if (this.currentSort === 'value') {
        this.bars.sort(function (a, b) {
          var aValue = self.barHeight(a[self.dataSet][0], a.total);
          var bValue = self.barHeight(b[self.dataSet][0], b.total);

          var orderCode = aValue - bValue;
          if (!self.ascendSort) {
            orderCode *= -1;
          }
          return orderCode;
        });
      }

      for (var index = 0; index < this.seriesSize; index++) {
        this.bars.select(lang.replace('rect.block-{0}', [index]))
          .transition().duration(600)
          .delay(function (d, i) {
            return 10 * i;
          })
          .attr('x', function (d, i) {
            return self.barPosition(i);
          });
      }

      this.bars.select('text').transition().duration(600)
        .delay(function (d, i) {
          return 10 * i;
        })
        .attr('x', function (d, i) {
          return self.textPosition(i);
        })
        .attr('transform', function (d, i) {
          var y = Math.round(self.canvasHeight - 11);
          var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
          return lang.replace('rotate(270, {0}, {1})', [x, y]);
        });

    },

    renderNav: function (html) {

      domConstruct.place(html, domQuery('.chart-wrapper nav')[0], 'only');

      var self = this;
      var scaleToggle = domQuery('.chart-wrapper nav .scale li');
      var sortToggle = domQuery('.chart-wrapper nav .sort li');

      // Set up the scale toggle
      if (scaleToggle != null) {
        scaleToggle.on('click', function (evt) {
          scaleToggle.removeClass('active');
          var target = evt.srcElement || evt.target;

          self.normalize = target.className == 'normalize';
          domClass.add(target, 'active');

          self.scale(function () {
            return self.sort();
          });
        });
      }

      // Set up the sort controls
      if (sortToggle != null) {
        sortToggle.on('click', function (evt) {
          sortToggle.removeClass('active');
          domClass.add(evt.srcElement || evt.target, 'active');

          return self.sort();
        });
      }
    },

    renderLegend: function (title, legend) {

      d3.select('p.legend').select('label').text(title);

      d3.select('p.legend').selectAll('svg')
        .data(legend)
        .insert('circle')
        .attr('cx', 8)
        .attr('cy', 8)
        .attr('r', 8)
        .attr('class', function (d, i) {
          return 'bar' + i + '-sample';
        });

      d3.select('p.legend').selectAll('span')
        .data(legend)
        .text(function (d) {
          return d;
        });
    },

    resize: function () {
      var self = this;
      clearTimeout(this.resizer);

      this.resizer = setTimeout(function () {
        self.doResize();
      }, 300);
    },
    doResize: function () {
      var container = domQuery('.chart', this.node)[0] || null;

      var containerWidth = domStyle.get(container, 'width');
      var canvasWidth = containerWidth - this.margin.right - this.margin.left;

      this.canvasWidth = canvasWidth;

      // console.log("resize canvasWidth: ", canvasWidth);

      this.pf_x_scale.range([0, canvasWidth]);

      this._resizeChart();

      // update chart and canvas width
      this.chart.attr('width', containerWidth);
      this.canvas.attr('width', canvasWidth);

      // update bars
      this._barWidth();

      var self = this;
      for (var index = 0; index < this.seriesSize; index++) {
        this.bars.select(lang.replace('rect.block-{0}', [index]))
          .transition()
          .attr('width', function () {
            return self.barWidth();
          })
          .attr('x', function (d, i) {
            return self.barPosition(i);
          });
      }

      this.bars.select('text')
        .transition()
        .attr('x', function (d, i) {
          return self.textPosition(i);
        })
        .attr('transform', function (d, i) {
          var y = Math.round(self.canvasHeight - 11);
          var x = self.pf_x_scale(i) + self.pf_x_scale(1) / 2;
          return lang.replace('rotate(270, {0}, {1})', [x, y]);
        });
    }
  });
});
