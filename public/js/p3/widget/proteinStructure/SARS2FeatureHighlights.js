define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',

  'dojo/store/Memory',
  './HighlightBase',
  '../PageGrid',
  '../GridSelector',
  'p3/util/colorHelpers',
  'dojo/text!/public/js/p3/resources/jsmol/sars2-features.json'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  MemoryStore,
  HighlightBase,
  Grid,
  selector,
  colorHelpers,
  featureDataString
) {
  return declare( [HighlightBase], {
    accessionId: '',
    title: 'Features',
    positions: new Map(),
    FeatureList: declare([Grid], {
      columns: {
        checkbox: selector({ unhidable: true, selectorType: 'checkbox', width: 25 }),
        name: { label: 'Name', className: 'proteinStructure-hl-cell' }
      },
      selectionMode: 'multiple',
      store: null,
      showFooter: false,
      fullSelectAll: false,
    }),
    features: null,
    color: '#0000ff',
    textColor: colorHelpers.WHITE,
    data: JSON.parse(featureDataString),

    postCreate: function () {
      this.inherited(arguments);
      this.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        this.set('positions', new Map());
        this.updateOptions(newValue);
      }));
      this.updateOptions(this.accessionId);
      this.watch('color', lang.hitch(this, function (attr, oldValue, newValue) {
        this.set('textColor', colorHelpers.contrastingTextColor(newValue));
      }));
      this.textColor = colorHelpers.contrastingTextColor(this.color);
    },
    updateOptions: function (accessionId) {
      if (this.features) {
        this.removeChild(this.features);
      }
      let options = [];
      if (accessionId && this.data[accessionId]) {
        options = this.data[accessionId];
      }
      let store = new MemoryStore({
        idProperty: 'name',
        data: options,
      });
      this.features = new this.FeatureList({
        store: store,
      });
      this.addChild(this.features);

      this.features.on('dgrid-select', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.set( row.data.coords, this.color);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', this.color);
          domStyle.set(evt.grid.row(row.id).element, 'color', this.textColor);
        }
        this.set('positions', newPositions);
      }));

      this.features.on('dgrid-deselect', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.delete(row.data.coords);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', 'inherit');
          domStyle.set(evt.grid.row(row.id).element, 'color', 'inherit');
        }
        this.set('positions', newPositions);
      }));
    }
  });
});
