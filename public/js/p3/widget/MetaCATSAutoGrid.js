define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/aspect', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct',
  './PageGrid'
], function (
  declare, lang, Deferred,
  aspect, on, domClass, domConstruct,
  Grid
) {

  return declare([Grid], {
    region: 'center',
    query: '',
    store: null,
    columns: {},
    constructor: function (options, parent) {
      this.primaryKey = parent.primaryKey;
    },

    _setState: function (state) {
      if (!state) {
        return;
      }

      if (!this.store) {
        this.set('store', this.createStore());
      } else {
        this.store.set('state', state);
      }
      this.refresh();
    },

    createStore: function () {
      if (this.store) {
        console.log('returning existing store');
        this.store.watch('refresh', 'refresh');
        return this.store;
      }
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

      this.on('.dgrid-cell div.dgrid-expando-icon:click', function (evt) {

        var node = self.row(evt).element;
        var target = evt.target || evt.srcElement;
        var collapsed = domClass.contains(node, 'collapsed');
        // console.log(evt, node);

        domClass.toggle(node, 'collapsed', !collapsed);
        domClass.toggle(target, 'ui-icon-triangle-1-e', !collapsed);
        domClass.toggle(target, 'ui-icon-triangle-1-se', collapsed);
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
