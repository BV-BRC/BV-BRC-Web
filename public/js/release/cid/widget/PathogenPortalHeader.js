define("cid/widget/PathogenPortalHeader", [
	"dojo/_base/declare", "dijit/_WidgetBase","dojo/dom-attr",
	"dojo/topic","rql/query"
], function(
	declare, WidgetBase,domAttr,
	Topic,rql
){
	return declare([WidgetBase], {
		fixed: true,
		baseClass: "HeaderBar",
		region: "top",
		postCreate: function(){
			this.on("a:click,.MultiButton:click", function(evt){
				console.log("Header Menu Click", evt.target);
				var dest = domAttr.get(evt.target,'href');
				var rel = domAttr.get(evt.target, "rel");
				console.log("dest: ", dest, "rel: ", rel);
				evt.stopPropagation();
				evt.preventDefault();
				var parts = dest.split("?");
				var query = parts[1] || "";
				var q = rql.Query(query);
				var state = {
					widgetClass: rel,
					href: dest
				}
	                        q.args.forEach(function(term) {
					console.log('term',term)
					if (term.name == "filter") {
						state.filter=term.args[0].toString();
					}

				});

				Topic.publish("/navigate", state);
			});
		}
	});
});
