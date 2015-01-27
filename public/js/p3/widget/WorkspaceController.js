define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/topic","dojo/_base/lang",
	"dojo/dom-construct"
], function(
	declare, WidgetBase, on,
	domClass,Topic,lang,
	domConstr
){
	return declare([WidgetBase], {
		"baseClass": "WorkspaceController",
		"disabled":false,
		postCreate: function(){
			this.inherited(arguments);
			this.domNode.innerHTML="&nbsp;";
		},
		startup: function(){
			Topic.subscribe("/upload", lang.hitch(this,"onUploadMessage"))
			this._uploadButtons={}
		},

		onUploadMessage: function(msg){
			console.log("WorkspaceController: ", this);
			if (msg && msg.type == "UploadStart"){
				var b = domConstr.create("div",{innerHTML: msg.filename, "class":"UploadingButton"}, this.domNode);		
				this._uploadButtons[msg.filename]=b;
				return;
			}


			if (msg && msg.type == "UploadProgress"){
				if (this._uploadButtons[msg.filename]){
					this._uploadButtons[msg.filename].innerHTML= msg.filename + "&nbsp;( " + msg.progress + "% )";
				}
				return;
			}

			if (msg && msg.type == "UploadComplete"){
				if (this._uploadButtons[msg.filename]){
					domClass.add(this._uploadButtons[msg.filename],"UploadComplete");
					this._uploadButtons[msg.filename].innerHTML= msg.filename 
//					setTimeout(function(){
//						domConstr.destroy(this._uploadButtons[msg.filename]);
//						delete this._uploadButtons[msg.filename];
//					},30000);
				}
				return;
			}
	
		}
	});
});
