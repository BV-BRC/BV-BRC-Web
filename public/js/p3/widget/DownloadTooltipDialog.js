define([
        "dojo/_base/declare", "dojo/on", "dojo/dom-construct",
        "dojo/_base/lang","dojo/mouse",
        "dojo/topic", "dojo/query", "dijit/layout/ContentPane", 
        "dijit/Dialog", "dijit/popup", "dijit/TooltipDialog",
        "./AdvancedDownload","dojo/dom-class"
], function(declare, on, domConstruct,
		lang,Mouse,
		Topic, query, ContentPane,
		Dialog, popup, TooltipDialog,
                AdvancedDownload,domClass
){

	return declare([TooltipDialog], {
                containerType: "",
		selection: null,

                _setSelectionAttr: function(val){
                        console.log("DownloadTooltipDialog set selection: ", val);
                        this.selection = val;
                },
                timeout: function(val){
			var _self=this;
                        this._timer = setTimeout(function(){
                                popup.close(_self);
                        },val||2500);
                },

                onMouseEnter: function(){
                        if (this._timer){
                                clearTimeout(this._timer);
                        }

                        this.inherited(arguments);
                },
                onMouseLeave: function(){
                        popup.close(this);
                },

                startup: function(){
			if (this._started) { return; }
			on(this.domNode, Mouse.enter, lang.hitch(this, "onMouseEnter"));
			on(this.domNode, Mouse.leave, lang.hitch(this, "onMouseLeave"));
                        var _self=this;
                        on(this.domNode, ".wsActionTooltip:click", function(evt){
                                console.log("evt.target: ", evt.target, evt.target.attributes);
                                var rel = evt.target.attributes.rel.value;
                                if (rel=="advancedDownload"){

                                        console.log("Selection: ", _self.selection);
                                        var d = new Dialog({});
                                        var ad = new AdvancedDownload({selection: _self.selection, containerType: _self.containerType});
                                        domConstruct.place(ad.domNode, d.containerNode);
                                        d.show();
                                        return;
                                }
//                              var sel = this.selection;
//                                      delete downloadSelectionTT.selection;
                                console.log("DOWNLOAD ", rel);
                        });

			var dstContent = domConstruct.create("div",{});
                        this.labelNode = domConstruct.create("div",{style: "background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;"}, dstContent);
                        this.selectedCount = domConstruct.create("div", {},dstContent);
			var table = domConstruct.create("table",{},dstContent);

			var tr = domConstruct.create("tr",{}, table);
                        var tData = this.tableDownloadsNode = domConstruct.create("td",{style: "vertical-align:top;"}, tr);
                        //spacer
                        domConstruct.create("td",{style: "width:10px;"}, tr);
                        var oData = this.otherDownloadNode = domConstruct.create("td",{style: "vertical-align:top;"}, tr);

                        domConstruct.create("div", {"class":"wsActionTooltip", rel: "text", innerHTML: "Text"}, tData);
                        domConstruct.create("div", {"class":"wsActionTooltip", rel: "csv", innerHTML: "CSV"}, tData);
                        domConstruct.create("div", {"class":"wsActionTooltip", rel: "excel", innerHTML: "Excel"}, tData);

                        tr = domConstruct.create("tr",{}, table);
                        var td = domConstruct.create("td", {"colspan": 3, "style": "text-align:right"}, tr);
                        this.advancedDownloadButton = domConstruct.create("span", {"class":"wsActionTooltip", style: "padding:4px;", rel: "advancedDownload", innerHTML: "Advanced"}, td);



			this.set("content", dstContent);

			this._started=true;
			this.set("label", this.label);
                        this.set("selection", this.selection);

                },

		_setLabelAttr: function(val){
			this.label=val;
			if (this._started){
				this.labelNode.innerHTML="Download selected " + val + " (" + (this.selection?this.selection.length:"0") + ") as...";
			}
		},

                downloadableDataTypes: {
                        "dna+fasta": "DNA FASTA",
                        "protein+fasta": "Protein FASTA"
                },

                "downloadableConfig": {
                        "genome_data": {
                                "label": "Genomes",
                                tableData: true,
                                advanced:true
                        },
                        "sequence_data": {
                              "label": "Sequences",
                              tableData: true,
                              otherData: ["dna+fasta","protein+fasta"]
                         },
                        "feature_data": {
                              "label": "Features",
                              tableData: true,
                              otherData: ["dna+fasta","protein+fasta"]
                        },
                        "spgene_data": {
                              "label": "Specialty Genes",
                              tableData: true
                        },
                        "pathway_data": {
                              "label": "Pathways",
                              tableData: true  
                        },
                        "default": {
                              "label": "Items",
                              tableData: true  
                        }
                },
		
                _setContainerTypeAttr: function(val){
                        console.log("setContainerType: ", val);
                        var label;
                        this.containerType=val;

                        var conf = this.downloadableConfig[val] || this.downloadableConfig["default"];


			this.set("label", conf.label);

                        if (!this._started) { return; }

			domConstruct.empty(this.otherDownloadNode);

                        if (conf.otherData){
                                conf.otherData.forEach(function(type){
                                        domConstruct.create("div", {"class":"wsActionTooltip", rel: type, innerHTML: this.downloadableDataTypes[type]}, this.otherDownloadNode);
                                },this);
                        }	

                        if (conf.advanced){
                                domClass.remove(this.advancedDownloadButton,"dijitHidden");
                        } else{
                               domClass.add(this.advancedDownloadButton,"dijitHidden"); 
                        }

                }
        });

});
