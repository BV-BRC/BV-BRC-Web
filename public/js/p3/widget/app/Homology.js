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
      validDatabase: ['bacteria-archaea', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [NA]
    },
    {
      value: 'blastp',
      label: 'blastp - search protein database using a protein query',
      validDatabase: ['bacteria-archaea', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['faa'],
      validQuery: [AA]
    },
    {
      value: 'blastx',
      label: 'blastx - search protein database using a translated nucleotide query',
      validDatabase: ['bacteria-archaea', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['faa'],
      validQuery: [NA]
    },
    {
      value: 'tblastn',
      label: 'tblastn - search translated nucleotide database using a protein query',
      validDatabase: ['bacteria-archaea', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [AA]
    },
    {
      value: 'tblastx',
      label: 'tblastx - search translated nucleotide database using a translated nucleotide query',
      validDatabase: ['bacteria-archaea', 'selGenome', 'selGroup', 'selTaxon'],
      validSearchFor: ['fna', 'ffn', 'frn'],
      validQuery: [NA]
    }
  ];

  var DatabaseDefs = [
    {
      value: 'bacteria-archaea', label: 'Reference and representative genomes', db_type: ['fna', 'ffn', 'faa'], db_source: 'precomputed_database'
    },
    // { value: 'ref.fna', label: 'Reference and representative genomes - contigs (fna)', db_type: 'fna', db_source:"precomputed_database"},
    {
      value: 'selGenome', label: 'Search within selected genome', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'genome_list'
    },
    {
      value: 'selGroup', label: 'Search within selected genome group', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'genome_list'
    },
    {
      value: 'selTaxon', label: 'Search within a taxon', db_type: ['fna', 'ffn', 'faa', 'frn'], db_source: 'taxon_list'
    }
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
    applicationHelp: 'user_guides/services/blast.html',
    applicationName: 'Homology',
    tutorialLink: 'tutorial/blast/blast.html',
    addedGenomes: 0,
    maxGenomes: 20,
    startingRows: 5,
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
    constructor: function () {
      this.genomeToAttachPt = ['genome_id'];
    },

    startup: function () {

      if (this._started) { return; }
      this.inherited(arguments);


      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

        var ggDom = query('div[name="genome_group"]')[0];

        this.genome_group = new WorkspaceObjectSelector();
        this.genome_group.set('path', this.defaultPath);
        this.genome_group.set('type', ['genome_group']);
        this.genome_group.placeAt(ggDom, 'only');
      }

      this.emptyTable(this.genomeTable, this.startingRows);

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

    sanitizeFastaSequence: function (sequence) {
      var header = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; });
      var patternSeqSplit = /(?:>.+\n| )+/;
      var seq_segments = sequence.split(patternSeqSplit).filter(function (line) { return (line.match(/^>.*/) == null && line != ''); }).map(function (line) { return line.replace(/ /g, ''); });
      var sanitized = [];
      if (header.length == 0) {
        header.push('>query_seq1');
      }
      header.forEach(function (item, index) {
        sanitized.push(item + '\n' + seq_segments[index].replace(/\n/g, ''));
      });

      return sanitized.join('\n');
    },

    hasSingleFastaSequence: function (sequence) {
      return this.numFastaSequence(sequence) <= 1;
    },

    numFastaSequence: function (sequence) {
      return sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; }).length;
    },

    isNucleotideFastaSequence: function (sequence) {
      var patternFastaHeader = />.*\n/gi;
      var patternDnaSequence = /[atcgn\n\s]/gi;

      return (sequence.replace(patternFastaHeader, '').replace(patternDnaSequence, '').length === 0);
    },
    isAminoAcidFastaSequence: function (sequence) {
      var patternFastaHeader = />.*\n/gi;
      var patternAASequence = /[ACDEFGHIKLMNPQRSTUVWYBXZJUO\n\s]/gi; // extended AminoAcid alphabet

      return (sequence.replace(patternFastaHeader, '').replace(patternAASequence, '').length === 0);
    },

    validate: function () {
      // console.log("validate", this.sequence.get('value'), (this.sequence.get('value')).length,  this.database.get('value'), this.program.get('value'));
      var sequence = this.sequence.get('value');

      if (sequence && sequence.length > 1
        && this.database.get('value')
        && this.program.get('value')
        && (this.allowMultiple || this.hasSingleFastaSequence(sequence))) {

        // console.log("validation passed");
        this.submitButton.set('disabled', false);
        return true;
      }
      this.submitButton.set('disabled', true);
      return false;

    },

    getValues: function () {
      var _self = this;
      var sequence = this.sequence.get('value');
      var database = this.database.get('value');
      var useDatabase = !(['selGenome', 'selGroup', 'selTaxon'].indexOf(database) > -1);
      var program = this.program.get('value');
      var evalue = this.evalue.get('value');
      var output_file = this.output_file.get('value');
      var output_path = this.output_path.get('value');
      var max_hits = parseInt(this.max_hits.get('value'));
      // var def = new Deferred();
      var resultType;
      var input_type = null;

      // temporary until new input types
      _self.input_source = 'fasta_data';

      switch (_self.sequence_type) {
        case NA:
          input_type = 'dna';
          break;
        case AA:
          input_type = 'aa';
          break;
        default:
          break;
      }
      var genomeIds = [];

      if (useDatabase) {
        if (!sequence) {
          this.sequence_message.innerHTML = 'Sequence is empty';
          return;
        }

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
        // blast against genomes/groups/taxon
        var search_for = this.search_for.get('value');
        resultType = search_for == 'contigs' ? 'genome_sequence' : 'genome_feature';

        switch (database) {
          case 'selGenome':
            query('.genomedata').forEach(function (item) {
              genomeIds.push(item.genomeRecord.genome_id);
            });
            if (genomeIds.length == 0) {
              this.genome_id_message.innerHTML = 'No genome has selected. Please use arrow button to collect genomes to search.';
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
            var path = this.genome_group.get('value');
            // console.log("selGroup", path);
            if (path === '') {
              this.genome_group_message.innerHTML = 'No genome group has selected';
              return;
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
              genomeIds = Object.keys(genomeIdHash);
              var q = {
                method: 'HomologyService.blast_fasta_to_genomes',
                params: [sequence, program, genomeIds, search_for, evalue, max_hits, 0]
              };
              // def.resolve(q);
            }));
            break;
          case 'selTaxon':
            var taxon = null;
            taxon = this.taxonomy.get('value');
            if (taxon === '') {
              this.taxonomy_message.innerHTML = 'No taxon has selected';
              return;
            }
            var q = {
              method: 'HomologyService.blast_fasta_to_taxon',
              params: [sequence, program, taxon, search_for, evalue, max_hits, 0]
            };
            // def.resolve(q);
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
        'input_type': input_type,
        'input_source': _self.input_source,
        'db_type': _self.db_type,
        'db_source': _self.db_source,
        'output_file': output_file,
        'output_path': output_path,
        'blast_max_hits': max_hits,
        'blast_evalue_cutoff': evalue
      };
      if (sequence) {
        if (this.numFastaSequence(sequence) == 0) {
          sequence = '>fasta_record1\n' + sequence;
        }
        submit_values['input_fasta_data'] = sequence;
      }
      if (genomeIds.length > 0) {
        submit_values['db_genome_list'] = genomeIds;
      }
      if (taxon) {
        submit_values['db_taxon_list'] = [taxon];
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

        // console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
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
    },

    decreaseGenome: function () {
      this.addedGenomes = this.addedGenomes - 1;
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    onChangeSequence: function (val) {
      var _self = this;
      // console.log("onChangeSequence: [", val, "]");
      if (!val) {
        this.sequence_message.innerHTML = 'Please provide a single query sequence or multiple in FASTA format.';
        return;
      }
      if (!this.hasSingleFastaSequence(val) && !_self.allowMultiple) {
        this.sequence_message.innerHTML = 'PATRIC BLAST accepts only one sequence at a time. Please provide only one sequence.';
        return;
      }
      var sanitized = this.sanitizeFastaSequence(val);
      // console.log(sanitized)
      this.sequence.set('value', sanitized);

      this.sequence_message.innerHTML = '';
      if (this.program.isLoaded()) {
        this.program.closeDropDown();
      }
      this.program.set('disabled', false);
      this.sequence_type =  NO;
      if (this.isNucleotideFastaSequence(val)) {
        this.sequence_type =  NA;
      }
      else if (this.isAminoAcidFastaSequence(val)) {
        this.sequence_type = AA;
      }
      this.program.removeOption(ProgramDefs);
      this.program.addOption(ProgramDefs.filter(function (p) {
        return p.validQuery.indexOf(_self.sequence_type) > -1;
      }));
      if (this.sequence_type == NO) {
        this.program.setValue(undefined);
        this.program._setDisplay('');
        this.sequence_message.innerHTML = 'Please provide a single query sequence or multiple in FASTA format using a valid alphabet.';
        return;
      }
      this.program.loadAndOpenDropDown();
    },

    onChangeProgram: function (val) {
      // console.log("onChangeProgram: [", val, "]");

      this.database.set('disabled', false);

      var validDatabaseTypes = ProgramDefs.find(function (p) {
        return p.value === val;
      }).validDatabase;

      // console.log(validDatabaseTypes);
      // keep this logic for now, but all databases are valid for all programs now.
      this.database.removeOption(DatabaseDefs);
      this.database.addOption(DatabaseDefs.filter(function (d) {
        return validDatabaseTypes.some(function (t) {
          // return (d.value).match(t);
          return true;
        });
      }));

      this.validate();
      if (this.search_for.value) {
        this.setDbType(this.database.value);
      }

      this.database.loadAndOpenDropDown();
    },
    setDbType: function (val) {
      var candidate_types = DatabaseDefs.filter(function (record) {
        return record.value == val;
      })[0].db_type;

      var target_program = this.program.value;
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

    onChangeDatabase: function (val) {
      this.setDbType(val);
      if (['selGenome', 'selGroup', 'selTaxon'].indexOf(val) > -1) {
        // show advance options
        this.toggleAdvanced(true);

        // domClass.remove(this.search_for_wrapper, 'hidden');

        switch (val) {
          case 'selGenome':
            domClass.remove(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.add(this.genome_group_wrapper, 'hidden');
            }
            domClass.add(this.taxon_wrapper, 'hidden');
            break;
          case 'selGroup':
            if (!window.App.user) {
              this.database_message.innerHTML = 'Please login first to use genome group selection';
              return;
            }

            domClass.add(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.remove(this.genome_group_wrapper, 'hidden');
            }
            domClass.add(this.taxon_wrapper, 'hidden');
            break;
          case 'selTaxon':
            domClass.add(this.genome_id_wrapper, 'hidden');
            if (this.genome_group) {
              domClass.add(this.genome_group_wrapper, 'hidden');
            }
            domClass.remove(this.taxon_wrapper, 'hidden');
            break;
          default:
            break;
        }
      } else {
        this.toggleAdvanced(false);

        domClass.add(this.genome_id_wrapper, 'hidden');
        domClass.add(this.genome_group_wrapper, 'hidden');
        domClass.add(this.taxon_wrapper, 'hidden');
      }

      this.validate();
      this.search_for.loadAndOpenDropDown();
    }
  });
});
