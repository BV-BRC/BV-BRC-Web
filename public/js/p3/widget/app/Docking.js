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

    onInputChange: function (evt) {

      console.log('onInputChange: ' + this.input_sequence.checked + ' ' + this.ws_file.checked);
      if (this.input_sequence.checked)
      {
        dojo.style(this.block_smiles_text, 'display', 'block');
        dojo.style(this.block_smiles_ws, 'display', 'none');
      }
      else if (this.ws_file.checked)
      {
        dojo.style(this.block_smiles_text, 'display', 'none');
        dojo.style(this.block_smiles_ws, 'display', 'block');
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
      console.log(values + ' ' + submit_values);

      return submit_values;
    },

    addRerunFields: function (job_params) {
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
            // var widget_map = {"tax_id":"tax_idWidget"};
            // param_dict["widget_map"] = widget_map;
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
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
