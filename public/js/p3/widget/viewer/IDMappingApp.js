define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../IDMappingAppResultGridContainer',
  '../../store/IDMappingAppMemoryStore', 'dojo/dom-construct'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, GridContainer, ResultMemoryStore,
  domConstruct
) {

  return declare([ViewerBase], {
    disabled: false,
    query: null,
    loadingMask: null,
    visible: true,

    constructor: function (options) {

      this.topicId = 'IDMappingApp_' + options.id.split('_idmapResult')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0];
        var summary = { total: 0, found: 0, mapped: 0 };
        if (arguments.length > 1) {
          summary = arguments[1];
        }

        switch (key) {
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
            break;
          case 'updateHeader':
            this.totalCountNode.innerHTML =
                        'Of the ' + summary.total +
                            ' source IDs, ' + summary.mapped + ' mapped to ' +
                            summary.found + ' target IDs';
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

      this.loadingMask.show();
      this.gsGrid.set('state', state);
    },

    postCreate: function () {

      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();

      this.viewerHeader = new ContentPane({
        content: '', // [placeholder for IDMapping summary: xxx feature found etc]",
        'class': 'breadcrumb',
        region: 'top'
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader', style: { 'padding-left': '20px' } });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      this.totalCountNode = domConstruct.create('span', {
        'class': 'PerspectiveTotalCount',
        innerHTML: '( loading... )',
        style: { color: 'black' }
      }, headerContent);

      var gsStore = new ResultMemoryStore({
        type: 'idmap',
        idProperty: 'idx',
        topicId: this.topicId
      });

      this.gsGrid = new GridContainer({
        type: 'idmap',
        containerType: 'feature_data',
        topicId: this.topicId,
        store: gsStore,
        region: 'center'
      });

      this.addChild(this.viewerHeader);
      this.addChild(this.gsGrid);

      this.inherited(arguments);
    }

  });
});
