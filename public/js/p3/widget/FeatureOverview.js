define([
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
			// console.log("Set Feature", feature);

			this.createSummary(feature);
			this.getSummaryData();
			this.set("functionalProperties", feature);
		},
		_setRelatedFeatureListAttr: function(summary){

			domConstruct.empty(this.relatedFeatureNode);
			var table = domConstruct.create("table", {"class": "p3basic stripe far2x"}, this.relatedFeatureNode);
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
		_setMappedFeatureListAttr: function(summary){

			domConstruct.empty(this.idMappingList);
			var span = domConstruct.create("span", {innerHTML: "<b>UniProt</b> :"}, this.idMappingList);

			summary['accessions'].forEach(function(d){
				var accession = domConstruct.create("a", {
					href: "http://www.uniprot.org/uniprot/" + d,
					target: "_blank",
					innerHTML: d
				}, span);
				domConstruct.place(domConstruct.toDom("&nbsp; &nbsp;"), accession, "after");
			});

			var mappedIds = domConstruct.create("a", {innerHTML: summary['total'] + " IDs are mapped"}, this.idMappingList);
			domConstruct.place(domConstruct.toDom("&nbsp; &nbsp;"), mappedIds, "before");

			var table = domConstruct.create("table", {class: "hidden"}, this.idMappingList);
			summary['ids'].forEach(function(id){
				var tr = domConstruct.create('tr', {}, table);
				domConstruct.create('th', {innerHTML: id['id_type']}, tr);
				domConstruct.create('td', {innerHTML: id['id_value']}, tr);
			});

			on(mappedIds, "click", function(){
				if(domClass.contains(table, "hidden")){
					domClass.remove(table, "hidden");
				}else{
					domClass.add(table, "hidden");
				}
			});
		},
		_setFunctionalPropertiesAttr: function(feature){

			domConstruct.empty(this.functionalPropertiesNode);
			var table = domConstruct.create("table", {"class": "p3basic stripe far2x"}, this.functionalPropertiesNode);
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

			if(this.feature.gi){
				xhr.get(PathJoin(this.apiServiceUrl, "id_ref/?and(eq(id_type,GI)&eq(id_value," + this.feature.gi + "))&select(uniprotkb_accession)&limit(0)"), {
					handleAs: "json",
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': window.App.authorizationToken || ""
					}
				}).then(lang.hitch(this, function(data){

					var uniprotKbAccessions = data.map(function(d){
						return d.uniprotkb_accession;
					});

					xhr.get(PathJoin(this.apiServiceUrl, "id_ref/?in(uniprotkb_accession,(" + uniprotKbAccessions + "))&select(id_type,id_value)&limit(25000)"), {
						handleAs: "json",
						headers: {
							'Accept': "application/json",
							'Content-Type': "application/rqlquery+x-www-form-urlencoded",
							'X-Requested-With': null,
							'Authorization': window.App.authorizationToken || ""
						}
					}).then(lang.hitch(this, function(data){
						if(data.length === 0) return;

						this.set("mappedFeatureList", {accessions: uniprotKbAccessions, total: data.length, ids: data});
					}));
				}));
			}

			// get related feature list
			if(this.feature.pos_group != null){
				xhr.get(this.apiServiceUrl + "/genome_feature/?eq(pos_group," + encodeURIComponent('"' + this.feature.pos_group + '"') + ")&limit(0)", {
					handleAs: "json",
					headers: {"Accept": "application/solr+json"}
				}).then(lang.hitch(this, function(data){

					if(data.length === 0) return;
					var relatedFeatures = data.response.docs;
					this.set("relatedFeatureList", relatedFeatures);
				}));
			}
		},
		createSummary: function(feature){
			if(feature && feature.feature_id){
				if(feature.patric_id){
					this.geneIdList.innerHTML = '<span><b>PATRIC ID</b>: ' + feature.patric_id + '</span>&nbsp; ';
				}

				if(feature.refseq_locus_tag){
					this.geneIdList.innerHTML += '<span><b>RefSeq</b>: ' + feature.refseq_locus_tag + '</span>&nbsp; ';
				}

				if(feature.alt_locus_tag){
					this.geneIdList.innerHTML += '<span><b>Alt Locus Tag</b>: ' + feature.alt_locus_tag + '</span>';
				}

				this.proteinIdList.innerHTML = '';
				if(feature.protein_id != null){
					this.proteinIdList.innerHTML += '<b>RefSeq</b>: <a href="https://www.ncbi.nlm.nih.gov/protein/' + feature.protein_id + '" target="_blank">' + feature.protein_id + '</a>';
				}

				// feature box
				this.featureBoxNode.innerHTML = '<div class="gene_symbol">' + (feature.gene || ' ') + '</div>';
				if(feature.strand == '+'){
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-right fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}else{
					this.featureBoxNode.innerHTML += '<i class="fa icon-long-arrow-left fa-2x" style="transform:scale(3,1);padding-left:20px;"></i>';
				}
				this.featureBoxNode.innerHTML += '<div class="feature_type">' + this.feature.feature_type + '</div>';

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
