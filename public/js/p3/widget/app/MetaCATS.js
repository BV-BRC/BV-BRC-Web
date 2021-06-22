define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/MetaCATS.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox', 'dijit/form/Textarea',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox, Textarea,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
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

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      console.log('INGEST');
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        if (attachname == 'output_path') { // } || attachname == 'ref_user_genomes_fasta' || attachname == 'ref_user_genomes_featuregroup' || attachname == 'ref_user_genomes_alignment') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'alignment_file') {
          console.log('Hello alignment file.');
          var existing_types = [];
          cur_value = this[attachname].searchBox.value;
          var type = null;
          if (this[attachname].searchBox.onChange.target.item) {
            type = this[attachname].searchBox.onChange.target.item.type;
          }
          cur_value = { 'file': cur_value.trim(), 'type': type };
          var compGenomeList = query('.genomedata');
          var genomeIds = [];
          compGenomeList.forEach(function (item) {
            if ('alignment_file' in item.genomeRecord) {
              genomeIds.push(item.genomeRecord.user_genomes_alignment.file);
              existing_types.push(item.genomeRecord.user_genomes_alignment.type);
            }
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value.file) > -1) // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else {
          console.log(attachname);
          cur_value = this[attachname].value;
        }
        if (typeof (cur_value) == 'string') {
          target[attachname] = cur_value.trim();
        }
        else {
          target[attachname] = cur_value;
        }
        if (req && (!target[attachname] || incomplete)) {
          if (browser_select) {
            this[attachname].searchBox.validate(); // this should be whats done but it doesn't actually call the new validator
            this[attachname].searchBox._set('state', 'Error');
            this[attachname].focus = true;
          }
          success = 0;
        }
        else {
          this[attachname]._set('state', '');
        }
        if (target[attachname] != '') {
          target[attachname] = target[attachname] || undefined;
        }
        else if (target[attachname] == 'true') {
          target[attachname] = true;
        }
        else if (target[attachname] == 'false') {
          target[attachname] = false;
        }
      }, this);
      return (success);
    },


    getValues: function () {
      var values = this.inherited(arguments);
      var alignment_type = null;
      if (this['alignment_file'].searchBox.onChange.target.item) {
        alignment_type = this['alignment_file'].searchBox.onChange.target.item.type;
      }
      values.alignment_type = alignment_type;
      return values;
    }

  });
});
