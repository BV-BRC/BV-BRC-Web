define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dijit/layout/ContentPane',
  'd3.v5/d3.min', './Base', '../../WorkspaceManager',
  'dojo/request', 'dojo/when'
], function (
  declare, domConstruct, ContentPane,
  d3, ViewerBase, WorkspaceManager,
  request, when
) {

  return declare([ViewerBase], {
    apiServiceUrl: window.App.dataAPI,
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      var self = this;

      var parts = state.pathname.split('/');
      var path = '/' + parts.slice(2).join('/');

      domConstruct.place('<br>', this.viewer.domNode);
      var container = domConstruct.toDom('<div style="margin: 0 auto; width:1024px;"></div>');
      domConstruct.place(container, this.viewer.domNode);

      WorkspaceManager.getObject(path).then(function (res) {
        var data = JSON.parse(res.data);

        var ext;
        var ids = [];
        data.forEach(function (lcbs) {
          lcbs.forEach(function (r) {
            ext = r.name.split('.').pop();
            var name = r.name.replace(`.${ext}`, '');
            if (!ids.includes(name)) ids.push(name);
          });
        });

        var url = self.apiServiceUrl +
          'genome/?in(genome_id,(' + ids.join(',') + '))&select(genome_id,genome_name)';
        when(request.get(url, {
          headers: {
            Accept: 'application/json',
            Authorization: window.App.authorizationToken
          },
          handleAs: 'json'
        }), function (res) {
          let mapping = {};
          res.forEach(function (org) {
            mapping[org.genome_id + '.' + ext] = org.genome_name;
          });

          new MauveViewer.default({
            data: data,
            ele: container,
            d3: d3,
            labels: mapping
          });
        });
      });

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
