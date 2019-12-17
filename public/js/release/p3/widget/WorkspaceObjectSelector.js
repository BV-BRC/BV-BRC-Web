require({cache:{
'url:p3/widget/templates/WorkspaceObjectSelector.html':"<div style=\"padding:0px;\" data-dojo-attach-point=\"focusNode\" class=\"object-selector\">\n  <i class=\"icon-sort-alpha-asc\" title=\"Sort Alphabetically\" data-dojo-attach-event=\"click:sortAlpha\"></i>\n  <input type=\"hidden\" />\n  <input type=\"text\" class=\"search-box\" data-dojo-attach-point=\"searchBox\" data-dojo-type=\"dijit/form/FilteringSelect\" data-dojo-attach-event=\"onChange:onSearchChange, mouseenter:onMouseEnter\" data-dojo-props=\"labelType: 'html', promptMessage: '${promptMessage}', missingMessage: '${missingMessage}', searchAttr: 'name'\"\n    value=\"${value}\" />&nbsp;<i data-dojo-attach-event=\"click:openChooser\" class=\"fa icon-folder-open fa-1x\" />\n</div>\n"}});
define("p3/widget/WorkspaceObjectSelector", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/_base/lang', 'dojo/query',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/WorkspaceObjectSelector.html',
  './FlippableDialog', 'dijit/_HasDropDown', 'dijit/layout/ContentPane', 'dijit/form/TextBox',
  './WorkspaceExplorerView', 'dojo/dom-construct', '../WorkspaceManager', 'dojo/store/Memory',
  './Uploader', 'dijit/layout/BorderContainer', 'dojo/dom-attr', 'dijit/TooltipDialog', 'dijit/popup',
  'dijit/form/Button', 'dojo/_base/Deferred', 'dijit/form/CheckBox', 'dojo/topic', 'dijit/Tooltip',
  'dijit/registry', 'dgrid/editor', './formatter', 'dijit/form/FilteringSelect', 'dijit/form/Select'
], function (
  declare, WidgetBase, on, lang, query,
  domClass, Templated, WidgetsInTemplate,
  Template, Dialog, HasDropDown, ContentPane, TextBox,
  Grid, domConstr, WorkspaceManager, Memory,
  Uploader, BorderContainer, domAttr, TooltipDialog, popup,
  Button, Deferred, CheckBox, Topic, Tooltip,
  registry, editor, formatter, FilteringSelect, Select
) {

  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    baseClass: 'WorkspaceObjectSelector',
    templateString: Template,
    workspace: '',
    selection: '',
    value: '',
    path: '',
    disabled: false,
    required: false,
    isSortAlpha: false,
    showUnspecified: false,
    showHidden: window.App.showHiddenFiles,
    missingMessage: 'A valid workspace item is required.',
    promptMessage: 'Please choose or upload a workspace item',
    placeHolder: '',
    allowUpload: true,          // whether or not to add the upload button
    uploadingSelection: '',     // uploading in progress, to be copied to selection
    title: 'Choose or Upload a Workspace Object',
    autoSelectCurrent: false,    // if true, the folder currently being viewed is selected by default
    onlyWritable: false,        // only list writable workspaces
    selectionText: 'Selection', // the text used beside "selected" indicator
    allowUserSpaceSelection: false,   // this allows the user to select /user@patricbrc (for operations such as moving)
    reset: function () {
      this.searchBox.set('value', '');
    },
    _setPlaceHolderAttr: function (val) {
      if (this.searchBox) {
        this.searchBox.set('placeHolder', val);
      }
    },
    _setShowUnspecifiedAttr: function (val) {
      this.showUnspecified = val;
      if (val) {
        if (!(this.type.indexOf('unspecified') >= 0)) {
          this.type.push('unspecified');
        }
      } else {
        this.type = this.type.filter(function (t) {
          return (t != 'unspecified');
        });
      }
      if (this.grid) {
        this.grid.set('types', this.type);
      }
    },
    sortAlpha: function () {
      // but, isSortAlpha is never set to false
      // it should be possible to toggle instead
      this.isSortAlpha = true;
      this.refreshWorkspaceItems();
    },
    _setShowHiddenAttr: function (val) {
      this.showHidden = val;
      window.App.showHiddenFiles = val;

      if (this.grid) {
        this.grid.set('showHiddenFiles', val);
      }
    },

    _setDisabledAttr: function (val) {
      this.disabled = val;
      if (val) {
        domClass.add(this.domNode, 'disabled');
      } else {
        domClass.remove(this.domNode, 'disabled');
      }

      if (this.searchBox) {
        this.searchBox.set('disabled', val);
      }
    },
    _setRequiredAttr: function (val) {
      this.required = val;
      if (this.searchBox) {
        this.searchBox.set('required', val);
      }
    },

    // sets path, which is used for the dialog state (not for the dropbox)
    _setPathAttr: function (val) {
      if (!val) return; // for group selection (hacky)

      var self = this;

      // remove trailing '/' in path for consistency
      this.path = val[val.length - 1] === '/' ? val.substring(0, val.length - 1) : val;
      if (this.grid) {
        this.grid.set('path', val);
      }
      if (this.uploader) {
        this.uploader.set('path', val);
      }

      if (this.currentPathNode) {
        this.currentPathNode.innerHTML = val;
      }

      // hide/show new workspace/folder icons
      if (self.selectionPane) {
        var parts = this.path.split('/');

        // if public
        if (parts[1] == 'public') {
          domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload)
          { domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }

          // if usual workspace
        } else if (parts.length < 3) {
          domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.remove(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload)
          { domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }

          // else, is usual folder
        } else {
          domClass.remove(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload)
          { domClass.remove(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }
        }
      }

      this.cancelRefresh();
      this.refreshWorkspaceItems();

      // whether or not to allow top level
      var allowedLevel = this.allowUserSpaceSelection ? true : self.path.split('/').length > 2;

      // auto select the current folder if option is given
      if (this.autoSelectCurrent && allowedLevel) {
        var sel = self.sanitizeSelection(self.path);

        self.set('selection', {
          path: sel.path,
          name: sel.name
        });
      }

      // if level is not allowed, mark as N/A (dispalying a message)
      if (this.autoSelectCurrent && !allowedLevel) {
        self.set('selection', '*N/A*');
      }

    },
    _setTypeAttr: function (type) {
      this.type = Array.isArray(type) ? type : [type];

      if (this.grid) {
        this.grid.set('types', (['folder'].concat(this.type)));
      }
      this.cancelRefresh();
      this.refreshWorkspaceItems();
    },

    // sets value of object selector dropdown
    _setValueAttr: function (value, refresh) {
      this.value = value;
      if (this._started) {
        if (refresh) {
          this.refreshWorkspaceItems();
        } else {
          this.searchBox.set('value', this.value);
        }
      }

    },

    _getValueAttr: function (value) {
      return this.searchBox.get('value', value);
    },

    // sets selection of object selector form field
    _setSelectionAttr: function (val) {
      // allowing object selector to be used without form
      if (!val) return;

      this.selection = val;

      // need to ensure item is in store (for public workspaces),
      // this is more efficient than recursively grabing all public objects of a certain type
      if (this.selection !== '*none*') {
        try {
          this.store.add(this.selection);
        } catch (e) {
          // ignore error about duplicates
          // console.log('error adding ' + this.selection + ' to data store:', e);
        }
      }

      // ensure there is a dom node put selection info in
      if (!this.selValNode) return;

      // give help text for auto selecting parent folder
      var isCurrentlyViewed = (
        this.autoSelectCurrent &&
          this.type.length == 1 &&
          this.type[0] == 'folder' &&
          val.path == this.path
      );

      if (val == '*N/A*') {
        this.selValNode.innerHTML =
          '<span class="selectedDest"><b>' + this.selectionText +
          ':</b> (you must select a workspace or folder)</span>';
        this.okButton.set('disabled', true);
      } else if (!val) {
        this.selValNode.innerHTML =
          '<span class="selectedDest"><b>' + this.selectionText + ':</b> None.</span>';
        this.okButton.set('disabled', true);
      } else {
        this.selValNode.innerHTML = '<span class="selectedDest"><b>' +
          this.selectionText + ':</b> ' +
          val.name + (isCurrentlyViewed ? ' (currently viewing)' : '') + '<span>';
        this.okButton.set('disabled', false);
      }
    },

    postMixinProperties: function () {
      if (!this.value && this.workspace) {
        this.value = this.workspace;
      }
      this.inherited(arguments);
    },

    createSelectedPane: function () {
      var self = this;
      var wrap = domConstr.create('div', {});
      this.currentPathNode = domConstr.create('div', {
        innerHTML: this.path,
        style: { margin: '5px 0 0 0' }
      }, wrap);
      // domConstr.place('<br>', wrap)
      // var sel = domConstr.create("span", {innerHTML: '<b>Selection: </b>', style: "text-align: right"}, wrap);
      this.selValNode = domConstr.create('div', {
        innerHTML: '<span class="selectedDest"><b>' + this.selectionText + ':</b> None.</span>',
        style: { margin: '5px 0', 'float': 'left' }
      }, wrap);


      // create workspace button
      var createWSBtn = domConstr.create('i', {
        rel: 'createWS',
        'class': 'icon-add-workspace objSelectorActionIcon fa-2x'
      });
      on(createWSBtn, 'click', function () {
        Topic.publish('/openDialog', {
          type: 'CreateWorkspace'
        });
      });
      new Tooltip({
        connectId: createWSBtn,
        label: 'Create Workspace',
        position: ['above']
      });

      // create folder button
      var createFolderBtn = domConstr.create('i', {
        rel: 'createFolder',
        'class': 'icon-folder-plus objSelectorActionIcon fa-2x'
      });
      on(createFolderBtn, 'click', function () {
        Topic.publish('/openDialog', {
          type: 'CreateFolder',
          params: self.path
        });
      });
      new Tooltip({
        connectId: createFolderBtn,
        label: 'Create Folder',
        position: ['above']
      });

      var buttonContainer = domConstr.create('div', {
        style: {
          'font-size': '.85em',
          display: 'inline-block',
          'float': 'right',
          'text-align': 'right'
        },
        innerHTML: ''
      }, wrap);


        // upload button, if needed
      if (this.allowUpload) {
        var uploadBtn = domConstr.create('i', {
          rel: 'upload',
          'class': 'icon-upload objSelectorActionIcon fa-2x'
        });
        var uploadTooltip = new Tooltip({
          connectId: uploadBtn,
          label: 'Upload to current folder',
          position: ['above']
        });
        on(uploadBtn, 'click', function () {
          uploadTooltip.close();
        });
        domConstr.place(uploadBtn, buttonContainer);
      }

      domConstr.place(createWSBtn, buttonContainer);
      domConstr.place(createFolderBtn, buttonContainer);

      if (this.path.split('/').length <= 2) {
        domClass.add(query('[rel="createFolder"]', wrap)[0], 'dijitHidden');
        if (this.allowUpload)
        { domClass.add(query('[rel="upload"]', wrap)[0], 'dijitHidden'); }
      } else {
        domClass.add(query('[rel="createWS"]', wrap)[0], 'dijitHidden');
        if (this.allowUpload)
        { domClass.remove(query('[rel="upload"]', wrap)[0], 'dijitHidden'); }
      }

      return wrap;
    },
    focus: function () {
      // summary:
      //  Put focus on this widget
      if (!this.disabled && this.focusNode.focus) {
        try {
          this.focusNode.focus();
        } catch (e) {
          //
        }
        /* squelch errors from hidden nodes */
      }
    },

    openChooser: function () {
      this.refreshWorkspaceItems();
      var _self = this;

      // if dialog is already built, just show it
      if (this.dialog) {
        this.dialog.flip('front');
        this.dialog.show();
        return;
      }


      this.dialog = new Dialog({
        title: this.title,
        draggable: true
      });
      var frontBC = new BorderContainer({ style: { width: '805px', height: '650px' } });
      var backBC = new BorderContainer({
        style: {
          width: '805px',
          height: '700px',
          margin: '0',
          padding: '0px'
        }
      });

      var viewSelector = new Select({
        name: 'togglePublic',
        style: { width: '100px' },
        options: [
          {
            label: 'Workspaces',
            value: 'mine',
            selected: _self.path.split('/')[1] != 'public'
          }, {
            label: 'Public Workspaces',
            value: 'public',
            selected: _self.path.split('/')[1] == 'public'
          }
        ]
      });

      viewSelector.on('change', function (val) {
        if (val == 'mine') {
          var home = '/' + window.App.user.id;
          _self.set('path', home);
        } else if (val == 'public') {
          _self.set('path', '/public/');
        }
      });

      domConstr.place(frontBC.domNode, this.dialog.containerNode, 'first');

      var selectionPane = new ContentPane({
        region: 'top',
        content: this.createSelectedPane(),
        style: 'border:0px;'
      });
      this.selectionPane = selectionPane;

      domConstr.place(viewSelector.domNode, selectionPane.containerNode, 'first');

      var buttonsPane = new ContentPane({ region: 'bottom', style: 'text-align: right;border:0px;' });

      var cbContainer = domConstr.create('div', { style: { 'float': 'left' } });
      domConstr.place(cbContainer, buttonsPane.containerNode, 'last');
      var showHidden = window.App.showHiddenFiles;
      this.showHiddenWidget = new CheckBox({ value: showHidden, checked: showHidden });
      this.showHiddenWidget.on('change', function (val) {
        _self.set('showHidden', val);
        if (val) {
          _self.grid.set('types', null);
        } else {
          // back to unchecked state
          _self.grid.set('types', ['folder'].concat(_self.type));
        }
      });

      domConstr.place(this.showHiddenWidget.domNode, cbContainer, 'first');
      domConstr.create('span', { innerHTML: 'Show all files and folders ' }, cbContainer);

      var helpIcon = domConstr.create('i', {
        'class': 'icon-question-circle'
      });
      domConstr.place(helpIcon, cbContainer, 'last');

      new Tooltip({
        connectId: helpIcon,
        label: '<b>Note:</b><br>' +
          ' - This selector only allows objects of a specific type to be selected.<br>' +
          ' - When this is not checked, you can only see objects assigned the appropriate object type.<br>' +
          'You can change the type of an object under "Workspaces"',
        position: ['above']
      });


      // dialog cancel/ok buttons
      var cancelButton = new Button({ label: 'Cancel' });
      cancelButton.on('click', function () {
        _self.dialog.hide();
      });
      var okButton = this.okButton = new Button({
        label: 'OK',
        disabled: true
      });

      okButton.on('click', function (evt) {
        if (_self.selection) {
          // if autoSelectCurrent we need to implicitly select current
          if (_self.autoSelectCurrent) {
            _self.set('selection', _self.selection);
          }

          _self.set('value', _self.selection.path);
        }

        _self.onSelection(_self.selection.path);
        _self.dialog.hide();
      });
      domConstr.place(cancelButton.domNode, buttonsPane.containerNode, 'last');
      domConstr.place(okButton.domNode, buttonsPane.containerNode, 'last');


      on(selectionPane.domNode, 'i:click', function (evt) {
        var rel = domAttr.get(evt.target, 'rel');
        switch (rel) {
          case 'upload':
            _self.dialog.flip();
            break;
        }
      });

      var grid = this.grid = this.createGrid();

      frontBC.addChild(selectionPane);
      frontBC.addChild(grid);
      frontBC.addChild(buttonsPane);
      frontBC.startup();


      // add uploader to back side of dialog
      if (_self.allowUpload) {
        var backhead = new ContentPane({
          region: 'top',
          content: '<span rel="flip" class="fa fa-1.5x fa-reply">&nbsp;Browse Workspace</span>'
        });
        on(backhead.domNode, 'span:click', function (evt) {
          var rel = domAttr.get(evt.target, 'rel');
          switch (rel) {
            case 'flip':
              _self.dialog.flip();
              break;
          }
        });


        this.dialog.backpaneTitleBar.innerHTML = 'Upload files to Workspace';
        var uploader = this.uploader = new Uploader({
          path: _self.path,
          style: {
            height: '620px',
            overflow: 'scroll'
          },
          region: 'center',
          multiple: false,
          types: this.type,
          pathLabel: 'Upload file to: ',
          buttonLabel: 'Select File'
        });

        on(uploader.domNode, 'dialogAction', function (evt) {
          if (evt.files && evt.files[0] && evt.action == 'close') {
            var file = evt.files[0];

            _self.set('selection', file);
            _self.set('value', file.path, true);
            Deferred.when(_self.dialog.hide(), function () {
              Topic.publish('/UploaderDialog', {
                type: 'UploaderClose'
              });
            });

          } else {
            _self.dialog.flip();
          }
        });

        uploader.startup();

        backBC.addChild(backhead);
        backBC.addChild(uploader);
        domConstr.place(backBC.domNode, this.dialog.backPane, 'first');
      }

      this.dialog.flip('front');
      this.dialog.show();

    },

    cancelRefresh: function () {
      if (this._refreshing) {
        delete this._refreshing;
      }
    },

    refreshWorkspaceItems: function () {
      if (this._refreshing) {
        return;
      }
      function compare(a, b) {
        if (a.name < b.name) {
          return -1;
        }
        else if (a.name > b.name) {
          return 1;
        }
        return 0;
      }

      this._refreshing = WorkspaceManager.getObjectsByType(this.type, true)
        .then(lang.hitch(this, function (items) {
          delete this._refreshing;

          // sort by most recent
          items.sort(function (a, b) {
            return b.timestamp - a.timestamp;
          });
          this.store = new Memory({ data: items, idProperty: 'path' });
          if (this.isSortAlpha) {
            // sort alphabetically
            var dataArr = this.store.data;
            dataArr.sort(compare);

            this.store.data = dataArr;
          }
          this.searchBox.set('store', this.store);
          if (this.value) {
            this.searchBox.set('value', this.value);
          }
        }));
    },
    onSearchChange: function (value) {
      this.set('value', value);
      this.onChange(value);
      this.validate(true);
    },

    onMouseEnter: function (value) {
      if (this.searchBox.value) {
        var ihandle = new TooltipDialog({
          content: this.searchBox.value
        });
        popup.open({
          popup: ihandle,
          around: this.searchBox.domNode,
          orient: ['above']
        });
        on(this.searchBox.domNode, 'mouseleave', function () {
          popup.close(ihandle);
        });
      }

    },

    onChange: function (value) {
    },

    onSelection: function () {
      /* can be overwritten */
    },
    startup: function () {
      if (this._started) {
        return;
      }

      this.inherited(arguments);

      var _self = this;
      if (!this.path) {
        Deferred.when(WorkspaceManager.get('currentPath'), function (path) {
          _self.set('path', path);
          _self.refreshWorkspaceItems();
        });
      } else {
        this.refreshWorkspaceItems();
      }
      Topic.subscribe('/refreshWorkspace', lang.hitch(this, 'refreshWorkspaceItems'));
      this.searchBox.set('disabled', this.disabled);
      this.searchBox.set('required', this.required);
      this.searchBox.set('placeHolder', this.placeHolder);
      this.searchBox.labelFunc = this.labelFunc;

      // window.App.refreshSelector = this.refreshWorkspaceItems;
    },

    labelFunc: function (item, store) {
      var label = '<div style="font-size:1em; border-bottom:1px solid grey;">/';
      var pathParts = item.path.split('/');
      var workspace = pathParts[2]; // home
      var firstDir = pathParts[3]; // first level under home or file name
      var title = pathParts.filter(function (p, idx) { return idx > 1 && idx !== (pathParts.length - 1); }).map(function (p) { return p.replace(/^\./, ''); }).join('/');
      var labelParts = [workspace];
      if (firstDir !== pathParts[pathParts.length - 1]) {
        labelParts.push(firstDir);
      }
      if (pathParts.length - 3 > 3) {
        labelParts.push('...');
      }
      if (pathParts.length - 3 > 2) {
        var parentFolder = pathParts[pathParts.length - 2];
        parentFolder = parentFolder.replace(/^\./, '');
        labelParts.push(parentFolder);
      }
      if (pathParts.length - 1 > 2) {
        var objName = pathParts[pathParts.length - 1];
        labelParts.push(objName);
      }
      labelParts[labelParts.length - 1] = '</br><span style="font-size:1.05em; font-weight:bold;" title="/' + title + '">' + labelParts[labelParts.length - 1] + '</span></div>';
      label += labelParts.join('/');
      return label;
    },

    validate: function (/* Boolean */ isFocused) {
      // possibly need to build out refresh function to prevent tricky submissions(see validationtextbox)
      var isValid = this.disabled || this.searchBox.isValid(isFocused);
      this._set('state', isValid ? '' : this.searchBox.state);
      this.focusNode.setAttribute('aria-invalid', this.state == 'Error' ? 'true' : 'false');
      if (isValid) {
        registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
          obj.validate();
        });
      }

      return isValid;
    },

    sanitizeSelection: function (path) {
      var parts = path.split('/');
      if (parts[parts.length - 1] === '') {
        parts.pop();
      }

      var obj = {
        name: parts[parts.length - 1],
        path: parts.join('/')
      };

      return obj;
    },

    createGrid: function () {
      var self = this;


      var grid =  new Grid({
        region: 'center',
        path: this.path,
        selectionMode: 'single',
        deselectOnRefresh: true,
        onlyWritable: self.onlyWritable,
        allowDragAndDrop: false,
        showHiddenFiles: window.App.showHiddenFiles,
        types: this.type ? (['folder'].concat(this.type)) : false,
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
          owner: {
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
        }
      });

      grid.on('dgrid-datachange', function (evt) {
        var name = evt.value;
        if (!name) {
          return;
        }
        Deferred.when(WorkspaceManager.createFolder(self.path + '/' + name), function () {
          self.grid.refreshWorkspace();
          self.refreshWorkspaceItems();
        });
      });
      grid.allowSelect = function (row) {
        if (row.data.type && (self.type.indexOf(row.data.type) >= 0)) {
          return true;
        }
        return false;
      };


      // Note: this event also applies to clicking on folder/object icons grid
      grid.on('ItemDblClick', function (evt) {
        // When navigating to select files, we don't want to select folders.
        // But, if we are navigating to select (output) folders, we want the value (path)
        // to be automatically selected (autoSelectCurrent)
        if (evt.item && evt.item.type == 'folder' || evt.item.type == 'parentfolder') {
          self.set('path', evt.item.path);
        } else {
          self.set('value', evt.item.path);
          self.dialog.hide();
        }
      });

      grid.on('select', function (evt) {
        var row = evt.rows[0];

        self.set('selection', row.data);
        self.set('value', row.data.path);
      });

      grid.on('deselect', function (evt) {
        // This (was) causing "none-selected" flickering.
        self.set('selection', '');
      });

      if (this.autoSelectCurrent) {
        var sel = self.sanitizeSelection(self.path);

        self.set('selection', {
          path: sel.path,
          name: sel.name
        });
      }

      return grid;
    }
  });
});
