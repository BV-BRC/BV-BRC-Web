define(
  ['dojo/date/locale', 'dojo/dom-construct', 'dojo/dom-class', 'dijit/Tooltip'],
  function (locale, domConstruct, domClass, Tooltip) {

    var dateFormatter = function (obj, format) {
      if (!obj || obj == '0001-01-01T00:00:00Z') {
        return '';
      }
      if (typeof obj == 'string') {
        var x = Date.parse(obj);
        if (!x) {
          return ' ';
        }
        obj = new Date(x);
      } else if (typeof obj == 'number') {
        obj = new Date(obj);
      }
      if (!obj || !obj.getMonth) {
        return ' ';
      }

      return locale.format(obj, format || { formatLength: 'short' });
    };

    var decimalFormatter = function (number, decimal) {
      return Math.round(number * Math.pow(10, decimal)) / Math.pow(10, decimal);
    };

    var findObjectByLabel = function (obj, label) {
      if (obj.label === label) {
        return obj;
      }
      for (var i in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, i)) {
          var foundLabel = findObjectByLabel(obj[i], label);
          if (foundLabel) {
            return foundLabel;
          }
        }
      }
      return null;
    };

    var dateFromEpoch = function (obj, format) {
      obj = new Date(new Date().setTime(obj * 1000));
      if (!obj || !obj.getMonth) {
        return ' ';
      }
      return locale.format(obj, format || { formatLength: 'short' });
    };

    var getExternalLinks = function (target) {
      var link;

      if (target.match(/ncbi_gene/i)) {
        link = '//www.ncbi.nlm.nih.gov/sites/entrez?db=gene&cmd=Retrieve&dopt=full_report&list_uids=';
      }
      else if (target.match(/ncbi_accession/i)) {
        link = '//www.ncbi.nlm.nih.gov/entrez/viewer.fcgi?db=nucleotide&val=';
      }
      else if (target.match(/ncbi_protein/i) || target.match(/RefSeq/i) || target.match(/GI/i)) {
        link = '//www.ncbi.nlm.nih.gov/protein/';
      }
      else if (target.match(/RefSeq_NT/i)) {
        link = '//www.ncbi.nlm.nih.gov/nuccore/'; // NC_010067.1 - // nucleotide db
      }
      else if (target.match(/go_term/i)) {
        link = 'http://amigo.geneontology.org/cgi-bin/amigo/term_details?term='; // GO:0004747
      }
      else if (target.match(/ec_number/i)) {
        link = 'http://enzyme.expasy.org/EC/'; // 2.7.1.15
      }
      else if (target.match(/kegg_pathwaymap/i) || target.match(/KEGG/i)) {
        link = 'http://www.genome.jp/dbget-bin/www_bget?'; // pathway+map00010
      }
      else if (target.match(/UniProtKB-Accession/i) || target.match(/UniProtKB-ID/i)) {
        link = 'http://www.uniprot.org/uniprot/'; // A9MFG0 or ASTD_SALAR
      }
      else if (target.match(/UniRef100/i) || target.match(/UniRef90/i) || target.match(/UniRef50/i)) {
        link = 'http://www.uniprot.org/uniref/'; // UniRef100_A9MFG0, UniRef90_B5F7J0, or // UniRef50_Q1C8A9
      }
      else if (target.match(/UniParc/i)) {
        link = 'http://www.uniprot.org/uniparc/'; // UPI0001603B3F
      }
      else if (target.match(/^EMBL$/i) || target.match(/^EMBL-CDS$/i)) {
        link = '//www.ebi.ac.uk/ena/data/view/'; // CP000880, ABX21565
      }
      else if (target.match(/GeneID/i)) {
        link = '//www.ncbi.nlm.nih.gov/sites/entrez?db=gene&term='; // 5763416;
      }
      else if (target.match(/GenomeReviews/i)) {
        link = 'http://www.genomereviews.ebi.ac.uk/GR/contigview?chr='; // CP000880_GR
      }
      else if (target.match(/eggNOG/i)) {
        link = 'http://eggnogdb.embl.de/#/app/results?seqid='; // Q2YII1 -- uniprot accession
      }
      else if (target.match(/HOGENOM/i)) {
        link = 'http://hogenom.univ-lyon1.fr/query_sequence?seq='; // A9MFG0 -- uniprot accession
      }
      else if (target.match(/OMA/i)) {
        link = 'https://omabrowser.org/oma/group/'; // A9MFG0 -- uniprot accession
      }
      else if (target.match(/ProtClustDB/i)) {
        link = 'https://www.ncbi.nlm.nih.gov/proteinclusters/?term='; // A9MFG0 -- uniprot accession
      }
      else if (target.match(/BioCyc/i)) {
        link = 'http://biocyc.org/getid?id='; // BMEL359391:BAB2_0179-MONOMER
      }
      else if (target.match(/NMPDR/i)) {
        link = '//www.nmpdr.org/linkin.cgi?id='; // fig|382638.8.peg.1669"
      }
      else if (target.match(/EnsemblGenome/i) || target.match(/EnsemblGenome_TRS/i)
        || target.match(/EnsemblGenome_PRO/i)) {
        link = 'http://www.ensemblgenomes.org/id/'; // EBMYCT00000005579
      }
      else if (target.match(/BEIR/i)) {
        link = 'http://www.beiresources.org/Catalog/ItemDetails/tabid/522/Default.aspx?Template=Clones&BEINum=';
      }
      else if (target.match(/PDB/i)) {
        link = 'http://www.rcsb.org/3d-view/';
      }
      else if (target.match(/STRING/i)) { // 204722.BR0001
        link = 'http://string.embl.de/newstring_cgi/show_network_section.pl?identifier=';
      }
      else if (target.match(/MEROPS/i)) { // M50.005
        link = 'http://merops.sanger.ac.uk/cgi-bin/pepsum?id=';
      }
      else if (target.match(/^PATRIC$/i)) { // 17788255
        link = '/view/Feature/';
      }
      else if (target.match(/OrthoDB/i)) { // EOG689HR1
        link = 'http://cegg.unige.ch/orthodb7/results?searchtext=';
      }
      else if (target.match(/NCBI_TaxID/i)) { // 29461
        link = '//www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?mode=Info&id=';
      }
      else if (target.match(/KO/i)) { // K04756
        link = 'http://www.genome.jp/dbget-bin/www_bget?ko:';
      }
      else if (target.match(/TubercuList/i)) { // Rv2429
        link = 'https://mycobrowser.epfl.ch/genes/';
      }
      else if (target.match(/PeroxiBase/i)) { // 4558
        link = 'http://peroxibase.toulouse.inra.fr/browse/process/view_perox.php?id=';
      }
      else if (target.match(/Reactome/i)) { // REACT_116125
        link = 'http://www.reactome.org/cgi-bin/eventbrowser_st_id?ST_ID=';
      }
      else if (target.match(/VFDB$/i)) {
        link = 'http://www.mgc.ac.cn/cgi-bin/VFs/gene.cgi?GeneID='; // VFG1817
      }
      else if (target.match(/VFDB_HOME/i)) {
        link = 'http://www.mgc.ac.cn/VFs/';
      }
      else if (target.match(/Victors$/i)) {
        link = 'http://www.phidias.us/victors/gene_detail.php?c_mc_victor_id='; // 220
      }
      else if (target.match(/Victors_HOME/i)) {
        link = 'http://www.phidias.us/victors/';
      }
      else if (target.match(/PATRIC_VF$/)) {
        link = '/view/SpecialtyGeneEvidence/'; // Rv3875
      }
      else if (target.match(/PATRIC_VF_HOME/)) {
        link = '/view/SpecialtyVFGeneList/?keyword(*)&eq(source,PATRIC_VF)';
      }
      else if (target.match(/ARDB$/i)) {
        link = '//ardb.cbcb.umd.edu/cgi/search.cgi?db=R&term='; // AAL09826
      }
      else if (target.match(/ARDB_HOME/i)) {
        link = '//ardb.cbcb.umd.edu/';
      }
      else if (target.match(/CARD$/i)) {
        link = ''; // TODO: need to add
      }
      else if (target.match(/CARD_HOME/i)) {
        link = 'http://arpcard.mcmaster.ca';
      }
      else if (target.match(/DrugBank$/i)) {
        link = 'http://www.drugbank.ca/molecules/'; // 1
      }
      else if (target.match(/DrugBank_HOME/i)) {
        link = 'http://www.drugbank.ca';
      }
      else if (target.match(/TTD$/i)) {
        link = 'http://bidd.nus.edu.sg/group/TTD/ZFTTDDetail.asp?ID='; // TTDS00427
      }
      else if (target.match(/TTD_HOME/i)) {
        link = 'http://bidd.nus.edu.sg/group/cjttd/';
      }
      else if (target.match(/Human$/i)) {
        link = '//www.ncbi.nlm.nih.gov/protein/'; // NP_001005484.1
      }
      else if (target.match(/Human_HOME/i)) {
        link = '//www.ncbi.nlm.nih.gov/assembly/GCF_000001405.26';
      }
      else if (target.match(/bioproject_accession/i)) {
        link = 'http://www.ncbi.nlm.nih.gov/bioproject/?term=';
      }
      else if (target.match(/biosample_accession/i)) {
        link = 'http://www.ncbi.nlm.nih.gov/biosample/';
      }
      else if (target.match(/assembly_accession/i)) {
        link = 'http://www.ncbi.nlm.nih.gov/assembly/';
      }
      else if (target.match(/DNASU/i)) {
        link = 'https://dnasu.org/DNASU/AdvancedSearchOptions.do?geneName=';
      }
      else if (target.match(/PseudoCAP/i)) {
        link = 'http://www.pseudomonas.com/feature/show?locus_tag=';
      }
      else if (target.match(/CDD/i)) {
        link = 'https://www.ncbi.nlm.nih.gov/Structure/cdd/cddsrv.cgi?uid=';
      }
      else if (target.match(/DisProt/i)) {
        link = 'https://disprot.org/';
      }
      else if (target.match(/Gene3D/i)) {
        link = 'http://www.cathdb.info/superfamily/';
      }
      else if (target.match(/InterPro/i)) {
        link = 'https://www.ebi.ac.uk/interpro/entry/InterPro/';
      }
      else if (target.match(/Pfam/i)) {
        link = 'https://pfam.xfam.org/family/';
      }
      else if (target.match(/SMART/i)) {
        link = 'http://smart.embl.de/smart/do_annotation.pl?DOMAIN=';
      }
      else if (target.match(/SUPERFAMILY/i)) {
        link = 'https://supfam.org/SUPERFAMILY/cgi-bin/scop.cgi?ipid=';
      }
      else if (target.match(/ProSiteProfile/i)) {
        link = 'https://prosite.expasy.org/doc/';
      }
      else if (target.match(/Hamap/i)) {
        link = 'https://hamap.expasy.org/rule/';
      }
      // else if (target.match(/MobiDBLite/i)) {
      //   link = '';
      // }
      // else if (target.match(/Coils/i)) {
      //   link = '';
      // }
      else if (target.match(/PANTHER/i)) {
        link = 'http://www.pantherdb.org/panther/family.do?clsAccession=';
      }
      else if (target.match(/PIRSF/i)) {
        link = 'https://proteininformationresource.org/cgi-bin/ipcSF?id=';
      }
      // edit patric-searches-and-tools/WebContent/js/specialty_gene_list_grids.js as well
      return link;
    };

    // source: http://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
    // var colorHash = function (str) {
    //   var hash = 0;
    //   for (var i = 0; i < str.length; i++) {
    //     hash = str.charCodeAt(i) + ((hash << 5) - hash);
    //   }
    //   var colour = '#';
    //   for (var i = 0; i < 3; i++) {
    //     var value = (hash >> (i * 8)) & 0xFF;
    //     colour += ('00' + value.toString(16)).substr(-2);
    //   }
    //   return colour;
    // };

    var formatters = {
      getExternalLinks: getExternalLinks,
      genomeName: function (obj) {
        if (obj.user_read || obj.user_write) {
          return '<i class="fa icon-users" title="shared"></i> ' + obj.genome_name;
        }

        return obj.genome_name;
      },
      genomeMembers: function (obj) {
        var members = (obj.user_read || []).concat(obj.user_write || []);
        if (members.length >= 1) {
          return (members.length + 1) + ' members';
        }

        return 'Only me';
      },

      dateOnly: function (obj) {
        return dateFormatter(obj, { selector: 'date', formatLength: 'short' });
      },
      toInteger: function (obj) {
        return decimalFormatter(obj, 0);
      },
      twoDecimalNumeric: function (obj) {
        return decimalFormatter(obj, 2);
      },
      date: dateFormatter,
      epochDate: dateFromEpoch,
      runTime: function (obj) {
        var hours = Math.floor(obj / 3600);
        var minutes = Math.floor((obj - hours * 3600) / 60);
        var seconds = obj - minutes * 60;
        var run_time = hours ? hours.toString() + 'h' : '';
        run_time += minutes ? minutes.toString() + 'm' : '';
        run_time += seconds ? seconds.toFixed(0).toString() + 's' : '';
        return run_time;
      },

      objectOrFileSize: function (obj) {
        if (obj.type == 'folder') {
          return '';
        }
        // console.log("Has UserMeta: ", obj.userMeta);

        if (obj.autoMeta && obj.autoMeta.item_count) {
          var out = obj.autoMeta.item_count;
          switch (obj.type) {
            case 'genome_group':
              out += ' genomes';
              break;
            case 'feature_group':
              out += ' features';
              break;
            case 'experiment_group':
              out += ' experiments';
              break;
          }
          return out;
        }
        return formatters.humanFileSize(obj.size, true);

      },

      humanFileSize: function (bytes, si) {
        if (!bytes && bytes !== 0) {
          return '';
        }
        var thresh = si ? 1000 : 1024;
        if (bytes < thresh) return bytes + ' B';
        var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        var u = -1;
        do {
          bytes /= thresh;
          ++u;
        } while (bytes >= thresh);
        return bytes.toFixed(1) + ' ' + units[u];
      },

      multiDate: function (fields) {
        return function (obj) {
          var out = [];
          fields.forEach(function (f) {
            out.push('<div>' + dateFormatter(obj[f]) + '</div>');
          });
          return out.join('');
        };
      },

      lineage: function (val) {
        var out = [];
        if (val && val instanceof Array) {
          out = val.reverse().map(function (t) {
            return '/ <a href="/taxonomy/' + t.NCBI_TAX_ID + '" rel="cid/widget/TaxonomyViewer">' + t.NAME + '</a>&nbsp;';
          });
          return out.join('');
        }
        return val;
      },
      baseUsername: function (val) {
        if (!val) {
          return '';
        }
        var parts = val.split('@');
        return val == window.App.user.id ? 'me' : parts[0];
      },
      status: function (val) {
        return val;
        // switch (val) {
        //   case 'completed':
        //     return '<i class="fa icon-check fa-1x" title="Folder" />';
        //   case 'queued':
        //     return '<i class="fa icon-contigs fa-1x" title="Contigs" />';
        // }
      },
      status_alias: function (val) {
        if (val == 'queued' || val == 'init' || val == 'pending')
        { return '<b class="Queued" title="Queued">queued</b>'; }
        else if (val == 'in-progress')
        { return '<b class="Running title="Running">running</b>'; }
        else if (val == 'deleted' || val == 'failed')
        { return '<b class="Failed" title="Failed">' + val + '</b>'; }
        else if (val == 'completed')
        { return '<b class="Completed" title="Completed">completed</b>'; }
        return val;

      },
      status_indicator: function (val) {
        switch (val) {
          case 'in-progress':
            return '<div><i class="fa icon-circle fa-1x" style="color:green" title="Running" /></div>';
          case 'deleted':
            return '<i class="fa icon-circle fa-1x" style="color:red" title="Failed" />';
          case 'completed':
            return '<i class="fa icon-circle fa-1x" style="color:blue" title="Completed" />';
          case 'failed':
            return '<i class="fa icon-circle fa-1x" style="color:red" title="Failed" />';
          case 'queued':
            return '<i class="fa icon-circle fa-1x" style="color:orange" title="Queued" />';
        }
      },
      wsItemType: function (val) {
        if (val.substring(0, 10) === 'job_result') {
          return '<i class="fa icon-flag-checkered fa-1x" title="' + val.substring(11) + '" />';
        }

        switch (val) {
          case 'parentfolder':
            return '<i class="fa icon-level-up fa-1x" title="Folder" />';
          case 'folder':
            return '<b class="fa icon-folder fa-1x" title="Folder" />';
          case 'workspace':
            return '<i class="fa icon-hdd-o fa-1x" title="Workspace" />';
          case 'sharedWorkspace':
            return '<i class="fa icon-shared-workspace fa-1x" title="Shared Workspace" />';
          case 'publicWorkspace':
            return '<i class="fa icon-globe fa-1x" title="Shared Workspace" />';
          case 'contigs':
            return '<i class="fa icon-contigs fa-1x" title="Contigs" />';
          case 'fasta':
            return '<i class="fa icon-fasta fa-1x" title="Contigs" />';
          case 'feature_group':
            return '<i class="icon-genome-features " title="Contigs" />';
          case 'genome_group':
            return '<img src="/public/js/p3/resources/images/genomegroup.svg" style="width:16px;height:16px;"  class="fa fa-2x" title="Genome Group" />';
          case 'job_result_DifferentialExpression':
            return '<i class="fa icon-lab fa-1x" title="DiffExp" />';
          default:
            return '<i class="fa icon-file-text-o fa-1x" title="' + (val || 'Unspecified Document Type') + '" />';
        }
      },
      appLabel: function (appName) {
        return appName;
      },
      serviceLabel: function (appName) {
        switch (appName) {
          case 'GenomeComparison':
            return 'Proteome Comparison';
          case 'GenomeAssembly':
            return 'Assembly';
          case 'GenomeAnnotation':
            return 'Annotation';
          case 'Variation':
            return 'Variation Analysis';
          case 'PhylogenicTree':
            return 'Phylogenic Tree';
          case 'DifferentialExpression':
            return 'Expression Import';
          case 'RNASeq':
            return 'RNA-Seq Analysis';
          case 'TnSeq':
            return 'Tn-Seq Analysis';
          case 'MetagenomicBinning':
            return 'Metagenomic Binning';
          case 'ModelReconstruction':
            return 'Model Reconstruction';
          default:
            return appName;
        }
      },
      autoLabel: function (ws_location, autoData) {
        var _autoLabels = {};
        if (ws_location == 'itemDetail') {
          var _app_label = null;
          if (Object.prototype.hasOwnProperty.call(autoData, 'app') && Object.prototype.hasOwnProperty.call(autoData.app, 'id')) {
            _app_label = autoData.app.id;
          }
          if (_app_label == 'GenomeAnnotation') {
            _autoLabels = {
              app_label: { label: 'Genome Annotation' },
              scientific_name: { label: 'Organism' },
              domain: { label: 'Domain' },
              num_features: { label: 'Feature count' },
              genome_id: { label: 'Annotation ID' }
            };
          }
          if (_app_label == 'GenomeAssembly') {
            _autoLabels = { app_label: { label: 'Genome Assembly' } };
          }
          Object.keys(_autoLabels).forEach(function (key) {
            var curValue = null;// findObjectByLabel(autoData,key);
            if (curValue) {
              _autoLabels[key].value = curValue;
            }
          }, this);
        }
        if (ws_location == 'fileView') {
          _autoLabels = {
            name: { label: 'Filename' },
            type: { label: 'Type' },
            creation_time: { label: 'Created', format: this.date },
            owner_id: { label: 'Owner' },
            path: { label: 'Path' },
            size: { label: 'File Size', format: this.humanFileSize }
          };
          Object.keys(autoData).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(_autoLabels, key)) {
              if (Object.prototype.hasOwnProperty.call(_autoLabels[key], 'format')) {
                _autoLabels[key].value = _autoLabels[key].format(autoData[key]);
              }
              else {
                _autoLabels[key].value = autoData[key];
              }
            }
          });
        }

        return _autoLabels;
      },


      usersFormatter: function (obj) {
        var userPerms = obj.permissions;
        if (!userPerms) return '-';

        if (obj.global_permission !== 'n') return 'Public';

        var users = [];
        // ignore global permisssion and workaround this https://github.com/PATRIC3/Workspace/issues/54
        userPerms.forEach(function (perm) {
          if (perm[0] == 'global_permission' || perm[1] == 'n') return;
          users.push(perm[0]);
        });

        var html =
          '<span id="' + obj.id + '">' +
            (users.length ? users.length + 1 + ' member' + (users.length + 1 > 1 ? 's' : '' ) : 'Only me') +
          '</span>';

        return html;
      },

      permissionMap: function (perm) {
        var mapping = {
          n: 'No access',
          r: 'Can view',
          w: 'Can edit',
          a: 'Admin'
        };
        return mapping[perm] || 'Invalid permission';
      },

      // takes an array of form [{label: "", value: ""} ... ]
      // or a autoLabel hash and producs a simple key/value table
      keyValueTable: function (spec) {

        var table = ['<table class="p3basic striped" id="data-table"><tbody>'];
        if (spec instanceof Array) {
          for (var i = 0; i < spec.length; i++) {
            var row = spec[i];
            table.push('<tr><td width="10%"><b>' + row.label + '</b></td><td>' + row.value + '</td></tr>');
          }
        } else {
          for (var item in spec) {
            // guard-for-in
            if (Object.prototype.hasOwnProperty.call(spec, item)) {
              table.push('<tr><td width="10%"><b>' +  spec[item].label + '</b></td><td>' + spec[item].value + '</td></tr>');
            }
          }
        }
        table.push('</tbody></table>');
        return table.join('');
      }

    };

    return formatters;
  }
);

