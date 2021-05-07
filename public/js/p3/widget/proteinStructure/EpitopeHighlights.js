define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  './HighlightBase',
  '../EpitopeGrid',
  'p3/util/colorHelpers',
  'dojo/text!/public/js/p3/resources/jsmol/sars2-epitopes.json',
  'dojo/store/Memory',
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  HighlightBase,
  EpitopeGrid,
  colorHelpers,
  epitopeDataString,
  MemoryStore
) {
  return declare([HighlightBase], {
    title: 'Epitopes',
    accessionId: '',
    updatingPositions: false,
    epitopeData: {},
    store: null,
    selection: null,
    multiple: true,
    textColor: colorHelpers.WHITE,
    postCreate: function () {
      this.inherited(arguments);
      this.epitopeData = JSON.parse(epitopeDataString);

      this.watch('color', lang.hitch(this, function (attr, oldValue, newValue) {
        this.set('textColor', colorHelpers.contrastingTextColor(newValue));
      }));
      this.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        this.updateEpitopes(newValue);
      }));
      this.textColor = colorHelpers.contrastingTextColor(this.color);

      this.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        if ( !this.updatingPositions ) {
          // console.log('setting %s.positions from outside', this.id);
          this.updatingPositions = true;

          if (this.selection) {
            this.selection.clearSelection();
          }
          if (newValue) {
            for (let id of newValue) {
              this.selection.select(id);
            }
          }
          // console.log('%s.positions changed to %s', this.id, JSON.stringify(newValue));
          this.updatingPositions = false;
        }
      }));
    },
    selectEpitope: function (evt) {
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
    },
    deselectEpitope: function (evt) {
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
    },
    updateEpitopes: function (accessionId) {
      if (this.selection) {
        this.removeChild(this.selection)
      }
      let memoryStore = new MemoryStore({
        idProperty: 'id',
        data: this.epitopeData[accessionId],
      });
      this.selection = new EpitopeGrid({
        name: 'highlight_color',
        title: 'Select to highlight',
        store: memoryStore,
        multiple: this.multiple
      });
      this.addChild(this.selection);

      this.selection.on('select', lang.hitch(this, this.selectEpitope));
      this.selection.on('deselect', lang.hitch(this, this.deselectEpitope));
    }
  });
});
