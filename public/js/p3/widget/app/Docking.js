define([
  'dojo/_base/declare', 'dojo/_base/array', 'dojo/topic', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/fx/Toggler',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Docking.html', './AppBase',
  'dojo/_base/lang', '../../WorkspaceManager'
], function (
  declare, array, Topic, WidgetBase, on,
  Toggler,
  domClass, Templated, WidgetsInTemplate,
  Template, AppBase, lang, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'Docking',
    templateString: Template,
    applicationName: 'Docking',
    requireAuth: true,
    applicationLabel: 'Docking',
    applicationDescription: 'The Docking service computes a set of docking poses given a protein structure and set of small-molecule ligands.',
    applicationHelp: 'quick_references/services/docking_service.html',
    tutorialLink: 'tutorial/docking/docking.html',
    videoLink: '',
    pageTitle: 'Docking Service | BV-BRC',
    required: true,
    defaultPath: '',

    constructor: function () {
      this._autoTaxSet = false;
      this._autoNameSet = false;
    },

    startup: function () {
      var _self = this;
      if (this._started) { return; }
      this.inherited(arguments);
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },
    postCreate: function () {
      this.onInputChange()
    },

    checkParameterRequiredFields: function () {
      if (this.pdb_list.get('item')
         && this.output_path.get('value') && this.output_name.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    onPdbPreview: function (evt) {
      var pdb_id = this.pdb_list.get('displayedValue');
      Topic.publish('/navigate', { href: '/view/ProteinStructure#accession=' + pdb_id, target: 'blank' })
    },

    onPdbIdChange: function (evt) {
      console.log('pdb id change');
      this.pdb_preview.set('disabled', !this.pdb_list.get('displayedValue'));

    },

    onDropdownChange: function (evt) {
      console.log("this is a drop down change")
      console.log(this.smiles_dropdown.value)
    },

    onInputChange: function (evt) {

      console.log('onInputChange: ' + this.input_sequence.checked + ' ' + this.ws_file.checked);
      if (this.input_sequence.checked)
      {
        dojo.style(this.block_smiles_text, 'display', 'block');
        dojo.style(this.block_smiles_ws, 'display', 'none');
        dojo.style(this.block_smiles_dropdown, 'display', 'none');
      }
      else if (this.ws_file.checked)
      {
        dojo.style(this.block_smiles_text, 'display', 'none');
        dojo.style(this.block_smiles_ws, 'display', 'block');
        dojo.style(this.block_smiles_dropdown, 'display', 'none');
      }
      else if (this.ligand_named_library.checked)
        {
        dojo.style(this.block_smiles_text, 'display', 'none');
        dojo.style(this.block_smiles_ws, 'display', 'none');
        dojo.style(this.block_smiles_dropdown, 'display', 'block');
      }

    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    /*
    {
    "pdb_id": "1A47",
    "pdb_preview": "",
    "input": "smiles_list",
    "smiles_text": "asdfasdf",
    "smiles_ws_file": "",
    "output_path": "/olson@patricbrc.org/home/test/test1/test2",
    "output_file": "abc"
} */
    getValues: function () {
      var values = this.inherited(arguments);

      var submit_values = {
        input_pdb: [values.pdb_id],
        ligand_library_type: values.input,
        output_path: values.output_path,
        output_file: values.output_file,
      }
      if (values.input === 'smiles_list')
      {
        /* Parse out either smiles strings, one per line, or
         * id / smiles-string pairs.
         */

        var lines = values.smiles_text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        var row = 0;
        var elts = lines.map((l) => {
          row++;
          var cols = l.split(/\s+/);
          if (cols.length >= 2)
          {
            return cols.slice(0, 2);
          }
          else if (cols.length === 1) {
            return ['id-' + row, cols[0]];
          }
        });

        submit_values.ligand_smiles_list = elts;
      }
      else if (values.input === 'ws_file')
      {
        submit_values.ligand_ws_file = values.smiles_ws_file;
      }
      else if (values.input === 'named_library')
      {
        submit_values.ligand_named_library = values.smiles_dropdown
      }
      console.log(values + ' ' + submit_values);

      return submit_values;
    },

    addRerunFields: function (job_params) {
      console.log(job_params);

      var ligand_library_type = job_params['ligand_library_type']; 
      if (ligand_library_type === "ws_file"){
        this.ws_file.checked
        this.ws_file.set('value', ligand_library_type);
        this.smiles_ws_file.set('value', job_params['ligand_ws_file']);

        } 
      else if (ligand_library_type === "smiles_list"){
        console.log('line 171')
        this.input_sequence.checked;
        this.input_sequence.set('value', ligand_library_type);
        console.log(job_params['ligand_smiles_list']);
        let user_input = job_params['ligand_smiles_list'];
        let combined_string = '';
        console.log(user_input);
        user_input.forEach(subArray => {
          console.log(subArray);
          combined_string += subArray[0] + ' ' + subArray[1] + '\n'
          // subArray.forEach(item => {
          //   console.log(item)
          //   // item_joined = item.join();
          //   // item_joined = item + ' ' + item
          //   combined_string += item + '\n'; // Append each item followed by a newline character
          //   // combined_string += item
          // });
          // // combined_string += item_joined + '\n'
        });
        
        console.log(combined_string);
        this.smiles_text.set('value', combined_string);
      } 
      else if (ligand_library_type === "named_library"){
        this.ligand_named_library.checked;
        this.ligand_named_library.set('value', ligand_library_type);
        this.smiles_dropdown.set('value', job_params['ligand_named_library'])
        this.ligand_named_library.set('value', job_params['ligand_named_library']);
      } 
      else{
        console.log("Improper ligand library type passed.")
      }
      this.pdb_list.set('value', job_params["input_pdb"]);
      this.output_path.set('value', job_params['output_path']);
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
            var param_dict = { 'output_folder': 'output_path', 'strategy': 'recipe' };
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            // This grabs the job parameters according to the rerun key (from the brower memory)
            this.addRerunFields(JSON.parse(sessionStorage.getItem(rerun_key)));
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
