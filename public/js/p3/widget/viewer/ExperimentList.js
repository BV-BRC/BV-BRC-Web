define([
  'dojo/_base/declare', './TabViewerBase',
  '../../util/QueryToEnglish',
  '../ExperimentGridContainer', '../BiosetGridContainer',
  '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang'
], function (
  declare, TabViewerBase,
  QueryToEnglish,
  ExperimentGridContainer, BiosetGridContainer,
  PathJoin, xhr, lang
) {
  return declare([TabViewerBase], {
    baseClass: 'ExperimentList',
    disabled: false,
    containerType: 'experiment_data',
    query: null,
    defaultTab: 'experiments',
    perspectiveLabel: 'Experiment List View',
    perspectiveIconClass: 'icon-selection-ExperimentList',
    total_experiments: 0,
    eids: null,
    warningContent: 'Your query returned too many results for detailed analysis.',
    _setQueryAttr: function (query) {
      this._set('query', query);
      if (!this._started) {
        return;
      }

      var _self = this;

      var url = PathJoin(this.apiServiceUrl, 'experiment', '?' + (this.query) + '&limit(25000)');

      xhr.get(url, {
        headers: {
          accept: 'application/solr+json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var features = res.response.docs;
          if (features) {
            _self._set('total_experiments', res.response.numFound);
            var eids = features.map(function (x) {
              return x.exp_id;
            });
            _self._set('eids', eids);
          }
        } else {
          console.warn('Invalid Response for: ', url);
        }
      }, function (err) {
        console.error('Error Retreiving Experiments: ', err);
      });

    },

    onSetState: function (attr, oldVal, state) {
      this.set('query', state.search);
      this.inherited(arguments);
    },

    onSetQuery: function (attr, oldVal, newVal) {
      var content = QueryToEnglish(newVal);
      this.queryNode.innerHTML = '<span class="queryModel">Experiments: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'experiments';
      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }

      switch (active) {
        default:
          activeTab.set('state', lang.mixin({}, this.state, { search: this.state.search }));
          break;
      }
    },

    onSetEIDS: function (attr, oldVal, eids) {
      if (this.biosets && eids && eids.length > 0) {
        this.biosets.set('state', lang.mixin({}, this.state, { search: 'in(exp_id,(' + eids.join(',') + '))' }));
        this.state.search = '';
      }
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.watch('eids', lang.hitch(this, 'onSetEIDS'));
      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('total_experiments', lang.hitch(this, 'onSetTotalExperiments'));

      this.experiments = new ExperimentGridContainer({
        title: 'Experiments',
        id: this.viewer.id + '_experiments',
        disabled: false
      });

      this.biosets = new BiosetGridContainer({
        title: 'Biosets',
        enableFilterPanel: false,
        id: this.viewer.id + '_biosets',
        disabled: false
      });

      this.viewer.addChild(this.experiments);
      this.viewer.addChild(this.biosets);
      this.setActivePanelState();
    },
    onSetTotalExperiments: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Experiments )';
    }
  });
});
