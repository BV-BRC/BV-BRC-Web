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
			// strip out /public/ of parts array
			var parts = path.replace(/\/+/g, '/').split("/");
			if(parts[1] == 'public'){
				parts.splice(1, 1);
			}

			if(parts[0] == ""){
				parts.shift();
			}
			var len = parts.length;
			var out = ["<span class='wsBreadCrumb'>"];
			var bp = ["workspace"];

			var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

			// if viewing all public workspaces, just create header
			if (path == '/public/') {
				out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>')

			// if viewing a specific public workspace, create bread crumbs
			}else if(isPublic){
				out.push('<i class="icon-globe"></i> '+
					'<a class="navigationLink perspective" href="/'+bp.join("/")+'/public">Public Workspaces</a>'+
					' <i class="icon-caret-right"></i> ')
			}


			parts.forEach(function(part, idx){
				if(idx == (parts.length - 1)){
					out.push('<b class="perspective">' + part.replace("@patricbrc.org", "") + '</b>');
					return;
				}

				// don't create links for top level path of public path
				if(isPublic && idx == 0){
					out.push('<b class="perspective">' + ((idx == 0) ? part.replace("@patricbrc.org", "") : part) + '</b> / ');
					return;
				};

				out.push("<a class='navigationLink' href='");
				bp.push(part);
				out.push("/" + bp.join("/"));
				out.push("'>" + ((idx == 0) ? part.replace("@patricbrc.org", "") : part) + "</a> / ");
			});

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
