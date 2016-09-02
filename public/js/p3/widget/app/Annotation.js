define([
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

