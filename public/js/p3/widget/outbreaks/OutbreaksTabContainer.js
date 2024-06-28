define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController'
], function (
  declare, lang, on, Topic, domConstruct,
  BorderContainer, StackContainer, TabController
) {

  return declare([BorderContainer], {
    id: 'OutbreaksTabContainer',
    gutters: false,
    state: null,
    tgState: null,
    tooltip: '',
    tabContainers: [],
    apiServer: window.App.dataServiceURL,
    visible: false,

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      if (state && !state.search) {
        return;
      }

      this._set('state', state);
    },

    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }
      this._buildPanels();

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    },
    _buildPanels: function () {
      this.tabContainer = new StackContainer({ region: 'center', id: this.id + '_TabContainer' });
      let tabController = new TabController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      this.addChild(tabController);
      for (let container of this.tabContainers) {
        this.tabContainer.addChild(container);
      }
      this.addChild(this.tabContainer);

      Topic.subscribe(this.id + '_TabContainer-selectChild', lang.hitch(this, function (page) {
        //Workaround for phylogenetic trees until it handles multiple instances in the same page
        for (let tabContainer of this.tabContainers) {
          if (tabContainer.phyloxmlTreeURL && tabContainer.isLoaded) {
            domConstruct.empty('phylogramOutbreak-' + tabContainer.id);
            domConstruct.empty('controls-' + tabContainer.id + '-0');
            domConstruct.empty('controls-' + tabContainer.id + '-1');

            tabContainer.isLoaded = false;
          }
        }
        if (page.updateState) {
          page.set('state', this.state);
        }
        page.set('visible', true);
      }));
    }
  });
});
