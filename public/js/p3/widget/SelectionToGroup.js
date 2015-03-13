define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/SelectionToGroup.html","dojo/_base/lang","../WorkspaceManager"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,lang,WorkspaceManager
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		"baseClass": "Panel",
		"disabled":false,
		templateString: Template,
		selection: null,
		path:null,
		type: "genome_group",
		_setTypeAttr: function(t){
			this.type=t;
			if (this.workspaceObjectSelector) {
				this.workspaceObjectSelector.set("type", [t]);
			}
		},

		_setPathAttr: function(path){
			this.path = path;
			if (this.groupNameBox) {
				this.groupNameBox.set('path', this.path);
			}

			if (this.workspaceObjectSelector){
				this.workspaceObjectSelector.set("path", this.path);
			}
		},
		onChangeTarget: function(target){
			console.log("onChangeTarget ");
			var targetType = this.targetType.get('value');
			var val;
			console.log("Target Type: ", targetType);	
			if (targetType=="existing"){
				domClass.remove(this.workspaceObjectSelector.domNode, "dijitHidden");
				domClass.add(this.groupNameBox.domNode, "dijitHidden");
				val =this.workspaceObjectSelector.get('value');
					
			}else{
				domClass.add(this.workspaceObjectSelector.domNode, "dijitHidden");
				domClass.remove(this.groupNameBox.domNode, "dijitHidden");
				
				val = this.groupNameBox.isValid()?this.groupNameBox.get('value'):false;
			}	
			console.log("Target Val: ", val);
			this.value = val;
			if (val) {
				this.copyButton.set('disabled', false);
			}else{
				this.copyButton.set('disabled', true);
			}
		},
		startup: function(){
			var _self=this;
			if (this._started) { return; }
			var currentIcon;
			this.watch("selection", lang.hitch(this,function(prop,oldVal,item){
				console.log("set selection(): ", arguments);
			}))
//			if (!this.path) {
				this.set("path", WorkspaceManager.getDefaultFolder(this.type));
//			}
			this.inherited(arguments);
			this.groupNameBox.set('path', this.path);
			this.workspaceObjectSelector.set('path', this.path);
			this.workspaceObjectSelector.set('type', [this.type]);
		},

		onCancel: function(evt){
                        console.log("Cancel/Close Dialog", evt)
                        on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
                },
		onCopy: function(evt){
			console.log("Copy Selection: ", this.selection, " to ", this.value); 	
		}


	});
});
