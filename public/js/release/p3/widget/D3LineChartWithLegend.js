define("p3/widget/D3LineChartWithLegend", [
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style',
  'd3/d3'
], function(
  declare, lang,
  dom, domClass, domConstruct, domStyle,
  d3
){
  // http://bl.ocks.org/bobmonteverde/2070123

  function d3Legend() {
    var margin = {top: 5, right: 0, bottom: 5, left: 10},
        width = 400,
        height = 20,
        color = d3.scale.category10().range(),
        dispatch = d3.dispatch('legendClick', 'legendMouseover', 'legendMouseout');


    function chart(selection) {
      selection.each(function(data) {
        /**
        *    Legend curently is setup to automaticaly expand vertically based on a max width.
        *    Should implement legend where EITHER a maxWidth or a maxHeight is defined, then
        *    the other dimension will automatically expand to fit, and anything that exceeds
        *    that will automatically be clipped.
        **/

        var wrap = d3.select(this).selectAll('g.legend').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'legend').append('g');


        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


        var series = g.selectAll('.series')
            .data(function(d) { return d });
        var seriesEnter = series.enter().append('g').attr('class', 'series')
            .on('click', function(d, i) {
              dispatch.legendClick(d, i);
            })
            .on('mouseover', function(d, i) {
              dispatch.legendMouseover(d, i);
            })
            .on('mouseout', function(d, i) {
              dispatch.legendMouseout(d, i);
            });
        seriesEnter.append('circle')
            .style('fill', function(d, i){ return d.color || color[i % 10] })
            .style('stroke', function(d, i){ return d.color || color[i % 10] })
            .attr('r', 5);
        seriesEnter.append('text')
            .text(function(d) { return d.label })
            .attr('text-anchor', 'start')
            .attr('dy', '.32em')
            .attr('dx', '8');
        series.classed('disabled', function(d) { return d.disabled });
        series.exit().remove();


        var ypos = 5,
            newxpos = 5,
            maxwidth = 0,
            xpos;
        series
            .attr('transform', function(d, i) {
               var length = d3.select(this).select('text').node().getComputedTextLength() + 28;
               xpos = newxpos;

               //TODO: 1) Make sure dot + text of every series fits horizontally, or clip text to fix
               //      2) Consider making columns in line so dots line up
               //         --all labels same width? or just all in the same column?
               //         --optional, or forced always?
               if (width < margin.left + margin.right + xpos + length) {
                 newxpos = xpos = 5;
                 ypos += 20;
               }

               newxpos += length;
               if (newxpos > maxwidth) maxwidth = newxpos;

               return 'translate(' + xpos + ',' + ypos + ')';
            });

        //position legend as far right as possible within the total width
        g.attr('transform', 'translate(' + (width - margin.right - maxwidth) + ',' + margin.top + ')');

        height = margin.top + margin.bottom + ypos + 15;
      });

      return chart;
    }

    chart.dispatch = dispatch;

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    return chart;
  }

  function d3Line() {
    var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = 960,
        height = 500,
        dotRadius = function() { return 2.5 },
        color = d3.scale.category10().range(),
        id = Math.floor(Math.random() * 10000), //Create semi-unique ID incase user doesn't select one
        x = d3.scale.linear(),
        y = d3.scale.linear(),
        dispatch = d3.dispatch("pointMouseover", "pointMouseout"),
        x0, y0;


    function chart(selection) {
      selection.each(function(data) {
        var seriesData = data.map(function(d) { return d.data });

        x0 = x0 || x;
        y0 = y0 || y;

        //TODO: reconsider points {x: #, y: #} instead of [x,y]
        //TODO: data accessors so above won't really matter, but need to decide for internal use

        //add series data to each point for future ease of use
        data = data.map(function(series, i) {
          series.data = series.data.map(function(point) {
            point.series = i;
            return point;
          });
          return series;
        });


        x   .domain(d3.extent(d3.merge(seriesData), function(d) { return d[0] } ))
            .range([0, width - margin.left - margin.right]);

        y   .domain(d3.extent(d3.merge(seriesData), function(d) { return d[1] } ))
            .range([height - margin.top - margin.bottom, 0]);


        var vertices = d3.merge(data.map(function(line, lineIndex) {
              return line.data.map(function(point, pointIndex) {
                var pointKey = line.label + '-' + point[0];
                return [x(point[0]), y(point[1]), lineIndex, pointIndex]; //adding series index to point because data is being flattened
              })
            })
        );


        var wrap = d3.select(this).selectAll('g.d3line').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'd3line').append('g');

        gEnter.append('g').attr('class', 'lines');
        gEnter.append('g').attr('class', 'point-clips');
        gEnter.append('g').attr('class', 'point-paths');


        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');



        var voronoiClip =  gEnter.append('g').attr('class', 'voronoi-clip')
          .append('clipPath')
            .attr('id', 'voronoi-clip-path-' + id) //this id should probably be set on update, unless ID is always set before render
          .append('rect');
        wrap.select('.voronoi-clip rect')
            .attr('x', -10)
            .attr('y', -10)
            .attr('width', width - margin.left - margin.right + 20)
            .attr('height', height - margin.top - margin.bottom + 20);
        wrap.select('.point-paths')
            .attr('clip-path', 'url(#voronoi-clip-path-' + id + ')');


        //var pointClips = wrap.select('.point-clips').selectAll('clipPath') // **BROWSER BUG** can't reselect camel cased elements
        var pointClips = wrap.select('.point-clips').selectAll('.clip-path')
            .data(vertices);
        pointClips.enter().append('clipPath').attr('class', 'clip-path')
          .append('circle')
            .attr('r', 25);
        pointClips.exit().remove();
        pointClips
            .attr('id', function(d, i) { return 'clip-' + id + '-' + d[2] + '-' + d[3] })
            .attr('transform', function(d) { return 'translate(' + d[0] + ',' + d[1] + ')' });


        var voronoi = d3.geom.voronoi(vertices).map(function(d,i) {
            return { 'data': d, 'series': vertices[i][2], 'point': vertices[i][3] }
        });

        //TODO: Add very small amount of noise to prevent duplicates
        var pointPaths = wrap.select('.point-paths').selectAll('path')
            .data(voronoi);
        pointPaths.enter().append('path')
            .attr('class', function(d,i) { return 'path-' + i; });
        pointPaths.exit().remove();
        pointPaths
            .attr('clip-path', function(d) { return 'url(#clip-' + id + '-' + d.series + '-' + d.point + ')'; })
            .attr('d', function(d) { return 'M' + d.data.join(',') + 'Z'; })
            .on('mouseover', function(d) {
              dispatch.pointMouseover({
                point: data[d.series].data[d.point],
                series: data[d.series],
                pos: [x(data[d.series].data[d.point][0]) + margin.left, y(data[d.series].data[d.point][1]) + margin.top],
                pointIndex: d.point,
                seriesIndex: d.series
              });
            })
            .on('mouseout', function(d) {
              dispatch.pointMouseout({
                point: d,
                series: data[d.series],
                pointIndex: d.point,
                seriesIndex: d.series
              });
            });


        dispatch.on('pointMouseover.point', function(d) {
          wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
            .classed('hover', true);
        });

        dispatch.on('pointMouseout.point', function(d) {
          wrap.select('.line-' + d.seriesIndex + ' .point-' + d.pointIndex)
            .classed('hover', false);
        });



        var lines = wrap.select('.lines').selectAll('.line')
            .data(function(d) { return d }, function(d) { return d.label });
        lines.enter().append('g')
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6);
        d3.transition(lines.exit())
            .style('stroke-opacity', 1e-6)
            .style('fill-opacity', 1e-6)
            .remove();
        lines.attr('class', function(d,i) { return 'line line-' + i })
            .classed('hover', function(d) { return d.hover })
            .style('fill', function(d,i) { return color[i % 10] })
            .style('stroke', function(d,i) { return color[i % 10] })
        d3.transition(lines)
            .style('stroke-opacity', 1)
            .style('fill-opacity', .5);


        var paths = lines.selectAll('path')
            .data(function(d, i) { return [d.data] });
        paths.enter().append('path')
            .attr('d', d3.svg.line()
              .x(function(d) { return x0(d[0]) })
              .y(function(d) { return y0(d[1]) })
            );
        paths.exit().remove();
        d3.transition(paths)
            .attr('d', d3.svg.line()
              .x(function(d) { return x(d[0]) })
              .y(function(d) { return y(d[1]) })
            );


        var points = lines.selectAll('circle.point')
            .data(function(d) { return d.data });
        points.enter().append('circle')
            .attr('cx', function(d) { return x0(d[0]) })
            .attr('cy', function(d) { return y0(d[1]) });
        points.exit().remove();
        points.attr('class', function(d,i) { return 'point point-' + i });
        d3.transition(points)
            .attr('cx', function(d) { return x(d[0]) })
            .attr('cy', function(d) { return y(d[1]) })
            .attr('r', dotRadius());

      });

      x0 = x;
      y0 = y;

      return chart;
    }



    chart.dispatch = dispatch;

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.dotRadius = function(_) {
      if (!arguments.length) return dotRadius;
      dotRadius = d3.functor(_);
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    chart.id = function(_) {
      if (!arguments.length) return id;
      id = _;
      return chart;
    };


    return chart;
  }

  function d3LineWithLegend() {
    var margin = {top: 30, right: 20, bottom: 40, left: 60},
        width = 960,
        height = 500,
        dotRadius = function() { return 2.5 },
        xAxisLabelText = false,
        yAxisLabelText = false,
        color = d3.scale.category10().range(),
        dispatch = d3.dispatch('showTooltip', 'hideTooltip');

    var x = d3.scale.linear(),
        y = d3.scale.linear(),
        xAxis = d3.svg.axis().scale(x).orient('bottom'),
        yAxis = d3.svg.axis().scale(y).orient('left'),
        legend = d3Legend().height(30).color(color),
        lines = d3Line();


    function chart(selection, xLabels) {
      selection.each(function(data) {
        var series = data.filter(function(d) { return !d.disabled })
              .map(function(d) { return d.data });

        var numDataPoints = series[0].length;
        if (xLabels) {
          xAxis.tickFormat(function(d) { return xLabels[d] })
        }

        x   .domain(d3.extent(d3.merge(series), function(d) { return d[0] } ))
            .range([0, width - margin.left - margin.right]);
        y   .domain(d3.extent(d3.merge(series), function(d) { return d[1] } ))
            .range([height - margin.top - margin.bottom, 0]);

        lines
          .width(width - margin.left - margin.right)
          .height(height - margin.top - margin.bottom)
          .color(data.map(function(d,i) {
            return d.color || color[i % 10];
          }).filter(function(d,i) { return !data[i].disabled }))

        xAxis
          // .ticks( width / 100 )
          .ticks(numDataPoints)
          .tickSize(-(height - margin.top - margin.bottom), 0);

        yAxis
          .ticks( height / 36 )
          .tickSize(-(width - margin.right - margin.left), 0);


        var wrap = d3.select(this).selectAll('g.wrap').data([data]);
        var gEnter = wrap.enter().append('g').attr('class', 'wrap d3lineWithLegend').append('g');

        gEnter.append('g').attr('class', 'legendWrap');
        gEnter.append('g').attr('class', 'x axis');
        gEnter.append('g').attr('class', 'y axis');
        gEnter.append('g').attr('class', 'linesWrap');


        // legend.dispatch.on('legendClick', function(d, i) {
        //   d.disabled = !d.disabled;
        //   if (!data.filter(function(d) { return !d.disabled }).length) {
        //     data.forEach(function(d) {
        //       d.disabled = false;
        //     });
        //   }
        //   selection.call(chart)
        //   // selection.transition().call(chart)
        // });

        legend.dispatch.on('legendMouseover', function(d, i) {
          d.hover = true;
          selection.call(chart, xLabels)
          // selection.transition().call(chart)
        });

        legend.dispatch.on('legendMouseout', function(d, i) {
          d.hover = false;
          selection.call(chart, xLabels)
          // selection.transition().call(chart)
        });

        lines.dispatch.on('pointMouseover.tooltip', function(e) {
          dispatch.showTooltip({
            point: e.point,
            series: e.series,
            pos: [e.pos[0] + margin.left, e.pos[1] + margin.top],
            seriesIndex: e.seriesIndex,
            pointIndex: e.pointIndex
          });
        });

        lines.dispatch.on('pointMouseout.tooltip', function(e) {
          dispatch.hideTooltip(e);
        });

        legend
            .color(color)
            .width(width / 2 - margin.right);

        wrap.select('.legendWrap')
            .datum(data)
            .attr('transform', 'translate(' + (width/2 - margin.left) + ',' + (-legend.height()) +')')
            .call(legend);


        //TODO: maybe margins should be adjusted based on what components are used: axes, axis labels, legend
        margin.top = legend.height();  //need to re-render to see update

        var g = wrap.select('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var linesWrap = wrap.select('.linesWrap')
            .datum(data.filter(function(d) { return !d.disabled }));

        d3.transition(linesWrap).call(lines);

        var xAxisLabel = g.select('.x.axis').selectAll('text.axislabel')
            .data([xAxisLabelText || null]);
        xAxisLabel.enter().append('text').attr('class', 'axislabel')
            .attr('text-anchor', 'middle')
            .attr('x', x.range()[1] / 2)
            .attr('y', margin.bottom);
        xAxisLabel.exit().remove();
        xAxisLabel.text(function(d) { return d });

        g.select('.x.axis')
            .attr('transform', 'translate(0,' + y.range()[0] + ')')
            .call(xAxis)
          .selectAll('line.tick')
          .filter(function(d) { return !d })
            .classed('zero', true);


        var yAxisLabel = g.select('.y.axis').selectAll('text.axislabel')
            .data([yAxisLabelText || null]);
        yAxisLabel.enter().append('text').attr('class', 'axislabel')
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('y', 20 - margin.left);
        yAxisLabel.exit().remove();
        yAxisLabel
            .attr('x', -y.range()[0] / 2)
            .text(function(d) { return d });

        g.select('.y.axis')
            .call(yAxis)
          .selectAll('line.tick')
          .filter(function(d) { return !d })
            .classed('zero', true);
      });

      return chart;
    }

    chart.dispatch = dispatch;

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.width = function(_) {
      if (!arguments.length) return width;
      width = _;
      return chart;
    };

    chart.height = function(_) {
      if (!arguments.length) return height;
      height = _;
      return chart;
    };

    chart.color = function(_) {
      if (!arguments.length) return color;
      color = _;
      return chart;
    };

    chart.dotRadius = function(_) {
      if (!arguments.length) return dotRadius;
      dotRadius = d3.functor(_);
      lines.dotRadius = d3.functor(_);
      return chart;
    };

    //TODO: consider directly exposing both axes
    //chart.xAxis = xAxis;

    //Expose the x-axis' tickFormat method.
    chart.xAxis = {};
    d3.rebind(chart.xAxis, xAxis, 'tickFormat');

    chart.xAxis.label = function(_) {
      if (!arguments.length) return xAxisLabelText;
      xAxisLabelText = _;
      return chart;
    }

    // Expose the y-axis' tickFormat method.
    //chart.yAxis = yAxis;

    chart.yAxis = {};
    d3.rebind(chart.yAxis, yAxis, 'tickFormat');

    chart.yAxis.label = function(_) {
      if (!arguments.length) return yAxisLabelText;
      yAxisLabelText = _;
      return chart;
    }

    return chart;
  }

  return declare([], {
    init: function(target, kwArgs) {
      this.node = domConstruct.place('<div class="d3_line_chart"></div>', target, 'only');

      this.chart = d3LineWithLegend()
                .xAxis.label(kwArgs['xAxisLabel'] || '')
                .width(kwArgs['width'] || 400)
                .height(kwArgs['height'] || 300)
                .yAxis.label(kwArgs['yAxisLabel'] || '');

      this.canvas = d3.select('.d3_line_chart')
        .append('svg', ':first-child')
        .attr('width', kwArgs['width'] || 400)
        .attr('height', kwArgs['height'] || 300)
    },
    render: function (data, xLabels) {
      this.canvas.datum(data).call(this.chart, xLabels)
    }
  })

  /*
  Usage example

    this.d3LineChart = new D3LineChart();
    this.d3LineChart.init(this.viewer.domNode, {
      width: 960,
      height: 500,
      xAxisLabel: 'Month',
      yAxisLabel: 'Prevalence'
    });
    chartData = [
      {
        label: 'UK Variant',
        data: [[0, 0], [1, 0], [2, 0], [3, 0.0087], [4, 0.0344]]
      }, {
        label: 'South Africa Variant',
        data: [[0, 0.0692], [1, 0.0696], [2, 0.6932], [3, 0.756], [4, 0.7309]]
      }
    ]
    xLables = ['202009', '202010', '202011', '202012', '202101']
    this.d3LineChart.render(chartData, xLables);
  */
})