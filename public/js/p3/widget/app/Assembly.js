define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Assembly.html","./AppBase","dojo/dom-construct",
        "dojo/_base/Deferred","dojo/aspect","dojo/_base/lang","dojo/domReady!","dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog","dojo/NodeList-traverse", "dojo/request"
], function(
	declare, WidgetBase, on,
	domClass,
	Template,AppBase,domConstruct,
        Deferred,aspect,lang,domReady,NumberTextBox,query,
	dom, popup, Tooltip, Dialog, TooltipDialog, children, xhr
){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "GenomeAssembly",
		libraryData: null,
		startingRows: 14,

		constructor: function(){

			this.addedLibs=0;
			this.addedPairs=0;
			this.pairToAttachPt1=["read1", "read2"];
			this.pairToAttachPt2=["read1"];
			this.advPairToAttachPt=["interleaved", "insert_size_mean", "insert_size_stdev"];
			this.paramToAttachPt=["recipe","output_path","output_file","reference_assembly"];
			this.singleToAttachPt=["single_end_libs"];
		},

		gethelp: function(){

			var helprequest=xhr.get("/js/p3/widget/app/help/"+this.applicationName+"Help.html",{
			   handleAs: "text",
                        });		
			helprequest.then(function(data){
				var help_doc=domConstruct.toDom(data);
			        var ibuttons=query(".infobutton");
				ibuttons.forEach(function(item){
					var help_text= help_doc.getElementById(item.attributes.name.value) || "Help text missing";
					help_text.style.overflowY='auto';
					help_text.style.maxHeight='400px';
					if (dojo.hasClass(item, "dialoginfo")){
						item.info_dialog = new Dialog({
							content: help_text,
							class: 'nonModal',
							draggable: true,
							style: "max-width: 350px;"
						});
						item.open=false;
						on(item, 'click', function(){
							if(! item.open){
								item.open=true;
								item.info_dialog.show();
							}
							else{
								item.open=false;
								item.info_dialog.hide();
							}	
						});
					}
					else if (dojo.hasClass(item, "tooltipinfo")){
						item.info_dialog = new TooltipDialog({
							content: help_text,
							style: "overflow-y: auto; max-width: 350px; max-height: 400px",
							onMouseLeave: function(){
								popup.close(item.info_dialog);
							}
						});
						on(item, 'mouseover', function(){
							popup.open({
								popup: item.info_dialog,
								around: item
							});
						});
					}	
				});
			});
		},	


                startup: function(){
                        if (this._started) { return; }
                        this.inherited(arguments);
			for (i = 0; i < this.startingRows; i++) { 
				var tr =  this.libsTable.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
			}
			this.numlibs.startup();
                        //create help dialog for infobutton's with infobuttoninfo div's
			this.advrow.turnedOn=(this.advrow.style.display!='none');
			on(this.advanced, 'click', lang.hitch(this, function(){
				this.advrow.turnedOn=(this.advrow.style.display!='none');
				if (! this.advrow.turnedOn){
					this.advrow.turnedOn=true;
					this.advrow.style.display='block';
					this.advicon.className="fa fa-caret-left fa-1";
				}
				else{	
					this.advrow.turnedOn=false;
					this.advrow.style.display='none';
					this.advicon.className="fa fa-caret-down fa-1";
				}
			}));
			this.interleaved.turnedOn=(this.interleaved.value=="true");
			on(this.interleaved, 'change', lang.hitch(this, function(){
				if(this.interleaved.turnedOn){
					this.interleaved.turnedOn=false;
					this.read2block.style.visibility='visible';
				}
				else{
					this.interleaved.turnedOn=true;
					this.read2block.style.visibility='hidden';
				}	
			}));
				
				

			this.gethelp();

			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started=true;
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
			var singleList = query(".singledata");
			var pairedLibs =[];
			var singleLibs=[];
			this.ingestAttachPoints(this.paramToAttachPt, assembly_values);	
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		assembly_values[k]=values[k];
			//	}
			//}
			pairedList.forEach(function(item){
				pairedLibs.push(item.libRecord)});
			if(pairedLibs.length){
				assembly_values["paired_end_libs"]=pairedLibs;
			}
			singleList.forEach(function(item){
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
					cur_value=this[attachname].searchBox.value? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
					browser_select=1;
				}
				else if(attachname == "output_path"){
					cur_value=this[attachname].searchBox.value? "/_uuid/"+this[attachname].searchBox.value : "";
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
						//this[attachname]._set("state","Error");
						dojo.addClass(this[attachname], "dijitTextBoxError dijitComboBoxError dijitValidationTextBoxError dijitError dijitTextBoxFocused dijitComboBoxFocused dijitValidationTextBoxFocused dijitTextBoxErrorFocused dijitComboBoxErrorFocused dijitValidationTextBoxErrorFocused dijitErrorFocused dijitFocused");
					}
					success=0;
				}
				else{
					this[attachname]._set("state","");
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
			if(this.interleaved.turnedOn){
				return "P("+fn+")";
			}
			else{
				return "P("+fn+", "+fn2+")";
			}
		},	
			

		makeSingleName:function(libRecord){
			var fn =this.single_end_libs.searchBox.get("displayedValue");
                        maxName=24
			if(fn.length > maxName){
				fn=fn.substr(0,(maxName/2)-2)+".."+fn.substr((fn.length-(maxName/2))+2);
			}
			return "S("+fn+")";
		},

		increaseLib: function(){
			this.addedLibs= this.addedLibs+1;
			this.numlibs.set('value',Number(this.addedLibs));
			
		},
		decreaseLib: function(){
			this.addedLibs = this.addedLibs-1;
			this.numlibs.set('value',Number(this.addedLibs));	
		},	
		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec={};
			var chkPassed=this.ingestAttachPoints(this.singleToAttachPt, lrec);
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol singledata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makeSingleName()+"</div>";
				var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseLib();
					if (this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);	
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseLib();
			}
		},
		
		onAddPair: function(){
			console.log("Create New Row", domConstruct);
			var lrec={};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest=this.interleaved.turnedOn ? this.pairToAttachPt2 : this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);	
			var chkPassed=this.ingestAttachPoints(pairToIngest, lrec);
			this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol pairdata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makePairName()+"</div>";
				var advPairInfo= [];
				if(lrec["insert_size_mean"]){
					advPairInfo.push("Mean Insert Size:"+lrec["insert_size_mean"]);
				}
				if(lrec["insert_size_stdev"]){
					advPairInfo.push("Std. Insert Size:"+lrec["insert_size_stdev"]);
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
					this.decreaseLib();
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
				this.increaseLib();
			}
		}
		
	});
});

