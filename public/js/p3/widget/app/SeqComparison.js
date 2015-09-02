define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/SeqComparison.html","./AppBase","dojo/dom-construct",
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
		applicationName: "GenomeComparison",
		defaultPath: "",
		startingRows: 8,
		maxGenomes: 8,


		constructor: function(){
			this._selfSet=true;
			this.addedGenomes=0;
			this.genomeToAttachPt=["comp_genome_id"];
		},	
            
        startup: function(){
                        var _self=this;
                        if (this._started) { return; }
			this.inherited(arguments);
			
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
            _self.output_path.set('value', _self.defaultPath);
			
            this.emptyTable(this.genomeTable, this.startingRows);
			this.numgenomes.startup();
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
            this._started=true;
		},

        emptyTable:function(target, rowLimit){
			for (i = 0; i < rowLimit; i++) { 
				var tr =  target.insertRow(0);//domConstr.create("tr",{},this.genomeTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
			}
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
				else if(attachname == "comp_genome_id"){
					var compGenomeList = query(".genomedata");	
            		var genomeIds=[];
		
					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.comp_genome_id)});

					cur_value=this[attachname].value;
					
					//console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
					if (genomeIds.length>0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success=0;
					}
				}
				else{
					cur_value=this[attachname].value;
				}
					
				console.log("cur_value=" + cur_value);	
				
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

        onSuggestNameChange: function(){
            console.log("change genome name");
        },

        makeGenomeName:function(){
        	var name = this.comp_genome_id.get("displayedValue");
			var maxName=36;
			var display_name = name;
			if(name.length > maxName){
				display_name=name.substr(0,(maxName/2)-2)+"...."+name.substr((name.length-(maxName/2))+2);
			}

            return display_name;
        },

		increaseGenome: function(){
			this.addedGenomes= this.addedGenomes+1;
			this.numgenomes.set('value',Number(this.addedGenomes));
			
		},
		decreaseGenome: function(){
			this.addedGenomes = this.addedGenomes-1;
			this.numgenomes.set('value',Number(this.addedGenomes));	
		},	

		onAddGenome: function(){
			console.log("Create New Row", domConstruct);
			var lrec={};
			var chkPassed=this.ingestAttachPoints(this.genomeToAttachPt, lrec);
			console.log("chkPassed = " + chkPassed); 
			if (chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class":"textcol genomedata", innerHTML:""},tr);
				td.genomeRecord=lrec;
				td.innerHTML="<div class='libraryrow'>"+this.makeGenomeName()+"</div>";
				var tdinfo=domConstruct.create("td", {innerHTML: ""},tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if (this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);	
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseGenome();
			}
			console.log(lrec);
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if (this.validate()){
				var values = this.getValues();
				//console.log(values["user_genomes"]);
				//console.log(values["genome_ids"]);				
				if (values["user_genomes"] || values["genome_ids"].length > 1){
					domClass.add(this.domNode,"Working");
					domClass.remove(this.domNode,"Error");
					domClass.remove(this.domNode,"Submitted");

					if (window.App.noJobSubmission) {
						var dlg = new Dialog({title: "Job Submission Params: ", content: "<pre>"+JSON.stringify(values,null,4) + "</pre>"});
						dlg.startup();
						dlg.show();
						return;
					}
					this.submitButton.set("disabled", true);
					window.App.api.service("AppService.start_app",[this.applicationName,values]).then(function(results){
						console.log("Job Submission Results: ", results);
						domClass.remove(_self.domNode,"Working")
						domClass.add(_self.domNode, "Submitted");
						_self.submitButton.set("disabled", false);
						registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
							obj.reset();
						});
					}, function(err){
						console.log("Error:", err)
						domClass.remove(_self.domNode,"Working");
						domClass.add(_self.domNode, "Error");
						_self.errorMessage.innerHTML = err;
					})
				}else{
					domClass.add(this.domNode,"Error");
					console.log("Form is incomplete");
				}
				
			}else{
				console.log("Form is incomplete");
			}
		},

		getValues: function(){
			var seqcomp_values={};
			var values = this.inherited(arguments);
			var compGenomeList = query(".genomedata");	
            var genomeIds=[];
            var userGenomes =[];

			genomeIds.push(values["ref_genome_id"]);
			compGenomeList.forEach(function(item){
				genomeIds.push(item.genomeRecord.comp_genome_id)});
				
			if (values["user_genomes"])
			{
				userGenomes.push(values["user_genomes"]);
			}
			
			//console.log("compGenomeList = " + compGenomeList);
			//console.log("ref genome = " + values["ref_genome_id"]);

			seqcomp_values["genome_ids"]=genomeIds;
			if (userGenomes.length > 0)
			{
				seqcomp_values["user_genomes"]=userGenomes;
			}
			seqcomp_values["reference_genome_index"]=1;	
			
			if (values["min_seq_cov"])
			{
				seqcomp_values["min_seq_cov"]=values["min_seq_cov"]/100;
			}
			if (values["max_e_val"])
			{
				seqcomp_values["max_e_val"]=values["max_e_val"];			
			}
			seqcomp_values["output_path"]=values["output_path"];
			seqcomp_values["output_file"]=values["output_file"];
				
			return seqcomp_values;
		}
		
	});
});

