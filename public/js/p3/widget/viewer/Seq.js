define([
	"dojo/_base/declare", "./JobResult", "../../WorkspaceManager",
  "dojo/_base/Deferred", "dojo/_base/lang"
], function(declare, JobResult, WS, Deferred, lang){
	return declare([JobResult], {
		containerType: "Seq",
    streamables: null,
		streamableTypes: ["bam", "gff", "vcf.gz", "bigwig"],
    setupResultType: function(){
			if(this.data.autoMeta.app.id){
				this._resultType = this.data.autoMeta.app.id;
			}
			this._appLabel = this._resultType;
      this.urls = [];
			this.jbrowseUrl;
			var _self = this;
      this.getDownloadUrlsForFiles().then(function(objs){
				_self.getJBrowseURLQueryParams()
			});
		},
    getGenomeId: function(){
			var id = this.data.autoMeta.parameters.reference_genome_id;
			if(id){
				return id;
			}
			throw Error("Missing ID");
		},
    getPartnerFile: function(name) {
			// console.log('[Seq] get partner for:',name);
      var partner;
      this._resultObjects.some(function(o){
        if (o.name == name+'.bai') {
          partner = o;
					// console.log('[Seq] found partner:', partner);
          return true;
        }
        else if (o.name == name+'.tbi') {
          partner = o;
					// console.log('[Seq] found partner:', partner);
          return true;
        }
        else return false;
      });
      if (partner) {
        return partner;
      }
      throw Error("Missing partner file");
    },
    getDownloadUrlsForFiles: function() {
      var paths = [];
			var _self = this;
      this._resultObjects.forEach(function(o){
				paths.push(o.path);
      });
			// console.log('[Seq] paths:', paths);

      var _self = this;
      return WS.getDownloadUrls(paths)
        .then(function(urls){
					// console.log('[Seq] urls:', urls)
          for(var i = 0; i < _self._resultObjects.length; i++)
            _self._resultObjects[i].url = urls[i];
          return _self._resultObjects;
        })
    },
    getStreamableFiles: function(){
      if (this.streamables) {
        return this.streamables;
      }

			var _self = this;
      this.streamables = [];
			this._resultObjects.forEach(function(o){
                var name_parts = o.name.split('.');
                var extension = name_parts.pop();
                if (extension == "gz" || extension == "gzip"){
                    extension = name_parts.pop() + "." + extension;
                    if (o.type == "unspecified"){
                        o.type = extension;
                    }
                }
          if (_self.streamableTypes.indexOf(o.type) >= 0 && !o.name.endsWith(".bai")) {
          var jBrowseTrackType;
          var jBrowseStoreType;
          var record;
          switch(o.type){
            case "bam":
              jBrowseTrackType = "JBrowse/View/Track/Alignments2";
              jBrowseStoreType = "JBrowse/Store/SeqFeature/BAM";
							try {
              	var partner = this.getPartnerFile(o.name);
								// console.log('[Seq] object:', o);
								// console.log('[Seq] partner:', partner);
              	record = {'path':o.url, 'keyAndLabel':o.name, 'store':o.id, 'trackType':jBrowseTrackType, 'storeType':jBrowseStoreType, 'baiPath':partner.url};
							} catch (err) {
								// console.log('[Seq] Missing .bai file; no track can be read');
							}
              break;
            case "bigwig":
              jBrowseTrackType = "JBrowse/Store/BigWig";
              jBrowseStoreType = "JBrowse/View/Track/Wiggle/XYPlot";
              record = {'path':o.url, 'keyAndLabel':o.name, 'store':o.id, 'trackType':jBrowseTrackType, 'storeType':jBrowseStoreType};
              break;
            case "gff":
              jBrowseTrackType = "JBrowse/Store/SeqFeature/GFF3";
              jBrowseStoreType = "JBrowse/View/Track/CanvasFeatures";
              record = {'path':o.url, 'keyAndLabel':o.name, 'store':o.id, 'trackType':jBrowseTrackType, 'storeType':jBrowseStoreType};
              break;
            case "vcf.gz":
              jBrowseTrackType = "JBrowse/View/Track/HTMLVariants";
              jBrowseStoreType = "JBrowse/Store/SeqFeature/VCFTabix";
			        try {
              	            var partner = this.getPartnerFile(o.name);
								// console.log('[Seq] object:', o);
								// console.log('[Seq] partner:', partner);
              	            record = {'path':o.url, 'keyAndLabel':o.name, 'store':o.id, 'trackType':jBrowseTrackType, 'storeType':jBrowseStoreType, 'tbiPath':partner.url};
						} catch (err) {
								// console.log('[Seq] Missing .bai file; no track can be read');
						}
              break;
          }
					if (record) this.streamables.push(record);
        }
			}, this);

			return this.streamables;
		},
    getJBrowseURLQueryParams: function(){

			if (this.jbrowseUrl) {
				return this.jbrowseUrl;
			}

      // console.log('[Seq] resultObjects', this._resultObjects);
      this.getStreamableFiles();
      // console.log("[Seq] streamables: ", this.streamables);

      var tracks = [];
      var stores = new Object;
      var labels = [];
      this.streamables.forEach(function(t){

        var track;
        // the first track gets some extra fields
        track = {
          //'scale':'log',
          //'variance_band': 'true',
					'displayMode': 'compact',
          'label': t.keyAndLabel,
          'key': t.keyAndLabel,
          'type': t.trackType,
          'store': t.store
        };

        tracks.push(track);
        labels.push(t.keyAndLabel);

        var store = new Object;
        store.type = t.storeType;
        store.urlTemplate = t.path;
        if(t.baiPath){
          store.baiUrlTemplate = t.baiPath;
        }
        if(t.tbiPath){
            store.tbiUrlTemplate = t.tbiPath;
        }
        stores[t.store] = store;
      }, this);

      // console.log("[Seq] tracks: ", tracks);
      // console.log("[Seq] stores: ", stores);

      this.jbrowseUrl =
        'view_tab=browser&addTracks=' + encodeURIComponent(JSON.stringify(tracks))
        + '&addStores=' + encodeURIComponent(JSON.stringify(stores))
        + '&tracks=PATRICGenes,RefSeqGenes';

      // console.log("[Seq] url params: ", url);
      return this.jbrowseUrl;
		}
	});
});
