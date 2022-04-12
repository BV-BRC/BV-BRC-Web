define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  './ActionBar', './FilterContainerActionBar', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', './ExperimentGridContainer', 'dojo/topic', 'dojo/_base/lang',
  './BiosetGridContainer', 'dojo/request', '../util/PathJoin'
], function (
  declare, BorderContainer, on,
  ActionBar, FilterContainerActionBar, TabContainer, StackController,
  ContentPane, ExperimentGridContainer, Topic, lang,
  BiosetGridContainer, xhr, PathJoin
) {

  return declare([BorderContainer], {
    gutters: false,
    query: null,
    facetFields: ExperimentGridContainer.prototype.facetFields,
    containerActions: ExperimentGridContainer.prototype.containerActions,
    apiServer: window.App.dataAPI,
    authorizationToken: window.App.authorizationToken,
    tooltip: 'The "Experiments" tab shows a list of Experiment Data, such as transcriptomics and proteomics, for the genomes associated with the current view.',
    eids: null,

    onSetQuery: function (attr, oldVal, query) {
      query += '&select(exp_id)&limit(25000)';
      query = (query && (query.charAt(0) == '?')) ? query.substr(1) : query;
      xhr.post(PathJoin(this.apiServer, 'experiment/?'), {
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: query,
        handleAs: 'json'
      }).then(lang.hitch(this, function (eids) {
        eids = eids.map(function (x) {
          return x.exp_id;
        });
        this.set('eids', eids);
      }));

    },
    onSetEIDS: function (attr, oldVal, eids) {
      if (this.biosetGrid && eids && eids.length > 0) {
        this.biosetGrid.set('state', lang.mixin({}, this.state, { search: '&in(exp_id,(' + eids.join(',') + '))' }));
      }
    },
    onSetState: function (attr, oldVal, state) {

      var q = [];

      if (state.search) {
        q.push(state.search);
      }

      if (state.hashParams) {
        if (state.hashParams.filter) {
          q.push(state.hashParams.filter);
        }
      }

      if (this.filterPanel) {
        // console.log("SET FILTERPANEL STATE: ", state)
        this.filterPanel.set('state', state);
      }

      this.set('query', q.join('&'));

      if (this.experimentsGrid) {
        this.experimentsGrid.set('state', state);
      }

      // console.log("call _set(state) ", state);

    },
    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
      if (this.experimentsGrid) {
        this.experimentsGrid.set('visible', true);
      }
      if (this.biosetGrid) {
        this.biosetGrid.set('visible', true);
      }
    },
    _setStateAttr: function (val) {
      this._set('state', val ? lang.mixin({}, val) : val);
    },

    postCreate: function () {
      // console.log("GENOME CONTAINER POSTCREATE");
      this.inherited(arguments);
      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('eids', lang.hitch(this, 'onSetEIDS'));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.set('visible', this.visible);
      this._started = true;
    },

    listen: function () {
      on(this.domNode, 'ToggleFilters', lang.hitch(this, function (evt) {
        // console.log("toggleFilters");
        if (!this.filterPanel && this.getFilterPanel) {
          this.filterPanel = this.getFilterPanel();
          this.filterPanel.region = 'top';
          this.filterPanel.splitter = true;
          this.layoutPriority = 2;
          this.addChild(this.filterPanel);
        }
        else if (this.filterPanel) {
          // console.log("this.filterPanel.minimized: ", this.filterPanel.minimized);
          if (this.filterPanel.minimized) {
            this.filterPanel.minimized = false;
            this.filterPanel.resize({
              h: this.filterPanel.minSize + 150
            });
          }
          else {
            this.filterPanel.minimized = false;
            this.filterPanel.resize({
              h: this.filterPanel.minSize
            });
          }
          this.resize();
        }
      }));

      this.filterPanel.watch('filter', lang.hitch(this, function (attr, oldVal, newVal) {
        // console.log("FILTER PANEL SET FILTER", arguments)
        // console.log("oldVal: ", oldVal, "newVal: ", newVal, "state.hashParams.filter: ", this.state.hashParams.filter)
        // console.log("setFilter Watch() callback", newVal);
        if ((oldVal != newVal) && (newVal != this.state.hashParams.filter)) {
          // console.log("Emit UpdateHash: ", newVal);
          on.emit(this.domNode, 'UpdateHash', {
            bubbles: true,
            cancelable: true,
            hashProperty: 'filter',
            value: newVal,
            oldValue: oldVal
          });
        }
      }));

    },
    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });
      this.filterPanel = new FilterContainerActionBar({
        region: 'top',
        splitter: true,
        layoutPriority: 7,
        style: 'height: 48px;',
        facetFields: this.facetFields,
        state: this.state,
        className: 'BrowserHeader',
        currentContainerWidget: this,
        dataModel: 'experiment'
      });

      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });
      this.experimentsGrid = new ExperimentGridContainer({
        enableFilterPanel: false,
        title: 'Experiments',
        state: this.state
      });
      this.biosetGrid = new BiosetGridContainer({
        enableFilterPanel: false,
        title: 'Biosets'
      });
      this.tabContainer.addChild(this.experimentsGrid);
      this.tabContainer.addChild(this.biosetGrid);

      this.addChild(tabController);
      this.addChild(this.filterPanel);
      this.addChild(this.tabContainer);

      this.setupActions();
      this.listen();

      this._firstView = true;
    },
    setupActions: function () {
      if (this.filterPanel) {
        this.containerActions.forEach(function (a) {
          this.filterPanel.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
        }, this);
      }

    }
  });
});

