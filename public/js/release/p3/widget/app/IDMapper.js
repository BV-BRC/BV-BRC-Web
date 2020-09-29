require({cache:{
'url:p3/widget/app/templates/IDMapper.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\ndojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n<div class=\"appTemplate\">\n  <div class=\"appTitle\">\n    <span class=\"breadcrumb\">Services</span>\n    <h3>${applicationLabel}\n      <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n        <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n      </div>\n      <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\" ><i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i></a>\n      </div>\n    </h3>\n  </div>\n  <div class=\"showHideSection\">\n    <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a> and\n      <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n    </p>\n    <table style=\"width:100%;margin-top:15px\">\n      <tr>\n        <td style=\"vertical-align:top;\">\n          <div class=\"appRow\" style=\"width:140px; white-space:nowrap\"> FROM:\n            <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"change:onChange\" data-dojo-attach-point=\"leftTypeSelect\">\n              <option selected=\"true\" value=\"patric_id\">PATRIC ID</option>\n              <option value=\"feature_id\">Feature ID</option>\n              <option value=\"alt_locus_tag\">Alt Locus Tag</option>\n              <option value=\"P2_feature_id\">P2 Feature ID</option>\n              <option value=\"protein_id\">RefSeq (Protein ID)</option>\n              <option value=\"refseq_locus_tag\">RefSeq Locus tag</option>\n              <option value=\"gene_id\">Gene ID</option>\n              <option value=\"gi\">GI</option>\n              <option value=\"allergome\">Allergome</option>\n              <option value=\"BioCyc\">BioCyc</option>\n              <option value=\"ChEMBL\">ChEMBL</option>\n              <option value=\"DIP\">DIP</option>\n              <option value=\"DNASU\">DNASU</option>\n              <option value=\"DisProt\">DisProt</option>\n              <option value=\"DrugBank\">DrugBank</option>\n              <option value=\"EMBL\">EMBL</option>\n              <option value=\"EMBL-CDS\">EMBL-CDS</option>\n              <option value=\"EchoBASE\">EchoBASE</option>\n              <option value=\"EcoGene\">EcoGene</option>\n              <option value=\"EnsembleGenome\">EnsembleGenome</option>\n              <option value=\"GenoList\">GenoList</option>\n              <option value=\"HOGENOM\">HOGENOM</option>\n              <option value=\"KEGG\">KEGG</option>\n              <option value=\"KO\">KO</option>\n              <option value=\"LegioList\">LegioList</option>\n              <option value=\"Leproma\">Leproma</option>\n              <option value=\"MEROPS\">MEROPS</option>\n              <option value=\"MINT\">MINT</option>\n              <option value=\"NCBI_TaxID\">NCBI_TaxID</option>\n              <option value=\"OMA\">OMA</option>\n              <option value=\"OrthoDB\">OrthoDB</option>\n              <option value=\"PDB\">PDB</option>\n              <option value=\"PeroxiBase\">PeroxiBase</option>\n              <option value=\"PhosSite\">PhosSite</option>\n              <option value=\"PptaseDB\">PptaseDB</option>\n              <option value=\"ProtClustDB\">ProtClustDB</option>\n              <option value=\"PseudoCAP\">PseudoCAP</option>\n              <option value=\"REBASE\">REBASE</option>\n              <option value=\"Reactome\">Reactome</option>\n              <option value=\"RefSeq_NT\">RefSeq_NT</option>\n              <option value=\"STRING\">STRING</option>\n              <option value=\"TCDB\">TCDB</option>\n              <option value=\"TubercuList\">TubercuList</option>\n              <option value=\"UniGene\">UniGene</option>\n              <option value=\"UniParc\">UniParc</option>\n              <option value=\"UniPathway\">UniPathway</option>\n              <option value=\"UniProtKB-Accession\">UniProtKB-Accession</option>\n              <option value=\"UniProtKB-ID\">UniProtKB-ID</option>\n              <option value=\"UniRef100\">UniRef100</option>\n              <option value=\"UniRef50\">UniRef50</option>\n              <option value=\"UniRef90\">UniRef90</option>\n              <option value=\"World-2DPAGE\">World-2DPAGE</option>\n              <option value=\"eggNOG\">eggNOG</option>\n            </select>\n            <p style=\"margin-top:5px;margin-bottom:5px\">Example: <span class=\"exampleLeft\">fig|1094551.3.peg.8</span></p>\n          </div>\n        </td>\n        <td>\n        </td>\n        <td>\n          <div class=\"appRow\" style=\"width:140px; white-space:nowrap\">TO:\n            <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"change:onChange\" data-dojo-attach-point=\"rightTypeSelect\" >\n              <option selected=\"true\" value=\"patric_id\">PATRIC ID</option>\n              <option value=\"feature_id\">Feature ID</option>\n              <option value=\"alt_locus_tag\">Alt Locus Tag</option>\n              <option value=\"P2_feature_id\">P2 Feature ID</option>\n              <option value=\"protein_id\">RefSeq (Protein ID)</option>\n              <option value=\"refseq_locus_tag\">RefSeq Locus tag</option>\n              <option value=\"gene_id\">Gene ID</option>\n              <option value=\"gi\">GI</option>\n              <option value=\"allergome\">Allergome</option>\n              <option value=\"BioCyc\">BioCyc</option>\n              <option value=\"ChEMBL\">ChEMBL</option>\n              <option value=\"DIP\">DIP</option>\n              <option value=\"DNASU\">DNASU</option>\n              <option value=\"DisProt\">DisProt</option>\n              <option value=\"DrugBank\">DrugBank</option>\n              <option value=\"EMBL\">EMBL</option>\n              <option value=\"EMBL-CDS\">EMBL-CDS</option>\n              <option value=\"EchoBASE\">EchoBASE</option>\n              <option value=\"EcoGene\">EcoGene</option>\n              <option value=\"EnsembleGenome\">EnsembleGenome</option>\n              <option value=\"GenoList\">GenoList</option>\n              <option value=\"HOGENOM\">HOGENOM</option>\n              <option value=\"KEGG\">KEGG</option>\n              <option value=\"KO\">KO</option>\n              <option value=\"LegioList\">LegioList</option>\n              <option value=\"Leproma\">Leproma</option>\n              <option value=\"MEROPS\">MEROPS</option>\n              <option value=\"MINT\">MINT</option>\n              <option value=\"NCBI_TaxID\">NCBI_TaxID</option>\n              <option value=\"OMA\">OMA</option>\n              <option value=\"OrthoDB\">OrthoDB</option>\n              <option value=\"PDB\">PDB</option>\n              <option value=\"PeroxiBase\">PeroxiBase</option>\n              <option value=\"PhosSite\">PhosSite</option>\n              <option value=\"PptaseDB\">PptaseDB</option>\n              <option value=\"ProtClustDB\">ProtClustDB</option>\n              <option value=\"PseudoCAP\">PseudoCAP</option>\n              <option value=\"REBASE\">REBASE</option>\n              <option value=\"Reactome\">Reactome</option>\n              <option value=\"RefSeq_NT\">RefSeq_NT</option>\n              <option value=\"STRING\">STRING</option>\n              <option value=\"TCDB\">TCDB</option>\n              <option value=\"TubercuList\">TubercuList</option>\n              <option value=\"UniGene\">UniGene</option>\n              <option value=\"UniParc\">UniParc</option>\n              <option value=\"UniPathway\">UniPathway</option>\n              <option value=\"UniProtKB-Accession\">UniProtKB-Accession</option>\n              <option value=\"UniProtKB-ID\">UniProtKB-ID</option>\n              <option value=\"UniRef100\">UniRef100</option>\n              <option value=\"UniRef50\">UniRef50</option>\n              <option value=\"UniRef90\">UniRef90</option>\n              <option value=\"World-2DPAGE\">World-2DPAGE</option>\n              <option value=\"eggNOG\">eggNOG</option>\n            </select>\n            <p style=\"margin-top:5px;margin-bottom:5px\">Example: <span class=\"exampleRight\">fig|1094551.3.peg.8</span></p>\n          </div>\n        </td>\n        <td></td>\n        <td>\n        </td>\n      </tr>\n      <tr>\n        <td data-dojo-attach-point=\"leftColumnCount\" >0 IDs</td>\n      </tr>\n      <tr>\n        <td style=\"vertical-align:top;\" colspan=\"2\">\n          <div data-dojo-attach-point=\"leftList\" style=\"width: 100%;height:300px;vertical-align:top;max-height:350px\" data-dojo-type=\"dijit/form/Textarea\" data-dojo-props=\"rows:10\" data-dojo-attach-event=\"onChange:onChangeLeft\"></div>\n        </td>\n        <td style=\"vertical-align:top; padding-left:20px\" colspan=\"2\">\n          <div class=\"appRow\">\n            <div class=\"appRowSegment\">\n              <div class=\"showAdv\">\n                <div data-dojo-attach-point=\"advanced2\" style=\"display:inline-block\">\n                  <label class=\"largelabel\">Advanced</label>\n                  <div class=\"iconbox\" style=\"margin-left:0px\">\n                    <i data-dojo-attach-point=\"advicon2\" class=\"fa icon-caret-down fa-1\"></i>\n                  </div>\n                </div>\n              </div>\n            </div>\n          </div>\n          <div class=\"appRow\" data-dojo-attach-point=\"advrow2\" style=\"display: none\">\n            <div class=\"appField\" style=\"width:150px;\">\n              <label class=\"paramlabel\">PATRIC Feature Strategy</label>\n              <div name=\"patric-feature-strategy\" class=\"infobox iconbox infobutton dialoginfo\">\n                <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n              </div>\n              <div class=\"appField\" style=\"width:120px;\">\n                <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"joinUsing\">\n                  <option selected=\"true\" value=\"gene_id\">GeneID</option>\n                  <option value=\"refseq_locus_tag\">Refseq locus tag</option>\n                  <option value=\"protein_id\">Refseq Protein Acc</option>\n                </select>\n              </div>\n            </div>\n          </div>\n        </td>\n        <td></td>\n        <td></td>\n        <td></td>\n      </tr>\n      <tr>\n        <td>\n          <div data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"resetButton\" data-dojo-attach-event=\"onClick:reset\" data-dojo-props=\"disabled:false\">\n            RESET\n          </div>\n        </td>\n        <td style=\"text-align:left;width:30px\">\n          <div data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"mapButton\" data-dojo-attach-event=\"onClick:map\" data-dojo-props=\"disabled:false\">MAP</div>\n        </td>\n        <td style=\"text-align:left;\">\n\n        </td>\n        <td colspan=\"2\"></td>\n      </tr>\n    </table>\n  </div>\n</div>\n<div class=\"showButton\" style=\"display:none; text-align:center; margin-top:5px\" data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"sButton\" data-dojo-attach-event=\"onClick:show\" data-dojo-props=\"disabled:false\">Edit and Resubmit</div>\n<div class=\"idmap_result_div\" data-dojo-attach-point=\"idmap_result_div\"></div>\n</form>\n"}});
define("p3/widget/app/IDMapper", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/IDMapper.html', './AppBase', '../../util/PathJoin',
  'dojo/request', '../viewer/IDMappingApp', '../../WorkspaceManager', '../WorkspaceObjectSelector',
  'dojo/query', 'dojo/_base/lang', 'dijit/Tooltip', 'dijit/popup'

], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, AppBase, PathJoin,
  xhr, ResultContainer, WorkspaceManager,
  WorkspaceObjectSelector, query, lang,
  Tooltip, popup
) {
  return declare([AppBase], {
    baseClass: 'IDMapper',
    applicationName: 'IDMapper',
    requireAuth: true,
    applicationLabel: 'ID Mapper',
    applicationDescription: 'The ID Mapper tool maps PATRIC identifiers to those from other prominent external databases such as GenBank, RefSeq, EMBL, UniProt, KEGG, etc. Alternatively, it can map a list of external database identifiers to the corresponding PATRIC features.',
    applicationHelp: 'user_guides/services/id_mapper.html',
    tutorialLink: 'tutorial/id_mapper/id_mapper.html',
    templateString: Template,
    path: '',
    mapFromIDs: null,
    mapToIDs: null,
    result_store: null,
    result_grid: null,
    defaultPath: '',

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
      }

      this.result = new ResultContainer({
        id: this.id + '_idmapResult',
        style: 'min-height: 700px; visibility:hidden;'
      });
      this.result.placeAt(this.idmap_result_div);
      this.result.startup();
      this.advrow2.turnedOn = (this.advrow2.style.display !== 'none');
      on(this.advanced2, 'click', lang.hitch(this, function () {
        this.advrow2.turnedOn = (this.advrow2.style.display !== 'none');
        if (!this.advrow2.turnedOn) {
          this.advrow2.turnedOn = true;
          this.advrow2.style.display = 'block';
          this.advicon2.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow2.turnedOn = false;
          this.advrow2.style.display = 'none';
          this.advicon2.className = 'fa icon-caret-down fa-1';
        }
      }));
    },

    constructor: function () {
      this.mapFromIDs = [];
      this.mapToIDs = [];
      this.watch('mapFromIDs', function (attr, oldVal, val) {
        this.leftColumnCount.innerHTML = (val.length || '0') + ((val && val.length > 1) ? ' IDs' : ' ID');
      });

      this.watch('mapToIDs', function (attr, oldVal, val) {
        this.rightColumnCount.innerHTML = (val.length || '0') + ((val && val.length > 1) ? ' IDs' : ' ID');
        this.rightList.set('value', val.join('\n'));
      });
    },

    validate: function () {
      /*
        console.log("this.validate()",this);
        var valid = this.inherited(arguments);
        if (valid){
        this.saveButton.set("disabled", false)
      }else{
      this.saveButton.set("disabled",true);
    }
    return valid;
    */
      return true;
    },
    reset: function () {
      this.leftList.set('value', '');
      this.leftTypeSelect.set('value', 'patric_id');
      this.rightTypeSelect.set('value', 'patric_id');
    },

    onChange: function () {
      console.log('onChangeTypeLeft: ' + this.leftTypeSelect.get('value'));
      console.log('onChangeTypeRight: ' + this.rightTypeSelect.get('value'));
      if (this.leftTypeSelect.get('value') && (this.mapFromIDs && (this.mapFromIDs.length > 0))) {
        this.mapButton.set('disabled', false);
      } else {
        this.mapButton.set('disabled', false);
      }
      var leftV = this.leftTypeSelect.get('value');
      var rightV = this.rightTypeSelect.get('value');
      var exampleL = '';
      var exampleR = '';
      var showAdv = false;
      if (leftV === 'patric_id') {
        exampleL = 'fig|1094551.3.peg.8';
      } else if (leftV === 'refseq_locus_tag') {
        exampleL = 'MEC_00004';
      }
      else if (leftV === 'protein_id') {
        exampleL = 'EJF76201.1';
      }
      if (rightV === 'patric_id') {
        exampleR = 'fig|1094551.3.peg.8';
        showAdv = true;
      } else if (rightV === 'refseq_locus_tag') {
        exampleR = 'MEC_00004';
        showAdv = true;
      } else if (rightV === 'protein_id') {
        exampleR = 'EJF76201.1';
        showAdv = true;
      } else if (rightV === 'feature_id' || rightV === 'P2_feature_id' || rightV === 'alt_locus_tag' || rightV === 'gene_id' || rightV === 'gi') {
        showAdv = true;
      }
      document.getElementsByClassName('exampleLeft')[0].innerHTML = exampleL;
      document.getElementsByClassName('exampleRight')[0].innerHTML = exampleR;
      var showAdvDiv = document.getElementsByClassName('showAdv')[0];
      if (showAdv) { showAdvDiv.style.display = 'block'; }
      else { showAdvDiv.style.display = 'none'; }
    },
    show: function () {
      console.log('show me the map form');
      document.getElementsByClassName('showHideSection')[0].style.display = 'block';
      document.getElementsByClassName('showButton')[0].style.display = 'none';
    },

    map: function () {
      document.getElementsByClassName('showHideSection')[0].style.display = 'none';
      document.getElementsByClassName('showButton')[0].style.display = 'block';
      console.log('MAP: ', this.mapFromIDs, this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
      var from = this.leftTypeSelect.get('value');
      var to = this.rightTypeSelect.get('value');
      var via = 'gene_id';
      via = this.joinUsing.get('value');

      // var ids = this.mapFromIDs.map(encodeURIComponent).join(",");
      var ids = this.mapFromIDs.join(',');
      // var q;
      var fromIdGroup = null;
      var toIdGroup = null;
      var patricIdGroup = {
        patric_id: '', feature_id: '', P2_feature_id: '', alt_locus_tag: '', refseq_locus_tag: '', gene_id: '', gi: '', protein_id: ''
      };

      fromIdGroup = (from in patricIdGroup) ? 'PATRIC' : 'OTHER';
      toIdGroup = (to in patricIdGroup) ? 'PATRIC' : 'OTHER';

      var _self = this;

      if (this.leftList.get('value').replace(/^\s+|\s+$/gm, '') !== '') {

      // console.log("ids: ", ids);
        query('.idmap_result_div .GridContainer').style('visibility', 'visible');
        query('.PerspectiveTotalCount').style('visibility', 'visible');
        _self.result.set('state', {
          fromIdGroup: fromIdGroup, joinId: via, fromId: from, toIdGroup: toIdGroup, toId: to, fromIdValue: ids
        });
      }


    // if(ids && (ids.length > 0)){
    //   switch(from){
    //     case "UniProtKB-ID":
    //     q = "in(uniprotkb_accession,(" + ids + "))";
    //     break;
    //     default:
    //     q = 'in(id_value,(' + ids + '))&eq(id_type,' + from + ')&limit(99999)'
    //   }
    // }

    // console.log('ID MAP Query: ', q);
    // xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
    //   handleAs: 'json',
    //   headers: {
    //     'Accept': "application/json",
    //     'Content-Type': "application/rqlquery+x-www-form-urlencoded",
    //     'X-Requested-With': null,
    //     'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
    //   },
    //   data: q
    // }).then(function(res){
    //   console.log("RES: ", res);
    //   var uniprotIDs = res.map(function(item){
    //     return item['uniprotkb_accession']
    //   });
    //
    //   var lq = 'in(uniprotkb_accession,(' + uniprotIDs.join(',') + '))&eq(id_type,' + to + ')'
    //   xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
    //     handleAs: 'json',
    //     headers: {
    //       'Accept': "application/json",
    //       'Content-Type': "application/rqlquery+x-www-form-urlencoded",
    //       'X-Requested-With': null,
    //       'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
    //     },
    //     data: lq
    //   }).then(function(res){
    //     _self.set('mapToIDs', res.map(function(x){
    //       return x['id_value'];
    //     }));
    //     console.log("RES: ", res);
    //   });
    // });
    },

    onChangeLeft: function (val) {
      console.log('VAL: ', val);
      var ids = [];
      var nsplit = val.split('\n');
      nsplit.forEach(function (i) {
        var y = i.replace(/^\s+|\s+$/gm, '').split(/[\s,;\t]+/);
        ids = ids.concat(y);
      });
      ids = ids.filter(function (id) {
        return !!id;
      });

      var m = {};
      ids.forEach(function (id) {
        m[id] = true;
      });
      ids = Object.keys(m);

      this.set('mapFromIDs', ids);

      // console.log("FromIDs: ", ids);

      var dispVal = ids.join('\n');

      if (this.leftList.get('value') !== dispVal) {
        this.onChange();
        this.leftList.set('value', ids.join('\n'));
      }
    }
  //
  // onChangeRight: function(val){
  //   console.log("VAL: ", val);
  // }
  });
});
