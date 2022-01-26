define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../../WorkspaceManager', 'dojo/_base/lang',
  'dojo/dom-attr', './JobResult'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, WorkspaceManager, lang,
  domAttr, JobResult
) {
  return declare([JobResult], {
    containerType: 'Homology'
  });
});
