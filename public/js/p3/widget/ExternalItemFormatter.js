define([
	"dojo/date/locale","dojo/dom-construct","dojo/dom-class",
	"dijit/form/Button","../JobManager","dijit/TitlePane","dojo/request", "dojo/_base/lang"
], function(
	locale,domConstruct,domClass,
	Button,JobManager,TitlePane,xhr, lang
){

	var formatters = {
		"default": function(item, options, shownode){
			console.log("item: ", item);
			options = options || {};

			var table = domConstruct.create("table");
			var tbody = domConstruct.create("tbody",{},table);
			
			Object.keys(item).sort().forEach(function(key){
				var tr = domConstruct.create("tr",{},tbody)
				var tda = domConstruct.create("td",{innerHTML: key}, tr);
				var tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
			},this);		

			return table;
		},

		"pubmed_data": function(item, options, shownode){
			options = options || {};
			var taxonName = item.taxon_name;
			var eutilSeaarchURL = window.location.protocol + "//" + "eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=" + taxonName + "&retmode=json";
			console.log("taxon_name = " + taxonName);
			var div = domConstruct.create("div");			
			console.log("Create Display Pubmed");
			var table = domConstruct.create("table", {} , div);
			var tbody = domConstruct.create("tbody",{}, table);

			xhr.get(eutilSeaarchURL,{
				headers: {
					accept: "application/json",
					'X-Requested-With': null
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(pubmedList){
				console.log("pubmedList=", pubmedList);
				if (pubmedList.esearchresult.count>0)
				{
					var pmids= pubmedList.esearchresult.idlist;
					var retmax=5;
					var eutilSummaryURL =  window.location.protocol + "//" + "eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=" + pmids + "&retmax=" + retmax+"&retmode=json";
					if (options.hideExtra == false)
					{
						eutilSummaryURL =  window.location.protocol + "//" + "eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=" + pmids + "&retmode=json";				
					}
					xhr.get(eutilSummaryURL, {
						headers: {
							accept: "application/json",
							'X-Requested-With': null
						},
						handleAs: "json"
					}).then(lang.hitch(this, function(pubmedSummary){
						console.log("pubmedSummary=", pubmedSummary);
						for(var i=0; i< pubmedSummary.result.uids.length; i++)
						{
							var value = pubmedSummary.result.uids[i];
							// console.log("pubmedSummary value=", value);
							var tr = domConstruct.create("tr", {},tbody);
							var td = domConstruct.create("td",{innerHTML: pubmedSummary.result[value].pubdate}, tr);
							tr = domConstruct.create("tr",{},tbody);
							td = domConstruct.create("td",{innerHTML: "<a href='http://www.ncbi.nlm.nih.gov/pubmed/" + value + "' target ='_blank'>" + pubmedSummary.result[value].title + "</a>"}, tr);
							tr = domConstruct.create("tr",{},tbody);
							var author = pubmedSummary.result[value].lastauthor + " et al.";
					
							if (pubmedSummary.result[value].authors.length==1)
							{
								author = pubmedSummary.result[value].lastauthor;
							}
							else if (pubmedSummary.result[value].authors.length==2)
							{
								author = pubmedSummary.result[value].authors[0].name + " and " + pubmedSummary.result[value].authors[1].name;						
							}

							td = domConstruct.create("td",{innerHTML: author}, tr);
							tr = domConstruct.create("tr",{},tbody);
							td = domConstruct.create("td",{innerHTML: pubmedSummary.result[value].source}, tr);
							tr = domConstruct.create("tr",{},tbody);
							td = domConstruct.create("td", {innerHTML: "<hr>"}, tr);						

						}
					}));
				}
				else
				{				
					var tr = domConstruct.create("tr", {},tbody);
					var td = domConstruct.create("td",{innerHTML: "No recent articles found."}, tr);
					shownode.style.display='none';
				}
			}));		
			return div;
		}
	}

	
	return function(item, type, options, shownode) {
		console.log("Format Data: ", type, item);
		var out;
		if (type && formatters[type]) {
			out = formatters[type](item,options,shownode)
		}else{
			out = formatters["default"](item,options,shownode);
		}

		console.log("output: ", out);
		return out;
	}
});
