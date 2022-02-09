define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/GeneTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', '../../DataAPI',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, DataAPI,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'GeneTree',
    requireAuth: true,
    applicationLabel: 'Gene Tree',
    applicationDescription: 'The Gene Tree Service is being tested.',
    applicationHelp: 'quick_references/services/genetree.html',
    tutorialLink: 'tutorial/genetree/genetree.html',
    videoLink: '',
    pageTitle: 'Gene Tree',
    defaultPath: '',
    startingRows: 3,
    maxGenomes: 500,
    maxGenomeLength: 100000,

    constructor: function () {
      this._selfSet = true;
      this.addedGenomes = 0;
      this.genomeToAttachPt = ['comp_genome_id'];
      this.fastaToAttachPt = ['user_genomes_fasta'];
      this.unalignedFastaToAttachPt = ['user_genomes_unaligned_fasta'];
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.genomeGroupToAttachPt = ['user_genomes_genomegroup'];
      this.userGenomeList = [];
      this.numref = 0;
      this.fastaNamesAndTypes = [];
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

      this.numref = 0;
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
      this.setTooltips();
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
        var localStorage = window.localStorage;
        if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
          localStorage.removeItem('bvbrc_rerun_job');
        }
      }
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);// domConstr.create("tr",{},this.genomeTableBody);
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
        if (attachname == 'output_path' || attachname == 'ref_user_genomes_fasta' || attachname == 'ref_user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          browser_select = 1;
        }
        else if (attachname == 'user_genomes_fasta' || attachname == 'user_genomes_unaligned_fasta') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          var compGenomeList = query('.genomedata');
          var genomeIds = [];

          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_fasta);
          });

          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
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

          // console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
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

        // console.log("cur_value=" + cur_value);

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
      if (this.ref_genome_id.get('value') || this.ref_user_genomes_fasta.get('value') || this.ref_user_genomes_featuregroup.get('value')) {
        this.numref = 1;
      } else {
        this.numref = 0;
      }
      // console.log("change genome name, this.numref=", this.numref, "this.ref_genome_id.get('value')=", this.ref_genome_id.get('value'));
    },

    onAlphabetChanged: function () {
      // can't mix DNA and Protein file types, so clear the file table and the array of file/filetypes
      while (this.genomeTable.rows.length > 0) {
        this.genomeTable.deleteRow(-1);
      }
      // Only clear away aligned and unaligned fasta files, leave feature and genome groups in table
      for (var x = this.fastaNamesAndTypes.length - 1; x >= 0; x--) {
        if (this.fastaNamesAndTypes[x].type != 'feature_group' && this.fastaNamesAndTypes[x].type != 'genome_group') {
          this.fastaNamesAndTypes.splice(x, 1);
        }
      }
      var numRows = this.startingRows;
      if (this.fastaNamesAndTypes.length > 0) {
        numRows = this.fastaNamesAndTypes.length >= this.startingRows ? -1 : this.startingRows - this.fastaNamesAndTypes.length;
      }
      this.emptyTable(this.genomeTable, numRows);
      // this.fastaNamesAndTypes = [];

      // Add featuregroups and genomegroups back to table
      var groups = {};
      groups['sequences'] = [];
      this.fastaNamesAndTypes.forEach(lang.hitch(this, function (obj) {
        var new_seq = {};
        new_seq.type = obj.type;
        new_seq.filename = obj.filename;
        groups['sequences'].push(new_seq);
      }));
      this.addSequenceFilesFormFill(groups, true);

      this.substitution_model.options = [];
      if (this.dna.checked) {
        var newOptions = [{
          value: 'HKY85', label: 'HKY85', selected: true, disabled: false
        },
        {
          value: 'JC69', label: 'JC69', selected: true, disabled: false
        },
        {
          value: 'K80', label: 'K80', selected: true, disabled: false
        },
        {
          value: 'F81', label: 'F81', selected: true, disabled: false
        },
        {
          value: 'F84', label: 'F84', selected: true, disabled: false
        },
        {
          value: 'TN93', label: 'TN93', selected: true, disabled: false
        },
        {
          value: 'GTR', label: 'GTR', selected: true, disabled: false
        }];
        this.substitution_model.set('options', newOptions);
        this.user_genomes_fasta.set('type', 'aligned_dna_fasta');
        this.user_genomes_unaligned_fasta.set('type', 'feature_dna_fasta');
      }
      else {
        var newOptions = [{
          value: 'LG', label: 'LG', selected: false, disabled: false
        },
        {
          value: 'WAG', label: 'WAG', selected: false, disabled: false
        },
        {
          value: 'JTT', label: 'JTT', selected: false, disabled: false
        },
        {
          value: 'Blosum62', label: 'Blosum62', selected: false, disabled: false
        },
        {
          value: 'Dayhoff', label: 'Dayhoff', selected: true, disabled: false
        },
        {
          value: 'HIVw', label: 'HIVw', selected: false, disabled: false
        },
        {
          value: 'HIVb', label: 'HIVb', selected: false, disabled: false
        }];
        this.substitution_model.set('options', newOptions);
        this.user_genomes_fasta.set('type', 'aligned_protein_fasta');
        this.user_genomes_unaligned_fasta.set('type', 'feature_protein_fasta');
      }
      this.substitution_model.reset();
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

    makeFastaName: function () {
      var name = this.user_genomes_fasta.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;

      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeUnalignedFastaName: function () {
      var name = this.user_genomes_unaligned_fasta.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;

      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeFeatureGroupName: function () {
      var name = this.user_genomes_featuregroup.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      // console.log("this.user_genomes_featuregroup name = " + this.name);

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
      // console.log("increase this.userGenomeList = " + this.userGenomeList);
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
      // console.log("decrease this.userGenomeList = " + this.userGenomeList);
    },

    onAddGenome: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
      // console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
          // console.log("Delete Row");
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
      // console.log(lrec);
    },

    onAddFasta: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.fastaToAttachPt, lrec);
      // console.log("this.fastaToAttachPt = " + this.fastaToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.fastaToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFastaName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
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
        this.sequenceSource = 'ws';

        var path = lrec[this.fastaToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));
      }
      // console.log(lrec);
    },

    onAddUnalignedFasta: function ()  {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.unalignedFastaToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.unalignedFastaToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeUnalignedFastaName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
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
        this.sequenceSource = 'ws';

        var path = lrec[this.unalignedFastaToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));
      }
    },

    onAddFeatureGroup: function () {
      console.log('Create New Row', domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      // console.log("this.featureGroupToAttachPt = " + this.featureGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
          // console.log("Delete Row");
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
        this.sequenceSource = 'feature_group';

        var path = lrec[this.featureGroupToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));

      }
      // console.log(lrec);
    },

    // implement adding a genome group
    onAddGenomeGroup: function () {
      // console.log("this.genomeGroupToAttachPt = " + this.genomeGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      var lrec = {};
      this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      var path = lrec[this.genomeGroupToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            // viral genome checks
            this.checkViralGenomes(res.data.id_list.genome_id);
          }
        }
      }));

      // console.log(lrec);
    },

    checkViralGenomes: function (genome_id_list) {
      // As far as I have seen Bacteria do not have a superkingdom field, only viruses
      var query = `in(genome_id,(${genome_id_list.toString()}))&select(genome_id,superkingdom,genome_length,contigs)&limit(${genome_id_list.length})`;
      console.log('query = ', query);
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        console.log('result = ', res);
        var all_valid = true;
        res.items.forEach(lang.hitch(this, function (obj) {
          if (obj.superkingdom) {
            if (obj.superkingdom != 'Viruses') {
              all_valid = false;
            }
            if (obj.contigs > 1) {
              all_valid = false;
            }
            if (obj.genome_length > this.maxGenomeLength) {
              all_valid = false;
            }
          } else {
            all_valid = false;
          }
        }));
        this.addGenomeGroupToTable(all_valid, genome_id_list);
      }));
    },

    addGenomeGroupToTable: function (all_valid, genome_id_list) {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      console.log('all genomes valid = ', all_valid);
      if (all_valid) {
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this.addedGenomes + genome_id_list.length;
        if (count > this.maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        // console.log("newGenomeIds = ", newGenomeIds);

        if (chkPassed && this.addedGenomes < this.maxGenomes
          && genome_id_list.length > 0
          && count <= this.maxGenomes)
        {
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
            // console.log("Delete Row");
            domConstruct.destroy(tr);
            this.decreaseGenome('genome_group', genome_id_list);
            if (this.addedGenomes < this.startingRows) {
              var ntr = this.genomeTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          this.increaseGenome('genome_group', genome_id_list);
          this.sequenceSource = 'genome_group';

          var path = lrec[this.genomeGroupToAttachPt];
          when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
            var fileType = res.metadata.type;
            this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
          }));
        }
      }
    },

    setTooltips: function () {
      new Tooltip({
        connectId: ['genomeGroup_tooltip'],
        label: 'Each GenomeGroup Member Must: <br>- Be a Virus <br>- Consist of a single sequence<br>- Be less than 1,000 BP in length '
      });
    },

    getValues: function () {
      var seqcomp_values = {};
      var values = this.inherited(arguments);
      var compGenomeList = query('.genomedata');
      var genomeIds = [];
      var userGenomes = [];
      var featureGroups = [];

      this.userGenomeList.forEach(lang.hitch(this, function (id) {
        genomeIds.push(id);
      }));

      compGenomeList.forEach(function (item) {
        if (item.genomeRecord.user_genomes_fasta) {
          userGenomes.push(item.genomeRecord.user_genomes_fasta);
        }
      });

      compGenomeList.forEach(function (item) {
        if (item.genomeRecord.user_genomes_featuregroup) {
          featureGroups.push(item.genomeRecord.user_genomes_featuregroup);
        }
      });

      seqcomp_values.alphabet = values.alphabet;
      seqcomp_values.recipe = values.recipe;
      seqcomp_values.substitution_model = values.substitution_model;
      seqcomp_values.trim_threshold = values.trim_threshold;
      seqcomp_values.gap_threshold = values.gap_threshold;
      seqcomp_values.sequences = this.fastaNamesAndTypes;
      seqcomp_values = this.checkBaseParameters(values, seqcomp_values);

      return seqcomp_values;
    },

    checkBaseParameters: function (values, seqcomp_values) {
      seqcomp_values.output_path = values.output_path;
      seqcomp_values.output_file = values.output_file;
      this.output_folder = values.output_path;
      this.output_name = values.output_file;
      return seqcomp_values;
    },

    intakeRerunForm: function () {
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
        var job_data = JSON.parse(localStorage.getItem('bvbrc_rerun_job'));
        console.log(job_data);
        var param_dict = { 'output_folder': 'output_path' };
        var service_specific = { 'gap_threshold': 'gap_threshold', 'trim_threshold': 'trim_threshold', 'substitution_model': 'substitution_model' };
        param_dict['service_specific'] = service_specific;
        this.setAlphabetFormFill(job_data);
        this.setRecipeFormFill(job_data);
        AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
        this.addSequenceFilesFormFill(job_data, false);
        localStorage.removeItem('bvbrc_rerun_job');
        this.form_flag = true;
      }
    },

    setAlphabetFormFill: function (job_data) {
      if (job_data['alphabet'] == 'DNA') {
        this.protein.set('checked', false);
        this.dna.set('checked', true);
      }
      else {
        this.dna.set('checked', false);
        this.protein.set('checked', true);
      }
      this.onAlphabetChanged();
    },

    setRecipeFormFill: function (job_data) {
      if (job_data['recipe'] == 'RAxML') {
        this.recipePhyML.set('checked', false);
        this.recipeFastTree.set('checked', false);
        this.recipeRAxML.set('checked', true);
      }
      else if (job_data['recipe'] == 'PhyML') {
        this.recipeRAxML.set('checked', false);
        this.recipeFastTree.set('checked', false);
        this.recipePhyML.set('checked', true);
      }
      else {
        this.recipeRAxML.set('checked', false);
        this.recipePhyML.set('checked', false);
        this.recipeFastTree.set('checked', true);
      }
    },

    addSequenceFilesFormFill: function (job_data, skipNameList) {
      var sequence_files = job_data['sequences'];
      sequence_files.forEach(function (seq_file) {
        var lrec = { 'type': seq_file.type, 'filename': seq_file.filename };
        // /General implementation
        var newGenomeIds = [seq_file['filename']];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(newGenomeIds[0].split('/').pop()) + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.decreaseGenome(lrec.type, newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome(lrec.type, newGenomeIds);
        if (lrec.type == 'feature_group') {
          this.sequenceSource = 'feature_group';
        }
        else if (lrec.type == 'genome_group') {
          this.sequenceSource = 'genome_group';
        }
        else {
          this.sequenceSource = 'ws';
        }
        var path = seq_file['filename'];
        if (!skipNameList) {
          when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
            var fileType = res.metadata.type;
            this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
          }));
        }
      }, this);
    },

    makeFormFillName: function (name) {
      var display_name = name;
      var maxName = 36;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    }

  });
});
