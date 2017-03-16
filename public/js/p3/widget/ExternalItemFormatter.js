define([
	"dojo/date/locale", "dojo/dom-construct", "dojo/dom-class",
	"dijit/form/Button", "../JobManager", "dijit/TitlePane", "dojo/request", "dojo/_base/lang"
], function(locale, domConstruct, domClass,
			Button, JobManager, TitlePane, xhr, lang){

	var formatters = {
		"default": function(item, options){
			options = options || {};

			var table = domConstruct.create("table");
			var tbody = domConstruct.create("tbody", {}, table);

			Object.keys(item).sort().forEach(function(key){
				var tr = domConstruct.create("tr", {}, tbody);
				var tda = domConstruct.create("td", {innerHTML: key}, tr);
				var tdb = domConstruct.create("td", {innerHTML: item[key]}, tr);
			}, this);

			return table;
		},

		"pubmed_data": function(item, options){
			options = options || {};

			var term;
			if(item.hasOwnProperty('feature_id')){ // feature
				var organism = item.genome_name.split(" ").slice(0, -1).join(" ");
				var opts = [];
				item.hasOwnProperty('product') ? opts.push(item.product) : {};
				item.hasOwnProperty('patric_id') ? opts.push(item.patric_id) : {};
				item.hasOwnProperty('gene') ? opts.push(item.gene) : {};
				item.hasOwnProperty('refseq_locus_tag') ? opts.push(item.refseq_locus_tag) : {};
				item.hasOwnProperty('protein_id') ? opts.push(item.protein_id) : {};

				term = "(\"" + organism + "\") AND (" + opts.map(function(d){
						return "\"" + d + "\"";
					}).join(" OR ") + ")";
			}
			else if(item.hasOwnProperty('genome_name')){
				term = item.genome_name;
			}
			else if(item.hasOwnProperty('taxon_name')){
				term = item.taxon_name;
			}else{
				// item is keyword string
				term = item;
			}

			var eutilSearchURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?usehistory=y&db=pubmed&term=" + term + "&retmode=json";

			var div = domConstruct.create("div", {"class": "pubmed"});
			var topLevelUl = domConstruct.create("ul", {}, div);

			xhr.get(eutilSearchURL, {
				headers: {
					accept: "application/json",
					'X-Requested-With': null
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(pubmedList){

				if(pubmedList.esearchresult.count > 0){
					var pmids = pubmedList.esearchresult.idlist;
					var retmax = 5;
					var eutilSummaryURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=" + pmids + "&retmax=" + retmax + "&retmode=json";

					xhr.get(eutilSummaryURL, {
						headers: {
							accept: "application/json",
							'X-Requested-With': null
						},
						handleAs: "json"
					}).then(lang.hitch(this, function(pubmedSummary){

						for(var i = 0; i < pubmedSummary.result.uids.length; i++){
							var value = pubmedSummary.result.uids[i];

							var listItem = domConstruct.create("li", {}, topLevelUl);

							domConstruct.create("div", {innerHTML: pubmedSummary.result[value].pubdate}, listItem);
							domConstruct.create("a", {
								href: 'https://www.ncbi.nlm.nih.gov/pubmed/' + value,
								target: '_blank',
								innerHTML: pubmedSummary.result[value].title
							}, listItem);

							var author;
							if(pubmedSummary.result[value].authors.length == 1){
								author = pubmedSummary.result[value].authors[0].name;
							}
							else if(pubmedSummary.result[value].authors.length == 2){
								author = pubmedSummary.result[value].authors[0].name + " and " + pubmedSummary.result[value].authors[1].name;
							}
							else{
								author = pubmedSummary.result[value].authors[0].name + ' et al.'
							}
							domConstruct.create("div", {innerHTML: author}, listItem);
							domConstruct.create("div", {innerHTML: pubmedSummary.result[value].source}, listItem);
						}
					}));

					// add show more link
					domConstruct.create("a", {href: "https://www.ncbi.nlm.nih.gov/pubmed/?term=" + term, target:"_blank", innerHTML: "show more >>"}, div);
				}
				else{
					domConstruct.create("li", {innerHTML: "No recent articles found."}, topLevelUl);
				}
			}));
			return div;
		}
	};

	return function(item, type, options){
		type = type || "default";

		return formatters[type](item, options)
	}
});
