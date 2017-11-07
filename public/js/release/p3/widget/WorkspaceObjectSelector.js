require({cache:{
'url:p3/widget/templates/WorkspaceObjectSelector.html':"<div style=\"padding:0px;\" data-dojo-attach-point=\"focusNode\">\n\t<input type=\"hidden\"/>\n\t<input type=\"text\" data-dojo-attach-point=\"searchBox\" data-dojo-type=\"dijit/form/FilteringSelect\" data-dojo-attach-event=\"onChange:onSearchChange\" data-dojo-props=\"labelType: 'html', promptMessage: '${promptMessage}', missingMessage: '${missingMessage}', searchAttr: 'name'\"  value=\"${value}\" style=\"width:85%\"/>&nbsp;<i data-dojo-attach-event=\"click:openChooser\" class=\"fa icon-folder-open fa-1x\" />\n</div>\n"}});
define("p3/widget/WorkspaceObjectSelector", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/_base/lang", "dojo/query",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"./FlippableDialog", "dijit/_HasDropDown", "dijit/layout/ContentPane", "dijit/form/TextBox",
	"./WorkspaceExplorerView", "dojo/dom-construct", "../WorkspaceManager", "dojo/store/Memory",
	"./Uploader", "dijit/layout/BorderContainer", "dojo/dom-attr",
	"dijit/form/Button", "dojo/_base/Deferred", "dijit/form/CheckBox", "dojo/topic", "dijit/Tooltip",
	"dijit/registry", "dgrid/editor", "./formatter", "dijit/form/FilteringSelect", "dijit/form/Select"
], function(declare, WidgetBase, on, lang, query,
			domClass, Templated, WidgetsInTemplate,
			Template, Dialog, HasDropDown, ContentPane, TextBox,
			Grid, domConstr, WorkspaceManager, Memory,
			Uploader, BorderContainer, domAttr,
			Button, Deferred, CheckBox, Topic, Tooltip,
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
		showHidden: false,
		missingMessage: "A valid workspace item is required.",
		promptMessage: "Please choose or upload a workspace item",
		placeHolder: "",
		allowUpload: true,  	    	// whether or not to add the upload button
		title: "Choose or Upload a Workspace Object",
		autoSelectParent: false,   		// if true, the folder currently being viewed is selected by default
		onlyWritable: false,	    	// only list writable workspaces
		selectionText: "Selection", 	// the text used beside "selected" indicator
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

		_setShowHiddenAttr: function(val){
			this.showHidden = val;

			if(this.grid){
				this.grid.set('showHiddenFiles', val);
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
			var self = this;
			this.path = val;
			if(this.grid){
				this.grid.set('path', val);
			}
			if(this.uploader){
				this.uploader.set('path', val);
			}

			if(this.currentPathNode){
				this.currentPathNode.innerHTML = val;
			}

			// hide/show new workspace/folder icons
			if(self.selectionPane){
				var parts = this.path.split('/');

				// if public
				if(parts[1] == 'public'){
					domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
					domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

					if(this.allowUpload)
						domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden');

				// if usual workspace
				}else if(parts.length < 3){
					domClass.add(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
					domClass.remove(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

					if(this.allowUpload)
						domClass.add(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden');

				// else, is usual folder
				}else{
					domClass.remove(query('[rel="createFolder"]', self.selectionPane.domNode)[0], 'dijitHidden');
					domClass.add(query('[rel="createWS"]', self.selectionPane.domNode)[0], 'dijitHidden');

					if(this.allowUpload)
						domClass.remove(query('[rel="upload"]', self.selectionPane.domNode)[0], 'dijitHidden');
				}
			}

			this.cancelRefresh();
			this.refreshWorkspaceItems();

			// auto select the current folder if option is given
			if(this.autoSelectParent){
				self.set("selection", {
					path: self.path,
					name: self.path.slice(self.path.lastIndexOf('/')+1)
				});
			}

		},
		_setTypeAttr: function(type){
			this.type = Array.isArray(type) ? type : [type];

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
			// this is more efficient than recursively grabing all public objects of a certain type
			try{
				this.store.add(this.selection)
			} catch(e){}

			// ensure there is a dom node put selection info in
			if(!this.selValNode) return;

			// give help text for auto selecting parent folder
			var isCurrentlyViewed = (
				this.autoSelectParent &&
				this.type.length == 1 &&
				this.type[0] == 'folder' &&
				val.name == this.path.slice(val.path.lastIndexOf('/')+1)
			);

			if(!val){
				this.selValNode.innerHTML =
					'<span class="selectedDest"><b>' + this.selectionText + ':</b> None.</span>';
				this.okButton.set('disabled', true);
			}else{
				this.selValNode.innerHTML = '<span class="selectedDest"><b>' +
					 this.selectionText + ':</b> ' +
					 val.name + (isCurrentlyViewed ? ' (currently viewing)' : '') + '<span>';
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
			var self = this;
			var wrap = domConstr.create("div", {});
			this.currentPathNode = domConstr.create("div", {
				innerHTML: this.path,
				style: {'margin': '5px 0 0 0'}
			}, wrap);
			//domConstr.place('<br>', wrap)
			//var sel = domConstr.create("span", {innerHTML: '<b>Selection: </b>', style: "text-align: right"}, wrap);
			this.selValNode = domConstr.create('div', {
				innerHTML: '<span class="selectedDest"><b>' + this.selectionText + ':</b> None.</span>',
				style: {'margin': '5px 0', 'float': 'left'}
			}, wrap);


			// create workspace button
			var createWSBtn = domConstr.create('i', {
				'rel': 'createWS',
				'class': "icon-add-workspace objSelectorActionIcon fa-2x"
			})
			on(createWSBtn, 'click', function(){
				Topic.publish("/openDialog", {
					type: "CreateWorkspace"
				});
			})
			new Tooltip({
				connectId: createWSBtn,
				label: "Create Workspace",
				position: ['above']
			})

			// create folder button
			var createFolderBtn = domConstr.create('i', {
				'rel': 'createFolder',
				'class': "icon-folder-plus objSelectorActionIcon fa-2x"
			})
			on(createFolderBtn, 'click', function(){
				Topic.publish("/openDialog", {
					type: "CreateFolder",
					params: self.path
				});
			})
			new Tooltip({
				connectId: createFolderBtn,
				label: "Create Folder",
				position: ['above']
			});

			var buttonContainer = domConstr.create("div", {
				style: {
					"font-size": ".85em",
					"display": "inline-block",
					"float": "right",
					"text-align": "right"
				},
				innerHTML: ''
			}, wrap);


			// upload button, if needed
			if(this.allowUpload){
				var uploadBtn = domConstr.create('i', {
					'rel': 'upload',
					'class': "icon-upload objSelectorActionIcon fa-2x"
				})
				var uploadTooltip = new Tooltip({
					connectId: uploadBtn,
					label: "Upload to current folder",
					position: ['above']
				});
				on(uploadBtn, 'click', function(){
					uploadTooltip.close();
				})
				domConstr.place(uploadBtn, buttonContainer);
			}

			domConstr.place(createWSBtn, buttonContainer);
			domConstr.place(createFolderBtn, buttonContainer);

			if(this.path.split('/').length <= 3){
				domClass.add(query('[rel="createFolder"]', wrap)[0], 'dijitHidden');
				if(this.allowUpload)
					domClass.add(query('[rel="upload"]', wrap)[0], 'dijitHidden');
			}else{
				domClass.add(query('[rel="createWS"]', wrap)[0], 'dijitHidden');
				if(this.allowUpload)
					domClass.remove(query('[rel="upload"]', wrap)[0], 'dijitHidden');
			}

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
			var _self = this;

			// if dialog is already built, just show it
			if(this.dialog){
				this.dialog.flip("front");
				this.dialog.show();
				return;
			}


			this.dialog = new Dialog({
				title: this.title,
				draggable: true
			});
			var frontBC = new BorderContainer({style: {width: "805px", height: "650px"}});
			var backBC = new BorderContainer({
				style: {
					width: "805px",
					height: "700px",
					margin: "0",
					padding: "0px"
				}
			});

			var viewSelector = new Select({
				name: "togglePublic",
				style: { width: '100px' },
				options: [
					{
						label: "Workspaces",
						value: "mine",
						selected:  _self.path.split('/')[1] != 'public'
					},{
						label: "Public Workspaces",
						value: "public",
						selected:  _self.path.split('/')[1] == 'public'
					}
				]
			})

			viewSelector.on('change', function(val){
				if(val == 'mine') {
					var home = '/'+window.App.user.id;
					_self.set('path', home);
				}else if(val == 'public'){
					_self.set('path', '/public/')
				}
			})

			domConstr.place(frontBC.domNode, this.dialog.containerNode, "first");

			var selectionPane = new ContentPane({
				region: "top",
				content: this.createSelectedPane(),
				style: "border:0px;"
			});
			this.selectionPane = selectionPane;

			domConstr.place(viewSelector.domNode, selectionPane.containerNode, "first");

			var buttonsPane = new ContentPane({region: "bottom", style: "text-align: right;border:0px;"});

			var cbContainer = domConstr.create("div", {style: {"float": 'left'}});
			domConstr.place(cbContainer, buttonsPane.containerNode, "last");
			this.showHiddenWidget = new CheckBox({value: this.showHidden, checked: this.showHidden});
			this.showHiddenWidget.on("change", function(val){
				_self.set("showHidden", val);
				if(val){
					_self.grid.set('types', null);
				}else{
					// back to unchecked state
					_self.grid.set('types', ["folder"].concat(_self.type));
				}
			});

			domConstr.place(this.showHiddenWidget.domNode, cbContainer, "first");
			domConstr.create("span", {innerHTML: "Show all files and folders "}, cbContainer);

			var helpIcon = domConstr.create('i', {
				'class': "icon-question-circle"
			})
			domConstr.place(helpIcon, cbContainer, "last");

			new Tooltip({
				connectId: helpIcon,
				label: "<b>Note:</b><br>" +
					   " - This selector only allows objects of a specific type to be selected.<br>" +
					   " - When this is not checked, you can only see objects assigned the appropriate object type.<br>" +
					   'You can change the type of an object under "Workspaces"',
				position: ['above']
			})


			var cancelButton = new Button({label: "Cancel"});
			cancelButton.on('click', function(){
				_self.dialog.hide();
			});
			var okButton = this.okButton = new Button({label: "OK"});

			okButton.on("click", function(evt){
				if(_self.selection){
					_self.set("value", _self.selection.path);
				}

				_self.onSelection(_self.selection.path);
				_self.dialog.hide();
			});
			domConstr.place(cancelButton.domNode, buttonsPane.containerNode, "last");
			domConstr.place(okButton.domNode, buttonsPane.containerNode, "last");


			on(selectionPane.domNode, "i:click", function(evt){
				var rel = domAttr.get(evt.target, "rel");
				switch(rel){
					case "upload":
						_self.dialog.flip();
						break;
					/*  testing without inline ws/folder creation
					case "createFolder":
						var element = _self.grid.row(0).element;
						_self.grid.addNewFolder({id: "untitled"});
						break;
					case "createWS":
						var element = _self.grid.row(0).element;
						_self.grid.addNewFolder({id: "untitled"});
						break;
					*/
				}
			});
			// var _self = this;

			var grid = this.grid = this.createGrid();

			frontBC.addChild(selectionPane);
			frontBC.addChild(grid);
			frontBC.addChild(buttonsPane);
			frontBC.startup();


			// add uploader to back side of dialog
			if (_self.allowUpload) {
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


				this.dialog.backpaneTitleBar.innerHTML = "Upload files to Workspace";
				var uploader = this.uploader = new Uploader({
					path: _self.path,
					style: {
						height: "620px",
						overflow: "scroll"
					},
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

		onSelection: function(){
			/* can be overwritten */
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
			var self = this;

			var grid =  new Grid({
				region: "center",
				path: this.path,
				selectionMode: "single",
				deselectOnRefresh: true,
				onlyWritable: self.onlyWritable,
				allowDragAndDrop: false,
				showHiddenFiles: this.showHidden,
				types: this.type ? (["folder"].concat(this.type)) : false,
				columns: {
					type: {
						label: "",
						get: function(item){
							if(item.type == "job_result" && item.autoMeta && item.autoMeta.app){
								return item.type + "_" + (item.autoMeta.app.id ? item.autoMeta.app.id : item.autoMeta.app);
							}else if(item.type == "folder" && item.path.split('/').length <= 3){
								if(item.global_permission != 'n')
									return 'publicWorkspace';

								// determine if shared or not
								return item.permissions.length > 1 ? 'sharedWorkspace' :'workspace';
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
					size: {
						label: "Size",
						field: "size",
						get: function(item){
							return item;
						},
						className: "wsItemSize",
						hidden: false,
						formatter: formatter.objectOrFileSize
					},
					owner: {
						label: "Owner",
						field: "owner_id",
						className: "wsItemOwnerId",
						formatter: formatter.baseUsername,
						hidden: false
					},
					sharedWith: {
						label: "Members",
						field: "_item",
						className: "wsItemMembers",
						formatter: formatter.usersFormatter
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
				Deferred.when(WorkspaceManager.createFolder(self.path + "/" + name), function(){
					self.grid.refreshWorkspace();
					self.refreshWorkspaceItems();
				});
			});
			grid.allowSelect = function(row){
				if(row.data.type && (self.type.indexOf(row.data.type) >= 0)){
					return true;
				}
				return false;
			};

			grid.on("ItemDblClick", function(evt){
				if(evt.item && evt.item.type == "folder" || evt.item.type == "parentfolder"){
					self.set('path', evt.item_path);
				}else{
					if(self.selection){
						self.set('value', self.selection.path);
						self.dialog.hide()
					}
				}
			});

			grid.on("select", function(evt){
				var row = evt.rows[0];
				self.set("selection", row.data);
			});

			grid.on("deselect", function(evt){
				// This is causing flickering.  Is it really safe to remove it?  Seems to be.
				//self.set('selection', "");
			});


			if(this.autoSelectParent){
				self.set("selection", {
					path: self.path,
					name: self.path.slice(self.path.lastIndexOf('/')+1)
				});
			}

			return grid;
		}
	});
});
