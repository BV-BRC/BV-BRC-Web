define([
  'dijit/form/FilteringSelect', 'dojo/_base/declare',  'dojo/topic',
  'dojo/store/JsonRest', 'dojo/dom-construct', 'dijit/TooltipDialog',
  'dojo/on', 'dijit/popup', 'dojo/_base/lang',
  'dijit/form/CheckBox', 'dojo/string', 'dojo/when', 'dijit/form/_AutoCompleterMixin',
  '../util/PathJoin'
], function (
  FilteringSelect, declare, Topic,
  Store, domConstr, TooltipDialog,
  on, popup, lang, Checkbox,
  string, when, AutoCompleterMixin,
  PathJoin
) {

  return declare([FilteringSelect, AutoCompleterMixin], {
    apiServiceUrl: window.App.accountURL,
    // promptMessage: 'Select a user...',
    missingMessage: 'Search for a user...',
    placeHolder: 'Search for a user...',
    searchAttr: 'id',
    extraSearch: ['first_name', 'last_name'],
    queryExpr: 're:%5e${0}',
    queryFilter: '',
    resultFields: ['id', 'name', 'source'],
    includePrivate: true,
    includePublic: true,
    pageSize: 25,
    highlightMatch: 'all',
    autoComplete: false,
    store: null,
    labelType: 'html',
    constructor: function () {
      var _self = this;
      if (!this.store) {
        // https://user.patricbrc.org/user/?or(eq(last_name,re:%5eMac),eq(first_name,re:%5eMac))&http_accept=application/json
        this.store = new Store({
          target: PathJoin(this.apiServiceUrl, 'user') + '/',
          idProperty: 'id',
          headers: { accept: 'application/json', Authorization: (window.App.authorizationToken || '') }
        });
      }

      var orig = this.store.query;
      this.store.query = lang.hitch(this.store, function (query, options) {
        // not sure why this handle is being called multiple times, besides the queryExpr regex
        var q = query[_self.searchAttr].toString();
        if (q.indexOf('re:') != -1 && q.length < 8) {
          return;
        }

        var q = '';
        if (query[_self.searchAttr] && query[_self.searchAttr] != '') {
          if (_self.extraSearch) {
            var components = ['eq(' + _self.searchAttr + ',' + query[_self.searchAttr] + ')'];
            _self.extraSearch.forEach(lang.hitch(this, function (attr) {
              components.push('eq(' + attr,  query[_self.searchAttr] + ')');
            }));
            q = '?or(' + components.join(',') + ')';
          }
          else {
            q = '?eq(' + _self.searchAttr + ',' + query[_self.searchAttr] + ')';
          }
        }
        else {
          return [];
        }
        if (_self.queryFilter) {
          q += _self.queryFilter;
        }

        // only select what is in  _self.resultFields
        if (_self.resultFields && _self.resultFields.length > 0) {
          q += '&select(' + _self.resultFields.join(',') + ')';
        }

        q += '&limit(' + _self.pageSize + ')';

        return orig.apply(_self.store, [q, options]);
      });
    },

    _setIncludePublicAttr: function (val) {
      this.includePublic = val;
      if (this.includePublic && this.includePrivate) {
        this.queryFilter = '';
      } else if (this.includePublic && !this.includePrivate) {
        this.queryFilter = '&eq(public,true)';
      } else if (this.includePrivate && !this.includePublic) {
        this.queryFilter = '&eq(public,false)';
      } else {
        this.queryFilter = '&and(eq(public,true),eq(public,false))';
      }
    },

    _setIncludePrivateAttr: function (val) {
      this.includePrivate = val;
      if (this.includePublic && this.includePrivate) {
        this.queryFilter = '';
      } else if (this.includePublic && !this.includePrivate) {
        this.queryFilter = '&eq(public,true)';
      } else if (this.includePrivate && !this.includePublic) {
        this.queryFilter = '&eq(private,false)';
      } else {
        this.queryFilter = '&and(eq(private,true),eq(private,false))';
      }
    },

    postCreate: function () {
      this.inherited(arguments);

    },

    /* isValid: function(){
      return (!this.required || this.get('displayedValue') != "");
    }, */

    getSelected: function () {
      var user = this.get('item')
      return user.id.length ?  user.id + '@' + user.realm : null;
    },

    labelFunc: function (item, store) {
      var label = item.id + ('name' in item ? ' <<i>' + item.name + '</i>>' : '');
      return label;
    }
  });
});
