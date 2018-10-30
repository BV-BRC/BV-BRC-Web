define.amd.jQuery = true;
define("p3/widget/SubSystemsOverview", [
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dojo/query', 'dojo/request', 'dojo/dom-construct', 'dojo/dom-style',
  'dojo/dom-class', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', './ContainerActionBar',
  './GridContainer', './SubSystemsOverviewMemoryGrid', 'FileSaver'
], function (
  declare, lang, on, Topic,
  query, request, domConstruct, domStyle,
  domClass, BorderContainer, ContentPane, ContainerActionBar,
  GridContainer, SubSystemsOverviewMemoryGrid, saveAs
) {

  return declare([BorderContainer], {
    gutters: false,
    visible: false,
    state: null,

    containerActions: [
      [
        'Print Map',
        'fa icon-print fa-3x',
        { label: 'Print', multiple: false, validTypes: ['*'] },
        function () {
          var svg = this.chart.getSubsystemPieGraph();
          saveAs(new Blob([svg], { type: 'image/svg+xml' }), 'PATRIC_subsystem_overview.svg');
        },
        true
      ]
    ],

    onSetState: function (attr, oldState, state) {
      if (!state) {
        console.log('!state in grid container; return;');
        return;
      }

      this.chart.set('state', state);
    },

    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }

      if (this.viewer) {
        this.viewer.set('visible', true);
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.containerActionBar = new ContainerActionBar({
        baseClass: 'BrowserHeader',
        region: 'top'
      });

      this.containerActions.forEach(function (a) {
        this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
      }, this);
      this.addChild(this.containerActionBar);

      this.piechartviewer = new ContentPane({
        region: 'left',
        content: "<div id='subsystemspiechart'></div>",
        style: 'padding:0'
      });

      this.addChild(this.piechartviewer);
      this.chart = new SubSystemsOverviewMemoryGrid();

      this.watch('state', lang.hitch(this, 'onSetState'));

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
