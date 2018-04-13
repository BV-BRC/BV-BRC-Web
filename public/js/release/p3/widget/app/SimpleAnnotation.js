require({cache:{
'url:p3/widget/app/templates/SimpleAnnotation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div style=\"width: 340px;margin:auto;\">\n    <div class=\"apptitle\" id=\"apptitle\">\n      <h3>Genome Annotation</h3>\n      <p>Annotates genomes using RASTtk.</p>\n    </div>\n    <div style=\"width:340px; margin:auto\" class=\"formFieldsContainer\">\n      <div id=\"annotationBox\" style=\"width:340px;\" class=\"appBox appshadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Contigs</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['contigs'],multi:false,promptMessage:'Select or Upload Contigs to your workspace for Annotation',missingMessage:'Contigs must be provided.'\"></div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n            <div data-dojo-attach-event=\"onChange:checkOutputName\" data-dojo-attach-point=\"output_file\" data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,promptMessage:'The output name for your Annotation Results',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Output Name'\"></div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Domain</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" name=\"domain\" data-dojo-attach-point=\"workspaceName\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t\t<option value=\"Bacteria\">Bacteria</option>\n\t\t\t\t\t\t<option value=\"Archaea\">Archaea</option>\n\t\t\t\t\t</select>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Taxonomy ID / Name / Rank</label><br>\n            <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/TaxonInfoSelector\" name=\"scientific_name\" maxHeight=\"200\" style=\"width:100%\" required=\"true\" data-dojo-attach-point=\"scientific_nameWidget\"></div>\n          </div>\n        </div>\n        <div style=\"display:none\" class=\"appRow\">\n          <div class=\"appField\">\n            <label>Taxonomy ID</label><br>\n            <div data-dojo-attach-event=\"onChange:onTaxIDChange\" data-dojo-type=\"p3/widget/TaxIDSelector\" value=\"\" name=\"tax_id\" maxHeight=\"200\" style=\"width:100%\" required=\"true\" data-dojo-attach-point=\"tax_idWidget\"></div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Genetic Code</label><br>\n            <select data-dojo-attach-point=\"genetic_code\" data-dojo-type=\"dijit/form/Select\" name=\"code\" style=\"width:100%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t\t<option value=\"11\">11 (Archaea & most Bacteria)</option>\n\t\t\t\t\t\t<option value=\"4\">4 (Mycoplasma, Spiroplasma, & Ureaplasma )</option>\n\t\t\t\t\t</select>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <div class=\"appField\">\n            <label>Output Folder</label><br>\n            <div data-dojo-attach-point=\"output_pathWidget\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your Annotation Results',missingMessage:'Output Folder must be selected.'\"\n              data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n        Submitting Annotation Job\n      </div>\n      <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n        Error Submitting Job\n      </div>\n      <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n        Annotation Job has been queued.\n      </div>\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Annotate</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/SimpleAnnotation", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/SimpleAnnotation.html", "./AppBase",
	"dojo/_base/lang", "../../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase,
			lang, WorkspaceManager){
	return declare([AppBase], {
		"baseClass": "Annotation",
		templateString: Template,
		applicationName: "GenomeAnnotation",
		required: true,
		genera_four: ["Acholeplasma", "Entomoplasma", "Hepatoplasma", "Hodgkinia", "Mesoplasma", "Mycoplasma", "Spiroplasma", "Ureaplasma"],
		code_four: false,
		defaultPath: "",

		constructor: function(){
			this._autoTaxSet = false;
			this._autoNameSet = false;
		},
		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_pathWidget.set('value', _self.defaultPath);
		},
		changeCode: function(item){
			this.code_four = false;
			item.lineage_names.forEach(lang.hitch(this, function(lname){
				if(dojo.indexOf(this.genera_four, lname) >= 0){
					this.code_four = true;
				}
			}));
			this.code_four ? this.genetic_code.set("value", "4") : this.genetic_code.set("value", "11");
		},

		onTaxIDChange: function(val){
			if(val && !this.scientific_nameWidget.get('displayedValue') && !this._autoTaxSet){
				this._autoNameSet = true;
				var tax_id = this.tax_idWidget.get("item").taxon_id;
				//var sci_name=this.tax_idWidget.get("item").taxon_name;
				if(tax_id){
					var name_promise = this.scientific_nameWidget.store.get("?taxon_id=" + tax_id);
					name_promise.then(lang.hitch(this, function(tax_obj){
						if(tax_obj && tax_obj.length){
							this.scientific_nameWidget.set('item', tax_obj[0]);
						}
					}));
					//this.scientific_nameWidget.set('displayedValue',sci_name);
					//this.scientific_nameWidget.set('value',sci_name);
				}
			}
			this.changeCode(this.tax_idWidget.get("item"));
			this._autoTaxSet = false;
		},
		onSuggestNameChange: function(val){
			if(val && !this.tax_idWidget.get("displayedValue") && !this._autoNameSet){
				this._autoTaxSet = true;
				var tax_id = this.scientific_nameWidget.get("value");
				if(tax_id){
					var tax_promise = this.tax_idWidget.store.get("?taxon_id=" + tax_id);
					tax_promise.then(lang.hitch(this, function(tax_obj){
						if(tax_obj && tax_obj.length){
							this.tax_idWidget.set('item', tax_obj[0]);
						}
					}));
					//this.tax_idWidget.set('displayedValue',tax_id);
					//this.tax_idWidget.set('value',tax_id);
				}
			}
			this.changeCode(this.scientific_nameWidget.get("item"));
			this._autoNameSet = false;
			/*if (val && !this.output_nameWidget.get('value') || (this.output_nameWidget.get('value')&&this._selfSet)  ){
				var abbrv=this.scientific_nameWidget.get('displayedValue');
				abbrv=abbrv.match(/[^\s]+$/);
				this.output_nameWidget.set('value',abbrv);
			}*/
		},
		getValues: function(){
			var values = this.inherited(arguments);
			values["scientific_name"] = this.scientific_nameWidget.get('displayedValue');
			values["taxonomy_id"] = this.tax_idWidget.get('displayedValue');
			return values;
		}

	});
});

