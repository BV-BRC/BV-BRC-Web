require({cache:{
'url:p3/widget/templates/FeatureOverview.html':"<div style=\"overflow: auto;\">\n    <table style=\"margin:2px\">\n        <tbody>\n        <tr>\n            <td style=\"width:25%;padding:7px;vertical-align:top;\">\n                <div class=\"section\">\n                    <div class=\"SummaryWidget\">\n                        <button>Add PATRIC Feature to Workspace</button><br/>\n                        <a href=\"#\">View NT Sequence</a><br/>\n                        <a href=\"#\">View AA Sequence</a>\n                    </div>\n                </div>\n                <div class=\"section\">\n                    <h3 class=\"section-title\"><span class=\"wrap\">External Tools</span></h3>\n                    <div class=\"SummaryWidget\" data-dojo-attach-point=\"externalLinkNode\"></div>\n                </div>\n                <div class=\"section\">\n                    <h3 class=\"section-title\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n                    <!--<div data-dojo-attach-point=\"\"></div>-->\n                </div>\n            </td>\n            <td style=\"padding:7px;vertical-align:top;\">\n                <div class=\"section\">\n                    <table class=\"p3basic stripe far2x left\" style=\"width:80%\">\n                        <tbody>\n                        <tr>\n                            <th scope=\"row\">Gene ID</th>\n                            <td data-dojo-attach-point=\"geneIdList\"></td>\n                        </tr>\n                        <tr>\n                            <th scope=\"row\">Protein ID</th>\n                            <td>\n                                <span data-dojo-attach-point=\"proteinIdList\"></span>\n                                &nbsp; &nbsp;\n                                <span data-dojo-attach-point=\"idMappingList\"></span>\n                            </td>\n                        </tr>\n                        </tbody>\n                    </table>\n\n                    <div class=\"feature_box far2x right\" data-dojo-attach-point=\"featureBoxNode\"></div>\n                    <div class=\"clear\"></div>\n                </div>\n                <!--\n                    <div class=\"section\">\n                        <div data-dojo-attach-point=\"relatedFeatureNode\">\n                            Loading Related Features...\n                        </div>\n                    </div>\n                -->\n                <div class=\"section hidden\">\n                    <h3 class=\"section-title\"><span class=\"wrap\">Special Properties</span></h3>\n                    <div class=\"SummaryWidget\" style=\"height:150px;\" data-dojo-attach-point=\"specialPropertiesNode\"></div>\n                </div>\n\n                <div class=\"section\">\n                    <h3 class=\"section-title\"><span class=\"wrap\">Functional Properties</span></h3>\n                    <div class=\"SummaryWidget\" data-dojo-attach-point=\"functionalPropertiesNode\">\n                        Loading Functional Properties...\n                    </div>\n                </div>\n\n                <div class=\"section\">\n                    <h3 class=\"section-title\"><span class=\"wrap\">Comments</span></h3>\n                    <div class=\"SummaryWidget\" data-dojo-attach-point=\"featureCommentsNode\">\n                        [placeholder for comments]\n                    </div>\n                </div>\n            </td>\n        </tr>\n        </tbody>\n    </table>\n</div>\n"}});
define("p3/widget/FeatureOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_Templated", "dojo/text!./templates/FeatureOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/ThreeD", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin", "dgrid/Grid"

], function(declare, WidgetBase, on,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin, Grid){
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
			// console.log("Set Feature", feature);

			this.createSummary(feature);
			this.getSummaryData();
			this.set("functionalProperties", feature);
			this.set("staticLinks", feature);
		},
		_setStaticLinksAttr: function(feature){

			domConstruct.empty(this.externalLinkNode);

			if(feature.hasOwnProperty('patric_id')){
				var linkSEEDViewer = "http://pubseed.theseed.org/?page=Annotation&feature=" + feature.patric_id;
				var seed = domConstruct.create("a", {
					href: linkSEEDViewer,
					innerHTML: "The SEED Viewer",
					target: "_blank"
				}, this.externalLinkNode);
				domConstruct.place("<br>", seed, "after");
			}

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
					href:linkSTITCH,
					innerHTML:"STITCH: Chemical-Protein Interaction",
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
						{label: "Source", field: "source"},
						{label: "Source ID", field: "source_id"},
						{label: "Organism", field: "organism"},
						{
							label: "PubMed", field: "pmid", renderCell: function(obj, val, node){
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

			domConstruct.empty(this.idMappingList);
			var span = domConstruct.create("span", {innerHTML: "<b>UniProt</b> :"}, this.idMappingList);

			summary['accessions'].forEach(function(d){
				var accession = domConstruct.create("a", {
					href: "http://www.uniprot.org/uniprot/" + d,
					target: "_blank",
					innerHTML: d
				}, span);
				domConstruct.place(domConstruct.toDom("&nbsp; &nbsp;"), accession, "after");
			});

			var mappedIds = domConstruct.create("a", {innerHTML: summary['total'] + " IDs are mapped"}, this.idMappingList);
			domConstruct.place(domConstruct.toDom("&nbsp; &nbsp;"), mappedIds, "before");

			var table = domConstruct.create("table", {"class": "hidden"}, this.idMappingList);
			summary['ids'].forEach(function(id){
				var tr = domConstruct.create('tr', {}, table);
				domConstruct.create('th', {innerHTML: id['id_type']}, tr);
				domConstruct.create('td', {innerHTML: id['id_value']}, tr);
			});

			on(mappedIds, "click", function(){
				if(domClass.contains(table, "hidden")){
					domClass.remove(table, "hidden");
				}else{
					domClass.add(table, "hidden");
				}
			});
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
					// https://www.patricbrc.org/portal/portal/patric/CompPathwayMap?cType=genome&cId=83332.12&dm=feature&feature_id=PATRIC.83332.12.NC_000962.CDS.2052.3260.fwd&map=00240&algorithm=PATRIC&ec_number=
					return '<a href="/view/PathwayMap/annotation=PATRIC&genome_id=' + feature.genome_id + '&pathway_id=' + pw[0] + '&feature_id=' + feature.feature_id + '" target="_blank">KEGG:' + pw[0] + '</a>&nbsp;' + pw[1];
				}).join('<br>')
			}

			domConstruct.empty(this.functionalPropertiesNode);
			var table = domConstruct.create("table", {"class": "p3basic"}, this.functionalPropertiesNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "GO Assignments", scope: "row", style: "width:20%"}, htr);
			domConstruct.create("td", {innerHTML: goLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "EC Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: ecLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Local Family Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: plfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Global Family Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: pgfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "FIGfam Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: figfamLink || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Pathway Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: pwLink || '-'}, htr);

			// TODO: implement structure
			// TODO: implement protein interaction
		},
		getSummaryData: function(){

			if(this.feature.gi){
				xhr.get(PathJoin(this.apiServiceUrl, "id_ref/?and(eq(id_type,GI)&eq(id_value," + this.feature.gi + "))&select(uniprotkb_accession)&limit(0)"), {
					handleAs: "json",
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': window.App.authorizationToken || ""
					}
				}).then(lang.hitch(this, function(data){

					var uniprotKbAccessions = data.map(function(d){
						return d.uniprotkb_accession;
					});

					xhr.get(PathJoin(this.apiServiceUrl, "id_ref/?in(uniprotkb_accession,(" + uniprotKbAccessions + "))&select(id_type,id_value)&limit(25000)"), {
						handleAs: "json",
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': window.App.authorizationToken || ""
						}
					}).then(lang.hitch(this, function(data){
						if(data.length === 0) return;

						this.set("mappedFeatureList", {accessions: uniprotKbAccessions, total: data.length, ids: data});
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

			xhr.get(PathJoin(this.apiServiceUrl, "/sp_gene/?eq(feature_id," + this.feature.feature_id + ")&select(evidence,property,source,source_id,organism,pmid,subject_coverage,query_coverage,identity,e_value)"), {
				handleAs: "json",
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': window.App.authorizationToken || ""
				}
			}).then(lang.hitch(this, function(data){
				if(data.length === 0) return;

				this.set("specialProperties", data);
			}))
		},
		createSummary: function(feature){
			if(feature && feature.feature_id){
				if(feature.patric_id){
					this.geneIdList.innerHTML = '<span><b>PATRIC ID</b>: ' + feature.patric_id + '</span>&nbsp; ';
				}

				if(feature.refseq_locus_tag){
					this.geneIdList.innerHTML += '<span><b>RefSeq</b>: ' + feature.refseq_locus_tag + '</span>&nbsp; ';
				}

				if(feature.alt_locus_tag){
					this.geneIdList.innerHTML += '<span><b>Alt Locus Tag</b>: ' + feature.alt_locus_tag + '</span>';
				}

				this.proteinIdList.innerHTML = '';
				if(feature.protein_id != null){
					this.proteinIdList.innerHTML += '<b>RefSeq</b>: <a href="https://www.ncbi.nlm.nih.gov/protein/' + feature.protein_id + '" target="_blank">' + feature.protein_id + '</a>';
				}

				// feature box
				this.featureBoxNode.innerHTML = '<div class="gene_symbol">' + (feature.gene || ' ') + '</div>';
				if(feature.strand == '+'){
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-right fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}else{
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-left fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}
				this.featureBoxNode.innerHTML += '<div class="feature_type">' + this.feature.feature_type + '</div>';

			}else{
				console.log("Invalid Feature: ", feature);
			}
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
