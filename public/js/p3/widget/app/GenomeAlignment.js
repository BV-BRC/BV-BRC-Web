define([
  'dojo/_base/declare', 'dojo/on', 'dojo/topic', 'dojo/dom-class',
  'dojo/text!./templates/GenomeAlignment.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/query', 'dijit/Dialog', 'dojo/dom-style',
  '../../WorkspaceManager', 'dojo/when', 'dojo/request', '../SelectedTable'
], function (
  declare, on, Topic, domClass,
  Template, AppBase, domConstruct, registry,
  lang, query, Dialog, domStyle,
  WorkspaceManager, when, request, SelectedTable
) {
  return declare([AppBase], {
    apiServiceUrl: window.App.dataAPI,
    baseClass: 'App GenomeAlignment',
    templateString: Template,
    applicationName: 'GenomeAlignment',
    applicationHelp: 'quick_references/services/genome_alignment_service.html',
    tutorialLink: 'tutorial/genome_alignment/genome_alignment.html',
    videoLink: 'https://youtu.be/uvRzymyh_hM',
    pageTitle: 'Genome Alignment Service | BV-BRC',
    requireAuth: true,
    applicationLabel: 'Genome Alignment (Mauve)',
    applicationDescription: 'The Whole Genome Alignment Service aligns genomes using progressiveMauve.',
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
        colKeys: ['name', 'id'],
        label: {
          rowIndex: 1,
          colKey: 'name',
          format: function (obj) { return obj.name + ' <b>[Reference Genome]</b>'; }
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
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
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
    },

    onAddGenomeGroup: function () {
      var self = this;

      var path = self.genomeGroupSelector.value;

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {

        var data = typeof res.data == 'string' ? JSON.parse(res.data) : res.data;
        var genomeIDs =  data.id_list.genome_id;

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {
          genomeInfos.forEach(function (info) {
            self.addGenome(info);
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
          var res_filter = res.filter(function (obj) { return obj.genome_id == id; });
          if (res_filter.length == 0) {
            console.log('No genome_name found for genome_id: ', id);
            return null;
          }
          var name = res_filter[0].genome_name;

          return {
            id: id,
            name: name
          };
        });

        return info;
      });
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

      obj = this.checkBaseParameters(values, obj);

      return obj;
    },

    checkBaseParameters: function (values, obj) {
      // get the ids from table selection
      var genomeIDs = this.selectedTable.getRows().map(function (obj) { return obj.id; });
      // genome_ids and genome group
      obj.genome_ids = genomeIDs;
      this.target_genome_id = genomeIDs;
      // strategy/recipe
      obj.recipe = 'progressiveMauve';
      this.strategy = 'progressiveMauve';
      // output_folder
      obj.output_path = values.output_path;
      this.output_path = values.output_path;
      // output_name
      obj.output_file = values.output_file;
      this.output_name = values.output_file;

      return obj;
    },

    addGenomeList: function (job_data) {
      var self = this;
      when(self.getGenomeInfo(job_data.genome_ids), function (genomeInfos) {
        genomeInfos.forEach(function (info) {
          self.addGenome(info);
        });
        domStyle.set( query('.loading-status')[0], 'display', 'none');
      });
    },

    intakeRerunForm: function () {
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          try {
            var param_dict = { 'output_folder': 'output_path' };
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            if (job_data.hasOwnProperty('genome_group')) { // support for filling in the form based on genome groups
              this.genomeGroupSelector.set('value', job_data['genome_group']);
              this.genomeGroupButton.onClick();
            } else {
              this.addGenomeList(JSON.parse(sessionStorage.getItem(rerun_key)));
              this.serviceSpecific(JSON.parse(sessionStorage.getItem(rerun_key)));
            }
            this.form_flag = true;
          } catch (error) {
            console.log('Error during intakeRerunForm: ', error);
          } finally {
            sessionStorage.removeItem(rerun_key);
          }
        }
      }
    },

    serviceSpecific: function (job_data) {
      // TODO: Skipping setting seed weight
      var attach_list = ['maxGappedAlignerLength', 'maxBreakpointDistanceScale', 'conservationDistanceScale', 'weight', 'minScaledPenalty', 'hmmPGoHomologous', 'hmmPGoUnrelated'];
      attach_list.forEach(function (attach_point) {
        if (job_data[attach_point]) {
          this[attach_point].set('value', job_data[attach_point]);
        }
      }, this);
    }
  });

});
