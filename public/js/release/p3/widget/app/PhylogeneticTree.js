require({cache:{
'url:p3/widget/app/templates/PhylogeneticTree.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>${applicationLabel}\n                <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                </div>\n                <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                    <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n                </div>\n            </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a>        and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n\n    <div class=\"formFieldsContainer\">\n      <div style=\"display: none;\">\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\" data-dojo-attach-point=\"inGroupNumGenomes\" data-dojo-props=\"constraints:{min:0,max:100},\" />\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\" data-dojo-attach-point=\"outGroupNumGenomes\" data-dojo-props=\"constraints:{min:0,max:5},\" />\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\" data-dojo-attach-point=\"codonGroupNumGenomes\" data-dojo-props=\"constraints:{min:4,max:200},\" />\n      </div>\n      <div id=\"startWithBox\" style=\"width:400px;\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Method:</label>\n          <div name=\"methods\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"startWithCodonTree\" name=\"startWith\" value=\"condonTree\" checked />\n          <label for=\"radio1\">Codon Tree</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"startWithPEPR\" name=\"startWith\" value=\"PEPR\" data-dojo-attach-event=\"onChange:onStartWithChange\" />\n          <label for=\"radio2\">All Shared Proteins</label>\n        </div>\n      </div>\n      <table data-dojo-attach-point=\"PEPRTable\" style=\"width:100%; display:none\">\n        <tr>\n          <td>\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Ingroup Genomes</label>\n                  <div name=\"ingroup-genomes-selection\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n                <br>\n                <div class=\"appsublabel\">Add at least 3 (up to 100 ) genomes.</div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Select genome</label><br>\n                <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"in_genome_id\" maxHeight=\"200\" required=\"false\" data-dojo-attach-point=\"in_genome_id\"></div>\n                <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddInGroupGenome\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n                <br>\n                <label class=\"paramlabel\">And/or select genome group</label><br>\n                <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"in_genomes_genomegroup\" required=\"false\" data-dojo-attach-point=\"in_genomes_genomegroup\" data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\"></div>\n                <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddInGroupGenomeGroup\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n                <br>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\"> selected ingroup genome table</label>\n                <small class=\"loading-status-inGroup pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n              </div>\n              <div class=\"appRow\" style=\"width:90%; margin-top:5px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"inGroupGenomeTable\" style=\"margin:0 5px 0 2px; width: 315px;\">\n                  <tbody data-dojo-attach-point=\"inGroupGenomeTableBody\">\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          </td>\n          <td>\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Outgroup Genomes</label>\n                  <div name=\"outgroup-genomes\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n                <br>\n                <div class=\"appsublabel\">Add at least 1 (up to 5) genome to root the tree.</div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Select genome</label><br>\n                <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"out_genome_id\" maxHeight=\"200\" required=\"false\" data-dojo-attach-point=\"out_genome_id\"></div>\n                <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddOutGroupGenome\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n                <br>\n                <label class=\"paramlabel\">And/or select genome group</label><br>\n                <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"out_genomes_genomegroup\" required=\"false\" data-dojo-attach-point=\"out_genomes_genomegroup\" data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\"></div>\n                <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddOutGroupGenomeGroup\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n                <br>\n              </div>\n\n              <div class=\"appRow\">\n                <label class=\"paramlabel\"> selected outgroup genome table</label>\n                <small class=\"loading-status-outGroup pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n              </div>\n\n              <div class=\"appRow\" style=\"width:90%; margin-top:5px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"outGroupGenomeTable\" style=\"margin:0 5px 0 2px; width: 315px;\">\n                  <tbody data-dojo-attach-point=\"outGroupGenomeTableBody\">\n\n                  </tbody>\n                </table>\n              </div>\n\n            </div>\n          </td>\n        </tr>\n      </table>\n\n      <div data-dojo-attach-point=\"codonTreeTable\" style=\"width:400px\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Input Genomes</label>\n            <div name=\"input-genomes\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n          <br>\n          <div class=\"appsublabel\">Add at least 4 (up to 100 ) genomes.</div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Select genome</label><br>\n          <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"codon_genome_id\" maxHeight=\"200\" required=\"false\" data-dojo-attach-point=\"codon_genome_id\"></div>\n          <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddCodonGroupGenome\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n          <br>\n          <label class=\"paramlabel\">And/or select genome group</label><br>\n          <div style=\"width:78%;display:inline-block;\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"codon_genomes_genomegroup\" required=\"false\" data-dojo-attach-point=\"codon_genomes_genomegroup\" data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\"></div>\n          <button data-dojo-type=\"dijit/form/Button\" data-dojo-attach-event=\"click:onAddCodonGroupGenomeGroup\" class=\"app-btn\"><i class=\"icon-plus\"></i> Add</button>\n          <br>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\"> selected input genome table</label>\n          <small class=\"loading-status-codonGroup pull-right\" style=\"margin-right: 20px; display: none;\">loading...</small>\n        </div>\n        <div class=\"appRow\" style=\"width:90%; margin-top:10px; text-align: center;\">\n          <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"codonGroupGenomeTable\" style=\"margin:0 2px 0 2px; width:315px;\">\n            <tbody data-dojo-attach-point=\"codonGroupGenomeTableBody\">\n            </tbody>\n          </table>\n        </div>\n    </div>\n\n      <div id=\"parameterBox\" style=\"width:400px; \" class=\"appBox appShadow\">\n        <div data-dojo-attach-point=\"parameters_codon_tree\" class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters-codon-tree\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div data-dojo-attach-point=\"parameters_all_shared_proteins\" style=\"display:none\" class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters-all-shared-proteins\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" data-dojo-attach-point=\"output_path\" required=\"true\" data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" data-dojo-attach-event=\"onChange:checkOutputName\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:85%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n        </div>\n        <div data-dojo-attach-point=\"codonOtherInputs\">\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Number of Genes:</label>\n            <div name=\"number_of_genes\" class=\"medInput\">\n              <select data-dojo-attach-point=\"number_of_genes\"\n                data-dojo-type=\"dijit/form/Select\" name=\"number_of_genes\" required=\"false\">\n                <option value=\"10\">10</option>\n                <option value=\"20\">20</option>\n                <option value=\"50\">50</option>\n                <option value=\"100\" selected=\"selected\">100</option>\n                <option value=\"500\">500</option>\n                <option value=\"1000\">1000</option>\n              </select>\n            </div>\n          </div>\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Max Allowed Deletions (0~10):</label>\n            <div name=\"max_genomes_missing\"\n              class=\"medInput\"\n              data-dojo-type=\"dijit/form/NumberTextBox\"\n              data-dojo-attach-point=\"max_genomes_missing\"\n              data-dojo-props=\"constraints:{min:0,max:10}\"\n              value=\"0\">\n            </div>\n          </div>\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Max Allowed Duplications (0~10):</label>\n            <div name=\"max_allowed_dups\"\n              class=\"medInput\"\n              data-dojo-type=\"dijit/form/NumberTextBox\"\n              data-dojo-attach-point=\"max_allowed_dups\"\n              data-dojo-props=\"constraints:{min:0,max:10}\"\n              value=\"0\">\n            </div>\n          </div>\n        </div>\n        <div data-dojo-attach-point=\"PEPROtherInputs\" style=\"display: none;\">\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Full Tree Method</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" name=\"full_tree_method\" data-dojo-attach-point=\"full_tree_method\" style=\"width:300px\" required=\"false\" data-dojo-props=\"intermediateChanges:true,trim:true\">\n              <option value=\"ft\">FastTree</option>\n              <option value=\"ml\">Maximum Likelihood (RAxML)</option>\n            </select>\n          </div>\n        </div>\n      </div>\n  </div>\n  <div class=\"appSubmissionArea\">\n    <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n      Submitting Phylogenetic Tree Building Job.\n    </div>\n    <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n      Error Submitting Job. Please check the submission form.\n    </div>\n    <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n      The Phylogenetic Tree job has been submitted. This could take hours to a day to complete, depending on the number of genomes and their size. Check your workspace to see the progress of your job.\n    </div>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n      <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/PhylogeneticTree", [
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-class',
  'dojo/text!./templates/PhylogeneticTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/lang', 'dojo/domReady!', 'dojo/query', 'dojo/dom', 'dojo/dom-style',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  '../../WorkspaceManager', 'dojo/when'
], function (
  declare, on, domClass,
  Template, AppBase, domConstruct, registry,
  lang, domReady, query, dom, domStyle,
  popup, TooltipDialog, Dialog,
  WorkspaceManager, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'CodonTree',
    requireAuth: true,
    applicationLabel: 'Phylogenetic Tree Building',
    applicationDescription: 'The Phylogenetic Tree Building Service enables construction of custom phylogenetic trees for user-selected genomes.',
    applicationHelp: 'user_guides/services/phylogenetic_tree_building_service.html',
    tutorialLink: 'tutorial/codon_tree_building/codon_tree_building.html',
    pageTitle: 'Phylogenetic Tree Building',
    defaultPath: '',
    startingRows: 9,

    constructor: function () {
      this._selfSet = true;
      this.inGroup = {};
      this.inGroup.addedList = []; // list of genome id, duplicate is allowed
      this.inGroup.addedNum = 0;
      this.inGroup.genomeToAttachPt = ['in_genome_id'];
      this.inGroup.genomeGroupToAttachPt = ['in_genomes_genomegroup'];
      this.inGroup.maxGenomes = 100;
      this.outGroup = {};
      this.outGroup.addedList = [];
      this.outGroup.addedNum = 0;
      this.outGroup.genomeToAttachPt = ['out_genome_id'];
      this.outGroup.genomeGroupToAttachPt = ['out_genomes_genomegroup'];
      this.outGroup.maxGenomes = 5;
      this.codonGroup = {};
      this.codonGroup.addedList = [];
      this.codonGroup.addedNum = 0;
      this.codonGroup.genomeToAttachPt = ['codon_genome_id'];
      this.codonGroup.genomeGroupToAttachPt = ['codon_genomes_genomegroup'];
      this.codonGroup.maxGenomes = 200;
      this.selectedTR = []; // list of selected TR for ingroup and outgroup, used in onReset()
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

      this.emptyTable(this.inGroupGenomeTable, this.startingRows);
      this.emptyTable(this.outGroupGenomeTable, this.startingRows);
      this.emptyTable(this.codonGroupGenomeTable, this.startingRows);
      this.inGroupNumGenomes.startup();
      this.outGroupNumGenomes.startup();
      this.codonGroupNumGenomes.startup();
      this._started = true;
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);// domConstr.create("tr",{},this.genomeTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        if (attachname == 'output_path') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'in_genomes_genomegroup' || attachname == 'out_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var attachType = 'genomes_genomegroup';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          var outDuplicate = this.checkDuplicate(cur_value, 'out', attachType);
          success = success * inDuplicate * outDuplicate;
        }
        else if (attachname == 'in_genome_id' || attachname == 'out_genome_id') {
          cur_value = this[attachname].value;
          var attachType = 'genome_id';
          var inDuplicate = this.checkDuplicate(cur_value, 'in', attachType);
          var outDuplicate = this.checkDuplicate(cur_value, 'out', attachType);
          success = success * inDuplicate * outDuplicate;
        }
        else if (attachname == 'codon_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var attachType = 'genomes_genomegroup';
          var duplicate = this.checkDuplicate(cur_value, 'codon', attachType);
          success *= duplicate;
        }
        else if (attachname == 'codon_genome_id') {
          cur_value = this[attachname].value;
          var attachType = 'genome_id';
          var duplicate = this.checkDuplicate(cur_value, 'codon', attachType);
          success *= duplicate;
        }
        else {
          cur_value = this[attachname].value;
        }

        // console.log('cur_value=' + cur_value);

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

    checkDuplicate: function (cur_value, groupTypePrefix, attachType) {
      var success = 1;
      var genomeIds = [];
      var genomeList = query('.' + groupTypePrefix + 'GroupGenomeData');
      genomeList.forEach(function (item) {
        genomeIds.push(item.genomeRecord[groupTypePrefix + '_' + attachType]);
      });
      if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) { // found duplicate
        success = 0;
      }
      return success;
    },

    makeGenomeName: function (groupType) {
      var name = this[this[groupType].genomeToAttachPt].get('displayedValue');
      var maxLength = 36;
      return this.genDisplayName(name, maxLength);
    },

    makeGenomeGroupName: function (groupType, newGenomeIds) {
      var name = this[this[groupType].genomeGroupToAttachPt].searchBox.get('displayedValue');
      var maxLength = 36;
      return this.genDisplayName(name, maxLength) + ' (' + newGenomeIds.length + ' genomes)';
    },

    genDisplayName: function (name, maxLength) { // generate a display name up to maxLength
      var display_name = name;
      if (name.length > maxLength) {
        display_name = name.substr(0, (maxLength / 2) - 2) + '...' + name.substr((name.length - (maxLength / 2)) + 2);
      }
      return display_name;
    },

    increaseGenome: function (groupType, newGenomeIds) {
      newGenomeIds.forEach(lang.hitch(this, function (id) {
        this[groupType].addedList.push(id);
      }));
      this[groupType].addedNum = this[groupType].addedList.length;
      this[groupType + 'NumGenomes'].set('value', Number(this[groupType].addedNum));
    },

    decreaseGenome: function (groupType, newGenomeIds) {
      newGenomeIds.forEach(lang.hitch(this, function (id) {
        var idx = this[groupType].addedList.indexOf(id);
        if (idx > -1) {
          this[groupType].addedList.splice(idx, 1);
        }
      }));
      this[groupType].addedNum = this[groupType].addedList.length;
      this[groupType + 'NumGenomes'].set('value', Number(this[groupType].addedNum));
    },

    onAddInGroupGenome: function () {
      var groupType = 'inGroup';
      this.onAddGenome(groupType);
    },

    onAddOutGroupGenome: function () {
      var groupType = 'outGroup';
      this.onAddGenome(groupType);
    },

    onAddCodonGroupGenome: function () {
      var groupType = 'codonGroup';
      this.onAddGenome(groupType);
    },

    onAddGenome: function (groupType) {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      lrec.groupType = groupType;
      var chkPassed = this.ingestAttachPoints(this[groupType].genomeToAttachPt, lrec);
      // console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);

      if (chkPassed && this[groupType].addedNum < this[groupType].maxGenomes) {
        var newGenomeIds = [lrec[this[groupType].genomeToAttachPt]];
        var tr = this[groupType + 'GenomeTable'].insertRow(0);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName(groupType) + '</div>';
        // added info icon to show all genome ids in the genome group
        var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
        var ihandle = new TooltipDialog({
          content: 'genome id: ' + newGenomeIds[0],
          onMouseLeave: function () {
            popup.close(ihandle);
          }
        });
        on(tdinfo, 'mouseover', function () {
          popup.open({
            popup: ihandle,
            around: tdinfo
          });
        });
        on(tdinfo, 'mouseout', function () {
          popup.close(ihandle);
        });

        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this[groupType].addedNum < this.startingRows) {
          this[groupType + 'GenomeTable'].deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
          domConstruct.destroy(tr);
          this.decreaseGenome(groupType, newGenomeIds);
          if (this[groupType].addedNum < this.startingRows) {
            var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        lrec.handle = handle;
        this.selectedTR.push(lrec);
        this.increaseGenome(groupType, newGenomeIds);
      }
      // console.log(lrec);
    },

    onAddInGroupGenomeGroup: function () {
      var groupType = 'inGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddOutGroupGenomeGroup: function () {
      var groupType = 'outGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddCodonGroupGenomeGroup: function () {
      var groupType = 'codonGroup';
      this.onAddGenomeGroup(groupType);
    },

    onAddGenomeGroup: function (groupType) {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      lrec.groupType = groupType;
      var chkPassed = this.ingestAttachPoints(this[groupType].genomeGroupToAttachPt, lrec);
      // console.log("this[groupType].genomeGroupToAttachPt = " + this[groupType].genomeGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      var path = lrec[this[groupType].genomeGroupToAttachPt];
      if (path == '') {
        return;
      }
      var loadingQueryString = '.loading-status-' + groupType;
      domStyle.set( query(loadingQueryString)[0], 'display', 'block');
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            var newGenomeIds =  res.data.id_list.genome_id;
          }
        }
        domStyle.set( query(loadingQueryString)[0], 'display', 'none');
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this[groupType].addedNum + newGenomeIds.length;
        if (count > this[groupType].maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this[groupType].maxGenomes + ' genomes';
          // msg += ' in ' + groupType[0].toUpperCase() + groupType.substring(1).toLowerCase();
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }
        // console.log("newGenomeIds = ", newGenomeIds);
        if (chkPassed && newGenomeIds.length > 0
          && this[groupType].addedNum + newGenomeIds.length <= this[groupType].maxGenomes) {
          var tr = this[groupType + 'GenomeTable'].insertRow(0);
          lrec.row = tr;
          var td = domConstruct.create('td', { 'class': 'textcol ' + groupType + 'GenomeData', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeGroupName(groupType, newGenomeIds) + '</div>';
          // added info icon to show all genome ids in the genome group
          if (newGenomeIds.length) {
            var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
            var ihandle = new TooltipDialog({
              content: 'click to see all genome id.',
              onMouseLeave: function () {
                popup.close(ihandle);
              }
            });
            var ihandle2 = new Dialog({
              title: 'Genome ID',
              content: newGenomeIds.join('</br>'),
              style: 'width: 125px; overflow-y: auto;'
            });
            on(tdinfo, 'mouseover', function () {
              popup.open({
                popup: ihandle,
                around: tdinfo
              });
            });
            on(tdinfo, 'mouseout', function () {
              popup.close(ihandle);
            });

            on(tdinfo, 'click', function () {
              ihandle2.show();
            });
          }
          else {
            var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
          }
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
          if (this[groupType].addedNum < this.startingRows) {
            this[groupType + 'GenomeTable'].deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            // console.log("Delete Row");
            domConstruct.destroy(tr);
            this.decreaseGenome(groupType, newGenomeIds);
            if (this[groupType].addedNum < this.startingRows) {
              var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
          }));
          lrec.handle = handle;
          this.selectedTR.push(lrec);
          this.increaseGenome(groupType, newGenomeIds);
        }

      }));

      // console.log(lrec);
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
      this.selectedTR.forEach(lang.hitch(this, function (lrec) {
        domConstruct.destroy(lrec.row);
        lrec.handle.remove();
        var groupType = lrec.groupType;
        var ntr = this[groupType + 'GenomeTable'].insertRow(-1);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
      }));
      this.selectedTR = [];
      this.inGroup.addedList = [];
      this.inGroup.addedNum = 0;
      this.outGroup.addedList = [];
      this.outGroup.addedNum = 0;
    },

    getValues: function () {
      var return_values = {};
      var values = this.inherited(arguments);

      if (this.startWithPEPR.checked == true) {
        // remove duplicate genomes
        var inGroupGenomesFiltered = [];
        this.inGroup.addedList.forEach(function (id) {
          if (inGroupGenomesFiltered.indexOf(id)  == -1) {
            inGroupGenomesFiltered.push(id);
          }
        });
        var outGroupGenomesFiltered = [];
        this.outGroup.addedList.forEach(function (id) {
          if (outGroupGenomesFiltered.indexOf(id)  == -1) {
            outGroupGenomesFiltered.push(id);
          }
        });
        return_values.in_genome_ids = inGroupGenomesFiltered;
        return_values.out_genome_ids = outGroupGenomesFiltered;
        return_values.full_tree_method = values.full_tree_method;
        return_values.refinement = 'no';  // hard coded since it's removed from UI
      }
      else {
        // remove duplicate genomes
        var codonGenomesFiltered = [];
        this.codonGroup.addedList.forEach(function (id) {
          if (codonGenomesFiltered.indexOf(id)  == -1) {
            codonGenomesFiltered.push(id);
          }
        });
        return_values.genome_ids = codonGenomesFiltered;
        return_values.number_of_genes = values.number_of_genes;
        return_values.max_genomes_missing = values.max_genomes_missing;
        return_values.max_allowed_dups = values.max_allowed_dups;

      }

      return_values.output_path = values.output_path;
      return_values.output_file = values.output_file;

      return return_values;
    },

    checkParameterRequiredFields: function () {
      if (this.output_path.get('value') && this.output_nameWidget.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    onStartWithChange: function () {
      if (this.startWithCodonTree.checked == true) {
        this.applicationName = 'CodonTree';
        this.PEPRTable.style.display = 'none';
        this.PEPROtherInputs.style.display = 'none';
        this.codonOtherInputs.style.display = 'block';
        this.codonTreeTable.style.display = 'block';
        this.parameters_codon_tree.style.display = 'block';
        this.parameters_all_shared_proteins.style.display = 'none';
        this.inGroupNumGenomes.constraints.min = 0;
        this.outGroupNumGenomes.constraints.min = 0;
        this.codonGroupNumGenomes.constraints.min = 4;
        this.checkParameterRequiredFields();
      }
      if (this.startWithPEPR.checked == true) {
        this.applicationName = 'PhylogeneticTree';
        this.PEPRTable.style.display = 'block';
        this.PEPROtherInputs.style.display = 'block';
        this.codonOtherInputs.style.display = 'none';
        this.codonTreeTable.style.display = 'none';
        this.parameters_codon_tree.style.display = 'none';
        this.parameters_all_shared_proteins.style.display = 'block';
        this.inGroupNumGenomes.constraints.min = 3;
        this.outGroupNumGenomes.constraints.min = 1;
        this.codonGroupNumGenomes.constraints.min = 0;
        this.checkParameterRequiredFields();
      }
    }

  });
});
