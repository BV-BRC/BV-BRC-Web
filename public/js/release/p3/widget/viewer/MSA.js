define("p3/widget/viewer/MSA", [
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "dojo/_base/Deferred",
	"dojo/request", "dojo/_base/lang", "dojo/when",
	"../ActionBar", "../FilterContainerActionBar", "phyloview/PhyloTree",
	"d3/d3", "phyloview/TreeNavSVG", "../../util/PathJoin", "dijit/form/Button",
	"dijit/MenuItem", "dijit/TooltipDialog", "dijit/popup", "../SelectionToGroup", "../PerspectiveToolTip",
	"dijit/Dialog", "../ItemDetailPanel", "dojo/query", "FileSaver"
], function(declare, Base, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Deferred,
			xhr, lang, when,
			ActionBar, ContainerActionBar, PhyloTree,
			d3, d3Tree, PathJoin, Button,
			MenuItem, TooltipDialog, popup,
			SelectionToGroup, PerspectiveToolTipDialog, Dialog, ItemDetailPanel, query, saveAs){

	var schemes = [{
			name: "Zappo",
			id: "zappo"
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


	var filters = [{
			name: "Hide columns by % conservation (>=)",
			id: "hide_col_threshold_greater"
		},
		{
			name: "Hide columns by % conservation (<=)",
			id: "hide_col_threshold_less"
		},
		{
			name: "Hide columns by % conservation (between)",
			id: "hide_col_threshold_between"
		},
		{
			name: "Hide columns by % gaps (>=)",
			id: "hide_col_gaps_greater"
		},
		{
			name: "Hide columns by % gaps (<=)",
			id: "hide_col_gaps_less"
		},
		{
			name: "Hide columns by % gaps (between)",
			id: "hide_col_gaps_between"
		},
		/* to be implemented in the future
		{
			name: "Hide seqs by identity (>=)",
			id: "hide_seq_identity_greater"
		},
		{
			name: "Hide seqs by identity (<=)",
			id: "hide_seq_identity_less"
		},
		{
			name: "Hide seqs by gaps (>=)",
			id: "hide_seq_gaps_greater"
		},
		{
			name: "Hide seqs by gaps (<=)",
			id: "hide_seq_gaps_less"
		},
		*/
		{
			name: "Reset",
			id: "reset"
		}];

	//var noMenu = ["10_import", "15_ordering", "20_filter", "30_selection","40_vis", "70_extra", "90_help", "95_debug"];
	//noMenu.forEach(function(toRemove){delete defMenu.views[toRemove];});
	//m.addView("menu", defMenu);

	//this.typeButton = new Button({label:this.phylogram ? "cladogram" : "phylogram",onClick:lang.hitch(this, this.togglePhylo)}, this.typeButtonDom);
	var colorMenuDivs = [];

	schemes.forEach(lang.hitch(this, function(scheme){
		colorMenuDivs.push('<div class="wsActionTooltip"  rel="' + scheme.id + '">' + scheme.name + '</div>');
	}));

	var filterMenuDivs = [];
	filters.forEach(lang.hitch(this, function(filters){
		filterMenuDivs.push('<div class="wsActionTooltip"  rel="' + filters.id + '">' + filters.name + '</div>');
	}));

	var colorMenu = new TooltipDialog({
		content: colorMenuDivs.join(""),
		onMouseLeave: function(){
			popup.close(colorMenu);
		}
	});

	var infoMenu = new TooltipDialog({
		content: "<div> Create groups and download sequences by making a selection in the tree on the left.</div>",
		onMouseLeave: function(){
			popup.close(infoMenu);
		}
	});

	var idMenu = new TooltipDialog({
		content: "",
		onMouseLeave: function(){
			popup.close(idMenu);
		}
	});

	var filterMenu = new TooltipDialog({
		content: filterMenuDivs.join(""),
		onMouseLeave: function(){
			popup.close(filterMenu);
		}
	});

	var snapMenu = new TooltipDialog({
		content: "",
		onMouseLeave: function(){
			popup.close(snapMenu);
		}
	});

	return declare([Base], {
		"baseClass": "Phylogeny",
		"disabled": false,
		"query": null,
		"loading": false,
		data: null,
		dataMap: {},
		dataStats: {"_formatterType": "msa_details"},
		tree: null,
		phylogram: false,
        alignType: "protein",
		maxSequences: 500,
		numSequences: 0,
		featureData: null,
		selection: null,
		onSetLoading: function(attr, oldVal, loading){
			if(loading){
				this.contentPane.set("content", "<div>Performing Multiple Sequence Alignment. Please Wait...</div>");
			}
		},
		checkSequenceCount: function(query){
			var q = query + "&limit(500)";
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
				// console.log("Check Res: ", res.response)
				// console.log("Check Res: ", res.response.numFound)
				if(res && res.response && res.response.docs && (typeof res.response.numFound != 'undefined') && (res.response.numFound < this.maxSequences)){
					console.log("  Amount OK")
					this.numSequences = res.response.numFound;
					this.featureData = res.response.docs;
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
			// console.log("data", data);
			this.createDataMap();
			this.render();
		},

		onSelection: function(){

			var cur = this.selection.map(lang.hitch(this, function(selected){
				return this.dataMap[selected.id];
			}));
			// console.log("dataMap", this.dataMap);
			// console.log("data", this.data);
			// console.log("cur", cur);
			// console.log("this.itemDetailPanel", this.itemDetailPanel);
			this.selectionActionBar._setSelectionAttr(cur);
			var self = this;
			if (cur.length==1){
				var curr_selection = cur[0].feature_id;
				// console.log("curr_selection", curr_selection);
				this.featureData.forEach(function(sel){
					// console.log("sel", sel);
					// console.log("this.itemDetailPanel", self.itemDetailPanel);
					if (sel.feature_id == curr_selection) {
						self.itemDetailPanel.set('containerWidget', {containerType: 'feature_data'});
						self.itemDetailPanel.set('selection', [sel]);
					}
				})

			} else {
				this.itemDetailPanel.set('selection', cur);
			}
		},

		createDataMap: function(){
			var geneID = null;
			var clustal = ["CLUSTAL"];
            var clustal_txt = ["CLUSTAL"];
			var fasta = "";
			var tree_newick = this.data.tree;
			this.alt_labels = {"genome_name": {}, "patric_id": {}};
			this.dataStats["idType"] = null;
			this.dataStats["numFeatures"] = 0;
			this.dataStats["numOrganisms"] = 0;
			this.dataStats["minLength"] = 1000000;
			this.dataStats["maxLength"] = 0;
			this.dataStats["genomeIDs"] = {};
			// console.log("this.data ", this.data);
			// console.log("this.dataMap ", this.dataMap);
			this.data.alignment.split("\n").forEach(function(line){
				if(line.slice(0, 1) == ">"){
					var regex = /^>([^\s]+)\s+\[(.*?)\]/g;
					var match;
					var headerInfo = regex.exec(line);
					var record = {sequence: []};
					// console.log("headerInfo ", headerInfo);
					if(!(headerInfo[1] in this.dataMap)){
						geneID = headerInfo[1];
                        clustal.push(geneID + "\t");
						if (this.data.map[geneID]["patric_id"]) {
							clustal_txt.push(this.data.map[geneID]["patric_id"] + "\t");
							tree_newick = tree_newick.replace(new RegExp(geneID, 'g'), this.data.map[geneID]["patric_id"]);
							fasta = fasta + ">" + this.data.map[geneID]["patric_id"] + "\n";
						} else {
							clustal_txt.push(this.data.map[geneID]["refseq_locus_tag"]+ "\t");
							tree_newick = tree_newick.replace(new RegExp(geneID, 'g'), this.data.map[geneID]["refseq_locus_tag"]);
							fasta = fasta + ">" + this.data.map[geneID]["refseq_locus_tag"] + "\n";
						}
						this.dataStats["numFeatures"] += 1;
						if(geneID.startsWith("fig|")){
							record["patric_id"] = geneID;
							if(this.dataStats["idType"] == null){
								this.dataStats["idType"] = "patric_id";
							}

						}
						else{
							record["feature_id"] = geneID;
							if(this.dataStats["idType"] == null){
								this.dataStats["idType"] = "feature_id";
							}
						}
						record["genome_name"] = this.data.map[headerInfo[2]];
						record["genome_id"] = headerInfo[2];
						if(!(headerInfo[2] in this.dataStats["genomeIDs"])){
							this.dataStats["genomeIDs"][headerInfo[2]] = 1;
							this.dataStats["numOrganisms"] += 1;
						}
						this.dataMap[geneID] = record;
						this.alt_labels["genome_name"][geneID] = this.data.map[geneID]["genome_name"];
						if("patric_id" in this.data.map[geneID]){
							this.alt_labels["patric_id"][geneID] = this.data.map[geneID]["patric_id"];
						}
						else if("refseq_locus_tag" in this.data.map[geneID]){
							this.alt_labels["patric_id"][geneID] = this.data.map[geneID]["refseq_locus_tag"];
						}
						else{
							this.alt_labels["patric_id"][geneID] = this.data.map[geneID]["feature_id"];
						}

					}
				}
				else if(line.trim() != "" && geneID in this.dataMap){
					this.dataMap[geneID].sequence.push(line);
					clustal[clustal.length - 1] = clustal[clustal.length - 1] + line;
                    clustal_txt[clustal_txt.length - 1] = clustal_txt[clustal_txt.length - 1] + line;
					fasta = fasta + line + "\n";
				}
				else{
					geneID = null;
				}
			}, this);
			Object.keys(this.data.map).forEach(lang.hitch(this, function(geneID){
				if(this.data.map[geneID].aa_length > this.dataStats["maxLength"]){
					this.dataStats["maxLength"] = this.data.map[geneID].aa_length;
				}
				if(this.data.map[geneID].aa_length < this.dataStats["minLength"]){
					this.dataStats["minLength"] = this.data.map[geneID].aa_length;
				}
			}));
			this.dataStats.clustal = clustal.join("\n");
            this.dataStats.clustal_txt = clustal_txt.join("\n");
			this.dataStats.tree_newick = tree_newick;
			this.dataStats.fasta = fasta;
			// console.log("this.dataStats ", this.dataStats);
			// console.log("this.dataMap ", this.dataMap);
			// console.log("this.data ", this.data);
			// console.log("fasta ", fasta);

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
				seqs: msa.io.clustal.parse(this.dataStats.clustal)
			};

			var rearrangeSeqs = {};
			msa_models.seqs.forEach(lang.hitch(this, function(s){
				rearrangeSeqs[s.name] = s;
			}));

			var opts = {};
			// set your custom properties
			// @see: https://github.com/greenify/biojs-vis-msa/tree/master/src/g
			opts.seqs = msa_models.seqs;
			opts.el = msaDiv;
			opts.bootstrapMenu = false;
            if (this.alignType == "protein"){
                opts.colorscheme = {"scheme":"taylor"};
            }
            else if (this.alignType == "dna"){
                opts.colorscheme = {"scheme":"nucleotide"};
            }
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
				alignmentHeight: 14.04 * this.numSequences,
				//alignmentWidth: msa_models.seqs[0].seq.length*15.1,
				residueFont: "12",
				rowHeight: 14.04
			};

			this.tree = new d3Tree({selectionTarget: this});
			this.tree.d3Tree("#" + this.id + "tree-container", {phylogram: this.phylogram, fontSize: 12});
			this.tree.setTree(this.data.tree);
			//this.tree.setTree(this.data.tree);

			var idMenuDivs = [];
			this.tree.addLabels(this.alt_labels["genome_name"], "Genome Name");
			idMenuDivs.push('<div class="wsActionTooltip" rel="' + "Genome Name" + '">' + "Genome Name" + '</div>');
			this.tree.addLabels(this.alt_labels["patric_id"], "Gene ID");
			idMenuDivs.push('<div class="wsActionTooltip" rel="' + "Gene ID" + '">' + "Gene ID" + '</div>');
			idMenu.set("content", idMenuDivs.join(""));

			this.tree.startup();
			this.tree.selectLabels("Genome Name");
			this.tree.update();

			Object.keys(rearrangeSeqs).forEach(lang.hitch(this, function(fid){
				rearrangeSeqs[fid]["py"] = this.tree.idToHeight[fid];
			}));
			msa_models.seqs.sort(function(a, b){
				return a.py - b.py;
			});

			// init msa
			var m = new msa.msa(opts);
		 	// console.log("m ", m);
			var menuOpts = {};
			menuOpts.el = menuDiv;
			//var msaDiv = document.getElementById('msaDiv');
			msaDiv.setAttribute("style", "white-space: nowrap;");
			menuOpts.msa = m;
			var defMenu = new msa.menu.defaultmenu(menuOpts);

			on(colorMenu.domNode, "click", function(evt){
				var rel = evt.target.attributes.rel.value;
				var sel = colorMenu.selection;
				delete colorMenu.selection;
				var idType;

				var ids = sel.map(function(d, idx){
					if(!idType){
						if(d['feature_id']){
							idType = "feature_id";
						}else if(d['patric_id']){
							idType = "patric_id"
						}else if(d['alt_locus_tag']){
							idType = "alt_locus_tag";
						}
						// console.log("SET ID TYPE TO: ", idType)
					}

					return d[idType];
				});
				m.g.colorscheme.set("scheme", rel)
				popup.close(colorMenu);
			});

			on(idMenu.domNode, "click", lang.hitch(this, function(evt){
				var rel = evt.target.attributes.rel.value;
				var sel = idMenu.selection;
				delete idMenu.selection;

				this.tree.selectLabels(rel);
				popup.close(idMenu);
			}));

			on(filterMenu.domNode, "click", lang.hitch(this, function(evt){
				var rel = evt.target.attributes.rel.value;
				var sel = filterMenu.selection;
				delete filterMenu.selection;
				const maxLen = m.seqs.getMaxLength();
				// console.log("maxLen=", maxLen);
				const conserv = m.g.stats.scale(m.g.stats.conservation());
				const end = maxLen - 1;

				// console.log("msa_models=", msa_models);
				// console.log("m=", m);

				switch(rel){
				case "hide_col_threshold_greater":
					var threshold = prompt("Enter threshold (in percent)", 20);
					threshold = threshold / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						if (conserv[i] >= threshold) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "hide_col_threshold_less":
					var threshold = prompt("Enter threshold (in percent)", 20);
					threshold = threshold / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						if (conserv[i] <= threshold) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "hide_col_threshold_between":
					var threshold1 = prompt("Enter minimum threshold (in percent)", 20);
					var threshold2 = prompt("Enter maximum threshold (in percent)", 80);
					threshold1 = threshold1 / 100;
					threshold2 = threshold2 / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						if (conserv[i] >= threshold1 && conserv[i] <= threshold2) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "hide_col_gaps_greater":
					var threshold = prompt("Enter threshold (in percent)", 20);
					threshold = threshold / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						var gaps = 0;
						var total = 0;
						m.seqs.each((el) => {
						  if (el.get('seq')[i] === "-") { gaps++; }
						  return total++;
						});
						const gapContent = gaps / total;
						if (gapContent >= threshold) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "hide_col_gaps_less":
					var threshold = prompt("Enter threshold (in percent)", 20);
					threshold = threshold / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						var gaps = 0;
						var total = 0;
						m.seqs.each((el) => {
						  if (el.get('seq')[i] === "-") { gaps++; }
						  return total++;
						});
						const gapContent = gaps / total;
						if (gapContent <= threshold) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "hide_col_gaps_between":
					var threshold1 = prompt("Enter minimum threshold (in percent)", 20);
					var threshold2 = prompt("Enter maximum threshold (in percent)", 80);
					threshold1 = threshold1 / 100;
					threshold2 = threshold2 / 100;
					var hidden = [];
					for (var i = 0; i <= end; i++) {
						var gaps = 0;
						var total = 0;
						m.seqs.each((el) => {
						  if (el.get('seq')[i] === "-") { gaps++; }
						  return total++;
						});
						const gapContent = gaps / total;
						if (gapContent >= threshold1 && gapContent <= threshold2) {
						  hidden.push(i);
						}
					}
					treeDiv.setAttribute("style", "padding-top:0px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:105px;");
					m.g.columns.set("hidden", hidden);
					m.g.vis.set("seqlogo", false);
					break;

				case "reset":
					m.g.columns.set("hidden", []);
					m.seqs.each((el) => {
						if (el.get('hidden')) {
							return el.set('hidden', false);
						}
					});
					treeDiv.setAttribute("style", "padding-top:106px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;");
					this.tree.update();
					cell2.setAttribute("style", "padding-top:0px;");
					m.g.vis.set("seqlogo", true);
					break;

				default:
					break;
				}
				popup.close(filterMenu);
			}));

			on(snapMenu.domNode, "click", lang.hitch(this, function(evt){
				var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value : null;
				var sel = snapMenu.selection;
				delete snapMenu.selection;
				if(rel == "msa"){
					msa.utils.export.saveAsImg(m, "PATRIC_msa.png");
				}
				else if(rel == "msa-txt"){
					saveAs(new Blob([this.dataStats.clustal_txt]), "PATRIC_msa.txt");
				}
				else if(rel == "msa-fasta"){
					// msa.utils.export.saveAsFile(m, "PATRIC_msa.fasta");
					// console.log("this.dataStats.fasta ", this.dataStats.fasta);
					saveAs(new Blob([this.dataStats.fasta]), "PATRIC_msa.fasta");
				}
				else if(rel == "tree-svg"){
					saveAs(new Blob([query("svg")[0].outerHTML]), "PATRIC_msa_tree.svg");
				}
				else if(rel == "tree-newick"){
					saveAs(new Blob([this.dataStats.tree_newick]), "PATRIC_msa_tree.nwk");
				}
				popup.close(snapMenu);
			}));

			//var groupButton = new DropDownButton({
			//	name: "groupButton",
			//	label: "Add Group",
			//	dropDown: groupMenu
			//}, idMenuDom).startup();

			//this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
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
			// console.log("this.state.search ", this.state.search);
			this.set('loading', true);
			if(this.state && this.state.search){
				var q = this.state.search + "&limit(" + this.maxSequences + ")";
                if (this.state.pathname.indexOf("dna") !== -1){
                    this.alignType = "dna";
                }
				console.log("RUN MSA Against: ", q)
				return when(window.App.api.data("multipleSequenceAlignment", [q, this.alignType]), lang.hitch(this, function(res){
					console.log("MSA Results: ", res);
					this.set('loading', false);
					this.set('data', res);
				}))
			}

		},
		postCreate: function(){
			this.inherited(arguments);
			this.contentPane = new ContentPane({"region": "center"});
			this.addChild(this.contentPane)
			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 4,
				style: "width:56px;text-align:center;",
				splitter: false,
				currentContainerWidget: this
			});
			this.itemDetailPanel = new ItemDetailPanel({
				region: "right",
				style: "width:300px",
				splitter: true,
				layoutPriority: 1,
				containerWidget: this
			});
			this.addChild(this.selectionActionBar);
			this.addChild(this.itemDetailPanel);
			this.itemDetailPanel.startup();
			this.setupActions();
		},

		selectionActions: [
			[
				"ToggleItemDetail",
				"fa icon-chevron-circle-left fa-2x",
				{
					label: "DETAILS",
					persistent: true,
					validTypes: ["*"],
					tooltip: "Toggle Details Pane"
				},
				function(selection, container, button){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var children = this.getChildren();
					// console.log("Children: ", children);
					if(children.some(function(child){
							return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
						}, this)){
						console.log("Remove Item Detail Panel");
						this.removeChild(this.itemDetailPanel);
						console.log("Button Node: ", button)

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "DETAILS";
						})

						query(".ActionButton", button).forEach(function(node){
							console.log("ActionButtonNode: ", node)
							domClass.remove(node, "icon-chevron-circle-right");
							domClass.add(node, "icon-chevron-circle-left");
						})
					}
					else{
						// console.log("Re-add child: ", this.itemDetailPanel);
						this.addChild(this.itemDetailPanel);

						query(".ActionButtonText", button).forEach(function(node){
							node.innerHTML = "HIDE";
						})

						query(".ActionButton", button).forEach(function(node){
							console.log("ActionButtonNode: ", node)
							domClass.remove(node, "icon-chevron-circle-left");
							domClass.add(node, "icon-chevron-circle-right");
						})
					}
				},
				true
			],
			[
				"ColorSelection",
				"fa icon-paint-brush fa-2x",
				{
					label: "COLORS",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Selection Color",
					tooltipDialog: colorMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					colorMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.ColorSelection.options.tooltipDialog,
						around: this.selectionActionBar._actions.ColorSelection.button,
						orient: ["below"]
					});
				},
				true
			],
			[
				"IDSelection",
				"fa icon-pencil-square fa-2x",
				{
					label: "ID TYPE",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Set ID Type",
					tooltipDialog: idMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					idMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.IDSelection.options.tooltipDialog,
						around: this.selectionActionBar._actions.IDSelection.button,
						orient: ["below"]
					});
				},
				true
			],
			[
				"FilterSelection",
				"fa icon-filter fa-2x",
				{
					label: "Filter",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Show hide columns",
					tooltipDialog: filterMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					filterMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.FilterSelection.options.tooltipDialog,
						around: this.selectionActionBar._actions.FilterSelection.button,
						orient: ["below"]
					});
				},
				true
			],
			[
				"AddGroup",
				"fa icon-object-group fa-2x",
				{
					label: "GROUP",
					ignoreDataType: true,
					multiple: true,
					validTypes: ["*"],
					tooltip: "Add selection to a new or existing group",
					validContainerTypes: ["*"]
				},
				function(selection, containerWidget){
					// console.log("Add Items to Group", selection);
					var dlg = new Dialog({title: "Add selected items to group"});
					var type = "feature_data";

					if(!type){
						console.error("Missing type for AddGroup")
						return;
					}
					var stg = new SelectionToGroup({
						selection: selection,
						type: type,
						inputType: "feature_data",
						idType: this.dataStats.idType,
						path: null //set by type
					});
					on(dlg.domNode, "dialogAction", function(evt){
						dlg.hide();
						setTimeout(function(){
							dlg.destroy();
						}, 2000);
					});
					domConstruct.place(stg.domNode, dlg.containerNode, "first");
					stg.startup();
					dlg.startup();
					dlg.show();
				},
				false
			],
			[
				"MultipleSeqAlignmentFeatures",
				"fa icon-alignment fa-2x",
				{
					label: "MSA",
					ignoreDataType: true,
					min: 2,
					multiple: true,
					max: 200,
					validTypes: ["*"],
					tooltip: "Multiple Sequence Alignment",
					validContainerTypes: ["*"]
				},
				function(selection){
					// console.log("MSA Selection: ", selection);
					var ids = selection.map(function(d){
						return d['feature_id'];
					});
					// console.log("OPEN MSA VIEWER");
					Topic.publish("/navigate", {href: "/view/MSA/?in(feature_id,(" + ids.map(encodeURIComponent).join(",") + "))", target: "blank"});

				},
				false
			],
			[
				"ViewFeatureItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["*"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {href: "/view/Feature/" + sel.feature_id + "#view_tab=overview", target: "blank"});
				},
				false
			],
			[
				"ViewFeatureItems",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 5000,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["*"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
									return x.feature_id;
								}).join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {
						href: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
							return x.feature_id;
						}).join(",") + "))",
						target: "blank"
					});
				},
				false
			],
			[
				"ViewGenomeItem",
				"MultiButton fa icon-selection-Genome fa-2x",
				{
					label: "GENOME",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Genome View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["*"],
					pressAndHold: function(selection, button, opts, evt){
						console.log("PressAndHold");
						console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Genome",
								perspectiveUrl: "/view/Genome/" + selection[0].genome_id
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];
					// console.log("sel: ", sel)
					// console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id, target: "blank"});
				},
				false
			],
			[
				"ViewGenomeItems",
				"MultiButton fa icon-selection-GenomeList fa-2x",
				{
					label: "GENOMES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 1000,
					tooltip: "Switch to Genome List View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["*"],
					pressAndHold: function(selection, button, opts, evt){
						var map = {};
						selection.forEach(function(sel){
							if(!map[sel.genome_id]){
								map[sel.genome_id] = true
							}
						})
						var genome_ids = Object.keys(map);
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "GenomeList",
								perspectiveUrl: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var map = {};
					selection.forEach(function(sel){
						if(!map[sel.genome_id]){
							map[sel.genome_id] = true
						}
					})
					var genome_ids = Object.keys(map);
					Topic.publish("/navigate", {href: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))", target: "blank"});
				},
				false
			],
			[
				"Snapshot",
				"fa icon-download fa-2x",
				{
					label: "DWNLD",
					persistent: true,
					validTypes: ["*"],
					validContainerTypes: ["*"],
					tooltip: "Save an image",
					tooltipDialog: snapMenu,
					ignoreDataType: true
				},
				function(selection){
					// console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

					var snapMenuDivs = [];
					// disable downloding MSA png as the png does not give the species or tell you where in the alignment it is.
					// snapMenuDivs.push('<div class="wsActionTooltip" rel="msa">MSA png</div>');
					/*var encodedTree = window.btoa(unescape(encodeURIComponent(Query("svg")[0].outerHTML)));

					var e = domConstruct.create("a", {
						download: "MSATree.svg",
						href: "data:image/svg+xml;base64,\n" + encodedTree,
						style: {"text-decoration": "none", color: "black"},
						innerHTML: "Tree svg",
						alt: "ExportedMSATree.svg"
					});

					var clustalData = window.btoa(this.dataMap.clustal);
					var clustalLink =domConstruct.create("a", {
						download: "msa_patric.txt",
						href: "data:text/plain;base64,\n" + clustalData,
						style: {"text-decoration": "none", color: "black"},
						innerHTML: "MSA txt",
						alt: "export_msa.txt"
					});

					var treeData = window.btoa(this.data.tree);
					var newickLink =domConstruct.create("a", {
						download: "tree_newick.txt",
						href: "data:text/plain;base64,\n" + treeData,
						style: {"text-decoration": "none", color: "black"},
						innerHTML: "Tree newick",
						alt: "tree_newick.txt"
					});*/
					snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-txt">' + "MSA txt" + '</div>');
					snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-fasta">' + "MSA fasta" + '</div>');
					snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-svg">' + "Tree svg" + '</div>');
					snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-newick">' + "Tree newick" + '</div>');

					snapMenu.set("content", snapMenuDivs.join(""));
					snapMenu.selection = selection;
					// console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
					popup.open({
						popup: this.selectionActionBar._actions.Snapshot.options.tooltipDialog,
						around: this.selectionActionBar._actions.Snapshot.button,
						orient: ["below"]
					});
				},
				true
			]
		],

		setupActions: function(){
			if(this.containerActionBar){
				this.containerActions.forEach(function(a){
					this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
				}, this);
			}

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
			}, this);

		},
		startup: function(){

			if(this._started){
				return;
			}

			this.watch("loading", lang.hitch(this, "onSetLoading"));
			this.watch("data", lang.hitch(this, "onSetData"));
			this.watch("selection", lang.hitch(this, "onSelection"));

			this.inherited(arguments);
		}
	})
});
