define([
	"dojo/_base/declare", "./ActionBar",
	"dojo/dom-construct"
], function(declare, ActionBar,
			domConstruct){
	return declare([ActionBar], {
		path: null,
		"class": "WSContainerActionBar",
		tooltipPosition: ["above", "below"],
		_setPathAttr: function(p){
			this.path = p;
			if(this._started){
				this.pathContainer.innerHTML = this.generatePathLinks(p);
			}
		},

		postCreate: function(){
			this.inherited(arguments);
			this.pathContainer = domConstruct.create("div", {
				style: {
					display: "inline-block",
					"padding-top": "8px"
				}
			}, this.domNode);
			this.containerNode = domConstruct.create("span", {"class": "ActionButtonContainer"}, this.domNode);
		},

		generatePathLinks: function(path){
			var parts = path.split("/");
			if(parts[0] == ""){
				parts.shift();
			}
			var len = parts.length;
			var out = ["<span class='wsBreadCrumb'>"];
			var bp = ["workspace"];
			// console.log("parts: ", parts);
			parts.forEach(function(p, idx){
				if(idx == (parts.length - 1)){
					out.push(p + "&nbsp;");
					return;
				}
				out.push("<a class='navigationLink' href='");
				bp.push(p);
				out.push("/" + bp.join("/"));
				out.push("'>" + ((idx == 0) ? p.replace("@patricbrc.org", "") : p) + "</a>&nbsp;/&nbsp;");
			});
			//out.push("<span>" + parts.join("/") + "</span>");
			return out.join("");
		},

		startup: function(){
			if(this.path){
				this.pathContainer.innerHTML = this.generatePathLinks(this.path);
			}

			this.inherited(arguments);
		}

	});
});
