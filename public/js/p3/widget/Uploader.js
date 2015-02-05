define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Uploader.html","dijit/form/Form","dojo/_base/Deferred",
	"dijit/ProgressBar","dojo/dom-construct","p3/UploadManager"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,Deferred,
	ProgressBar,domConstruct,UploadManager
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
		overwrite: false,
		validate: function(){
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
		},

		uploadFile: function(file, uploadDirectory){
			if (!this._uploading){ this._uploading=[]}

			var _self=this;

			return Deferred.when(window.App.api.workspace("Workspace.create",[{objects:[[uploadDirectory+file.name,"unspecified",{},""]],createUploadNodes:true}]), function(getUrlRes){
				domClass.add(_self.domNode,"Working");

				console.log("getUrlRes",getUrlRes, getUrlRes[0]);
				var uploadUrl = getUrlRes[0][0][11];
				console.log("uploadUrl: ", uploadUrl);
				if (!_self.uploadTable){
					var table = domConstruct.create("table",{style: {width: "100%"}}, _self.fileTableContainer);
					_self.uploadTable = domConstruct.create('tbody',{}, table)
				}

				var row = domConstruct.create("tr",{},_self.uploadTable);
				var nameNode = domConstruct.create("td",{innerHTML: file.name},row);

//					window._uploader.postMessage({file: file, uploadDirectory: uploadDirectory, url: uploadUrl});
					UploadManager.upload({file: file, uploadDirectory:uploadDirectory, url: uploadUrl}, window.App.authorizationToken);
				

			});

		},
		onFileSelectionChange: function(evt){
			console.log("onFileSelectionChange",evt, this.fileInput);
		
			if (!this.uploadTable){
				var table = domConstruct.create("table",{style: {width: "100%"}}, this.fileTableContainer);
				this.uploadTable = domConstruct.create('tbody',{}, table)
				var htr = domConstruct.create("tr", {}, this.uploadTable);
				domConstruct.create("th",{innerHTML: "File"}, htr);
				domConstruct.create("th",{innerHTML:"Type"},htr);
				domConstruct.create("th",{innerHTML:"Size"},htr);
				domConstruct.create("th",{},htr);
			}

			var files = evt.target.files;
			console.log("files: ", files);
			var _self=this;
			
			Object.keys(files).forEach(function(idx) {
				var file = files[idx];
				if (file && file.name && file.size) {
					console.log("file: ", file);
					var row = domConstruct.create("tr",{},_self.uploadTable);
					var nameNode = domConstruct.create("td",{innerHTML: file.name},row);
					var typeNode = domConstruct.create("td",{innerHTML: _self.uploadType.get("value")},row);
					var sizeNode = domConstruct.create("td",{innerHTML: file.size},row);
					var delNode = domConstruct.create("td", {innerHTML: '<i class="fa fa-times fa-1x" />'},row);
					var handle=on(delNode,"click", function(evt){
						handle.remove();	
						domConstruct.destroy(row);
					});
				}
			});
		},

		onSubmit: function(evt){
			var _self =this;
			evt.preventDefault();
			evt.stopPropagation();

			if (!_self.path) {
				console.error("Missing Path for Upload: ", _self.path);
				return;
			}
	
			Object.keys(this.fileInput.files).forEach(function(key){
				var f = _self.fileInput.files[key];
				if (f.name){
					this.uploadFile(f,_self.path);
					console.log("File: ",f);

				}
			},this)

			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});
