define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../../WorkspaceManager", "dojo/_base/lang",
	"dojo/dom-attr"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, WorkspaceManager, lang,
			domAttr){
	return declare([BorderContainer], {
		"baseClass": "Model",
		"disabled": false,
		"query": null,
		data: null,
		containerType: "model",
		_setDataAttr: function(data){
			this.data = data;
			console.log("Model Data: ", data);
			this.refresh();
		},
		getModelPath: function(){
			return this.data.path + this.data.name;
		},
		refresh: function(){
			var self = this;

			if(!this._started){
				return;
			}
			if(this.data){
				var output = ['<div><div style="width:370px;"><h3 style="background:white;" class="section-title normal-case close2x"><span style="background:white" class="wrap">'];
				output.push("Metabolic Model - " + this.data.name + '</span></h3></div>');
				/*
				output.push('<div>'+
					'<div>View in:</div> <a href="http://modelseed.theseed.org/#/model'+this.data.path+this.data.name+'?login=patric" target="_blank">'+
					'<img src="/js/p3/resources/images/modelseed-logo.png" height="25"></a>'+
				'</div>')
				*/

				output.push(this.metaTable());

				// get download links for related downloads
				var downloads = [];
				var path = this.data.path + '.' + this.data.name;
				WorkspaceManager.getFolderContents(path, true, true)
					.then(function(objs){
						var paths = [];
						for(var i = 0; i < objs.length; i++){
							var obj = objs[i];
							if(obj.type !== 'string') continue;

							downloads.push({
								path: obj.path,
								name: obj.name,
								size: formatter.humanFileSize(obj.size, 1)
							});
							paths.push(obj.path);
						}

						// fetch downloads urls, return objs containing them
						return WorkspaceManager.getDownloadUrls(paths)
							.then(function(urls){
								for(var i = 0; i < downloads.length; i++)
									downloads[i].url = urls[i];
								return downloads;
							})
					}).then(function(dls){
					// add download table
					output.push('<h3>Downloads</h3>');
					var table = ['<table class="basic stripe far2x"><thead><tr><th>File</th><th>Size</th></thead>'];
					for(var i in dls){
						var dl = dls[i];
						table.push('<tr>' +
							'<td><a href="' + dl.url + '"><i class="fa fa-download"><i> ' + dl.name + '</a></td>' +
							'<td>' + dl.size + '</td>' +
							'<tr>');
					}
					table.push('</table>');

					output = output.concat(table);
					self.viewer.set("content", output.join(""));
				})
			}
		},

		metaTable: function(){
			var m = this.data.autoMeta;

			var table = [{label: 'Organism', value: m.name},
				{label: 'File Name', value: m.id},
				{label: 'Reactions', value: m.num_reactions},
				{label: 'Compounds', value: m.num_compounds},
				{label: 'Genes', value: m.num_genes},
				{label: 'Biomasses', value: m.num_biomasses},
				{label: 'Source', value: m.source}];

			return this.keyValueTable(table);
		},

		keyValueTable: function(spec){
			var table = ['<table class="basic stripe far2x" id="data-table"><tbody>'];
			for(var i = 0; i < spec.length; i++){
				var row = spec[i];
				table.push('<tr><td><b>' + row.label + '</b></td><td>' + row.value + '</td></tr>');
			}
			table.push("</tbody></table>");
			return table.join("");
		},

		startup: function(){
			console.log("Model Viewer Startup()");
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.viewer = new ContentPane({content: "Loading Metabolic Model...", region: "center"});
			this.addChild(this.viewer);
			this.refresh();

			/*
			this.on("i:click", function(evt){
				var rel = domAttr.get(evt.target,'rel');
				if (rel) {
					WorkspaceManager.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
			*/
		}
	});
});
