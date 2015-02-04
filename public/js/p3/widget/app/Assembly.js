define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Assembly.html","./AppBase","dojo/dom-construct",
        "dojo/_base/Deferred","dojo/aspect","dojo/_base/lang","dojo/domReady!","dijit/form/NumberTextBox",
	"dojo/query"
], function(
	declare, WidgetBase, on,
	domClass,
	Template,AppBase,domConstr,
        Deferred,aspect,lang,domReady,NumberTextBox,query
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
			this.pairToAttachPt={
				read1:"read1pair1",
				read2:"read2pair1",
				interleaved:"interleaved",
				insert_size_mean:"avgpair1",
				insert_size_stdev:"stdpair1"};
			this.singleToAttachPt={
				single_end_libs:"read1"};
		},

                startup: function(){
                        if (this._started) { return; }
                        this.inherited(arguments);
			for (i = 0; i < this.startingRows; i++) { 
				var tr =  this.libsTable.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"},tr);
				var td2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"},tr);
			}
			this.numlibs.startup();
/*
			this.libraryGrid = new Grid({
				columns: {'first': 'Libraries in assembly'}
			}, this.gridNode);

			this.libraryGrid.startup();
			this.libraryGrid.renderArray(this.libraryData);
*/			
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
			for (var k in values) {
				if(!k.startsWith("libdat_")){
					assembly_values[k]=values[k];
				}
			}
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
		ingestLibrary: function(input_pts, target){
			var success=1;
			for (var key in input_pts) {
				var cur_value=this[input_pts[key]].value;
				if(typeof(cur_value) == "string"){
					target[key]=cur_value.trim();
				}
				else{
					target[key]=cur_value;
				}
				if(!target[key]){
					this[input_pts[key]]._set("state","Error");
					success=0;
				}
				else{
					this[input_pts[key]]._set("state","");
				}			 
			}
			return(success);
		},
		makePairName:function(libRecord){
			var fn =libRecord["read1"].replace(/^.*[\\\/]/, '');
			return "pair"+"("+fn+")";
		},	
			

		makeSingleName:function(libRecord){
			var fn =libRecord["single_end_libs"].replace(/^.*[\\\/]/, '');
			return fn;
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
			console.log("Create New Row", domConstr);
			var lrec={};
			var chkPassed=this.ingestLibrary(this.singleToAttachPt, lrec);
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstr.create('td', {"class":"singledata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML=this.makeSingleName(td.libRecord);
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstr.destroy(tr);
					this.decreaseLib();
					if (this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);	
						var ntd = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseLib();
			}
		},
		
		onAddPair: function(){
			console.log("Create New Row", domConstr);
//			var tr =  domConstr.create("tr",{});
//			domConstr.place(tr,this.libsTableBody,"first");
			var lrec={};
			var chkPassed=this.ingestLibrary(this.pairToAttachPt, lrec);
			if (chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstr.create('td', {"class":"pairdata", innerHTML:""},tr);
				td.libRecord=lrec;
				td.innerHTML=this.makePairName(td.libRecord);
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"},tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this,function(evt){
					console.log("Delete Row");
					domConstr.destroy(tr);
					this.decreaseLib();
					if (this.addedLibs < this.startingRows){
	//					var ntr =  domConstr.create("tr",{});
	//					domConstr.place("ntr",this.libsTableBody,"last");
						var ntr = this.libsTable.insertRow(-1);	
						var ntd = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"},ntr);
						var ntd2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"},ntr);
					}	
					handle.remove();
				}));
				this.increaseLib();
			}
		}
		
	});
});

