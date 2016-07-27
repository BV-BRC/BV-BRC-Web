define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/dom-construct",
	"dojo/dom-class", "./viewer/Base", "./Button", "dijit/registry", "dojo/_base/lang",
	"dojo/dom", "dojo/topic", "dijit/form/TextBox", "dojo/keys", "dijit/_FocusMixin", "dijit/focus",
	"dijit/layout/ContentPane","dojo/request","../util/QueryToSearchInput","./GlobalSearch"
], function(declare, WidgetBase, on, domConstruct,
			domClass,base, Button, Registry, lang,
			dom, Topic, TextBox, keys, FocusMixin, focusUtil,
			ContentPane,Request,queryToSearchInput,GlobalSearch
){
	return declare([base], {
		"baseClass": "AdvancedSearch",
		"disabled": false,
		searchTypes: ["genome","genome_feature", "taxonomy","sp_gene","transcriptomics_experiment"],
		labelsByType: {
			"genome": "Genomes",
			"genome_feature": "Genomic Features",
			"taxonomy": "Taxonomy",
			"sp_gene": "Specialty Genes",
			"transcriptomics_experiment": "Transcriptomics Experiments"
		},

		_generateLink: {
			"genome": function(docs,total){
				console.log("Genome Link Generator: ", docs, total)
				if (total==1){
					return ['/view/Genome/',docs[0].genome_id,"#view_tab=overview"].join("");
				}else{
					return ['/view/GenomeList/?',this.state.search,"#view_tab=genomes"].join("");
				}
			},
			"genome_feature": function(docs,total){
				if (total==1){
					return ['/view/Feature/',docs[0].feature_id,"#view_tab=overview"].join("");
				}else{
					return ['/view/FeatureList/?',this.state.search,"#view_tab=features&filter=false"].join("");
				}
			},
			"taxonomy": function(docs,total){
				if (total==1){
					return ['/view/Taxonomy/',docs[0].taxon_id,"#view_tab=overview"].join("");
				}else{
					return ['/view/TaxonList/?',this.state.search,"#view_tab=taxons"].join("");
				}
			},

			"sp_gene": function(docs,total){
				if (total==1){
					return ['/view/Feature/',docs[0].feature_id,"#view_tab=overview"].join("");
				}else{
					return ['/view/SpecialtyGeneList/?',this.state.search,"#view_tab=specialtyGenes"].join("");
				}
			},
			"transcriptomics_experiment": function(docs,total){
				if (total==1){
					return ['/view/TranscriptomicsExperiment/',docs[0].eid,"#view_tab=overview"].join("");
				}else{
					return ['/view/TranscriptomicsExperimentList/?',this.state.search,"#view_tab=experiments"].join("");
				}
			}
		},

		generateLink: function(type,docs,total){
			console.log("Generate Link: ", type, docs, total)
			return this._generateLink[type].apply(this,[docs,total]);
		},

		onSetState: function(attr,oldval,state){
			console.log("onSetState: ", state.search);

			if (state.search){
				if (this.viewHeader){
					this.searchBox.set("value", queryToSearchInput(state.search));
				}

				this.search(state.search);

			}else{
				this.searchBox.set("value", "");
				this.viewer.set("content","");

			}
		},
		searchResults: null,
		parseQuery: GlobalSearch.prototype.parseQuery,



		formatgenome: function(docs,total){
			var out=["<div class=\"searchResultsContainer genomeResults\">",'<div class="resultTypeHeader"><a href="/view/GenomeList/?',this.state.search,"#view_tab=genomes",'">Genomes&nbsp;(', total, ")</div></a>"];

			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a href='/view/Genome/" + doc.genome_id + "'>" + doc.genome_name + "</a></div>");

				out.push("<div class='resultInfo'>");
				if (doc.plasmids && doc.plasmids > 0){
					out.push("<span>" + doc.plasmids + " Plasmids</span>");
				}
	
				if (doc.contigs && doc.contigs > 0){
					if (doc.plasmids) { out.push(" | "); }
					out.push("<span>" + doc.contigs + " Contigs</span>");
				}

				out.push("</div>");	

				out.push("<div class='resultInfo'>");
				if (doc.date_inserted){
					out.push("<span> SEQUENCED: " + doc.date_inserted + "</span>")
				}

				if (doc.sequencing_centers){

					out.push("&nbsp;( " + doc.sequencing_centers + " )");
				}
				out.push("</div>")

				out.push("<div class='resultInfo'>");
				if (doc.collection_date){
					out.push("<span>COLLECTED: " + doc.collection_date + "</span>");
				}
				if (doc.host_name){
					out.push("&nbsp;<span>HOST:  " + doc.host_name + "</span>");
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

		formatgenome_feature: function(docs,total){
			var out=["<div class=\"searchResultsContainer featureResults\">",'<div class="resultTypeHeader"><a href="/view/FeatureList/?',this.state.search,"#view_tab=features&filter=false",'">Genome Features&nbsp;(', total, ")</div> </a>"];
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a href='/view/Feature/" + doc.feature_id + "'>" + doc.product + "</a>");
				if (doc.gene) {  out.push(" | " + doc.gene ); }
				out.push("</div>");

				out.push("<div class='resultInfo'>" + doc.genome_name +  "</div>");

				out.push("<div class='resultInfo'>" + doc.annotation + " | " + doc.feature_type);

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


		formatsp_gene: function(docs,total){
			var out=["<div class=\"searchResultsContainer featureResults\">",'<div class="resultTypeHeader"><a href="/view/FeatureList/?',this.state.search,"#view_tab=features&filter=false",'">Specialty Genes&nbsp;(', total, ")</div> </a>"];
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a href='/view/Feature/" + doc.feature_id + "'>" + doc.product + "</a>");
				if (doc.gene) {  out.push(" | " + doc.gene ); }
				out.push("</div>");

				out.push("<div class='resultInfo'>" + doc.genome_name +  "</div>");

				out.push("<div class='resultInfo'>" + doc.annotation + " | " + doc.feature_type);

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

		formattranscriptomics_experiment: function(docs,total){
			var out=["<div class=\"searchResultsContainer featureResults\">",'<div class="resultTypeHeader"><a href="/view/TranscriptomicsExperimentList/?',this.state.search,"#view_tab=features&filter=false",'">Transcriptomics Experiments&nbsp;(', total, ")</div> </a>"];
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a href='/view/Experiment/" + doc.eid + "'>" + doc.title + "</a>");
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

		formattaxonomy: function(docs,total){
			var q = this.state.search; 
			console.log("format taxonomy q: ", q);
			var out=["<div class=\"searchResultsContainer taxonomyResults\">",'<div class="resultTypeHeader"><a href="/view/TaxonList/?',q,'">Taxonomy</a>&nbsp;(', total, ")</div>"];
			
			docs.forEach(function(doc){
				out.push("<div class='searchResult'>");
				out.push("<div class='resultHead'><a href='/view/Taxonomy/" + doc.taxon_id + "'>" + doc.taxon_name + "</a></div>");
				out.push("<div class='resultInfo'>" + doc.genomes +  " Genomes</div>");
				out.push("</div>")
			})
			out.push("</div>");

			console.log("Taxonomy Format: ", out.join(""));
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
				var total = (tRes&&tRes.result&&tRes.result.response)?tRes.result.response.numFound:0
				var docs = tRes.result.response.docs;
				resultCounts[type]={total: total, docs: docs};

				if (total>0 && total<4){
					var out=[];
					foundContent=true;
					if (this["format" + type]){
						singleResults[type] = this["format" + type](docs,total);
						out.push(singleResults[type])
					}
					content.push(out.join(""));
				}


			},this)

			var keys = Object.keys(resultCounts).sort();

			var out = ['<div style="width:700px;margin:auto;font-size:1.5em;border:1px solid #333;background:#efefef;border-radius:3px;padding:4px;"><table>']

				for (var i =0; i<keys.length;i+=3){
				out.push("<tr>");
				out.push("<td><a href=\"" + this.generateLink(keys[i],resultCounts[keys[i]].docs,resultCounts[keys[i]].total) + "\">" + this.labelsByType[keys[i]] + ": " + resultCounts[keys[i]].total + "</a></td>");
				if (keys[i+1]){
					out.push("<td><a href=\"" + this.generateLink(keys[i+1],resultCounts[keys[i+1]].docs,resultCounts[keys[i+1]].total)  + "\">" + this.labelsByType[keys[i+1]] + ": " + resultCounts[keys[i+1]].total + "</a></td>");
				} else { out.push("<td></td>"); }
				if (keys[i+2]){
					out.push("<td><a href=\"" + this.generateLink(keys[i+2],resultCounts[keys[i+2]].docs,resultCounts[keys[i+2]].total)  + "\">" + this.labelsByType[keys[i+2]] + ": " + resultCounts[keys[i+2]].total + "</a></td>");
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
					this.viewer.set('content', out.join(""));
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

				q[type] = {dataType: type, accept: "application/solr+json", query: tq + "&limit(3)" }
			})

			console.log("SEARCH: ", q);
			this.viewer.set("content", "Searching...");
			Request.post(window.App.dataAPI + "query/", {
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				handleAs: "json",
				data: JSON.stringify(q)
			}).then(function(searchResults){
				self.set("searchResults", searchResults)
			})


		},
		postCreate: function(){
			this.inherited(arguments);
			// this.viewHeader = new ContentPane({
			// 	region: "top"
			// });

			this.viewHeader = this.searchBox = new TextBox({region:"top",style: "margin:4px;font-size:1.4em;padding:4px;color:#ddd;border-radius:4px;"});
			// domConstruct.place(this.searchBox.domNode, this.viewHeader.containerNode,"first");
			// this.searchBox.startup();

			this.searchBox.on("keypress", lang.hitch(this,"onKeyPress"));

		
			this.viewer = new ContentPane({
				region: "center",
				content: "Searching...."
			});

			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
		},
		onKeyPress: function(evt){
			if(evt.charOrCode == keys.ENTER){
				var query = this.searchBox.get('value');

				if (!query){
					this.viewer.set("content","");
				}

				Topic.publish("/navigate", {href: "/search/?" + this.parseQuery(query)});
			}
		}
	});
});


