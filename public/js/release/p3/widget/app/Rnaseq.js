require({cache:{
'url:p3/widget/app/templates/Rnaseq.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div style=\"width: 700px;margin:auto;\">\n    <div class=\"apptitle\" id=\"apptitle\">\n                <h3>RNA-Seq Analysis</h3>\n                <p>Align reads, assemble transcripts, measure/test expression.</p>\n    </div>\n\t<div style=\"width:700px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n\t\t</div>\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"1\" required=\"true\" data-dojo-attach-point=\"numcond\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n\t\t</div>\n\t\t<table class=\"assemblyblocks\" style=\"width:100%\">\n\t\t<tr>\n\t\t<td>\n            <div id=\"pipelineBox\" class=\"appbox appshadow\"> \n                <div style=\"width:85%;display:inline-block;\">\n                    <label class=\"appboxlabel\"> Configuration</label>\n                    <div name=\"pipelineinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                        <i class=\"fa fa-info-circle fa\"></i>\n                    </div>\n                </div>\n                <div class=\"approw\">\n                    <label for=\"recipe\" class=\"paramlabel\">Strategy</label><br>\n                    <select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                    <option value=\"Rockhopper\">Rockhopper</option>\n                    </select>\n                </div>\n                <div class=\"approw\">\n                    <div class=\"appField\">\n                        <label>Genome Name</label><br>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_name\" maxHeight=200 style=\"width:100%\" required=\"true\" data-dojo-attach-point=\"genome_nameWidget\"></div>\n                    </div> \n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\">Experimental design</label>\n                    <div class=\"mblSwRoundShape1\" data-dojo-attach-point=\"exp_design\" data-dojo-attach-event=\"stateChanged:onDesignToggle\" data-dojo-props=\"value:'off'\" style=\"font-size: 13px; width: 80px;\" data-dojo-type=\"dojox/mobile/Switch\"></div>\n                </div>\n                <div class=\"approw\">\n                    <label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\">Output Name</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                </div>\n\n            </div>\n        </td>\n        <td>\n            <div id=\"conditionbox\" class=\"appbox appshadow\" style=\"min-height: 120px; height:auto; width:330px\">\n                <div class=\"headerrow\">\n                    <label class=\"appboxlabel\">Conditions</label>\n                    <div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                        <i class=\"fa fa-info-circle fa\"></i>\n                    </div><br>\n                    <div class=\"appsublabel\">Add conditions using the configure arrow button.</div>\n                </div>\n                <div class=\"approw\"  data-dojo-attach-point=\"advrow\">\n                    <div style=\"width:85%;display:inline-block;\">\n                        <label class=\"paramlabel\">Condition</label><br>\n                        <div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"condition\" data-dojo-attach-point=\"condition\" required=\"false\" data-dojo-props=\"disabled: true, missingMessage:'Name of condition',trim:true,placeHolder:'Condition Name'\"></div>\n                    </div>\n                    <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddCondition\" class=\"fa icon-plus-circle fa-lg\"></i></div>\n                </div>\n                <div class=\"approw\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"condTable\" style='margin:0 0 0 10px; width:90%;'>\n                    <tbody data-dojo-attach-point=\"condTableBody\">\n                            \n                    </tbody>\n                </table>\n                </div>\n            </div>\n            <div data-dojo-attach-point=\"block_condition\" data-dojo-type=\"dojox.widget.Standby\" data-dojo-props=\"opacity:'0.5',color:'rgb(231,231,231)', text:'Disabled',centerIndicator:'text',target:'conditionbox'\"></div>\n        <td>\n        </tr>\n        <tr>\n        <td>\n            <div id=\"pairedBox\" class=\"appbox appshadow\">\n                <div class=\"headerrow\">\n                    <div style=\"width:85%;display:inline-block;\">\n                        <label class=\"appboxlabel\"> Paired read library</label>\n                        <div name=\"pairinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                            <i class=\"fa fa-info-circle fa\"></i>\n                        </div>\n                    </div>\n                    <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\" class=\"fa fa-arrow-circle-o-right fa-lg\"></i></div>\n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\" for=\"libdat_file1pair\">Read File 1</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n                </div>\n                <div class=\"approw\">\n                    <div data-dojo-attach-point=\"read2block\">\n                        <label class=\"paramlabel\" for=\"libdat_file2pair\">Read File 2</label><br>\n                        <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n                    </div>\n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\">Condition</label><br>\n                    <select data-dojo-type=\"dijit/form/FilteringSelect\" name=\"condition_paired\" data-dojo-attach-point=\"condition_paired\" style=\"width:300px\" required=\"true\" data-dojo-props=\"disabled: true, searchAttr:'label',intermediateChanges:true,trim:true,placeHolder:'Condition Name'\">\n                    </select>\n                </div>\n            </div>\n\n            <div class=\"appbox appshadow\">\n                <div class=\"headerrow\">\n                    <div style=\"width:85%;display:inline-block;\">\n                        <label class=\"appboxlabel\">Single read library</label>\n                    </div>\n                    <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa fa-arrow-circle-o-right fa-lg\"></i></div>\n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\" for=\"singleread\">Read File</label><br>\n                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\" data-dojo-attach-point=\"single_end_libs\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n                </div>\n                <div class=\"approw\">\n                    <label class=\"paramlabel\">Condition</label><br>\n                    <select data-dojo-type=\"dijit/form/FilteringSelect\" name=\"condition_single\" data-dojo-attach-point=\"condition_single\" style=\"width:300px\" required=\"false\" data-dojo-props=\"disabled: true,searchAttr:'label',intermediateChanges:true,trim:true,placeHolder:'Condition Name'\">\n                    </select>\n                </div>\n            </div>\n\n\t\t</td>\n\t\t<td>\n            <div class=\"appbox appshadow\" style=\"min-height: 320px; height:auto; width:330px\">\n                <div class=\"headerrow\">\n                    <label class=\"appboxlabel\">Selected libraries</label>\n                    <div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                        <i class=\"fa fa-info-circle fa\"></i>\n                    </div><br>\n                    <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n                </div>\n                <div class=\"approw\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style='margin:0 0 0 10px; width:90%;'>\n                    <tbody data-dojo-attach-point=\"libsTableBody\">\n                            \n                    </tbody>\n                </table>\n                </div>\n            </div>\n\t\t</td>\n\t\t</tr>\n\t\t</table>\n\t\t\n\t\t\n\t</div>\n\t<div class=\"appSubmissionArea\">\n\t\t<div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n\t\t\tSubmitting Assembly Job\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n\t\t\tAssembly Job has been queued.\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\n\t</div>\n\t\n</form>\n\n"}});
define("p3/widget/app/Rnaseq", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Rnaseq.html","./AppBase","dojo/dom-construct",
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
		applicationName: "RNASeq",
		libraryData: null,
		defaultPath: "",
		startingRows: 11,
        maxConditions: 7,
        conditionStore: null,

		constructor: function(){

			this.addedLibs=0;
			this.addedPairs=0;
			this.pairToAttachPt1=["read1", "read2"];
			this.pairToAttachPt2=["read1"];
			this.advPairToAttachPt=["interleaved", "insert_size_mean", "insert_size_stdev"];
			this.paramToAttachPt=["output_path","output_file", "recipe"];
			this.singleToAttachPt=["single_end_libs"];
            this.conditionToAttachPt=["condition"];
            this.targetGenomeID="";
		},
 
        

        startup: function(){
                        if (this._started) { return; }
                        this.inherited(arguments);
			var _self=this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
                        _self.output_path.set('value', _self.defaultPath);
            
            //create help dialog for infobutton's with infobuttoninfo div's
            this.emptyTable(this.libsTable, this.startingRows);
            this.emptyTable(this.condTable, this.maxConditions);
			this.pairToAttachPt1.concat(this.singleToAttachPt).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
					return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")"+(this.required?"":"?")+"$")).test(value) &&
					(!this._isEmpty(value)) &&
					(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
				}
			)}));
            this.block_condition.show();
				
			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started=true;
		},

        onDesignToggle:function(){
            var disable = this.exp_design.get("value") == "off";
            this.condition.set("disabled",disable);
            this.condition_single.set("disabled",disable);
            this.condition_paired.set("disabled",disable);
            if(disable){
                this.block_condition.show();
                this.numcond.set('value',Number(1));
            }
            else {
                this.block_condition.hide();
                this.numcond.set('value',Number(this.condTable.addedLibs));
                
            }
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
			var assembly_values={};
			var values = this.inherited(arguments);
			var pairedList = query(".pairdata");	
			var condList = query(".conditiondata");	
			var singleList = query(".singledata");
            var condLibs=[];
			var pairedLibs =[];
			var singleLibs=[];
			this.ingestAttachPoints(this.paramToAttachPt, assembly_values);	
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		assembly_values[k]=values[k];
			//	}
			//}
            assembly_values["reference_genome_id"]=values["genome_name"];
			condList.forEach(function(item){
				condLibs.push(item.libRecord.condition)});
			pairedList.forEach(function(item){
                if('condition_paired' in item.libRecord){
                    item.libRecord['condition']=condLibs.indexOf(item.libRecord['condition_paired']);
                    delete item.libRecord.condition_paried;
                }
				pairedLibs.push(item.libRecord)});
			if(pairedLibs.length){
				assembly_values["paired_end_libs"]=pairedLibs;
			}
			if(condLibs.length){
				assembly_values["experimental_conditions"]=condLibs;
			}
			singleList.forEach(function(item){
                if('condition_single' in item.libRecord){
                    item.libRecord['condition']=condLibs.indexOf(item.libRecord['condition_single']);
                    delete item.libRecord.condition_single;
                }
				singleLibs.push(item.libRecord["single_end_libs"]) });
			if(singleLibs.length){
				assembly_values["single_end_libs"]=singleLibs;
			}
			return assembly_values;
				
		},
		ingestAttachPoints: function(input_pts, target, req){
                        req = typeof req !== 'undefined' ? req : true;
			var success=1;
			input_pts.forEach(function(attachname){
				var cur_value=null;
				var incomplete =0;
				var browser_select=0;
				if(attachname == "read1" || attachname == "read2" || attachname == "single_end_libs"){
					cur_value=this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
					browser_select=1;
				}
				else if(attachname == "output_path"){
					cur_value=this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value="/_uuid/"+this[attachname].searchBox.value;
					//cur_value=this[attachname].searchBox.get('value');
					browser_select=1;
				}
				else{
					cur_value=this[attachname].value;
				}
					
				if(typeof(cur_value) == "string"){
					target[attachname]=cur_value.trim();
				}
				else{
					target[attachname]=cur_value;
				}
				if(req && (!target[attachname] || incomplete)){
					if(browser_select){
						this[attachname].searchBox.validate(); //this should be whats done but it doesn't actually call the new validator
						this[attachname].searchBox._set("state","Error");
						this[attachname].focus=true;
					}
					success=0;
				}
				else{
					this[attachname]._set("state","");
				}
				if(target[attachname]!=""){
					target[attachname]= target[attachname] || undefined;
				}
				else if (target[attachname] == "true"){
					target[attachname]=true;
				}
				else if (target[attachname]=="false"){
					target[attachname]=false;
				}			 
			}, this);
			return(success);
		},
		makePairName:function(libRecord){
			var fn =this.read1.searchBox.get("displayedValue");
			var fn2 =this.read2.searchBox.get("displayedValue");
			var maxName=12; 
			if(fn.length > maxName){
				fn=fn.substr(0,(maxName/2)-2)+".."+fn.substr((fn.length-(maxName/2))+2);
			}
			if(fn2.length > maxName){
				fn2=fn2.substr(0,(maxName/2)-2)+".."+fn2.substr((fn2.length-(maxName/2))+2);
			}
			return "P("+fn+", "+fn2+")";
		},	
			

        makeConditionName:function(){
            return this.condition.get("displayedValue");
        },
		makeSingleName:function(libRecord){
			var fn =this.single_end_libs.searchBox.get("displayedValue");
                        maxName=24
			if(fn.length > maxName){
				fn=fn.substr(0,(maxName/2)-2)+".."+fn.substr((fn.length-(maxName/2))+2);
			}
			return "S("+fn+")";
		},

        //counter is a widget for requirements checking
		increaseRows: function(targetTable, counter){
            if (!targetTable.addedLibs){
                targetTable.addedLibs=0;
            }
			targetTable.addedLibs= targetTable.addedLibs+1;
            if (typeof counter != "undefined"){
			    counter.set('value',Number(targetTable.addedLibs));
            }
		},
		decreaseRows: function(targetTable, counter){
			targetTable.addedLibs = targetTable.addedLibs-1;
            if (typeof counter != "undefined"){
			    counter.set('value',Number(targetTable.addedLibs));
            }
		},	
		onAddCondition: function(){
			console.log("Create New Row", domConstruct);
			var lrec={};
            var toIngest=this.conditionToAttachPt;
			var chkPassed=this.ingestAttachPoints(toIngest, lrec);
			if (chkPassed){
				var tr = this.condTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol conditiondata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makeConditionName()+"</div>";
				var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.maxConditions){
					this.condTable.deleteRow(-1);
				}
                   
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseRows(this.condTable, this.numcond);
					if (this.condTable.addedLibs < this.maxConditions){
						var ntr = this.condTable.insertRow(-1);	
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
                    this.updateConditionStore();
				}));
				this.increaseRows(this.condTable, this.numcond);
                this.updateConditionStore();
			}
		},

        updateConditionStore: function(){
			var conditionList = query(".conditiondata");
            var storeData=[];
			conditionList.forEach(function(item){
                var curCondition={id:item.libRecord.condition,label:item.libRecord.condition};
				storeData.push(curCondition);
            });
            var conditionStore=new Memory({data:storeData});
            this.condition_paired.set("store",conditionStore);
            this.condition_single.set("store",conditionStore);
        },

		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec={};
			var toIngest= this.exp_design.value =="on" ? ["condition_single"].concat(this.singleToAttachPt) : this.singleToAttachPt;
			var chkPassed=this.ingestAttachPoints(toIngest, lrec);
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol singledata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makeSingleName()+"</div>";
				var advPairInfo= [];
				if(lrec["condition_single"]){
					advPairInfo.push("Condition:"+lrec["condition_single"]);
				}
				if(advPairInfo.length){
					var tdinfo=domConstruct.create("td", {innerHTML: "<i class='fa fa-info fa-1' />"},tr);
					var ihandle=new Tooltip({
						connectId: [tdinfo],
						label: advPairInfo.join("</br>") 
					});
				}
				else{
					var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				}
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseRows(this.libsTable, this.numlibs);
					if (this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);	
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseRows(this.libsTable,this.numlibs);
			}
		},

        onSuggestNameChange: function(){
        },

		
		onAddPair: function(){
			console.log("Create New Row", domConstruct);

			var lrec={};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest= this.exp_design.value =="on" ? ["condition_paired"].concat(this.pairToAttachPt1) : this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);	
			var chkPassed=this.ingestAttachPoints(pairToIngest, lrec);
			//this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol pairdata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makePairName()+"</div>";
				var advPairInfo= [];
				if(lrec["condition_paired"]){
					advPairInfo.push("Condition:"+lrec["condition_paired"]);
				}
				if(advPairInfo.length){
					var tdinfo=domConstruct.create("td", {innerHTML: "<i class='fa fa-info fa-1' />"},tr);
					var ihandle=new Tooltip({
						connectId: [tdinfo],
						label: advPairInfo.join("</br>") 
					});
				}
				else{
					var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				}
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseRows(this.libsTable,this.numlibs);
					if (this.addedLibs < this.startingRows){
	//					var ntr =  domConstr.create("tr",{});
	//					domConstr.place("ntr",this.libsTableBody,"last");
						var ntr = this.libsTable.insertRow(-1);	
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyyrow'></div>"},ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseRows(this.libsTable,this.numlibs);
			}
		}
		
	});
});

