define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Reconstruct.html", "./AppBase",
	"dojo/_base/lang", "../../WorkspaceManager",
	"../GenomeNameSelector", "../MediaSelector"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, AppBase,
			lang, WorkspaceManager,
			genomeSelector, MediaSelector){
	return declare([AppBase], {
		baseClass: "Modeling",
		templateString: Template,
		applicationName: "ModelReconstruction",
		pageTitle: "Reconstruct Metabolic Model",
		required: true,
		code_four: false,
		constructor: function(){

		},

		onSuggestNameChange: function(){
		},

		startup: function(){

			var _self = this;
			if(this._started){
				return;
			}

			this.inherited(arguments);
			this.mediaSelector.set("selected", "Complete");
			/*
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.WorkspaceObjectSelector.set('value', _self.defaultPath);
			*/
		},
		getValues: function(){
			var values = this.inherited(arguments);

			var gID = values.genome;
			values.genome = 'PATRICSOLR:' + gID;
			values.fulldb = (values.fulldb && values.fulldb.length) ? 1 : 0;
			values.output_path = WorkspaceManager.getDefaultFolder() + '/models';

			if(values.output_file === '')
				values.output_file = gID + '_model';

			var mediaItem = this.mediaSelector.store.get(this.mediaSelector.get('value'));
			values.media = mediaItem.path;
			console.log("mediaItem: ", mediaItem);

			console.log('Running reconstruct with', values)
			return values;
		}

	});
});
