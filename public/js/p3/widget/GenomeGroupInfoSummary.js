define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/on', 'dojo/request', 'dojo/when',
  './SummaryWidget', '../WorkspaceManager'

], function (
  declare, lang,
  domClass, domConstruct, on, xhr, when,
  SummaryWidget, WorkspaceManager
) {

  return declare([SummaryWidget], {
    dataModel: '',
    query: '',
    baseQuery: '',
    view: 'table',
    templateString: '<div class="SummaryWidget"><div data-dojo-attach-point="containerNode"><div class="tableNode" data-dojo-attach-point="tableNode"></div></div></div>',
    columns: [],
    _setStateAttr: function (state) {

      var self = this;
      when(WorkspaceManager.getObject(state.ws_path, true), function (data) {
        self.set('groupInfo', data);
      });
    },

    _setGroupInfoAttr: function (data) {

      domConstruct.empty(this.tableNode);

      var table = domConstruct.create('table', {}, this.tableNode);

      var tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { innerHTML: 'Name', 'class': 'DataItemProperty' }, tr);
      domConstruct.create('td', { innerHTML: data.name, 'class': 'DataItemValue' }, tr);

      tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { innerHTML: 'Owner', 'class': 'DataItemProperty' }, tr);
      domConstruct.create('td', { innerHTML: data.owner_id, 'class': 'DataItemValue' }, tr);

      tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { innerHTML: 'Members', 'class': 'DataItemProperty' }, tr);
      domConstruct.create('td', { innerHTML: data.autoMeta.item_count, 'class': 'DataItemValue' }, tr);

      tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { innerHTML: 'Created', 'class': 'DataItemProperty' }, tr);
      domConstruct.create('td', { innerHTML: data.creation_time, 'class': 'DataItemValue' }, tr);

    },

    onSetQuery: function (attr, oldVal, query) {
      // block default action
    },

    processData: function (res) {
    },

    render_chart: function () {
    },

    render_table: function () {
    }
  });
});
