define("p3/widget/IDMappingAppResultGridContainer", [
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/on", "dojo/topic",
	"dijit/popup", "dijit/TooltipDialog",
	"./ContainerActionBar", "FileSaver",
	"./GridContainer", "./IDMappingAppResultGrid"
], function(declare, lang,
			on, Topic,
			popup, TooltipDialog,
			ContainerActionBar, saveAs,
			GridContainer, IDMappingAppResultGrid){

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", lang.hitch(function(evt){
		var rel = evt.target.attributes.rel.value;
		var data = downloadTT.get("data");
		var headers = downloadTT.get("headers");
		var filename = "PATRIC_id_mapping";
		// console.log(data, headers);

		var DELIMITER, ext;
		if(rel === 'text/csv'){
			DELIMITER = ',';
			ext = 'csv';
		}else{
			DELIMITER = '\t';
			ext = 'txt';
		}

		var content = data.map(function(d){
			return d.join(DELIMITER);
		});

		saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], {type: rel}), filename + '.' + ext);

		popup.close(downloadTT);
	}));

	var downloadHeaders = ["Source","Target","UniprotKB ACC", "PATRIC ID"];

	var downloadFields = ["source", "target", "uniprotkb_accession", "patric_id"];

	return declare([GridContainer], {
		gridCtor: IDMappingAppResultGrid,
		containerType: "",
		visible: true,
		store: null,

		buildQuery: function(){
		},
		_setQueryAttr: function(q){
		},

		_setStoreAttr: function(store){
			if(this.grid){
				this.grid.store = store;
			}
			this._set('store', store);
		},

		onSetState: function(attr, oldState, state){
			if(!state){
				return;
			}

			if(this.grid){
				this.grid.set('state', state);
			}
		},
		createFilterPanel: function(opts){
			this.containerActionBar = this.filterPanel = new ContainerActionBar({
				region: "top",
				layoutPriority: 7,
				splitter: true,
				"className": "BrowserHeader",
				dataModel: this.dataModel,
				facetFields: this.facetFields,
				state: lang.mixin({}, this.state),
				enableAnchorButton: false,
				currentContainerWidget: this
			});
		},
		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa icon-download fa-2x",
				{
					label: "DOWNLOAD",
					multiple: false,
					validTypes: ["*"],
					tooltip: "Download Table",
					tooltipDialog: downloadTT
				},
				function(){

					downloadTT.set("content", dfc);

					var data = this.grid.store.query("", {});

					var content = data.map(function(o){
						return downloadFields.map(function(field){
							if(o[field] instanceof Array){
								return '"' + o[field].map(function(v){
										return v.replace(/\"/g, "\'");
									}).join(";") + '"'
							}else if(o[field]){
								if(typeof o[field] == "string"){
									return '"' + o[field].replace(/"/g, "'") + '"'
								}else{
									return o[field];
								}
							}else{
								return "";
							}
						})
					});

					downloadTT.set("data", content);
					downloadTT.set("headers", downloadHeaders);

					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([])
	});
});
