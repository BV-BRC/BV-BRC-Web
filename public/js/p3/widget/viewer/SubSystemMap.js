define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/when', 'dojo/request', 'dojo/dom-construct',
  'dijit/dijit', 'dijit/layout/ContentPane', 'dojo/_base/Deferred',
  './Base', '../../util/PathJoin', '../SubsystemMapContainer', 'dojo/topic'
], function (
  declare, lang, when, request, domConstruct,
  dijit, ContentPane, Deferred,
  ViewerBase, PathJoin, SubsystemMapContainer, Topic
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    containerType: 'transcriptomics_experiment',
    apiServiceUrl: window.App.dataAPI,

    subsystemName: '',
    subsystemClass: '',
    subclass: '',
    showHeader: false,

    taxonId: '',
    displayDefaultGenomes: false,

    onSetState: function (attr, oldVal, state) {

      if (!state) {
        return;
      }
      this.getStateParams(state);
      var that = this;
      var query = 'ne(genome_id,' + state.genome_ids_without_reference + '),eq(taxon_lineage_ids,2),eq(reference_genome,Reference)&select(genome_id,genome_name,reference_genome)&limit(25000)&sort(+kingdom,+phylum,+class,+order,+family,+genus)';

      request.post(PathJoin(window.App.dataServiceURL, 'genome'), {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        data: query
      }).then(lang.hitch(this, function (response) {
        var reference_genome_ids = response.map(function (genome) {
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

        for ( var i = that.state.genome_ids.length - 1; i >= 0; i-- ) {
          reference_genome_ids.unshift(that.state.genome_ids[i]);
          alphabetical_reference_genome_ids.unshift(that.state.genome_ids[i]);
        }

        state.genome_ids_with_reference = reference_genome_ids;
        state.genome_ids = reference_genome_ids;

        state.alphabetical_genome_ids_with_reference = alphabetical_reference_genome_ids;

        when(that.getGenomeIdsBySubsystemId(that.state.genome_ids, that.state.subsystem_id), function (genomeIds) {
          that.viewer.set('visible', true);
          // $('#subsystemheatmap').attr('style','height: 100px');
        });

        window.document.title = 'Subsystem Map';
      }));
    },

    getSubsystemDescription: function (subsystemId) {

      var def = new Deferred();
      var ref_query = 'q=subsystem_id:"' +  subsystemId + '"&fl=description,pmid&rows=1';

      when(request.post(window.App.dataAPI + 'subsystem_ref/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: window.App.authorizationToken
        },
        data: ref_query
      }), function (res) {
        def.resolve(res[0]);
      });
      return def.promise;
    },

    truncateBefore: function (str, pattern) {
      return str.slice(str.indexOf(pattern) + pattern.length);
    },

    truncateAfter: function (str, pattern) {
      return str.slice(0, str.indexOf(pattern));
    },

    /* TODO: reorganize this function. This function not only returns display_reference_genomes but also reorganize object internally. */
    getStateParams: function (state) {

      var decodedSelectionData = JSON.stringify(state.search);
      var params = JSON.parse(decodedSelectionData);
      var decodedParams = decodeURIComponent(params);

      var genome_ids_regex = /genome_ids=(.*?)&/;
      var genome_ids = genome_ids_regex.exec(decodedParams);
      if (genome_ids) {
        genome_ids = genome_ids[1];
      }

      var subsystem_id_regex = /subsystem_id=(.*?)&/;
      var subsystem_id = subsystem_id_regex.exec(decodedParams);
      if (subsystem_id) {
        subsystem_id = subsystem_id[1];
      }

      var genome_count_regex = /genome_count=(.*?)&/;
      var genome_count = genome_count_regex.exec(decodedParams);
      if (genome_count) {
        genome_count = genome_count[1];
      }

      var role_count_regex = /role_count=(.*?)&/;
      var role_count = role_count_regex.exec(decodedParams);
      if (role_count) {
        role_count = role_count[1];
      }

      var gene_count_regex = /gene_count=(.*?)&/;
      var gene_count = gene_count_regex.exec(decodedParams);
      if (gene_count) {
        gene_count = gene_count[1];
      }

      var genome_name_regex = /genome_name=(.*?)&/;
      var genome_name = genome_name_regex.exec(decodedParams);
      if (genome_name) {
        genome_name = genome_name[1];
      }

      var display_reference_genomes_regex = /display_reference_genomes=(.*)/;
      var display_reference_genomes = display_reference_genomes_regex.exec(decodedParams)[1];

      if (display_reference_genomes === 'false') {
        display_reference_genomes = false;
      } else {
        display_reference_genomes = true;
      }

      state.genome_ids = genome_ids.split(',');
      state.genome_ids_without_reference = genome_ids.split(',');

      state.subsystem_id = subsystem_id;
      state.genome_count = genome_count;
      state.role_count = role_count;
      state.gene_count = gene_count;
      state.genome_name = genome_name;
      state.display_reference_genomes = display_reference_genomes;
      state.display_alphabetically = false;

      return display_reference_genomes;
    },

    getGenomeIdsBySubsystemId: function (genome_ids, subsystem_id) {

      var query = 'q=genome_id:(' + genome_ids.join(' OR ') + ') AND subsystem_id:"' + encodeURIComponent(subsystem_id) + '"&rows=1&facet=true&facet.field=genome_id&facet.mincount=1&json.nl=map';
      var that = this;

      return when(request.post(window.App.dataAPI + 'subsystem/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: window.App.authorizationToken
        },
        data: query
      }), function (response) {

        this.superclass = response.response.docs[0].superclass;
        this.subsystemClass = response.response.docs[0]['class'];
        this.subclass = response.response.docs[0].subclass;
        this.subsystemName = response.response.docs[0].subsystem_name;

        var headerString = 'Subsystem View <br>';

        if (this.superclass !== '') {
          headerString += this.superclass + ' » ';
        }

        if (this.subsystemClass !== '') {
          headerString += this.subsystemClass + ' » ';
        }

        if (this.subclass !== '') {
          headerString += this.subclass + ' » ';
        }

        var geneInfo = '';

        // Genome, gene, role
        if ( that.state.genome_count > 1 && that.state.role_count != null ) {
          geneInfo += ' (' + that.state.genome_count + ' genomes, ' + that.state.gene_count + ' genes, ' + that.state.role_count + ' roles)';
        }
        else if ( that.state.genome_count > 1 && that.state.role_count === null ) {
          geneInfo += ' (' + that.state.gene_count + ' genes, ' + that.state.role_count + ' roles)';
        }
        else if (that.state.role_count != null) {
          geneInfo += ' (' + that.state.gene_count + ' genes, ' + that.state.role_count + ' roles)';
        }
        else if (that.state.genome_name != null) {
          geneInfo += ' (' + that.state.genome_name + ')';
        }

        // $('#subsystemheatmap').append("<div id=\"toggleheaderwrapper\"><input id=\"toggleheader\" class=\"hideshowbutton\" value=\"hide\"/></div>");

        $('#subsystemheatmap').append('<div id="subsystemheatmapheader"></div>');
        // $('#subsystemheatmapheader').attr('style','height: 170px');
        $('#subsystemheatmapheader').html( headerString + '<span style="color:#76a72d;font-size: 1.1em;font-weight: bold">' + this.subsystemName + geneInfo + '</span>');

        when(that.getSubsystemDescription(that.state.subsystem_id), function (data) {

          if (data && data.pmid && data.description) {

            var pmids = [];
            data.pmid.forEach(function (pmid) {
              var pmidHref = 'https://www.ncbi.nlm.nih.gov/pubmed/' + pmid;
              var pmidButton = '<a target="_blank" href="' + pmidHref + '">' + pmid + '</a>';
              pmids.push(pmidButton);
            });

            var pmidString = pmids.join(', ');

            $('#subsystemheatmapheader').append( '<br><br>');
            // $('#subsystemheatmapheader').append( "<p>" + "<span style=\"font-size: 1.1em;font-weight: bold\">" + "Description: " + "</span>" + data.description + "</p>" );
            $('#subsystemheatmapheader').append( '<br><p><span style="font-size: 1.1em;font-weight: bold">Associated Publication IDs: ' + pmidString + '</span></p>');


          } else if ( data && data.description ) {
            // $('#subsystemheatmapheader').append( "<br><br>");
            // $('#subsystemheatmapheader').append( "<p>" + "<span style=\"font-size: 1.1em;font-weight: bold\">" + "Description: " + "</span>" + data.description + "</p>" );
          } else if ( data && data.pmid ) {
            var pmids = [];
            data.pmid.forEach(function (pmid) {
              var pmidHref = 'https://www.ncbi.nlm.nih.gov/pubmed/' + pmid;
              var pmidButton = '<a target="_blank" href="' + pmidHref + '">' + pmid + '</a>';
              pmids.push(pmidButton);
            });
            var pmidString = pmids.join(', ');
            $('#subsystemheatmapheader').append( '<br><br>');
            $('#subsystemheatmapheader').append( '<br><p><span style="font-size: 1.1em;font-weight: bold">Associated Publication IDs: ' + pmidString + '</span></p>');
          }

        });

        var genomeIdList = [];
        var genomeIds = response.facet_counts.facet_fields.genome_id;

        for (var key in genomeIds) {
          if (Object.prototype.hasOwnProperty.call(genomeIds, key)) {
            genomeIdList.push(key);
          }
        }

        return genomeIdList;
      });
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      var that = this;

      Topic.subscribe('SubSystemMapResize', lang.hitch(self, function () {
        var key = arguments[0];
        // var value = arguments[1];
        switch (key) {
          case 'toggleDescription':
            if (that.showHeader) {
              that.addChild(that.viewerHeader);
              that.showHeader = false;
            } else {
              dijit.byId(that.id).removeChild(dijit.byId('subsystemheatmapheadercontainer'));
              that.showHeader = true;
            }
            break;
          default:
            break;
        }
      }));

      this.inherited(arguments);

      this.viewerHeader = new ContentPane({
        content: '',
        region: 'top',
        // style: 'height: 110px',
        id: 'subsystemheatmapheadercontainer'
      });

      this.viewer = new SubsystemMapContainer({
        region: 'center',
        state: this.state,
        apiServer: this.apiServiceUrl
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      domConstruct.create('i', { 'class': 'fa PerspectiveIcon icon-map-o' }, headerContent);

      domConstruct.create('div', {
        'class': 'PerspectiveType',
        id: 'subsystemheatmap'
      }, headerContent);

      this.addChild(this.viewerHeader);
      this.addChild(this.viewer);
    }
  });
});
