define([
  'dojo/_base/declare', './FilterContainerActionBar', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/dom-geometry', 'dojo/dom-style', 'dojo/dom-class',
  'dijit/form/TextBox', './FacetFilter', 'dojo/request', 'dojo/on',
  'rql/parser', './FilteredValueButton', 'dojo/query', 'dojo/_base/Deferred',
  'dojo/data/ObjectStore', 'dojo/store/Memory', 'dojox/form/CheckedMultiSelect',
  'dijit/form/DropDownButton', 'dijit/DropDownMenu',
  'dijit/Dialog', 'dijit/form/Button', 'dijit/form/Select', './AdvancedSearchRowForm',
  'dijit/focus', '../util/PathJoin'
], function (
  declare, ContainerActionBar, lang,
  domConstruct, domGeometry, domStyle, domClass,
  Textbox, FacetFilter, xhr, on,
  RQLParser, FilteredValueButton, Query, Deferred,
  ObjectStore, Memory, CheckedMultiSelect,
  DropDownButton, DropDownMenu,
  Dialog, Button, Select, AdvancedSearchRowForm,
  focusUtil, PathJoin
) {

  /*
  function sortByLabel(firstEl, secondEl) {
    return (firstEl['label'] < secondEl['label']) ? -1 : (firstEl['label'] > secondEl['label'] ? 1 : 0)
  }
  */

  /*
  function parseFacetCounts(facets) {
    const out = {};

    Object.keys(facets).forEach(function (cat) {
      const data = facets[cat];
      if (!out[cat]) {
        out[cat] = [];
      }
      let i = 0;
      while (i < data.length - 1) {
        out[cat].push({ label: data[i], value: data[i], count: data[i + 1] });
        i += 2;
      }
      out[cat].sort(sortByLabel)
    });
    return out;
  }
  */

  // referencing FilterContainerActionBar.js
  return declare([ContainerActionBar], {
    style: 'height: 52px; margin:0px; padding:0px; overflow: hidden;',
    minimized: true,
    minSize: 52,
    absoluteMinSize: 52,
    query: '',
    state: null,
    filter: '',
    facetFields: null,
    dataModel: '',
    enableAnchorButton: false,

    // TODO: going to have to override some functions
    filter: function () {
      console.log('filter csab');
      return this.inherited(arguments);
    },
    query: function (query) {
      if (query === '') {
        query = {};
      }
      return this.inherited(arguments);
    },

    constructor: function (options) {
      console.log('comp grid constructor');
      // debugger;
      this._ffWidgets = {};
      this._ffValueButtons = {};
      this._filter = {};
      this._Searches = {};
      this._SearchesIdx = 0;
      this.minimized = true;

    },

    initFilterData: function () {

    },

    onSetState: function (attr, oldState, state) {
      console.log('filter onSetState');
    },

    setFilterUpdateTrigger: function () {
      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        if (evt.category === 'keywords') {
          if (evt.value && (evt.value.charAt(0) == '"')) {
            this._filterKeywords = [evt.value];
          } else {
            this._filterKeywords = evt.value.split(/\s+/);
          }
        } else if (evt.category) {
          if (evt.filter) {
            this._filter[evt.category] = evt.filter;
          } else {
            delete this._filter[evt.category];
            if (this._ffWidgets[evt.category]) {
              this._ffWidgets[evt.category].clearSelection();
              if (this._ffValueButtons[evt.category]) {
                this._ffValueButtons[evt.category].destroy();
                delete this._ffValueButtons[evt.category];
              }
            }
          }
        }

        // Get filter keywords
        let fkws = []; // TODO: make this immutable
        if (this._filterKeywords) {
          this._filterKeywords.forEach(function (fk) {
            if (fk) {
              fkws.push(fk)
            }
          });
        }

        if (fkws.length < 1) {
          fkws = false;
        }

        const format_filter = function (keywords, facets) {
          var result = { };
          if (keywords) {
            console.log('enable keyword filtering:', keywords);
            result['fwks'] = keywords;
          }
          else {
            result['fwks'] = false;
          }
          if (Object.keys(facets).length > 0) {
            result['facets'] = {};
            // Filters are currently formatted for queries
            Object.keys(facets).forEach(function (cat) {
              var filter_string = facets[cat];
              if (filter_string.includes('or(')) {
                filter_string = filter_string.replaceAll('or(').slice(0, -1);
              }
              filter_string = filter_string.split(',eq');
              result['facets'][cat] = [];
              filter_string.forEach(lang.hitch(this, function (facet_str) {
                if (facet_str.includes('eq(')) { // first element
                  facet_str = facet_str.replace('eq(', '');
                } else {
                  facet_str = facet_str.substring(1);
                }
                facet_str = facet_str.slice(0, -1);
                facet_str = facet_str.substring(facet_str.indexOf(',') + 1);
                result['facets'][cat].push(decodeURIComponent(facet_str.replaceAll('%22', '')));
              }));
            })
          }
          else {
            result['facets'] = false;
          }
          return result;
        };

        let filter = format_filter(fkws, this._filter);

        this.set('filter', filter);
      }));
    },

    getFacets: function (data, facetFields) {

      var def = new Deferred();

      var facets = facetFields.filter((facet) => !facet.facet_hidden);
      // TODO: incorporate query
      var tmp_counts = {};
      facets.forEach(lang.hitch(this, function (facet) {
        console.log(facet);
        tmp_counts[facet.field] = {};
      }));
      data.forEach(lang.hitch(this, function (obj) {
        facets.forEach(lang.hitch(this, function (facet) {
          var facet_label = obj[facet.field];
          if (!Object.keys(tmp_counts[facet.field]).includes(facet_label)) {
            tmp_counts[facet.field][facet_label] = 0;
          }
          tmp_counts[facet.field][facet_label]++;
        }));
      }));
      const out = {};

      Object.keys(tmp_counts).forEach(function (cat) {
        const data = tmp_counts[cat];
        var label = Object.keys(data);
        var counts = Object.values(data);
        if (!out[cat]) {
          out[cat] = [];
        }
        for (var idx = 0; idx < label.length; idx++) {
          out[cat].push({ label: label[idx], value: label[idx], count: counts[idx] });
        }
        /*
        let i = 0;
        while (i < label.length - 1) {
          out[cat].push({ label: label[i], value: label[i], count: counts[i] });
          i += 2;
        }
        */
        // out[cat].sort(sortByLabel)
      }, this);
      setTimeout(function () { def.resolve(out); }, 1); // Moves this to next even loop, removing WILL break
      return def;
    },
    postCreate: function () {
      this.inherited(arguments);
    }
  });
});
