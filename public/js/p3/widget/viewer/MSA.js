define([
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "dojo/_base/Deferred",
	"dojo/request", "dojo/_base/lang", "dojo/when",
	"../ActionBar", "../ContainerActionBar", "phyloview/PhyloTree",
	"d3/d3", "phyloview/TreeNavSVG", "../../util/PathJoin", "dijit/form/Button",
	"dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem"
], function(declare, Base, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Deferred,
			xhr, lang, when,
			ActionBar, ContainerActionBar, PhyloTree,
			d3, d3Tree, PathJoin, Button,
			DropDownButton, DropDownMenu, MenuItem){
	return declare([Base], {
		"baseClass": "Phylogeny",
		"disabled": false,
		"query": null,
		"loading": false,
		data: null,
		dataMap: {},
		tree: null,
		phylogram: false,

		maxSequences: 500,

		onSetLoading: function(attr, oldVal, loading){
			if(loading){
				this.contentPane.set("content", "<div>Performing Multiple Sequence Alignment. Please Wait...</div>");
			}
		},
		checkSequenceCount: function(query){
			var q = query + "&limit(1)";
			var def = new Deferred();
			var url = PathJoin(this.apiServiceUrl, "genome_feature") + "/";
			console.log("CheckSeqCount URL: ", url);
			xhr.post(url, {
				data: q,
				headers: {
					"accept": "application/solr+json",
					"content-type": "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(res){
				console.log("Check Res: ", res.response.numFound)
				if(res && res.response && (typeof res.response.numFound != 'undefined') && (res.response.numFound < this.maxSequences)){
					console.log("  Amount OK")
					def.resolve(res.response.numFound);
					return;
				}
				console.log("   TOO Many Sequences");
				def.reject(res.response.numFound);
			}));

			return def.promise;
		},
		onSetState: function(attr, oldVal, state){
			console.log("MSA Viewer onSetState: ", state);
			if(state && state.search){
				when(this.checkSequenceCount(state.search), lang.hitch(this, function(count){
					console.log("CHECK SEQ COUNT ok: ", count)
					if(count < 2){
						this.showError("There must be at least two matching sequences for a query.  Your query found " + count + " sequences.");
					}else{
						this.doAlignment()
					}
				}), lang.hitch(this, function(count){
					this.showError("There are too many sequences in your query results (" + count + ").  Please reduce to below 500 Sequences.");
				}))
			}
		},

		showError: function(msg){
			this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + "</div>");
		},
		onSetData: function(attr, oldVal, data){
			this.createDataMap(data);
			this.render();
		},

		createDataMap: function(apiResult){
			var geneID = null;
			var clustal = ["CLUSTAL"];
			apiResult.alignment.split("\n").forEach(function(line){
				if(line.slice(0, 1) == ">"){
					var regex = /^>([^\s]+)\s+\[(.*?)\]/g;
					var match;
					var headerInfo = regex.exec(line);
					if(!(headerInfo[1] in this.dataMap)){
						geneID = headerInfo[1];
						clustal.push(geneID + "\t");
						this.dataMap[geneID] = {"taxID": headerInfo[2], "geneID": geneID, sequence: []};
					}
				}
				else if(line.trim() != "" && geneID in this.dataMap){
					this.dataMap[geneID].sequence.push(line);
					clustal[clustal.length - 1] = clustal[clustal.length - 1] + line;
				}
				else{
					geneID = null;
				}
			}, this);
			this.dataMap.clustal = clustal.join("\n");
		},

		createViewerData: function(){
			results = {};
		},

		render: function(){
			this.contentPane.set("content", "");
			var menuDiv = domConstruct.create("div", {}, this.contentPane.containerNode);
			var combineDiv = domConstruct.create("table", {"style": {"width": "100%"}}, this.contentPane.containerNode);//domConstruct.create("div",{"style":{"width":"100%"}},this.contentPane.containerNode);
			var combineRow = domConstruct.create("tr", {}, combineDiv);
			var cell1 = domConstruct.create("td", {"width": "30%"}, combineRow);
			var cell2 = domConstruct.create("td", {"width": "70%"}, combineRow);
			var treeDiv = domConstruct.create("div", {id: this.id + "tree-container"}, cell1);
			treeDiv.setAttribute("style", "padding-top:106px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
			var msaDiv = domConstruct.create("div", {"style": {"width": "100%"}}, cell2);
			msaDiv.style.display = "inline-block";
			//msaDiv.style.width="64%";
			//msaDiv.style.overflowX="scroll";
			msaDiv.style.overflowY = "hidden";
			msaDiv.style.verticalAlign = "bottom";
			msaDiv.style.paddingBottom = "10px";

			//domConstruct.place(menuDiv,this.contentPane.containerNode,"last");
			//domConstruct.place(combineDiv,this.contentPane.containerNode,"last");
			//domConstruct.place(combineDiv,treeDiv,"last");
			//domConstruct.place(combineDiv,msaDiv,"last");
			//this.contentPane.set('content', "<pre>" + JSON.stringify(this.data,null,3) + "</pre>");
			var msa_models = {
				seqs: msa.io.clustal.parse(this.dataMap.clustal)
			};

			var opts = {};
			// set your custom properties
			// @see: https://github.com/greenify/biojs-vis-msa/tree/master/src/g
			opts.seqs = msa_models.seqs;
			opts.el = msaDiv;
			opts.bootstrapMenu = false;
			opts.vis = {
				conserv: false,
				overviewbox: false,
				seqlogo: true,
				sequences: true,
				labelName: false,
				labelId: false,
			};
			opts.conf = {
				dropImport: true,
				registerWheelCanvas: false,
				registerMouseHover: false,
				debug: true
			};
			opts.zoomer = {
				menuFontsize: "12px",
				autoResize: true,
				labelNameLength: 150,
				//alignmentHeight: 4000,
				//alignmentWidth: msa_models.seqs[0].seq.length*15.1,
				residueFont: "12",
				rowHeight: 14.04
			};

			// init msa
			var m = new msa.msa(opts);
			/*sel= new mt.selections();
				treeDiv.innerHTML="";
			nodes = mt.app({
			seqs: m.seqs.toJSON(),
			tree: msa_models.tree
			});

			console.log("nodes", nodes);
			t = new mt.adapters.tree({
			model: nodes,
			el: treeDiv,
			sel: sel
			});
			msaTree = new mt.adapters.msa({
			model: nodes,
			sel: sel,
			msa: m
			});
			nodes.models.forEach(function(e) {
				delete e.collection;
			//return Object.setPrototypeOf(e, require("backbone-thin").Model.prototype);
			});
			//m.seqs.reset(nodes.models);
			console.log(m.seqs);


			//var nexusData =["20", "19", "38", "85", "(fig.509170.6.peg.19:0.03278,((fig.575586.4.peg.3246:0.0,fig.1120929.3.peg.86:0.0):0.00643,fig.981334.4.peg.3118:0.01314):0.06506,((fig.1405803.3.peg.6190:2.30354,((fig.1313303.3.peg.2841:0.0,fig.291331.8.peg.1145:0.0,fig.342109.8.peg.1061:0.0,fig.360094.4.peg.4335:0.0):2.83584,fig.1228988.4.peg.5452:1.00753):1.76172):1.37146,((fig.1392540.3.peg.2502:0.00016,((fig.665944.3.peg.5249:0.00016,(fig.1284812.3.peg.4952:0.02124,fig.665944.3.peg.5052:0.00015):0.04230):1.80493,((fig.1159496.3.peg.81:0.00616,fig.1159560.3.peg.58:0.03605):1.03487,(fig.758829.3.peg.2647:0.00015,(fig.1185418.3.peg.2928:0.00017,fig.1432547.3.peg.8379:0.02325):0.18273):0.65301):1.98034):1.24802):0.12367,fig.1330047.3.peg.969:0.05795):0.04715):0.00011);", "fig.1405803.3.peg.6190", "Pseudomonas_alcaligenes_MRY13-0052", "-----------------MYDFKKYVLDIALKQVNEH-----------TDIIVKVEQHKTGRSITGFSFSFKQKNQPRIQSNLKEIRIR--", "fig.1313303.3.peg.2841", "Xanthomonas_oryzae_ATCC_35933", "--------------MEILDDRVGTRATIITSQLPVEHWHAWL-----QDPTLADAILD-RLVHQAHKLPLKGESLRKRAPPDRPTSAP--", "fig.291331.8.peg.1145", "Xanthomonas_oryzae_pv._oryzae_KACC_10331", "--------------MEILDDRVGTRATIITSQLPVEHWHAWL-----QDPTLADAILD-RLVHQAHKLPLKGESLRKRAPPDRPTSAP--", "fig.342109.8.peg.1061", "Xanthomonas_oryzae_pv._oryzae_MAFF_311018", "--------------MEILDDRVGTRATIITSQLPVEHWHAWL-----QDPTLADAILD-RLVHQAHKLPLKGESLRKRAPPDRPTSAP--", "fig.360094.4.peg.4335", "Xanthomonas_oryzae_pv._oryzae_PXO99A", "--------------MEILDDRVGTRATIITSQLPVEHWHAWL-----QDPTLADAILD-RLVHQAHKLPLKGESLRKRAPPDRPTSAP--", "fig.665944.3.peg.5249", "Klebsiella_sp._4_1_44FAA", "----------------------------MRQQLTREYAT--------GRFRGDKEALKREVERRVQERMLLSR--GNNYTRLATAPL---", "fig.1284812.3.peg.4952", "Klebsiella_pneumoniae_UHKPC81", "----------------------------MRQQLTREYAT--------GRFRGDHEALKREVERRVQERMLLSR--GNNYTRLATVPI---", "fig.665944.3.peg.5052", "Klebsiella_sp._4_1_44FAA", "----------------------------MRQQLTREYAT--------GRFRGDKEALKREVERRVQERMLLSR--GNNYTRLATVPI---", "fig.1228988.4.peg.5452", "Klebsiella_pneumoniae_subsp._pneumoniae_KpMDU1", "-----------------------------------------M-----SEYGVKSDTLELSFVEFVKMCGFNSRRSNKKNARSHQ------", "fig.1392540.3.peg.2502", "Acinetobacter_nectaris_CIP_110549", "-----------------MTDAQRHLFANKMSKMPEM-----------SKYSQGTESYQ-EFATRIAEMLLQPEKFRELYPLLEKNGFKL-", "fig.1330047.3.peg.969", "Acinetobacter_junii_MTCC_11364", "-----------------MTDSQRHLFANKMSEMPEM-----------SKYSQGTESYQ-QFAVRIAEMLLHPEKFKELYPILEKAGFKA-", "fig.509170.6.peg.19", "Acinetobacter_baumannii_SDF", "-----------------MTDAQRHLFANKMSEMPEM-----------SKYSQGTESYQ-QFSIRIADMLLEPEKFRELYPILEKAGFKG-", "fig.575586.4.peg.3246", "Acinetobacter_johnsonii_SH046", "-----------------------------MSEMPEM-----------GKYSQGTESYQ-QFAIRIADMLLEPEKFRELYPILEKSGFQP-", "fig.1120929.3.peg.86", "Acinetobacter_towneri_DSM_14962_=_CIP_107472", "-----------------------------MSEMPEM-----------GKYSQGTESYQ-QFAIRIADMLLEPEKFRELYPILEKSGFQP-", "fig.981334.4.peg.3118", "Acinetobacter_radioresistens_DSM_6976_=_NBRC_102413_=_CIP_103788", "-----------------MTDAQRHLFANKMSEMPEM-----------GKYSQGTESYQ-QFAIRIADMLLEPEKFRELYPILEKSGFNP-", "fig.758829.3.peg.2647", "Escherichia_coli_ECA-0157", "MRKAMEQLRDIGYLDYTEFKRGRATYFSVHYRNPKLISSPVKVPRKEEEEKAPEQNYD-EVIKALKAAGIDPLKLAEALSAMKPEN----", "fig.1185418.3.peg.2928", "Klebsiella_pneumoniae_subsp._pneumoniae_ST512-K30BO", "------------------------------MKVPRKA----------EEEKAPEQNYD-EVIKALKAAGIDPLKLAEALSAMKPEN----", "fig.1432547.3.peg.8379", "Klebsiella_pneumoniae_IS22", "------------------------------MKVPRKE----------EEEKAPEQNYD-EVIKALKAAGIDPLKLAEALSAMKPEN----", "fig.1159496.3.peg.81", "Cronobacter_dublinensis_subsp._lactaridi_LMG_23825", "----MEQLKEIGYLDYSEIKRGRVVYFHIHYRRPKLRPQSLP-----GALPAGEELQT-DNAAAVEEQGEMVMLTKEELALLEKIRKGQI", "fig.1159560.3.peg.58", "Cronobacter_dublinensis_subsp._lausannensis_LMG_23824", "----MEQLKEIGYLDYTEIKRGRVVYFHIHYRRPKLRPQSLP-----GALPAGEELPA-DNAAAVEEQGEMVMLTKEELALLEKIRKGQI"];
			//var nexusData= ["11", "11", "39", "53", "(((fig|1310754.3.peg.2921:0.0,fig|1310727.3.peg.2939:0.0):1.17036,(fig|47716.4.peg.2238:0.11103,fig|66869.3.peg.5501:0.00641):0.99240):2.47910,((fig|1310683.3.peg.2856:0.0,fig|1310905.3.peg.2925:0.0):1.28000,fig|1235820.4.peg.2163:0.69592):2.18740,(((fig|321314.9.peg.37:0.0,fig|476213.4.peg.33:0.0):0.29056,fig|936157.3.peg.4962:0.43338):2.89151,fig|882800.3.peg.6267:0.00016):0.00019);", "fig|1310683.3.peg.2856", "Acinetobacter_baumannii_1566109", "--------MRFLQRYPSYQDFYCRFDVICF-DFPQKIAKTVQQDFSK-FHYDLQWIENVFTLD--", "fig|1310905.3.peg.2925", "Acinetobacter_baumannii_25977_1", "--------MRFLQRYPSYQDFYCRFDVICF-DFPQKIAKTVQQDFSK-FHYDLQWIENVFTLD--", "fig|1235820.4.peg.2163", "Prevotella_oris_JCM_12252", "-----------MKERAIWDDL--RFDLISI-------VGTAPENFK------LEHIVDAFNPLLV", "fig|321314.9.peg.37", "Salmonella_enterica_subsp._enterica_serovar_Choleraesuis_str._SC-B67", "MSSPGNPGKTSDGRHTEVGSF--NYSRAAD-RSNSENVLSSGMTQS-------------------", "fig|476213.4.peg.33", "Salmonella_enterica_subsp._enterica_serovar_Paratyphi_C_strain_RKS4594", "MSSPGNPGKTSDGRHTEVGSF--NYSRAAD-RSNSENVLSSGMTQS-------------------", "fig|936157.3.peg.4962", "Salmonella_enterica_subsp._enterica_serovar_Weltevreden_str._2007-60-3289-1", "-------MIVADGRNTQVGSF--NFSRAAD-RSNSENVLVVWDDPVLARSYLNHWTSR-------", "fig|1310754.3.peg.2921", "Acinetobacter_baumannii_2887", "-----------MLVAQQLGQW--AEQTALK-LLKEQNYEWVASNYHS-RRGEVDLIENAVTN---", "fig|1310727.3.peg.2939", "Acinetobacter_baumannii_836190", "-----------MLVAQQLGQW--AEQTALK-LLKEQNYEWVASNYHS-RRGEVDLIENAVTN---", "fig|882800.3.peg.6267", "Methylobacterium_extorquens_DSM_13060", "-----------MSRAAR--AWLARHPLAADATLRADAVFVAPRRWPR-------HLPNAFEIEGL", "fig|47716.4.peg.2238", "Streptomyces_olivaceus", "-----------MNARSALGRY--GETLAAR-RLADAGMTVLERNWRCGRTGEIDIVARDKQDELH", "fig|66869.3.peg.5501", "Streptomyces_atroolivaceus", "-----------MNARGALGRY--GEDLAAR-LLADAGMTVLDRNWRC-RTGEIDIVARDEQDELH"]


			var treeLoaded=false;

			treeUpdate=t.tree.update;
			t.tree.update=function(){
			treeUpdate();
			setTimeout(function(){
			var treeDiv2=document.getElementsByClassName("tnt_groupDiv");
			var treeHeight=parseInt(treeDiv2[0].childNodes[0].getAttribute("height"));


			msaDiv.style.height=(treeHeight+115).toString()+"px";
			}, 1000);
			}*/

			this.tree = new d3Tree();
			this.tree.d3Tree("#" + this.id + "tree-container", {phylogram: this.phylogram, fontSize: 12});
			this.tree.setTree(this.data.tree);
			//this.tree.setTree(this.data.tree);

			var menuOpts = {};
			menuOpts.el = menuDiv;
			//var msaDiv = document.getElementById('msaDiv');
			msaDiv.setAttribute("style", "white-space: nowrap;");
			menuOpts.msa = m;
			var defMenu = new msa.menu.defaultmenu(menuOpts);

			var schemes = [{
				name: "Zappo", id: "zappo"
			},
			{
				name: "Taylor",
				id: "taylor"
			},
			{
				name: "Hydrophobicity",
				id: "hydro"
			},
			{
				name: "Lesk",
				id: "lesk"
			},
			{
				name: "Cinema",
				id: "cinema"
			},
			{
				name: "MAE",
				id: "mae"
			},
			{
				name: "Clustal",
				id: "clustal"
			},
			{
				name: "Clustal2",
				id: "clustal2"
			},
			{
				name: "Turn",
				id: "turn"
			},
			{
				name: "Strand",
				id: "strand"
			},
			{
				name: "Buried",
				id: "buried"
			},
			{
				name: "Helix",
				id: "helix"
			},
			{
				name: "Nucleotide",
				id: "nucleotide"
			},
			{
				name: "Purine",
				id: "purine"
			},
			{
				name: "PID",
				id: "pid"
			},
			{
				name: "No color",
				id: "foo"
			}];

			//var noMenu = ["10_import", "15_ordering", "20_filter", "30_selection","40_vis", "70_extra", "90_help", "95_debug"];
			//noMenu.forEach(function(toRemove){delete defMenu.views[toRemove];});
			//m.addView("menu", defMenu);

			var typeMenuDom = domConstruct.create("div", {}, menuDiv);
			var typeMenu = new DropDownMenu({style: "display: none;"});
			typeMenu.addChild(new MenuItem({
				label: "phylogram", onClick: lang.hitch(this, function(){
					this.setTreeType("phylogram")
				})
			}));
			typeMenu.addChild(new MenuItem({
				label: "cladogram", onClick: lang.hitch(this, function(){
					this.setTreeType("cladogram")
				})
			}));
			typeMenu.startup();
			var typeButton = new DropDownButton({
				name: "typeButton",
				label: "tree type",
				dropDown: typeMenu
			}, typeMenuDom).startup();
			//this.typeButton = new Button({label:this.phylogram ? "cladogram" : "phylogram",onClick:lang.hitch(this, this.togglePhylo)}, this.typeButtonDom);
			var colorMenuDom = domConstruct.create("div", {}, menuDiv);
			var colorMenu = new DropDownMenu({style: "display: none;"});
			schemes.forEach(lang.hitch(this, function(scheme){
				colorMenu.addChild(new MenuItem({
					label: scheme.name, onClick: function(){
						m.g.colorscheme.set("scheme", scheme.id)
					}
				}));
			}));
			colorMenu.startup();
			var colorButton = new DropDownButton({
				name: "colorButton",
				label: "color",
				dropDown: colorMenu
			}, colorMenuDom).startup();
			this.supportButton = domConstruct.create("input", {type: "button", value: "show support"}, menuDiv);
			this.groupButton = domConstruct.create("input", {type: "button", value: "create genome group"}, menuDiv);
			this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
			m.render();
			//var msaDiv2=document.getElementsByClassName("biojs_msa_seqblock")[0];
			//var ctx = msaDiv2.getContext("2d");
			//ctx.fillStyle = "#FF0000";
			//ctx.fillRect(0,0,150,75);

			//m.el.parentElement.parentElement.parentElement.insertBefore(menuOpts.el, combineDiv);

			//m.el.parentElement.insertBefore(menuOpts.el, combineDiv);
			var initialHidden = 0;
			//var treeDiv2=document.getElementsByClassName("tnt_groupDiv");
			var treeHeight = parseInt(treeDiv.childNodes[0].getAttribute("height"));
			//var msaDiv=document.getElementsByClassName("biojs_msa_stage");
			//var msaDiv=document.getElementById("msaDiv");
			msaDiv.style.display = "inline-block";
			//msaDiv.style.width="64%";
			msaDiv.style.overflowX = "hidden";
			msaDiv.style.overflowY = "hidden";
			msaDiv.style.verticalAlign = "bottom";
			msaDiv.style.paddingBottom = "10px";
			msaDiv.style.height = (treeHeight + 115).toString() + "px";
			treeLoaded = true;
		},

		setTreeType: function(treeType){
			if(this.phylogram && treeType == "cladogram"){
				this.togglePhylo();
			}
			else if((!this.phylogram) && treeType == "phylogram"){
				this.togglePhylo();
			}
		},

		togglePhylo: function(){
			this.phylogram = !this.phylogram;
			this.tree.setPhylogram(this.phylogram);
			//this.typeButton.set("label", this.phylogram ? "cladogram" : "phylogram");
		},

		doAlignment: function(){
			console.log("doAlignment()");
			this.set('loading', true);
			if(this.state && this.state.search){
				var q = this.state.search;

				console.log("RUN MSA Against: ", this.state.search)
				return when(window.App.api.data("multipleSequenceAlignment", [q]), lang.hitch(this, function(res){
					console.log("MSA Results: ", res);
					this.set('loading', false);
					this.set('data', res);
				}))
			}

		},
		postCreate: function(){
			this.contentPane = new ContentPane({"region": "center"});
			this.addChild(this.contentPane)
		},
		startup: function(){

			if(this._started){
				return;
			}

			this.watch("loading", lang.hitch(this, "onSetLoading"));
			this.watch("data", lang.hitch(this, "onSetData"))

			this.inherited(arguments);
		}
	})
});
