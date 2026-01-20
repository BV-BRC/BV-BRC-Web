define([
  'dojo/_base/declare', 'dgrid/Grid', 'dojo/store/JsonRest', 'dgrid/extensions/DijitRegistry',
  'dgrid/Keyboard', 'dgrid/Selection', './formatter', 'dgrid/extensions/ColumnResizer', 'dgrid/extensions/ColumnHider',
  'dgrid/extensions/DnD', 'dojo/dnd/Source', 'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/dom-construct',
  'dojo/topic', 'dgrid/editor', 'dijit/Menu', 'dijit/MenuItem', '../WorkspaceManager', 'dojo/on', 'dijit/form/TextBox',
  'dojo/dom-class', 'dojo/dom-attr', 'dojo/query', '../util/FavoriteFolders'
], function (
  declare, Grid, Store, DijitRegistry,
  Keyboard, Selection, formatter, ColumnResizer,
  ColumnHider, DnD, DnDSource,
  Deferred, aspect, lang, domConstruct,
  Topic, editor, Menu, MenuItem, WorkspaceManager, on, TextBox,
  domClass, domAttr, query, FavoriteFolders
) {
  return declare([Grid, ColumnHider, Selection, Keyboard, ColumnResizer, DijitRegistry], {
    columns: {
      favorite: {
        label: 'Favorite',
        field: 'path',
        get: function (item) {
          return item;
        },
        className: 'wsFavoriteColumn',
        formatter: formatter.wsFavoriteIndicator,
        hidden: true,
        unhidable: false,
        width: 28,
        resizable: false
      },
      type: {
        label: '',
        get: function (item) {
          if (item.type == 'job_result' && item.autoMeta && item.autoMeta.app) {
            return item.type + '_' + (item.autoMeta.app.id ? item.autoMeta.app.id : item.autoMeta.app);
          } else if (item.type == 'folder' && item.path.split('/').length <= 3) {
            if (item.global_permission != 'n')
            { return 'publicWorkspace'; }

            // determine if shared or not
            return item.permissions.length > 1 ? 'sharedWorkspace' : 'workspace';
          }
          return item.type;
        },
        className: 'wsObjIcon',
        formatter: formatter.wsItemType,
        unhidable: true
      },
      name: editor({
        label: 'Name',
        field: 'name',
        className: 'wsItemName',
        canEdit: function (obj, val) {
          return obj.id == 'untitled';
        },
        autoSave: true,
        editOn: 'click',
        editor: TextBox,
        editorArgs: { placeHolder: 'Untitled Folder', trim: true }
      }),
      size: {
        label: 'Size',
        field: 'size',
        get: function (item) {
          return item;
        },
        className: 'wsItemSize',
        hidden: false,
        formatter: formatter.objectOrFileSize
      },
      obj_type: {
        label: 'Type',
        field: 'type',
        className: 'wsItemType',
        hidden: true
      },
      job_type: {
        label: 'Service',
        field: 'autoMeta',
        className: 'wsItemJobType',
        hidden: true,
        get: function (item) {
          if (!item.autoMeta || !item.autoMeta.app || !item.autoMeta.app.id) {
            return '';
          }
          if (item.type === 'job_result') {
            return item.autoMeta.app.id;
          } else {
            return '';
          }
        }
      },
      owner_id: {
        label: 'Owner',
        field: 'owner_id',
        className: 'wsItemOwnerId',
        formatter: formatter.baseUsername,
        hidden: false
      },
      sharedWith: {
        label: 'Members',
        field: '_item',
        className: 'wsItemMembers',
        formatter: formatter.usersFormatter
      },
      creation_time: {
        label: 'Created',
        field: 'creation_time',
        className: 'wsItemCreationTime',
        formatter: formatter.date
      }
      /*
      userMeta: {
        label: "User Metadata",
        field: "userMeta",
        hidden: true
      }
      */
    },
    constructor: function () {
      this.dndParams.creator = lang.hitch(this, function (item, hint) {
        // console.log("item: ", item, " hint:", hint, "dataType: ", this.dndDataType);
        var avatar = domConstruct.create('div', {
          innerHTML: item.organism_name || item.ncbi_taxon_id || item.id
        });
        avatar.data = item;
        if (hint == 'avatar') {
          // create your avatar if you want
        }

        return {
          node: avatar,
          data: item,
          type: this.dndDataType
        };
      });

    },
    store: null,
    selectionMode: 'extended',
    allowTextSelection: false,
    deselectOnRefresh: false,
    minRowsPerPage: 50,
    bufferRows: 100,
    maxRowsPerPage: 1000,
    pagingDelay: 250,
    farOffRemoval: 2000,
    keepScrollPosition: true,
    rowHeight: 24,
    loadingMessage: 'Loading...',
    dndDataType: 'genome',
    dndParams: {
      accept: 'none',
      selfAccept: false,
      copyOnly: true
    },

    /*
      _setApiServer: function(server){
          console.log("_setapiServerAttr: ", server);
          this.apiServer = server;
          this.set('store', this.createStore(this.dataModel), this.buildQuery());
      },
    */

    _setTotalRows: function (rows) {
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
    },

    startup: function () {
      if (this._started) {
        return;
      }
      var _self = this;
      aspect.before(_self, 'renderArray', function (results) {
        Deferred.when(results.total, function (x) {
          _self.set('totalRows', x);
        });
      });

      // Update favorite stars after rows are rendered
      aspect.after(_self, 'renderArray', function (rows) {
        _self._updateAllFavoriteStars();
        return rows;
      });

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);

        var path = _self.path.split('/')[1] == 'public' ? '/public' + row.data.path : row.data.path;

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
        // console.log('after emit');
        // if (row.data.type == "folder"){
        //  Topic.publish("/select", []);

        //  Topic.publish("/navigate", {href:"/workspace" + row.data.path })
        //  _selection={};
        // }
      });

      this.on('.dgrid-content .dgrid-cell.wsObjIcon:click', function (evt) {
        var row = _self.row(evt);
        evt.preventDefault();
        evt.stopPropagation();

        var path = _self.path.split('/')[1] == 'public' ? '/public' + row.data.path : row.data.path;

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });

      });
      // _selection={};
      // Topic.publish("/select", []);

      this.on('dgrid-select', function (evt) {
        setTimeout(function () {
          var newEvt = {
            rows: evt.rows,
            selected: evt.grid.selection,
            grid: _self,
            bubbles: true,
            cancelable: true
          };
          on.emit(_self.domNode, 'select', newEvt);
        }, 250);
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

      // Click handler for favorite star in grid
      this.on('.dgrid-content .wsFavoriteGridStar:click', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var starPath = domAttr.get(evt.target, 'data-path');
        if (starPath && window.App && window.App.user) {
          FavoriteFolders.toggle(starPath).then(function (isFav) {
            _self._setGridStarState(evt.target, isFav);
          });
        }
      });

      // Subscribe to favorite changes to update star icons
      this._favoriteSubscription = Topic.subscribe('/FavoriteFolders/changed', function () {
        _self._updateAllFavoriteStars();
      });

      // see WorkspaceExplorerView.listWorkspaceContents for sorting
      _self.set('sort', [{ attribute: 'name', descending: false }] );

      this.inherited(arguments);
      this._started = true;
    },
    _setActiveFilter: function (filter) {
      // console.log("Set Active Filter: ", filter, "started:", this._started);
      this.activeFilter = filter;
      this.set('query', this.buildQuery());
    },

    buildQuery: function (table, extra) {
      var q = '?' + (this.activeFilter ? ('in(gid,query(genomesummary,and(' + this.activeFilter + ',limit(Infinity),values(genome_info_id))))') : '') + (this.extra || '');
      // console.log("Feature Grid Query:", q);
      return q;
    },
    createStore: function (dataModel) {
      // console.log("Create Store for ", dataModel, " at ", this.apiServer);
      var store = new Store({
        target: (this.apiServer ? (this.apiServer) : '') + '/' + dataModel + '/',
        idProperty: 'rownum',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        }
      });
      // console.log("store: ", store);
      return store;
    },

    _setGridStarState: function (starNode, isFavorite) {
      if (isFavorite) {
        domClass.remove(starNode, 'icon-star-o');
        domClass.add(starNode, 'icon-star');
        domClass.remove(starNode, 'not-favorite');
        domAttr.set(starNode, 'title', 'Remove from favorites');
      } else {
        domClass.remove(starNode, 'icon-star');
        domClass.add(starNode, 'icon-star-o');
        domClass.add(starNode, 'not-favorite');
        domAttr.set(starNode, 'title', 'Add to favorites');
      }
    },

    _updateAllFavoriteStars: function () {
      var _self = this;
      if (!window.App || !window.App.user) {
        return;
      }
      var stars = query('.wsFavoriteGridStar', this.domNode);
      stars.forEach(function (starNode) {
        var path = domAttr.get(starNode, 'data-path');
        if (path) {
          FavoriteFolders.isFavorite(path).then(function (isFav) {
            _self._setGridStarState(starNode, isFav);
          });
        }
      });
    },

    destroy: function () {
      if (this._favoriteSubscription) {
        this._favoriteSubscription.remove();
      }
      this.inherited(arguments);
    }

    // getFilterPanel: function () {
    //   // console.log("getFilterPanel()");
    //   return FilterPanel;
    // }

  });

});
