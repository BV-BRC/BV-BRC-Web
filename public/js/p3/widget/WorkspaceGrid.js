define([
  'dojo/_base/declare', 'dgrid/Grid', 'dojo/store/JsonRest', 'dgrid/extensions/DijitRegistry',
  'dgrid/Keyboard', 'dgrid/Selection', './formatter', 'dgrid/extensions/ColumnResizer', 'dgrid/extensions/ColumnHider',
  'dgrid/extensions/DnD', 'dojo/dnd/Source', 'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/dom-construct',
  'dojo/topic', 'dgrid/editor', 'dijit/Menu', 'dijit/MenuItem', '../WorkspaceManager', 'dojo/on', 'dijit/form/TextBox'
], function (
  declare, Grid, Store, DijitRegistry,
  Keyboard, Selection, formatter, ColumnResizer,
  ColumnHider, DnD, DnDSource,
  Deferred, aspect, lang, domConstruct,
  Topic, editor, Menu, MenuItem, WorkspaceManager, on, TextBox
) {
  return declare([Grid, ColumnHider, Selection, Keyboard, ColumnResizer, DijitRegistry], {
    columns: {
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
        field: 'service',
        className: 'wsItemJobType',
        hidden: false,
        get: function (item) {
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
      },
      autoMeta: {
        label: "Metadata",
        field: "autoMeta",
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
    }

    // getFilterPanel: function () {
    //   // console.log("getFilterPanel()");
    //   return FilterPanel;
    // }

  });

});
