require({cache:{
'url:p3/widget/app/templates/SeqComparison.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 450px;margin:auto;\">\n\t<div class=\"apptitle\" id=\"apptitle\">\n\t    <h3>Proteome Comparison</h3>\n\t    <p>Protein sequence-based comparison using bi-directional BLASTP.</p>\n\t</div>\n  \n\t<div style=\"width:450px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\" data-dojo-attach-point=\"numgenomes\" data-dojo-props=\"constraints:{min:0,max:10},\"/>\n\t\t</div>\n\n\t\t<table class=\"assemblyblocks\" style=\"width:100%\">\n\t\t<tr>\n\t\t<td>\n\n\t\t<div id=\"dataBox\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Parameters</label>\n\t\t\t\t\t<div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t<i class=\"fa fa-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label>Reference Genome</label><br>\n                     <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"ref_genome_id\" maxHeight=200 style=\"width:85%\" required=\"true\" data-dojo-attach-point=\"ref_genome_id\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label>Add Up To 8 Genomes to Compare (use plus button to add)</label>\n                    <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"comp_genome_id\" maxHeight=200 style=\"width:85%\" required=\"false\" data-dojo-attach-point=\"comp_genome_id\" data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"></div>\n                    <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddGenome\" class=\"fa icon-plus-circle fa-lg\"></i></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\" style=\"width:85%; margin-top:10px; text-align: center;\">\n\t\t\t<table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"genomeTable\" style='margin:0 0 0 10px; width:90%;'>\n\t\t\t\t<tbody data-dojo-attach-point=\"genomeTableBody\">\n\t\t\t\t\t\t\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t\t</div>\t\t\t\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label>Optional External Genome (Protein Fasta file)</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"user_genomes\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace for Comparison',missingMessage:'User genome file is optional.', placeHolder:'Optional'\"></div>\n\t\t\t</div>\n\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"approw\" data-dojo-attach-point=\"advanced\">\n\t\t\t\t\t<label>Advanced</label>\n\t\t\t\t\t<div class=\"iconbox\" style=\"margin-left:0px\">\n\t\t\t\t\t\t<i data-dojo-attach-point=\"advicon\" class=\"fa fa-caret-down fa-1\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\"  data-dojo-attach-point=\"advrow\" style=\"display: none\">\n\t\t\t\t<div class=\"halfAppRow\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"min_seq_cov\">Minimum % coverage</label><br>\n\t\t\t\t\t<div class=\"insertspinner\" name=\"min_seq_cov\" data-dojo-type=\"dijit/form/NumberSpinner\" value=\"30\" data-dojo-attach-point=\"insert_size_mean\" data-dojo-props=\"smallDelta:5, constraints:{min:10,max:100,places:0}\" ></div>\n\t\t\t\t</div>\n\t\t\t<div class=\"half2AppRow\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"max_e_val\">Blast E-value</label><br>\t\t\n\t\t\t\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"max_e_val\" value=\"1e-5\" style=\"width:100%\" required=\"false\" data-dojo-props=\"intermediateChanges:true,promptMessage:'E value is optional, default is set to 1e-5',missingMessage:'E value is optional, default is set to 1e-5.',trim:true,placeHolder:'1e-5'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\"  required=\"true\" data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label class=\"paramlabel\">Output Name</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:85%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\n\t\t</div>\n\t\t</td>\t\t\n\t\t</tr>\n\t\t</table>\n\t</div>\n\t</div>\n\n\t<div class=\"appSubmissionArea\">\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t    Comparing Genomes\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tGenome Comparison should be finished shortly. Check workspace for results.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/SeqComparison", [
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

