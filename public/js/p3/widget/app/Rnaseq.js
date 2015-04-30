define([
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

