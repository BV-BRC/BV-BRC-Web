define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dojo/request', 'dojo/_base/lang',
  'dojo/dom-construct', './Button', 'dojo/dnd/Target', 'dojo/topic',
  'dojo/aspect', 'dijit/Dialog', 'dijit/registry', './WorkspaceGroupButton',
  'dijit/layout/ContentPane', './ActionTabContainer',
  './WorkspaceBrowser', './WorkspaceGroups', './WorkspaceJobs',
  './WorkspaceGlobalController', './WorkspaceController',
  './WorkspaceItemDetail'
], function (
  declare, BorderContainer, on,
  domClass, xhr, lang,
  domConstruct, Button, Target, Topic,
  aspect, Dialog, Registry, WorkspaceGroupButton,
  ContentPane, TabContainer,
  WorkspaceBrowser, WorkspaceGroups, WorkspaceJobs,
  WorkspaceGlobalController, WorkspaceController,
  WorkspaceItemDetail
) {
  return declare([BorderContainer], {
    workspaceServer: '',
    currentWorkspace: '',
    gutters: false,
    liveSplitters: true,
    style: 'margin:-1px;padding:0px;',
    path: '/',
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.workspaceBrowser = new WorkspaceBrowser({ title: 'Explorer', path: this.path, region: 'center' });
      this.addChild(this.workspaceBrowser);
    },
    _setPathAttr: function (val) {
      this.path = val;
      if (this._started) {
        this.workspaceBrowser.set('path', val);
      }
    }

  });
});
