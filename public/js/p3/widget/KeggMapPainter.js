define(['d3/d3'], function (d3) {

  this.PathwayPainter = function () {
    return {
      colorSet: {
        AllConserved: '#BEFDBE',
        NotAllConserved: '#D5E6D5',
        Selected: '#99CCFF',
        Clicked: '#FF0000',
        Black: '#000000',
        Default: '#FFFFFF'
      },
      data: [],
      tooltipLayer: null,
      currentAnnotation: null,
      currentAnnotationCount: 0,

      setCurrent: function (annotation, count) {
        this.currentAnnotation = annotation;
        this.currentAnnotationCount = count;
      },

      paint: function () {
        var self = this;
        var svgContainer = d3.select('#map_div');
        var colorSet = this.colorSet;

        if (!self.tooltipLayer) {
          self.tooltipLayer = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
        }

        svgContainer.selectAll('rect')
          .data(self.data).enter().append('rect')
          .attr('x', function (d) {
            return d.coordinates.x + 1;
          })
          .attr('y', function (d) {
            return d.coordinates.y + 1;
          })
          .attr('width', 45)
          .attr('height', 16)
          .style('fill', function (d) {
            // console.log(d.type, d[annotation], d.clicked, d.selected);
            if (d.type === 'ec' && d[self.currentAnnotation]) {
              if (d.clicked) {
                return colorSet.Clicked;
              } else if (d.selected) {
                return colorSet.Selected;
              }
              return (d.genome_count[self.currentAnnotation] < self.currentAnnotationCount) ? colorSet.NotAllConserved : colorSet.AllConserved;

            }
            return colorSet.Default;

          });

        svgContainer.selectAll('text')
          .data(self.data).enter().append('text')
          .attr('x', function (d) {
            return d.coordinates.x + 3;
          })
          .attr('y', function (d) {
            return d.coordinates.y + 13;
          })
          .attr('font-size', '10px')
          .text(function (d) {
            return d.name;
          })
          .on('mouseover', function (d) {
            self.tooltipLayer.transition()
              .duration(200)
              .style('opacity', 0.95);
            self.tooltipLayer.html(d.name + '<br>' + d.description)
              .style('left', d3.event.pageX + 'px')
              .style('top', (d3.event.pageY - 28) + 'px');
          })
          .on('mouseout', function () {
            self.tooltipLayer.transition()
              .duration(500)
              .style('opacity', 0);
          });
      },

      clear: function () {
        d3.select('#map_div').selectAll('*').remove();
      },

      export_to_svg: function () {
        return d3.select('#map_wrapper')
          .attr('version', 1.1)
          .attr('xmlns', 'http://www.w3.org/2000/svg')
          .node().parentNode.innerHTML;
      },

      highlight: function (keys) {

        this.data.forEach(function (d) {
          d.clicked = (keys.indexOf(d.name) > -1);
        });

        this.clear();
        this.paint();
      }
    };
  };

  this.boxData = function (options) {
    this.type = options.type || 'ec';
    this.clicked = false;
    this.selected = false;
    this.name = options.ec_number || null;
    this.description = options.ec_description || null;
    this.coordinates = { x: options.x, y: options.y };
    this.genome_count = { RefSeq: 0, PATRIC: 0 };
    this.RefSeq = (options.algorithm === 'RefSeq');
    this.PATRIC = (options.algorithm === 'PATRIC');
  };

  return this;
});
