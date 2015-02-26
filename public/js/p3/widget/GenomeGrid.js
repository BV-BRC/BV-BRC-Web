define([
	"dojo/_base/declare","dijit/layout/BorderContainer","dojo/on",
	"dojo/dom-class","dijit/layout/ContentPane","dojo/dom-construct",
	"./PageGrid","./formatter"
], function(
	declare, BorderContainer, on,
	domClass,ContentPane,domConstruct,
	Grid,formatter
){
	return declare([Grid], {
		region: "center",
		query: (this.query||""),
		apiToken: window.App.authorizationToken,
		apiServer: window.App.dataAPI,
		dataModel: "genome",
		deselectOnRefresh: true,
		columns: {
			id: {label: "Genome ID", field: "genome_id", hidden:true},
			commonName: {label: "Name", field: "common_name", hidden:true},
			genomeName: {label: "Genome Name", field: "genome_name", hidden:true},
			organismName: {label: "Organism Name", field: "organism_name"},
			genomeStatus: {label: "Genome Status", field: "genome_status"},
			isolationCountry: {label: "Isolation Country", field: "isolation_country"},
			host_name: {label: "Host Name", field: "host_name"},
			disease: {label: "Disease", field: "disease"},
			collectionDate: {label: "Collection Date", field: "collection_date", formatter: formatter.dateOnly},
			completionDate: {label: "Completion Date", field: "completion_date", formatter: formatter.dateOnly},
			patricCDS: {label: "PATRIC CDS", field: "patric_cds"},
			plasmids: {label: "Plasmids", field: "plasmids",hidden:true},
			sequences: {label: "Sequences", field: "sequences",hidden:true},
			gc_content: {label: "GC Content", field: "gc_content",hidden:true},
			genome_length: {label: "Length", field: "genome_length",hidden:true}
		},
		startup: function(){
				var _self = this
                                this.on(".dgrid-content .dgrid-row:dblclick", function(evt) {
                                    var row = _self.row(evt);
                                    console.log("dblclick row:", row)
                                        on.emit(_self.domNode, "ItemDblClick", {
                                                item_path: row.data.path,
                                                item: row.data,
                                                bubbles: true,
                                                cancelable: true
                                        });
                                        console.log('after emit');
                                    //if (row.data.type == "folder"){
                //                              Topic.publish("/select", []);

                //                              Topic.publish("/navigate", {href:"/workspace" + row.data.path })
                //                              _selection={};
                                        //}
                                });
                                //_selection={};
                                //Topic.publish("/select", []);

                                this.on("dgrid-select", function(evt) {
                                        console.log('dgrid-select: ', evt);
                                        var newEvt = {
                                                rows: event.rows,
                                                selected: evt.grid.selection,
                                                grid: _self,
                                                bubbles: true,
                                                cancelable: true
                                        }
                                        on.emit(_self.domNode, "select", newEvt);
                                        //console.log("dgrid-select");
                                        //var rows = event.rows;
                                        //Object.keys(rows).forEach(function(key){ _selection[rows[key].data.id]=rows[key].data; });
                                        //var sel = Object.keys(_selection).map(function(s) { return _selection[s]; });
                                        //Topic.publish("/select", sel);
                                });
                                this.on("dgrid-deselect", function(evt) {
                                        console.log("dgrid-select");
                                        var newEvt = {
                                                rows: event.rows,
                                                selected: evt.grid.selection,
                                                grid: _self,
                                                bubbles: true,
                                                cancelable: true
                                        }
                                        on.emit(_self.domNode, "deselect", newEvt);
                                        return;
                                });
				this.inherited(arguments);
				this.refresh();
		}
	});
});
