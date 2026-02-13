define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/_base/lang', 'dojo/query',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/WorkspaceObjectSelector.html',
  './FlippableDialog', 'dijit/_HasDropDown', 'dijit/layout/ContentPane', 'dijit/form/TextBox',
  './WorkspaceExplorerView', 'dojo/dom-construct', '../WorkspaceManager', 'dojo/store/Memory',
  './Uploader', 'dijit/layout/BorderContainer', 'dojo/dom-attr', 'dijit/TooltipDialog', 'dijit/popup',
  'dijit/form/Button', 'dojo/_base/Deferred', 'dijit/form/CheckBox', 'dojo/topic', 'dijit/Tooltip',
  'dijit/registry', 'dgrid/editor', './formatter', 'dijit/form/FilteringSelect', 'dijit/form/Select',
  '../util/FavoriteFolders', '../util/RecentFolders', 'dojo/promise/all'
], function (
  declare, WidgetBase, on, lang, query,
  domClass, Templated, WidgetsInTemplate,
  Template,
  Dialog, HasDropDown, ContentPane, TextBox,
  Grid, domConstr, WorkspaceManager, Memory,
  Uploader, BorderContainer, domAttr, TooltipDialog, popup,
  Button, Deferred, CheckBox, Topic, Tooltip,
  registry, editor, formatter, FilteringSelect, Select,
  FavoriteFolders, RecentFolders, all
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
    allowUpload: true,                // whether or not to add the upload button
    uploadingSelection: '',           // uploading in progress, to be copied to selection
    title: 'Choose or Upload a Workspace Object',
    autoSelectCurrent: false,         // if true, the folder currently being viewed is selected by default
    onlyWritable: false,              // only list writable workspaces
    selectionText: 'Selection',       // the text used beside "selected" indicator
    allowUserSpaceSelection: false,   // this allows the user to select /user@patricbrc (for operations such as moving)
    disableDropdownSelector: false,   // if true, don't bother fetching data for filtering select (for operations such as moving)
    _currentViewMode: 'browse',        // current view mode: 'browse', 'favorites', 'recent'
    _favoritesSub: null,               // subscription handle for favorites changes

    postMixInProperties: function () {
      this.inherited(arguments);
      // Sanitize initial value and path before template is processed
      // This prevents invalid values containing 'undefined' from being set
      if (this.value && this.value.indexOf && this.value.indexOf('undefined') !== -1) {
        this.value = '';
      }
      if (this.path && this.path.indexOf && this.path.indexOf('undefined') !== -1) {
        this.path = '';
      }
    },

    postCreate: function () {
      this.inherited(arguments);

      // CRITICAL: Clear any invalid value that may have been set on the searchBox
      // during widget initialization. The FilteringSelect's textbox may already contain
      // an invalid value like '/home/undefined' that was set before we could intercept it.
      if (this.searchBox) {
        // Check if searchBox already has an invalid value in its textbox
        var currentDisplayed = this.searchBox.get('displayedValue') || '';
        var currentValue = this.searchBox.get('value') || '';
        if ((currentDisplayed && currentDisplayed.indexOf('undefined') !== -1) ||
            (currentValue && currentValue.indexOf('undefined') !== -1)) {
          // Clear the invalid value from the FilteringSelect
          this.searchBox.textbox.value = '';
          this.searchBox._set('displayedValue', '');
          this.searchBox._set('value', '');
        }
      }

      // Also clear this.value if it's invalid
      if (this.value && this.value.indexOf && this.value.indexOf('undefined') !== -1) {
        this.value = '';
      }

      // Set the initial value programmatically only if it's valid
      if (this.searchBox && this.value) {
        // Only set value if it doesn't contain 'undefined'
        if (this.value.indexOf && this.value.indexOf('undefined') === -1) {
          this.searchBox.set('value', this.value);
        }
      }

      // Intercept any future value sets on the searchBox to prevent invalid values
      var originalSet = this.searchBox.set;
      this.searchBox.set = function(name, value) {
        if (name === 'value' || name === 'displayedValue') {
          if (value && value.indexOf && value.indexOf('undefined') !== -1) {
            // Block invalid values
            return;
          }
        }
        return originalSet.apply(this, arguments);
      };
    },

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
      console.log('sort alpha');
      this.isSortAlpha = true;
      // this.refreshWorkspaceItems();
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
    // JSP: Need to check if the workspace changes to change the dropbox memory store.
    _setPathAttr: function (val) {
      if (!val) return; // for group selection (hacky)

      // Don't set paths containing 'undefined' (invalid user session)
      if (val.indexOf && val.indexOf('undefined') !== -1) {
        return;
      }

      var self = this;

      // remove trailing '/' in path for consistency
      // var oldWorkspace = this.extractWorkspace(this.path);
      this.path = val[val.length - 1] === '/' ? val.substring(0, val.length - 1) : val;
      if (this.grid) {
        this.grid.set('path', val);
      }
      if (this.uploader) {
        this.uploader.set('path', val);
      }

      if (this.currentPathNode) {
        this.currentPathNode.innerHTML = val.replace(/@patricbrc\.org|@viprbrc\.org/, '');
      }

      // hide/show new workspace/folder icons
      if (self.selectionPane) {
        var parts = this.path.split('/');

        // if public
        if (parts[1] == 'public') {
          domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload) { domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }

          // if usual workspace
        } else if (parts.length < 3) {
          domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.remove(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload) { domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }

          // else, is usual folder
        } else {
          domClass.remove(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
          domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

          if (this.allowUpload) { domClass.remove(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden'); }
        }
      }

      // var newWorkspace = this.extractWorkspace(val);
      // if (this.onWorkspace(newWorkspace) && newWorkspace !== oldWorkspace) {
      //   this.cancelRefresh();
      //   this.refreshWorkspaceItems(newWorkspace);
      // }

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

    // onWorkspace: function (val) {
    //   val = val[val.length - 1] === '/' ? val.substring(0, val.length - 1) : val;
    //   if (val.split('/', 3).length <= 2) {
    //     return false;
    //   }
    //   return true;
    // },

    extractWorkspace: function (val) {
      val = val[val.length - 1] === '/' ? val.substring(0, val.length - 1) : val;
      return val.split('/', 3).join('/');
    },

    _setTypeAttr: function (type) {
      var newType = Array.isArray(type) ? type : [type];

      // Skip if type hasn't changed
      if (this.type && this.type.length === newType.length &&
          this.type.every(function(t, i) { return t === newType[i]; })) {
        return;
      }

      this.type = newType;

      if (this.grid) {
        this.grid.set('types', (['folder'].concat(this.type)));
      }
      this.cancelRefresh();
      // this.refreshWorkspaceItems(this.extractWorkspace(this.path));
      this.refreshWorkspaceItems();
    },

    // sets value of object selector dropdown
    _setValueAttr: function (value, refresh) {
      // Don't set values containing 'undefined' (invalid user session)
      if (value && value.indexOf && value.indexOf('undefined') !== -1) {
        return;
      }
      this.value = value;
      // Only set on searchBox if it exists (may not during construction)
      if (this.searchBox) {
        this.searchBox.set('value', this.value);
      }

      // if (this._started) {
      //   if (refresh) {
      //     this.refreshWorkspaceItems(this.extractWorkspace(this.path));
      //   } else {
      //     this.searchBox.set('value', this.value);
      //   }
      // }
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
      // Also skip adding to store if path contains 'undefined' (invalid user session)
      // Also skip paths that are too short (e.g., /user/home with no subfolder)
      if (this.selection !== '*none*' && this.selection && this.selection.path &&
          this.selection.path.indexOf('undefined') === -1) {
        // Check that path has at least 4 parts (e.g., /user/home/folder)
        var pathParts = this.selection.path.split('/');
        if (pathParts.length < 4) {
          // Path is too high-level, don't add to store
          // But still update the selection state
        } else {
          // Ensure store exists - create if needed
          if (!this.store) {
            this.store = new Memory({ data: [], idProperty: 'path' });
            this.searchBox.set('store', this.store);
          }
          try {
            this.store.add(this.selection);
          } catch (e) {
            // ignore error about duplicates
            // console.log('error adding ' + this.selection + ' to data store:', e);
          }
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
        // Guard: Don't use workspace if it contains 'undefined'
        if (!this.workspace.indexOf || this.workspace.indexOf('undefined') === -1) {
          this.value = this.workspace;
        }
      }
      this.inherited(arguments);
    },

    createSelectedPane: function () {
      var self = this;
      var wrap = domConstr.create('div', {});
      this.currentPathNode = domConstr.create('div', {
        innerHTML: this.path.replace(/@patricbrc\.org|@viprbrc\.org/, ''),
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
        if (this.allowUpload) { domClass.add(query('[rel="upload"]', wrap)[0], 'dijitHidden'); }
      } else {
        domClass.add(query('[rel="createWS"]', wrap)[0], 'dijitHidden');
        if (this.allowUpload) { domClass.remove(query('[rel="upload"]', wrap)[0], 'dijitHidden'); }
      }

      return wrap;
    },

    loadFavorites: function () {
      var self = this;
      return FavoriteFolders.load().then(lang.hitch(this, function (favorites) {
        if (!favorites || favorites.length === 0) {
          self._showEmptyMessage('No favorites yet. Star folders to add them here.');
          return;
        }

        // Fetch workspace objects for each favorite path
        var promises = favorites.map(function (path) {
          return WorkspaceManager.getObject(path).then(function (obj) {
            // Extract metadata if object has metadata property
            return obj.metadata || obj;
          }, function (err) {
            return null; // Handle deleted folders
          });
        });

        return all(promises).then(lang.hitch(this, function (objects) {
          // Filter to only valid objects that are folders
          var validObjects = objects.filter(function (obj) {
            return obj && obj.type === 'folder';
          }).map(function (obj) {
            // Ensure all required properties exist for grid rendering
            if (!obj.permissions) {
              obj.permissions = [];
            }
            if (!obj.user_metadata) {
              obj.user_metadata = {};
            }
            return obj;
          });
          if (validObjects.length === 0) {
            self._showEmptyMessage('No valid favorites found. Starred folders may have been deleted.');
            return;
          }
          self._hideEmptyMessage();
          self.grid.render('favorites', validObjects);
        }));
      }));
    },

    loadRecentFolders: function () {
      var self = this;
      var recent = RecentFolders.get();

      if (!recent || recent.length === 0) {
        self._showEmptyMessage('No recently used folders.');
        return Deferred.resolve([]);
      }

      // Fetch current metadata for each recent folder
      var promises = recent.map(function (item) {
        return WorkspaceManager.getObject(item.path).then(function (obj) {
          // Extract metadata if object has metadata property
          return obj.metadata || obj;
        }, function (err) {
          return null; // Handle deleted folders
        });
      });

      return all(promises).then(lang.hitch(this, function (objects) {
        // Filter to only valid objects that are folders
        var validObjects = objects.filter(function (obj) {
          return obj && obj.type === 'folder';
        }).map(function (obj) {
          // Ensure all required properties exist for grid rendering
          if (!obj.permissions) {
            obj.permissions = [];
          }
          if (!obj.user_metadata) {
            obj.user_metadata = {};
          }
          return obj;
        });
        if (validObjects.length === 0) {
          self._showEmptyMessage('No valid recent folders found. They may have been deleted.');
          return;
        }
        self._hideEmptyMessage();
        self.grid.render('recent', validObjects);
      }));
    },

    _showEmptyMessage: function (message) {
      if (this.grid) {
        this.grid.domNode.style.display = 'none';
      }
      if (!this.emptyMessageNode) {
        this.emptyMessageNode = domConstr.create('div', {
          'class': 'emptyStateMessage',
          style: 'padding: 40px 20px; text-align: center; color: #666; font-size: 14px;'
        });
        domConstr.place(this.emptyMessageNode, this.grid.domNode, 'after');
      }
      this.emptyMessageNode.innerHTML = '<i class="icon-info-circle" style="font-size: 32px; display: block; margin-bottom: 10px;"></i><p>' + message + '</p>';
      this.emptyMessageNode.style.display = 'block';
    },

    _hideEmptyMessage: function () {
      if (this.emptyMessageNode) {
        this.emptyMessageNode.style.display = 'none';
      }
      if (this.grid) {
        this.grid.domNode.style.display = '';
      }
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
      // JSP: Simply opening the chooser probably doesn't require changing the drop down memory store.
      // this.refreshWorkspaceItems(this.path);
      var _self = this;

      // if dialog is already built, just show it
      if (this.dialog) {
        this.dialog.flip('front');
        // Safari fix: Explicitly hide back pane before showing dialog
        this.dialog.backPane.style.display = 'none';
        this.dialog.backpaneTitleBar.style.display = 'none';

        // Use requestAnimationFrame to ensure flip completes before showing dialog
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            _self.dialog.show();
            // Re-enable back pane after dialog is visible (for flip animation to work)
            setTimeout(function() {
              _self.dialog.backPane.style.display = '';
              _self.dialog.backpaneTitleBar.style.display = '';
            }, 50);
          });
        });
        return;
      }

      this.dialog = new Dialog({
        title: this.title,
        draggable: true,
        style: 'visibility: hidden;' // Hide initially to prevent flash of wrong state
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
        style: { width: '160px' },
        options: [
          {
            label: 'Home',
            value: 'home',
            selected: _self.path.split('/')[1] != 'public'
          },
          {
            label: 'My Workspaces',
            value: 'mine',
            selected: false
          },
          {
            label: 'Shared Workspaces',
            value: 'shared',
            selected: false
          }, {
            label: 'Public Workspaces',
            value: 'public',
            selected: _self.path.split('/')[1] == 'public'
          }, {
            label: 'BV-BRC Workshop',
            value: 'workshop',
            selected: false
          },
          {
            label: '<i class="icon-star" style="color:#ffc107;"></i> Favorites',
            value: 'favorites',
            selected: false
          },
          {
            label: '<i class="icon-history"></i> Recently Used',
            value: 'recent',
            selected: false
          }
        ]
      });
      this.viewSelector = viewSelector;

      viewSelector.on('change', function (val) {
        if (val == 'favorites') {
          _self._currentViewMode = 'favorites';
          _self.loadFavorites();
        } else if (val == 'recent') {
          _self._currentViewMode = 'recent';
          _self.loadRecentFolders();
        } else {
          _self._currentViewMode = 'browse';
          _self._hideEmptyMessage();
          // Check if we should skip navigation (when just updating the dropdown after navigating from favorites/recent)
          if (_self._suppressViewSelectorNavigation) {
            _self._suppressViewSelectorNavigation = false;
            return;
          }
          // Guard: Don't set paths with user ID if user is not logged in
          var userId = window.App && window.App.user && window.App.user.id;
          if (val == 'home') {
            if (_self.grid) { _self.grid.set('workspaceFilter', null); }
            if (userId) {
              var home = '/' + userId + '/' + 'home';
              _self.set('path', home);
            }
          }
          else if (val == 'mine') {
            if (_self.grid) { _self.grid.set('workspaceFilter', 'myWorkspaces'); }
            if (userId) {
              var home = '/' + userId;
              _self.set('path', home);
            }
          } else if (val == 'shared') {
            if (_self.grid) { _self.grid.set('workspaceFilter', 'sharedWithMe'); }
            if (userId) {
              var home = '/' + userId;
              _self.set('path', home);
            }
          } else if (val == 'public') {
            if (_self.grid) { _self.grid.set('workspaceFilter', null); }
            _self.set('path', '/public/');
          } else if (val == 'workshop') {
            if (_self.grid) { _self.grid.set('workspaceFilter', null); }
            _self.set('path', '/public/ARWattam@patricbrc.org/BV-BRC Workshop');
          }
        }
      });

      // Subscribe to favorites changes to update the view when favorites are added/removed
      if (!this._favoritesSub) {
        this._favoritesSub = Topic.subscribe('/FavoriteFolders/changed', lang.hitch(this, function () {
          if (this._currentViewMode === 'favorites') {
            this.loadFavorites();
          }
        }));
      }

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

      // show hidden folders when browsing for job results data
      var showHidden = this.type.filter(function (t) {
        return ['contigs'].indexOf(t) !== -1;
      }).length > 0;
      _self.set('showHidden', showHidden);
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
          // If a folder is selected but we're not looking for folders, navigate into it instead of closing
          if (_self.selection.type === 'folder' && _self.type.indexOf('folder') < 0) {
            // Construct the full path for navigation
            var targetPath = _self.selection.path;
            if (_self.selection.name &&
                !targetPath.endsWith('/' + _self.selection.name) &&
                !targetPath.endsWith('/' + _self.selection.name + '/')) {
              targetPath = targetPath.replace(/\/$/, '') + '/' + _self.selection.name;
            }
            _self.set('path', targetPath);
            if (_self.grid && _self.grid.refreshWorkspace) {
              _self.grid.refreshWorkspace();
            }
            return; // Don't close the dialog
          }

          // if autoSelectCurrent we need to implicitly select current
          // ASW: it's not clear this  check actually needs to happen given the value is being set anyway
          // commenting out to remove "public annotation selection bug"
          // if (_self.autoSelectCurrent) {
          //  _self.set('selection', _self.selection);
          // }
          _self.set('selection', _self.selection);

          _self.set('value', _self.selection.path);
        }

        _self.onSelection(_self.selection.path);
        _self.dialog.hide();
      });
      domConstr.place(cancelButton.domNode, buttonsPane.containerNode, 'last');
      domConstr.place(okButton.domNode, buttonsPane.containerNode, 'last');

      var grid = this.grid = this.createGrid();

      on(selectionPane.domNode, 'i:click', function (evt) {
        var rel = domAttr.get(evt.target, 'rel');
        switch (rel) {
          case 'upload':
            _self.dialog.flip();
            grid.domNode.style.display = 'none';
            break;
        }
      });

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
              grid.domNode.style.display = '';
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
          grid.domNode.style.display = '';
        });

        uploader.startup();

        backBC.addChild(backhead);
        backBC.addChild(uploader);
        domConstr.place(backBC.domNode, this.dialog.backPane, 'first');
      }

      this.dialog.flip('front');
      // Safari fix: Explicitly hide back pane before showing dialog
      _self.dialog.backPane.style.display = 'none';
      _self.dialog.backpaneTitleBar.style.display = 'none';

      // Use requestAnimationFrame to ensure flip completes before showing dialog
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          _self.dialog.domNode.style.visibility = 'visible';
          _self.dialog.show();
          // Re-enable back pane after dialog is visible (for flip animation to work)
          setTimeout(function() {
            _self.dialog.backPane.style.display = '';
            _self.dialog.backpaneTitleBar.style.display = '';
          }, 50);
        });
      });

    },

    cancelRefresh: function () {
      if (this._refreshing) {
        delete this._refreshing;
      }
      // Increment counter to invalidate any in-flight requests
      this._refreshCounter = (this._refreshCounter || 0) + 1;
    },

    refreshWorkspaceItems: function (target_path) {
      // Don't refresh if dropdown is disabled, already refreshing, or empty path
      if (this.disableDropdownSelector || this._refreshing || target_path === '') {
        return;
      }
      // Don't refresh if target_path is an object (invalid call)
      if (typeof target_path === 'object' && target_path !== undefined) {
        return;
      }
      // Don't refresh if user is not logged in (prevents /undefined/home paths)
      if (!window.App || !window.App.user || !window.App.user.id) {
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
      // Capture the current counter value to detect stale responses
      var currentCounter = this._refreshCounter || 0;
      var self = this;
      this._refreshing = WorkspaceManager.getObjectsByType(this.type, target_path)
        .then(lang.hitch(this, function (items) {
          delete this._refreshing;
          this._isLoadingDropdown = false;

          // If counter changed, this response is stale - ignore it
          if ((self._refreshCounter || 0) !== currentCounter) {
            return;
          }

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
          // If the dropdown is currently open, refresh its display
          // Force a re-search to update the dropdown contents
          try {
            var isOpen = false;
            // Check various ways to detect if dropdown is open
            if (this.searchBox._opened) {
              isOpen = true;
            } else if (this.searchBox.dropDown && this.searchBox.dropDown.domNode) {
              var display = this.searchBox.dropDown.domNode.style.display;
              if (display !== 'none' && display !== '') {
                isOpen = true;
              }
            }

            if (isOpen) {
              // Try to trigger a re-search by calling the internal search method
              if (this.searchBox._startSearch) {
                this.searchBox._startSearch('');
              } else if (this.searchBox.loadDropDown) {
                this.searchBox.loadDropDown();
              } else {
                // Fallback: close and reopen
                this.searchBox.closeDropDown();
                var _searchBox = this.searchBox;
                setTimeout(function() {
                  _searchBox.openDropDown();
                }, 50);
              }
            }
          } catch (e) {
            // Ignore errors during dropdown refresh
          }
        }));
    },

    onSearchChange: function (value) {
      // Don't accept the loading placeholder as a valid selection
      if (value === '__loading__') {
        this.searchBox.set('value', '');
        return;
      }
      // Don't accept values containing 'undefined' (invalid user session)
      if (value && value.indexOf && value.indexOf('undefined') !== -1) {
        this.searchBox.set('value', '');
        return;
      }
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

      // BACKUP CHECK: Clear any invalid values that may have slipped through
      // This runs after all child widgets (including searchBox) are fully initialized
      if (this.searchBox && this.searchBox.textbox) {
        var textValue = this.searchBox.textbox.value || '';
        var displayValue = this.searchBox.get('displayedValue') || '';
        if (textValue.indexOf('undefined') !== -1 || displayValue.indexOf('undefined') !== -1) {
          this.searchBox.textbox.value = '';
          this.searchBox._set('displayedValue', '');
          this.searchBox._set('value', '');
          this.value = '';
        }
      }

      // Only populate dropdown if user is logged in (has valid user ID)
      // This prevents showing invalid paths like /undefined/home
      var hasValidUser = window.App && window.App.user && window.App.user.id;

      // Initialize with a loading placeholder to prevent showing invalid entries
      // The placeholder is non-selectable and will be replaced when data loads
      this._isLoadingDropdown = true;
      var loadingStore = new Memory({
        data: [{ path: '__loading__', name: 'Loading folders...' }],
        idProperty: 'path'
      });
      this.store = loadingStore;
      this.searchBox.set('store', loadingStore);

      if (!this.path) {
        Deferred.when(WorkspaceManager.get('currentPath'), function (path) {
          _self.set('path', path);
          // Populate the dropdown after path is set, only if user is valid
          if (hasValidUser) {
            _self.refreshWorkspaceItems();
          }
        });
      } else if (hasValidUser) {
        // Populate the dropdown on startup if path is already set and user is valid
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
      // Handle loading placeholder
      if (item.path === '__loading__') {
        return '<div style="font-size:1em; color:#666; padding:8px;">Loading folders...</div>';
      }

      // Filter out invalid items containing 'undefined' in the path
      if (item.path && item.path.indexOf('undefined') !== -1) {
        return '<div style="display:none;"></div>';
      }

      var label = '<div style="font-size:1em; border-bottom:1px solid grey;">/';
      var pathParts = item.path.split('/');

      // Skip items that are too high-level (e.g., /user/home with no subfolder)
      // These have only 3 parts: ['', 'user', 'home']
      if (pathParts.length < 4) {
        return '<div style="display:none;"></div>';
      }

      var workspace = pathParts[2]; // home
      var firstDir = pathParts[3]; // first level under home or file name

      // Safety check: if firstDir is undefined or empty, hide this item
      if (!firstDir) {
        return '<div style="display:none;"></div>';
      }

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
      var grid = new Grid({
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
                if (item.global_permission != 'n') { return 'publicWorkspace'; }

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
          // self.refreshWorkspaceItems();
        });
      });
      grid.allowSelect = function (row) {
        // Allow selecting items that match the requested type
        if (row.data.type && (self.type.indexOf(row.data.type) >= 0)) {
          return true;
        }
        // Also allow selecting folders for navigation purposes (familiar OS behavior)
        // This lets users click on folders to highlight them, then double-click or click OK to navigate
        if (row.data.type === 'folder') {
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
          // Construct the full path: for workspace objects, path is the parent path and name is the folder name
          var targetPath = evt.item.path;
          // For regular folders (not parentfolder), check if we need to append the name
          // This is needed for favorites/recent where path is the parent path
          if (evt.item.type == 'folder' && evt.item.name &&
              !targetPath.endsWith('/' + evt.item.name) &&
              !targetPath.endsWith('/' + evt.item.name + '/')) {
            // Remove trailing slash from path if present, then append name
            targetPath = targetPath.replace(/\/$/, '') + '/' + evt.item.name;
          }
          // When navigating from favorites or recent view, switch back to browse mode
          if (self._currentViewMode === 'favorites' || self._currentViewMode === 'recent') {
            self._currentViewMode = 'browse';
            self._hideEmptyMessage();
            // Update the view selector to reflect we're now browsing
            // Set flag to prevent the selector's change handler from navigating
            if (self.viewSelector) {
              self._suppressViewSelectorNavigation = true;
              if (targetPath.startsWith('/public')) {
                self.viewSelector.set('value', 'public');
              } else {
                self.viewSelector.set('value', 'home');
              }
            }
          }
          self.set('path', targetPath);
          // When coming from favorites/recent, we need to explicitly refresh the grid
          // because the grid was showing special content, not a path-based listing
          if (self.grid && self.grid.refreshWorkspace) {
            self.grid.refreshWorkspace();
          }
          // Add to recent folders when navigating into a folder
          if (evt.item.type == 'folder' && targetPath && evt.item.name) {
            RecentFolders.add(targetPath, evt.item.name);
          }
        } else {
          self.set('value', evt.item.path);
          self.dialog.hide();
        }
      });

      grid.on('select', function (evt) {
        var row = evt.rows[0];

        self.set('selection', row.data);
        self.set('value', row.data.path);

        // Add to recent folders when a folder is selected
        if (row.data && row.data.type === 'folder' && row.data.path && row.data.name) {
          RecentFolders.add(row.data.path, row.data.name);
        }
      });

      grid.on('deselect', function (evt) {
        // This (was) causing "none-selected" flickering.
        self.set('selection', '');
      });

      // Only auto-select if path is valid (not empty and doesn't contain 'undefined')
      if (this.autoSelectCurrent && self.path && self.path.indexOf('undefined') === -1) {
        var sel = self.sanitizeSelection(self.path);

        self.set('selection', {
          path: sel.path,
          name: sel.name
        });
      }

      return grid;
    },

    destroy: function () {
      // Clean up the favorites subscription
      if (this._favoritesSub) {
        this._favoritesSub.remove();
        this._favoritesSub = null;
      }
      this.inherited(arguments);
    }
  });
});
