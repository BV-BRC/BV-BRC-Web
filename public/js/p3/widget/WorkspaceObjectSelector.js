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
		_setTypeAttr: function(type){
			if (!(type instanceof Array)){
				type = [type];
			}
			this.type = type;
		},
		_setValueAttr: function(value){
			this.value = value;
			if (this._started) {
				this.searchBox.set('value', value);
			}
		},

		_getValueAttr: function(value){
			return this.searchBox.get('value', value);
		},

		_setSelectionAttr: function(val){
			this.selection=val;
			console.log("this.selection: ", this.selection);
		},

		postMixinProperties: function(){
			if (!this.value && this.workspace){
				this.value=this.workspace;
			}
			this.inherited(arguments);
		},

		createSelectedPane: function(){
			var wrap= domConstr.create("div",{});
			var sel = domConstr.create("span", {innerHTML: "Selection: None."},wrap);
			var buttonContainer = domConstr.create("span", {style: {float:"right"}, innerHTML: '<i rel="upload" class="fa fa-2x fa-upload" />'},wrap);
			
			return wrap;	
		},

		openChooser: function(){
			if (!this.dialog){
				this.dialog = new Dialog({title:"Workspace Explorer",draggable:true});
				var frontBC = new BorderContainer({style: {width: "500px", height: "400px"}});	
				var backBC= new BorderContainer({style: {width: "500px", height: "400px","margin":"0",padding:"0px"}});	
				domConstr.place(frontBC.domNode, this.dialog.containerNode,"first");

				var selectionPane = new ContentPane({region:"top", content: this.createSelectedPane()});
				var buttonsPane= new ContentPane({region:"bottom"});
				var cancelButton = new Button({label: "Cancel"});
				cancelButton.on('click', function(){
					_self.dialog.hide();
				});
				var okButton= new Button({label: "OK"});

				okButton.on("click", function(evt){
					if (_self.selection){
						_self.set("value", _self.selection);
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
				var grid = this.grid = new Grid({region: "center",selectionMode:"single"});
				grid.on("ItemDblClick", function(evt){
					if (evt.item && evt.item.type=="folder" || evt.item.type=="parentfolder"){		
						grid.set('path', evt.item_path);
					}else{
						_self.set("selection", evt.item.id);
					}
					console.log("ItemDblClick for chooser: ", evt);
				//	var row = evt.rows[0];
				//	var data = row.data;
				//	console.log("selected: ", data);
				});

				frontBC.addChild(selectionPane);	
				frontBC.addChild(grid);	
				frontBC.addChild(buttonsPane);	
				frontBC.startup();
				var crap = new ContentPane({region:"top", content: "Some top content"});
				var uploader = new Uploader({region: "center"});
				backBC.addChild(crap);
				backBC.addChild(uploader);
				domConstr.place(backBC.domNode, this.dialog.backPane, "first");
				var _self=this;

/*
				on(this.dialog.domNode, "click", function(evt){
					console.log(evt);
					domClass.toggle(_self.dialog.domNode,"flipped");
					if (backBC && !backBC._started){
						backBC.startup();
						backBC.resize();
					}
				});
*/
			}
			this.dialog.show();
		},
		onSearchChange: function(val){
//			dropDown.set("content","Searching for '"+val+"' in '" + this.workspace + "'")
			console.log(arguments)			
		},

		startup: function(){
			if (this._started){return;}
			console.log("call getObjectsByType(); ", this.type);
			this.inherited(arguments);	
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
		}
	});
});
