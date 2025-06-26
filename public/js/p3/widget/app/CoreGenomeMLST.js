define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/CoreGenomeMLST.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox', 'dijit/form/Textarea', 'dijit/form/Select', 'dijit/form/FilteringSelect',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', '../../DataAPI',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox, Textarea, Select, FilteringSelect,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, DataAPI,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'CoreGenomeMLST',
    templateString: Template,
    applicationName: 'CoreGenomeMLST',
    requireAuth: true,
    applicationLabel: 'Core Genome MLST',
    applicationDescription: 'The Core Genome MLST service accepts genome groups. The genome groups are used to create and evaulate a core genome through MultiLocus Sequence Typing (MLST). The service uses a software tool called chewBBACA. This list of bacterial species this service supports are available at',
    applicationHelp: 'quick_references/services/core_genome_mlst.html',
    tutorialLink: 'tutorial/core_genome_mlst/core_genome_mlst.html',
    videoLink: '',
    pageTitle: 'Core Genome MLST Service | BV-BRC',
    appBaseURL: 'CoreGenomeMLST',
    defaultPath: '',
    startingRows: 14,
    alphabet: '',
    ref_id_length: 60,
    input_seq_rows: 10,
    input_seq_min_seqs: 2,
    maxGenomes: 5000,
    maxGenomeLength: 250000,
    fid_value: '',
    validFasta: false,
    textInput: false,
    startup: function () {
      var _self = this;

      this.inherited(arguments);
      if (this._started) {
        return;
      }


      // Call the startup of the base class explicitly
      this.constructor.superclass.startup.apply(this, arguments);
      this.inherited(arguments);

      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }

      // Ensure FilteringSelect is preloaded
        require(["dijit/form/FilteringSelect"], function(FilteringSelect) {
        _self.inherited(arguments);
        _self._started = true;
        _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
        _self.output_path.set('value', _self.defaultPath);

        // Initialize FilteringSelect manually
        _self.initFilteringSelect();

        try {
          _self.intakeRerunForm();
        } catch (error) {
          console.error(error);
        }
      });
    },

    initFilteringSelect(storeData) {
      // Create store
      var schemaStore = new Memory({
        data: storeData
      });

      // Initialize FilteringSelect widget
      var filteringSelect_ = registry.byId("input_schema_selection");

      if (filteringSelect_) {
        filteringSelect_.set("store", schemaStore);
        filteringSelect_.set("searchAttr", "name");
        filteringSelect_.startup();
        console.log("FilteringSelect widget started successfully.");
      } else {
        console.error("FilteringSelect widget not found!");
      }
    },

    onAddGenomeGroup: function () {
      console.log("Fetching genome group path...");

      var path = this.input_genome_group;
      if (!path) {
        console.warn("No genome group path provided.");
        return;
      }

      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data === "string") {
          res.data = JSON.parse(res.data);
        }

        if (res?.data?.id_list?.genome_id) {
          var newGenomeIds = res.data.id_list.genome_id;
          this.checkBacterialGenomes(newGenomeIds, groupType, false, path);
        }
      }));
    },

    validate: function () {
      return this.inherited(arguments);
    },

    validateGenomeGroup: function () {
      // this.submitButton.set('disabled', true);
      var path = this.select_genomegroup.searchBox.item.path;
      var genomes_valid = true;
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list && res.data.id_list.genome_id) {
          // viral genome checks
          genomes_valid = this.checkViralGenomes(res.data.id_list.genome_id);
        }
      }));
      return genomes_valid;
    },

    onSelectSchema: function () {
      var schemaStore = new Memory({
        data: [
          { name: "Acinetobacter baumannii", id: "Acinetobacter_baumannii" },
          { name: "Bacillus anthracis", id: "Bacillus_anthracis" },
          { name: "Bordetella pertussis", id: "Bordetella_pertussis" },
          { name: "Brucella melitensis", id: "Brucella_melitensis" },
          { name: "Brucella spp.", id: "Brucella_spp." },
          { name: "Burkholderia mallei (FLI)", id: "Burkholderia_mallei_FLI" },
          { name: "Burkholderia mallei (RKI)", id: "Burkholderia_mallei_RKI" },
          { name: "Burkholderia pseudomallei", id: "Burkholderia_pseudomallei" },
          { name: "Campylobacter jejuni/coli", id: "Campylobacter_jejuni_coli" },
          { name: "Clostridioides difficile", id: "Clostridioides_difficile" },
          { name: "Clostridium perfringens", id: "Clostridium_perfringens" },
          { name: "Corynebacterium diphtheriae", id: "Corynebacterium_diphtheriae" },
          { name: "Corynebacterium pseudotuberculosis", id: "Corynebacterium_pseudotuberculosis" },
          { name: "Cronobacter sakazakii/malonaticus", id: "Cronobacter_sakazakii_malonaticus" },
          { name: "Enterococcus faecalis", id: "Enterococcus_faecalis" },
          { name: "Enterococcus faecium", id: "Enterococcus_faecium" },
          { name: "Escherichia coli", id: "Escherichia_coli" },
          { name: "Francisella tularensis", id: "Francisella_tularensis" },
          { name: "Klebsiella oxytoca/grimontii/michiganensis/pasteurii", id: "Klebsiella_oxytoca_grimontii_michiganensis_pasteurii" },
          { name: "Klebsiella pneumoniae/variicola/quasipneumoniae", id: "Klebsiella_pneumoniae_variicola_quasipneumoniae" },
          { name: "Legionella pneumophila", id: "Legionella_pneumophila" },
          { name: "Listeria monocytogenes", id: "Listeria_monocytogenes" },
          { name: "Mycobacterium tuberculosis/bovis/africanum/canettii", id: "Mycobacterium_tuberculosis_bovis_africanum_canettii" },
          { name: "Mycobacteroides abscessus", id: "Mycobacteroides_abscessus" },
          { name: "Mycoplasma gallisepticum", id: "Mycoplasma_gallisepticum" },
          { name: "Paenibacillus larvae", id: "Paenibacillus_larvae" },
          { name: "Pseudomonas aeruginosa", id: "Pseudomonas_aeruginosa" },
          { name: "Salmonella enterica", id: "Salmonella_enterica" },
          { name: "Serratia marcescens", id: "Serratia_marcescens" },
          { name: "Staphylococcus aureus", id: "Staphylococcus_aureus" },
          { name: "Staphylococcus capitis", id: "Staphylococcus_capitis" },
          { name: "Streptococcus pyogenes", id: "Streptococcus_pyogenes" },
          { name: "Yersinia enterocolitica", id: "Yersinia_enterocolitica" }
        ]
      });

      // Using the attach point to get the widget instance
      var filteringSelect_ = registry.byId("input_schema_selection");  // Assuming you have the id attribute set

      if (filteringSelect_) {
        filteringSelect_.set("store", schemaStore);
        filteringSelect_.set("searchAttr", "name");
        filteringSelect_.startup();
        console.log("FilteringSelect widget started");
      } else {
        console.error("FilteringSelect widget not found!");
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    getValues: function () {
      var values = this.inherited(arguments);
      //  Adding genome type and analysis type for future dev
      values.input_genome_type = "genome_group";
      values.analysis_type = "chewbbaca";
      if (values.select_genomegroup) {
        values.select_genomegroup = [values.select_genomegroup];
      }
      if (values.input_genome_group) {
        values.input_genome_group = values.input_genome_group.replace(/\/\/+/g, '/');
      }
      if (values.output_path) {
        values.output_path = values.output_path.replace(/\/\/+/g, '/');
      }
      return values;
    },


    checkBaseParameters: function (values, seqcomp_values) {
      seqcomp_values.output_path = values.output_path;
      this.output_folder = values.output_path;
      seqcomp_values.output_file = values.output_file;
      this.output_name = values.output_file;
      return seqcomp_values;
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
            this.setStatusFormFill(job_data);
            this.setAlphabetFormFill(job_data);
            this.setUnalignedInputFormFill(job_data);
            this.setReferenceFormFill(job_data);
            // this.addSequenceFilesFormFill(job_data);
            this.setAlignerFormFill(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },
  });
});
