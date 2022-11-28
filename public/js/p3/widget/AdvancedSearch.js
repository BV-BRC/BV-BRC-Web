define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/dom-construct',
  'dojo/dom-class', './viewer/Base', './Button', 'dijit/registry', 'dojo/_base/lang',
  'dojo/dom', 'dojo/topic', 'dijit/form/TextBox', 'dojo/keys', 'dijit/_FocusMixin', 'dijit/focus',
  'dijit/layout/ContentPane', 'dojo/request', '../util/QueryToSearchInput', './GlobalSearch',
  'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dojo/text!./templates/AdvancedSearch.html',
  '../util/searchToQuery', './formatter'
], function (
  declare, WidgetBase, on, domConstruct,
  domClass, base, Button, Registry, lang,
  dom, Topic, TextBox, keys, FocusMixin, focusUtil,
  ContentPane, Request, queryToSearchInput, GlobalSearch,
  TemplatedMixin, WidgetsInTemplate, Template,
  searchToQuery, formatter
) {
  return declare([WidgetBase, TemplatedMixin, WidgetsInTemplate], {
    baseClass: 'AdvancedSearch',
    disabled: false,
    state: null,
    templateString: Template,
    searchTypes: [
      'taxonomy',
      'genome',
      'strain',
      'genome_feature',
      // 'protein',
      'sp_gene',
      'protein_feature',
      'epitope',
      'protein_structure',
      'pathway',
      'subsystem',
      'surveillance',
      'serology',
      'experiment',
      'antibiotics',
      'genome_sequence',
    ],
    labelsByType: {
      taxonomy: 'Taxa',
      genome: 'Genomes',
      strain: 'Strains',
      genome_feature: 'Features',
      // protein: 'Proteins',
      sp_gene: 'Specialty Genes',
      protein_feature: 'Domains and Motifs',
      epitope: 'Epitopes',
      protein_structure: 'Protein Structures',
      pathway: 'Pathways',
      subsystem: 'Subsystems',
      surveillance: 'Surveillance',
      serology: 'Serology',
      experiment: 'Experiments',
      antibiotics: 'Antibiotics',
      genome_sequence: 'Genomic Sequences',
    },

    advancedSearchDef: {
      genomes: {
        fields: [
          { field: 'genome_id', label: 'Genome ID', type: 'orText' },
          { field: 'genome_name', label: 'Genome Name', type: 'orText' },
          { field: 'genome_status', label: 'Genome Status', type: 'orText' },
          { field: 'isolation_country', label: 'Isolation Country', type: 'orText' },
          { field: 'host_name', label: 'Host Name', type: 'orText' },
          { field: 'collection_date', label: 'Collection Date', type: 'date' },
          { field: 'completion_date', label: 'Completion Date', type: 'date' }
        ]
      },

      features: {
        fields: [
          {
            field: 'feature_type', label: 'Feature Type', type: 'select', values: []
          },
          {
            field: 'annotation', label: 'Annotation', type: 'select', values: ['all', 'PATRIC', 'RefSeq']
          }
        ]
      },

      sp_genes: {
        fields: [
          {
            field: 'property', label: 'Property', type: 'checkboxes', values: ['Antibiotic Resistance', 'Drug Target', 'Human Homolog', 'Virulence Factor']
          },
          {
            field: 'evidence', label: 'Evidence', type: 'checkboxes', values: ['Literature', 'BLASTP']
          }
        ]
      }
    },

    _generateLink: {
      genome: function (docs, total) {
        if (total == 1) {
          return ['/view/Genome/', docs[0].genome_id, '#view_tab=overview'].join('');
        }
        return ['/view/GenomeList/?', this.state.search, '#view_tab=genomes'].join('');
      },

      strain: function (docs, total) {
        return ['/view/StrainList/?', this.state.search].join('');
      },

      genome_feature: function (docs, total) {
        if (total == 1) {
          return ['/view/Feature/', docs[0].feature_id, '#view_tab=overview'].join('');
        }
        return ['/view/FeatureList/?', this.state.search, '#view_tab=features&defaultSort=-score'].join('');
      },

      protein: function (docs, total) {
        if (total == 1) {
          return ['/view/Protein/', docs[0].feature_id, '#view_tab=overview'].join('');
        }
        return ['/view/ProteinList/?', this.state.search, '#view_tab=proteins&defaultSort=-score'].join('');
      },

      genome_sequence: function (docs, total) {
        if (total == 1) {
          return ['/view/Sequence/', docs[0].feature_id, '#view_tab=overview'].join('');
        }
        return ['/view/SequenceList/?', this.state.search].join('');
      },

      protein_feature: function (docs, total) {
        return ['/view/DomainsAndMotifsList/?', this.state.search].join('');
      },

      epitope: function (docs, total) {
        return ['/view/EpitopeList/?', this.state.search].join('');
      },

      protein_structure: function (docs, total) {
        return ['/view/ProteinStructureList/?', this.state.search].join('');
      },

      pathway: function (docs, total) {
        return ['/view/PathwayList/?', this.state.search].join('');
      },

      subsystem: function (docs, total) {
        return ['/view/SubsystemList/?', this.state.search].join('');
      },

      surveillance: function (docs, total) {
        return ['/view/SurveillanceList/?', this.state.search].join('');
      },

      serology: function (docs, total) {
        return ['/view/SerologyList/?', this.state.search].join('');
      },

      taxonomy: function (docs, total) {
        if (total == 1) {
          return ['/view/Taxonomy/', docs[0].taxon_id, '#view_tab=overview'].join('');
        }
        return ['/view/TaxonList/?', this.state.search, '#view_tab=taxons'].join('');
      },

      sp_gene: function (docs, total) {
        if (total == 1) {
          return ['/view/Feature/', docs[0].feature_id, '#view_tab=overview'].join('');
        }
        return ['/view/SpecialtyGeneList/?', this.state.search, '#view_tab=specialtyGenes'].join('');
      },

      experiment: function (docs, total) {
        if (total == 1) {
          return ['/view/ExperimentComparison/', docs[0].eid, '#view_tab=overview'].join('');
        }
        return ['/view/ExperimentList/?', this.state.search, '#view_tab=experiments'].join('');
      },

      antibiotics: function (docs, total) {
        if (total == 1) {
          return ['/view/Antibiotic/', docs[0].eid].join('');
        }
        return ['/view/AntibioticList/?', this.state.search].join('');
      },
    },

    generateLink: function (type, docs, total) {
      // console.log("Generate Link: ", type, docs, total)
      return this._generateLink[type].apply(this, [docs, total]);
    },

    _setStateAttr: function (state) {
      // console.log("AdvancedSearch _setStateAttr: ", state);
      this._set('state', state);
    },

    onSetState: function (attr, oldval, state) {
      // console.log("onSetState: ", state.search);

      if (state.search) {
        this.searchBox.set('value', queryToSearchInput(state.search));
        this.search(state.search);

      } else {
        this.searchBox.set('value', '');
        this.viewer.set('content', '');

      }
    },
    searchResults: null,

    formatgenome: function (docs, total) {
      var out = ['<div class="searchResultsContainer genomeResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/GenomeList/?', this.state.search, '#view_tab=genomes', '">Genomes&nbsp;(', total, ')</div></a>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Genome/" + doc.genome_id + "'>" + doc.genome_name + '</a></div>');

        out.push("<div class='resultInfo'>");
        out.push('<span> Genome ID: ' + doc.genome_id + '</span>');

        if (doc.plasmids && doc.plasmids > 0) {
          out.push(' | ');
          out.push('<span>' + doc.plasmids + ' Plasmids</span>');
        }

        if (doc.contigs && doc.contigs > 0) {
          out.push(' | ');
          out.push('<span>' + doc.contigs + ' Contigs</span>');
        }

        out.push('</div>');

        out.push("<div class='resultInfo'>");
        if (doc.completion_date) {
          out.push('<span> SEQUENCED: ' + formatter.dateOnly(doc.completion_date) + '</span>');
        }

        if (doc.sequencing_centers) {

          out.push('&nbsp;(' + doc.sequencing_centers + ')');
        }
        out.push('</div>');

        out.push("<div class='resultInfo'>");
        if (doc.collection_date) {
          out.push('<span>COLLECTED: ' + formatter.dateOnly(doc.collection_date) + '</span>');
        }
        if (doc.host_name) {
          out.push('<span>HOST:  ' + doc.host_name + '</span>');
        }

        out.push('</div>');

        if (doc.comments && doc.comments != '-') {
          out.push("<div class='resultInfo comments'>" + doc.comments + '</div>');
        }
        out.push('</div>');
      });
      out.push('</div>');
      return out.join('');
    },

    formatstrain: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer strainResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/StrainList/?', q, '">Strains</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push(`<div class='resultHead'><a class='navigationLink' href='/view/StrainList/?eq(strain,"${doc.strain}")'>${doc.strain}</a></div>`);
        out.push("<div class='resultInfo'>" + doc.species + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatgenome_feature: function (docs, total) {
      var out = ['<div class="searchResultsContainer featureResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/FeatureList/?', this.state.search, '#view_tab=features&defaultSort=-score', '">Features&nbsp;(', total, ')</div> </a>'];
      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Feature/" + doc.feature_id + "'>" + (doc.product || doc.patric_id || doc.refseq_locus_tag || doc.alt_locus_tag) + '</a>');
        if (doc.gene) {  out.push(' | ' + doc.gene ); }
        out.push('</div>');

        out.push("<div class='resultInfo'>" + doc.genome_name +  '</div>');

        out.push("<div class='resultInfo'>" + doc.annotation + ' | ' + doc.feature_type);

        if (doc.patric_id) {
          out.push('&nbsp;|&nbsp;' + doc.patric_id);
        }

        if (doc.refseq_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.refseq_locus_tag);
        }

        if (doc.alt_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.alt_locus_tag);
        }

        out.push('</div>');
        out.push('</div>');
      });
      out.push('</div>');
      return out.join('');
    },

    formatprotein: function (docs, total) {
      var out = ['<div class="searchResultsContainer featureResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/ProteinList/?', this.state.search, '#view_tab=proteins&defaultSort=-score', '">Proteins&nbsp;(', total, ')</div> </a>'];
      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Protein/" + doc.feature_id + "'>" + (doc.product || doc.patric_id || doc.refseq_locus_tag || doc.alt_locus_tag) + '</a>');
        if (doc.gene) {  out.push(' | ' + doc.gene ); }
        out.push('</div>');

        out.push("<div class='resultInfo'>" + doc.genome_name +  '</div>');

        out.push("<div class='resultInfo'>" + doc.annotation + ' | ' + doc.feature_type);

        if (doc.patric_id) {
          out.push('&nbsp;|&nbsp;' + doc.patric_id);
        }

        if (doc.refseq_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.refseq_locus_tag);
        }

        if (doc.alt_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.alt_locus_tag);
        }

        out.push('</div>');
        out.push('</div>');
      });
      out.push('</div>');
      return out.join('');
    },

    formatgenome_sequence: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer sequenceResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SequenceList/?', q, '">Genomic Sequences</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Genome/" + doc.genome_id + "'>" + doc.genome_name + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.accession + ' | ' + doc.description +  '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatprotein_feature: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer proteinFeaturesResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/DomainsAndMotifsList/?', q, '">Domains and Motifs</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead' style='color: #09456f;'>" + doc.source + ' | ' + doc.description + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.genome_name + '</div>');
        out.push("<div class='resultInfo'>" + doc.patric_id + ' | ' + doc.refseq_locus_tag + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatepitope: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer epitopeResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/EpitopeList/?', q, '">Epitopes</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead' style='color: #09456f;'>" + doc.epitope_id + ' | ' + doc.epitope_sequence + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.protein_name + '</div>');
        out.push("<div class='resultInfo'>" + doc.organism + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatprotein_structure: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer structureResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/ProteinStructureList/?', q, '">Protein Structures</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/ProteinStructure#accession=" + doc.pdb_id + "'>" + doc.pdb_id + ' | ' + doc.title + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.organism_name + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatpathway: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer pathwayResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/PathwayList/?', q, '">Pathways</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/Feature/" + doc.feature_id + "'>" + doc.pathway_name + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.patric_id + ' | ' + doc.product + '</div>');
        out.push("<div class='resultInfo'>" + doc.genome_name + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatsubsystem: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer subsystemResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SubsystemList/?', q, '">Subsystems</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/Feature/" + doc.feature_id + "'>" + doc.subsystem_name + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.patric_id + ' | ' + doc.product + '</div>');
        out.push("<div class='resultInfo'>" + doc.genome_name + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatsurveillance: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer surveillanceResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SurveillanceList/?', q, '">Surveillance</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/Surveillance/" + doc.sample_identifier + "'>" + doc.sample_identifier + ' | ' + doc.host_identifier + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.host_common_name + ' | ' + doc.collection_country + ' | ' + doc.collection_year + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatserology: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer serologyResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SerologyList/?', q, '">Serology</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/Serology/" + doc.sample_identifier + "'>" + doc.sample_identifier + ' | ' + doc.host_identifier + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.host_common_name + ' | ' + doc.collection_country + ' | ' + doc.collection_year + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formatsp_gene: function (docs, total) {
      var out = ['<div class="searchResultsContainer featureResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/SpecialtyGeneList/?', this.state.search, '#view_tab=specialtyGenes&filter=false', '">Specialty Genes&nbsp;(', total, ')</div> </a>'];
      // console.log("formatsp_gene, docs: ", docs);
      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Feature/" + doc.feature_id + "'>" + doc.product + '</a>');
        if (doc.gene) {  out.push(' | ' + doc.gene ); }
        out.push('</div>');

        out.push("<div class='resultInfo'>" + doc.genome_name +  '</div>');

        out.push("<div class='resultInfo'>" + doc.propert + ' | ' + doc.source);

        if (doc.evidence) {
          out.push('&nbsp;|&nbsp;' + doc.evidence);
        }

        if (doc.refseq_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.refseq_locus_tag);
        }

        if (doc.alt_locus_tag) {
          out.push('&nbsp;|&nbsp;' + doc.alt_locus_tag);
        }

        out.push('</div>');
        out.push('</div>');
      });
      out.push('</div>');
      return out.join('');
    },

    formatexperiment: function (docs, total) {
      var q = this.state.search;
      var out = ['<div class="searchResultsContainer experimentResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/ExperimentList/?', q, '">Experiments</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLinkOut\" href='/view/ExperimentComparison/" + doc.exp_id + "'>" + doc.exp_name + ' | ' + doc.exp_id + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.exp_description + '</div>');
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    formattaxonomy: function (docs, total) {
      var q = this.state.search;

      var out = ['<div class="searchResultsContainer taxonomyResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/TaxonList/?', q, '">Taxa</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Taxonomy/" + doc.taxon_id + "'>" + doc.taxon_name + '</a></div>');
        out.push("<div class='resultInfo'>" + doc.genomes +  ' Genomes</div>');
        out.push('</div>');
      });
      out.push('</div>');

      console.log('Taxonomy Format: ', out.join(''));
      return out.join('');
    },

    formatantibiotics: function (docs, total) {
      var q = this.state.search;

      var out = ['<div class="searchResultsContainer antibioticsResults">', '<div class="resultTypeHeader"><a class="navigationLink" href="/view/AntibioticList/?', q, '">Antibiotic</a>&nbsp;(', total, ')</div>'];

      docs.forEach(function (doc) {
        out.push("<div class='searchResult'>");
        out.push("<div class='resultHead'><a class=\"navigationLink\" href='/view/Antibiotic/?eq(antibiotic_name," + doc.antibiotic_name + ")'>" + doc.antibiotic_name + '</a></div>');
        if (doc.description) {
          out.push("<div class='resultInfo'>" + doc.description[0] +  '</div>');
        }
        out.push('</div>');
      });
      out.push('</div>');

      return out.join('');
    },

    _setSearchResultsAttr: function (val) {
      this.searchResults = val;

      var resultCounts = {};
      var singleResults = {};

      var content = [];
      Object.keys(val).forEach(function (type) {
        var tRes = val[type];
        var total = (tRes && tRes.result && tRes.result.response && tRes.result.response.docs) ? tRes.result.response.numFound : 0;
        var docs = (tRes && tRes.result && tRes.result.response && tRes.result.response.docs) ? tRes.result.response.docs : [];
        resultCounts[type] = { total: total, docs: docs };

        if (total > 0) { // && total<4){
          var out = [];
          // foundContent = true;
          if (this['format' + type]) {
            singleResults[type] = this['format' + type](docs, total);
            out.push(singleResults[type]);
          }
          content.push(out.join(''));
        }


      }, this);

      var keys = Object.keys(resultCounts);

      var out = ['<div style="width:850px;margin:auto;font-size:1.5em;border:1px solid #333;background:#efefef;border-radius:3px;padding:4px;"><table>'];
      out.push('<tr>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[0], resultCounts[keys[0]].docs, resultCounts[keys[0]].total) + '">' + this.labelsByType[keys[0]] + ': ' + resultCounts[keys[0]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[5], resultCounts[keys[5]].docs, resultCounts[keys[5]].total) + '">' + this.labelsByType[keys[5]] + ': ' + resultCounts[keys[5]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[10], resultCounts[keys[10]].docs, resultCounts[keys[10]].total) + '">' + this.labelsByType[keys[10]] + ': ' + resultCounts[keys[10]].total + '</a></td>');
      out.push('</tr>')

      out.push('<tr>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[1], resultCounts[keys[1]].docs, resultCounts[keys[1]].total) + '">' + this.labelsByType[keys[1]] + ': ' + resultCounts[keys[1]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[6], resultCounts[keys[6]].docs, resultCounts[keys[6]].total) + '">' + this.labelsByType[keys[6]] + ': ' + resultCounts[keys[6]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[11], resultCounts[keys[11]].docs, resultCounts[keys[11]].total) + '">' + this.labelsByType[keys[11]] + ': ' + resultCounts[keys[11]].total + '</a></td>');
      out.push('</tr>');

      out.push('<tr>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[2], resultCounts[keys[2]].docs, resultCounts[keys[2]].total) + '">' + this.labelsByType[keys[2]] + ': ' + resultCounts[keys[2]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[7], resultCounts[keys[7]].docs, resultCounts[keys[7]].total) + '">' + this.labelsByType[keys[7]] + ': ' + resultCounts[keys[7]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[12], resultCounts[keys[12]].docs, resultCounts[keys[12]].total) + '">' + this.labelsByType[keys[12]] + ': ' + resultCounts[keys[12]].total + '</a></td>');
      out.push('</tr>');

      out.push('<tr>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[3], resultCounts[keys[3]].docs, resultCounts[keys[3]].total) + '">' + this.labelsByType[keys[3]] + ': ' + resultCounts[keys[3]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[8], resultCounts[keys[8]].docs, resultCounts[keys[8]].total) + '">' + this.labelsByType[keys[8]] + ': ' + resultCounts[keys[8]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[13], resultCounts[keys[13]].docs, resultCounts[keys[13]].total) + '">' + this.labelsByType[keys[13]] + ': ' + resultCounts[keys[13]].total + '</a></td>');
      out.push('</tr>');

      out.push('<tr>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[4], resultCounts[keys[4]].docs, resultCounts[keys[4]].total) + '">' + this.labelsByType[keys[4]] + ': ' + resultCounts[keys[4]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[9], resultCounts[keys[9]].docs, resultCounts[keys[9]].total) + '">' + this.labelsByType[keys[9]] + ': ' + resultCounts[keys[9]].total + '</a></td>');
      out.push('<td><a class="navigationLink"  href="' + this.generateLink(keys[14], resultCounts[keys[14]].docs, resultCounts[keys[14]].total) + '">' + this.labelsByType[keys[14]] + ': ' + resultCounts[keys[14]].total + '</a></td>');
      out.push('</tr>');
      out.push('</table></div>');

      if (content.length > 0) {
        out.push('<h2>Top Matches</h2>' + content.join(''));
      }

      if (this.viewer) {
        // if (foundContent){
        this.viewer.innerHTML = out.join('');
        // }else{
        //  this.viewer.set("content", "No Results Found.")
        // }
      }
    },

    search: function (query) {
      var q = {};
      var self = this;

      this.searchTypes.forEach(function (type) {
        var tq = query;
        switch (type) {
          case 'genome_feature':
            tq += '&ne(annotation,brc1)&ne(feature_type,source)';
            break;
          case 'taxonomy':
            tq += '&gt(genomes,1)';
            break;
        }

        if (type == 'genome_feature') {
          // for genome features, sort by annotation first then by scores so as to show PATRIC features first
          q[type] = { dataType: type, accept: 'application/solr+json', query: tq + '&limit(3)&sort(+annotation,-score)' };
        } else {
          q[type] = { dataType: type, accept: 'application/solr+json', query: tq + '&limit(3)&sort(-score)' };
        }
      });

      // console.log("SEARCH: " + q);
      this.viewer.innerHTML = 'Searching....';
      Request.post(window.App.dataAPI + 'query/', {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        data: JSON.stringify(q)
      }).then(function (searchResults) {
        self.set('searchResults', searchResults);
      });


    },
    postCreate: function () {
      this.inherited(arguments);
      // start watching for changes of state, and signal for the first time.
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    onKeyPress: function (evt) {
      if (evt.charOrCode == keys.ENTER) {
        var query = this.searchBox.get('value');
        query = query.replace(/'/g, '').replace(/:/g, ' ');
        if (!query) {
          this.viewer.set('content', '');
        }

        Topic.publish('/navigate', { href: '/search/?' + searchToQuery(query) });
      }
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.onSetState('state', '', this.state);
    }
  });
});

