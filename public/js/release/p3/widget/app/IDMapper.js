require({cache:{
'url:p3/widget/app/templates/IDMapper.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>ID Mapper</h3>\n            <p>Map from one ID type to another and obtain PATRIC gene lists from a list of IDs.</p>\n        </div>\n\n\t<table style=\"width:100%;\">\n\t\t<tr>\n\t\t\t<td style=\"vertical-align:top;\">\n                <div class=\"appRow\" style=\"width:219px; white-space:nowrap\"> FROM:\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"change:onChange\" data-dojo-attach-point=\"leftTypeSelect\"  >\n\t\t\t\t\t<option selected=\"true\" value=\"patric_id\">PATRIC ID</option>\n\t\t\t\t\t<option value=\"feature_id\">Feature ID</option>\n\t\t\t\t\t<option value=\"alt_locus_tag\">Alt Locus Tag</option>\n\t\t\t\t\t<option value=\"P2_feature_id\">P2 Feature ID</option>\n\t\t\t\t\t<option value=\"refseq\">RefSeq</option>\n\t\t\t\t\t<option value=\"refseq_locus_tag\">RefSeq Locus tag</option>\n\t\t\t\t\t<option value=\"gene_id\">Gene ID</option>\n\t\t\t\t\t<option value=\"gi\">GI</option>\n\t\t\t\t\t<option value=\"allergome\">Allergome</option>\n\t\t\t\t\t<option value=\"BioCyc\">BioCyc</option>\n\t\t\t\t\t<option value=\"ChEMBL\">ChEMBL</option>\n\t\t\t\t\t<option value=\"DIP\">DIP</option>\n\t\t\t\t\t<option value=\"DNASU\">DNASU</option>\n\t\t\t\t\t<option value=\"DisProt\">DisProt</option>\n\t\t\t\t\t<option value=\"DrugBank\">DrugBank</option>\n\t\t\t\t\t<option value=\"EMBL\">EMBL</option>\n\t\t\t\t\t<option value=\"EMBL-CDS\">EMBL-CDS</option>\n\t\t\t\t\t<option value=\"EchoBASE\">EchoBASE</option>\n\t\t\t\t\t<option value=\"EcoGene\">EcoGene</option>\n\t\t\t\t\t<option value=\"EnsembleGenome\">EnsembleGenome</option>\n\t\t\t\t\t<option value=\"GenoList\">GenoList</option>\n\t\t\t\t\t<option value=\"HOGENOM\">HOGENOM</option>\n\t\t\t\t\t<option value=\"KEGG\">KEGG</option>\n\t\t\t\t\t<option value=\"KO\">KO</option>\n\t\t\t\t\t<option value=\"LegioList\">LegioList</option>\n\t\t\t\t\t<option value=\"Leproma\">Leproma</option>\n\t\t\t\t\t<option value=\"MEROPS\">MEROPS</option>\n\t\t\t\t\t<option value=\"MINT\">MINT</option>\n\t\t\t\t\t<option value=\"NCBI_TaxID\">NCBI_TaxID</option>\n\t\t\t\t\t<option value=\"OMA\">OMA</option>\n\t\t\t\t\t<option value=\"OrthoDB\">OrthoDB</option>\n\t\t\t\t\t<option value=\"PATRIC\">PATRIC</option>\n\t\t\t\t\t<option value=\"PDB\">PDB</option>\n\t\t\t\t\t<option value=\"PeroxiBase\">PeroxiBase</option>\n\t\t\t\t\t<option value=\"PhosSite\">PhosSite</option>\n\t\t\t\t\t<option value=\"PptaseDB\">PptaseDB</option>\n\t\t\t\t\t<option value=\"ProtClustDB\">ProtClustDB</option>\n\t\t\t\t\t<option value=\"PseudoCAP\">PseudoCAP</option>\n\t\t\t\t\t<option value=\"REBASE\">REBASE</option>\n\t\t\t\t\t<option value=\"Reactome\">Reactome</option>\n\t\t\t\t\t<option value=\"RefSeq_NT\">RefSeq_NT</option>\n\t\t\t\t\t<option value=\"STRING\">STRING</option>\n\t\t\t\t\t<option value=\"TCDB\">TCDB</option>\n\t\t\t\t\t<option value=\"TubercuList\">TubercuList</option>\n\t\t\t\t\t<option value=\"UniGene\">UniGene</option>\n\t\t\t\t\t<option value=\"UniParc\">UniParc</option>\n\t\t\t\t\t<option value=\"UniPathway\">UniPathway</option>\n\t\t\t\t\t<option value=\"UniProtKB-Accession\">UniProtKB-Accession</option>\n\t\t\t\t\t<option value=\"UniProtKB-ID\">UniProtKB-ID</option>\n\t\t\t\t\t<option value=\"UniRef100\">UniRef100</option>\n\t\t\t\t\t<option value=\"UniRef50\">UniRef50</option>\n\t\t\t\t\t<option value=\"UniRef90\">UniRef90</option>\n\t\t\t\t\t<option value=\"World-2DPAGE\">World-2DPAGE</option>\n\t\t\t\t\t<option value=\"eggNOG\">eggNOG</option>\n\t\t\t\t</select>\n            </div>\n\t\t\t</td>\n\t\t\t<td>\n\t\t\t</td>\n\t\t\t<td>\n                <div class=\"appRow\" style=\"width:219px; white-space:nowrap\">TO:\n                                <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-event=\"change:onChange\" data-dojo-attach-point=\"rightTypeSelect\" >\n                                        <option selected=\"true\" value=\"patric_id\">PATRIC ID</option>\n                                        <option value=\"feature_id\">Feature ID</option>\n                                        <option value=\"alt_locus_tag\">Alt Locus Tag</option>\n                                        <option value=\"P2_feature_id\">P2 Feature ID</option>\n                                        <option value=\"refseq\">RefSeq</option>\n                                        <option value=\"refseq_locus_tag\">RefSeq Locus tag</option>\n                                        <option value=\"gene_id\">Gene ID</option>\n                                        <option value=\"gi\">GI</option>\n                                        <option value=\"allergome\">Allergome</option>\n                                        <option value=\"BioCyc\">BioCyc</option>\n                                        <option value=\"ChEMBL\">ChEMBL</option>\n                                        <option value=\"DIP\">DIP</option>\n                                        <option value=\"DNASU\">DNASU</option>\n                                        <option value=\"DisProt\">DisProt</option>\n                                        <option value=\"DrugBank\">DrugBank</option>\n                                        <option value=\"EMBL\">EMBL</option>\n                                        <option value=\"EMBL-CDS\">EMBL-CDS</option>\n                                        <option value=\"EchoBASE\">EchoBASE</option>\n                                        <option value=\"EcoGene\">EcoGene</option>\n                                        <option value=\"EnsembleGenome\">EnsembleGenome</option>\n                                        <option value=\"GenoList\">GenoList</option>\n                                        <option value=\"HOGENOM\">HOGENOM</option>\n                                        <option value=\"KEGG\">KEGG</option>\n                                        <option value=\"KO\">KO</option>\n                                        <option value=\"LegioList\">LegioList</option>\n                                        <option value=\"Leproma\">Leproma</option>\n                                        <option value=\"MEROPS\">MEROPS</option>\n                                        <option value=\"MINT\">MINT</option>\n                                        <option value=\"NCBI_TaxID\">NCBI_TaxID</option>\n                                        <option value=\"OMA\">OMA</option>\n                                        <option value=\"OrthoDB\">OrthoDB</option>\n                                        <option value=\"PDB\">PDB</option>\n                                        <option value=\"PeroxiBase\">PeroxiBase</option>\n                                        <option value=\"PhosSite\">PhosSite</option>\n                                        <option value=\"PptaseDB\">PptaseDB</option>\n                                        <option value=\"ProtClustDB\">ProtClustDB</option>\n                                        <option value=\"PseudoCAP\">PseudoCAP</option>\n                                        <option value=\"REBASE\">REBASE</option>\n                                        <option value=\"Reactome\">Reactome</option>\n                                        <option value=\"RefSeq_NT\">RefSeq_NT</option>\n                                        <option value=\"STRING\">STRING</option>\n                                        <option value=\"TCDB\">TCDB</option>\n                                        <option value=\"TubercuList\">TubercuList</option>\n                                        <option value=\"UniGene\">UniGene</option>\n                                        <option value=\"UniParc\">UniParc</option>\n                                        <option value=\"UniPathway\">UniPathway</option>\n                                        <option value=\"UniProtKB-Accession\">UniProtKB-Accession</option>\n                                        <option value=\"UniProtKB-ID\">UniProtKB-ID</option>\n                                        <option value=\"UniRef100\">UniRef100</option>\n                                        <option value=\"UniRef50\">UniRef50</option>\n                                        <option value=\"UniRef90\">UniRef90</option>\n                                        <option value=\"World-2DPAGE\">World-2DPAGE</option>\n                                        <option value=\"eggNOG\">eggNOG</option>\n                                </select>\n                            </div>\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td data-dojo-attach-point=\"leftColumnCount\" >0 IDs</td>\n            <td></td>\n\t\t\t<td data-dojo-attach-point=\"rightColumnCount\" colspan=\"2\"></td>\n\t\t</tr>\n\t\t<tr>\n            <td style=\"vertical-align:top;\" colspan=\"2\">\n\t\t\t\t<div data-dojo-attach-point=\"leftList\" style=\"width: 100%;height:300px;vertical-align:top;max-height:350px\" data-dojo-type=\"dijit/form/Textarea\" data-dojo-props=\"rows:10\" data-dojo-attach-event=\"onChange:onChangeLeft\"></div>\n\t\t\t</td>\n            <td></td>\n            <td></td>\n            <td></td>\n\t\t</tr>\n        <tr>\n            <td></td>\n\t\t\t<td style=\"text-align:left;\">\n            <div data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"mapButton\" data-dojo-attach-event=\"onClick:map\" data-dojo-props=\"disabled:false\">MAP</div>\n            </td>\n            <td colspan=\"2\"></td>\n\n\t</table>\n\t</div>\n    <div class=\"idmap_result_div\" data-dojo-attach-point=\"idmap_result_div\"></div>\n</form>\n\n"}});
define("p3/widget/app/IDMapper", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/IDMapper.html", "dijit/form/Form", "../../util/PathJoin",
	"dojo/request", "../viewer/IDMappingApp", "../../WorkspaceManager", "../WorkspaceObjectSelector",
    "dojo/query"

], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, PathJoin,
			xhr, ResultContainer, WorkspaceManager, WorkspaceObjectSelector,query){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "IDMapper",
		templateString: Template,
		path: "",
		mapFromIDs: null,
		mapToIDs: null,
        result_store: null,
        result_grid: null,
        defaultPath: "",

		startup: function(){

			// activate genome group selector when user is logged in
			if(window.App.user){
				this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
            }
                
			this.result = new ResultContainer({
				id: this.id + "_idmapResult",
				style: "min-height: 700px; visibility:hidden;"
			});
			this.result.placeAt(this.idmap_result_div);
			this.result.startup();
        },


		constructor: function(){
			this.mapFromIDs = [];
			this.mapToIDs = [];
			this.watch("mapFromIDs", function(attr, oldVal, val){
				this.leftColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
			});

			this.watch("mapToIDs", function(attr, oldVal, val){
				this.rightColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
				this.rightList.set('value', val.join('\n'));
			});

		},

		validate: function(){
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

		onChange: function(){
			console.log("onChangeType: ", this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			if(this.leftTypeSelect.get('value') && (this.mapFromIDs && (this.mapFromIDs.length > 0))){
				this.mapButton.set('disabled', false);
			}else{
				this.mapButton.set('disabled', false);
			}

		},

		map: function(){
			console.log("MAP: ", this.mapFromIDs, this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			var from = this.leftTypeSelect.get('value');
			var to = this.rightTypeSelect.get('value');
			//var ids = this.mapFromIDs.map(encodeURIComponent).join(",");
			var ids = this.mapFromIDs.join(",");
			var q;
            var fromIdGroup = null;
            var toIdGroup = null;
            var patric_id_group ={"patric_id":"","feature_id":"","P2_feature_id":"","alt_locus_tag":"","refseq_locus_tag":"","gene_id":"","gi":"","refseq":""};

            fromIdGroup = (from in patric_id_group) ? "PATRIC" : "OTHER";
            toIdGroup = (to in patric_id_group) ? "PATRIC" : "OTHER";

			var _self = this;

            if (this.leftList.get('value').replace(/^\s+|\s+$/gm,'') != ""){

			    console.log("ids: ", ids);
			    query(".idmap_result_div .GridContainer").style("visibility", "visible");
                _self.result.set('state', {"fromIdGroup": fromIdGroup, "fromId": from, "toIdGroup":toIdGroup, "toId":to, "fromIdValue":ids});
            }

			return;
			if(ids && (ids.length > 0)){
				switch(from){
					case "UniProtKB-ID":
						q = "in(uniprotkb_accession,(" + ids + "))";
						break;
					default:
						q = 'in(id_value,(' + ids + '))&eq(id_type,' + from + ')&limit(99999)'
				}
			}

			console.log('ID MAP Query: ', q);
			xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}).then(function(res){
				console.log("RES: ", res);
				var uniprotIDs = res.map(function(item){
					return item['uniprotkb_accession']
				});

				var lq = 'in(uniprotkb_accession,(' + uniprotIDs.join(',') + '))&eq(id_type,' + to + ')'
				xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
					handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
					},
					data: lq
				}).then(function(res){
					_self.set('mapToIDs', res.map(function(x){
						return x['id_value'];
					}));
					console.log("RES: ", res);
				});
			});
		},

		onChangeLeft: function(val){
			console.log("VAL: ", val);
			var ids = [];
			var nsplit = val.split("\n");
			nsplit.forEach(function(i){
				var y = i.replace(/^\s+|\s+$/gm,'').split(/[\s,;\t]+/);
				ids = ids.concat(y);
			});
			ids = ids.filter(function(id){
				return !!id;
			});

			var m = {};
			ids.forEach(function(id){
				m[id] = true;
			});
			ids = Object.keys(m);

			this.set("mapFromIDs", ids);

			console.log("FromIDs: ", ids);

			var dispVal = ids.join("\n");

			if(this.leftList.get('value') != dispVal){
			    this.onChange();
				this.leftList.set('value', ids.join("\n"));
			}
		},

		onChangeRight: function(val){
			console.log("VAL: ", val);
		}
	});
});
