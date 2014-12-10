require({cache:{
'url:p3/widget/templates/Uploader.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div style='width:400px'>\n\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"type\" data-dojo-attach-point=\"uploadType\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t<option value=\"auto\">Auto Detect</option>\n\t\t\t<option value=\"fasta\">FASTA</option>\t\t\t\n\t\t</select>\n\t\t<input type=\"file\" data-dojo-attach-point=\"fileInput\" multiple=\"true\" data-dojo-attach-event=\"onchange:onFileSelectionChange\" />\t\n\t</div>\n\t\t<div class=\"workingMessage\" style=\"width:400px;\" data-dojo-attach-point=\"workingMessage\">\n\t\t</div>\n\n\t\t<div class=\"errorMessage\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Creating Folder:</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Folder</div>\n\t\t</div>\t\n</form>\n\n"}});
define("p3/widget/Uploader", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Uploader.html","dijit/form/Form","dojo/_base/Deferred",
	"dijit/ProgressBar","dojo/dom-construct"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,Deferred,
	ProgressBar,domConstruct
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "CreateWorkspace",
		templateString: Template,
		path: "",
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
			var xhr = new XMLHttpRequest();
			var reader = new FileReader();
			this._uploading.push(file)
			var _self=this;

			return Deferred.when(window.App.api.workspace("Workspace.create_upload_node",[{objects:[[uploadDirectory,file.name,"Unspecified"]]}]), function(getUrlRes){
				domClass.add(_self.domNode,"Working");

				console.log("getUrlRes",getUrlRes);
				var uploadUrl = getUrlRes[0][0];
				if (!_self.uploadTable){
					var table = domConstruct.create("table",{style: {width: "100%"}}, _self.workingMessage);
					_self.uploadTable = domConstruct.create('tbody',{}, table)
				}

				var row = domConstruct.create("tr",{},_self.uploadTable);
				var nameNode = domConstruct.create("td",{innerHTML: file.name},row);
				var pnode = domConstruct.create("td",{style: {width: "80%"}},row);

				var progressBar = new ProgressBar({style: "100%"});
				progressBar.placeAt(pnode);
				progressBar.startup();
				console.log("progressBar", progressBar, ProgressBar)

				xhr.upload.addEventListener("progress", function(e){
					if (e.lengthComputable) {
						var percentage = Math.round((e.loaded*100)/e.total);
						progressBar.set("value",percentage);
					}
				})

				xhr.upload.addEventListener("load", function(e){
					progressBar.set("value", 100);
					console.log("File Upload Complete");
				})

				xhr.open("POST",uploadUrl);
				xhr.setRequestHeader("Authorization", window.App.authorizationToken)
				reader.onload = function(evt){
					xhr.send(evt.target.result);
				}

				reader.readAsBinaryString(file);
			});

		},
		onFileSelectionChange: function(evt){
			console.log("onFileSelectionChange",evt, this.fileInput);
			Object.keys(this.fileInput.files).forEach(function(key){
				var f = this.fileInput.files[key];
				if (f.name){
					this.uploadFile(f,"/reviewer/test8/");
					console.log("File: ",f);
				}
			},this)
		},

		onSubmit: function(evt){
			var _self = this;
			if (this.validate()){
				var values = this.getValues();
				console.log("Submission Values", values);
				domClass.add(this.domNode,"Working");
			}else{
				console.log("Form is incomplete");
			}

			evt.preventDefault();
			evt.stopPropagation();
		},

		onCancel: function(evt){
			console.log("Cancel/Close Dialog", evt)
			on.emit(this.domNode, "dialogAction", {action:"close",bubbles:true});
		}
	});
});
