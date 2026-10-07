define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/request',
  'dijit/layout/ContentPane',
  './TabViewerBase', '../../util/PathJoin',
  '../GenomeGridContainer', '../SequenceGridContainer', '../FeatureGridContainer', '../ExperimentsContainer',
], function (
  declare, lang,
  on, request,
  ContentPane,
  TabViewerBase, PathJoin,
  GenomeGridContainer, SequenceGridContainer, FeatureGridContainer, ExperimentsContainer
) {

  return declare([TabViewerBase], {
    defaultTab: 'genomes',
    perspectiveLabel: 'Eukaryotic Hosts',
    perspectiveIconClass: 'icon-selection-GenomeList',
    taxonId: '2759',
    query: '',
    totalGenomes: 0,

    _setQueryAttr: function (query) {
      // console.log("_setQueryAttr", query);
      if (!query) {
        console.log('GENOME LIST SKIP EMPTY QUERY: ');
        return;
      }

      if (query && (query == this.query)) {
        return;
      }

      this._set('query', query);

      // update total_genomes and genome_ids
      var _self = this;
      var url = PathJoin(this.apiServiceUrl, 'genome', '?' + (this.query) + '&select(genome_id)');

      request.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: `eq(taxon_lineage_ids,${this.taxonId})&select(genome_id)&limit(1)`

      }).then(function (res) {

        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          if (genomes) {
            _self._set('total_genomes', res.response.numFound);
          }
        } else {
          console.warn('Invalid Response for: ', url);
        }
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
      });
    },
    onSetState: function (attr, oldVal, state) {
      // console.log("Host onSetState()  OLD: ", oldVal, " NEW: ", state);
      this.inherited(arguments);
      if (state.search != (oldVal && oldVal.search)) {
        this.set('query', state.search);
      }

      this.setActivePanelState();
    },
    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      // console.log("Active: ", active, "state: ", JSON.stringify(this.state));

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }

      var hostLineage = `eq(taxon_lineage_ids,${this.taxonId})`;
      var activeQueryState;
      switch (active) {
        case 'features':
          activeQueryState = lang.mixin({}, this.state, {
            search: 'eq(genome_id,*)&genome(' + hostLineage + ')',
            hashParams: lang.mixin({}, this.state.hashParams, {
              filter: 'eq(feature_type,%22CDS%22)'
            })
          });
          activeTab.set('state', activeQueryState);
          break;
        case 'sequences':
          activeQueryState = lang.mixin({}, this.state, {
            search: 'eq(genome_id,*)&genome(' + hostLineage + ')',
            hashParams: lang.mixin({}, this.state.hashParams)
          });
          activeTab.set('state', activeQueryState);
          break;
        case 'experiments':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: hostLineage
          }));
          break;
        default:
          activeQueryState = lang.mixin({}, this.state, {
            search: hostLineage,
            hashParams: lang.mixin({}, this.state.hashParams)
          });
          activeTab.set('state', activeQueryState);
          break;
      }

      if (activeTab) {
        var pageTitle = 'Eukaryotic Hosts ' + activeTab.title;
        // console.log("Genome List setActivePanelState: ", pageTitle);
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Genomes ) ';
    },
    createOverviewPanel: function () {
      return new ContentPane({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
    postCreate: function () {
      this.inherited(arguments);

      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'));

      // this.overview = this.createOverviewPanel(this.state);

      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
      });
      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        disable: false
      });
      this.features = new FeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_features',
        disabled: false
      });
      this.experiments = new ExperimentsContainer({
        title: 'Experiments',
        id: this.viewer.id + '_experiments'
      });

      // this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.experiments);
    }
  });
});
