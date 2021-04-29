/**
 * Widget to highlight structures within a given protein. These are basically hard-coded.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './HighlightBase',
  'dijit/form/CheckBox'
], function (
  declare,
  lang,
  HighlightBase,
  CheckBox
) {
  return declare([HighlightBase],
    {
      title: 'Ligands',
      style: 'height:50px;',
      postCreate: function () {
        this.inherited(arguments);

        this.checkBox = new CheckBox({
          name: 'highlightLigands',
          value: 'true',
          checked: this.checked,
        });
        this.addChild(this.checkBox, 'first');

        this.checkBox.on('change', lang.hitch(this, function (value) {
          let positions = new Map();
          if (value) {
            positions.set('ligand', this.get('color'));
          }
          this.set('positions', positions);
        }));

        this.watch('color', lang.hitch(this, function (attr, oldValue, newValue) {
          let positions = new Map(this.positions);
          for (let key of positions.keys()) {
            positions.set(key, newValue);
          }
          this.set('positions', positions);
        }));
      }
    });
});
