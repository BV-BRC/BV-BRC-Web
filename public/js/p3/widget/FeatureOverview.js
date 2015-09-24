define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_Templated", "dojo/text!./templates/FeatureOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/ThreeD", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct"

], function(declare, WidgetBase, on,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct) {
	return declare([WidgetBase, Templated], {
		baseClass: "FeatureOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		feature: null,
		"_setFeatureAttr": function(feature) {
			this.feature = feature;
			//console.log("Set Feature", feature);

			this.getSummaryData();

			if(this._started){
				this.refresh();
			}
		},
		"_setRelatedFeatureListAttr": function(summary) {

			domConstruct.empty(this.relatedFeatureNode);
			var table = domConstruct.create("table", {class: "basic stripe far2x"}, this.relatedFeatureNode);
			var thead = domConstruct.create("thead", {}, table);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, thead);
			domConstruct.create("th", {innerHTML: "Annotation"}, htr);
			domConstruct.create("th", {innerHTML: "Locus Tag"}, htr);
			domConstruct.create("th", {innerHTML: "Start"}, htr);
			domConstruct.create("th", {innerHTML: "End"}, htr);
			domConstruct.create("th", {innerHTML: "NT Length"}, htr);
			domConstruct.create("th", {innerHTML: "AA Length"}, htr);
			domConstruct.create("th", {innerHTML: "Product"}, htr);

			summary.forEach(function(row) {
				var tr = domConstruct.create('tr', {}, tbody);
				domConstruct.create("td", {innerHTML: row.annotation}, tr);
				domConstruct.create("td", {innerHTML: row.alt_locus_tag}, tr);
				domConstruct.create("td", {innerHTML: row.start}, tr);
				domConstruct.create("td", {innerHTML: row.end}, tr);
				domConstruct.create("td", {innerHTML: row.na_length}, tr);
				domConstruct.create("td", {innerHTML: row.aa_length || '-'}, tr);
				domConstruct.create("td", {innerHTML: row.product || '(feature type: ' + row.feature_type + ')'}, tr);
			});
		},
		"_setFunctionalPropertiesAttr": function(feature) {

			domConstruct.empty(this.functionalPropertiesNode);
			var table = domConstruct.create("table", {class: "basic stripe far2x"}, this.functionalPropertiesNode);
			var tbody = domConstruct.create("tbody", {}, table);

			var htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "GO Assignments", scope: "row", style: "width:20%"}, htr);
			domConstruct.create("td", {innerHTML: feature.go || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "EC Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: feature.ec || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Local Family Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: feature.plfam_id || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "PATRIC Global Family Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: feature.pgfam_id || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "FIGfam Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: feature.figfam_id || '-'}, htr);

			htr = domConstruct.create("tr", {}, tbody);
			domConstruct.create("th", {innerHTML: "Pathway Assignments", scope: "row"}, htr);
			domConstruct.create("td", {innerHTML: feature.pathway || '-'}, htr);

			// TODO: implement structure
			// TODO: implement protein interaction
		},
		getSummaryData: function() {
			// getting uniprot mapping
			if(this.feature.gi != null){
				xhr.get(this.apiServiceUrl + "/id_ref/?eq(id_type,GI)&eq(id_value," + this.feature.gi + ")&limit(0)&http_accept=application/solr+json", {
					handleAs: "json",
					headers: {"accept": "application/solr+json"}
				}).then(lang.hitch(this, function(data) {
					//console.log("Uniprot Accessions: ", data);

					// TODO: process uniprot mapping
				}));
			}

			// get related feature list
			if(this.feature.pos_group != null){
				xhr.get(this.apiServiceUrl + "/genome_feature/?eq(pos_group," + encodeURIComponent('"' + this.feature.pos_group + '"') + ")&limit(0)&http_accept=application/solr+json", {
					handleAs: "json",
					headers: {"accept": "application/solr+json"}
				}).then(lang.hitch(this, function(data) {
					var relatedFeatures = data.response.docs;
					//console.log("Related Features: ", relatedFeatures);
					this.set("relatedFeatureList", relatedFeatures);
				}));
			}
		},
		refresh: function() {
			if(this.feature && this.feature.feature_id){
				this.geneIdList.innerHTML = '<span><b>PATRIC ID</b>: ' + this.feature.patric_id + '</span>';
				if(this.feature.refseq_locus_tag != null){
					this.geneIdList.innerHTML += '&nbsp; <span><b>RefSeq</b>: ' + this.feature.refseq_locus_tag + '</span>';
				}
				if(this.feature.alt_locus_tag != null){
					this.geneIdList.innerHTML += '&nbsp; <span><b>Alt Locus Tag</b>: ' + this.feature.alt_locus_tag + '</span>';
				}

				this.proteinIdList.innerHTML = '';
				if(this.feature.protein_id != null){
					this.proteinIdList.innerHTML += '<span><b>RefSeq</b>: ' + this.feature.protein_id + '</span>';
				}

				// feature box
				this.featureBoxNode.innerHTML = '<div id="gene_symbol">' + this.feature.gene || '' + '</div>';
				if(this.feature.strand == '+'){
					this.featureBoxNode.innerHTML += '<img id="strand" alt="forward strand" src="/patric/images/forward.png"/>';
				}else{
					this.featureBoxNode.innerHTML += '<img id="strand" alt="reverse strand" src="/patric/images/reverse.png"/>';
				}
				this.featureBoxNode.innerHTML += '<div id="feature_type">' + this.feature.feature_type + '</div>';

				this.set("functionalProperties", this.feature);
			}else{
				console.log("Invalid Feature: ", this.feature);
			}
			this._started = true;
		},
		startup: function() {
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.refresh();
		}
	});
});
