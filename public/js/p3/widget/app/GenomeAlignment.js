define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/GenomeAlignment.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/query', 'dijit/Dialog',
  '../../WorkspaceManager', 'dojo/when'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, query, Dialog,
  WorkspaceManager, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'GenomeAlignment',
    applicationHelp: 'user_guides/services/genome_alignment.html',
    tutorialLink: 'tutorial/genome_alignment/tree_building.html',
    pageTitle: 'Genome Alignment',
    defaultPath: '',
    startingRows: 5,

    constructor: function () {
      this._selfSet = true;
      this.inGroup = {};
      this.inGroup.addedList = []; // list of genome id, duplicate is allowed
      this.inGroup.addedNum = 0;
      this.inGroup.genomeToAttachPt = ['in_genome_id'];
      this.inGroup.genomeGroupToAttachPt = ['in_genomes_genomegroup'];
      this.inGroup.maxGenomes = 100;

      this.selectedTR = []; // list of selected TR for ingroup and outgroup, used in onReset()
    },

    startup: function () {
      var _self = this;
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);

      this.emptyTable(this.inGroupGenomeTable, this.startingRows);

      this.inGroupNumGenomes.startup();

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
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);// domConstr.create("tr",{},this.genomeTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        if (attachname == 'output_path') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'in_genomes_genomegroup' || attachname == 'out_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var attachType = 'genomes_genomegroup';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          var outDuplicate = this.checkDuplicate(cur_value, 'out', attachType);
          success = success * inDuplicate * outDuplicate;
        }
        else if (attachname == 'in_genome_id' || attachname == 'out_genome_id') {
          cur_value = this[attachname].value;
          var attachType = 'genome_id';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          var outDuplicate = this.checkDuplicate(cur_value, 'out', attachType);
          success = success * inDuplicate * outDuplicate;
        }
        else {
          cur_value = this[attachname].value;
        }

        console.log('cur_value=' + cur_value);

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

    checkDuplicate: function (cur_value, groupTypePrefix, attachType) {
      var success = 1;
      var genomeIds = [];
      var genomeList = query('.' + groupTypePrefix + 'GroupGenomeData');
      genomeList.forEach(function (item) {
        genomeIds.push(item.genomeRecord[groupTypePrefix + '_' + attachType]);
      });
      if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) { // found duplicate
        success = 0;
      }
      return success;
    },

    makeGenomeName: function (groupType) {
      var name = this[this[groupType].genomeToAttachPt].get('displayedValue');
      var maxLength = 36;
      return this.genDisplayName(name, maxLength);
    },

    makeGenomeGroupName: function (groupType, newGenomeIds) {
      var name = this[this[groupType].genomeGroupToAttachPt].searchBox.get('displayedValue');
      var maxLength = 36;
      return this.genDisplayName(name, maxLength) + ' (' + newGenomeIds.length + ' genomes)';
    },

    genDisplayName: function (name, maxLength) { // generate a display name up to maxLength
      var display_name = name;
      if (name.length > maxLength) {
        display_name = name.substr(0, (maxLength / 2) - 2) + '...' + name.substr((name.length - (maxLength / 2)) + 2);
      }
      return display_name;
    },

    increaseGenome: function (groupType, newGenomeIds) {
      newGenomeIds.forEach(lang.hitch(this, function (id) {
        this[groupType].addedList.push(id);
      }));
      this[groupType].addedNum = this[groupType].addedList.length;
      this[groupType + 'NumGenomes'].set('value', Number(this[groupType].addedNum));
    },

    decreaseGenome: function (groupType, newGenomeIds) {
      newGenomeIds.forEach(lang.hitch(this, function (id) {
        var idx = this[groupType].addedList.indexOf(id);
        if (idx > -1) {
          this[groupType].addedList.splice(idx, 1);
        }
      }));
      this[groupType].addedNum = this[groupType].addedList.length;
      this[groupType + 'NumGenomes'].set('value', Number(this[groupType].addedNum));
    },

    onAddInGroupGenome: function () {
      var groupType = 'inGroup';
      this.onAddGenome(groupType);
    },


    onAddGenome: function (groupType) {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      lrec.groupType = groupType;
      var chkPassed = this.ingestAttachPoints(this[groupType].genomeToAttachPt, lrec);
      // console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);

      if (chkPassed && this[groupType].addedNum < this[groupType].maxGenomes) {
        var newGenomeIds = [lrec[this[groupType].genomeToAttachPt]];
        var tr = this[groupType + 'GenomeTable'].insertRow(0);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName(groupType) + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this[groupType].addedNum < this.startingRows) {
          this[groupType + 'GenomeTable'].deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
          domConstruct.destroy(tr);
          this.decreaseGenome(groupType, newGenomeIds);
          if (this[groupType].addedNum < this.startingRows) {
            var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        lrec.handle = handle;
        this.selectedTR.push(lrec);
        this.increaseGenome(groupType, newGenomeIds);
      }
      // console.log(lrec);
    },

    onAddInGroupGenomeGroup: function () {
      var groupType = 'inGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddGenomeGroup: function (groupType) {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      lrec.groupType = groupType;
      var chkPassed = this.ingestAttachPoints(this[groupType].genomeGroupToAttachPt, lrec);
      // console.log("this[groupType].genomeGroupToAttachPt = " + this[groupType].genomeGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      var path = lrec[this[groupType].genomeGroupToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            var newGenomeIds =  res.data.id_list.genome_id;
          }
        }
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this[groupType].addedNum + newGenomeIds.length;
        if (count > this[groupType].maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this[groupType].maxGenomes + ' genomes';
          msg += ' in ' + groupType[0].toUpperCase() + groupType.substring(1).toLowerCase();
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        // console.log("newGenomeIds = ", newGenomeIds);
        if (chkPassed && this[groupType].addedNum < this[groupType].maxGenomes
          && newGenomeIds.length > 0
          && this[groupType].addedNum + newGenomeIds.length <= this[groupType].maxGenomes) {
          var tr = this[groupType + 'GenomeTable'].insertRow(0);
          lrec.row = tr;
          var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeGroupName(groupType, newGenomeIds) + '</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
          if (this[groupType].addedNum < this.startingRows) {
            this[groupType + 'GenomeTable'].deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            // console.log("Delete Row");
            domConstruct.destroy(tr);
            this.decreaseGenome(groupType, newGenomeIds);
            if (this[groupType].addedNum < this.startingRows) {
              var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          lrec.handle = handle;
          this.selectedTR.push(lrec);
          this.increaseGenome(groupType, newGenomeIds);
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
        // console.log("values: ", values);
        if (values.in_genome_ids.length >= 3 && values.out_genome_ids.length >= 1) {
          domClass.add(this.domNode, 'Working');
          domClass.remove(this.domNode, 'Error');
          domClass.remove(this.domNode, 'Submitted');

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
          window.App.api.service('AppService.start_app', [this.applicationName, values]).then(function (results) {
            console.log('Job Submission Results: ', results);
            domClass.remove(_self.domNode, 'Working');
            domClass.add(_self.domNode, 'Submitted');
            _self.submitButton.set('disabled', false);
            registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
              obj.reset();
            });
          }, function (err) {
            console.log('Error:', err);
            domClass.remove(_self.domNode, 'Working');
            domClass.add(_self.domNode, 'Error');
            _self.errorMessage.innerHTML = err;
          });
        } else {
          domClass.add(this.domNode, 'Error');
          console.log('Form is incomplete');
        }

      } else {
        domClass.add(this.domNode, 'Error');
        console.log('Form is incomplete');
      }
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
      this.selectedTR.forEach(lang.hitch(this, function (lrec) {
        domConstruct.destroy(lrec.row);
        lrec.handle.remove();
        var groupType = lrec.groupType;
        var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
      }));
      this.selectedTR = [];
      this.inGroup.addedList = [];
      this.inGroup.addedNum = 0;
    },

    getValues: function () {
      var ptb_values = {};
      var values = this.inherited(arguments);
      // remove duplicate genomes
      var inGroupGenomesFiltered = [];
      this.inGroup.addedList.forEach(function (id) {
        if (inGroupGenomesFiltered.indexOf(id)  == -1) {
          inGroupGenomesFiltered.push(id);
        }
      });

      ptb_values.in_genome_ids = inGroupGenomesFiltered;
      ptb_values.output_path = values.output_path;
      ptb_values.output_file = values.output_file;
      ptb_values.full_tree_method = values.full_tree_method;
      ptb_values.refinement = values.refinement;

      return ptb_values;
    }

  });
});
