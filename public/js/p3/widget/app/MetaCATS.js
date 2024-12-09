define([
  'dojo/_base/declare', 'dojo/on', 'dojo/topic',
  'dojo/text!./templates/MetaCATS.html', './AppBase', 'dojo/dom-construct', 'dojo/_base/lang',
  'dojo/store/Memory', 'dojo/domReady!',
  'dojo/query', '../MetaCATSGrid', '../../store/MetaCATSStore', '../../DataAPI', '../../WorkspaceManager'
], function (
  declare, on, Topic,
  Template, AppBase, domConstruct, lang,
  Memory, domready,
  query, MetaCATSGrid, MetaCATSStore, DataAPI, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'AppBase MetaCATS',
    templateString: Template,
    applicationName: 'MetaCATS',
    requireAuth: true,
    applicationLabel: 'Metadata-driven Comparative Analysis Tool (Meta-CATS)',
    applicationDescription: 'The Meta-CATS tool looks for positions that significantly differ between user-defined groups of sequences. However, biological biases due to covariation, codon biases, and differences in genotype, geography, time of isolation, or others may affect the robustness of the underlying statistical assumptions.',
    applicationHelp: 'quick_references/services/metacats.html',
    tutorialLink: 'tutorial/metacats/metacats.html',
    videoLink: '',
    pageTitle: 'MetaCATS Service | BV-BRC',
    appBaseURL: 'MetaCATS',
    startingRows: 10,
    maxGroups: 10,
    minGroups: 2,
    autoGroupCount: 0,
    yearRangeStore: '',
    defaultPath: '',

    constructor: function () {
      this._selfSet = true;
      this.addedGroups = 0;
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.userGenomeList = [];
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
      this.emptyTable(this.groupsTable, this.startingRows);
      this.numgenomes.startup();
      this.onInputTypeChange();
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

    onInputTypeChange: function () {
      if (this.input_groups.checked == true) {
        this.feature_groups_table.style.display = 'table';
        this.alignment_files_table.style.display = 'none';
        this.auto_grouping_table.style.display = 'none';
      }
      else if (this.input_files.checked == true) {
        this.feature_groups_table.style.display = 'none';
        this.alignment_files_table.style.display = 'table';
        this.auto_grouping_table.style.display = 'none';
      }
      else if (this.input_auto.checked == true) {
        this.feature_groups_table.style.display = 'none';
        this.alignment_files_table.style.display = 'none';
        this.auto_grouping_table.style.display = 'table';
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        if (attachname == 'user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;
          var compGenomeList = query('.genomedata');
          var genomeIds = [];
          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_featuregroup);
          });
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        } else {
          cur_value = this[attachname].value;
        }
        if (typeof (cur_value) == 'string') {
          target[attachname] = cur_value.trim();
        }
        else {
          target[attachname] = cur_value;
        }
        this[attachname]._set('state', '');
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

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    validate: function () {
      var ans = this.inherited(arguments);
      if (ans) {
        var p_value = parseFloat(this['p_value'].value);
        if (!(p_value && (p_value <= 1 && p_value > 0))) {
          ans = false;
        }
      }
      if (ans) {
        if (this.input_groups.checked == true) {
          ans = this.numgenomes >= this.minGroups && this.numgenomes <= this.maxGroups;
        } else if (this.input_files.checked == true) {
          if (!(this['alignment_file'].value && this['group_file'].value)) {
            ans = false;
          }
        } else if (this.input_auto.checked == true) {
          ans = this.autoGroupCount >= this.minGroups && this.autoGroupCount <= this.maxGroups;
        }
      }
      if (!ans) {
        this.submitButton.set('disabled', true);
      }
      return ans;
    },

    getNumberGroups: function () {
      const groups = new Set();
      const rows = this.grid.store.query(function (object) {
        return true;
      });
      var exist = false;
      for (var i = 0; i < rows.length; i++) {
        const row = rows[i];
        groups.add(row.group);
        exist = true;
      }
      this.autoGroupCount = groups.size;
      var ans = this.autoGroupCount >= this.minGroups && this.autoGroupCount <= this.maxGroups;
      if (!ans) {
        this.num_auto_groups.style.color = 'red';
      } else {
        this.num_auto_groups.style.color = 'black';
      }
      if (exist) {
        this.num_auto_groups.innerHTML = 'Max groups 10. Current ' + this.autoGroupCount + ' groups.';
      } else {
        this.num_auto_groups.innerHTML = '';
      }
      this.validate();
      return groups.size;
    },

    makeFeatureGroupName: function () {
      var name = this.user_genomes_featuregroup.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    getValues: function () {
      var values = this.inherited(arguments);
      values.p_value = parseFloat(this['p_value'].value);
      delete values.user_genomes_featuregroup;
      delete values.auto_feature_group;
      delete values.metadata_group;
      delete values.name_list;
      values.alphabet = 'na';
      if (this.input_groups.checked == true) {
        values.input_type = 'groups';
        delete values.year_ranges;
        delete values.alignment_file;
        delete values.group_file;
        delete values.metadata_group;
        delete values.auto_alphabet;
        if (values.group_alphabet == 'protein') {
          values.alphabet = 'aa';
        }
        delete values.group_alphabet;
        var compGenomeList = query('.genomedata');
        var userGroups = [];
        compGenomeList.forEach(function (item) {
          if (item.genomeRecord.user_genomes_featuregroup) {
            userGroups.push(item.genomeRecord.user_genomes_featuregroup);
          }
        });
        values.groups = userGroups;
      } else if (this.input_files.checked == true) {
        values.input_type = 'files';
        delete values.year_ranges;
        delete values.group_alphabet;
        delete values.auto_alphabet;
        delete values.metadata_group;
        var alignment_type = null;
        if (this['alignment_file'].searchBox.onChange.target.item) {
          alignment_type = this['alignment_file'].searchBox.onChange.target.item.type;
        }
        if (alignment_type.includes('protein')) {
          values.alphabet = 'aa';
        }
        delete values.group_alphabet;
      } else if (this.input_auto.checked == true) {
        values.input_type = 'auto';
        values.metadata_group = this['metadata_group'].value;
        delete values.alignment_file;
        delete values.group_file;
        delete values.group_alphabet;
        if (values.auto_alphabet == 'protein') {
          values.alphabet = 'aa';
        }
        delete values.auto_alphabet;
        const rows = this.grid.store.query(function (object) {
          return true;
        });
        const auto_groups = [];
        rows.forEach(function (row) {
          auto_groups.push({
            id: row.patric_id,
            metadata: row.metadata,
            grp: row.group,
            g_id: row.genome_id
          });
        });
        values.auto_groups = auto_groups;
      } else {
        console.log('Incorrect input.');
      }
      return values;
    },

    controlYear: function () {
      this.validate();
      if (this.metadata_group.value == 'collection_year') {
        query('.year_range_div').style('visibility', 'visible');
        this.year_ranges.set('value', this.yearRangeStore);
        this.yearRangeStore = '';
      } else {
        query('.year_range_div').style('visibility', 'hidden');
        if (this.yearRangeStore == '') {
          this.yearRangeStore = this.year_ranges.value;
        }
        this.year_ranges.set('value', '');
      }
    },

    getRanges: function () {
      var year_ranges = this.year_ranges.value.replace(/\s+/g, '');
      var ans = []
      if (year_ranges) {
        year_ranges.split(',').forEach(function (item) {
          ans.push(item.split('-').map(function (thing) {
            return parseInt(thing);
          }));
        });
      }
      return ans;
    },
    onAddAutoGroup: function () {
      query('.auto_feature_button').style('visibility', 'hidden');
      var self = this;
      var my_group = this.auto_feature_group.value;
      var metadata_value = this.metadata_group.value;
      this.metadata_group.set('disabled', true);
      DataAPI.queryGenomeFeatures('in(feature_id,FeatureGroup(' + encodeURIComponent(my_group) + '))', { 'limit' : 1000 })
        .then((result) => {
          const genome_map = new Map();
          result.items.forEach(function (sel) {
            if (genome_map.has(sel.genome_id)) {
              genome_map.get(sel.genome_id).push(sel.patric_id);
            } else {
              genome_map.set(sel.genome_id, [sel.patric_id]);
            }
          });
          return genome_map;
        }).catch(error => { console.log('Genome feature query failed.'); })
        .then((genome_map) => {
          DataAPI.queryGenomes(`in(genome_id,(${Array.from(genome_map.keys()).join(',')}))`, { 'limit' : 1000 })
            .then((genome_results) => {
              var group_names = new Set();
              var ranges = [];
              var year_groups = [];
              if (metadata_value == 'collection_year') {
                ranges = self.getRanges();
                if (ranges.length > 0) {
                  // Process the first range
                  if (ranges[0].length === 1) {
                    year_groups.push('<=' + ranges[0][0]); // Single year
                  } else {
                    year_groups.push(ranges[0][0] + '-' + ranges[0][1]); // Range: start-end
                  }

                  // Process middle ranges
                  for (let i = 1; i < ranges.length - 1; i++) {
                    let range = ranges[i];
                    if (range.length === 1) {
                      year_groups.push('' + range[0]); // Single year
                    } else {
                      year_groups.push(range[0] + '-' + range[1]); // Range: start-end
                    }
                  }

                  // Process the last range
                  if (ranges.length > 1) {
                    let last = ranges[ranges.length - 1];
                    if (last.length === 1) {
                      year_groups.push('>=' + last[0]); // Single year
                    } else {
                      year_groups.push(last[0] + '-' + last[1]); // Range: start-end
                    }
                  }

                  group_names = new Set(year_groups);
                }
              }

              genome_results.items.forEach(function (genome) {
                const m_value = genome[metadata_value] === undefined ? '' : genome[metadata_value];
                var g_value = m_value;
                // Parse the year ranges.
                if (metadata_value != 'collection_year' || ranges.length == 0) {
                  group_names.add(m_value.toString());
                } else if (metadata_value == 'collection_year') {
                  if (m_value) {
                    // Loop through the year_groups to find where m_value fits
                    for (const group of year_groups) {
                      if (group.indexOf('-') !== -1) { // Handle range like '2014-2016'
                        let [start_year, end_year] = group.split('-').map(Number);
                        if (m_value >= start_year && m_value <= end_year) {
                          g_value = group;
                          break;
                        }
                      } else { // Handle single year like '<=2014' or '>=2014'
                        let year = Number(group.replace('<=', '').replace('>=', ''));
                        if ((group.startsWith('<=') && m_value <= year) ||
                          (group.startsWith('>=') && m_value >= year) ||
                          (m_value == year)) {
                          g_value = group;
                          break;
                        }
                      }
                    }

                    // Add the determined g_value to group_names
                    group_names.add(g_value);
                  } else {
                    group_names.add(m_value.toString());
                  }
                }
                var feature_ids = genome_map.get(genome.genome_id);
                feature_ids.forEach(function (feature_id) {
                  if (self.grid.store.query({ patric_id: feature_id }).length == 0) {
                    self.grid.store.put({
                      patric_id: feature_id,
                      metadata: m_value.toString(),
                      group: g_value.toString(),
                      genome_id: genome.genome_id,
                      genbank_accessions: genome.genbank_accessions,
                      strain: genome.strain
                    });
                  }
                });
              });
              Array.from(group_names).forEach(function (name) {
                self.name_store.put({ id: name.toString() });
              });
              self.grid.refresh();
              self.getNumberGroups();
              if (self.grid.store.data.length == 0) {
                this.metadata_group.set('disabled', false);
              }
            }).catch(error => {
              if (self.grid.store.data.length == 0) {
                this.metadata_group.set('disabled', false);
              }
              console.log('Genome query failed.');
            })
        })
        .finally(() => {
          query('.auto_feature_button').style('visibility', 'visible');
        });
    },

    deleteAutoRows: function () {
      for (var id in this.grid.selection) {
        if (id) {
          this.grid.store.remove(id);
        }
      }
      this.grid.refresh();
      this.getNumberGroups();
      if (this.grid.store.data.length == 0) {
        this.metadata_group.set('disabled', false);
        this.name_store.data = [];
      }
    },

    updateGroup: function () {
      if (this.grid.store.data.length == 0) {
        return;
      }
      const new_group = this.name_list.value;
      for (var id in this.grid.selection) {
        if (id) {
          const q = this.grid.store.query({ patric_id: id });
          q[0].group = new_group;
          this.grid.store.put(q[0]);
        }
      }
      this.grid.refresh();
      this.name_store.put({ id: new_group });
      this.getNumberGroups();
    },

    onAddFeatureGroup: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      if (chkPassed && this.addedGroups < this.maxGroups) {
        var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
        if (!newGenomeIds[0]) {
          return;
        }
        var tr = this.groupsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGroups < this.startingRows) {
          this.groupsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGroups < this.startingRows) {
            var ntr = this.groupsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }
    },

    increaseGenome: function (genomeType, newGenomeIds) {
      this.addedGroups = this.addedGroups + 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    decreaseGenome: function () {
      this.addedGroups = this.addedGroups - 1;
      this.numgenomes.set('value', Number(this.addedGroups));
      this.validate();
    },

    clearStore: function () {
      this.grid.store.data = [];
      this.grid.refresh();
      this.name_store.data = [];
      this.metadata_group.set('disabled', false);
      this.getNumberGroups();
    },

    onReset: function (evt) {
      this.inherited(arguments);
      for (var i = 0; i < this.addedGroups; i++) {
        this.groupsTable.deleteRow(0);
      }
      this.clearStore();
      this.emptyTable(this.groupsTable, this.addedGroups);
      this.addedGroups = 0;
      this.numgenomes.set('value', Number(this.addedGroups));
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
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.setInputFormFill(job_data);
            this.setParams(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setParams: function (job_data) {
      if (Object.keys(job_data).includes('p_value')) {
        this.p_value.set('value', job_data['p_value']);
      }
    },

    setInputFormFill: function (job_data) {
      if (job_data['input_type'] == 'files') {
        this.input_auto.set('checked', false);
        this.input_groups.set('checked', false);
        this.input_files.set('checked', true);
        // add files
        this.alignment_file.set('value', job_data['alignment_file']);
        this.group_file.set('value', job_data['group_file']);
      } else if (job_data['input_type'] == 'groups') {
        this.input_auto.set('checked', false);
        this.input_files.set('checked', false);
        this.input_groups.set('checked', true);
        this.addFeatureGroupFormFill(job_data);
        this.setAlphabetFormFill(job_data, 'group');
      } else { // auto
        this.input_files.set('checked', false);
        this.input_groups.set('checked', false);
        this.input_auto.set('checked', true);
        this.setAlphabetFormFill(job_data, 'auto');
        this.addAutoGroupFormFill(job_data);
      }
    },

    addFeatureGroupFormFill: function (job_data) {
      job_data['groups'].forEach(function (group) {
        var lrec = {};
        lrec['user_genomes_featuregroup'] = group;
        var tr = this.groupsTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.genDisplayName(group) + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGroups < this.startingRows) {
          this.groupsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGroups < this.startingRows) {
            var ntr = this.groupsTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }, this);
    },

    genDisplayName: function (name) {
      var display_name = name;
      var maxName = 72;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    setAlphabetFormFill: function (job_data, input_type) {
      if (job_data['alphabet'] == 'na') { // DNA
        if (input_type == 'group') {
          this.protein.set('checked', false);
          this.dna.set('checked', true);
        } else {
          this.auto_protein.set('checked', false);
          this.auto_dna.set('checked', true);
        }
      } else { // protein
        if (input_type == 'group') {
          this.dna.set('checked', false);
          this.protein.set('checked', true);
        } else {
          this.auto_dna.set('checked', false);
          this.auto_protein.set('checked', true);
        }
      }
    },

    addAutoGroupFormFill: function (job_data) {
      var self = this;
      var auto_groups = job_data['auto_groups'];
      if (Object.keys(job_data).includes('metadata_group')) {
        this.metadata_group.set('value', job_data['metadata_group']);
      }
      auto_groups.forEach(function (group) {
        if (self.grid.store.query({ patric_id: group['id'] }).length == 0) {
          self.grid.store.put({
            patric_id: group['id'],
            metadata: group['metadata'],
            group: group['grp'],
            genome_id: group['g_id']
          });
        }
      }, self);
      self.grid.refresh();
      self.getNumberGroups();
    },

    getGenomeIDs: function (job_data) {
      var genome_ids = [];
      var auto_groups = job_data['auto_groups'];
      auto_groups.forEach(function (g) {
        var feature_id = group['id'];
        var genome_id = '.'.join(feature_id.split('|')[1].split('.').slice(0, 2));
        if (!genome_ids.has(genome_id)) {
          genome_ids.push(genome_id);
        }
      }, this);
      return genome_ids;
    }
  });
});
