define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SequenceFeatureJsonRest', './GridSelector'
], function (
  declare, lang, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    constructor: function () {
      this.queryOptions = {
        sort: [{attribute: 'sf_name', descending: false}]
      };
    },
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    dataModel: 'sequence_feature',
    primaryKey: 'id',
    deselectOnRefresh: true,
    selectAllFields: ['sf_name', 'sf_id', 'length', 'variant_types'],
    store: store,
    columns: {
      'Selection Checkboxes': selector({unhidable: true}),
      sf_name: {label: 'Sequence Feature (SF) Name', field: 'sf_name', hidden: false},
      sf_id: {label: 'Sequence Feature (SF) Identifier ', field: 'sf_id', hidden: false},
      gene: {label: 'Gene', field: 'gene', hidden: false},
      length: {label: 'SF Length', field: 'length', hidden: false},
      variant_types: {label: 'Variant Types', field: 'variant_types', hidden: false},
      sf_category: {label: 'SF Category', field: 'sf_category', hidden: false},
      segments: {label: 'Reference Positions', field: 'segments', hidden: false},

      segment: {label: 'Segment', field: 'segment', hidden: true},
      subtype: {label: 'Subtype', field: 'subtype', hidden: true},
      comments: {label: 'Comments', field: 'comments', hidden: true},
      //feature_type: {label: 'Evidence', field: 'feature_type', hidden: false}
    },
    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });

      this.inherited(arguments);

      this.refresh();
    }
  });
});
