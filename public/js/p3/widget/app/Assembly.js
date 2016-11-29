define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Assembly.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", 
    "dijit/TooltipDialog", "dojo/NodeList-traverse", "../../WorkspaceManager",
    "dojo/store/Memory"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstruct,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog,
            children, WorkspaceManager, Memory){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		pageTitle: "Genome Assembly Service",
		templateString: Template,
		applicationName: "GenomeAssembly",
		libraryData: null,
		defaultPath: "",
		startingRows: 8,
        libCreated: 0,

		constructor: function(){

			this.addedLibs={counter:0};
			this.addedPairs = 0;
			this.pairToAttachPt1 = ["read1", "read2"];
			this.pairToAttachPt2 = ["read1"];
			this.advPairToAttachPt = ["interleaved", "insert_size_mean", "insert_size_stdev", "read_orientation_outward","paired_platform"];
			this.paramToAttachPt = ["recipe", "output_path", "output_file", "reference_assembly"];
			this.singleToAttachPt = ["single_end_libs"];
            this.advSingleToAttachPt = ["single_platform"];
            this.libraryStore= new Memory({data: [],idProperty:"_id"});
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			var _self = this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);
			for(i = 0; i < this.startingRows; i++){
				var tr = this.libsTable.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
			this.numlibs.startup();
			//create help dialog for infobutton's with infobuttoninfo div's
			this.advrow.turnedOn = (this.advrow.style.display != 'none');
			on(this.advanced, 'click', lang.hitch(this, function(){
				this.advrow.turnedOn = (this.advrow.style.display != 'none');
				if(!this.advrow.turnedOn){
					this.advrow.turnedOn = true;
					this.advrow.style.display = 'block';
					this.advicon.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow.turnedOn = false;
					this.advrow.style.display = 'none';
					this.advicon.className = "fa icon-caret-down fa-1";
				}
			}));

			this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
			on(this.advanced2, 'click', lang.hitch(this, function(){
				this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
				if(!this.advrow2.turnedOn){
					this.advrow2.turnedOn = true;
					this.advrow2.style.display = 'block';
					this.advicon2.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow2.turnedOn = false;
					this.advrow2.style.display = 'none';
					this.advicon2.className = "fa icon-caret-down fa-1";
				}
			}));
			this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
			on(this.advanced3, 'click', lang.hitch(this, function(){
				this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
				if(!this.advrow3.turnedOn){
					this.advrow3.turnedOn = true;
					this.advrow3.style.display = 'block';
					this.advicon3.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow3.turnedOn = false;
					this.advrow3.style.display = 'none';
					this.advicon3.className = "fa icon-caret-down fa-1";
				}
			}));
			this.pairToAttachPt1.concat(this.singleToAttachPt).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
						return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")" + (this.required ? "" : "?") + "$")).test(value) &&
							(!this._isEmpty(value)) &&
							(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
					}
				)
			}));

			this.interleaved.turnedOn = (this.interleaved.value == "true");
			on(this.interleaved, 'change', lang.hitch(this, function(){
				if(this.interleaved.turnedOn){
					this.interleaved.turnedOn = false;
					//this.read2block.style.visibility='visible';
					this.read2.set('disabled', false);
				}
				else{
					this.interleaved.turnedOn = true;
//					this.read2block.style.visibility='hidden';
					this.read2.set('disabled', true);
				}
			}));

			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started = true;
		},
		getValues: function(){
			if(typeof String.prototype.startsWith != 'function'){
				String.prototype.startsWith = function(str){
					return this.slice(0, str.length) == str;
				};
			}
			var assembly_values = {};
			var values = this.inherited(arguments);
			if(values.hasOwnProperty("pipeline") && values["pipeline"]){
				assembly_values["pipeline"] = values["pipeline"];
			}
			if(values.hasOwnProperty("min_contig_len") && values["min_contig_len"]){
				assembly_values["min_contig_len"] = values["min_contig_len"];
			}
			if(values.hasOwnProperty("min_contig_cov") && values["min_contig_cov"]){
				assembly_values["min_contig_cov"] = values["min_contig_cov"];
			}
			var pairedList = this.libraryStore.query({"_type":"paired"});
			var singleList = this.libraryStore.query({"_type":"single"});
			var pairedLibs = [];
			var singleLibs = [];
			this.ingestAttachPoints(this.paramToAttachPt, assembly_values, true);
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		assembly_values[k]=values[k];
			//	}
			//}
			this.pairToAttachPt1 = ["read1", "read2"];
			this.pairToAttachPt2 = ["read1"];
			this.advPairToAttachPt = ["interleaved", "insert_size_mean", "insert_size_stdev", "read_orientation_outward","paired_platform"];
			this.paramToAttachPt = ["recipe", "output_path", "output_file", "reference_assembly"];
			this.singleToAttachPt = ["single_end_libs"];
            this.advSingleToAttachPt = ["single_platform"];
            pairedLibs = pairedList.map(function(lrec){
                var rrec ={};
                Object.keys(lrec).forEach(lang.hitch(this, function(attr){
                    if(!attr.startsWith("_")){
                        rrec[attr]=lrec[attr];
                    }
                }));
                return rrec;
            });
			if(pairedLibs.length){
				assembly_values["paired_end_libs"] = pairedLibs;
			}
            singleLibs = singleList.map(function(lrec){
                var rrec ={};
                Object.keys(lrec).forEach(lang.hitch(this, function(attr){
                    if(!attr.startsWith("_")){
                        rrec[attr]=lrec[attr];
                    }
                }));
                return rrec;
            });
			if(singleLibs.length){
				assembly_values["single_end_libs"] = singleLibs;
			}
			return assembly_values;

		},
		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
            var duplicate =false;
            if (target._type){
                target["_id"]=this.makeLibraryID(target._type);
                duplicate = target._id in this.libraryStore.index;
            }
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
                var alias = attachname;
				if(attachname == "read1" || attachname == "read2" || attachname == "single_end_libs"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
					browser_select = 1;
				}
				else if(attachname == "output_path"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value="/_uuid/"+this[attachname].searchBox.value;
					//cur_value=this[attachname].searchBox.get('value');
					browser_select = 1;
				}
				else{
					cur_value = this[attachname].value;
				}

                //Assign cur_value to target
				if(attachname == "paired_platform" || attachname == "single_platform"){
                    alias="platform";
                }

				if(attachname == "single_end_libs"){
                    alias="read";
                }
                if(typeof(cur_value) == "string"){
					target[alias] = cur_value.trim();
				}
				else{
					target[alias] = cur_value;
				}
				if(req && (duplicate || !target[alias] || incomplete)){
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
				if(target[alias] != ""){
					target[alias] = target[alias] || undefined;
				}
				else if(target[alias] == "true"){
					target[alias] = true;
				}
				else if(target[alias] == "false"){
					target[alias] = false;
				}
			}, this);
			return (success);
		},

		makeLibraryName:function(mode){
            if(mode == "paired"){
                var fn =this.read1.searchBox.get("displayedValue");
                var fn2 =this.read2.searchBox.get("displayedValue");
                var maxName=14;
                if(fn.length > maxName){
                    fn=fn.substr(0,(maxName/2)-2)+"..."+fn.substr((fn.length-(maxName/2))+2);
                }
                if(fn2.length > maxName){
                    fn2=fn2.substr(0,(maxName/2)-2)+"..."+fn2.substr((fn2.length-(maxName/2))+2);
                }
                return "P("+fn+", "+fn2+")";
            }
            else {

                var fn =this.single_end_libs.searchBox.get("displayedValue");;
                            maxName=24
                if(fn.length > maxName){
                    fn=fn.substr(0,(maxName/2)-2)+"..."+fn.substr((fn.length-(maxName/2))+2);
                }
                return "S("+fn+")";
            }
		},
        makeLibraryID:function(mode){
            if(mode == "paired"){
                var fn =this.read1.searchBox.get("value");
                var fn2 =this.read2.searchBox.get("value");
                return fn+fn2;
            }
            else{
                var fn = this.single_end_libs.searchBox.get("value");
                return fn;
            }
        },
		
        onReset: function(evt){
			domClass.remove(this.domNode, "Working");
			domClass.remove(this.domNode, "Error");
			domClass.remove(this.domNode, "Submitted");
            var toDestroy = [];
            this.libraryStore.data.forEach(lang.hitch(this,function(lrec){ 
                toDestroy.push(lrec["_id"]);
		    }));
            //because its removing rows cells from array needs separate loop
            toDestroy.forEach(lang.hitch(this,function(id){
                this.destroyLibRow(query_id=id, "_id");
            }));
        },


        //counter is a widget for requirements checking
		increaseRows: function(targetTable, counter, counterWidget){
			counter.counter= counter.counter+1;
            if (typeof counterWidget != "undefined"){
			    counterWidget.set('value',Number(counter.counter));
            }
		},
		decreaseRows: function(targetTable, counter, counterWidget){
			counter.counter = counter.counter-1;
            if (typeof counterWidget != "undefined"){
			    counterWidget.set('value',Number(counter.counter));
            }
		},



		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {_type:"single"};
			var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
			this.ingestAttachPoints(this.advSingleToAttachPt, lrec, false)
			if(chkPassed){
                infoLabels = {
                    "platform":{"label":"Platform","value":1},
                    "read":{"label":"Read File","value":1}
                };
                this.addLibraryRow(lrec, infoLabels, "singledata");
			}
		},
        
        destroyLibRow:function(query_id, id_type){
            console.log("Delete Rows");
            var query_obj={};
            query_obj[id_type]=query_id;
            var toRemove=this.libraryStore.query(query_obj);
            toRemove.forEach(function(obj){
                domConstruct.destroy(obj._row);
                this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
                if (this.addedLibs.counter < this.startingRows){
                    var ntr = this.libsTable.insertRow(-1);
                    var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
                    var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
                    var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
                }
                obj._handle.remove();
                this.libraryStore.remove(obj._id);
            },this);
        },

		onAddPair: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {_type:"paired"};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest = this.interleaved.turnedOn ? this.pairToAttachPt2 : this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
			var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
			this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if(chkPassed){
                infoLabels = {
                    "platform":{"label":"Platform","value":1},
                    "read1":{"label":"Read1","value":1},
                    "read2":{"label":"Read2","value":1},
                    "interleaved":{"label":"Interleaved","value":0},
                    "insert_size_mean":{"label":"Mean Insert Size","value":1},
                    "insert_size_stdev":{"label":"Std. Insert Size","value":1},
                    "read_orientation_outward":{"label":"Mate Paired","value":0}
                };
                this.addLibraryRow(lrec, infoLabels, "pairdata");
            }
		},

        addLibraryRow: function(lrec, infoLabels, mode){
            var tr = this.libsTable.insertRow(0);
            lrec["_row"]=tr;
            var td = domConstruct.create('td', {"class": "textcol "+mode, "libID": this.libCreated, innerHTML: ""}, tr);
            var advInfo = [];
            if(mode=="pairdata"){
                td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("paired") + "</div>";
                advInfo.push("Paired Library");
            }
            else{
                td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("single") + "</div>";
                advInfo.push("Single Library");
            }
            //fill out the html of the info mouse over
            Object.keys(infoLabels).forEach(lang.hitch(this,function(key){
                if (lrec[key] && lrec[key]!="false"){
                    if(infoLabels[key].value){
                        advInfo.push(infoLabels[key].label+":"+lrec[key]);
                    }
                    else{
                        advInfo.push(infoLabels[key].label);
                    }
                }
            }));
            if(advInfo.length){
                var tdinfo = domConstruct.create("td", {innerHTML: "<i class='fa icon-info fa-1' />"}, tr);
                var ihandle = new TooltipDialog({
                    content: advInfo.join("</br>"),
                    onMouseLeave: function(){
                        popup.close(ihandle);
                    }
                });
                on(tdinfo, 'mouseover', function(){
                    popup.open({
                        popup: ihandle,
                        around: tdinfo
                    });
                });
                on(tdinfo, 'mouseout', function(){
                    popup.close(ihandle);
                });
            }
            else{
                var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
            }
            var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
            if(this.addedLibs.counter < this.startingRows){
                this.libsTable.deleteRow(-1);
            }
            var handle = on(td2, "click", lang.hitch(this, function(evt){
                this.destroyLibRow(query_id=lrec["_id"], "_id");
            }));
            this.libraryStore.put(lrec);
            lrec["_handle"]=handle;
			this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
        }
	});
});

