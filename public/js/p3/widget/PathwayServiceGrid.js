define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/aspect', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct',
  './PageGrid', 'dojox/widget/Standby', '../store/PathwayServiceMemoryStore',
  './GridSelector', 'dojo/when', './formatter'
], function (
  declare, lang, Deferred,
  aspect, on, domClass, domConstruct,
  Grid, Standby, Store,
  selector, when, formatter
) {

  // TODO: hook up action bar buttons
  // TODO: genome_name field for Genes grid when multiple genomes
  return declare([Grid], {
    region: 'center',
    query: '',
    primaryKey: '_id',
    store: null,
    state: null,
    data: null,
    storeType: '',
    columns: {},
    loadingMessage: 'Loading Pathway data...',

    result_types: {
      'pathway': {
        container_type: 'pathway',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          // annotation : { label: 'Annotation', field: 'annotation' },
          // idx : { label: 'Index', field: 'idx' },
          pathway_id : { label: 'Pathway ID', field: 'pathway_id' },
          pathway_class : { label: 'Pathway Class', field: 'pathway_class' },
          pathway_name : { label: 'Pathway Name', field: 'pathway_name' },
          genome_count : { label: 'Genome Count', field: 'genome_count' },
          ec_count : { label: 'EC Number Count', field: 'ec_count' },
          gene_count : { label: 'Gene Count', field: 'gene_count' },
          genome_ec : { label: 'Genome EC Count', field: 'genome_ec' },
          ec_conservation : { label: 'EC Conservation (%)', field: 'ec_conservation', formatter: formatter.twoDecimalNumeric },
          gene_conservation : { label: 'Gene Conservation', field: 'gene_conservation', formatter: formatter.twoDecimalNumeric }
        },
      },
      'ecNum': {
        container_type: 'ecNum',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          // annotation : { label: 'Annotation', field: 'annotation' },
          // idx : { label: 'Index', field: 'idx', },
          pathway_id : { label: 'Pathway ID', field: 'pathway_id' },
          pathway_name : { label: 'Pathway Name', field: 'pathway_name' },
          pathway_class : { label: 'Pathway Class', field: 'pathway_class' },
          ec_description : { label: 'Description', field: 'ec_description' },
          ec_number : { label: 'EC Number', field: 'ec_number' },
          genome_count : { label: 'Genome Count', field: 'genome_count' },
          // ec_count : { label: 'EC Number Count', field: 'ec_count' },
          gene_count : { label: 'Gene Count', field: 'gene_count' },
          genome_ec : { label: 'Genome EC Count', field: 'genome_ec' }
        },
      },
      'genes': {
        container_type: 'genes',
        columns: {
          'Selection Checkboxes': selector({ label: '', sortable: false, unhidable: true }),
          annotation : { label: 'Annotation', field: 'annotation' },
          // idx : { label: 'Index', field: 'idx' },
          pathway_id : { label: 'Pathway ID', field: 'pathway_id' },
          pathway_name : { label: 'Pathway Name', field: 'pathway_name' },
          accession : { label: 'Accession', field: 'accession' },
          ec_description : { label: 'Description', field: 'ec_description' },
          ec_number : { label: 'EC Number', field: 'ec_number' },
          alt_locus_tag : { label: 'Alt Locus Tag', field: 'alt_locus_tag' },
          document_type : { label: 'Document Type', field: 'document_type' },
          feature_id : { label: 'Feature ID', field: 'feature_id' },
          gene : { label: 'Gene', field: 'gene' },
          genome_name : { label: 'Genome Name', field: 'genome_name' },
          bvbrc_id : { label: 'BRC ID', field: 'bvbrc_id' },
          product : { label: 'Product', field: 'product' },
          refseq_locus_tag : { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag' }
          /*
          genome_count : { label: 'Genome Count', field: 'genome_count' },
          ec_count : { label: 'EC Number Count', field: 'ec_count' },
          gene_count : { label: 'Gene Count', field: 'gene_count' },
          genome_ec : { label: 'Genome EC Count', field: 'genome_ec' }
          */
        },
      }
    },

    // don't use options
    constructor: function (options, parent) {
      console.log('grid constructor');
      if (!options.store) {
        console.log('error: store must be created first and passed to grid');
        return null;
      }
      this.store = options.store;
      this.storeType = this.store.storeType;
      this.state = this.store.state;
      this.primaryKey = this.store.primaryKey;
      this.type = this.storeType;
      // this.container_type = this.result_types[type].container_type;


      // this.store.setData(this.store.data);
    },

    setGridData: function (data) {
      this.store.set('data', data);
    },

    _setState: function (state) {
      console.log('_setState');
      if (!state || state === this.state) {
        console.log(state);
        console.log(this.state);
        return;
      }
      this.state = state;
      // this.refresh();
    },

    _setStore: function (store) {
      console.log('setStore');
      /*
      console.log('container = ', this.container);
      console.log('_setStore: ', store);
      this.store = store;
      this.set('storeType', this.store.storeType);
      // this.refresh();
      */
    },

    _setStoreType: function (type) {
      console.log('setStoreType');
      /*
      console.log('_SetStoreType');
      this.storeType = type;
      console.log('type = ', type);

      console.log('Set Container Type: ', this.container_type, 'storetype: ', this.storeType);
      */
    },

    // TODO: adjust classes and such
    renderRow: function (obj) {

      var div = domConstruct.create('div', { className: 'collapsed' });
      div.appendChild(Grid.prototype.renderRow.apply(this, arguments));
      // var subDiv = domConstruct.create('div', { className: 'detail' }, div);
      // subDiv.appendChild(this.buildDetailView(obj));
      return div;
    },

    startup: function () {
      console.log('startup');
      var self = this;
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      domConstruct.place(this.loadingMask.domNode, this.domNode, 'last');
      this.loadingMask.startup();

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
      // this.inherited(arguments);
      setTimeout(lang.hitch(this, function () {
        this.store.loadDataBackground(this.store.data, this.store.state.data.genome_ids).then(lang.hitch(this, function (res) {
          this.set('columns', this.result_types[this.type].columns);
        }));
      }), 1 );
    },

    /*
    resize: function () {
      this.
    },
    */

    _selectAll: function () {
      var _self = this;
      var def = new Deferred();
      when(this.store.query({}, { 'selectAll': true }), function (results) {
        _self._unloadedData = {};
        console.log('results = ', results);
        def.resolve(results.map(function (obj) {
          _self._unloadedData[obj[_self.primaryKey]] = obj;
          return obj[_self.primaryKey];
        }));
      });
      return def.promise;
    },

    buildDetailView: function (detail) {
      console.log('detail = ', detail);
      var outputDiv = [];
      var output = [];
      if (this.storeType === 'pathway') {
        // header
        /*
        output.push(['annotation', 'pathway_id', 'pathway_name', 'pathway_class'].join('    '));
        output.push('\n');
        */
        // data
        output.push([detail['annotation'], detail['pathway_id'], detail['pathway_name'], detail['pathway_class']].join('    '));
        outputDiv.push('<pre>' + output.join('\n') + '</pre>');
      }
      else if (this.storeType === 'ecNum') {
        output.push([detail['annotation'], detail['ec_number'], detail['pathway_id'], detail['pathway_name'], detail['pathway_class'], detail['ec_description']].join('    '));
      }
      else if (this.storeType === 'genes') {
        return null;
      }
      else {
        console.log('invalid store type');
        return null;
      }
      return domConstruct.toDom('<div class="align">' + outputDiv.join('<br/>') + '</div>');
    }
  })
});
