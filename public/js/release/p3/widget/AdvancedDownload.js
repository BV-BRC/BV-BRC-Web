require({cache:{
'url:p3/widget/templates/AdvancedDownload.html':"<div style=\"width: 700px;\">\n\t<div>\n\t\tSelected <span data-dojo-attach-point=\"typeLabelNode\">Items</span>: <span data-dojo-attach-point=\"selectionNode\">\n\t\t</span>\n\t</div>\n\t<div style=\"margin-top:4px; padding:4px; border:1px solid #ccc;border-radius:4px;\">\n\t\t<p>Choose the data types you would like to download with the checkboxes below.  After selecting your desired data types, click on the download button to download an archive containing the selected data.</p>\n\t</div>\n\t<div style=\"margin-top:4px;padding:4px;\">\n\n\t\t<label>Annotation Type</label>\n\t\t<select style=\"width:120px;margin:4px;margin-left:8px;\" data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"annotationType\">\n\t\t\t<option value=\"PATRIC\" selected=true>PATRIC</option>\n\t\t\t<option value=\"RefSeq\" selected=true>RefSeq</option>\n\t\t\t<option value=\"all\" selected=true>All</option>\n\t\t</select>\n\n\t\t<label>Archive Type</label>\n\t\t<select style=\"width:120px;margin:4px; margin-left:8px;\" data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"archiveType\">\n\t\t\t<option value=\"zip\" selected=true>Zip</option>\n\t\t\t<option value=\"tar\" selected=true>TGZ</option>\n\t\t</select>\n\t</div>\n\t\n\t<div data-dojo-attach-point=\"fileTypesContainer\">\n\t\t<table data-dojo-attach-point=\"fileTypesTable\">\n\t\t</table>\n\t</div>\n\t<div style=\"text-align:right;\">\n\t\t<span data-dojo-type=\"dijit/form/Button\" data-dojo-attach-point=\"downloadButton\" data-dojo-attach-event=\"onClick:download\" label=\"Download\"></span>\n\t</div>\n</div>"}});
define("p3/widget/AdvancedDownload", [
	"dojo/_base/declare", "dojo/on", "dojo/dom-construct", "dojo/dom-attr",
	"dojo/_base/lang", "dojo/mouse", "dijit/_WidgetBase", "dijit/_WidgetsInTemplateMixin",
	"dojo/topic", "dijit/_TemplatedMixin", "dojo/text!./templates/AdvancedDownload.html",
	"dijit/Dialog", "dojo/query"

], function(declare, on, domConstruct, domAttr,
			lang, Mouse, WidgetBase, WidgetsInTemplate,
			Topic, TemplatedMixin, Template,
			Dialog){
	return declare([WidgetBase, TemplatedMixin, WidgetsInTemplate], {
		templateString: Template,
		"downloadableConfig": {
			"genome_data": {
				"label": "Genomes",
				dataType: "genome",
				tableData: true,
				downloadTypes: [
					{"label": "Genomic Sequences in FASTA (*.fna)", type: "fna", skipAnnotation: true},
					{"label": "Protein Sequences in FASTA (*.faa)", type: "faa"},
					{"label": "Annotations in GenBank file format (*.gbf)", type: "gbf"},
					{"label": "Genomic features in Generic Feature Format format (*.gff)", type: "gff"},
					{"label": "Genomic features in tab-delimited format (*.features.tab)", type: "features.tab"},
					{"label": "Protein coding genes tab-delimited format (*.cds.tab)", type: "cds.tab"},

					{"label": "RNAs in tab-delimited format (*.rna.tab)", type: "rna.tab"},
					{"label": "DNA Sequences of Protein Coding Genes (*.ffn)", type: "ffn"},
					{"label": "DNA Sequences of RNA Coding Genes (*.frn)", type: "frn"},
					{"label": "Pathway assignments in tab-delimited format (*.pathway.tab)", type: "pathway.tab"}
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
			var ids = this.selection.map(function(x){
				return x.genome_id;
			});
			console.log("Downloading genomes: ", ids);
			var types = [];
			dojo.query("input", this.fileTypesTable).forEach(function(node){
				console.log("node: ", node, node.checked, node.value);
				if(node.checked){

					types.push(node.value);
				}
			});
			//new Dialog({content: "Download: " + ids + "\nTypes: " + types}).show();
			var baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "")
			var conf = this.downloadableConfig[this.containerType]

			var map = {}
			conf.downloadTypes.forEach(function(type){
				map[type.type] = type;
			})

			var annotation = this.annotationType.get('value');

			types = types.map(function(type){
				if(map[type] && (map[type].skipAnnotation || annotation == "all" || !annotation)){
					return "*." + type;
				}else{
					return "*" + annotation + "." + type;
				}
			})

			if(baseUrl.charAt(-1) !== "/"){
				baseUrl = baseUrl + "/";
			}

			var form = domConstruct.create("form", {
				style: "display: none;",
				id: "downloadForm",
				enctype: 'application/x-www-form-urlencoded',
				name: "downloadForm",
				method: "post",
				action: baseUrl + "bundle/" + conf.dataType + "/"
			}, this.domNode);
			domConstruct.create('input', {
				type: "hidden",
				name: "archiveType",
				value: this.archiveType.get('value')
			}, form);
			var typesNode = document.createElement("input");
			typesNode.setAttribute('type', "hidden")
			typesNode.setAttribute("name", "types");
			typesNode.setAttribute("value", types.join(","));
			form.appendChild(typesNode);

			var qNode = document.createElement("input");
			qNode.setAttribute('type', "hidden")
			qNode.setAttribute("name", "q");
			qNode.setAttribute("value", "in(genome_id,(" + ids.join(",") + "))");
			form.appendChild(qNode);

			console.log("FORM SUBMIT: ", form);
			form.submit();

		},
		selection: null,
		_setSelectionAttr: function(val){
			// console.log("AdvancedDownload _setSelectionAttr: ", val);
			this.selection = val;

		},
		containerType: "",
		startup: function(){
			if(this.selection){
				this.selectionNode.innerHTML = this.selection.length;
			}
			domConstruct.empty(this.fileTypesTable);
			if(this.containerType){

				if(this.downloadableConfig[this.containerType]){
					var conf = this.downloadableConfig[this.containerType]
					this.typeLabelNode.innerHTML = conf.label;
					// console.log("Advanced Download Conf: ", conf)
					for(var x = 0; x < conf.downloadTypes.length; x += 2){
						var row = domConstruct.create("tr", {}, this.fileTypesTable);
						var left = conf.downloadTypes[x];
						domConstruct.create("td", {
							style: "padding:4px;",
							innerHTML: '<input type="checkbox" name="fileType" value="' + left.type + '"></input>&nbsp;' + left.label
						}, row);

						var right = conf.downloadTypes[x + 1];
						if(right){
							domConstruct.create("td", {
								style: "padding:4px;",
								innerHTML: '<input type="checkbox" name="fileType" value="' + right.type + '"></input>&nbsp;' + right.label
							}, row);
						}
					}
				}

			}

		}
	})

});
