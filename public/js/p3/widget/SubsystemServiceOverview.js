define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dojo/query', 'dojo/request', 'dojo/dom-construct', 'dojo/dom-style',
  'dojo/dom-class', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', './ContainerActionBar',
  './GridContainer', './SubsystemServiceOverviewMemoryGrid', 'FileSaver', './SubSystemsOverview'
], function (
  declare, lang, on, Topic,
  query, request, domConstruct, domStyle,
  domClass, BorderContainer, ContentPane, ContainerActionBar,
  GridContainer, SubSystemsOverviewMemoryGrid, saveAs, oldSubSystemsOverview
) {
  return declare([BorderContainer, oldSubSystemsOverview], {

    gridCtor: SubSystemsOverviewMemoryGrid,

  });
});
