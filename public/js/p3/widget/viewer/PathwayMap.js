define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/when', 'dojo/request', 'dojo/dom-construct',
  'dijit/layout/ContentPane',
  './Base', '../../util/PathJoin', '../PathwayMapContainer'
], function (
  declare, lang, when, request, domConstruct,
  ContentPane,
  ViewerBase, PathJoin, PathwayMapContainer
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    containerType: 'transcriptomics_experiment',
    apiServiceUrl: window.App.dataAPI,

    onSetState: function (attr, oldVal, state) {
      // console.log("PathwayMap onSetState", state);

      if (!state) {
        return;
      }

      var params = {};
      var qparts = state.search.split('&');
      qparts.forEach(function (qp) {
        var parts = qp.split('=');
        params[parts[0]] = parts[1].split(',');
      });
      state = lang.mixin(state, params);

      if (!state.pathway_id) return;

      // taxon_id -> state.genome_ids or genome_id ->state.genome_ids
      if (Object.prototype.hasOwnProperty.call(state, 'genome_id')) {
        state.genome_ids = [state.genome_id];
        this.viewer.set('visible', true);
      }
      else if (Object.prototype.hasOwnProperty.call(state, 'genome_ids')) {
        var self = this;
        when(this.sortGenomeIdsByTaxon(this.state.genome_ids), function (genome_ids) {
          self.state.genome_ids = genome_ids;
          self.viewer.set('visible', true);
        });

      }
      else if (Object.prototype.hasOwnProperty.call(state, 'taxon_id')) {
        var self = this;
        when(this.getGenomeIdsByTaxonId(state.taxon_id), function (genomeIds) {
          state.genome_ids = genomeIds;
          self.viewer.set('visible', true);
        });
      }

      // update header
      this.buildHeaderContent(state.pathway_id);

      // update page title
      window.document.title = 'Pathway Map';
    },

    sortGenomeIdsByTaxon: function (genome_ids) {
      var query = `?in(genome_id,(${genome_ids}))&select(genome_id)&limit(10000)&sort(+superkingdom,+phylum,+class,+order,+family,+genus,+genome_name)`;
      return when(request.get(PathJoin(this.apiServiceUrl, 'genome', query), {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          Authorization: window.App.authorizationToken
        },
        handleAs: 'json'
      }), function (response) {
        return response.map(function (d) {
          return d.genome_id;
        });
      });
    },

    getGenomeIdsByTaxonId: function (taxon_id) {

      var query = '?eq(taxon_lineage_ids,' + taxon_id + ')&select(genome_id)&limit(25000)&sort(+kingdom,+phylum,+class,+order,+family,+genus)';
      return when(request.get(PathJoin(this.apiServiceUrl, 'genome', query), {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          Authorization: window.App.authorizationToken
        },
        handleAs: 'json'
      }), function (response) {
        return response.map(function (d) {
          return d.genome_id;
        });
      });
    },

    buildHeaderContent: function (mapId) {
      var self = this;
      var query = '?eq(pathway_id,' + mapId + ')&limit(1)';
      return when(request.get(PathJoin(this.apiServiceUrl, 'pathway_ref', query), {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          Authorization: window.App.authorizationToken
        },
        handleAs: 'json'
      }), function (response) {
        var p = response[0];

        self.queryNode.innerHTML = '<b>' + p.pathway_id + ' | ' + p.pathway_name + '</b>';
      });
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new PathwayMapContainer({
        region: 'center',
        state: this.state,
        apiServer: this.apiServiceUrl
      });

      this.viewerHeader = new ContentPane({
        content: '',
        region: 'top'
      });
      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      domConstruct.create('i', { 'class': 'fa PerspectiveIcon icon-map-o' }, headerContent);
      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: 'Pathway View'
      }, headerContent);

      this.queryNode = domConstruct.create('span', { 'class': 'PerspectiveQuery' }, headerContent);

      this.addChild(this.viewerHeader);
      this.addChild(this.viewer);
    }
  });
});
