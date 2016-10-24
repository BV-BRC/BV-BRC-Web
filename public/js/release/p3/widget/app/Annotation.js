require({cache:{
'url:p3/widget/app/templates/Annotation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"appTemplate\" style=\"width: 450px\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Genome Annotation</h3>\n            <p>Annotates genomes using RASTtk.</p>\n        </div>\n        <div style=\"width:450px; margin:auto\" class=\"formFieldsContainer\">\n            <div id=\"annotationBox\" style=\"width:400px;\" class=\"appBox appShadow\">\n                <div class=\"headerrow\">\n                    <div style=\"width:85%;display:inline-block;\">\n                        <label class=\"appBoxLabel\">Parameters</label>\n                        <div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                            <i class=\"fa icon-info-circle fa\"></i>\n                        </div>\n                    </div>\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\">\n                        <label>Contigs</label><br>\n                        <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" style=\"width:100%\"\n                             required=\"true\"\n                             data-dojo-props=\"type:['contigs'],multi:false,promptMessage:'Select or Upload Contigs to your workspace for Annotation',missingMessage:'Contigs must be provided.'\"></div>\n                    </div>\n                </div>\n\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\">\n                        <label>Domain</label><br>\n                        <select data-dojo-type=\"dijit/form/Select\" name=\"domain\" data-dojo-attach-point=\"workspaceName\"\n                                style=\"width:300px\" required=\"true\"\n                                data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                            <option value=\"Bacteria\">Bacteria</option>\n                            <option value=\"Archaea\">Archaea</option>\n                        </select>\n                    </div>\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appRowSegment\" style=\"margin-left: 0px; text-align:left; width:70%\">\n                        <label class=\"paramlabel\">Taxonomy Name</label>\n                        <div name=\"taxoninfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                            <i class=\"fa icon-info-circle fa\"></i>\n                        </div>\n                        <br>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                             data-dojo-type=\"p3/widget/TaxonNameSelector\" name=\"scientific_name\" maxHeight=200\n                             style=\"width:100%\" required=\"true\" data-dojo-attach-point=\"scientific_nameWidget\"></div>\n                    </div>\n                    <div class=\"appRowSegment\" style=\"text-align:left; width:20%\">\n                        <label>Taxonomy ID</label><br>\n                        <div data-dojo-attach-event=\"onChange:onTaxIDChange\" data-dojo-type=\"p3/widget/TaxIDSelector\"\n                             value=\"\" name=\"tax_id\" maxHeight=200 style=\"width:100%\" required=\"true\"\n                             data-dojo-attach-point=\"tax_idWidget\"></div>\n                    </div>\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\">\n                        <label>My Label</label><br>\n                        <div data-dojo-type=\"dijit/form/ValidationTextBox\"\n                             data-dojo-attach-event=\"onChange:updateOutputName\" name=\"my_label\"\n                             data-dojo-attach-point=\"myLabelWidget\" style=\"width: 300px\" required=\"true\"\n                             data-dojo-props=\"intermediateChanges:true, missingMessage:'You must provide a label',trim:true,intermediateChanges:true,placeHolder:'My identifier123'\"></div>\n                    </div>\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\" style=\"width:380px\">\n                        <label>Output Name</label><br>\n                        <div data-dojo-attach-point=\"output_nameWidget\" style=\"width:380px; background-color:#F0F1F3\"\n                             data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\"\n                             style=\"width:100%\" required=\"true\"\n                             data-dojo-props=\"readOnly: true, promptMessage:'The output name for your Annotation Results',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Taxonomy + My Label'\"></div>\n                    </div>\n                </div>\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\">\n                        <label>Genetic Code</label><br>\n                        <select data-dojo-attach-point=\"genetic_code\" data-dojo-type=\"dijit/form/Select\" name=\"code\"\n                                style=\"width:300px\" required=\"true\"\n                                data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                            <option value=\"11\">11 (Archaea & most Bacteria)</option>\n                            <option value=\"4\">4 (Mycoplasma, Spiroplasma, & Ureaplasma )</option>\n                        </select>\n                    </div>\n                </div>\n                <div class=\"appRow\" style=\"display:none\">\n                    <div class=\"appFieldLong\">\n                        <label>Optional Annotation Source</label><br>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                             data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"reference_genome_id\" maxHeight=200\n                             style=\"width:100%\" required=\"false\" data-dojo-attach-point=\"ref_genome_id\"></div>\n                    </div>\n                </div>\n\n\n                <div class=\"appRow\">\n                    <div class=\"appFieldLong\">\n                        <label>Output Folder</label><br>\n                        <div data-dojo-attach-point=\"output_pathWidget\"\n                             data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" style=\"width:100%\"\n                             required=\"true\"\n                             data-dojo-props=\"type:['folder'],multi:false,value:'${activeWorkspacePath}',workspace:'${activeWorkspace}',promptMessage:'The output folder for your Annotation Results',missingMessage:'Output Folder must be selected.'\"\n                             data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                    </div>\n                </div>\n\n            </div>\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Submitting Annotation Job\n            </div>\n\n            <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Error Submitting Job\n            </div>\n            <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\"\n                 style=\"margin-top:10px; text-align:center;\">\n                Annotation Job has been queued.\n            </div>\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\"\n                     data-dojo-type=\"dijit/form/Button\">Cancel\n                </div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Annotate</div>\n            </div>\n        </div>\n    </div>\n</form>\n\n"}});
define("p3/widget/app/Annotation", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Annotation.html","./AppBase",
	"dojo/_base/lang","../../WorkspaceManager"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,AppBase,lang,WorkspaceManager
){
	return declare([AppBase], {
		"baseClass": "Annotation",
		templateString: Template,
		applicationName: "GenomeAnnotation",
		pageTitle: "Genome Annotation Service",
		required: true,
		genera_four: ["Acholeplasma","Entomoplasma","Hepatoplasma","Hodgkinia","Mesoplasma","Mycoplasma","Spiroplasma","Ureaplasma"],
		code_four: false,
		defaultPath: "",

		constructor: function(){
			this._autoTaxSet=false;
			this._autoNameSet=false;
		},
		startup: function(){
                        var _self=this;
                        if (this._started) { return; }
                        this.inherited(arguments);
                        _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
                        _self.output_pathWidget.set('value', _self.defaultPath);
                },
		changeCode: function(item){	
			this.code_four=false;
			item.lineage_names.forEach(lang.hitch(this, function(lname){
				if (dojo.indexOf(this.genera_four, lname)>=0){
					this.code_four=true;
				};
			}));
			this.code_four ? this.genetic_code.set("value","4") : this.genetic_code.set("value","11");
		},
	
		onTaxIDChange: function(val){
            this._autoNameSet=true;
            var tax_id=this.tax_idWidget.get("item").taxon_id;
            var sci_name=this.tax_idWidget.get("item").taxon_name;
            //var tax_obj=this.tax_idWidget.get("item");
            if(tax_id){
                var name_promise=this.scientific_nameWidget.store.get(tax_id);
                name_promise.then(lang.hitch(this, function(tax_obj) {
                    if(tax_obj){
                        this.scientific_nameWidget.set('item',tax_obj);
                        this.scientific_nameWidget.validate();
			            this.changeCode(this.tax_idWidget.get("item"));
                    }
                }));
                //this.scientific_nameWidget.set('value',sci_name);
                //this.scientific_nameWidget.set('displayedValue',sci_name);
                //this.scientific_nameWidget.set("item",tax_obj);
                //this.scientific_nameWidget.validate();

            } 
			this._autoTaxSet=false;
		},


        updateOutputName: function(){
            var current_output_name = [];
            var sci_item = this.scientific_nameWidget.get("item");
            var label_value = this.myLabelWidget.get("value");
            if(sci_item && sci_item.lineage_names.length > 0){
                current_output_name.push(sci_item.lineage_names.slice(-1)[0].replace(/\(|\)|\||\/|\:/g,''));
            }
            if(label_value.length >0){
                current_output_name.push(label_value);
            }
            if(current_output_name.length > 0){
                this.output_nameWidget.set("value", current_output_name.join(" "));
            }
        },

		onSuggestNameChange: function(val){
            this._autoTaxSet=true;
            var tax_id=this.scientific_nameWidget.get("value");
            if(tax_id){
                //var tax_promise=this.tax_idWidget.store.get("?taxon_id="+tax_id);
                //tax_promise.then(lang.hitch(this, function(tax_obj) {
                //    if(tax_obj && tax_obj.length){
                //        this.tax_idWidget.set('item',tax_obj[0]);
                //    }
                //}));
                this.tax_idWidget.set('displayedValue',tax_id);
                this.tax_idWidget.set('value',tax_id);
			    this.changeCode(this.scientific_nameWidget.get("item"));
                this.updateOutputName();
            }
			this._autoNameSet=false;
			/*if (val && !this.output_nameWidget.get('value') || (this.output_nameWidget.get('value')&&this._selfSet)  ){
				var abbrv=this.scientific_nameWidget.get('displayedValue');
				abbrv=abbrv.match(/[^\s]+$/);
				this.output_nameWidget.set('value',abbrv);
			}*/
		},
		getValues: function(){
			var values = this.inherited(arguments);
			values["scientific_name"]=this.output_nameWidget.get('displayedValue');
			values["taxonomy_id"]=this.tax_idWidget.get('displayedValue');
			return values;
		}

	});
});

