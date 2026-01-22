define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojox/gfx', 'dojox/gfx/utils',
  'dijit/Tooltip', 'dijit/popup', 'dijit/TooltipDialog', 'dijit/Menu', 'dijit/Dialog',
  'dojo/dom', 'dojo/on', 'dojo/dom-style', 'dojo/dom-construct', 'dojo/query', 'dojo/topic', 'dojo/request', 'dojo/Evented',
  './DataItemFormatter', '../util/PathJoin',
  'dojo/domReady!'
], function (
  declare, lang,
  gfx, gfx_utils,
  Tooltip, popup, TooltipDialog, Menu, Dialog,
  dom, on, domStyle, domConstruct, query, Topic, request, Evented,
  DataItemFormatter, PathJoin
) {

  return declare([Evented], {
    /**
     * Viewport sizes. We have a default height here; the actual height is
     * adjusted after rendering (it is dependent on the number of rows we generate).
     */
    viewport_width: null,
    viewport_default_height: 2000,
    canvas_width: null,
    canvas_offset: null,
    name_width: 250,
    name_gutter: 10,
    name_front_margin: 5,
    row_height: 30,
    compare_top_height: 20,

    container: null,
    seed_service: null,

    surface: null,
    name_group: null,
    compare_group: null,

    palette: null,
    data: null,
    target_div: null,
    sig: null, // Signal for the mouseout event that clears an active hover.
    // It is class state because when we pop up a menu, we need to
    // clear the hover.

    selected_fids: {},
    menu_create_callback: null,

    constructor: function (target_div, seed_service) {

      this.target_div = target_div;
      this.container = dom.byId(target_div);
      this.seed_service = seed_service;

      on(window, 'resize', function (evt) {
        // window.console.log("resize ", this.container.offsetLeft, this.container.offsetWidth);
        this.resize();
      }.bind(this));

      this.set_pane_sizes();
      this.init_panes();

    },

    set_palette: function (palette) {
      var spalette = [];
      var i;
      for (i = 0; i < palette.length; i++) {
        spalette[i] = 'rgb(' + palette[i][0] + ',' + palette[i][1] + ',' + palette[i][2] + ')';
      }
      this.palette = spalette;
    },

    /**
     * Set the sizes of our viewport and canvas based on the size
     * of the container and the settings for name and gutter width.
     * Invoked at startup and at window resize.
     */
    set_pane_sizes: function () {
      this.viewport_width = this.container.clientWidth;
      this.canvas_offset = this.name_width + this.name_gutter;
      this.canvas_width = this.viewport_width - this.canvas_offset;
      // window.console.log("pane sizes: vp_width=", this.viewport_width, " canvas_offset=", this.canvas_offset, " canvas_width=", this.canvas_width);
    },

    init_panes: function () {
      this.surface = gfx.createSurface(this.target_div, this.viewport_width, this.viewport_default_height);
      this.name_group = this.surface.createGroup();
      this.compare_group = this.surface.createGroup();

      this.set_group_transforms();
    },

    clear_panes: function () {
      this.compare_group.clear();
      this.name_group.clear();
    },

    set_group_transforms: function () {
      this.surface.setDimensions(this.viewport_width, this.viewport_default_height);
      this.compare_group.setTransform({ dx: this.canvas_offset, dy: 0 });
      this.name_group.setTransform({ dx: 0, dy: 0 });
    },

    resize: function () {
      this.set_pane_sizes();
      this.set_group_transforms();
      if (this.data) {
        this.render();
      }
    },

    exportSVG: function () {
      return gfx_utils.toSvg(this.surface);
    },

    set_data: function (data) {
      this.data = data;
    },

    testsave: function () {
      var def = gfx_utils.toJson(this.surface);

      var expIFrame;
      // if (strBrowser == "MSIE") expIFrame = document.exportiframe;
      expIFrame = window.framesexportiframe;
      var doc = expIFrame.document;
      doc.open('text/plain', 'replace');
      doc.charset = 'utf-8';
      doc.write(def);
      doc.close();
      var fileName = 'compare-region.svg';
      doc.execCommand('SaveAs', null, fileName);
    },

    render: function () {

      /**
      * Compute overall layout. This scheme is lifted from the similar layout
      * algorithm used in myRAST (RegionPanel.pm).
      *
      * Pin direction is the direction of the focus peg.
      *
      * For each track:
      *
      * track_min, track_max are min/max contig locations of the track.
      * (These are defined in the data block we start with - different than the myRAST code)
      *
      * Center of the track defined to be center of pinned peg. (Perhaps should be start?)
      *
      * If direction of pinned peg is different than direction of focus, track needs to be mirrored.
      *
      * Compute left and right offsets. These are the distance in contig coordinates
      * between the center and the minimum / maximum contig locations (track_min/max).
      *
      * Compute max and min offsets.
      *
      * Track origin for each track is defined as the track center - left offset
      *
      * Compute the contig_range, which is the sum of the max and min offsets.
      *
      * We may now compute the scale factor:
      *
      *  scale = window_size / contig_range
      *
      * We translate contig coordinates cx to window coordinates wx using
      *
      * if mirroring: cx = 2 * center - cx
      * wx = (cx - track_origin) * scale
      *
      * Window to contig is
      * cx = wx / scale  track_origin
      * if mirroring: cx = 2 * center - cx
      *
      */

      var data = this.data;

      this.clear_panes();
      this.set_pane_sizes();
      this.set_group_transforms();

      var pin_direction = data[0].pinned_peg_strand;
      // var pin_direction = "+";
      var max_offset,
        min_offset;
      var track_params = [];
      var intergenic_count = 0;
      for (var rowi = 0; rowi < data.length; rowi++) {
        var row = data[rowi];

        var endpoints = [];

        var track_min = row.beg;
        var track_max = row.end;

        var pin_info;
        row.features.forEach(function (item) {
          if (item.fid === row.pinned_peg) {
            pin_info = item;
          }
          endpoints.push([item.fid, item.beg - 0, 1, item.contig]);
          endpoints.push([item.fid, item.end - 0, -1, item.contig]);
        });

        // Setting center as the pin end instead of the midpoint
        // causes the pin to align on the stop; this is potentially more correct.
        // var center = pin_info.end;
        // var center = row.mid;

        // Align on the computed reference point.
        var center = pin_info.reference_point;

        var mirror = pin_info.strand !== pin_direction;

        var left_offset = center - track_min;
        var right_offset = track_max - center;

        if (mirror) {
          var tmp = left_offset;
          left_offset = right_offset;
          right_offset = tmp;

        }
        // window.console.log(rowi, center, track_min, track_max, left_offset, right_offset);

        if (rowi == 0) {
          max_offset = right_offset;
          min_offset = left_offset;
        }
        // window.console.log("Row ", rowi, min_offset, max_offset);

        endpoints.sort(function (a, b) {
          return a[1] < b[1] ? -1 : ((a[1] > b[1]) ? 1 : 0);
        });
        var depth = 0;
        var beg_intergenic_id,
          beg_intergenic_pos;
        // var intergenic = [];
        endpoints.forEach(function (elt) {
          var peg = elt[0];
          var pos = elt[1];
          var val = elt[2];
          var contig = elt[3];

          depth += val;
          if (depth == 0) {
            beg_intergenic_id = peg;
            beg_intergenic_pos = pos + 1;
          }
          else if (depth == 1 && typeof (beg_intergenic_id) === 'string') {
            var ibeg = beg_intergenic_pos;
            var iend = pos - 1;

            if (iend - ibeg > 0) {
              // window.console.log("intergenic '" + beg_intergenic_id + "' " + ibeg + " " + iend);

              var feature = {
                fid: 'intergenic' + intergenic_count++,
                beg: ibeg,
                end: iend,
                size: iend - ibeg + 1,
                strand: '+',
                contig: contig,
                location: contig + '_' + ibeg + '_' + iend,
                'function': '',
                type: 'intergenic',
                attributes: []
              };
              row.features.push(feature);
            }
            beg_intergenic_id = undefined;
            beg_intergenic_pos = undefined;
          }
        });

        track_params[rowi] = {
          min: track_min,
          max: track_max,
          center: center,
          mirror: mirror,
          right_offset: right_offset,
          left_offset: left_offset
        };
      }

      max_offset += 100;
      min_offset += 100;

      var contig_range = max_offset + min_offset;

      this.min_offset = min_offset;

      var scale = this.canvas_width / contig_range;
      // window.console.log("computed scale", this.canvas_width, min_offset, contig_range, scale);
      this.scale = scale;

      /**
       * With all that taken care of, we may begin rendering.
       */
      var row_idx = 0;
      for (var rowi = 0; rowi < data.length; rowi++) {
        var data_row = data[rowi];
        var track_info = track_params[rowi];

        var what = this.add_row(rowi, data_row, track_info, row_idx);

        row_idx = what[1];
      }

      var vp_height = row_idx * this.row_height + this.compare_top_height;
      // console.log("set viewport height " + vp_height);
      domStyle.set(this.target_div, 'height', vp_height + 'px');
      this.surface.setDimensions(this.viewport_width, vp_height + 200);

      this.compare_group.setClip({
        x: 100 * scale,
        y: 0,
        width: this.canvas_width - 200 * scale,
        height: vp_height
      });
      this.name_group.setClip({
        x: 0, y: 0, width: this.name_width, height: vp_height
      });
    },

    make_arrow: function (parent, x1, x2, height) {
      var m = 15;
      // var w = x2 - x1;
      var back = Math.round(0.65 * height);

      var points;

      x2 = +x2;
      x1 = +x1;

      if (x1 < x2) {
        if (x2 - x1 > m) {
          points = [x1, -back,
            x1, back,
            x2 - m, back,
            x2 - m, height,
            x2, 0,
            x2 - m, -height,
            x2 - m, -back,
            x1, -back];
        }
        else {
          points = [x1, -height,
            x1, height,
            x2, 0,
            x1, -height];
        }

      }
      else {
        if (x1 - x2 > m) {
          points = [x1, -back,
            x1, back,
            x2 + m, back,
            x2 + m, height,
            x2, 0.0,
            x2 + m, -height,
            x2 + m, -back,
            x1, -back];
        }
        else {
          points = [x2, 0,
            x1, -height,
            x1, height,
            x2, 0];
        }
      }

      var p2 = [];

      for (var i = 0; i < points.length; i += 2) {
        p2.push({ x: Math.round(points[i]), y: Math.round(points[i + 1]) });
      }

      return parent.createPolyline(p2);
    },

    make_rect: function (parent, x1, x2, height, radius) {
      var dat = {
        y: -height,
        height: 2 * height
      };
      if (x1 < x2) {
        dat.x = x1;
        dat.width = x2 - x1;
      }
      else {
        dat.x = x2;
        dat.width = x1 - x2;
      }
      dat.r = radius;

      return parent.createRect(dat);
    },

    // Make a thin rounded rectangle for the blast hit
    make_blast_rect: function (parent, x1, x2, height) {
      var dat = {
        y: -(height * .5),
        height:  height
      };
      if (x1 < x2) {
        dat.x = x1;
        dat.width = x2 - x1;
      }
      else {
        dat.x = x2;
        dat.width = x1 - x2;
      }
      dat.r = height;

      return parent.createRect(dat);
    },

    // Make a thin rectangle for the pg feature
    make_pg_rect: function (parent, x1, x2, height) {
      var dat = {
        y: -(height * .5),
        height:  height
      };
      if (x1 < x2) {
        dat.x = x1;
        dat.width = x2 - x1;
      }
      else {
        dat.x = x2;
        dat.width = x1 - x2;
      }

      return parent.createRect(dat);
    },

    add_feature: function (row, row_data, x1, x2, height, color, feature, is_pin) {

      var glyph;

      // var make_bg = function () {
      //   // Draw a background highlight.
      //   var bg = this.make_rect(row, x1, x2, height + 4);
      //   bg.setFill('rgb(220,220,220)');
      // }.bind(this);

      // Skip active sites for now.
      if (feature.type == 'site_annotation')
      { return; }
      if (feature.type === 'peg' || feature.type === 'domain_hit') {
        // make_bg();
        glyph = this.make_arrow(row, x1, x2, height);
      }
      else if (feature.type === 'intergenic') {
        glyph = this.make_rect(row, x1, x2, height);
        color = 'rgb(240,240,240)';
      }
      else {
        if (feature.type === 'blast') {
          glyph = this.make_blast_rect(row, x1, x2, height);
          var sat = Math.trunc(feature.blast_identity);

          var rgb = this.hsvToRgb(0, sat, 100);

          color = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
          // console.log("have blast feature " + feature.blast_identity + " " + rgb + " " + color)
        }
	else if (feature.type === 'pseudogene') {
	  glyph = this.make_pg_rect(row, x1, x2, height);
	}
	else {
	  glyph = this.make_rect(row, x1, x2, height);
	}
	  
      }

      /**
       * Pinned features are red.
       */
      var pinned = 0;
      if (feature.fid == row_data.pinned_peg && typeof feature.blast_identity !== 'undefined') {
        var sat = Math.trunc(feature.blast_identity);

        var rgb = this.hsvToRgb(0, sat, 100);

        color = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
	pinned = 1;
      }

      if (feature.type !== 'intergenic') {
        if (typeof color === 'undefined') {
          glyph.setFill('gray');
          glyph.setStroke('black');
        }
        else {
          glyph.setFill(color);
          glyph.setStroke('black');

          if (this.selected_fids[feature.fid]) {
            glyph.setStroke({ width: 3, cap: 'round' });
          } else if (pinned) {
	    glyph.setStroke({ width: 2, cap: 'round' });
	  }

          if (typeof feature.set_number !== 'undefined') {
            var t = row.createText({ text: feature.set_number, align: 'center' });

            // t.setStroke("black");
            t.setFill('black');
            t.setTransform({
              dx: Math.round((x1 + x2) / 2), dy: -9, xx: 0.7, yy: 0.7
            });
          }
        }
      }

      // var bb = glyph.getTransformedBoundingBox();

      glyph.feature = feature;

      /**
       * Configure per-glyph event handlers.
       *
       * Click and doubleclick are re-emitted as events of the compare regions widget.
       * Mouseenter triggers hover.
       * Contextmenu triggers the popup menu.
       *
       * We use the global hover and a menu created at popup time.
       */

      /**
       * for singleclick selection, we want a delay to disambiguate from doubleclick.
       */

      var clickHandler = function (evt) {
        if (feature.fid && feature.fid.indexOf('.BLAST') > -1) {
          return;
        }

        var topicId = this.topicId;
        Topic.publish(topicId, 'showLoadingMask');
        request.get(PathJoin(window.App.dataServiceURL, '/genome_feature/?eq(patric_id,' + encodeURIComponent(feature.fid) + ')'), {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            Authorization: (window.App.authorizationToken || '')
          }
        }).then(function (data) {
          // console.log(data[0]);
          Topic.publish(topicId, 'hideLoadingMask');

          var content = DataItemFormatter(data[0], 'feature_data', { linkTitle: true });
          if (!window.featureDialog) {
            window.featureDialog = new Dialog({ title: 'Feature Summary' });
          }
          window.featureDialog.set('content', content);
          window.featureDialog.show();
        });
      };

      var dbClickHandler = function (evt) {
        Topic.publish('/navigate', { href: '/view/Feature/' + feature.fid + '#view_tab=compareRegionViewer' });
      };

      // check click events
      var multiClickHandler = function (handlers, delay) {
        var clicks = 0,
          timeout,
          delay = delay || 250;
        return function (e) {
          clicks++;
          clearTimeout(timeout);
          timeout = setTimeout(function () {
            if (handlers[clicks]) handlers[clicks](e);
            clicks = 0;
          }, delay);
        };
      };
      glyph.on('click', multiClickHandler({
        1: clickHandler,
        2: dbClickHandler
      }));

      var feature_info_str = this.create_hover_text(feature, row_data);
      var tooltipDiv = query('div.tooltip');
      if (tooltipDiv.length == 0) {
        this.tooltipLayer = domConstruct.create('div', {
          'class': 'tooltip',
          style: { opacity: 0 }
        }, query('body')[0], 'last');
      } else {
        this.tooltipLayer = tooltipDiv[0];
      }

      glyph.on('mouseenter', function (evt) {

        domStyle.set(this.tooltipLayer, 'left', evt.x + 'px');
        domStyle.set(this.tooltipLayer, 'top', evt.y + 'px');
        domStyle.set(this.tooltipLayer, 'opacity', 0.95);
        this.tooltipLayer.innerHTML = feature_info_str;
      }.bind(this));

      glyph.on('mouseout', function (evt) {
        domStyle.set(this.tooltipLayer, 'opacity', 0);
      }.bind(this));
    },

    create_hover_text: function (feature, row_data) {

      var feature_info = [
        ['PATRIC_ID', feature.fid],
        ['Product', feature['function']],
        ['Location', feature.beg + '...' + feature.end + ' (' + feature.size + 'bp, ' + (feature.strand || '') + ')']];

      return feature_info.map(function (line) {
        return line.join(': ');
      }).join('<br/>');
    },

    create_hover_text_ori: function (feature, row_data) {
      var start = feature.beg;
      var stop = feature.end;
      var size = feature.size + ' bp';
      if (feature.type === 'peg' || feature.type === 'domain_hit') {
        size = size + ' ' + feature.size / 3 + ' aa';
      }
      var feature_info = [['ID', feature.fid],
        ['Genome', row_data.org_name],
        ['Function', feature['function'] != null ? feature['function'] : '&lt;none&gt;'],
        ['Contig', feature.contig],
        ['Start', start],
        ['Stop', stop],
        ['Size', size]];

      if (typeof feature.set_number !== 'undefined') {
        feature_info.push(['Set', feature.set_number]);
      }
      if (typeof feature.subsystems === 'object') {
        var ss_title = feature.subsystems.length > 1 ? 'Subsystems' : 'Subsystem';
        feature.subsystems.forEach(function (ss_item) {
          feature_info.push([ss_title, ss_item[1] + ': ' + ss_item[0]]);
          ss_title = '';
        });
      }
      if (typeof feature.attributes === 'object') {
        feature.attributes.forEach(function (attr) {
          feature_info.push(attr);
        });
      }

      var feature_info_str = "<table><tr><th colspan='2'>Feature</th></tr>";
      feature_info.forEach(function (item) {
        feature_info_str += '<tr><td><b>' + item[0] + '</b></td><td>' + item[1] + '</td></tr>\n';
      });
      feature_info_str += '</table>';
      return feature_info_str;
    },

    contig_to_screen: function (track_info, x) {
      if (track_info.mirror) {
        x = 2 * track_info.center - x;
        return (x - (track_info.center - this.min_offset)) * this.scale;
      }

      return (x - (track_info.center - this.min_offset)) * this.scale;

    },

    add_row: function (idx, data, track_info, row_idx) {
      var y = row_idx++ * this.row_height + this.compare_top_height;
      var height = 10;

      var rows = [];

      var row = this.compare_group.createGroup();
      row.setTransform({ dx: 0, dy: y });

      // console.log("add_row ");
      // console.log(track_info);

      rows[0] = row;

      //
      // Add baseline.
      // check for beginning of contig (boc) and end of contig (eoc).
      //
      var l1 = data.beg;
      var l2 = data.end;
      var boc = 0,
        eoc = 0;
      if (data.beg < 0) {
        l1 = 0;
        boc = 1;
      }
      if (data.end > data.contig_length) {
        l2 = data.contig_length;
        eoc = 1;
      }

      // var cx1 = track_info.contig_to_screen(l1);
      // var cx2 = track_info.contig_to_screen(l2);
      var cx1 = this.contig_to_screen(track_info, l1);
      var cx2 = this.contig_to_screen(track_info, l2);

      // window.console.log(idx, row_idx, data.beg, data.end, boc, eoc, l1, l2, cx1, cx2);
      // window.console.log(JSON.stringify(data));

      if (boc)
      { row.createLine({
        x1: cx1, y1: -5, x2: cx1, y2: 5
      }).setStroke('black'); }
      if (eoc)
      { row.createLine({
        x1: cx2, y1: -5, x2: cx2, y2: 5
      }).setStroke('black'); }

      // window.console.log(data.genome_id, data.contig_length);
      // window.console.log(data.beg, data.end, cx1, cx2);
      row.createLine({
        x1: cx1, y1: 0, x2: cx2, y2: 0
      }).setStroke('black');

      //
      // Label the row.
      //
      var names = data.org_name.split(' ');
      var label = names.slice(0, 3).join(' ');
      var label2 = names.slice(3).join(' ');
      // var label = data.org_name.replace(/^(\w)\S+/, "$1.");
      var label_txt = this.name_group.createText({
        text: label,
        x: this.name_front_margin,
        y: y + height / 2,
        align: 'start'
      });
      // label_txt.setStroke("black");
      label_txt.setFill('black');

      var label_txt_2 = this.name_group.createText({
        text: label2,
        x: this.name_front_margin + 10,
        y: y + height / 2 + 15,
        align: 'start'
      });
      label_txt_2.setFill('black');

      var pegs = data.features;

      var pin = data.pinned_peg;

      for (var i = 0; i < pegs.length; i++) {
        var f = pegs[i];

        f.data_row_index = idx;

        var cidx = f.set_number;
        var color; // = undefined;

        if (typeof cidx !== 'undefined') {
          if (cidx == 1) cidx = 0;
          var n = this.palette.length;
          color = this.palette[cidx % n];
          var cycle = Math.trunc(cidx / n);
          // console.log("cycle=" + cycle);

          // cycle = 0;
          if (cycle == 1) {
            color = {
              type: 'linear',
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 10,
              colors: [{ offset: 0, color: '#fff' },
                { offset: 1, color: color }]
            };
          }
          else if (cycle == 2) {
            color = {
              type: 'linear',
              x1: 0,
              y1: 10,
              x2: 0,
              y2: 0,
              colors: [{ offset: 0, color: '#fff' },
                { offset: 1, color: color }]
            };
          }
          else if (cycle == 3) {
            color = {
              type: 'linear',
              x1: 0,
              y1: 10,
              x2: 0,
              y2: 10,
              colors: [{ offset: 0, color: '#fff' },
                { offset: 1, color: color }]
            };
          }
          else if (cycle == 4) {
            color = {
              type: 'linear',
              x1: 0,
              y1: 7,
              x2: 0,
              y2: 0,
              colors: [{ offset: 0, color: '#fff' },
                { offset: 1, color: color }]
            };
          }
        }

        var x1 = this.contig_to_screen(track_info, f.beg);
        var x2 = this.contig_to_screen(track_info, f.end);
        // var x1 = track_info.contig_to_screen(f.beg);
        // var x2 = track_info.contig_to_screen(f.end);

        var left,
          right;
        if (x1 < x2) {
          left = x1;
          right = x2;
        }
        else {
          left = x2;
          right = x1;
        }
        f.left = left;
        f.right = right;
        /**
         * Find a row with space for this feature.
        */
        var row_to_use = -1;
        for (var j = 0; j < rows.length; j++) {
          var kids = rows[j].children;
          var overlaps = 0;
          for (var k = 0; k < kids.length; k++) {
            var kf = kids[k].feature;
            if (kf === undefined)
            { continue; }

            if (kf.left < f.right && f.left < kf.right) {
              // window.console.log("chkoverlap " + kf.left + " " + kf.right + " " + f.left + " " + f.right);
              overlaps = 1;
              break;
            }
          }
          if (!overlaps) {
            row_to_use = j;
            break;
          }
        }
        if (row_to_use < 0) {
          row = this.compare_group.createGroup();
          row.setTransform({ dx: 0, dy: row_idx++ * this.row_height + this.compare_top_height });
          rows.push(row);
          row_to_use = rows.length - 1;
        }
        row = rows[row_to_use];

        // window.console.log("add feature", idx, i, f.beg, f.end, x1, x2);
        this.add_feature(row, data, x1, x2, height, color, f, f.fid == pin);
      }

      return [rows, row_idx];
    },

    /**
     http://snipplr.com/view.php?codeview&id=14590
    * HSV to RGB color conversion
    *
    * H runs from 0 to 360 degrees
    * S and V run from 0 to 100
    *
    * Ported from the excellent java algorithm by Eugene Vishnevsky at:
    * http://www.cs.rit.edu/~ncs/color/t_convert.html
    */
    hsvToRgb: function (h, s, v) {
      var r,
        g,
        b;
      var i;
      var f,
        p,
        q,
        t;

      // Make sure our arguments stay in-range
      h = Math.max(0, Math.min(360, h));
      s = Math.max(0, Math.min(100, s));
      v = Math.max(0, Math.min(100, v));

      // We accept saturation and value arguments from 0 to 100 because that's
      // how Photoshop represents those values. Internally, however, the
      // saturation and value are calculated from a range of 0 to 1. We make
      // That conversion here.
      s /= 100;
      v /= 100;

      if (s == 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
      }

      h /= 60; // sector 0 to 5
      i = Math.floor(h);
      f = h - i; // factorial part of h
      p = v * (1 - s);
      q = v * (1 - s * f);
      t = v * (1 - s * (1 - f));

      switch (i) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;

        case 1:
          r = q;
          g = v;
          b = p;
          break;

        case 2:
          r = p;
          g = v;
          b = t;
          break;

        case 3:
          r = p;
          g = q;
          b = v;
          break;

        case 4:
          r = t;
          g = p;
          b = v;
          break;

        default: // case 5:
          r = v;
          g = p;
          b = q;
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    sample_data: function () {
      var x =
        [
          {
            beg: 824839,
            features: [
              {
                beg: '833399',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_006933_833399_832773',
                size: 627,
                end: '832773',
                offset_end: 2560,
                fid: 'fig|6666666.32012.peg.3029',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 1934,
                contig: 'NC_006933',
                offset: 2247
              },
              {
                beg: '833601',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_006933_833601_833428',
                size: 174,
                end: '833428',
                offset_end: 2762,
                fid: 'fig|6666666.32012.peg.3030',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2589,
                contig: 'NC_006933',
                offset: 2675
              },
              {
                beg: '829823',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_006933_829823_828261',
                size: 1563,
                end: '828261',
                offset_end: -1016,
                fid: 'fig|6666666.32012.peg.3025',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2578,
                contig: 'NC_006933',
                offset: -1797
              },
              {
                beg: '832596',
                'function': 'Sun protein',
                location: 'NC_006933_832596_831307',
                size: 1290,
                end: '831307',
                offset_end: 1757,
                fid: 'fig|6666666.32012.peg.3028',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 468,
                contig: 'NC_006933',
                offset: 1112
              },
              {
                beg: '826921',
                'function': 'High-affinity iron permease',
                location: 'NC_006933_826921_826085',
                size: 837,
                end: '826085',
                offset_end: -3918,
                fid: 'fig|6666666.32012.peg.3022',
                strand: '-',
                type: 'peg',
                set_number: 13,
                offset_beg: -4754,
                contig: 'NC_006933',
                offset: -4336
              },
              {
                beg: '835401',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_006933_835401_836354',
                size: 954,
                end: '836354',
                offset_end: 5515,
                fid: 'fig|6666666.32012.peg.3032',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4562,
                contig: 'NC_006933',
                offset: 5038
              },
              {
                beg: '827878',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NC_006933_827878_827330',
                size: 549,
                end: '827330',
                offset_end: -2961,
                fid: 'fig|6666666.32012.peg.3024',
                strand: '-',
                type: 'peg',
                set_number: 10,
                offset_beg: -3509,
                contig: 'NC_006933',
                offset: -3235
              },
              {
                beg: '831118',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_006933_831118_830561',
                size: 558,
                end: '830561',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32012.peg.3027',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NC_006933',
                offset: 0
              },
              {
                beg: '836423',
                'function': 'Cytochrome c family protein',
                location: 'NC_006933_836423_837541',
                size: 1119,
                end: '837541',
                offset_end: 6702,
                fid: 'fig|6666666.32012.peg.3033',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5584,
                contig: 'NC_006933',
                offset: 6143
              },
              {
                beg: '835255',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_006933_835255_833732',
                size: 1524,
                end: '833732',
                offset_end: 4416,
                fid: 'fig|6666666.32012.peg.3031',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2893,
                contig: 'NC_006933',
                offset: 3654
              },
              {
                beg: '827302',
                'function': 'putative exported protein',
                location: 'NC_006933_827302_826928',
                size: 375,
                end: '826928',
                offset_end: -3537,
                fid: 'fig|6666666.32012.peg.3023',
                strand: '-',
                type: 'peg',
                set_number: 12,
                offset_beg: -3911,
                contig: 'NC_006933',
                offset: -3724
              },
              {
                beg: '826124',
                'function': 'Ferredoxin',
                location: 'NC_006933_826124_824691',
                size: 1434,
                end: '824691',
                offset_end: -4715,
                fid: 'fig|6666666.32012.peg.3021',
                strand: '-',
                type: 'peg',
                set_number: 14,
                offset_beg: -6148,
                contig: 'NC_006933',
                offset: -5432
              },
              {
                beg: '830564',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_006933_830564_829932',
                size: 633,
                end: '829932',
                offset_end: -275,
                fid: 'fig|6666666.32012.peg.3026',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -907,
                contig: 'NC_006933',
                offset: -591
              }
            ],
            org_name: 'Brucella abortus bv. 1 str. 9-941',
            end: 836839,
            mid: 830839,
            pinned_peg_strand: '-',
            genome_id: '6666666.32012',
            pinned_peg: 'fig|6666666.32012.peg.3027',
            contig: 'NC_006933'
          },
          {
            beg: 334921,
            features: [
              {
                beg: '336506',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_010104_336506_338029',
                size: 1524,
                end: '338029',
                offset_end: -2892,
                fid: 'fig|6666666.32014.peg.2491',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4415,
                contig: 'NC_010104',
                offset: -3654
              },
              {
                beg: '341197',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_010104_341197_341829',
                size: 633,
                end: '341829',
                offset_end: 908,
                fid: 'fig|6666666.32014.peg.2496',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NC_010104',
                offset: 592
              },
              {
                beg: '341938',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_010104_341938_343500',
                size: 1563,
                end: '343500',
                offset_end: 2579,
                fid: 'fig|6666666.32014.peg.2497',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NC_010104',
                offset: 1798
              },
              {
                beg: '338160',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_010104_338160_338333',
                size: 174,
                end: '338333',
                offset_end: -2588,
                fid: 'fig|6666666.32014.peg.2492',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2761,
                contig: 'NC_010104',
                offset: -2675
              },
              {
                beg: '338377',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_010104_338377_338988',
                size: 612,
                end: '338988',
                offset_end: -1933,
                fid: 'fig|6666666.32014.peg.2493',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2544,
                contig: 'NC_010104',
                offset: -2239
              },
              {
                beg: '335323',
                'function': 'Cytochrome c family protein',
                location: 'NC_010104_335323_334265',
                size: 1059,
                end: '334265',
                offset_end: -5598,
                fid: 'fig|6666666.32014.peg.2489',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6656,
                contig: 'NC_010104',
                offset: -6127
              },
              {
                beg: '345613',
                'function': 'Plasmid replication initiator protein',
                location: 'NC_010104_345613_346671',
                size: 1059,
                end: '346671',
                offset_end: 5750,
                fid: 'fig|6666666.32014.peg.2500',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NC_010104',
                offset: 5221
              },
              {
                beg: '339165',
                'function': 'Sun protein',
                location: 'NC_010104_339165_340454',
                size: 1290,
                end: '340454',
                offset_end: -467,
                fid: 'fig|6666666.32014.peg.2494',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NC_010104',
                offset: -1112
              },
              {
                beg: '340643',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_010104_340643_341200',
                size: 558,
                end: '341200',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32014.peg.2495',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NC_010104',
                offset: 0
              },
              {
                beg: '343761',
                'function': 'Phage integrase',
                location: 'NC_010104_343761_345017',
                size: 1257,
                end: '345017',
                offset_end: 4096,
                fid: 'fig|6666666.32014.peg.2498',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2840,
                contig: 'NC_010104',
                offset: 3468
              },
              {
                beg: '336360',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_010104_336360_335407',
                size: 954,
                end: '335407',
                offset_end: -4561,
                fid: 'fig|6666666.32014.peg.2490',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5514,
                contig: 'NC_010104',
                offset: -5038
              },
              {
                beg: '345362',
                'function': 'DNA-binding protein, putative',
                location: 'NC_010104_345362_345532',
                size: 171,
                end: '345532',
                offset_end: 4611,
                fid: 'fig|6666666.32014.peg.2499',
                strand: '+',
                type: 'peg',
                set_number: 16,
                offset_beg: 4441,
                contig: 'NC_010104',
                offset: 4526
              }
            ],
            org_name: 'Brucella canis ATCC 23365',
            end: 346921,
            mid: 340921,
            pinned_peg_strand: '+',
            genome_id: '6666666.32014',
            pinned_peg: 'fig|6666666.32014.peg.2495',
            contig: 'NC_010104'
          },
          {
            beg: 636381,
            features: [
              {
                beg: '637835',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_ACJD01000006_637835_636882',
                size: 954,
                end: '636882',
                offset_end: -4546,
                fid: 'fig|6666666.32015.peg.2666',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5499,
                contig: 'NZ_ACJD01000006',
                offset: -5023
              },
              {
                beg: '639852',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_ACJD01000006_639852_640448',
                size: 597,
                end: '640448',
                offset_end: -1933,
                fid: 'fig|6666666.32015.peg.2669',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2529,
                contig: 'NZ_ACJD01000006',
                offset: -2231
              },
              {
                beg: '646822',
                'function': 'DNA-binding protein, putative',
                location: 'NZ_ACJD01000006_646822_646992',
                size: 171,
                end: '646992',
                offset_end: 4611,
                fid: 'fig|6666666.32015.peg.2675',
                strand: '+',
                type: 'peg',
                set_number: 16,
                offset_beg: 4441,
                contig: 'NZ_ACJD01000006',
                offset: 4526
              },
              {
                beg: '636813',
                'function': 'Cytochrome c family protein',
                location: 'NZ_ACJD01000006_636813_636124',
                size: 690,
                end: '636124',
                offset_end: -5568,
                fid: 'fig|6666666.32015.peg.2665',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6257,
                contig: 'NZ_ACJD01000006',
                offset: -5913
              },
              {
                beg: '642657',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_ACJD01000006_642657_643289',
                size: 633,
                end: '643289',
                offset_end: 908,
                fid: 'fig|6666666.32015.peg.2672',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NZ_ACJD01000006',
                offset: 592
              },
              {
                beg: '639635',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_ACJD01000006_639635_639808',
                size: 174,
                end: '639808',
                offset_end: -2573,
                fid: 'fig|6666666.32015.peg.2668',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2746,
                contig: 'NZ_ACJD01000006',
                offset: -2660
              },
              {
                beg: '642103',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_ACJD01000006_642103_642660',
                size: 558,
                end: '642660',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32015.peg.2671',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_ACJD01000006',
                offset: 0
              },
              {
                beg: '640625',
                'function': 'Sun protein',
                location: 'NZ_ACJD01000006_640625_641914',
                size: 1290,
                end: '641914',
                offset_end: -467,
                fid: 'fig|6666666.32015.peg.2670',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NZ_ACJD01000006',
                offset: -1112
              },
              {
                beg: '647073',
                'function': 'Plasmid replication initiator protein',
                location: 'NZ_ACJD01000006_647073_648131',
                size: 1059,
                end: '648131',
                offset_end: 5750,
                fid: 'fig|6666666.32015.peg.2676',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NZ_ACJD01000006',
                offset: 5221
              },
              {
                beg: '643398',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_ACJD01000006_643398_644960',
                size: 1563,
                end: '644960',
                offset_end: 2579,
                fid: 'fig|6666666.32015.peg.2673',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NZ_ACJD01000006',
                offset: 1798
              },
              {
                beg: '637981',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_ACJD01000006_637981_639504',
                size: 1524,
                end: '639504',
                offset_end: -2877,
                fid: 'fig|6666666.32015.peg.2667',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4400,
                contig: 'NZ_ACJD01000006',
                offset: -3639
              },
              {
                beg: '645221',
                'function': 'Phage integrase',
                location: 'NZ_ACJD01000006_645221_646477',
                size: 1257,
                end: '646477',
                offset_end: 4096,
                fid: 'fig|6666666.32015.peg.2674',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2840,
                contig: 'NZ_ACJD01000006',
                offset: 3468
              }
            ],
            org_name: 'Brucella ceti str. Cudo',
            end: 648381,
            mid: 642381,
            pinned_peg_strand: '+',
            genome_id: '6666666.32015',
            pinned_peg: 'fig|6666666.32015.peg.2671',
            contig: 'NZ_ACJD01000006'
          },
          {
            beg: 435863,
            features: [
              {
                beg: '440107',
                'function': 'Sun protein',
                location: 'NZ_DS999686_440107_441396',
                size: 1290,
                end: '441396',
                offset_end: -467,
                fid: 'fig|6666666.32016.peg.196',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NZ_DS999686',
                offset: -1112
              },
              {
                beg: '439334',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_DS999686_439334_439930',
                size: 597,
                end: '439930',
                offset_end: -1933,
                fid: 'fig|6666666.32016.peg.195',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2529,
                contig: 'NZ_DS999686',
                offset: -2231
              },
              {
                beg: '442880',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_DS999686_442880_444442',
                size: 1563,
                end: '444442',
                offset_end: 2579,
                fid: 'fig|6666666.32016.peg.199',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NZ_DS999686',
                offset: 1798
              },
              {
                beg: '444703',
                'function': 'Phage integrase',
                location: 'NZ_DS999686_444703_445959',
                size: 1257,
                end: '445959',
                offset_end: 4096,
                fid: 'fig|6666666.32016.peg.200',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2840,
                contig: 'NZ_DS999686',
                offset: 3468
              },
              {
                beg: '439117',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_DS999686_439117_439290',
                size: 174,
                end: '439290',
                offset_end: -2573,
                fid: 'fig|6666666.32016.peg.194',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2746,
                contig: 'NZ_DS999686',
                offset: -2660
              },
              {
                beg: '437317',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_DS999686_437317_436364',
                size: 954,
                end: '436364',
                offset_end: -4546,
                fid: 'fig|6666666.32016.peg.192',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5499,
                contig: 'NZ_DS999686',
                offset: -5023
              },
              {
                beg: '436280',
                'function': 'Cytochrome c family protein',
                location: 'NZ_DS999686_436280_435177',
                size: 1104,
                end: '435177',
                offset_end: -5583,
                fid: 'fig|6666666.32016.peg.191',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6686,
                contig: 'NZ_DS999686',
                offset: -6135
              },
              {
                beg: '442139',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_DS999686_442139_442771',
                size: 633,
                end: '442771',
                offset_end: 908,
                fid: 'fig|6666666.32016.peg.198',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NZ_DS999686',
                offset: 592
              },
              {
                beg: '446304',
                'function': 'DNA-binding protein, putative',
                location: 'NZ_DS999686_446304_446474',
                size: 171,
                end: '446474',
                offset_end: 4611,
                fid: 'fig|6666666.32016.peg.201',
                strand: '+',
                type: 'peg',
                set_number: 16,
                offset_beg: 4441,
                contig: 'NZ_DS999686',
                offset: 4526
              },
              {
                beg: '437463',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_DS999686_437463_438986',
                size: 1524,
                end: '438986',
                offset_end: -2877,
                fid: 'fig|6666666.32016.peg.193',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4400,
                contig: 'NZ_DS999686',
                offset: -3639
              },
              {
                beg: '446555',
                'function': 'Plasmid replication initiator protein',
                location: 'NZ_DS999686_446555_447613',
                size: 1059,
                end: '447613',
                offset_end: 5750,
                fid: 'fig|6666666.32016.peg.202',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NZ_DS999686',
                offset: 5221
              },
              {
                beg: '441585',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_DS999686_441585_442142',
                size: 558,
                end: '442142',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32016.peg.197',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_DS999686',
                offset: 0
              }
            ],
            org_name: 'Brucella ceti M13/05/1',
            end: 447863,
            mid: 441863,
            pinned_peg_strand: '+',
            genome_id: '6666666.32016',
            pinned_peg: 'fig|6666666.32016.peg.197',
            contig: 'NZ_DS999686'
          },
          {
            beg: 160228,
            features: [
              {
                beg: '167245',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_ADEZ01000033_167245_168807',
                size: 1563,
                end: '168807',
                offset_end: 2579,
                fid: 'fig|6666666.32017.peg.2401',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NZ_ADEZ01000033',
                offset: 1798
              },
              {
                beg: '161813',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_ADEZ01000033_161813_163336',
                size: 1524,
                end: '163336',
                offset_end: -2892,
                fid: 'fig|6666666.32017.peg.2395',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4415,
                contig: 'NZ_ADEZ01000033',
                offset: -3654
              },
              {
                beg: '165950',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_ADEZ01000033_165950_166507',
                size: 558,
                end: '166507',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32017.peg.2399',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_ADEZ01000033',
                offset: 0
              },
              {
                beg: '160645',
                'function': 'Cytochrome c family protein',
                location: 'NZ_ADEZ01000033_160645_159527',
                size: 1119,
                end: '159527',
                offset_end: -5583,
                fid: 'fig|6666666.32017.peg.2393',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6701,
                contig: 'NZ_ADEZ01000033',
                offset: -6142
              },
              {
                beg: '169200',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NZ_ADEZ01000033_169200_169748',
                size: 549,
                end: '169748',
                offset_end: 3520,
                fid: 'fig|6666666.32017.peg.2402',
                strand: '+',
                type: 'peg',
                set_number: 10,
                offset_beg: 2972,
                contig: 'NZ_ADEZ01000033',
                offset: 3246
              },
              {
                beg: '161667',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_ADEZ01000033_161667_160714',
                size: 954,
                end: '160714',
                offset_end: -4561,
                fid: 'fig|6666666.32017.peg.2394',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5514,
                contig: 'NZ_ADEZ01000033',
                offset: -5038
              },
              {
                beg: '164472',
                'function': 'Sun protein',
                location: 'NZ_ADEZ01000033_164472_165761',
                size: 1290,
                end: '165761',
                offset_end: -467,
                fid: 'fig|6666666.32017.peg.2398',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NZ_ADEZ01000033',
                offset: -1112
              },
              {
                beg: '169776',
                'function': 'putative exported protein',
                location: 'NZ_ADEZ01000033_169776_170150',
                size: 375,
                end: '170150',
                offset_end: 3922,
                fid: 'fig|6666666.32017.peg.2403',
                strand: '+',
                type: 'peg',
                set_number: 12,
                offset_beg: 3548,
                contig: 'NZ_ADEZ01000033',
                offset: 3735
              },
              {
                beg: '163684',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_ADEZ01000033_163684_164295',
                size: 612,
                end: '164295',
                offset_end: -1933,
                fid: 'fig|6666666.32017.peg.2397',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2544,
                contig: 'NZ_ADEZ01000033',
                offset: -2239
              },
              {
                beg: '170157',
                'function': 'High-affinity iron permease',
                location: 'NZ_ADEZ01000033_170157_170993',
                size: 837,
                end: '170993',
                offset_end: 4765,
                fid: 'fig|6666666.32017.peg.2404',
                strand: '+',
                type: 'peg',
                set_number: 13,
                offset_beg: 3929,
                contig: 'NZ_ADEZ01000033',
                offset: 4347
              },
              {
                beg: '163467',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_ADEZ01000033_163467_163640',
                size: 174,
                end: '163640',
                offset_end: -2588,
                fid: 'fig|6666666.32017.peg.2396',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2761,
                contig: 'NZ_ADEZ01000033',
                offset: -2675
              },
              {
                beg: '166504',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_ADEZ01000033_166504_167136',
                size: 633,
                end: '167136',
                offset_end: 908,
                fid: 'fig|6666666.32017.peg.2400',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NZ_ADEZ01000033',
                offset: 592
              },
              {
                beg: '170954',
                'function': 'Ferredoxin',
                location: 'NZ_ADEZ01000033_170954_172387',
                size: 1434,
                end: '172387',
                offset_end: 6159,
                fid: 'fig|6666666.32017.peg.2405',
                strand: '+',
                type: 'peg',
                set_number: 14,
                offset_beg: 4726,
                contig: 'NZ_ADEZ01000033',
                offset: 5442
              }
            ],
            org_name: 'Brucella sp. BO1',
            end: 172228,
            mid: 166228,
            pinned_peg_strand: '+',
            genome_id: '6666666.32017',
            pinned_peg: 'fig|6666666.32017.peg.2399',
            contig: 'NZ_ADEZ01000033'
          },
          {
            beg: 923816,
            features: [
              {
                beg: '930044',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_003318_930044_929589',
                size: 456,
                end: '929589',
                color: 'red',
                offset_end: 228,
                fid: 'fig|6666666.32018.peg.3118',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -227,
                contig: 'NC_003318',
                offset: 0
              },
              {
                beg: '931612',
                'function': 'hypothetical sun protein',
                location: 'NC_003318_931612_931373',
                size: 240,
                end: '931373',
                offset_end: 1796,
                fid: 'fig|6666666.32018.peg.3120',
                strand: '-',
                type: 'peg',
                set_number: 21,
                offset_beg: 1557,
                contig: 'NC_003318',
                offset: 1676
              },
              {
                beg: '932399',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_003318_932399_931686',
                size: 714,
                end: '931686',
                offset_end: 2583,
                fid: 'fig|6666666.32018.peg.3121',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 1870,
                contig: 'NC_003318',
                offset: 2226
              },
              {
                beg: '934416',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_003318_934416_935369',
                size: 954,
                end: '935369',
                offset_end: 5553,
                fid: 'fig|6666666.32018.peg.3124',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4600,
                contig: 'NC_003318',
                offset: 5076
              },
              {
                beg: '926905',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NC_003318_926905_926357',
                size: 549,
                end: '926357',
                offset_end: -2911,
                fid: 'fig|6666666.32018.peg.3115',
                strand: '-',
                type: 'peg',
                set_number: 10,
                offset_beg: -3459,
                contig: 'NC_003318',
                offset: -3185
              },
              {
                beg: '935453',
                'function': 'Cytochrome c family protein',
                location: 'NC_003318_935453_936547',
                size: 1095,
                end: '936547',
                offset_end: 6731,
                fid: 'fig|6666666.32018.peg.3125',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5637,
                contig: 'NC_003318',
                offset: 6184
              },
              {
                beg: '925151',
                'function': 'Ferredoxin',
                location: 'NC_003318_925151_923718',
                size: 1434,
                end: '923718',
                offset_end: -4665,
                fid: 'fig|6666666.32018.peg.3112',
                strand: '-',
                type: 'peg',
                set_number: 14,
                offset_beg: -6098,
                contig: 'NC_003318',
                offset: -5382
              },
              {
                beg: '931419',
                'function': 'Sun protein',
                location: 'NC_003318_931419_930325',
                size: 1095,
                end: '930325',
                offset_end: 1603,
                fid: 'fig|6666666.32018.peg.3119',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 509,
                contig: 'NC_003318',
                offset: 1056
              },
              {
                beg: '928851',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_003318_928851_927328',
                size: 1524,
                end: '927328',
                offset_end: -965,
                fid: 'fig|6666666.32018.peg.3116',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2488,
                contig: 'NC_003318',
                offset: -1727
              },
              {
                beg: '932616',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_003318_932616_932443',
                size: 174,
                end: '932443',
                offset_end: 2800,
                fid: 'fig|6666666.32018.peg.3122',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2627,
                contig: 'NC_003318',
                offset: 2713
              },
              {
                beg: '925948',
                'function': 'High-affinity iron permease',
                location: 'NC_003318_925948_925112',
                size: 837,
                end: '925112',
                offset_end: -3868,
                fid: 'fig|6666666.32018.peg.3113',
                strand: '-',
                type: 'peg',
                set_number: 13,
                offset_beg: -4704,
                contig: 'NC_003318',
                offset: -4286
              },
              {
                beg: '929592',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_003318_929592_928960',
                size: 633,
                end: '928960',
                offset_end: -224,
                fid: 'fig|6666666.32018.peg.3117',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -856,
                contig: 'NC_003318',
                offset: -540
              },
              {
                beg: '934270',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_003318_934270_932747',
                size: 1524,
                end: '932747',
                offset_end: 4454,
                fid: 'fig|6666666.32018.peg.3123',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2931,
                contig: 'NC_003318',
                offset: 3692
              },
              {
                beg: '926329',
                'function': 'putative exported protein',
                location: 'NC_003318_926329_925955',
                size: 375,
                end: '925955',
                offset_end: -3487,
                fid: 'fig|6666666.32018.peg.3114',
                strand: '-',
                type: 'peg',
                set_number: 12,
                offset_beg: -3861,
                contig: 'NC_003318',
                offset: -3674
              }
            ],
            org_name: 'Brucella melitensis bv. 1 str. 16M',
            end: 935816,
            mid: 929816,
            pinned_peg_strand: '-',
            genome_id: '6666666.32018',
            pinned_peg: 'fig|6666666.32018.peg.3118',
            contig: 'NC_003318'
          },
          {
            beg: 336077,
            features: [
              {
                beg: '340321',
                'function': 'Sun protein',
                location: 'NC_013118_340321_341610',
                size: 1290,
                end: '341610',
                offset_end: -467,
                fid: 'fig|6666666.32019.peg.337',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NC_013118',
                offset: -1112
              },
              {
                beg: '336480',
                'function': 'Cytochrome c family protein',
                location: 'NC_013118_336480_335377',
                size: 1104,
                end: '335377',
                offset_end: -5597,
                fid: 'fig|6666666.32019.peg.332',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6700,
                contig: 'NC_013118',
                offset: -6149
              },
              {
                beg: '344965',
                'function': 'Phage integrase',
                location: 'NC_013118_344965_346173',
                size: 1209,
                end: '346173',
                offset_end: 4096,
                fid: 'fig|6666666.32019.peg.341',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2888,
                contig: 'NC_013118',
                offset: 3492
              },
              {
                beg: '339533',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_013118_339533_340144',
                size: 612,
                end: '340144',
                offset_end: -1933,
                fid: 'fig|6666666.32019.peg.336',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2544,
                contig: 'NC_013118',
                offset: -2239
              },
              {
                beg: '341799',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_013118_341799_342356',
                size: 558,
                end: '342356',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32019.peg.338',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NC_013118',
                offset: 0
              },
              {
                beg: '346769',
                'function': 'Plasmid replication initiator protein',
                location: 'NC_013118_346769_347827',
                size: 1059,
                end: '347827',
                offset_end: 5750,
                fid: 'fig|6666666.32019.peg.342',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NC_013118',
                offset: 5221
              },
              {
                beg: '337516',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_013118_337516_336563',
                size: 954,
                end: '336563',
                offset_end: -4561,
                fid: 'fig|6666666.32019.peg.333',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5514,
                contig: 'NC_013118',
                offset: -5038
              },
              {
                beg: '342353',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_013118_342353_342985',
                size: 633,
                end: '342985',
                offset_end: 908,
                fid: 'fig|6666666.32019.peg.339',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NC_013118',
                offset: 592
              },
              {
                beg: '337662',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_013118_337662_339185',
                size: 1524,
                end: '339185',
                offset_end: -2892,
                fid: 'fig|6666666.32019.peg.334',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4415,
                contig: 'NC_013118',
                offset: -3654
              },
              {
                beg: '343094',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_013118_343094_344656',
                size: 1563,
                end: '344656',
                offset_end: 2579,
                fid: 'fig|6666666.32019.peg.340',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NC_013118',
                offset: 1798
              },
              {
                beg: '339316',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_013118_339316_339489',
                size: 174,
                end: '339489',
                offset_end: -2588,
                fid: 'fig|6666666.32019.peg.335',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2761,
                contig: 'NC_013118',
                offset: -2675
              }
            ],
            org_name: 'Brucella microti CCM 4915',
            end: 348077,
            mid: 342077,
            pinned_peg_strand: '+',
            genome_id: '6666666.32019',
            pinned_peg: 'fig|6666666.32019.peg.338',
            contig: 'NC_013118'
          },
          {
            beg: 750940,
            features: [
              {
                beg: '754098',
                'function': 'Phage integrase',
                location: 'NZ_EQ999575_754098_753607',
                size: 492,
                end: '753607',
                offset_end: -2842,
                fid: 'fig|6666666.32020.peg.292',
                strand: '-',
                type: 'peg',
                set_number: 11,
                offset_beg: -3333,
                contig: 'NZ_EQ999575',
                offset: -3088
              },
              {
                beg: '752544',
                'function': 'DNA-binding protein, putative',
                location: 'NZ_EQ999575_752544_752374',
                size: 171,
                end: '752374',
                offset_end: -4396,
                fid: 'fig|6666666.32020.peg.290',
                strand: '-',
                type: 'peg',
                set_number: 16,
                offset_beg: -4566,
                contig: 'NZ_EQ999575',
                offset: -4481
              },
              {
                beg: '758742',
                'function': 'Sun protein',
                location: 'NZ_EQ999575_758742_757453',
                size: 1290,
                end: '757453',
                offset_end: 1802,
                fid: 'fig|6666666.32020.peg.296',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 513,
                contig: 'NZ_EQ999575',
                offset: 1157
              },
              {
                beg: '752293',
                'function': 'Plasmid replication initiator protein',
                location: 'NZ_EQ999575_752293_751235',
                size: 1059,
                end: '751235',
                offset_end: -4647,
                fid: 'fig|6666666.32020.peg.289',
                strand: '-',
                type: 'peg',
                set_number: 15,
                offset_beg: -5705,
                contig: 'NZ_EQ999575',
                offset: -5176
              },
              {
                beg: '753594',
                'function': 'Integrase',
                location: 'NZ_EQ999575_753594_752890',
                size: 705,
                end: '752890',
                offset_end: -3346,
                fid: 'fig|6666666.32020.peg.291',
                strand: '-',
                type: 'peg',
                set_number: 18,
                offset_beg: -4050,
                contig: 'NZ_EQ999575',
                offset: -3698
              },
              {
                beg: '755969',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_EQ999575_755969_754407',
                size: 1563,
                end: '754407',
                offset_end: -971,
                fid: 'fig|6666666.32020.peg.293',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2533,
                contig: 'NZ_EQ999575',
                offset: -1752
              },
              {
                beg: '761547',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_EQ999575_761547_762500',
                size: 954,
                end: '762500',
                offset_end: 5560,
                fid: 'fig|6666666.32020.peg.300',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4607,
                contig: 'NZ_EQ999575',
                offset: 5083
              },
              {
                beg: '756710',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_EQ999575_756710_756078',
                size: 633,
                end: '756078',
                offset_end: -230,
                fid: 'fig|6666666.32020.peg.294',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -862,
                contig: 'NZ_EQ999575',
                offset: -546
              },
              {
                beg: '762584',
                'function': 'Cytochrome c family protein',
                location: 'NZ_EQ999575_762584_763687',
                size: 1104,
                end: '763687',
                offset_end: 6747,
                fid: 'fig|6666666.32020.peg.301',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5644,
                contig: 'NZ_EQ999575',
                offset: 6195
              },
              {
                beg: '759530',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_EQ999575_759530_758919',
                size: 612,
                end: '758919',
                offset_end: 2590,
                fid: 'fig|6666666.32020.peg.297',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 1979,
                contig: 'NZ_EQ999575',
                offset: 2284
              },
              {
                beg: '759747',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_EQ999575_759747_759574',
                size: 174,
                end: '759574',
                offset_end: 2807,
                fid: 'fig|6666666.32020.peg.298',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2634,
                contig: 'NZ_EQ999575',
                offset: 2720
              },
              {
                beg: '757174',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_EQ999575_757174_756707',
                size: 468,
                end: '756707',
                color: 'red',
                offset_end: 234,
                fid: 'fig|6666666.32020.peg.295',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -233,
                contig: 'NZ_EQ999575',
                offset: 0
              },
              {
                beg: '761401',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_EQ999575_761401_759878',
                size: 1524,
                end: '759878',
                offset_end: 4461,
                fid: 'fig|6666666.32020.peg.299',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2938,
                contig: 'NZ_EQ999575',
                offset: 3699
              }
            ],
            org_name: 'Brucella neotomae 5K33',
            end: 762940,
            mid: 756940,
            pinned_peg_strand: '-',
            genome_id: '6666666.32020',
            pinned_peg: 'fig|6666666.32020.peg.295',
            contig: 'NZ_EQ999575'
          },
          {
            beg: 333978,
            features: [
              {
                beg: '337166',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_009504_337166_337339',
                size: 174,
                end: '337339',
                offset_end: -2639,
                fid: 'fig|6666666.32022.peg.363',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2812,
                contig: 'NC_009504',
                offset: -2726
              },
              {
                beg: '340203',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_009504_340203_340835',
                size: 633,
                end: '340835',
                offset_end: 857,
                fid: 'fig|6666666.32022.peg.367',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 225,
                contig: 'NC_009504',
                offset: 541
              },
              {
                beg: '337368',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_009504_337368_337994',
                size: 627,
                end: '337994',
                offset_end: -1984,
                fid: 'fig|6666666.32022.peg.364',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2610,
                contig: 'NC_009504',
                offset: -2297
              },
              {
                beg: '343846',
                'function': 'High-affinity iron permease',
                location: 'NC_009504_343846_344682',
                size: 837,
                end: '344682',
                offset_end: 4704,
                fid: 'fig|6666666.32022.peg.371',
                strand: '+',
                type: 'peg',
                set_number: 13,
                offset_beg: 3868,
                contig: 'NC_009504',
                offset: 4286
              },
              {
                beg: '334345',
                'function': 'Cytochrome c family protein',
                location: 'NC_009504_334345_333236',
                size: 1110,
                end: '333236',
                offset_end: -5633,
                fid: 'fig|6666666.32022.peg.360',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6742,
                contig: 'NC_009504',
                offset: -6188
              },
              {
                beg: '340944',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_009504_340944_342506',
                size: 1563,
                end: '342506',
                offset_end: 2528,
                fid: 'fig|6666666.32022.peg.368',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 966,
                contig: 'NC_009504',
                offset: 1747
              },
              {
                beg: '335366',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_009504_335366_334389',
                size: 978,
                end: '334389',
                offset_end: -4612,
                fid: 'fig|6666666.32022.peg.361',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5589,
                contig: 'NC_009504',
                offset: -5101
              },
              {
                beg: '344643',
                'function': 'Ferredoxin',
                location: 'NC_009504_344643_346076',
                size: 1434,
                end: '346076',
                offset_end: 6098,
                fid: 'fig|6666666.32022.peg.372',
                strand: '+',
                type: 'peg',
                set_number: 14,
                offset_beg: 4665,
                contig: 'NC_009504',
                offset: 5381
              },
              {
                beg: '338171',
                'function': 'Sun protein',
                location: 'NC_009504_338171_339460',
                size: 1290,
                end: '339460',
                offset_end: -518,
                fid: 'fig|6666666.32022.peg.365',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1807,
                contig: 'NC_009504',
                offset: -1163
              },
              {
                beg: '342889',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NC_009504_342889_343437',
                size: 549,
                end: '343437',
                offset_end: 3459,
                fid: 'fig|6666666.32022.peg.369',
                strand: '+',
                type: 'peg',
                set_number: 10,
                offset_beg: 2911,
                contig: 'NC_009504',
                offset: 3185
              },
              {
                beg: '343465',
                'function': 'putative exported protein',
                location: 'NC_009504_343465_343839',
                size: 375,
                end: '343839',
                offset_end: 3861,
                fid: 'fig|6666666.32022.peg.370',
                strand: '+',
                type: 'peg',
                set_number: 12,
                offset_beg: 3487,
                contig: 'NC_009504',
                offset: 3674
              },
              {
                beg: '339751',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_009504_339751_340206',
                size: 456,
                end: '340206',
                color: 'red',
                offset_end: 228,
                fid: 'fig|6666666.32022.peg.366',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -227,
                contig: 'NC_009504',
                offset: 0
              },
              {
                beg: '335512',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_009504_335512_337035',
                size: 1524,
                end: '337035',
                offset_end: -2943,
                fid: 'fig|6666666.32022.peg.362',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4466,
                contig: 'NC_009504',
                offset: -3705
              }
            ],
            org_name: 'Brucella ovis ATCC 25840',
            end: 345978,
            mid: 339978,
            pinned_peg_strand: '+',
            genome_id: '6666666.32022',
            pinned_peg: 'fig|6666666.32022.peg.366',
            contig: 'NC_009504'
          },
          {
            beg: 805546,
            features: [
              {
                beg: '808585',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NZ_EQ999534_808585_808037',
                size: 549,
                end: '808037',
                offset_end: -2961,
                fid: 'fig|6666666.32023.peg.487',
                strand: '-',
                type: 'peg',
                set_number: 10,
                offset_beg: -3509,
                contig: 'NZ_EQ999534',
                offset: -3235
              },
              {
                beg: '817130',
                'function': 'Cytochrome c family protein',
                location: 'NZ_EQ999534_817130_818224',
                size: 1095,
                end: '818224',
                offset_end: 6678,
                fid: 'fig|6666666.32023.peg.496',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5584,
                contig: 'NZ_EQ999534',
                offset: 6131
              },
              {
                beg: '810530',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_EQ999534_810530_808968',
                size: 1563,
                end: '808968',
                offset_end: -1016,
                fid: 'fig|6666666.32023.peg.488',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2578,
                contig: 'NZ_EQ999534',
                offset: -1797
              },
              {
                beg: '814293',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_EQ999534_814293_814120',
                size: 174,
                end: '814120',
                offset_end: 2747,
                fid: 'fig|6666666.32023.peg.493',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2574,
                contig: 'NZ_EQ999534',
                offset: 2660
              },
              {
                beg: '811825',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_EQ999534_811825_811268',
                size: 558,
                end: '811268',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32023.peg.490',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_EQ999534',
                offset: 0
              },
              {
                beg: '806831',
                'function': 'Ferredoxin',
                location: 'NZ_EQ999534_806831_805398',
                size: 1434,
                end: '805398',
                offset_end: -4715,
                fid: 'fig|6666666.32023.peg.484',
                strand: '-',
                type: 'peg',
                set_number: 14,
                offset_beg: -6148,
                contig: 'NZ_EQ999534',
                offset: -5432
              },
              {
                beg: '807628',
                'function': 'High-affinity iron permease',
                location: 'NZ_EQ999534_807628_806792',
                size: 837,
                end: '806792',
                offset_end: -3918,
                fid: 'fig|6666666.32023.peg.485',
                strand: '-',
                type: 'peg',
                set_number: 13,
                offset_beg: -4754,
                contig: 'NZ_EQ999534',
                offset: -4336
              },
              {
                beg: '815947',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_EQ999534_815947_814424',
                size: 1524,
                end: '814424',
                offset_end: 4401,
                fid: 'fig|6666666.32023.peg.494',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2878,
                contig: 'NZ_EQ999534',
                offset: 3639
              },
              {
                beg: '811271',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_EQ999534_811271_810639',
                size: 633,
                end: '810639',
                offset_end: -275,
                fid: 'fig|6666666.32023.peg.489',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -907,
                contig: 'NZ_EQ999534',
                offset: -591
              },
              {
                beg: '813303',
                'function': 'Sun protein',
                location: 'NZ_EQ999534_813303_812014',
                size: 1290,
                end: '812014',
                offset_end: 1757,
                fid: 'fig|6666666.32023.peg.491',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 468,
                contig: 'NZ_EQ999534',
                offset: 1112
              },
              {
                beg: '816093',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_EQ999534_816093_817046',
                size: 954,
                end: '817046',
                offset_end: 5500,
                fid: 'fig|6666666.32023.peg.495',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4547,
                contig: 'NZ_EQ999534',
                offset: 5023
              },
              {
                beg: '814076',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_EQ999534_814076_813480',
                size: 597,
                end: '813480',
                offset_end: 2530,
                fid: 'fig|6666666.32023.peg.492',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 1934,
                contig: 'NZ_EQ999534',
                offset: 2232
              },
              {
                beg: '808009',
                'function': 'putative exported protein',
                location: 'NZ_EQ999534_808009_807635',
                size: 375,
                end: '807635',
                offset_end: -3537,
                fid: 'fig|6666666.32023.peg.486',
                strand: '-',
                type: 'peg',
                set_number: 12,
                offset_beg: -3911,
                contig: 'NZ_EQ999534',
                offset: -3724
              }
            ],
            org_name: 'Brucella pinnipedialis M292/94/1',
            end: 817546,
            mid: 811546,
            pinned_peg_strand: '-',
            genome_id: '6666666.32023',
            pinned_peg: 'fig|6666666.32023.peg.490',
            contig: 'NZ_EQ999534'
          },
          {
            beg: 191476,
            features: [
              {
                beg: '202124',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_DS999661_202124_203077',
                size: 954,
                end: '203077',
                offset_end: 5601,
                fid: 'fig|6666666.32024.peg.2875',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4648,
                contig: 'NZ_DS999661',
                offset: 5124
              },
              {
                beg: '197668',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_DS999661_197668_197285',
                size: 384,
                end: '197285',
                color: 'red',
                offset_end: 192,
                fid: 'fig|6666666.32024.peg.2870',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -191,
                contig: 'NZ_DS999661',
                offset: 0
              },
              {
                beg: '197288',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_DS999661_197288_196656',
                size: 633,
                end: '196656',
                offset_end: -188,
                fid: 'fig|6666666.32024.peg.2869',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -820,
                contig: 'NZ_DS999661',
                offset: -504
              },
              {
                beg: '199319',
                'function': 'Sun protein',
                location: 'NZ_DS999661_199319_198030',
                size: 1290,
                end: '198030',
                offset_end: 1843,
                fid: 'fig|6666666.32024.peg.2871',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 554,
                contig: 'NZ_DS999661',
                offset: 1198
              },
              {
                beg: '203161',
                'function': 'Cytochrome c family protein',
                location: 'NZ_DS999661_203161_204264',
                size: 1104,
                end: '204264',
                offset_end: 6788,
                fid: 'fig|6666666.32024.peg.2876',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5685,
                contig: 'NZ_DS999661',
                offset: 6236
              },
              {
                beg: '200107',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_DS999661_200107_199496',
                size: 612,
                end: '199496',
                offset_end: 2631,
                fid: 'fig|6666666.32024.peg.2872',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 2020,
                contig: 'NZ_DS999661',
                offset: 2325
              },
              {
                beg: '192847',
                'function': 'Ferredoxin',
                location: 'NZ_DS999661_192847_191414',
                size: 1434,
                end: '191414',
                offset_end: -4629,
                fid: 'fig|6666666.32024.peg.2864',
                strand: '-',
                type: 'peg',
                set_number: 14,
                offset_beg: -6062,
                contig: 'NZ_DS999661',
                offset: -5346
              },
              {
                beg: '193644',
                'function': 'High-affinity iron permease',
                location: 'NZ_DS999661_193644_192808',
                size: 837,
                end: '192808',
                offset_end: -3832,
                fid: 'fig|6666666.32024.peg.2865',
                strand: '-',
                type: 'peg',
                set_number: 13,
                offset_beg: -4668,
                contig: 'NZ_DS999661',
                offset: -4250
              },
              {
                beg: '200324',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_DS999661_200324_200151',
                size: 174,
                end: '200151',
                offset_end: 2848,
                fid: 'fig|6666666.32024.peg.2873',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2675,
                contig: 'NZ_DS999661',
                offset: 2761
              },
              {
                beg: '196547',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_DS999661_196547_194985',
                size: 1563,
                end: '194985',
                offset_end: -929,
                fid: 'fig|6666666.32024.peg.2868',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2491,
                contig: 'NZ_DS999661',
                offset: -1710
              },
              {
                beg: '194601',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NZ_DS999661_194601_194053',
                size: 549,
                end: '194053',
                offset_end: -2875,
                fid: 'fig|6666666.32024.peg.2867',
                strand: '-',
                type: 'peg',
                set_number: 10,
                offset_beg: -3423,
                contig: 'NZ_DS999661',
                offset: -3149
              },
              {
                beg: '193965',
                'function': 'putative exported protein',
                location: 'NZ_DS999661_193965_193651',
                size: 315,
                end: '193651',
                offset_end: -3511,
                fid: 'fig|6666666.32024.peg.2866',
                strand: '-',
                type: 'peg',
                set_number: 12,
                offset_beg: -3825,
                contig: 'NZ_DS999661',
                offset: -3668
              },
              {
                beg: '201978',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_DS999661_201978_200455',
                size: 1524,
                end: '200455',
                offset_end: 4502,
                fid: 'fig|6666666.32024.peg.2874',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2979,
                contig: 'NZ_DS999661',
                offset: 3740
              }
            ],
            org_name: 'Brucella sp. 83/13',
            end: 203476,
            mid: 197476,
            pinned_peg_strand: '-',
            genome_id: '6666666.32024',
            pinned_peg: 'fig|6666666.32024.peg.2870',
            contig: 'NZ_DS999661'
          },
          {
            beg: 53927,
            features: [
              {
                beg: '57093',
                'function': 'Phage integrase',
                location: 'NZ_ADFA01000030_57093_55885',
                size: 1209,
                end: '55885',
                offset_end: -2834,
                fid: 'fig|6666666.32025.peg.647',
                strand: '-',
                type: 'peg',
                set_number: 11,
                offset_beg: -4042,
                contig: 'NZ_ADFA01000030',
                offset: -3438
              },
              {
                beg: '54495',
                'function': 'FIG00642059: hypothetical protein',
                location: 'NZ_ADFA01000030_54495_55487',
                size: 993,
                end: '55487',
                offset_end: -4440,
                fid: 'fig|6666666.32025.peg.646',
                strand: '+',
                type: 'peg',
                set_number: 23,
                offset_beg: -5432,
                contig: 'NZ_ADFA01000030',
                offset: -4936
              },
              {
                beg: '62522',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_ADFA01000030_62522_62349',
                size: 174,
                end: '62349',
                offset_end: 2595,
                fid: 'fig|6666666.32025.peg.654',
                strand: '-',
                type: 'peg',
                set_number: 9,
                offset_beg: 2422,
                contig: 'NZ_ADFA01000030',
                offset: 2508
              },
              {
                beg: '59704',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_ADFA01000030_59704_59072',
                size: 633,
                end: '59072',
                offset_end: -223,
                fid: 'fig|6666666.32025.peg.649',
                strand: '-',
                type: 'peg',
                set_number: 2,
                offset_beg: -855,
                contig: 'NZ_ADFA01000030',
                offset: -539
              },
              {
                beg: '64176',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_ADFA01000030_64176_62653',
                size: 1524,
                end: '62653',
                offset_end: 4249,
                fid: 'fig|6666666.32025.peg.655',
                strand: '-',
                type: 'peg',
                set_number: 4,
                offset_beg: 2726,
                contig: 'NZ_ADFA01000030',
                offset: 3487
              },
              {
                beg: '58963',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_ADFA01000030_58963_57401',
                size: 1563,
                end: '57401',
                offset_end: -964,
                fid: 'fig|6666666.32025.peg.648',
                strand: '-',
                type: 'peg',
                set_number: 7,
                offset_beg: -2526,
                contig: 'NZ_ADFA01000030',
                offset: -1745
              },
              {
                beg: '53966',
                'function': 'RecA-family ATPase',
                location: 'NZ_ADFA01000030_53966_53295',
                size: 672,
                end: '53295',
                offset_end: -5961,
                fid: 'fig|6666666.32025.peg.645',
                strand: '-',
                type: 'peg',
                set_number: 25,
                offset_beg: -6632,
                contig: 'NZ_ADFA01000030',
                offset: -6297
              },
              {
                beg: '61517',
                'function': 'Sun protein',
                location: 'NZ_ADFA01000030_61517_60228',
                size: 1290,
                end: '60228',
                offset_end: 1590,
                fid: 'fig|6666666.32025.peg.651',
                strand: '-',
                type: 'peg',
                set_number: 3,
                offset_beg: 301,
                contig: 'NZ_ADFA01000030',
                offset: 945
              },
              {
                beg: '64322',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_ADFA01000030_64322_65275',
                size: 954,
                end: '65275',
                offset_end: 5348,
                fid: 'fig|6666666.32025.peg.656',
                strand: '+',
                type: 'peg',
                set_number: 5,
                offset_beg: 4395,
                contig: 'NZ_ADFA01000030',
                offset: 4871
              },
              {
                beg: '60153',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_ADFA01000030_60153_59701',
                size: 453,
                end: '59701',
                color: 'red',
                offset_end: 226,
                fid: 'fig|6666666.32025.peg.650',
                strand: '-',
                type: 'peg',
                set_number: 1,
                offset_beg: -226,
                contig: 'NZ_ADFA01000030',
                offset: 0
              },
              {
                beg: '61739',
                'function': 'hypothetical protein',
                location: 'NZ_ADFA01000030_61739_61626',
                size: 114,
                end: '61626',
                offset_end: 1812,
                fid: 'fig|6666666.32025.peg.652',
                strand: '-',
                type: 'peg',
                set_number: 17,
                offset_beg: 1699,
                contig: 'NZ_ADFA01000030',
                offset: 1755
              },
              {
                beg: '65359',
                'function': 'Cytochrome c family protein',
                location: 'NZ_ADFA01000030_65359_66462',
                size: 1104,
                end: '66462',
                offset_end: 6535,
                fid: 'fig|6666666.32025.peg.657',
                strand: '+',
                type: 'peg',
                set_number: 6,
                offset_beg: 5432,
                contig: 'NZ_ADFA01000030',
                offset: 5983
              },
              {
                beg: '62305',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_ADFA01000030_62305_61694',
                size: 612,
                end: '61694',
                offset_end: 2378,
                fid: 'fig|6666666.32025.peg.653',
                strand: '-',
                type: 'peg',
                set_number: 8,
                offset_beg: 1767,
                contig: 'NZ_ADFA01000030',
                offset: 2072
              }
            ],
            org_name: 'Brucella sp. BO2',
            end: 65927,
            mid: 59927,
            pinned_peg_strand: '-',
            genome_id: '6666666.32025',
            pinned_peg: 'fig|6666666.32025.peg.650',
            contig: 'NZ_ADFA01000030'
          },
          {
            beg: 434337,
            features: [
              {
                beg: '437793',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_GG770511_437793_438404',
                size: 612,
                end: '438404',
                offset_end: -1933,
                fid: 'fig|6666666.32026.peg.3350',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2544,
                contig: 'NZ_GG770511',
                offset: -2239
              },
              {
                beg: '435921',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_GG770511_435921_437444',
                size: 1524,
                end: '437444',
                offset_end: -2893,
                fid: 'fig|6666666.32026.peg.3348',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4416,
                contig: 'NZ_GG770511',
                offset: -3655
              },
              {
                beg: '441354',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_GG770511_441354_442916',
                size: 1563,
                end: '442916',
                offset_end: 2579,
                fid: 'fig|6666666.32026.peg.3354',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NZ_GG770511',
                offset: 1798
              },
              {
                beg: '444778',
                'function': 'DNA-binding protein, putative',
                location: 'NZ_GG770511_444778_444948',
                size: 171,
                end: '444948',
                offset_end: 4611,
                fid: 'fig|6666666.32026.peg.3356',
                strand: '+',
                type: 'peg',
                set_number: 16,
                offset_beg: 4441,
                contig: 'NZ_GG770511',
                offset: 4526
              },
              {
                beg: '438581',
                'function': 'Sun protein',
                location: 'NZ_GG770511_438581_439870',
                size: 1290,
                end: '439870',
                offset_end: -467,
                fid: 'fig|6666666.32026.peg.3351',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NZ_GG770511',
                offset: -1112
              },
              {
                beg: '443177',
                'function': 'Phage integrase',
                location: 'NZ_GG770511_443177_444433',
                size: 1257,
                end: '444433',
                offset_end: 4096,
                fid: 'fig|6666666.32026.peg.3355',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2840,
                contig: 'NZ_GG770511',
                offset: 3468
              },
              {
                beg: '435775',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_GG770511_435775_434822',
                size: 954,
                end: '434822',
                offset_end: -4562,
                fid: 'fig|6666666.32026.peg.3347',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5515,
                contig: 'NZ_GG770511',
                offset: -5039
              },
              {
                beg: '440059',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_GG770511_440059_440616',
                size: 558,
                end: '440616',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32026.peg.3352',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_GG770511',
                offset: 0
              },
              {
                beg: '434738',
                'function': 'Cytochrome c family protein',
                location: 'NZ_GG770511_434738_433635',
                size: 1104,
                end: '433635',
                offset_end: -5599,
                fid: 'fig|6666666.32026.peg.3346',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6702,
                contig: 'NZ_GG770511',
                offset: -6151
              },
              {
                beg: '437600',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_GG770511_437600_437749',
                size: 150,
                end: '437749',
                offset_end: -2588,
                fid: 'fig|6666666.32026.peg.3349',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2737,
                contig: 'NZ_GG770511',
                offset: -2663
              },
              {
                beg: '440613',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_GG770511_440613_441245',
                size: 633,
                end: '441245',
                offset_end: 908,
                fid: 'fig|6666666.32026.peg.3353',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NZ_GG770511',
                offset: 592
              },
              {
                beg: '445029',
                'function': 'Plasmid replication initiator protein',
                location: 'NZ_GG770511_445029_446087',
                size: 1059,
                end: '446087',
                offset_end: 5750,
                fid: 'fig|6666666.32026.peg.3357',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NZ_GG770511',
                offset: 5221
              }
            ],
            org_name: 'Brucella sp. NVSL 07-0026',
            end: 446337,
            mid: 440337,
            pinned_peg_strand: '+',
            genome_id: '6666666.32026',
            pinned_peg: 'fig|6666666.32026.peg.3352',
            contig: 'NZ_GG770511'
          },
          {
            beg: 334807,
            features: [
              {
                beg: '338263',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NC_004311_338263_338874',
                size: 612,
                end: '338874',
                offset_end: -1933,
                fid: 'fig|6666666.32027.peg.2492',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2544,
                contig: 'NC_004311',
                offset: -2239
              },
              {
                beg: '343647',
                'function': 'Phage integrase',
                location: 'NC_004311_343647_344903',
                size: 1257,
                end: '344903',
                offset_end: 4096,
                fid: 'fig|6666666.32027.peg.2497',
                strand: '+',
                type: 'peg',
                set_number: 11,
                offset_beg: 2840,
                contig: 'NC_004311',
                offset: 3468
              },
              {
                beg: '339051',
                'function': 'Sun protein',
                location: 'NC_004311_339051_340340',
                size: 1290,
                end: '340340',
                offset_end: -467,
                fid: 'fig|6666666.32027.peg.2493',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NC_004311',
                offset: -1112
              },
              {
                beg: '341083',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NC_004311_341083_341715',
                size: 633,
                end: '341715',
                offset_end: 908,
                fid: 'fig|6666666.32027.peg.2495',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NC_004311',
                offset: 592
              },
              {
                beg: '341824',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NC_004311_341824_343386',
                size: 1563,
                end: '343386',
                offset_end: 2579,
                fid: 'fig|6666666.32027.peg.2496',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NC_004311',
                offset: 1798
              },
              {
                beg: '338046',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NC_004311_338046_338219',
                size: 174,
                end: '338219',
                offset_end: -2588,
                fid: 'fig|6666666.32027.peg.2491',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2761,
                contig: 'NC_004311',
                offset: -2675
              },
              {
                beg: '335209',
                'function': 'Cytochrome c family protein',
                location: 'NC_004311_335209_334151',
                size: 1059,
                end: '334151',
                offset_end: -5598,
                fid: 'fig|6666666.32027.peg.2488',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6656,
                contig: 'NC_004311',
                offset: -6127
              },
              {
                beg: '345499',
                'function': 'Plasmid replication initiator protein',
                location: 'NC_004311_345499_346557',
                size: 1059,
                end: '346557',
                offset_end: 5750,
                fid: 'fig|6666666.32027.peg.2499',
                strand: '+',
                type: 'peg',
                set_number: 15,
                offset_beg: 4692,
                contig: 'NC_004311',
                offset: 5221
              },
              {
                beg: '336392',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NC_004311_336392_337915',
                size: 1524,
                end: '337915',
                offset_end: -2892,
                fid: 'fig|6666666.32027.peg.2490',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4415,
                contig: 'NC_004311',
                offset: -3654
              },
              {
                beg: '345248',
                'function': 'DNA-binding protein, putative',
                location: 'NC_004311_345248_345418',
                size: 171,
                end: '345418',
                offset_end: 4611,
                fid: 'fig|6666666.32027.peg.2498',
                strand: '+',
                type: 'peg',
                set_number: 16,
                offset_beg: 4441,
                contig: 'NC_004311',
                offset: 4526
              },
              {
                beg: '340529',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NC_004311_340529_341086',
                size: 558,
                end: '341086',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32027.peg.2494',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NC_004311',
                offset: 0
              },
              {
                beg: '336246',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NC_004311_336246_335293',
                size: 954,
                end: '335293',
                offset_end: -4561,
                fid: 'fig|6666666.32027.peg.2489',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5514,
                contig: 'NC_004311',
                offset: -5038
              }
            ],
            org_name: 'Brucella suis 1330',
            end: 346807,
            mid: 340807,
            pinned_peg_strand: '+',
            genome_id: '6666666.32027',
            pinned_peg: 'fig|6666666.32027.peg.2494',
            contig: 'NC_004311'
          },
          {
            beg: 428013,
            features: [
              {
                beg: '438729',
                'function': 'Ferredoxin',
                location: 'NZ_DS999712_438729_440162',
                size: 1434,
                end: '440162',
                offset_end: 6149,
                fid: 'fig|6666666.32028.peg.145',
                strand: '+',
                type: 'peg',
                set_number: 14,
                offset_beg: 4716,
                contig: 'NZ_DS999712',
                offset: 5432
              },
              {
                beg: '431484',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: 'NZ_DS999712_431484_432080',
                size: 597,
                end: '432080',
                offset_end: -1933,
                fid: 'fig|6666666.32028.peg.137',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2529,
                contig: 'NZ_DS999712',
                offset: -2231
              },
              {
                beg: '435030',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: 'NZ_DS999712_435030_436592',
                size: 1563,
                end: '436592',
                offset_end: 2579,
                fid: 'fig|6666666.32028.peg.141',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 1017,
                contig: 'NZ_DS999712',
                offset: 1798
              },
              {
                beg: '431267',
                'function': 'FIG00451077: hypothetical protein',
                location: 'NZ_DS999712_431267_431440',
                size: 174,
                end: '431440',
                offset_end: -2573,
                fid: 'fig|6666666.32028.peg.136',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2746,
                contig: 'NZ_DS999712',
                offset: -2660
              },
              {
                beg: '436975',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: 'NZ_DS999712_436975_437523',
                size: 549,
                end: '437523',
                offset_end: 3510,
                fid: 'fig|6666666.32028.peg.142',
                strand: '+',
                type: 'peg',
                set_number: 10,
                offset_beg: 2962,
                contig: 'NZ_DS999712',
                offset: 3236
              },
              {
                beg: '429613',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_DS999712_429613_431136',
                size: 1524,
                end: '431136',
                offset_end: -2877,
                fid: 'fig|6666666.32028.peg.135',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4400,
                contig: 'NZ_DS999712',
                offset: -3639
              },
              {
                beg: '433735',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_DS999712_433735_434292',
                size: 558,
                end: '434292',
                color: 'red',
                offset_end: 279,
                fid: 'fig|6666666.32028.peg.139',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -278,
                contig: 'NZ_DS999712',
                offset: 0
              },
              {
                beg: '429467',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_DS999712_429467_428514',
                size: 954,
                end: '428514',
                offset_end: -4546,
                fid: 'fig|6666666.32028.peg.134',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5499,
                contig: 'NZ_DS999712',
                offset: -5023
              },
              {
                beg: '437551',
                'function': 'putative exported protein',
                location: 'NZ_DS999712_437551_437925',
                size: 375,
                end: '437925',
                offset_end: 3912,
                fid: 'fig|6666666.32028.peg.143',
                strand: '+',
                type: 'peg',
                set_number: 12,
                offset_beg: 3538,
                contig: 'NZ_DS999712',
                offset: 3725
              },
              {
                beg: '434289',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_DS999712_434289_434921',
                size: 633,
                end: '434921',
                offset_end: 908,
                fid: 'fig|6666666.32028.peg.140',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 276,
                contig: 'NZ_DS999712',
                offset: 592
              },
              {
                beg: '432257',
                'function': 'Sun protein',
                location: 'NZ_DS999712_432257_433546',
                size: 1290,
                end: '433546',
                offset_end: -467,
                fid: 'fig|6666666.32028.peg.138',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1756,
                contig: 'NZ_DS999712',
                offset: -1112
              },
              {
                beg: '437932',
                'function': 'High-affinity iron permease',
                location: 'NZ_DS999712_437932_438768',
                size: 837,
                end: '438768',
                offset_end: 4755,
                fid: 'fig|6666666.32028.peg.144',
                strand: '+',
                type: 'peg',
                set_number: 13,
                offset_beg: 3919,
                contig: 'NZ_DS999712',
                offset: 4337
              },
              {
                beg: '428430',
                'function': 'Cytochrome c family protein',
                location: 'NZ_DS999712_428430_427327',
                size: 1104,
                end: '427327',
                offset_end: -5583,
                fid: 'fig|6666666.32028.peg.133',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6686,
                contig: 'NZ_DS999712',
                offset: -6135
              }
            ],
            org_name: 'Brucella suis bv. 5 str. 513',
            end: 440013,
            mid: 434013,
            pinned_peg_strand: '+',
            genome_id: '6666666.32028',
            pinned_peg: 'fig|6666666.32028.peg.139',
            contig: 'NZ_DS999712'
          },
          {
            beg: 334801,
            features: [
              {
                beg: '340574',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: 'NZ_ACQA01000002_340574_341029',
                size: 456,
                end: '341029',
                color: 'red',
                offset_end: 228,
                fid: 'fig|6666666.32029.peg.3025',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -227,
                contig: 'NZ_ACQA01000002',
                offset: 0
              },
              {
                beg: '344950',
                'function': 'ATP-dependent endonuclease of the OLD family-like',
                location: 'NZ_ACQA01000002_344950_345261',
                size: 312,
                end: '345261',
                offset_end: 4460,
                fid: 'fig|6666666.32029.peg.3030',
                strand: '+',
                type: 'peg',
                set_number: 19,
                offset_beg: 4149,
                contig: 'NZ_ACQA01000002',
                offset: 4304
              },
              {
                beg: '339096',
                'function': 'Sun protein',
                location: 'NZ_ACQA01000002_339096_340493',
                size: 1398,
                end: '340493',
                offset_end: -308,
                fid: 'fig|6666666.32029.peg.3024',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1705,
                contig: 'NZ_ACQA01000002',
                offset: -1007
              },
              {
                beg: '337414',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: 'NZ_ACQA01000002_337414_336485',
                size: 930,
                end: '336485',
                offset_end: -3387,
                fid: 'fig|6666666.32029.peg.3022',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -4316,
                contig: 'NZ_ACQA01000002',
                offset: -3852
              },
              {
                beg: '346573',
                'function': 'Endoglucanase H (EC 3.2.1.4)',
                location: 'NZ_ACQA01000002_346573_346920',
                size: 348,
                end: '346920',
                offset_end: 6119,
                fid: 'fig|6666666.32029.peg.3033',
                strand: '+',
                type: 'peg',
                set_number: 24,
                offset_beg: 5772,
                contig: 'NZ_ACQA01000002',
                offset: 5945
              },
              {
                beg: '345491',
                'function': 'ATP-dependent DNA helicase UvrD/PcrA',
                location: 'NZ_ACQA01000002_345491_346018',
                size: 528,
                end: '346018',
                offset_end: 5217,
                fid: 'fig|6666666.32029.peg.3032',
                strand: '+',
                type: 'peg',
                set_number: 20,
                offset_beg: 4690,
                contig: 'NZ_ACQA01000002',
                offset: 4953
              },
              {
                beg: '336181',
                'function': 'hypothetical protein',
                location: 'NZ_ACQA01000002_336181_336375',
                size: 195,
                end: '336375',
                offset_end: -4426,
                fid: 'fig|6666666.32029.peg.3021',
                strand: '+',
                type: 'peg',
                set_number: 17,
                offset_beg: -4620,
                contig: 'NZ_ACQA01000002',
                offset: -4523
              },
              {
                beg: '337581',
                'function': 'Catalase (EC 1.11.1.6)',
                location: 'NZ_ACQA01000002_337581_339080',
                size: 1500,
                end: '339080',
                offset_end: -1721,
                fid: 'fig|6666666.32029.peg.3023',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -3220,
                contig: 'NZ_ACQA01000002',
                offset: -2471
              },
              {
                beg: '336137',
                'function': 'Cytochrome c family protein',
                location: 'NZ_ACQA01000002_336137_335307',
                size: 831,
                end: '335307',
                offset_end: -4664,
                fid: 'fig|6666666.32029.peg.3020',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -5494,
                contig: 'NZ_ACQA01000002',
                offset: -5079
              },
              {
                beg: '344785',
                'function': 'ATP-dependent endonuclease of the OLD family-like',
                location: 'NZ_ACQA01000002_344785_344913',
                size: 129,
                end: '344913',
                offset_end: 4112,
                fid: 'fig|6666666.32029.peg.3029',
                strand: '+',
                type: 'peg',
                set_number: 19,
                offset_beg: 3984,
                contig: 'NZ_ACQA01000002',
                offset: 4048
              },
              {
                beg: '333755',
                'function': "Inosine-5'-monophosphate dehydrogenase (EC 1.1.1.205)",
                location: 'NZ_ACQA01000002_333755_335248',
                size: 1494,
                end: '335248',
                offset_end: -5553,
                fid: 'fig|6666666.32029.peg.3019',
                strand: '+',
                type: 'peg',
                set_number: 26,
                offset_beg: -7046,
                contig: 'NZ_ACQA01000002',
                offset: -6300
              },
              {
                beg: '341755',
                'function': 'GMP synthase [glutamine-hydrolyzing] (EC 6.3.5.2)',
                location: 'NZ_ACQA01000002_341755_343326',
                size: 1572,
                end: '343326',
                offset_end: 2525,
                fid: 'fig|6666666.32029.peg.3027',
                strand: '+',
                type: 'peg',
                set_number: 22,
                offset_beg: 954,
                contig: 'NZ_ACQA01000002',
                offset: 1739
              },
              {
                beg: '343645',
                'function': 'Integrase',
                location: 'NZ_ACQA01000002_343645_343887',
                size: 243,
                end: '343887',
                offset_end: 3086,
                fid: 'fig|6666666.32029.peg.3028',
                strand: '+',
                type: 'peg',
                set_number: 18,
                offset_beg: 2844,
                contig: 'NZ_ACQA01000002',
                offset: 2965
              },
              {
                beg: '345258',
                'function': 'ATP-dependent DNA helicase UvrD/PcrA',
                location: 'NZ_ACQA01000002_345258_345494',
                size: 237,
                end: '345494',
                offset_end: 4693,
                fid: 'fig|6666666.32029.peg.3031',
                strand: '+',
                type: 'peg',
                set_number: 20,
                offset_beg: 4457,
                contig: 'NZ_ACQA01000002',
                offset: 4575
              },
              {
                beg: '341026',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: 'NZ_ACQA01000002_341026_341655',
                size: 630,
                end: '341655',
                offset_end: 854,
                fid: 'fig|6666666.32029.peg.3026',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 225,
                contig: 'NZ_ACQA01000002',
                offset: 539
              }
            ],
            org_name: 'Ochrobactrum intermedium LMG 3301',
            end: 346801,
            mid: 340801,
            pinned_peg_strand: '+',
            genome_id: '6666666.32029',
            pinned_peg: 'fig|6666666.32029.peg.3025',
            contig: 'NZ_ACQA01000002'
          },
          {
            beg: 2823027,
            features: [
              {
                beg: '2831949',
                'function': 'Periplasmic protein p19 involved in high-affinity Fe2+ transport',
                location: '3305_2831949_2832497',
                size: 549,
                end: '2832497',
                offset_end: 3470,
                fid: 'fig|6666666.32032.peg.2767',
                strand: '+',
                type: 'peg',
                set_number: 10,
                offset_beg: 2922,
                contig: '3305',
                offset: 3196
              },
              {
                beg: '2826494',
                'function': 'FIG00451077: hypothetical protein',
                location: '3305_2826494_2826667',
                size: 174,
                end: '2826667',
                offset_end: -2360,
                fid: 'fig|6666666.32032.peg.2761',
                strand: '+',
                type: 'peg',
                set_number: 9,
                offset_beg: -2533,
                contig: '3305',
                offset: -2447
              },
              {
                beg: '2824840',
                'function': 'Catalase (EC 1.11.1.6)',
                location: '3305_2824840_2826363',
                size: 1524,
                end: '2826363',
                offset_end: -2664,
                fid: 'fig|6666666.32032.peg.2760',
                strand: '+',
                type: 'peg',
                set_number: 4,
                offset_beg: -4187,
                contig: '3305',
                offset: -3426
              },
              {
                beg: '2832585',
                'function': 'putative exported protein',
                location: '3305_2832585_2832899',
                size: 315,
                end: '2832899',
                offset_end: 3872,
                fid: 'fig|6666666.32032.peg.2768',
                strand: '+',
                type: 'peg',
                set_number: 12,
                offset_beg: 3558,
                contig: '3305',
                offset: 3715
              },
              {
                beg: '2833703',
                'function': 'Ferredoxin',
                location: '3305_2833703_2835136',
                size: 1434,
                end: '2835136',
                offset_end: 6109,
                fid: 'fig|6666666.32032.peg.2770',
                strand: '+',
                type: 'peg',
                set_number: 14,
                offset_beg: 4676,
                contig: '3305',
                offset: 5392
              },
              {
                beg: '2827498',
                'function': 'Sun protein',
                location: '3305_2827498_2828787',
                size: 1290,
                end: '2828787',
                offset_end: -240,
                fid: 'fig|6666666.32032.peg.2763',
                strand: '+',
                type: 'peg',
                set_number: 3,
                offset_beg: -1529,
                contig: '3305',
                offset: -885
              },
              {
                beg: '2832906',
                'function': 'High-affinity iron permease',
                location: '3305_2832906_2833742',
                size: 837,
                end: '2833742',
                offset_end: 4715,
                fid: 'fig|6666666.32032.peg.2769',
                strand: '+',
                type: 'peg',
                set_number: 13,
                offset_beg: 3879,
                contig: '3305',
                offset: 4297
              },
              {
                beg: '2828800',
                'function': 'Phenylacetic acid degradation protein PaaD, thioesterase',
                location: '3305_2828800_2829255',
                size: 456,
                end: '2829255',
                color: 'red',
                offset_end: 228,
                fid: 'fig|6666666.32032.peg.2764',
                strand: '+',
                type: 'peg',
                set_number: 1,
                offset_beg: -227,
                contig: '3305',
                offset: 0
              },
              {
                beg: '2829993',
                'function': 'GMP synthase [glutamine-hydrolyzing], amidotransferase subunit (EC 6.3.5.2) / GMP synthase [glutamine-hydrolyzing], ATP pyrophosphatase subunit (EC 6.3.5.2)',
                location: '3305_2829993_2831555',
                size: 1563,
                end: '2831555',
                offset_end: 2528,
                fid: 'fig|6666666.32032.peg.2766',
                strand: '+',
                type: 'peg',
                set_number: 7,
                offset_beg: 966,
                contig: '3305',
                offset: 1747
              },
              {
                beg: '2824694',
                'function': 'Hydrogen peroxide-inducible genes activator',
                location: '3305_2824694_2823741',
                size: 954,
                end: '2823741',
                offset_end: -4333,
                fid: 'fig|6666666.32032.peg.2759',
                strand: '-',
                type: 'peg',
                set_number: 5,
                offset_beg: -5286,
                contig: '3305',
                offset: -4810
              },
              {
                beg: '2826711',
                'function': 'Disulfide bond formation protein DsbB, putative',
                location: '3305_2826711_2827322',
                size: 612,
                end: '2827322',
                offset_end: -1705,
                fid: 'fig|6666666.32032.peg.2762',
                strand: '+',
                type: 'peg',
                set_number: 8,
                offset_beg: -2316,
                contig: '3305',
                offset: -2011
              },
              {
                beg: '2823657',
                'function': 'Cytochrome c family protein',
                location: '3305_2823657_2822560',
                size: 1098,
                end: '2822560',
                offset_end: -5370,
                fid: 'fig|6666666.32032.peg.2758',
                strand: '-',
                type: 'peg',
                set_number: 6,
                offset_beg: -6467,
                contig: '3305',
                offset: -5919
              },
              {
                beg: '2829252',
                'function': "5'-methylthioadenosine nucleosidase (EC 3.2.2.16) / S-adenosylhomocysteine nucleosidase (EC 3.2.2.9)",
                location: '3305_2829252_2829884',
                size: 633,
                end: '2829884',
                offset_end: 857,
                fid: 'fig|6666666.32032.peg.2765',
                strand: '+',
                type: 'peg',
                set_number: 2,
                offset_beg: 225,
                contig: '3305',
                offset: 541
              }
            ],
            org_name: 'Brucella frogii 3305PacBio',
            end: 2835027,
            mid: 2829027,
            pinned_peg_strand: '+',
            genome_id: '6666666.32032',
            pinned_peg: 'fig|6666666.32032.peg.2764',
            contig: '3305'
          }
        ];

      return x;
    }
  });
});

