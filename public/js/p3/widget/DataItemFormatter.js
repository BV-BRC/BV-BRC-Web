define([
  'dojo/_base/lang', 'dojo/date/locale', 'dojo/dom-construct', 'dojo/dom-class',
  'dijit/form/Button', '../JobManager', 'dijit/TitlePane', './formatter', 'dojo/on',
  'dojo/query', '../util/PathJoin', 'dojo/request', 'dojo/when', 'dojo/NodeList-traverse'
], function (
  lang, locale, domConstruct, domClass,
  Button, JobManager, TitlePane, formatter, on,
  query, PathJoin, request, when
) {

  function renderNoInfoFound(sectionName, parent) {
    domConstruct.create('tr', {
      innerHTML: '<td></td><td class="DataItemSectionNotFound">None available</td>'
    }, parent);
  }

  function renderSectionHeader(title) {
    var tr = domConstruct.create('tr', {});
    domConstruct.create('td', {
      innerHTML: title,
      'class': 'DataItemSectionHead',
      colspan: 2
    }, tr);

    return tr;
  }

  function evaluateLink(link, value, item) {
    return (link && value !== '-' && value !== '0') ? (
      (typeof (link) == 'function') ?
        link.apply(this, [item]) :
        '<a href="' + link + value + '" target="_blank">' + String(value).split(',').join(', ') + '</a>'
    ) : value;
  }

  function renderRow(property, value) {
    var tr = domConstruct.create('tr', {});
    domConstruct.create('td', {
      'class': 'DataItemProperty',
      innerHTML: property
    }, tr);
    domConstruct.create('td', {
      'class': 'DataItemValue',
      innerHTML: value
    }, tr);

    return tr;
  }

  function renderDataTable(data) {
    var table = domConstruct.create('table', { 'class': 'p3table' });
    for (var i = 0, len = data.length; i < len; i++) {
      var k = data[i].split(':')[0],
        v = data[i].split(':')[1];

      var tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { 'class': 'DataItemProperty', innerHTML: k }, tr);
      domConstruct.create('td', { 'class': 'DataItemValue', innerHTML: v }, tr);
    }
    return table;
  }

  function renderMultiData(label, data) {
    var table = domConstruct.create('table', { 'class': 'p3table' });
    var tr = domConstruct.create('tr', {}, table);
    domConstruct.create('td', { 'class': 'DataItemProperty', innerHTML: label }, tr);

    var ul = domConstruct.create('ul', null, tr);
    if (typeof data == 'object') {
      for (var i = 0, len = data.length; i < len; i++) {
        var val = data[i];
        domConstruct.create('li', { 'class': 'DataItemValue', innerHTML: val }, ul);
      }
    } else if (typeof data == 'string') {
      domConstruct.create('li', { 'class': 'DataItemValue', innerHTML: data }, ul);
    }

    return table;
  }

  function renderProperty(column, item, options) {
    var key = column.text;
    var label = column.name;
    var multiValued = column.multiValued || false;
    var mini = options && options.mini || false;

    if (!key || !item[key] || column.data_hide) {
      return;
    }

    if (column.isList) {
      var tr = domConstruct.create('tr', {});
      var td = domConstruct.create('td', { colspan: 2 }, tr);

      domConstruct.place(renderMultiData(label, item[key]), td);
      return tr;
    } else if (multiValued) {
      var tr = domConstruct.create('tr', {});
      var td = domConstruct.create('td', { colspan: 2 }, tr);

      domConstruct.place(renderDataTable(item[key]), td);
      return tr;
    } else if (column.type == 'date') {
      // display dates as MM/DD/YYYY, unless collection date or not parseable
      var d = new Date(item[key]);
      if (key === 'collection_date') {
        var dateStr = item[key];
      } else {
        var d = new Date(item[key]);
        if (d instanceof Date && !isNaN(d)) {
          var dateStr = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
        } else {
          var dateStr = item[key];
        }
      }

      return renderRow(label, dateStr);
    } else if (!mini || column.mini) {
      var l = evaluateLink(column.link, item[key], item);

      // a special case for service app
      if (label == 'Service') {
        l = formatter.serviceLabel(item[key]);
      }
      return renderRow(label, l);
    }
  }


  function displayHeader(parent, label, iconClass, url, options) {
    var linkTitle = options && options.linkTitle || false;

    var titleDiv = domConstruct.create('div', {
      'class': 'DataItemHeader'
    }, parent);

    domConstruct.create('hr', {}, parent);

    // span icon
    domConstruct.create('span', { 'class': iconClass }, titleDiv);

    // span label
    domConstruct.create('span', {
      innerHTML: (linkTitle) ? lang.replace('<a href="{url}">{label}</a>', { url: url, label: label }) : label
    }, titleDiv);
  }

  function displayDetailBySections(item, sections, meta_data, parent, options) {

    var mini = options && options.mini || false;

    var table = domConstruct.create('table', {}, parent);
    var tbody = domConstruct.create('tbody', {}, table);

    sections.forEach(function (section) {
      if (!mini) {
        var header = renderSectionHeader(section);
        domConstruct.place(header, tbody);
      }

      var rowCount = 0;
      meta_data[section].forEach(function (column) {
        var row = renderProperty(column, item, options);
        if (row) {
          domConstruct.place(row, tbody);
          rowCount++;
        }
      });

      // if no data found, say so
      if (!rowCount && !mini)
      { renderNoInfoFound(section, tbody); }
    });
  }

  function displayStdoutPanels(parent, item) {
    var stpDiv = domConstruct.create('div', {}, parent);
    var stdTitle = 'Standard Output';
    var stddlg = new TitlePane({
      title: stdTitle,
      style: 'margin-bottom:5px;',
      open: false
    }, stpDiv);

    var tpDiv = domConstruct.create('div', {}, parent);
    var stderrTitle = 'Error Output';
    var dlg = new TitlePane({
      title: stderrTitle,
      open: false
    }, tpDiv);

    // add copy to clipboard button
    var icon = '<i class="icon-clipboard2 pull-right"></i>';
    var copyBtn = new Button({
      label: icon,
      style: {
        'float': 'right',
        padding: 0
      },
      onClick: function (e) {
        e.stopPropagation();
        var self = this;

        // get text
        var pane = query(self.domNode).parents('.dijitTitlePane')[0];
        var content = query('pre', pane)[0].innerText;
        // copy contents
        navigator.clipboard.writeText(content);

        self.set('label', 'copied');
        setTimeout(function () {
          self.set('label', icon);
        }, 2000);
      }
    });

    // on stdout panel open
    stddlg.watch('open', function (attr, oldVal, open) {
      if (!open) {
        return;
      }

      JobManager.queryTaskDetail(item.id, true, false).then(function (detail) {
        var titleBar = query('.dijitTitlePaneTextNode',  stddlg.domNode)[0];
        domConstruct.place(copyBtn.domNode, titleBar);

        if (detail.stdout) {
          stddlg.set('content', "<pre style='overflow: scroll;'>" + detail.stdout + '</pre>');
        } else {
          stddlg.set('content', 'Unable to retreive STDOUT of this task.<br><pre>' + JSON.stringify(detail, null, 4) + '</pre>');
        }

      }, function (err) {
        stddlg.set('content', 'No standard output for this task found.<br>');
      });
    });

    // on error panel open
    dlg.watch('open', function (attr, oldVal, open) {
      if (!open) {
        return;
      }

      JobManager.queryTaskDetail(item.id, false, true).then(function (detail) {
        var titleBar = query('.dijitTitlePaneTextNode',  dlg.domNode)[0];
        domConstruct.place(copyBtn.domNode, titleBar);

        if (detail.stderr) {
          dlg.set('content', "<pre style='overflow: scroll;'>" + detail.stderr + '</pre>');
        } else {
          dlg.set('content', 'Unable to retreive STDERR of this task.<br><pre>' + JSON.stringify(detail, null, 4) + '</pre>');
        }

      }, function (err) {
        dlg.set('content', 'No standard error for this task found.<br>');
      });
    });
  }

  function displayDetail(item, columns, parent, options) {
    var table = domConstruct.create('table', {}, parent);
    var tbody = domConstruct.create('tbody', {}, table);

    columns.forEach(function (column) {
      var row = renderProperty(column, item, options);
      if (row) {
        domConstruct.place(row, tbody);
      }
    });
  }

  function displayDetailSubsystems(item, columns, parent, options) {
    var table = domConstruct.create('table', {}, parent);
    var tbody = domConstruct.create('tbody', {}, table);

    columns.forEach(function (column) {

      if (column.text === 'role_name') {
        // TODO: 1. why are we counting role_name distribution?
        // 2. this is a wrong taxon id to use (e.g. 1763 -> 1765)
        // 3. need to de-duplicate fecet query

        if (item.genome_count > 1) {

          var query = 'q=genome_id:(' + options.genome_ids.join(' OR ') + ') AND subsystem_id:("' + item.subsystem_id + '")&facet=true&facet.field=role_name&facet.mincount=1&facet.limit-1&rows=25000';
          when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
            handleAs: 'json',
            headers: {
              Accept: 'application/solr+json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            data: query
          }), function (response) {

            var role_list = '';
            var role_items = response.facet_counts.facet_fields.role_name;

            for (var i = 0; i < role_items.length; i += 2) {
              var role = '&#8226 ' + role_items[i] + ' <span style="font-weight: bold;">(' + role_items[i + 1] + ')</span><br>';
              role_list += role;
            }

            item.role_name = role_list;

            var row = renderProperty(column, item, options);
            if (row) {
              domConstruct.place(row, tbody);
            }
          });
        } else if (item.genome_id !== undefined) {
          var query = 'q=genome_id:(' + item.genome_id + ') AND subsystem_id:("' + item.subsystem_id + '")&facet=true&facet.field=role_name&facet.mincount=1&facet.limit-1&rows=25000';

          when(request.post(PathJoin(window.App.dataAPI, '/subsystem/'), {
            handleAs: 'json',
            headers: {
              Accept: 'application/solr+json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            data: query
          }), function (response) {

            var role_list = '';
            var role_items = response.facet_counts.facet_fields.role_name;

            for (var i = 0; i < role_items.length; i += 2) {
              var role = '&#8226 ' + role_items[i] + ' <span style="font-weight: bold;">(' + role_items[i + 1] + ')</span><br>';
              role_list += role;
            }

            // var role_list = role_names.join("<br>");
            item.role_name = role_list;

            var row = renderProperty(column, item, options);
            if (row) {
              domConstruct.place(row, tbody);
            }
          });
        }
      } else {
        var row = renderProperty(column, item, options);
        if (row) {
          domConstruct.place(row, tbody);
        }
      }
    });
  }

  var formatters = {
    'default': function (item, options) {
      options = options || {};

      var table = domConstruct.create('table');
      var tbody = domConstruct.create('tbody', {}, table);

      Object.keys(item).sort().forEach(function (key) {
        var tr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('td', { innerHTML: key }, tr);
        domConstruct.create('td', { innerHTML: item[key] }, tr);
      }, this);

      return table;
    },

    // job_parameters: function (item, options) {
    //   function renderObject(obj, target, depth) {
    //     if (!depth) {
    //       depth = 1;
    //     }
    //     if (typeof obj == 'object') {
    //       var props = Object.keys(obj);
    //       props.forEach(function (p) {
    //         if (typeof obj[p] == 'object') {
    //           var tr = domConstruct.create('tr', {}, tbody);
    //           domConstruct.create('td', {
    //             style: { 'padding-left': (depth * 5) + 'px' },
    //             innerHTML: p,
    //             nowrap: 'nowrap'
    //           }, tr);
    //           domConstruct.create('td', {}, tr);
    //           renderObject(obj[p], tbody, depth + 1);
    //         } else {
    //           var tr = domConstruct.create('tr', {}, tbody);
    //           domConstruct.create('td', {
    //             style: { 'padding-left': (depth * 10) + 'px' },
    //             innerHTML: p,
    //             nowrap: 'nowrap'
    //           }, tr);
    //           domConstruct.create('td', { innerHTML: obj[p] }, tr);
    //         }
    //       });
    //     }
    //   }
    // },
    job_status_meta: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Service',
        text: 'app'
      }, {
        name: 'Application',
        text: 'application_name'
      },{
        name: 'Job ID',
        text: 'id'
      }, {
        name: 'Status',
        text: 'status'
      }, {
        name: 'Submitted',
        text: 'submit_time'
      }, {
        name: 'Start',
        text: 'start_time'
      }, {
        name: 'Completed',
        text: 'completed_time'
      }, {
        name: 'Parameters',
        text: 'parameters',
        data_hide: true
      }, {
        name: '_formatterType',
        text: '_formatterType',
        data_hide: true
      }, {
        name: 'Parameters',
        text: 'parameters',
        data_hide: true
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.id, 'fa icon-flag-checkered fa-2x', '/workspace/', options);
      displayDetail(item, columns, div, options);

      displayStdoutPanels(div, item);

      return div;
    },

    bacteria_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Families',
        text: 'unique_family'
      }, {
        name: 'Genera',
        text: 'unique_genus'
      }, {
        name: 'Species',
        text: 'unique_species'
      }, {
        name: 'Strains',
        text: 'unique_strain'
      }, {
        name: 'Genomes / Segments',
        text: 'count'
      }, {
        name: 'Protein Coding Genes (CDS)',
        text: 'CDS'
      }, {
        name: 'Mature Peptides',
        text: 'mat_peptide'
      }, {
        name: '3D Protein Structures (PDB)',
        text: 'PDB'
      }];

      var div = domConstruct.create('div');
      // displayHeader(div, item.taxon_name, 'fa icon-taxonomy fa-2x', '/view/Taxonomy/' + item.taxon_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    virus_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Families',
        text: 'unique_family'
      }, {
        name: 'Genera',
        text: 'unique_genus'
      }, {
        name: 'Species',
        text: 'unique_species'
      }, {
        name: 'Strains',
        text: 'unique_strain'
      }, {
        name: 'Genomes / Segments',
        text: 'count'
      }, {
        name: 'Protein Coding Genes (CDS)',
        text: 'CDS'
      }, {
        name: 'Mature Peptides',
        text: 'mat_peptide'
      }, {
        name: '3D Protein Structures (PDB)',
        text: 'PDB'
      }];

      var div = domConstruct.create('div');
      // displayHeader(div, item.taxon_name, 'fa icon-taxonomy fa-2x', '/view/Taxonomy/' + item.taxon_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    taxonomy_overview_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Taxon ID',
        text: 'taxon_id',
        link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
      }, {
        name: 'Taxon Name',
        text: 'taxon_name',
      }, {
        name: 'Taxon Rank',
        text: 'taxon_rank'
      }, {
        name: 'Families',
        text: 'unique_family'
      }, {
        name: 'Genera',
        text: 'unique_genus'
      }, {
        name: 'Species',
        text: 'unique_species'
      }, {
        name: 'Strains',
        text: 'strains_count'
      }, {
        name: 'Genomes / Segments',
        text: 'count'
      }, {
        name: 'Protein Coding Genes (CDS)',
        text: 'CDS'
      }, {
        name: 'Mature Peptides',
        text: 'mat_peptide'
      }, {
        name: '3D Protein Structures (PDB)',
        text: 'PDB'
      }];

      var div = domConstruct.create('div');
      displayDetail(item, columns, div, options);

      return div;
    },

    feature_data: function (item, options) {
      options = options || {};

      var metadataFeatureDataID = this.feature_data_meta_table_names();
      var metadataFeatureDataValue = this.feature_data_meta_spec();

      var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : (item.protein_id) ? item.protein_id : item.feature_id;

      var div = domConstruct.create('div');
      displayHeader(div, label, 'fa icon-genome-features fa-2x', '/view/Feature/' + item.feature_id, options);

      displayDetailBySections(item, metadataFeatureDataID, metadataFeatureDataValue, div, options);

      return div;
    },

    // Copies data from feature_data.
    protein_data: function (item, options) {
      options = options || {};

      var metadataFeatureDataID = this.feature_data_meta_table_names();
      var metadataFeatureDataValue = this.feature_data_meta_spec();

      var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : (item.protein_id) ? item.protein_id : item.feature_id;

      var div = domConstruct.create('div');
      displayHeader(div, label, 'fa icon-genome-features fa-2x', '/view/Feature/' + item.feature_id, options);

      displayDetailBySections(item, metadataFeatureDataID, metadataFeatureDataValue, div, options);

      return div;
    },

    feature_data_meta_table_names: function () {
      return ['Genome', 'Source', 'Identifiers', 'Database Cross References', 'Location', 'Sequences', 'Annotation', 'Families', 'Misc', 'Provenance'];
    },

    feature_data_meta_spec: function () {
      var spec = {
        'Genome': [{
          name: 'Genome ID',
          text: 'genome_id',
          link: '/view/Genome/'
        }, {
          name: 'Genome Name',
          text: 'genome_name',
          link: function (obj) {
            return lang.replace('<a href="/view/Genome/{obj.genome_id}">{obj.genome_name}</a>', { obj: obj });
          }
        }, {
          name: 'Taxon ID',
          text: 'taxon_id',
          link: '/view/Taxonomy/'
        }],

        'Source': [{
          name: 'Annotation',
          text: 'annotation',
        }, {
          name: 'Feature Type',
          text: 'feature_type',
        }],

        'Identifiers': [{
          name: 'BRC ID',
          text: 'patric_id',
        }],

        'Database Cross References': [{
          name: 'RefSeq Locus Tag',
          text: 'refseq_locus_tag',
          link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
        }, {
          name: 'Protein ID',
          text: 'protein_id',
          link: 'http://www.ncbi.nlm.nih.gov/protein/'
        }, {
          name: 'Gene ID',
          text: 'gene_id',
          link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
        }, {
          name: 'UniProtKB Accession',
          text: 'uniprotkb_accession',
          link: 'https://www.uniprot.org/uniprot/'
        }, {
          name: 'PDB Accession',
          text: 'pdb_accession',
          link: 'https://www.rcsb.org/structure/'
        }],

        'Location': [{
          name: 'Start',
          text: 'start'
        }, {
          name: 'End',
          text: 'end'
        }, {
          name: 'Strand',
          text: 'strand'
        }, {
          name: 'Location',
          text: 'location',
          mini: true
        },
        // {
        //   name: 'Segments',
        //   text: 'segments',
        // },
        {
          name: 'Codon Start',
          text: 'codon_start',
        }],

        'Sequences': [{
          name: 'Accession',
          text: 'accession',
          link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
          mini: true
        }, {
          name: 'NA Length',
          text: 'na_length'
        }, {
          name: 'AA Length',
          text: 'aa_length'
        }, {
          name: 'NA Sequence',
          text: 'na_sequence_md5',
          link: function (obj) {
            return '<button onclick="window.open(\'/view/FASTA/dna/?in(feature_id,(' + obj.feature_id + '))\')">view</button>';
          }
        }, {
          name: 'AA Sequence',
          text: 'aa_sequence_md5',
          link: function (obj) {
            return '<button onclick="window.open(\'/view/FASTA/protein/?in(feature_id,(' + obj.feature_id + '))\')">view</button>';
          }
        }],

        'Annotation': [{
          name: 'Gene',
          text: 'gene',
        }, {
          name: 'Product',
          text: 'product',
        }],

        'Families': [{
          name: 'PATRIC Local Family',
          text: 'plfam_id',
          link: function (obj) {
            return lang.replace(
              '<a href="/view/FeatureList/?eq(plfam_id,' + obj.plfam_id + ')#view_tab=features">' +
                obj.plfam_id +
              '</a>',
              { obj: obj }
            );
          }
        }, {
          name: 'PATRIC Global Family',
          text: 'pgfam_id',
          link: function (obj) {
            return lang.replace(
              '<a href="/view/FeatureList/?eq(pgfam_id,' + obj.pgfam_id + ')#view_tab=features">' +
                obj.pgfam_id +
              '</a>',
              { obj: obj }
            );
          }
        }, {
          name: 'SOG ID',
          text: 'sog_id',
          link: function (obj) {
            return lang.replace(
              '<a href="/view/FeatureList/?eq(sog_id,' + obj.sog_id + ')#view_tab=features">' +
                obj.sog_id +
              '</a>',
              { obj: obj }
            );
          }
        }, {
          name: 'OG ID',
          text: 'og_id',
        }, {
          name: 'GO',
          text: 'go',
        }],

        'Misc': [{
          name: 'Property',
          text: 'property',
        }, {
          name: 'Notes',
          text: 'notes',
        }],

        'Provenance': [{
          name: 'Date Inserted',
          text: 'date_inserted',
          type: 'date'
        }, {
          name: 'Date Modified',
          text: 'date_modified',
          type: 'date'
        }],
      }
      return spec;
    },

    spgene_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Genome Name',
        text: 'genome_name'
      }, {
        name: 'BRC ID',
        text: 'patric_id'
      }, {
        name: 'RefSeq Locus Tag',
        text: 'refseq_locus_tag',
        link: 'http://www.ncbi.nlm.nih.gov/gene/?term='
      }, {
        name: 'Alt Locus Tag',
        text: 'alt_locus_tag'
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Property',
        text: 'property'
      }, {
        name: 'Source',
        text: 'source',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.source + '_HOME');

          if (link) {
            return '<a href="' + link + '" target="_blank">' + obj.source + '</a>';
          }
          return obj.source;

        }
      }, {
        name: 'Source ID',
        text: 'source_id',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.source);

          if (link) {
            return '<a href="' + link + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
          }
          return obj.source_id;

        }
      }, {
        name: 'Organism',
        text: 'organism'
      }, {
        name: 'Function',
        text: 'function'
      }, {
        name: 'Classification',
        text: 'classification'
      }, {
        name: 'Antibiotics Class',
        text: 'antibiotics_class'
      }, {
        name: 'Antibiotics',
        text: 'antibiotics'
      }, {
        name: 'Assertion',
        text: 'assertion'
      }, {
        name: 'Evidence',
        text: 'evidence'
      }, {
        name: 'PubMed',
        text: 'pmid',
        link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
      }, {
        name: 'BLASP Query Coverage',
        text: 'query_coverage'
      }, {
        name: 'BLASP Subject Coverage',
        text: 'subject_coverage'
      }, {
        name: 'BLASP Identity',
        text: 'identity'
      }, {
        name: 'BLASP E-Value',
        text: 'e_value'
      }, {
        name: 'Same Species',
        text: 'same_species'
      }, {
        name: 'Same Genus',
        text: 'same_genus'
      }, {
        name: 'Same Genome',
        text: 'same_genome'
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
      }];

      var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : item.alt_locus_tag;

      var div = domConstruct.create('div');
      displayHeader(div, label, 'fa icon-genome-features fa-2x', '/view/SpecialtyGene/' + item.feature_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    spgene_ref_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Property',
        text: 'property',
        mini: true
      }, {
        name: 'Source',
        text: 'source',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.source + '_HOME');

          if (link) {
            return '<a href="' + link + '" target="_blank">' + obj.source + '</a>';
          }
          return obj.source;

        },
        mini: true
      }, {
        name: 'Source ID',
        text: 'source_id',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.source);

          if (link) {
            return '<a href="' + link + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
          }
          return obj.source_id;

        },
        mini: true
      }, {
        name: 'Gene',
        text: 'gene_name',
        mini: true
      }, {
        name: 'Organism',
        text: 'organism',
        mini: true
      }, {
        name: 'Genus',
        text: 'genus'
      }, {
        name: 'Species',
        text: 'species'
      }, {
        name: 'Locus Tag',
        text: 'locus_tag'
      }, {
        name: 'Gene ID',
        text: 'gene_id',
        link: 'http://www.ncbi.nlm.nih.gov/gene/?term=',
        mini: true
      }, {
        name: 'GI',
        text: 'gi',
        mini: true
      }, {
        name: 'Product',
        text: 'product',
        mini: true
      }, {
        name: 'Classification',
        text: 'classification'
      }, {
        name: 'PubMed',
        text: 'pmid',
        link: 'http://www.ncbi.nlm.nih.gov/pubmed/',
        mini: true
      }, {
        name: 'Function',
        text: 'function'
      }, {
        name: 'Assertion',
        text: 'assertion'
      }];

      var div = domConstruct.create('div');
      displayDetail(item, columns, div, options);

      return div;
    },

    // this is for blast result page against "Specialty gene reference proteins(faa)"
    specialty_genes: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Database',
        text: 'database',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.database + '_HOME');

          if (link) {
            return '<a href="' + link + '" target="_blank">' + obj.database + '</a>';
          }
          return obj.database;

        }
      }, {
        name: 'Source ID',
        text: 'source_id',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.database);

          if (link) {
            return '<a href="' + link + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
          }
          return obj.source_id;

        }
      }, {
        name: 'Description',
        text: 'function'
      }, {
        name: 'Organism',
        text: 'organism'
      }];

      var label = item.database + ' | ' + item.source_id;

      var div = domConstruct.create('div');
      displayHeader(div, label, 'fa icon-genome-features fa-2x', null, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    taxonomy_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Taxon ID',
        text: 'taxon_id',
        link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
      }, {
        name: 'Taxon Name',
        text: 'taxon_name',
      }, {
        name: 'Taxon Rank',
        text: 'taxon_rank'
      }, {
        name: 'Other Names',
        text: 'other_names'
      }, {
        name: 'Genetic Code',
        text: 'genetic_code'
      }, {
        name: 'Lineage Names',
        text: 'lineage_names'
      }, {
        name: 'Parent ID',
        text: 'parent_id'
      }, {
        name: 'Division',
        text: 'division'
      }, {
        name: 'Description',
        text: 'description'
      }, {
        name: 'Genomes',
        text: 'genomes'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.taxon_name, 'fa icon-taxonomy fa-2x', '/view/Taxonomy/' + item.taxon_id, options);

      displayDetail(item, columns, div, options);

      return div;
    },

    pathway_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Pathway ID',
        text: 'pathway_id'
      }, {
        name: 'Pathway Name',
        text: 'pathway_name'
      }, {
        name: 'Pathway Class',
        text: 'pathway_class'
      }, {
        name: 'Annotation',
        text: 'annotation'
      }, {
        name: 'Unique Genome Count',
        text: 'genome_count'
      }, {
        name: 'Unique Gene Count',
        text: 'gene_count'
      }, {
        name: 'Unique EC Count',
        text: 'ec_count'
      }, {
        name: 'EC Conservation',
        text: 'ec_cons'
      }, {
        name: 'Gene Conservation',
        text: 'gene_cons'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.pathway_name, 'fa icon-git-pull-request fa-2x', '/view/Pathways/' + item.pathway_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    pathwayTab_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Genome ID',
        text: 'genome_id',
        link: '/view/Genome/'
      }, {
        name: 'Genome Name',
        text: 'genome_name',
        link: function (obj) {
          return lang.replace('<a href="/view/Genome/{obj.genome_id}">{obj.genome_name}</a>', { obj: obj });
        }
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'Sequence ID',
        text: 'sequence_id',
        link: function (obj) {
          return lang.replace('<a href="/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id,{obj.sequence_id}),eq(feature_type,CDS))" target="_blank">{obj.sequence_id}</a>', { obj: obj });
        },
      }, {
        name: 'Accession',
        text: 'accession',
      }, {
        name: 'Annotation',
        text: 'annotation'
      }, {
        name: 'Alt Locus Tag',
        text: 'alt_locus_tag'
      }, {
        name: 'RefSeq Locus Tag',
        text: 'refseq_locus_tag',
        link: 'http://www.ncbi.nlm.nih.gov/protein/?term=',
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'BRC ID',
        text: 'patric_id',
        link: '/view/Feature/'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'EC Number',
        text: 'ec_number'
      }, {
        name: 'EC Description',
        text: 'ec_description'
      }, {
        name: 'Pathway ID',
        text: 'pathway_id'
      }, {
        name: 'Pathway Name',
        text: 'pathway_name'
      }, {
        name: 'Pathway Class',
        text: 'pathway_class'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.pathway_name, 'fa icon-git-pull-request fa-2x', '/view/Pathways/' + item.pathway_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    subsystem_data: function (item, options) {
      options = options || {};

      var columns;

      // property set in SubSystemMemoryStore.js
      if (item.document_type === 'subsystems_gene') {
        columns = [
          {
            name: 'Superclass',
            text: 'superclass'
          }, {
            name: 'Class',
            text: 'class'
          }, {
            name: 'Subclass',
            text: 'subclass'
          }, {
            name: 'Subsystem Name',
            text: 'subsystem_name'
          }, {
            name: 'Role Name',
            text: 'role_name'
          }, {
            name: 'Active',
            text: 'active'
          }, {
            name: 'BRC ID',
            text: 'patric_id'
          }, {
            name: 'Gene',
            text: 'gene'
          }, {
            name: 'Product',
            text: 'product'
          }
        ];
      } else if (item.document_type === 'subsystems_subsystem') {
        columns = [
          {
            name: 'Superclass',
            text: 'superclass'
          }, {
            name: 'Class',
            text: 'class'
          }, {
            name: 'Subclass',
            text: 'subclass'
          }, {
            name: 'Subsystem Name',
            text: 'subsystem_name'
          }, {
            name: 'Active',
            text: 'active'
          }, {
            name: 'Role Names',
            text: 'role_name'
          }
        ];
      }

      var div = domConstruct.create('div');
      displayHeader(div, item.subsystem_name, 'fa icon-git-pull-request fa-2x', '/view/Subsystems/' + item.subsystem_id, options);
      displayDetailSubsystems(item, columns, div, options);

      return div;
    },

    subsystemTab_data: function (item, options) {
      options = options || {};

      var columns;

      var columns = [{
        name: 'Genome ID',
        text: 'genome_id',
        link: '/view/Genome/'
      }, {
        name: 'Genome Name',
        text: 'genome_name',
        link: function (obj) {
          return lang.replace('<a href="/view/Genome/{obj.genome_id}">{obj.genome_name}</a>', { obj: obj });
        }
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'RefSeq Locus Tag',
        text: 'refseq_locus_tag',
        link: 'http://www.ncbi.nlm.nih.gov/protein/?term=',
      }, {
        name: 'BRC ID',
        text: 'patric_id',
        link: '/view/Feature/'
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Role ID',
        text: 'role_id'
      }, {
        name: 'Role Name',
        text: 'role_name'
      }, {
        name: 'Subsystem ID',
        text: 'subsystem_id'
      }, {
        name: 'Subsystem Name',
        text: 'subsystem_name'
      }, {
        name: 'Superclass',
        text: 'superclass'
      }, {
        name: 'Class',
        text: 'class'
      }, {
        name: 'Subclass',
        text: 'subclass'
      }, {
        name: 'Active',
        text: 'active'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.subsystem_name, 'fa icon-git-pull-request fa-2x', '/view/SubsystemList/' + item.subsystem_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    proteinfamily_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'ID',
        text: 'family_id'
      }, {
        name: 'Proteins',
        text: 'feature_count'
      }, {
        name: 'Genomes',
        text: 'genome_count'
      }, {
        name: 'Description',
        text: 'description'
      }, {
        name: 'Min AA Length',
        text: 'aa_length_min'
      }, {
        name: 'Max AA Length',
        text: 'aa_length_max'
      }, {
        name: 'Mean',
        text: 'aa_length_mean'
      }, {
        name: 'Std',
        text: 'aa_length_std'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.family_id, 'fa icon-tasks fa-2x', '/view/ProteinFamilies/' + item.family_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    msa_details: function (item, options) {
      options = options || {};
      var columns = [{
        name: 'No. of Members',
        text: 'numFeatures'
      }, {
        name: 'No. of Organisms',
        text: 'numOrganisms'
      }, {
        name: 'Min AA Length',
        text: 'minLength'
      }, {
        name: 'Max AA Length',
        text: 'maxLength'
      }];
      var div = domConstruct.create('div');
      displayHeader(div, 'MSA', 'fa icon-alignment fa-2x', '/view/MSA/', options);
      displayDetail(item, columns, div, options);

      return div;
    },

    structure_data: function (item, options) {
      options = options || {};
      var columns = [{
        name: 'PDB ID',
        text: 'pdb_id',
        link: 'https://www.rcsb.org/structure/'
      }, {
        name: 'Title',
        text: 'title',
      }, {
        name: 'Organism Name',
        text: 'organism_name',
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'Genome ID',
        text: 'genome_id',
        link: '/view/Genome/'
      }, {
        name: 'Feature ID',
        text: 'feature_id'
      }, {
        name: 'BRC ID',
        text: 'patric_id',
        link: '/view/Feature/'
      }, {
        name: 'UniProtKB Accession',
        text: 'uniprotkb_accession',
        link: function (obj) {
          var ids = obj.uniprotkb_accession;
          return obj.uniprotkb_accession.map(function (d, idx) {
            return lang.replace('<a href="https://www.uniprot.org/uniprot/{0}">{1}</a>', [ids[idx], d]);
          }).join(', ');
        }
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Method',
        text: 'method',
      }, {
        name: 'Resolution',
        text: 'resolution',
      }, {
        name: 'PMID',
        text: 'pmid',
      }, {
        name: 'Institution',
        text: 'institution',
      }, {
        name: 'Authors',
        text: 'authors'
      }, {
        name: 'Release Date',
        text: 'release_date',
        type: 'date'
      }, {
        name: 'File Path',
        text: 'file_path',
        link: 'https://www.bv-brc.org/structure/'
      }, {
        name: 'Text',
        text: 'text',
      }
    ];

      var div = domConstruct.create('div');
      displayHeader(div, item.pdb_id, 'fa icon-contigs fa-2x', '/view/Genome/' + item.genome_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    proteinFeatures_data: function (item, options) {
      options = options || {};
      var columns = [{
        name: 'Genome ID',
        text: 'genome_id',
        link: '/view/Genome/'
      }, {
        name: 'Genome Name',
        text: 'genome_name',
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'BRC ID',
        text: 'patric_id',
        link: '/view/Feature/'
      }, {
        name: 'RefSeq Locus Tag',
        text: 'refseq_locus_tag',
        link: 'http://www.ncbi.nlm.nih.gov/protein/?term='
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Interpro ID',
        text: 'interpro_id',
        link: 'https://www.ebi.ac.uk/interpro/entry/InterPro/',
      }, {
        name: 'Interpro Description',
        text: 'interpro_description'
      }, {
        name: 'Feature Type',
        text: 'feature_type'
      }, {
        name: 'Source',
        text: 'source',
      }, {
        name: 'Source ID',
        text: 'source_id',
        link: function (obj) {
          var link = formatter.getExternalLinks(obj.source);

          if (link) {
            return '<a href="' + link + obj.source_id + '" target="_blank">' + obj.source_id + '</a>';
          }
          return obj.source_id;

        }
      }, {
        name: 'Description',
        text: 'description',
      }, {
        name: 'Classification',
        text: 'classification',
      }, {
        name: 'Score',
        text: 'score'
      }, {
        name: 'E Value',
        text: 'e_value'
      }, {
        name: 'Evidence',
        text: 'evidence'
      }, {
        name: 'Publication',
        text: 'publication'
      }, {
        name: 'Start',
        text: 'start'
      }, {
        name: 'End',
        text: 'end'
      }, {
        name: 'Segments',
        text: 'segments'
      }, {
        name: 'Length',
        text: 'length'
      }, {
        name: 'Sequence',
        text: 'sequence'
      }, {
        name: 'Comments',
        text: 'comments'
      }, {
        name: 'Text',
        text: 'text',
      }, {
        name: 'Date Inserted',
        text: 'date_inserted',
        type: 'date'
      }, {
        name: 'Date Modified',
        text: 'date_modified',
        type: 'date'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.genome_id, 'fa icon-contigs fa-2x', '/view/Genome/' + item.genome_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },
    sequence_feature_data: function (item, options) {
      options = options || {};

      var metadataSFID = this.sf_meta_table_names();
      var metadataSFValue = this.sf_meta_spec();

      var div = domConstruct.create('div');
      var label = item.sf_id;
      displayHeader(div, label, 'fa icon-contigs fa-2x', '/view/SequenceFeature/' + item.sf_id, options);

      displayDetailBySections(item, metadataSFID, metadataSFValue, div, options);

      return div;
    },
    sf_meta_table_names: function () {
      return ['Sequence Feature Definition', 'Source Strain Info'];
    },
    sf_meta_spec: function () {
      var spec = {
        'Sequence Feature Definition': [{
          name: 'Gene',
          text: 'gene'
        },{
          name: 'Protein Name',
          text: 'product'
        },{
          name: 'SF Name',
          text: 'sf_name'
        }, {
          name: 'SF Identifier',
          text: 'sf_id'
        }, {
          name: 'Reference Accession',
          text: 'genbank_accession'
        }, {
          name: 'Reference Positions',
          text: 'segments'
        }],

        'Source Strain Info': [{
          name: 'Source Strain',
          text: 'source_strain'
        }, {
          name: 'Source Position',
          text: 'source_sf_location'
        }, {
          name: 'Publication Type',
          text: 'source'
        },  {
          name: 'Publication ID',
          text: 'source_id',
          link: function (obj) {
            const baseURLs = {
              'UniProt': 'https://www.uniprot.org/uniprotkb?query=',
              'PMID': 'https://pubmed.ncbi.nlm.nih.gov/',
              'IEDB': 'https://www.iedb.org/epitope/'
            };

            const baseURL = baseURLs[obj.source];

            return baseURL ? `<a href="${baseURL}${obj.source_id}" target="_blank">${obj.source_id}</a>` : obj.source_id;
          }
        }, {
          name: 'Evidence Code',
          text: 'evidence_code'
        },  {
          name: 'Source Sequence',
          text: 'source_aa_sequence'
        }, {
          name: 'Comments',
          text: 'comments'
        }]
      };

      return spec;
    },
    surveillance_data: function (item, options) {
      options = options || {};

      var metadataSurveillanceID = this.surveillance_meta_table_names();
      var metadataSurveillanceValue = this.surveillance_meta_spec();

      var div = domConstruct.create('div');
      var label = item.sample_identifier;
      displayHeader(div, label, 'fa icon-contigs fa-2x', '/view/Surveillance/' + item.sample_identifier, options);

      displayDetailBySections(item, metadataSurveillanceID, metadataSurveillanceValue, div, options);

      return div;
    },
    surveillance_meta_table_names: function () {
      return ['Sample Info', 'Sample Collection', 'Sample Tests', 'Host Info', 'Environmental Exposure', 'Clinical Data', 'Symptoms/Diagnosis', 'Treatment', 'Vaccination', 'Other'];
    },
    surveillance_meta_spec: function () {
      var spec = {
        'Sample Info': [{
          name: 'Project Identifier',
          text: 'project_identifier'
        }, {
          name: 'Contributing Institution',
          text: 'contributing_institution'
        }, {
          name: 'Sample Identifier',
          text: 'sample_identifier'
        }, {
          name: 'Sample Accession',
          text: 'sample_accession'
        }, {
          name: 'Sample Material',
          text: 'sample_material'
        }, {
          name: 'Sample Transport Medium',
          text: 'sample_transport_medium'
        }, {
          name: 'Sample Receipt Date',
          text: 'sample_receipt_date'
        }, {
          name: 'Submission Date',
          text: 'submission_date'
        }, {
          name: 'Last Update Date',
          text: 'last_update_date'
        }, {
          name: 'Longitudinal Study',
          text: 'longitudinal_study'
        }, {
          name: 'Embargo End Date',
          text: 'embargo_end_date'
        }],

        'Sample Collection': [{
          name: 'Collector Name',
          text: 'collector_name'
        }, {
          name: 'Collector Institution',
          text: 'collector_institution'
        }, {
          name: 'Contact Email Address',
          text: 'contact_email_address'
        }, {
          name: 'Collection Date',
          text: 'collection_date'
        }, {
          name: 'Collection Year',
          text: 'collection_year'
        }, {
          name: 'Collection Season',
          text: 'collection_season'
        }, {
          name: 'Days Elapsed to Sample Collection',
          text: 'days_elapsed_to_sample_collection'
        }, {
          name: 'Collection Country',
          text: 'collection_country'
        }, {
          name: 'Collection State Province',
          text: 'collection_state_province'
        }, {
          name: 'Collection City',
          text: 'collection_city'
        }, {
          name: 'Collection POI',
          text: 'collection_poi'
        }, {
          name: 'Collection Latitude',
          text: 'collection_latitude'
        }, {
          name: 'Collection Longitude',
          text: 'collection_longitude'
        }, {
          name: 'Geographic Group',
          text: 'geographic_group'
        }],

        'Sample Tests': [{
          name: 'Pathogen Test Type',
          text: 'pathogen_test_type'
        }, {
          name: 'Pathogen Test Result',
          text: 'pathogen_test_Result'
        }, {
          name: 'Pathogen Test Interpretation',
          text: 'pathogen_test_interpretation'
        }, {
          name: 'Species',
          text: 'species'
        }, {
          name: 'Type',
          text: 'pathogen_type'
        }, {
          name: 'Subtype',
          text: 'subtype'
        }, {
          name: 'Strain',
          text: 'strain'
        }, {
          name: 'Sequence Accession',
          text: 'sequence_accession',
          link: 'https://www.ncbi.nlm.nih.gov/nuccore/',
        }],

        'Host Info': [{
          name: 'Host Species',
          text: 'host_species'
        }, {
          name: 'Host Common Name',
          text: 'host_common_name'
        }, {
          name: 'Host Group',
          text: 'host_group'
        }, {
          name: 'Host Identifier',
          text: 'host_identifier'
        }, {
          name: 'Host ID Type',
          text: 'host_id_type'
        }, {
          name: 'Host Capture Status',
          text: 'host_capture_status'
        }, {
          name: 'Host Health',
          text: 'host_health'
        }, {
          name: 'Host Natural State',
          text: 'host_natural_state'
        }, {
          name: 'Host Habitat',
          text: 'host_habitat'
        }, {
          name: 'Host Sex',
          text: 'host_sex'
        }, {
          name: 'Host Age',
          text: 'host_age'
        }],

        'Environmental Exposure': [{
          name: 'Exposure',
          text: 'exposure'
        }, {
          name: 'Duration of Exposure',
          text: 'duration_of_exposure'
        }, {
          name: 'Exposure Type',
          text: 'exposure_type'
        }, {
          name: 'Use of Personal Protective Equipment',
          text: 'use_of_personal_protective_equipment'
        }, {
          name: 'Primary Living Situation',
          text: 'primary_living_situation'
        }, {
          name: 'Nursing Home Residence',
          text: 'nursing_home_residence'
        }, {
          name: 'Daycare Attendance',
          text: 'daycare_attendance'
        }, {
          name: 'Travel History',
          text: 'travel_history'
        }, {
          name: 'Profession',
          text: 'profession'
        }, {
          name: 'Education',
          text: 'educaction'
        }],

        'Clinical Data': [{
          name: 'Pregnancy',
          text: 'pregnancy'
        }, {
          name: 'Trimester of Pregnancy',
          text: 'trimester_of_pregnancy'
        }, {
          name: 'Breastfeeding',
          text: 'breastfeeding'
        }, {
          name: 'Hospitalized',
          text: 'hospitalized'
        }, {
          name: 'Hospitalization Duration',
          text: 'hospitalization_duration'
        }, {
          name: 'Intensive Care Unit',
          text: 'intensive_care_unit'
        }, {
          name: 'Chest Imaging Interpretation',
          text: 'chest_imaging_interpretation'
        }, {
          name: 'Ventilation',
          text: 'ventilation'
        }, {
          name: 'Oxygen Saturation',
          text: 'oxygen_saturation'
        }, {
          name: 'Ecmo',
          text: 'ecmo'
        }, {
          name: 'Dialysis',
          text: 'dialysis'
        }, {
          name: 'Disease Status',
          text: 'disease_status'
        }, {
          name: 'Days Elapsed to Disease Status',
          text: 'days_elapsed_to_disease_status'
        }, {
          name: 'Disease Severity',
          text: 'disease_severity'
        }, {
          name: 'Tobacco Use',
          text: 'tobacco_use'
        }, {
          name: 'Packs Per Day For How Many Years',
          text: 'packs_per_day_for_how_many_years'
        }, {
          name: 'Chronic Conditions',
          text: 'chronic_conditions'
        }, {
          name: 'Maintenance Medications',
          text: 'maintenance_medications'
        }, {
          name: 'Types of Allergies',
          text: 'types_of_allergies'
        }, {
          name: 'Influenza Like Illness Over The Past Year',
          text: 'influenza_like_illness_over_the_past_year'
        }, {
          name: 'Infections Within Five Years',
          text: 'infections_within_five_years'
        }, {
          name: 'Human Leukocyte Antigens',
          text: 'human_leukocyte_antigens'
        }],

        'Symptoms/Diagnosis': [{
          name: 'Symptoms',
          text: 'symptoms'
        }, {
          name: 'Onset Hours',
          text: 'onset_hours'
        }, {
          name: 'Sudden Onset',
          text: 'sudden_onset'
        }, {
          name: 'Diagnosis',
          text: 'diagnosis'
        }, {
          name: 'Pre Visit Medications',
          text: 'pre_visit_medications'
        }, {
          name: 'Post Visit Medications',
          text: 'post_visit_medications'
        }],

        'Treatment': [{
          name: 'Treatment Type',
          text: 'treatment_type'
        }, {
          name: 'Treatment',
          text: 'treatment'
        }, {
          name: 'Initiation of Treatment',
          text: 'initiation_of_treatment'
        }, {
          name: 'Duration of Treatment',
          text: 'duration_of_treatment'
        }, {
          name: 'Treatment Dosage',
          text: 'treatment_dosage'
        }],

        'Vaccination': [{
          name: 'Vaccination_Type',
          text: 'vaccination_type'
        }, {
          name: 'Days Elapsed to Vaccination',
          text: 'days_elapsed_to_vaccination'
        }, {
          name: 'Source of Vaccine Information',
          text: 'source_of_vaccine_information'
        }, {
          name: 'Vaccine Lot Number',
          text: 'vaccine_lot_number'
        }, {
          name: 'Vaccine Manufacturer',
          text: 'vaccine_manufacturer'
        }, {
          name: 'Vaccine Dosage',
          text: 'vaccine_dosage'
        }, {
          name: 'Other Vaccinations',
          text: 'other_vaccinations'
        }],

        'Other': [{
          name: 'Additional Metadata',
          text: 'additional_metadata'
        }, {
          name: 'Comments',
          text: 'comments'
        }]
      }

      return spec;
    },

    serology_data: function (item, options) {
      var metadataSerologyID = this.serology_meta_table_names();
      var metadataSerologyValue = this.serology_meta_spec();

      var div = domConstruct.create('div');
      var label = item.sample_identifier;
      displayHeader(div, label, 'fa icon-contigs fa-2x', '/view/Serology/' + item.sample_identifier, options);
      displayDetailBySections(item, metadataSerologyID, metadataSerologyValue, div, options);

      return div;
    },
    serology_meta_table_names: function () {
      return ['Sample Info', 'Host Info', 'Sample Collection', 'Sample Tests', 'Other'];
    },
    serology_meta_spec: function () {
      var spec = {
        'Sample Info': [{
          name: 'Project Identifier',
          text: 'project_identifier'
        }, {
          name: 'Contributing Institution',
          text: 'contributing_institution'
        }, {
          name: 'Sample Identifier',
          text: 'sample_identifier'
        }],

        'Host Info': [{
          name: 'Host Identifier',
          text: 'host_identifier'
        }, {
          name: 'Host Type',
          text: 'host_type'
        }, {
          name: 'Host Species',
          text: 'host_species'
        }, {
          name: 'Host Common Name',
          text: 'host_common_name'
        }, {
          name: 'Host Sex',
          text: 'host_sex'
        }, {
          name: 'Host Age',
          text: 'host_age'
        }, {
          name: 'Host Age Group',
          text: 'host_age_group'
        }, {
          name: 'Host Health',
          text: 'host_health'
        }],

        'Sample Collection': [{
          name: 'Collection Country',
          text: 'collection_country'
        }, {
          name: 'Collection State',
          text: 'collection_state'
        }, {
          name: 'Collection City',
          text: 'collection_city'
        }, {
          name: 'Collection Date',
          text: 'collection_date'
        }, {
          name: 'Collection Year',
          text: 'collection_year'
        }, {
          name: 'Geographic Group',
          text: 'geographic_group'
        }],

        'Sample Tests': [{
          name: 'Test Type',
          text: 'test_type'
        }, {
          name: 'Test Result',
          text: 'test_result'
        }, {
          name: 'Test Interpretation',
          text: 'test_interpretation'
        }, {
          name: 'Serotype',
          text: 'serotype'
        }],

        'Other': [{
          name: 'Comments',
          text: 'comments'
        }]
      };

      return spec;
    },

    sequence_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Genome ID',
        text: 'genome_id',
        link: '/view/Genome/'
      }, {
        name: 'Genome Name',
        text: 'genome_name',
        mini: true
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
      }, {
        name: 'Sequence ID',
        text: 'sequence_id',
        link: function (obj) {
          return lang.replace('<a href="/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id,{obj.sequence_id}),eq(feature_type,CDS))" target="_blank">{obj.sequence_id}</a>', { obj: obj });
        },
        mini: true
      }, {
        name: 'GI',
        text: 'gi',
      }, {
        name: 'Accession',
        text: 'accession',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
        mini: true
      }, {
        name: 'Sequence Type',
        text: 'sequence_type'
      }, {
        name: 'Sequence Status',
        text: 'sequence_status'
      }, {
        name: 'Mol Type',
        text: 'mol_type'
      }, {
        name: 'Topology',
        text: 'topology'
      }, {
        name: 'Description',
        text: 'description'
      }, {
        name: 'Chromosome',
        text: 'chromosome'
      }, {
        name: 'Plasmid',
        text: 'plasmid'
      }, {
        name: 'Segment',
        text: 'segment'
      }, {
        name: 'GC Content',
        text: 'gc_content',
        mini: true
      }, {
        name: 'Length',
        text: 'length',
        mini: true
      }, {
        name: 'Sequence MD5',
        text: 'sequence_md5'
      }, {
        name: 'Sequence',
        text: 'sequence'
      }, {
        name: 'Release Date',
        text: 'release_date',
        type: 'date'
      }, {
        name: 'Version',
        text: 'version'
      }, {
        name: 'Insert Date',
        text: 'date_inserted',
        type: 'date'
      }, {
        name: 'Last Modified',
        text: 'date_modified',
        type: 'date'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.sequence_id, 'fa icon-contigs fa-2x', '/view/Genome/' + item.genome_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    strain_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'Family',
        text: 'family',
      }, {
        name: 'Genus',
        text: 'genus',
      }, {
        name: 'Species',
        text: 'species',
      }, {
        name: 'Strain',
        text: 'strain',
      }, {
        name: 'Subtype',
        text: 'subtype',
      }, {
        name: 'H_type',
        text: 'h_type',
      }, {
        name: 'N_type',
        text: 'n_type',
      }, {
        name: 'Genome IDs',
        text: 'genome_ids',
        link: function (obj) {
          if (obj.genome_ids.length > 1) {
            return `<a href="/view/GenomeList/?eq(*,*)&genome(in(genome_id,(${obj.genome_ids.join(',')})))">${obj.genome_ids}</a>`;
          } else if (obj.genome_ids.length == 1) {
            return `<a href="/view/Genome/${obj.genome_ids[0]}">${obj.genome_ids[0]}</a>`;
          }
          return '';
        }
      }, {
        name: 'Genbank Accessions',
        text: 'genbank_accessions',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: 'Segment Count',
        text: 'segment_count',
      }, {
        name: 'Status',
        text: 'status',
      }, {
        name: 'Host Group',
        text: 'host_group',
      }, {
        name: 'Host Common Name',
        text: 'host_common_name',
      }, {
        name: 'Host Name',
        text: 'host_name',
      }, {
        name: 'Lab Host',
        text: 'lab_host',
      }, {
        name: 'Passage',
        text: 'passage',
      }, {
        name: 'Geographic Group',
        text: 'geographic_group',
      }, {
        name: 'Isolation Country',
        text: 'isolation_country',
      }, {
        name: 'Collection Year',
        text: 'collection_year',
      }, {
        name: 'Collection Date',
        text: 'collection_date',
      }, {
        name: 'Season',
        text: 'season',
      }, {
        name: '1_PB2',
        text: '1_pb2',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '2_PB2',
        text: '2_pb2',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '3_PA',
        text: '3_pa',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '4_HA',
        text: '4_ha',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '5_NP',
        text: '5_np',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '6_NA',
        text: '6_na',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '7_MP',
        text: '7_mp',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: '8_NS',
        text: '8_ns',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: 'S',
        text: 's',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: 'M',
        text: 'm',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: 'L',
        text: 'l',
        link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
      }, {
        name: 'Other Segments',
        text: 'other_segments',
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.strain, 'fa icon-contigs fa-2x', '/view/Genome/' + item.strain, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    epitope_data: function (item, options) {
      options = options || {};

      var columns;

      var columns = [{
        name: 'Epitope ID',
        text: 'epitope_id',
        link: 'http://www.iedb.org/epitope/'
      }, {
        name: 'Epitope Type',
        text: 'epitope_type'
      }, {
        name: 'Epitope Sequence',
        text: 'epitope_sequence'
      }, {
        name: 'Organism',
        text: 'organism'
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
        link: '/view/Taxonomy/'
      }, {
        name: 'Protein Name',
        text: 'protein_name'
      }, {
        name: 'Protein ID',
        text: 'protein_id'
      }, {
        name: 'Protein Accession',
        text: 'protein_accession'
      }, {
        name: 'Start',
        text: 'start',
      }, {
        name: 'End',
        text: 'end',
      }, {
        name: 'Host Name',
        text: 'host_name',
      }, {
        name: 'Total Assays',
        text: 'total_assays',
      }, {
        name: 'Assay Results',
        text: 'assay_results',
      }, {
        name: 'B Cell Assays',
        text: 'bcell_assays'
      }, {
        name: 'T Cell Assays',
        text: 'tcell_assays'
      }, {
        name: 'MHC Assays',
        text: 'mhc_assays'
      }, {
        name: 'Comments',
        text: 'comments'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.epitope_id, 'fa icon-git-pull-request fa-2x', '/view/EpitopeList/' + item.epitope_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    epitope_assay_data: function (item, options) {
      options = options || {};

      var columns;

      var columns = [{
        name: 'Assay ID',
        text: 'assay_id',
      }, {
        name: 'Assay Type',
        text: 'assay_type',
      }, {
        name: 'Epitope ID',
        text: 'epitope_id',
        link: 'http://www.iedb.org/epitope/'
      }, {
        name: 'Epitope Type',
        text: 'epitope_type'
      }, {
        name: 'Epitope Sequence',
        text: 'epitope_sequence'
      }, {
        name: 'Organism',
        text: 'organism'
      }, {
        name: 'Taxon ID',
        text: 'taxon_id',
      }, {
        name: 'Protein Name',
        text: 'protein_name'
      }, {
        name: 'Protein ID',
        text: 'protein_id'
      }, {
        name: 'Protein Accession',
        text: 'protein_accession'
      }, {
        name: 'Start',
        text: 'start',
      }, {
        name: 'End',
        text: 'end',
      }, {
        name: 'Host Name',
        text: 'host_name'
      }, {
        name: 'Host Taxon ID',
        text: 'host_taxon_id'
      }, {
        name: 'Assay Group',
        text: 'assay_group'
      }, {
        name: 'Assay Method',
        text: 'assay_method'
      }, {
        name: 'Assay Result',
        text: 'assay_result'
      }, {
        name: 'Assay Measurement',
        text: 'assay_measurement'
      }, {
        name: 'Assay Measurement Unit',
        text: 'assay_measurement_unit'
      }, {
        name: 'MHC Allele',
        text: 'mhc_allele'
      }, {
        name: 'MHC Allele Class',
        text: 'mhc_allele_class'
      }, {
        name: 'PMID',
        text: 'pmid'
      }, {
        name: 'Authors',
        text: 'authors'
      }, {
        name: 'Title',
        text: 'title'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.epitope_id, 'fa icon-git-pull-request fa-2x', '/view/EpitopeList/' + item.epitope_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    experiment_data: function (item, options) {
      options = options || {};

      var sectionList = ['Study Info', 'Experiment Info', 'Additional Metadata'];
      var section = {};

      section['Study Info'] = [{
        name: 'Name',
        text: 'study_name'
      }, {
        name: 'Title',
        text: 'study_title'
      }, {
        name: 'Description',
        text: 'study_description'
      }, {
        name: 'PI',
        text: 'study_pi'
      }, {
        name: 'Institution',
        text: 'study_institution'
      }]

      section['Experiment Info'] = [{
        name: 'ID',
        text: 'exp_id'
      }, {
        name: 'Name',
        text: 'exp_name'
      }, {
        name: 'Title',
        text: 'exp_title'
      }, {
        name: 'Description',
        text: 'exp_description'
      }, {
        name: 'PoC',
        text: 'exp_poc'
      }, {
        name: 'Experimenters',
        text: 'experimenters'
      }, {
        name: 'Public Repository',
        text: 'public_repository'
      }, {
        name: 'Public Identifier',
        text: 'public_identifier'
      }, {
        name: 'PubMed',
        text: 'pmid',
        link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
      }, {
        name: 'DOI',
        text: 'doi',
        link: 'https://doi.org/'
      }, {
        name: 'Experiment Type',
        text: 'exp_type'
      }, {
        name: 'Measurement Technique',
        text: 'measurement_technique'
      }, {
        name: 'Detection Instrument',
        text: 'detection_instrument'
      }, {
        name: 'Experiment Protocol',
        text: 'exp_protocol'
      }, {
        name: 'Organism',
        text: 'organism'
      }, {
        name: 'Strain',
        text: 'strain'
      }, {
        name: 'Treatment Type',
        text: 'treatment_type'
      }, {
        name: 'Treatment Name',
        text: 'treatment_name'
      }, {
        name: 'Treatment Amount',
        text: 'treatment_amount'
      }, {
        name: 'Treatment Duration',
        text: 'treatment_duration'
      }, {
        name: 'Samples',
        text: 'samples'
      }, {
        name: 'Biosets',
        text: 'biosets'
      }, {
        name: 'Genome ID',
        text: 'genome_id'
      }
      ];

      section['Additional Metadata'] = [{
        name: 'Additional Metadata',
        multiValued: true,
        text: 'additional_metadata'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.exp_title, 'fa icon-experiments fa-2x', '/view/TranscriptomicsExperiment/' + item.exp_id, options);
      displayDetailBySections(item, sectionList, section, div, options);

      return div;
    },

    bioset_data: function (item, options) {
      options = options || {};

      const sectionList = ['Experiment Info', 'Bioset Info', 'Treatment', 'Additional Metadata'];
      const section = {};

      section['Experiment Info'] = [{
        name: 'ID',
        text: 'exp_id'
      }, {
        name: 'Name',
        text: 'exp_name'
      }, {
        name: 'Title',
        text: 'exp_title'
      }, {
        name: 'Type',
        text: 'exp_type'
      }
      ]

      section['Bioset Info'] = [{
        name: 'Bioset ID',
        text: 'bioset_id'
      }, {
        name: 'Name',
        text: 'bioset_name'
      }, {
        name: 'Description',
        text: 'bioset_description'
      }, {
        name: 'Type',
        text: 'bioset_type'
      }, {
        name: 'Analysis Method',
        text: 'analysis_method'
      }, {
        name: 'Criteria',
        text: 'bioset_criter'
      }, {
        name: 'Result Type',
        text: 'result_type'
      }, {
        name: 'Protocol',
        text: 'protocol'
      }, {
        name: 'Result',
        text: 'bioset_result'
      }
      ]

      section['Treatment'] = [{
        name: 'Type',
        text: 'treatment_type'
      }, {
        name: 'Name',
        text: 'treatment_name'
      }, {
        name: 'Amount',
        text: 'treatment_amount'
      }, {
        name: 'Duration',
        text: 'treatment_duration'
      }, {
        name: 'Entity Type',
        text: 'entity_type'
      }, {
        name: 'Entity Count',
        text: 'entity_count'
      }
      ]

      section['Additional Metadata'] = [{
        name: 'Additional Metadata',
        text: 'additional_metadata'
      }];

      var div = domConstruct.create('div');
      displayHeader(div, item.bioset_name, 'fa icon-experiments fa-2x', '/view/TranscriptomicsComparison/' + item.bioset_id, options);
      displayDetailBySections(item, sectionList, section, div, options);

      return div;
    },

    bioset_result_data: function (item, options) {
      options = options || {};


      const columns = [{
        name: 'Entity ID',
        text: 'entity_id'
      }, {
        name: 'Name',
        text: 'entity_name'
      }, {
        name: 'BRC ID',
        text: 'patric_id'
      }, {
        name: 'Locus Tag',
        text: 'locus_tag'
      }, {
        name: 'Gene ID',
        text: 'gene_id'
      }, {
        name: 'protein ID',
        text: 'protein_id'
      }, {
        name: 'Uniprot ID',
        text: 'uniprot_id'
      }, {
        name: 'Gene',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Samples',
        text: 'sample_size'
      }, {
        name: 'Up',
        text: 'up'
      }, {
        name: 'Down',
        text: 'down'
      }
      ]

      var div = domConstruct.create('div');
      displayHeader(div, item.entity_name || item.entity_id, 'fa icon-experiments fa-2x', '', options);
      displayDetail(item, columns, div, options);

      return div;
    },


    transcriptomics_gene_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Genome Name',
        text: 'genome_name'
      }, {
        name: 'Accession',
        text: 'accession'
      }, {
        name: 'BRC ID',
        text: 'patric_id'
      }, {
        name: 'RefSeq Locus Tag',
        text: 'refseq_locus_tag'
      }, {
        name: 'Alt Locus Tag',
        text: 'alt_locus_tag'
      }, {
        name: 'Gene Symbol',
        text: 'gene'
      }, {
        name: 'Product',
        text: 'product'
      }, {
        name: 'Start',
        text: 'start'
      }, {
        name: 'End',
        text: 'end'
      }, {
        name: 'Strand',
        text: 'strand'
      }, {
        name: 'Comparisons',
        text: 'sample_size'
      }, {
        name: 'Up',
        text: 'up'
      }, {
        name: 'Down',
        text: 'down'
      }];

      var label = (item.patric_id) ? item.patric_id : (item.refseq_locus_tag) ? item.refseq_locus_tag : item.alt_locus_tag;
      var div = domConstruct.create('div');
      displayHeader(div, label, 'fa icon-genome-features fa-2x', '/view/Feature/' + item.feature_id, options);
      displayDetail(item, columns, div, options);

      return div;
    },

    interaction_data: function (item, options) {
      var sectionList = ['Interaction', 'Interactor A', 'Interactor B'];
      var section = {};

      section.Interaction = [{
        name: 'Category',
        text: 'category'
      }, {
        name: 'Interaction Type',
        text: 'interaction_type'
      }, {
        name: 'Detection Method',
        text: 'detection_method'
      }, {
        name: 'Evidence',
        text: 'evidence'
      }, {
        name: 'Source DB',
        text: 'source_db'
      }, {
        name: 'Pubmed',
        text: 'pmid',
        link: function (obj) {
          if (obj.pmid.length > 0) {
            var pmid = obj.pmid[0];
            return '<a href="http://www.ncbi.nlm.nih.gov/pubmed/' + pmid.split(';').join(',') + '" target="_blank">' + pmid + '</a>';
          }
          return '';

        }
      }, {
        name: 'Score',
        text: 'score'
      }];

      section['Interactor A'] = [{
        name: 'Interactor',
        text: 'interactor_a',
        link: function (obj) {
          return '<a href="/view/Feature/' + obj.feature_id_a + '">' + obj.interactor_a + '</a>';
        }
      }, {
        name: 'Description',
        text: 'interactor_desc_a'
      }, {
        name: 'Type',
        text: 'interactor_type_a'
      }, {
        name: 'Genome Name',
        text: 'genome_name_a'
      }, {
        name: 'Refseq Locus Tag',
        text: 'refseq_locus_tag_a',
        link: 'http://www.ncbi.nlm.nih.gov/protein/?term='
      }, {
        name: 'gene',
        text: 'gene_a'
      }];

      section['Interactor B'] = [{
        name: 'Interactor',
        text: 'interactor_b',
        link: function (obj) {
          return '<a href="/view/Feature/' + obj.feature_id_b + '">' + obj.interactor_b + '</a>';
        }
      }, {
        name: 'Description',
        text: 'interactor_desc_b'
      }, {
        name: 'Type',
        text: 'interactor_type_b'
      }, {
        name: 'Genome Name',
        text: 'genome_name_b'
      }, {
        name: 'Refseq Locus Tag',
        text: 'refseq_locus_tag_b',
        link: 'http://www.ncbi.nlm.nih.gov/protein/?term='
      }, {
        name: 'gene',
        text: 'gene_b'
      }];

      var div = domConstruct.create('div');

      displayDetailBySections(item, sectionList, section, div, options);

      return div;
    },

    genome_amr_data: function (item, options) {
      var sectionList = ['Summary', 'Measurement', 'Laboratory Method', 'Computational Method'];
      var section = {};

      section.Summary = [{
        name: 'Taxon ID',
        text: 'taxon_id'
      }, {
        name: 'Genome ID',
        text: 'genome_id'
      }, {
        name: 'Genome Name',
        text: 'genome_name'
      }, {
        name: 'Antibiotic',
        text: 'antibiotic'
      }, {
        name: 'Resistant Phenotype',
        text: 'resistant_phenotype'
      }, {
        name: 'Evidence',
        text: 'evidence'
      }, {
        name: 'PubMed',
        text: 'pmid',
        link: 'http://www.ncbi.nlm.nih.gov/pubmed/'
      }];

      section.Measurement = [{
        name: 'Sign',
        text: 'measurement_sign'
      }, {
        name: 'Value',
        text: 'measurement_value'
      }, {
        name: 'Units',
        text: 'measurement_unit'
      }];

      section['Laboratory Method'] = [{
        name: 'Method',
        text: 'laboratory_typing_method'
      }, {
        name: 'Platform',
        text: 'laboratory_typing_platform'
      }, {
        name: 'Vendor',
        text: 'vendor'
      }, {
        name: 'Version',
        text: 'laboratory_typing_method_version'
      }, {
        name: 'Testing Standard',
        text: 'testing_standard'
      }, {
        name: 'Testing Standard Year',
        text: 'testing_standard_year'
      }];

      section['Computational Method'] = [{
        name: 'Method',
        text: 'computational_method'
      }, {
        name: 'Version',
        text: 'computational_method_version'
      }, {
        name: 'Performance',
        text: 'computational_method_performance'
      }];

      var div = domConstruct.create('div');

      displayDetailBySections(item, sectionList, section, div, options);

      return div;
    },

    antibiotic_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Antibiotic Name',
        text: 'antibiotic_name'
      }, {
        name: 'PubChem CID',
        text: 'pubchem_cid',
        link: 'https://pubchem.ncbi.nlm.nih.gov/compound/'
      }, {
        name: 'CAS ID',
        text: 'cas_id'
      }, {
        name: 'Molecular Formula',
        text: 'molecular_formula',
        link: 'https://pubchem.ncbi.nlm.nih.gov/search/#collection=compounds&query_type=mf&sort=mw&sort_dir=asc&query='
      }, {
        name: 'Molecular Weight',
        text: 'molecular_weight'
      }, {
        name: 'InChI Key',
        text: 'inchi_key'
      }, {
        name: 'ATC Classification',
        text: 'atc_classification',
        link: function (obj) {
          return obj.atc_classification.map(function (cls) {
            return '<div class="keyword small">' + cls + '</div>';
          }).join(' ');
        }
      }];

      var div = domConstruct.create('div');
      displayDetail(item, columns, div, options);

      return div;
    },

    variant_lineage_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Lineage of Concern',
        text: 'lineage_of_concern'
      }, {
        name: 'Covariant',
        text: 'lineage'
      }, {
        name: 'Sequence Features',
        text: 'sequence_features'
      }, {
        name: 'Country',
        text: 'country'
      }, {
        name: 'Region',
        text: 'region'
      }, {
        name: 'Month',
        text: 'month'
      }, {
        name: 'Total Sequences',
        text: 'total_isolates'
      }, {
        name: 'Covariant Sequences',
        text: 'lineage_count'
      }, {
        name: 'Frequency',
        text: 'prevalence'
      }, {
        name: 'Growth Rate',
        text: 'growth_rate'
      }, {
        name: 'Date Modified',
        text: 'date_modified',
        type: 'date'
      }];

      var div = domConstruct.create('div');
      displayDetail(item, columns, div, options);

      return div;
    },

    variant_data: function (item, options) {
      options = options || {};

      var columns = [{
        name: 'Variant',
        text: 'aa_variant'
      }, {
        name: 'Sequence Features',
        text: 'sequence_features'
      }, {
        name: 'Country',
        text: 'country'
      }, {
        name: 'Region',
        text: 'region'
      }, {
        name: 'Month',
        text: 'month'
      }, {
        name: 'Total Sequences',
        text: 'total_isolates'
      }, {
        name: 'Variant Sequences',
        text: 'lineage_count'
      }, {
        name: 'Frequency',
        text: 'prevalence'
      }, {
        name: 'Growth Rate',
        text: 'growth_rate'
      }, {
        name: 'Date Modified',
        text: 'date_modified',
        type: 'date'
      }];

      var div = domConstruct.create('div');
      displayDetail(item, columns, div, options);

      return div;
    },

    genome_data: function (item, options) {
      options = options || {};

      var metadataGenomeSummaryID = this.genome_meta_table_names();
      var metadataGenomeSummaryValue = this.genome_meta_spec();

      var div = domConstruct.create('div');
      displayHeader(div, item.genome_name, 'fa icon-genome fa-2x', '/view/Genome/' + item.genome_id, options);

      var chromosomes = item.chromosomes || 0;
      var plasmids = item.plasmids || 0;
      var contigs = item.contigs || 0;
      var summary = 'Length: ' + item.genome_length + 'bp, ' +
        (chromosomes ? 'Chromosomes: ' + chromosomes + ', ' : '') +
        (plasmids ? 'Plasmids: ' + plasmids + ', ' : '') +
        (contigs ? 'Contigs: ' + contigs : '');

      domConstruct.create('div', {
        innerHTML: summary,
        'class': 'DataItemSummary',
        nowrap: 'nowrap'
      }, div);

      displayDetailBySections(item, metadataGenomeSummaryID, metadataGenomeSummaryValue, div, options);

      return div;
    },
    genome_meta_table_names: function () {
      return ['General Info', 'Taxonomy Info', 'Status', 'Type Info', 'Database Cross Reference', 'Sequence Info', 'Genome Statistics', 'Annotation Statistics', 'Genome Quality', 'Isolate Info', 'Host Info', 'Phenotype Info', 'Additional Info'];
    },

    genome_meta_spec: function () {
      var spec = {
        'General Info': [{
          name: 'Genome ID',
          text: 'genome_id',
          link: '/view/Genome/',
          mini: true
        }, {
          name: 'Genome Name',
          text: 'genome_name',
          mini: true
        }, {
          name: 'Other Names',
          text: 'other_names',
          mini: true,
          editable: true
        }
        ],

        'Taxonomy Info': [{
          name: 'Taxon ID',
          text: 'taxon_id',
          link: 'http://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id='
        }, {
          name: 'Superkingdom',
          text: 'superkingdom',
        }, {
          name: 'Kingdom',
          text: 'kingdom',
        }, {
          name: 'Phylum',
          text: 'phylum',
        }, {
          name: 'Class',
          text: 'class',
        }, {
          name: 'Order',
          text: 'order',
        }, {
          name: 'Family',
          text: 'family',
        }, {
          name: 'Genus',
          text: 'genus',
        }, {
          name: 'Species',
          text: 'species',
        }],

        'Status': [{
          name: 'Genome Status',
          text: 'genome_status',
        }],

        'Type Info': [{
          name: 'Strain',
          text: 'strain',
          editable: true
        }, {
          name: 'Serovar',
          text: 'serovar',
          editable: true
        }, {
          name: 'Biovar',
          text: 'biovar',
          editable: true
        }, {
          name: 'Pathovar',
          text: 'pathovar',
          editable: true
        }, {
          name: 'MLST',
          text: 'mlst',
          editable: true
        }, {
          name: 'Segment',
          text: 'segment',
          editable: true
        }, {
          name: 'Subtype',
          text: 'subtype',
          editable: true
        }, {
          name: 'H Type',
          text: 'h_type',
          editable: true
        }, {
          name: 'N Type',
          text: 'n_type',
          editable: true
        }, {
          name: 'H1 Clade Global',
          text: 'h1_clade_global',
          editable: true
        }, {
          name: 'H1 Clade US',
          text: 'h1_clade_us',
          editable: true
        }, {
          name: 'H3 Clade',
          text: 'h3_clade',
          editable: true
        }, {
          name: 'H5 Clade',
          text: 'h5_clade',
          editable: true
        }, {
          name: 'pH1N1 Like',
          text: 'ph1n1_like',
          editable: true
        }, {
          name: 'Lineage',
          text: 'lineage',
          editable: true
        }, {
          name: 'Clade',
          text: 'clade',
          editable: true
        }, {
          name: 'Subclade',
          text: 'subclade',
          editable: true
        }, {
          name: 'Other Typing',
          text: 'other_typing',
          editable: true
        }, {
          name: 'Culture Collection',
          text: 'culture_collection',
          editable: true,
          link: function (obj) {
            var ids = obj.culture_collection.split(',');

            // culture collection may be a csv list
            var parts = ids.map(function (id) {
              var name = id.trim();

              // match "ATCC xxxxx" or "ATCC:xxxxx"
              var regex = /ATCC[\s:]([\w-]*)/g;
              var matches = regex.exec(id);
              if (!matches || !matches.length) return id;

              // get actual id number
              var id = matches[1];

              return lang.replace(
                '<a href="https://www.atcc.org/Products/All/{id}.aspx" target="_blank">{name}</a>', {
                  id: id,
                  name: name
                });
            });

            return parts.join(', ');
          }
        }, {
          name: 'Type Strain',
          text: 'type_strain',
          editable: true
        }, {
          name: 'Reference Genome',
          text: 'reference_genome',
          editable: true
        }],

        'Database Cross Reference': [{
          name: 'Completion Date',
          text: 'completion_date',
          editable: true,
          type: 'date'
        }, {
          name: 'Publication',
          text: 'publication',
          link: 'http://www.ncbi.nlm.nih.gov/pubmed/',
          editable: true
        }, {
          name: 'Authors',
          text: 'authors',
          editable: true
        }, {
          name: 'BioProject Accession',
          text: 'bioproject_accession',
          link: 'http://www.ncbi.nlm.nih.gov/bioproject/?term=',
          mini: true,
          editable: true
        }, {
          name: 'BioSample Accession',
          text: 'biosample_accession',
          link: 'http://www.ncbi.nlm.nih.gov/biosample/',
          mini: true,
          editable: true
        }, {
          name: 'Assembly Accession',
          text: 'assembly_accession',
          link: 'http://www.ncbi.nlm.nih.gov/assembly/',
          editable: true
        }, {
          name: 'SRA Accession',
          text: 'sra_accession',
          link: function (obj) {
            return lang.replace(
              '<a href="http://www.ncbi.nlm.nih.gov/sra/?term={1}" target="_blank">{0}</a>',
              [obj.sra_accession, obj.sra_accession.split(',').join('+OR+')]
            );
          },
          editable: true
        }, {
          name: 'Genbank Accessions',
          text: 'genbank_accessions',
          link: 'http://www.ncbi.nlm.nih.gov/nuccore/',
          editable: true
        }],

        'Sequence Info': [{
          name: 'Sequencing Centers',
          text: 'sequencing_centers',
          editable: true
        }, {
          name: 'Sequencing Status',
          text: 'sequencing_status',
          editable: true
        }, {
          name: 'Sequencing Platform',
          text: 'sequencing_platform',
          editable: true
        }, {
          name: 'Sequencing Depth',
          text: 'sequencing_depth',
          editable: true
        }, {
          name: 'Assembly Method',
          text: 'assembly_method',
          editable: true
        }],

        'Genome Statistics': [{
          name: 'Chromosomes',
          text: 'chromosomes',
        }, {
          name: 'Plasmids',
          text: 'plasmids',
        }, {
          name: 'Segments',
          text: 'segments',
        }, {
          name: 'Contigs',
          text: 'contigs',
          link: function (obj) {
            return lang.replace('<a href="/view/Genome/{obj.genome_id}#view_tab=sequences">{obj.contigs}</a>', { obj: obj });
          }
        }, {
          name: 'Genome Length',
          text: 'genome_length',
        }, {
          name: 'GC Content',
          text: 'gc_content',
        }, {
          name: 'Contig L50',
          text: 'contig_l50',
        }, {
          name: 'Contig N50',
          text: 'contig_n50',
        }],

        'Annotation Statistics': [{
          name: 'tRNA',
          text: 'trna',
        }, {
          name: 'rRNA',
          text: 'rrna',
        }, {
          name: 'Mat Peptide',
          text: 'mat_peptide',
        }, {
          name: 'CDS',
          text: 'cds',
        }, {
          name: 'CDS Ratio',
          text: 'cds_ratio',
        }, {
          name: 'Hypothetical CDS',
          text: 'hypothetical_cds',
        }, {
          name: 'Hypothetical CDS Ratio',
          text: 'hypothetical_cds_ratio',
        }, {
          name: 'Partial CDS',
          text: 'partial_cds',
        }, {
          name: 'Partial CDS Ratio',
          text: 'partial_cds_ratio',
        }, {
          name: 'PLFAM CDS',
          text: 'plfam_cds',
        }, {
          name: 'PLFAM CDS Ratio',
          text: 'plfam_cds_ratio',
        }, {
          name: 'Core Families',
          text: 'core_families',
        }, {
          name: 'Core Family Ratio',
          text: 'core_family_ratio',
        }, {
          name: 'Missing Core Family IDs',
          text: 'missing_core_family_ids',
        }],

        'Genome Quality': [{
          name: 'Coarse Consistency',
          text: 'coarse_consistency',
        }, {
          name: 'Fine Consistency',
          text: 'fine_consistency',
        }, {
          name: 'CheckM Completeness',
          text: 'checkm_completeness',
        }, {
          name: 'CheckM Contamination',
          text: 'checkm_contamination',
        }, {
          name: 'Genome Quality Flags',
          text: 'genome_quality_flags',
        }, {
          name: 'Genome Quality',
          text: 'genome_quality',
        }, {
          name: 'Nearest Genomes',
          text: 'nearest_genomes',
          link: 'http://www.ncbi.nlm.nih.gov/genome/?term=',
          editable: true
        }, {
          name: 'Outgroup Genomes',
          text: 'outgroup_genomes',
          link: 'http://www.ncbi.nlm.nih.gov/genome/?term=',
          editable: true
        }],

        'Isolate Info': [{
          name: 'Isolation Source',
          text: 'isolation_source',
          editable: true
        }, {
          name: 'Isolation Comments',
          text: 'isolation_comments',
          editable: true
        }, {
          name: 'Collection Date',
          text: 'collection_date',
          editable: true
        }, {
          name: 'Collection Year',
          text: 'collection_year',
          editable: true
        }, {
          name: 'Season',
          text: 'season',
          editable: true
        }, {
          name: 'Isolation Country',
          text: 'isolation_country',
          editable: true
        }, {
          name: 'State/Province',
          text: 'state_province',
          editable: true
        }, {
          name: 'Geographic Group',
          text: 'geographic_group',
          editable: true
        }, {
          name: 'Geographic Location',
          text: 'geographic_location',
          editable: true
        }, {
          name: 'Other Environmental',
          text: 'other_environmental',
          editable: true
        }],

        'Host Info': [{
          name: 'Host Name',
          text: 'host_name',
          editable: true
        }, {
          name: 'Host Common Name',
          text: 'host_common_name',
          editable: true
        }, {
          name: 'Host Sex',
          text: 'host_gender',
          editable: true
        }, {
          name: 'Host Age',
          text: 'host_age',
          editable: true
        }, {
          name: 'Host Health',
          text: 'host_health',
          editable: true
        }, {
          name: 'Host Group',
          text: 'host_group',
          editable: true
        }, {
          name: 'Lab Host',
          text: 'lab_host',
          editable: true
        }, {
          name: 'Passage',
          text: 'passage',
          editable: true
        }, {
          name: 'Other Clinical',
          text: 'other_clinical',
          editable: true
        }],

        'Phenotype Info': [{
          name: 'Phenotype',
          text: 'phenotype',
          editable: true
        }, {
          name: 'Gram Stain',
          text: 'gram_stain',
          editable: true
        }, {
          name: 'Cell Shape',
          text: 'cell_shape',
          editable: true
        }, {
          name: 'Motility',
          text: 'motility',
          editable: true
        }, {
          name: 'Sporulation',
          text: 'sporulation',
          editable: true
        }, {
          name: 'Temperature Range',
          text: 'temperature_range',
          editable: true
        }, {
          name: 'Optimal Temperature',
          text: 'optimal_temperature',
          editable: true
        }, {
          name: 'Salinity',
          text: 'salinity',
          editable: true
        }, {
          name: 'Oxygen Requirement',
          text: 'oxygen_requirement',
          editable: true
        }, {
          name: 'Habitat',
          text: 'habitat',
          editable: true
        }, {
          name: 'Disease',
          text: 'disease',
          editable: true
        }],

        'Additional Info': [{
          name: 'Additional Metadata',
          multiValued: true,
          text: 'additional_metadata',
          editable: true
        }, {
          name: 'Comments',
          text: 'comments',
          editable: true
        }, {
          name: 'Date Inserted',
          text: 'date_inserted',
          type: 'date'
        }, {
          name: 'Date Modified',
          text: 'date_modified',
          type: 'date'
        }],
      };

      return spec;
    }

  };

  return function (item, type, options) {

    var new_type;
    switch (type) {
      case 'genome_group':
        new_type = 'genome_data';
        break;
      case 'feature_group':
        new_type = 'feature_data';
        break;
      case 'experiment':
        new_type = 'transcriptomics_sample_data';
        break;
      default:
        new_type = (formatters[type]) ? type : 'default';
    }

    return formatters[new_type](item, options);
  };
});
