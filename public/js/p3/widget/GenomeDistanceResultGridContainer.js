define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './ContainerActionBar', 'FileSaver',
  './GridContainer', './GenomeDistanceResultGrid'
], function (
  declare, lang,
  on, Topic,
  popup, TooltipDialog,
  ContainerActionBar, saveAs,
  GridContainer, GenomeDistanceResultGrid
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  on(downloadTT.domNode, 'div:click', lang.hitch(function (evt) {
    var rel = evt.target.attributes.rel.value;
    var data = downloadTT.get('data');
    var headers = downloadTT.get('headers');
    var filename = 'BVBRC_genome_distance';
    // console.log(data, headers);

    var DELIMITER,
      ext;
    if (rel === 'text/csv') {
      DELIMITER = ',';
      ext = 'csv';
    } else {
      DELIMITER = '\t';
      ext = 'txt';
    }

    var content = data.map(function (d) {
      return d.join(DELIMITER);
    });

    saveAs(new Blob([headers.join(DELIMITER) + '\n' + content.join('\n')], { type: rel }), filename + '.' + ext);

    popup.close(downloadTT);
  }));

  var downloadHeaders = ['Genome ID', 'Genome Name', 'Organism Name', 'NCBI Taxon ID', 'Genome Status',
    'Strain', 'Serovar', 'Biovar', 'Pathovar', 'MLST', 'Other Typing',
    'Culture Collection', 'Type Strain',
    'Completion Date', 'Publication',
    'BioProject Accession', 'BioSample Accession', 'Assembly Accession', 'GenBank Accessions',
    'RefSeq Accessions',
    'Sequencing Centers', 'Sequencing Status', 'Sequencing Platform', 'Sequencing Depth', 'Assembly Method',
    'Chromosomes', 'Plasmids', 'Contigs', 'Genome Length', 'GC Content',
    'PATRIC CDS', 'RefSeq CDS',
    'Isolation Site', 'Isolation Source', 'Isolation Comments', 'Collection Date',
    'Isolation Country', 'Geographic Location', 'Latitude', 'Longitude', 'Altitude', 'Depth', 'Other Environmental',
    'Host Name', 'Host Sex', 'Host Age', 'Host Health', 'Body Sample Site', 'Body Sample Subsite', 'Other Clinical',
    'AntiMicrobial Resistance', 'AntiMicrobial Resistance Evidence',
    'Gram Stain', 'Cell Shape', 'Motility', 'Sporulation', 'Temperature Range', 'Optimal Temperature', 'Salinity', 'Oxygen Requirement',
    'Habitat',
    'Disease', 'Comments', 'Additional Metadata', 'Date Inserted', 'Date Modified',
    'Distance', 'P Value', 'Counts'];

  var downloadFields = ['genome_id', 'genome_name', 'organism_name', 'taxon_id', 'genome_status',
    'strain', 'serovar', 'biovar', 'pathovar', 'mlst', 'other_typing',
    'culture_collection', 'type_strain',
    'completion_date', 'publication',
    'bioproject_accession', 'biosample_accession', 'assembly_accession', 'genbank_accessions',
    'refseq_accessions',
    'sequencing_centers', 'sequencing_status', 'sequencing_platform', 'sequencing_depth', 'assembly_method',
    'chromosomes', 'plasmids', 'contigs', 'genome_length', 'gc_content',
    'patric_cds', 'refseq_cds',
    'isolation_site', 'isolation_source', 'isolation_comments', 'collection_date',
    'isolation_country', 'geographic_location', 'latitude', 'longitude', 'altitude', 'depth', 'other_environmental',
    'host_name', 'host_gender', 'host_age', 'host_health', 'body_sample_site', 'body_sample_subsite', 'other_clinical',
    'antimicrobial_resistance', 'antimicrobial_resistance_evidence',
    'gram_stain', 'cell_shape', 'motility', 'sporulation', 'temperature_range', 'optimal_temperature', 'salinity', 'oxygen_requirement',
    'habitat',
    'disease', 'comments', 'additional_metadata', 'date_inserted', 'date_modified',
    'distance', 'pvalue', 'counts'
  ];

  return declare([GridContainer], {
    gridCtor: GenomeDistanceResultGrid,
    containerType: '',
    visible: true,
    store: null,

    buildQuery: function () {
    },
    _setQueryAttr: function (q) {
    },

    _setStoreAttr: function (store) {
      if (this.grid) {
        this.grid.store = store;
      }
      this._set('store', store);
    },

    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }

      if (this.grid) {
        this.grid.set('state', state);
      }
    },
    createFilterPanel: function (opts) {
      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        className: 'BrowserHeader',
        dataModel: this.dataModel,
        facetFields: this.facetFields,
        state: lang.mixin({}, this.state),
        enableAnchorButton: false,
        currentContainerWidget: this
      });
    },
    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function () {

          downloadTT.set('content', dfc);

          var data = this.grid.store.query('', {});

          var content = data.map(function (o) {
            return downloadFields.map(function (field) {
              if (o[field] instanceof Array) {
                return '"' + o[field].map(function (v) {
                  return v.replace(/"/g, "'");
                }).join(';') + '"';
              } else if (o[field]) {
                if (typeof o[field] == 'string') {
                  return '"' + o[field].replace(/"/g, "'") + '"';
                }
                return o[field];

              }
              return '';

            });
          });

          downloadTT.set('data', content);
          downloadTT.set('headers', downloadHeaders);

          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ]),
    selectionActions: GridContainer.prototype.selectionActions.concat([])
  });
});
