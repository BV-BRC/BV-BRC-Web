define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/text!./templates/ProteinStructureHighlight.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/layout/ContentPane',
  './EpitopeGrid'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
  ContentPane,
  EpitopeGrid
) {
  return declare([ContentPane, Templated, WidgetsInTemplateMixin], {
    title: '',
    color: '',
    positions: new Map(),
    mode: '',
    store: null,
    templateString: templateString,
    selection: null,
    multiple: true,
    postCreate: function () {
      console.log('color is ' + this.color);
      if (this.color) {
        domStyle.set(this.highlightColor, 'background-color', this.color);
      }
      this.selection = new EpitopeGrid({
        id: this.id + '_select',
        name: 'highlight_color',
        title: 'Select to highlight',
        store: this.store,
        multiple: this.multiple
      });
      this.addChild(this.selection);

      this.selection.on('select', lang.hitch(this, function (evt) {
        const newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.set(row.data.coords, '[' + this.color.replace('#', 'x') + ']');
          domStyle.set(evt.grid.cell(row.id, 'checkbox').element, 'background-color', this.color);
        }
        console.log('highlight positions %s', JSON.stringify(newPositions));
        this.set('positions', newPositions);
      }));
      this.selection.on('deselect', lang.hitch(this, function (evt) {
        const newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.delete(row.data.coords);
          domStyle.set(evt.grid.cell(row.id, 'checkbox').element, 'background-color', 'inherit');
        }
        console.log('highlight positions %s', JSON.stringify(newPositions));
        this.set('positions', newPositions);
      }));
      this.highlightColorPalette.on('change', lang.hitch(this, function (color) {
        console.log('new color is ' + color);
        console.log('domNode is ' + this.highlightColor);
        domStyle.set(this.highlightColor, 'background-color', color);
        this.set('color', color);
      }));
    }
  });
});
