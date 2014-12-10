require({cache:{
'url:cid/widget/templates/Toolbar.html':"<div class=\"Toolbar\">\n\t<div class=\"layer\" data-dojo-attach-point=\"containerNode\">\n\t</div>\n</div>\n"}});
define("cid/widget/Toolbar", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/dom-construct",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/Toolbar.html","./Button","dijit/registry","dojo/_base/lang",
	"dojo/dom","dojo/topic"
], function(
	declare, WidgetBase, on,domConstruct,
	domClass,Templated,WidgetsInTemplate,
	template,Button,Registry,lang,
	dom,Topic
){
	return declare([WidgetBase,Templated,WidgetsInTemplate], {
		templateString: template,
		constructor: function(){
			this._toolButtons={};
		},
		tools: [
			{id:"GenomeSummary", name: "Genome Summary",widgetClass:"cid/widget/GenomeSummary"},
			{id:"Phylogeny", name: "Phylogeny",widgetClass:"cid/widget/PhylogenyViewer"},
			{id:"GenomeList", name: "Genome List",widgetClass:"cid/widget/GenomeList"},
			{id:"Features", name: "Features",widgetClass:"cid/widget/FeatureGrid"},
			{id:"ProteinFamilies", name: "ProteinFamilies",widgetClass:"cid/widget/ProteinFamilyViewer"},
			{id:"PathwayViewer", name: "Pathways",widgetClass:"cid/widget/PathwayViewer"},
			{id:"TranscriptomicsViewer", name: "Transcriptomics",widgetClass:"cid/widget/TranscriptomicsViewer"},
			{id:"DiseaseViewer", name: "Diseases",widgetClass:"cid/widget/DiseaseViewer"},
			{id:"PublicationsGrid", name: "Literature",widgetClass:"cid/widget/PublicationsGrid"},
		],
/*
		tools: [
			{id:"Organisms", name: "Organisms",widgetClass:"cid/widget/GenomeSummary"},
			{id:"Genomes", name: "Genomes",widgetClass:"cid/widget/GenomeGrid"},
			{id:"Sequences", name: "Sequences",widgetClass:"cid/widget/SequenceGrid"},
			{id:"Features", name: "DNA Features",widgetClass:"cid/widget/FeatureGrid"},
			{id:"ProteinFamilies", name: "Protein Families",widgetClass:"cid/widget/ProteinFamilyViewer"},
			{id:"PathwayViewer", name: "Pathways",widgetClass:"cid/widget/PathwayViewer"},
			{id:"TranscriptomicsViewer", name: "Transcriptomics",widgetClass:"cid/widget/TranscriptomicsViewer"},
			{id:"DiseaseViewer", name: "Diseases",widgetClass:"cid/widget/DiseaseViewer"},
			{id:"PublicationsGrid", name: "Literature",widgetClass:"cid/widget/PublicationsGrid"},
		],*/
		"baseClass": "Toolbar",
		"disabled":false,
		postCreate: function(){
			dom.setSelectable(this.domNode,false);
			this.tools.forEach(function(tool) {
				console.log("Create Button: ", this.selected, tool.id, (this.selected&&this.selected==tool.id));
				this._toolButtons[tool.id] = new Button({toolDef:tool, text:tool.name,toggled:(this.selected&&this.selected==tool.id)});
				domConstruct.place(this._toolButtons[tool.id].domNode,this.containerNode,"last");
			},this);

			this.on(".MultiButton:click", lang.hitch(this,function(evt){
				evt.preventDefault();
				evt.stopPropagation();
				var w = Registry.getEnclosingWidget(evt.target);
				console.log("w: ", w);
				if (w && w.toolDef) {
					console.log("Click Tool Button: ",w.toolDef);
					Topic.publish("/navigate", {id: "/tool/" + w.toolDef.id, widgetClass: w.toolDef.widgetClass, filter: (window.history && window.history.state)?window.history.state.filter:""});
				}else{
					console.log("no toolDef defined or widget found");
				}
			}));
		},
		selected: null,
		_setSelectedAttr: function(val){
			console.log("setSelected: ", val);
			if (!val) { return; }
			if (typeof val == 'object') {
				val = val.id;
			}
			var parts = val.split("/");
			val = parts[parts.length-1];
			console.log("val: ", val);
			
			if (this.selected && this.selected==val) { return; }
			var newSelect;
			if (!this._started) {
				this.selected=val;
				return;
			}
			if (this.tools.some(function(tool) {
				if (tool.id==val){
					this._toolButtons[tool.id].set("toggled",true);			
					newSelect=tool.id;
					return true;
				}
				return false;
			},this)) {
				if (this.selected) {
					this._toolButtons[this.selected].set("toggled", false);
				}

				this.selected=newSelect;
			}else{
				console.log("Invalid Tool Selection", val);
			};
		}
	});
});


