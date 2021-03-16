define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/MSA.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
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
    applicationName: 'MSA',
    requireAuth: true,
    applicationLabel: 'Multiple Sequence Alignment',
    applicationDescription: 'The multiple sequence alignment service with variation analysis can be used with feature groups, fasta files, and aligned fasta files.  User input is possible.',
    applicationHelp: 'user_guides/services/',
    tutorialLink: 'tutorial/multiple_sequence_alignment/',
    videoLink: '/videos/',
    pageTitle: 'Multiple Sequence Alignment',
    appBaseURL: 'MSA',
    defaultPath: '',
    startingRows: 14,
    maxGenomes: 256,
    textInput: false,

    constructor: function () {
      this._selfSet = true;
      this.addedGenomes = 0;
      this.genomeToAttachPt = ['comp_genome_id'];
      this.fastaToAttachPt = ['user_genomes_fasta'];
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.genomeGroupToAttachPt = ['user_genomes_genomegroup'];
      this.alignmentToAttachPt = ['user_genomes_alignment'];
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
      // this.aligner.set('disabled', true);
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
      //      this.advrow.turnedOn = (this.advrow.style.display != 'none');
      //      on(this.advanced, 'click', lang.hitch(this, function () {
      //        this.advrow.turnedOn = (this.advrow.style.display != 'none');
      //        if (!this.advrow.turnedOn) {
      //          this.advrow.turnedOn = true;
      //          this.advrow.style.display = 'block';
      //          this.advicon.className = 'fa icon-caret-left fa-1';
      //        }
      //        else {
      //          this.advrow.turnedOn = false;
      //          this.advrow.style.display = 'none';
      //          this.advicon.className = 'fa icon-caret-down fa-1';
      //        }
      //      }));
      this._started = true;
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    checkDuplicate: function (cur_value, attachType) {
      var success = 1;
      var genomeIds = [];
      var genomeList = query('.genomedata');
      genomeList.forEach(function (item) {
        genomeIds.push(item.genomeRecord[attachType]);
      });
      if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) { // found duplicate
        success = 0;
      }
      return success;
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        if (attachname == 'output_path' || attachname == 'ref_user_genomes_fasta' || attachname == 'ref_user_genomes_featuregroup' || attachname == 'ref_user_genomes_alignment') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'user_genomes_fasta') {
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
            if ('user_genomes_fasta' in item.genomeRecord) {
              genomeIds.push(item.genomeRecord.user_genomes_fasta.file);
              existing_types.push(item.genomeRecord.user_genomes_fasta.type);
            }
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value.file) > -1) // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_alignment') {
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
            if ('user_genomes_alignment' in item.genomeRecord) {
              genomeIds.push(item.genomeRecord.user_genomes_alignment.file);
              existing_types.push(item.genomeRecord.user_genomes_alignment.type);
            }
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value.file) > -1) // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_featuregroup') {
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
        }
        else if (attachname == 'comp_genome_id') {
          var compGenomeList = query('.genomedata');
          var genomeIds = [];
          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.comp_genome_id);
          });
          cur_value = this[attachname].value;
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var duplicate = this.checkDuplicate(cur_value, 'user_genomes_genomegroup');
          success *= duplicate;
        }
        else {
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

    onSuggestNameChange: function () {
      if (this.ref_genome_id.get('value') || this.ref_user_genomes_fasta.get('value') || this.ref_user_genomes_featuregroup.get('value') || this.ref_user_genomes_alignment.get('value')) {
        this.numref = 1;
      } else {
        this.numref = 0;
      }
    },

    onChangeSequence: function () {
      if (this['fasta_keyboard_input'].value && !this.textInput) {
        this.textInput = true;
        this.addedGenomes = this.addedGenomes + 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      } else if (!this['fasta_keyboard_input'].value && this.textInput) {
        this.textInput = false;
        this.addedGenomes = this.addedGenomes - 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      }
    },

    validateFasta: function () {
      var records = this.fasta_keyboard_input.value.trim().toUpperCase();
      var arr = records.split('\n');
      if (arr.length == 0 || arr[0] == '') {
        this.input_validation_message.innerHTML = '';
        return true;
      }
      if (arr[0][0] != '>' || arr.length <= 1) {
        this.input_validation_message.innerHTML = ' A fasta record is at least two lines and starts with ">".';
        return false;
      }
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] == '>') {
          continue;
        }
        if (!(/^[ACDEFGHIKLMNPQRSTUVWY\s]+$/i.test(arr[i]))) {
          this.input_validation_message.innerHTML = ' The fasta records must have amino acid or nucleotide letters.';
          return false;
        }
      }
      this.input_validation_message.innerHTML = '';
      return true;
    },

    onAlphabetChanged: function () {
      var existing_types = this.getExistingTypes();
      // if (existing_types.length > 0) {
      for (var i = 0; i < existing_types.length; i++) {
        if (existing_types[i].includes('protein')) {
          this.protein.set('checked', true);
        }
      }
      // }
    },

    makeGenomeName: function () {
      var name = this.comp_genome_id.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    makeFastaName: function (type, stuff) {
      if (stuff.includes('fasta')) {
        var name = this.user_genomes_fasta.searchBox.get('displayedValue');
      } else {
        var name = this.user_genomes_alignment.searchBox.get('displayedValue');
      }
      var maxName = 32;
      var my_type = '';
      if (type.includes('protein')) {
        my_type = 'AA: ';
      }
      else if (type.includes('dna')) {
        my_type = 'NT: ';
      }
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return my_type.concat(display_name);
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

    makeGenomeGroupName: function (newGenomeIds) {
      var name = this[this.genomeGroupToAttachPt].searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    increaseGenome: function (genomeType, newGenomeIds) {
      if (genomeType == 'genome' || genomeType == 'genome_group') {
        newGenomeIds.forEach(lang.hitch(this, function (id) {
          this.userGenomeList.push(id);
        }));
        this.addedGenomes = this.addedGenomes + newGenomeIds.length;
        this.numgenomes.set('value', Number(this.addedGenomes));
      } else {
        this.addedGenomes = this.addedGenomes + 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      }
    },

    decreaseGenome: function (genomeType, newGenomeIds) {
      if (genomeType == 'genome' || genomeType == 'genome_group') {
        newGenomeIds.forEach(lang.hitch(this, function (id) {
          var idx = this.userGenomeList.indexOf(id);
          if (idx > -1) {
            this.userGenomeList.splice(idx, 1);
          }
        }));
        this.addedGenomes = this.addedGenomes - newGenomeIds.length;
        this.numgenomes.set('value', Number(this.addedGenomes));
      } else {
        this.addedGenomes = this.addedGenomes - 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      }
    },

    onAddGenome: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.genomeToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome('genome', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome('genome', newGenomeIds);
      }
    },

    getExistingTypes: function () {
      var existing_types = [];
      var compGenomeList = query('.genomedata');
      compGenomeList.forEach(function (item) {
        if ('user_genomes_fasta' in item.genomeRecord) {
          existing_types.push(item.genomeRecord.user_genomes_fasta.type);
        } else if ('user_genomes_alignment' in item.genomeRecord) {
          existing_types.push(item.genomeRecord.user_genomes_alignment.type);
        }
      });
      return existing_types;
    },

    onAddFasta: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.fastaToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var type = lrec.user_genomes_fasta.type;
        var newGenomeIds = [lrec[this.fastaToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFastaName(type, 'fasta') + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome('fasta', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome('fasta', newGenomeIds);
        this.onAlphabetChanged();
      }
    },

    onAddFeatureGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome('feature_group', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome('feature_group', newGenomeIds);
      }
    },

    onAddAlignment: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.alignmentToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var type = lrec.user_genomes_alignment.type;
        var newGenomeIds = [lrec[this.alignmentToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFastaName(type, 'alignment') + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);

        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome('fasta', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome('fasta', newGenomeIds);
        this.onAlphabetChanged();
      }
    },

    // implement adding a genome group
    onAddGenomeGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      var path = lrec[this.genomeGroupToAttachPt];
      var newGenomeIds = [];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            newGenomeIds = res.data.id_list.genome_id;
          }
        }
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this.addedGenomes + newGenomeIds.length;
        if (count > this.maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        if (chkPassed && this.addedGenomes < this.maxGenomes
          && newGenomeIds.length > 0
          && count <= this.maxGenomes) {
          var tr = this.genomeTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeGroupName() + '</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
          if (this.addedGenomes < this.startingRows) {
            this.genomeTable.deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            domConstruct.destroy(tr);
            this.decreaseGenome('genome_group', newGenomeIds);
            if (this.addedGenomes < this.startingRows) {
              var ntr = this.genomeTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          this.increaseGenome('genome_group', newGenomeIds);
        }
      }));
    },

    onReset: function (evt) {
      this.inherited(arguments);
      for (var i = 0; i < this.addedGenomes; i++) {
        this.genomeTable.deleteRow(0);
      }
      this.emptyTable(this.genomeTable, this.addedGenomes);
      this.addedGenomes = 0;
      this.numgenomes.set('value', Number(this.addedGenomes));
    },

    validate: function () {
      if (this.inherited(arguments)) {
        var values = this.getValues();
        var feature_groups_count = 0;
        var fasta_files_count = 0;
        if (values.feature_groups) {
          feature_groups_count = values.feature_groups.length;
        }
        if (values.fasta_files) {
          fasta_files_count = values.fasta_files.length;
        }
        if (this.validateFasta() && (feature_groups_count >= 1 || fasta_files_count >= 1 || values.fasta_keyboard_input)) {
          return true;
        }
      }
      return false;
    },

    getValues: function () {
      var seqcomp_values = {};
      var values = this.inherited(arguments);
      var compGenomeList = query('.genomedata');
      var userGenomes = [];
      var featureGroups = [];
      if (values.ref_user_genomes_fasta) {
        userGenomes.push(values.ref_user_genomes_fasta);
      }
      if (values.ref_user_genomes_featuregroup) {
        featureGroups.push(values.ref_user_genomes_featuregroup);
      }
      compGenomeList.forEach(function (item) {
        if (item.genomeRecord.user_genomes_fasta) {
          userGenomes.push(item.genomeRecord.user_genomes_fasta);
        } else if (item.genomeRecord.user_genomes_featuregroup) {
          featureGroups.push(item.genomeRecord.user_genomes_featuregroup);
        } else if (item.genomeRecord.user_genomes_alignment) {
          userGenomes.push(item.genomeRecord.user_genomes_alignment);
        }
      });
      if (userGenomes.length > 0) {
        seqcomp_values.fasta_files = userGenomes;
      }
      if (featureGroups.length > 0) {
        seqcomp_values.feature_groups = featureGroups;
      }
      seqcomp_values.aligner = values.aligner;
      seqcomp_values.output_path = values.output_path;
      seqcomp_values.output_file = values.output_file;
      seqcomp_values.fasta_keyboard_input = values.fasta_keyboard_input;
      seqcomp_values.alphabet = values.alphabet;
      return seqcomp_values;
    }

  });
});
