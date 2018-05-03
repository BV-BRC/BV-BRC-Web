define([
  'dijit/form/Select', 'dojo/_base/declare',
  'dojo/store/Memory', 'dojo/_base/lang', 'dojo/dom-construct',
  './TaxonNameSelector', 'dojo/on', 'dijit/TooltipDialog',
  'dijit/popup', '../WorkspaceManager'

], function (
  Select, declare,
  Store, lang, domConstr,
  TaxonNameSelector, on, TooltipDialog,
  popup, WorkspaceManager
) {

  return declare([Select], {
    apiServiceUrl: window.App.dataAPI,
    promptMessage: 'Choose Media Type.',
    placeHolder: '',
    searchAttr: 'name',
    labelAttr: 'name',
    queryExpr: '${0}',
    pageSize: 25,
    autoComplete: true,
    store: null,
    required: false,
    mediaPath: '/chenry/public/modelsupport/patric-media',
    defaultItem: null,
    constructor: function () {
      if (!this.store) {
        WorkspaceManager.getFolderContents(this.mediaPath).then(lang.hitch(this, function (data) {
          this.set('store', new Store({ data: data }));
        }));
      }
    }
  });
});
