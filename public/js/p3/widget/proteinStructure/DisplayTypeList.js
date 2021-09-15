/**
 *
 */
define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/string',
  'dgrid/List',
  'dgrid/Selection'
], function (
  declare,
  domConstruct,
  string,
  List,
  Selection
) {
  return declare([List, Selection], {
    selectionMode: 'single',
    renderRow: function (value) {
      var rowDiv = domConstruct.create('div',
        { style: 'padding: 0px 2px; margin: 2px;' }
      );
      domConstruct.create('img',
        {
          src: '/public/js/p3/resources/jsmol/' + value.icon,
          class: 'proteinStructure-action',
        }, rowDiv, 'last');
      domConstruct.create('span',
        {
          style: 'margin-left: 5px;',
          innerHTML: string.escape(value.label)
        }, rowDiv, 'last');
      return rowDiv;
    }
  });
});
