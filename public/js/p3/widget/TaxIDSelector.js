define([
  'dijit/form/FilteringSelect', 'dojo/_base/declare',
  'dojo/store/JsonRest', 'dojo/_base/lang', 'dojo/dom-construct',
  './TaxonNameSelector', 'dojo/on', 'dijit/TooltipDialog',
  'dijit/popup', '../util/PathJoin'

], function (
  FilteringSelect, declare,
  Store, lang, domConstr,
  TaxonNameSelector, on, TooltipDialog,
  popup, PathJoin
) {

  return declare([FilteringSelect], {
    apiServiceUrl: window.App.dataAPI,
    promptMessage: 'NCBI Taxonomy ID.',
    missingMessage: 'NCBI Tax ID is not specified.',
    placeHolder: '',
    searchAttr: 'taxon_id',
    queryExpr: '${0}',
    resultFields: ['taxon_id', 'taxon_name', 'lineage_names'],
    sort: [{ attribute: 'taxon_id' }],
    pageSize: 25,
    autoComplete: true,
    store: null,
    required: false,

    constructor: function () {
      var _self = this;
      if (!this.store) {
        this.store = new Store({
          target: PathJoin(this.apiServiceUrl, 'taxonomy') + '/',
          idProperty: 'taxon_id',
          headers: { accept: 'application/json', Authorization: (window.App.authorizationToken || '') }
        });
      }

      var orig = this.store.query;
      this.store.query = lang.hitch(this.store, function (query, options) {
        // console.log('query: ', query);
        // console.log('Store Headers: ', _self.store.headers);
        if (query[_self.searchAttr] && query[_self.searchAttr].toString().trim() != '') {
          var q = '?eq(' + _self.searchAttr + ',' + query[_self.searchAttr] + ')';
          if (_self.queryFilter) {
            q += _self.queryFilter;
          }

          if (_self.resultFields && _self.resultFields.length > 0) {
            q += '&select(' + _self.resultFields.join(',') + ')';
          }
          q += '&sort(+taxon_id)';
          // console.log('Q: ', q);
          return orig.apply(_self.store, [q, options]);
        }

        return [];

      });
    },

    labelFunc: function (item, store) {
      var label = item.taxon_id + ' [' + item.taxon_name + ']';
      return label;
    },
    isValid: function () {
      // Overrides ValidationTextBox.isValid()
      var error = !this.inherited(arguments);
      return !(error && this.required);
      // return !!this.item || (!this.required && this.get('displayedValue') == ""); // #5974
    }
  });
});
