define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/when', 'dojo/request', 'dojo/dom-construct',
  'dijit/dijit', 'dijit/layout/ContentPane', './SubSystemMap', '../SubsystemServiceMapContainer', 'dojo/topic', '../../util/PathJoin'
], function (
  declare, lang, when, request, domConstruct, dijit, ContentPane, oldMap, SubsystemMapContainer, Topic, PathJoin
) {
  return declare([oldMap], {
    disabled: false,
    query: null,
    containerType: 'transcriptomics_experiment',

    subsystemName: '',
    subsystemClass: '',
    subclass: '',
    showHeader: false,

    taxonId: '',
    displayDefaultGenomes: false,

    onSetState: function ( attr, oldVal, state) {
      if (!state) {
        return;
      }
      this.updateLocalState(state);

      // var query = 'eq(taxon_lineage_ids,2),or(eq(reference_genome,Reference),in(genome_id,(' + this.state.genome_ids.join(',') + ')))&select(genome_id,genome_name,reference_genome)&limit(25000)&sort(+kingdom,+phylum,+class,+order,+family,+genus)';
      var query = 'eq(taxon_lineage_ids,2),in(genome_id,(' + this.state.genome_ids.join(',') + '))&select(genome_id,genome_name,reference_genome)&limit(25000)&sort(+superkingdom,+phylum,+class,+order,+family,+genus,+genome_name)';

      var self = this;
      request.post(PathJoin(self.apiServiceUrl, 'genome'), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: query
      }).then(function (response) {

        var reference_genome_ids = response.filter(x => x.reference_genome).map(function (genome) {
          return genome.genome_id;
        });
        var all_genome_ids = response.map(function (genome) {
          return genome.genome_id;
        });

        state.reference_genome_ids_only = reference_genome_ids;

        response.sort(function (a, b) {
          var textA = a.genome_name.toUpperCase();
          var textB = b.genome_name.toUpperCase();
          return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });

        var alphabetical_reference_genome_ids = response.map(function (genome) {
          return genome.genome_id;
        });

        state.genome_ids_with_reference = all_genome_ids;
        state.genome_ids = all_genome_ids;

        state.alphabetical_genome_ids_with_reference = alphabetical_reference_genome_ids;

        when(self.getGenomeIdsBySubsystemId(self.state.genome_ids, self.state.subsystem_id), function (genomeIds) {
          // self.viewer.set('visible', true);
        });

        window.document.title = 'Subsystem Map';

        self.viewerHeader = new ContentPane({
          content: '',
          region: 'top',
          // style: 'height: 110px',
          id: 'subsystemheatmapheadercontainer'
        });

        // TODO: Try creating heatmap memory store here, then passing it to container/grid

        self.viewer = new SubsystemMapContainer({
          region: 'center',
          state: self.state,
          apiServer: self.apiServiceUrl
        });

        var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
        domConstruct.place(headerContent, self.viewerHeader.containerNode, 'last');
        domConstruct.create('i', { 'class': 'fa PerspectiveIcon icon-map-o' }, headerContent);

        domConstruct.create('div', {
          'class': 'PerspectiveType',
          id: 'subsystemheatmap'
        }, headerContent);

        self.addChild(self.viewerHeader);
        self.addChild(self.viewer);

        self.viewer.set('visible', true);
      });
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      // Todo(nc): Note this event is for removing description, not resizing.  Should remove.
      var self = this;
      Topic.subscribe('SubSystemMapResize', lang.hitch(self, function () {
        var key = arguments[0];
        // var value = arguments[1];
        switch (key) {
          case 'toggleDescription':
            if (self.showHeader) {
              self.addChild(self.viewerHeader);
              self.showHeader = false;
            } else {
              dijit.byId(self.id).removeChild(dijit.byId('subsystemheatmapheadercontainer'));
              self.showHeader = true;
            }
            break;
          default:
            break;
        }
      }));

      // TODO: move this around so that it loads after the genome data is loaded?
      // - if reference genomes don't load, then don't display?

      
      // this.inherited(arguments);
    }
  });
});
