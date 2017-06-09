define("p3/widget/CopyTooltipDialog", [
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
		conf: null,

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

		// convert the selection into TSV format, skipping headers and columns as specified
		_totsv: function(selection, includeHeader, selectedOnly, shownCols){
			var out = [];

			// gather all of the keys present in the selected objects and remove any undefined entries
			var key_set = new Set();
			var clean_selection = [];
			selection.forEach(function(obj){
				if (obj){
					var keys = new Set(Object.keys(obj));
					keys.forEach(function (key){
						key_set.add(key);
					});
					clean_selection.push(obj);
				}
			});

			// construct the header
			var header = [];
			key_set.forEach(function(key){
				if (!selectedOnly || (selectedOnly && shownCols.includes(key))){
					header.push(key);
				}
			});

			// if we want the header, push it to the array
			if (includeHeader){
				out.push(header.join("\t"));
			}

			// for each selected item, push its data to the result array
			clean_selection.forEach(function(obj){
				var io = [];

				key_set.forEach(function(key){
					// decide if we should include this column
					if (!selectedOnly || (selectedOnly && shownCols.includes(key))){
						// push it to the array
						if (obj[key] instanceof Array){
							io.push(obj[key].join(";"));
						} else {
							io.push(obj[key]);
						}
					}
				});

				out.push(io.join("\t"));
  		});
			return out.join("\n");

		},

		// XXX known issue: seleted items not accessible after changing pages (NPE)
		copySelection: function(type, selection){

			// format the text
			var includeHeader;
			var selectedOnly;
			var pkOnly;
			switch(type){
				case "full_w_header":
					includeHeader = true;
					selectedOnly = false;
					break;
				case "full_wo_header":
					includeHeader = false;
					selectedOnly = false;
					break;
				case "selected_w_header":
					includeHeader = true;
					selectedOnly = true;
					break;
				case "selected_wo_header":
					includeHeader = false;
					selectedOnly = true;
					break;
				default:
					includeHeader = true;
					selectedOnly = false;
					break;
			}

			// build a list of which columns are visible to the user
			var shownCols = [];
			if (selectedOnly) {
				var col_keys = Object.keys(this.grid.columns);
				for (var i=0; i<col_keys.length; i++) {
					var key = col_keys[i];

					// if the column is not hidden, put it in the list of shown columns
					if ((typeof this.grid.columns[key].hidden == 'undefined') || !this.grid.columns[key].hidden) {
						shownCols.push(key);
					}
				}
			}

			// console.log("CopyTooltipDialog.copySelection(", type,",", selection,",",shownCols,")");

			// convert to tsv
			var copy_text = this._totsv(selection, includeHeader, selectedOnly, shownCols);

			// put it on the clipboard (https://www.npmjs.com/package/clipboard-js)
			clipboard.copy(copy_text);

			// close the popup; this gives a bit of a visual indicator it worked
			var _self = this;
			popup.close(_self);
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

			domConstruct.create("div", {"class": "wsActionTooltip", rel: "full_w_header", innerHTML: "Full Table (with headers)"}, tData);
			domConstruct.create("div", {"class": "wsActionTooltip", rel: "full_wo_header", innerHTML: "Full Table (without headers)"}, tData);
			domConstruct.create("div", {"class": "wsActionTooltip", rel: "selected_w_header", innerHTML: "Selected Columns (with headers)"}, tData);
			domConstruct.create("div", {"class": "wsActionTooltip", rel: "selected_wo_header", innerHTML: "Selected Columns (without headers)"}, tData);

			tr = domConstruct.create("tr", {}, table);
			var td = domConstruct.create("td", {"colspan": 3, "style": "text-align:right"}, tr);

			this.set("content", dstContent);

			this._started = true;
			this.set("label", this.label);
			this.set("selection", this.selection);

		},

		_setLabelAttr: function(val){
			//console.log("CopyTooltipDialog._setLabelAttr: ", val);
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
				pk: "id",
				tableData: true
			}
		},

		_setContainerTypeAttr: function(val){
			//console.log("CopyTooltipDialog.setContainerType: ", val);

			this.containerType = val;
			this.conf = this.copyableConfig[val] || this.copyableConfig["default"];
			this.set("label", this.conf.label);

			if(!this._started){
				return;
			}

			domConstruct.empty(this.otherCopyNode);

			if(this.conf.otherData){
				this.conf.otherData.forEach(function(type){
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
