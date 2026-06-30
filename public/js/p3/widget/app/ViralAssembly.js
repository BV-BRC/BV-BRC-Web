define([
  'dojo/_base/declare', 'dojo/topic', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style',
  'dojo/text!./templates/ViralAssembly.html', 'dojo/store/Memory', 'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager', 'dojo/request'
], function (
  declare, Topic, lang, on, domClass, domConstruct, domStyle,
  Template, Memory, popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager, xhr
) {

  return declare([AppBase], {
    baseClass: 'ViralAssembly',
    pageTitle: 'Viral Assembly Service - BETA',
    templateString: Template,
    applicationName: 'ViralAssembly',
    requireAuth: true,
    applicationLabel: 'Viral Assembly - BETA',
    applicationDescription: 'The Viral Assembly Service utilizes IRMA (Iterative Refinement Meta-Assembler) to assemble viral genomes. Users must select the virus genome for processing. This service is currently in beta, any feedback or improvement is welcomed.',
    applicationHelp: '',
    tutorialLink: 'tutorial/viral_assembly/assembly.html',
    defaultPath: '',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    isSRAValid: false,
    _autoReferenceGenomeId: null,
    _autoReferenceCache: null,  // { path, genomeId, name, distance, pvalue, taxon }

    irmaModuleDescriptions: {
      'FLU': 'Standard influenza assembly workflow (default)',
      'FLU_AD': 'Broad influenza workflow supporting all types (A, B, C & D)',
      'FLU-alt': 'Alternative parameters for difficult or atypical datasets',
      'FLU-avian': 'Optimized for avian influenza strains',
      'FLU-avian-residual': 'Captures low-abundance or leftover avian influenza reads',
      'FLU-fast': 'Faster runtime for high-quality datasets',
      'FLU-lowQC': 'Designed for lower-quality or noisy sequencing data',
      'FLU-minion': 'Optimized for ONT long-read sequencing',
      'FLU-pacbio': 'Optimized for PacBio long-read sequencing',
      'FLU-pgm': 'Optimized for Ion Torrent sequencing data',
      'FLU-roche': 'Legacy support for Roche/454 sequencing',
      'FLU-secondary': 'Secondary refinement after initial assembly',
      'FLU-sensitive': 'Increased sensitivity for minor variant detection',
      'FLU-utr': 'Improved recovery of 5′ and 3′ untranslated regions',
      'CoV': 'Coronavirus assembly workflows (SARS-CoV-2 & MERS-CoV)',
      'RSV': 'Respiratory Syncytial Virus assembly (A & B groups)',
      'EBOLA_NON': 'Lloviu Virus and Marburg Virus',
      'EBOLA': 'Zaire, Sudan, Bundibugyo, Reston & Taï Forest Ebolaviruses'
    },

    constructor: function () {
      this.paramToAttachPt = ['strategy', 'output_path', 'output_file', 'module'];
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      const _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      if (_self.output_path) {
        _self.output_path.set('value', _self.defaultPath);
      }
      this.onStrategyChange();
      this.onModuleChange();
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    getReferenceMode: function () {
      if (this.reference_mode_auto && this.reference_mode_auto.get('checked')) return 'auto';
      if (this.reference_mode_genbank && this.reference_mode_genbank.get('checked')) return 'genbank';
      if (this.reference_mode_fasta && this.reference_mode_fasta.get('checked')) return 'fasta';
      return 'genome';
    },

    onReferenceModeChange: function () {
      const mode = this.getReferenceMode();
      if (this.reference_genome_row) this.reference_genome_row.style.display = (mode === 'genome') ? 'block' : 'none';
      if (this.reference_auto_row) this.reference_auto_row.style.display = (mode === 'auto') ? 'block' : 'none';
      if (this.reference_genbank_row) this.reference_genbank_row.style.display = (mode === 'genbank') ? 'block' : 'none';
      if (this.reference_fasta_row) this.reference_fasta_row.style.display = (mode === 'fasta') ? 'block' : 'none';
      if (mode === 'auto') {
        this.runAutoReferenceSearch();
      } else {
        this._autoReferenceGenomeId = null;
      }
      this.checkParameterRequiredFields();
    },

    onSuggestNameChange: function () {
      this.checkParameterRequiredFields();
    },

    onReferenceFieldChange: function () {
      this.checkParameterRequiredFields();
    },

    validateGenbankAccession: function (accession) {
      if (!accession) return false;
      const value = String(accession).trim().toUpperCase();
      if (!value) return false;
      const accessionPattern = /^[A-Z]{1,4}_?[A-Z]{0,4}\d+(?:\.\d+)?$/;
      return value.split(';').every(function (item) {
        const token = item.trim();
        return token && accessionPattern.test(token);
      });
    },

    validateReferenceFastaPath: function (pathValue) {
      if (!pathValue) return false;
      return /\.(fa|fna|fasta)$/i.test(String(pathValue).trim());
    },

    onReadFileChange: function () {
      this._autoReferenceCache = null;
      if (this.getReferenceMode() === 'auto') {
        this.runAutoReferenceSearch();
      }
      this.checkParameterRequiredFields();
    },

    getSimilarReferenceInputPath: function () {
      if (this.read1 && this.read1.get('value')) return this.read1.get('value');
      if (this.read && this.read.get('value')) return this.read.get('value');
      return null;
    },

    runAutoReferenceSearch: function () {
      this._autoReferenceGenomeId = null;
      if (this.autoRefResult) this.autoRefResult.style.display = 'none';

      const path = this.getSimilarReferenceInputPath();
      if (!path) {
        if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'Select a read file above to auto-detect the reference genome.';
        this.checkParameterRequiredFields();
        return;
      }

      if (this._autoReferenceCache && this._autoReferenceCache.path === path) {
        this.renderAutoReferenceResult(this._autoReferenceCache);
        return;
      }

      if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'Searching BV-BRC for a matching reference genome...';

      const rpc = {
        method: 'Minhash.compute_genome_distance_for_fasta2',
        params: [path, 1, 1, 1, 0, 0, 0, 1],
        version: '1.1',
        id: String(Math.random()).slice(2)
      };

      xhr.post(window.App.genomedistanceServiceURL, {
        headers: { Authorization: window.App.authorizationToken || '', Accept: 'application/json' },
        handleAs: 'json',
        data: JSON.stringify(rpc)
      }).then(lang.hitch(this, function (res) {
        if (res && res.error) {
          if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'Search error: ' + (res.error.message || JSON.stringify(res.error));
          this.checkParameterRequiredFields();
          return;
        }
        const hits = (res && res.result && res.result[0]) || [];
        if (!hits.length) {
          if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'No matching reference genome found.';
          this.checkParameterRequiredFields();
          return;
        }
        this.displayAutoReferenceHit(hits[0]);
      }), lang.hitch(this, function () {
        if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'Search failed. Please try again.';
        this.checkParameterRequiredFields();
      }));
    },

    displayAutoReferenceHit: function (hit) {
      const path = this.getSimilarReferenceInputPath();
      const genomeId = hit[0];
      const distance = parseFloat(hit[1]);
      const pvalue = parseFloat(hit[2]);

      xhr.post(window.App.dataAPI + 'genome/', {
        headers: {
          Authorization: window.App.authorizationToken || '',
          Accept: 'application/json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null
        },
        handleAs: 'json',
        data: { rows: 1, q: 'genome_id:(' + genomeId + ')' }
      }).then(lang.hitch(this, function (res) {
        const meta = (res && res[0]) || {};
        const result = {
          path: path,
          genomeId: genomeId,
          name: meta.genome_name || genomeId,
          distance: distance,
          pvalue: pvalue,
          taxon: meta.taxon_lineage_names ? meta.taxon_lineage_names.join(' > ') : ''
        };
        this._autoReferenceCache = result;
        this.renderAutoReferenceResult(result);
      }), lang.hitch(this, function () {
        const result = {
          path: path,
          genomeId: genomeId,
          name: genomeId,
          distance: distance,
          pvalue: pvalue,
          taxon: ''
        };
        this._autoReferenceCache = result;
        this.renderAutoReferenceResult(result);
      }));
    },

    renderAutoReferenceResult: function (result) {
      this._autoReferenceGenomeId = result.genomeId;
      if (this.autoRefStatus) this.autoRefStatus.innerHTML = 'Best match found:';
      if (this.autoRefResultName) this.autoRefResultName.innerHTML = result.name;
      if (this.autoRefResultDetails) {
        this.autoRefResultDetails.innerHTML =
          'Genome ID: ' + result.genomeId +
          ' &nbsp;|&nbsp; Distance: ' + result.distance.toFixed(4) +
          ' &nbsp;|&nbsp; P-value: ' + result.pvalue.toFixed(4) +
          (result.taxon ? '<br>' + result.taxon : '');
      }
      if (this.autoRefResult) this.autoRefResult.style.display = 'block';
      this.checkParameterRequiredFields();
    },

    inputTypeChanged: function () {
      const pairedBox = document.getElementById(this.id + '_pairedReadLibraryBox');
      const singleBox = document.getElementById(this.id + '_singleReadLibraryBox');
      const sraBox = document.getElementById(this.id + '_sraAccessionBox');
      if (this.pairedReadCheck.checked === true) {
        pairedBox.style.display = 'block';
        singleBox.style.display = 'none';
        sraBox.style.display = 'none';
      } else if (this.singleReadCheck.checked === true) {
        pairedBox.style.display = 'none';
        singleBox.style.display = 'block';
        sraBox.style.display = 'none';
      } else {
        pairedBox.style.display = 'none';
        singleBox.style.display = 'none';
        sraBox.style.display = 'block';
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    getValues: function () {
      let values = this.inherited(arguments);

      let assemblyValues = {
        strategy: values.strategy,
        output_path: values.output_path,
        output_file: values.output_file
      };

      if (values.strategy === 'irma') {
        assemblyValues.module = values.module.startsWith('EBOLA') ? 'EBOLA' : values.module;
      } else if (values.strategy === 'reference-guided') {
        const mode = this.getReferenceMode();
        assemblyValues.strategy = 'reference_guided';
        assemblyValues.reference_type = mode;
        if (mode === 'genome') {
          assemblyValues.reference_genome_id = values.reference_genome_id;
        } else if (mode === 'auto') {
          assemblyValues.reference_genome_id = this._autoReferenceGenomeId;
        } else if (mode === 'genbank') {
          assemblyValues.reference_genbank_accession = values.reference_genbank_accession;
        } else if (mode === 'fasta') {
          assemblyValues.reference_fasta_file = values.reference_fasta_file;
        }
      }

      if (values.inputType === 'pairedRead') {
        assemblyValues.paired_end_lib = {
          read1: values.read1,
          read2: values.read2
        };
      } else if (values.inputType === 'singleRead') {
        assemblyValues.single_end_lib = {
          read: values.read
        };
      } else {
        if (this.isSRAValid) {
          // Validate SRR accession id
          //this.onAddSRR();
          assemblyValues.sra_id = values.srr_accession;
        } else {
          return false;
        }
      }

      return assemblyValues;
    },

    onReset: function () {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
    },

    checkParameterRequiredFields: function () {
      const hasOutputPath = this.output_path.get('value');
      const hasOutputName = this.output_file.get('displayedValue');
      const strategy = this.strategy && this.strategy.get('value');

      // Require at least one valid read source
      let hasReads = false;
      if (this.sraAccessionCheck && this.sraAccessionCheck.get('checked')) {
        hasReads = this.isSRAValid;
      } else if (this.singleReadCheck && this.singleReadCheck.get('checked')) {
        hasReads = !!(this.read && this.read.get('value'));
      } else {
        hasReads = !!(this.read1 && this.read1.get('value')) && !!(this.read2 && this.read2.get('value'));
      }

      let hasReference = true;

      if (strategy === 'reference-guided') {
        if (this.reference_section) {
          this.reference_section.style.display = 'block';
        }
        if (this.irma_module_row) {
          this.irma_module_row.style.display = 'none';
        }
        const mode = this.getReferenceMode();
        if (mode === 'genome') {
          hasReference = !!(this.reference_genome_nameWidget && this.reference_genome_nameWidget.get('value'));
        } else if (mode === 'auto') {
          hasReference = !!this._autoReferenceGenomeId;
        } else if (mode === 'genbank') {
          const accession = this.reference_genbank_accession && this.reference_genbank_accession.get('value');
          hasReference = this.validateGenbankAccession(accession);
          if (this.reference_genbank_accession) {
            this.reference_genbank_accession.set('state', hasReference || !accession ? '' : 'Error');
          }
        } else if (mode === 'fasta') {
          const fastaPath = this.reference_fasta_file && this.reference_fasta_file.get('value');
          hasReference = this.validateReferenceFastaPath(fastaPath);
        }
      } else {
        if (this.reference_section) {
          this.reference_section.style.display = 'none';
        }
        if (this.irma_module_row) {
          this.irma_module_row.style.display = 'block';
        }
      }

      if (hasOutputPath && hasOutputName && hasReads && hasReference) {
        this.validate();
      } else {
        if (this.submitButton) {
          this.submitButton.set('disabled', true);
        }
      }
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    onStrategyChange: function () {
      if (this.strategy.get('value') === 'reference-guided') {
        this.onReferenceModeChange();
      }
      this.checkParameterRequiredFields();
    },

    onModuleChange: function () {
      if (!this.module_description) return;
      const val = this.module && this.module.get('value');
      const desc = (val && this.irmaModuleDescriptions[val]) || '';
      this.module_description.innerHTML = desc;
    },

    onSRRChange: function () {
      const accession = this.srr_accession.get('value');
      this.isSRAValid = false;

      if (!accession.match(/^[a-z]{3}[0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = 'Please provide a valid SRA number';
      } else {
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = 'Validating ' + accession + '.';

        try {
          xhr.get(lang.replace(this.srrValidationUrl, [accession]),
            {
              sync: false,
              headers: { 'X-Requested-With': null },
              timeout: 15000,
              handleAs: 'text'
            }).then(
            lang.hitch(this, function (response) {
              const jsonResponse = JSON.parse(response);

              if (jsonResponse.esearchresult.count === '0') {
                this.srr_accession_validation_message.innerHTML = 'The accession is not a valid id.';
              } else {
                this.srr_accession_validation_message.innerHTML = 'The accession is a valid id.';
                this.isSRAValid = true;
              }

              this.srr_accession.set('disabled', false);
            })
          );
        } catch (e) {
          console.error(e);
          this.srr_accession_validation_message.innerHTML = 'Something went wrong. Please try again.';
        }
      }
    },

    setStrategy: function (strategy) {
      this.strategy.set('value', strategy);
    },

    intakeRerunForm: function () {
      // assuming only one key
      const service_fields = window.location.search.replace('?', '');
      const rerun_fields = service_fields.split('=');
      let rerun_key;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        const sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          try {
            const jobData = JSON.parse(sessionStorage.getItem(rerun_key));

            if (jobData['strategy']) {
              const strategyValue = jobData['strategy'] === 'reference_guided' ? 'reference-guided' : jobData['strategy'];
              this.strategy.set('value', strategyValue);
            }
            if (jobData['module']) {
              this.module.set('value', jobData['module']);
            }
            if (jobData['output_path']) {
              this.output_path.set('value', jobData['output_path']);
            }
            if (jobData['reference_type'] === 'auto' && this.reference_mode_auto) {
              this.reference_mode_auto.set('checked', true);
            } else if (jobData['reference_type'] === 'genome' && this.reference_mode_genome) {
              this.reference_mode_genome.set('checked', true);
            } else if (jobData['reference_type'] === 'genbank' && this.reference_mode_genbank) {
              this.reference_mode_genbank.set('checked', true);
            } else if (jobData['reference_type'] === 'fasta' && this.reference_mode_fasta) {
              this.reference_mode_fasta.set('checked', true);
            }
            if (jobData['reference_genome_id'] && this.reference_genome_nameWidget) {
              this.reference_genome_nameWidget.set('value', jobData['reference_genome_id']);
            }
            if (jobData['reference_genbank_accession'] && this.reference_genbank_accession) {
              this.reference_genbank_accession.set('value', jobData['reference_genbank_accession']);
            }
            if (jobData['reference_fasta_file'] && this.reference_fasta_file) {
              this.reference_fasta_file.set('value', jobData['reference_fasta_file']);
            }
            if (jobData['srr_id'] || jobData['sra_id']) {
              this.srr_accession.set('value', jobData['srr_id'] || jobData['sra_id']);
              this.sraAccessionCheck.set('checked', true);
              this.onSRRChange();
            } else if (jobData['paired_end_lib']) {
              this.read1.set('value', jobData['paired_end_lib'].read1);
              this.read2.set('value', jobData['paired_end_lib'].read2);
              this.pairedReadCheck.set('checked', true);
            } else if (jobData['single_end_lib']) {
              this.read.set('value', jobData['single_end_lib'].read);
              this.singleReadCheck.set('checked', true);
            }
            this.form_flag = true;
          } catch (error) {
            console.log('Error during intakeRerunForm: ', error);
          } finally {
            sessionStorage.removeItem(rerun_key);
          }
        }
      }
    }
  });
});
