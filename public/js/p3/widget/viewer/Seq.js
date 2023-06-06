define([
  'dojo/_base/declare', './JobResult', '../../WorkspaceManager',
  'dojo/_base/Deferred', 'dojo/_base/lang', 'dojo/query', 'dojo/dom-attr',
  'dojo/dom-class', 'dojo/NodeList-traverse', 'dojox/widget/Standby', 'dojo/dom-construct'
], function (declare, JobResult, WS, Deferred, lang, query, domAttr, domClass,
  nodeTraverse, Standby, domConstruct) {
  return declare([JobResult], {
    containerType: 'Seq',
    streamables: null,
    streamableTypes: ['bam', 'gff', 'vcf.gz', 'bigwig', 'gtf'],
    downloadableTypes: ['bam', 'gff', 'vcf.gz', 'bigwig', 'gtf', 'bai', 'tbi'],
    setupResultType: function () {
      if (this.data.autoMeta.app.id) {
        this._resultType = this.data.autoMeta.app.id;
      }
      this._appLabel = this._resultType;
      this.urls = [];
      this.jbrowseUrl;
      var _self = this;

      // This line is hard to understand.  Basically, we query the dom for all
      // <div> nodes that have the 'rel' attribute set to 'ViewTracks', we take
      // the first match ([0]), and then find it's parent container with the
      // closest() method.
      this.buttonWrapper = query('div [rel$=\'ViewTracks\']')[0].closest('.ActionButtonWrapper');
      domClass.toggle(this.buttonWrapper, 'disabled');
      // console.log('[JobResult.Seq] this.buttonWrapper: (disabled) ', this.buttonWrapper);

      this.getDownloadUrlsForFiles().then(function (objs) {
        _self.getJBrowseURLQueryParams();
      });
    },
    getGenomeId: function () {
      var id = this.data.autoMeta.parameters.reference_genome_id;
      if (id) {
        return id;
      }
      throw Error('Missing ID');
    },
    getPartnerFile: function (name) {
      // console.log('[Seq] get partner for:',name);
      var partner;
      this._resultObjects.some(function (o) {
        if (o.name == name + '.bai') {
          partner = o;
          // console.log('[Seq] found partner:', partner);
          return true;
        }
        else if (o.name == name + '.tbi') {
          partner = o;
          // console.log('[Seq] found partner:', partner);
          return true;
        }
        return false;
      });
      if (partner) {
        return partner;
      }
      throw Error('Missing partner file');
    },
    getDownloadUrlsForFiles: function () {
      var paths = [];
      var _self = this;

      _self._downloadableObjects = [];
      this._resultObjects.forEach(function (o) {
        var name_parts = o.name.split('.');
        var extension = name_parts.pop();
        if (extension === 'gz') {
          extension = name_parts.pop() + '.' + extension;
        }
        if (_self.downloadableTypes.indexOf(o.type) > -1 || _self.downloadableTypes.indexOf(extension) > -1) {
          paths.push(o.path);
          _self._downloadableObjects.push(o);
        }
      });
      // console.log('[Seq] paths:', paths);
      var _self = this;
      return WS.getDownloadUrls(paths)
        .then(function (urls) {
          // console.log('[Seq] urls:', urls)
          for (var i = 0; i < _self._downloadableObjects.length; i++)
          { _self._downloadableObjects[i].url = urls[i]; }
          return _self._downloadableObjects;
        });
    },
    getStreamableFiles: function () {
      if (this.streamables) {
        return this.streamables;
      }

      var _self = this;
      this.streamables = [];
      this._resultObjects.forEach(function (o) {
        var name_parts = o.name.split('.');
        var extension = name_parts.pop();
        if (extension == 'gz' || extension == 'gzip') {
          extension = name_parts.pop() + '.' + extension;
          if (o.type == 'unspecified') {
            o.type = extension;
          }
        }
        if (_self.streamableTypes.indexOf(o.type) >= 0 && !o.name.endsWith('.bai')) {
          var jBrowseTrackType;
          var jBrowseStoreType;
          var record;
          switch (o.type) {
            case 'bam':
              jBrowseTrackType = 'JBrowse/View/Track/Alignments2';
              jBrowseStoreType = 'JBrowse/Store/SeqFeature/BAM';
              try {
                var partner = this.getPartnerFile(o.name);
                // console.log('[Seq] object:', o);
                // console.log('[Seq] partner:', partner);
                record = {
                  path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType, baiPath: partner.url
                };
              } catch (err) {
                // console.log('[Seq] Missing .bai file; no track can be read');
              }
              break;
            case 'bigwig':
              jBrowseTrackType = 'JBrowse/Store/BigWig';
              jBrowseStoreType = 'JBrowse/View/Track/Wiggle/XYPlot';
              record = {
                path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType
              };
              break;
            case 'gff':
              jBrowseStoreType = 'JBrowse/Store/SeqFeature/GFF3';
              jBrowseTrackType = 'JBrowse/View/Track/CanvasFeatures';
              record = {
                path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType
              };
              break;
            case 'vcf.gz':
              jBrowseTrackType = 'JBrowse/View/Track/HTMLVariants';
              jBrowseStoreType = 'JBrowse/Store/SeqFeature/VCFTabix';
              try {
                var partner = this.getPartnerFile(o.name);
                // console.log('[Seq] object:', o);
                // console.log('[Seq] partner:', partner);
                record = {
                  path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType, tbiPath: partner.url
                };
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
    getJBrowseURLQueryParams: function () {

      if (this.jbrowseUrl) {
        return this.jbrowseUrl;
      }
      // console.log('[Seq] resultObjects', this._resultObjects);
      this.getStreamableFiles();
      // console.log("[Seq] streamables: ", this.streamables);

      var tracks = [];
      var stores = {};
      var labels = [];
      this.streamables.forEach(function (t) {

        var track;
        // the first track gets some extra fields
        track = {
          // 'scale':'log',
          // 'variance_band': 'true',
          displayMode: 'compact',
          label: t.keyAndLabel,
          key: t.keyAndLabel,
          type: t.trackType,
          store: t.store
        };

        tracks.push(track);
        labels.push(t.keyAndLabel);

        var store = {};
        store.type = t.storeType;
        store.urlTemplate = t.path;
        if (t.baiPath) {
          store.baiUrlTemplate = t.baiPath;
        }
        if (t.tbiPath) {
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

      // console.log("[Seq] url params: ", this.jbrowseUrl);
      domClass.toggle(this.buttonWrapper, 'disabled');
      // console.log('[JobResult.Seq] this.buttonWrapper: (enabled) ', this.buttonWrapper);

      return this.jbrowseUrl;
    },

    getStreamableFilesRNASeq: function () {
      var _self = this;
      this.streamables = [];
      this._resultObjects.forEach(function (o) {
        var name_parts = o.name.split('.');
        var extension = name_parts.pop();
        if (extension == 'gz' || extension == 'gzip') {
          extension = name_parts.pop() + '.' + extension;
          if (o.type == 'unspecified') {
            o.type = extension;
          }
        }
        if (_self.streamableTypes.indexOf(o.type) >= 0 && !o.name.endsWith('.bai')) {
          var jBrowseTrackType;
          var jBrowseStoreType;
          var record;
          switch (o.type) {
            case 'bam':
              jBrowseTrackType = 'JBrowse/View/Track/Alignments2';
              jBrowseStoreType = 'JBrowse/Store/SeqFeature/BAM';
              try {
                var partner = this.getPartnerFileRNASeq(o.path);
                // console.log('[Seq] object:', o);
                // console.log('[Seq] partner:', partner);
                record = {
                  path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType, baiPath: partner.url
                };
              } catch (err) {
              // console.log('[Seq] Missing .bai file; no track can be read');
              }
              break;
            case 'gff':
              jBrowseStoreType = 'JBrowse/Store/SeqFeature/GFF3';
              jBrowseTrackType = 'JBrowse/View/Track/CanvasFeatures';
              record = {
                path: o.url, keyAndLabel: o.name, store: o.id, trackType: jBrowseTrackType, storeType: jBrowseStoreType
              };
              break;
          }
          if (record) this.streamables.push(record);
        }
      }, this);

      return this.streamables;
    },

    getDownloadUrlsForFilesRNASeq: function () {
      var def = new Deferred();
      var paths = [];
      var _self = this;

      _self._downloadableObjects = [];
      this._resultObjects.forEach(function (o) {
        var name_parts = o.name.split('.');
        var extension = name_parts.pop();
        if (extension === 'gz') {
          extension = name_parts.pop() + '.' + extension;
        }
        if (_self.downloadableTypes.indexOf(o.type) > -1 || _self.downloadableTypes.indexOf(extension) > -1) {
          paths.push(o.path);
          _self._downloadableObjects.push(o);
        }
      });
      // console.log('[Seq] paths:', paths);
      WS.getDownloadUrls(paths)
        .then(function (urls) {
          // console.log('[Seq] urls:', urls)
          for (var i = 0; i < _self._resultObjects.length; i++)
          {
            var idx = paths.indexOf(_self._resultObjects[i].path);
            if (idx >= 0) {
              _self._resultObjects[i].url = urls[idx];
            }
            // _self._downloadableObjects[i].url = urls[i];
          }
          // I don't think I need to resolve it with anything
          def.resolve(_self._downloadableObjects);
        });
      return def;
    },

    getPartnerFileRNASeq: function (path) {
      // console.log('[Seq] get partner for:',name);
      var partner;
      this._resultObjects.some(function (o) {
        if (o.path == path + '.bai') {
          partner = o;
          // console.log('[Seq] found partner:', partner);
          return true;
        }
        else if (o.path == path + '.tbi') {
          partner = o;
          // console.log('[Seq] found partner:', partner);
          return true;
        }
        return false;
      });
      if (partner) {
        return partner;
      }
      throw Error('Missing partner file');
    },

    getJBrowseURLQueryParamsRNASeq: function () {
      var def = new Deferred();
      var _self = this;
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      domConstruct.place(this.loadingMask.domNode, this.domNode, 'last');
      this.loadingMask.startup();
      this.loadingMask.show();
      WS.getFolderContents(this._hiddenPath, true, true)
        .then(function (objs) {
          _self._resultObjects = objs;
          _self.getDownloadUrlsForFilesRNASeq().then(function (objs) {

            // console.log('[Seq] resultObjects', this._resultObjects);
            _self.getStreamableFilesRNASeq();
            // console.log("[Seq] streamables: ", this.streamables);

            var tracks = [];
            var stores = {};
            var labels = [];
            _self.streamables.forEach(function (t) {

              var track;
              // the first track gets some extra fields
              track = {
                // 'scale':'log',
                // 'variance_band': 'true',
                displayMode: 'compact',
                label: t.keyAndLabel,
                key: t.keyAndLabel,
                type: t.trackType,
                store: t.store
              };

              tracks.push(track);
              labels.push(t.keyAndLabel);

              var store = {};
              store.type = t.storeType;
              store.urlTemplate = t.path;
              if (t.baiPath) {
                store.baiUrlTemplate = t.baiPath;
              }
              if (t.tbiPath) {
                store.tbiUrlTemplate = t.tbiPath;
              }
              stores[t.store] = store;
            }, _self);

            // console.log("[Seq] tracks: ", tracks);
            // console.log("[Seq] stores: ", stores);

            _self.jbrowseUrl =
        'view_tab=browser&addTracks=' + encodeURIComponent(JSON.stringify(tracks))
        + '&addStores=' + encodeURIComponent(JSON.stringify(stores))
        + '&tracks=PATRICGenes,RefSeqGenes';

            // console.log("[Seq] url params: ", this.jbrowseUrl);
            domClass.toggle(_self.buttonWrapper, 'disabled');
            // console.log('[JobResult.Seq] this.buttonWrapper: (enabled) ', this.buttonWrapper);
            if (_self.loadingMask) {
              _self.loadingMask.hide();
            }
            def.resolve(_self.jbrowseUrl);
          });
        });
      return def;
    }
  });
});
