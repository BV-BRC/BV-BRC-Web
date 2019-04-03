define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/PhylogeneticTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/domReady!', 'dojo/query', 'dojo/dom', 'dojo/dom-style',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  '../../WorkspaceManager', 'dojo/when'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, domReady, query, dom, domStyle,
  popup, TooltipDialog, Dialog,
  WorkspaceManager, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'CodonTree',
    requireAuth: true,
    applicationLabel: 'Phylogenetic Tree Building',
    applicationDescription: 'The Phylogenetic Tree Building Service enables construction of custom phylogenetic trees for user-selected genomes.',
    applicationHelp: 'user_guides/services/phylogenetic_tree_building_service.html',
    tutorialLink: 'tutorial/phylogenetic_tree_building/tree_building.html',
    pageTitle: 'Phylogenetic Tree Building',
    defaultPath: '',
    startingRows: 9,

    constructor: function () {
      this._selfSet = true;
      this.inGroup = {};
      this.inGroup.addedList = []; // list of genome id, duplicate is allowed
      this.inGroup.addedNum = 0;
      this.inGroup.genomeToAttachPt = ['in_genome_id'];
      this.inGroup.genomeGroupToAttachPt = ['in_genomes_genomegroup'];
      this.inGroup.maxGenomes = 100;
      this.outGroup = {};
      this.outGroup.addedList = [];
      this.outGroup.addedNum = 0;
      this.outGroup.genomeToAttachPt = ['out_genome_id'];
      this.outGroup.genomeGroupToAttachPt = ['out_genomes_genomegroup'];
      this.outGroup.maxGenomes = 5;
      this.codonGroup = {};
      this.codonGroup.addedList = [];
      this.codonGroup.addedNum = 0;
      this.codonGroup.genomeToAttachPt = ['codon_genome_id'];
      this.codonGroup.genomeGroupToAttachPt = ['codon_genomes_genomegroup'];
      this.codonGroup.maxGenomes = 200;
      this.selectedTR = []; // list of selected TR for ingroup and outgroup, used in onReset()
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

      this.emptyTable(this.inGroupGenomeTable, this.startingRows);
      this.emptyTable(this.outGroupGenomeTable, this.startingRows);
      this.emptyTable(this.codonGroupGenomeTable, this.startingRows);
      this.inGroupNumGenomes.startup();
      this.outGroupNumGenomes.startup();
      this.codonGroupNumGenomes.startup();
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
        else if (attachname == 'codon_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var attachType = 'genomes_genomegroup';
          var duplicate = this.checkDuplicate(cur_value, 'codon', attachType);
          success *= duplicate;
        }
        else if (attachname == 'codon_genome_id') {
          cur_value = this[attachname].value;
          var attachType = 'genome_id';
          var duplicate = this.checkDuplicate(cur_value, 'codon', attachType);
          success *= duplicate;
        }
        else {
          cur_value = this[attachname].value;
        }

        // console.log('cur_value=' + cur_value);

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

    onAddOutGroupGenome: function () {
      var groupType = 'outGroup';
      this.onAddGenome(groupType);
    },

    onAddCodonGroupGenome: function () {
      var groupType = 'codonGroup';
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
        // added info icon to show all genome ids in the genome group
        var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
        var ihandle = new TooltipDialog({
          content: 'genome id: ' + newGenomeIds[0],
          onMouseLeave: function () {
            popup.close(ihandle);
          }
        });
        on(tdinfo, 'mouseover', function () {
          popup.open({
            popup: ihandle,
            around: tdinfo
          });
        });
        on(tdinfo, 'mouseout', function () {
          popup.close(ihandle);
        });

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

    onAddOutGroupGenomeGroup: function () {
      var groupType = 'outGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddCodonGroupGenomeGroup: function () {
      var groupType = 'codonGroup';
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
      var loadingQueryString = '.loading-status-' + groupType;
      domStyle.set( query(loadingQueryString)[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            var newGenomeIds =  res.data.id_list.genome_id;
          }
        }
        domStyle.set( query(loadingQueryString)[0], 'display', 'none');
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this[groupType].addedNum + newGenomeIds.length;
        if (count > this[groupType].maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this[groupType].maxGenomes + ' genomes';
          // msg += ' in ' + groupType[0].toUpperCase() + groupType.substring(1).toLowerCase();
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        // console.log("newGenomeIds = ", newGenomeIds);
        if (chkPassed && newGenomeIds.length > 0
          && this[groupType].addedNum + newGenomeIds.length <= this[groupType].maxGenomes) {
          var tr = this[groupType + 'GenomeTable'].insertRow(0);
          lrec.row = tr;
          var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeGroupName(groupType, newGenomeIds) + '</div>';
          // added info icon to show all genome ids in the genome group
          if (newGenomeIds.length) {
            var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
            var ihandle = new TooltipDialog({
              content: 'click to see all genome id.',
              onMouseLeave: function () {
                popup.close(ihandle);
              }
            });
            var ihandle2 = new Dialog({
              title: 'Genome ID',
              content: newGenomeIds.join('</br>'),
              style: 'width: 125px; overflow-y: auto;'
            });
            on(tdinfo, 'mouseover', function () {
              popup.open({
                popup: ihandle,
                around: tdinfo
              });
            });
            on(tdinfo, 'mouseout', function () {
              popup.close(ihandle);
            });

            on(tdinfo, 'click', function () {
              ihandle2.show();
            });
          }
          else {
            var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
          }
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
      this.outGroup.addedList = [];
      this.outGroup.addedNum = 0;
    },

    getValues: function () {
      var return_values = {};
      var values = this.inherited(arguments);

      if (this.startWithPEPR.checked == true) {
        // remove duplicate genomes
        var inGroupGenomesFiltered = [];
        this.inGroup.addedList.forEach(function (id) {
          if (inGroupGenomesFiltered.indexOf(id)  == -1) {
            inGroupGenomesFiltered.push(id);
          }
        });
        var outGroupGenomesFiltered = [];
        this.outGroup.addedList.forEach(function (id) {
          if (outGroupGenomesFiltered.indexOf(id)  == -1) {
            outGroupGenomesFiltered.push(id);
          }
        });
        return_values.in_genome_ids = inGroupGenomesFiltered;
        return_values.out_genome_ids = outGroupGenomesFiltered;
        return_values.full_tree_method = values.full_tree_method;
        return_values.refinement = 'no';  // hard coded since it's removed from UI
      }
      else {
        // remove duplicate genomes
        var codonGenomesFiltered = [];
        this.codonGroup.addedList.forEach(function (id) {
          if (codonGenomesFiltered.indexOf(id)  == -1) {
            codonGenomesFiltered.push(id);
          }
        });
        return_values.genome_ids = codonGenomesFiltered;
        return_values.number_of_genes = values.number_of_genes;
        return_values.max_genomes_missing = values.max_genomes_missing;
        return_values.max_allowed_dups = values.max_allowed_dups;

      }

      return_values.output_path = values.output_path;
      return_values.output_file = values.output_file;

      return return_values;
    },

    checkParameterRequiredFields: function () {
      if (this.output_path.get('value') && this.output_nameWidget.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    onStartWithChange: function () {
      if (this.startWithCodonTree.checked == true) {
        this.applicationName = 'CodonTree';
        this.PEPRTable.style.display = 'none';
        this.PEPROtherInputs.style.display = 'none';
        this.codonOtherInputs.style.display = 'block';
        this.codonTreeTable.style.display = 'block';
        this.inGroupNumGenomes.constraints.min = 0;
        this.outGroupNumGenomes.constraints.min = 0;
        this.codonGroupNumGenomes.constraints.min = 4;
        this.checkParameterRequiredFields();
      }
      if (this.startWithPEPR.checked == true) {
        this.applicationName = 'PhylogeneticTree';
        this.PEPRTable.style.display = 'block';
        this.PEPROtherInputs.style.display = 'block';
        this.codonOtherInputs.style.display = 'none';
        this.codonTreeTable.style.display = 'none';
        this.inGroupNumGenomes.constraints.min = 3;
        this.outGroupNumGenomes.constraints.min = 1;
        this.codonGroupNumGenomes.constraints.min = 0;
        this.checkParameterRequiredFields();
      }
    }

  });
});
