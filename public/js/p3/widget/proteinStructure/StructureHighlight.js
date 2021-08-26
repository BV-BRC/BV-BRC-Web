/**
 * Widget to highlight structures within a given protein. These are basically hard-coded.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dgrid/List',
  'dgrid/Selection',
  './HighlightBase',
], function (
  declare,
  lang,
  List,
  Selection,
  HighlightBase
) {
  return declare([HighlightBase],
    {
      title: 'Structure',
      color: '#ff00ff'
    });
});
