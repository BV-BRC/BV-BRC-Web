define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  './InteractionGridContainer', './InteractionGraphContainer', '../store/InteractionMemoryStore'
], function (
  declare, lang,
  Topic,
  BorderContainer, StackContainer, TabController, ContentPane,
  MainGridContainer, InteractionGraphContainer, Store
) {

  return declare([BorderContainer], {
    gutters: false,
    tooltip: 'The “Interactions” tab shows a list of protein-protein interactions, inferred using computational and laboratory methods.',
    constructor: function (options) {
      this.topicId = 'Interactions_' + options.id.split('_interactions')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // add when needed
      }));
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("InteractionsContainer set STATE. state: ", state);

      if (!state) {
        return;
      }


      if (this.mainGridContainer) {
        this.mainGridContainer.set('state', state);
      }

      // autoFilterMessage

      this._set('state', state);
    },
    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
      if (this.mainGridContainer) {
        this.mainGridContainer.set('visible', true);
      }
      if (this.graphContainer) {
        this.graphContainer.set('visible', true);
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new StackContainer({ region: 'center', id: this.id + '_TabContainer' });

      var tabController = new TabController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      this.mainGridContainer = new MainGridContainer({
        title: 'Table',
        topicId: this.topicId
      });

      this.graphContainer = new InteractionGraphContainer({
        title: 'Graph',
        topicId: this.topicId
      });

      this.watch('state', lang.hitch(this, 'onSetState'));

      this.tabContainer.addChild(this.mainGridContainer);
      this.tabContainer.addChild(this.graphContainer);
      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
