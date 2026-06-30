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
            _self=this;

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
                
			//this.result = new ResultContainer({
			//	id: this.id + "_idmapResult",
			//	style: "min-height: 700px; visibility:hidden;"
			//});
			//this.result.placeAt(this.map_result_div);
			//this.result.startup();
            

			this.emptyTable(this.genomeTable, this.startingRows);
			this.numgenomes.startup();
            //this.map_result_div.style.display="none";
			//this.watch("data", lang.hitch(this, "onSetData"));
			this.watch("groupsRemaining", lang.hitch(this, "checkSubmit"));
            this._started = true;
        },


		constructor: function(){
			this.mapFromIDs = [];
			this.mapToIDs = [];
			this.watch("mapFromIDs", function(attr, oldVal, val){
				this.leftColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
			});

			this.watch("mapToIDs", function(attr, oldVal, val){
				this.rightColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
				this.rightList.set('value', val.join('\n'));
			});

		},

		
        onSetData: function(attr, oldVal, data){
            this.appSubmitForm.style.display="none";
            this.map_result_div.style.display="block";
            //setTimeout(function(){ startGraphViewer(data); }, 30000);
            startGraphViewer(data);
		},

		onChange: function(){
			console.log("onChangeType: ", this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			if(this.leftTypeSelect.get('value') && (this.mapFromIDs && (this.mapFromIDs.length > 0))){
				this.mapButton.set('disabled', false);
			}else{
				this.mapButton.set('disabled', false);
			}

		},
		emptyTable: function(target, rowLimit){
			for(i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0);//domConstr.create("tr",{},this.genomeTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
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
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.user_genome_group)
					});

					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success = 0;
					}
				}
				else if(attachname == "comp_genome_id"){
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.comp_genome_id)
					});

					cur_value = this[attachname].value;

					//console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success = 0;
					}
				}
				else{
					cur_value = this[attachname].value;
				}

				console.log("cur_value=" + cur_value);

				if(typeof(cur_value) == "string"){
					target[attachname] = cur_value.trim();
				}
				else{
					target[attachname] = cur_value;
				}
				if(req && (!target[attachname] || incomplete)){
					if(browser_select){
						this[attachname].searchBox.validate(); //this should be whats done but it doesn't actually call the new validator
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
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
			//console.log("this.featureGroupToAttachPt = " + this.featureGroupToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
                    this.totalGroups-=1;
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
                this.totalGroups+=1;
                this.getGListValues();
				this.increaseGenome();
			}
			//console.log(lrec);
		},
		makeFeatureGroupName: function(){
			var name = this.user_genome_group.searchBox.get("displayedValue");
			var maxName = 36;
			var display_name = name;
			//console.log("this.user_genomes_featuregroup name = " + this.name);

			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}
			return display_name;
		},

        processingGroup: function(){
            this.workinggroup.set('value',Number(0));
        },
        finishedGroup: function(){
            this.workinggroup.set('value',Number(1));
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

        getValues:function(){
			cur_values = this.inherited(arguments);
            cur_values["genome_ids"]=[];
            Object.keys(this.genomeIdHash).forEach(lang.hitch(this, function(v){cur_values.genome_ids.push(v)}));
            return cur_values;
        },

		getGListValues: function(){
            _self=this;
            this.genomeIdHash = {};
			var compGenomeList = query(".genomedata");
			var genomeIds = [];
			var userGenomes = [];
			var featureGroups = [];
			var refType = "";
			var refIndex = 0;

			/*else if(values["ref_user_genomes_featuregroup"]){
				refType = "ref_user_genomes_featuregroup";
				featureGroups.push(values["ref_user_genomes_featuregroup"]);
			}*/

            //synchronous loop
            genomeGroupPaths=[];
			compGenomeList.forEach(lang.hitch(this, function(item){
				if(item.genomeRecord.comp_genome_id){
                    this.genomeIdHash[item.genomeRecord.comp_genome_id] = true;
				}
				if(item.genomeRecord.user_genome_group){
                    var path = item.genomeRecord.user_genome_group; //this.genome_group.get('value');
                    if(path !== ''){
                        genomeGroupPaths.push(path);
                    }
                }
			}));
            if (genomeGroupPaths.length > 0){
                this.processingGroup();
                //asynchronous loop
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



			//console.log("compGenomeList = " + compGenomeList);
			//console.log("ref genome = " + values["ref_genome_id"]);

			//if(userGenomes.length > 0){
			//	this.final_gids += userGenomes;
			//}

			/*if(featureGroups.length > 0){
				seqcomp_values["user_feature_groups"] = featureGroups;
			}*/
			
            /*else if(refType == "ref_user_genomes_featuregroup"){
				refIndex = genomeIds.length + userGenomes.length + 1;
			}*/

		},

		onAddGenome: function(){
			//console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
			//console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
                this.getGListValues();
			}
			//console.log(lrec);
		},


		constructGraph: function(){
			console.log("constructGraph");
            //and(ne(feature_type,source),eq(annotation,PATRIC),in(genome_id,(1151215.3,1169664.3,656404.3)))&limit(2500000)&select(genome_id,
            //genome_name,accession,annotation,feature_type,patric_id,refseq_locus_tag,alt_locus_tag,uniprotkb_accession,start,end,strand,
            //na_length,gene,product,figfam_id,plfam_id,pgfam_id,go,ec,pathway)&sort(+genome_id,+sequence_id,+start)&http_accept=text/tsv
            //https://www.patricbrc.org/api/genome_feature/?and(ne(feature_type,source),eq(sequence_id,NC_008268))&sort(+genome_id,+sequence_id,+start)&http_accept=text/tsv
            //handle async
            this.submission = true;
            if ( this.totalGroups > 0) {
                this.groupsRemaining = this.totalGroups; 
                this.getValues();
            }
            else {
                this.getValues();
                this.checkSubmit();
            }
        },


        checkSubmit: function(){
            if (this.groupsRemaining == 0 && this.submission){
			    console.log("call to constructGraph");
                //this.requestGraph();
                return true;
            }
            return false;
        },

		requestGraph: function(){

            if (this.final_gids.length >0){

                var q="and(ne(feature_type,source),eq(annotation,PATRIC),in(genome_id,("+this.final_gids.join(",")+
                    ")))&limit(2500000)&select(genome_id,genome_name,accession,annotation,feature_type,"+
                    "patric_id,refseq_locus_tag,alt_locus_tag,uniprotkb_accession,start,end,strand,na_length,"+
                    "gene,product,figfam_id,plfam_id,pgfam_id,go,ec,pathway)&sort(+genome_id,+sequence_id,+start)";
                
                console.log("Panaconda! ", q)
                var msgDiv = domConstruct.create("div", {innerHTML: "Working. This takes a couple minutes."}, this.msgVessel);
                this.mapButton.setDisabled(true);
                return when(window.App.api.data("panaconda", [q,this.alpha.value, this.ksize.value, this.context.value, this.diversity.value]), lang.hitch(this, function(res){
                    console.log("Panaconda Results: ");
                    x=(new window.DOMParser());
                    res=x.parseFromString(res.graph, "text/xml");
                    this.set('data', res);
                }))
            }
            
			/*var from = this.leftTypeSelect.get('value');
			var to = this.rightTypeSelect.get('value');
            var via = "gene_id";
            via= this.joinUsing.get('value');

			//var ids = this.mapFromIDs.map(encodeURIComponent).join(",");
			var ids = this.mapFromIDs.join(",");
			var q;
            var fromIdGroup = null;
            var toIdGroup = null;
            var patric_id_group ={"patric_id":"","feature_id":"","P2_feature_id":"","alt_locus_tag":"","refseq_locus_tag":"","gene_id":"","gi":"","refseq":""};

            fromIdGroup = (from in patric_id_group) ? "PATRIC" : "OTHER";
            toIdGroup = (to in patric_id_group) ? "PATRIC" : "OTHER";

			var _self = this;

            if (this.leftList.get('value').replace(/^\s+|\s+$/gm,'') != ""){

			    console.log("ids: ", ids);
			    query(".idmap_result_div .GridContainer").style("visibility", "visible");
			    query(".PerspectiveTotalCount").style("visibility", "visible");
                _self.result.set('state', {"fromIdGroup": fromIdGroup, "joinId":via, "fromId": from, "toIdGroup":toIdGroup, "toId":to, "fromIdValue":ids});
            }

			return;
			if(ids && (ids.length > 0)){
				switch(from){
					case "UniProtKB-ID":
						q = "in(uniprotkb_accession,(" + ids + "))";
						break;
					default:
						q = 'in(id_value,(' + ids + '))&eq(id_type,' + from + ')&limit(99999)'
				}
			}

			console.log('ID MAP Query: ', q);
			xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}).then(function(res){
				console.log("RES: ", res);
				var uniprotIDs = res.map(function(item){
					return item['uniprotkb_accession']
				});

				var lq = 'in(uniprotkb_accession,(' + uniprotIDs.join(',') + '))&eq(id_type,' + to + ')'
				xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
					handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
					},
					data: lq
				}).then(function(res){
					_self.set('mapToIDs', res.map(function(x){
						return x['id_value'];
					}));
					console.log("RES: ", res);
				});
			});*/
		}
	});
});
