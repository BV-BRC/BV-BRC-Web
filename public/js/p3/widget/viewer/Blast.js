define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../BlastResultGridContainer', '../../store/BlastResultMemoryStore',
  '../GridSelector'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, GridContainer, BlastResultMemoryStore,
  selector
) {

  return declare([ViewerBase], {
    disabled: false,
    query: null,
    loadingMask: null,
    visible: true,

    constructor: function (options) {

      this.topicId = 'Blast_' + options.id.split('_blastResult')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("BlastResult:", arguments);
        var key = arguments[0];
        // var value = arguments[1];

        switch (key) {
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
            break;
          default:
            break;
        }
      }));
    },

    onSetState: function (attr, oldVal, state) {

      if (!state) {
        return;
      }

      // console.log(state);
      if (this.state.resultType == 'genome_feature') {
        this.gfGrid.set('state', state);
        this.tabContainer.selectChild(this.gfGrid);
      } else if (this.state.resultType == 'genome_sequence') {
        this.gsGrid.set('state', state);
        this.tabContainer.selectChild(this.gsGrid);
      } else {
        this.sgGrid.set('state', state);
        this.tabContainer.selectChild(this.sgGrid);
      }
    },

    postCreate: function () {

      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });
      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });
      this.addChild(tabController);
      this.addChild(this.tabContainer);

      var gfStore = new BlastResultMemoryStore({
        type: 'genome_feature',
        idProperty: 'feature_id',
        topicId: this.topicId,
        queryOptions: {
          sort: [{ attribute: 'pident', descending: true }]
        }
      });
      var gsStore = new BlastResultMemoryStore({
        type: 'genome_sequence',
        idProperty: 'sequence_id',
        topicId: this.topicId,
        queryOptions: {
          sort: [{ attribute: 'pident', descending: true }]
        }
      });
      var sgStore = new BlastResultMemoryStore({
        type: 'specialty_genes',
        idProperty: 'source_id',
        topicId: this.topicId,
        queryOptions: {
          sort: [{ attribute: 'pident', descending: true }]
        }
      });

      this.gfGrid = new GridContainer({
        title: 'gf',
        type: 'genome_feature',
        containerType: 'feature_data',
        primaryKey: 'feature_id',
        region: 'center',
        store: gfStore,
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
          genome: { label: 'Genome', field: 'genome_name' },
          genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
          patric_id: { label: 'BRC ID', field: 'patric_id' },
          refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag' },
          gene: { label: 'Gene', field: 'gene' },
          plfam: { label: 'PATRIC Local family', field: 'plfam_id', hidden: true },
          pgfam: { label: 'PATRIC Global family', field: 'pgfam_id', hidden: true },
          product: { label: 'Product', field: 'function' },
          na_length: { label: 'Length (NT)', field: 'na_length' },
          aa_length: { label: 'Length (AA)', field: 'aa_length' },
          length: { label: 'ALN Length', field: 'length' },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%)', field: 'subject_coverage' },
          hit_from: { label: 'Hit from', field: 'hit_from', hidden: true },
          hit_to: { label: 'Hit to', field: 'hit_to', hidden: true },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      });

      this.gsGrid = new GridContainer({
        title: 'gs',
        type: 'genome_sequence',
        containerType: 'sequence_data',
        primaryKey: 'sequence_id',
        region: 'center',
        store: gsStore,
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
          genome: { label: 'Genome', field: 'genome_name' },
          genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
          accession: { label: 'Accession', field: 'accession' },
          description: { label: 'Description', field: 'description', hidden: true },
          product: { label: 'Product', field: 'function' },
          identity: { label: 'Identity (%)', field: 'pident' },
          q_coverage: { label: 'Query cover (%)', field: 'query_coverage' },
          s_coverage: { label: 'Subject cover (%', field: 'subject_coverage' },
          hit_from: { label: 'Hit from', field: 'hit_from', hidden: true },
          hit_to: { label: 'Hit to', field: 'hit_to', hidden: true },
          q_length: { label: 'Query Length', field: 'q_length' },
          length: { label: 'Sub Length', field: 'length' },
          score: { label: 'Score', field: 'bitscore' },
          evalue: { label: 'E value', field: 'evalue' }
        }
      });

      this.sgGrid = new GridContainer({
        title: 'sg',
        type: 'specialty_genes',
        containerType: 'specialty_genes',
        primaryKey: 'source_id',
        region: 'center',
        store: sgStore,
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
      });

      this.tabContainer.addChild(this.gfGrid);
      this.tabContainer.addChild(this.gsGrid);
      this.tabContainer.addChild(this.sgGrid);

      // viewerHeader

      this.inherited(arguments);
    }

  });
});
