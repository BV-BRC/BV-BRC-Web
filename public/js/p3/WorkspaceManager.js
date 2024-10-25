define([
  'dojo/request', 'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/topic', './jsonrpc', 'dojo/Stateful',
  'dojo/promise/all', 'dijit/Dialog', 'dijit/form/Button', 'dojo/dom-construct'
], function (
  xhr, declare, lang,
  Deferred, Topic, RPC, Stateful,
  All, Dialog, Button, domConstruct
) {

  var WorkspaceManager = (declare([Stateful], {
    userWorkspaces: null,
    currentWorkspace: null,
    currentPath: null,
    token: '',
    apiUrl: '',
    userId: '',
    forbiddenDownloadTypes: ['experiment_group', 'feature_group', 'genome_group', 'modelfolder'],
    // forbiddenDownloadTypes: ['experiment_group', 'feature_group', 'genome_group', 'folder', 'job_result'],
    viewableTypes: ['txt', 'html', 'json', 'csv', 'tsv', 'diffexp_experiment',
      'diffexp_expression', 'diffexp_mapping', 'diffexp_sample', 'pdf',
      'diffexp_input_data', 'diffexp_input_metadata', 'svg', 'gif', 'png', 'jpg',
      'aligned_dna_fasta', 'aligned_protein_fasta', 'feature_dna_fasta', 'feature_protein_fasta', 'pdb'],

    knownUploadTypes: {
      unspecified: {
        label: 'Unspecified',
        formats: ['*.*']
      },
      aligned_dna_fasta: {
        label: 'Aligned DNA FASTA',
        formats: ['.fa', '.fasta', '.faa', '.fna', '.afa', '.xmfa'],
        description: 'DNA sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted.'
      },
      aligned_protein_fasta: {
        label: 'Aligned Protein FASTA',
        formats: ['.fa', '.fasta', '.faa', '.fna', '.afa', '.xmfa'],
        description: 'Protein sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted.'
      },
      bai: {
        label: 'Indexed Sequence Alignment Data',
        formats: ['.bai']
      },
      bam: {
        label: 'Sequence Alignment Data',
        formats: ['.bam']
      },
      contigs: {
        label: 'Contigs',
        formats: ['.fa', '.fasta', '.faa', '.fna'],
        description: 'Contigs must be provided in fasta format (typically .fa, .fasta, .fna). Genbank formatted files are not currently accepted.'
      },
      csv: {
        label: 'CSV',
        formats: ['.csv'],
        description: 'A CSV (comma separated values) file.'
      },
      diffexp_input_data: {
        label: 'Diff. Expression Input Data',
        formats: ['.csv', '.txt', '.xls', '.xlsx']
      },
      diffexp_input_metadata: {
        label: 'Diff. Expression Input Metadata',
        formats: ['.csv', '.txt', '.xls', '.xlsx']
      },
      doc: {
        label: 'DOC',
        formats: ['.doc']
      },
      docx: {
        label: 'DOCX',
        formats: ['.docx']
      },
      embl: {
        label: 'EMBL',
        formats: ['.embl'],
        description: 'A DNA or protein sequence file.'
      },
      feature_dna_fasta: {
        label: 'Feature DNA FASTA',
        formats: ['.fa', '.faa', '.fasta', '.faa'],
        description: 'DNA sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted.'
      },
      feature_protein_fasta: {
        label: 'Feature Protein FASTA',
        formats: ['.fa', 'fna', '.fasta', '.faa'],
        description: 'Protein sequences must be provided in fasta format (typically .fa, .fasta, .faa). Genbank formatted files are not currently accepted.'
      },
      genbank_file: {
        label: 'GBK',
        formats: ['.gbk'],
        description: 'A GenBank formatted file.'
      },
      gff: {
        label: 'GFF',
        formats: ['.gff', 'gtf'],
        description: 'A General Feature Format file.'
      },
      gif: {
        label: 'GIF Image',
        formats: ['.gif'],
        description: 'A GIF image file.'
      },
      jpg: {
        label: 'JPEG Image',
        formats: ['.jpg', '.jpeg'],
        description: 'A JPEG image file.'
      },
      json: {
        label: 'JSON',
        formats: ['.json'],
        description: 'A json file.'
      },
      nwk: {
        label: 'Newick',
        formats: ['.nwk'],
        description: 'Phylogenetic tree file.'
      },
      pdb: {
        label: 'PDB',
        formats: ['.pdb'],
        description: 'A pdb file describing a molecular structure.'
      },
      pdf: {
        label: 'PDF',
        formats: ['.pdf'],
        description: 'A pdf file.'
      },
      phyloxml: {
        label: 'PHYLOXML',
        formats: ['.xml', '.phyloxml'],
        description: 'An phyloxml file.'
      },
      png: {
        label: 'PNG Image',
        formats: ['.png'],
        description: 'A PNG image file.'
      },
      ppt: {
        label: 'PPT',
        formats: ['.ppt']
      },
      pptx: {
        label: 'PPTX',
        formats: ['.pptx']
      },
      reads: {
        label: 'Reads',
        formats: ['.fq', '.fastq', '.fa', '.fasta', '.gz', '.bz2'],
        description: 'Reads must be in fasta or fastq format (typically .fa, .fasta, .fq, .fastq).  Genbank formatted files are not currently accepted.'
      },
      svg: {
        label: 'SVG Image',
        formats: ['.svg'],
        description: 'A SVG image file.'
      },
      tbi: {
        label: 'TBI',
        formats: ['.tbi']
      },
      tsv: {
        label: 'TSV',
        formats: ['.tsv'],
        description: 'A TSV (tab separated values) file.'
      },
      txt: {
        label: 'Plain Text',
        formats: ['.txt'],
        description: 'A plain text file.'
      },
      vcf: {
        label: 'VCF',
        formats: ['.vcf'],
        description: 'A Variant Call Format file.'
      },
      vcf_gz: {
        label: 'VCF_GZ',
        formats: ['.vcf.gz'],
        description: 'A compressed Variant Call Format file.'
      },
      xls: {
        label: 'XLS',
        formats: ['.xls'],
        description: 'An Excel file.'
      },
      xlsx: {
        label: 'XLSX',
        formats: ['.xlsx'],
        description: 'An Excel file.'
      },
      xml: {
        label: 'XML',
        formats: ['.xml'],
        description: 'An xml file.'
      }
    },

    changeableTypes: {
      aligned_dna_fasta: { label: 'aligned_dna_fasta', value: 'aligned_dna_fasta' },
      aligned_protein_fasta: { label: 'aligned_protein_fasta', value: 'aligned_protein_fasta' },
      bam: { label: 'bam', value: 'bam' },
      bai: { label: 'bai', value: 'bai' },
      contigs: { label: 'contigs', value: 'contigs' },
      csv: { label: 'csv', value: 'csv' },
      diffexp_input_data: { label: 'diffexp_input_data', value: 'diffexp_input_data' },
      diffexp_input_metadata: { label: 'diffexp_input_metadata', value: 'diffexp_input_metadata' },
      doc: { label: 'doc', value: 'doc' },
      docx: { label: 'docx', value: 'docx' },
      embl: { label: 'embl', value: 'embl' },
      feature_dna_fasta: { label: 'feature_dna_fasta', value: 'feature_dna_fasta' },
      feature_protein_fasta: { label: 'feature_protein_fasta', value: 'feature_protein_fasta' },
      genbank_file: { label: 'genbank_file', value: 'genbank_file' },
      gff: { label: 'gff', value: 'gff' },
      gif: { label: 'gif', value: 'gif' },
      jpg: { label: 'jpg', value: 'jpg' },
      json: { label: 'json', value: 'json' },
      nwk: { label: 'nwk', value: 'nwk' },
      pdf: { label: 'pdf', value: 'pdf' },
      phyloxml: { label: 'phyloxml', value: 'phyloxml' },
      png: { label: 'png', value: 'png' },
      pdb: { label: 'pdb', value: 'pdb' },
      ppt: { label: 'ppt', value: 'ppt' },
      pptx: { label: 'pptx', value: 'pptx' },
      reads: { label: 'reads', value: 'reads' },
      string: { label: 'string', value: 'string' },
      svg: { label: 'svg', value: 'svg' },
      tar_gz: { label: 'tar_gz', value: 'tar_gz' },
      tbi: { label: 'tbi', value: 'tbi' },
      tsv: { label: 'tsv', value: 'tsv' },
      txt: { label: 'txt', value: 'txt' },
      unspecified: { label: 'unspecified', value: 'unspecified' },
      vcf: { label: 'vcf', value: 'vcf' },
      vcf_gz: { label: 'vcf_gz', value: 'vcf_gz' },
      wig: { label: 'wig', value: 'wig' },
      xls: { label: 'xls', value: 'xls' },
      xlsx: { label: 'xlsx', value: 'xlsx' },
      xml: { label: 'xml', value: 'xml' }
    },

    getDefaultFolder: function (type) {
      switch (type) {
        case 'genome_group':
          return '/' + [this.userId, 'home', 'Genome Groups'].join('/');
        case 'feature_group':
          return '/' + [this.userId, 'home', 'Feature Groups'].join('/');
        case 'experiment_folder':
          return '/' + [this.userId, 'home', 'Experiments'].join('/');
        case 'experiment_group':
          return '/' + [this.userId, 'home', 'Experiment Groups'].join('/');

        default:
          return '/' + this.userId;
      }
    },
    _userWorkspacesGetter: function () {
      var _self = this;
      if (this.userWorkspaces && this.userWorkspaces.length > 0) {
        return this.userWorkspaces;
      }

      var p = '/' + this.userId + '/';
      this.userWorkspaces = Deferred.when(this.api('Workspace.ls', [{
        paths: [p],
        includeSubDirs: false,
        Recursive: false
      }]), function (results) {
        var res;
        if (!results[0] || !results[0][p]) {
          res = [];
        } else {
          res = results[0][p].map(function (r) {
            return _self.metaListToObj(r);
          });
        }

        if (res.length > 0) {
          _self.set('userWorkspaces', res);
          Topic.publish('/refreshWorkspace', {});
          return res;
        }
        return Deferred.when(_self.createWorkspace('home'), function (hws) {
          _self.set('userWorkspaces', [hws]);
          return [hws];
        }, function (err) {
          console.error("Error Creating User's home workspace: ", err);
          return [];
        });
      });

      return this.userWorkspaces;
    },

    create: function (obj, createUploadNode, overwrite) {
      var self = this;
      if (obj.path.charAt(obj.path.length - 1) != '/') {
        obj.path += '/';
      }

      return Deferred.when(this.api('Workspace.create', [{
        objects: [[(obj.path + obj.name), (obj.type || 'unspecified'), obj.userMeta || {}, (obj.content || '')]],
        createUploadNodes: createUploadNode,
        overwrite: overwrite
      }]), function (results) {
        if (!results[0][0] || !results[0][0]) {
          throw new Error('Error Creating Object');
        } else {
          if (obj.notification) {
            Topic.publish('/Notification', {
              message: 'Group created: ' + obj.name,
              type: 'message'
            });
          }
          var r = results[0][0];
          Topic.publish('/refreshWorkspace', {});
          return self.metaListToObj(r);
        }
      });
    },

    updateObject: function (meta, data) {
      return this.create({
        path: meta.path,
        type: meta.type,
        name: meta.name,
        meta: meta.userMeta || {},
        content: JSON.stringify(data)
      }, false, true);
    },

    addToGroup: function (groupPath, idType, ids) {
      Topic.publish('/Notification', {
        message: '<span class="default">Adding ' + ids.length +
          ' item' + (ids.length > 1 ? 's' : '') + '...</span>'
      });

      var _self = this;
      return Deferred.when(this.getObject(groupPath), function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          // add logic to remove duplicate from ids
          var idsFiltered = [];
          ids.forEach(function (id) {
            if (idsFiltered.indexOf(id) == -1) {
              idsFiltered.push(id);
            }
          });
          if (res.data.id_list[idType]) {
            var existing = {};
            res.data.id_list[idType].forEach(function (id) {
              existing[id] = true;
            });

            idsFiltered = idsFiltered.filter(function (id) {
              return !existing[id];
            });

            res.data.id_list[idType] = res.data.id_list[idType].concat(idsFiltered);
          } else {
            res.data.id_list[idType] = idsFiltered;
          }
          return Deferred.when(_self.updateObject(res.metadata, res.data), function (r) {
            Topic.publish('/Notification', {
              message: idsFiltered.length + ' unique item' +
                (!idsFiltered.length || idsFiltered.length > 1 ? 's' : '') + ' added to group ' + groupPath,
              type: 'message'
            });
            return r;
          });
        }
        Topic.publish('/Notification', {
          message: 'Unable to add Items to group.  Invalid group structure',
          type: 'error',
          duration: 0
        });
        return new Error('Unable to append to group.  Group structure incomplete');
      });
    },

    removeFromGroup: function (groupPath, idType, ids) {
      var _self = this;
      return Deferred.when(this.getObject(groupPath), function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }

        if (res && res.data && res.data.id_list && res.data.id_list[idType]) {
          res.data.id_list[idType] = res.data.id_list[idType].filter(function (id) {
            return (ids.indexOf(id) < 0);
          });

          return Deferred.when(_self.updateObject(res.metadata, res.data), function (r) {

            Topic.publish('/Notification', {
              message: ids.length + ' Item removed from group ' + groupPath,
              type: 'message',
              duration: 3000
            });
            return r;
          });
        }

        Topic.publish('/Notification', {
          message: 'Unable to remove items from group.  Invalid group structure',
          type: 'error',
          duration: 3000
        });
        return new Error('Unable to remove from group.  Group structure incomplete');
      });
    },

    createGroup: function (name, type, path, idType, ids) {
      var group = {
        name: name,
        id_list: {}
      };
      // add logic to remove duplicate from ids
      var idsFiltered = [];
      ids.forEach(function (id) {
        if (idsFiltered.indexOf(id) == -1) {
          idsFiltered.push(id);
        }
      });
      group.id_list[idType] = idsFiltered;

      return this.create({
        path: path,
        name: name,
        type: type,
        userMeta: {},
        content: group,
        notification: true
      });

    },

    createFolder: function (paths) {
      var _self = this;
      if (!paths) {
        throw new Error('Invalid Path(s) to create');
      }
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      var objs = paths.map(function (p) {
        return [p, 'Directory'];
      });

      return Deferred.when(this.api('Workspace.create', [{ objects: objs }]), function (results) {
        var createdPath = results[0][0];
        if (!createdPath) {
          throw new Error('Please try a new name.');
        } else {
          return _self.metaListToObj(createdPath);
        }
      });
    },

    /**
     * accepts object(s) with at least the following:
     * [{
     *    path: /path/to/object,          (required)
     *    userMeta: (userMeta_for_object> (required)
     *    type: <type_of_object>          (optional)
     * }]
     *
     * note: update_metadata will replace userMeta
     */
    updateMetadata: function (objs) {
      var objs = Array.isArray(objs) ? objs : [objs];

      var data = objs.map(function (obj) {
        return [obj.path, obj.userMeta, obj.type || undefined];
      });

      // note: update_metadata will replace userMeta
      return Deferred.when(this.api('Workspace.update_metadata', [{ objects: data }]), function (res) {
        Topic.publish('/refreshWorkspace', {});
        return res[0][0];
      });
    },

    updateAutoMetadata: function (paths) {
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      return Deferred.when(this.api('Workspace.update_auto_meta', [{ objects: paths }]), function () {
        Topic.publish('/refreshWorkspace', {});
      });
    },

    deleteObjects: function (paths, deleteFolders, force, types) {
      var self = this;
      if (!paths) throw new Error('Invalid Path(s) to delete');

      // ensure is array
      paths = Array.isArray(paths) ? paths : [paths];

      // throw error for any special folder
      self.omitSpecialFolders(paths, 'delete');


      Topic.publish('/Notification', {
        message: "<span class='default'>Deleting " + paths.length + ' items...</span>'
      });

      // delete objects
      var prom = self.api('Workspace.delete', [{
        objects: paths,
        force: force,
        deleteDirectories: deleteFolders
      }]);

      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          var jobProms = this.deleteJobData(hiddenFolders);

          Topic.publish('/Notification', {
            message: "<span class='default'>Deleting associated job result data...</span>"
          });
        }
      }

      return Deferred.when(All([prom, jobProms]), function () {
        Topic.publish('/Notification', {
          message: paths.length + (paths.length > 1 ? ' items' : ' item') + ' deleted',
          type: 'message'
        });
        Topic.publish('/refreshWorkspace', {});
      }, function (err) {
        var btn = self.errorDetailsBtn();

        var msg = domConstruct.toDom('<span>' + paths.length + ' items could not be deleted');
        domConstruct.place(btn.domNode, msg, 'last');

        Topic.publish('/Notification', {
          message: msg,
          type: 'error'
        });
      });
    },

    createWorkspace: function (name) {
      var path = '/' + this.userId + '/' + name + '/';

      return Deferred.when(this.createFolder(path), lang.hitch(this, function (workspace) {
        if (name == 'home') {
          return Deferred.when(this.createFolder([
            workspace.path + '/Genome Groups',
            workspace.path + '/Feature Groups',
            workspace.path + '/Experiments',
            workspace.path + '/Experiment Groups'
          ]), function () {
            Topic.publish('/Notification', {
              message: "New workspace '" + name + "' created",
              type: 'message'
            });

            return workspace;
          });
        }

        return workspace;
      }));
    },
    getObjectsAtPathByType: function (types, specialPath) {
      types = (types instanceof Array) ? types : [types];

      return Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function (current) {
        var _self = this;

        var path = specialPath || current.path;
        return Deferred.when(this.api('Workspace.ls', [{
          paths: [path],
          excludeDirectories: false,
          excludeObjects: false,
          query: { type: types },
          recursive: false
        }]), function (results) {
          if (!results[0] || !results[0][path]) {
            return [];
          }
          var res = results[0][path];

          res = res.map(function (r) {
            return _self.metaListToObj(r);
          }).filter(function (r) {
            if (r.type == 'folder') {
              if (r.path.split('/').some(function (p) {
                return p.charAt(0) == '.';
              })) {
                return false;
              }
            }
            return (types.indexOf(r.type) >= 0);
          });
          /* .filter(function(r){
            if (!showHidden && r.name.charAt(0)=="."){ return false };
            return true;
          }) */

          return res;
        });
      }));
    },
    getObjectsByType: function (types, specialPath) {
      types = (types instanceof Array) ? types : [types];

      return Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function (current) {
        var _self = this;

        var path = specialPath || current.path;
        return Deferred.when(this.api('Workspace.ls', [{
          paths: [path],
          excludeDirectories: false,
          excludeObjects: false,
          query: { type: types },
          recursive: true
        }]), function (results) {
          if (!results[0] || !results[0][path]) {
            return [];
          }
          var res = results[0][path];

          res = res.map(function (r) {
            return _self.metaListToObj(r);
          }).filter(function (r) {
            if (r.type == 'folder') {
              if (r.path.split('/').some(function (p) {
                return p.charAt(0) == '.';
              })) {
                return false;
              }
            }
            return (types.indexOf(r.type) >= 0);
          });
          /* .filter(function(r){
            if (!showHidden && r.name.charAt(0)=="."){ return false };
            return true;
          }) */

          return res;
        });
      }));
    },
    getDownloadUrls: function (paths) {
      paths = paths instanceof Array ? paths : [paths];
      return Deferred.when(this.api('Workspace.get_download_url', [{ objects: paths }]), function (urls) {
        return urls[0];
      });
    },

    downloadFile: function (path) {
      return Deferred.when(this.api('Workspace.get_download_url', [{ objects: [path] }]), function (urls) {
        // console.log("download Urls: ", urls);
        // window.open(urls[0]); // window.open can be blocked by pop-up blockers
        window.location.assign(urls[0]);
      });
    },

    downloadArchiveFile: function (path_list, archive_name, archive_type, recursive) {
      // var archive_params = [path_list, recursive, archive_name, archive_type];
      return Deferred.when(this.api('Workspace.get_archive_url', [{
        objects: path_list,
        recursive: recursive,
        archive_name: archive_name,
        archive_type: archive_type
      }]), function (url) {
        console.log(url[0]);
        window.location.assign(url[0]);
      });
    },

    getObject: function (path, metadataOnly) {
      if (!path) {
        throw new Error('Invalid Path(s) to retrieve');
      }
      path = decodeURIComponent(path);
      return Deferred.when(this.api('Workspace.get', [{
        objects: [path],
        metadata_only: metadataOnly
      }]), function (results) {
        if (!results || !results[0] || !results[0][0] || !results[0][0][0] || !results[0][0][0][4]) {
          throw new Error('Object not found: ');
        }

        var meta = {
          name: results[0][0][0][0],
          type: results[0][0][0][1],
          path: results[0][0][0][2],
          creation_time: results[0][0][0][3],
          id: results[0][0][0][4],
          owner_id: results[0][0][0][5],
          size: results[0][0][0][6],
          userMeta: results[0][0][0][7],
          autoMeta: results[0][0][0][8],
          user_permissions: results[0][0][0][9],
          global_permission: results[0][0][0][10],
          link_reference: results[0][0][0][11]
        };
        if (metadataOnly) {
          return meta;
        }

        var res = {
          metadata: meta,
          data: results[0][0][1]
        };

        if (meta.link_reference) {
          var headers = {
            'X-Requested-With': null
          };
          if (window.App.authorizationToken) {
            headers.Authorization = 'OAuth ' + window.App.authorizationToken;
          }

          var d = xhr.get(meta.link_reference + '?download', {
            headers: headers
          });

          return Deferred.when(d, function (data) {
            return {
              metadata: meta,
              data: data
            };
          }, function (err) {
            console.error('Error Retrieving data object from shock :', err, meta.link_reference);
          });
        }

        return res;
      });

    },

    copy: function (paths, dest, types /* optional */) {
      var self = this;

      // copy contents into folders of same name, but whatever parent path is choosen
      var srcDestPaths = paths.map(function (path) {
        return [path, dest + '/' + path.slice(path.lastIndexOf('/') + 1)];
      });

      // if copying to workspace level, need to create the folders first
      // see latter of: https://github.com/PATRIC3/Workspace/issues/53
      if (dest.split('/').length < 3) {
        var newWSPaths = paths.map(function (path) {
          return [dest + '/' + path.slice(path.lastIndexOf('/') + 1) + '/', 'Directory'];
        });

        var initProm = this.api('Workspace.create', [{ objects: newWSPaths }]);
      }

      Topic.publish('/Notification', {
        message: "<span class='default'>Copying " + paths.length + ' items...</span>'
      });


      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          var jobProms = this.moveJobData(hiddenFolders, dest, false /* just copy */);

          Topic.publish('/Notification', {
            message: "<span class='default'>Copying associated job result data...</span>"
          });
        }
      }

      return Deferred.when(initProm, function (res) {
        var copyProm = self.api('Workspace.copy', [{
          objects: srcDestPaths,
          recursive: true,
          move: false
        }]);

        return Deferred.when(All([copyProm, jobProms]), function (res) {
          Topic.publish('/refreshWorkspace', {});
          Topic.publish('/Notification', {
            message: 'Copied contents of ' + paths.length + (paths.length > 1 ? ' items' : 'item'),
            type: 'message'
          });
          return res;
        });
      });
    },

    move: function (paths, dest, types /* optional */) {
      var self = this;

      self.omitSpecialFolders(paths, 'move');

      var srcDestPaths = paths.map(function (path) {
        return [path, dest + '/' + path.slice(path.lastIndexOf('/') + 1)];
      });

      // if moving to workspace level, need to create the folders first
      // see latter of: https://github.com/PATRIC3/Workspace/issues/53
      if (dest.split('/').length < 3) {
        var newWSPaths = paths.map(function (path) {
          return [dest + '/' + path.slice(path.lastIndexOf('/') + 1) + '/', 'Directory'];
        });

        var initProm = this.api('Workspace.create', [{ objects: newWSPaths }]);
      }

      Topic.publish('/Notification', {
        message: "<span class='default'>Moving " + paths.length + ' items...</span>'
      });

      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          this.moveJobData(hiddenFolders, dest, true /* should move */);

          Topic.publish('/Notification', {
            message: "<span class='default'>Moving associated job result data...</span>"
          });
        }
      }

      return Deferred.when(initProm, function (res) {
        return Deferred.when(
          self.api('Workspace.copy', [{
            objects: srcDestPaths,
            recursive: true,
            move: true
          }]),
          function (res) {
            Topic.publish('/refreshWorkspace', {});
            Topic.publish('/Notification', {
              message: 'Moved contents of ' + paths.length + (paths.length > 1 ? ' items' : ' item'),
              type: 'message'
            });
            return res;
          }
        );
      });
    },

    rename: function (path, newName, isJob) {
      var self = this;

      self.omitSpecialFolders([path], 'rename');

      if (path.split('/').length <= 3) {
        return self.renameWorkspace(path, newName);
      }

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/' + newName;

      // ensure path doesn't already exist
      console.log('Checking for "', newPath, '" before rename...');
      return Deferred.when(
        this.getObjects(newPath, true),
        function (response) {
          throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
        }, function (err) {

          var prom = self.api('Workspace.copy', [{
            objects: [[path, newPath]],
            recursive: true,
            move: true
          }]);

          if (isJob) {
            // if job, also need to rename hiden folder
            var jobProm = self.renameJobData(path, newName);
            prom = All([prom, jobProm]);
          }

          return Deferred.when(prom);
        }
      );
    },

    renameWorkspace: function (path, newName) {
      var self = this;

      self.omitSpecialFolders([path], 'rename');

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/' + newName;

      if (path == newPath) {
        throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
      }

      return Deferred.when(this.api('Workspace.create', [{ objects: [[newPath, 'Directory']] }]), function (response) {
        return Deferred.when(self.api(
          'Workspace.copy', [{
            objects: [[path, newPath]],
            recursive: true,
            move: true
          }],
          function (res) {
            Topic.publish('/refreshWorkspace', {});
            Topic.publish('/Notification', { message: 'File renamed', type: 'message' });
            return res;
          }
        ));
      });
    },

    // hack to deal with job result data (dot folders)
    moveJobData: function (paths, dest, shouldMove) {
      var self = this;
      var paths = Array.isArray(paths) ? paths : [paths];

      // log what is happening so that console error is expected
      console.log('Attempting to copy job data with move=' + shouldMove + '...');
      var proms = paths.map(function (path) {
        var parts = path.split('/'),
          jobName = parts.pop(),
          dotPath = parts.join('/') + '/.' + jobName;

        return self.api('Workspace.copy', [{
          objects: [[dotPath, dest + '/.' + jobName]],
          recursive: true,
          move: shouldMove
        }]);
      });

      return proms;
    },

    renameJobData: function (path, newName) {
      var self = this;

      var parts = path.split('/'),
        jobName = parts.pop(),
        dotPath = parts.join('/') + '/.' + jobName;

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/.' + newName;

      // log what is happening so that console error is expected
      console.log('Checking for job data "', newPath, '" before rename...');
      return Deferred.when(
        this.getObjects(newPath, true),
        function (response) {
          throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
        }, function (err) {
          self.api('Workspace.copy', [{
            objects: [[dotPath, newPath]],
            recursive: true,
            move: true
          }]);
        }
      );
    },

    deleteJobData: function (paths) {
      var self = this;
      var paths = Array.isArray(paths) ? paths : [paths];

      // log what is happening so that console error is expected
      console.log('Attempting to delete job data: ', paths);
      var proms = paths.map(function (path) {
        var parts = path.split('/'),
          jobName = parts.pop(),
          dotPath = parts.join('/') + '/.' + jobName;

        return self.api('Workspace.delete', [{
          objects: [dotPath],
          force: true,
          deleteDirectories: true
        }]);
      });

      return proms;
    },

    getObjects: function (paths, metadataOnly) {
      if (!paths) {
        throw new Error('Invalid Path(s) to delete');
      }
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      paths = paths.map(function (p) {
        return decodeURIComponent(p);
      });
      return Deferred.when(this.api('Workspace.get', [{
        objects: paths,
        metadata_only: metadataOnly
      }]), function (results) {

        var objs = results[0];
        var fin = [];
        var defs = objs.map(function (obj) {
          var meta = {
            name: obj[0][0],
            type: obj[0][1],
            path: obj[0][2],
            creation_time: obj[0][3],
            id: obj[0][4],
            owner_id: obj[0][5],
            size: obj[0][6],
            userMeta: obj[0][7],
            autoMeta: obj[0][8],
            user_permissions: obj[0][9],
            global_permission: obj[0][10],
            link_reference: obj[0][11]
          };
          if (metadataOnly) {
            fin.push(meta);
            return true;
          }

          if (!meta.link_reference) {
            var res = {
              metadata: meta,
              data: obj[1]
            };
            fin.push(res);
            return true;
          }

          var headers = {
            'X-Requested-With': null
          };
          if (window.App.authorizationToken) {
            headers.Authorization = 'OAuth ' + window.App.authorizationToken;
          }

          var d = xhr.get(meta.link_reference + '?download', {
            headers: headers
          });

          return Deferred.when(d, function (data) {
            fin.push({
              metadata: meta,
              data: data
            });
            return true;
          }, function (err) {
            console.error('Error Retrieving data object from shock :', err, meta.link_reference);
          });

        });

        return Deferred.when(All(defs), function () {
          return fin;
        });
      });

    },

    getFolderContents: function (path, showHidden, recursive, filterPublic) {
      path = decodeURIComponent(path);

      var _self = this;
      return Deferred.when(
        this.api('Workspace.ls', [{
          paths: [path],
          includeSubDirs: false,
          recursive: !!recursive
        }]), function (results) {
          if (!results[0] || !results[0][path]) {
            return [];
          }
          var res = results[0][path];

          res = res.map(function (r) {
            return _self.metaListToObj(r);
          }).filter(function (r) {
            if (!showHidden && r.name.charAt(0) == '.') {
              return false;
            }

            return true;
          });

          // if getting "public" workspaces, filter out writeable and owner workspaces
          if (filterPublic) {
            res = res.filter(function (r) {
              if (r.global_permission == 'w') return false;
              else if (r.global_permission == 'n') return false;
              return true;
            });
          }

          return res;
        },

        function (err) {
          // console.log("Error Loading Workspace:", err);
          _self.showError(err);
        }
      );
    },

    listSharedWithUser: function (path) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.ls', [{
          paths: ['/']
        }]), function (results) {
          var allWS = results[0]['/'];

          // transform to human friendly
          allWS = allWS.map(function (r) { return _self.metaListToObj(r); });

          // filter out public and owner's folders (silly, I know)
          var sharedWithUser = allWS.filter(function (r) {
            if (r.global_permission !== 'n') return false;
            else if (r.user_permission == 'o' && r.global_permission == 'n') return false;
            return true;
          });


          return sharedWithUser;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    /**
     * takes path string and list of permission objects of form
     * [{user: 'user@patricbrc.org', permission: <'r'|'w'|'n'|'a'|>}, ... ]
     */
    setPermissions: function (path, permissions) {
      var _self = this;

      // map list of objs to list of lists
      var permissions = permissions.map(function (p) {
        return [p.user, p.permission];
      });

      return Deferred.when(
        this.api('Workspace.set_permissions', [{
          path: path,
          permissions: permissions
        }]), function (res) {
          return res;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    setPublicPermission: function (path, permission) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.set_permissions', [{
          path: path,
          new_global_permission: permission
        }]), function (res) {
          return res;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },


    /**
     * Lists permissions, given paths(s)
     *
     * returns lists of lists (if single path given)
     *  or
     * returns hash of paths with list of lists values (if multiple paths given)
     *
     * Todo: to be deprecated?
     */
    listPermissions: function (paths) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.list_permissions', [{
          objects: Array.isArray(paths) ? paths : [paths]
        }]), function (res) {
          return Array.isArray(paths) ? res[0] : res[0][paths];
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    /**
     * Lists permissions, given paths(s)
     *
     * returns lists of objects (if single path given)
     *  or
     * returns hash of paths with list of objects as values (if multiple paths given)
     *
     */
    listPerms: function (path, includeGlobal) {
      var self = this;
      var paths = Array.isArray(path) ? path : [path];

      return Deferred.when(
        this.api('Workspace.list_permissions', [{
          objects: paths
        }]), function (res) {
          var pathHash = res[0];
          Object.keys(pathHash).forEach(function (path) {
            // server sometimes returns 'none' permissions, ignore them.
            var permObjs = pathHash[path].filter(function (p) {
              return p[1] != 'n' || (includeGlobal && p[0] == 'global_permission');
            }).map(function (p) {
              return {
                'user': p[0],
                'perm': self.permissionMap(p[1])
              };
            });

            pathHash[path] = permObjs;
          });

          return Object.keys(pathHash).length > 1 ? pathHash : pathHash[path];
        },

        function (err) {
          self.showError(err);
        }
      );
    },

    permissionMap: function (perm) {
      var mapping = {
        'n': 'No access',
        'r': 'Can view',
        'w': 'Can edit',
        'a': 'Admin'
      };
      return mapping[perm];
    },

    metaListToObj: function (list) {
      return {
        id: list[4],
        path: list[2] + list[0],
        name: list[0],
        type: list[1],
        creation_time: list[3],
        link_reference: list[11],
        owner_id: list[5],
        size: list[6],
        userMeta: list[7],
        autoMeta: list[8],
        user_permission: list[9],
        global_permission: list[10],
        timestamp: Date.parse(list[3])
      };
    },

    errorDetailsBtn: function () {
      var btn = new Button({
        label: 'Details',
        // disabled: true,
        onClick: function () {
          var dlg = new Dialog({
            title: 'Group Comparison',
            style: 'width: 1250px !important; height: 750px !important;',
            onHide: function () {
              dlg.destroy();
            }
          }).startup();
          dlg.show();
        }
      });

      return btn;
    },

    omitSpecialFolders: function (paths, operation) {
      paths = Array.isArray(paths) ? paths : [paths];

      //  regect home workspaces (must check for anybody's home)
      var isHome = paths.filter(function (p) {
        var parts = p.split('/');
        return parts.length == 3 && parts[2] == 'home';
      }).length;

      if (isHome) {
        throw new Error('Your <i>home</i> workspace is a special workspace which cannot be ' + operation + 'd.');
      }

      // also reject these home folders
      var unacceptedFolders = [
        'Genome Groups',
        'Feature Groups',
        'Experiments',
        'Experiment Groups'
      ];

      var unacceptedPaths = paths.filter(function (p) {
        var parts = p.split('/');
        if (parts.length == 4 && parts[2] == 'home' && unacceptedFolders.indexOf(parts[3]) != -1) return true;
      });

      if (unacceptedPaths.length) {
        throw new Error('You cannot ' + operation + ' any of the following special folders:<br><br>' +
          '<i>' + unacceptedFolders.join('<br>') + '</i>');
      }
    },

    _userWorkspacesSetter: function (val) {
      Topic.publish('/userWorkspaces', val);
      this.userWorkspaces = val;
    },

    _currentWorkspaceGetter: function () {
      if (!this.currentWorkspace) {
        this.currentWorkspace = Deferred.when(this.get('userWorkspaces'), lang.hitch(this, function (cws) {
          if (!cws || cws.length < 1) {
            throw Error('No User Workspaces found when attempting to get the Current Workspace for user.');
          }
          this.currentWorkspace = cws[0];
          return cws[0];
        }));
      }
      // return this.currentWorkspace;

      // just return user's home
      return { path: '/' + this.userId + '/home/' };
    },
    _currentWorkspaceSetter: function (val) {
      this.currentWorkspace = val;
    },

    _currentPathGetter: function () {
      if (!this.currentPath) {
        this.currentPath = Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function (cws) {
          this.currentPath = cws.path;
          return cws.path;
        }));

      }

      return this.currentPath;
    },
    _currentPathSetter: function (val) {
      this.currentPath = val;
    },

    // Todo(nc): generic error
    showError: function (e) {

    },

    init: function (apiUrl, token, userId) {
      if (!apiUrl || !token || !userId) {
        console.log('Unable to initialize workspace manager. Args: ', arguments);
        return;
      }

      this.token = token;
      this.apiUrl = apiUrl;
      this.api = RPC(apiUrl, token);
      this.userId = userId;
      if (userId && token) {
        Deferred.when(this.get('currentPath'), function (cwsp) {
          // console.log("Current Workspace Path: ", cwsp)
        });
      } else {
        this.currentPath = '/';
        this.currentWorkspace = '/NOWORKSPACE';
      }

    }
  }))();

  return WorkspaceManager;
});
