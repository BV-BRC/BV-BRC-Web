define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Expression.html","./AppBase","p3/widget/WorkspaceFilenameValidationTextBox"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,AppBase
){
	return declare([AppBase], {
		"baseClass": "Expression",
		templateString: Template,
		applicationName: "DifferentialExpression",
		constructor: function(){
			this._selfSet=true;
		},	
	
		getValues: function(){
			var values = this.inherited(arguments);
			var exp_values={};
			var ustring_keys=["xformat","xsetup","source_id_type","data_type", "experiment_title", "experiment_description","organism","metadata_format"];
			var ustring={};
			ustring_keys.forEach(function(k){
				ustring[k]=values[k];
			});
			//get xsetup from object type
			exp_values["ustring"]=ustring;
			exp_values["organism"]=this.scientific_nameWidget.get('displayedValue');
			exp_values["xfile"]=values["xfile"];
			exp_values["mfile"]=values["mfile"];
				
			return exp_values;
		}
		
	});
});

