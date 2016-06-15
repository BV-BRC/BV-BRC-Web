require({cache:{
'url:p3/widget/templates/FeatureOverview.html':"<div style=\"overflow: auto;padding:4px;\">\n    <div class=\"section\">\n        <table class=\"basic stripe far2x left\" style=\"width:80%\">\n            <tbody>\n            <tr>\n                <th scope=\"row\">Gene ID</th>\n                <td data-dojo-attach-point=\"geneIdList\"></td>\n            </tr>\n            <tr>\n                <th scope=\"row\">Protein ID</th>\n                <td data-dojo-attach-point=\"proteinIdList\"></td>\n            </tr>\n            </tbody>\n        </table>\n\n        <div id=\"feature_box\" class=\"far2x right\" data-dojo-attach-point=\"featureBoxNode\"></div>\n        <div class=\"clear\"></div>\n    </div>\n\n    <div class=\"section\">\n        <div data-dojo-attach-point=\"relatedFeatureNode\">\n            Loading Related Features...\n        </div>\n    </div>\n\n    <div class=\"section\">\n        <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Functional Properties</span></h3>\n\n        <div data-dojo-attach-point=\"functionalPropertiesNode\">\n            Loading Functional Properties...\n        </div>\n    </div>\n\n    <div class=\"section\" style=\"\">\n        <h3 class=\"section-title normal-case close2x\"><span class=\"wrap\">Comments</span></h3>\n\n        <div data-dojo-attach-point=\"featureCommentsNode\">\n            Loading Comments...\n        </div>\n    </div>\n</div>\n"}});
define("p3/widget/FeatureOverview", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_Templated", "dojo/text!./templates/FeatureOverview.html",
	"dojo/request", "dojo/_base/lang", "dojox/charting/Chart2D", "dojox/charting/themes/ThreeD", "dojox/charting/action2d/MoveSlice",
	"dojox/charting/action2d/Tooltip", "dojo/dom-construct", "../util/PathJoin"

], function(declare, WidgetBase, on,
			domClass, Templated, Template,
			xhr, lang, Chart2D, Theme, MoveSlice,
			ChartTooltip, domConstruct, PathJoin){
	return declare([WidgetBase, Templated], {
		baseClass: "FeatureOverview",
		disabled: false,
		templateString: Template,
		apiServiceUrl: window.App.dataAPI,
		feature: null,
		state: null,

		_setStateAttr: function(state){
			this._set("state", state);
			if(state.feature){
				this.set("feature", state.feature);
			}else{
				//
			}
		},

		_setFeatureAttr: function(feature){
			this.feature = feature;
			console.log("Set Feature", feature);

			this.createSummary(feature);
			this.getSummaryData();
			this.set("functionalProperties", feature);
		},
		_setRelatedFeatureListAttr: function(summary){

			domConstruct.empty(this.relatedFeatureNode);
			var table = domConstruct.create("table", {"class": "basic stripe far2x"}, this.relatedFeatureNode);
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

			summary.forEach(function(row){
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
		_setFunctionalPropertiesAttr: function(feature){

			domConstruct.empty(this.functionalPropertiesNode);
			var table = domConstruct.create("table", {"class": "basic stripe far2x"}, this.functionalPropertiesNode);
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
		getSummaryData: function(){
			// getting uniprot mapping
			if(this.feature.gi != null){
				xhr.get(PathJoin(this.apiServiceUrl, "id_ref/?eq(id_type,GI)&eq(id_value," + this.feature.gi + ")&limit(0)"), {
					handleAs: "json",
					headers: {"accept": "application/solr+json"}
				}).then(lang.hitch(this, function(data){
					//console.log("Uniprot Accessions: ", data);

					// TODO: process uniprot mapping
				}));
			}

			// get related feature list
			if(this.feature.pos_group != null){
				//xhr.get(this.apiServiceUrl + "/genome_feature/?eq(pos_group," + encodeURIComponent('"' + this.feature.pos_group + '"') + ")&limit(0)&http_accept=application/solr+json", {
				xhr.get(PathJoin(this.apiServiceUrl, "genome_feature/?and(eq(sequence_id," + this.feature.sequence_id + "),eq(end," + this.feature.end + "),eq(strand,\\" + this.feature.strand + "))&limit(0)"), {
					handleAs: "json",
					headers: {"accept": "application/solr+json"}
				}).then(lang.hitch(this, function(data){
					var relatedFeatures = data.response.docs;
					this.set("relatedFeatureList", relatedFeatures);
				}));
			}
		},
		createSummary: function(feature){
			if(feature && feature.feature_id){
				this.geneIdList.innerHTML = '<span><b>PATRIC ID</b>: ' + feature.patric_id + '</span>';
				if(feature.refseq_locus_tag != null){
					this.geneIdList.innerHTML += '&nbsp; <span><b>RefSeq</b>: ' + feature.refseq_locus_tag + '</span>';
				}
				if(feature.alt_locus_tag != null){
					this.geneIdList.innerHTML += '&nbsp; <span><b>Alt Locus Tag</b>: ' + feature.alt_locus_tag + '</span>';
				}

				this.proteinIdList.innerHTML = '';
				if(feature.protein_id != null){
					this.proteinIdList.innerHTML += '<span><b>RefSeq</b>: ' + feature.protein_id + '</span>';
				}

				// feature box
				this.featureBoxNode.innerHTML = '<div id="gene_symbol">' + (feature.gene || ' ') + '</div>';
				if(feature.strand == '+'){
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-right fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}else{
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-left fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}
				this.featureBoxNode.innerHTML += '<div id="feature_type">' + this.feature.feature_type + '</div>';

			}else{
				console.log("Invalid Feature: ", feature);
			}
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
		}
	});
});
