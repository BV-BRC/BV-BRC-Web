define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Reconstruct.html', './AppBase',
  'dojo/_base/lang', '../../WorkspaceManager',
  '../GenomeNameSelector', '../MediaSelector'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, AppBase,
  lang, WorkspaceManager,
  genomeSelector, MediaSelector
) {
  return declare([AppBase], {
    baseClass: 'Modeling',
    templateString: Template,
    applicationName: 'ModelReconstruction',
    requireAuth: true,
    applicationLabel: 'Reconstruct Metabolic Model',
    applicationDescription: 'The Reconstruct Metabolic Model Service generate draft genome-scale metabolic models.',
    applicationHelp: 'user_guides/services/model_reconstruction_service.html',
    tutorialLink: 'tutorial/metabolic_model_reconstruction/metabolic_model_reconstruction.html',
    pageTitle: 'Reconstruct Metabolic Model',
    required: true,
    code_four: false,
    constructor: function () {

    },

    onSuggestNameChange: function () {
    },

    startup: function () {

      var _self = this;
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      this.mediaSelector.set('selected', 'Complete');

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_pathWidget.set('value', _self.defaultPath);
    },
    getValues: function () {
      var values = this.inherited(arguments);

      var gID = values.genome;
      values.genome = 'PATRICSOLR:' + gID;
      values.fulldb = (values.fulldb && values.fulldb.length) ? 1 : 0;

      if (values.output_file === '')
      { values.output_file = gID + '_model'; }

      var mediaItem = this.mediaSelector.store.get(this.mediaSelector.get('value'));
      values.media = mediaItem.path;

      console.log('Running reconstruct with', values);
      return values;
    }

  });
});
