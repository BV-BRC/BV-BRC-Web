define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/Mauve.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/query', 'dijit/Dialog', 'dojo/dom-style',
  '../../WorkspaceManager', 'dojo/when', 'dojo/request'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, query, Dialog, domStyle,
  WorkspaceManager, when, request
) {
  return declare([AppBase], {
    apiServiceUrl: window.App.dataAPI,
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'WholeGenomeAlignment',
    applicationHelp: 'user_guides/services/mauve.html',
    tutorialLink: 'tutorial/mauve/mauve.html',
    pageTitle: 'Genome Alignment',
    defaultPath: '',
    startingRows: 5,

    constructor: function () {
      this._selfSet = true;
      this.inGroup = {};
      this.selectedGenomeIDs = [];
      this.inGroup.addedNum = 0;
      this.inGroup.genomeToAttachPt = ['in_genome_id'];
      this.inGroup.genomeGroupToAttachPt = ['in_genomes_genomegroup'];
      this.maxGenomes = 100;

      this.referenceGenome = null;

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

      /* todo
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
      */

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

    // what does this actually do?!
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
        else if (attachname == 'in_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var attachType = 'genomes_genomegroup';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          success *= inDuplicate;
        }
        else if (attachname == 'in_genome_id') {
          cur_value = this[attachname].value;
          var attachType = 'genome_id';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          success *= inDuplicate;
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
      var maxLength = 50;
      return this.genDisplayName(name, maxLength);
    },

    makeGenomeGroupName: function (groupType, newGenomeIds) {
      var name = this[this[groupType].genomeGroupToAttachPt].searchBox.get('displayedValue');
      var maxLength = 50;
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
        this.selectedGenomeIDs.push(id);
      }));
      this[groupType + 'NumGenomes'].set('value', this.selectedGenomeIDs.length);
    },

    decreaseGenome: function (groupType, newGenomeIds) {
      newGenomeIds.forEach(lang.hitch(this, function (id) {
        var idx = this.selectedGenomeIDs.indexOf(id);
        if (idx > -1) {
          this.selectedGenomeIDs.splice(idx, 1);
        }
      }));
      this[groupType + 'NumGenomes'].set('value', Number(this.selectedGenomeIDs.length));

      if (this.selectedGenomeIDs.length === 0) {
        this.referenceGenome = null;
      }
    },

    onAddInGroupGenome: function () {
      this.onAddGenome();
    },


    onAddGenome: function (genomeInfo) {
      var self = this;
      var groupType = 'inGroup';

      var lrec = {};
      lrec.groupType = groupType;

      if (genomeInfo) {
        var chkPassed = true;
        var newGenomeIds = [genomeInfo.id];
      } else {
        var chkPassed = this.ingestAttachPoints(this[groupType].genomeToAttachPt, lrec);
        var newGenomeIds = [lrec[this[groupType].genomeToAttachPt]];
      }

      if (chkPassed && this.selectedGenomeIDs.length < this.maxGenomes) {
        var tr = this[groupType + 'GenomeTable'].insertRow(this.selectedGenomeIDs.length);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
        td.genomeRecord = lrec;

        if (!this.referenceGenome) {
          this.referenceGenome = genomeInfo.id || newGenomeIds[0];
        }

        // display genome name if provided, otherwise just use select boxes
        // mark first genome as reference
        if (genomeInfo) {
          td.innerHTML =
            "<div class='libraryrow'>" + genomeInfo.name +
              (this.referenceGenome == genomeInfo.id ? ' [reference]' : '') +
            '</div>';
        } else {
          td.innerHTML = "<div class='libraryrow'>" +
            this.makeGenomeName(groupType) +
            (this.referenceGenome == newGenomeIds[0] ? ' [reference]' : '') +
          '</div>';
        }

        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this[groupType].addedNum < this.startingRows) {
          this[groupType + 'GenomeTable'].deleteRow(-1);
        }
        var handle = on(td2, 'click', function (evt) {
          domConstruct.destroy(tr);
          self.decreaseGenome(groupType, newGenomeIds);
          if (self[groupType].addedNum < self.startingRows) {
            var ntr = self[groupType + 'GenomeTable'].insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        });

        lrec.handle = handle;
        this.selectedTR.push(lrec);
        this.increaseGenome(groupType, newGenomeIds);
      }

    },

    onAddInGroupGenomeGroup: function () {
      var groupType = 'inGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddGenomeGroup: function (groupType) {
      var self = this;

      var lrec = {};
      lrec.groupType = groupType;

      this.ingestAttachPoints(this[groupType].genomeGroupToAttachPt, lrec);
      var path = lrec[this[groupType].genomeGroupToAttachPt];

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }

        // ???
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            var genomeIDs =  res.data.id_list.genome_id;
          }
        }

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {
          genomeInfos.forEach(function (info) {
            self.onAddGenome(info);
          });

          domStyle.set( query('.loading-status')[0], 'display', 'none');
        });
      }));

    },

    // takes genome ids, returns prom with {id: xxxx.x, name: 'org_name}
    getGenomeInfo: function (genomeIDs) {
      var url = this.apiServiceUrl +
        'genome/?in(genome_id,(' + genomeIDs.join(',') + '))&select(genome_id,genome_name)';

      return when(request.get(url, {
        headers: {
          Accept: 'application/json',
          Authorization: window.App.authorizationToken
        },
        handleAs: 'json'
      }), function (res) {
        // order matters, organize into  {id: xxxx.x, name: 'org_name}
        var info = genomeIDs.map(function (id) {
          var name = res.filter(function (obj) { return obj.genome_id == id; })[0].genome_name;

          return {
            id: id,
            name: name
          };
        });

        return info;
      });


    },


    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

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
          console.log('Job Submission Resuglts: ', results);
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

      this.selectedGenomeIDs.forEach(function (id) {
        if (inGroupGenomesFiltered.indexOf(id)  == -1) {
          inGroupGenomesFiltered.push(id);
        }
      });

      ptb_values.genome_ids = inGroupGenomesFiltered;
      ptb_values.recipe = values.recipe;
      ptb_values.output_path = values.output_path;
      ptb_values.output_file = values.output_file;

      return ptb_values;
    }
  });

});
