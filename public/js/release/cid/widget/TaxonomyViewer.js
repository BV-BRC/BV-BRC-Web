require({cache:{
'url:cid/widget/templates/TaxonOverview.html':"<div class=\"TaxonOverview\">\n\t<div class=\"leftSideColumn\">\n\t\t<div class=\"section\">\n\t\t\t<label>Search Tools</label>\n\t\t</div>\n\t\t<div class=\"section\">\n\t\t\t<label>Experiment Summary</label>\n\t\t</div>\n\t\t<div class=\"section\">\n\t\t\t<label>Recent PubMed Articles</label>\n\t\t</div>\n\t</div>\n\t<div class=\"rightColumn\">\n\t\t<div class=\"section\">\n\t\t\t<label>Taxonomy Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td class=\"propertyColumn\">Taxonomy ID</td><td>${data.taxon_id}</td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Lineage</td><td class=\"lineageColumn\">${data.lineage:lineage}</td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">External Links</td><td><a href=\"http://www.immuneepitope.org/sourceOrgId/${data.taxon_id}\" target=\"_blank\">Immune Epitope Database and Analysis Resource</a></td></tr>\n\t\t\t\t<tr><td colspan=\"2\">Summary Terms - Click on number to view genomes associated with term</td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Genome Status</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Isolation Country</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Host Name</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Disease</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Collection Date</td><td></td></tr>\n\t\t\t\t<tr><td class=\"propertyColumn\">Completion Date</td><td></td></tr>\n\t\t\t</tbody></table>\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Genome Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td></td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>Number of genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of complete genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of WGS genomes</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Number of Plasmid-Only genomes</td><td></td><td></td><td></td></tr> \n\t\t\t</tbody></table>\t\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Genomic Feature Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td></td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>CDS</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>misc_RNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>ncRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>rRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>tRNA</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td colspan=\"4\">View More Feature Types</td></tr>\n\t\t\t</tbody></table>\t\n\t\n\t\t</div>\n\n\t\t<div class=\"section\">\n\t\t\t<label>Protein Feature Summary</label>\n\t\t\t<table><tbody>\n\t\t\t\t<tr><td>Hypothetical proteins</td><td class=\"sourceColumn\">PATRIC</td><td class=\"sourceColumn\">Legacy BRC</td><td class=\"sourceColumn\">RefSeq</td></tr>\n\t\t\t\t<tr><td>Proteins with functional assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with EC number assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with GO assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with Pathway assignments</td><td></td><td></td><td></td></tr> \n\t\t\t\t<tr><td>Proteins with FIGfam assignments</td><td></td><td></td><td></td></tr> \n\t\t\t</tbody></table>\t\n\t\t</div>\n\t</div>\n</div>\n"}});
define("cid/widget/TaxonomyViewer", [
	"dojo/_base/declare","dijit/layout/TabContainer", "dojo/on",
	"dojo/dom-class","dojo/NodeList-dom",
	"./ProteinFamilyViewer","./PathwayViewer","./GenomeList",
	"./TranscriptomicsViewer","./DiseaseViewer",
	"./TaxonomyTreeViewer", "./PhylogenyViewer","./FeatureGrid",
	"./PublicationsGrid","dijit/layout/ContentPane","dojo/query",
	"dojo/text!./templates/TaxonOverview.html","dojo/string","./formatter",
	"dojo/dom-attr","dojo/topic"
], function(
	declare, TabContainer, on,
	domClass,nodeListDom,
	ProteinFamilyViewer,PathwayViewer,GenomeList,
	TranscriptomicsViewer,DiseaseViewer,
	TaxonomyTreeViewer,PhylogenyViewer,FeatureGrid,
	PublicationsGrid,ContentPane,Query,
	OverviewTemplate,dojoString,formatter,
	domAttr,Topic
){

	console.log("Formatters at TaxonomyViewer Create: ", formatter);
	return declare([TabContainer], {
		"class": "TaxonomyViewer TaxonTabContainer",
		"disabled":false,
		"startupTabs": null,
		"tabDefs": {
			"overview": {title: "Overview",ctor: ContentPane,prerenderedContentClass: "OverviewContent",template: OverviewTemplate},
			"taxonomyTree": {title: "Taxonomy",ctor: TaxonomyTreeViewer},
			"phylogeny": {title: "Phylogeny",ctor: PhylogenyViewer},
			"genomeList": {title: "Genome List",ctor: GenomeList},
			"featureTable": {title: "Feature Table",ctor: FeatureGrid},
			"proteinFamilies": {title: "Protein Families",ctor: ProteinFamilyViewer},
			"pathwayViewer": {title: "Pathways",ctor: PathwayViewer},
			"transcriptomics": {title: "Transcriptomics",ctor: TranscriptomicsViewer},
			"diseases": {title: "Diseases",ctor:DiseaseViewer},
			"publications": {title: "Publications",ctor: PublicationsGrid}
		},
		formatter: formatter,
		"data": null,
		"mainContentClass": "MainContent",
		constructor: function(){
			this._tab={};
		},
		_setDataAttr: function(data){
			console.log("Data: ", data);
			this.data = data;
			this.refresh();
		},


		refresh: function(){
			console.log("Refreshing...");
			Object.keys(this.tabDefs).forEach(function(key){
				var def = this.tabDefs[key];
				if (this._tab[key]) {
					if (def.template) {
						var c = dojoString.substitute(def.template, this,null, this.formatter);
						this._tab[key].set("content", c);
					}else{
						this._tab[key].set("data",this.data);
					}	
				}
			},this);	
		},

		buildRendering: function(){
			this.inherited(arguments);
			var x = Query(".OverviewContent", this.domNode).orphan();
			if (x.length>0) {
				this["_OverviewContent"] = x;
			}
		},

		postCreate: function(){
			this.inherited(arguments);
			if (this.startupTabs){
				var tabs = Object.keys(this.tabDefs).filter(function(t){ return this.startupTabs.indexOf(t) },this).map(function(t){
					this.tabDefs[t].id = t;
					return this.tabDefs[t];
				},this);
			}else{
				var tabs = Object.keys(this.tabDefs).map(function(t){
					this.tabDefs[t].id=t;
					return this.tabDefs[t];
				},this);
			}
			tabs.forEach(function(tab){
				if (typeof tab.ctor == "string") {
					console.warn("Need to Load Tab Class or Add into requires: ", tab.ctor);
					return;
				}
				var t = this._tab[tab.id] =  new tab.ctor({"class": this.mainContentClass, title: tab.title});
				if (tab.prerenderedContentClass && this["_"+tab.prerenderedContentClass]) {
					this["_"+tab.prerenderedContentClass].place(t.containerNode);	
				}else if (tab.template && this.data){
					var c = dojoString.substitute(tab.template, this,null,this.formatter);
					t.set("content", c);
				}
				this.addChild(t);	
			},this);	

			var _self=this;
			this.on("a:click", function(evt){
				var dest = domAttr.get(evt.target,'href');
				var rel = domAttr.get(evt.target, "rel");
				evt.stopPropagation();
				evt.preventDefault();
				console.log("call nav", rel, dest);
				Topic.publish("/navigate", {widgetClass: rel, href: dest});
			});
		},

		selectChild: function(child){
			this.inherited(arguments);
			console.log("SelectedChild: ",child);
			if (child && child.getFilterPanel) {
				var panel = child.getFilterPanel();
				console.log("Got Panel: ", panel);
				if (panel) {
					Topic.publish("/overlay/left",{action: "set", panel: panel});
					return;
				}

			}
			Topic.publish("/overlay/left", {action: "hide"});
		}
	});
});
