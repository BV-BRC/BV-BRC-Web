require({cache:{
'url:p3/widget/templates/Uploader.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\t<div style='width:400px'>\n\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"type\" data-dojo-attach-point=\"uploadType\" style=\"width:300px\" required=\"true\" data-dojo-props=\"\">\n\t\t\t<option value=\"auto\">Unspecified</option>\n\t\t\t<option value=\"contigs\">Contigs (.fa) </option>\n\t\t\t<option value=\"fasta\">fasta (.fa,.fasta) </option>\n\t\t\t<option value=\"fastq\">fastq (.fq, .fastq) </option>\t\t\n\t\t\t<option value=\"phenomics_gene_list\">Phenomics Gene List (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"phenomics_gene_matrix\">Phenomics Gene Matrix (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"phenomics_experiment_metadata\">Phenomics Experiment Comparison Metadata (.csv,.txt,.xsl,.xlsx)</option>\n\t\t\t<option value=\"proteomics_gene_list\">Proteomics Gene List (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"proteomics_gene_matrix\">Proteomics Gene Matrix (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"proteomics_experiment_metadata\">Proteomics Experiment Comparison Metadata (.csv,.txt,.xsl,.xlsx)</option>\t\n\t\t\t<option value=\"transcriptomics_gene_list\">Transcriptomics Gene List (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"transcriptomics_gene_matrix\">Transcriptomics Gene Matrix (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t\t<option value=\"transcriptomics_experiment_metadata\">Transcriptomics Experiment Comparison Metadata (.csv,.txt,.xsl,.xlsx)</option>\t\t\t\n\t\t</select>\n\t\t<input type=\"file\" data-dojo-attach-point=\"fileInput\" multiple=\"true\" data-dojo-attach-event=\"onchange:onFileSelectionChange\" />\t\n\t</div>\n\t\t<div class=\"workingMessage\" style=\"width:400px;\" data-dojo-attach-point=\"workingMessage\">\n\t\t</div>\n\n\t\t<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Upload Files</div>\n\t\t</div>\t\n</form>\n\n \t"}});
define("p3/widget/Uploader", [
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
					var table = domConstruct.create("table",{style: {width: "100%"}}, _self.workingMessage);
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
		},

		onSubmit: function(evt){
			var _self = this;
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
