define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/dom-construct",
	"dojo/dom-class", "./viewer/Base", "./Button", "dijit/registry", "dojo/_base/lang",
	"dojo/dom", "dojo/topic", "dijit/form/TextBox", "dojo/keys", "dijit/_FocusMixin", "dijit/focus",
	"dijit/layout/ContentPane", "dojo/request", "../util/QueryToSearchInput", "./GlobalSearch",
	"dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin", "dojo/text!./templates/AdvancedSearch.html",
	"../util/searchToQuery", "./formatter"
], function(declare, WidgetBase, on, domConstruct,
			domClass, base, Button, Registry, lang,
			dom, Topic, TextBox, keys, FocusMixin, focusUtil,
			ContentPane, Request, queryToSearchInput, GlobalSearch,
			TemplatedMixin, WidgetsInTemplate, Template,
			searchToQuery, formatter
){
	return declare([WidgetBase, TemplatedMixin, WidgetsInTemplate], {
		"baseClass": "AdvancedSearch",
		"disabled": false,
		state: null,
		templateString: Template,
		searchTypes: ["genome", "genome_feature", "taxonomy", "sp_gene", "transcriptomics_experiment", "antibiotics"],
		labelsByType: {
			"genome": "Genomes",
			"genome_feature": "Genomic Features",
			"taxonomy": "Taxonomy",
			"sp_gene": "Specialty Genes",
			"transcriptomics_experiment": "Transcriptomics Experiments",
			"antibiotics": "Antibiotics"
		},

		advancedSearchDef: {
			"genomes": {
				fields: [
					{field: "genome_id", label: "Genome ID", type: "orText"},
					{field: "genome_name", label: "Genome Name", type: "orText"},
					{field: "genome_status", label: "Genome Status", type: "orText"},
					{field: "isolation_country", label: "Isolation Country", type: "orText"},
					{field: "host_name", label: "Host Name", type: "orText"},
					{field: "collection_date", label: "Collection Date", type: "date"},
					{field: "completion_date", label: "Completion Date", type: "date"}
				]
			},

			"features": {
				fields: [
					{field: "feature_type", label: "Feature Type", type: "select", values: []},
					{field: "annotation", label: "Annotation", type: "select", values: ["all", "PATRIC", "RefSeq"]}
				]
			},

			"sp_genes": {
				fields: [
					{field: "property", label: "Property", type: "checkboxes", values: ["Antibiotic Resistance", "Drug Target", "Human Homolog", "Virulence Factor"]},
					{field: "evidence", label: "Evidence", type: "checkboxes", values: ["Literature", "BLASTP"]}
				]
			}
		},

		_generateLink: {
			"genome": function(docs, total){
				console.log("Genome Link Generator: ", docs, total)
				if (total==1){
					return ['/view/Genome/', docs[0].genome_id, "#view_tab=overview"].join("");
				}else{
					return ['/view/GenomeList/?', this.state.search, "#view_tab=genomes"].join("");
				}
			},
			"genome_feature": function(docs, total){
				if (total==1){
					return ['/view/Feature/', docs[0].feature_id, "#view_tab=overview"].join("");
				}else{
					return ['/view/FeatureList/?', this.state.search, "#view_tab=features&defaultSort=-score"].join("");
				}
			},
			"taxonomy": function(docs, total){
				if (total==1){
					return ['/view/Taxonomy/', docs[0].taxon_id, "#view_tab=overview"].join("");
				}else{
					return ['/view/TaxonList/?', this.state.search, "#view_tab=taxons"].join("");
				}
			},

			"sp_gene": function(docs, total){
				if (total==1){
					return ['/view/Feature/', docs[0].feature_id, "#view_tab=overview"].join("");
				}else{
					return ['/view/SpecialtyGeneList/?', this.state.search, "#view_tab=specialtyGenes"].join("");
				}
			},
			"transcriptomics_experiment": function(docs, total){
				if (total==1){
					return ['/view/ExperimentComparison/', docs[0].eid, "#view_tab=overview"].join("");
				}else{
					return ['/view/TranscriptomicsExperimentList/?', this.state.search, "#view_tab=experiments"].join("");
				}
			},
			"antibiotics": function(docs, total){
				if (total==1){
					return ['/view/Antibiotic/', docs[0].eid].join("");
				}else{
					return ['/view/AntibioticList/?', this.state.search].join("");
				}
			}
		},

		generateLink: function(type, docs, total){
			console.log("Generate Link: ", type, docs, total)
			return this._generateLink[type].apply(this, [docs, total]);
		},

		_setStateAttr: function(state){
			console.log("AdvancedSearch _setStateAttr: ", state);
			this._set("state", state);
		},

		onSetState: function(attr, oldval, state){
			console.log("onSetState: ", state.search);

			if (state.search){
				this.searchBox.set("value", queryToSearchInput(state.search));
				this.search(state.search);

			}else{
				this.searchBox.set("value", "");
				this.viewer.set("content", "");

			}
		},
		searchResults: null,

		formatgenome: function(docs, total){
			var out=["<div class=\"searchResultsContainer genomeResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/GenomeList/?', this.state.search, "#view_tab=genomes", '">Genomes&nbsp;(', total, ")</div></a>"];

			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Genome/" + doc.genome_id + "'>" + doc.genome_name + "</a></div>");

				out.push("<div class='resultInfo'>");
				out.push("<span> Genome ID: " + doc.genome_id + "</span>");

				if (doc.plasmids && doc.plasmids > 0){
					out.push(" | ");
					out.push("<span>" + doc.plasmids + " Plasmids</span>");
				}

				if (doc.contigs && doc.contigs > 0){
					out.push(" | ");
					out.push("<span>" + doc.contigs + " Contigs</span>");
				}

				out.push("</div>");

				out.push("<div class='resultInfo'>");
				if (doc.completion_date){
					out.push("<span> SEQUENCED: " + formatter.dateOnly(doc.completion_date) + "</span>")
				}

				if (doc.sequencing_centers){

					out.push("&nbsp;(" + doc.sequencing_centers + ")");
				}
				out.push("</div>")

				out.push("<div class='resultInfo'>");
				if (doc.collection_date){
					out.push("<span>COLLECTED: " + formatter.dateOnly(doc.collection_date) + "</span>");
				}
				if (doc.host_name){
					out.push("<span>HOST:  " + doc.host_name + "</span>");
				}

				out.push("</div>");

				if (doc.comments && doc.comments!="-"){
					out.push("<div class='resultInfo comments'>" + doc.comments +"</div>")
				}
				out.push("</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		formatgenome_feature: function(docs, total){
			var out=["<div class=\"searchResultsContainer featureResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/FeatureList/?', this.state.search, "#view_tab=features&defaultSort=-score", '">Genomic Features&nbsp;(', total, ")</div> </a>"];
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Feature/" + doc.feature_id + "'>" + (doc.product || doc.patric_id || doc.refseq_locus_tag || doc.alt_locus_tag) + "</a>");
				if (doc.gene) {  out.push(" | " + doc.gene ); }
				out.push("</div>");

				out.push("<div class='resultInfo'>" + doc.genome_name +  "</div>");

				out.push("<div class='resultInfo'>" + doc.annotation + " | " + doc.feature_type);

				if (doc.patric_id){
					out.push("&nbsp;|&nbsp;" + doc.patric_id);
				}

				if (doc.refseq_locus_tag){
					out.push("&nbsp;|&nbsp;" + doc.refseq_locus_tag);
				}

				if (doc.alt_locus_tag){
					out.push("&nbsp;|&nbsp;" + doc.alt_locus_tag);
				}

				out.push("</div>");
				out.push("</div>");
			})
			out.push("</div>");
			return out.join("");
		},


		formatsp_gene: function(docs, total){
			var out=["<div class=\"searchResultsContainer featureResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SpecialtyGeneList/?', this.state.search, "#view_tab=specialtyGenes&filter=false", '">Specialty Genes&nbsp;(', total, ")</div> </a>"];
			// console.log("formatsp_gene, docs: ", docs);
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Feature/" + doc.feature_id + "'>" + doc.product + "</a>");
				if (doc.gene) {  out.push(" | " + doc.gene ); }
				out.push("</div>");

				out.push("<div class='resultInfo'>" + doc.genome_name +  "</div>");

				out.push("<div class='resultInfo'>" + doc.property + " | " + doc.source);

				if (doc.evidence){
					out.push("&nbsp;|&nbsp;" + doc.evidence);
				}

				if (doc.refseq_locus_tag){
					out.push("&nbsp;|&nbsp;" + doc.refseq_locus_tag);
				}

				if (doc.alt_locus_tag){
					out.push("&nbsp;|&nbsp;" + doc.alt_locus_tag);
				}

				out.push("</div>");
				out.push("</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		formattranscriptomics_experiment: function(docs, total){
			console.log("formattranscriptomics_experiment docs: ", docs);
			var out;
			if (total==1){
				out=["<div class=\"searchResultsContainer featureResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/ExperimentComparison/', docs[0].eid, "#view_tab=overview", '">Transcriptomics Experiments&nbsp;(', total, ")</div> </a>"];
			} else if (total>1) {
				out=["<div class=\"searchResultsContainer featureResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/TranscriptomicsExperimentList/?', this.state.search, "#view_tab=experiments", '">Transcriptomics Experiments&nbsp;(', total, ")</div> </a>"];
			}

			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/ExperimentComparison/" + doc.eid + "#view_tab=overview'>" + doc.title + "</a>");
				out.push("</div>");
				out.push("<div class='resultInfo'>" + doc.organism);

				if (doc.strain){
					out.push ("&nbsp;|&nbsp;" + doc.strain)

				}

				out.push("</div>");

				out.push("<div class='resultInfo'>");
				out.push(doc.genes + "&nbsp;Genes&nbsp;|&nbsp;"+ doc.samples + " Comparisons");
				out.push("</div>")

				out.push("<div class='resultInfo'>");
				out.push(doc.mutant);
				out.push("</div>");


				out.push("<div class='resultInfo'>");
				out.push(doc.condition);
				out.push("</div>");


				out.push("</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		formattaxonomy: function(docs, total){
			var q = this.state.search;
			console.log("format taxonomy q: ", q);
			var out=["<div class=\"searchResultsContainer taxonomyResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/TaxonList/?', q, '">Taxa</a>&nbsp;(', total, ")</div>"];

			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Taxonomy/" + doc.taxon_id + "'>" + doc.taxon_name + "</a></div>");
				out.push("<div class='resultInfo'>" + doc.genomes +  " Genomes</div>");
				out.push("</div>")
			})
			out.push("</div>");

			console.log("Taxonomy Format: ", out.join(""));
			return out.join("");
		},

		formatantibiotics: function(docs, total){
			var q = this.state.search;
			console.log("format antibiotics q: ", q);
			// console.log("format antibiotics doc: ", docs);
			var out=["<div class=\"searchResultsContainer antibioticsResults\">", '<div class="resultTypeHeader"><a class="navigationLink" href="/view/AntibioticList/?', q, '">Antibiotic</a>&nbsp;(', total, ")</div>"];

			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Antibiotic/?eq(antibiotic_name," + doc.antibiotic_name + ")'>" + doc.antibiotic_name + "</a></div>");
				if (doc.description){
					out.push("<div class='resultInfo'>" + doc.description[0] +  "</div>");
				}
				out.push("</div>")
			})
			out.push("</div>");

			console.log("Antibiotics Format: ", out.join(""));
			return out.join("");
		},

		_setSearchResultsAttr: function(val){
			this.searchResults=val;
			console.log("Search Results: ", val);
			var foundContent=false;
			var resultCounts = {};
			var singleResults = {};

			var content=[]
			Object.keys(val).forEach(function(type){
				var tRes = val[type];
				var total = (tRes&&tRes.result&&tRes.result.response&&tRes.result.response.docs)?tRes.result.response.numFound:0;
				var docs = (tRes&&tRes.result&&tRes.result.response&&tRes.result.response.docs)?tRes.result.response.docs:[];
				resultCounts[type]={total: total, docs: docs};

				if (total>0){ // && total<4){
					var out=[];
					foundContent=true;
					if (this["format" + type]){
						singleResults[type] = this["format" + type](docs, total);
						out.push(singleResults[type])
					}
					content.push(out.join(""));
				}


			}, this)

			var keys = Object.keys(resultCounts).sort();

			var out = ['<div style="width:700px;margin:auto;font-size:1.5em;border:1px solid #333;background:#efefef;border-radius:3px;padding:4px;"><table>']

			for (var i =0; i<keys.length;i+=3){
				out.push("<tr>");
				out.push("<td><a class=\"navigationLink\"  href=\"" + this.generateLink(keys[i], resultCounts[keys[i]].docs, resultCounts[keys[i]].total) + "\">" + this.labelsByType[keys[i]] + ": " + resultCounts[keys[i]].total + "</a></td>");
				if (keys[i+1]){
					out.push("<td><a class=\"navigationLink\" href=\"" + this.generateLink(keys[i+1], resultCounts[keys[i+1]].docs, resultCounts[keys[i+1]].total)  + "\">" + this.labelsByType[keys[i+1]] + ": " + resultCounts[keys[i+1]].total + "</a></td>");
				} else { out.push("<td></td>"); }
				if (keys[i+2]){
					out.push("<td><a class=\"navigationLink\" href=\"" + this.generateLink(keys[i+2], resultCounts[keys[i+2]].docs, resultCounts[keys[i+2]].total)  + "\">" + this.labelsByType[keys[i+2]] + ": " + resultCounts[keys[i+2]].total + "</a></td>");
				}else { out.push("<td></td>"); }
				out.push("</tr>")
			}
			out.push("</table></div>")

			console.log("Content Length: ", content.length, content);

			if (content.length>0){
				out.push("<h2>Top Matches</h2>" + content.join(""))
			}

			if (this.viewer){
				//if (foundContent){
				this.viewer.innerHTML=out.join("");
				//}else{
				//	this.viewer.set("content", "No Results Found.")
				//}
			}
		},

		"search": function(query){
			var q = {}
			var self=this;

			this.searchTypes.forEach(function(type){
				var tq=query;
				switch(type){
					case "genome_feature":
						tq=tq + "&ne(annotation,brc1)&ne(feature_type,source)"
						break;
					case "taxonomy":
						tq=tq + "&gt(genomes,1)"
						break;
				}

				if (type == "genome_feature") {
					// for genome features, sort by annotation first then by scores so as to show PATRIC features first
					q[type] = {dataType: type, accept: "application/solr+json", query: tq + "&limit(3)&sort(+annotation,-score)" }				
				} else {
					q[type] = {dataType: type, accept: "application/solr+json", query: tq + "&limit(3)&sort(-score)" }
				}
			})

			console.log("SEARCH: ", q);
			this.viewer.innerHTML="Searching...."
			Request.post(window.App.dataAPI + "query/", {
				headers: {
					accept: "application/json",
					"content-type": "application/json",
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json",
				data: JSON.stringify(q)
			}).then(function(searchResults){
				self.set("searchResults", searchResults)
			})


		},
		postCreate: function(){
			this.inherited(arguments);
			//start watching for changes of state, and signal for the first time.
			this.watch("state", lang.hitch(this, "onSetState"));
		},
		// postCreate: function(){
		// 	this.inherited(arguments);
		// 	// this.viewHeader = new ContentPane({
		// 	// 	region: "top"
		// 	// });

		// 	this.viewHeader = this.searchBox = new TextBox({region:"top",style: "margin:4px;font-size:1.4em;padding:4px;color:#ddd;border-radius:4px;"});
		// 	// domConstruct.place(this.searchBox.domNode, this.viewHeader.containerNode,"first");
		// 	// this.searchBox.startup();


		// 	this.advancedSearchOptions = new ContentPane({
		// 		region: "top",
		// 		content: "Advanced Search Options"
		// 	})


		// 	this.searchBox.on("keypress", lang.hitch(this,"onKeyPress"));


		// 	this.viewer = new ContentPane({
		// 		region: "center",
		// 		content: "Searching...."
		// 	});

		// 	this.addChild(this.viewHeader);
		// 	this.addChild(this.advancedSearchOptions);
		// 	this.addChild(this.viewer);
		// },
		onKeyPress: function(evt){
			if(evt.charOrCode == keys.ENTER){
				var query = this.searchBox.get('value');
				query = query.replace(/'/g, "").replace(/:/g, " ");
				if (!query){
					this.viewer.set("content", "");
				}

				Topic.publish("/navigate", {href: "/search/?" + searchToQuery(query)});
			}
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.onSetState("state", "", this.state);
		}
	});
});


