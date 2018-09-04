define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dijit/layout/ContentPane',
  'd3.v5/d3.min', './Base', 'mauve_viewer/dist/mauve-viewer', '../../WorkspaceManager'
], function (
  declare, domConstruct, ContentPane,
  d3, ViewerBase, MauveViewer, WorkspaceManager
) {

  return declare([ViewerBase], {

    onSetState: function (attr, oldVal, state) {
      var self = this;
      if (!state) {
        return;
      }
      var parts = state.pathname.split('/');
      var path = '/'+parts.slice(2).join('/');

      domConstruct.place('<br>', this.viewer.domNode)
      var container = domConstruct.toDom('<div style="margin: 0 auto; width:1024px;"></div>');
      domConstruct.place(container, this.viewer.domNode)

      WorkspaceManager.getObject(path).then(function(res) {
        var data = JSON.parse(res.data);
        new MauveViewer.default({data: data, ele: container, d3: d3})
      })

      window.document.title = 'PATRIC Mauve Viewer';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new ContentPane({
        region: 'center',
        style: 'padding:0',
        content: ''
      });


      this.addChild(this.viewer);
    }
  });

});
