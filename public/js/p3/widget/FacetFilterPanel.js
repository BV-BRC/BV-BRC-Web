define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/Deferred',
  'dojo/dom-class', 'dojo/dom-construct', 'dijit/_WidgetBase',
  'dojo/request', 'dojo/_base/lang', 'dojo/dom-attr', 'dojo/query',
  'dojo/dom-geometry', 'dojo/dom-style', './FacetFilter', '../util/PathJoin'
], function (
  declare, on, Deferred,
  domClass, domConstruct, WidgetBase,
  xhr, lang, domAttr, Query,
  domGeometry, domStyle, FacetFilter, PathJoin
) {

  function parseFacetCounts(facets) {
    var out = {};

    Object.keys(facets).forEach(function (cat) {
      var data = facets[cat];
      if (!out[cat]) {
        out[cat] = [];
      }
      var i = 0;
      while (i < data.length - 1) {
        out[cat].push({ label: data[i], value: data[i], count: data[i + 1] });
        i += 2;
      }
    });
    return out;
  }

  return declare([WidgetBase], {
    baseClass: 'FacetFilterPanel',
    filter: '',
    query: '',
    facetFields: null,
    dataModel: '',
    apiServer: window.App.dataAPI,
    authorizationToken: window.App.authorizationToken,
    constructor: function () {
      this._ffWidgets = {};
    },
    getFacets: function (query) {
      var f = '&facet(' + this.facetFields.map(function (field) {
        return '(field,' + field + ')';
      }).join(',') + ',(mincount,1))';
      var url = PathJoin(this.apiServer, this.dataModel, query + '&limit(1)' + f);
      console.log('URL', url);

      return xhr.get(url, {
        handleAs: 'json',
        headers: { accept: 'application/solr+json' }
      }).then(function (response) {
        return parseFacetCounts(response.facet_counts.facet_fields);
      });
    },

    _setQueryAttr: function (query) {
      console.log('Set FilterPanel Query', query);
      this.query = query;
      this.getFacets(query).then(lang.hitch(this, function (facets) {
        Object.keys(facets).forEach(function (cat) {
          if (this._ffWidgets[cat]) {
            this._ffWidgets[cat].set('data', facets[cat]);
          } else {
            console.log('Missing ffWidget for : ', cat);
          }
        }, this);
      }));
    },

    _setFacetFieldsAttr: function (fields) {
      this.facetFields = fields;
      if (!this._started) {
        return;
      }

      fields.forEach(lang.hitch(this, function (f) {
        console.log('Field: ', f);
        this.addCategory(f, []);
      }));
    },

    postCreate: function () {
      this._filter = {};

      this.inherited(arguments);
      this._table = domConstruct.create('table', { style: { width: '100%' } }, this.domNode);
      this.table = domConstruct.create('tbody', {}, this._table);
      this.leftColumn = domConstruct.create('td', {
        innerHTML: '',
        style: { background: '#fff', width: '20px' }
      }, this.table);
      this.centerColumn = domConstruct.create('td', {
        innerHTML: '',
        style: { 'word-wrap': 'nowrap', 'overflow-x': 'auto', color: '#fff' }
      }, this.table);
      this.right = domConstruct.create('td', {
        innerHTML: '',
        style: { background: '#fff', width: '20px' }
      }, this.table);

      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        console.log('EVT: ', evt);
        this._filter[evt.category] = evt.filter;
        var cats = Object.keys(this._filter);
        console.log('Categories: ', cats);

        if (cats.length < 1) {
          console.log('UpdateFilterCategory Set Filter to empty');
          this._set('filter', '');
        } else if (cats.length == 1) {
          console.log('UpdateFilterCategory  set filter to ', this._filter[cats[0]]);
          this._set('filter', this._filter[cats[0]]);
        } else {
          console.log('UpdateFilterCategory set filter to ', 'and(' + cats.map(function (c) {
            return this._filter[c];
          }, this).join(',') + ')');
          this._set('filter', 'and(' + cats.map(function (c) {
            return this._filter[c];
          }, this).join(',') + ')');
        }

      }));

    },

    addCategory: function (name, values) {
      console.log('Add Category: ', name, values);
      var f = this._ffWidgets[name] = new FacetFilter({ category: name, data: values, selected: [] });
      domConstruct.place(f.domNode, this.centerColumn, 'last');
    },

    selectedToFilter: function (selected) {
      var f = {};
      selected.forEach(function (sel) {
        var parts = sel.split(':');
        var field = parts[0];
        var val = parts[1];
        if (!f[field]) {
          f[field] = [val];
        } else {
          var exists = f[field].indexOf(val);
          if (exists < 0) {
            f[field].push(val);
          }
        }
      }, this);
      console.log('F: ', f);

      var out = [];
      var fields = Object.keys(f);

      fields.forEach(function (field) {
        var data = f[field];
        if (data.length == 1) {
          out.push('eq(' + field + ',' + data[0] + ')');
        } else {
          var ored = [];

          data.forEach(function (d) {
            ored.push('eq(' + field + ',' + d + ')');
          });

          out.push('or(' + ored.join(',') + ')');
        }

      }, this);

      if (fields.length > 1) {
        out = 'and(' + out.join(',') + ')';
      } else {
        out = out.join('');
      }
      return out;
      // console.log('FILTER: ', out);
    },
    selected: null,
    _setSelectedAttr: function (selected) {
      if (selected) {

        console.log('set selected: ', selected);
        this.selected = selected;
        if (!this._started) {
          return;
        }
        Query('TD').forEach(function (node) {
          var rel = domAttr.get(node, 'rel');
          if (rel && this.selected && this.selected.indexOf(rel) >= 0) {
            domClass.add(node, 'FacetSelection');
          } else {
            domClass.remove(node, 'FacetSelection');
          }
        }, this);
      } else {
        Query('TD').forEach(function (node) {
          domClass.remove(node, 'FacetSelection');
        }, this);
      }
    },

    clearFilters: function () {

    },

    toggleInFilter: function (field, value) {
      console.log('toggleInFilter: ', this._filter);
      if (!this._filter[field]) {
        this._filter[field] = [value];
      } else {
        var exists = this._filter[field].indexOf(value);

        if (exists > -1) {
          this._filter[field] = this._filter[field].splice(exists, 1);
          if (this._filter[field] && (this._filter[field].length < 1)) {
            delete this._filter[field];
          }
        } else {
          this._filter[field].push(value);
        }
      }

      var out = [];
      var fields = Object.keys(this._filter);

      fields.forEach(function (field) {
        var data = this._filter[field];
        if (data.length == 1) {
          out.push('eq(' + field + ',' + data[0] + ')');
        } else {
          var ored = [];

          data.forEach(function (d) {
            ored.push('eq(' + field + ',' + d + ')');
          });

          out.push('or(' + ored.join(',') + ')');
        }

      }, this);

      if (fields.length > 1) {
        out = 'and(' + out.join(',') + ')';
      } else {
        out = out.join('');
      }

      this._set('filter', out);
    },

    _setFacetsAttr: function (facets) {
      this.facets = facets;

      if (!this._started) {
        return;
      }

      domConstruct.empty(this.table);

      Object.keys(this.facets).sort().forEach(function (category) {
        var catTR = domConstruct.create('tr', {}, this.table);

        domConstruct.create('th', {
          style: {
            background: 'inherit',
            'font-size': '1.3em',
            'padding-left': '4px',
            'padding-top': '10px',
            color: '#fff',
            'border-top': '0px',
            'border-bottom': '1px solid #efefef'
          },
          innerHTML: category
        }, catTR);

        this.facets[category].forEach(function (facet) {
          var tr = domConstruct.create('tr', {}, this.table);
          var label = facet.label;

          if (typeof facet.count != 'undefined') {
            label = label + ' (' + facet.count + ')';
          }

          domConstruct.create('td', {
            style: { 'padding-left': '10px' },
            rel: encodeURIComponent(category) + ':' + encodeURIComponent(facet.value || facet.label),
            innerHTML: label
          }, tr);
        }, this);

      }, this);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._started = true;
      this.set('facetFields', this.facetFields);
      // this.set("facets", this.facets);
      // this.set("selected", this.selected);
    },
    resize: function (changeSize, resultSize) {

      // summary:
      //              Call this to resize a widget, or after its size has changed.
      // description:
      //              ####Change size mode:
      //
      //              When changeSize is specified, changes the marginBox of this widget
      //              and forces it to re-layout its contents accordingly.
      //              changeSize may specify height, width, or both.
      //
      //              If resultSize is specified it indicates the size the widget will
      //              become after changeSize has been applied.
      //
      //              ####Notification mode:
      //
      //              When changeSize is null, indicates that the caller has already changed
      //              the size of the widget, or perhaps it changed because the browser
      //              window was resized.  Tells widget to re-layout its contents accordingly.
      //
      //              If resultSize is also specified it indicates the size the widget has
      //              become.
      //
      //              In either mode, this method also:
      //
      //              1. Sets this._borderBox and this._contentBox to the new size of
      //                      the widget.  Queries the current domNode size if necessary.
      //              2. Calls layout() to resize contents (and maybe adjust child widgets).
      // changeSize: Object?
      //              Sets the widget to this margin-box size and position.
      //              May include any/all of the following properties:
      //      |       {w: int, h: int, l: int, t: int}
      // resultSize: Object?
      //              The margin-box size of this widget after applying changeSize (if
      //              changeSize is specified).  If caller knows this size and
      //              passes it in, we don't need to query the browser to get the size.
      //      |       {w: int, h: int}

      var node = this.domNode;

      // set margin box size, unless it wasn't specified, in which case use current size
      if (changeSize) {
        domGeometry.setMarginBox(node, changeSize);
      }

      // If either height or width wasn't specified by the user, then query node for it.
      // But note that setting the margin box and then immediately querying dimensions may return
      // inaccurate results, so try not to depend on it.
      var mb = resultSize || {};
      lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
      if (!('h' in mb) || !('w' in mb)) {
        mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
      }

      // Compute and save the size of my border box and content box
      // (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
      var cs = domStyle.getComputedStyle(node);
      var me = domGeometry.getMarginExtents(node, cs);
      var be = domGeometry.getBorderExtents(node, cs);
      var bb = (this._borderBox = {
        w: mb.w - (me.w + be.w),
        h: mb.h - (me.h + be.h)
      });
      var pe = domGeometry.getPadExtents(node, cs);
      this._contentBox = {
        l: domStyle.toPixelValue(node, cs.paddingLeft),
        t: domStyle.toPixelValue(node, cs.paddingTop),
        w: bb.w - pe.w,
        h: bb.h - pe.h
      };

      Query('.FacetFilter', this.containerNode).forEach(function (n) {
        domGeometry.setMarginBox(n, { h: this._contentBox.h - 25 });
      }, this);

    }
  });
});
