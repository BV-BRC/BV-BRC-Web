define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/_base/lang",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"./FlippableDialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox",
	"./WorkspaceExplorerView","dojo/dom-construct","../WorkspaceManager","dojo/store/Memory",
	"./Uploader", "dijit/layout/BorderContainer","dojo/dom-attr",
	"dijit/form/Button","dojo/_base/Deferred"

], function(
	declare, WidgetBase, on,lang,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox,
	Grid,domConstr,WorkspaceManager,Memory,
	Uploader, BorderContainer,domAttr,
	Button,Deferred
){


	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		workspace: "",
		selection: "",
		value: "",
		path: "",
		disabled: false,
		required: false,
		promptMessage:"",
		missingMessage: "A valid workspace item is required.",
		promptMessage: "Please choose or upload a workspace item",
		reset: function(){
			this.searchBox.set('value','');
		},
		_setDisabledAttr: function(val){
			this.disabled=val;
			if (val) {
				domClass.add(this.domNode,"disabled");
			}else{
				domClass.remove(this.domNode,"disabled");
			}

			if (this.searchBox){
				this.searchBox.set("disabled",val);
			}
		},
		_setRequiredAttr: function(val){
			this.required=val;
			if (this.searchBox){
				this.searchBox.set("required",val);
			}
		},
	
		_setPathAttr: function(val){
			console.log("_setPathAttr: ", val);
			this.path=val;
			if (this.grid) {
				console.log("set Grid Path: ", val);
				this.grid.set('path', val);
			}
			if (this.uploader){
				this.uploader.set('path', val);
			}
		},		
		_setTypeAttr: function(type){
			if (!(type instanceof Array)){
				type = [type];
			}
			this.type = type;
		},
		_setValueAttr: function(value,refresh){
			this.value = value;
			if (this._started) {
				if (refresh) {
					this.refreshWorkspaceItems()
				}else{
					this.searchBox.set('value', value);
				}
			}
		},

		_getValueAttr: function(value){
			return this.searchBox.get('value', value);
		},

		_setSelectionAttr: function(val){
			this.selection=val;
			console.log("this.selection: ", this.selection);
			if (!val) {
				this.selValNode.innerHTML="None.";
				this.okButton.set('disabled', true);
			}else{
				this.selValNode.innerHTML=val.name;
				this.okButton.set('disabled', false);
			}
		},

		postMixinProperties: function(){
			if (!this.value && this.workspace){
				this.value=this.workspace;
			}
			this.inherited(arguments);
		},

		createSelectedPane: function(){
			var wrap= domConstr.create("div",{});
			var sel = domConstr.create("span", {innerHTML: "Selection: ", style:"text-align: right"},wrap);
			this.selValNode = domConstr.create('span', {innerHTML: "None."},sel);
//			domConstr.place(this.selValNode, sel, "last");
			var buttonContainer = domConstr.create("div", {
				style: {"font-size":".85em",display: "inline-block","float":"right","text-align":"right"}, 
				innerHTML: '<i rel="createFolder" class="fa icon-folder-plus fa-2x" style="vertical-align: bottom;" ></i>&nbsp;<i rel="upload" class="fa fa-upload fa-2x" style="vertical-align: bottom"></i>'
			},wrap);
			
			return wrap;	
		},

		openChooser: function(){
			if (this.disabled) { return; }
			if (!this.dialog){
				this.dialog = new Dialog({title:"Choose or Upload a Workspace Object",draggable:true});
				var frontBC = new BorderContainer({style: {width: "500px", height: "400px"}});	
				var backBC= new BorderContainer({style: {width: "500px", height: "400px","margin":"0",padding:"0px"}});	
				domConstr.place(frontBC.domNode, this.dialog.containerNode,"first");

				var selectionPane = new ContentPane({region:"top", content: this.createSelectedPane(), style: "border:0px;"});
				var buttonsPane= new ContentPane({region:"bottom", style: "text-align: right;border:0px;"});
				var cancelButton = new Button({label: "Cancel"});
				cancelButton.on('click', function(){
					_self.dialog.hide();
				});
				var okButton= this.okButton = new Button({label: "OK"});

				okButton.on("click", function(evt){
					if (_self.selection){
						_self.set("value", _self.selection.id);
					}
					_self.dialog.hide();
				});
				domConstr.place(okButton.domNode, buttonsPane.containerNode,"first");
				domConstr.place(cancelButton.domNode, buttonsPane.containerNode,"first");
				
				on(selectionPane.domNode, "i:click", function(evt){
					console.log("Click: ", evt);
					var rel = domAttr.get(evt.target,"rel");	
					switch(rel){
						case "upload":
							_self.dialog.flip();
							break;
						case "createFolder":
							console.log("Create Folder", _self.grid.row(0));
							var element=_self.grid.row(0).element;
							console.log("element: ", element);
							_self.grid.addNewFolder({id:"untitled"});
					
							break;
					}
				});
				var _self=this;
				var grid = this.grid = new Grid({region: "center",path: this.path, selectionMode:"single",deselectOnRefresh:true, types: this.type?(["folder"].concat(this.type)):false});
				_self.grid.on("dgrid-datachange", function(evt){
					var name = evt.value;
					if (!name) { return; }
					Deferred.when(WorkspaceManager.createFolder(_self.path + "/" + name),function(){
						_self.grid.refreshWorkspace();
						_self.refreshWorkspaceItems();
					});
				});
				grid.allowSelect = function(row){
					if (row.data.type && (_self.type.indexOf(row.data.type)>=0)){
						return true;	
					}
					return false;
				}

				grid.on("ItemDblClick", function(evt){
					if (evt.item && evt.item.type=="folder" || evt.item.type=="parentfolder"){		
						_self.set('path', evt.item_path);
					}else{
						if (_self.selection) {
							_self.set('value', _self.selection.id);
							_self.dialog.hide()
						}
					}
					console.log("ItemDblClick for chooser: ", evt);
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

				frontBC.addChild(selectionPane);	
				frontBC.addChild(grid);	
				frontBC.addChild(buttonsPane);	
				frontBC.startup();
				var backhead= new ContentPane({region:"top", content: '<span rel="flip" class="fa fa-1.5x fa-reply">&nbsp;Return</span>' });
				on(backhead.domNode, "span:click", function(evt){
                                        console.log("Click: ", evt);
                                        var rel = domAttr.get(evt.target,"rel");
                                        switch(rel){
                                                case "flip":
                                                        _self.dialog.flip();
                                                        break;
                                        }
                                });	
				var uploader = this.uploader =  new Uploader({path:_self.path,region: "center", multiple:false, types: this.type, pathLabel: "Upload file to: ", buttonLabel: "Choose File"});

				on(uploader.domNode,"dialogAction", function(evt){
					console.log("Uploader Dialog Action: ",evt);
					if (evt.files && evt.files[0] && evt.action=="close") {
						var file = evt.files[0];
						_self.set("selection",file);
						_self.set('value',file.id,true);	
						_self.dialog.hide();
					}else{
						_self.dialog.flip()		
					}
				});
				backBC.addChild(backhead);
				backBC.addChild(uploader);
				uploader.startup();
				domConstr.place(backBC.domNode, this.dialog.backPane, "first");
				var _self=this;

			}
			this.dialog.flip("front");
			this.dialog.show();
		},

		refreshWorkspaceItems: function(){
			WorkspaceManager.getObjectsByType(this.type).then(lang.hitch(this,function(items){
				console.log("Ws Objects: ", items);
				var store= new Memory({data: items});
				console.log('store: ', store);
				console.log("SearchBox: ", this.searchBox, "THIS: ", this);
				this.searchBox.set("store",store);
				if (this.value) {	
					this.searchBox.set('value', this.value);
				}	
			}));
		},
		onSearchChange: function(value){
			this.set("value", value);	
		},
		startup: function(){
			if (this._started){return;}
			console.log("call getObjectsByType(); ", this.type);
			this.inherited(arguments);	
			var _self=this;
			if (!this.path) {
				Deferred.when(WorkspaceManager.get("currentPath"), function(path){
					console.log("CURRENT PATH: ", path);
					_self.set('path', path);
					_self.refreshWorkspaceItems();
				});
			}else{
				this.refreshWorkspaceItems();
			}
			this.searchBox.set('disabled', this.disabled);
			this.searchBox.set('required', this.required);
		}
	});
});
