require({cache:{
'url:p3/widget/app/templates/CodonTree.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,keyup:validate\">\n\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>\n       ${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <!--\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n            <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n        </div>\n        -->\n      </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a> and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n    <br>\n\n    <div style=\"width: 600px; margin:auto\" class=\"formFieldsContainer\">\n      <div class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Select Genomes</label>\n          <div name=\"select-genomes\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <small>Add at least 4 (up to 200) genomes.</small><br>\n          <label>Select genome</label><br>\n          <div style=\"width:490px;\"\n            data-dojo-type=\"p3/widget/GenomeNameSelector\"\n            name=\"genomeSelector\"\n            maxHeight=\"200\"\n            required=\"false\"\n            data-dojo-attach-point=\"genomeSelector\"\n            data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\">\n          </div>\n\n          <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddGenome\" class=\"app-btn\">\n            <i class=\"icon-plus\"></i> Add\n          </button>\n\n          <br>\n\n          <!-- floating since the width on object selector is odd -->\n          <div class=\"left\">\n          <label>And/or select genome group</label><br>\n            <div style=\"width: 495px;\"\n            data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n              name=\"genomeGroupSelector\"\n            required=\"false\"\n              data-dojo-attach-point=\"genomeGroupSelector\"\n              data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\">\n            </div>\n          </div>\n\n          <div class=\"left\" style=\"margin-top: 13px;\">\n            <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddGenomeGroup\" class=\"app-btn\">\n              <i class=\"icon-plus\"></i> Add\n            </button>\n          </div>\n          <div class=\"clear\"></div>\n        </div>\n\n\n        <div class=\"appRow\">\n          <label>Selected Genomes:</label> <small class=\"loading-status pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n        </div>\n\n        <div data-dojo-attach-point=\"genomeTable\" style=\"margin-right: 20px;\">\n        </div>\n      </div>\n\n      <div class=\"appBox appShadow\">\n        <div class=\"\">\n          <div style=\"width:85%; display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n            name=\"output_path\"\n            data-dojo-attach-point=\"output_path\"\n            required=\"true\"\n            data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\">\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n            data-dojo-attach-event=\"onChange:checkOutputName\"\n            name=\"output_file\"\n            data-dojo-attach-point=\"output_file\"\n            style=\"width:85%\"\n            required=\"true\"\n            data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\">\n          </div>\n        </div>\n\n        <!-- advanced options -->\n        <div class=\"appRow\" style=\"margin-top: 20px;\">\n          <div data-dojo-attach-point=\"advanced\">\n            <label class=\"largelabel\">Advanced (Optional) </label>\n            <div class=\"iconbox\" style=\"margin-left:0px\">\n              <i data-dojo-attach-point=\"advicon\" class=\"fa icon-caret-down fa-1\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"appRow\" data-dojo-attach-point=\"advrow\" style=\"display: none;\">\n\n          <style>.param-table td:first-child { width: 32%; padding-right: 7px; text-align: right;}</style>\n          <table class=\"param-table\">\n            <thead>\n              <th>\n                <td></td>\n                <td></td>\n              </th>\n            </thead>\n            <tbody>\n              <tr>\n                <td><label>Number of Genes:</label></td>\n                <td>\n                  <div name=\"number_of_genes\" class=\"medInput\">\n                    <select data-dojo-attach-point=\"number_of_genes\"\n                      data-dojo-type=\"dijit/form/Select\" name=\"number_of_genes\" required=\"false\">\n                      <option value=\"10\">10</option>\n                      <option value=\"20\" selected=\"selected\">20</option>\n                      <option value=\"50\">50</option>\n                      <option value=\"100\">100</option>\n                      <option value=\"500\">500</option>\n                      <option value=\"1000\">1000</option>\n                    </select>\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Bootstraps:</label></td>\n                <td>\n                  <div name=\"bootstraps\" class=\"medInput\">\n                    <select data-dojo-attach-point=\"bootstraps\"\n                      data-dojo-type=\"dijit/form/Select\" name=\"bootstraps\" required=\"false\">\n                      <option value=\"100\">Yes</option>\n                      <option value=\"0\">No</option>\n                    </select>\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Max Genomes Missing (0~10):</label></td>\n                <td>\n                  <div name=\"max_genomes_missing\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"max_genomes_missing\"\n                    data-dojo-props=\"constraints:{min:0,max:10}\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Max Allowed Duplications (0~10):</label></td>\n                <td>\n                  <div name=\"max_allowed_dups\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"max_allowed_dups\"\n                    data-dojo-props=\"constraints:{min:0,max:10}\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n\n            </tbody>\n          </table>\n\n        </div>\n\n        <!-- optional genome ids options -->\n        <div class=\"appRow\" style=\"margin-top: 20px;\">\n          <div data-dojo-attach-point=\"optionalGenomes\">\n            <label class=\"largelabel\">Additional Genomes (Optional)</label>\n            <div class=\"iconbox\" style=\"margin-left:0px\">\n              <i data-dojo-attach-point=\"optionalGenomesIcon\" class=\"fa icon-caret-down fa-1\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"appRow\" data-dojo-attach-point=\"optionalGenomesRow\" style=\"display: none;\">\n          <small>Not penalized for missing/duplicated genes.</small><br>\n          <label>Select genome</label><br>\n          <div style=\"width:490px;\"\n            data-dojo-type=\"p3/widget/GenomeNameSelector\"\n            name=\"genomeSelector\"\n            maxHeight=\"200\"\n            required=\"false\"\n            data-dojo-attach-point=\"optionalGenomeSelector\"\n            data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\">\n          </div>\n\n          <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddOptionalGenome\" class=\"app-btn\">\n            <i class=\"icon-plus\"></i> Add\n          </button>\n\n          <br>\n\n          <!-- floating since the width on object selector is odd -->\n          <div class=\"left\">\n          <label>And/or select genome group</label><br>\n            <div style=\"width: 495px;\"\n            data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n              name=\"optionalGenomeGroupSelector\"\n            required=\"false\"\n              data-dojo-attach-point=\"optionalGenomeGroupSelector\"\n              data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\">\n            </div>\n          </div>\n\n          <div class=\"left\" style=\"margin-top: 13px;\">\n            <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddOptionalGenomeGroup\" class=\"app-btn\">\n              <i class=\"icon-plus\"></i> Add\n            </button>\n          </div>\n          <div class=\"clear\"></div>\n\n          <div>\n            <label>Optional Selected Genomes:</label> <small class=\"loading-status pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n          </div>\n\n          <div data-dojo-attach-point=\"optionalGenomeTable\" style=\"margin-right: 20px;\">\n          </div>\n        </div>\n      </div>\n\n    </div><!-- end form -->\n  </div>\n\n\n  <div class=\"appSubmissionArea\">\n    <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n      Submitting Codon Tree Job\n    </div>\n    <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n      Error Submitting Job. Please check the submission form.\n    </div>\n    <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n      The Codon Tree job has been submitted. This could take a few mins to hours to complete, depending on the number of genomes. Check your workspace to see the progress of your job.\n    </div>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n      <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/CodonTree", [
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/CodonTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/query', 'dijit/Dialog', 'dojo/dom-style',
  '../../WorkspaceManager', 'dojo/when', 'dojo/request', '../SelectedTable'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, query, Dialog, domStyle,
  WorkspaceManager, when, request, SelectedTable
) {
  return declare([AppBase], {
    apiServiceUrl: window.App.dataAPI,
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'CodonTree',
    applicationHelp: 'user_guides/services/codon_tree_service.html',
    tutorialLink: 'tutorial/codon_tree/codon_tree.html',
    pageTitle: 'Codon Tree',
    requireAuth: true,
    applicationLabel: 'Codon Tree',
    applicationDescription: 'Computes a phylogenetic tree based on protein and DNA sequences of PGFams for a set of genomes.',
    startingRows: 1,

    constructor: function () {
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

      // initialize selected genome table
      var selectedTable = this.selectedTable = new SelectedTable({
        name: 'selectedGenomes',
        colNames: ['Name', 'ID'],
        colKeys: ['name', 'id']
      });
      domConstruct.place(selectedTable.domNode, this.genomeTable);

      // initialize optional selected genome table
      var optionalSelectedTable = this.optionalSelectedTable = new SelectedTable({
        name: 'optionalSelectedGenomes',
        colNames: ['Name', 'ID'],
        colKeys: ['name', 'id']
      });
      domConstruct.place(optionalSelectedTable.domNode, this.optionalGenomeTable);

      this.advrow.turnedOn = (this.advrow.style.display != 'none');
      on(this.advanced, 'click', lang.hitch(this, function () {
        this.advrow.turnedOn = (this.advrow.style.display != 'none');
        if (!this.advrow.turnedOn) {
          this.advrow.turnedOn = true;
          this.advrow.style.display = 'block';
          this.advicon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow.turnedOn = false;
          this.advrow.style.display = 'none';
          this.advicon.className = 'fa icon-caret-down fa-1';
        }
      }));

      this.optionalGenomesRow.turnedOn = (this.optionalGenomesRow.style.display != 'none');
      on(this.optionalGenomes, 'click', lang.hitch(this, function () {
        this.optionalGenomesRow.turnedOn = (this.optionalGenomesRow.style.display != 'none');
        if (!this.optionalGenomesRow.turnedOn) {
          this.optionalGenomesRow.turnedOn = true;
          this.optionalGenomesRow.style.display = 'block';
          this.optionalGenomesIcon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.optionalGenomesRow.turnedOn = false;
          this.optionalGenomesRow.style.display = 'none';
          this.optionalGenomesIcon.className = 'fa icon-caret-down fa-1';
        }
      }));
      this._started = true;
    },


    validate: function () {
      var self = this;

      var isValid;

      if (self.selectedTable.getRows().length &&
        self.output_path.value &&
        self.output_file.value) {
        isValid = true;
      }

      if (isValid) {
        self.submitButton.set('disabled', false);
      } else {
        self.submitButton.set('disabled', true);
      }

      return isValid;
    },


    onAddGenome: function () {
      this.addGenome();
    },


    // adds currently selected genome, or provided genome
    addGenome: function (optional = false) {
      var self = this;
      var genomeSelector = null;
      var selectedTable = null;

      if (!optional) {
        genomeSelector = self.genomeSelector;
        selectedTable = self.selectedTable;
      }
      else {
        genomeSelector = self.optionalGenomeSelector;
        selectedTable = self.optionalSelectedTable;
      }

      var id = genomeSelector.value,
        name = genomeSelector.get('displayedValue');

      if (!id) return;

      var genomeInfo = {
        id: id,
        name: name
      };

      selectedTable.addRow(genomeInfo);
    },


    onAddGenomeGroup: function () {
      this.addGenomeGroup();
    },


    addGenomeGroup: function (optional = false) {
      var self = this;
      var path,
        selectedTable = null;

      if (!optional) {
        path = self.genomeGroupSelector.value;
        selectedTable = self.selectedTable;
      }
      else {
        path = self.optionalGenomeGroupSelector.value;
        selectedTable = self.optionalSelectedTable;
      }

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {

        var data = typeof res.data == 'string' ? JSON.parse(res.data) : res.data;
        var genomeIDs =  data.id_list.genome_id;

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {
          genomeInfos.forEach(function (info) {
            selectedTable.addRow(info);
          });
          domStyle.set( query('.loading-status')[0], 'display', 'none');
        });
      }));
    },


    // takes genome ids, returns prom with {id: xxxx.x, name: 'org_name}
    getGenomeInfo: function (genomeIDs) {
      var url = this.apiServiceUrl +
        'genome/?in(genome_id,(' + genomeIDs.join(',') + '))&select(genome_id,genome_name)';

      return when(request.get(url, {
        headers: {
          Accept: 'application/json',
          Authorization: window.App.authorizationToken
        },
        handleAs: 'json'
      }), function (res) {
        // order matters, organize into  {id: xxxx.x, name: 'org_name}
        var info = genomeIDs.map(function (id) {
          var name = res.filter(function (obj) { return obj.genome_id == id; })[0].genome_name;

          return {
            id: id,
            name: name
          };
        });

        return info;
      });
    },

    onAddOptionalGenome: function () {
      var optional = true;
      this.addGenome(optional);
    },

    onAddOptionalGenomeGroup: function () {
      var optional = true;
      this.addGenomeGroup(optional);
    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');

        // this could be moved to app base
        if (window.App.noJobSubmission) {
          var dlg = new Dialog({
            title: 'Job Submission Params: ',
            content: '<pre>' + JSON.stringify(values, null, 4) + '</pre>'
          });
          dlg.startup();
          dlg.show();
          return;
        }

        this.submitButton.set('disabled', true);
        window.App.api.service('AppService.start_app', [this.applicationName, values]).then(function (results) {
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Submitted');
          _self.submitButton.set('disabled', false);
          registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
            obj.reset();
          });
        }, function (err) {
          console.log('Error:', err);
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;
        });
      } else {
        domClass.add(this.domNode, 'Error');
        console.log('Form is incomplete');
      }
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');

      this.selectedTable.clear();
      this.optionalSelectedTable.clear();
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var obj = Object.assign({}, values);

      // ignore unneeded values
      delete obj.genomeGroupSelector;
      delete obj.genomeSelector;
      delete obj.optionalGenomeGroupSelector;

      // get the ids from table selection
      var genomeIDs = this.selectedTable.getRows().map(function (obj) { return obj.id; });

      obj.genome_ids = genomeIDs;
      obj.output_path = values.output_path;
      obj.output_file = values.output_file;
      if (this.optionalSelectedTable.getRows().length > 0) {
        var optionalGenomeIDs = this.optionalSelectedTable.getRows().map(function (obj) { return obj.id; });
        obj.optional_genome_ids = optionalGenomeIDs;
      }
      return obj;
    }
  });

});
