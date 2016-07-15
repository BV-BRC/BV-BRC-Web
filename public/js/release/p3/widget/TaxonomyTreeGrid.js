define("p3/widget/TaxonomyTreeGrid", [
	"dojo/_base/declare", "dgrid/OnDemandGrid", "dgrid/tree", "dojo/on", "dgrid/Selection",
	"../store/TaxonomyJsonRest", "dgrid/extensions/DijitRegistry", "dojo/_base/lang","dgrid/selector"

], function(declare, Grid, Tree, on, Selection,
			Store, DijitRegistryExt, lang,selector){
	return declare([Grid, DijitRegistryExt, Selection], {
		constructor: function(){
			this.queryOptions = {
				sort: [{attribute: "taxon_name", descending: false}]
			};
			console.log("this.queryOptions: ", this.queryOptions);
		},
		store: new Store({}),
		columns: [
			selector({}),
			Tree({
				label: "Name", field: "taxon_name", shouldExpand: function(row, level, prevExpanded){
					return (prevExpanded || (level < 1))
				}
			}),
			{label: "Rank", field: "taxon_rank"},
			{label: "Genomes", field: "genomes", style: "width:50px;"}
		],
		startup: function(){
			var _self = this;
			//sort: [{attribute: "taxon_name"}];

			this.on(".dgrid-content .dgrid-row:dblclick", function(evt){
				var row = _self.row(evt);
				//console.log("dblclick row:", row);
				on.emit(_self.domNode, "ItemDblClick", {
					item_path: row.data.path,
					item: row.data,
					bubbles: true,
					cancelable: true
				});
				console.log("CLICK TREE ITEM: ", row.data);
			});

			this.on("dgrid-select", function(evt){
				// console.log('dgrid-select: ', evt);
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "select", newEvt);
				//console.log("dgrid-select");
				//var rows = evt.rows;
				//Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
				//var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
				//Topic.publish("/select", sel);
			});

			this.on("dgrid-deselect", function(evt){
				// console.log("dgrid-select");
				var newEvt = {
					rows: evt.rows,
					selected: evt.grid.selection,
					grid: _self,
					bubbles: true,
					cancelable: true
				};
				on.emit(_self.domNode, "deselect", newEvt);
				return;
			});

			// this.on("dgrid-refresh-complete", lang.hitch(this,function(){
			// 	console.log("Refresh complete, expand first row");
			// 	setTimeout(lang.hitch(this, function(){
			// 		this.expand(0,true);
			// 	}),250);
			// }))

			this.inherited(arguments);
		}

	});
});
