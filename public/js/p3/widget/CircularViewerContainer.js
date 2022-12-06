define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/topic',
  './ActionBar', 'dijit/layout/TabContainer',
  './TrackController', 'circulus/Viewer', 'circulus/LineTrack', 'circulus/HistogramTrack', 'circulus/HeatmapTrack',
  'circulus/SectionTrack', 'circulus/SectionTrackWithLabel', 'dojo/_base/lang', 'dojo/request', './DataItemFormatter', '../util/PathJoin', '../util/searchToQuery'
], function (
  declare, BorderContainer, on, Topic,
  ActionBar, TabContainer,
  TrackController, CirculusViewer, LineTrack, HistogramTrack, HeatmapTrack,
  SectionTrack, SectionTrackWithLabel, lang, xhr, DataItemFormatter, PathJoin, searchToQuery
) {

  var custom_colors = ['blue', 'green', 'orange', 'pink', 'red', 'purple'];
  var user_colors = ['#1E90FF', '#32CD32', '#FF6347', '#FF69B4', '#DC143C', '#8A2BE2'];
  var section_gap = 0.3;
  var genome_size = 0;

  return declare([BorderContainer], {
    gutters: true,
    query: null,
    genome_id: '',
    tooltip: 'The "Circular Viewer" tab provides circular overview of the entire genome and its genomic features',
    apiServiceUrl: window.App.dataAPI,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_genome/circular_genome_viewer.html',

    addActionBar: function () {
      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 4,
        style: 'width:56px;text-align:center;',
        splitter: false,
        currentContainerWidget: this
      });
      this.addChild(this.selectionActionBar);
      this.selectionActionBar.addAction(
        'UserGuide',
        'fa icon-info-circle fa-2x',
        {
          label: 'GUIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Open User Guide in a new Tab'
        },
        lang.hitch(this, function (selection, container) {
          // console.log('USER GUIDE action', container);
          window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
        }),
        true
      );
    },

    _setQueryAttr: function (query) {
    },

    onSetGenomeId: function (attr, oldVal, gid) {
      this.getReferenceSequences(gid).then(lang.hitch(this, function (refseqs) {
        this.set('referenceSequences', refseqs);
      }));
    },

    getReferenceSequences: function (gid, includeSequences, refresh) {

      var query = '?eq(genome_id,' + gid + ')&select(topology,gi,accession,length,sequence_id,gc_content,owner,sequence_type,taxon_id,public,genome_id,genome_name,date_inserted,date_modified' + (includeSequences ? ',sequence' : '') + ')&sort(+accession)&limit(1000)';

      return xhr.get(PathJoin(this.apiServiceUrl, 'genome_sequence', query), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (refseqs) {
        // console.log("refseqs=", refseqs);
        genome_size = 0;
        refseqs = refseqs.map(function (r) {
          r.name = r.accession;
          r.start = 0;
          r.end = r.length;
          genome_size += r.length;
          // console.log("genome_size=", genome_size);
          return r;
        });

        return refseqs;
      }));
    },

    addFeatureTrack: function (title, title_tooltip, gid, filter, strand, fill, stroke, background) {
      var fields = ['feature_id', 'feature_type', 'sequence_id', 'segments', 'gi', 'na_length', 'strand', 'public', 'aa_length', 'patric_id', 'owner',
        'location', 'protein_id', 'refseq_locus_tag', 'taxon_id', 'accession', 'end', 'genome_name', 'product', 'genome_id', 'annotation', 'start'];

      var query = '?and(eq(genome_id,' + gid + '),ne(feature_type,source),' + filter + ')&sort(+accession,+start)&select(' + fields.join(',') + ')&limit(25000)';
      // console.log("******track title:", title, " query:", PathJoin(this.apiServiceUrl, "genome_feature", query));

      var track = this.viewer.addTrack({
        type: SectionTrack,
        options: {
          title: title,
          title_tooltip: title_tooltip,
          loadingText: 'LOADING ' + title.toUpperCase(),
          loading: true,
          trackWidth: 0.05,
          fill: fill,
          stroke: stroke,
          gap: 0,
          background: background,
          formatPopupContent: function (item) {
            // return item.patric_id + " (" + item.feature_type + ")<br>Product: " + item.product + "<br>Location: " + item.location;
            return DataItemFormatter(item, 'feature_data', { mini: true, linkTitle: true });
          },
          formatDialogContent: function (item) {
            return DataItemFormatter(item, 'feature_data', { linkTitle: true });
          }
        }
      });

      return xhr.get(PathJoin(this.apiServiceUrl, 'genome_feature', query), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (refseqs) {
        // console.log("******track title:", title, " refseqs:", refseqs, " strand", strand);

        if (refseqs.length == 0) {
          track.set('loading', false);
          Topic.publish('/Notification', { message: 'No data found.', type: 'error' });

          return refseqs;
        }

        refseqs = refseqs.filter(function (r) {
          if (strand === null) {
            return true;
          }
          if (strand) {
            return r.strand && r.strand == '+';
          }
          return r.strand != '+';

        }).map(function (r) {
          r.name = r.accession;
          r.length = r.end - r.start;
          return r;
        });


        // console.log("******before set data track title:", title, " refseqs:", refseqs, "type of refseqs", typeof refseqs);
        track.set('data', refseqs);

        return refseqs;
      }));
    },

    addSpGeneTrack: function (title, title_tooltip, gid, filter, strand, fill, stroke, background) {
      var fields = ['feature_id', 'feature_type', 'sequence_id', 'segments', 'gi', 'na_length', 'strand', 'public', 'aa_length', 'patric_id', 'owner',
        'location', 'protein_id', 'refseq_locus_tag', 'taxon_id', 'accession', 'end', 'genome_name', 'product', 'genome_id', 'annotation', 'start'];

      // var sp_fields = ["feature_id","patric_id", "evidence", "property", "source"];
      // var sp_query = "?eq(genome_id," + this.state.genome_ids[0] + ")&in(property,(%22Antibiotic%20Resistance%22,%22Virulence%20Factor%22,%22Transporter%22,%22Essential%20Gene%22))&sort(+patric_id,+property)" + "&select(" + sp_fields.join(",") + ")&limit(25000)";
      // var sp_query = "?eq(genome_id," + this.state.genome_ids[0] + ")" + filter + "&sort(+patric_id,+property)" + "&select(" + sp_fields.join(",") + ")&limit(25000)";
      var sp_query = '?eq(genome_id,' + this.state.genome_ids[0] + ')' + filter + '&select(feature_id)&limit(25000)';
      // console.log("sp_query: ", sp_query);

      var track = this.viewer.addTrack({
        type: SectionTrack,
        options: {
          title: title,
          title_tooltip: title_tooltip,
          loadingText: 'LOADING ' + title.toUpperCase(),
          loading: true,
          trackWidth: 0.05,
          fill: fill,
          stroke: stroke,
          gap: 0,
          background: background,
          formatPopupContent: function (item) {
            return DataItemFormatter(item, 'feature_data', { mini: true, linkTitle: true });
          },
          formatDialogContent: function (item) {
            return DataItemFormatter(item, 'feature_data', { linkTitle: true });
          }
        }
      });

      return xhr.get(PathJoin(this.apiServiceUrl, 'sp_gene', sp_query), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (spgenes) {
        // console.log(" spgenes:", spgenes);
        if (spgenes.length == 0) {
          track.set('loading', false);
          Topic.publish('/Notification', { message: 'No data found.', type: 'error' });
          return spgenes;
        }
        var feature_ids = [];

        for (var i = 0; i < spgenes.length; i++) {
          feature_ids.push(spgenes[i].feature_id);
        }

        var query = 'in(feature_id,(' + feature_ids.join(',') + '))&sort(+accession,+start)&select(' + fields.join(',') + ')&limit(25000)';
        // console.log(" query:",  PathJoin(this.apiServiceUrl, "genome_feature", query));

        xhr.post(PathJoin(this.apiServiceUrl, 'genome_feature/'), {
          data: query,
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json'
        }).then(lang.hitch(this, function (refseqs) {
          // console.log(" features:", refseqs);

          if (refseqs.length == 0) {
            track.set('loading', false);
            Topic.publish('/Notification', { message: 'No data found.', type: 'error' });

            return refseqs;
          }
          // console.log(" refseqs:", refseqs);
          refseqs = refseqs.map(function (r) {
            r.name = r.accession;
            r.length = r.end - r.start;
            // console.log(" refseqs mapped:", r);
            return r;
          });

          track.set('data', refseqs);

        }));

      }));
    },

    onSetReferenceSequences: function (attr, oldVal, refseqs) {
      // console.log("RefSeqs: ", refseqs);

      this.viewer.addTrack({
        type: SectionTrackWithLabel,
        options: {
          title: 'Position Label (Mbp)',
          // title_tooltip: "Position Label (Mbp)",
          trackWidth: 0.1,
          // fill: "#eeeeee",
          stroke: null,
          gap: section_gap,
          background: { fill: null, stroke: null }
        },
        data: refseqs
      }, 'perimeter', false);

      this.viewer.addTrack({
        type: SectionTrack,
        options: {
          title: 'Contigs/Chromosomes',
          // title_tooltip: "Contigs/Chromosomes",
          trackWidth: 0.03,
          fill: '#000F7D',
          stroke: null,
          gap: section_gap,
          background: { fill: null, stroke: null },
          formatPopupContent: function (item) {
            return DataItemFormatter(item, 'sequence_data', { mini: true, linkTitle: true });
          },
          formatDialogContent: function (item) {
            return DataItemFormatter(item, 'sequence_data', { linkTitle: true });
          }
        },
        data: refseqs
      }, 'outer', true);

      // console.log("refseqs=", refseqs);
      // this.addFeatureTrack("CDS - FWD", "CDS forward strand", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,CDS))", null, "blue", null);
      this.addFeatureTrack('CDS - FWD', 'CDS forward strand', this.state.genome_ids[0], 'and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,%22+%22))', true, '#307D32', null);
      this.addFeatureTrack('CDS - REV', 'CDS reverse strand', this.state.genome_ids[0], 'and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,%22-%22))', false, '#833B76', null);
      this.addFeatureTrack('Non-CDS Features', 'Non-CDS Features', this.state.genome_ids[0], 'and(eq(annotation,PATRIC),ne(feature_type,CDS))', null, '#21DFD7', null);
      this.addSpGeneTrack('AMR Genes', 'AMR Genes', this.state.genome_ids[0], '&eq(property,%22Antibiotic%20Resistance%22)', null, 'red', null);
      this.addSpGeneTrack('VF Genes', 'VF Genes', this.state.genome_ids[0], '&eq(property,%22Virulence%20Factor%22)', null, 'orange', null);
      this.addSpGeneTrack('Transporters', 'Transporters', this.state.genome_ids[0], '&eq(property,%22Transporter%22)', null, 'blue', null);
      this.addSpGeneTrack('Drug Targets', 'Drug Targets', this.state.genome_ids[0], '&eq(property,%22Drug%20Target%22)', null, 'black', null);
      // this.addSpGeneTrack("Human Homologs", "Human Homologs", this.state.genome_ids[0], "&eq(property,%22Human%20Homolog%22)", null, "lime", null);
      // this.addSpGeneTrack("Essential Genes", "Essential Genes", this.state.genome_ids[0], "&eq(property,%22Essential%20Gene%22)", null, "navy", null);

      /* non-CDS track is modified to use a single color)

      var fillFn = function(item){
        switch(item.feature_type){
          case "pseudogene":
            return "#75DF6F";
          case "tRNA":
            return "#3F76DF";
          case "rRNA":
            return "#DFC63A";
          default:
            return "#21DFD7";
        }
      };
      this.addFeatureTrack("Non-CDS Features", "Non-CDS Features", this.state.genome_ids[0], "and(eq(annotation,PATRIC),ne(feature_type,CDS))", null, fillFn, null, {
        fill: null,
        stroke: null
      });
      */
      // this.addFeatureTrack("Pseudogenes", "Pseudogenes", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,pseudogene))", null, [77, 83, 233], null, {stroke: "", fill: "#eeeeee"})
      // this.addFeatureTrack("tRNA", "tRNA", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,tRNA))", null, [162, 0, 152], null, {stroke: ""})
      // this.addFeatureTrack("rRNA", "rRNA", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,rRNA))", null, [243, 110, 0], null, {stroke: "",fill: "#eeeeee"})

      // test heatmap plot
      // var heatmapFill = function () {
      //   return 'red';
      // };

      /*
      var gcContentTrack3 = this.viewer.addTrack({
        type: HeatmapTrack,

        options: {
          title: "GC Content Heatmap",
          title_tooltip: "GC Content Heatmap",
          loadingText: "LOADING GC CONTENT",
          visible: true,
          max: 1,
          min: 0,
          fill: heatmapFill,
          trackWidth: 0.1,
          stroke: {width: .5, color: "black"},
          gap: 1,
          background: {fill: "#EBD4F4", stroke: null}
        }
      }, "outer");


      var gcContentTrack2 = this.viewer.addTrack({
        type: HistogramTrack,

        options: {
          title: "GC Content Histogram",
          title_tooltip: "GC Content Histogram",
          loadingText: "LOADING GC CONTENT",
          visible: true,
          max: 1,
          min: 0,
          trackWidth: 0.18,
          stroke: {width: .5, color: "black"},
          gap: 1,
          background: {fill: "#EBD4F4", stroke: null}
        }
      }, "outer");
*/

      var gcContentTrack = this.viewer.addTrack({
        type: LineTrack,
        options: {
          title: 'GC Content',
          title_tooltip: 'GC Content - window size: 2000 nt, plot range: 0 - 1',
          loadingText: 'LOADING GC CONTENT',
          visible: true,
          max: 1,
          min: 0,
          trackWidth: 0.1,
          stroke: { width: 0.5, color: 'black' },
          gap: section_gap,
          background: { fill: '#EBD4F4', stroke: null }
        }
      }, 'outer');

      /*
      var gcSkewTrack2 = this.viewer.addTrack({
        type: HeatmapTrack,
        options: {
          title: "GC Skew",
          title_tooltip: "GC Skew",
          loadingText: "LOADING GC SKEW",
          visible: true,
          max: 1,
          min: -1,
          scoreProperty: "skew",
          trackWidth: 0.1,
          stroke: {width: .5, color: "black"},
          gap: 1,
          background: {fill: "#F3CDA0", stroke: null}
        }
      }, "outer");
*/

      var gcSkewTrack = this.viewer.addTrack({
        type: LineTrack,
        options: {
          title: 'GC Skew',
          title_tooltip: 'GC Skew - window size: 2000 nt, plot range: -1 - 1',
          loadingText: 'LOADING GC SKEW',
          visible: true,
          max: 1,
          min: -1,
          scoreProperty: 'skew',
          trackWidth: 0.1,
          stroke: { width: 0.5, color: 'black' },
          gap: section_gap,
          background: { fill: '#F3CDA0', stroke: null }
        }
      }, 'outer');

      var medLength = 100000;
      var minLength = 10000;
      var windowSize = 2000;
      if (genome_size <= minLength) {
        windowSize = 20;
      } else if (genome_size > minLength && genome_size <= medLength) {
        windowSize = 50;
      }

      this.getReferenceSequences(this.genome_id, true).then(lang.hitch(this, function (data) {
        var gcContentData = this.getGCContent(data, windowSize);
        // console.log("GC CONTENT: ", gcContentData);
        // gcContentTrack3.set('data', gcContentData);
        // gcContentTrack2.set('data', gcContentData);
        // gcSkewTrack2.set('data', gcContentData);
        gcContentTrack.set('data', gcContentData);
        gcSkewTrack.set('data', gcContentData);
      }));
    },

    getGCContent: function (data, windowSize) {
      // Circos GC content  default_window_size = 2000
      windowSize = windowSize || 2000;

      var gcData = [];
      // console.log("GC CONTENT: gcContentData data=", data, "windowSize=", windowSize);
      function calculateGC(accession, seq, ws) {
        // var cur = seq;
        // var slen = seq.length;
        var gc = [];
        var current = 0;
        for (current = 0; current < seq.length; current += ws) {
          var win = seq.substr(current, ws).toUpperCase();
          var wl = win.length;
          var G = 0;
          var C = 0;
          var gs = win.match(/G/g || []);
          if (gs) {
            G = gs.length;
          }

          var cs = win.match(/C/g || []);
          if (cs) {
            C = cs.length;
          }

          var GC = G + C; // for skew, (G-C)/(G+C), G+C can't be 0
          if (GC == 0) {
            GC = 1;
          }
          gcData.push({
            accession: accession,
            score: (G + C) / wl,
            skew: (G - C) / GC,
            start: current,
            end: current + wl
          });
        }
        return gc;
      }

      data.forEach(function (contig) {
        calculateGC(contig.accession, contig.sequence, windowSize);
      });
      return gcData;
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("CircularViewerContainer onSetState", state);
      if (state.genome_ids && state.genome_ids[0]) {
        this.set('genome_id', state.genome_ids[0]);
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('genome_id', lang.hitch(this, 'onSetGenomeId'));
      this.watch('referenceSequences', lang.hitch(this, 'onSetReferenceSequences'));

      Topic.subscribe('CircularView', lang.hitch(this, function () {
        // console.log("CircularViewerContainer this", this);
        var key = arguments[0];
        var value = arguments[1];
        // console.log("CircularView", value);

        if (key === 'removeTrack') {
          for (var i = 0; i < this.viewer._tracks.length; i++) {
            if (this.viewer._tracks[i].title === value.title) {
              this.viewer.removeTrack(i);
            }
          }
          // console.log("CircularViewerContainer removeTrack viewer", this.viewer);
        }
        else if (key === 'addCustomTrack') {
          // var track_name = 'Custom track ' + value.index;
          // var filter = "&keyword(" + encodeURIComponent(value.keyword);
          // use searchToQuery for advanced keyword search
          var filter = searchToQuery(value.keyword);
          // console.log("filter = ", filter);
          var specific_strand = null;
          var strand_query = '';
          if (value.strand === '+') {
            specific_strand = true;
            strand_query = ',eq(strand,%22+%22)';
          } else if (value.strand === '-') {
            specific_strand = false;
            strand_query = ',eq(strand,%22-%22)';
          }

          var type_query = ',eq(feature_type,CDS)';
          if (value.type === 'RNA') {
            type_query = ',eq(feature_type,*RNA)';
          } else if (value.type === 'Miscellaneous') {
            type_query = ',not(in(feature_type,(CDS,*RNA,source)))';
          }

          filter = filter +  'and(eq(annotation,PATRIC)' + type_query + strand_query + ')';

          var custom_title = value.name;
          if (!custom_title) {
            custom_title = value.keyword;
          }
          // console.log("filter = ", filter);
          // console.log("CircularViewerContainer addCustomTrack", value);
          this.addFeatureTrack(custom_title, 'Custom track ' + value.index + ' - type: ' + value.type + ', strand: ' + value.strand + ', keyword: ' + value.keyword, this.state.genome_ids[0], filter, specific_strand, custom_colors[(value.index - 1) % custom_colors.length], null);
        }
        else if (key === 'addUserTrack') {
          // console.log("CircularViewerContainer addUserTrack", value);
          var fill_color = 'red';
          var user_title = value.name;
          if (!user_title) {
            user_title = 'User track ' + value.index;
          }

          if (value.type === 'tiles') {
            fill_color = user_colors[(value.index - 1) % user_colors.length];
            // console.log("CircularViewerContainer SectionTrack, fill_color = ", fill_color);
            this.viewer.addTrack({
              type: SectionTrack,
              options: {
                title: user_title,
                title_tooltip: 'User track ' + value.index + ' - plot type: ' +  value.type + ', file name: ' +  value.fileName,
                trackWidth: 0.08,
                loading: true,
                fill: fill_color,
                stroke: null,
                gap: 0,
                background: { fill: null, stroke: null },
                formatPopupContent: function (item) {
                  if (item.score) {
                    return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                  }
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end;

                },
                formatDialogContent: function (item) {
                  if (item.score) {
                    return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                  }
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end;

                }
              },
              data: value.userData
            }, 'outer');
          }
          else if (value.type === 'line') {
            this.viewer.addTrack({
              type: LineTrack,
              options: {
                title: user_title,
                title_tooltip: 'User track ' + value.index + ' - plot type: ' +  value.type + ', file name: ' +  value.fileName + ', plot range: ' + Math.round(value.minScore * 100) / 100 + ' - ' + Math.round(value.maxScore * 100) / 100,
                loading: true,
                visible: true,
                max: value.maxScore,
                min: value.minScore,
                trackWidth: 0.1,
                stroke: { width: 0.5, color: 'black' },
                gap: 0,
                background: { fill: '#FFEFD5', stroke: null }
              },
              data: value.userData
            }, 'outer');
          }
          else if (value.type === 'histogram') {
            this.viewer.addTrack({
              type: HistogramTrack,
              options: {
                title: user_title,
                title_tooltip: 'User track ' + value.index + ' - plot type: ' +  value.type + ', file name: ' +  value.fileName + ', plot range: ' + Math.round(value.minScore * 100) / 100 + ' - ' + Math.round(value.maxScore * 100) / 100,
                loading: true,
                visible: true,
                max: value.maxScore,
                min: value.minScore,
                trackWidth: 0.1,
                stroke: { width: 0.5, color: 'black' },
                gap: 0,
                background: { fill: '#FFFFE0', stroke: null },
                formatPopupContent: function (item) {
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                },
                formatDialogContent: function (item) {
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                }
              },
              data: value.userData
            }, 'outer');
          }
          else if (value.type === 'heatmap') {
            var heatmapFill = function () {
              return 'red';
            };
            this.viewer.addTrack({
              type: HeatmapTrack,
              options: {
                title: user_title,
                title_tooltip: 'User track ' + value.index + ' - plot type: ' +  value.type + ', file name: ' +  value.fileName + ', plot range: ' + Math.round(value.minScore * 100) / 100 + ' - ' + Math.round(value.maxScore * 100) / 100,
                loadingText: 'LOADING USER TRACK' + +value.index,
                loading: true,
                visible: true,
                fill: heatmapFill,
                max: value.maxScore,
                min: value.minScore,
                trackWidth: 0.08,
                stroke: { width: 0.5, color: 'black' },
                gap: 0,
                background: { fill: null, stroke: null },
                formatPopupContent: function (item) {
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                },
                formatDialogContent: function (item) {
                  return 'accession: ' + item.accession + '<br>start: ' + item.start + '<br>end: ' + item.end + '<br>score: ' + item.score;
                }
              },
              data: value.userData
            }, 'outer');
          }
        }
      }));
      // console.log("CircularViewerContainer viewer", this.viewer);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      // console.log("GridContainer setVisible: ", visible)
      this.visible = visible;
      if (this.visible && !this._firstView) {
        // console.log("Trigger First View: ", this.id)
        this.onFirstView();
        this._firstView = true;
      }
    },

    onFirstView: function () {
      // console.log("onFirstView()");
      if (this._firstView) {
        return;
      }
      if (!this.controlPanel) {
        this.controlPanel = new TrackController({ region: 'left', splitter: true, style: 'width:320px; overflow-y:auto' });
      }

      if (!this.viewer) {
        this.viewer = new CirculusViewer({
          region: 'center',
          centerRadius: 100
        });
      }

      this.addChild(this.controlPanel);
      this.addChild(this.viewer);
      this.addActionBar();
      // console.log("CircularViewerContainer viewer", this.viewer);
    }
  });
});
