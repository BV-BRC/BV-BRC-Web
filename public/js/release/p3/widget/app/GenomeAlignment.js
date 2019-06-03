require({cache:{
'url:p3/widget/app/templates/GenomeAlignment.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,keyup:validate\">\n\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n\n        <div class=\"WarningAlert\">\n          This service is currently <i>beta</i>.\n        </div>\n      <span class=\"breadcrumb\">Services</span>\n      <h3>\n       ${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <!--\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n            <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n        </div>\n        -->\n      </h3>\n      <p>\n        The Whole Genome Alignment Service aligns genomes using <a href=\"https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0011147\" target=\"_blank\">progressiveMauve</a>.\n        For further explanation, please see the <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">Genome Alignment User Guide</a>.\n      </p>\n    </div>\n    <br>\n\n    <div style=\"width: 600px; margin:auto\" class=\"formFieldsContainer\">\n      <div class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Select Genomes</label>\n          <div name=\"select-genomes\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <small>Add at least 2 (up to 20) genomes.  Note the first genome selected will be the reference (anchor) genome.</small><br>\n          <label>Select genome</label><br>\n          <div style=\"width:490px;\"\n            data-dojo-type=\"p3/widget/GenomeNameSelector\"\n            name=\"genomeSelector\"\n            maxHeight=\"200\"\n            required=\"false\"\n            data-dojo-attach-point=\"genomeSelector\"\n            data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\">\n          </div>\n\n          <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddGenome\" class=\"app-btn\">\n            <i class=\"icon-plus\"></i> Add\n          </button>\n\n          <br>\n\n          <!-- floating since the width on object selector is odd -->\n          <div class=\"left\">\n          <label>And/or select genome group</label><br>\n            <div style=\"width: 495px;\"\n            data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n              name=\"genomeGroupSelector\"\n            required=\"false\"\n              data-dojo-attach-point=\"genomeGroupSelector\"\n              data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\">\n            </div>\n          </div>\n\n          <div class=\"left\" style=\"margin-top: 13px;\">\n            <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddGenomeGroup\" class=\"app-btn\">\n              <i class=\"icon-plus\"></i> Add\n            </button>\n          </div>\n          <div class=\"clear\"></div>\n        </div>\n\n\n        <div class=\"appRow\">\n          <label>Selected Genomes:</label> <small class=\"loading-status pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n        </div>\n\n        <div data-dojo-attach-point=\"genomeTable\" style=\"margin-right: 20px;\">\n        </div>\n      </div>\n\n      <div class=\"appBox appShadow\">\n        <div class=\"\">\n          <div style=\"width:85%; display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n            name=\"output_path\"\n            data-dojo-attach-point=\"output_path\"\n            required=\"true\"\n            data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\">\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n            data-dojo-attach-event=\"onChange:checkOutputName\"\n            name=\"output_file\"\n            data-dojo-attach-point=\"output_file\"\n            style=\"width:85%\"\n            required=\"true\"\n            data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\">\n          </div>\n        </div>\n\n        <!--\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Method</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\" style=\"width:300px\" required=\"false\" data-dojo-props=\"intermediateChanges:true,trim:true\">\n              <option value=\"progressiveMauve\">progressiveMauve (recommended)</option>\n              <option value=\"mauveAligner\">mauveAligner (legacy)</option>\n            </select>\n          </div>\n        -->\n\n        <!-- advanced options -->\n        <div class=\"appRow\" style=\"margin-top: 20px;\">\n          <div data-dojo-attach-point=\"advanced\">\n            <label class=\"largelabel\">Advanced (Optional) </label>\n            <div class=\"iconbox\" style=\"margin-left:0px\">\n              <i data-dojo-attach-point=\"advicon\" class=\"fa icon-caret-down fa-1\"></i>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"appRow\" data-dojo-attach-point=\"advrow\" style=\"display: none;\">\n          <div class=\"appRowSegment pull-left\" style=\"text-align: left; margin-right: 20px;\">\n            <label>Manually Set Seed Weight</label>\n            <div data-dojo-attach-point=\"seedWeightSwitch\"\n              data-dojo-attach-event=\"onClick:onSeedWeightSwitch\"\n              class=\"onoffswitch\">\n              <input type=\"checkbox\"\n                value=\"off\"\n                name=\"onoffswitch\"\n                class=\"onoffswitch-checkbox\"\n                data-dojo-attach-point=\"seedWeightSwitch\" />\n\n              <label class=\"onoffswitch-label\">\n                <span class=\"onoffswitch-inner\"></span>\n                <span class=\"onoffswitch-switch\"></span>\n              </label>\n            </div>\n          </div>\n\n          <div class=\"appRowSegment pull-left\" data-dojo-attach-point=\"seedContainer\" style=\"display: none;\">\n            <label>Seed Weight</label><br>\n            <div name=\"seedWeight\"\n              class=\"medInput\"\n              data-dojo-type=\"dijit/form/HorizontalSlider\"\n              data-dojo-attach-point=\"seedWeight\"\n              data-dojo-props=\"value:15,\n                minimum:3,\n                maximum:21,\n                discreteValues:19,\n                intermediateChanges:true,\n                showButtons:false\"\n              required=\"false\"\n              >\n                <div data-dojo-type=\"dijit/form/HorizontalRule\"\n                  container=\"bottomDecoration\"\n                  count=19\n                  style=\"height:5px;\">\n                </div>\n                <ol data-dojo-type=\"dijit/form/HorizontalRuleLabels\"\n                  container=\"bottomDecoration\"\n                  style=\"height:1em;font-size:75%;color:gray;\">\n                  <li>3</li>\n                  <li>5</li>\n                  <li>7</li>\n                  <li>9</li>\n                  <li>11</li>\n                  <li>13</li>\n                  <li>15</li>\n                  <li>17</li>\n                  <li>19</li>\n                  <li>21</li>\n                </ol>\n            </div>\n          </div>\n          <div class=\"clear\"></div>\n\n          <br>\n          <style>.param-table td:first-child { width: 32%; padding-right: 7px; text-align: right;}</style>\n          <table class=\"param-table\">\n            <thead>\n              <th>\n                <td></td>\n                <td></td>\n              </th>\n            </thead>\n            <tbody>\n              <tr>\n                <td><label>Max Gapped Aligner Length:</label></td>\n                <td>\n                  <div name=\"maxGappedAlignerLength\"\n                  class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"maxGappedAlignerLength\"\n                    data-dojo-props=\"placeholder: 'Max number of base pairs'\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Max Breakpoint distance Scale:</label></td>\n                <td>\n                  <div name=\"maxBreakpointDistanceScale\"\n                  class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"maxBreakpointDistanceScale\"\n                    data-dojo-props=\"placeholder: 0.9,constraints:{min:0,max:1}\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Conservation Distance:</label></td>\n                <td>\n                  <div name=\"conservationDistanceScale\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"conservationDistanceScale\"\n                    data-dojo-props=\"placeholder: 1.0,constraints:{min:0,max:1}\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Weight:</label></td>\n                <td>\n                  <div name=\"weight\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"weight\"\n                    data-dojo-props=\"placeholder: 'Min pairwise LCB score'\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>Minimum Scaled Penalty:</label></td>\n                <td>\n                  <div name=\"minScaledPenalty\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"minScaledPenalty\"\n                    data-dojo-props=\"placeholder: 'Min breakpoint penalty after scaling'\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                <td><label>hmm-p-go-homologous:</label></td>\n                <td>\n                  <div name=\"hmmPGoHomologous\"\n                    class=\"medInput\"\n                    data-dojo-type=\"dijit/form/NumberTextBox\"\n                    data-dojo-attach-point=\"hmmPGoHomologous\"\n                    data-dojo-props=\"placeholder: 0.0001\"\n                    required=\"false\">\n                  </div>\n                </td>\n              </tr>\n\n              <tr>\n                  <td><label>hmm-p-go-homologous:</label></td>\n                  <td>\n                    <div name=\"hmmPGoUnrelated\"\n                      class=\"medInput\"\n                      data-dojo-type=\"dijit/form/NumberTextBox\"\n                      data-dojo-attach-point=\"hmmPGoUnrelated\"\n                      data-dojo-props=\"placeholder: 0.000001\"\n                      required=\"false\">\n                    </div>\n                  </td>\n                </tr>\n            </tbody>\n          </table>\n\n        </div>\n\n      </div>\n\n    </div><!-- end form -->\n  </div>\n\n\n  <div class=\"appSubmissionArea\">\n    <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n      Submitting Genome Alignment Job\n    </div>\n    <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n      Error Submitting Job. Please check the submission form.\n    </div>\n    <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n      The Genome Alignment job has been submitted. This could take a few mins to hours to complete, depending on the number of genomes. Check your workspace to see the progress of your job.\n    </div>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n      <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/GenomeAlignment", [
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/GenomeAlignment.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
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
    applicationName: 'GenomeAlignment',
    applicationHelp: 'user_guides/services/genome_alignment_service.html',
    tutorialLink: 'tutorial/genome_alignment/genome_alignment.html',
    pageTitle: 'Genome Alignment',
    requireAuth: true,
    applicationLabel: 'Genome Alignment (Mauve)',
    applicationDescription: 'The Whole Genome Alignment Service aligns genomes using progressiveMauve.',
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
        colKeys: ['name', 'id'],
        label: {
          rowIndex: 1,
          colKey: 'name',
          format: function (obj) { return obj.name + ' <b>[Reference Genome]</b>'; }
        }
      });
      domConstruct.place(selectedTable.domNode, this.genomeTable);

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

      this._started = true;
    },


    // listen for "manually set seed weight" toggle
    onSeedWeightSwitch: function () {
      var checked = !this.seedWeightSwitch.checked;
      this.seedWeightSwitch.checked = checked;
      domStyle.set( this.seedContainer, 'display', checked ? 'block' : 'none');
      this.seedWeight.set('disabled', !this.seedWeightSwitch.checked);
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

    // called on event from dom
    onAddGenome: function (evt) {
      this.addGenome();
    },

    // adds currently selected genome, or provided genome
    addGenome: function (genomeInfo /* optional */) {
      var self = this;

      // if adding genome directly from object selector
      if (!genomeInfo) {
        var id = self.genomeSelector.value,
          name = self.genomeSelector.get('displayedValue');

        if (!id) return;

        var genomeInfo = {
          id: id,
          name: name
        };
      }

      self.selectedTable.addRow(genomeInfo);
    },

    onAddGenomeGroup: function () {
      var self = this;

      var path = self.genomeGroupSelector.value;

      domStyle.set( query('.loading-status')[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {

        var data = typeof res.data == 'string' ? JSON.parse(res.data) : res.data;
        var genomeIDs =  data.id_list.genome_id;

        when(self.getGenomeInfo(genomeIDs), function (genomeInfos) {
          genomeInfos.forEach(function (info) {
            self.addGenome(info);
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
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var obj = Object.assign({}, values);

      // ignore unneeded values
      delete obj.genomeGroupSelector;
      delete obj.genomeSelector;

      // if seedWeight isn't specified, let mauve figure it out
      if (!this.seedWeightSwitch.checked) obj.seedWeight = null;

      // get the ids from table selection
      var genomeIDs = this.selectedTable.getRows().map(function (obj) { return obj.id; });

      obj.genome_ids = genomeIDs;
      obj.recipe = 'progressiveMauve';
      obj.output_path = values.output_path;
      obj.output_file = values.output_file;

      return obj;
    }
  });

});
