define([
  'dijit/form/FilteringSelect', 'dojo/_base/declare',
  'dojo/store/JsonRest', 'dojo/_base/lang', 'dojo/when',
  '../util/PathJoin'
], function (
  FilteringSelect, declare,
  Store, lang, when,
  PathJoin
) {

  return declare([FilteringSelect], {
    apiServiceUrl: window.App.dataAPI,
    promptMessage: 'Scientific name of the organism being annotated.',
    missingMessage: 'Scientific Name must be provided.',
    placeHolder: 'e.g. Bacillus Cereus',
    searchAttr: 'taxon_id',
    resultFields: ['taxon_name', 'taxon_id', 'taxon_rank', 'lineage_names'],
    rankAttrs: ['taxon_rank'],
    subStringAttrs: ['taxon_name'],
    promoteAttrs: ['taxon_id^3', 'taxon_rank^2'],
    intAttrs: ['taxon_id'],
    rankList: ['species', 'no rank', 'genus', 'subspecies', 'family', 'order', 'class', 'phylum', 'species group', 'suborder', 'varietas', 'species subgroup', 'subclass', 'subgenus', 'forma', 'superphylum', 'superkingdom', 'tribe', 'subfamily', 'subphylum'],
    // query: "?&select(taxon_name)",
    queryExpr: '${0}',
    pageSize: 25,
    highlightMatch: 'all',
    autoComplete: false,
    store: null,
    constructor: function () {
      this.constructorSOLR();
    },

    constructorSOLR: function () {
      var _self = this;
      if (!this.store) {
        this.store = new Store({
          target: PathJoin(this.apiServiceUrl, 'taxonomy') + '/',
          idProperty: 'taxon_id',
          headers: { accept: 'application/json', 'content-type': 'application/solrquery+x-www-form-urlencoded' }
        });
      }

      var orig = this.store.query;
      this.store.query = lang.hitch(this.store, function (query, options) {
        console.log('query: ', query);
        console.log('Store Headers: ', _self.store.headers);
        var q = '?q=';
        var extraSearch = [];
        var qString = query[_self.searchAttr].toString().replace(/\.\*|\[|\]/g, '');

        var rankParts = [];
        _self.rankList.forEach(function (rank) {
          var re = new RegExp('(\\b)' + rank + '(\\b)', 'gi');
          var newQString = qString.replace(re, '');
          if (newQString != qString) {
            rankParts.push(rank);
            qString = newQString.trim();
          }
        });

        var queryParts = qString ? qString.split(/[ ,]+/) : [];

        rankParts.forEach(function (qPart) {
          _self.rankAttrs.forEach(function (item) {
            extraSearch.push('(' + item + ':' + qPart + ')');
          });
        });

        queryParts.forEach(function (qPart) {
          _self.intAttrs.forEach(function (item) {
            if (!isNaN(qPart) && qPart) { // only if its a number
              extraSearch.push('(' + item + ':' + qPart + ')');
            }
          });
          _self.subStringAttrs.forEach(function (item) {
            if (qPart.length > 1) {
              extraSearch.push('(' + item + ':' + qPart + ')'); // for this attribute value an exact match valued more
              extraSearch.push('(' + item + ':*' + qPart + '*)');
            }
          });
        });
        if (queryParts.length) {
          _self.subStringAttrs.forEach(function (item) {
            extraSearch.push('(' + item + ':*' + queryParts.join('*') + '*)');
          });
        }

        q += '(' + extraSearch.join(' OR ') + ')';

        if (_self.queryFilter) {
          q += _self.queryFilter;
        }

        if (_self.resultFields && _self.resultFields.length > 0) {
          q += '&fl=' + _self.resultFields.join(',');
        }
        if (_self.promoteAttrs && _self.promoteAttrs.length > 0) {
          q += '&qf="' + _self.promoteAttrs.join(' ') + '"';
        }
        // var re = new RegExp("\\s+","gi");
        // q=q.replace(re,"+"); //hack appropriate web api handling spaces
        console.log('Q: ', q);
        return orig.apply(_self.store, [q, options]);
      });
    },
    constructorRQL: function () {
      var _self = this;
      if (!this.store) {
        this.store = new Store({
          target: this.apiServiceUrl + '/taxonomy/',
          idProperty: 'taxon_id',
          headers: { accept: 'application/json' }
        });
      }

      var orig = this.store.query;
      this.store.query = lang.hitch(this.store, function (query, options) {
        console.log('query: ', query);
        console.log('Store Headers: ', _self.store.headers);
        var q = '?';
        var extraSearch = [];
        var qString = query[_self.searchAttr].toString().replace(/\*|\[|\]/g, '');

        var rankParts = [];
        _self.rankList.forEach(function (rank) {
          var re = new RegExp('(\\b)' + rank + '(\\b)', 'gi');
          var newQString = qString.replace(re, '');
          if (newQString != qString) {
            rankParts.push(rank);
            qString = newQString.trim();
          }
        });

        var queryParts = qString ? qString.split(/[ ,]+/) : [];

        rankParts.forEach(function (qPart) {
          _self.rankAttrs.forEach(function (item) {
            extraSearch.push('eq(' + item + ',"' + qPart + '")');
          });
        });

        queryParts.forEach(function (qPart) {
          _self.intAttrs.forEach(function (item) {
            if (!isNaN(qPart) && qPart) { // only if its a number
              extraSearch.push('eq(' + item + ',' + qPart + ')');
            }
          });
          _self.subStringAttrs.forEach(function (item) {
            extraSearch.push('eq(' + item + ',' + qPart + ')'); // for this attribute value an exact match valued more
            extraSearch.push('eq(' + item + ',*' + qPart + '*)');
          });
        });
        if (queryParts.length) {
          _self.subStringAttrs.forEach(function (item) {
            extraSearch.push('eq(' + item + ',*' + queryParts.join('*') + '*)');
          });
        }

        q += 'or(' + extraSearch.join(',') + ')';

        if (_self.queryFilter) {
          q += _self.queryFilter;
        }

        if (_self.resultFields && _self.resultFields.length > 0) {
          q += '&select(' + _self.resultFields.join(',') + ')';
        }
        // var re = new RegExp("\\s+","gi");
        // q=q.replace(re,"+"); //hack appropriate web api handling spaces
        console.log('Q: ', q);
        return orig.apply(_self.store, [q, options]);
      });
    },
    onChange: function () {
      var _self = this;
      var taxObj = _self.get('item');
      _self.textbox.value = _self.labelFunc(taxObj, null);
      // _self.set("displayedValue", _self.labelFunc(taxObj,null));
    },
    isValid: function () {
      return (!this.required || this.get('displayedValue') != '');
    },
    labelFunc: function (item, store) {
      var label = '[' + item.taxon_id + '] [' + item.taxon_rank + '] ' + item.taxon_name;
      return label;
    },

    _setDisplayedValueAttr: function (/* String */ label, /* Boolean? */ priorityChange) {
      // summary:
      //   Hook so set('displayedValue', label) works.
      // description:
      //   Sets textbox to display label. Also performs reverse lookup
      //   to set the hidden value.  label should corresponding to item.searchAttr.

      if (label == null) {
        label = '';
      }

      // This is called at initialization along with every custom setter.
      // Usually (or always?) the call can be ignored.   If it needs to be
      // processed then at least make sure that the XHR request doesn't trigger an onChange()
      // event, even if it returns after creation has finished
      if (!this._created) {
        if (!('displayedValue' in this.params)) {
          return;
        }
        priorityChange = false;
      }

      // if (typeof text != 'undefined') {
      //   text = text.replace(/ /g, '%20');
      // }
      if (priorityChange) {
        return;
      }
      // Do a reverse lookup to map the specified displayedValue to the hidden value.
      // Note that if there's a custom labelFunc() this code
      if (this.store) {
        this.closeDropDown();
        var query = lang.clone(this.query); // #6196: populate query with user-specifics

        // Generate query
        var qs = this._getDisplayQueryString(label),
          q;
        if (this.store._oldAPI) {
          // remove this branch for 2.0
          q = qs;
        } else {
          // Query on searchAttr is a regex for benefit of dojo/store/Memory,
          // but with a toString() method to help dojo/store/JsonRest.
          // Search string like "Co*" converted to regex like /^Co.*$/i.
          q = this._patternToRegExp(qs);
          q.toString = function () {
            return qs;
          };
        }
        this._lastQuery = query[this.searchAttr] = q;

        // If the label is not valid, the callback will never set it,
        // so the last valid value will get the warning textbox.   Set the
        // textbox value now so that the impending warning will make
        // sense to the user
        this.textbox.value = label;
        this._lastDisplayedValue = label;
        this._set('displayedValue', label); // for watch("displayedValue") notification
        var _this = this;
        var options = {
          queryOptions: {
            ignoreCase: this.ignoreCase,
            deep: true
          }
        };
        lang.mixin(options, this.fetchProperties);
        this._fetchHandle = this.store.query(query, options);
        when(this._fetchHandle, function (result) {
          _this._fetchHandle = null;
          _this._callbackSetLabel(result || [], query, options, priorityChange);
        }, function (err) {
          _this._fetchHandle = null;
          if (!_this._cancelingQuery) { // don't treat canceled query as an error
            console.error('dijit.form.FilteringSelect: ' + err.toString());
          }
        });
      }
    }
  });
});
