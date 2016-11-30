define([
	"dojo/_base/declare", "dojo/_base/lang",
	"swfobject/swfobject"
], function(declare, lang,
			swfobject){

	return declare([], {
		flashDom: null,
		currentData: null,

		initializeFlash: function(domName){
			var flashVars = {
				showLog: false,
				startColor: '0x6666ff',
				endColor: '0x00ff00'
			};
			var params = {
				quality: 'high',
				bgcolor: "#ffffff",
				allowscriptaccess: 'sameDomain',
				allowfullscreen: false,
				wmode: 'transparent'
			};
			var attributes = {
				id: domName,
				name: domName
			};
			var target = document.getElementById("flashTarget");
			// binding flash functions
			window.flashReady = lang.hitch(this, "flashReady");
			window.flashRequestsData = lang.hitch(this, "flashRequestsData");
			window.flashCellClicked = lang.hitch(this, "flashCellClicked");
			window.flashCellsSelected = lang.hitch(this, "flashCellsSelected");

			swfobject.embedSWF('/js/p3/resources/HeatmapViewer.swf', target, '99%', '100%', 19, '/js/swfobject/lib/expressInstall.swf', flashVars, params, attributes);
			this.flashDom = document.getElementById(domName);
		},

		exportCurrentData: function(isTransposed){
			// compose heatmap raw data in tab delimited format
			// this de-transpose (if it is transposed) so that cluster algorithm can be applied to a specific data type

			var cols, rows, id_field_name, data_field_name, tablePass = [], header = [''];

			if(isTransposed){
				cols = this.currentData.rows;
				rows = this.currentData.columns;
				id_field_name = 'rowID';
				data_field_name = 'colID';
			}else{
				cols = this.currentData.columns;
				rows = this.currentData.rows;
				id_field_name = 'colID';
				data_field_name = 'rowID';
			}

			cols.forEach(function(col){
				header.push(col[id_field_name]);
			});

			tablePass.push(header.join('\t'));

			for(var i = 0, iLen = rows.length; i < iLen; i++){
				var r = [];
				r.push(rows[i][data_field_name]);

				for(var j = 0, jLen = cols.length; j < jLen; j++){
					if(isTransposed){
						r.push(parseInt(rows[i].distribution[j * 2] + rows[i].distribution[j * 2 + 1], 16));
					}else{
						r.push(parseInt(cols[j].distribution[i * 2] + cols[j].distribution[i * 2 + 1], 16));
					}
				}

				tablePass.push(r.join('\t'));
			}

			return tablePass.join('\n');
		},

		// flash interface functions
		flashReady: function(){
			// update this.currentData
			// this.flashDom.refreshData();
		},
		flashRequestsData: function(){
			return this.currentData;
		},
		flashCellClicked: function(flashObjectID, colID, rowID){
			// implement
		},
		flashCellsSelected: function(flashObjectID, colIDs, rowIDs){
			// implement
		}
	});
});