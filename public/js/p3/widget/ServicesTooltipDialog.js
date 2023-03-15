define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog', './SelectionToGroup',
  'dijit/Dialog', '../WorkspaceManager', '../DataAPI', './RerunUtility', './app/AppBase', './app/GenomeAlignment',
  './app/Homology', './app/MSA', './app/PhylogeneticTree', './app/PrimerDesign'
], function (
  declare, on, domConstruct,
  lang, Mouse, Topic,
  popup, TooltipDialog, SelectionToGroup,
  Dialog, WorkspaceManager, DataAPI, RerunUtility, AppBase, GenomeAlignment,
  Homology, MSA, PhylogeneticTree, PrimerDesign
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
      on(this.domNode, '.wsActionTooltip:click', function (evt) {
        if (evt.target.attributes.context.value === 'blast_feature_source_query') {
          var source = evt.target.attributes.source.value;
          var service = 'Homology';
          _self.data.source = source;
          if (_self.context === 'feature_overview') {
            // TODO: setup protein/nucleotide selection
            console.log('not set up yet');
          }
          else if (_self.context === 'grid_container') {
            // _self._callService(service,group_path,data,extra);
            // TODO: call save temporary group or whatever, then call service with saved group
            _self.callService(service, )
          }
        }
      });
      on(this.domNode, '.serviceActionTooltip:click', function (evt) {
        var service_selection = evt.target.attributes.rel.value;
        // Based on service and number of selections, call Save Selection
        if (_self.context === 'grid_container') {
          _self._contextGridContainer(service_selection, _self.data);
        }
        else if (_self.context === 'genome_overview') {
          _self._contextGenomeOverview(service_selection, _self.data);
        }
        else if (_self.context === 'feature_overview') {
          _self._contextFeatureOverivew(service_selection, _self.data);
        }
        // TODO: context === 'taxon_overview'(?)
        // TODO: go through and add other contexts
      });
      // Data: context (feature or genome), data (dictionary), multiple

      this._getService(this.data.data_context);
    },

    _getService(data_context) {
      // debugger;
      var service_div = domConstruct.create('div', {});
      domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;', innerHTML: 'Services' }, service_div);
      switch (data_context) {
        case 'feature':
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'Homology', innerHTML: 'Blast' }, service_div);
          // domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'msa', innerHTML: 'MSA' }, service_div);
          if (!(this.context === 'grid_container')) {
            domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'primer_design', innerHTML: 'Primer Design' }, service_div);
          }
          // TODO: Maybe ID Mapper
          break;
        case 'genome':
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'Homology', innerHTML: 'Blast' }, service_div);
          // if (this.context === 'grid_container') {
          //  domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'phylogenetic_tree', innerHTML: 'Phylogenetic Tree' }, service_div);
          // }
          // TODO: fix genome distance?
          // domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
          break;
        case 'genome_group':
          domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'Homology', innerHTML: 'Blast' }, service_div);
          // domConstruct.create('div', { 'class': 'serviceActionTooltip', 'rel': 'phylogenetic_tree', innerHTML: 'Phylogenetic Tree' }, service_div);
          // TODO: fix genome distance?
          // domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'genome_distance', innerHTML: 'Similar Genome Finder' }, tData);
          break;
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

    // TODO: Add FeatureOverview table elements
    _contextGridContainer: function (service, data) {
      if (service === 'Homology') {
        // feature context
        //  - TODO(later): ask if min number to save as feature group
        //    - goes to different function
        //  - TODO: ask to save selection
        // TODO: genome context
        if (data.data_context === 'feature') {
          // TODO: min number to save?
          // this.checkSaveGroup(service);
          var fs_div = domConstruct.create('div', {});
          domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;', innerHTML: 'Select Source' }, fs_div);
          domConstruct.create('div', { 'class': 'wsActionTooltip', 'context': 'blast_feature_source_query', 'source': 'query', innerHTML: 'Query'}, fs_div);
          domConstruct.create('div', { 'class': 'wsActionTooltip', 'context': 'blast_feature_source_query', 'source': 'source', innerHTML: 'Source'}, fs_div);
          this.blast_data = data;
          this._setDivContent(fs_div);
        }
        else if (data.data_context === 'genome') {
          this._callService(service, null, data, null);
        }
        else if (data.data_context === 'genome_group') {
          this._callService(service, data.genome_group, data, null);
        }
      }
      else if (service === 'comparative_pathway') {
        console.log('comparative_pathway Not enabled');
      }
      else if (service === 'genome_alignment') {
        console.log('genome_alignment Not enabled');
      }
      else if (service === 'msa') {
        // feature context
        //  - TODO(later): ask if min number to save as feature group
        //    - goes to different function
        // TODO: genome context
        if (data.data_context === 'feature') {
          // TODO: min number to save?
          // this.checkSaveGroup(service);
        }
        else if (data.data_context === 'genome') {
          // TODO: min number to save/add services that only take one genome?
          //  - goes to different function
          this.checkSaveGroup(service);
        }
      }
      else if (service === 'phylogenetic_tree') {
        if (data.data_context === 'genome') {
          // TODO: min number to save/add services that only take one genome?
          //  - goes to different function
          this.checkSaveGroup(service);
        }
      }
      else if (service === 'primer_design') {
        console.log('primer_design Not enabled');
      }
      else {
        console.log('error: unidentified service name (', service, ')');
      }
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

    // extra parameters to enhance functionality:
    //  - required: showForm (ex: extra.showForm = true)
    _callService: function (service, group_path, data, extra) {
      // TODO: Here working on grid_container context, after saving group
      //  - Questions for each service to auto-fill form?
      // Services:
      // -  feature: blast, msa
      var params;
      var service_title;
      var service_content;
      if (data.data_context === 'feature') {
        // TODO: add gene_tree??
        if (service === 'Homology') {
          if (extra.querySource) {
            this._setupBlastParams(service, group_path, data.data_context, data, true); // check_source = true
          }
          else {
            // TODO: can't test grid_context until FeatureGroup selector widget works properly
            params = this._setupBlastParams(service, group_path, data.data_context, data, false); // check_source = false
            service_content = new Homology();
            service_title = 'BLAST';
          }
        }
        else if (service === 'msa') {
          if (this.context === 'feature_overview') {
            params = {};
            params['input_type'] = 'input_sequence';
            params['fasta_keyboard_input'] = '>' + data.feature.patric_id + '\n' + data.sequence;
          }
          else if (this.context === 'grid_container') {
            params = {};
            params['input_type'] = 'input_group';
            params['feature_groups'] = [group_path];
            // TODO: can put a dna/protein selection routine here but seems excessive
          }
          service_content = new MSA();
          service_title = 'Multiple Sequence Alignment';
        }
        else if (service === 'primer_design') {
          if (this.context === 'feature_overview') {
            params = {};
            params['input_type'] = 'sequence_text';
            params['SEQUENCE_ID'] = data.feature.patric_id;
            params['sequence_input'] = data.sequence;
            service_content = new PrimerDesign();
            service_title = 'Primer Design';
          }
        }
        else {
          console.log('service not recognized for data_context, and service: ', data.data_context, ', ', service);
          return;
        }
      }
      else if (data.data_context === 'genome') {
        if (service === 'Homology') {
          if (this.context === 'genome_overview') {
            params = this._setupBlastParams(service, null, data.data_context, data, false);
          }
          else if (this.data_context === 'genome_group') {
            params = this._setupBlastParams(service, group_path, data.data_context, data, false);
          }
          else { // genome list grid container
            params = this._setupBlastParams(service, null, data.data_context, data, false);
          }
          params = JSON.stringify(params);
          // service_content = new Homology();
          // service_title = 'BLAST';
        }
        else if ((service === 'phylogenetic_tree') && this.context === 'grid_container') {
          service_content = new PhylogeneticTree();
          service_title = 'Phylogenetic Tree';
        }
        else {
          console.log('service not recognized for data_context, and service: ', data.data_context, ', ', service);
          return;
        }
      }
      else if (data.data_context === 'genome_group') {
        if (service === 'Homology') {
          params = this._setupBlastParams(service, group_path, data.data_context, data, false);
        }
        params = JSON.stringify(params);
      }
      else {
        console.log('context not recognized: ', data.data_context);
        return;
      }
      RerunUtility.rerun(params, service, window, Topic);
      /*
      // skip adding parameters if null, either accidental or on purpose
      var _self = this;
      if (extra.showForm) {
        if (params) {
          this._setJSONStorage(params);
        }
        var d = new Dialog({
          title: service_title,
          content: service_content,
          onHide: function () {
            if (data.save_group) {
              _self._saveSelection(true, service, data);
            }
            service_content.destroy();
            d.destroy();
          }
        });
        d.show();
      }
      */
    },

    // TODO: add selection to params in the onclick funtion
    _setupBlastParams: function (service, group_path, context, data, check_source) {
      if (check_source) {
        var query_content = domConstruct.create('div', {});
        domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;', innerHTML: 'Select Source' }, query_content);
        domConstruct.create('div', {
          class: 'wsActionTooltip', 'rel': 'blast_feature_source_query', 'source': 'query', 'service': service, 'group_path': group_path, innerHTML: 'Query'
        }, query_content);
        domConstruct.create('div', {
          class: 'wsActionTooltip', 'rel': 'blast_feature_source_query', 'source': 'database', 'service': service, 'group_path': group_path, innerHTML: 'Database'
        }, query_content);
        // this.set('content',query_content);
        this._setDivContent(query_content);
        return;
      }
      var params = {};
      if (context === 'feature') {
        if (this.context === 'feature_overview') {
          // TODO: incorporate nucleotide/protein sequence selection
          params['blast_program'] = 'blastn';
          params['db_type'] = 'fna';
          params['input_source'] = 'fasta_data';
          params['input_fasta_data'] = '>' + data.feature.patric_id + '\n' + data.sequence;
          params['db_precomputed_database'] = 'bacteria-archaea';
        }
        else if (this.context === 'grid_container') {
          params['blast_program'] = 'blastn';
          params['db_type'] = 'fna';
          console.log('db_source=', data.source);
          if (data.source === 'query') {
            params['input_source'] = 'feature_group';
            params['input_feature_group'] = group_path;
            params['db_precomputed_database'] = 'bacteria-archaea';
          }
          else { // source === 'database
            params['db_precomputed_database'] = 'selFeatureGroup';
            params['db_feature_group'] = group_path;
          }
        }
        else {
          console.log('invalid BLAST parameter context: ', this.context);
          return null;
        }
      }
      // TODO: finish genomeGroup loading and such
      else if (context === 'genome') {
        if (this.context === 'genome_overview') {
          params['blast_program'] = 'blastn';
          params['db_type'] = 'fna';
          params['db_precomputed_database'] = 'selGenome';
          params['db_genome_list'] = [data.genome.genome_id];
        }
        if (this.context === 'grid_container') {
          params['blast_program'] = 'blastn';
          params['db_type'] = 'fna';
          params['db_precomputed_database'] = 'selGenome';
          params['db_genome_list'] = data.genome_list;
        }
      }
      else if (context === 'genome_group') {
        params['blast_program'] = 'blastn';
        params['db_type'] = 'fna';
        params['db_precomputed_database'] = 'selGroup';
        params['db_genome_group'] = group_path;
      }
      return params;
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
