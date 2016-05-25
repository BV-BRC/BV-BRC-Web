define("p3/widget/AdvancedSearch", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/dom-construct",
	"dojo/dom-class", "./viewer/Base", "./Button", "dijit/registry", "dojo/_base/lang",
	"dojo/dom", "dojo/topic", "dijit/form/TextBox", "dojo/keys", "dijit/_FocusMixin", "dijit/focus",
	"dijit/layout/ContentPane","dojo/request"
], function(declare, WidgetBase, on, domConstruct,
			domClass,base, Button, Registry, lang,
			dom, Topic, TextBox, keys, FocusMixin, focusUtil,
			ContentPane,Request
){
	return declare([base], {
		"baseClass": "AdvancedSearch",
		"disabled": false,
		searchTypes: ["genome","genome_feature", "taxonomy"],
		onSetState: function(attr,oldval,state){
			console.log("onSetState: ", state.search);

			if (state.search){
				if (this.viewHeader){
					this.viewHeader.set("content", state.search);
				}

				this.search(state.search);

			}else{


			}
		},
		searchResults: null,

		formatgenome: function(docs,total){
			var out=["<div>",'<div style="size:1.1em;border-bottom:1px solid #ddd;"><a href="/view/GenomeList/?',this.state.search,'">Genomes</a>&nbsp;( ', total, ")</div>"];

			docs.forEach(function(doc){
				out.push("<div style='margin:8px;margin-left:15px;'>" + doc.genome_name + "</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		formatgenome_feature: function(docs,total){
			var out=["<div>",'<div style="size:1.1em;border-bottom:1px solid #ddd;"><a href="/view/FeatureList/?',this.state.search,'">Genome Features</a>&nbsp;( ', total, ")</div>"];
			docs.forEach(function(doc){
				out.push("<div style='margin:8px;margin-left:15px;'>" + doc.product + "</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		formattaxonomy: function(docs,total){
			var out=["<div>",'<div style="size:1.1em;border-bottom:1px solid #ddd;"><a href="/view/Taxonomy/?',this.state.search,'">Taxonomy</a>&nbsp;( ', total, ")</div>"];
			
			docs.forEach(function(doc){
				out.push("<div style='margin:8px;margin-left:15px;'>" + doc.taxon_name + "</div>");
			})
			out.push("</div>");
			return out.join("");
		},

		_setSearchResultsAttr: function(val){
			this.searchResults=val;
			console.log("Search Results: ", val);
			var content = Object.keys(val).map(function(type){
				var tRes = val[type];
				var total = (tRes&&tRes.result&&tRes.result.response)?tRes.result.response.numFound:0
				var out = ["<div><div>",type, "(",total,")</div>"];
				if (total>0){
					var docs = tRes.result.response.docs;
					if (this["format" + type]){
						return this["format" + type](docs,total);
					}
				}
			},this)
			if (this.viewer){
				this.viewer.set('content', content.join(""));
			}
		},

		"search": function(query){
			var q = {}
			var self=this;

			this.searchTypes.forEach(function(type){
				q[type] = {dataType: type, accept: "application/solr+json", query: query + "&limit(3)" }
			})

			console.log("SEARCH: ", q);

			Request.post(window.App.dataAPI + "query/", {
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				handleAs: "json",
				data: JSON.stringify(q)
			}).then(function(searchResults){
				self.set("searchResults", searchResults)
			})


		},
		postCreate: function(){
			this.inherited(arguments);
			this.viewHeader = new ContentPane({
				content: "Top",
				region: "top"
			});
			this.viewer = new ContentPane({
				region: "center",
				content: "content"
			});

			this.addChild(this.viewHeader);
			this.addChild(this.viewer);
		}
	});
});


