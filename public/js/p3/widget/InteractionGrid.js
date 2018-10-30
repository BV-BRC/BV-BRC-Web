define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/topic', 'dojo/aspect',
  './PageGrid', './formatter', '../store/InteractionMemoryStore', './GridSelector'
], function (
  declare, lang, Deferred,
  on, Topic, aspect,
  PageGrid, formatter, Store, selector
) {

  return declare([PageGrid], {
    region: 'center',
    query: (this.query || ''),
    store: null,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      genome_id_a: { label: 'Genome ID A', field: 'genome_id_a', hidden: true },
      genome_name_a: { label: 'Genome Name A', field: 'genome_name_a', hidden: true },
      interactor_a: { label: 'Interactor A', field: 'interactor_a' },
      feature_id_a: { label: 'Feature ID A', field: 'feature_id_a', hidden: true },
      refseq_locus_tag_a: { label: 'RefSeq Locus Tag A', field: 'refseq_locus_tag_a', hidden: true },
      gene_a: { label: 'Gene A', field: 'gene_a' },
      int_desc_a: { label: 'Desc A', field: 'interactor_desc_a' },

      genome_id_b: { label: 'Genome ID B', field: 'genome_id_b', hidden: true },
      genome_name_b: { label: 'Genome Name B', field: 'genome_name_b', hidden: true },
      interactor_b: { label: 'Interactor B', field: 'interactor_b' },
      feature_id_b: { label: 'Feature ID B', field: 'feature_id_b', hidden: true },
      refseq_locus_tag_b: { label: 'RefSeq Locus Tag B', field: 'refseq_locus_tag_b', hidden: true },
      gene_b: { label: 'Gene B', field: 'gene_b' },
      int_desc_b: { label: 'Desc B', field: 'interactor_desc_b' },

      category: { label: 'Category', field: 'category' },
      i_type: { label: 'Interaction Type', field: 'interaction_type' },
      d_method: { label: 'Detection Method', field: 'detection_method' },
      evidence: { label: 'Evidence', field: 'evidence' },
      pubmed: { label: 'Pubmed', field: 'pmid', hidden: true },
      score: { label: 'Score', field: 'score', hidden: true }
    },
    constructor: function (options, parent) {

      this.topicId = parent.topicId;
      // Topic.subscribe

    },
    startup: function () {
      var _self = this;

      this.on('dgrid-select', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.inherited(arguments);
    },
    _setState: function (state) {
      // console.log("Interaction Grid _setState", state);
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken, state));
      } else {
        this.store.set('state', state);
        this.refresh();
      }
    },
    _selectAll: function () {
      this._unloadedData = {};

      return Deferred.when(this.store.data.map(function (d) {
        this._unloadedData[d.id] = d;
        return d.id;
      }, this));
    },
    createStore: function (server, token, state) {
      var store = new Store({
        token: window.App.authorizationToken,
        apiServer: window.App.dataServiceURL,
        topicId: this.topicId,
        state: state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      return store;
    }
  });
});
