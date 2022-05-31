define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './SubSystemsMemoryGridContainer',
  '../store/SubSystemMemoryStore', '../store/SubsystemServiceOverviewMemoryStore', 'dojo/topic',
  './GridSelector', './SubsystemServiceOverview', 'dojox/widget/Standby', 'dojo/dom-construct', './SubSystemsContainer'
], function (
  declare, BorderContainer, lang,
  TabContainer, StackController,
  SubSystemsGridContainer,
  SubSystemMemoryStore, SubsystemsOverviewMemoryStore, Topic,
  selector, SubSystemsOverview, Standby, domConstruct, oldSubsystemsContainer
) {
  return declare([oldSubsystemsContainer], {
    gutters: false,
    state: null,
    tooltip: 'TODO tooltip for subsystems container',

    setLoaded: function () {
      this.loaded = true;
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      // TODO: load data into state variable (?)


      // load data into memory stores
      this.subsystemsStore = new SubsystemsOverviewMemoryStore({
        type: 'subsystems_overview',
        state: this.state
      });

      // TODO: setup tab controller
      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      // TODO: load subystemsOverviewGrid, pass in memory store
      this.subsystemsOverviewGrid = new SubSystemsOverview({
        title: 'Subsystems Overview',
        type: 'subsystems_overview',
        store: this.subsystemsStore,
        facetFields: ['class'],
        queryOptions: {
          sort: [{ attribute: 'subsystem_name' }]
        },
        enableFilterPanel: true,
        visible: true
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.tabContainer.addChild(this.subsystemsOverviewGrid);

      this._firstView = true;
    }
  });
});
