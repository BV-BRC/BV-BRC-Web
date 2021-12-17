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
    init: function (target) {
      this.node = domConstruct.place('<div class="chart"></div>', target, 'only');

      this.nodeWidth = parseInt(domStyle.get(this.node, 'width'));

      this.canvas = d3.select('.chart')
        .insert('svg', ':first-child')
        .attr('preserveAspectRatio', 'xMidYMid meet');

      if (d3.select('div.tooltip')[0][0]) {
        this.tooltipLayer = d3.select('div.tooltip');
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('opacity', 0);
      }
    },
    render: function (data) {

      var totalRange = data.lastEndPosition - data.firstStartPosition;
      var pin = data.pin;

      var canvasHeight,
        canvasWidth = this.nodeWidth - 10;
      var trackHeight = 29;

      var x_scale = d3.scale.linear().range([0, canvasWidth]).domain([0, totalRange]);

      // allocate groups
      var groups = [];
      var overlapPadding = 100;

      groups.push({ m: [], max: 0 });

      data.features.forEach(function (d) {
        for (var gIdx = 0; gIdx < groups.length; gIdx++) {
          var g = groups[gIdx];
          if (g.max === 0) {
            // insert. init
            g.m.push(d);
            g.max = d.end + overlapPadding;
            break;
          }

          if (d.start <= g.max) {
            // seek another group or create another group
            if (groups.length === gIdx + 1) {
              groups.push({ m: [], max: 0 });
            }
          }
          else {
            // insert data in current group
            g.m.push(d);
            g.max = d.end + overlapPadding;
            break;
          }
        }
      });
      // console.log(data);
      // console.log(groups);

      canvasHeight = 20 + trackHeight * (groups.length + 1);

      // add 10px padding for viewBox
      this.canvas.attr('viewBox', '-10 0 ' + (this.nodeWidth + 10) + ' ' + canvasHeight);

      this.canvas.append('g')
        .attr('transform', 'translate(0, 20)')
        .attr('class', 'track')
        .append('polyline')
        .attr('points', function () {
          return lang.replace('0 -3 0 3 0 0 {0} 0 {0} 3 {0} -3', [canvasWidth]);
        })
        .attr('fill', 'none')
        .attr('stroke', 'black');

      this.canvas.select('g.track')
        .append('text')
        .text(data.firstStartPosition)
        .attr('x', 0)
        .attr('y', -7);

      this.canvas.select('g.track')
        .append('text')
        .text(data.lastEndPosition)
        .attr('x', (canvasWidth) - ('' + data.lastEndPosition).length * 7)
        .attr('y', -7);

      this.canvas.select('g.track')
        .append('text')
        .text(data.accession)
        .attr('x', (canvasWidth / 2) - (data.accession.length * 7) / 2)
        .attr('y', -7);

      groups.forEach(function (g, gIdx) {

        this.canvas.append('g')
          .attr('transform', function () {
            return 'translate(0, ' + (20 + (gIdx + 1) * trackHeight) + ')';
          })
          .attr('class', 'g' + gIdx)
          .selectAll('g')
          .data(g.m)
          .enter()
          .append('polyline')
          .attr('points', function (d) {
            // console.log(d);
            var start,
              middle,
              end;
            var length = x_scale(d.na_length);
            var arrowHeadWidth = Math.min(length / 2, 8);

            if (d.strand == '+') {
              start = x_scale(d.start - data.firstStartPosition);
              middle = start + length - arrowHeadWidth;
              end = start + length;
            } else {
              start = x_scale(d.end - data.firstStartPosition);
              middle = start - length + arrowHeadWidth;
              end = start - length;
            }

            var pos = [];
            pos.push(start);
            pos.push(-4);
            pos.push(start);
            pos.push(4);
            pos.push(middle);
            pos.push(4);
            pos.push(middle);
            pos.push(7);
            pos.push(end);
            pos.push(0);
            pos.push(middle);
            pos.push(-7);
            pos.push(middle);
            pos.push(-4);
            pos.push(start);
            pos.push(-4);

            return pos.join(' ');
          })
          .attr('fill', function (d) {
            return (d.feature_id === pin) ? '#E53935' : '#1976D2';
          })
          .on('click', function (d) {
            var url = '/view/Feature/' + d.feature_id + '#view_tab=overview';
            Topic.publish('/navigate', { href: url });
          })
          .on('mouseover', lang.hitch(this, function (d) {
            this.tooltipLayer.transition()
              .duration(200)
              .style('opacity', 0.95);

            var content = [];
            (d.patric_id) ? content.push('BRC ID: ' + d.patric_id) : {};
            (d.refseq_locus_tag) ? content.push('RefSeq Locus tag: ' + d.refseq_locus_tag) : {};
            (d.gene) ? content.push('Gene: ' + d.gene) : {};
            (d.product) ? content.push('Product: ' + d.product) : {};
            content.push('Feature type: ' + d.feature_type);
            content.push('Location: ' + d.start + '...' + d.end + ' (' + d.na_length + ' bp, ' + d.strand + ')');

            this.tooltipLayer.html(content.join('<br/>'))
              .style('left', d3.event.pageX + 'px')
              .style('top', d3.event.pageY + 'px');
          }))
          .on('mouseout', lang.hitch(this, function () {
            this.tooltipLayer.transition()
              .duration(500)
              .style('opacity', 0);
          }));

        this.canvas.select('g.g' + gIdx)
          .selectAll('text')
          .data(g.m)
          .enter()
          .append('text')
          .text(function (d) {
            return d.gene;
          })
          .attr('y', -9)
          .attr('x', function (d) {
            return x_scale(d.start - data.firstStartPosition + d.na_length / 2) - 15;
          });

      }, this);
    }
  });
});
