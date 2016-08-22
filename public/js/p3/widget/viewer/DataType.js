define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/when", "dojo/request", "dojo/string", "dojo/topic",
	"dojo/dom-construct", "dojo/query", "dojo/dom-class",
	"dijit/layout/ContentPane", "dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"./Base", "../../util/PathJoin"
], function(declare, lang, when, request, String, Topic,
			domConstruct, domQuery, domClass,
			ContentPane, WidgetBase, Templated,
			ViewerBase, PathJoin){

	var attributeTemplate = [
		"<a class='left right-align-text attribute-line' href='{attr.link}'>",
		"<span class='highlight-e'>{attr.data}</span>",
		"</a>",
		"<span class='left small'>{attr.description}</span>",
		"<div class='clear'></div>"
	].join("\n");

	return declare([ViewerBase], {

		onSetState: function(attr, oldVal, state){
			// console.log("DataType view onSetState", state);

			if(!state){
				return;
			}

			var parts = state.pathname.split("/");
			var dataType = parts[parts.length - 1];

			if(!dataType) return;

			this.dataType = dataType;

			when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType), {
				handleAs: "html"
			}), lang.hitch(this, function(content){

				this.template = content;
				this.viewer.set('content', content);

				when(request.get(PathJoin(this.apiServiceUrl, "content/dlp/", dataType + ".json"),{
					handleAs: "json"

				}), lang.hitch(this, function(data){

					this.set(dataType, data);
				}));
			}));
		},

		_buildPopularGenomeList: function(popularList){

			var popularListUl = ["<ul class='no-decoration genome-list tab-headers third'>"];

			popularList.forEach(function(genome, idx){
				popularListUl.push(lang.replace("<li><a data-genome-href='{0}' class='genome-link' href='#genome-tab{1}'>{2}</a><div class='arrow'></div></li>", [genome.link, (idx + 1), genome.popularName]));
			});
			popularListUl.push("</ul>");

			return popularListUl;
		},

		_activatePopularGenomeListTab: function(){
			var links = domQuery(".data-box.popular-box .genome-link");
			links.forEach(function(link){
				link.addEventListener('click', function(evt){
					var link = evt.srcElement.dataset.genomeHref;
					Topic.publish('/navigate', {href: link});
				});
				link.addEventListener('mouseover', function(evt){
					// console.log(evt);
					var targetTab = evt.srcElement.hash;

					domQuery(".genome-data").forEach(function(panel){
						if("#" + panel.id == targetTab){
							domClass.remove(panel, "hidden");
						}else{
							domClass.add(panel, "hidden");
						}
					});
				})
			});
		},

		_setAntibioticResistanceAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildAntibioticResistancePopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},
		_buildAntibioticResistancePopularPanel: function(popularList){

			var template = "<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>" +
				"<div class='far2x'>" +
					"<div class='left left-align-text'>" +
					"<h3>Antibiotic Resistance Genes:</h3>" +
					"{1}" +
					"</div>" +
					"<div class='clear'></div>" +
				"</div>" +
				"<h3>Explore Genomic Features in </h3>" +
					"<div class='three-quarter'>{2}</div>" +
				"</div>";

			return popularList.map(function(genome, idx){

				var specialtyGenes = genome.specialtyGenes.map(function(spg){
					return lang.replace(attributeTemplate, {attr: spg});
				});

				var links = genome.links.map(function(link, i){

					if(i%2){ // odd
						return lang.replace("<a class='right' href='{0}'>{1}</a><br/>", [link.link, link.name]);
					}else{
						return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);
					}
				});

				return lang.replace(template, [(idx+1), specialtyGenes.join(""), links.join("")]);
			});
		},

		_setGenomicFeaturesAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildFeaturesPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},
		_buildFeaturesPopularPanel: function(popularList){

			var template = [
				"<div class='genome-data right two-third group no-decoration hidden' id='genome-tab{0}' style='width:563px;'>",
					"<div class='far2x'>",
						"<div class='left'>",
							"<h3>Features:</h3>",
								"{1}",
						"</div>",
						"<div class='left left-align-text' style='margin:0 15px'>",
							"<h3>Proteins by Attributes:</h3>",
								"{2}",
						"</div>",
						"<div class='left left-align-text'>",
							"<h3>Specialty Genes:</h3>",
								"{3}",
						"</div>",
						"<div class='clear'></div>",
					"</div>",
					"<h3>Explore Genomic Features in </h3>",
						"<div class='three-quarter'>{4}</div>",
				"</div>"].join("\n");

			return popularList.map(function(genome, idx){

				var featureTypes = genome.featureTypes.map(function(type){
					return lang.replace(attributeTemplate, {attr: type});
				}).join("\n");
				var proteinSummary = genome.proteinSummary.map(function(protein){
					return lang.replace(attributeTemplate, {attr: protein});
				}).join("\n");
				var specialtyGenes = genome.specialtyGenes.map(function(gene){
					return lang.replace(attributeTemplate, {attr: gene});
				}).join("\n");

				var links = genome.links.map(function(link, i){
					if(i%2){ // odd
						return lang.replace("<a class='right'href='{0}'>{1}</a><br/>", [link.link, link.name]);
					}else{
						return lang.replace("<a class='left' href='{0}'>{1}</a>", [link.link, link.name]);
					}
				}).join("\n");

				return lang.replace(template, [(idx + 1), featureTypes, proteinSummary, specialtyGenes, links]);
			})
		},

		_setGenomesAttr: function(data){

			var popularList = data['popularGenomes']['popularList'];

			var popularTabList = this._buildGenomesPopularPanel(popularList);
			var popularListUl = this._buildPopularGenomeList(popularList);

			var tabDiv = domQuery(".data-box.popular-box div.group")[0];

			var popularTabNode = domConstruct.toDom(popularTabList.join(""));
			var popularListNode = domConstruct.toDom(popularListUl.join(""));

			domConstruct.place(popularTabNode, tabDiv);
			domConstruct.place(popularListNode, tabDiv);

			this._activatePopularGenomeListTab();
		},

		_buildGenomesPopularPanel: function(popularList){

			var template = ["<div class='genome-data right half group no-decoration hidden' id='genome-tab{0}'>",
					"{1}",
					"{2}",
				"<div class='clear'></div>",
				"<p><a class='double-arrow-link' href='{3}'>View This Genome in Genome Browser</a></p>",
				"</div>"].join("\n");

			var metadataTemplate = ["<table class='no-decoration basic far2x'>",
				"<tr>",
					"<th class='italic' width='25%' scope='row'>Genome Status: </th>",
					"<td width='25%'>&nbsp;{metadata.genome_status}</td>",
					"<th class='italic' width='25%' scope='row'>Isolation Country: </th>",
					"<td width='25%'>&nbsp;{metadata.isolation_country}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Genomic Sequences: </th>",
					"<td>1 Chromosome</td>",
					"<th class='italic' scope='row'>Host Name: </th>",
					"<td>&nbsp;{metadata.host_name}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Genome Length: </th>",
					"<td>&nbsp;{metadata.genome_length} bp</td>",
					"<th class='italic' scope='row'>Disease: </th>",
					"<td>&nbsp;{metadata.disease}</td>",
				"</tr>",
				"<tr>",
					"<th class='italic' scope='row'>Completion Date: </th>",
					"<td>&nbsp;{metadata.completion_date}</td>",
					"<th class='italic' scope='row'>Collection Date: </th>",
					"<td>&nbsp;{metadata.collection_date}</td>",
				"</tr>",
				"</table>"].join("\n");

			var dataTypeTemplate = ["<div class='column'>",
				"<a class='genome-data-item clear' href='{dataType.features.link}'>",
				"<div class='genome-data-icon feature left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.features.data}</h3>",
				"<p class='small'>Features</p>",
				"</a>",
				"<a class='genome-data-item clear' href='{dataType.experiments.link}'>",
				"<div class='genome-data-icon experiment left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.experiments.data}</h3>",
				"<p class='small'>Transcriptomic Experiments</p>",
				"</a>",
				"</div>",
				"<div class='column'>",
				"<a class='genome-data-item clear' href='{dataType.pathways.link}'>",
				"<div class='genome-data-icon pathway left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.pathways.data}</h3>",
				"<p class='small'>Pathways</p>",
				"</a>",
				"<a class='genome-data-item clear' href='{dataType.proteinfamily.link}'>",
				"<div class='genome-data-icon proteinfamily left'></div>",
				"<h3 class='down2x close highlight-e'>{dataType.proteinfamily.data}</h3>",
				"<p class='small'>Protein Families</p>",
				"</a>",
				"</div>"].join("\n");

			return popularList.map(function(genome, idx){

				var meta = lang.replace(metadataTemplate, genome);
				var dataType = lang.replace(dataTypeTemplate, genome);

				return lang.replace(template, [(idx + 1), meta, dataType, genome.gb_link]);
			})
		},

		_setPathwaysAttr: function(data){

		},

		_setProteinFamiliesAttr: function(data){

		},

		_setSpecialtyGenesAttr: function(data){

		},
		_setTranscriptomicsAttr: function(data){

			// select genomes
			var popularList = data['popularGenomes']['popularList'];

			console.log(this.viewer, data);
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

			this.inherited(arguments);

			this.viewer = new ContentPane({
				region: "center",
				content: ""
			});

			this.addChild(this.viewer);
		}
	});
});
