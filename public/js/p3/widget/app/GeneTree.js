define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/GeneTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', '../../DataAPI',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, DataAPI,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'App GeneTree',
    templateString: Template,
    applicationName: 'GeneTree',
    requireAuth: true,
    applicationLabel: 'Gene / Protein Tree',
    applicationDescription: 'The Gene / Protein Tree Service enables construction of custom phylogenetic trees built from user-selected genes or proteins.',
    applicationHelp: 'quick_references/services/genetree.html',
    tutorialLink: 'tutorial/genetree/genetree.html',
    videoLink: 'https://youtu.be/VtXWBRSdXRo',
    pageTitle: 'Gene Tree Service | BV-BRC',
    defaultPath: '',
    startingRows: 3,
    metadataStartingRows: 5,
    maxGenomes: 5000,
    maxGenomeLength: 250000,

    constructor: function () {
      this._selfSet = true;
      this.addedGenomes = 0;
      this.genomeToAttachPt = ['comp_genome_id'];
      this.fastaToAttachPt = ['user_genomes_fasta'];
      this.unalignedFastaToAttachPt = ['user_genomes_unaligned_fasta'];
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      //this.genomeGroupToAttachPt = ['user_genomes_genomegroup'];
      this.userGenomeList = [];
      this.numref = 0;
      this.fastaNamesAndTypes = [];
      this.metadataDict = {};
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

      on(this.advanced, 'click', lang.hitch(this, function () {
        this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
      }));

      this.numref = 0;
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
      this.startupMetadataTable();
      this.setTooltips();
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    toggleAdvanced: function (flag) {
      if (flag) {
        this.advancedOptions.style.display = 'block';
        this.advancedOptionIcon.className = 'fa icon-caret-left fa-1';
      }
      else {
        this.advancedOptions.style.display = 'none';
        this.advancedOptionIcon.className = 'fa icon-caret-down fa-1';
      }
    },

    // disabled for now
    onAddMetadata: function () {
      var metadata_value = this.metadata_selector.getValue();
      var metadata_field = this.metadata_selector.get('displayedValue');
      if (Object.keys(this.metadataDict).includes(metadata_value)) {
        return;
      }

      var tr = this.metadataTableBody.insertRow(0);
      this.metadata_count++;
      var td = domConstruct.create('td', { class: 'textcol', innerHTML: '' }, tr);
      td.innerHTML = "<div class='libraryrow'>" + metadata_field + '</div>';
      tr.value = metadata_value;
      this.metadataDict[metadata_value] = metadata_field;
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
        domConstruct.destroy(tr);
        this.metadata_count--;
        delete this.metadataDict[tr.value];
        if (this.metadata_count < this.metadataStartingRows) {
          var ntr = this.metadataTableBody.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          // domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
      }));
      if (this.metadata_count <= this.metadataStartingRows) {
        this.metadataTableBody.deleteRow(-1);
      }
    },

    startupMetadataTable: function () {
      var default_metadata_fields = ['Genome ID', 'Genome Name', 'Species', 'Strain', 'Accession', 'Subtype'].reverse();
      var default_metadata_values = ['genome_id', 'genome_name', 'species', 'strain', 'accession', 'subtype'].reverse();
      this.metadata_count = 0;
      var default_index = 0;
      default_metadata_fields.forEach(lang.hitch(this, function (metfield) {
        var tr = this.metadataTableBody.insertRow(0);
        this.metadata_count++;
        var metadata_value = default_metadata_values[default_index];
        this.metadataDict[metadata_value] = metfield;
        tr.value = metadata_value;
        var td = domConstruct.create('td', { 'met_val': metadata_value, class: 'textcol', innerHTML: '' }, tr);
        td.innerHTML = "<div class='libraryrow'>" + metfield + '</div>';
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
          domConstruct.destroy(tr);
          this.metadata_count--;
          delete this.metadataDict[tr.value];
          if (this.metadata_count < this.metadataStartingRows) {
            var ntr = this.metadataTableBody.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            // domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        default_index++;
      }));
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
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
      var duplicate = 0;
      var genomeIds = [];
      var genomeList = query('.genomedata');
      genomeList.forEach(function (item) {
        genomeIds.push(item.genomeRecord[attachType]);
      });
      if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) { // found duplicate
        duplicate = 1;
      }
      return duplicate;
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
          var duplicate_genome = this.checkDuplicate(cur_value, 'user_genomes_genomegroup');
          if (duplicate_genome) {
            success = 0;
          }
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
      var feature_groups = [];
      var genome_groups = [];
      console.log('onAlphabetChanged fastaNamesAndTypes:', this.fastaNamesAndTypes);
      for (var x = 0; x < this.fastaNamesAndTypes.length; x++) {
        if (this.fastaNamesAndTypes[x].type == 'feature_group') {
          feature_groups.push(this.fastaNamesAndTypes[x]);
          this.decreaseGenome('feature_group', this.fastaNamesAndTypes[x]['filename']);
        }
        else if (this.fastaNamesAndTypes[x].type == 'genome_group') {
          genome_groups.push(this.fastaNamesAndTypes[x]);
          this.decreaseGenome('genome_group', this.fastaNamesAndTypes[x]['genome_ids'])
        }
        else {
          this.decreaseGenome(this.fastaNamesAndTypes[x]['type'], this.fastaNamesAndTypes[x]['filename']);
        }
      }
      this.fastaNamesAndTypes = [];
      var total_groups = feature_groups.length + genome_groups.length;
      this.emptyTable(this.genomeTable, this.startingRows);

      console.log('feature_groups', feature_groups);
      console.log('genome_groups', genome_groups);

      feature_groups.forEach(lang.hitch(this, function (obj) {
        this.addFeatureGroupAlphabetChange(obj.filename);
      }));
      genome_groups.forEach(lang.hitch(this, function (obj) {
        this.addGenomeGroupToTableAlphabetChanged(obj.filename, obj.genome_ids)
      }))

      this.substitution_model.options = [];
      if (this.dna.checked) {
        var newOptions = [
          {
            value: 'GTR', label: 'GTR', selected: true, disabled: false
          },
          {
            value: 'TN93', label: 'TN93', selected: true, disabled: false
          },
          {
            value: 'HKY85', label: 'HKY85', selected: true, disabled: false
          },
          {
            value: 'F84', label: 'F84', selected: true, disabled: false
          },
          {
            value: 'F81', label: 'F81', selected: true, disabled: false
          },
          {
            value: 'K80', label: 'K80', selected: true, disabled: false
          },
          {
            value: 'JC69', label: 'JC69', selected: true, disabled: false
          }
        ];
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
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(x => x.filename != lrec[this.fastaToAttachPt]);
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

    onAddUnalignedFasta: function () {
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
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(x => x.filename != lrec[this.unalignedFastaToAttachPt])
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
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(x => x.filename != lrec[this.featureGroupToAttachPt]);
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

    addFeatureGroupAlphabetChange: function (feature_group) {
      var lrec = { 'user_genomes_featuregroup': feature_group };
      var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(feature_group.split('/').reverse()[0]) + '</div>';
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
        // remove entry from this.fastaNamesAndTypes
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.featureGroupToAttachPt]);
      }));
      this.increaseGenome('feature_group', newGenomeIds);
      this.sequenceSource = 'feature_group';

      var path = lrec[this.featureGroupToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    // adding a genome group
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

    // TODO: there may be a limit to the number of genome_ids that can be passed into the query, check that
    checkViralGenomes: function (genome_id_list) {
      // As far as I have seen Bacteria do not have a superkingdom field, only viruses
      var query = `in(genome_id,(${genome_id_list.toString()}))&select(genome_id,superkingdom,genome_length,contigs)&limit(${genome_id_list.length})`;
      console.log('query = ', query);
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        console.log('result = ', res);
        var all_valid = true;
        var errors = {};
        res.items.forEach(lang.hitch(this, function (obj) {
          if (obj.superkingdom) {
            var duplicate_genome = this.checkDuplicate(obj.genome_id, 'user_genomes_genomegroup');
            if (duplicate_genome) {
              all_valid = false;
              if (!Object.keys(errors).includes('duplicate_error')) {
                errors['duplicate_error'] = 'Duplicate GenomeIds:<br> First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.superkingdom != 'Viruses') {
              all_valid = false;
              if (!Object.keys(errors).includes('kingdom_error')) {
                errors['kingdom_error'] = 'Invalid Superkingdom: only virus genomes are permitted<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.contigs > 1) {
              all_valid = false;
              if (!Object.keys(errors).includes('contigs_error')) {
                errors['kingdom_error'] = 'Error: only 1 contig is permitted<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.genome_length > this.maxGenomeLength) {
              all_valid = false;
              if (!Object.keys(errors).includes('genomelength_error')) {
                errors['genomelength_error'] = 'Error: genome exceeds maximum length ' + this.maxGenomeLength.toString() + '<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
          } else { // TODO: don't think this is correct, add other criteria
            all_valid = false;
          }
        }));
        this.addGenomeGroupToTable(all_valid, genome_id_list, errors);
      }));
    },

    addGenomeGroupToTableAlphabetChanged: function (genome_group, genome_id_list) {
      var lrec = { 'user_genomes_genomegroup': genome_group };
      var count = this.addedGenomes + genome_id_list.length;
      if (count > this.maxGenomes) {
        var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
        msg += ' and you are trying to select ' + count + '.';
        new Dialog({ title: 'Notice', content: msg }).show();
      }
      console.log("genome_id_list = ", genome_id_list);

      if (this.addedGenomes < this.maxGenomes
        && genome_id_list.length > 0
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
          // remove entry from this.fastaNamesAndTypes
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.genomeGroupToAttachPt]);
        }));
        this.increaseGenome('genome_group', genome_id_list);
        this.sequenceSource = 'genome_group';

        var path = lrec[this.genomeGroupToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType, 'genome_ids': genome_id_list });
        }));
      }
    },

    addGenomeGroupToTable: function (all_valid, genome_id_list, errors) {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      console.log('all genomes valid = ', all_valid);
      console.log('chkPassed = ', chkPassed);
      if (all_valid) {
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this.addedGenomes + genome_id_list.length;
        if (count > this.maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }

        if (chkPassed && this.addedGenomes < this.maxGenomes
          && genome_id_list.length > 0
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
            // remove entry from this.fastaNamesAndTypes
            this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.genomeGroupToAttachPt]);
          }));
          this.increaseGenome('genome_group', genome_id_list);
          this.sequenceSource = 'genome_group';

          var path = lrec[this.genomeGroupToAttachPt];
          when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
            var fileType = res.metadata.type;
            this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType, 'genome_ids': genome_id_list });
          }));
        }
      }
      else {
        var error_msg = 'This looks like an invalid genome group. The following errors were found:';
        Object.values(errors).forEach(lang.hitch(this, function (err) {
          error_msg = error_msg + '<br>- ' + err;
        }));
        this.genomegroup_message.innerHTML = error_msg;
        setTimeout(lang.hitch(this, function () {
          this.genomegroup_message.innerHTML = '';
        }), 5000);
      }
    },

    setTooltips: function () {
      new Tooltip({
        connectId: ['genomeGroup_tooltip'],
        label: 'Each GenomeGroup Member Must: <br>- Be a Virus <br>- Consist of a single sequence<br>- Be less than ' + this.maxGenomeLength.toString() + ' BP in length '
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

      // get metadata fields
      seqcomp_values.metadata_fields = [];
      if (this.metadata_count > 0) {
        seqcomp_values.metadata_fields = Object.keys(this.metadataDict);
      }

      seqcomp_values.alphabet = values.alphabet;
      seqcomp_values.tree_type = values.tree_type;
      seqcomp_values.recipe = values.recipe;
      seqcomp_values.substitution_model = values.substitution_model;
      seqcomp_values.trim_threshold = values.trim_threshold;
      seqcomp_values.gap_threshold = values.gap_threshold;
      seqcomp_values.sequences = this.fastaNamesAndTypes;
      seqcomp_values = this.checkBaseParameters(values, seqcomp_values);

      this.resetSubmit();

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
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            this.form_flag = true;
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            console.log(job_data);
            var param_dict = { 'output_folder': 'output_path' };
            var service_specific = { 'gap_threshold': 'gap_threshold', 'trim_threshold': 'trim_threshold', 'substitution_model': 'substitution_model' };
            param_dict['service_specific'] = service_specific;
            this.setAlphabetFormFill(job_data);
            this.setRecipeFormFill(job_data);
            // AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            this.addSequenceFilesFormFill(job_data);
            this.setParameters(job_data);
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setParameters: function (job_data) {
      if (job_data['gap_threshold']) {
        this.gap_threshold.set('value', job_data['gap_threshold']);
      }
      if (job_data['trim_threshold']) {
        this.trim_threshold.set('value', job_data['trim_threshold']);
      }
      if (job_data['substitution_model']) {
        // model dropdown is reset without setTimeout, avoids but doesn't fix issue
        setTimeout(lang.hitch(this, function () {
          this.substitution_model.set('value', job_data['substitution_model']);
        }), 1);
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

    addSequenceFilesFormFill: function (job_data) {
      var sequence_files = job_data['sequences'];
      var path_list = [];
      sequence_files.forEach(function (seq_file) {
        var path = seq_file['filename'];
        path_list.push(path);
      }, this);
      var _self = this;
      var data_list = [];
      when(WorkspaceManager.getObjects(path_list, true).then(lang.hitch(this, function (res) {
        for (var x = 0; x < path_list.length; x++) {
          var fileType = res[x].type;
          data_list.push({ 'filename': path_list[x], 'type': fileType });
        }
        _self.formFillPopulateTable(data_list);
      })));
    },

    // assumes dna/protein button is selected correctly
    formFillPopulateTable: function (data_list) {
      for (var x = 0; x < data_list.length; x++) {
        var obj = data_list[x];
        if (obj.type === 'feature_group') {
          this.addFeatureGroupAlphabetChange(obj.filename);
        }
        // TODO: test
        else if (obj.type === 'genome_group') {
          this.addGenomeGroupToTableAlphabetChanged(obj.filename, obj.genome_ids);
        }
        else if ((obj.type === 'aligned_protein_fasta') || (obj.type === 'aligned_dna_fasta')) {
          // user_genomes_fasta
          // aligned_protein_fasta, aligned_dna_fasta
          this.onAddFastaFormFill(obj.filename);
        }
        else {
          // user_genomes_unaligned_fasta
          // feature_dna_fasta, feature_protein_fasta
          this.onAddUnalignedFastaFormFill(obj.filename);
        }
      }
    },

    onAddFastaFormFill: function (fasta) {
      var lrec = { 'user_genomes_fasta': fasta };
      var newGenomeIds = [lrec['user_genomes_fasta']];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(fasta.split('/').reverse()[0]) + '</div>';
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
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(x => x.filename != lrec[this.fastaToAttachPt]);
      }));
      this.increaseGenome('fasta', newGenomeIds);
      this.sequenceSource = 'ws';

      var path = lrec[this.fastaToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    onAddUnalignedFastaFormFill: function (unaligned_fasta) {
      var lrec = { 'user_genomes_unaligned_fasta': unaligned_fasta };
      var newGenomeIds = [lrec['user_genomes_unaligned_fasta']];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(unaligned_fasta.split('/').reverse()[0]) + '</div>';
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
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(x => x.filename != lrec[this.unalignedFastaToAttachPt]);
      }));
      this.increaseGenome('fasta', newGenomeIds);
      this.sequenceSource = 'ws';

      var path = lrec[this.unalignedFastaToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    makeFormFillName: function (name) {
      var display_name = name;
      var maxName = 36;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    resetSubmit: function () {
      this.fastaNamesAndTypes = [];
      this.fastaNamesAndTypes = [];
      for (var x = this.genomeTable.rows.length - 1; x >= 0; x--) {
        this.genomeTable.deleteRow(x);
      }
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
    },

    reset: function () {
      this.inherited(arguments);
      this.fastaNamesAndTypes = [];
      for (var x = this.genomeTable.rows.length - 1; x >= 0; x--) {
        this.genomeTable.deleteRow(x);
      }
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
    }

  });
});
