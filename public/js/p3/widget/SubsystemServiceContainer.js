define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './SubSystemsMemoryGridContainer',
  '../store/SubSystemMemoryStore', '../store/SubsystemsOverviewMemoryStore', 'dojo/topic',
  './GridSelector', './SubSystemsOverview', 'dojox/widget/Standby'
], function (
  declare, BorderContainer, lang,
  TabContainer, StackController,
  SubSystemsGridContainer,
  SubSystemMemoryStore, SubsystemsOverviewMemoryStore, Topic,
  selector, SubSystemsOverview, Standby
) {
  return declare([BorderContainer], {
    gutters: false,
    state: null,
    tooltip: 'TODO tooltip for subsystems container',

    constructor: function (options) {
      console.log(options);
      // this.topicId = 'SubSystemMap_' + options.id.split('_subsystems')[0];
      this.topicId = 'SubSystemMap_';

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'showMainGrid':
            this.tabContainer.selectChild(this.mainGridContainer);
            break;
          case 'updatePfState':
            this.pfState = value;
            // this.updateFilterPanel(value);
            break;
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

    selectChild: function (child) {
      Topic.publish(this.id + '-selectChild', child);
    },

    setLoaded: function () {
      this.loaded = true;
    },

    onSetState: function (attr, oldVal, state) {
      if (!this.loaded) {
        return;
      }
      if (state) {
        this.state = state;
        this.onFirstView();
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      // TODO: load overview data into SubsystemServiceOverviewMemoryStore

      this._firstView = true;
    }
  });
});
