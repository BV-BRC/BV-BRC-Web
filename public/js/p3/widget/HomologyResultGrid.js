define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/aspect', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct',
  './PageGrid', 'dojox/widget/Standby', '../store/HomologyResultMemoryStore',
  './GridSelector', 'dojo/topic'
], function (
  declare, lang, Deferred,
  aspect, on, domClass, domConstruct,
  Grid, Standby, Store,
  selector, topic
) {

  return declare([Grid], {
    region: 'center',
    query: '',
    primaryKey: '_id',
    store: null,
    state: null,
    storeType: '',
    columns: {},
    noDataMessage: 'No results found.',
    loadingMessage: 'Loading...',

    result_types: {
      'genome_feature': {
        container_type: 'feature_data',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          expand: {
            label: '',
            field: '',
            sortable: false,
            unhidable: true,
            renderCell: function (obj, val, node) {
              node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
            }
          },
          query: { label: 'Query ID', field: 'qseqid' },
          subject: { label: 'Subject ID', field: 'sseqid' },
          genome: { label: 'Genome', field: 'genome_name' },
          genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
          patric_id: { label: 'BRC ID', field: 'patric_id' },
          refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag' },
          gene: { label: 'Gene', field: 'gene', hidden: true },
          plfam: { label: 'PATRIC Local family', field: 'plfam_id', hidden: true },
          pgfam: { label: 'PATRIC Global family', field: 'pgfam_id', hidden: true },
          product: { label: 'Product', field: 'function' },
          na_length: { label: 'Length (NT)', field: 'na_length' },
          aa_length: { label: 'Length (AA)', field: 'aa_length' },
          length: { label: 'Aln Length', field: 'length', hidden: true },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%)', field: 'subject_coverage' },
          hit_from: { label: 'Hit from', field: 'hit_from', hidden: true },
          hit_to: { label: 'Hit to', field: 'hit_to', hidden: true },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      },
      'genome_sequence': {
        container_type: 'sequence_data',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          expand: {
            label: '',
            field: '',
            sortable: false,
            unhidable: true,
            renderCell: function (obj, val, node) {
              node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
            }
          },
          query: { label: 'Query ID', field: 'qseqid' },
          subject: { label: 'Subject ID', field: 'sseqid' },
          genome: { label: 'Genome', field: 'genome_name' },
          genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
          accession: { label: 'Accession', field: 'accession' },
          description: { label: 'Description', field: 'description' },
          product: { label: 'Sequence Type', field: 'sequence_type', hidden: true },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%', field: 'subject_coverage' },
          hit_from: { label: 'Hit from', field: 'hit_from', hidden: true },
          hit_to: { label: 'Hit to', field: 'hit_to', hidden: true },
          q_length: { label: 'Query Length', field: 'q_length' },
          length: { label: 'Subject Length', field: 'length' },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      },
      'specialty_genes': {
        container_type: 'specialty_genes',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          expand: {
            label: '',
            field: '',
            sortable: false,
            unhidable: true,
            renderCell: function (obj, val, node) {
              node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
            }
          },
          database: { label: 'Database', field: 'database' },
          source_id: { label: 'Source ID', field: 'source_id' },
          description: { label: 'Description', field: 'function' },
          organism: { label: 'Organism', field: 'organism' },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%', field: 'subject_coverage' },
          length: { label: 'Length', field: 'length' },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      },
      'no_ids': {
        container_type: 'fasta_data',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          expand: {
            label: '',
            field: '',
            sortable: false,
            unhidable: true,
            renderCell: function (obj, val, node) {
              node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
            }
          },
          query: { label: 'Query ID', field: 'qseqid' },
          subject: { label: 'Subject ID', field: 'sseqid' },
          patric_id: { label: 'Subject ID', field: 'sseqid' },
          // na_length: { label: 'Length (NT)', field: 'na_length' },
          // aa_length: { label: 'Length (AA)', field: 'aa_length' },
          length: { label: 'ALN Length', field: 'length' },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%)', field: 'subject_coverage' },
          hit_from: { label: 'Hit from', field: 'hit_from', hidden: true },
          hit_to: { label: 'Hit to', field: 'hit_to', hidden: true },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      },
    },

    constructor: function (options, parent) {
      this.container = parent;
    },

    _setState: function (state) {
      if (!state || state === this.state) {
        return;
      }
      this.state = state;
      var parts = this.state.pathname.split('/');
      var dataPath = '/' + parts.slice(2).join('/')
      if (!this.store) {
        this.set('store', this.createStore(dataPath));
      } else {
        this.store.set('dataPath', dataPath)
      }
      this.refresh();
      // if (this.store.loaded) {
      // this.loadingMask.hide();
      // }
    },

    _setStore: function (store) {
      var _self = this;
      if (store !== this.store) {
        this.store = store;
        aspect.after(this.store, 'onSetLoaded', function () {
          console.log('onSetLoaded: ', _self.store.type)
          _self.set('storeType', _self.store.type)
          _self.refresh()
        });
      }
    },

    _setStoreType: function (type) {
      if (this.storeType !== type) {
        this.storeType = type;
        this.container_type = this.result_types[type].container_type;
        console.log('Set Container Type: ', this.container_type, 'storetype: ', this.storeType)
        this.container.set('containerType', this.container_type)
        this.set('columns', this.result_types[type].columns)
      }
    },

    createStore: function (dataPath) {
      return new Store({ dataPath: dataPath });
    },

    renderRow: function (obj) {
      var div = domConstruct.create('div', { className: 'collapsed' });
      div.appendChild(Grid.prototype.renderRow.apply(this, arguments));
      var subDiv = domConstruct.create('div', { className: 'detail' }, div);
      subDiv.appendChild(this.buildDetailView(obj.detail));
      return div;
    },

    startup: function () {
      var self = this;
      // this.loadingMask = new Standby({
      //   target: this.id,
      //   image: '/public/js/p3/resources/images/spin.svg',
      //   color: '#efefef'
      // });
      // domConstruct.place(this.loadingMask.domNode, this.domNode, 'last');
      // this.loadingMask.startup();
      // this.loadingMask.show();
      this.noDataMessage = 'Loading homology data...';
      topic.subscribe('homology_data', function (data_exists) {
        if (!data_exists) {
          self.noDataMessage = 'No homology results.';
        }
      });

      this.on('.dgrid-cell div.dgrid-expando-icon:click', function (evt) {

        var node = self.row(evt).element;
        var target = evt.target || evt.srcElement;
        var collapsed = domClass.contains(node, 'collapsed');
        // console.log(evt, node);

        domClass.toggle(node, 'collapsed', !collapsed);
        domClass.toggle(target, 'ui-icon-triangle-1-e', !collapsed);
        domClass.toggle(target, 'ui-icon-triangle-1-se', collapsed)

      });

      this.on('dgrid-select', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: self,
          bubbles: true,
          cancelable: true
        };
        on.emit(self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: self,
          bubbles: true,
          cancelable: true
        };
        on.emit(self.domNode, 'deselect', newEvt);
      });

      aspect.before(this, 'refresh', function () {
        this.clearSelection();
      }, this);
      this.inherited(arguments);
    },

    _selectAll: function () {

      this._unloadedData = {};
      return Deferred.when(this.store.data.map(function (obj) {
        this._unloadedData[obj[this.primaryKey]] = obj;
        return obj[this.primaryKey];
      }, this));
    },

    formatEvalue: function (evalue) {
      if (evalue.toString().includes('e')) {
        var val = evalue.toString().split('e');
        return parseInt(val[0]) + 'e' + val[1];
      } else if (evalue !== 0) {
        return evalue.toFixed(4);
      }
      return evalue;

    },

    buildDetailView: function (detail) {
      var outputDiv = [];

      detail.hsps.forEach(function (hsp) {
        var output = [];
        var qSeqArr = hsp.qseq.match(/.{1,60}/g);
        var hSeqArr = hsp.hseq.match(/.{1,60}/g);
        var mlArr = hsp.midline.match(/.{1,60}/g);

        // header
        output.push([
          'Query length: ' + detail.query_len,
          'Subject length: ' + detail.subject_len
        ].join('    '));
        output.push([
          'Score: ' + Math.round(hsp.bit_score) + ' bits(' + hsp.score + ')',
          'Expect: ' + this.formatEvalue(hsp.evalue),
          hsp.hit_strand ? 'Strand: ' + hsp.query_strand + '/' + hsp.hit_strand : ''
        ].join('    '));
        output.push([
          'Identities: ' + hsp.identity + '/' + hsp.align_len + '(' + Math.round(hsp.identity / hsp.align_len * 100) + '%)',
          hsp.positive ? 'Positives: ' + hsp.positive + '/' + hsp.align_len + '(' + Math.round(hsp.positive / hsp.align_len * 100) + '%)' : '',
          'Gaps: ' + hsp.gaps + '/' + hsp.align_len + '(' + Math.round(hsp.gaps / hsp.align_len * 100) + '%)',
          (hsp.query_frame || hsp.hit_frame) ? ('Frame: ' + (hsp.query_frame ? hsp.query_frame : '')
            + ((hsp.query_frame && hsp.hit_frame) ? '/' : '')
            + (hsp.hit_frame ? hsp.hit_frame : '')) : ''
        ].join('    '));
        output.push('\n');

        var query_pos = hsp.query_from;
        var hit_pos = hsp.hit_from;
        for (var i = 0, n = qSeqArr.length; i < n; i++) {
          var query_from = String('        ' + query_pos).slice(-8);
          var hit_from = String('        ' + hit_pos).slice(-8);

          var query_to,
            hit_to;
          if (hsp.query_strand == undefined || hsp.query_strand === 'Plus') {
            query_to = query_pos + qSeqArr[i].match(/[A-Z]/gi).length - 1;
            query_pos = query_to + 1;
          } else {
            query_to = query_pos - qSeqArr[i].match(/[A-Z]/gi).length + 1;
            query_pos = query_to - 1;
          }
          if (hsp.hit_strand == undefined || hsp.hit_strand === 'Plus') {
            hit_to = hit_pos + hSeqArr[i].match(/[A-Z]/gi).length - 1;
            hit_pos = hit_to + 1;
          } else {
            hit_to = hit_pos - hSeqArr[i].match(/[A-Z]/gi).length + 1;
            hit_pos = hit_to - 1;
          }

          output.push(['Query', query_from, qSeqArr[i], query_to].join('  '));
          output.push(['     ', '        ', mlArr[i], '    '].join('  '));
          output.push(['Sbjct', hit_from, hSeqArr[i], hit_to].join('  '));
          output.push('\n');
        }
        outputDiv.push('<pre>' + output.join('\n') + '</pre>');
      }, this);

      return domConstruct.toDom('<div class="align">' + outputDiv.join('<br/>') + '</div>');
    }
  });
});
