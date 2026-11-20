'use strict';

define([], function () {
  // Expand the alternatives so the API's RQL parser sees no nested parentheses.
  var patterns = [];
  ['0[1-9]', '1[0-2]'].forEach(function (month) {
    ['0[1-9]', '[12][0-9]', '3[01]'].forEach(function (day) {
      patterns.push('[0-9]{4}-' + month + '-' + day);
    });
  });
  return '/' + patterns.join('|') + '/';
});
