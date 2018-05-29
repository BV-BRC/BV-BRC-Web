define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', './Base',
  'dojo/request/xhr', '../../util/PathJoin', 'dojo/when', 'dojo/on',
  'dojo/_base/lang', 'dojo/dom-construct'
], function (
  declare, ContentPane, Base,
  Request, PathJoin, when, on,
  lang, domConstruct
) {
  return declare([Base], {
    dataModel: 'genome_feature',
    primaryKey: 'feature_id',
    limit: 25000,
    type: 'dna',
    onSetState: function (attr, oldVal, state) {
      var parts = state.pathname.split('/');
      var type = 'dna';
      if (parts && (parts.length > 2) && parts[parts.length - 2]) {
        type = parts[parts.length - 2];
      }

      if (!state.search) {
        console.log('NO STATE');
        return;
      }
      var query = state.search;

      if (this.contentPanel) {
        this.contentPanel.set('content', 'Loading FASTA Data...');
      }
      var _self = this;

      when(this.getData(type, query), function (data) {
        _self.contentPanel.set('content', data);
      }, function (err) {
        _self.contentPanel.set('content', 'There was an error retrieving the requested data: ' + err);
      });
    },

    getData: function (type, query) {

      query = query + '&limit(' + this.limit + ')';
      var url = PathJoin(this.apiServiceUrl, this.dataModel) + '/';

      return Request.post(url, {
        method: 'post',
        headers: {
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          accept: 'application/' + type + '+fasta',
          authorization: (window.App.authorizationToken || ''),
          'X-Requested-With': null
        },
        'X-Requested-With': null,
        data: query
      });
    },

    startup: function () {
      if (this._started) {
        return;
      }
      var parts = this.state.pathname.split('/');
      if (parts && (parts.length > 2) && parts[parts.length - 2]) {
        this.type = parts[parts.length - 2];
      }
      this.header = new ContentPane({
        content: '<div style="padding: 4px;text-align:right;border:1px solid #ddd;"><i class="fa icon-download fa-2x"></i></div>',
        region: 'top',
        style: 'padding:4px;'
      });

      on(this.header.domNode, '.icon-download:click', lang.hitch(this, function (evt) {
        // console.log("Download FASTA Clicked",evt);
        var query = this.state.search + '&sort(+' + this.primaryKey + ')&limit(' + this.limit + ')';
        var baseUrl = PathJoin(this.apiServiceUrl, this.dataModel) + '/';
        baseUrl = baseUrl + '?http_download=true&http_accept=application/' + this.type + '+fasta';
        if (window.App.authorizationToken) {
          baseUrl = baseUrl + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
        }
        var form = domConstruct.create('form', {
          style: 'display: none;',
          id: 'downloadForm',
          enctype: 'application/x-www-form-urlencoded',
          name: 'downloadForm',
          method: 'post',
          action: baseUrl
        }, this.domNode);
        domConstruct.create('input', { type: 'hidden', value: encodeURIComponent(query), name: 'rql' }, form);
        form.submit();
      }));


      this.contentPanel = new ContentPane({
        region: 'center',
        content: 'Loading FASTA Data...',
        style: 'word-wrap:break-word;font-family:monospace;white-space:pre;margin:1em;font-size:1.1em;'
      });
      this.addChild(this.header);
      this.addChild(this.contentPanel);

      this.inherited(arguments);

      if (this.state) {
        this.onSetState('state', this.state, this.state);
      }
    }
  });
});
