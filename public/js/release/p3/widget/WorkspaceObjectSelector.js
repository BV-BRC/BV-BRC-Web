require({cache:{
'url:p3/widget/templates/WorkspaceObjectSelector.html':"<div style=\"padding:0px;\">\n\t<input type=\"hidden\"/>\n\t<input type=\"text\" data-dojo-attach-point=\"searchBox\" data-dojo-type=\"dijit/form/FilteringSelect\" data-dojo-attach-event=\"onChange:onSearchChange\" data-dojo-props=\"searchAttr: 'name'\"  value=\"${value}\" style=\"width:85%\"/>&nbsp;<i data-dojo-attach-event=\"click:openChooser\" class=\"fa fa-folder-open fa-1x\" />\n</div>\n"}});
define("p3/widget/WorkspaceObjectSelector", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/_base/lang",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/WorkspaceObjectSelector.html",
	"dijit/Dialog","dijit/_HasDropDown","dijit/layout/ContentPane","dijit/form/TextBox",
	"./WorkspaceExplorerView","dojo/dom-construct","../WorkspaceManager","dojo/store/Memory"

], function(
	declare, WidgetBase, on,lang,
	domClass,Templated,WidgetsInTemplate,
	Template,Dialog,HasDropDown,ContentPane,TextBox,
	Grid,domConstr,WorkspaceManager,Memory
){


	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "WorkspaceObjectSelector",
		"disabled":false,
		templateString: Template,
		workspace: "",
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
		postMixinProperties: function(){
			if (!this.value && this.workspace){
				this.value=this.workspace;
			}
			this.inherited(arguments);
		},
		openChooser: function(){
			if (!this.dialog){
				this.dialog = new Dialog({title:"Workspace Explorer"});
				var gnode = domConstr.create("div", {style: {width: "500px",height:"400px"}},this.dialog.containerNode,"last");
				var grid = new Grid({style:"width:300px;height:400px;"},gnode);
				
				var _self=this;
				/*
				on(this.dialog.domNode, "click", function(evt){
					console.log(evt);
					domClass.toggle(_self.dialog.domNode,"flipped");
				});*/
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
