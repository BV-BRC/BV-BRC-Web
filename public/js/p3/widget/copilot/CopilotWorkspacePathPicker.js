define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct',
  'dojo/dom-class', 'dijit/Dialog', 'dijit/form/Button',
  '../WorkspaceExplorerView'
], function (
  declare, lang, on, domConstruct,
  domClass, Dialog, Button,
  WorkspaceExplorerView
) {
  return declare([], {
    title: 'Select Workspace Path',
    path: '/',
    _dialog: null,
    _grid: null,
    _selection: null,
    _okButton: null,
    _breadcrumbNode: null,
    onSelect: null,

    constructor: function (args) {
      declare.safeMixin(this, args);
    },

    show: function () {
      if (this._dialog) {
        this._selection = null;
        this._updateOkButton();
        this._grid.path = this.path;
        this._grid.refreshWorkspace();
        this._updateBreadcrumb();
        this._dialog.show();
        return;
      }
      this._buildDialog();
      this._dialog.show();
    },

    _buildDialog: function () {
      var self = this;

      var contentNode = domConstruct.create('div', {
        className: 'copilotWsPickerContent',
        style: 'display: flex; flex-direction: column; width: 550px; height: 400px;'
      });

      this._breadcrumbNode = domConstruct.create('div', {
        className: 'copilotWsPickerBreadcrumb',
        style: 'padding: 6px 8px; font-size: 12px; color: #555; border-bottom: 1px solid #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;'
      }, contentNode);

      var gridContainer = domConstruct.create('div', {
        style: 'flex: 1; overflow: auto; min-height: 0;'
      }, contentNode);

      this._selectionNode = domConstruct.create('div', {
        className: 'copilotWsPickerSelection',
        style: 'padding: 6px 8px; font-size: 12px; border-top: 1px solid #ddd; color: #333; min-height: 24px; flex-shrink: 0;',
        innerHTML: '<b>Selected:</b> <span class="copilotWsPickerSelName">None</span>'
      }, contentNode);

      var buttonsNode = domConstruct.create('div', {
        style: 'display: flex; justify-content: flex-end; gap: 8px; padding: 8px; border-top: 1px solid #ddd; flex-shrink: 0;'
      }, contentNode);

      var cancelButton = new Button({ label: 'Cancel' });
      cancelButton.placeAt(buttonsNode);
      on(cancelButton, 'click', function () {
        self._dialog.hide();
      });

      this._okButton = new Button({ label: 'OK', disabled: true });
      this._okButton.placeAt(buttonsNode);
      on(this._okButton, 'click', function () {
        if (self._selection && self._selection.path) {
          self._dialog.hide();
          if (typeof self.onSelect === 'function') {
            self.onSelect(self._selection.path);
          }
        }
      });

      this._grid = new WorkspaceExplorerView({
        path: this.path,
        style: 'height: 100%; width: 100%;',
        selectionMode: 'single',
        allowDragAndDrop: false
      }, gridContainer);

      on(this._grid.domNode, 'select', lang.hitch(this, function (evt) {
        if (evt.rows && evt.rows.length > 0) {
          this._selection = evt.rows[0].data;
          this._updateOkButton();
          this._updateSelectionDisplay();
        }
      }));

      on(this._grid.domNode, 'deselect', lang.hitch(this, function () {
        this._selection = null;
        this._updateOkButton();
        this._updateSelectionDisplay();
      }));

      on(this._grid.domNode, 'ItemDblClick', lang.hitch(this, function (evt) {
        var item = evt.item;
        if (!item) return;
        if (item.type === 'folder' || item.type === 'parentfolder') {
          this.path = item.path;
          this._grid.path = item.path;
          this._grid.refreshWorkspace();
          this._selection = null;
          this._updateOkButton();
          this._updateSelectionDisplay();
          this._updateBreadcrumb();
        } else {
          this._selection = item;
          this._updateOkButton();
          this._updateSelectionDisplay();
          this._okButton.onClick();
        }
      }));

      this._dialog = new Dialog({
        title: this.title,
        content: contentNode,
        draggable: true,
        style: 'padding: 0;'
      });

      domClass.add(this._dialog.containerNode, 'copilotWsPickerDialog');

      this._grid.startup();
      this._updateBreadcrumb();
    },

    _updateOkButton: function () {
      if (this._okButton) {
        this._okButton.set('disabled', !this._selection);
      }
    },

    _updateSelectionDisplay: function () {
      if (!this._selectionNode) return;
      var nameSpan = this._selectionNode.querySelector('.copilotWsPickerSelName');
      if (!nameSpan) return;
      if (this._selection && this._selection.path) {
        nameSpan.textContent = this._selection.path;
        nameSpan.title = this._selection.path;
      } else {
        nameSpan.textContent = 'None';
        nameSpan.title = '';
      }
    },

    _updateBreadcrumb: function () {
      if (!this._breadcrumbNode) return;
      var self = this;
      var parts = this.path.split('/').filter(function (p) { return p; });
      domConstruct.empty(this._breadcrumbNode);

      var rootLink = domConstruct.create('a', {
        href: '#',
        textContent: '/',
        style: 'text-decoration: none; color: #3366aa; margin-right: 2px;'
      }, this._breadcrumbNode);
      on(rootLink, 'click', function (evt) {
        evt.preventDefault();
        self._navigateTo('/');
      });

      var cumulative = '';
      parts.forEach(function (part, idx) {
        domConstruct.create('span', {
          textContent: ' / ',
          style: 'color: #999;'
        }, self._breadcrumbNode);

        cumulative += '/' + part;
        var segPath = cumulative;
        if (idx < parts.length - 1) {
          var link = domConstruct.create('a', {
            href: '#',
            textContent: part,
            style: 'text-decoration: none; color: #3366aa;'
          }, self._breadcrumbNode);
          on(link, 'click', function (evt) {
            evt.preventDefault();
            self._navigateTo(segPath);
          });
        } else {
          domConstruct.create('span', {
            textContent: part,
            style: 'font-weight: bold; color: #333;'
          }, self._breadcrumbNode);
        }
      });
    },

    _navigateTo: function (path) {
      this.path = path;
      this._grid.path = path;
      this._grid.refreshWorkspace();
      this._selection = null;
      this._updateOkButton();
      this._updateSelectionDisplay();
      this._updateBreadcrumb();
    },

    destroy: function () {
      if (this._dialog) {
        this._dialog.destroyRecursive();
        this._dialog = null;
      }
    }
  });
});
