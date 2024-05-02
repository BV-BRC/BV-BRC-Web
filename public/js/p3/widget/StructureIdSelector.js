define([
  'dijit/form/FilteringSelect', 'dojo/_base/declare',
  'dojo/store/JsonRest', 'dojo/dom-construct', 'dijit/TooltipDialog',
  'dojo/on', 'dijit/popup', 'dojo/_base/lang', 'dojo/dom-construct',
  'dijit/form/CheckBox', 'dojo/string', 'dojo/when', 'dijit/form/_AutoCompleterMixin',
  '../util/PathJoin', 'dojo/request', 'dojo/store/Memory'
], function (
  FilteringSelect, declare,
  Store, domConstr, TooltipDialog,
  on, popup, lang, domConstr, Checkbox,
  string, when, AutoCompleterMixin,
  PathJoin, request, Memory
) {

  return declare([FilteringSelect, AutoCompleterMixin], {
    apiServiceUrl: window.App.dataServiceURL,
    promptMessage: 'Structure ID.',
    missingMessage: 'Specify protein structure ID.',
    placeHolder: 'e.g. 1AH5',
    searchAttr: 'pdb_id',
    queryExpr: '${0}*',
    queryFilter: '',
    resultFields: ['pdb_id', 'title', 'file_path'],
    startQueryFilter: true,
    pageSize: 25,
    highlightMatch: 'all',
    autoComplete: false,
    store: null,
    hostStore: null,
    labelType: 'html',
    constructor: function () {
      var _self = this;

      this.apiStore = new Store({
        target: PathJoin(this.apiServiceUrl, 'protein_structure') + '/',
        idProperty: 'pdb_id',
        headers: { accept: 'application/json', Authorization: (window.App.authorizationToken || '') }
      });
      // Fancy footwork for modified api query
      var api_query = this.apiStore.query;
      this.apiStore.query = lang.hitch(this.apiStore, function (query, options) {
        //  console.log('query: ', query);
        // console.log('Store Headers: ', _self.store.headers);
        var q = '';
        var searchAttrStripped = '';

        if (query[_self.searchAttr] && query[_self.searchAttr] != '') {

          // strip the non-alphanumeric characters from the query string
          searchAttrStripped = query[_self.searchAttr].toString().toUpperCase() + '*';
          // unfooling the highlighting `~!@#$%^&*()_|+\-=?;:'",<>\s]/g, ''), '*');


          if (_self.extraSearch) {
            var components = ['eq(' + _self.searchAttr + ',' + searchAttrStripped + ')'];
            _self.extraSearch.forEach(lang.hitch(this, function (attr) {
              components.push('eq(' + attr, searchAttrStripped + ')');
            }));
            q = '?or(' + components.join(',') + ')';
          }
          else {
            q = '?eq(' + _self.searchAttr + ',' + searchAttrStripped + ')';
          }
        }
        else {
          return [];
        }
        if (_self.queryFilter) {
          q += _self.queryFilter;
        }
        if (_self.resultFields && _self.resultFields.length > 0) {
          q += '&select(' + _self.resultFields.join(',') + ')';
        }

        console.log('Q: ', q);
        var res = api_query.apply(_self.store, [q, options]);
        console.log('res=' + res);
        return res;
      });

      if (!this.store) {
        this.store = this.apiStore;
      }

      // var conditionList = this.conditionStore.query({ id: query_id });
      // this.conditionStore.put(record);
      // var lrec = { count: 0, type: 'condition' }; // initialized to the number of libraries assigned


    },

    _setStartQueryFilterAttr: function (val) {
      this._setQueryFilter();
    },

    _setQueryFilter: function () {

      var public_filter = '';

      // console.log("Query Filter set to: " + this.queryFilter);
    },
    onChange: function () {
      console.log("on change");


    },

    postCreate: function () {
      this.inherited(arguments);
      /* Skip the filter
      this.filterButton = domConstr.create('i', {
        'class': 'fa icon-filter fa-1x',
        style: { 'float': 'left', 'font-size': '1.2em', margin: '2px' }
      });
      domConstr.place(this.filterButton, this.domNode, 'first');
      */

      // var dfc = '<div>Filter Genomes</div><div class="wsActionTooltip" rel="Public">Public</div><div class="wsActionTooltip" rel="private">My Genomes</div>'
      var dfc = domConstr.create('div');
      domConstr.create('div', { innerHTML: 'Filter Search', style: { 'font-weight': 900 } }, dfc);


      var filterTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(filterTT);
        }
      });

      /* on(this.filterButton, 'click', lang.hitch(this, function () {
        popup.open({
          popup: filterTT,
          around: this.domNode,
          orient: ['below']
        });

      })); */
    },

    /* isValid: function(){
      return (!this.required || this.get('displayedValue') != "");
    }, */
    labelFunc: function (item, store) {
      var label = '';
      label += item.pdb_id;


      return label;
    }

  });
});
