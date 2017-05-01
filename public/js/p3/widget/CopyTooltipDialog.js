define([
	"dojo/_base/declare", "dojo/on", "dojo/dom-construct",
	"dojo/_base/lang", "dojo/mouse",
	"dojo/topic", "dojo/query", "dijit/layout/ContentPane",
	"dijit/Dialog", "dijit/popup", "dijit/TooltipDialog",
	"./AdvancedDownload", "dojo/dom-class", "dojo/when"
], function(declare, on, domConstruct,
			lang, Mouse,
			Topic, query, ContentPane,
			Dialog, popup, TooltipDialog,
			AdvancedDownload, domClass, when){

	return declare([TooltipDialog], {
		containerType: "",
		selection: null,
		grid: null,

		_setSelectionAttr: function(val){
			//console.log("CopyTooltipDialog._setSelectionAttr: ", val);
			this.selection = val;
		},
		timeout: function(val){
			var _self = this;
			this._timer = setTimeout(function(){
				popup.close(_self);
			}, val || 2500);
		},

		onMouseEnter: function(){
			if(this._timer){
				clearTimeout(this._timer);
			}

			this.inherited(arguments);
		},
		onMouseLeave: function(){
			popup.close(this);
		},

		_tocsv: function(selection){
			var out = [];
			var keys = Object.keys(selection[0]);

			var header = []
			keys.forEach(function(key){
				header.push(key);
			});
			out.push(header.join(","));
			selection.forEach(function(obj){
				var io = [];

				keys.forEach(function(key){
					if (obj[key] instanceof Array){
						io.push(obj[key].join(";"));
					}else{
						io.push(obj[key]);
					}
				})

				out.push(io.join(","));
			});

			return out.join("\n");

		},

		_totsv: function(selection){
			var out = [];
			var keys = Object.keys(selection[0]);

			var header = []
			keys.forEach(function(key){
				header.push(key);
			});
			out.push(header.join("\t"));
			selection.forEach(function(obj){
				var io = [];

				keys.forEach(function(key){
					if (obj[key] instanceof Array){
						io.push(obj[key].join(";"));
					}else{
						io.push(obj[key]);
					}
				})

				out.push(io.join("\t"));
			});

			return out.join("\n");

		},

		copySelection: function(type, selection){
			console.log("CopyTooltipDialog:copySelection(", type,",", selection,")");

			// format the text
			var copy_text;
			switch(type){
				case "csv":
					copy_text = this._tocsv(selection);
					break;
				case "tsv":
					copy_text = this._totsv(selection);
					break;
				default:
					copy_text = this._totsv(selection);
					break;
			}

			// put it on the clipboard (https://www.npmjs.com/package/clipboard-js)
			clipboard.copy(copy_text);
		},

		startup: function(){
			if(this._started){
				return;
			}
			on(this.domNode, Mouse.enter, lang.hitch(this, "onMouseEnter"));
			on(this.domNode, Mouse.leave, lang.hitch(this, "onMouseLeave"));
			var _self = this;
			on(this.domNode, ".wsActionTooltip:click", function(evt){
				// console.log("evt.target: ", evt.target, evt.target.attributes);
				var rel = evt.target.attributes.rel.value;
				_self.copySelection(rel, _self.selection)
			});

			var dstContent = domConstruct.create("div", {});
			this.labelNode = domConstruct.create("div", {style: "background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;"}, dstContent);
			this.selectedCount = domConstruct.create("div", {}, dstContent);
			var table = domConstruct.create("table", {}, dstContent);

			var tr = domConstruct.create("tr", {}, table);
			var tData = this.tableCopyNode = domConstruct.create("td", {style: "vertical-align:top;"}, tr);
			//spacer
			domConstruct.create("td", {style: "width:10px;"}, tr);
			var oData = this.otherCopyNode = domConstruct.create("td", {style: "vertical-align:top;"}, tr);

			domConstruct.create("div", {"class": "wsActionTooltip", rel: "tsv", innerHTML: "Text"}, tData);
			domConstruct.create("div", {"class": "wsActionTooltip", rel: "csv", innerHTML: "CSV"}, tData);

			tr = domConstruct.create("tr", {}, table);
			var td = domConstruct.create("td", {"colspan": 3, "style": "text-align:right"}, tr);

			this.set("content", dstContent);

			this._started = true;
			this.set("label", this.label);
			this.set("selection", this.selection);

		},

		_setLabelAttr: function(val){
			console.log("CopyTooltipDialog._setLabelAttr: ", val);
			this.label = val;
			if(this._started){
				this.labelNode.innerHTML = "Copy selected " + this.label + " (" + (this.selection ? this.selection.length : "0") + ") as...";
			}
		},

		"copyableConfig": {
			"genome_data": {
				"label": "Genomes",
				"dataType": "genome",
				pk: "genome_id",
				tableData: true,
				advanced: true
			},
			"sequence_data": {
				"label": "Sequences",
				"dataType": "genome_sequence",
				pk: "sequence_id",
				tableData: true,
				otherData: ["dna+fasta"]
			},
			"feature_data": {
				"label": "Features",
				"dataType": "genome_feature",
				pk: "feature_id",
				tableData: true,
				otherData: ["dna+fasta", "protein+fasta"]
			},
			"spgene_data": {
				dataType: "sp_gene",
				field: "feature_id",
				pk: "id",
				"label": "Specialty Genes",
				tableData: true
			},
			"spgene_ref_data": {
				dataType: "sp_gene_ref",
				pk: "id",
				"label": "Specialty VF Genes",
				tableData: true
			},
			"pathway_data": {
				pk: "pathway_id",
				dataType: "pathway",
				"label": "Pathways",
				tableData: true
			},
			"gene_expression_data": {
				dataType: "transcriptomics_gene",
				pk: "id",
				"label": "Gene Expression",
				tableData: true
			},
			"transcriptomics_gene_data": {
				dataType: "genome_feature",
				pk: "feature_id",
				"label": "Features",
				tableData: true
			},
			"transcriptomics_experiment_data": {
				dataType: "transcriptomics_experiment",
				pk: "eid",
				"label": "Experiments",
				tableData: true
			},
			"transcriptomics_sample_data": {
				dataType: "transcriptomics_sample",
				pk: "pid",
				"label": "Comparisons",
				tableData: true
			},
			"interaction_data": {
				dataType: "ppi",
				pk: "id",
				"label": "Interactions",
				tableData: true
			},
			"genome_amr_data": {
				dataType: "genome_amr",
				pk: "id",
				"label": "AMR Phenotypes",
				tableData: true
			},
			"default": {
				"label": "Items",
				tableData: true
			}
		},

		_setContainerTypeAttr: function(val){
			console.log("CopyTooltipDialog.setContainerType: ", val);
			var label;
			this.containerType = val;

			var conf = this.copyableConfig[val] || this.copyableConfig["default"];

			this.set("label", conf.label);

			if(!this._started){
				return;
			}

			domConstruct.empty(this.otherCopyNode);

			if(conf.otherData){
				conf.otherData.forEach(function(type){
					domConstruct.create("div", {
						"class": "wsActionTooltip",
						rel: type,
						innerHTML: null
					}, this.otherCopyNode);
				}, this);
			}

		}
	});

});
