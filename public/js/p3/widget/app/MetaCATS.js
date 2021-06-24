define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/MetaCATS.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox', 'dijit/form/ValidationTextBox', 'dijit/form/Textarea',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox, ValidationTextBox, Textarea,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'AppBase',
    templateString: Template,
    applicationName: 'MetaCATS',
    requireAuth: true,
    applicationLabel: 'Metadata-driven Comparative Analysis Tool (meta-CATS)',
    applicationDescription: 'The meta-CATS tool looks for positions that significantly differ between user-defined groups of sequences. However, biological biases due to covariation, codon biases, and differences in genotype, geography, time of isolation, or others may affect the robustness of the underlying statistical assumptions.',
    applicationHelp: 'user_guides/services/',
    tutorialLink: 'tutorial/meta-cats/',
    videoLink: '/videos/',
    pageTitle: 'MetaCATS',
    appBaseURL: 'MetaCATS',
    defaultPath: '',

    constructor: function () {
      this._selfSet = true;
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

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this._started = true;
    },

    validate: function () {
      if (this.inherited(arguments)) {
        var p_value = parseFloat(this['p_value'].value);
        if (p_value && (p_value <= 1 && p_value > 0)) {
          return true;
        }
        return false;
      }
      return false;
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var alignment_type = null;
      if (this['alignment_file'].searchBox.onChange.target.item) {
        alignment_type = this['alignment_file'].searchBox.onChange.target.item.type;
      }
      values.p_value = parseFloat(this['p_value'].value);
      values.alignment_type = alignment_type;
      return values;
    }

  });
});
