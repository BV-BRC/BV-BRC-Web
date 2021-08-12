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
    startingRows: 10,
    maxGroups: 10,
    defaultPath: '',

    constructor: function () {
      this._selfSet = true;
      this.addedGroups = 0;
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.userGenomeList = [];
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
      this.emptyTable(this.groupsTable, this.startingRows);
      this.numgenomes.startup();
      this.onInputTypeChange();
      this._started = true;
    },

    onInputTypeChange: function () {
      if (this.input_groups.checked == true) {
        this.feature_groups_table.style.display = 'table';
        this.alignment_files_table.style.display = 'none';
        this.auto_grouping_table.style.display = 'none';
      }
      else if (this.input_files.checked == true) {
        this.feature_groups_table.style.display = 'none';
        this.alignment_files_table.style.display = 'table';
        this.auto_grouping_table.style.display = 'none';
      }
      else if (this.input_auto.checked == true) {
        this.feature_groups_table.style.display = 'none';
        this.alignment_files_table.style.display = 'none';
        this.auto_grouping_table.style.display = 'table';
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        if (attachname == 'user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;
          var compGenomeList = query('.genomedata');
          var genomeIds = [];
          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_featuregroup);
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        } else {
          cur_value = this[attachname].value;
        }
        if (typeof (cur_value) == 'string') {
          target[attachname] = cur_value.trim();
        }
        else {
          target[attachname] = cur_value;
        }
        this[attachname]._set('state', '');
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

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        console.log('empty table');
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    validate: function () {
      var ans = this.inherited(arguments);
      if (ans) {
        var p_value = parseFloat(this['p_value'].value);
        if (!(p_value && (p_value <= 1 && p_value > 0))) {
          ans = false;
        }
      }
      if (ans) {
        if (this.input_groups.checked == true) {
          ans = this.numgenomes >= 2;
        } else if (this.input_files.checked == true) {
          if (!(this['alignment_file'].value && this['group_file'].value)) {
            ans = false;
          }
        }
      }
      if (!ans) {
        this.submitButton.set('disabled', true);
      }
      return ans;
    },

    makeFeatureGroupName: function () {
      var name = this.user_genomes_featuregroup.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    getValues: function () {
      var values = this.inherited(arguments);
      values.p_value = parseFloat(this['p_value'].value);
      delete values.user_genomes_featuregroup;
      if (this.input_groups.checked == true) {
        values.input_type = 'groups';
        delete values.alignment_file;
        delete values.group_file;
        var compGenomeList = query('.genomedata');
        var userGroups = [];
        compGenomeList.forEach(function (item) {
          if (item.genomeRecord.user_genomes_featuregroup) {
            userGroups.push(item.genomeRecord.user_genomes_featuregroup);
          }
        });
        values.groups = userGroups;
      } else if (this.input_files.checked == true) {
        values.input_type = 'files';
        var alignment_type = null;
        if (this['alignment_file'].searchBox.onChange.target.item) {
          alignment_type = this['alignment_file'].searchBox.onChange.target.item.type;
        }
        values.alignment_type = alignment_type;
      }
      return values;
    },

    onAddFeatureGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      if (chkPassed && this.addedGroups < this.maxGroups) {
        var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
        if (!newGenomeIds[0]) {
          return;
        }
        var tr = this.groupsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGroups < this.startingRows) {
          this.groupsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGroups < this.startingRows) {
            var ntr = this.groupsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }
    },

    increaseGenome: function (genomeType, newGenomeIds) {
      this.addedGroups = this.addedGroups + 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    decreaseGenome: function () {
      this.addedGroups = this.addedGroups - 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    onReset: function (evt) {
      this.inherited(arguments);
      for (var i = 0; i < this.addedGroups; i++) {
        this.groupsTable.deleteRow(0);
      }
      this.emptyTable(this.groupsTable, this.addedGroups);
      this.addedGroups = 0;
      this.numgenomes.set('value', Number(this.addedGroups));
    },

  });
});
