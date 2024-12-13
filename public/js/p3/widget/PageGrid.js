define([
  'dojo/_base/declare', 'dgrid/Grid', 'dojo/store/JsonRest', 'dgrid/extensions/DijitRegistry', 'dgrid/extensions/Pagination',
  'dgrid/Keyboard', 'dgrid/Selection', './formatter', 'dgrid/extensions/ColumnResizer', './ColumnHider',
  'dgrid/extensions/DnD', 'dojo/dnd/Source', 'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', '../util/PathJoin',
  'dgrid/extensions/ColumnReorder', 'dojo/on', 'dojo/has', 'dojo/has!touch?./util/touch', './Confirmation','./GridCopyToClipboard'
], function (
  declare, Grid, Store, DijitRegistry, Pagination,
  Keyboard, Selection, formatter, ColumnResizer,
  ColumnHider, DnD, DnDSource,
  Deferred, aspect, lang, PathJoin,
  ColumnReorder, on, has, touchUtil, Confirmation,GridCopyToClipboard
) {

  var ctrlEquiv = has('mac') ? 'metaKey' : 'ctrlKey';
  // var hasUserSelect = has('css-user-select');
  var hasPointer = has('pointer');
  var hasMSPointer = hasPointer && hasPointer.slice(0, 2) === 'MS';
  // var downType = hasPointer ? hasPointer + (hasMSPointer ? 'Down' : 'down') : 'mousedown';
  var upType = hasPointer ? hasPointer + (hasMSPointer ? 'Up' : 'up') : 'mouseup';

  function byId(id) {
    return document.getElementById(id);
  }

  return declare([Grid, Pagination, ColumnReorder, ColumnHider, Keyboard, ColumnResizer, DijitRegistry, Selection,GridCopyToClipboard], {
    constructor: function () {
      this.dndParams.creator = lang.hitch(this, function (item, hint) {
        // console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
        var avatar = dojo.create('div', { innerHTML: item.organism_name || item.ncbi_taxon_id || item.id });
        avatar.data = item;
        if (hint == 'avatar') {
          // create your avatar if you want
        }
        return { node: avatar, data: item, type: this.dndDataType };
      });
    },
    store: null,
    selectionMode: 'extended',
    allowTextSelection: false,
    allowSelectAll: true,
    deselectOnRefresh: false,
    rowsPerPage: 200,
    minRowsPerPage: 25,
    bufferRows: 100,
    maxRowsPerPage: 200,
    pagingDelay: 250,
    maxSelectAll: 10000,
    noDataMessage: 'No results found.',
    farOffRemoval: 2000,
    selectAllFields: [],
    keepScrollPosition: true,
    rowHeight: 24,
    loadingMessage: 'Loading...',
    primaryKey: 'id',
    dndDataType: 'genome',
    dndParams: {
      accept: 'none',
      selfAccept: false,
      copyOnly: true
    },
    selectedData: {},

    row: function (target) {
      // summary:
      // Get the row object by id, object, node, or event
      var id;

      if (target instanceof this._Row) {
        return target;
      } // no-op; already a row

      if (target.target && target.target.nodeType) {
        // event
        target = target.target;
      }
      if (target.nodeType) {
        var object;
        do {
          var rowId = target.id;
          if ((object = this._rowIdToObject[rowId])) {
            return new this._Row(rowId.substring(this.id.length + 5), object, target);
          }
          target = target.parentNode;
        } while (target && target != this.domNode);
        return;
      }
      if (typeof target == 'object') {
        // assume target represents a store item
        if (this.store) {
          // console.log("Target Object: ", target);
          // console.log(" Store: ", this.store);
          id = this.store.getIdentity(target);
        } else {
          // console.log("target: ", target, " this: ", this);
          id = target;
          target = this._rowIdToObject[this.id + '-row-' + target[this.idProperty]];
        }
      } else {
        // assume target is a row ID
        id = target;
        target = this._rowIdToObject[this.id + '-row-' + id];
      }
      return new this._Row(id, target, byId(this.id + '-row-' + id));
    },

    _setApiServer: function (server, token) {
      // console.log("_setapiServerAttr: ", server);
      this.apiServer = server;
      var t = token || this.apiToken || '';
      this.set('store', this.createStore(this.dataModel, this.primaryKey, t), this.buildQuery());
    },

    apiToken: '',
    _setTotalRows: function (rows) {
      // console.log("this.id:", this.id, "_setTotalRows()");
      if (rows) {
        this.totalRows = rows;
        // console.log("Total Rows: ", rows);
        if (this.controlButton) {
          // console.log("this.controlButton: ", this.controlButton);
          if (!this._originalTitle) {
            this._originalTitle = this.controlButton.get('label');
          }
          this.controlButton.set('label', this._originalTitle + ' (' + rows + ')');
          // console.log(this.controlButton);
        }
      }
    },

    startup: function () {
      if (this._started) {
        return;
      }
      var _self = this;
      // console.log("this.hiderToggleNode: ", this.hiderToggleNode);
      // add hint for the show/hide column button
      this.hiderToggleNode.title = 'Click to show or hide columns';

      aspect.before(_self, 'renderArray', function (results) {
        Deferred.when(results.total, function (x) {
          _self.set('totalRows', x);
        });
      });

      if (this.copyToClipboard){
        this.on('keydown', lang.hitch(this, function (evt) {
          // console.log("onKeyPress", evt)
          if ((evt.key=="c" || evt.key=="C") && (evt.ctrlKey||evt.metaKey)){
            this._setCopying=true
          }
        }))

        this.on('keyup', lang.hitch(this, function (evt) {
          console.log("onKeyPress", evt)
          if (this._setCopying){
            this.copyToClipboard(true)
            this._setCopying=false
          }
        }))
      }

      if (!this.store && this.dataModel) {
        this.store = this.createStore(this.dataModel, this.primaryKey);
      }

      // Filter the sort options to only include valid grid columns
      if (this.queryOptions && this.queryOptions.sort && this.columns) {
        this.queryOptions.sort = this.queryOptions.sort.filter(sort => sort.attribute in this.columns);
      }

      this.inherited(arguments);
      this._started = true;

    },



    createStore: function (dataModel, pk, token) {
      // console.log("Create Store for ", dataModel, " at ", this.apiServer, " TOKEN: ", token);
      var store = new Store({
        target: PathJoin((this.apiServer ? (this.apiServer) : ''), dataModel) + '/',
        idProperty: pk,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'X-Requested-With': null,
          Authorization: token || (window.App.authorizationToken || '')
        }
      });
      // console.log("store: ", store);
      return store;
    },

    _selectAll: function () {
      var query = this.query;

      console.log('_sort: ', this._sortOptions, this);
      var fields = [this.primaryKey];
      var query = query + '&limit(' + this.maxSelectAll + ')';
      var sort = this.get('sort');
      console.log(' get sort: ', sort, 'QueryOPtions.sort: ', this.queryOptions.sort);
      if ((!sort || (sort && sort.length < 1)) && this.queryOptions && this.queryOptions.sort) {
        sort = this.queryOptions.sort;
      }

      sort = sort.map(function (s) {
        return (s.descending ? '-' : '+' ) + s.attribute;
      });
      query = query + '&sort(' + sort.join(',') + ')';

      query = query + '&select(' + fields.concat(this.selectAllFields || []).join(',') + ')';

      var _self = this;
      if (this.totalRows > this.maxSelectAll) {
        new Confirmation({
          content: 'This table exceeds the maximum selectable size of ' + this.maxSelectAll + ' rows.  Only the first ' + this.maxSelectAll + ' will be selected',
          cancelLabel: false
        }).show();
      }
      return this.store.query(query).then(function (results) {
        // console.log('_selectAll results: ', results);
        _self._unloadedData = {};

        return results.map(function (obj) {
          _self._unloadedData[obj[_self.primaryKey]] = obj;
          return obj[_self.primaryKey];
        });
      });
    },

    fullSelectAll: true,

    selectAll: function () {
      // console.log("FullSelectAll? ", this.fullSelectAll);
      if (this.fullSelectAll) {
        var _self = this;
        if (this._selectAll) {
          this._selectAll().then(function (ids) {
            // console.log("ids: ", ids)
            _self._all = true;
            _self.selection = {};

            // console.log("Select " + ids.length + " Items");
            ids.forEach(function (id) {

              _self._select(id, null, true);
            });
            // console.log("Call _fireSelectionEvents");
            _self._fireSelectionEvents();
          });
        }
      } else {
        this.allSelected = true;
        this.selection = {}; // we do this to clear out pages from previous sorts
        for (var i in this._rowIdToObject) {
          // guard-for-in
          if (Object.prototype.hasOwnProperty.call(this._rowIdToObject, i)) {
            var row = this.row(this._rowIdToObject[i]);
            this._select(row.id, null, true);
          }
        }
        this._fireSelectionEvents();
      }
    },

    _initSelectionEvents: function () {
      // summary:
      // Performs first-time hookup of event handlers containing logic
      // required for selection to operate.

      var grid = this,
        contentNode = this.contentNode,
        selector = this.selectionDelegate;

      this._selectionEventQueues = {
        deselect: [],
        select: []
      };

      if (has('touch') && !has('pointer') && this.selectionTouchEvents) {
        // Listen for taps, and also for mouse/keyboard, making sure not
        // to trigger both for the same interaction
        on(contentNode, touchUtil.selector(selector, this.selectionTouchEvents), function (evt) {
          grid._handleSelect(evt, this);
          grid._ignoreMouseSelect = this;
        });
        on(contentNode, on.selector(selector, this.selectionEvents), function (event) {
          if (grid._ignoreMouseSelect !== this) {
            grid._handleSelect(event, this);
          } else if (event.type === upType) {
            grid._ignoreMouseSelect = null;
          }
        });
      } else {
        // Listen for mouse/keyboard actions that should cause selections
        on(contentNode, on.selector(selector, this.selectionEvents), function (event) {
          grid._handleSelect(event, this);
        });
      }

      // Also hook up spacebar (for ctrl+space)
      if (this.addKeyHandler) {
        this.addKeyHandler(32, function (event) {
          grid._handleSelect(event, event.target);
        });
      }

      // If allowSelectAll is true, bind ctrl/cmd+A to (de)select all rows,
      // unless the event was received from an editor component.
      // (Handler further checks against _allowSelectAll, which may be updated
      // if selectionMode is changed post-init.)
      if (this.allowSelectAll) {
        this.on('keydown', function (event) {
          if (event[ctrlEquiv] && event.keyCode == 65 && !/\bdgrid-input\b/.test(event.target.className)) {
            event.preventDefault();
            if (grid.selection && Object.keys(grid.selection).length > 0) {
              console.log('ClearSelection()');
              grid.clearSelection();
            } else {
              console.log('selectAll()');
              grid.selectAll();
            }
          }
        });
      }

      // Update aspects if there is a store change
      if (this._setStore) {
        aspect.after(this, '_setStore', function () {
          grid._updateDeselectionAspect();
        });
      }
      this._updateDeselectionAspect();
    }

  });
});
