require({cache:{
'url:p3/widget/templates/Uploader.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div style=\"margin-left:5px; border:solid 1px #B5BCC7;\">\n\t\t<div style=\"padding: 5px; background-color:#eee; margin-bottom:5px;\">${pathLabel} <span data-dojo-attach-point=\"destinationPath\">${path}</span></div>\n\t\t<div style=\"padding: 5px;\">\n\t\t\t<div style=\"width:300px\">\n\t\t\t\t${typeLabel}<select data-dojo-type=\"dijit/form/Select\" name=\"type\" data-dojo-attach-event=\"onChange:onUploadTypeChanged\" data-dojo-attach-point=\"uploadType\" style=\"vertical-align: top;width:200px\" required=\"true\" data-dojo-props=\"\">\n\t\t\t</select>\n\t\t\t</div></br>\n\t\t\t<div data-dojo-attach-point=\"typeDescriptionContainer\" style=\"width: 450px;margin:auto;font-size: .9em; margin-bottom:10px; color: #333; border: 2px solid orange; border-radius: 4px;min-height:40px;padding:4px;\"></div>\n\t\n\t\t\t<div data-dojo-attach-point=\"fileFilterContainer\" style=\"font-size:.85em;margin-bottom: 10px;\" class='dijitHidden'>\n\t\t\t\t<input data-dojo-type=\"dijit/form/CheckBox\" data-dojo-attach-point=\"showAllFormats\" data-dojo-attach-event=\"onChange:onChangeShowAllFormats\" checked=\"true\"/><span>Restrict file selection to the common extensions for this file type: </span><br/><span style=\"margin-left: 25px;\" data-dojo-attach-point=\"formatListNode\"></span>\n\t\t\t</div>\n\n\n\t\t\t<div class=\"fileUploadButton\" style=\"border-radius:2px\" data-dojo-attach-point=\"fileUploadButton\">\n\t\t\t\t<span>${buttonLabel}</span>\n\t\t\t\t<!-- <input type=\"file\" data-dojo-attach-point=\"fileInput\" data-dojo-attach-event=\"onchange:onFileSelectionChange\" /> -->\n\t\t\t</div>\n\t\t\t<div data-dojo-attach-point=\"fileTableContainer\"></div>\n\n\t\t\t<div class=\"workingMessage\" style=\"width:400px;\" data-dojo-attach-point=\"workingMessage\">\n\t\t\t</div>\n\n\t\t\t<div style=\"margin-left:20px;margin-top:20px;text-align:right;\">\n\t\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" disabled=\"true\" data-dojo-type=\"dijit/form/Button\">Upload Files</div>\n\t\t\t</div>\t\n\t\t</div>\n\t</div>\n</form>\n"}});
define("p3/widget/Uploader", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Uploader.html", "dijit/form/Form", "dojo/_base/Deferred",
	"dijit/ProgressBar", "dojo/dom-construct", "p3/UploadManager", "dojo/query", "dojo/dom-attr",
	"dojo/_base/lang", "dojo/dom-geometry", "dojo/dom-style", "dojo/promise/all", "../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, Deferred,
			ProgressBar, domConstruct, UploadManager, Query, domAttr,
			lang, domGeometry, domStyle, All, WorkspaceManager){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		overwrite: false,
		multiple: false,
		types: false,
		pathLabel: "Upload file to: ",
		buttonLabel: "Select Files",
		typeLabel: "Upload type: ",
		knownTypes: {
			unspecified: {label: "Unspecified", formats: ["*.*"]},
			contigs: {
				label: "Contigs",
				formats: [".fa", ".fasta", ".fna"],
				description: "Contigs must be provided in fasta format (typically .fa, .fasta, .fna). Genbank formatted files are not currently accepted."
			},
			reads: {
				label: "Reads",
				formats: [".fq", ".fastq", ".fa", ".fasta", ".gz", ".bz2"],
				description: "Reads must be in fasta or fastq format (typically .fa, .fasta, .fa, .fastq).  Genbank formatted files are not currently accepted."
			},
			diffexp_input_data: {label: "Diff. Expression Input Data", formats: [".csv", ".txt", ".xls", ".xlsx"]},
			diffexp_input_metadata: {
				label: "Diff. Expression Input Metadata",
				formats: [".csv", ".txt", ".xls", ".xlsx"]
			},
			feature_protein_fasta: {
				label: "feature_protein_fasta",
				formats: [".fa", ".fasta", ".faa"],
				description: "Protein sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted."
			}
		},
		_setPathAttr: function(val){
			this.path = val;
			this.destinationPath.innerHTML = val;
		},

		onUploadTypeChanged: function(val){
			// console.log("Upload type changed: ", val);
			var formats = this.knownTypes[val].formats;
			// console.log("formats: ", val, formats);
			this.formatListNode.innerHTML = formats.join(", ");

			var description = this.knownTypes[val].description;

			if(!this.showAllFormats.get('value')){
				console.log("Accept All formats");
				domAttr.set(this.fileInput, "accept", "*.*");
			}else{
				//var formats = this.knownTypes[this.uploadType.get('value')].formats;
				if(formats == "*.*"){
					domClass.add(this.fileFilterContainer, "dijitHidden");
				}else{
					domClass.remove(this.fileFilterContainer, "dijitHidden");
				}
				// console.log("set formats to: ", formats.join(","));
				domAttr.set(this.fileInput, "accept", formats.join(","));
			}

			if(description){
				domClass.remove(this.typeDescriptionContainer, "dijitHidden");
				this.typeDescriptionContainer.innerHTML = description;
			}else{
				domClass.add(this.typeDescriptionContainer, "dijitHidden");
			}
		},
		onChangeShowAllFormats: function(val){
			console.log("Show All Formats: ", val);
			if(!val){
				console.log("Accept All formats");
				domAttr.set(this.fileInput, "accept", "*.*");
			}else{
				var type = this.uploadType.get('value');
				console.log("uploadType value: ", type);
				var formats = this.knownTypes[this.uploadType.get('value')].formats;
				console.log("uploadType: ", this.uploadType.get('value'));
				domAttr.set(this.fileInput, "accept", formats.join(","));
			}

		},

		createUploadTable: function(empty){

			// remove existing container as long as not adding multiple rows,
			// since createUploadTable is called on each file change
			// Note: this should probably be refactored
			// to always leave the header in place
			if (!this.multiple) {
				domConstruct.empty(this.fileTableContainer);
			}

			if(!this.uploadTable){

				var table = domConstruct.create("table", {
					style: {
						border: "1px solid #eee",
						width: "100%"
					}
				}, this.fileTableContainer);
				this.uploadTable = domConstruct.create('tbody', {}, table)
				var htr = domConstruct.create("tr", {}, this.uploadTable);
				domConstruct.create("th", {
					style: {"background-color": "#eee", "border": "none", "text-align": "left"},
					innerHTML: "File Selected"
				}, htr);
				domConstruct.create("th", {
					style: {"background-color": "#eee", "border": "none", "text-align": "left"},
					innerHTML: "Type"
				}, htr);
				domConstruct.create("th", {
					style: {"background-color": "#eee", "border": "none", "text-align": "left"},
					innerHTML: "Size"
				}, htr);
				domConstruct.create("th", {
					style: {
						"background-color": "#eee",
						"border": "none",
						"text-align": "right"
					}
				}, htr);
				if(empty){
					this.createNoneSelectedRow();
				}
			}
		},

		createNoneSelectedRow: function() {
			var row = domConstruct.create("tr", {"class": "fileRow noneSelected"}, this.uploadTable);
			domConstruct.create("td", {
				style: {"padding-left": "5px", "text-align": "left"},
				innerHTML: "<i>None</i>"
			}, row);
			domConstruct.create("td", {style: {"text-align": "left"}}, row);
			domConstruct.create("td", {style: {"text-align": "left"}}, row);
			domConstruct.create("td", {style: {"text-align": "right"}}, row);
		},

		createNewFileInput: function(){
			if(this.fileInput){
				if(!this._previousFileInputs){
					this._previousFileInputs = [];
				}
				if(this.inputHandler){
					this.inputHandler.remove();
				}
				domStyle.set(this.fileInput, "display", "none");
				this._previousFileInputs.push(this.fileInput);
			}

			this.fileInput = domConstruct.create("input", {type: "file", multiple: this.multiple});
			domConstruct.place(this.fileInput, this.fileUploadButton, "last");
			this.inputHandler = on(this.fileInput, "change", lang.hitch(this, "onFileSelectionChange"));

		},
		startup: function(){
			if(this._started){
				return;
			}

			this.inherited(arguments);
			var state = this.get("state")
			this.createNewFileInput();

			var _self = this;
			Object.keys(this.knownTypes).filter(function(t){
				return (!_self.types || (_self.types == "*") || ((_self.types instanceof Array) && (_self.types.indexOf(t) >= 0)))
			}).forEach(function(t){
				//console.log("* Add option: ", t, _self.knownTypes[t], _self.uploadType, _self.uploadType.addOption);
				_self.uploadType.addOption({disabled: false, label: _self.knownTypes[t].label, value: t});
			});

			var type = this.uploadType.get('value');
			if(type && this.knownTypes[type]){
				var description = this.knownTypes[type].description;
				if(description){
					domClass.remove(this.typeDescriptionContainer, "dijitHidden");
					this.typeDescriptionContainer.innerHTML = description;
				}else{
					domClass.add(this.typeDescriptionContainer, "dijitHidden");
				}
			}else{
				domClass.add(this.typeDescriptionContainer, "dijitHidden");
			}

			if(!this.path){
				Deferred.when(WorkspaceManager.get("currentPath"), function(path){
					console.log("CURRENT PATH: ", path);
					_self.set('path', path);
				});
			}

			if((state == "Incomplete") || (state == "Error")){
				this.saveButton.set("disabled", true);
			}

			this.watch("state", function(prop, val, val2){
				console.log("Upload Form State: ", prop, val, val2);
				if(val2 == "Incomplete" || val2 == "Error"){
					this.saveButton.set("disabled", true);
				}else{
					this.saveButton.set('disabled', false);
				}
			});
			this.createUploadTable(true);
		},
		validate: function(){
			var valid = this.inherited(arguments);
			var validFiles = []
			Query("TR.fileRow", this.uploadTable).map(function(tr){
				validFiles.push({filename: domAttr.get(tr, "data-filename"), type: domAttr.get(tr, "data-filetype")});
			})
			if(!validFiles || validFiles.length < 1){
				valid = false;
			}

			if(valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled", true);
			}
			return valid;
		},

		uploadFile: function(file, uploadDirectory, type){
			if(!this._uploading){
				this._uploading = []
			}

			var _self = this;
			var obj = {path: uploadDirectory, name: file.name, type: type}
			return Deferred.when(WorkspaceManager.create(obj, true), function(obj){
				domClass.add(_self.domNode, "Working");
				var uploadUrl = obj.link_reference;

				_self.resetUploadTable();

				var msg = {file: file, uploadDirectory: uploadDirectory, url: uploadUrl};
				UploadManager.upload(msg, window.App.authorizationToken);
				return obj;
			});

		},
		resetUploadTable: function() {
			console.log('called restUploadTable')
			domConstruct.destroy(this.uploadTable);
			delete this.uploadTable;
		},
		onFileSelectionChange: function(evt){

			// remove the "none" row when adding files
			domConstruct.destroy( Query(".noneSelected", this.uploadTable)[0] );

			if(this.uploadTable && !this.multiple){
				this.resetUploadTable();
			}
			// only recreate upload table header
			this.createUploadTable(false);

			var files = evt.target.files;
			var _self = this;
			Object.keys(files).forEach(function(idx){
				var file = files[idx];
				if(file && file.name && file.size){
					var row = domConstruct.create("tr", {"class": "fileRow"}, _self.uploadTable);
					domAttr.set(row, "data-filename", file.name);
					domAttr.set(row, "data-filetype", _self.uploadType.get('value'));
					var nameNode = domConstruct.create("td", {innerHTML: file.name}, row);
					var typeNode = domConstruct.create("td", {innerHTML: _self.uploadType.get("value")}, row);
					var sizeNode = domConstruct.create("td", {innerHTML: file.size}, row);
					var delNode = domConstruct.create("td", {innerHTML: '<i class="fa icon-x fa-1x" />'}, row);
					var handle = on(delNode, "click", lang.hitch(this, function(evt){
						handle.remove();
						domConstruct.destroy(row);

						// add "none selected" if all files were removed
						var rowCount = Query("tr.fileRow", this.uploadTable).length;
						if ( rowCount == 0) {
							_self.createNoneSelectedRow()
						}

						this.validate()
					}));
				}
			}, this);

			this.createNewFileInput();
		},

		onSubmit: function(evt){
			var _self = this;
			evt.preventDefault();
			evt.stopPropagation();

			if(!_self.path){
				console.error("Missing Path for Upload: ", _self.path);
				return;
			}

			var inputFiles = {};
			var defs = [];
			var wsFiles = []

			this._previousFileInputs.forEach(lang.hitch(this, function(FI){
				Object.keys(FI.files).forEach(lang.hitch(this, function(key){
					var f = FI.files[key];
					if(f.name){
						console.log(" f.name: ", f.name);
						inputFiles[f.name] = f;
					}
				}));
			}));

			Query("TR.fileRow", this.uploadTable).forEach(lang.hitch(this, function(tr){

				if(tr && domAttr.get(tr, "data-filename")){
					var f = inputFiles[domAttr.get(tr, "data-filename")];
					if(f.name){
						defs.push(Deferred.when(this.uploadFile(f, _self.path, domAttr.get(tr, "data-filetype")), function(res){
							wsFiles.push(res);
							return true;
						}));
					}
				}
			}));

			All(defs).then(function(results){
				console.log("UPLOAD Create WS files results: ", wsFiles);

				// create fresh upload table when uploads are commplete
				_self.createUploadTable(true);

				on.emit(_self.domNode, "dialogAction", {action: "close", files: wsFiles, bubbles: true});
			});
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action: "close", bubbles: true});
		},
		resize: function(changeSize, resultSize){
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
			if(changeSize){
				domGeometry.setMarginBox(node, changeSize);
			}

			// If either height or width wasn't specified by the user, then query node for it.
			// But note that setting the margin box and then immediately querying dimensions may return
			// inaccurate results, so try not to depend on it.
			var mb = resultSize || {};
			lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
			if(!("h" in mb) || !("w" in mb)){
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

		}
	});
});
