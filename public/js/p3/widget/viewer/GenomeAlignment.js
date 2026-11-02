define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dijit/layout/ContentPane',
  'd3.v5/d3.min', './Base', '../../WorkspaceManager',
  '../../DataAPI', 'dojo/promise/all', '../../util/loading', '../DataItemFormatter',
  'dijit/Dialog', 'dojox/widget/Standby', 'dojo/query', 'mauve_viewer/dist/mauve-viewer',
  'xstyle/css!mauve_viewer/dist/mauve-viewer.css'
], function (
  declare, domConstruct, ContentPane,
  d3, ViewerBase, WorkspaceManager,
  DataAPI, all, Loading, DataItemFormatter,
  Dialog, Standby, query, MauveViewer
) {

  return declare([ViewerBase], {
    apiServiceUrl: window.App.dataAPI,
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      var self = this;

      var parts = state.pathname.split('/');
      // Decode URL-encoded path components (e.g., spaces encoded as %20)
      var path = '/' + parts.slice(2).map(function (p) {
        return decodeURIComponent(p);
      }).join('/');

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

      var loading = Loading(container, 'fetching alignment data...');
      WorkspaceManager.getObject(path).then(function (res) {
        var rawData = JSON.parse(res.data);
        var lcbs = Array.isArray(rawData) ? rawData : (rawData.lcbs || []);
        var contigLayout = (!Array.isArray(rawData) && rawData.contig_layout) ? rawData.contig_layout :
          ((lcbs.length && lcbs[0].length && lcbs[0][0]._contig_layout) ? lcbs[0][0]._contig_layout : null);

        // get ids from alignment file (to be removed)
        var ext;
        var ids = [];
        lcbs.forEach(function (lcbSet) {
          lcbSet.forEach(function (r) {
            if (!r || !r.name) return;
            ext = r.name.split('.').pop();
            var name = r.name.replace('.' + ext, '');
            if (ids.indexOf(name) == -1) ids.push(name);
          });
        });

        // fetch all mauve data and load viewer
        loading.text('fetching genome data...');
        self.getMauveData(ids, ext, contigLayout, lcbs)
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
            query('h4', container)[0].innerHTML = '<h4 class="title">Genome Alignment</h4>';
          }, function (error) {
            loading.error('Could not fetch genome data.', error);
          });
      }, function (error) {
        loading.error('Could not fetch alignment data.', error);
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

      DataAPI.queryGenomeFeatures(`eq(patric_id,${encodeURIComponent(fid)})`)
        .then(r => { return r.items })
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
        var query = 'eq(genome_id,' + id + ')' +
          '&select(' + self.featureSelect.join(',') + ')&eq(annotation,PATRIC)&ne(feature_type,source)';
        return DataAPI.queryGenomeFeatures(query, { limit: 25000 }).then(r => { return r.items });
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

      var proms = genomeIDs.map(function (id) {
        var query = 'eq(genome_id,' + id + ')' +
            '&select(' + self.contigSelect.join(',') + ')&sort(-length,+sequence_id)';
        return DataAPI.queryGenomeSequences(query, { limit: 25000 }).then(r => { return r.items });
      });

      return all(proms);
    },

    /**
     * takes genomes ids, provides mapping to lac
     * @param {*} genomeIDs list of genome ids
     * @param {*} ext mauve extension (to be removed)
     */
    getGenomeLabels: function (genomeIDs, ext) {
      var query = 'in(genome_id,(' + genomeIDs.join(',') + '))';
      // '&select(genome_id,genome_name)';
      return DataAPI.queryGenomes(query, { select: ['genome_id', 'genome_name'] })
        .then(r => { return r.items })
        .then(function (data) {
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
      contigs.forEach(function (c) {
        // get all features in this contig
        var contigFeatures = features.filter(function (f) {
          return f.sequence_id == c.sequence_id || (c.accession && (f.accession == c.accession || f.sequence_id == c.accession));
        });

        // set xStart/xEnd using contig's start/end (and reverse-complement if contig is oriented '-')
        contigFeatures = contigFeatures.map(function (f) {
          if (c.strand === '-') {
            f.xStart = ntPos + Math.max(1, c.length - f.end + 1);
            f.xEnd = ntPos + Math.max(1, c.length - f.start + 1);
            f.strand = (f.strand === '+' || f.strand === 1) ? '-' : '+';
          } else {
            f.xStart = ntPos + f.start;
            f.xEnd = ntPos + f.end;
          }
          return f;
        });

        newFeatures = newFeatures.concat(contigFeatures);
        ntPos += c.length;
      });

      return newFeatures;
    },

    setContigPositions: function (contigs, genomeLayout) {
      var orderedContigs = contigs || [];
      if (genomeLayout && Array.isArray(genomeLayout) && genomeLayout.length > 0 && orderedContigs.length > 0) {
        var usedIdx = {};
        var reordered = [];
        genomeLayout.forEach(function (item) {
          var targetId = item.sequence_id || item.contig;
          var targetLower = targetId ? String(targetId).toLowerCase() : '';
          var foundIdx = -1;
          for (var i = 0; i < orderedContigs.length; i++) {
            if (usedIdx[i]) continue;
            var c = orderedContigs[i];
            if (c.sequence_id === targetId || c.accession === targetId ||
                (c.sequence_id && String(c.sequence_id).toLowerCase() === targetLower) ||
                (c.accession && String(c.accession).toLowerCase() === targetLower)) {
              foundIdx = i;
              break;
            }
          }
          if (foundIdx !== -1) {
            usedIdx[foundIdx] = true;
            var matched = orderedContigs[foundIdx];
            matched.strand = item.strand || '+';
            if (item.bp_length && (!matched.length || matched.length < item.bp_length)) {
              matched.length = item.bp_length;
            }
            reordered.push(matched);
          }
        });
        for (var j = 0; j < orderedContigs.length; j++) {
          if (!usedIdx[j]) {
            orderedContigs[j].strand = orderedContigs[j].strand || '+';
            reordered.push(orderedContigs[j]);
          }
        }
        orderedContigs = reordered;
      }

      var ntPos = 1;
      orderedContigs.forEach(function (c) {
        c.xStart = ntPos;
        c.xEnd = ntPos + c.length - 1;
        ntPos += c.length;
      });

      return orderedContigs;
    },

    /**
     * gets all data required for the viewer
     * @param {*} genomeIDs list of genome ids
     * @param {*} ext the mauve output file extension (to be removed)
     * @param {*} contigLayout optional Panaconda contig layout & orientation metadata
     * @param {*} lcbs optional LCB array to snap contig-relative coordinates to exact sequence lengths
     */
    getMauveData: function (genomeIDs, ext, contigLayout, lcbs) {
      var self = this;

      var nameProm = self.getGenomeLabels(genomeIDs, ext);

      var featProm = self.getFeatures(genomeIDs)
        .then(function (data) {
          var mapping = {};
          genomeIDs.forEach(function (id, i) { mapping[id] = data[i]; });
          return mapping;
        });

      var contigProm = self.getContigs(genomeIDs)
        .then(function (data) {
          var mapping = {};
          genomeIDs.forEach(function (id, i) { mapping[id] = data[i]; });
          return mapping;
        });

      return all([nameProm, featProm, contigProm])
        .then(function (data) {
          var labels = data[0],
            featuresObj = data[1],
            contigsObj = data[2];

          // update contig metadata with locations of contigs
          var contigs = {};
          var contigLookup = {};
          genomeIDs.forEach(function (genomeID) {
            var gLayout = contigLayout && contigLayout[genomeID] ? contigLayout[genomeID] : null;
            contigs[genomeID] = self.setContigPositions(contigsObj[genomeID], gLayout);
            contigLookup[genomeID] = {};
            contigs[genomeID].forEach(function (c) {
              if (c.sequence_id) {
                contigLookup[genomeID][c.sequence_id] = c;
                contigLookup[genomeID][String(c.sequence_id).toLowerCase()] = c;
              }
              if (c.accession) {
                contigLookup[genomeID][c.accession] = c;
                contigLookup[genomeID][String(c.accession).toLowerCase()] = c;
              }
            });
          });

          // Snap Panaconda contig-relative LCB coordinates to exact DataAPI contig offsets/lengths
          if (contigLayout && Array.isArray(lcbs)) {
            lcbs.forEach(function (lcbSet) {
              lcbSet.forEach(function (r) {
                if (!r || !r.name || !r.contig || r.local_start === undefined || r.local_end === undefined) return;
                var gid = r.name.slice(0, r.name.lastIndexOf('.'));
                var gMap = contigLookup[gid];
                if (!gMap) return;
                var c = gMap[r.contig] || gMap[String(r.contig).toLowerCase()];
                if (!c) return;
                var cOff = c.xStart - 1;
                if (c.strand === '-') {
                  r.start = cOff + Math.max(1, c.length - r.local_end + 1);
                  r.end = cOff + Math.max(1, c.length - r.local_start + 1);
                } else {
                  r.start = cOff + r.local_start;
                  r.end = cOff + r.local_end;
                }
              });
            });
          }

          // update feature metadata with locations of features
          var features = {};
          Object.keys(contigs).forEach(function (gid) {
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
