define([
  'dojox/charting/SimpleTheme',
  'dojox/charting/themes/common'
], function (SimpleTheme, themes) {

  themes.PATRIC = new SimpleTheme({

    colors: ['#493829', '#816C5B', '#A9A18C', '#613318', '#855723',
      '#B99C6B', '#8F3B1B', '#D57500', '#DBCA69', '#404F24',
      '#668D3C', '#BDD09F', '#4E6172', '#83929F', '#A3ADB8',
      '#C8707E'
    ]
  });

  return themes.PATRIC;
});
