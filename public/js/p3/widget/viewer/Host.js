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
        data: 'eq(taxon_lineage_ids,2759)&select(genome_id)'

      }).then(function (res) {

        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          if (genomes) {
            _self._set('total_genomes', res.response.numFound);
            var genome_ids = genomes.map(function (o) {
              return o.genome_id;
            });
            _self._set('genome_ids', genome_ids);
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
      if (!state.genome_ids) {
        // console.log("NO Genome_IDS: old: ", oldVal.search, " new: ", state.search);
        if (state.search == oldVal.search) {
          this.set('state', lang.mixin({}, state, {
            genome_ids: oldVal.genome_ids
          }));
          return;
        }
        this.set('query', state.search);

      } else if (state.search != oldVal.search) {
        console.log('SET QUERY: ', state.search);
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

      var activeQueryState;
      switch (active) {
        case 'features':
          if (this.state && this.state.genome_ids) {
            activeQueryState = lang.mixin({}, this.state, {
              search: 'in(genome_id,(' + this.state.genome_ids.join(',') + '))',
              hashParams: lang.mixin({}, this.state.hashParams, {
                filter: 'eq(feature_type,%22CDS%22)'
              })
            });
          }
          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          }
          break;
        case 'experiments':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_lineage_ids,2759)'
          }));
          break;
        default:

          if (this.state && this.state.genome_ids) {
            // console.log("Found Genome_IDS in state object. count: ", this.state.genome_ids.length);

            // console.log("USING ALL GENOME_IDS. count: ", this.state.genome_ids.length);
            activeQueryState = lang.mixin({}, this.state, {
              search: 'in(genome_id,(' + this.state.genome_ids.join(',') + '))',
              hashParams: lang.mixin({}, this.state.hashParams)
            });
          }
          if (activeQueryState) {
            // console.log("Active Query State: ", activeQueryState);

            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
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
    onSetGenomeIds: function (attr, oldVal, genome_ids) {
      this.state.genome_ids = genome_ids;
      this.setActivePanelState();
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

      // this.watch("query", lang.hitch(this, "onSetQuery"));
      this.watch('genome_ids', lang.hitch(this, 'onSetGenomeIds'));
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
        state: this.state,
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
