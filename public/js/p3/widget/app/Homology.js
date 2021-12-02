define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
  './AppBase',
  'dojo/text!./templates/Homology.html', 'dijit/form/Form',
  '../viewer/Homology', '../../util/PathJoin', '../../WorkspaceManager', '../WorkspaceObjectSelector'
], function (
  declare, lang, Deferred,
  on, query, domClass, domConstruct, domStyle, Topic,
  AppBase,
  Template, FormMixin,
  HomologyResultContainer, PathJoin, WorkspaceManager, WorkspaceObjectSelector
) {

  var NA = 'nucleotide',
    AA = 'protein',
    NO = 'invalid';

  var ProgramDefs = [
    {
      value: 'blastn',
      label: 'blastn - search a nucleotide database using a nucleotide query',
      validDatabase: ['bacteria-archaea', 'virus-reference', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [NA]
    },
    {
      value: 'blastp',
      label: 'blastp - search protein database using a protein query',
      validDatabase: ['bacteria-archaea', 'virus-reference', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['faa'],
      validQuery: [AA]
    },
    {
      value: 'blastx',
      label: 'blastx - search protein database using a translated nucleotide query',
      validDatabase: ['bacteria-archaea', 'virus-reference', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['faa'],
      validQuery: [NA]
    },
    {
      value: 'tblastn',
      label: 'tblastn - search translated nucleotide database using a protein query',
      validDatabase: ['bacteria-archaea', 'virus-reference', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [AA]
    },
    {
      value: 'tblastx',
      label: 'tblastx - search translated nucleotide database using a translated nucleotide query',
      validDatabase: ['bacteria-archaea', 'virus-reference', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [NA]
    }
  ];

  var DatabaseDefs = [
    {
      value: 'bacteria-archaea', label: 'Reference and representative genomes (bacteria, archaea)', db_type: ['fna', 'ffn', 'faa'], db_source: 'precomputed_database'
    },
    {
      value: 'virus-reference', label: 'Reference and representative genomes (virus)', db_type: ['fna', 'ffn', 'faa'], db_source: 'precomputed_database'
    },
    {
      value: 'selGenome', label: 'Search within selected genome', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'genome_list'
    },
    {
      value: 'selGroup', label: 'Search within selected genome group', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'genome_list'
    },
    {
      value: 'selTaxon', label: 'Search within a taxon', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'taxon_list'
    },
    {
      value: 'selFasta', label: 'Search within selected fasta file', db_type: ['fna', 'faa'], db_source: 'fasta_list'
    },
  ];

  var SearchForDefs = [
    { value: 'fna', label: 'Contigs (NT)' },
    { value: 'faa', label: 'Proteins (AA)' },
    { value: 'ffn', label: 'Genes (NT)' },
    { value: 'frn', label: 'RNAs (NT)' }
  ];

  return declare([AppBase], {
    baseClass: 'BLAST',
    templateString: Template,
    applicationHelp: 'quick_references/services/blast.html',
    applicationName: 'Homology',
    tutorialLink: 'tutorial/blast/blast.html',
    addedGenomes: 0,
    maxGenomes: 20,
    genome_id_error: 'No genome was selected. Please use the arrow button to select genomes to search.',
    // maxPatternFiles: 20,
    // addedPatternFiles: 0,
    startingRows: 5,
    validFasta: 0,
    // patternRows: 4,
    max: 256,
    loadingMask: null,
    result_store: null,
    result_grid: null,
    defaultPath: '',
    demo: false,
    sequence_type: null,
    allowMultiple: true,
    input_source: null,
    db_source: null,
    db_type: null,
    db_precomputed_database: null,
    group_genomes: [], //list that is populated with the genome ids when selGroup is selected
    constructor: function () {
      this.genomeToAttachPt = ['genome_id'];
      this.featureGroupToAttachPt = ['query_featuregroup'];
      this.fastaToAttachPt = ['query_fasta'];
    },

    startup: function () {

      if (this._started) { return; }
      this.inherited(arguments);

      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
        // var ggDom = query('div[name="genome_group"]')[0];
        // this.genome_group = new WorkspaceObjectSelector();
        // this.genome_group.set('path', this.defaultPath);
        // this.genome_group.set('type', ['genome_group']);
        // this.genome_group.placeAt(ggDom, 'only');
      }

      this.emptyTable(this.genomeTable, this.startingRows);
      // this.emptyTable(this.patternFileTable, this.patternRows);
      this.onInputChange(true);
      this.onChangeProgram(true, true);

      on(this.advanced, 'click', lang.hitch(this, function () {
        this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
      }));

      Topic.subscribe('BLAST_UI', lang.hitch(this, function () {
        // console.log("BLAST_UI:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'showErrorMessage':
            this.showErrorMessage(value);
            this.hideResultGridContainer();
            break;
          case 'showNoResultMessage':
            this.showNoResultMessage();
            this.hideResultGridContainer();
            break;
          default:
            break;
        }
      }));

      this._started = true;
      this.form_flag = false;
      var _self = this;
      try {
        this.intakeRerunForm();
        if (this.form_flag) {
          _self.output_file.focus();
        }
      } catch (error) {
        console.error(error);
        var localStorage = window.localStorage;
        if (localStorage.hasOwnProperty("bvbrc_rerun_job")) {
          localStorage.removeItem("bvbrc_rerun_job");
        }
      }
    },

    toggleAdvanced: function (flag) {
      if (flag) {
        this.advancedOptions.style.display = 'block';
        this.advancedOptionIcon.className = 'fa icon-caret-left fa-1';
      }
      else {
        this.advancedOptions.style.display = 'none';
        this.advancedOptionIcon.className = 'fa icon-caret-down fa-1';
      }
    },

    validate: function () {
      if (this.inherited(arguments)) {
        var val = true;
        switch (this.input_source) {
          case 'fasta_data': // Validate the sequence text area.
            val = (this.sequence.get('value') && this.validFasta);
            break;
          default:
            break;
        }
        // Validate the added genome database.
        this.genome_id_message.innerHTML = '';
        if (this.database.get('value') == 'selGenome' && this.addedGenomes == 0) {
          this.genome_id_message.innerHTML = this.genome_id_error;
          val = false;
        }
        if (val && (this.database.get('value'))) {
          this.submitButton.set('disabled', false);
          return true;
        }
      }
      this.submitButton.set('disabled', true);
      return false;
    },

    checkFasta: function () {
      // Check the FASTA data.
      var fastaText = this.sequence.get('value');
      var fastaObject = this.validateFasta(fastaText, this.input_type);
      // Replace the FASTA data with trimmed data.
      this.sequence.set('value', fastaObject.trimFasta);
      // Update the error message.
      if (fastaObject.status == 'need_dna') {
        this.sequence_message.innerHTML = this.program.toUpperCase() + ' requires nucleotide sequences. ' + fastaObject.message;
      } else {
        this.sequence_message.innerHTML = fastaObject.message;
      }
      // Set the validity with the number of records.
      if (fastaObject.valid) {
        this.validFasta = fastaObject.numseq;
        return true;
      }
      this.validFasta = 0;
      return false
    },

    getValues: function () {
      var _self = this;
      var sequence = this.sequence.get('value');
      var database = this.database.get('value');
      var useDatabase = !(['selGenome', 'selGroup', 'selTaxon', 'selFasta'].indexOf(database) > -1);
      var program = this.program;
      var evalue = this.evalue.get('value');
      var output_file = this.output_file.get('value');
      var output_path = this.output_path.get('value');
      var max_hits = parseInt(this.max_hits.get('value'));
      var resultType;
      var genomeIds = [];
      if (useDatabase) {
        resultType = database.split('.')[1] == 'fna' ? 'genome_sequence' : 'genome_feature';
        if (database == 'spgenes.faa') {
          resultType = 'specialty_genes';
        }
        var q = {
          method: 'HomologyService.blast_fasta_to_database',
          params: [encodeURIComponent(sequence), program, database, evalue, max_hits, 0]
        };
        // def.resolve(q);
      } else {
        // blast against genomes/groups/taxon/fasta
        var search_for = this.search_for.get('value');
        resultType = search_for == 'contigs' ? 'genome_sequence' : 'genome_feature';

        switch (database) {
          case 'selGenome':
            query('.genomedata').forEach(function (item) {
              genomeIds.push(item.genomeRecord.genome_id);
            });
            if (genomeIds.length == 0) {
              this.genome_id_message.innerHTML = this.genome_id_error;
              return;
            }
            this.genome_id_message.innerHTML = '';

            var q = {
              method: 'HomologyService.blast_fasta_to_genomes',
              params: [sequence, program, genomeIds, search_for, evalue, max_hits, 0]
            };
            // def.resolve(q);
            break;
          case 'selGroup':
            genomeIds = this.group_genomes;
            break;
          case 'selTaxon':
            var taxon = null;
            taxon = this.taxonomy.get('value');
            if (taxon === '') {
              this.taxonomy_message.innerHTML = 'No taxon was selected.';
              return;
            }
            var q = {
              method: 'HomologyService.blast_fasta_to_taxon',
              params: [sequence, program, taxon, search_for, evalue, max_hits, 0]
            };
            // def.resolve(q);
            break;
          case 'selFasta':
            var fasta = null;
            fasta = this.fasta_db.get('value');
            if (fasta === '') {
              this.fasta_db_message.innerHTML = 'No fasta file was selected.';
              return;
            }
            var q = {
              method: 'HomologyService.blast_fasta_to_fasta',
              params: [sequence, program, fasta, search_for, evalue, max_hits, 0]
            };
            break;
          default:
            break;
        }
      }
      var db_obj = DatabaseDefs.find(obj => {
        return obj.value === database;
      });
      // this should probably move up into the if/else block above
      if (db_obj) {
        this.db_source = db_obj.db_source;
        this.db_precomputed_database = db_obj.db_source;
      }
      this.db_type = this.search_for.value;

      // prepare submission values
      var submit_values = {
        'input_type': this.input_type,
        'input_source': _self.input_source,
        'db_type': _self.db_type,
        'db_source': _self.db_source,
        'blast_program': program,
        'output_file': output_file,
        'output_path': output_path,
        'blast_max_hits': max_hits,
        'blast_evalue_cutoff': evalue
      };

      if (_self.input_source == 'fasta_file') {
        submit_values['input_fasta_file'] = _self.query_fasta.get('value')
      } else if (_self.input_source == 'fasta_data') {
        submit_values['input_fasta_data'] = '';
        if (sequence) {
          if (this.validFasta == 0) {
            sequence = '>fasta_record1\n' + sequence;
          }
          submit_values['input_fasta_data'] = sequence;
        }
      } else if (_self.input_source == 'feature_group') {
        submit_values['input_feature_group'] = _self.query_featuregroup.get('value')
      }

      if (genomeIds.length > 0) {
        submit_values['db_genome_list'] = genomeIds;
        if (database == 'selGroup'){
          submit_values['db_genome_group'] = this.genome_group.get('value');
        }

      }
      if (taxon) {
        submit_values['db_taxon_list'] = [taxon];
      }
      if (fasta) {
        submit_values['db_fasta'] = [fasta];
      }
      if (this.demo) {
        // resultType = "custom";
        resultType = 'custom';
        submit_values['db_source'] = 'fasta_data';
        submit_values['db_fasta_data'] = '>id1\ngtgtcgtttatcagtcttgcaagaaatgtttttgtatatatatcaattgggttatttgta\ngctccaatattttcgttagtatcaattatattcactgaacgcgaagtagtagatttgttt\ngcgtatattttttctgaatatacagttaatactgtaattttaatgttaggtgttgggatt\n' +
          '>id2\nataacgttgattgttgggatagcaacagcttggtttgtaacttattattcttttcctgga\ncgtaagttttttgagatagcacttttcttgccactttcaataccagggtatatagttgca\ntatgtatatgtaaatatttttgaattttcaggtcctgtacaaagttttttaagggtgata\ntttcattggaataaaggtgattattactttcctagtgtgaaatcattagcatgtggaatt\n'
      }
      else if (_self.db_precomputed_database) {
        submit_values['db_precomputed_database'] = database.split('.')[0];
      }
      if (this.validate()) {
        var start_params = {
          'base_url': window.App.appBaseURL
        }
        // var values = this.getValues();
        var callback = function () {
          // the state set here shows up again in the HomologyMemoryStore onSetState
          _self.result = new HomologyResultContainer({
            id: this.id + '_blastResult',
            style: 'min-height: 700px; visibility:hidden;',
            state: {
              query: q, resultType: resultType, resultPath: output_path + '/.' + output_file, 'submit_values': submit_values
            }
          });
          _self.result.placeAt(query('.blast_result')[0]);
          _self.result.loadingMask.show();
          query('.blast_result .GridContainer').style('visibility', 'visible');
          domClass.add(query('.service_form')[0], 'hidden');
          domClass.add(query('.appSubmissionArea')[0], 'hidden');
          domClass.add(query('.service_error')[0], 'hidden');
          query('.reSubmitBtn').style('visibility', 'visible');
          // _self.result.set('state', { query: q, resultType: resultType, resultPath: output_path+"/."+output_file, "submit_values":submit_values});
          _self.result.startup();
          // Topic.publish('/navigate', { href: `/workspace/${output_path}/.${output_file}/blast_out.txt`});
        };
        // set job hook before submission
        if (_self.live_job.value) {
          _self.setJobHook(function () {
            Topic.publish('/navigate', { href: `/view/Homology/${output_path}/${output_file}` });
          }, function (error) {
            // Topic.publish('BLAST_UI', 'showErrorMessage', error);
          });
        }
        if (this.demo) {
          callback();
        }
        else {
          // changing the submit() function to be getValues() in shift away from form/viewer
          // _self.doSubmit(submit_values, start_params);
          return submit_values;
        }
      }
    },

    setLiveJob: function () {
      this.live_job.value = this.live_job.checked;
    },

    resubmit: function () {
      domClass.remove(query('.service_form')[0], 'hidden');
      domClass.remove(query('.appSubmissionArea')[0], 'hidden');
      query('.reSubmitBtn').style('visibility', 'hidden');
    },

    showErrorMessage: function (err) {
      domClass.remove(query('.service_error')[0], 'hidden');
      domClass.remove(query('.service_message')[0], 'hidden');
      query('.service_error h3')[0].innerHTML = 'We were not able to complete your BLAST request. Please let us know with details from the message below.';
      if (typeof err === 'string') {
        query('.service_message')[0].innerHTML = err;
      }
      else {
        query('.service_message')[0].innerHTML = err.response.data.error.message;
      }
      query('.blast_result .GridContainer').style('visibility', 'hidden');
    },

    showNoResultMessage: function () {
      domClass.remove(query('.service_error')[0], 'hidden');
      query('.service_error h3')[0].innerHTML = 'BLAST has no match. Please revise query and submit again.';
      domClass.add(query('.service_message')[0], 'hidden');
      query('.blast_result .GridContainer').style('visibility', 'hidden');
    },

    hideResultGridContainer: function () {
      domStyle.set(this.result.domNode, 'visibility', 'hidden');
    },

    onSuggestNameChange: function () {
      // console.log("onSuggestNameChange");
      // TODO: implement
      this.validate();
    },

    checkOutputName: function () {
      if (this.demo) {
        return true;
      }
      this.validate();
      return this.inherited(arguments);
    },

    onAddGenome: function () {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          domConstruct.destroy(tr);
          this.decreaseGenome();
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome();
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var incomplete = 0;
        var browser_select = 0;

        var compGenomeList = query('.genomedata');
        var genomeIds = [];

        compGenomeList.forEach(function (item) {
          genomeIds.push(item.genomeRecord.genome_id);
        });

        var cur_value = this[attachname].value;
        if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
        {
          success = 0;
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

    makeGenomeName: function () {
      var name = this.genome_id.get('displayedValue');
      var maxName = 50;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    increaseGenome: function () {
      this.addedGenomes = this.addedGenomes + 1;
      this.validate();
    },

    decreaseGenome: function () {
      this.addedGenomes = this.addedGenomes - 1;
      this.validate();
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    onSetGroupGenomes: function() {
      var path = this.genome_group.get('value');
      // console.log("selGroup", path);
      if (path === '') {
        this.genome_group_message.innerHTML = 'No genome group has selected';
        return;
      }
      if (this.group_genomes.length > 0) {
        this.group_genomes = [];
      }
      WorkspaceManager.getObjects(path, false).then(lang.hitch(this, function (objs) {
        var genomeIdHash = {};
        objs.forEach(function (obj) {
          var data = JSON.parse(obj.data);
          data.id_list.genome_id.forEach(function (d) {
            if (!Object.prototype.hasOwnProperty.call(genomeIdHash, d)) {
              genomeIdHash[d] = true;
            }
          });
        });
        Object.keys(genomeIdHash).forEach(function(genome_id) {
          this.addToGroupGenomeList(genome_id);
        },this);
      }));
      this.validate();
    },

    addToGroupGenomeList: function(g_id) {
      this.group_genomes.push(g_id);
    },
    

    onChangeProgram: function (val, start = false) {
      console.log(val);
      if (!val) {
        return;
      }
      this.program = '';
      this.sequence_type = NO;
      var old_type = this.input_type;
      if (this.blastp.checked == true) {
        this.program = 'blastp';
        this.sequence_type = AA;
        this.input_type = 'aa';
        this.query_fasta.set('type', 'feature_protein_fasta');
      } else if (this.blastn.checked == true) {
        this.program = 'blastn';
        this.sequence_type = NA;
        this.input_type = 'dna';
        this.query_fasta.set('type', 'feature_dna_fasta');
      } else if (this.blastx.checked == true) {
        this.program = 'blastx';
        this.sequence_type = AA;
        this.input_type = 'dna';
        this.query_fasta.set('type', 'feature_dna_fasta');
      } else if (this.tblastn.checked == true) {
        this.program = 'tblastn';
        this.sequence_type = NA;
        this.input_type = 'aa';
        this.query_fasta.set('type', 'feature_protein_fasta');
      }
      if (old_type != this.input_type) {
        this.checkFasta();
      }
      this.onChangeDatabase(this.database.get('value'), start);
    },


    setDbType: function (val) {
      var candidate_types = DatabaseDefs.filter(function (record) {
        return record.value == val;
      })[0].db_type;
      var target_program = this.program;
      var candidate_types2 = ProgramDefs.find(function (p) {
        return p.value === target_program;
      }).validSearchFor;
      var valid_types = candidate_types.filter(value => candidate_types2.includes(value)); // intersection
      this.search_for.removeOption(SearchForDefs);
      this.search_for.addOption(SearchForDefs.filter(function (d) {
        return valid_types.some(function (t) {
          return (d.value).match(t);
        });
      }));
      this.search_for.set('disabled', false);
    },

    onInputChange: function (evt) {
      this.sequence.set('required', false);
      this.query_fasta.set('required', false);
      this.query_featuregroup.set('required', false);
      if (this.input_sequence.checked == true) {
        this.input_source = 'fasta_data';
        this.sequence_table.style.display = 'table';
        this.fasta_table.style.display = 'none';
        this.group_table.style.display = 'none';
        this.sequence.set('required', true);
      }
      else if (this.input_fasta.checked == true) {
        this.input_source = 'fasta_file';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'table';
        this.group_table.style.display = 'none';
        this.query_fasta.set('required', true);
      }
      else if (this.input_group.checked == true) {
        this.input_source = 'feature_group';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'none';
        this.group_table.style.display = 'table';
        this.query_featuregroup.set('required', true);
      }
      if (!evt) {
        this.validate();
      }
    },

    onReset: function (evt) {
      this.inherited(arguments);
      for (var i = 0; i < this.addedGenomes; i++) {
        this.genomeTable.deleteRow(0);
      }
      this.emptyTable(this.genomeTable, Math.min(this.addedGenomes, this.startingRows));
      this.addedGenomes = 0;
    },

    onChangeDBType: function () {
      var fastaDB = this.database.get('value') == 'selFasta';
      if (fastaDB && this.search_for.get('value') == 'faa') {
        this.fasta_db.set('type', 'feature_protein_fasta');
      } else if (fastaDB) {
        this.fasta_db.set('type', 'feature_dna_fasta');
      }
    },

    onChangeDatabase: function (val, start) {
      this.setDbType(val);
      this.genome_group.set('required', false);
      this.taxonomy.set('required', false);
      this.fasta_db.set('required', false);
      if (['selGenome', 'selGroup', 'selTaxon', 'selFasta'].indexOf(val) > -1) {
        switch (val) {
          case 'selGenome':
            domClass.remove(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.add(this.genome_group_wrapper, 'hidden');
            }
            domClass.add(this.taxon_wrapper, 'hidden');
            domClass.add(this.fasta_wrapper, 'hidden');
            break;
          case 'selGroup':
            this.genome_group.set('required', true);
            if (!window.App.user) {
              this.database_message.innerHTML = 'Please login first to use genome group selection';
              return;
            }
            domClass.add(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.remove(this.genome_group_wrapper, 'hidden');
            }
            domClass.add(this.taxon_wrapper, 'hidden');
            domClass.add(this.fasta_wrapper, 'hidden');
            break;
          case 'selTaxon':
            this.taxonomy.set('required', true);
            domClass.add(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.add(this.genome_group_wrapper, 'hidden');
            }
            domClass.remove(this.taxon_wrapper, 'hidden');
            domClass.add(this.fasta_wrapper, 'hidden');
            break;
          case 'selFasta':
            this.fasta_db.set('required', true);
            domClass.remove(this.fasta_wrapper, 'hidden');
            domClass.add(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.add(this.genome_group_wrapper, 'hidden');
            }
            domClass.add(this.taxon_wrapper, 'hidden');
            this.onChangeDBType();
            break;
          default:
            break;
        }
      } else {
        domClass.add(this.genome_id_wrapper, 'hidden');
        domClass.add(this.genome_group_wrapper, 'hidden');
        domClass.add(this.fasta_wrapper, 'hidden');
        domClass.add(this.taxon_wrapper, 'hidden');
      }
      if (!start) {
        this.validate();
      }
    },

    intakeRerunForm: function () {
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty("bvbrc_rerun_job")) {
        this.form_flag = true;
        var job_data = JSON.parse(localStorage.getItem("bvbrc_rerun_job"));
        var param_dict = { "output_folder": "output_path" };
        var service_specific = { "input_fasta_data": "sequence", "blast_evalue_cutoff": "evalue", "blast_max_hits": "max_hits" };
        this.program.set("value", job_data['program']);
        param_dict["service_specific"] = service_specific;
        AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
        this.program.set("disabled", false);
        this.database.set("disabled", false);
        this.search_for.set("disabled", false);
        this.setDatabaseInfoFormFill(job_data);

        //TODO: function to set genome_list,fasta,feature_group based on database type (input_source?)
        localStorage.removeItem("bvbrc_rerun_job");
      }
    },

    setDatabaseInfoFormFill: function (job_data) {
      var db_attach_points = { "program": "program", "db_source": "database", "db_type": "search_for" };
      Object.keys(db_attach_points).forEach(function (param) {
        this[db_attach_points[param]].set("value", job_data[param]);
      }, this);
    },

  });
});
