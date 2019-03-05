define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/CodonTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/query', 'dijit/Dialog', 'dojo/dom-style',
  '../../WorkspaceManager', 'dojo/when', 'dojo/request', '../SelectedTable'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, query, Dialog, domStyle,
  WorkspaceManager, when, request, SelectedTable
) {
  return declare([AppBase], {
    apiServiceUrl: window.App.dataAPI,
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'CodonTree',
    applicationHelp: 'user_guides/services/codon_tree_service.html',
    tutorialLink: 'tutorial/codon_tree/codon_tree.html',
    pageTitle: 'Codon Tree',
    requireAuth: true,
    applicationLabel: 'Codon Tree',
    applicationDescription: 'Computes a phylogenetic tree based on protein and DNA sequences of PGFams for a set of genomes.',
    startingRows: 1,

    constructor: function () {
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

      // initialize selected genome table
      var selectedTable = this.selectedTable = new SelectedTable({
        name: 'selectedGenomes',
        colNames: ['Name', 'ID'],
        colKeys: ['name', 'id']
      });
      domConstruct.place(selectedTable.domNode, this.genomeTable);

      // initialize optional selected genome table
      var optionalSelectedTable = this.optionalSelectedTable = new SelectedTable({
        name: 'optionalSelectedGenomes',
        colNames: ['Name', 'ID'],
        colKeys: ['name', 'id']
      });
      domConstruct.place(optionalSelectedTable.domNode, this.optionalGenomeTable);

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

      this.optionalGenomesRow.turnedOn = (this.optionalGenomesRow.style.display != 'none');
      on(this.optionalGenomes, 'click', lang.hitch(this, function () {
        this.optionalGenomesRow.turnedOn = (this.optionalGenomesRow.style.display != 'none');
        if (!this.optionalGenomesRow.turnedOn) {
          this.optionalGenomesRow.turnedOn = true;
          this.optionalGenomesRow.style.display = 'block';
          this.optionalGenomesIcon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.optionalGenomesRow.turnedOn = false;
          this.optionalGenomesRow.style.display = 'none';
          this.optionalGenomesIcon.className = 'fa icon-caret-down fa-1';
        }
      }));
      this._started = true;
    },


    validate: function () {
      var self = this;

      var isValid;

      if (self.selectedTable.getRows().length &&
        self.output_path.value &&
        self.output_file.value) {
        isValid = true;
      }

      if (isValid) {
        self.submitButton.set('disabled', false);
      } else {
        self.submitButton.set('disabled', true);
      }

      return isValid;
    },


    onAddGenome: function () {
      this.addGenome();
    },


    // adds currently selected genome, or provided genome
    addGenome: function (optional = false) {
      var self = this;
      var genomeSelector = null;
      var selectedTable = null;

      if (!optional) {
        genomeSelector = self.genomeSelector;
        selectedTable = self.selectedTable;
      }
      else {
        genomeSelector = self.optionalGenomeSelector;
        selectedTable = self.optionalSelectedTable;
      }

      var id = genomeSelector.value,
        name = genomeSelector.get('displayedValue');

      if (!id) return;

      var genomeInfo = {
        id: id,
        name: name
      };

      selectedTable.addRow(genomeInfo);
    },


    onAddGenomeGroup: function () {
      this.addGenomeGroup();
    },


    addGenomeGroup: function (optional = false) {
      var self = this;
      var path,
        selectedTable = null;

      if (!optional) {
        path = self.genomeGroupSelector.value;
        selectedTable = self.selectedTable;
      }
      else {
        path = self.optionalGenomeGroupSelector.value;
        selectedTable = self.optionalSelectedTable;
      }

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {

        var data = typeof res.data == 'string' ? JSON.parse(res.data) : res.data;
        var genomeIDs =  data.id_list.genome_id;

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {
          genomeInfos.forEach(function (info) {
            selectedTable.addRow(info);
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

    onAddOptionalGenome: function () {
      var optional = true;
      this.addGenome(optional);
    },

    onAddOptionalGenomeGroup: function () {
      var optional = true;
      this.addGenomeGroup(optional);
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

        // this could be moved to app base
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

      this.selectedTable.clear();
      this.optionalSelectedTable.clear();
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var obj = Object.assign({}, values);

      // ignore unneeded values
      delete obj.genomeGroupSelector;
      delete obj.genomeSelector;
      delete obj.optionalGenomeGroupSelector;

      // get the ids from table selection
      var genomeIDs = this.selectedTable.getRows().map(function (obj) { return obj.id; });

      obj.genome_ids = genomeIDs;
      obj.output_path = values.output_path;
      obj.output_file = values.output_file;
      if (this.optionalSelectedTable.getRows().length > 0) {
        var optionalGenomeIDs = this.optionalSelectedTable.getRows().map(function (obj) { return obj.id; });
        obj.optional_genome_ids = optionalGenomeIDs;
      }
      return obj;
    }
  });

});
