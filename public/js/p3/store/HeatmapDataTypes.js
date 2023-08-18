define([], function () {
  // function DataSet(/* array */rows, /* array */columns, rowTrunc, colTrunc, rowLabel, colLabel, /* array */colorStops, digits, offset, negativeBit, /* array */rTree, /* array */cTree){
  //  this.rows = rows;
  //  this.columns = columns;
  //  this.rowTrunc = rowTrunc;
  //  this.colTrunc = colTrunc;
  //  this.rowLabel = rowLabel;
  //  this.colLabel = colLabel;
  //  //this.countLabel = countLabel;
  //  this.offset = offset;
  //  this.digits = digits;
  //  this.negativeBit = negativeBit;
  //  this.rowTree = rTree;
  //  this.colTree = cTree;
  //  this.colorStops = colorStops;
  //
  //  this.cellLabelField = "";
  //  this.cellLabelsOverrideCount = false;
  //  this.beforeCellLabel = "";
  //  this.afterCellLabel = "";
  // }

// Creates a color stop to give to the heatmap
// `position` The *end* position of the color stop, expressed as a float between 0 and 1. Color stops defined at position 0 are ignored.
// `color` The color for the stop expressed as an integer (hexidecimal values OK)
  this.ColorStop = function (position, color) {
    this.position = position;
    this.color = color;
  };

  // Creates a new Row item for the heatmap.
  //
  // `order`    order of the item in the set
  // `rowID`    machine-readable identifier for the row
  // `rowLabel`    human-readable identifier for the row
  // `labelColor`  the foreground (text color) for the label
  // `bgColor`    the background (gradient color) for the label
  // `[meta]`    arbitrary object that contains any other meta data

  // function Row(order, rowID, rowLabel, labelColor, bgColor, meta){
  this.Row = function (order, rowID, rowLabel, labelColor, bgColor, meta) {
    this.order = order;
    this.rowID = rowID;
    this.rowLabel = rowLabel;
    this.labelColor = labelColor;
    this.bgColor = bgColor;
    this.meta = meta;
  };

  // Creates a new column item for the heatmap
  //
  // `order`    order of the item in the set
  // `colID`    machine-readable identifier for the row
  // `colLabel`    human-readable identifier for the row
  // `labelColor`  the foreground (text color) for the label
  // `distribution`  Distribution of column over rows using hex pairs; should follow row order.
  // `bgColor`    the background (gradient color) for the label
  // `[meta]`    arbitrary object that contains any other meta data.
  //
  // ### Distribution example:
  //    this.distribution = "0105F000";
  // * Row 1: 1 occurance
  // * Row 2: 5 occurances
  // * Row 3: 240 occurances
  // * Row 4: 0 occurances

  this.Column = function (order, colID, colLabel, dist, labelColor, bgColor, meta) {
    this.order = order;
    this.colID = colID;
    this.colLabel = colLabel;
    this.distribution = dist;
    this.labelColor = labelColor;
    this.bgColor = bgColor;
    this.meta = meta;
  };

  this.getColorStops = function (colorScheme, maxIntensity) {
    var colorStop = [];
    var colorUp = [255, 0, 0],
      colorDown = [0, 255, 0],
      colorZero = '0x000000',
      colorPercentage = [];
    var colorSignificantUp = '0xFF0000',
      colorSignificantDown = '0x00FF00';

    if (colorScheme === 'rgb') {
      colorUp = [255, 0, 0]; colorDown = [0, 255, 0]; colorZero = '0x000000';
      colorPercentage.push('20', '40', '60', '80');
      colorSignificantUp = '0xFF0000';
      colorSignificantDown = '0x00FF00';
    } else if (colorScheme === 'rbw') {
      colorUp = [255, 255, 255]; colorDown = [255, 255, 255]; colorZero = '0xFFFFFF';
      colorPercentage.push('80', '60', '40', '20');
      colorSignificantUp = '0xFF0000';
      colorSignificantDown = '0x0000FF';
    }

    for (var i = 1; i <= maxIntensity; i++) {
      switch (true) {
        case i < 5:
          colorStop.push(new this.ColorStop(i / maxIntensity, this.getColor(colorPercentage[i % 5 - 1], colorDown, colorScheme, 'down')));
          break;
        case i == 5:
          colorStop.push(new this.ColorStop(i / maxIntensity, colorSignificantDown));
          break;
        case i > 5 && i < 10:
          colorStop.push(new this.ColorStop(i / maxIntensity, this.getColor(colorPercentage[i % 5 - 1], colorUp, colorScheme, 'up')));
          break;
        case i == 10:
          colorStop.push(new this.ColorStop(i / maxIntensity, colorSignificantUp));
          break;
        case i == 11:
          colorStop.push(new this.ColorStop(i / maxIntensity, colorZero));
          break;
        default:
          break;
      }
    }
    return colorStop;
  };

  this.getColor = function (light, colorArr, scheme, value) {
    var rgb = {
        r: colorArr[0],
        g: colorArr[1],
        b: colorArr[2]
      },
      hsv = {};

    this.rgbTohsv(rgb, hsv);
    hsv.v = parseInt(light);
    this.hsvTorgb(hsv, rgb);

    if (scheme === 'rbw') {
      if (value === 'up') {
        return this.rgbTohex(255, rgb.g, rgb.b);
      }
      return this.rgbTohex(rgb.r, rgb.g, 255);

    }
    return this.rgbTohex(rgb.r, rgb.g, rgb.b);

  };

  this.rgbTohsv = function (RGB, HSV) {
    var r = RGB.r / 255;
    var g = RGB.g / 255;
    var b = RGB.b / 255;
    // Scale to unity.
    var minVal = Math.min(r, g, b);
    var maxVal = Math.max(r, g, b);
    var delta = maxVal - minVal;
    HSV.v = maxVal;
    if (delta == 0) {
      HSV.h = 0;
      HSV.s = 0;
    } else {
      HSV.s = delta / maxVal;
      var del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
      var del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
      var del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;
      if (r == maxVal) {
        HSV.h = del_B - del_G;
      } else if (g == maxVal) {
        HSV.h = (1 / 3) + del_R - del_B;
      } else if (b == maxVal) {
        HSV.h = (2 / 3) + del_G - del_R;
      }
      if (HSV.h < 0) {
        HSV.h += 1;
      }
      if (HSV.h > 1) {
        HSV.h -= 1;
      }
    }
    HSV.h *= 360;
    HSV.s *= 100;
    HSV.v *= 100;
  };

  this.hsvTorgb = function (HSV, RGB) {

    var h = HSV.h / 360;
    var s = HSV.s / 100;
    var v = HSV.v / 100;
    if (s === 0) {
      RGB.r = v * 255;
      RGB.g = v * 255;
      RGB.b = v * 255;
    } else {
      var var_h = h * 6;
      var var_i = Math.floor(var_h);
      var var_1 = v * (1 - s);
      var var_2 = v * (1 - s * (var_h - var_i));
      var var_3 = v * (1 - s * (1 - (var_h - var_i)));
      var var_r,
        var_g,
        var_b;

      switch (var_i) {
        case 0:
          var_r = v;
          var_g = var_3;
          var_b = var_1;
          break;
        case 1:
          var_r = var_2;
          var_g = v;
          var_b = var_1;
          break;
        case 2:
          var_r = var_1;
          var_g = v;
          var_b = var_3;
          break;
        case 3:
          var_r = var_1;
          var_g = var_2;
          var_b = v;
          break;
        case 4:
          var_r = var_3;
          var_g = var_1;
          var_b = v;
          break;
        default:
          var_r = v;
          var_g = var_1;
          var_b = var_2;
          break;
      }
      RGB.r = var_r * 255;
      RGB.g = var_g * 255;
      RGB.b = var_b * 255;
    }
  };

  this.componentToHex = function (c) {
    var hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  this.rgbTohex = function (r, g, b) {
    return '0x' + this.componentToHex(~~r) + this.componentToHex(~~g) + this.componentToHex(~~b);
  };

  this.distributionTransformer = function (dist, map) {
    var newDist = [];
    map.forEach(function (pos, idx) {
      newDist[idx] = dist.substr(pos * 2, 2);
    });
    return newDist.join('');
  };

  this.FilterStatus = (function () {
    return function () {
      this.init = function (idx, lbl, altLbl) {
        this.index = idx;
        this.status = 2; // 0: present, 1: absent, 2: don't care
        this.label = lbl;
        this.altLabel = altLbl;
      };
      this.setIndex = function (idx) {
        this.index = idx;
      };
      this.getIndex = function () {
        return this.index;
      };
      this.setStatus = function (sts) {
        this.status = sts;
      };
      this.getStatus = function () {
        return this.status;
      };
      this.getLabel = function () {
        return this.label;
      };
      return this;
    };
  }());

  return this;
});
