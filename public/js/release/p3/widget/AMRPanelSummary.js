define("p3/widget/AMRPanelSummary", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/dom-class",
	"./SummaryWidget"

], function(declare, lang,
			on, domClass,
			SummaryWidget){

	return declare([SummaryWidget], {
		templateString: '<div class="SummaryWidget"><div class="loadingNode" data-dojo-attach-point="loadingNode">Loading...</div><div class="tableNode" data-dojo-attach-point="tableNode"></div></div>',
		dataModel: "genome_amr",
		query: "",
		view: "table",
		baseQuery: "&limit(1)&facet((pivot,(resistant_phenotype,antibiotic)),(mincount,1))&json(nl,map)",
		columns: [
			{
				label: "Phenotypes", field: "resistant_phenotype",
				renderCell: function(obj, val, node){
					node.innerHTML = lang.replace('<a href="#view_tab=amr&filter=eq(resistant_phenotype,{0})">{1}</a>', [encodeURIComponent(val), val]);
				}
			},
			{
				label: "Antibiotics", field: "antibiotics",
				renderCell: function(obj, val, node){
					if(val){
						node.innerHTML = val.join(', ');
					}else{
						node.innerHTML = ' ';
					}
				}
			}
		],
		processData: function(data){

			if(!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['resistant_phenotype,antibiotic']){
				// hide this section
				domClass.add(this.domNode.parentNode, "hidden");
				return;
			}

			// make section visible
			domClass.remove(this.domNode.parentNode, "hidden");

			data = data.facet_counts.facet_pivot['resistant_phenotype,antibiotic'];
			var byPhenotypes = [];

			data.forEach(function(summary){
				var antibiotics = [];
				summary.pivot.forEach(function(pv){
					antibiotics.push(pv.value);
				});
				byPhenotypes.push({resistant_phenotype: summary.value, antibiotics: antibiotics});
			});

			this._tableData = byPhenotypes;
			this.set('data', byPhenotypes);
		},

		render_table: function(){
			this.inherited(arguments);

			this.grid.refresh();
			this.grid.renderArray(this._tableData);
		}
	})
});