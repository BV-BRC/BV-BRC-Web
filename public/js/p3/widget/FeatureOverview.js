define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/request', 'dojo/topic',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/query', 'dojo/text!./templates/FeatureOverview.html',
  'dijit/_WidgetBase', 'dijit/_Templated', 'dijit/Dialog', 'dijit/form/Button',
  '../util/PathJoin', 'dgrid/Grid', 'dgrid/extensions/ColumnResizer',
  './DataItemFormatter', './ExternalItemFormatter', './formatter',
  './D3SingleGeneViewer', './SelectionToGroup'

], function (
  declare, lang, on, xhr, Topic,
  domClass, domConstruct, domQuery, Template,
  WidgetBase, Templated, Dialog, Button,
  PathJoin, Grid, ColumnResizer,
  DataItemFormatter, ExternalItemFormatter, formatter,
  D3SingleGeneViewer, SelectionToGroup
) {

  var xhrOption = {
    handleAs: 'json',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
      'X-Requested-With': null,
      Authorization: window.App.authorizationToken || ''
    }
  };

  return declare([WidgetBase, Templated], {
    baseClass: 'FeatureOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    feature: null,
    state: null,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'user_guides/organisms_gene/overview.html',

    _setStateAttr: function (state) {
      this._set('state', state);
      if (state.feature) {
        this.set('feature', state.feature);
      } else {
        //
      }
    },

    _setFeatureAttr: function (feature) {
      this.feature = feature;

      this.getSummaryData();
      this.set('featureSummary', feature);
      this.set('publications', feature);
      this.set('functionalProperties', feature);
      this.set('staticLinks', feature);

      if (!feature.patric_id) {
        domClass.remove(this.isRefSeqOnly, 'hidden');
      }
    },
    _setStaticLinksAttr: function (feature) {

      domConstruct.empty(this.externalLinkNode);

      if (Object.prototype.hasOwnProperty.call(feature, 'aa_sequence')) {
        var linkCDDSearch = 'http://www.ncbi.nlm.nih.gov/Structure/cdd/wrpsb.cgi?SEQUENCE=%3E';
        var dispSequenceID = [];
        if (feature.annotation === 'PATRIC') {
          if (feature.alt_locus_tag) {
            dispSequenceID.push(feature.alt_locus_tag);
          }
          if (feature.refseq_locus_tag) {
            dispSequenceID.push(' ');
            dispSequenceID.push(feature.refseq_locus_tag);
          }
          if (feature.product) {
            dispSequenceID.push(' ');
            dispSequenceID.push(feature.product);
          }
        } else if (feature.annotation === 'RefSeq') {
          dispSequenceID.push(feature.alt_locus_tag);
          dispSequenceID.push(' ');
          dispSequenceID.push(feature.product);
        }

        var cdd = domConstruct.create('a', {
          href: linkCDDSearch + dispSequenceID.join('').replace(' ', '%20') + '%0A' + feature.aa_sequence + '&amp;FULL',
          innerHTML: 'NCBI CDD Search',
          target: '_blank'
        }, this.externalLinkNode);
        domConstruct.place('<br>', cdd, 'after');
      }

      if (Object.prototype.hasOwnProperty.call(feature, 'refseq_locus_tag')) {
        var linkSTRING = 'http://string.embl.de/newstring_cgi/show_network_section.pl?identifier=' + feature.refseq_locus_tag;
        var string = domConstruct.create('a', {
          href: linkSTRING,
          innerHTML: 'STRING: Protein-Protein Interactions',
          target: '_blank'
        }, this.externalLinkNode);
        domConstruct.place('<br>', string, 'after');

        var linkSTITCH = 'http://stitch.embl.de/cgi/show_network_section.pl?identifier=' + feature.refseq_locus_tag;
        domConstruct.create('a', {
          href: linkSTITCH,
          innerHTML: 'STITCH: Chemical-Protein Interaction',
          target: '_blank'
        }, this.externalLinkNode);
      }
    },

    _setSpecialPropertiesAttr: function (data) {
      domClass.remove(this.specialPropertiesNode.parentNode, 'hidden');

      if (!this.specialPropertiesGrid) {
        var opts = {
          columns: [
            { label: 'Evidence', field: 'evidence' },
            { label: 'Property', field: 'property' },
            {
              label: 'Source',
              field: 'source',
              renderCell: function (obj, val, node) {
                if (val) {
                  var sourceLink;
                  switch (val) {
                    case 'PATRIC_VF':
                    case 'Victors':
                    case 'VFDB':
                    case 'Human':
                    case 'ARDB':
                    case 'CARD':
                    case 'DrugBank':
                    case 'TTD':
                      var url = formatter.getExternalLinks(val + '_HOME');
                      // console.log(val + "_HOME", url);
                      sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
                      break;
                    default:
                      sourceLink = val;
                      break;
                  }
                  node.innerHTML = sourceLink;
                }
              }
            },
            {
              label: 'Source ID',
              field: 'source_id',
              renderCell: function (obj, val, node) {
                if (val) {
                  var sourceLink;
                  switch (obj.source) {
                    case 'PATRIC_VF':
                    case 'Victors':
                    case 'VFDB':
                    case 'Human':
                    case 'ARDB':
                    case 'TTD':
                      var url = formatter.getExternalLinks(obj.source) + val;
                      sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
                      break;

                    case 'CARD':
                      sourceLink = val;
                      break;
                    case 'DrugBank':
                      var padding = 'BE0000000';
                      var paddedId = padding.substring(0, padding.length - val.length) + val;
                      var url = formatter.getExternalLinks(obj.source) + paddedId;
                      sourceLink = '<a href="' + url + '" target="_blank">' + val + '</a>';
                      break;
                    default:
                      sourceLink = val || '';
                      break;
                  }
                  node.innerHTML = sourceLink;
                }
              }
            },
            { label: 'Function', field: 'function' },
            {
              label: 'PubMed',
              field: 'pmid',
              renderCell: function (obj, val, node) {
                if (val) {
                  node.innerHTML = '<a href="https://www.ncbi.nlm.nih.gov/pubmed/' + val + '">' + val + '</a>';
                }
              }
            },
            { label: 'Subject coverage', field: 'subject_coverage' },
            { label: 'Query coverage', field: 'query_coverage' },
            { label: 'Identity', field: 'identity' },
            { label: 'E-value', field: 'e_value' }
          ]
        };

        this.specialPropertiesGrid = new (declare([Grid, ColumnResizer]))(opts, this.specialPropertiesNode);
        this.specialPropertiesGrid.startup();
      }

      this.specialPropertiesGrid.refresh();
      this.specialPropertiesGrid.renderArray(data);
    },
    _setRelatedFeatureListAttr: function (summary) {

      domConstruct.empty(this.relatedFeatureNode);
      var table = domConstruct.create('table', { 'class': 'p3basic' }, this.relatedFeatureNode);
      var thead = domConstruct.create('thead', {}, table);
      var tbody = domConstruct.create('tbody', {}, table);

      var htr = domConstruct.create('tr', {}, thead);
      domConstruct.create('th', { innerHTML: 'Annotation' }, htr);
      domConstruct.create('th', { innerHTML: 'Locus Tag' }, htr);
      domConstruct.create('th', { innerHTML: 'Start' }, htr);
      domConstruct.create('th', { innerHTML: 'End' }, htr);
      domConstruct.create('th', { innerHTML: 'NT Length' }, htr);
      domConstruct.create('th', { innerHTML: 'AA Length' }, htr);
      domConstruct.create('th', { innerHTML: 'Product' }, htr);

      summary.forEach(function (row) {
        var tr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('td', { innerHTML: row.annotation }, tr);
        domConstruct.create('td', { innerHTML: row.alt_locus_tag }, tr);
        domConstruct.create('td', { innerHTML: row.start }, tr);
        domConstruct.create('td', { innerHTML: row.end }, tr);
        domConstruct.create('td', { innerHTML: row.na_length }, tr);
        domConstruct.create('td', { innerHTML: row.aa_length || '-' }, tr);
        domConstruct.create('td', { innerHTML: row.product || '(feature type: ' + row.feature_type + ')' }, tr);
      });
    },
    _setMappedFeatureListAttr: function (summary) {
      domClass.remove(this.idMappingNode.parentNode, 'hidden');

      if (!this.idMappingGrid) {
        var opts = {
          columns: [
            { label: 'Database', field: 'id_type' },
            {
              label: 'Identifier',
              field: 'id_value',
              renderCell: function (obj, val, node) {
                var baseUrl = formatter.getExternalLinks(obj.id_type);
                if (obj.id_type.match(/"HOGENOM|OMA|ProtClustDB|eggNOG"/)) {
                  node.innerHTML = '<a href="' + baseUrl + obj.uniprotkb_accession + '" taget=_blank>' + val + '</a>';
                } else {
                  node.innerHTML = '<a href="' + baseUrl + val + '" target=_blank>' + val + '</a>';
                }
              }
            }
          ]
        };

        this.idMappingGrid = new Grid(opts, this.idMappingNode);
        this.idMappingGrid.startup();
      }
      this.idMappingGrid.refresh();
      this.idMappingGrid.renderArray(summary);
    },
    _setFunctionalPropertiesAttr: function (feature) {

      var goLink,
        plfamLink,
        pgfamLink,
        figfamLink,
        ipLink;

      if (Object.prototype.hasOwnProperty.call(feature, 'go')) {
        goLink = feature.go.map(function (goStr) {
          var go = goStr.split('|');
          return '<a href="http://amigo.geneontology.org/cgi-bin/amigo/term_details?term=' + go[0] + '" target=_blank>' + go[0] + '</a>&nbsp;' + go[1];
        }).join('<br>');
      }

      if (Object.prototype.hasOwnProperty.call(feature, 'plfam_id')) {
        plfamLink = '<a href="/view/FeatureList/?eq(plfam_id,' + feature.plfam_id + ')#view_tab=features" target="_blank">' + feature.plfam_id + '</a>';
      }

      if (Object.prototype.hasOwnProperty.call(feature, 'pgfam_id')) {
        pgfamLink = '<a href="/view/FeatureList/?eq(pgfam_id,' + feature.pgfam_id + ')#view_tab=features" target="_blank">' + feature.pgfam_id + '</a>';
      }

      if (Object.prototype.hasOwnProperty.call(feature, 'figfam_id')) {
        figfamLink = '<a href="/view/FeatureList/?eq(figfam_id,' + feature.figfam_id + ')#view_tab=features" target="_blank">' + feature.figfam_id + '</a>';
      }

      if (Object.prototype.hasOwnProperty.call(feature, 'aa_sequence_md5')) {
        ipLink = '<a href="/view/FeatureList/?eq(aa_sequence_md5,' + feature.aa_sequence_md5 + ')#view_tab=features" target="_blank">View in new Tab</a>';
      }

      domConstruct.empty(this.functionalPropertiesNode);

      var table = domConstruct.create('table', { 'class': 'p3basic striped' }, this.functionalPropertiesNode);
      var tbody = domConstruct.create('tbody', {}, table);

      var htr;

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'PATRIC Local Family', scope: 'row', style: 'width:25%' }, htr);
      domConstruct.create('td', { innerHTML: plfamLink || '-' }, htr);

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'PATRIC Global Family', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: pgfamLink || '-' }, htr);

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'FIGfam', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: figfamLink || '-' }, htr);

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'Identical Proteins', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: ipLink || '-' }, htr);

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'GO Terms', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: goLink || '-' }, htr);
    },
    _setFunctionalPropertiesPathwayAttr: function (data) {
      var tbodyQuery = domQuery('table.p3basic > tbody', this.functionalPropertiesNode);
      var tbody = tbodyQuery[0];

      var pwLink;
      var ecLink;
      if (data) {
        ecLink = data.map(function (row) {
          return '<a href="http://enzyme.expasy.org/EC/' + row.ec_number + '" target=_blank>' + row.ec_number + '</a>&nbsp;' + row.ec_description;
        }).join('<br>');

        pwLink = data.map(function (row) {
          return '<a href="/view/PathwayMap/?annotation=PATRIC&genome_id=' + row.genome_id + '&pathway_id=' + row.pathway_id + '&feature_id=' + row.feature_id + '" target="_blank">KEGG:' + row.pathway_id + '</a>&nbsp;' + row.pathway_name;
        }).join('<br>');
      }
      var htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'EC Numbers', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: ecLink || '-' }, htr);

      htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'Pathways', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: pwLink || '-' }, htr);
    },
    _setFunctionalPropertiesSubsystemAttr: function (data) {
      var tbodyQuery = domQuery('table.p3basic > tbody', this.functionalPropertiesNode);
      var tbody = tbodyQuery[0];

      var ssLink;
      if (data) {
        ssLink = data.map(function (row) {
          return row.subsystem_name + ' ' + row.role_name;
        }).join('<br>');
      }
      var htr = domConstruct.create('tr', {}, tbody);
      domConstruct.create('th', { innerHTML: 'Subsystems', scope: 'row' }, htr);
      domConstruct.create('td', { innerHTML: ssLink || '-' }, htr);
    },
    _setFeatureStructureAttr: function (structure) {

      domConstruct.empty(this.structureNode);
      var table = domConstruct.create('table', { 'class': 'p3basic striped far2x' }, this.structureNode);
      var thead = domConstruct.create('thead', {}, table);

      var headTr = domConstruct.create('tr', {}, thead);
      domConstruct.create('th', { innerHTML: 'Source', scope: 'col' }, headTr);
      domConstruct.create('th', { innerHTML: 'Target', scope: 'col' }, headTr);
      domConstruct.create('th', { innerHTML: 'Selection Criteria', scope: 'col' }, headTr);
      domConstruct.create('th', { innerHTML: 'Status', scope: 'col' }, headTr);
      domConstruct.create('th', { innerHTML: 'Clone Available', scope: 'col' }, headTr);
      domConstruct.create('th', { innerHTML: 'Protein Available', scope: 'col' }, headTr);

      var tbody = domConstruct.create('tbody', {}, table);

      for (var i = 0, l = structure.length; i < l; i++) {
        var htr = domConstruct.create('tr', {}, tbody);

        var cellTarget = lang.replace('<a href="https://apps.sbri.org/SSGCIDTargetStatus/Target/{0}" target="_blank">{0}</a>', [structure[i].target_id]);
        var cellSelection = structure[i].selection_criteria || '&nbsp;';
        // TODO: query for PDB IDs and link to viewer
        var cellStatus = structure[i].target_status || '&nbsp;';
        var cellClone = structure[i].has_clones === 'T' ? 'Yes' : 'No';
        var cellProtein = structure[i].has_proteins === 'T' ? 'Yes' : 'No';

        domConstruct.create('td', { innerHTML: '<a href="http://www.ssgcid.org" target="_blank">SSGCID</a>' }, htr);
        domConstruct.create('td', { innerHTML: cellTarget }, htr);
        domConstruct.create('td', { innerHTML: cellSelection }, htr);
        domConstruct.create('td', { innerHTML: cellStatus }, htr);
        domConstruct.create('td', { innerHTML: cellClone }, htr);
        domConstruct.create('td', { innerHTML: cellProtein }, htr);
      }
    },
    _setFeatureStructureSubmissionFormAttr: function () {

      domConstruct.empty(this.structureNode);

      var regexSsgcid = '/Mycobacterium|Bartonella|Brucella|Ehrlichia|Rickettsia|Burkholderia|Borrelia|Anaplasma/';
      var regexCsgid = '/Bacillus|Listeria|Staphylococcus|Streptococcus|Clostridium|Coxiella|Escherichia|Francisella|Salmonella|Shigella|Vibrio|Yersinia|Campylobacter|Helicobacter/';

      // look up genusName
      var url = PathJoin(this.apiServiceUrl, 'genome/?eq(genome_id,' + this.feature.genome_id + ')&select(genus)&limit(1)');
      xhr.get(url, xhrOption).then(lang.hitch(this, function (data) {
        if (data.length === 0) return;

        var genusName = data[0].genus;

        if (regexSsgcid.match(genusName)) {

          new Button({
            label: 'Submit a request for structure determination to SSGCID',
            onClick: lang.hitch(this, function () {
              this.onSubmitStructureRequest('ssgcid');
            })
          }, this.structureNode).startup();

        } else if (regexCsgid.match(genusName)) {

          new Button({
            label: 'Submit a request for structure determination to CSGID',
            onClick: lang.hitch(this, function () {
              this.onSubmitStructureRequest('csgid');
            })
          }, this.structureNode).startup();

        } else {
          // not supported
          domConstruct.create('div', { innerHTML: 'Not supported by SSGCID/CSGID' }, this.structureNode);
        }
      }));
    },
    onSubmitStructureRequest: function (center) {

      var actionUrl,
        method,
        featureNaSequence,
        featureAaSequence;
      if (center === 'ssgcid') {
        actionUrl = 'https://apps.sbri.org/SSGCIDCommTargReq/Default.aspx';
        method = 'POST';
        featureNaSequence = this.feature.na_sequence;
        featureAaSequence = this.feature.aa_sequence;

      } else {
        actionUrl = 'http://csgid-submissions.org/CSGIDSubmissionPortal/?gid=' + this.feature.protein_id;
        method = 'GET';
        featureNaSequence = '';
        featureAaSequence = '';
      }

      var form = domConstruct.create('form', { method: method, action: actionUrl }, this.structureRequestNode);

      // attrs
      var feature_id = this.feature.feature_id;
      var callbackUrl = '/view/Feature/' + feature_id;
      var genomeName = this.feature.genome_name;
      var featureProduct = this.feature.product;

      var refseqLocusTag = this.feature.refseq_locus_tag || '';
      var refseqProteinId = this.feature.protein_id || '';
      var refseqGiNumber = this.feature.gi || '';
      var uniprotKbAccession = this.uniprotkb_accessions || '';


      // hidden fields
      domConstruct.create('input', { type: 'hidden', name: 'patric_feature_id', value: feature_id }, form);
      domConstruct.create('input', { type: 'hidden', name: 'patric_callback_url', value: callbackUrl }, form);
      domConstruct.create('input', { type: 'hidden', name: 'genome_name', value: genomeName }, form);
      domConstruct.create('input', { type: 'hidden', name: 'product', value: featureProduct }, form);
      domConstruct.create('input', { type: 'hidden', name: 'dna_sequence', value: featureNaSequence }, form);
      domConstruct.create('input', { type: 'hidden', name: 'protein_sequence', value: featureAaSequence }, form);

      domConstruct.create('input', { type: 'hidden', name: 'refseq_locus_tag', value: refseqLocusTag }, form);
      domConstruct.create('input', { type: 'hidden', name: 'refseq_protein_id', value: refseqProteinId }, form);
      domConstruct.create('input', { type: 'hidden', name: 'refseq_gi_number', value: refseqGiNumber }, form);
      domConstruct.create('input', { type: 'hidden', name: 'uniprot_accession', value: uniprotKbAccession }, form);

      // console.log(form);
      form.submit();
    },
    _setFeatureSummaryAttr: function (feature) {
      domConstruct.empty(this.featureSummaryNode);

      // this feature contains taxonomy info
      domConstruct.place(DataItemFormatter(feature, 'feature_data', {}), this.featureSummaryNode, 'first');
    },
    _setPublicationsAttr: function (feature) {
      domConstruct.empty(this.pubmedSummaryNode);

      domConstruct.place(ExternalItemFormatter(feature, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
    },
    _setFeatureViewerAttr: function (data) {
      domConstruct.empty(this.sgViewerNode);
      var gene_viewer = new D3SingleGeneViewer();
      gene_viewer.init(this.sgViewerNode);
      gene_viewer.render(data);
    },

    _setFeatureCommentsAttr: function (data) {
      domClass.remove(this.featureCommentsNode.parentNode, 'hidden');

      if (!this.featureCommentsGrid) {
        var opts = {
          columns: [
            { label: 'Source', field: 'source' },
            { label: 'Property', field: 'property' },
            { label: 'Value', field: 'value' },
            { label: 'Evidence Code', field: 'evidence_code' },
            {
              label: 'PubMed',
              field: 'pmid',
              renderCell: function (obj, val, node) {
                if (val) {
                  node.innerHTML = "<a href='//view.ncbi.nlm.nih.gov/pubmed/" + val + "' target='_blank'>" + val + '</a>';
                }
              }
            },
            {
              label: 'Comment',
              field: 'comment',
              renderCell: function (obj, val, node) {
                if (val) {
                  node.innerHTML = val;
                }
              }
            }
          ]
        };

        this.featureCommentsGrid = new Grid(opts, this.featureCommentsNode);
        this.featureCommentsGrid.startup();
      }

      this.featureCommentsGrid.refresh();
      this.featureCommentsGrid.renderArray(data);
    },
    getSummaryData: function () {

      // uniprot mapping
      if (this.feature.gi) {
        var url = PathJoin(this.apiServiceUrl, 'id_ref/?and(eq(id_type,GI)&eq(id_value,' + this.feature.gi + '))&select(uniprotkb_accession)&limit(0)');
        xhr.get(url, xhrOption).then(lang.hitch(this, function (data) {

          if (data.length === 0) return;

          var uniprotKbAccessions = this.uniprotkb_accessions = data.map(function (d) {
            return d.uniprotkb_accession;
          });

          var url = PathJoin(this.apiServiceUrl, 'id_ref/?in(uniprotkb_accession,(' + uniprotKbAccessions + '))&select(uniprotkb_accession,id_type,id_value)&limit(25000)');
          xhr.get(url, xhrOption).then(lang.hitch(this, function (data) {
            if (data.length === 0) return;

            this.set('mappedFeatureList', data);
          }));
        }));
      }

      // specialty gene
      var spgUrl = PathJoin(this.apiServiceUrl, '/sp_gene/?eq(feature_id,' + this.feature.feature_id + ')&select(evidence,property,source,source_id,organism,function,pmid,subject_coverage,query_coverage,identity,e_value)');
      xhr.get(spgUrl, xhrOption).then(lang.hitch(this, function (data) {
        if (data.length === 0) return;

        this.set('specialProperties', data);
      }));

      // single gene viewer
      var centerPos = Math.ceil((this.feature.start + this.feature.end + 1) / 2);
      var rangeStart = (centerPos >= 5000) ? (centerPos - 5000) : 0;
      var rangeEnd = (centerPos + 5000);
      var query = '?and(eq(genome_id,' + this.feature.genome_id + '),eq(accession,' + this.feature.accession + '),eq(annotation,' + this.feature.annotation + '),gt(start,' + rangeStart + '),lt(end,' + rangeEnd + '),ne(feature_type,source))&select(feature_id,patric_id,refseq_locus_tag,strand,feature_type,start,end,na_length,gene,product)&sort(+start)';

      xhr.get(PathJoin(this.apiServiceUrl, '/genome_feature/' + query), xhrOption).then(lang.hitch(this, function (data) {
        if (data.length === 0) {
          // remove Loading message
          domClass.add(this.sgViewerNode.parentNode, 'hidden');
          return;
        }

        var firstStartPosition = Math.max(data[0].start, rangeStart);
        var largestEnd = data.reduce(function (max, row) {
          return (max > row.end) ? max : row.end;
        }, 0);
        var lastEndPosition = Math.min((largestEnd + 100), rangeEnd);
        this.set('featureViewer', {
          firstStartPosition: firstStartPosition,
          lastEndPosition: lastEndPosition,
          features: data,
          accession: this.feature.accession,
          pin: this.feature.feature_id
        });
      }));

      // feature comments
      if (this.feature.refseq_locus_tag) {
        var url = PathJoin(this.apiServiceUrl, '/structured_assertion/?eq(refseq_locus_tag,' + this.feature.refseq_locus_tag + ')');
        xhr.get(url, xhrOption).then(lang.hitch(this, function (data) {
          if (data.length === 0) return;

          this.set('featureComments', data);
        }));
      }

      // feature structure
      if (this.feature.patric_id) {
        var url = PathJoin(this.apiServiceUrl, '/misc_niaid_sgc/?eq(gene_symbol_collection,' + encodeURIComponent('"PATRIC_ID:' + this.feature.patric_id + '"') + ')');
        xhr.get(url, xhrOption).then(lang.hitch(this, function (data) {
          if (data.length === 0) {
            this.set('featureStructureSubmissionForm');
            return;
          }

          this.set('featureStructure', data);
        }));
      }

      // pathway
      var pwUrl = PathJoin(this.apiServiceUrl, '/pathway/?eq(feature_id,' + this.feature.feature_id + ')&select(pathway_name,pathway_id,ec_number,ec_description,genome_id,feature_id)');
      xhr.get(pwUrl, xhrOption).then(lang.hitch(this, function (data) {
        if (data.length === 0) return;

        this.set('FunctionalPropertiesPathway', data);
      }));

      // subsystem
      var ssUrl = PathJoin(this.apiServiceUrl, '/subsystem/?eq(feature_id,' + this.feature.feature_id + ')&select(subsystem_name,role_name)');
      xhr.get(ssUrl, xhrOption).then(lang.hitch(this, function (data) {
        if (data.length === 0) return;

        this.set('FunctionalPropertiesSubsystem', data);
      }));

      // protein-protein interaction
      /*
      if(this.feature.patric_id){
        query = "?or(eq(feature_id_a," + this.feature.feature_id + "),eq(feature_id_b," + this.feature.feature_id + "))";
        xhr.get(PathJoin(this.apiServiceUrl, "/ppi/" + query), xhrOption)
          .then(lang.hitch(this, function(data){
            if(data.length === 0) return;

            var second = data.map(function(d){
              return [d.feature_id_a, d.feature_id_b];
            }).reduce(function(a, b){
              return a.concat(b);
            });

            var q = "?and(in(feature_id_a,(" + second.join(",") + ")),in(feature_id_b,(" + second.join(",") + ")))";

            xhr.get(PathJoin(this.apiServiceUrl, "/ppi/" + q), xhrOption)
              .then(lang.hitch(this, function(data){

                this.set("featurePPI", data, this.feature.feature_id);
              }));
          }));
      } */
    },

    onAddFeature: function () {

      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      var dlg = new Dialog({ title: 'Add This Feature To Group' });
      var stg = new SelectionToGroup({
        selection: [this.feature],
        type: 'feature_group'
      });
      on(dlg.domNode, 'dialogAction', function (evt) {
        dlg.hide();
        setTimeout(function () {
          dlg.destroy();
        }, 2000);
      });
      domConstruct.place(stg.domNode, dlg.containerNode, 'first');
      stg.startup();
      dlg.startup();
      dlg.show();
    },

    onClickUserGuide: function () {
      window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    }
  });
});
