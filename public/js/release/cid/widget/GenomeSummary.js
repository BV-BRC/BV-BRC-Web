require({cache:{
'url:cid/widget/templates/GenomeSummary.html':"<div class=\"TaxonOverview\">\n\t<div class=\"leftSideColumn\">\n\t\t<div class=\"section\">\n\t\t\t<label>Search Tools</label>\n\t\t</div>\n\t\t<div class=\"section\">\n\t\t\t<label>Experiment Summary</label>\n\t\t</div>\n\t\t<div class=\"section\">\n\t\t\t<label>Recent PubMed Articles</label>\n\t\t</div>\n\t</div>\n\t<div class=\"rightColumn\">\n\t\t<div class=\"section\">\n\t\t\t<label>Taxonomy Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td class=\"propertyColumn\">Taxonomy ID</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Lineage</td><td class=\"lineageColumn\"></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">External Links</td><td><a href=\"http://www.immuneepitope.org/sourceOrgId/\" target=\"_blank\">Immune Epitope Database and Analysis Resource</a></td></tr>\n\t\t\t\t<tr><td colspan=\"2\">Summary Terms - Click on number to view genomes associated with term</td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Genome Status</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Isolation Country</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Host Name</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Disease</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Collection Date</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Completion Date</td><td></td></tr>\n\t\t\t</tbody></table>\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Genome Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td></td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>Number of genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of complete genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of WGS genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of Plasmid-Only genomes</td><td></td><td></td><td></td></tr> \n\t\t\t</tbody></table>\t\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Genomic Feature Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td></td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>CDS</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>misc_RNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>ncRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>rRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>tRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td colspan=\"4\">View More Feature Types</td></tr>\n\t\t\t</tbody></table>\t\n\t\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Protein Feature Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td>Hypothetical proteins</td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>Proteins with functional assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with EC number assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with GO assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with Pathway assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with FIGfam assignments</td><td></td><td></td><td></td></tr> \n\t\t\t</tbody></table>\t\n\t\t</div>\n\t</div>\n</div>\n"}});
define("cid/widget/GenomeSummary", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","./PatricTool","dojo/text!./templates/GenomeSummary.html",
	"dojo/string","./formatter"
], function(
	declare, WidgetBase, on,
	domClass,PatricTool,OverviewTemplate,
	dojoString,Formatter
){
	return declare([WidgetBase,PatricTool], {
		"baseClass": "GenomeSummary",
		dataModel: "genomesummary",
		"postCreate": function(){
			this.inherited(arguments);
			console.log("Genome Summary POST CREATE");
		},
		query: "&limit(-1)&facet((field,collection_date_f),(limit,3),(field,completion_date),(field,disease_f),(field,host_name_f),(field,genome_status_f),(field,isolation_country_f),(field,isolation_source))&facet((limit,1000),(pivot,(refseq_cds,genome_status)),(pivot,(brc_cds,genome_status)),(pivot,(rast_cds,genome_status)))",
		_toolData:null,
		overviewTemplate: OverviewTemplate,
		startup: function(){
                        if (this._started){return; }
                        this._started=true;
                        var _self=this;
                        this.getData({handleAs:"json"}).then(function(data){
                                if (_self.refresh) { _self.refresh(data) };
                        });
		},
		refresh: function(data) {
			console.log("Overview Template: ", this.overviewTemplate, Formatter);
			this.domNode.innerHTML = dojoString.substitute(this.overviewTemplate,this,null,Formatter);

/*
			data = data || this.data;
			var out = "Genome Summary<br>Filters:" + (this.activeFilter || "None") + "<br><br>";

			if(data) {out += "<pre>"+JSON.stringify(data,null,4) + "</pre>";}

			this.domNode.innerHTML=out;
*/
		}
	});
});
