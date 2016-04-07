require({cache:{
'url:p3/widget/templates/AdvancedDownload.html':"<div style=\"width: 700px;\">\n\t<div>\n\t\tSelected <span data-dojo-attach-point=\"typeLabelNode\">Items</span>: <span data-dojo-attach-point=\"selectionNode\">\n\t\t</span>\n\t</div>\n\t<div style=\"margin-top:4px; padding:4px; border:1px solid #ccc;border-radius:4px;\">\n\t\t<p>Choose the data types you would like to download with the checkboxes below.  After selecting the data types, you can generate and download a ZIP file containing the desired data.</p>\n\t</div>\n\t\n\t<div data-dojo-attach-point=\"fileTypesContainer\">\n\t\t<table data-dojo-attach-point=\"fileTypesTable\">\n\t\t</table>\n\t</div>\n\t<div style=\"text-align:right;\">\n\t\t<span data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"downloadButton\" data-dojo-attach-event=\"onClick:download\" label=\"Download\"></span>\n\t</div>\n</div>"}});
define("p3/widget/AdvancedDownload", [
        "dojo/_base/declare", "dojo/on", "dojo/dom-construct",
        "dojo/_base/lang","dojo/mouse", "dijit/_WidgetBase","dijit/_WidgetsInTemplateMixin",
        "dojo/topic", "dijit/_TemplatedMixin","dojo/text!./templates/AdvancedDownload.html",
        "dijit/Dialog"

], function(declare, on, domConstruct,
		lang,Mouse,WidgetBase,WidgetsInTemplate,
		Topic,TemplatedMixin,Template,
		Dialog

){
	return declare([WidgetBase,TemplatedMixin,WidgetsInTemplate],{
		templateString: Template,
		"downloadableConfig": {
			"genome_data": {
			        "label": "Genomes",
			        tableData: true,
			        downloadTypes: [
			        	{"label": "Genomic Sequences in FASTA (*.fna)", type: "application/dna+fasta"},
						{"label": "Protein Sequences in FASTA (*.fna)", type: "application/protein+fasta"},
						{"label": "All annotations in GenBank file format (*.gbf)", type: "application/gbf"},
						{"label": "All Genomic features in tab-delimited format (*.features.tab)", type: "text/csv"},
						{"label": "Protein coding genes tab-delimited format (*.cds.tab)", type: "text/csv"},
						{"label": "RNAs in tab-delimited format (*.rna.tab)", type: "text/csv"},
						{"label": "DNA Sequences of Protein Coding Genes (*.ffn)", type: "application/ffn"},
						{"label": "DNA Sequences of RNA Coding Genes (*.frn)", type: "application/frn"},
						{"label": "Pathway assignments in tab-delimited format (*.pathway.tab)", type: "text/csv"}
			        ]
			},
			"sequence_data": {
			      "label": "Sequences",
			      tableData: true
			 },
			"feature_data": {
			      "label": "Features",
			      tableData: true
			},
			"spgene_data": {
			      "label": "Specialty Genes",
			      tableData: true
			},
			"pathway_data": {
			      "label": "Pathways",
			      tableData: true  
			},
			"default": {
			      "label": "Items",
			      tableData: true  
	    	}
	    },
	    download: function(){
	    	new Dialog({content: "Download backend not yet implemented"}).show();
	    },
		selection: null,
		_setSelectionAttr: function(val){
			console.log("AdvancedDownload _setSelectionAttr: ", val);
			this.selection = val;

		},
		containerType: "",
		startup: function(){
			if (this.selection){
				this.selectionNode.innerHTML = this.selection.length;
			}
			domConstruct.empty(this.fileTypesTable);
			if (this.containerType){

					if (this.downloadableConfig[this.containerType]){
						var conf = this.downloadableConfig[this.containerType]
						this.typeLabelNode.innerHTML = conf.label;
						console.log("Advanced Download Conf: ", conf)
						for (var x = 0; x<conf.downloadTypes.length;x+=2){
							var row = domConstruct.create("tr",{},this.fileTypesTable);
							var left = conf.downloadTypes[x];
							domConstruct.create("td", {style: "padding:4px;", innerHTML: '<input type="checkbox" name="fileType" value="' + left.type + '"></input>&nbsp;' +left.label},row);
							
							var right = conf.downloadTypes[x+1];
							if (right){
								domConstruct.create("td", {style: "padding:4px;",innerHTML:  '<input type="checkbox" name="fileType" value="' + right.type + '"></input>&nbsp;' +right.label},row);
							}
						}
					}

			}

		}
	})

});
