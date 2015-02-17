define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/_base/lang",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"./FlippableDialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox",
	"./WorkspaceExplorerView","dojo/dom-construct","../WorkspaceManager","dojo/store/Memory",
	"./Uploader", "dijit/layout/BorderContainer","dojo/dom-class","dojo/dom-attr",
	"dijit/form/Button"

], function(
	declare, WidgetBase, on,lang,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox,
	Grid,domConstr,WorkspaceManager,Memory,
	Uploader, BorderContainer,domClass,domAttr,
	Button
){


	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		workspace: "",
		selection: "",
		value: "",
		path: "/",
		_setPathAttr: function(val){
			this.path=val;
			if (this.grid) {
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
			var sel = domConstr.create("span", {innerHTML: "Selection: "},wrap);
			this.selValNode = domConstr.create('span', {innerHTML: "None."},sel);
//			domConstr.place(this.selValNode, sel, "last");
			var buttonContainer = domConstr.create("span", {
				style: {"float":"right"}, 
				innerHTML: '<i rel="upload" class="fa fa-2x fa-upload" />'
			},wrap);
			
			return wrap;	
		},

		openChooser: function(){
			if (!this.dialog){
				this.dialog = new Dialog({title:"Choose or Upload a Workspace Object",draggable:true});
				var frontBC = new BorderContainer({style: {width: "500px", height: "400px"}});	
				var backBC= new BorderContainer({style: {width: "500px", height: "400px","margin":"0",padding:"0px"}});	
				domConstr.place(frontBC.domNode, this.dialog.containerNode,"first");

				var selectionPane = new ContentPane({region:"top", content: this.createSelectedPane()});
				var buttonsPane= new ContentPane({region:"bottom", style: "text-align: right;"});
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
					}
				});
				var _self=this;
				var grid = this.grid = new Grid({region: "center",selectionMode:"single",deselectOnRefresh:true, types: this.type?(["folder"].concat(this.type)):false});

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
						_self.set("selection", evt.item);
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
				var uploader = this.uploader =  new Uploader({path:_self.path,region: "center", multiple:false, types: this.type, pathLabel: "Upload file to: ", buttonLabel: "UPLOAD"});

				on(uploader.domNode,"dialogAction", function(evt){
					console.log("Uploader Dialog Action: ",evt);
					var file = evt.files[0]
					if (file && evt.action=="close") {
						_self.set("selection",file);
						_self.set('value',file.id,true);	
						_self.dialog.hide();
					}else{
						_self.dialog.hide()		
					}
				});
				backBC.addChild(backhead);
				backBC.addChild(uploader);
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
		onSearchChange: function(){},
		startup: function(){
			if (this._started){return;}
			console.log("call getObjectsByType(); ", this.type);
			this.inherited(arguments);	
			this.refreshWorkspaceItems();
			/*
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
			*/
		}
	});
});
