define("p3/widget/FacetFilter", [
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/Deferred', 'dijit/_Templated',
  'dojo/dom-class', 'dojo/dom-construct', 'dijit/_WidgetBase',
  'dojo/_base/xhr', 'dojo/_base/lang', 'dojo/dom-attr', 'dojo/query',
  'dojo/dom-geometry', 'dojo/dom-style', 'dojo/when'
], function (
  declare, on, Deferred, Templated,
  domClass, domConstruct, WidgetBase,
  xhr, lang, domAttr, Query,
  domGeometry, domStyle, when
) {

  return declare([WidgetBase, Templated], {
    templateString: '<div class="${baseClass}"><div data-dojo-attach-point="categoryNode" class="facetCategory"></div><div style="" class="dataList" data-dojo-attach-point="containerNode"></div></div>',
    baseClass: 'FacetFilter',
    category: 'NAME',
    data: null,
    selected: null,

    constructor: function () {
      this._selected = {};
    },

    _setCategoryAttr: function (category) {
      var cat = category.replace(/_/g, ' ');
      this._set('category', category);

      if (this._started && this.categoryNode) {
        this.categoryNode.innerHTML = cat.replace(/_/g, ' ');
      }
    },

    _setDataAttr: function (data, selected) {

      // console.log("_setDataAttr", data, selected);
      if (selected) {
        this.selected = selected;
      }
      // console.log("_setData: ", data, "internal selected: ", this.selected, " Supplied Selection: ", selected, "Type: ", typeof data);
      if (!data) {
        return;
      }
      if (this.data && this.data instanceof Deferred) {
        var promise = this.data;
      }

      this.data = data;
      domConstruct.empty(this.containerNode);

      // console.log("_setDataAttr data.length: ", this.data.length)
      if (data.length < 1) {
        domClass.add(this.domNode, 'dijitHidden');
      } else {
        domClass.remove(this.domNode, 'dijitHidden');
      }

      // console.log("selected: ", this.selected)

      if (data.forEach) {

        data.forEach(function (obj) {
          var name = decodeURIComponent(obj.label || obj.val);
          // console.log("data obj: ", name, obj);
          var l = name + ((typeof obj.count != 'undefined') ? ('&nbsp;(' + obj.count + ')') : '');
          var sel;

          if (
            this._selected[name] ||
              (this.selected.indexOf(name) >= 0)
          ) {
            sel = 'selected';
          } else {
            sel = '';
          }
          // console.log("Obj: ", obj.label || obj.value, " Selected: ", sel);
          // var sel = ((this.selected.indexOf(obj.label || obj.value) >= 0)||(this._selected[obj.label||obj.value]))?"selected":"";
          var n = this['_value_' + name] = domConstruct.create('div', {
            rel: name,
            'class': 'FacetValue ' + sel,
            innerHTML: l
          });
          // console.log("*** Created Value Reference: ", "_value_" + (obj.label || obj.value), n)
          domConstruct.place(n, this.containerNode, sel ? 'first' : 'last');
          this.containerNode.scrollTop = 0;
        }, this);
        // this._refreshFilter();

        if (promise) {
          promise.resolve(true);
        }
      }
    },

    toggle: function (name, value) {
      name = name.replace(/"/g, '');
      // console.log("Toggle: ", name, value, " Data:", this.data);
      when(this.data, lang.hitch(this, function () {
        var node = this['_value_' + name];
        // console.log("Toggle Node: ", node, " Set to: ", value?"TRUE":"Opposite", domClass.contains(node, "Selected"));
        if (node) {
          // console.log("    Found Node")
          if (typeof value == 'undefined') {
            var isSelected = domClass.contains(node, 'selected');
            // console.log("isSelected: ", isSelected);
            domClass.toggle(node, 'selected');
            this._set('selected', this.selected.filter(function (i) {
              return (i != name) || ((i == name) && !isSelected);
            }));
          } else {
            if (value) {
              domClass.add(node, 'selected');
              if (this.selected.indexOf(name) < 0) {
                this.selected.push(name);
                this._set('selected', this.selected);
              }
            } else {
              domClass.remove(node, 'selected');
              this._set('selected', this.selected.filter(function (i) {
                return i != name;
              }));
            }
          }
        }
        // console.log(name, " this.selected: ", this.selected)
        if (this.selected && this.selected.length > 0) {
          domClass.add(this.categoryNode, 'selected');
        } else {
          domClass.remove(this.categoryNode, 'selected');
        }
        this.resize();
      }));
      // this._refreshFilter();
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this._started = true;
      this.inherited(arguments);

      this._refreshFilter();
    },
    _refreshFilter: function () {
      // console.log("FacetFilter _refreshFilter()  started: ", this._started);
      var selected = [];

      Query('.selected', this.containerNode).forEach(function (node) {
        // console.log(".selected Node: ", node)
        selected.push(domAttr.get(node, 'rel'));
      });
      // console.log("_refreshFilter selected() : ", selected);
      // var curFilter = this.filter;
      // this.filter =  "in(" + this.category + ",(" + selected.join(",") + "))";
      if (selected.length < 1) {
        this.filter = '';
      } else if (selected.length == 1) {
        this.filter = 'eq(' + this.category + ',' + encodeURIComponent('"' + selected[0] + '"') + ')';
      } else {
        this.filter = 'or(' + selected.map(function (s) {
          return 'eq(' + this.category + ',' + encodeURIComponent('"' + s + '"') + ')';
        }, this).join(',') + ')';
      }

      // console.log("_refreshFilter selected[]: ", selected)

      if (selected.length > 0) {
        domClass.add(this.categoryNode, 'selected');
      } else {
        domClass.remove(this.categoryNode, 'selected');
      }

      this._set('selected', selected);

      // console.log("selected: ", selected)
      // console.log("new filter: ", this.filter, " curFilter: ", curFilter);

      // if (this.filter != curFilter){
      // console.log("Emit UpdateFilterCategory: ", this.category, " Filter: ", this.filter, " Selected: ", selected);
      on.emit(this.domNode, 'UpdateFilterCategory', {
        category: this.category,
        filter: this.filter,
        selected: selected,
        bubbles: true,
        cancelable: true
      });
      // }
    },

    toggleItem: function (evt) {
      // var rel = domAttr.get(evt.target, 'rel');
      // console.log("onToggle: ", rel)
      domClass.toggle(evt.target, 'selected');
      this._refreshFilter();
    },

    clearSelection: function () {
      // console.log("CLEAR SELECTION")
      this.set('data', this.data, []);
      domClass.remove(this.categoryNode, 'selected');
    },

    postCreate: function () {
      this.inherited(arguments);
      on(this.domNode, '.FacetValue:click', lang.hitch(this, 'toggleItem'));
      if (this.categoryNode && this.category) {
        this.categoryNode.innerHTML = this.category.replace(/_/g, ' ');
      }
      if (!this.data) {
        this.data = new Deferred();
      }

    },

    resize: function (changeSize, resultSize) {
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

      var hmb = domGeometry.getMarginBox(this.categoryNode);

      // console.log("FacetFilter _contentBox: ", this._contentBox, " Header MB: ", hmb);

      domGeometry.setMarginBox(this.containerNode, { h: this._contentBox.h - hmb.h });

    }
  });
});
