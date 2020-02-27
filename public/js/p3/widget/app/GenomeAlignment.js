define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/GenomeAlignment.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
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
    applicationName: 'GenomeAlignment',
    applicationHelp: 'user_guides/services/genome_alignment_service.html',
    tutorialLink: 'tutorial/genome_alignment/genome_alignment.html',
    pageTitle: 'Genome Alignment',
    requireAuth: true,
    applicationLabel: 'Genome Alignment (Mauve)',
    applicationDescription: 'The Whole Genome Alignment Service aligns genomes using progressiveMauve.',
    startingRows: 1,
    maxGenomes: 20,

    constructor: function () {
    },

    startup: function () {
      var self = this;
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }

      this.inherited(arguments);

      self.defaultPath = WorkspaceManager.getDefaultFolder() || self.activeWorkspacePath;
      self.output_path.set('value', self.defaultPath);

      // initialize selected genome table
      var selectedTable = this.selectedTable = new SelectedTable({
        name: 'selectedGenomes',
        colNames: ['Name', 'ID'],
        colKeys: ['name', 'id'],
        label: {
          rowIndex: 1,
          colKey: 'name',
          format: function (obj) { return obj.name + ' <b>[Reference Genome]</b>'; }
        },
        onRemove: function () {
          self.checkGenomeCount();
        }
      });
      domConstruct.place(selectedTable.domNode, this.genomeTable);

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


    // listen for "manually set seed weight" toggle
    onSeedWeightSwitch: function () {
      var checked = !this.seedWeightSwitch.checked;
      this.seedWeightSwitch.checked = checked;
      domStyle.set( this.seedContainer, 'display', checked ? 'block' : 'none');
      this.seedWeight.set('disabled', !this.seedWeightSwitch.checked);
    },

    validate: function () {
      var self = this;

      var isValid;

      if (self.selectedTable.getRows().length &&
        self.output_path.value != '' &&
        self.output_file.value != '') {
        isValid = true;
      }

      if (isValid) {
        self.submitButton.set('disabled', false);
      } else {
        self.submitButton.set('disabled', true);
      }

      return isValid;
    },

    // called on event from dom
    onAddGenome: function (evt) {
      this.addGenome();
    },

    // adds currently selected genome, or provided genome
    addGenome: function (genomeInfo /* optional */) {
      var self = this;

      // if adding genome directly from object selector
      if (!genomeInfo) {
        var id = self.genomeSelector.value,
          name = self.genomeSelector.get('displayedValue');

        if (!id) return;

        var genomeInfo = {
          id: id,
          name: name
        };
      }

      self.selectedTable.addRow(genomeInfo);
      self.checkGenomeCount();
    },

    checkGenomeCount: function () {
      if (this.selectedTable.getRows().length >= this.maxGenomes) {
        this.addGenomeBtn.set('disabled', true);
        this.addGenomeGroupBtn.set('disabled', true);
      } else {
        this.addGenomeBtn.set('disabled', false);
        this.addGenomeGroupBtn.set('disabled', false);
      }
    },

    onAddGenomeGroup: function () {
      var self = this;

      var path = self.genomeGroupSelector.value;

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {

        var data = typeof res.data == 'string' ? JSON.parse(res.data) : res.data;
        var genomeIDs =  data.id_list.genome_id;

        var currentCount = self.selectedTable.getRows().length;
        var count = genomeIDs.length;
        if (currentCount + count >= self.maxGenomes) {
          var dlg = new Dialog({
            title: 'Too many genomes in this group',
            content: '<p>' +
              'The Genome Alignment Service is limited to ' + this.maxGenomes + ' genomes.<br>' +
              'This genome group contains ' + count + ' genome(s).' +
            '</p>'
          });
          dlg.startup();
          dlg.show();
          domStyle.set( query('.loading-status')[0], 'display', 'none');
          return;
        }

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {

          genomeInfos.forEach(function (info) {
            self.addGenome(info);
          });

          domStyle.set( query('.loading-status')[0], 'display', 'none');
        });
      }));
    },

    // takes genome ids, returns prom with {id: xxxx.x, name: 'org_name'}
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
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var obj = Object.assign({}, values);

      // ignore unneeded values
      delete obj.genomeGroupSelector;
      delete obj.genomeSelector;

      // if seedWeight isn't specified, let mauve figure it out
      if (!this.seedWeightSwitch.checked) obj.seedWeight = null;

      // get the ids from table selection
      var genomeIDs = this.selectedTable.getRows().map(function (obj) { return obj.id; });

      obj.genome_ids = genomeIDs;
      obj.recipe = 'progressiveMauve';
      obj.output_path = values.output_path;
      obj.output_file = values.output_file;

      return obj;
    }
  });

});
