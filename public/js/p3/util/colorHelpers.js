/**
 * Functions related to colors
 */
define(['dojo/_base/Color'],
  function (
    Color
  ) {
    return {
      BLACK: Color.fromString('black'),
      WHITE: Color.fromString('white'),
      /**
       * Given a color, return either black or white as a contrasting text color
       * from https://24ways.org/2010/calculating-color-contrast/
       * @param color
       */
      contrastingTextColor: function (colorString) {
        colorString = '' + colorString;
        let color = Color.fromString(colorString);
        let rgb = color.toRgb();
        let yiq = ((rgb[0] * 299) + (rgb[1] * 587) + ( rgb[2] * 114 )) / 1000;
        return yiq > 128 ? this.BLACK : this.WHITE;
      }
    };
  });
