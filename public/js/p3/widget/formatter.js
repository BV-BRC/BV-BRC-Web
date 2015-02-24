define(["dojo/date/locale","dojo/dom-construct","dojo/dom-class"],function(locale,domConstruct,domClass){

	var dateFormatter =  function(obj,format){
		if (!obj || obj=="0001-01-01T00:00:00Z") { return "" }
		if (typeof obj == "string") {
			obj = new Date(Date.parse(obj));
		}else if (typeof obj == "number") {
			obj = new Date(obj);
		}
		if (!obj || !obj.getMonth){ return " " }
	
		return locale.format(obj,format || {formatLenght: "short"});
	} 

	return {
		dateOnly: function(obj){
			return dateFormatter(obj, {selector: "date", formatLength: "short"});	
		},
		date: dateFormatter,

		humanFileSize: function(bytes, si) {
			if (!bytes && bytes !==0) { return "" }
			var thresh = si ? 1000 : 1024;
			if(bytes < thresh) return bytes + ' B';
			var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
			var u = -1;
			do {
				bytes /= thresh;
				++u;
			} while(bytes >= thresh);
			return bytes.toFixed(1)+' '+units[u];
		},

		multiDate: function(fields){
			return function(obj){
				var out=[];
				fields.forEach(function(f){
					out.push("<div>" + dateFormatter(obj[f]) + "</div>");
				});
				return out.join("");
			}
		},

		lineage: function(val){
			var out=[];
			if (val && val instanceof Array){
				out = val.reverse().map(function(t){
					return '/ <a href="/taxonomy/' + t.NCBI_TAX_ID + '" rel="cid/widget/TaxonomyViewer">' + t.NAME + "</a>&nbsp;"
				});
				return out.join('');
			} 
			return val;	
		},
		baseUsername: function(val){
			if (!val) { return "" }
			var parts = val.split("@");
			return parts[0];
		},
		status: function(val){
			return val;
			switch (val) {
				case "completed":
					return '<i class="fa fa-check fa-1x" title="Folder" />'
				case "queued":
					return '<i class="fa icon-contigs fa-1x" title="Contigs" />'
			}
		},	
		wsItemType: function(val){
			switch (val) {
				case "parentfolder":
					return '<i class="fa fa-level-up fa-1x" title="Folder" />'
				case "folder":
					return '<i class="fa fa-folder fa-1x" title="Folder" />'
				case "contigs":
					return '<i class="fa icon-contigs fa-1x" title="Contigs" />'
				case "fasta":
					return '<i class="fa icon-fasta fa-1x" title="Contigs" />'
				case "feature_group":
					return '<i class="fa icon-genome-features fa-1x" title="Contigs" />'
				case "genome_group":
					return '<i class="fa icon-genome fa-1x" title="Contigs" />'
				default: 
					return '<i class="fa fa-file fa-1x" title="Unspecified Document Type" />'
			}
		}

	}
});


