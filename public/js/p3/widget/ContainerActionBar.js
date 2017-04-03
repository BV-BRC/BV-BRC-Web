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
			this.pathContainer = domConstruct.create("div", {"class": "wsBreadCrumbContainer"}, this.domNode);
			this.containerNode = domConstruct.create("span", {
				"class": "ActionButtonContainer wsActionContainer"
			}, this.domNode);
		},

		generatePathLinks: function(path){
			// strip out /public/
			var parts = path.replace(/\/+/g, '/').split("/");
			if(parts[1] == 'public'){
				parts.splice(1, 1)
			}

			if(parts[0] == ""){
				parts.shift();
			}
			var len = parts.length;
			var out = ["<span class='wsBreadCrumb'>"];
			var bp = ["workspace"];

			if (path == '/public/') {
				out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>')
			}else if(path.replace(/\/+/g, '/').split('/')[1] == 'public'){
				out.push('<i class="icon-globe"></i> '+
					'<a class="navigationLink perspective" href="/'+bp.join("/")+'/public">Public Workspaces</a>'+
					' <i class="icon-caret-right"></i> ')
			}

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
