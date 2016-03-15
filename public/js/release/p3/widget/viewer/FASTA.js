define("p3/widget/viewer/FASTA", [
	"dojo/_base/declare", "dijit/layout/ContentPane", "./Base",
	"dojo/request", "../../util/PathJoin"
], function(declare, ContentPane, Base,
			Request, PathJoin){
	return declare([Base], {
		dataModel: "genome_feature",
		limit: 25000,
		onSetState: function(attr, oldVal, state){
			var parts = state.pathname.split("/");
			var type = "dna";
			if(parts && (parts.length > 2) && parts[parts.length - 2]){
				var type = parts[parts.length - 2];
			}

			if(!state.search){
				console.log("NO STATE");
				return;
			}
			var query = state.search;
			query = query + "&http_accept=application/" + type + "+fasta&limit(" + this.limit + ")";

			console.log("FASTA Query URL : ", PathJoin(this.apiServiceUrl, this.dataModel, "?" + query));

			this.contentPanel.set("href", PathJoin(this.apiServiceUrl, this.dataModel, "?" + query));

		},
		startup: function(){
			var query;
			if(this._started){
				return;
			}
			if(this.state && this.state.search){
				query = this.state.search;
				var parts = this.state.pathname.split("/");
				var type = "dna";
				if(parts && (parts.length > 2) && parts[parts.length - 2]){
					var type = parts[parts.length - 2];
				}
				query = query + "&http_accept=application/" + type + "+fasta&limit(" + this.limit + ")";
				query = PathJoin(this.apiServiceUrl, this.dataModel, "?" + query);
			}

			this.header = new ContentPane({
				content: '<div style="padding: 4px;text-align:right;border:1px solid #ddd;"><i class="fa icon-download fa-2x"></i></div>',
				region: "top",
				style: "padding:4px;"
			});

			this.contentPanel = new ContentPane({
				region: "center",
				href: (query ? query : ""),
				style: "word-wrap:break-word;font-family:monospace;white-space:pre;margin:1em;font-size:1.1em;"
			});
			this.addChild(this.header);
			this.addChild(this.contentPanel);

			this.inherited(arguments);
		}
	})
});