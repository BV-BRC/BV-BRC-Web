define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/topic',
  'dojo/dom-class',
  'dojo/text!./templates/ComparativeSystems.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', 'dojo/NodeList-traverse', '../../WorkspaceManager',
  '../WorkspaceObjectSelector', '../../DataAPI'
], function (
  declare, WidgetBase, on, Topic,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, children, WorkspaceManager,
  WorkspaceObjectSelector, DataAPI
) {
  return declare([AppBase], {
    baseClass: 'ComparativeSystems',
    templateString: Template,
    requireAuth: true,
    applicationLabel: 'Comparative Systems',
    applicationDescription: 'The Comparative Systems Service allows comparison of protein families, pathways, and subsystems for user-selected genomes. ',
    videoLink: 'https://youtu.be/U0ahNJpebhs',
    appBaseURL: 'ComparativeSystems',
    applicationName: 'ComparativeSystems',
    applicationHelp: 'quick_references/services/comparative_systems.html',
    tutorialLink: 'tutorial/comparative_systems/comparative_systems.html',
    pageTitle: 'Comparative Systems Service | BV-BRC',
    libraryData: null,
    defaultPath: '',
    startingRows: 8,
    maxGenomes: 500,

    constructor: function () {
      this.addedLibs = 0;
      this.addedList = [];
      this.addedGenomes = 0;
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      var _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;

      for (var i = 0; i < this.startingRows; i++) {
        var tr = this.libsTable.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
      this.numlibs.startup();
      this._started = true;

      // activate genome group selector when user is logged in
      if (window.App.user) {
        var ggDom = query('div[name="genome_group"]')[0];

        this.genome_group = new WorkspaceObjectSelector();
        this.genome_group.set('type', ['genome_group']);
        this.genome_group.placeAt(ggDom, 'only');
      }

      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    increaseLib: function (rec) {
      this.addedList.push(rec);
      this.addedLibs = this.addedList.length;
      this.numlibs.set('value', Number(this.addedLibs));
    },

    decreaseLib: function (rec) {
      var idx = this.addedList.indexOf(rec);
      if (idx > -1) {
        this.addedList.splice(idx, 1);
      }
      this.addedList = this.addedList.filter(function (d) {
        return d !== undefined;
      });
      this.addedLibs = this.addedList.length;
      this.numlibs.set('value', Number(this.addedLibs));
    },

    formatName: function (name) {
      var maxName = 29;
      if (name.length > maxName) {
        name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return name;
    },

    onAddGenome: function () {
      var lrec = {};

      var label = this.genome.get('displayedValue');
      var genome_id = this.genome.get('value');
      lrec.label = label;
      lrec.genome_ids = [genome_id];
      lrec.type = 'genome';

      // console.log(lrec);

      var tr = this.libsTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

      td.libRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + '</div>';
      domConstruct.create('td', { innerHTML: '' }, tr);
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x'/>" }, tr);

      if (this.addedLibs < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        domConstruct.destroy(tr);
        this.decreaseLib(lrec);
        if (this.addedLibs < this.startingRows) {
          var ntr = this.libsTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
      }));
      this.increaseLib(lrec);
    },

    onAddGenomeGroup: function () {
      var lrec = {};

      var label = this.genome_group.searchBox.get('displayedValue');
      var paths = this.genome_group.searchBox.get('value');
      lrec.path = paths;
      lrec.label = label;
      lrec.type = 'genome_group';

      WorkspaceManager.getObjects(paths, false).then(lang.hitch(this, function (objs) {

        var genomeIdHash = {};
        objs.forEach(function (obj) {
          var data = JSON.parse(obj.data);
          data.id_list.genome_id.forEach(function (d) {
            if (!Object.prototype.hasOwnProperty.call(genomeIdHash, d)) {
              genomeIdHash[d] = true;
            }
          });
        });
        lrec.genome_ids = Object.keys(genomeIdHash);
        var count = lrec.genome_ids.length;

        console.log(lrec);

        var tr = this.libsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + ' (' + count + ' genomes)</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x'/>" }, tr);

        if (this.addedLibs < this.startingRows) {
          this.libsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseLib(lrec);
          if (this.addedLibs < this.startingRows) {
            var ntr = this.libsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseLib(lrec);
      }));
    },

    getValues: function () {
      var values = this.inherited(arguments);

      if (this.addedLibs === 0) return;

      console.log('addedList', this.addedList);
      console.log('addedLibs', this.addedLibs);
      // if(values['taxon_id'] !== ""){
      //   Topic.publish("/navigate", {href: "/view/Taxonomy/" + values['taxon_id'] + "#view_tab=pathways"});
      //   return;
      // }

      var genomeList = [];
      var genomeGroup = [];
      this.addedList.forEach(function (rec) {
        if (rec.type == 'genome') {
          genomeList.push(rec.genome_ids[0]);
        } else if (rec.type == 'genome_group') {
          genomeGroup.push(rec.path);
        }
      });

      console.log(values);
      console.log(genomeList);
      console.log(genomeGroup);

      // prepare submission values
      var submit_values = {
        'genome_ids': genomeList,
        'genome_groups': genomeGroup,
        'output_path': values.output_path,
        'output_file': values.output_file
      };

      console.log(submit_values);
      return submit_values;
    },

    intakeRerunForm: function () {
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.onAddGenomeRerun(job_data['genome_ids']);
            this.onAddGenomeGroupRerun(job_data['genome_groups']);
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    onAddGenomeRerun: function (genome_id_list) {
      if (genome_id_list.length == 0) {
        return;
      }
      var lrec = {};

      var query = 'in(genome_id,(' + genome_id_list.join(',') + '))';
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        res.items.forEach(lang.hitch(this, function (entry) {
          var label = entry.genome_name;
          var genome_id = entry.genome_id;
          lrec.label = label;
          lrec.genome_ids = [genome_id];
          lrec.type = 'genome';

          var tr = this.libsTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

          td.libRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + '</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x'/>" }, tr);

          if (this.addedLibs < this.startingRows) {
            this.libsTable.deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            domConstruct.destroy(tr);
            this.decreaseLib(lrec);
            if (this.addedLibs < this.startingRows) {
              var ntr = this.libsTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          this.increaseLib(lrec);
        }));
      }));
    },

    onAddGenomeGroupRerun: function (genome_group_list) {
      if (genome_group_list == 0) {
        return;
      }

      genome_group_list.forEach(lang.hitch(this, function (gg) {

        var lrec = {};

        var label = gg.split('/').reverse()[0];
        var paths = gg;
        lrec.path = paths;
        lrec.label = label;
        lrec.type = 'genome_group';

        WorkspaceManager.getObjects(paths, false).then(lang.hitch(this, function (objs) {

          var genomeIdHash = {};
          objs.forEach(function (obj) {
            var data = JSON.parse(obj.data);
            data.id_list.genome_id.forEach(function (d) {
              if (!Object.prototype.hasOwnProperty.call(genomeIdHash, d)) {
                genomeIdHash[d] = true;
              }
            });
          });
          lrec.genome_ids = Object.keys(genomeIdHash);
          var count = lrec.genome_ids.length;

          var tr = this.libsTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);

          td.libRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + ' (' + count + ' genomes)</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x'/>" }, tr);

          if (this.addedLibs < this.startingRows) {
            this.libsTable.deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            domConstruct.destroy(tr);
            this.decreaseLib(lrec);
            if (this.addedLibs < this.startingRows) {
              var ntr = this.libsTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          this.increaseLib(lrec);
        }));
      }));
    }
  });
});
