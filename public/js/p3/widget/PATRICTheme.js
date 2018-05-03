define([
  'dojox/charting/SimpleTheme',
  'dojox/charting/themes/common'
], function (SimpleTheme, themes) {

  themes.PATRIC = new SimpleTheme({
    // PATRIC palette from DLP
    // colors: ["#1f497d", "#4f81bd", "#4bacc6", "#f79646", "#9bbb59"]

    // light blue 900 (#01579B), light blue 500 (#03A9F4),
    // teal 500 (#009688), amber 500 (#FFC107), grey 500 (#9E9E9E)
    // colors: ["#01579B", "#03A9F4", "#009688", "#FFC107", "#9E9E9E"]

    // blue 700, teal 400, lime 500, amber 500, grey 500
    colors: ['#1976D2', '#26A69A', '#CDDC39', '#FFC107', '#9E9E9E']
  });

  return themes.PATRIC;
});
