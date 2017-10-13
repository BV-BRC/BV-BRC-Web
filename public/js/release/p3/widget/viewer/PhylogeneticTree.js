define("p3/widget/viewer/PhylogeneticTree", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/dom-construct", "dojo/request", "dojo/when",
	"dijit/layout/ContentPane",
	"./Base", "../../util/PathJoin", "../Phylogeny", "../../WorkspaceManager"
], function(declare, lang,
			domConstruct, request, when,
			ContentPane,
			ViewerBase, PathJoin, Phylogeny, WorkspaceManager){
	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
        displayName: null,
		containerType: "phylogenetic_tree",
		perspectiveLabel: "Phylogenetic Tree",
		perspectiveIconClass: "icon-selection-Experiment",
		apiServiceUrl: window.App.dataAPI,

		onSetState: function(attr, oldVal, state){
			// console.warn("TE onSetState", state);

			if(!state){
				return;
			}

			this.viewer.set('visible', true);

			this.buildHeaderContent(state);
			window.document.title = 'Phylogenetic Tree';
		},

		buildHeaderContent: function(state){

			// be strict to single public experiment to display further header info.
			/*var check = state.search.match(/^eq\(eid,\((.*)\)\)/);
			if(check && !isNaN(check[1])){
				var eid = check[1];
				var self = this;
				// console.log("found eid", eid);
				return when(request.get(PathJoin(this.apiServiceUrl, "transcriptomics_experiment", eid), {
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded"
					},
					handleAs: "json"
				}), function(exp){

					self.queryNode.innerHTML = "<b>" + exp.title + "</b>";
					self.totalCountNode.innerHTML = " ( " + exp.samples + " Comparisons )";
				});
			}*/
		},

		postCreate: function(){
			if(!this.state){
				this.state = {};
			}

            var _self = this;

			this.viewer = new Phylogeny({
				region: "center",
				id: this.id + "_Phylogeny",
				state: this.state,
                gutters: false,
                tgState: null,
                loadingMask: null,
                apiServer: window.App.dataServiceURL,
			});

			this.viewerHeader = new ContentPane({
				content: "",
				region: "top"
			});

			/*var headerContent = domConstruct.create("div", {"class": "PerspectiveHeader"});
			domConstruct.place(headerContent, this.viewerHeader.containerNode, "last");
			domConstruct.create("i", {"class": "fa PerspectiveIcon " + this.perspectiveIconClass}, headerContent);
			domConstruct.create("div", {
				"class": "PerspectiveType",
				innerHTML: this.perspectiveLabel
			}, headerContent);
			this.queryNode = domConstruct.create("span", {"class": "PerspectiveQuery"}, headerContent);

			this.totalCountNode = domConstruct.create("span", {
				"class": "PerspectiveTotalCount"
			}, headerContent);*/
			this.addChild(this.viewerHeader);
			this.addChild(this.viewer);
			this.inherited(arguments);
            var dataFiles = [];
			var check = this.state.search.match(/wsTreeId=.*/);
			if(check && !isNaN(check["index"])){
                var objPathParts = check[0].split("=")[1].split("/");
                var objName = objPathParts.pop();
                this.displayName = decodeURIComponent(objName);
                objName = "."+ objName;
                objPathParts.push(objName);
                var objPath = decodeURIComponent(objPathParts.join("/"));
                WorkspaceManager.getFolderContents(objPath, true, true)
                    .then(function(objs){
                        //console.log("[JobResult] objects: ", objs);
                        Object.values(objs).forEach(function(obj){
                            if (obj.type == "json"){
                                dataFiles.push(obj.path);
                            }
                        });
                        if (dataFiles.length == 1){
                            WorkspaceManager.getObjects(dataFiles, false)
                                .then(function(curFiles){
                                    var treeDat= {};
                                    if(curFiles.length == 1){
                                        treeDat = JSON.parse(curFiles[0].data);
                                        treeDat.info.taxon_name = _self.displayName;
                                    }
                                    _self.viewer.processTreeData(treeDat);
                                });
                        }
                });
            }

		}
	});
});
