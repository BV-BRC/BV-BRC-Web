define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/_base/lang",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"./FlippableDialog", "dijit/_HasDropDown", "dijit/layout/ContentPane", "dijit/form/TextBox",
	"./WorkspaceExplorerView", "dojo/dom-construct", "../WorkspaceManager", "dojo/store/Memory",
	"./Uploader", "dijit/layout/BorderContainer", "dojo/dom-attr",
	"dijit/form/Button", "dojo/_base/Deferred", "dijit/form/CheckBox", "dojo/topic",
	"dijit/registry", "dgrid/editor", "./formatter", "dijit/form/FilteringSelect", "dijit/form/Select"
], function(declare, WidgetBase, on, lang,
			domClass, Templated, WidgetsInTemplate,
			Template, Dialog, HasDropDown, ContentPane, TextBox,
			Grid, domConstr, WorkspaceManager, Memory,
			Uploader, BorderContainer, domAttr,
			Button, Deferred, CheckBox, Topic,
			registry, editor, formatter, FilteringSelect, Select){

	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		baseClass: "WorkspaceObjectSelector",
		templateString: Template,
		workspace: "",
		selection: "",
		value: "",
		path: "",
		disabled: false,
		required: false,
		showUnspecified: false,
		missingMessage: "A valid workspace item is required.",
		promptMessage: "Please choose or upload a workspace item",
		placeHolder: "",
		reset: function(){
			this.searchBox.set('value', '');
		},
		_setPlaceHolderAttr: function(val){
			if(this.searchBox){
				this.searchBox.set('placeHolder', val);
			}
		},
		_setShowUnspecifiedAttr: function(val){
			this.showUnspecified = val;
			if(val){
				if(!(this.type.indexOf("unspecified") >= 0)){
					this.type.push("unspecified");
				}
			}else{
				this.type = this.type.filter(function(t){
					return (t != "unspecified");
				});
			}
			if(this.grid){
				this.grid.set('types', this.type);
			}
		},

		_setDisabledAttr: function(val){
			this.disabled = val;
			if(val){
				domClass.add(this.domNode, "disabled");
			}else{
				domClass.remove(this.domNode, "disabled");
			}

			if(this.searchBox){
				this.searchBox.set("disabled", val);
			}
		},
		_setRequiredAttr: function(val){
			this.required = val;
			if(this.searchBox){
				this.searchBox.set("required", val);
			}
		},

		_setPathAttr: function(val){
			this.path = val;
			if(this.grid){
				this.grid.set('path', val);
			}
			if(this.uploader){
				this.uploader.set('path', val);
			}

			if(this.currentPathNode){
				this.currentPathNode.innerHTML = "Folder: " +
				val;
			}
			this.cancelRefresh();
			this.refreshWorkspaceItems();
		},
		_setTypeAttr: function(type){
			if(!(type instanceof Array)){
				type = [type];
			}
			this.type = type;
			if(this.grid){
				this.grid.set('types', (["folder"].concat(this.type)));
			}
			this.cancelRefresh();
			this.refreshWorkspaceItems();
		},
		_setValueAttr: function(value, refresh){
			this.value = value;
			if(this._started){
				if(refresh){
					this.refreshWorkspaceItems()
				}else{
					this.searchBox.set('value', this.value);
				}
			}

		},

		_getValueAttr: function(value){
			return this.searchBox.get('value', value);
		},

		_setSelectionAttr: function(val){
			this.selection = val;

			// ensures item is in store (for public workspaces),
			// this is more efficient that recursively grabing all public objects of a certain type
			try{
				this.store.add(this.selection)
			} catch(e){}

			//console.log("this.selection: ", this.selection);
			if(!val){
				this.selValNode.innerHTML = "None.";
				this.okButton.set('disabled', true);
			}else{
				this.selValNode.innerHTML = val.name;
				this.okButton.set('disabled', false);
			}
		},

		postMixinProperties: function(){
			if(!this.value && this.workspace){
				this.value = this.workspace;
			}
			this.inherited(arguments);
		},

		createSelectedPane: function(){
			var wrap = domConstr.create("div", {});
			this.currentPathNode = domConstr.create("div", {innerHTML: "Folder: " + this.path}, wrap);
			var sel = domConstr.create("span", {innerHTML: "Selection: ", style: "text-align: right"}, wrap);
			this.selValNode = domConstr.create('span', {innerHTML: "None."}, sel);
//			domConstr.place(this.selValNode, sel, "last");
			var buttonContainer = domConstr.create("div", {
				style: {"font-size": ".85em", display: "inline-block", "float": "right", "text-align": "right"},
				innerHTML: '<i rel="createFolder" class="fa icon-folder-plus fa-2x" style="vertical-align: bottom;" ></i>&nbsp;<i rel="upload" class="fa icon-upload fa-2x" style="vertical-align: bottom"></i>'
			}, wrap);

			return wrap;
		},
		focus: function(){
			// summary:
			//		Put focus on this widget
			if(!this.disabled && this.focusNode.focus){
				try{
					this.focusNode.focus();
				}catch(e){
				}
				/*squelch errors from hidden nodes*/
			}
		},

		openChooser: function(){
			if(this.disabled){
				return;
			}
			if(!this.dialog){
				var _self = this;
				this.dialog = new Dialog({title: "Choose or Upload a Workspace Object", draggable: true});
				var frontBC = new BorderContainer({style: {width: "700px", height: "500px"}});
				var backBC = new BorderContainer({
					style: {
						width: "700px",
						height: "500px",
						margin: "0",
						padding: "0px"
					}
				});
				this.dialog.backpaneTitleBar.innerHTML = "Upload files to Workspace";
				domConstr.place(frontBC.domNode, this.dialog.containerNode, "first");

				var selectionPane = new ContentPane({
					region: "top",
					content: this.createSelectedPane(),
					style: "border:0px;"
				});

 				var viewSelector = new Select({
					name: "togglePublic",
					style: { width: '100px' },
					options: [
						{
							label: "My Workspaces",
							value: "mine",
							selected:  _self.path.split('/')[1] != 'public'
						},{
							label: "Public PATRIC Workspace",
							value: "public",
							selected:  _self.path.split('/')[1] == 'public'
						}
					]
				})

				viewSelector.on('change', function(val){
					if(val == 'mine') {
						var home = '/'+window.App.user.id+'/home';
						_self.set('path', home);
					}else if(val == 'public'){
						_self.set('path', '/public/PATRIC@patricbrc.org/home')
					}
				})

				domConstr.place(viewSelector.domNode, selectionPane.containerNode, "first");

				var buttonsPane = new ContentPane({region: "bottom", style: "text-align: right;border:0px;"});
				var span = domConstr.create("span", {style: {"float": 'left'}});
				domConstr.place(span, buttonsPane.containerNode, "first");
				this.showUnspecifiedWidget = new CheckBox({value: this.showUnspecified, checked: this.showUnspecified});
				this.showUnspecifiedWidget.on("change", function(val){
					// console.log("changed showUnspecifiedwidget: ", val);
					_self.set("showUnspecified", val);
				});
				domConstr.place(this.showUnspecifiedWidget.domNode, span, "first");
				domConstr.create("span", {innerHTML: "Show files with an unspecified type"}, span);
				var cancelButton = new Button({label: "Cancel"});
				cancelButton.on('click', function(){
					_self.dialog.hide();
				});
				var okButton = this.okButton = new Button({label: "OK"});

				okButton.on("click", function(evt){
					if(_self.selection){
						_self.set("value", _self.selection.path);
					}

					_self.dialog.hide();
				});
				domConstr.place(okButton.domNode, buttonsPane.containerNode, "last");
				domConstr.place(cancelButton.domNode, buttonsPane.containerNode, "first");


				on(selectionPane.domNode, "i:click", function(evt){
					// console.log("Click: ", evt);
					var rel = domAttr.get(evt.target, "rel");
					switch(rel){
						case "upload":
							_self.dialog.flip();
							break;
						case "createFolder":
							// console.log("Create Folder", _self.grid.row(0));
							var element = _self.grid.row(0).element;
							// console.log("element: ", element);
							_self.grid.addNewFolder({id: "untitled"});

							break;
					}
				});
				// var _self = this;

				var grid = this.grid = this.createGrid();

				frontBC.addChild(selectionPane);
				frontBC.addChild(grid);
				frontBC.addChild(buttonsPane);
				frontBC.startup();


				var backhead = new ContentPane({
					region: "top",
					content: '<span rel="flip" class="fa fa-1.5x fa-reply">&nbsp;Browse Workspace</span>'
				});
				on(backhead.domNode, "span:click", function(evt){
					var rel = domAttr.get(evt.target, "rel");
					switch(rel){
						case "flip":
							_self.dialog.flip();
							break;
					}
				});
				var uploader = this.uploader = new Uploader({
					path: _self.path,
					region: "center",
					multiple: false,
					types: this.type,
					pathLabel: "Upload file to: ",
					buttonLabel: "Select File"
				});

				on(uploader.domNode, "dialogAction", function(evt){
					// console.log("Uploader Dialog Action: ", evt);
					if(evt.files && evt.files[0] && evt.action == "close"){
						var file = evt.files[0];
						_self.set("selection", file);
						_self.set('value', file.path, true);
						_self.dialog.hide();
					}else{
						_self.dialog.flip()
					}
				});

				uploader.startup();

				backBC.addChild(backhead);
				backBC.addChild(uploader);
				domConstr.place(backBC.domNode, this.dialog.backPane, "first");


			}
			this.dialog.flip("front");
			this.dialog.show();
		},

		cancelRefresh: function(){
			if(this._refreshing){
				delete this._refreshing;
			}
		},

		refreshWorkspaceItems: function(){
			if(this._refreshing){
				return;
			}
			this._refreshing = WorkspaceManager.getObjectsByType(this.type, true).then(lang.hitch(this, function(items){
				delete this._refreshing;

				// sort by most recent
				items.sort(function(a, b){
					return b.timestamp - a.timestamp;
				});

				this.store = new Memory({data: items, idProperty: "path"});

				this.searchBox.set("store", this.store);
				if(this.value){
					this.searchBox.set('value', this.value);
				}
			}));
		},
		onSearchChange: function(value){
			this.set("value", value);
			this.onChange(value);
			this.validate(true);
		},
		onChange: function(value){
		},
		startup: function(){
			if(this._started){
				return;
			}
			// console.log("call getObjectsByType(); ", this.type);
			this.inherited(arguments);

			var _self = this;
			if(!this.path){
				Deferred.when(WorkspaceManager.get("currentPath"), function(path){
					_self.set('path', path);
					_self.refreshWorkspaceItems();
				});
			}else{
				this.refreshWorkspaceItems();
			}
			Topic.subscribe("/refreshWorkspace", lang.hitch(this, "refreshWorkspaceItems"));
			this.searchBox.set('disabled', this.disabled);
			this.searchBox.set('required', this.required);
			this.searchBox.set('placeHolder', this.placeHolder);
			this.searchBox.labelFunc = this.labelFunc;
		},

		labelFunc: function(item, store){
			var label = "<div style='font-size:1em; border-bottom:1px solid grey;'>" + "/";
			var pathParts = item.path.split('/');
			var workspace = pathParts[2];
			var labelParts = [workspace];
			if(pathParts.length - 2 > 3){
				labelParts.push("...");
			}
			if(pathParts.length - 2 > 2){
				var parentFolder = pathParts[pathParts.length - 2];
				parentFolder = parentFolder.replace(/^\./, "");
				labelParts.push(parentFolder);
			}
			if(pathParts.length - 1 > 2){
				var objName = pathParts[pathParts.length - 1];
				labelParts.push(objName);
			}
			labelParts[labelParts.length - 1] = "</br>" + "<span style='font-size:1.05em; font-weight:bold;'>" + labelParts[labelParts.length - 1] + "</span></div>";
			label += labelParts.join("/");
			return label;
		},

		validate: function(/*Boolean*/ isFocused){
			//possibly need to build out refresh function to prevent tricky submissions(see validationtextbox)
			var message = "";
			var isValid = this.disabled || this.searchBox.isValid(isFocused);
			this._set("state", isValid ? "" : this.searchBox.state);
			this.focusNode.setAttribute("aria-invalid", this.state == "Error" ? "true" : "false");
			if(isValid){
				registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
					obj.validate();
				});
			}

			return isValid;
		},
		createGrid: function() {

			var _self = this;

			var grid =  new Grid({
				region: "center",
				path: this.path,
				selectionMode: "single",
				deselectOnRefresh: true,
				types: this.type ? (["folder"].concat(this.type)) : false,
				columns: {
					type: {
						label: "",
						get: function(item){
							if(item.type == "job_result" && item.autoMeta && item.autoMeta.app){
								return item.type + "_" + (item.autoMeta.app.id ? item.autoMeta.app.id : item.autoMeta.app);
							}
							return item.type;
						},
						className: "wsItemType",
						formatter: formatter.wsItemType,
						unhidable: true
					},
					name: editor({
						label: "Name",
						field: "name",
						className: "wsItemName",
						canEdit: function(obj, val){
							return obj.id == 'untitled';
						},
						autoSave: true,
						editOn: "click",
						editor: TextBox,
						editorArgs: {placeHolder: "Untitled Folder", trim: true}
					}),
					owner: {
						label: "Owner",
						field: "owner_id",
						className: "wsItemOwnerId",
						formatter: formatter.baseUsername,
						hidden: false
					},
					creation_time: {
						label: "Created",
						field: "creation_time",
						className: "wsItemCreationTime",
						formatter: formatter.date
					}
				}
			});

			grid.on("dgrid-datachange", function(evt){
				var name = evt.value;
				if(!name){
					return;
				}
				Deferred.when(WorkspaceManager.createFolder(_self.path + "/" + name), function(){
					_self.grid.refreshWorkspace();
					_self.refreshWorkspaceItems();
				});
			});
			grid.allowSelect = function(row){
				if(row.data.type && (_self.type.indexOf(row.data.type) >= 0)){
					return true;
				}
				return false;
			};

			grid.on("ItemDblClick", function(evt){
				if(evt.item && evt.item.type == "folder" || evt.item.type == "parentfolder"){
					_self.set('path', evt.item_path);
				}else{
					if(_self.selection){
						_self.set('value', _self.selection.path);
						_self.dialog.hide()
					}
				}
				// console.log("ItemDblClick for chooser: ", evt);
				//	var row = evt.rows[0];
				//	var data = row.data;
				//	console.log("selected: ", data);
			});

			grid.on("select", function(evt){
				var row = evt.rows[0];
				_self.set("selection", row.data);
			});

			grid.on("deselect", function(evt){
				_self.set('selection', "");
			});

			return grid

		}
	});
});
