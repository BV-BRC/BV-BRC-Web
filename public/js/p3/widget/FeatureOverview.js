define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/request", "dojo/topic",
	"dojo/dom-class", "dojo/dom-construct", "dojo/text!./templates/FeatureOverview.html",
	"dijit/_WidgetBase", "dijit/_Templated", "dijit/Dialog",
	"../util/PathJoin", "dgrid/Grid",
	"./DataItemFormatter", "./ExternalItemFormatter", "./formatter", "./D3SingleGeneViewer", "./SelectionToGroup"

], function(declare, lang, on, xhr, Topic,
			domClass, domConstruct, Template,
			WidgetBase, Templated, Dialog,
			PathJoin, Grid,
			DataItemFormatter, ExternalItemFormatter, formatter, D3SingleGeneViewer, SelectionToGroup){

	var xhrOption = {
		handleAs: "json",
		headers: {
			'Accept': 'application/json',
			'Content-Type': "application/rqlquery+x-www-form-urlencoded",
			'X-Requested-With': null,
			'Authorization': window.App.authorizationToken || ""
		}
	};

	return declare([WidgetBase, Templated], {
		baseClass: "FeatureOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		feature: null,
		state: null,

		_setStateAttr: function(state){
			this._set("state", state);
			if(state.feature){
				this.set("feature", state.feature);
			}else{
				//
			}
		},

		_setFeatureAttr: function(feature){
			this.feature = feature;

			this.getSummaryData();
			this.set("featureSummary", feature);
			this.set("publications", feature);
			this.set("functionalProperties", feature);
			this.set("staticLinks", feature);

			if(!feature.patric_id){
				domClass.remove(this.isRefSeqOnly, "hidden");
			}
		},
		_setStaticLinksAttr: function(feature){

			domConstruct.empty(this.externalLinkNode);

			// if(feature.hasOwnProperty('patric_id')){
			// 	var linkSEEDViewer = "http://pubseed.theseed.org/?page=Annotation&feature=" + feature.patric_id;
			// 	var seed = domConstruct.create("a", {
			// 		href: linkSEEDViewer,
			// 		innerHTML: "The SEED Viewer",
			// 		target: "_blank"
			// 	}, this.externalLinkNode);
			// 	domConstruct.place("<br>", seed, "after");
			// }

			if(feature.hasOwnProperty('aa_sequence')){
				var linkCDDSearch = "http://www.ncbi.nlm.nih.gov/Structure/cdd/wrpsb.cgi?SEQUENCE=%3E";
				var dispSequenceID = [];
				if(feature['annotation'] === 'PATRIC'){
					if(feature['alt_locus_tag']){
						dispSequenceID.push(feature['alt_locus_tag']);
					}
					if(feature['refseq_locus_tag']){
						dispSequenceID.push("|");
						dispSequenceID.push(feature['refseq_locus_tag']);
					}
					if(feature['product']){
						dispSequenceID.push(" ");
						dispSequenceID.push(feature['product']);
					}
				}else if(feature['annotation'] === 'RefSeq'){
					dispSequenceID.push(feature['alt_locus_tag']);
					dispSequenceID.push(" ");
					dispSequenceID.push(feature['product']);
				}

				var cdd = domConstruct.create("a", {
					href: linkCDDSearch + dispSequenceID.join("").replace(" ", "%20") + "%0A" + feature.aa_sequence + "&amp;FULL",
					innerHTML: "NCBI CDD Search",
					target: "_blank"
				}, this.externalLinkNode);
				domConstruct.place("<br>", cdd, "after");
			}

			if(feature.hasOwnProperty('refseq_locus_tag')){
				var linkSTRING = "http://string.embl.de/newstring_cgi/show_network_section.pl?identifier=" + feature.refseq_locus_tag;
				var string = domConstruct.create("a", {
					href: linkSTRING,
					innerHTML: "STRING: Protein-Protein Interactions",
					target: "_blank"
				}, this.externalLinkNode);
				domConstruct.place("<br>", string, "after");

				var linkSTITCH = "http://stitch.embl.de/cgi/show_network_section.pl?identifier=" + feature.refseq_locus_tag;
				domConstruct.create("a", {
					href: linkSTITCH,
					innerHTML: "STITCH: Chemical-Protein Interaction",
					target: "_blank"
				}, this.externalLinkNode);
			}
		},

		_setSpecialPropertiesAttr: function(data){
			domClass.remove(this.specialPropertiesNode.parentNode, "hidden");

			if(!this.specialPropertiesGrid){
				var opts = {
					columns: [
						{label: "Evidence", field: "evidence"},
						{label: "Property", field: "property"},
						{label: "Source", field: "source",
							renderCell: function(obj, val, node){
								if(val){
									var sourceLink;
									switch(val){
										case "PATRIC_VF":
										case "Victors":
										case "VFDB":
										case "Human":
										case "ARDB":
										case "CARD":
										case "DrugBank":
										case "TTD":
											var url = formatter.getExternalLinks(val + "_HOME");
											// console.log(val + "_HOME", url);
											sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
											break;
										default:
											break;
									}
									node.innerHTML = sourceLink;
								}
							}
						},
						{label: "Source ID", field: "source_id",
							renderCell: function(obj, val, node){
								if(val){
									var sourceLink;
									switch(obj.source){
										case "PATRIC_VF":
										case "Victors":
										case "VFDB":
										case "Human":
										case "ARDB":
										case "TTD":
											var url = formatter.getExternalLinks(obj.source) + val;
											sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
											break;
										case "CARD":
											sourceLink = val;
											break;
										case "DrugBank":
											var padding = "BE0000000";
											var paddedId = padding.substring(0, padding.length - val.length) + val;
											var url = formatter.getExternalLinks(obj.source) + paddedId;
											sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
											break;
										default:
											break;
									}
									node.innerHTML = sourceLink;
								}
							}
						},
						{label: "Organism", field: "organism"},
						{label: "PubMed", field: "pmid",
							renderCell: function(obj, val, node){
								if(val){
									node.innerHTML = '<a href="https://www.ncbi.nlm.nih.gov/pubmed/' + val + '">' + val + '</a>';
								}
							}
						},
						{label: "Subject coverage", field: "subject_coverage"},
						{label: "Query coverage", field: "query_coverage"},
						{label: "Identity", field: "identity"},
						{label: "E-value", field: "e_value"}
					]
				};

				this.specialPropertiesGrid = new Grid(opts, this.specialPropertiesNode);
				this.specialPropertiesGrid.startup();
			}

			this.specialPropertiesGrid.refresh();
			this.specialPropertiesGrid.renderArray(data);
		},
		_setRelatedFeatureListAttr: function(summary){

			domConstruct.empty(this.relatedFeatureNode);
			var table = domConstruct.create("table", {"class": "p3basic"}, this.relatedFeatureNode);
			var thead = domConstruct.create("thead", {}, table);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, thead);
			domConstruct.create("th", {innerHTML: "Annotation"}, htr);
			domConstruct.create("th", {innerHTML: "Locus Tag"}, htr);
			domConstruct.create("th", {innerHTML: "Start"}, htr);
			domConstruct.create("th", {innerHTML: "End"}, htr);
			domConstruct.create("th", {innerHTML: "NT Length"}, htr);
			domConstruct.create("th", {innerHTML: "AA Length"}, htr);
			domConstruct.create("th", {innerHTML: "Product"}, htr);

			summary.forEach(function(row){
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: row.annotation}, tr);
				domConstruct.create("td", {innerHTML: row.alt_locus_tag}, tr);
				domConstruct.create("td", {innerHTML: row.start}, tr);
				domConstruct.create("td", {innerHTML: row.end}, tr);
				domConstruct.create("td", {innerHTML: row.na_length}, tr);
				domConstruct.create("td", {innerHTML: row.aa_length || '-'}, tr);
				domConstruct.create("td", {innerHTML: row.product || '(feature type: ' + row.feature_type + ')'}, tr);
			});
		},
		_setMappedFeatureListAttr: function(summary){
			domClass.remove(this.idMappingNode.parentNode, "hidden");

			if(!this.idMappingGrid){
				var opts = {
					columns: [
						{label: "Database", field: "id_type"},
						{label: "Identifier", field: "id_value",
							renderCell: function(obj, val, node){
								var baseUrl = formatter.getExternalLinks(obj['id_type']);
								if(obj['id_type'].match(/"HOGENOM|OMA|ProtClustDB|eggNOG"/)){
									node.innerHTML = '<a href="' + baseUrl + obj['uniprotkb_accession'] + '" taget=_blank>' + val + '</a>';
								}else{
									node.innerHTML = '<a href="' + baseUrl + val + '" target=_blank>' + val + '</a>';
								}
							}
						}
					]
				};

				this.idMappingGrid = new Grid(opts, this.idMappingNode);
				this.idMappingGrid.startup();
			}
			this.idMappingGrid.refresh();
			this.idMappingGrid.renderArray(summary);
		},
		_setFunctionalPropertiesAttr: function(feature){

			var goLink, ecLink, plfamLink, pgfamLink, figfamLink, pwLink;
			if(feature.hasOwnProperty('go')){
				goLink = feature['go'].map(function(goStr){
					var go = goStr.split('|');
					return '<a href="http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=' + go[0] + '" target=_blank>' + go[0] + '</a>&nbsp;' + go[1];
				}).join('<br>');
			}

			if(feature.hasOwnProperty('ec')){
				ecLink = feature['ec'].map(function(ecStr){
					var ec = ecStr.split('|');
					return '<a href="http://enzyme.expasy.org/EC/' + ec[0] + '" target=_blank>' + ec[0] + '</a>&nbsp;' + ec[1];
				}).join('<br>');
			}

			if(feature.hasOwnProperty('plfam_id')){
				plfamLink = '<a href="/view/FeatureList/?eq(plfam_id,' + feature.plfam_id + ')#view_tab=features" target="_blank">' + feature.plfam_id + '</a>';
			}

			if(feature.hasOwnProperty('pgfam_id')){
				pgfamLink = '<a href="/view/FeatureList/?eq(pgfam_id,' + feature.pgfam_id + ')#view_tab=features" target="_blank">' + feature.pgfam_id + '</a>';
			}

			if(feature.hasOwnProperty('figfam_id')){
				figfamLink = '<a href="/view/FeatureList/?eq(figfam_id,' + feature.figfam_id + ')#view_tab=features" target="_blank">' + feature.figfam_id + '</a>';
			}

			if(feature.hasOwnProperty('pathway')){
				pwLink = feature['pathway'].map(function(pwStr){
					var pw = pwStr.split('|');
					return '<a href="/view/PathwayMap/?annotation=PATRIC&genome_id=' + feature.genome_id + '&pathway_id=' + pw[0] + '&feature_id=' + feature.feature_id + '" target="_blank">KEGG:' + pw[0] + '</a>&nbsp;' + pw[1];
				}).join('<br>')
			}

			domConstruct.empty(this.functionalPropertiesNode);

			var table = domConstruct.create("table", {"class": "p3basic striped"}, this.functionalPropertiesNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr;

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Local Family", scope: "row", style: "width:20%"}, htr);
			domConstruct.create("td", {innerHTML: plfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Global Family", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: pgfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "FIGfam", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: figfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "GO Terms", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: goLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "EC Numbers", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: ecLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Pathways", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: pwLink || '-'}, htr);

			// TODO: implement structure
			// TODO: implement protein interaction
		},
		_setFeatureSummaryAttr: function(feature){
			domConstruct.empty(this.featureSummaryNode);

			// this feature contains taxonomy info
			domConstruct.place(DataItemFormatter(feature, "feature_data", {}), this.featureSummaryNode, "first");
		},
		_setPublicationsAttr: function(feature){
			domConstruct.empty(this.pubmedSummaryNode);

			domConstruct.place(ExternalItemFormatter(feature, "pubmed_data", {}), this.pubmedSummaryNode, "first");
		},
		_setFeatureViewerAttr: function(data){
			domConstruct.empty(this.sgViewerNode);
			var gene_viewer = new D3SingleGeneViewer();
			gene_viewer.init(this.sgViewerNode);
			gene_viewer.render(data);
		},
		_setFeatureCommentsAttr: function(data){
			domClass.remove(this.featureCommentsNode.parentNode, "hidden");

			if(!this.featureCommentsGrid){
				var opts = {
					columns: [
						{label: "Source", field: "source"},
						{label: "Property", field: "property"},
						{label: "Value", field: "value"},
						{label: "Evidence Code", field: "evidence_code"},
						{label: "PubMed", field: "pmid",
							renderCell: function(obj, val, node){
								if(val){
									node.innerHTML = "<a href='//view.ncbi.nlm.nih.gov/pubmed/" + val + "' target='_blank'>" + val + "</a>";
								}
							}
						},
						{label: "Comment", field: "comment",
							renderCell: function(obj, val, node){
								if(val){
									node.innerHTML = val;
								}
							}
						}
					]
				};

				this.featureCommentsGrid = new Grid(opts, this.featureCommentsNode);
				this.featureCommentsGrid.startup();
			}

			this.featureCommentsGrid.refresh();
			this.featureCommentsGrid.renderArray(data);
		},
		getSummaryData: function(){

			// uniprot mapping
			if(this.feature.gi){
				var url = PathJoin(this.apiServiceUrl, "id_ref/?and(eq(id_type,GI)&eq(id_value," + this.feature.gi + "))&select(uniprotkb_accession)&limit(0)");
				xhr.get(url, xhrOption).then(lang.hitch(this, function(data){

					if(data.length === 0) return;

					var uniprotKbAccessions = data.map(function(d){
						return d.uniprotkb_accession;
					});

					var url = PathJoin(this.apiServiceUrl, "id_ref/?in(uniprotkb_accession,(" + uniprotKbAccessions + "))&select(uniprotkb_accession,id_type,id_value)&limit(25000)");
					xhr.get(url, xhrOption).then(lang.hitch(this, function(data){
						if(data.length === 0) return;

						this.set("mappedFeatureList", data);
					}));
				}));
			}

			// get related feature list
			// if(this.feature.pos_group != null){
			// 	xhr.get(this.apiServiceUrl + "/genome_feature/?eq(pos_group," + encodeURIComponent('"' + this.feature.pos_group + '"') + ")&limit(0)", {
			// 		handleAs: "json",
			// 		headers: {"Accept": "application/solr+json"}
			// 	}).then(lang.hitch(this, function(data){
			//
			// 		if(data.length === 0) return;
			// 		var relatedFeatures = data.response.docs;
			// 		this.set("relatedFeatureList", relatedFeatures);
			// 	}));
			// }

			// specialty gene
			var spgUrl = PathJoin(this.apiServiceUrl, "/sp_gene/?eq(feature_id," + this.feature.feature_id + ")&select(evidence,property,source,source_id,organism,pmid,subject_coverage,query_coverage,identity,e_value)");
			xhr.get(spgUrl, xhrOption).then(lang.hitch(this, function(data){
				if(data.length === 0) return;

				this.set("specialProperties", data);
			}));

			// single gene viewer
			var centerPos = Math.ceil((this.feature.start + this.feature.end + 1) / 2);
			var rangeStart = (centerPos >= 5000) ? (centerPos - 5000) : 0;
			var rangeEnd = (centerPos + 5000);
			var query = "?and(eq(genome_id," + this.feature.genome_id + "),eq(accession," + this.feature.accession + "),eq(annotation," + this.feature.annotation + "),gt(start," + rangeStart + "),lt(end," + rangeEnd + "),ne(feature_type,source))&select(feature_id,patric_id,refseq_locus_tag,strand,feature_type,start,end,na_length,gene,product)&sort(+start)";

			xhr.get(PathJoin(this.apiServiceUrl, "/genome_feature/" + query), xhrOption).then(lang.hitch(this, function(data){
				if(data.length === 0) return;

				var firstStartPosition = Math.max(data[0].start, rangeStart);
				var lastEndPosition = Math.min(data[data.length - 1].end, rangeEnd);
				this.set("featureViewer", {
					firstStartPosition: firstStartPosition,
					lastEndPosition: lastEndPosition,
					features: data,
					pinStart: this.feature.start
				});
			}));

			// feature comments
			if(this.feature.refseq_locus_tag){
				var url = PathJoin(this.apiServiceUrl, "/structured_assertion/?eq(refseq_locus_tag," + this.feature.refseq_locus_tag + ")");
				xhr.get(url, xhrOption).then(lang.hitch(this, function(data){
					if(data.length === 0) return;

					this.set("featureComments", data);
				}));
			}
		},

		onAddFeature: function(){

			if(!window.App.user || !window.App.user.id){
				Topic.publish("/login");
				return;
			}

			var dlg = new Dialog({title: "Add This Feature To Group"});
			var stg = new SelectionToGroup({
				selection: [this.feature],
				type: 'feature_group'
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
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
