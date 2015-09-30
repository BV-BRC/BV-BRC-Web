define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/TabContainer",
	"./PathwaysGrid", "dijit/layout/ContentPane"
], function(declare, BorderContainer, on,
			ActionBar, ContainerActionBar, TabContainer,
			PathwaysGrid, ContentPane) {

	return declare([BorderContainer], {
		gutters: false,
		params: null,
		//query: null,
		//_setQueryAttr: function(query){
		//	this.query = query;
		//	if (this.pathwaysGrid) {
		//		this.pathwaysGrid.set("query", query);
		//	}
		//},
		_setParamsAttr: function(params) {
			this.params = params;
			if(this.pathwaysGrid){
				var q = [];
				if(params.genome_id != null) q.push('genome_id:' + params.genome_id);
				if(params.annotation != null) q.push('annotation:' + params.annotation);
				if(params.pathway_id != null) q.push('pathway_id:' + prarms.pathway_id);

				//console.log(params, q);
				this.pathwaysGrid.set("query", {
					q: q.join(' AND '),
					rows: 1,
					facet: true,
					'json.facet': '{stat:{field:{field:pathway_id,limit:-1,facet:{genome_count:"unique(genome_id)",gene_count:"unique(feature_id)",ec_count:"unique(ec_number)",genome_ec:"unique(genome_ec)"}}}}'
				});
			}
		},
		startup: function() {
			if(this._started){
				return;
			}
			this.containerActionBar = new ContainerActionBar({
				region: "top",
				splitter: false,
				"className": "BrowserHeader"
			});
			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 2,
				style: "width:48px;text-align:center;",
				splitter: false
			});
			this.tabContainer = new TabContainer({region: "center"});
			this.pathwaysGrid = new PathwaysGrid({title: "Pathways", content: "Pathways Grid"});
			this.ecNumbersGrid = new ContentPane({title: "EC Numbers", content: "EC Numbers Grid"});
			this.genesGrid = new ContentPane({title: "Genes", content: "Genes Grid"});
			this.tabContainer.addChild(this.pathwaysGrid);
			this.tabContainer.addChild(this.ecNumbersGrid);
			this.tabContainer.addChild(this.genesGrid);

			this.addChild(this.containerActionBar);
			this.addChild(this.tabContainer);
			this.addChild(this.selectionActionBar);

			this.inherited(arguments);
		}
	});
});

