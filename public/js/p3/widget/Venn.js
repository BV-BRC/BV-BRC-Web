define([
], function () {
  window.GroupCompare = {
    GroupCompare: function (config) {
      // var panelHeight = 400;
      // var panelWidth = 500;
      // var altitudeFactor = 0.866; //0.5*sqrt(3) - to get height of equilateral triangle
      var radius = 100;
      var radiusSquared = radius * radius; // to make distance calculations faster, squaring radius once instead of doing lots of sqrt()
      var memberHash = [];
      var regions = []; // maps from region bit mask to a Region Object, which includes the groups and members represented by that region.
      var vennPanelId = config.vennPanel;
      // var displayCountsByDefault = config.displayCountsByDefault;
      var selectedMembers = [];
      var selectedRegions = [];
      var listeners = [];
      var groups = [];
      var svg = null;

      if (config.groups) {
        for (var i = 0, ilen = config.groups.length; i < ilen; ++i) {
          this.addGroup(config.groups[i]);
        }
      }

      this.addGroup = function (group) {
        if (group.members && group.name) {
          group.index = groups.length;
          groups.push(group);
          groups[group.name] = group;
          for (var i = 0, ilen = group.members.length; i < ilen; ++i) {
            if (!memberHash[group.members[i]]) {
              memberHash[group.members[i]] = 0;
            }
            memberHash[group.members[i]] |= 1 << group.index;
          }
        }
        console.log('in Venn.js, addGroup, groups=', groups);
      };

      // Creates a bit mask, with set bits for the indices of included groups
      var createMask = function (includeGroups) {
        var mask = 0;
        if (includeGroups) {
          for (var i = 0, ilen = includeGroups.length; i < ilen; ++i) {
            if (includeGroups[i].index || typeof includeGroups[i].index != 'undefined') {
              // if the groups are passed in
              mask |= 1 << includeGroups[i].index;
            } else {
              // if the names of the groups are passed in
              mask |= 1 << groups[includeGroups[i]].index;
            }
          }
        }
        // console.log("printing mask: ");
        // console.log(mask);
        // console.log("end createMask, includeGroup:");
        // console.log(includeGroups);
        return mask;
      };

      // returns an array of members for the region represented by the mask
      var getMatchingMembers = function (mask) {
        var r = [];
        console.log('In getMatchedMembers, mask=' + mask);
        console.log(regions[mask]);

        if (regions[mask] && regions[mask].members) {
          // members for this region have already been calculated and cached
          // console.log("using cached result for members of region");
          r = regions[mask].members;
        } else {
          r = [];
          for (var k in memberHash) {
            if (memberHash[k] == mask) {
              r.push(k);
            }
          }
          // cache result for future use
          if (!regions[mask]) {
            regions[mask] = {};
          }
          regions[mask].members = r;
        }
        console.log('End getMatchedMembers, mask=' + mask);
        console.log(regions[mask]);
        console.log('member Ids and Masks:');
        console.log(memberHash);
        console.log(r);
        return r;
      };

      // var arraysEqual = function (a, b) {
      //   var r = ((a.length == b.length));
      //   for (var i = 0, ilen = a.length; r && i < ilen; ++i) {
      //     r = a[i] == b[i];
      //   }
      //   return r;
      // };

      this.createDisplayTwo = function () {
        var vennPanel = d3.select('#' + vennPanelId);
        vennPanel.classed('venn_panel', true);
        console.log('vennPanel:', vennPanel);
        console.log('vennPanel height: ' + vennPanel.style('height'));

        svg = vennPanel.append('svg')
        // viewBox doesn't work for downloading PNG in Firefox
          .attr('viewBox', '0 0 400 400').attr('preserveAspectRatio', 'xMinYMin meet');
        var vennCenterX = 200;
        var vennCenterY = 200;

        // center points and radii for two circles.
        groups[0].x = vennCenterX - radius / 2;
        groups[0].y = vennCenterY;
        groups[1].x = vennCenterX + radius / 2;
        groups[1].y = vennCenterY;

        // points for number labels
        groups[0].labelX = groups[0].x - radius / 2;
        groups[0].labelY = groups[0].y;
        groups[1].labelX = groups[1].x + radius / 2;
        groups[1].labelY = groups[1].y;

        var region_name;
        var defs = svg.append('svg:defs');
        // console.log("defs:", defs);

        defs.append('svg:circle').attr('id', 'g0').attr('cx', '' + groups[0].x).attr('cy', '' + groups[0].y)
          .attr('r', '' + radius);
        defs.append('svg:circle').attr('id', 'g1').attr('cx', '' + groups[1].x).attr('cy', '' + groups[1].y)
          .attr('r', '' + radius);

        // A clipPath is needed to get the center region: the intersection of two circles.
        // The other regions are all done with masks.
        // It would probably be better to do it with more clipPaths and fewer masks, because clipPath
        // is apparently more efficient than mask, but masks are getting it done.
        defs.append('clipPath').attr('id', 'c0p1').append('use').attr('xlink:href', '#g1');

        // define masks.
        // Anything under a 'white' area of a mask is opaque/visible.
        // Anything under a 'black' area of a mask is transparent/hidden.

        // mask for 0+1
        defs.append('mask').attr('id', 'm0p1').append('svg:use').attr('xlink:href', '#g1')
          .style('fill', 'white');

        // mask for 0-1
        var m0m1 = defs.append('mask').attr('id', 'm0m1');
        m0m1.append('svg:use').attr('xlink:href', '#g0').style('fill', 'white');
        m0m1.append('svg:use').attr('xlink:href', '#g1').style('fill', 'black');

        // mask for 1-0
        region_name = '(' + groups[1].name + ') - (' + groups[0].name + ')';
        var m1m0 = defs.append('mask').attr('id', 'm1m0');
        m1m0.append('svg:use').attr('xlink:href', '#g1').style('fill', 'white');
        m1m0.append('svg:use').attr('xlink:href', '#g0').style('fill', 'black');

        // draw circles
        svg.append('use').attr('id', 'g0_circle').attr('xlink:href', '#g0').classed('venn_circle_color1', 'true');
        svg.append('use').attr('id', 'g1_circle').attr('xlink:href', '#g1').classed('venn_circle_color2', 'true');

        // region for 0-1
        region_name = '(' + groups[0].name + ') - (' + groups[1].name + ')';
        var region = svg.append('use').attr('id', 'r0m1').attr('xlink:href', '#g0').attr('mask', 'url(#m0m1)')
          .attr('name', region_name)
          .classed('venn_region', 'true')
          .classed('active', false);
        var regionBitMask = createMask([groups[0]]);
        var members = getMatchingMembers(regionBitMask);
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0]]
        };
        // console.log(regions);

        // region for 1-0
        region_name = '(' + groups[1].name + ') - (' + groups[0].name + ')';
        region = svg.append('use').attr('id', 'r1m0').attr('xlink:href', '#g1').attr('mask', 'url(#m1m0)')
          .attr('name', region_name)
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[1]]);
        members = getMatchingMembers(regionBitMask);
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[1]]
        };
        console.log(regions);

        // region for 0+1
        region_name = '(' + groups[0].name + ') + (' + groups[1].name + ')';
        region = svg.append('use').attr('id', 'r0p1').attr('xlink:href', '#g0').attr('clip-path', 'url(#c0p1)')
          .attr('mask', 'url(#m0p1)')
          .attr(
            'name',
            region_name
          )
          .classed('venn_region', 'true')
          .classed('active', false);

        regionBitMask = createMask([groups[0], groups[1]]);
        members = getMatchingMembers(regionBitMask);
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0], groups[1]]
        };
        regions[0] = undefined;

        // console.log("after createMask and match group, show regions");
        // console.log(regions);

        // draw circle stroke
        svg.append('use').attr('id', 'g0_stroke').attr('xlink:href', '#g0').classed('venn_circle_stroke', 'true');

        svg.append('use').attr('id', 'g1_stroke').attr('xlink:href', '#g1').classed('venn_circle_stroke', 'true');

        // add region labels for counts
        for (var i = 0; i < 4; ++i) {
          svg.append('svg:text').attr('class', 'region_label');
        }
        var regionLabels = d3.selectAll('.region_label');
        regionLabels.data(regions);

        regionLabels.text(function (d) {
          var r = '';
          if (d) {
            r = d.members.length;
          }
          return r;
        }).attr('x', function (d) {
          var r = -100;
          if (d) {
            if (d.groups.length == 1) {
              r = d.groups[0].labelX;
            } else if (d.groups.length == 2) {
              r = (d.groups[0].labelX + d.groups[1].labelX) / 2;
            } else if (d.groups.length == 3) {
              r = vennCenterX;
            }
          }
          return r;
        }).attr('y', function (d) {
          var r = -100;
          if (d) {
            if (d.groups.length == 1) {
              r = d.groups[0].labelY;
            } else if (d.groups.length == 2) {
              r = (d.groups[0].labelY + d.groups[1].labelY) / 2;
            } else if (d.groups.length == 3) {
              r = vennCenterY;
            }
          }
          return r;
        }).call(d3.behavior.drag().on('drag', dragLabel))
          .on('click', function () {
            vennClicked();
          });

        // console.log("regionBitMask=" + regionBitMask);

        // add circle labels for group names
        svg.append('svg:text').attr('class', 'circle_label').text(groups[0].name + ' (' + groups[0].members.length + ')').attr('x', groups[0].x)
          .attr('y', groups[0].y - radius);
        svg.append('svg:text').attr('class', 'circle_label').text(groups[1].name + ' (' + groups[1].members.length + ')').attr('x', groups[1].x)
          .attr('y', groups[1].y + radius);

        // adjust x coord of circle labels
        var circleLabels = d3.selectAll('.circle_label');
        circleLabels.data(groups);
        circleLabels.attr('x', function (d) {
          var r = d.x;
          // the bottom right circle text is already placed correctly
          if (r == vennCenterX) {
            // it's the top circle - center the text
            r -= (this.getBBox().width / 2);
          } else if (r < vennCenterX) {
            // it's the bottom left circle - put text to the left
            r -= this.getBBox().width;
          }
          return r;
        }).attr('y', function (d) {
          var r = d.y;
          var bumper = 5;
          if (r < vennCenterY) {
            // top circle - move the label up above the circle
            r -= radius + bumper;
          } else {
            // one of the lower circles. drop the label down below the circles
            r += radius + this.getBBox().height + bumper;
          }
          return r;
        }).call(d3.behavior.drag().on('drag', dragLabel));

        svg.on('click', function () {
          vennClicked();
        });
      };

      // Display for 3 groups
      this.createDisplay = function () {
        var vennPanel = d3.select('#' + vennPanelId);
        vennPanel.classed('venn_panel', true);
        // console.log("vennPanel:", vennPanel);
        // console.log("vennPanel height: " + vennPanel.style("height"));

        var altitude = radius * 0.866; // height of the equilateral triangle formed by the three center points. sqrt(3)/2 ~= 0.866
        svg = vennPanel.append('svg').attr('viewBox', '0 0 400 400').attr('preserveAspectRatio', 'xMinYMin meet');
        var vennCenterX = 200;
        var vennCenterY = 200;

        // center points and radii for the three triangles - hard coding for three for now.
        groups[0].x = vennCenterX;
        groups[0].y = vennCenterY - radius / 2;
        groups[1].x = vennCenterX - radius / 2;
        groups[1].y = vennCenterY + altitude / 2;
        groups[2].x = vennCenterX + radius / 2;
        groups[2].y = vennCenterY + altitude / 2;

        // points for number labels
        groups[0].labelX = groups[0].x;
        groups[0].labelY = groups[0].y - radius / 2;
        groups[1].labelX = groups[1].x - radius / 2;
        groups[1].labelY = groups[1].y + radius / 2;
        groups[2].labelX = groups[2].x + radius / 2;
        groups[2].labelY = groups[2].y + radius / 2;

        var defs = svg.append('svg:defs');
        // console.log("defs:", defs);

        defs.append('svg:circle').attr('id', 'g0').attr('cx', '' + groups[0].x).attr('cy', '' + groups[0].y)
          .attr('r', '' + radius);
        defs.append('svg:circle').attr('id', 'g1').attr('cx', '' + groups[1].x).attr('cy', '' + groups[1].y)
          .attr('r', '' + radius);
        defs.append('svg:circle').attr('id', 'g2').attr('cx', '' + groups[2].x).attr('cy', '' + groups[2].y)
          .attr('r', '' + radius);

        // A clipPath is needed to get the center region: the intersection of all three circles.
        // The other regions are all done with masks.
        // It would probably be better to do it with more clipPaths and fewer masks, because clipPath
        // is apparently more efficient than mask, but masks are getting it done.
        defs.append('clipPath').attr('id', 'c0p1p2').append('use').attr('xlink:href', '#g1');

        // define masks.
        // Anything under a 'white' area of a mask is opaque/visible.
        // Anything under a 'black' area of a mask is transparent/hidden.

        // mask for 0+1+2
        defs.append('mask').attr('id', 'm0p1p2').append('svg:use').attr('xlink:href', '#g2')
          .style('fill', 'white');

        // mask for 0-1-2
        var m0m1m2 = defs.append('mask').attr('id', 'm0m1m2');

        m0m1m2.append('svg:use').attr('xlink:href', '#g0').style('fill', 'white');
        m0m1m2.append('svg:use').attr('xlink:href', '#g1').style('fill', 'black');
        m0m1m2.append('svg:use').attr('xlink:href', '#g2').style('fill', 'black');

        // mask for 1-0-2
        var m1m0m2 = defs.append('mask').attr('id', 'm1m0m2');

        m1m0m2.append('svg:use').attr('xlink:href', '#g1').style('fill', 'white');
        m1m0m2.append('svg:use').attr('xlink:href', '#g0').style('fill', 'black');
        m1m0m2.append('svg:use').attr('xlink:href', '#g2').style('fill', 'black');

        // mask for 2-0-1
        var m2m0m1 = defs.append('mask').attr('id', 'm2m0m1');
        m2m0m1.append('svg:use').attr('xlink:href', '#g2').style('fill', 'white');
        m2m0m1.append('svg:use').attr('xlink:href', '#g0').style('fill', 'black');
        m2m0m1.append('svg:use').attr('xlink:href', '#g1').style('fill', 'black');

        // mask for 0+1-2
        var m0p1m2 = defs.append('mask').attr('id', 'm0p1m2');
        m0p1m2.append('svg:use').attr('xlink:href', '#g1').style('fill', 'white');
        m0p1m2.append('svg:use').attr('xlink:href', '#g2').style('fill', 'black');

        // mask for 0+2-1
        var m0p2m1 = defs.append('mask').attr('id', 'm0p2m1');
        m0p2m1.append('svg:use').attr('xlink:href', '#g2').style('fill', 'white');
        m0p2m1.append('svg:use').attr('xlink:href', '#g1').style('fill', 'black');

        // mask for 1+2-0
        var m1p2m0 = defs.append('mask').attr('id', 'm1p2m0');
        m1p2m0.append('svg:use').attr('xlink:href', '#g2').style('fill', 'white');
        m1p2m0.append('svg:use').attr('xlink:href', '#g0').style('fill', 'black');

        // draw circles
        svg.append('use').attr('id', 'g0_circle').attr('xlink:href', '#g0').classed('venn_circle_color1', 'true');
        svg.append('use').attr('id', 'g1_circle').attr('xlink:href', '#g1').classed('venn_circle_color2', 'true');
        svg.append('use').attr('id', 'g2_circle').attr('xlink:href', '#g2').classed('venn_circle_color3', 'true');

        // svg.append("svg:text").attr("class","circle_label");
        /*
        * var region = svg.append("use") .attr("id", "blank") .attr("xlink:href", "#g0") .style("display", "none") .classed("venn_region", "true")
        * .classed("active", false) ;
        */

        // region for 0-1-2
        var region = svg.append('use').attr('id', 'r0m1m2').attr('xlink:href', '#g0').attr('mask', 'url(#m0m1m2)')
          .classed('venn_region', 'true')
          .classed('active', false);
        var regionBitMask = createMask([groups[0]]);
        var members = getMatchingMembers(regionBitMask);
        var region_name = '(' + groups[0].name + ') - (' + groups[1].name + ') - (' + groups[2].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0]]
        };
        // console.log(regions);

        // region for 1-0-2
        region = svg.append('use').attr('id', 'r1m0m2').attr('xlink:href', '#g1').attr('mask', 'url(#m1m0m2)')
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[1]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[1].name + ') - (' + groups[0].name + ') - (' + groups[2].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[1]]
        };
        // console.log(regions);

        // region for 2-0-1
        region = svg.append('use').attr('id', 'r2m0m1').attr('xlink:href', '#g2').attr('mask', 'url(#m2m0m1)')
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[2]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[2].name + ') - (' + groups[0].name + ') - (' + groups[1].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[2]]
        };
        // console.log(regions);

        // region for 0+1-2
        region = svg.append('use').attr('id', 'r0p1m2').attr('xlink:href', '#g0').attr('mask', 'url(#m0p1m2)')
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[0], groups[1]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[0].name + ') + (' + groups[1].name + ') - (' + groups[2].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0], groups[1]]
        };
        // console.log(regions);

        // region for 0+2-1
        region = svg.append('use').attr('id', 'r0p2m1').attr('xlink:href', '#g0').attr('mask', 'url(#m0p2m1)')
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[0], groups[2]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[0].name + ') + (' + groups[2].name + ') - (' + groups[1].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0], groups[2]]
        };
        // console.log(regions);

        // region for 1+2-0
        region = svg.append('use').attr('id', 'r1p2m0').attr('xlink:href', '#g1').attr('mask', 'url(#m1p2m0)')
          .classed('venn_region', 'true')
          .classed('active', false);
        regionBitMask = createMask([groups[1], groups[2]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[1].name + ') + (' + groups[2].name + ') - (' + groups[0].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[1], groups[2]]
        };
        // console.log(regions);

        // region for 0+1+2
        region = svg.append('use').attr('id', 'r0p1p2').attr('xlink:href', '#g0').attr('clip-path', 'url(#c0p1p2)')
          .attr('mask', 'url(#m0p1p2)')
          .classed('venn_region', 'true')
          .classed('active', false);

        regionBitMask = createMask([groups[0], groups[1], groups[2]]);
        members = getMatchingMembers(regionBitMask);
        region_name = '(' + groups[0].name + ') + (' + groups[1].name + ') + (' + groups[2].name + ')';
        regions[regionBitMask] = {
          region: region,
          region_name: region_name,
          region_mask: regionBitMask,
          members: members,
          groups: [groups[0], groups[1], groups[2]]
        };
        regions[0] = undefined;

        // draw circle stroke
        svg.append('use').attr('id', 'g0_stroke').attr('xlink:href', '#g0').classed('venn_circle_stroke', 'true');
        svg.append('use').attr('id', 'g1_stroke').attr('xlink:href', '#g1').classed('venn_circle_stroke', 'true');
        svg.append('use').attr('id', 'g2_stroke').attr('xlink:href', '#g2').classed('venn_circle_stroke', 'true');

        // add region labels for counts
        for (var i = 0; i < 8; ++i) {
          svg.append('svg:text').attr('class', 'region_label');
        }
        var regionLabels = d3.selectAll('.region_label');
        regionLabels.data(regions);

        regionLabels.text(function (d) {
          var r = '';
          if (d) {
            r = d.members.length;
          }
          return r;
        }).attr('x', function (d) {
          var r = -100;
          if (d) {
            if (d.groups.length == 1) {
              r = d.groups[0].labelX;
            } else if (d.groups.length == 2) {
              r = (d.groups[0].labelX + d.groups[1].labelX) / 2;
            } else if (d.groups.length == 3) {
              r = vennCenterX;
            }
          }
          return r;
        }).attr('y', function (d) {
          var r = -100;
          if (d) {
            if (d.groups.length == 1) {
              r = d.groups[0].labelY;
            } else if (d.groups.length == 2) {
              r = (d.groups[0].labelY + d.groups[1].labelY) / 2;
            } else if (d.groups.length == 3) {
              r = vennCenterY;
            }
          }
          return r;
        }).call(d3.behavior.drag().on('drag', dragLabel))
          .on('click', function () {
            vennClicked();
          });

        // add circle labels for group names
        svg.append('svg:text').attr('class', 'circle_label').text(groups[0].name + ' (' + groups[0].members.length + ')').attr('x', groups[0].x)
          .attr('y', groups[0].y - radius);
        svg.append('svg:text').attr('class', 'circle_label').text(groups[1].name + ' (' + groups[1].members.length + ')').attr('x', groups[1].x)
          .attr('y', groups[1].y + radius);
        svg.append('svg:text').attr('class', 'circle_label').text(groups[2].name + ' (' + groups[2].members.length + ')').attr('x', groups[2].x)
          .attr('y', groups[2].y + radius);

        // adjust x coord of circle labels
        var circleLabels = d3.selectAll('.circle_label');
        circleLabels.data(groups);
        circleLabels.attr('x', function (d) {
          var r = d.x;
          // the bottom right circle text is already placed correctly
          if (r == vennCenterX) {
            // it's the top circle - center the text
            r -= (this.getBBox().width / 2);
          } else if (r < vennCenterX) {
            // it's the bottom left circle - put text to the left
            r -= this.getBBox().width;
          }
          return r;
        }).attr('y', function (d) {
          var r = d.y;
          var bumper = 5;
          if (r < vennCenterY) {
            // top circle - move the label up above the circle
            r -= radius + bumper;
          } else {
            // one of the lower circles. drop the label down below the circles
            r += radius + this.getBBox().height + bumper;
          }
          return r;
        }).call(d3.behavior.drag().on('drag', dragLabel));

        svg.on('click', function () {
          vennClicked();
        });
      };

      var dragLabel = function () {
        this.parentNode.appendChild(this);
        var dragTarget = d3.select(this);
        dragTarget.attr('x', function () {
          return d3.event.dx + parseInt(dragTarget.attr('x'));
        }).attr('y', function () {
          return d3.event.dy + parseInt(dragTarget.attr('y'));
        });

      };

      var vennClicked = function () {
        // console.log(d3.event);
        var clickX = d3.event.clientX;
        var clickY = d3.event.clientY;
        var modKeyPressed = d3.event.ctrlKey | d3.event.metaKey;

        var screenPoint = svg[0][0].createSVGPoint();
        screenPoint.x = clickX;
        screenPoint.y = clickY;
        var ctm = svg[0][0].getScreenCTM();
        var svgPoint = screenPoint.matrixTransform(ctm.inverse());
        clickX = svgPoint.x;
        clickY = svgPoint.y;

        // check each group to see if the point is within the circle for the group
        var matchingGroups = [];
        for (var i = 0, ilen = groups.length; i < ilen; ++i) {
          var xdiff = Math.abs(groups[i].x - clickX);
          var ydiff = Math.abs(groups[i].y - clickY);
          if (xdiff * xdiff + ydiff * ydiff < radiusSquared) {
            matchingGroups.push(groups[i]);
          }
        }

        if (matchingGroups.length == 0) {
          // click was not within a circle - deselect everything
          deselectAllRegions();
          // fireChangeEvent();
        } else {
          // click was in a at least one circle
          // console.log("matchingGroups: " + matchingGroups.length);
          var mask = createMask(matchingGroups);
          // console.log("mask: " + mask);
          var clickedRegion = regions[mask];
          // console.log("clickedRegion:");
          // console.log(clickedRegion);
          if (modKeyPressed) {
            // if modifier key was pressed, keep all current selection, except toggle the selection state of the clicked region
            var clickedRegionWasSelected = clickedRegion.region.classed('active');
            // console.log("clickedRegionWasSelected: " + clickedRegionWasSelected);
            clickedRegion.region.classed('active', !clickedRegionWasSelected);
          } else {
            // if modifier key was not pressed, deselect everything, then select the clicked region
            deselectAllRegions();
            clickedRegion.region.classed('active', true);
          }

          if (clickedRegion.region.classed('active')) {
            // console.log("clicked region is selected now");
            selectedRegions.push(clickedRegion);
            // console.log(selectedRegions);
          } else {
            selectedRegions.splice(selectedRegions.indexOf(clickedRegion), 1);
          }
        }

        // reset selectedMembers
        selectedMembers = [];
        for (var i = 0, ilen = selectedRegions.length; i < ilen; ++i) {
          selectedMembers.push.apply(selectedMembers, selectedRegions[i].members);
          // console.log("Reset selected members");
          // console.log(selectedMembers);
        }
        fireChangeEvent();
      };

      var deselectAllRegions = function () {
        // de-select any currently selected regions
        for (var i = 0, ilen = selectedRegions.length; i < ilen; ++i) {
          var inactiveRegion = selectedRegions[i];
          inactiveRegion.region.classed('active', false);
        }
        selectedRegions = [];
        selectedMembers = [];
      };

      this.getSelectedMembers = function () {
        return selectedMembers;
      };

      this.getSelectedRegions = function () {
        return selectedRegions;
      };

      this.getGroups = function () {
        return groups;
      };

      this.addSelectionListener = function (listener) {
        if (listener) {
          listeners.push(listener);
        }
      };

      this.removeSelectionListener = function (listener) {
        var index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      };

      var fireChangeEvent = function () {
        for (var i = 0, ilen = listeners.length; i < ilen; ++i) {
          listeners[i]();
        }
      };
    }
  };

  return window.GroupCompare;
});
