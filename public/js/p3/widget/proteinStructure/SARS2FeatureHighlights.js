define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  './HighlightBase',
  'dgrid/List',
  'dgrid/Selection',
  'p3/util/colorHelpers',
  'dojo/_base/Color'
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  HighlightBase,
  List,
  Selection,
  colorHelpers,
) {
  return declare( [HighlightBase], {
    accessionId: '',
    title: 'Features',
    positions: new Map(),
    FeatureList: declare([List, Selection]),
    features: null,
    color: '#0000ff',
    textColor: colorHelpers.WHITE,
    data: new Map([
      ['6VXX', new Map(
        [
          ['Beta strand', '27-30,40-43,46-55,61-67,83-85,90-98,103-109,111-114,116-121,123-125,126-131,133-146,151-163,168-171,184-197,200-215,223-230,237-241,243-246,263-269,271-279,281-283,285-290,310-314,324-328,333-335,343-345,354-358,360-362,375-381,388-390,391-403,411-413,431-437,452-454,457-459,476-478,481-483,485-488,491-494,499-501,506-516,518-520,524-526,536-543,546-554,565-567,573-577,584-588,595-600,609-612,639-641,643-645,648-652,663-667,670-675,691-696,702-704,712-715,717-728,733-736,785-790,811-813,829-833,842-845,858-861,890-892,982-984,1044-1056,1059-1069,1072-1079,1081-1085,1087-1100,1102-1106,1109-1113,1120-1122,1126-1128,1129-1134'],
          ['Coiled-coil region', '949-993,1176-1203'],
          ['Disulfide bond', '15-136,131-166,291-301,336-361,379-432,391-525,480-488,538-590,617-649,662-671,738-760,743-749,840-851,1032-1043,1082-1126'],
          ['Domain', '13-303,334-527'],
          ['Fusion peptide 1', '816-837'],
          ['Fusion peptide 2', '835-855'],
          ['Glycosylation site', '17,61,74,122,149,165,234,282,323,325,331,343,603,616,657,709,717,801,1074,1098,1134,1158,1173,1194'],
          ['Helix', '291-293,295-303,338-342,350-352,366-369,384-387,404-409,417-421,439-442,503-505,620-623,738-742,747-753,754-756,757-782,817-823,837-839,849-854,867-884,887-889,898-907,913-918,919-966,977-981,986-1032,1142-1145,1148-1153,1170-1201'],
          ['Heptad repeat 1', '920-970'],
          ['Heptad repeat 2', '1163-1202'],
          ['Mutagenesis site', '493,493,501,614,679-684,681-684,682-684'],
          ['Receptor-binding domain (RBD)', '319-541'],
          ['Receptor-binding motif 3B binding to human ACE2', '437-508'],
          ['Sequence variant', '614'],
          ['Short sequence motif', '1269-1273'],
          ['Signal peptide', '1-12'],
          ['Site', '685-686,815-816'],
          ['Spike protein S1', '13-685'],
          ['Spike protein S2', '686-1273'],
          ['Spike protein S2\'', '816-1273'],
          ['Topological domain', '13-1213,1235-1273'],
          ['Transmembrane region', '1214-1234'],
          ['Turn', '147-150,254-256,445-447,569-571,579-581,602-604,617-619,625-627,630-635,743-745,803-805,855-857,908-910,1040-1043,1117-1119']
        ]
      )],
      ['6VYB', new Map([
        ['Beta strand', '27-30,40-43,46-55,61-67,83-85,90-98,103-109,111-114,116-121,123-125,126-131,133-146,151-163,168-171,184-197,200-215,223-230,237-241,243-246,263-269,271-279,281-283,285-290,310-314,324-328,333-335,343-345,354-358,360-362,375-381,388-390,391-403,411-413,431-437,452-454,457-459,476-478,481-483,485-488,491-494,499-501,506-516,518-520,524-526,536-543,546-554,565-567,573-577,584-588,595-600,609-612,639-641,643-645,648-652,663-667,670-675,691-696,702-704,712-715,717-728,733-736,785-790,811-813,829-833,842-845,858-861,890-892,982-984,1044-1056,1059-1069,1072-1079,1081-1085,1087-1100,1102-1106,1109-1113,1120-1122,1126-1128,1129-1134'],
        ['Coiled-coil region', '949-993,1176-1203'],
        ['Disulfide bond', '15-136,131-166,291-301,336-361,379-432,391-525,480-488,538-590,617-649,662-671,738-760,743-749,840-851,1032-1043,1082-1126'],
        ['Domain', '13-303,334-527'],
        ['Fusion peptide 1', '816-837'],
        ['Fusion peptide 2', '835-855'],
        ['Glycosylation site', '17,61,74,122,149,165,234,282,323,325,331,343,603,616,657,709,717,801,1074,1098,1134,1158,1173,1194'],
        ['Helix', '291-293,295-303,338-342,350-352,366-369,384-387,404-409,417-421,439-442,503-505,620-623,738-742,747-753,754-756,757-782,817-823,837-839,849-854,867-884,887-889,898-907,913-918,919-966,977-981,986-1032,1142-1145,1148-1153,1170-1201'],
        ['Heptad repeat 1', '920-970'],
        ['Heptad repeat 2', '1163-1202'],
        ['Mutagenesis site', '493,493,501,614,679-684,681-684,682-684'],
        ['Receptor-binding domain (RBD)', '319-541'],
        ['Receptor-binding motif 3B binding to human ACE2', '437-508'],
        ['Sequence variant', '614'],
        ['Signal peptide', '1-12'],
        ['Site', '685-686,815-816'],
        ['Spike protein S1', '13-685'],
        ['Topological domain', '13-1213'],
        ['Turn', '147-150,254-256,445-447,569-571,579-581,602-604,617-619,625-627,630-635,743-745,803-805,855-857,908-910,1040-1043,1117-1119']
      ])],
      ['6M0J', new Map(
        [
          ['Beta strand', '324-328,333-335,343-345,354-358,360-362,375-381,388-390,391-403,411-413,431-437,452-454,457-459,476-478,481-483,485-488,491-494,499-501,506-516,518-520,524-526'],
          ['Disulfide bond', '336-361,379-432,391-525,480-488'],
          ['Domain', '334-527'],
          ['Glycosylation site', '323,325,331,343'],
          ['Helix', '338-342,350-352,366-369,384-387,404-409,417-421,439-442,503-505'],
          ['Mutagenesis site', '493,493,501'],
          ['Receptor-binding motif 3B binding to human ACE2', '437-508'],
          ['Turn', '445-447'],
        ])],
      ['6W41', new Map(
        [
          ['Beta strand', '324-328,333-335,343-345,354-358,360-362,375-381,388-390,391-403,411-413,431-437,452-454,457-459,476-478,481-483,485-488,491-494,499-501,506-516,518-520,524-526'],
          ['Disulfide bond', '336-361,379-432,391-525,480-488'],
          ['Domain', '334-527'],
          ['Glycosylation site', '323,325,331,343'],
          ['Helix', '338-342,350-352,366-369,384-387,404-409,417-421,439-442,503-505'],
          ['Mutagenesis site', '493,493,501'],
          ['Receptor-binding motif 3B binding to human ACE2', '437-508'],
          ['Turn', '445-447'],
        ])]
    ]),
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
      let options = [];
      if (accessionId && this.data.has(accessionId)) {
        options = Array.from(this.data.get(accessionId).keys());
      }
      if (this.features) {
        this.removeChild(this.features);
      }
      this.features = new this.FeatureList({
        selectionMode: 'multiple',
        selector: 'checkbox',
      });
      this.features.renderArray(options);
      this.addChild(this.features);
      this.features.on('dgrid-select', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          let coords = this.getCoordinates(this.get('accessionId'), row.data);
          if ( !coords) {
            continue;
          }
          newPositions.set( coords, this.color);
          domStyle.set(evt.grid.row(row.id).element, 'background-color', this.color);
          domStyle.set(evt.grid.row(row.id).element, 'color', this.textColor);
        }
        this.set('positions', newPositions);
      }));

      this.features.on('dgrid-deselect', lang.hitch(this, function (evt) {
        let newPositions = new Map(this.positions);
        for (let row of evt.rows) {
          newPositions.delete(this.getCoordinates(this.get('accessionId'), row.data));
          domStyle.set(evt.grid.row(row.id).element, 'background-color', 'inherit');
          domStyle.set(evt.grid.row(row.id).element, 'color', 'inherit');
        }
        this.set('positions', newPositions);
      }));
    },
    getCoordinates: function (accessionId, coordinateKey) {
      let featureMap = this.data.get(accessionId);
      if (featureMap) {
        return featureMap.get(coordinateKey);
      }
      return undefined;
    }
  });
});
