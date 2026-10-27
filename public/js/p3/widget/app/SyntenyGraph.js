define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/SyntenyGraph.html", "../../util/PathJoin",
	"dojo/request", "./AppBase", "../../WorkspaceManager", "../WorkspaceObjectSelector",
    "dojo/query", "dojo/_base/lang", "dijit/Tooltip", "dijit/popup", "dojo/dom-construct",
    "dojo/when"

], function(declare, WidgetBase, on,
			domClass, 
			Template, PathJoin,
			xhr, AppBase, WorkspaceManager, 
            WorkspaceObjectSelector,query,lang,
            Tooltip, popup, domConstruct, when){
	return declare([AppBase], {
		"baseClass": "SyntenyGraph",
		applicationName: "SyntenyGraph",
		templateString: Template,
        requireAuth: true,
        result_grid: null,
        defaultPath: "",
		startingRows: 10,
		maxGenomes: 400,
        data: null,
	    genomeToAttachPt: ["comp_genome_id"],
        genomeGroupToAttachPt: ["user_genome_group"],
        addedGenomes: 0,
        groupsRemaining: 0,
        totalGroups: 0,
        final_gids:[],
        final_values:{},

		startup: function(){
            var _self = this;

			// activate genome group selector when user is logged in
			if(window.App.user){
				_self.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
            }

            if (this._started) {
                return;
            }
            if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
                return;
            }
            this.inherited(arguments);

			this.emptyTable(this.genomeTable, this.startingRows);
			this.numgenomes.startup();
			this.watch("groupsRemaining", lang.hitch(this, "checkSubmit"));
            this._started = true;
        },

		emptyTable: function(target, rowLimit){
			for(var i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0);
				domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
		},

		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
				if(attachname == "user_genome_group"){
					cur_value = this[attachname].searchBox.value;
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.user_genome_group);
					});

					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)
					{
						success = 0;
					}
				}
				else if(attachname == "comp_genome_id"){
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.comp_genome_id);
					});

					cur_value = this[attachname].value;

					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)
					{
						success = 0;
					}
				}
				else{
					cur_value = this[attachname].value;
				}

				if(typeof(cur_value) == "string"){
					target[attachname] = cur_value.trim();
				}
				else{
					target[attachname] = cur_value;
				}
				if(req && (!target[attachname] || incomplete)){
					if(browser_select){
						this[attachname].searchBox.validate();
						this[attachname].searchBox._set("state", "Error");
						this[attachname].focus = true;
					}
					success = 0;
				}
				else{
					this[attachname]._set("state", "");
				}
				if(target[attachname] != ""){
					target[attachname] = target[attachname] || undefined;
				}
				else if(target[attachname] == "true"){
					target[attachname] = true;
				}
				else if(target[attachname] == "false"){
					target[attachname] = false;
				}
			}, this);
			return (success);
		},

		onAddGenomeGroup: function(){
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + "</div>";
				domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					domConstruct.destroy(tr);
                    this.totalGroups -= 1;
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
                this.totalGroups += 1;
                this.getGListValues();
				this.increaseGenome();
			}
		},

		makeFeatureGroupName: function(){
			var name = this.user_genome_group.searchBox.get("displayedValue");
			var maxName = 36;
			var display_name = name;
			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}
			return display_name;
		},

        processingGroup: function(){
            this.workinggroup.set('value', Number(0));
        },
        finishedGroup: function(){
            this.workinggroup.set('value', Number(1));
        },

		increaseGenome: function(){
			this.addedGenomes = this.addedGenomes + 1;
			this.numgenomes.set('value', Number(this.addedGenomes));
		},
		decreaseGenome: function(){
			this.addedGenomes = this.addedGenomes - 1;
			this.numgenomes.set('value', Number(this.addedGenomes));
		},
		makeGenomeName: function(){
			var name = this.comp_genome_id.get("displayedValue");
			var maxName = 36;
			var display_name = name;
			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}
			return display_name;
		},

        getValues: function(){
			var cur_values = this.inherited(arguments);
            cur_values["genome_ids"] = [];
            Object.keys(this.genomeIdHash || {}).forEach(lang.hitch(this, function(v){
                cur_values.genome_ids.push(v);
            }));
            return cur_values;
        },

		getGListValues: function(){
            this.genomeIdHash = {};
			var compGenomeList = query(".genomedata");
            var genomeGroupPaths = [];
			compGenomeList.forEach(lang.hitch(this, function(item){
				if(item.genomeRecord.comp_genome_id){
                    this.genomeIdHash[item.genomeRecord.comp_genome_id] = true;
				}
				if(item.genomeRecord.user_genome_group){
                    var path = item.genomeRecord.user_genome_group;
                    if(path !== ''){
                        genomeGroupPaths.push(path);
                    }
                }
			}));
            if (genomeGroupPaths.length > 0){
                this.processingGroup();
                WorkspaceManager.getObjects(genomeGroupPaths, false).then(lang.hitch(this, function(objs){
                    objs.forEach(lang.hitch(this, function(obj){
                        var data = JSON.parse(obj.data);
                        data.id_list.genome_id.forEach(lang.hitch(this, function(d){
                            if(!this.genomeIdHash.hasOwnProperty(d)){
                                this.genomeIdHash[d] = true;
                            }
                        }));
                    }));
                    this.finishedGroup();
                }));
            }
		},

		onAddGenome: function(){
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + "</div>";
				domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
                this.getGListValues();
			}
		},

        checkSubmit: function(){
            if (this.groupsRemaining == 0 && this.submission){
                return true;
            }
            return false;
        }
	});
});
