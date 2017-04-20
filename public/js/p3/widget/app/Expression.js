define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Expression.html", "./AppBase", "p3/widget/WorkspaceFilenameValidationTextBox", "../../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase, WorkspaceFilenameValidationTextBox, WorkspaceManager){
	return declare([AppBase], {
		"baseClass": "Expression",
		templateString: Template,
		applicationName: "DifferentialExpression",
		pageTitle: "Differential Expression Import",
		defaultPath: "",
		constructor: function(){
			this._selfSet = true;
		},
		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);
			_self.defaultPath = WorkspaceManager.getDefaultFolder("experiment_folder") || _self.activeWorkspacePath;
			_self.output_pathWidget.set('value', _self.defaultPath);
		},
		getValues: function(){
			var values = this.inherited(arguments);
			var exp_values = {};
			var ustring_keys = ["xformat", "source_id_type", "data_type", "experiment_title", "experiment_description", "organism", "metadata_format", "genome_id"];
			var ustring = {};
			ustring_keys.forEach(function(k){
				ustring[k] = values[k];
			});
			//get xsetup from object type
			ustring["xsetup"] = this.xfile.searchBox.get("item").type == 'expression_gene_matrix' ? 'gene_matrix' : 'gene_list'; // should be this.xfile.get("selection").type but need to fix on quick drop
			ustring["organism"] = this.scientific_nameWidget.get('displayedValue');
			ustring["host"] = false;			
			if (values["host"] == "true"){
				ustring["host"] = true;
			}
			exp_values["ustring"] = JSON.stringify(ustring);
			exp_values["xfile"] = values["xfile"];
			exp_values["mfile"] = values["mfile"];
			exp_values["output_path"] = values["output_path"];
			exp_values["output_file"] = values["experiment_title"];

			return exp_values;
		}

	});
});

