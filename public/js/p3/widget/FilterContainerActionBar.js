define([
  'dojo/_base/declare', './ContainerActionBar', 'dojo/_base/lang',
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

  function sortByLabel(firstEl, secondEl) {
    return (firstEl['label'] < secondEl['label']) ? -1 : (firstEl['label'] > secondEl['label'] ? 1 : 0)
  }

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

  function parseQuery(filter) {
    let _parsed
    try {
      _parsed = RQLParser.parse(filter);
    } catch (err) {
      console.log('Unable To Parse Query: ', filter);
      return;
    }

    const parsed = {
      parsed: _parsed,
      selected: [],
      byCategory: {},
      byRange: {},
      keywords: []
    };

    function walk(term) {
      // console.log('Walk: ', term.name, ' Args: ', term.args)
      let key, val
      switch (term.name) {
        case 'and':
        case 'or':
        case 'not':
          term.args.forEach(function (t) {
            walk(t);
          });
          break;
        case 'eq':
        case 'ne':
          key = decodeURIComponent(term.args[0]);
          val = decodeURIComponent(term.args[1]);
          parsed.selected.push({ field: key, value: val, op: term.name });
          if (!parsed.byCategory[key]) {
            parsed.byCategory[key] = [val];
          } else {
            parsed.byCategory[key].push(val);
          }
          break;
        case 'keyword':
          parsed.keywords.push(term.args[0]);
          break;
        case 'gt':
        case 'lt':
          key = decodeURIComponent(term.args[0]);
          val = decodeURIComponent(term.args[1]);
          parsed.selected.push({ field: key, value: val, op: term.name });
          parsed.byRange[key] = val
          break;
        // eslint-disable-next-line no-case-declarations
        case 'between':
          key = decodeURIComponent(term.args[0]);
          const lb = decodeURIComponent(term.args[1]);
          const ub = decodeURIComponent(term.args[2]);
          parsed.selected.push({ field: key, value: [lb, ub], op: term.name });
          parsed.byRange[key] = [lb, ub]
          break
        default:
          // console.log('Skipping Unused term: ', term.name, term.args);
      }
    }

    walk(_parsed);

    return parsed;
  }

  function setDifference(setA, setB) {
    const _diff = new Set(setA)
    for (const elem of setB) {
      _diff.delete(elem)
    }
    return _diff
  }

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
    apiServer: window.App.dataAPI,
    authorizationToken: window.App.authorizationToken,
    enableAnchorButton: false,
    constructor: function () {
      this._ffWidgets = {};
      this._ffValueButtons = {};
      this._filter = {};
      this._Searches = {};
      this._SearchesIdx = 0;
      this.minimized = true;
    },
    _setStateAttr: function (state) {
      state = state || {};
      this._set('state', state);
    },
    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }
      state.search = (state.search && (state.search.charAt(0) == '?')) ? state.search.substr(1) : (state.search || '');

      let oldVal, newVal;
      if (oldState) {
        oldVal = oldState.search;
        if (oldState.hashParams && oldState.hashParams.filter) {
          oldVal += oldState.hashParams.filter;
        }
      }

      if (state) {
        newVal = state.search;
        if (state.hashParams && state.hashParams.filter) {
          newVal += state.hashParams.filter;
        }
      }

      if (oldVal != newVal) {
        this._refresh();
      }
    },

    _refresh: function () {
      let parsedFilter = {}; // TODO: make this immutable
      const state = this.get('state') || {};

      if (state && state.hashParams && state.hashParams.filter) {
        if (state.hashParams.filter != 'false') {
          parsedFilter = parseQuery(state.hashParams.filter);
          this._filter = {};
        }

        this._set('filter', state.hashParams.filter);
      }

      this.keywordSearch.set('value', (parsedFilter && parsedFilter.keywords && parsedFilter.keywords.length > 0) ? parsedFilter.keywords.join(' ') : '');
      on(this.keywordSearch.domNode, 'keypress', function (evt) {
        const code = evt.charCode || evt.keyCode;
        if (code == 13) {
          focusUtil.curNode && focusUtil.curNode.blur();
        }
      });

      this.set('query', state.search);

      // for each of the facet widgets, get updated facet counts and update the content.
      Object.keys(this._ffWidgets).forEach(function (category) {
        this._ffWidgets[category].clearSelection();
        this._updateFilteredCounts(category, parsedFilter ? parsedFilter.byCategory : false, parsedFilter ? parsedFilter.keywords : []);
      }, this);

      // for each of the selected items in the filter, toggle the item on in  ffWidgets
      if (parsedFilter && parsedFilter.selected) {
        parsedFilter.selected.forEach(function (sel) {
          if (sel.field && !this._filter[sel.field]) {
            this._filter[sel.field] = [];
          }
          // build RQL query based on operator
          let qval
          if (sel.op === 'between') {
            qval = `between(${sel.field},${encodeURIComponent(sel.value[0])},${encodeURIComponent(sel.value[1])})`
          } else {
            qval = `${sel.op}(${sel.field},${encodeURIComponent(sel.value)})`
          }
          if (this._filter[sel.field].indexOf(qval) < 0) {
            this._filter[sel.field].push(qval);
          }

          if (this._ffWidgets[sel.field] && sel.op === 'eq') {
            this._ffWidgets[sel.field].toggle(sel.value, true);
          }
        }, this);
      } else {
        Object.keys(this._ffWidgets).forEach(function (cat) {
          this._ffWidgets[cat].clearSelection();
        }, this);
      }

      // build/toggle the top level selected filter buttons
      if (parsedFilter && parsedFilter.byCategory) {
        // build buttons from byCategory list
        Object.keys(parsedFilter.byCategory).forEach(function (cat) {
          const op = parsedFilter.selected.filter((sel) => sel.field === cat)[0].op;
          let selectedVals // array

          if (op === 'ne') {
            selectedVals = [`${parsedFilter.byCategory[cat]}`]
          } else {
            selectedVals = parsedFilter.byCategory[cat]
          }
          if (!this._ffValueButtons[cat]) {
            const ffv = this._ffValueButtons[cat] = new FilteredValueButton({
              category: cat,
              selected: selectedVals
            });
            domConstruct.place(ffv.domNode, this.centerButtons, 'last');
            ffv.startup();
          } else {
            // update existing button
            this._ffValueButtons[cat].set('selected', selectedVals);
          }
        }, this);

        // build buttons from byRange list
        Object.keys(parsedFilter.byRange).forEach(function (cat) {
          const op = parsedFilter.selected.filter((sel) => sel.field == cat)[0].op
          let selectedVal;
          if (op === 'lt') {
            selectedVal = `< ${parsedFilter.byRange[cat]}`
          } else if (op === 'gt') {
            selectedVal = `> ${parsedFilter.byRange[cat]}`
          } else {
            selectedVal = `between ${parsedFilter.byRange[cat][0]} and ${parsedFilter.byRange[cat][1]}`
          }

          if (!this._ffValueButtons[cat]) {
            const ffv = this._ffValueButtons[cat] = new FilteredValueButton({
              category: cat,
              selected: [selectedVal]
            });
            domConstruct.place(ffv.domNode, this.centerButtons, 'last');
            ffv.startup();
          } else {
            // update existing button
            this._ffValueButtons[cat].set('selected', [selectedVal]);
          }
        }, this)

        Object.keys(this._ffValueButtons).forEach(function (cat) {
          if (parsedFilter && (parsedFilter.byCategory[cat] || parsedFilter.byRange[cat])) {
            // legitimate
          } else {
            const b = this._ffValueButtons[cat];
            b.destroy();
            delete this._ffValueButtons[cat];
          }
        }, this);

      } else {
        // console.log("DELETE __ffValueButtons")
        Object.keys(this._ffValueButtons).forEach(function (cat) {
          const b = this._ffValueButtons[cat];
          b.destroy();
          delete this._ffValueButtons[cat];
        }, this);
      }

    },

    setButtonText: function (action, text) {
      const textNode = this._actions[action].textNode;
      textNode.innerHTML = text;
    },
    postCreate: function () {
      this.inherited(arguments);

      domConstruct.destroy(this.pathContainer);
      this.smallContentNode = domConstruct.create('div', {
        'class': 'minFilterView',
        style: { margin: '2px' }
      }, this.domNode);
      const table = this.smallContentNode = domConstruct.create('table', {
        style: {
          'border-collapse': 'collapse',
          margin: '0px',
          padding: '0px',
          background: '#fff'
        }
      }, this.smallContentNode);

      const tr = domConstruct.create('tr', {}, table);
      this.leftButtons = domConstruct.create('td', {
        style: {
          width: '1px',
          'text-align': 'left',
          padding: '4px',
          'white-space': 'nowrap',
          background: '#fff'
        }
      }, tr);
      this.containerNode = this.actionButtonContainer = this.centerButtons = domConstruct.create('td', {
        style: {
          border: '0px',
          'border-left': '2px solid #aaa',
          'text-align': 'left',
          padding: '4px',
          background: '#fff'
        }
      }, tr);
      this.rightButtons = domConstruct.create('td', {
        style: {
          'text-align': 'right',
          padding: '4px',
          background: '#fff',
          width: '1px',
          'white-space': 'nowrap'
        }
      }, tr);

      const _self = this;

      this.addAction('ToggleFilters', 'fa icon-filter fa-2x', {
        style: { 'font-size': '.5em' },
        label: 'FILTERS',
        validType: ['*'],
        tooltip: 'Toggle the filter display'
      },
        // callback
        (() => {
          on.emit(_self.currentContainerWidget.domNode, 'ToggleFilters', {});
        }),
        true,
        this.rightButtons
      );

      this.watch('minimized', lang.hitch(this, function (attr, oldVal, minimized) {
        if (this.minimized) {
          this.setButtonText('ToggleFilters', 'FILTERS');
        } else {
          this.setButtonText('ToggleFilters', 'HIDE');
        }
      }));

      if (this.enableAnchorButton) {
        this.addAction('AnchorCurrentFilters', 'fa icon-selection-Filter fa-2x', {
          style: { 'font-size': '.5em' },
          label: 'APPLY',
          validType: ['*'],
          tooltip: 'Apply the active filters to update your current view'
        },
          // callback
          (() => {
            if (_self.state && _self.state.hashParams && _self.state.hashParams.filter) {
              on.emit(this.domNode, 'SetAnchor', {
                bubbles: true,
                cancelable: true,
                filter: _self.state.hashParams.filter
              });
            }
          }),
          true,
          this.rightButtons
        );
      }

      // control menu bar
      this.filterWidget = domConstruct.create('div', {
        style: {
          display: 'flex',
        }
      }, this.domNode)

      this.fullViewContentNode = this.fullViewNode = domConstruct.create('div', {
        'class': 'FullFilterView',
        style: {
          'white-space': 'nowrap',
          'vertical-align': 'top',
          margin: '0px',
          // 'margin-top': '5px',
          background: '#333',
          padding: '0px',
          'overflow-y': 'hidden',
          'overflow-x': 'auto'
        }
      }, this.filterWidget);

      this.fullViewControlNode = domConstruct.create('div', {
        'class': 'FullFilterControl',
        style: {
          width: '20px',
          background: '#333'
        }
      }, this.filterWidget)
      this.buildAddFilters();

      // this keeps the user from accidentally going 'back' with a left swipe while horizontally scrolling
      on(this.fullViewNode, 'mousewheel', function (event) {
        const maxX = this.scrollWidth - this.offsetWidth;

        if (((this.scrollLeft + event.deltaX) < 0) || ((this.scrollLeft + event.deltaX) > maxX)) {
          event.preventDefault();
          // manually take care of the scroll
          this.scrollLeft = Math.max(0, Math.min(maxX, this.scrollLeft + event.deltaX));
          if (domClass.contains(event.target, 'FacetValue')) {
            this.scrollTop = 0; // Math.max(0, Math.min(maxY, this.scrollTop + event.deltaY));
          }
        }
      });

      const keywordSearchBox = domConstruct.create('div', {
        style: {
          display: 'inline-block',
          'vertical-align': 'top',
          'margin-top': '4px',
          'margin-left': '2px'
        }
      }, this.centerButtons);
      const ktop = domConstruct.create('div', {}, keywordSearchBox);
      const kbot = domConstruct.create('div', {
        style: {
          'vertical-align': 'top',
          padding: '0px',
          'margin-top': '4px',
          'font-size': '.75em',
          color: '#333',
          'text-align': 'left'
        }
      }, keywordSearchBox);
      domConstruct.create('span', { innerHTML: 'KEYWORDS', style: {} }, kbot);
      const clear = domConstruct.create('i', {
        'class': 'dijitHidden fa icon-x fa-1x',
        style: { 'vertical-align': 'bottom', 'font-size': '14px', 'margin-left': '4px' },
        innerHTML: ''
      }, kbot);

      on(clear, 'click', lang.hitch(this, function () {
        this.keywordSearch.set('value', '');
      }));

      this.keywordSearch = Textbox({ style: 'width: 300px;' });
      this.keywordSearch.set('intermediateChanges', true);

      this.keywordSearch.on('change', lang.hitch(this, function (val) {
        if (val) {
          domClass.remove(clear, 'dijitHidden');
        } else {
          domClass.add(clear, 'dijitHidden');
        }
        on.emit(this.keywordSearch.domNode, 'UpdateFilterCategory', {
          bubbles: true,
          cancelable: true,
          category: 'keywords',
          value: val
        });
      }));
      domConstruct.place(this.keywordSearch.domNode, ktop, 'last');
      this.watch('state', lang.hitch(this, 'onSetState'));

      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        // console.log('UpdateFilterCategory: ', evt)
        if (evt.category === 'keywords') {
          if (evt.value && (evt.value.charAt(0) == '"')) {
            this._filterKeywords = [evt.value];
          } else {
            this._filterKeywords = evt.value.split(' ')
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

        const cats = Object.keys(this._filter).filter(function (cat) {
          return this._filter[cat].length > 0;
        }, this);

        let fkws = []; // TODO: make this immutable
        if (this._filterKeywords) {
          this._filterKeywords.forEach(function (fk) {
            if (fk) {
              fkws.push(`keyword(${encodeURIComponent(fk)})`)
            }
          });
        }

        if (fkws.length < 1) {
          fkws = false;
        } else if (fkws.length == 1) {
          fkws = fkws[0];
        } else {
          fkws = 'and(' + fkws.join(',') + ')';
        }

        let filter = ''; // TODO: make this immutable
        if (cats.length < 1) {
          if (fkws) {
            filter = fkws;
          }
        } else if (cats.length == 1) {
          if (fkws) {
            filter = 'and(' + this._filter[cats[0]] + ',' + fkws + ')';
          } else {
            if (this._filter[cats[0]] instanceof Array && this._filter[cats[0]].length > 1) {
              filter = 'or(' + this._filter[cats[0]].join(',') + ')';
            } else {
              filter = this._filter[cats[0]];
            }
          }
        } else {
          const inner = cats.map(function (c) {
            if (this._filter[c] instanceof Array && this._filter[c].length > 1) {
              return 'or(' + this._filter[c].join(',') + ')';
            }
            return this._filter[c];

          }, this).join(',');

          if (this._filterKeywords) {
            filter = 'and(' + inner + ',' + fkws + ')';
          } else {
            filter = 'and(' + inner + ')';
          }
        }

        if (!filter) {
          filter = 'false';
        }
        this.set('filter', filter);
      }));

      // advanced search
      this.buildAdvancedSearchPanel()
      this.addAction('AdvSearch', 'fa icon-rocket fa-2x', {
        style: { 'font-size': '.5em' },
        label: 'ADV Search',
        tooltip: ''
      }, lang.hitch(this, () => {
        this.AdvancedSearchDialog.show()
      }), true, this.containerNode);
    },

    _updateFilteredCounts: function (category, selectionMap, keywords) {
      selectionMap = selectionMap || {};
      const cats = Object.keys(selectionMap);
      const w = this._ffWidgets[category];

      if (!w) {
        throw Error('No FacetFilter found for ' + category);
      }
      const scats = cats.filter(function (c) {
        if (c != category) {
          return true;
        }
      });

      let ffilter = []; // TODO: make it immutable

      if (keywords) {
        keywords.forEach(function (k) {
          ffilter.push('keyword(' + encodeURIComponent(k) + ')');
        });
      }

      scats.forEach(function (cat) {
        if (selectionMap[cat]) {
          if (selectionMap[cat].length == 1) {
            ffilter.push('eq(' + encodeURIComponent(cat) + ',' + encodeURIComponent(selectionMap[cat][0]) + ')');
          } else if (selectionMap[cat].length > 1) {
            ffilter.push('or(' + selectionMap[cat].map(function (c) {
              return 'eq(' + encodeURIComponent(cat) + ',' + encodeURIComponent(c) + ')';
            }).join(',') + ')');
          }
        }
      }, this);

      if (ffilter.length < 1) {
        ffilter = '';
      } else if (ffilter.length == 1) {
        ffilter = ffilter[0];
      } else {
        ffilter = 'and(' + ffilter.join(',') + ')';
      }

      let q = []; // TODO: make it immutable

      if (this.query) {
        q.push((this.query && (this.query.charAt(0) == '?')) ? this.query.substr(1) : this.query);
      }
      if (ffilter) {
        q.push(ffilter);
      }

      if (q.length == 1) {
        q = q[0];
      } else if (q.length > 1) {
        q = 'and(' + q.join(',') + ')';
      }

      this.getFacets('?' + q, [category]).then(lang.hitch(this, function (r) {
        if (!r) {
          return;
        }
        w.set('data', r[category]);
      }));
      // console.log(" Facet Query: ", ffilter)
    },

    updateFacets: function (selected) {
      // console.log('updateFacets(selected)', selected);

      this.set('selected', selected);
    },

    _setSelectedAttr: function (selected) {
      if (!selected || (selected.length < 1)) {
        Object.keys(this._ffValueButtons).forEach(function (b) {
          this._ffValueButtons[b].destroy();
          delete this._ffValueButtons[b];
        }, this);
        // clear selected facets;
      } else {
        const byCat = {};

        selected.forEach(function (sel) {
          if (this._ffWidgets[sel.field]) {
            this._ffWidgets[sel.field].toggle(sel.value, true);
          }
          if (!byCat[sel.field]) {
            byCat[sel.field] = [sel.value];
          } else {
            byCat[sel.field].push(sel.value);
          }
        }, this);

        Object.keys(byCat).forEach(function (cat) {
          if (!this._ffValueButtons[cat]) {
            const ffv = this._ffValueButtons[cat] = new FilteredValueButton({
              category: cat,
              selected: byCat[cat]
            });
            domConstruct.place(ffv.domNode, this.centerButtons, 'last');
          } else {
            this._ffValueButtons[cat].set('selected', byCat[cat]);
          }
        }, this);

      }
    },
    _setFacetFieldsAttr: function (fields) {
      this.facetFields = fields;
      if (!this._started) {
        return;
      }

      // filter when hidden attr is true
      fields.filter((el) => {
        return !el.facet_hidden
      }).forEach(lang.hitch(this, function (el) {
        this.addCategory(el.field || el, null, el.type || 'str');
      }));
    },
    buildAddFilters: function () {
      const fields = this.facetFields.map((ff) => {
        const field = ff.field || ff;
        return { id: field, label: field.replace(/_/g, ' '), value: field }
      })
      const m_store = new Memory({
        data: fields
      })
      const os = new ObjectStore({ objectStore: m_store });
      const selectBox = new CheckedMultiSelect({
        style: 'height: 400px',
        multiple: true,
        sortByLabel: false,
        store: os
      })
      // pre-populate existing facets
      const pre_selected = this.facetFields.filter((ff) => !ff.facet_hidden).map((ff) => ff.field)
      selectBox.set('value', pre_selected)

      on(selectBox, 'click', lang.hitch(this, function () {
        const all_selected = selectBox.get('value')
        const set_selected = new Set(all_selected)
        const all_exists = this.facetFields.filter(ff => !ff.facet_hidden).map(ff => ff.field)
        const set_exists = new Set(all_exists)
        const set_added = setDifference(set_selected, set_exists)
        const set_removed = setDifference(set_exists, set_selected)

        set_added.forEach((ff) => {
          const idx = os.objectStore.index[ff]
          this.facetFields[idx].facet_hidden = false
          if (this._ffWidgets[ff]) {
            this._ffWidgets[ff].toggleHidden()
          } else {
            this.addNewCategory(ff, this.facetFields[idx].type)
          }
        })
        set_removed.forEach((ff) => {
          const idx = os.objectStore.index[ff]
          this.facetFields[idx].facet_hidden = true
          this.removeCategory(ff)
        })
      }))

      // or activate dropdown
      const menu = new DropDownMenu({
        class: 'facetColumnSelector',
        style: 'display: none'
      })
      menu.addChild(selectBox)
      const button = new DropDownButton({
        iconClass: 'fa icon-gear fa-lg',
        label: '',
        dropDown: menu
      })

      domConstruct.place(button.domNode, this.fullViewControlNode, 'last');
    },

    createAdvancedSearchRow: function (_evt, isFirst = false) {
      const _row = AdvancedSearchRowForm({
        columnOptions: this.fieldSelectOptions,
        columnTypes: this.fieldTypes,
        isFirst: isFirst,
        index: this._SearchesIdx
      })
      domConstruct.place(_row.domNode, this.AdvancedSearchPanel, 'last')

      on(_row, 'remove', (evt) => {
        this._Searches[evt.idx].destroyRecursive()
      })
      on(_row, 'create', lang.hitch(this, 'createAdvancedSearchRow'))
      this._Searches[this._SearchesIdx] = _row
      this._SearchesIdx++;
    },
    buildAdvancedSearchPanel: function () {
      this.AdvancedSearchPanel = domConstruct.create('div', {
        'class': 'FormPanel'
      })

      const searchableFields = this.advancedSearchFields || this.facetFields.filter((ff) => ff.search)
      this.fieldSelectOptions = searchableFields.map((ff) => {
        const field = ff.field || ff;
        return { label: field.replace(/_/g, ' '), value: field }
      })
      this.fieldTypes = {}
      searchableFields.forEach((ff) => {
        this.fieldTypes[ff.field] = ff.type
      })

      // initial
      this.createAdvancedSearchRow(null, true)

      this.AdvancedSearchDialog = Dialog({
        style: 'width: 500px, height: 700px',
        content: this.AdvancedSearchPanel
      })

      const AdvSearchBtn = Button({
        label: 'Search',
        onClick: lang.hitch(this, 'buildFilterQueryFromAdvancedSearch')
      })
      domStyle.set(this.AdvancedSearchDialog.containerNode, {
        'text-align': 'center'
      })
      domConstruct.place(AdvSearchBtn.domNode, this.AdvancedSearchDialog.containerNode, 'last');
    },
    resetAdvancedSearchPanel: function () {
      // TODO: implement this and trigger when context has changed
    },
    buildFilterQueryFromAdvancedSearch: function () {
      Object.keys(this._Searches).map((idx) => {
        const col = this._Searches[idx]
        const condition = col.getValues()
        let q;
        if (condition.type === 'str') {
          q = `${condition.op === 'NOT' ? 'ne' : 'eq'}(${condition.column},${condition.value})`
        } else if (condition.type === 'date') {
          const encode = (date) => {
            if (!date) {
              return '';
            }

            const parsedDate = new Date(date);
            const utcDate = new Date(Date.UTC(
              parsedDate.getUTCFullYear(),
              parsedDate.getUTCMonth(),
              parsedDate.getUTCDate()
            ));
            return encodeURIComponent(utcDate.toISOString());
          };

          const lowerBound = encode(condition.from);
          const upperBound = encode(condition.to);

          if (lowerBound && upperBound) {
            q = `between(${condition.column},${lowerBound},${upperBound})`;
          } else if (lowerBound && !upperBound) {
            q = `gt(${condition.column},${lowerBound})`;
          } else if (!lowerBound && upperBound) {
            q = `lt(${condition.column},${upperBound})`;
          } else {
            // both bounds are invalid, skip
            return;
          }

          if (condition.op === 'NOT') {
            q = `not(${q})`;
          }
        } else {
          // numeric
          const lowerBound = parseInt(condition.from)
          const upperBound = parseInt(condition.to)

          if (!isNaN(lowerBound) && !isNaN(upperBound)) {
            q = `between(${condition.column},${lowerBound},${upperBound})`;
          } else if (!isNaN(lowerBound) && isNaN(upperBound)) {
            q = `gt(${condition.column},${lowerBound})`
          } else if (isNaN(lowerBound) && !isNaN(upperBound)) {
            q = `lt(${condition.column},${upperBound})`
          } else {
            // both NaN, skip
            return
          }
          if (condition.op === 'NOT') {
            q = `not(${q})`
          }
        }
        if (this._filter.hasOwnProperty(condition.column)) {
          this._filter[condition.column].push(q)
        } else {
          this._filter[condition.column] = [q]
        }
      })
      on.emit(this.domNode, 'UpdateFilterCategory', {})
      this.AdvancedSearchDialog.hide()
    },
    addNewCategory: function (field, type) {
      this.addCategory(field, null, type)
      this._updateFilteredCounts(field, undefined, [])
    },
    removeCategory: function (category) {
      if (this._ffWidgets[category]) {
        this._ffWidgets[category].setHidden()
      }
    },
    addCategory: function (name, values, type) {
      const cs = (this.selected) ? this.selected.filter((sel) => {
        return (sel.field === name)
      }) : []

      const f = this._ffWidgets[name] = new FacetFilter({
        category: name, data: values || undefined, selected: cs, type: type
      });
      domConstruct.place(f.domNode, this.fullViewContentNode, 'last');
    },

    _setQueryAttr: function (query) {
      if (!query) {
        return;
      }
      if (query == this.query) {
        return;
      }
      this._set('query', query);
      this.getFacets(query).then(lang.hitch(this, function (facets) {
        if (!facets) {
          return;
        }

        Object.keys(facets).forEach(function (cat) {
          if (this._ffWidgets[cat]) {
            const selected = this.state.selected;
            this._ffWidgets[cat].set('data', facets[cat], selected);
          }
        }, this);

      }, function (err) {
        console.error('Error Getting Facets: ', err)
      }));

    },

    getFacets: function (query, facetFields) {
      if (!query || query == '?') {
        const def = new Deferred();
        def.resolve(false);
        return def.promise;
      }

      const facets = 'facet(' + (facetFields || this.facetFields).map((field) => {
        return ( typeof (field) === 'string' ) ? `(field,${field})` : `(field,${field.field})`;
      }).join(',') + ',(mincount,1),(limit,-1))';

      const url = PathJoin(this.apiServer, this.dataModel, `?${query}&limit(1)&${facets}`)
      const fr = xhr(url, {
        method: 'GET',
        handleAs: 'json',
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        }
      });

      return fr.then((res) => {
        if (res && res.facet_counts && res.facet_counts.facet_fields) {
          return parseFacetCounts(res.facet_counts.facet_fields)
        }
      }, (err) => {
        console.error(`XHR Error with Facet Request. There was an error retreiving facets from: ${url}`)
        return err
      });
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._started = true;
      this.set('facetFields', this.facetFields);

      if (this.state) {
        this.onSetState('state', '', this.state);
      }

      if (this.currentContainerWidget) {
        this.currentContainerWidget.resize();
      }
    },
    resize: function (changeSize, resultSize) {
      const node = this.domNode;

      // set margin box size, unless it wasn't specified, in which case use current size
      if (changeSize) {

        domGeometry.setMarginBox(node, changeSize);
      }

      // If either height or width wasn't specified by the user, then query node for it.
      // But note that setting the margin box and then immediately querying dimensions may return
      // inaccurate results, so try not to depend on it.

      let mb = resultSize || {};
      lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
      if (!('h' in mb) || !('w' in mb)) {
        mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
      }

      if (this.smallContentNode) {
        const headerMB = domGeometry.getMarginBox(this.smallContentNode);
        // console.log("Header MB: ", headerMB);
        this.minSize = Math.max(headerMB.h, this.absoluteMinSize);
      } else {
        this.minSize = this.absoluteMinSize;
      }

      // console.log("THIS RESIZE: ", this);
      // console.log("mb.h: ", mb.h, " MinSize: ", this.minSize);
      if (mb.h && mb.h > this.minSize) {
        domGeometry.setMarginBox(this.fullViewNode, { w: mb.w, h: mb.h - this.minSize });
      }

      if (mb.h <= Math.max(this.minSize, this.absoluteMinSize)) {
        this.set('minimized', true);
      } else {
        this.set('minimized', false);
      }

      // Compute and save the size of my border box and content box
      // (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
      const cs = domStyle.getComputedStyle(node);
      const me = domGeometry.getMarginExtents(node, cs);
      const be = domGeometry.getBorderExtents(node, cs);
      const bb = (this._borderBox = {
        w: mb.w - (me.w + be.w),
        h: mb.h - (me.h + be.h)
      });
      const pe = domGeometry.getPadExtents(node, cs);
      this._contentBox = {
        l: domStyle.toPixelValue(node, cs.paddingLeft),
        t: domStyle.toPixelValue(node, cs.paddingTop),
        w: bb.w - pe.w,
        h: bb.h - pe.h
      };

      Object.keys(this._ffWidgets).forEach(function (name) {
        this._ffWidgets[name].resize({ h: mb.h - this.absoluteMinSize - 7 });
      }, this);

    },
    addAction: function (name, classes, opts, fn, enabled, target) {
      if (target && typeof target == 'string') {
        if (target == 'left') {
          target = this.leftButtons;
        } else if (target == 'right') {
          target = this.rightButtons;
        }
      }

      target = target || this.leftButtons;
      const wrapper = domConstruct.create('div', {
        'class': (enabled ? '' : 'dijitHidden ') + 'ActionButtonWrapper',
        rel: name
      });
      domConstruct.create('div', { className: 'ActionButton ' + classes }, wrapper);

      if (opts && opts.label) {
        const t = domConstruct.create('div', { innerHTML: opts.label, 'class': 'ActionButtonText' }, wrapper);

        domConstruct.place(wrapper, target, 'last');

        this._actions[name] = {
          options: opts,
          action: fn,
          button: wrapper,
          textNode: t
        };
      }

    }

  });
});
