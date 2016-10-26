require({cache:{
'url:p3/widget/app/templates/Variation.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Variation Analysis</h3>\n            <p>Identify and annotate sequence variation (SNP, MNP, indel) relative to a closely related reference\n                genome.</p>\n        </div>\n        <div class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\"\n                       data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"1\" required=\"true\"\n                       data-dojo-attach-point=\"numCondWidget\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <table class=\"assemblyblocks\" style=\"width:100%\">\n                <tr>\n                    <td>\n                        <div id=\"pairedBox\" class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\"> Paired read library</label>\n                                    <div name=\"pairinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\"></i>\n                                    </div>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\">\n                                    <i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File 1</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\"\n                                     data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div data-dojo-attach-point=\"read2block\">\n                                    <label class=\"paramlabel\">Read File 2</label><br>\n                                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\"\n                                         data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\"\n                                         data-dojo-props=\"type:['reads'],multi:false\"></div>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">Single read library</label>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddSingle\"\n                                        class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\"\n                                     data-dojo-attach-point=\"read\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                        </div>\n\n                    </td>\n                    <td>\n                        <div class=\"appBox appShadow\" style=\"min-height: 224px; height:auto; width:330px\">\n                            <div class=\"headerrow\">\n                                <label class=\"appBoxLabel\">Selected libraries</label>\n                                <div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                                <br>\n                                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n                            </div>\n                            <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\"\n                                       style='margin:0 0 0 10px; width:90%;'>\n                                    <tbody data-dojo-attach-point=\"libsTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n                <tr>\n                    <td>\n                        <div id=\"pipelineBox\" class=\"appBox appShadow\">\n                            <div style=\"width:85%;display:inline-block;\">\n                                <label class=\"appBoxLabel\">Parameters</label>\n                                <div name=\"pipelineinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Aligner</label><br>\n                                <select data-dojo-type=\"dijit/form/Select\" name=\"mapper\" data-dojo-attach-point=\"mapper\"\n                                        style=\"width:300px\" required=\"true\"\n                                        data-dojo-props=\"intermediateChanges:true,missingMessage:'A strategy must be chosen',trim:true,placeHolder:'MySubFolder'\">\n                                    <option value=\"BWA-mem\">BWA-mem</option>\n                                    <option value=\"BWA-mem-strict\">BWA-mem-strict</option>\n                                    <option value=\"Bowtie2\">Bowtie2</option>\n                                    <option value=\"MOSAIK\">MOSAIK</option>\n                                    <option value=\"LAST\">LAST</option>\n                                </select>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">SNP caller</label><br>\n                                <select data-dojo-type=\"dijit/form/Select\" name=\"caller\" data-dojo-attach-point=\"caller\"\n                                        style=\"width:300px\" required=\"true\"\n                                        data-dojo-props=\"intermediateChanges:true,missingMessage:'SNP calling software to use',trim:true,placeHolder:'MySubFolder'\">\n                                    <option value=\"FreeBayes\">FreeBayes</option>\n                                    <option value=\"SAMtools\">SAMtools</option>\n                                </select>\n                            </div>\n                            <div class=\"appRow\">\n                                <div class=\"appField\">\n                                    <label>Target Genome</label><br>\n                                    <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                         data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_name\" maxHeight=200\n                                         style=\"width:100%\" required=\"true\"\n                                         data-dojo-attach-point=\"genome_nameWidget\"></div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Folder</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\"\n                                     data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"type:['folder'],multi:false\"\n                                     data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Name</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\"\n                                     data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                            </div>\n\n                        </div>\n                    </td>\n                    <td>\n                    </td>\n                </tr>\n            </table>\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n                Submitting Variation job\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n                Variation job has been queued.\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n                <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Job</div>\n                <p data-dojo-attach-point=\"errorMessage\">Error</p>\n            </div>\n\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\"\n                     data-dojo-type=\"dijit/form/Button\">Cancel\n                </div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n            </div>\n        </div>\n    </div>\n</form>\n\n"}});
define("p3/widget/app/Variation", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Variation.html","./AppBase","dojo/dom-construct",
        "dojo/_base/Deferred","dojo/aspect","dojo/_base/lang","dojo/domReady!","dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog",
    "dojo/NodeList-traverse","../../WorkspaceManager", "dojo/store/Memory", "dojox/widget/Standby"
], function(
	declare, WidgetBase, on,
	domClass,
	Template,AppBase,domConstruct,
        Deferred,aspect,lang,domReady,NumberTextBox,query,
	dom, popup, Tooltip, Dialog, TooltipDialog, children,WorkspaceManager, Memory, Standby
){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "Variation",
		pageTitle: "Variation Service",
		libraryData: null,
		defaultPath: "",
		startingRows: 7,

        listValues:function(obj){
            var results=[];
            Object.keys(obj).forEach(function(key){
                results.append(obj[key]);
            });
        },

		constructor: function(){

			this.addedLibs={counter:0};
			this.addedCond={counter:0};
            //these objects map dojo attach points to desired alias for ingestAttachPoint function
            //key is attach point array of values is alias
            //if there is no alias the key in the resulting object will be the same name as attach point
			this.pairToAttachPt1={"read1":null, "read2":null};
			this.pairConditionToAttachPt={"read1":null,"read2":null,"condition_paired":["condition"]};
			this.advPairToAttachPt={"interleaved":null, "insert_size_mean":null, "insert_size_stdev":null};
			this.paramToAttachPt={"output_path":null,"output_file":null};
			this.singleToAttachPt={"read":null};
			this.singleConditionToAttachPt={"read":null,"condition_single":["condition"]};
            this.conditionToAttachPt={"condition":["condition","id","label"]};
            this.targetGenomeID="";
            this.shapes=["icon-square","icon-circle"];
            this.colors=["blue","green","red","purple","orange"];
            this.color_counter=0;
            this.shape_counter=0;
            this.libraryStore=new Memory({data:[]});
            this.libraryID=0;
		},


        startup: function(){
            if (this._started) { return; }
            this.inherited(arguments);
			var _self=this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
            _self.output_path.set('value', _self.defaultPath);

            //create help dialog for infobutton's with infobuttoninfo div's
            this.emptyTable(this.libsTable, this.startingRows);

            //adjust validation for each of the attach points associated with read files
			Object.keys(this.pairToAttachPt1).concat(Object.keys(this.singleToAttachPt)).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
					return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")"+(this.required?"":"?")+"$")).test(value) &&
					(!this._isEmpty(value)) &&
					(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
				}
			)}));
            // this.block_condition.show();

			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started=true;
		},

        emptyTable:function(target, rowLimit){
			for (i = 0; i < rowLimit; i++) {
				var tr =  target.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
			}
        },

		getValues:function(){
			if (typeof String.prototype.startsWith != 'function') {
				String.prototype.startsWith = function (str){
    					return this.slice(0, str.length) == str;
  				};
			}
			var submit_values={};
			var values = this.inherited(arguments);
			var pairedList = this.libraryStore.query({"type":"paired"});
            var pairedAttrs=["read1","read2"];
            var singleAttrs=["read"];
			var singleList = this.libraryStore.query({"type":"single"});
            var condLibs=[];
			var pairedLibs =[];
			var singleLibs=[];
			this.ingestAttachPoints(this.paramToAttachPt, submit_values);
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		submit_values[k]=values[k];
			//	}
			//}
            var combinedList = pairedList.concat(singleList);
            submit_values["reference_genome_id"]=values["genome_name"];
            submit_values["mapper"]=values["mapper"]
            submit_values["caller"]=values["caller"]

			pairedList.forEach(function(libRecord){
                var toAdd={};
                if('condition' in libRecord && this.exp_design.checked){
                    toAdd['condition']=condLibs.indexOf(libRecord['condition'])+1;
                }
                pairedAttrs.forEach(function(attr){toAdd[attr]=libRecord[attr]});
				pairedLibs.push(toAdd);
            },this);
			if(pairedLibs.length){
				submit_values["paired_end_libs"]=pairedLibs;
			}
			singleList.forEach(function(libRecord){
                var toAdd={};
                if('condition' in libRecord && this.exp_design.checked){
                    toAdd['condition']=condLibs.indexOf(libRecord['condition'])+1;
                }
                singleAttrs.forEach(function(attr){toAdd[attr]=libRecord[attr]});
				singleLibs.push(toAdd);
            },this);
			if(singleLibs.length){
				submit_values["single_end_libs"]=singleLibs;
			}
			return submit_values;

		},
        //gets values from dojo attach points listed in input_ptsi keys.
        //aliases them to input_pts values.  validates all values present if req
		ingestAttachPoints: function(input_pts, target, req){
            req = typeof req !== 'undefined' ? req : true;
			var success=1;
            var prevalidate_ids=["read1","read2","read","output_path","condition","condition_single","condition_paired"];
			Object.keys(input_pts).forEach(function(attachname){
				var cur_value=null;
				var incomplete =0;
				var prevalidate=(prevalidate_ids.indexOf(attachname) > -1);//truth variable whether to do validation separate from form
                var targetnames=[attachname];
                if (input_pts[attachname]){
                    targetnames=input_pts[attachname];
                }
				if(attachname == "read1" || attachname == "read2" || attachname == "read" || attachname == "output_path"){
					cur_value=this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
                    if(attachname == "read2" && this["read2"].searchBox.value == this["read1"].searchBox.value){
                        this["read2"].searchBox.value="";
                    }
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
				}
				else if(attachname == "condition"){
					cur_value=this[attachname].displayedValue;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value="/_uuid/"+this[attachname].searchBox.value;
					//cur_value=this[attachname].searchBox.get('value');
				}
				else{
					cur_value=this[attachname].value;
				}

				if(typeof(cur_value) == "string"){
					cur_value=cur_value.trim();
				}
                //set validation state for widgets since they are non-blocking presubmission fields
				if(req && (!cur_value || incomplete)){
					if(prevalidate){
                        if(this[attachname].searchBox){
						    this[attachname].searchBox.validate(); //this should be whats done but it doesn't actually call the new validator
						    this[attachname].searchBox._set("state","Error");
                        }
                        else{
                            this[attachname].validate();
                            this[attachname]._set("state","Error");
                        }
						this[attachname].focus=true;
					}
					success=0;
				}
				else{
					this[attachname]._set("state","");
				}
                //set alias target values to cur_value and format values in resulting object
                targetnames.forEach(function(targetname){
                    target[targetname]=cur_value;
                    if(target[targetname]!=""){
                        target[targetname]= target[targetname] || undefined;
                    }
                    else if (target[targetname] == "true"){
                        target[targetname]=true;
                    }
                    else if (target[targetname]=="false"){
                        target[targetname]=false;
                    }
                }, target);
			}, this);
			return(success);
		},
        showConditionLabels: function(item, store){
            var label=item.condition+" "+item.icon;
            return label;
        },
		makePairName:function(libRecord){
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
		},


        makeConditionName:function(){
            return this.condition.get("displayedValue");
        },
		makeSingleName:function(libRecord){
			var fn =this.read.searchBox.get("displayedValue");
                        maxName=24
			if(fn.length > maxName){
				fn=fn.substr(0,(maxName/2)-2)+"..."+fn.substr((fn.length-(maxName/2))+2);
			}
			return "S("+fn+")";
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
            this.libraryID+=1;
			var lrec={};
			var toIngest= this.singleToAttachPt;
			var chkPassed=this.ingestAttachPoints(toIngest, lrec);
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
                lrec["id"]=this.libraryID;
                lrec["row"]=tr;
                lrec["type"]="single";
				var td = domConstruct.create('td', {"class":"textcol singledata", innerHTML:""},tr);
				//td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makeSingleName()+"</div>";
				var advPairInfo= [];
                lrec["design"]=false;
                var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				var td2 = domConstruct.create("td", {"class":"iconcol", innerHTML: "<i class='fa icon-x fa-1x' />"},tr);
				if(this.addedLibs.counter < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
                    this.destroyLibRow(query_id=lrec["id"], "id")
				}));
                lrec["handle"]=handle;
                this.libraryStore.put(lrec);
				this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
			}
		},

        destroyLibRow:function(query_id, id_type){
            console.log("Delete Rows");
            var query_obj={};
            query_obj[id_type]=query_id;
            var toRemove=this.libraryStore.query(query_obj);
            toRemove.forEach(function(obj){
                domConstruct.destroy(obj.row);
                this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
                if (this.addedLibs.counter < this.startingRows){
                    var ntr = this.libsTable.insertRow(-1);
                    var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
                    var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
                    var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
                }
                obj.handle.remove();
                this.libraryStore.remove(obj.id);
            },this);
        },

        onSuggestNameChange: function(){
        },


		onAddPair: function(){
			console.log("Create New Row", domConstruct);
            this.libraryID+=1;
			var lrec={};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest= this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
			var chkPassed=this.ingestAttachPoints(pairToIngest, lrec);
			//this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if (chkPassed && lrec.read1 != lrec.read2){
				var tr = this.libsTable.insertRow(0);
                lrec["id"]=this.libraryID;
                lrec["row"]=tr;
                lrec["type"]="paired";
				var td = domConstruct.create('td', {"class":"textcol pairdata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makePairName()+"</div>";
				var advPairInfo= [];
                lrec["design"]=false;
                var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				var td2 = domConstruct.create("td", {"class":"iconcol",innerHTML: "<i class='fa icon-x fa-1x' />"},tr);
				if(this.addedLibs.counter < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
                    this.destroyLibRow(query_id=lrec["id"], id_type="id")
				}));
                lrec["handle"]=handle;
                this.libraryStore.put(lrec);
				this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
			}
		}

	});
});

