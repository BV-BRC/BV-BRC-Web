define("p3/widget/viewer/Seq", [
	"dojo/_base/declare", "./JobResult", "../../WorkspaceManager",
  "dojo/_base/Deferred", "dojo/_base/lang"
], function(declare, JobResult, WS, Deferred, lang){
	return declare([JobResult], {
		containerType: "Seq",
    streamables: null,
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
      var partner;
      this._resultObjects.some(function(o){
        if (o.name == name+'.bai') {
          partner = o;
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
      this._resultObjects.forEach(function(o){
        paths.push(o.path+o.name);
      });

      var _self = this;
      return WS.getDownloadUrls(paths)
        .then(function(urls){
          for(var i = 0; i < _self._resultObjects.length; i++)
            _self._resultObjects[i].url = urls[i];
          return _self._resultObjects;
        })
    },
    getStreamableFiles: function(){
      if (this.streamables) {
        return this.streamables;
      }

      this.streamables = [];
      var streamableTypes = ["bam", "gff", "vcf", "bigwig"];
			this._resultObjects.forEach(function(o){
          if (streamableTypes.indexOf(o.type) >= 0 && !o.name.endsWith(".bai")) {
          var jBrowseTrackType;
          var jBrowseStoreType;
          var record;
          switch(o.type){
            case "bam":
              jBrowseTrackType = "JBrowse/View/Track/Alignments2";
              jBrowseStoreType = "JBrowse/Store/SeqFeature/BAM";
							try {
              	var partner = this.getPartnerFile(o.name)
              	record = {'path':o.url, 'keyAndLabel':o.name, 'store':o.id, 'trackType':jBrowseTrackType, 'storeType':jBrowseStoreType, 'baiPath':partner.url};
							} catch (err) {
								console.log('Missing .bai file; no track can be read');
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

      //console.log('[Seq] resultObjects', this._resultObjects);
      this.getStreamableFiles();
      //console.log("[Seq] streamables: ", this.streamables);

      var tracks = [];
      var stores = new Object;
      var labels = [];
      this.streamables.forEach(function(t){

        var track;
        // the first track gets some extra fields
        if (tracks.length < 1) {
          track = {
            'style': {'height':200},
            'scale':'log',
            'variance_band': 'true',
            'label': t.keyAndLabel,
            'key': t.keyAndLabel,
            'type': t.trackType,
            'store': t.store
          };
        } else {
          track = {
            'type': t.trackType,
            'key': t.keyAndLabel,
            'store': t.store,
            'label': t.keyAndLabel
          };
        }
        tracks.push(track);
        labels.push(t.keyAndLabel);

        var store = new Object;
        store.type = t.storeType;
        store.urlTemplate = t.path;
        if(t.baiPath){
          store.baiUrlTemplate = t.baiPath;
        }
        stores[t.store] = store;
      }, this);

      //console.log("[Seq] tracks: ", tracks);
      //console.log("[Seq] stores: ", stores);

      this.jbrowseUrl =
        'view_tab=browser&addTracks=' + encodeURIComponent(JSON.stringify(tracks))
        + '&addStores=' + encodeURIComponent(JSON.stringify(stores))
        + '&tracks=PATRICGenes,RefSeqGenes';

      //console.log("[Seq] url params: ", url);
      return this.jbrowseUrl;
		}
	});
});
