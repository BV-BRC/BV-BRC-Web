define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog', './SelectionToGroup',
  'dijit/Dialog', '../WorkspaceManager', '../DataAPI', './RerunUtility', './app/AppBase', './app/GenomeAlignment',
  './app/Homology', './app/MSA', './app/PhylogeneticTree', './app/PrimerDesign', 'dojo/_base/Deferred',
  'dojox/widget/Standby'
], function (
  declare, on, domConstruct,
  lang, Mouse, Topic,
  popup, TooltipDialog, SelectionToGroup,
  Dialog, WorkspaceManager, DataAPI, RerunUtility, AppBase, GenomeAlignment,
  Homology, MSA, PhylogeneticTree, PrimerDesign, Deferred, Standby
) {

  return declare([TooltipDialog], {
    selection: null,
    label: '',
    genome_info: null,
    _setSelectionAttr: function (val) {
      this.selection = val;
    },
    timeout: function (val) {
      var _self = this;
      this._timer = setTimeout(function () {
        popup.close(_self);
      }, val || 2500);
    },

    onMouseEnter: function () {
      if (this._timer) {
        clearTimeout(this._timer);
      }

      this.inherited(arguments);
    },
    onMouseLeave: function () {
      popup.close(this);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      on(this.domNode, Mouse.enter, lang.hitch(this, 'onMouseEnter'));
      on(this.domNode, Mouse.leave, lang.hitch(this, 'onMouseLeave'));

      var _self = this;
      on(this.domNode, '.serviceActionTooltip:click', function (evt) {
        var service_selection = evt.target.attributes.rel.value;
        _self._selectService(service_selection, _self.data);
      });

      this._listServices(this.data.data_type, this.data.selection && this.data.selection.length > 1);
    },

    _listServices(data_context, multiple) {
      // debugger;
      var service_div = domConstruct.create('div', {});
      domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;', innerHTML: 'Services' }, service_div);
      switch (data_context) {
        // TODO: taxon overview case
        case 'feature':
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'Homology', innerHTML: 'Blast' }, service_div);
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'GeneTree', innerHTML: 'Gene Tree' }, service_div);
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'HASubtypeNumberingConversion', innerHTML: 'HA Subtype Numbering Conversion' }, service_div);
          if (multiple) {
            domConstruct.create('div', {'class': 'serviceActionTooltip', 'rel': 'MSA', innerHTML: 'MSA'}, service_div);
          }
          // if (!(this.context === 'grid_container')) {
          //   domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'primer_design', innerHTML: 'Primer Design' }, service_div);
          // }
          break;
        case 'genome':
          if (!multiple || this.context === 'grid_container') {
            domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'Homology', innerHTML: 'Blast' }, service_div);
          }
          if (this.context !== 'genome_overview') {
            domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'CodonTree', innerHTML: 'Bacterial Tree' }, service_div);
            domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'ViralTree', innerHTML: 'Viral Tree' }, service_div);
            domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'ViralMSA', innerHTML: 'Viral MSA' }, service_div);
          }
          // TODO: fix genome distance?
          // domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
          break;
        // TODO: case taxon overview
        default:
          console.log('invalid context: displaying placeholder');
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'genome_alignment', innerHTML: 'Genome Alignment' }, service_div);
          // domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'phylogenetic_tree', innerHTML: 'Phylogenetic Tree' }, service_div);
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'comparative_pathway', innerHTML: 'Comparative Pathway' }, service_div);
      }
      // this.set('content',service_div);
      this._setDivContent(service_div);
    },

    _contextGenomeOverview: function (service, data) {
      console.log('service = ', service);
      console.log('data = ', data);
      if (service === 'Homology') {
        // TODO: get rid of extra stuff??
        var extra = { 'showForm': true };
        this._callService(service, null, data, extra);
        popup.close(this);
      }
    },

    _contextFeatureOverivew: function (service, data) {
      DataAPI.getFeatureSequence(data.feature.na_sequence_md5).then(lang.hitch(this, function (result) {
        data.sequence = result.sequence;
        var extra = {};
        extra.showForm = true;
        this._callService(service, null, data, extra);
        popup.close(this);
      }));
    },

    _selectService: function (service, data) {
      var data_type = data.data_type;
      // Service, data type, submission context
      if (service === 'Homology') {
        if (data_type === 'feature') {
          var fs_div = domConstruct.create('div', {});
          domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;', innerHTML: 'Select Source' }, fs_div);
          domConstruct.create('div', { 'class': 'wsActionTooltip', 'context': 'blast_feature_source_query', 'source': 'query', innerHTML: 'Query'}, fs_div);
          domConstruct.create('div', { 'class': 'wsActionTooltip', 'context': 'blast_feature_source_query', 'source': 'source', innerHTML: 'Source'}, fs_div);
          if (this.context === 'grid_container') {
            // create group
            var feature_list = data.selection.map(x => x.feature_id).filter(x => x);
            on(this.domNode, '.wsActionTooltip:click', lang.hitch(this, function (evt) {
              if (evt.target.attributes.context.value === 'blast_feature_source_query') {
                var source = evt.target.attributes.source.value;
                // TODO: loadingMask isn't showing
                /*
                this.loadingMask = new Standby({
                  target: this.id,
                  image: '/public/js/p3/resources/images/spin.svg',
                  color: '#efefef'
                });
                this.addChild(this.loadingMask);
                this.loadingMask.startup();
                this.loadingMask.show();
                */
                this.saveTempGroup('feature', feature_list).then(lang.hitch(this, function (group_path) {
                  // this.loadingMask.hide();
                  // create data json
                  var job_data = {
                    'blast_program': 'blastn',
                    'db_type': 'fna'
                  };
                  if (source === 'query') {
                    job_data['input_source'] = 'feature_group';
                    job_data['input_feature_group'] = group_path;
                    job_data['db_precomputed_database'] = 'bacteria-archaea';
                  }
                  else { // source === 'database
                    job_data['db_precomputed_database'] = 'selFeatureGroup';
                    job_data['db_feature_group'] = group_path;
                  }
                  RerunUtility.rerun(JSON.stringify(job_data), 'Homology', window, Topic);
                }), lang.hitch(this, function (err) {
                  this.loadingMask.hide();
                  console.log('error during temporary group creationg: exiting');
                  console.log(err);
                  return false;
                }));
              }
            }));
          }
          if (this.context === 'workspace') {
            var feature_group = this.data.selection[0].path;
            on(this.domNode, '.wsActionTooltip:click', lang.hitch(this, function (evt) {
              if (evt.target.attributes.context.value === 'blast_feature_source_query') {
                var source = evt.target.attributes.source.value;
                var job_data = {
                  'blast_program': 'blastn',
                  'db_type': 'fna'
                };
                if (source === 'query') {
                  job_data['input_source'] = 'feature_group';
                  job_data['input_feature_group'] = feature_group;
                  job_data['db_precomputed_database'] = 'bacteria-archaea';
                } else {
                  job_data['db_precomputed_database'] = 'selFeatureGroup';
                  job_data['db_feature_group'] = feature_group;
                }
                RerunUtility.rerun(JSON.stringify(job_data), 'Homology', window, Topic);
              }
            }));
          }
          this._setDivContent(fs_div);
        }
        if (data_type === 'genome') {
          var job_data;
          if (this.context === 'genome_overview') {
            job_data = {
              'blast_program': 'blastn',
              'db_type': 'fna',
              'db_precomputed_database': 'selGenome',
              'db_genome_list': [this.data.genome.genome_id]
            }
          }
          if (this.context === 'grid_container') {
            var genome_list = data.selection.map(x => x.genome_id).filter(x => x);
            job_data = {
              'blast_program': 'blastn',
              'db_type': 'fna',
              'db_precomputed_database': 'selGenome',
              'db_genome_list': genome_list
            }
          }
          if (this.context === 'workspace') {
            job_data = {
              'blast_program': 'blastn',
              'db_type': 'fna',
              'db_precomputed_database': 'selGroup',
              'db_genome_group': this.data.selection[0].path
            };
          }
          RerunUtility.rerun(JSON.stringify(job_data), 'Homology', window, Topic)
        }
      }
      if (service === 'CodonTree') {
        // always genome data type
        var job_data;
        if (this.context === 'grid_container') {
          job_data = {
            'genome_ids': data.selection.map(x => x.genome_id)
          };
        }
        if (this.context === 'workspace') {
          // support single and multiple
          job_data = {
            'genome_groups': data.selection.map(x => x.path)
          };
        }
        RerunUtility.rerun(JSON.stringify(job_data), 'CodonTree', window, Topic);
      }
      if (service === 'ViralTree') {
        var job_data;
        // always genome data type
        // add tree_type to job data
        if (this.context === 'grid_container') {
          var genome_list = data.selection.map(x => x.genome_id);
          this.saveTempGroup('genome', genome_list).then(lang.hitch(this, function (group_path) {
            // create data json
            job_data = {
              'tree_type': 'viral_genome',
              'sequences': [
                { 'type': 'genome_group', 'filename': group_path }
              ]
            };
            RerunUtility.rerun(JSON.stringify(job_data), 'GeneTree', window, Topic);
          }), lang.hitch(this, function (err) {
            this.loadingMask.hide();
            console.log('error during temporary group creationg: exiting');
            console.log(err);
            return false;
          }));
        }
        // workspace context
        if (this.context === 'workspace') {
          job_data = {
            'tree_type': 'viral_genome',
            'sequences': []
          };
          data.selection.map(x => x.path).forEach(lang.hitch(this, function (path) {
            job_data['sequences'].push({ 'type': 'genome_group', 'filename': path });
          }));
          RerunUtility.rerun(JSON.stringify(job_data), 'GeneTree', window, Topic);
        }
      }
      if (service === 'ViralMSA') {
        var job_data;

        if (this.context === 'grid_container') {
          var genome_list = data.selection.map(x => x.genome_id);
          this.saveTempGroup('genome', genome_list).then(lang.hitch(this, function (group_path) {
            job_data = {
              'input_status': 'unaligned',
              'input_type': 'input_genomegroup',
              'select_genomegroup': [group_path],
              'ref_type': 'none',
              'aligner': 'Mafft',
              'fasta_keyboard_input': '',
              'alphabet': 'dna',
              'ref_string': ''
            };
            RerunUtility.rerun(JSON.stringify(job_data), 'MSA', window, Topic);
          }), lang.hitch(this, function (err) {
            this.loadingMask.hide();
            console.log('error during temporary group creationg: exiting');
            console.log(err);
            return false;
          }));
        }
        if (this.context === 'workspace') {
          job_data = {
            'input_status': 'unaligned',
            'input_type': 'input_genomegroup',
            'select_genomegroup': [data.selection[0].path],
            'ref_type': 'none',
            'aligner': 'Mafft',
            'fasta_keyboard_input': '',
            'alphabet': 'dna',
            'ref_string': ''
          };
          RerunUtility.rerun(JSON.stringify(job_data), 'MSA', window, Topic);
        }
      }
      if (service === 'GeneTree') {
        var job_data;
        // always features
        if (this.context === 'grid_container') {
          var feature_list = data.selection.map(x => x.feature_id);
          this.saveTempGroup('feature', feature_list).then(lang.hitch(this, function (group_path) {
            // create data json
            job_data = {
              'tree_type': 'gene',
              'sequences': [
                { 'type': 'feature_group', 'filename': group_path }
              ]
            };
            RerunUtility.rerun(JSON.stringify(job_data), 'GeneTree', window, Topic);
          }), lang.hitch(this, function (err) {
            this.loadingMask.hide();
            console.log('error during temporary group creationg: exiting');
            console.log(err);
            return false;
          }));
        }
        if (this.context === 'workspace') {
          job_data = {
            'tree_type': 'gene',
            'sequences': []
          };
          data.selection.map(x => x.path).forEach(lang.hitch(this, function (path) {
            job_data['sequences'].push({ 'type': 'feature_group', 'filename': path });
          }));
          RerunUtility.rerun(JSON.stringify(job_data), 'GeneTree', window, Topic);
        }
      }
      if (service === 'HASubtypeNumberingConversion') {
        var job_data;
        // always features
        if (this.context === 'grid_container') {
          var feature_list = data.selection.map(x => x.feature_id);
          this.saveTempGroup('feature', feature_list).then(lang.hitch(this, function (group_path) {
            // create data json
            job_data = {};
            job_data['input_source'] = 'feature_group';
            job_data['input_feature_group'] = group_path;
            RerunUtility.rerun(JSON.stringify(job_data), 'HASubtypeNumberingConversion', window, Topic);
          }), lang.hitch(this, function (err) {
            this.loadingMask.hide();
            console.log('error during temporary group creating: exiting');
            console.log(err);
            return false;
          }));
        } else if (this.context === 'workspace') {
          job_data = {};
          job_data['input_source'] = 'feature_group';
          job_data['input_feature_group'] = data.selection[0].path;
          RerunUtility.rerun(JSON.stringify(job_data), 'HASubtypeNumberingConversion', window, Topic);
        }
      }
      if (service === 'MSA') {
        var job_data;
        // always features
        if (this.context === 'grid_container') {
          var feature_list = data.selection.map(x => x.feature_id);
          this.saveTempGroup('feature', feature_list).then(lang.hitch(this, function (group_path) {
            // create data json
            job_data = {};
            job_data['input_type'] = 'input_group';
            job_data['feature_groups'] = [group_path];
            job_data['alphabet'] = 'dna';
            job_data['aligner'] = 'Muscle';
            RerunUtility.rerun(JSON.stringify(job_data), 'MSA', window, Topic);
          }), lang.hitch(this, function (err) {
            this.loadingMask.hide();
            console.log('error during temporary group creating: exiting');
            console.log(err);
            return false;
          }));
        }
      }
    },

    // save a temporary group to predefined locations
    saveTempGroup: function (type, id_list) {
      var def = new Deferred();
      const checkTEMP = function (tmp_path) {
        WorkspaceManager.createFolder(tmp_path).then(lang.hitch(this, function (tmp_record) {
          console.log('creating temporary group folder');
        }), lang.hitch(this, function (err) {
          console.log('temporary group folder already created');
        }));
      };
      var hidden_group_path = WorkspaceManager.getDefaultFolder() + '/home/._tmp_groups';
      var group_name;
      var group_type;
      var group_id;
      if (type === 'feature') {
        group_name = 'tmp_feature_group_' + Date.now();
        group_type = 'feature_group';
        group_id = 'feature_id';
      }
      else if (type === 'genome') {
        group_name = 'tmp_genome_group_' + Date.now();
        group_type = 'genome_group';
        group_id = 'genome_id';
      }
      else {
        console.log('group_type not known: not creating group');
        return null;
      }
      var group_path = hidden_group_path + '/' + group_name;
      checkTEMP(hidden_group_path);
      try {
        WorkspaceManager.createGroup(group_name, group_type, hidden_group_path, group_id, id_list).then(lang.hitch(this, function (res) {
          def.resolve(group_path);
        }), lang.hitch(this, function (err) {
          def.resolve(null);
        }));
      }
      catch (error) {
        console.log('error making temporary group: ', error);
        def.resolve(null);
      }
      return def;
    },

    // stores the json job and
    // TODO: change to store random thing
    _setJSONStorage: function (data) {
      var job_params = JSON.stringify(data);
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
        localStorage.removeItem('bvbrc_rerun_job');
      }
      localStorage.setItem('bvbrc_rerun_job', job_params);
    },

    _setLabelAttr: function (val) {
      this.label = val;
      if (this._started) {
        this.labelNode.innerHTML = val;
      }
    },

    // ssumes content was made using domConstruct.create
    _setDivContent: function (content) {
      domConstruct.create('div', { style: 'height:8px' }, content);
      this.set('content', content);
    }
  });

});
