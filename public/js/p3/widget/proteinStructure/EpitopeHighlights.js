define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  './HighlightBase',
  '../EpitopeGrid',
  'p3/util/colorHelpers',
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  HighlightBase,
  EpitopeGrid,
  colorHelpers
) {
  return declare([HighlightBase], {
    title: 'Epitopes',
    updatingPositions: false,
    store: null,
    selection: null,
    multiple: true,
    textColor: colorHelpers.WHITE,
    postCreate: function () {
      this.inherited(arguments);
      this.watch('color', lang.hitch(this, function (attr, oldValue, newValue) {
        this.set('textColor', colorHelpers.contrastingTextColor(newValue));
      }));
      this.textColor = colorHelpers.contrastingTextColor(this.color);

      this.selection = new EpitopeGrid({
        id: this.id + '_select',
        name: 'highlight_color',
        title: 'Select to highlight',
        store: this.store,
        multiple: this.multiple
      });
      this.addChild(this.selection);

      this.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        if ( !this.updatingPositions ) {
          // console.log('setting %s.positions from outside', this.id);
          this.updatingPositions = true;
          this.selection.clearSelection();
          if (newValue) {
            for (let id of newValue) {
              this.selection.select(id);
            }
          }
          // console.log('%s.positions changed to %s', this.id, JSON.stringify(newValue));
          this.updatingPositions = false;
        }
      }));

      this.selection.on('select', lang.hitch(this, function (evt) {
        const newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.set(row.data.coords, this.color);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', this.color);
          domStyle.set(evt.grid.row(row.id).element, 'color', this.textColor);
        }
        if ( !this.updatingPositions) {
          this.updatingPositions = true;
          this.set('positions', newPositions);
          this.updatingPositions = false;
        }
      }));

      this.selection.on('deselect', lang.hitch(this, function (evt) {
        const newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.delete(row.data.coords);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', 'inherit');
          domStyle.set(evt.grid.row(row.id).element, 'color', 'inherit');
        }
        // console.log('highlight positions %s', JSON.stringify(newPositions));
        if ( !this.updatingPositions) {
          this.updatingPositions = true;
          this.set('positions', newPositions);
          this.updatingPositions = false;
        }
      }));
    }
  });
});
