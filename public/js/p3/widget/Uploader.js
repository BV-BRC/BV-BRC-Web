define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Uploader.html', 'dijit/form/Form', 'dojo/_base/Deferred',
  'dijit/ProgressBar', 'dojo/dom-construct', 'p3/UploadManager', 'dojo/query', 'dojo/dom-attr',
  'dojo/_base/lang', 'dojo/dom-geometry', 'dojo/dom-style', 'dojo/promise/all', '../WorkspaceManager',
  './Confirmation'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Deferred,
  ProgressBar, domConstruct, UploadManager, Query, domAttr,
  lang, domGeometry, domStyle, All, WorkspaceManager,
  Confirmation
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'CreateWorkspace',
    templateString: Template,
    path: '',
    dndFiles: null, // accept files for drag and drop upload; if given, file list is initialized with these
    dndType: null,
    overwrite: false,
    multiple: false,
    types: false,
    pathLabel: 'Upload file to: ',
    buttonLabel: 'Select Files',
    typeLabel: 'Upload type: ',
    style: {
      height: '520px',
      overflow: 'scroll'
    },
    _setPathAttr: function (val) {
      this.path = val;
      this.destinationPath.innerHTML = val;
    },

    onUploadTypeChanged: function (val) {
      var formats = WorkspaceManager.knownUploadTypes[val].formats;
      this.formatListNode.innerHTML = formats.join(', ');

      var description = WorkspaceManager.knownUploadTypes[val].description;

      if (!this.showAllFormats.get('value')) {
        domAttr.set(this.fileInput, 'accept', '*.*');
      } else {
        if (formats == '*.*') {
          domClass.add(this.fileFilterContainer, 'dijitHidden');
        } else {
          domClass.remove(this.fileFilterContainer, 'dijitHidden');
        }

        domAttr.set(this.fileInput, 'accept', formats.join(','));
      }

      if (description) {
        domClass.remove(this.typeDescriptionContainer, 'dijitHidden');
        this.typeDescriptionContainer.innerHTML = description;
      } else {
        domClass.add(this.typeDescriptionContainer, 'dijitHidden');
      }
    },
    onChangeShowAllFormats: function (val) {
      if (!val) {
        domAttr.set(this.fileInput, 'accept', '*.*');
      } else {
        // var type = this.uploadType.get('value');
        var formats = WorkspaceManager.knownUploadTypes[this.uploadType.get('value')].formats;
        domAttr.set(this.fileInput, 'accept', formats.join(','));
      }

    },

    createUploadTable: function (empty) {

      // remove existing container as long as not adding multiple rows,
      // since createUploadTable is called on each file change
      // Note: this could probably be refactored
      // to always leave the header in place
      if (!this.multiple) {
        domConstruct.empty(this.fileTableContainer);
      }

      if (!this.uploadTable) {

        var table = domConstruct.create('table', {
          style: {
            border: '1px solid #eee',
            width: '100%'
          }
        }, this.fileTableContainer);
        this.uploadTable = domConstruct.create('tbody', {}, table);
        var htr = domConstruct.create('tr', {}, this.uploadTable);
        domConstruct.create('th', {
          style: {
            'background-color': '#eee',
            border: 'none',
            'text-align': 'left'
          },
          innerHTML: 'File Selected'
        }, htr);
        domConstruct.create('th', {
          style: {
            'background-color': '#eee',
            border: 'none',
            'text-align': 'left'
          },
          innerHTML: 'Type'
        }, htr);
        domConstruct.create('th', {
          style: {
            'background-color': '#eee',
            border: 'none',
            'text-align': 'left'
          },
          innerHTML: 'Size'
        }, htr);
        domConstruct.create('th', {
          style: {
            'background-color': '#eee',
            border: 'none',
            'text-align': 'right'
          }
        }, htr);
        if (empty) {
          this.createNoneSelectedRow();
        }
      }
    },

    createNoneSelectedRow: function () {
      var row = domConstruct.create('tr', {
        'class': 'fileRow noneSelected'
      }, this.uploadTable);
      domConstruct.create('td', {
        style: {
          'padding-left': '5px',
          'text-align': 'left'
        },
        innerHTML: '<i>None</i>'
      }, row);
      domConstruct.create('td', {
        style: {
          'text-align': 'left'
        }
      }, row);
      domConstruct.create('td', {
        style: {
          'text-align': 'left'
        }
      }, row);
      domConstruct.create('td', {
        style: {
          'text-align': 'right'
        }
      }, row);
    },

    createNewFileInput: function (oldFiles) {
      if (this.fileInput) {
        if (!this._previousFiles) {
          this._previousFiles = [];
        }
        if (this.inputHandler) {
          this.inputHandler.remove();
        }
        domStyle.set(this.fileInput, 'display', 'none');
        this._previousFiles.push(oldFiles || this.fileInput.files);
      }

      this.fileInput = domConstruct.create('input', {
        type: 'file',
        multiple: this.multiple
      });
      domConstruct.place(this.fileInput, this.fileUploadButton, 'last');
      this.inputHandler = on(this.fileInput, 'change', lang.hitch(this, 'onFileSelectionChange'));
    },

    startup: function () {
      var _self = this;

      if (this._started) return;

      this.inherited(arguments);
      var state = this.get('state');
      this.createNewFileInput();

      Object.keys(WorkspaceManager.knownUploadTypes).filter(function (t) {
        return (!_self.types || (_self.types == '*') || ((_self.types instanceof Array) && (_self.types.indexOf(t) >= 0)));
      }).forEach(function (t) {
        // console.log("* Add option: ", t, WorkspaceManager.knownUploadTypes[t], _self.uploadType, _self.uploadType.addOption);
        _self.uploadType.addOption({
          disabled: false,
          label: WorkspaceManager.knownUploadTypes[t].label,
          value: t
        });
      });

      var type = this.uploadType.get('value');
      if (type && WorkspaceManager.knownUploadTypes[type]) {
        this.onUploadTypeChanged(type); /*
        var description = WorkspaceManager.knownUploadTypes[type].description;
        if (description) {
          domClass.remove(this.typeDescriptionContainer, 'dijitHidden');
          this.typeDescriptionContainer.innerHTML = description;
        } else {
          domClass.add(this.typeDescriptionContainer, 'dijitHidden');
        }
      } else {
        domClass.add(this.typeDescriptionContainer, 'dijitHidden');
      } */
      }

      if (!this.path) {
        Deferred.when(WorkspaceManager.get('currentPath'), function (path) {
          _self.set('path', path);
        });
      }

      if ((state == 'Incomplete') || (state == 'Error')) {
        this.saveButton.set('disabled', true);
      }

      this.watch('state', function (prop, val, val2) {
        if (val2 == 'Incomplete' || val2 == 'Error') {
          this.saveButton.set('disabled', true);
        } else {
          this.saveButton.set('disabled', false);
        }
      });
      this.createUploadTable(true);

      // if activated via drag and drop, initialize with those files (not currently used)
      if (this.dndFiles) {
        this.fileUploadButton.innerHTML = 'Select more files';
        this.onFileSelectionChange(null, this.dndFiles);
        this.validate();
      }

      // wait to digest template
      setTimeout(function () {
        _self.initDragAndDrop();
      });
    },

    // drag and drop for drop area
    initDragAndDrop: function () {
      var self = this;

      function onDragLeave(e) {
        if (e.target.className.indexOf('dnd-active') != -1)
        { self.dndZone.classList.remove('dnd-active'); }
      }

      function onDragOver(e) {
        e.stopPropagation();
        e.preventDefault();

        self.dndZone.classList.add('dnd-active');
        e.dataTransfer.dropEffect = 'copy';
      }

      function onDragDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        if (e.target.className == 'dnd-active')
        { self.dndZone.classList.remove('dnd-active'); }

        var files = e.dataTransfer.files; // Array of all files

        self.onFileSelectionChange(null, files);
        self.validate();
      }

      // add dnd events
      this.dndZone = document.getElementById('dnd-zone');
      this.dndZone.addEventListener('dragover', onDragOver);
      this.dndZone.addEventListener('dragleave', onDragLeave);
      this.dndZone.addEventListener('drop', onDragDrop);
    },

    validate: function () {
      var valid = this.inherited(arguments);
      var validFiles = [];
      Query('TR.fileRow', this.uploadTable).map(function (tr) {
        validFiles.push({
          filename: domAttr.get(tr, 'data-filename'),
          type: domAttr.get(tr, 'data-filetype')
        });
      });
      if (!validFiles || validFiles.length < 1) {
        valid = false;
      }
      // This is a quick fix for "selected "Upload type is not kept", will revisit later DX
      this.onUploadTypeChanged(this.uploadType.get('value'));
      if (valid) {
        this.saveButton.set('disabled', false);
      } else {
        this.saveButton.set('disabled', true);
      }
      return valid;
    },

    uploadFile: function (file, uploadDirectory, type, overwrite) {
      if (!this._uploading) {
        this._uploading = [];
      }

      var _self = this;
      var obj = {
        path: uploadDirectory,
        name: file.name,
        type: type
      };
      return Deferred.when(WorkspaceManager.create(obj, true, overwrite), function (obj) {
        domClass.add(_self.domNode, 'Working');
        var uploadUrl = obj.link_reference;

        _self.resetUploadTable();

        var msg = {
          file: file,
          uploadDirectory: uploadDirectory,
          url: uploadUrl
        };
        UploadManager.upload(msg, window.App.authorizationToken);
        return obj;
      }, function (err) {
        // only show prompt if given file-already-exists error
        if (err.indexOf('overwrite flag is not set') === -1) return;

        var conf = 'Are you sure you want to overwrite <i>' + obj.path + obj.name + '</i> ?';
        var dlg = new Confirmation({
          title: 'Overwriting File!',
          content: conf,
          onConfirm: function (evt) {
            _self.uploadFile(file, uploadDirectory, type, true);
          }
        });
        dlg.startup();
        dlg.show();
      });

    },
    resetUploadTable: function () {
      domConstruct.destroy(this.uploadTable);
      delete this.uploadTable;
    },

    // accepts evt (from input object) or FileList (from drag and drop),
    onFileSelectionChange: function (evt, /* FileList */ files) {

      // remove the "none" row when adding files
      domConstruct.destroy(Query('.noneSelected', this.uploadTable)[0]);

      if (this.uploadTable && !this.multiple) {
        this.resetUploadTable();
      }
      // only recreate upload table header
      this.createUploadTable(false);

      var files = files || evt.target.files;
      this.buildFileTable(files);

      // Note: this is all kind of crazy complicated?
      this.createNewFileInput(files);
    },

    buildFileTable: function (files) {
      var _self = this;
      Object.keys(files).forEach(function (idx) {
        var file = files[idx];
        if (file && file.name && file.size) {
          var row = domConstruct.create('tr', {
            'class': 'fileRow'
          }, _self.uploadTable);
          domAttr.set(row, 'data-filename', file.name);
          domAttr.set(row, 'data-filetype', _self.dndType || _self.uploadType.get('value'));
          domConstruct.create('td', {
            innerHTML: file.name
          }, row);
          domConstruct.create('td', {
            innerHTML: _self.uploadType.get('value')
          }, row);
          domConstruct.create('td', {
            innerHTML: file.size
          }, row);
          var delNode = domConstruct.create('td', {
            innerHTML: '<i class="fa icon-x fa-1x" />'
          }, row);
          var handle = on(delNode, 'click', lang.hitch(this, function (evt) {
            handle.remove();
            domConstruct.destroy(row);

            // add "none selected" if all files were removed
            var rowCount = Query('tr.fileRow', this.uploadTable).length;
            if (rowCount == 0) {
              _self.createNoneSelectedRow();
            }

            this.validate();
          }));
        }
      }, this);
    },


    onSubmit: function (evt) {
      var _self = this;
      evt.preventDefault();
      evt.stopPropagation();

      domAttr.set(this.saveButton, 'disabled', true);

      if (!_self.path) {
        console.error('Missing Path for Upload: ', _self.path);
        return;
      }

      var inputFiles = {};
      var defs = [];
      var wsFiles = [];

      var allFiles = this.dndFiles ? [this.dndFiles] : this._previousFiles;

      allFiles.forEach(function (fileHash) {
        Object.keys(fileHash).forEach(function (key) {
          var f = fileHash[key];
          if (f.name) {
            inputFiles[f.name] = f;
          }
        });
      });

      Query('TR.fileRow', this.uploadTable).forEach(lang.hitch(this, function (tr) {

        if (tr && domAttr.get(tr, 'data-filename')) {
          var f = inputFiles[domAttr.get(tr, 'data-filename')];

          if (f.name) {
            defs.push(Deferred.when(this.uploadFile(f, _self.path, domAttr.get(tr, 'data-filetype')), function (res) {
              wsFiles.push(res);
              return true;
            }));
          }
        }
      }));

      All(defs).then(function (results) {
        // create fresh upload table when uploads are commplete
        _self.createUploadTable(true);

        on.emit(_self.domNode, 'dialogAction', {
          action: 'close',
          files: wsFiles,
          bubbles: true
        });
      });
    },

    onCancel: function (evt) {
      // console.log("Cancel/Close Dialog", evt)
      on.emit(this.domNode, 'dialogAction', {
        action: 'close',
        bubbles: true
      });
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
      lang.mixin(mb, changeSize || {}); // changeSize overrides resultSize
      if (!('h' in mb) || !('w' in mb)) {
        mb = lang.mixin(domGeometry.getMarginBox(node), mb); // just use domGeometry.marginBox() to fill in missing values
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

    }
  });
});
