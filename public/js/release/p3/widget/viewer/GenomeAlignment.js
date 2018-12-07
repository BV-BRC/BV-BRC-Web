define("p3/widget/viewer/GenomeAlignment", [
  'dojo/_base/declare', 'dojo/dom-construct', 'dijit/layout/ContentPane',
  'd3.v5/d3.min', './Base', '../../WorkspaceManager',
  '../../DataAPI', 'dojo/promise/all', '../../util/loading', '../DataItemFormatter',
  'dijit/Dialog', 'dojox/widget/Standby'
], function (
  declare, domConstruct, ContentPane,
  d3, ViewerBase, WorkspaceManager,
  DataAPI, all, Loading, DataItemFormatter,
  Dialog, Standby
) {

  return declare([ViewerBase], {
    apiServiceUrl: window.App.dataAPI,
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      var self = this;

      var parts = state.pathname.split('/');
      var path = '/' + parts.slice(2).join('/');

      // reset/override global and jbrowse styling
      domConstruct.create('style', {
        innerHTML: '' +
          '.mauve-viewer .feature { height: 10px; }' +
          '.mauve-viewer div.tooltip { background-color: #000; }' +
          '.mauve-viewer { font-size: initial; }'
      }, this.viewer.domNode);

      domConstruct.place('<br>', this.viewer.domNode);
      var container = domConstruct.toDom('<div style="margin: 0 auto; width:1024px;"></div>');
      domConstruct.place(container, this.viewer.domNode);

      Loading(container);
      WorkspaceManager.getObject(path).then(function (res) {
        var lcbs = JSON.parse(res.data);

        // get ids from alignment file (to be removed)
        var ext;
        var ids = [];
        lcbs.forEach(function (lcbSet) {
          lcbSet.forEach(function (r) {
            ext = r.name.split('.').pop();
            var name = r.name.replace('.' + ext, '');
            if (!ids.includes(name)) ids.push(name);
          });
        });

        // fetch all mauve data and load viewer
        self.getMauveData(ids, ext)
          .then(function (data) {
            new MauveViewer({
              ele: container,
              d3: d3,
              lcbs: lcbs,
              labels: data.labels,
              features: data.features,
              contigs: data.contigs,
              onFeatureClick: function (fid) {
                self.onFeatureClick(fid);
              }
            });
          });
      });

      window.document.title = 'PATRIC Mauve Viewer';
    },

    onFeatureClick: function (fid) {
      var loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(loadingMask);
      loadingMask.startup();
      loadingMask.show();

      var path = '/genome_feature/?eq(patric_id,' + encodeURIComponent(fid) + ')';
      DataAPI.get(path)
        .then(function (data) {
          loadingMask.hide();
          var content = DataItemFormatter(data[0], 'feature_data', { linkTitle: true });
          if (!window.featureDialog) {
            window.featureDialog = new Dialog({ title: 'Feature Summary' });
          }
          window.featureDialog.set('content', content);
          window.featureDialog.show();
        });
    },

    featureSelect: [
      'patric_id', 'sequence_id', 'start', 'end',
      'strand', 'annotation', 'feature_type',
      'product', 'accession', 'refseq_locus_tag', 'gene'
    ],

    contigSelect: [
      'topology', 'gi', 'accession', 'length',
      'sequence_id', 'gc_content', 'chromosome',
      'sequence_type', 'chromosome', 'description'
    ],

    /**
     * retrieves specific PATRIC annotation feature metadata, ignoring source features
     * @param {*} genomeIDs list of genome ids
     */
    getFeatures: function (genomeIDs) {
      var self = this;
      genomeIDs = Array.isArray(genomeIDs) ? genomeIDs : [genomeIDs];

      var proms = genomeIDs.map(function (id) {
        var path = '/genome_feature/?eq(genome_id,' + id + ')' +
          '&select(' + self.featureSelect.join(',') + ')&eq(annotation,PATRIC)&ne(feature_type,source)&limit(25000)';
        return DataAPI.get(path);
      });

      return all(proms);
    },

    /**
     * gets secific contig metadata, sorted by largest to smallest
     *  (secondary sort of sequence_id)
     * @param {*} genomeIDs list of genome ids
     */
    getContigs: function (genomeIDs) {
      var self = this;
      genomeIDs = Array.isArray(genomeIDs) ? genomeIDs : [genomeIDs];

      var proms = genomeIDs.map(id => {
        var path = '/genome_sequence/?eq(genome_id,' + id + ')' +
            '&select(' + self.contigSelect.join(',') + ')&sort(-length,+sequence_id)&limit(25000)';
        return DataAPI.get(path);
      });

      return all(proms);
    },

    /**
     * takes genomes ids, provides mapping to lac
     * @param {*} genomeIDs list of genome ids
     * @param {*} ext mauve extension (to be removed)
     */
    getGenomeLabels: function (genomeIDs, ext) {
      var path = '/genome/?in(genome_id,(' + genomeIDs.join(',') + '))' +
          '&select(genome_id,genome_name)';

      return DataAPI.get(path).then(function (data) {
        var mapping = {};
        data.forEach(function (org) {
          mapping[org.genome_id  + '.' + ext] = org.genome_name;
        });

        return mapping;
      });
    },

    /**
     * adds "position" in genome "xStart"/"xEnd" to given features
     * @param {*} contigs list of contig meta objects (needed for position)
     * @param {*} features list of feature meta objects
     */
    setFeaturePositions: function (contigs, features) {
      var newFeatures = [];
      var ntPos = 0;
      contigs.forEach(c => {
        // get all features in this contig
        var contigFeatures = features.filter(f => f.sequence_id == c.sequence_id);

        // set xStart/xEnd using contig's start/end
        contigFeatures = contigFeatures.map(f => {
          f.xStart = ntPos + f.start;
          f.xEnd = ntPos + f.end;
          return f;
        });

        newFeatures = newFeatures.concat(contigFeatures);
        ntPos += c.length;
      });

      return newFeatures;
    },

    setContigPositions: function (contigs) {
      var ntPos = 1;
      contigs.forEach(c => {
        c.xStart = ntPos;
        c.xEnd = ntPos + c.length - 1;
        ntPos += c.length;
      });

      return contigs;
    },

    /**
     * gets all data required for the viewer
     * @param {*} genomeIDs list of genome ids
     * @param {*} ext the mauve output file extension (to be removed)
     */
    getMauveData: function (genomeIDs, ext) {
      let self = this;

      var nameProm = self.getGenomeLabels(genomeIDs, ext);

      var featProm = self.getFeatures(genomeIDs)
        .then(data => {
          var mapping = {};
          genomeIDs.forEach((id, i) => { mapping[id] = data[i]; });

          return mapping;
        });

      var contigProm = self.getContigs(genomeIDs)
        .then(data => {
          var mapping = {};
          genomeIDs.forEach((id, i) => { mapping[id] = data[i]; });
          return mapping;
        });

      return all([nameProm, featProm, contigProm])
        .then(([labels, featuresObj, contigsObj]) => {
          // update contig metadata with locations of contigs
          var contigs = {};
          genomeIDs.forEach((genomeID, i) => {
            contigs[genomeID] = self.setContigPositions(contigsObj[genomeID]);
          });

          // update feature metadata with locations of features
          var features = {};
          Object.keys(contigs).forEach(gid => {
            features[gid] = self.setFeaturePositions(contigs[gid], featuresObj[gid]);
          });

          return {
            labels: labels,
            contigs: contigs,
            features: features
          };
        });
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new ContentPane({
        region: 'center',
        style: 'padding:0',
        content: ''
      });

      this.addChild(this.viewer);
    }
  });

});
