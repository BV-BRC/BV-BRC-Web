define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  './HighlightBase',
  '../EpitopeGrid'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  HighlightBase,
  EpitopeGrid
) {
  return declare([HighlightBase], {
    title: 'Epitopes',
    updatingPositions: false,
    store: null,
    selection: null,
    multiple: true,
    postCreate: function () {
      this.inherited(arguments);
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
          domStyle.set(evt.grid.cell(row.id, 'checkbox').element, 'background-color', this.color);
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
          domStyle.set(evt.grid.cell(row.id, 'checkbox').element, 'background-color', 'inherit');
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
