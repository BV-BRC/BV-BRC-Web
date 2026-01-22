define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/SeqComparison.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when', '../../DataAPI'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby, when, DataAPI
) {
  return declare([AppBase], {
    baseClass: 'App ProteomeComparison',
    templateString: Template,
    applicationName: 'GenomeComparison',
    requireAuth: true,
    applicationLabel: 'Proteome Comparison',
    applicationDescription: 'The Proteome Comparison Service performs protein sequence-based genome comparison using bidirectional BLASTP. This service allows users to select genomes and compare them to reference genome.',
    applicationHelp: 'quick_references/services/proteome_comparison_service.html',
    tutorialLink: 'tutorial/proteome_comparison/proteome_comparison.html',
    videoLink: 'https://youtu.be/UJak-ifQ9FE',
    pageTitle: 'Proteome Comparison Service | BV-BRC',
    defaultPath: '',
    startingRows: 9,
    maxGenomes: 9,

    constructor: function () {
      this._selfSet = true;
      this.addedGenomes = 0;
      this.genomeToAttachPt = ['comp_genome_id'];
      this.fastaToAttachPt = ['user_genomes_fasta'];
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.genomeGroupToAttachPt = ['user_genomes_genomegroup'];
      this.userGenomeList = [];
      this.numref = 0;
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
      this.advrow.turnedOn = (this.advrow.style.display != 'none');
      on(this.advanced, 'click', lang.hitch(this, function () {
        this.advrow.turnedOn = (this.advrow.style.display != 'none');
        if (!this.advrow.turnedOn) {
          this.advrow.turnedOn = true;
          this.advrow.style.display = 'block';
          this.advicon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow.turnedOn = false;
          this.advrow.style.display = 'none';
          this.advicon.className = 'fa icon-caret-down fa-1';
        }
      }));
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
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
        else if (attachname == 'user_genomes_fasta') {
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
      }
      // console.log(lrec);
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
      }
      // console.log(lrec);
    },

    // implement adding a genome group
    onAddGenomeGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      // console.log("this.genomeGroupToAttachPt = " + this.genomeGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      var path = lrec[this.genomeGroupToAttachPt];
      var newGenomeIds = [];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            newGenomeIds =  res.data.id_list.genome_id;
          }
        }
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this.addedGenomes + newGenomeIds.length;
        if (count > this.maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        // console.log("newGenomeIds = ", newGenomeIds);

        if (chkPassed && this.addedGenomes < this.maxGenomes
          && newGenomeIds.length > 0
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

      // console.log(lrec);
    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();
        // console.log("user_genomes ", values["user_genomes"]);
        // console.log("user_feature_groups ", values["user_feature_groups"]);
        // console.log("genome_ids ", values["genome_ids"]);
        // console.log("reference_genome_index ", values["reference_genome_index"]);
        var numUserGenome = 0;

        if (values.user_genomes) {
          numUserGenome += values.user_genomes.length;
        }
        if (values.user_feature_groups) {
          numUserGenome += values.user_feature_groups.length;
        }
        if (values.genome_ids) {
          numUserGenome += values.genome_ids.length;
        }

        if (numUserGenome > 1 && values.reference_genome_index > 0) {
          domClass.add(this.domNode, 'Working');
          domClass.remove(this.domNode, 'Error');
          domClass.remove(this.domNode, 'Submitted');
          var start_params = {
            'base_url': window.App.appBaseURL
          };
          if (window.App.containerBuildID) {
            console.log('window.App = ', window.App);
            values.container_id = window.App.containerBuildID;
          }

          console.log('values = ', values);

          if (window.App.noJobSubmission) {
            var dlg = new Dialog({
              title: 'Job Submission Params: ',
              content: '<pre>' + JSON.stringify(values, null, 4) + '</pre>'
            });
            dlg.startup();
            dlg.show();
            return;
          }
          this.submitButton.set('disabled', true);

          window.App.api.service('AppService.start_app2', [this.applicationName, values, start_params]).then(function (results) {
          // window.App.api.service('AppService.start_app', [this.applicationName, values]).then(function (results) {
            // console.log("Job Submission Results: ", results);
            domClass.remove(_self.domNode, 'Working');
            domClass.add(_self.domNode, 'Submitted');
            _self.submitButton.set('disabled', false);
            registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
              obj.reset();
            });
          }, function (err) {
            // console.log("Error:", err)
            domClass.remove(_self.domNode, 'Working');
            domClass.add(_self.domNode, 'Error');
            _self.errorMessage.innerHTML = err;
          });
        } else {
          domClass.add(this.domNode, 'Error');
          // console.log("Form is incomplete");
        }

      } else {
        domClass.add(this.domNode, 'Error');
        // console.log("Form is incomplete");
      }
    },

    getValues: function () {
      var seqcomp_values = {};
      var values = this.inherited(arguments);
      var compGenomeList = query('.genomedata');
      var genomeIds = [];
      var userGenomes = [];
      var featureGroups = [];
      var refType = '';
      var refIndex = 0;

      if (values.ref_genome_id) {
        refType = 'ref_genome_id';
        genomeIds.push(values.ref_genome_id);
      }
      else if (values.ref_user_genomes_fasta) {
        refType = 'ref_user_genomes_fasta';
        userGenomes.push(values.ref_user_genomes_fasta);
      }
      else if (values.ref_user_genomes_featuregroup) {
        refType = 'ref_user_genomes_featuregroup';
        featureGroups.push(values.ref_user_genomes_featuregroup);
      }

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

      // console.log("compGenomeList = " + compGenomeList);
      // console.log("ref genome = " + values["ref_genome_id"]);

      seqcomp_values.genome_ids = genomeIds;
      if (userGenomes.length > 0) {
        seqcomp_values.user_genomes = userGenomes;
      }

      if (featureGroups.length > 0) {
        seqcomp_values.user_feature_groups = featureGroups;
      }

      if (refType == 'ref_genome_id') {
        refIndex = 1;
      }
      else if (refType == 'ref_user_genomes_fasta') {
        refIndex = genomeIds.length + 1;
      }
      else if (refType == 'ref_user_genomes_featuregroup') {
        refIndex = genomeIds.length + userGenomes.length + 1;
      }

      seqcomp_values.reference_genome_index = refIndex;

      if (values.min_seq_cov) {
        seqcomp_values.min_seq_cov = values.min_seq_cov / 100;
      }
      if (values.max_e_val) {
        seqcomp_values.max_e_val = values.max_e_val;
      }
      if (values.min_ident) {
        seqcomp_values.min_ident = values.min_ident / 100;
      }

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
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            // var param_dict = { 'output_folder': 'output_path' };
            // AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.setReferenceGenomeFormFill(job_data);
            this.addGenomesFormFill(job_data);
            this.form_flag = false;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setReferenceGenomeFormFill: function (job_data) {
      // reference_genome_index is base index 1
      // TODO: make sure that the default for reference_genome_index = 1 is just a default, do not set if others are set
      console.log(job_data);
      // var set_ref = false;
      if (job_data['user_genomes']) {
        if (job_data['user_genomes'].length > 0) {
          this.ref_user_genomes_fasta.set('value', job_data['user_genomes'][0]);
          // set_ref = true;
        }
      }
      else if (job_data['user_feature_groups']) {
        if (job_data['user_feature_groups'].length > 0) { // feature group
          this.ref_user_genomes_featuregroup.set('value', job_data['user_feature_groups'][0]);
          // set_ref = true;
        }
      }
      else {
        var ref_gid = job_data['genome_ids'][parseInt(job_data['reference_genome_index']) - 1];
        this.ref_genome_id.set('value', ref_gid);
        // set_ref = true;
      }
    },

    addGenomesFormFill: function (job_data) {
      var genome_ids = job_data['genome_ids'];
      // remove reference genome
      var genome_reference = true;
      if (job_data['user_genomes'] && job_data['user_genomes'].length > 0) {
        genome_reference = false;
      }
      if (job_data['user_feature_groups'] && job_data['user_feature_groups'].length > 0) {
        genome_reference = false;
      }
      if (genome_reference) {
        var genome_idx = parseInt(job_data['reference_genome_index']) - 1;
        genome_ids.splice(genome_idx, 1);
      }
      var query = 'in(genome_id,(' + genome_ids.join(',') + '))';
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        res.items.forEach(lang.hitch(this, function (genome) {
          var gid = genome.genome_id;
          var genome_name = genome.genome_name;
          var lrec = {};
          var tr = this.genomeTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.genDisplayName(genome_name) + '</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
          if (this.addedGenomes < this.startingRows) {
            this.genomeTable.deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            // console.log("Delete Row");
            domConstruct.destroy(tr);
            this.decreaseGenome('genome', [gid]);
            if (this.addedGenomes < this.startingRows) {
              var ntr = this.genomeTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          this.increaseGenome('genome', [gid]);
        }));
      }));
    },

    genDisplayName: function (name) {
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },
  });
});
