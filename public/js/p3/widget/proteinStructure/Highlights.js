define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/store/Memory',
  './HighlightBase',
  'dgrid/OnDemandGrid',
  'dgrid/Selection',
  'dgrid/selector',
  'p3/util/colorHelpers'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  MemoryStore,
  HighlightBase,
  OnDemandGrid,
  Selection,
  selector,
  colorHelpers
) {
  return declare( [HighlightBase], {
    index: '',
    type: '',
    accessionId: '',
    title: '',
    positions: new Map(),
    highlights: null,
    color: '',
    textColor: colorHelpers.WHITE,
    data: {},
    idProperty: '',
    columns: {},

    postCreate: function () {
      this.inherited(arguments);

      if (this.highlights) {
        this.removeChild(this.highlights);
      }

      this.highlights = new (declare([OnDemandGrid, Selection]))({
        store: new MemoryStore({idProperty: this.idProperty}),
        columns: {
          checkbox: selector({selectorType: 'checkbox', unhidable: true}),
          ...this.columns
        },
        allowSelectAll: true,
        selectionMode: 'none'
      });
      this.highlights.store.setData(this.data);
      this.highlights.refresh();

      this.addChild(this.highlights);

      this.highlights.on('dgrid-select', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        let newCoordinates = new Map(newPositions.get('coordinates'));
        for (let row of evt.rows) {
          newCoordinates.set( row.data.coords, this.color);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', this.color);
          domStyle.set(evt.grid.row(row.id).element, 'color', this.textColor);
        }
        newPositions.set('coordinates', newCoordinates);
        newPositions.set('index', this.index);
        this.set('positions', newPositions);
      }));

      this.highlights.on('dgrid-deselect', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        let newCoordinates = new Map(newPositions.get('coordinates'));
        for (let row of evt.rows) {
          newCoordinates.delete(row.data.coords);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', 'inherit');
          domStyle.set(evt.grid.row(row.id).element, 'color', 'inherit');
        }
        newPositions.set('coordinates', newCoordinates);
        newPositions.set('index', this.index);
        this.set('positions', newPositions);
      }));
    }
  });
});
