require({cache:{
'url:p3/widget/templates/GlobalSearch.html':"<div class=\"GlobalSearch\">\n\t<table style=\"width:100%;\">\n\t\t<tbody>\n\t\t\t<tr>\t\n\t\t\t\t<td style=\"width:120px\">\n\t\t\t\t\t<span data-dojo-attach-point=\"searchFilter\" data-dojo-type=\"dijit/form/Select\" style=\"display:inline-block;width:100%\">\n\t\t\t\t\t\t<option selected=\"true\" value=\"everything\">Everything</option>\n\t\t\t\t\t\t<option value=\"genomes\">Genomes</option>\n\t\t\t\t\t\t<option value=\"genome_features\">Genomic Features</option>\n\t\t\t\t\t\t<option value=\"sp_genes\">Specialty Genes</option>\n\t\t\t\t\t\t<option value=\"taxonomy\">Taxa</option>\n\t\t\t\t\t\t<option value=\"transcriptomics_experiments\">Transcriptomics Experiments</option>\n\t\t\t\t\t\t<!--<option value=\"amr\">Antibiotic Resistance</option>\n\t\t\t\t\t\t<option value=\"sp_genes\">Specialty Genes</option>\n\t\t\t\t\t\t<option value=\"pathways\">Pathways</option>\n\t\t\t\t\t\t<option value=\"workspaces\">Workspaces</option>-->\n\t\t\t\t\t</span>\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input data-dojo-type=\"dijit/form/TextBox\" data-dojo-attach-event=\"onChange:onInputChange,keypress:onKeypress\" data-dojo-attach-point=\"searchInput\" style=\"width:100%;\"/>\n\t\t\t\t</td>\n\t\t\t\t<td style=\"width:1em;padding:2px;font-size:1em;\"><i class=\"fa fa-1x icon-search-plus\" data-dojo-attach-event=\"click:onClickAdvanced\" title=\"Advanced Search\"/></td>\n\t\t\t</tr>\n\t\t</tbody>\n\t</table>\n</div>\n"}});
define("p3/widget/GlobalSearch", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/dom-construct",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/GlobalSearch.html", "./Button", "dijit/registry", "dojo/_base/lang",
	"dojo/dom", "dojo/topic", "dijit/form/TextBox", "dojo/keys", "dijit/_FocusMixin", "dijit/focus"
], function(declare, WidgetBase, on, domConstruct,
			domClass, Templated, WidgetsInTemplate,
			template, Button, Registry, lang,
			dom, Topic, TextBox, keys, FocusMixin, focusUtil){
	return declare([WidgetBase, Templated, WidgetsInTemplate, FocusMixin], {
		templateString: template,
		constructor: function(){
		},
		"baseClass": "GlobalSearch",
		"disabled": false,
		"value": "",
		_setValueAttr: function(q){
			this.query = q;
			this.searchInput.set("value", q);
		},

		parseQuery: function(query){
			var finalTerms=[]
			var currentTerm="";
			var propertyMatch;
			var quoted;
			if (query){
				for (var i=0;i<query.length;i++){
					var t = query[i];

					switch(t){
						case ":":
							propertyMatch = currentTerm;
							currentTerm="";
							console.log("propertyMatch: ", propertyMatch)
							break;
						case '"':
							if (quoted){
								if (propertyMatch){
									finalTerms.push({property: propertyMatch, term: currentTerm + t});
									propertyMatch=false;
								}else{
									finalTerms.push(currentTerm + t);
								}
								quoted=false;
								currentTerm = ""
							}else{
								currentTerm = currentTerm + t;
								quoted=true;
							}
							break;
						case " ":
							if (quoted){
								currentTerm = currentTerm + t;
							}else{
								if (propertyMatch){
									finalTerms.push({property: propertyMatch, term: currentTerm});
									propertyMatch=false;
								}else{
									if (currentTerm.match(/[^a-zA-Z\d]/)){
										currentTerm = '"' + currentTerm + '"'
									}

									finalTerms.push(currentTerm);
								}
								currentTerm="";
							}
							break;
						default: 
							currentTerm = currentTerm + t;

					}
				}

				if (currentTerm){
					if (propertyMatch){
						finalTerms.push({property: propertyMatch, term: currentTerm});
					}else{
						if (currentTerm.match(/[^a-zA-Z\d]/)){
							currentTerm = '"' + currentTerm + '"'
						}
						finalTerms.push(currentTerm);
					}

				}

				var finalt=[]

				finalTerms.forEach(function(term){
					if (!term) { return; }

					if (typeof term == 'string'){
						finalt.push("keyword(" + encodeURIComponent(term) + ")");
					}else{
						finalt.push("eq(" + encodeURIComponent(term.property) + "," + encodeURIComponent(term.term) + ")");
					}
				})

				if (finalt.length>1){
					return "and(" + finalt.join(",") + ")";
				}else{
					return finalt[0];
				}
			} 

			throw Error("No Query Supplied to Query Parser");
		},

		onKeypress: function(evt){
			if(evt.charOrCode == keys.ENTER){
				var query = this.searchInput.get('value');
				var searchFilter = this.searchFilter.get('value');
				if(!query){
					return;
				}

				console.log("Search Filter: ", searchFilter);
				var q = this.parseQuery(query);
				
				var clear = false;
				switch(searchFilter){
					case "amr":
						Topic.publish("/navigate", {href: "/view/GenomeList/?and(or(eq(antimicrobial_resistance,%22Intermediate%22),eq(antimicrobial_resistance,%22Resistant%22),eq(antimicrobial_resistance,%22Susceptible%22))," + q + ")"});
						clear = true;
						break;
					case "everything":
						Topic.publish("/navigate", {href: "/search/?" + q});
						clear = true;
						break;
					case "pathways":
						Topic.publish("/navigate", {href: "/view/PathwayList/?" + q});
						clear = true;
						break;
					case "sp_genes":
						Topic.publish("/navigate", {href: "/view/SpecialtyGeneList/?" + q});
						clear = true;
						break;
					case "genome_features":
						Topic.publish("/navigate", {href: "/view/FeatureList/?" + q});
						clear = true;
						break;
					case "genomes":
						Topic.publish("/navigate", {href: "/view/GenomeList/?" + q});
						clear = true;
						break;
					case "transcriptomics_experiments":
						Topic.publish("/navigate", {href: "/view/TranscriptomicsExperimentList/?" + q});
						clear = true;
						break;
					case "taxonomy":
						Topic.publish("/navigate", {href: "/view/TaxonList/?" + q});
						clear = true;
						break;
					default:
						console.log("Do Search: ", searchFilter, query);
				}

				if(clear){
					this.searchInput.set("value", '');
				}

				on.emit(this.domNode, "dialogAction", {action: "close",bubbles: true});
				console.log("Do Search: ", searchFilter, query);
			}
		},
		onClickAdvanced: function(evt){
			Topic.publish("/navigate", {href: "/search/"});
		},
		onInputChange: function(val){
			/*
			val = val.replace(/\ /g, "&");
			var dest = window.location.pathname + "?" + val;
			console.log("New Search Value",val,dest );
			Topic.publish("/navigate", {href: dest, set: "query", value: "?"+val});
			*/
		}
	});
});


