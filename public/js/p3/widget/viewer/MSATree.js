define([
  'dojo/_base/declare', './Base', 'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../formatter', '../TabContainer', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/_base/lang', 'dojo/when',
  '../ActionBar', '../FilterContainerActionBar', 'phyloview/PhyloTree', '../../WorkspaceManager',
  'd3/d3', 'phyloview/TreeNavSVG', '../../util/PathJoin', 'dijit/form/Button',
  'dijit/MenuItem', 'dijit/TooltipDialog', 'dijit/popup', '../SelectionToGroup', '../PerspectiveToolTip',
  'dijit/Dialog', '../ItemDetailPanel', 'dojo/query', 'FileSaver', 'dojo/dom-style'
], function (
  declare, Base, on, Topic,
  domClass, ContentPane, domConstruct,
  formatter, TabContainer, Deferred,
  xhr, lang, when,
  ActionBar, ContainerActionBar, PhyloTree, WorkspaceManager,
  d3, d3Tree, PathJoin, Button,
  MenuItem, TooltipDialog, popup,
  SelectionToGroup, PerspectiveToolTipDialog, Dialog, ItemDetailPanel, query, saveAs, domStyle
) {

  var schemes = [{
    name: 'Zappo',
    id: 'zappo'
  },
  {
    name: 'Taylor',
    id: 'taylor'
  },
  {
    name: 'Hydrophobicity',
    id: 'hydro'
  },
  {
    name: 'Lesk',
    id: 'lesk'
  },
  {
    name: 'Cinema',
    id: 'cinema'
  },
  {
    name: 'MAE',
    id: 'mae'
  },
  {
    name: 'Clustal',
    id: 'clustal'
  },
  {
    name: 'Clustal2',
    id: 'clustal2'
  },
  {
    name: 'Turn',
    id: 'turn'
  },
  {
    name: 'Strand',
    id: 'strand'
  },
  {
    name: 'Buried',
    id: 'buried'
  },
  {
    name: 'Helix',
    id: 'helix'
  },
  {
    name: 'Nucleotide',
    id: 'nucleotide'
  },
  {
    name: 'Purine',
    id: 'purine'
  },
  {
    name: 'PID',
    id: 'pid'
  },
  {
    name: 'No color',
    id: 'foo'
  }];


  var filters = [{
    name: 'Hide columns by % conservation (>=)',
    id: 'hide_col_threshold_greater'
  },
  {
    name: 'Hide columns by % conservation (<=)',
    id: 'hide_col_threshold_less'
  },
  {
    name: 'Hide columns by % conservation (between)',
    id: 'hide_col_threshold_between'
  },
  {
    name: 'Hide columns by % gaps (>=)',
    id: 'hide_col_gaps_greater'
  },
  {
    name: 'Hide columns by % gaps (<=)',
    id: 'hide_col_gaps_less'
  },
  {
    name: 'Hide columns by % gaps (between)',
    id: 'hide_col_gaps_between'
  },
  /* to be implemented in the future
  {
    name: "Hide seqs by identity (>=)",
    id: "hide_seq_identity_greater"
  },
  {
    name: "Hide seqs by identity (<=)",
    id: "hide_seq_identity_less"
  },
  {
    name: "Hide seqs by gaps (>=)",
    id: "hide_seq_gaps_greater"
  },
  {
    name: "Hide seqs by gaps (<=)",
    id: "hide_seq_gaps_less"
  },
  */
  {
    name: 'Reset',
    id: 'reset'
  }];

  /*
  var visualopts = [{
    name: 'Conserved weight',
    id: 'conserv'
  },
  {
    name: 'Sequence logo',
    id: 'seqlogo'
  },
  {
    name: 'Overview box',
    id: 'overviewbox'
  },
  {
    name: 'Markers',
    id: 'markers'
  }];
*/

  var visualopts = [
    {
      name: 'Overview box',
      id: 'overviewbox'
    }];

  var colorMenuDivs = [];

  schemes.forEach(lang.hitch(this, function (scheme) {
    colorMenuDivs.push('<div class="wsActionTooltip"  rel="' + scheme.id + '">' + scheme.name + '</div>');
  }));

  var filterMenuDivs = [];
  filters.forEach(lang.hitch(this, function (filters) {
    filterMenuDivs.push('<div class="wsActionTooltip"  rel="' + filters.id + '">' + filters.name + '</div>');
  }));

  var visualMenuDivs = [];
  visualopts.forEach(lang.hitch(this, function (vis) {
    visualMenuDivs.push('<div class="wsActionTooltip"  rel="' + vis.id + '">' + vis.name + '</div>');
  }));

  var colorMenu = new TooltipDialog({
    content: colorMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(colorMenu);
    }
  });

  var infoMenu = new TooltipDialog({
    content: '<div> Create groups and download sequences by making a selection in the tree on the left.</div>',
    onMouseLeave: function () {
      popup.close(infoMenu);
    }
  });

  var idMenu = new TooltipDialog({
    content: '',
    onMouseLeave: function () {
      popup.close(idMenu);
    }
  });

  var filterMenu = new TooltipDialog({
    content: filterMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(filterMenu);
    }
  });

  var visualMenu = new TooltipDialog({
    content: visualMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(visualMenu);
    }
  });

  var snapMenu = new TooltipDialog({
    content: '',
    onMouseLeave: function () {
      popup.close(snapMenu);
    }
  });

  const labelMappings = [
    {key: 'genome_name', label: 'Genome Name'},
    {key: 'gene_id', label: 'Gene ID'},
    {key: 'genbank_accessions', label: 'Accession'},
    {key: 'species', label: 'Species'},
    {key: 'strain', label: 'Strain'},
    {key: 'geographic_group', label: 'Geographic Group'},
    {key: 'isolation_country', label: 'Isolation Country'},
    {key: 'host_group', label: 'Host Group'},
    {key: 'host_common_name', label: 'Host Common Name'},
    {key: 'collection_year', label: 'Collection Year'},
    {key: 'subtype', label: 'Subtype'},
    {key: 'lineage', label: 'Lineage'},
    {key: 'clade', label: 'Clade'},
    {key: 'h1_clade_global', label: 'H1 Clade Global'},
    {key: 'h1_clade_us', label: 'H1 Clade US'},
    {key: 'h3_clade', label: 'H3 Clade'},
    {key: 'h5_clade', label: 'H5 Clade'}
  ];

  return declare([Base], {
    baseClass: 'Phylogeny',
    disabled: false,
    query: null,
    loading: false,
    data: null,
    dataMap: {},
    idMap: {},
    dataStats: { _formatterType: 'msa_details' },
    tree: null,
    treeData: null,
    phylogram: false,
    alignType: 'protein',
    maxSequences: 500,
    numSequences: 0,
    selection: null,
    featureData: null,
    genomeData: null,
    nodeType: 'feature',
    alt_labels: {},
    containerType: 'feature_data',
    seqlogoHeight: 100,
    conserveHeight: 20,
    markerHeight: 10,
    scrollbarHeight: 11.5,
    seqLength: 0,
    msaFontWidth: 15,
    treeFontSize: 12,

    onSetLoading: function (attr, oldVal, loading) {
      if (loading) {
        this.contentPane.set('content', '<div>Getting Multiple Sequence Alignment. Please Wait...</div>');
      }
    },

    onSetState: function (attr, oldVal, state) {
      this.loading = true;
      var fileCheck = this.state.pathname.match(/path=..+?(?=&|$)/);
      var objPath = fileCheck[0].split('=')[1];
      var objPathNwk = objPath.replace('.afa', '_fasttree.nwk');

      this.path = objPath;
      console.log('WorkspaceManager objPathNwk', objPathNwk);
      console.log('state.path', state.path);

      var typeCheck = this.state.pathname.match(/alignType=..+?(?=&|$)/);
      if (typeCheck && typeCheck[0].split('=')[1].includes('dna')) {
        this.alignType = 'dna';
      }
      WorkspaceManager.getObjects([objPath]).then(lang.hitch(this, function (objs) {
        console.log('WorkspaceManager alignment', objs);
        this.data = objs[0].data;
        console.log('WorkspaceManager  this.data', this.data);
        var self = this;
        WorkspaceManager.getObjects([objPathNwk]).then(lang.hitch(self, function (objs) {
          console.log('WorkspaceManager tree', objs);
          self.treeData = objs[0].data;
          console.log('WorkspaceManager  this.data', self.data);
          console.log('WorkspaceManager  this.treeData', self.treeData);
          self.createDataMap();
          console.log('onSetState tree labels: this.alt_labels', self.alt_labels);
          console.log('onSetState this.dataMap', self.dataMap);
        }));
      }));

      console.log('onSetState this.dataStats ', this.dataStats);
    },

    showError: function (msg) {
      this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + '</div>');
    },

    onSetData: function (attr, oldVal, data) {
      console.log('data', data);
    },

    onSelection: function () {
      console.log('onSelection this.selection', this.selection);
      console.log('onSelection this.idMap', this.idMap);
      var cur = this.selection.map(lang.hitch(this, function (selected) {
        return this.dataMap[selected.id];
      }));

      console.log('onSelection cur', cur);
      console.log('onSelection currentContainerType', this.containerType);

      this.selection = cur;
      this.selectionActionBar.set('currentContainerType', this.containerType);
      this.selectionActionBar.set('selection', this.selection);

      console.log('onSelection before query this.nodeType', this.nodeType);
      console.log('onSelection this.selectionActionBar', this.selectionActionBar);
      console.log('onSelection this.itemDetailPanel', this.itemDetailPanel);

      if (cur && cur.length == 1) {
        if (this.nodeType == 'feature') {
          xhr.get(PathJoin(window.App.dataAPI, 'genome_feature', cur[0].feature_id), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(lang.hitch(this, function (record) {
            this.itemDetailPanel.set('selection', [record]);
          }));
        }
        else {
          xhr.get(PathJoin(window.App.dataAPI, 'genome', cur[0].genome_id), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(lang.hitch(this, function (record) {
            this.itemDetailPanel.set('selection', [record]);
          }));
        }
      }
      else if (cur && cur.length > 1) {
        this.itemDetailPanel.set('selection', cur);
      }
    },

    setAltLabel: function (dataMap) {
      var default_value = 'N/A';
      this.alt_labels = {
        gene_id: {},
        genome_id: {},
        genome_name: {},
        genbank_accessions: {},
        species: {},
        strain: {},
        geographic_group: {},
        isolation_country: {},
        host_group: {},
        host_common_name: {},
        collection_year: {},
        subtype: {},
        lineage: {},
        clade: {},
        h1_clade_global: {},
        h1_clade_us: {},
        h3_clade: {},
        h5_clade: {}
      };

      var self = this;
      Object.keys(dataMap).forEach(lang.hitch(this, function (geneID) {
        self.alt_labels.gene_id[geneID] = geneID;
        self.alt_labels.genome_id[geneID] = default_value;
        self.alt_labels.genome_name[geneID] = default_value;
        self.alt_labels.genbank_accessions[geneID] = default_value;
        self.alt_labels.species[geneID] = default_value;
        self.alt_labels.strain[geneID] = default_value;
        self.alt_labels.geographic_group[geneID] = default_value;
        self.alt_labels.isolation_country[geneID] = default_value;
        self.alt_labels.host_group[geneID] = default_value;
        self.alt_labels.host_common_name[geneID] = default_value;
        self.alt_labels.collection_year[geneID] = default_value;
        self.alt_labels.subtype[geneID] = default_value;
        self.alt_labels.lineage[geneID] = default_value;
        self.alt_labels.clade[geneID] = default_value;
        self.alt_labels.h1_clade_global[geneID] = default_value;
        self.alt_labels.h1_clade_us[geneID] = default_value;
        self.alt_labels.h3_clade[geneID] = default_value;
        self.alt_labels.h5_clade[geneID] = default_value;

        this.genomeData.forEach(function (genome) {
          // console.log('in setAltLabel genomeData genome', genome);
          // console.log('in setAltLabel self.dataMap', self.dataMap);
          // console.log('in setAltLabel dataMap', dataMap);
          // console.log('in setAltLabel genomeData geneID', geneID);
          // console.log('in setAltLabel self.alt_labels', self.alt_labels);

          if (dataMap[geneID].genome_id == genome.genome_id) {
            if (genome.genome_id) {
              self.alt_labels.genome_id[geneID] = genome.genome_id;
            }
            if (genome.genome_name) {
              self.alt_labels.genome_name[geneID] = genome.genome_name;
            }
            if (genome.genbank_accessions) {
              self.alt_labels.genbank_accessions[geneID] = genome.genbank_accessions;
            }
            if (genome.species) {
              self.alt_labels.species[geneID] = genome.species;
            }
            if (genome.strain) {
              self.alt_labels.strain[geneID] = genome.strain;
            }
            if (genome.geographic_group) {
              self.alt_labels.geographic_group[geneID] = genome.geographic_group;
            }
            if (genome.isolation_country) {
              self.alt_labels.isolation_country[geneID] = genome.isolation_country;
            }
            if (genome.host_group) {
              self.alt_labels.host_group[geneID] = genome.host_group;
            }
            if (genome.host_group) {
              self.alt_labels.host_common_name[geneID] = genome.host_common_name;
            }
            if (genome.collection_year) {
              self.alt_labels.collection_year[geneID] = genome.collection_year.toString();
            }
            if (genome.subtype) {
              self.alt_labels.subtype[geneID] = genome.subtype;
            }
            if (genome.lineage) {
              self.alt_labels.lineage[geneID] = genome.lineage;
            }
            if (genome.clade) {
              self.alt_labels.clade[geneID] = genome.clade;
            }
            if (genome.h1_clade_global) {
              self.alt_labels.h1_clade_global[geneID] = genome.h1_clade_global;
            }
            if (genome.h1_clade_us) {
              self.alt_labels.h1_clade_us[geneID] = genome.h1_clade_us;
            }
            if (genome.h3_clade) {
              self.alt_labels.h3_clade[geneID] = genome.h3_clade;
            }
            if (genome.h5_clade) {
              self.alt_labels.h5_clade[geneID] = genome.h5_clade;
            }
          }
        });
      }));
      console.log('in setAltLabel this.alt_labels', this.alt_labels);
    },

    createDataMap: function () {
      var myFasta = this.data;
      var geneID = null;
      var clustal = ['CLUSTAL'];
      var fasta = [];
      var seq = '';
      var count = 0;
      var seqIds = [];
      var tree_newick = this.treeData;

      myFasta.split('\n').forEach(function (line) {
        if (line.slice(0, 1) == '>') {
          count += 1;
          geneID = line.slice(1, line.length);
          geneID = geneID.split(' ')[0];
          geneID = geneID.replaceAll('|', ':');
          if (seq.length > 0) {
            clustal[clustal.length - 1] = clustal[clustal.length - 1] + seq;
            fasta.push(seq);
            seq = '';
          }
          clustal.push(geneID + '\t');
          fasta.push('>' + geneID);
        } else {
          seq += line.trim();
        }
      });
      if (seq.length > 0) {
        clustal[clustal.length - 1] = clustal[clustal.length - 1] + seq;
        fasta.push(seq);
        this.seqLength = seq.length;
      }

      // tree_newick = tree_newick.replace(new RegExp(geneID, 'g'), this.data.map[geneID].patric_id);

      this.dataStats.clustal = clustal.join('\n');
      this.numSequences = count;
      this.dataStats.fasta = fasta.join('\n');
      this.dataStats.tree_newick = tree_newick;

      // this.dataStats.clustal_txt = clustal_txt.join('\n');
      // this.dataStats.fasta = fasta;
      console.log('createDataMap() this.dataStats.tree_newick= ', this.dataStats.tree_newick);
      console.log('createDataMap() this.dataStats= ', this.dataStats);

      var msa_models = {
        seqs: msa.io.clustal.parse(this.dataStats.clustal)
      };

      var rearrangeSeqs = {};
      var id_count = 0;
      msa_models.seqs.forEach(lang.hitch(this, function (s) {
        rearrangeSeqs[s.name] = s;
        s.id = id_count;
        id_count += 1;
        seqIds[s.name.replaceAll(':', '|')] = id_count;
      }));
      console.log('msa_models= ', msa_models);
      console.log('seqIds= ', seqIds);

      this.dataStats.seqs = msa_models.seqs;
      console.log('createDataMap() this.dataStats ', this.dataStats);

      var ids = this.dataStats.seqs.map(function (node) { return node.name.replaceAll(':', '|'); });

      var pIDs = [];
      var nodeIDType = '';

      ids.forEach((id) => {
        // id = id.replace(/\|$/, '');
        pIDs.push(encodeURIComponent(id))
        if (id.match(/^fig\|\d+\.(.+)\d+$/)) {
          if (nodeIDType !== 'unknown' && nodeIDType !== 'genome_id') {
            nodeIDType = 'feature_id';
          }
        } else if (id.match(/^\d+.\d+$/)) {
          if (nodeIDType !== 'unknown' && nodeIDType !== 'feature_id') {
            nodeIDType = 'genome_id';
          }
        } else {
          nodeIDType = 'unknown';
        }
      });

      console.log('createDataMap() nodeIDType ', nodeIDType);
      console.log('createDataMap() processTree ids ', ids);
      console.log('createDataMap() processTree pIDs ', pIDs);
      var genomeList = [];

      var self = this;
      if (nodeIDType == 'feature_id') {
        this.nodeType = 'feature';
        this.containerType = 'feature_data';
        var fetchedIds = when(xhr.post(PathJoin(window.App.dataAPI, 'genome_feature'), {
          headers: {
            accept: 'application/json',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json',
          // headers: this.headers,
          data: 'or(in(patric_id,(' +  pIDs.join(',') + ')),in(feature_id,(' + pIDs.join(',') + ')))&select(feature_id,patric_id,genome_id,genome_name,product)&limit(1000)'
        }), function (response) {
          console.log('createDataMap() in when response response', response);
          self.featureData = response.map(function (feature) {
            if (genomeList.indexOf(feature.genome_id) === -1) {
              genomeList.push(feature.genome_id);
            }
            var seqIdIndex = 0;
            if (seqIds[feature.patric_id] > 0 ) {
              seqIdIndex = seqIds[feature.patric_id] - 1;
            } else {
              seqIdIndex = seqIds[feature.feature_id] - 1;
            }
            self.idMap[seqIdIndex] = {
              seq_id: seqIdIndex, patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id, genome_name: feature.genome_name, product: feature.product
            };
            if (ids[0].match(/^fig/)) {
              self.dataMap[feature.patric_id] = {
                seq_id: seqIdIndex, patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id, genome_name: feature.genome_name, product: feature.product
              };
              return {
                seq_id: seqIdIndex, patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id, genome_name: feature.genome_name, product: feature.product
              };
            }
            else {
              self.dataMap[feature.feature_id] = {
                seq_id: seqIdIndex, patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id, genome_name: feature.genome_name, product: feature.product
              };
              return {
                seq_id: seqIdIndex, patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id, genome_name: feature.genome_name, product: feature.product
              };
            }
          });
          console.log('createDataMap() self.featureData', self.featureData);
          console.log('createDataMap() self.featureData genomeList ', genomeList);
          var q = 'in(genome_id,(' + genomeList.join(',') + '))&select(genome_id,genome_name,genbank_accessions,species,strain,geographic_group,isolation_country,host_group,host_common_name,collection_year,subtype,lineage,clade,h1_clade_global,h1_clade_us,h3_clade,h5_clade)&limit(25000)';
          console.log('createDataMap() before getGenomeData, q =', q );

          when(xhr.post(PathJoin(window.App.dataAPI, 'genome'), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json',
            // headers: this.headers,
            data: q
          }), function (res) {
            console.log('in when response response', res);
            self.genomeData = res.map(function (genome) {
              var seqIdIndex = 0;
              if (seqIds[genome.genome_id] > 0 ) {
                seqIdIndex = seqIds[genome.genome_id] - 1;
              }
              return {
                seq_id: seqIdIndex,
                genome_id: genome.genome_id,
                genome_name: genome.genome_name,
                genbank_accessions: genome.genbank_accessions,
                species: genome.species,
                strain: genome.strain,
                geographic_group: genome.geographic_group,
                isolation_country: genome.isolation_country,
                host_group: genome.host_group,
                host_common_name: genome.host_common_name,
                collection_year: genome.collection_year,
                subtype: genome.subtype,
                lineage: genome.lineage,
                clade: genome.clade,
                h1_clade_global: genome.h1_clade_global,
                h1_clade_us: genome.h1_clade_us,
                h3_clade: genome.h3_clade,
                h5_clade: genome.h5_clade
              };
            });
            console.log('createDataMap() feature self.genomeData', self.genomeData);
            console.log('createDataMap() feature self.dataMap', self.dataMap);
            self.setAltLabel(self.dataMap);
            self.render();
            console.log('createDataMap() feature when alt_labels ', self.alt_labels);
            return res;
          });
          return response;
        });
        console.log('createDataMap() feature this.featureData ', this.featureData);
        console.log('createDataMap() feature fetchedIds ', fetchedIds);
        if (this.featureData == null) {
          this.render();
          console.log('node names are not found in database');
        }
        // console.log('feature genomes ', genomes);
      }
      else if (nodeIDType == 'genome_id') {
        this.nodeType = 'genome';
        this.containerType = 'genome_data';
        var genome_ids = [];
        console.log('createDataMap() genome ids=', ids);

        if (ids[0].match(/^\d+\.\d+$/)) {
          genome_ids = ids;
        } else {
          ids.forEach((id) => {
            var myid = id.match(/.*\|(\d+\.\d+).*/);
            console.log('ids=', ids);
            // console.log('myid=', myid);
            genome_ids.push(myid[1]) });
        }
        console.log('createDataMap() genome_ids=', genome_ids);
        var q = 'in(genome_id,(' + genome_ids.join(',') + '))&select(genome_id,genome_name,genbank_accessions,species,strain,geographic_group,isolation_country,host_group,host_common_name,collection_year,subtype,lineage,clade,h1_clade_global,h1_clade_us,h3_clade,h5_clade)&limit(25000)';
        console.log('createDataMap() q =', q);

        var genomes = when(xhr.post(PathJoin(window.App.dataAPI, 'genome'), {
          headers: {
            accept: 'application/json',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json',
          data: q
        }), function (res) {
          console.log('in when response response', res);
          console.log('in when response seqIds', seqIds);
          var seqIdIndex = 0;
          self.genomeData = res.map(function (genome) {
            var keys = Object.keys(seqIds);
            // console.log('in when response keys', keys);

            if (keys[0].match(/^\d+\.\d+$/)) {
              seqIdIndex = seqIds[genome.genome_id] - 1;
            } else {
              for (var i = 0; i < keys.length; i++) {
                var mykey = keys[i].match(/.*\|(\d+\.\d+).*/);
                // console.log('in when response genome.genome_id, keys, mykey', genome.genome_id, keys[i], mykey);
                if (genome.genome_id == mykey[1]) {
                  // console.log('in when response mykey', mykey[1]);
                  seqIdIndex = seqIds[keys[i]] - 1;
                }
              }
            }

            // console.log('in when response seqIdIndex', seqIdIndex);

            self.idMap[seqIdIndex] = {
              seq_id: seqIdIndex,
              genome_id: genome.genome_id,
              genome_name: genome.genome_name,
              genbank_accessions: genome.genbank_accessions,
              species: genome.species,
              strain: genome.strain,
              geographic_group: genome.geographic_group,
              isolation_country: genome.isolation_country,
              host_group: genome.host_group,
              host_common_name: genome.host_common_name,
              collection_year: genome.collection_year,
              subtype: genome.subtype,
              lineage: genome.lineage,
              clade: genome.clade,
              h1_clade_global: genome.h1_clade_global,
              h1_clade_us: genome.h1_clade_us,
              h3_clade: genome.h3_clade,
              h5_clade: genome.h5_clade
            };
            self.dataMap[genome.genome_id] = {
              seq_id: seqIdIndex,
              genome_id: genome.genome_id,
              genome_name: genome.genome_name,
              genbank_accessions: genome.genbank_accessions,
              species: genome.species,
              strain: genome.strain,
              geographic_group: genome.geographic_group,
              isolation_country: genome.isolation_country,
              host_group: genome.host_group,
              host_common_name: genome.host_common_name,
              collection_year: genome.collection_year,
              subtype: genome.subtype,
              lineage: genome.lineage,
              clade: genome.clade,
              h1_clade_global: genome.h1_clade_global,
              h1_clade_us: genome.h1_clade_us,
              h3_clade: genome.h3_clade,
              h5_clade: genome.h5_clade
            };
            return {
              seq_id: seqIdIndex,
              genome_id: genome.genome_id,
              genome_name: genome.genome_name,
              genbank_accessions: genome.genbank_accessions,
              species: genome.species,
              strain: genome.strain,
              geographic_group: genome.geographic_group,
              isolation_country: genome.isolation_country,
              host_group: genome.host_group,
              host_common_name: genome.host_common_name,
              collection_year: genome.collection_year,
              subtype: genome.subtype,
              lineage: genome.lineage,
              clade: genome.clade,
              h1_clade_global: genome.h1_clade_global,
              h1_clade_us: genome.h1_clade_us,
              h3_clade: genome.h3_clade,
              h5_clade: genome.h5_clade
            };
          });
          console.log('createDataMap() res genome self.genomeData', self.genomeData);
          console.log('createDataMap() res genome self.dataMap', self.dataMap);
          self.setAltLabel(self.dataMap);
          self.render();
          // self.setTreeAltLabel(self.dataMap);
          console.log('createDataMap() res genome when alt_labels ', self.alt_labels);
          return res;
        });
        console.log('createDataMap() genome this.genomeData ', this.genomeData);
        console.log('createDataMap() genome genomes ', genomes);
        console.log('createDataMap() genome genomes this.containerType ', this.containerType);
        if (this.genomeData == null) {
          this.render();
          console.log('node names are not found in database');
        }

      }
      else {
        this.render();
        console.log('node names are not genome nor feature ids');
      }

      console.log('in createDataMap() this.dataMap', this.dataMap);
      console.log('in createDataMap() this.alt_labels', this.alt_labels);
    },

    generatePathLinks: function (path) {
      console.log('in generatePathLinks() path', path);
      var localStorage = window.localStorage;

      // strip out /public/ of parts array
      var parts = decodeURIComponent(path).replace(/\/+/g, '/').split('/');
      console.log('in generatePathLinks() parts', parts);
      console.log('in generatePathLinks() localStorage', localStorage);

      if (parts[1] == 'public') {
        parts.splice(1, 1);
      }

      if (parts[0] == '') {
        parts.shift();
      }

      var out = ["<span class='wsBreadCrumb'>"];
      var bp = ['workspace'];

      var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

      console.log('in generatePathLinks() isPublic', isPublic);


      // if viewing all public workspaces, just create header
      if (path == '/public/') {
        out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>');

        // if viewing a specific public workspace, create bread crumbs with additional url params
      } else if (isPublic) {
        out.push('<i class="icon-globe"></i> ' +
          '<a class="navigationLink perspective" href="/' + bp.join('/') + '/public">Public Workspaces</a>' +
          ' <i class="icon-caret-right"></i> ');
        bp.push('public', parts[0]);
      }

      parts.forEach(function (part, idx) {

        if (idx == (parts.length - 1) && part.slice(0, 1) == '.') {
          part = part.replace('.', '');
        }

        // don't create links for top level path of public path
        if (isPublic && idx == 0) {
          out.push('<b class="perspective">' + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</b> / ');
          return;
        }

        out.push("<a class='navigationLink' href='");
        bp.push(idx == 0 ? part : encodeURIComponent(part));  // leave username decoded
        out.push('/' + bp.join('/'));
        out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</a> / ');
      });
      // console.log('in generatePathLinks() out', out);
      return out.join('');
    },

    shortenLabel: function (label) {
      var maxLabelLength = 50;
      var shortLabel = label;

      for (const key in label) {
        if (label[key].length > maxLabelLength) {
          shortLabel[key] = label[key].substring(0, maxLabelLength / 2) + '...' +  shortLabel[key].slice( -1 * (maxLabelLength / 2));
          console.log('shortenLabel() shortLabel[key] = ', shortLabel[key]);
        }
      }
      console.log('shortenLabel() shortLabel = ', shortLabel);
      return shortLabel;
    },

    render: function () {
      this.contentPane.set('content', '');
      this.contentPane.set('style', 'top: 40px');
      var menuDiv = domConstruct.create('div', {}, this.contentPane.containerNode);
      var combineDiv = domConstruct.create('table', { style: { width: '100%' } }, this.contentPane.containerNode);// domConstruct.create("div",{"style":{"width":"100%"}},this.contentPane.containerNode);
      var combineRow = domConstruct.create('tr', {}, combineDiv);
      var cell1 = domConstruct.create('td', { width: '30%' }, combineRow);
      var cell2 = domConstruct.create('td', { width: '70%' }, combineRow);
      var treeDiv = domConstruct.create('div', { id: this.id + 'tree-container' }, cell1);
      var treeWidth = treeDiv.offsetWidth;
      var msaWidth = cell2.offsetWidth;
      var topset = 0;
      var msaTopPadding = 0;

      var treeTopPadding = this.conserveHeight + 5;
      var treeBottomPadding = this.numSequences * 3 + 10;
      console.log('render() this.seqLength = ', this.seqLength);
      console.log('render() treeWidth = ', treeWidth);
      console.log('render() msaWidth = ', msaWidth);

      if (this.msaFontWidth * this.seqLength > msaWidth) {
        treeTopPadding = this.conserveHeight + 10;
      }

      if (this.seqLength <= 2000 && topset == 0) {
        treeTopPadding += 102;
        msaTopPadding = 102;
        topset = 1;
      }

      treeDiv.setAttribute('style', 'padding-top:' + treeTopPadding + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
      var msaDiv = domConstruct.create('div', { style: { width: '100%' } }, cell2);
      msaDiv.style.display = 'inline-block';

      // msaDiv.style.width="64%";
      // msaDiv.style.overflowX="scroll";
      msaDiv.style.overflowY = 'hidden';
      msaDiv.style.verticalAlign = 'bottom';
      msaDiv.style.paddingBottom = treeBottomPadding + 'px';

      // domConstruct.place(menuDiv,this.contentPane.containerNode,"last");
      // domConstruct.place(combineDiv,this.contentPane.containerNode,"last");
      // domConstruct.place(combineDiv,treeDiv,"last");
      // domConstruct.place(combineDiv,msaDiv,"last");
      // this.contentPane.set('content', "<pre>" + JSON.stringify(this.data,null,3) + "</pre>");

      var msa_models = {
        seqs: msa.io.clustal.parse(this.dataStats.clustal)
      };

      var rearrangeSeqs = {};
      msa_models.seqs.forEach(lang.hitch(this, function (s) {
        rearrangeSeqs[s.name] = s;
      }));

      var opts = {};
      // set your custom properties
      // @see: https://github.com/greenify/biojs-vis-msa/tree/master/src/g
      opts.seqs = msa_models.seqs;
      opts.el = msaDiv;
      opts.bootstrapMenu = false;
      if (this.alignType == 'protein') {
        opts.colorscheme = { scheme: 'taylor' };
      }
      else if (this.alignType == 'dna') {
        opts.colorscheme = { scheme: 'nucleotide' };
      }
      opts.vis = {
        conserv: true,
        overviewbox: false,
        seqlogo: (this.seqLength <= 2000),
        sequences: true,
        labelName: false,
        labelId: false
      };
      opts.conf = {
        dropImport: true,
        registerWheelCanvas: false,
        registerMouseHover: false,
        debug: true
      };
      opts.zoomer = {
        menuFontsize: '12px',
        autoResize: true,
        labelNameLength: 150,
        alignmentHeight: 14.01 * this.numSequences,
        // alignmentWidth: msa_models.seqs[0].seq.length*15.1,
        residueFont: '12',
        rowHeight: 14.01
      };

      this.tree = new d3Tree({ selectionTarget: this });
      this.tree.d3Tree('#' + this.id + 'tree-container', { phylogram: this.phylogram, fontSize: this.treeFontSize });
      this.tree.setTree(this.treeData);
      var idMenuDivs = [];

      console.log('in render, this.tree', this.tree);
      console.log('in render, this.datamap', this.datamap);
      console.log('in render, alt labels: this.alt_labels', this.alt_labels);
      console.log('in render, alt labels: this.alt_labels.genome_name', this.alt_labels.genome_name);

      labelMappings.forEach(({key, label}) => {
        if (this.alt_labels[key]) {
          this.tree.addLabels(this.shortenLabel(this.alt_labels[key]), label);
          idMenuDivs.push(`<div class="wsActionTooltip" rel="${label}">${label}</div>`);
        }
      });

      console.log('after adding labels this.tree ', this.tree);

      const idSelectionDiv = query('div.ActionButtonWrapper[rel="IDSelection"]');
      if (idMenuDivs.length > 0) {
        idMenu.set('content', idMenuDivs.join(''));
        domStyle.set(idSelectionDiv[0], "display", "inline-block");
      } else {
        domStyle.set(idSelectionDiv[0], "display", "none");
      }

      this.tree.startup();
      // this.tree.selectLabels('Genome Name');
      this.tree.update();
      console.log('after tree.update() this.tree ', this.tree);

      Object.keys(rearrangeSeqs).forEach(lang.hitch(this, function (fid) {
        rearrangeSeqs[fid].py = this.tree.idToHeight[fid.replaceAll(':', '|')];
      }));
      msa_models.seqs.sort(function (a, b) {
        return a.py - b.py;
      });

      console.log('after msa sort msa_models.seqs', msa_models.seqs);

      // init msa
      var m = new msa.msa(opts);
      // console.log("m ", m);
      var menuOpts = {};
      menuOpts.el = menuDiv;
      // var msaDiv = document.getElementById('msaDiv');
      msaDiv.setAttribute('style', 'white-space: nowrap;');
      menuOpts.msa = m;
      new msa.menu.defaultmenu(menuOpts);

      on(colorMenu.domNode, 'click', function (evt) {
        var rel = evt.target.attributes.rel.value;
        // var sel = colorMenu.selection;
        delete colorMenu.selection;
        // var idType;

        // var ids = sel.map(function (d, idx) {
        //   if (!idType) {
        //     if (d.feature_id) {
        //       idType = 'feature_id';
        //     } else if (d.patric_id) {
        //       idType = 'patric_id';
        //     } else if (d.alt_locus_tag) {
        //       idType = 'alt_locus_tag';
        //     }
        //     // console.log("SET ID TYPE TO: ", idType)
        //   }

        //   return d[idType];
        // });
        m.g.colorscheme.set('scheme', rel);
        popup.close(colorMenu);
      });

      on(idMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        console.log('rel=', rel);
        console.log('idMenu alt_labels=', this.alt_labels);
        // var sel = idMenu.selection;
        delete idMenu.selection;

        this.tree.selectLabels(rel);
        popup.close(idMenu);
      }));

      /*
      on(visualMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        switch (rel) {
          case 'conserv':
            var value = m.g.vis.get('conserv');
            m.g.vis.set('conserv', !value);
            break;
          case 'overviewbox':
            var value = m.g.vis.get('overviewbox');
            m.g.vis.set('overviewbox', !value);
            break;
          case 'seqlogo':
            var value = m.g.vis.get('seqlogo');
            m.g.vis.set('seqlogo', !value);
            break;
          case 'markers':
            var value = m.g.vis.get('markers');
            m.g.vis.set('markers', !value);
            break;
        }
        popup.close(visualMenu);
      }));
*/

      on(visualMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        switch (rel) {
          case 'overviewbox':
            var value = m.g.vis.get('overviewbox');
            m.g.vis.set('overviewbox', !value);
            break;
        }
        popup.close(visualMenu);
      }));

      on(filterMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        // var sel = filterMenu.selection;
        delete filterMenu.selection;
        var maxLen = m.seqs.getMaxLength();
        // console.log("maxLen=", maxLen);
        var conserv = m.g.stats.scale(m.g.stats.conservation());
        var end = maxLen - 1;

        // console.log("msa_models=", msa_models);
        // console.log("m=", m);

        switch (rel) {
          case 'hide_col_threshold_greater':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] >= threshold) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'hide_col_threshold_less':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] <= threshold) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'hide_col_threshold_between':
            var threshold1 = prompt('Enter minimum threshold (in percent)', 20);
            var threshold2 = prompt('Enter maximum threshold (in percent)', 80);
            threshold1 /= 100;
            threshold2 /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] >= threshold1 && conserv[i] <= threshold2) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'hide_col_gaps_greater':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent >= threshold) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'hide_col_gaps_less':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent <= threshold) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'hide_col_gaps_between':
            var threshold1 = prompt('Enter minimum threshold (in percent)', 20);
            var threshold2 = prompt('Enter maximum threshold (in percent)', 80);
            threshold1 /= 100;
            threshold2 /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent >= threshold1 && gapContent <= threshold2) {
                hidden.push(i);
              }
            }
            treeDiv.setAttribute('style', 'padding-top:' + (treeTopPadding - msaTopPadding) + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            cell2.setAttribute('style', 'padding-top:' + msaTopPadding + 'px');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;

          case 'reset':
            m.g.columns.set('hidden', []);
            m.seqs.each(function (el) {
              if (el.get('hidden')) {
                return el.set('hidden', false);
              }
            });
            treeDiv.setAttribute('style', 'padding-top:' + treeTopPadding + 'px; padding-bottom:' + treeBottomPadding + 'px; width:100%; vertical-align:top; overflow-x:visible; display:inline-block; border-right:1px solid grey;');
            this.tree.update();
            if (this.seqLength <= 2000) {
              cell2.setAttribute('style', 'padding-top:' + 0 + 'px');
            } else {
              cell2.setAttribute('style', 'padding-top: 0px');
            }
            m.g.vis.set('seqlogo', this.seqLength <= 2000);
            break;

          default:
            break;
        }
        popup.close(filterMenu);
      }));

      on(snapMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value : null;

        delete snapMenu.selection;

        if (rel == 'msa') {
          msa.utils.export.saveAsImg(m, 'BVBRC_msa.png');
        }
        else if (rel == 'msa-txt') {
          saveAs(new Blob([this.dataStats.clustal]), 'BVBRC_msa.txt');
        }
        else if (rel == 'msa-fasta') {
          saveAs(new Blob([this.dataStats.fasta]), 'BVBRC_msa.fasta');
        }
        else if (rel == 'tree-svg') {
          saveAs(new Blob([query('svg')[0].outerHTML]), 'BVBRC_msa_tree.svg');
        }
        else if (rel == 'tree-newick') {
          saveAs(new Blob([this.dataStats.tree_newick]), 'BVBRC_msa_tree.nwk');
        }
        popup.close(snapMenu);
      }));

      // var groupButton = new DropDownButton({
      //   name: "groupButton",
      //   label: "Add Group",
      //   dropDown: groupMenu
      // }, idMenuDom).startup();

      // this.imageButton = domConstruct.create("input", {type: "button", value: "save image"}, menuDiv);
      m.render();
      // var msaDiv2=document.getElementsByClassName("biojs_msa_seqblock")[0];
      // var ctx = msaDiv2.getContext("2d");
      // ctx.fillStyle = "#FF0000";
      // ctx.fillRect(0,0,150,75);

      // m.el.parentElement.parentElement.parentElement.insertBefore(menuOpts.el, combineDiv);

      // m.el.parentElement.insertBefore(menuOpts.el, combineDiv);
      // var initialHidden = 0;
      // var treeDiv2=document.getElementsByClassName("tnt_groupDiv");
      var treeHeight = parseInt(treeDiv.childNodes[0].getAttribute('height'));
      // var msaDiv=document.getElementsByClassName("biojs_msa_stage");
      // var msaDiv=document.getElementById("msaDiv");
      msaDiv.style.display = 'inline-block';
      // msaDiv.style.width="64%";
      msaDiv.style.overflowX = 'hidden';
      msaDiv.style.overflowY = 'hidden';
      msaDiv.style.verticalAlign = 'bottom';
      msaDiv.style.paddingBottom = '10px';
      msaDiv.style.height = (treeHeight + treeTopPadding + treeBottomPadding).toString() + 'px';

      console.log('msaDiv.style.height: ', msaDiv.style.height);
      console.log('treeHeight: ', treeHeight);


      // treeLoaded = true;
    },

    setTreeType: function (treeType) {
      if (this.phylogram && treeType == 'cladogram') {
        this.togglePhylo();
      }
      else if ((!this.phylogram) && treeType == 'phylogram') {
        this.togglePhylo();
      }
    },

    togglePhylo: function () {
      this.phylogram = !this.phylogram;
      this.tree.setPhylogram(this.phylogram);
      // this.typeButton.set("label", this.phylogram ? "cladogram" : "phylogram");
    },

    doAlignment: function () {
      console.log('doAlignment()');
      console.log('this.state.search ', this.state.search);
      this.set('loading', true);
      if (this.state && this.state.search) {
        var q = this.state.search + '&limit(' + this.maxSequences + ')';
        if (this.state.pathname.indexOf('dna') !== -1) {
          this.alignType = 'dna';
        }
        console.log('RUN MSA Against: ', q);
        return when(window.App.api.data('multipleSequenceAlignment', [q, this.alignType]), lang.hitch(this, function (res) {
          console.log('MSA Results: ', res);
          this.set('loading', false);
          this.set('data', res);
        }));
      }

    },

    postCreate: function () {
      this.inherited(arguments);
      var fileCheck = this.state.pathname.match(/path=..+?(?=&|$)/);
      var objPath = fileCheck[0].split('=')[1];
      var folder = objPath.split('/').slice(0, -1).join('/');
      // console.log('postCreate: objPath', objPath);
      console.log('postCreate: this.state.pathname', this.state.pathname);
      console.log('postCreate: folder', folder);
      // console.log('postCreate: this', this);

      this.pathContainer = domConstruct.create('div', { 'class': 'wsBreadCrumbContainer' }, this.domNode);
      this.pathContainer.innerHTML = this.generatePathLinks(folder);
      // console.log('postCreate: this.pathContainer.innerHTML', this.pathContainer.innerHTML);

      this.contentPane = new ContentPane({ region: 'center', style: 'top: 40px' });
      this.addChild(this.contentPane);

      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 4,
        style: 'width:56px;text-align:center;',
        splitter: false,
        currentContainerWidget: this
      });
      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        style: 'width:300px',
        splitter: true,
        layoutPriority: 1,
        containerWidget: this
      });

      this.addChild(this.selectionActionBar);
      this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();
      this.setupActions();
    },

    selectionActions: [
      [
        'ToggleItemDetail',
        'fa icon-chevron-circle-left fa-2x',
        {
          label: 'DETAILS',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Toggle Details Pane'
        },
        function (selection, container, button) {
          console.log('Toggle Item Detail Panel', this.itemDetailPanel.id, this.itemDetailPanel);

          var children = this.getChildren();
          // console.log("Children: ", children);
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
            console.log('Remove Item Detail Panel');
            this.removeChild(this.itemDetailPanel);
            console.log('Button Node: ', button);

            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'DETAILS';
            });

            query('.ActionButton', button).forEach(function (node) {
              console.log('ActionButtonNode: ', node);
              domClass.remove(node, 'icon-chevron-circle-right');
              domClass.add(node, 'icon-chevron-circle-left');
            });
          }
          else {
            // console.log("Re-add child: ", this.itemDetailPanel);
            this.addChild(this.itemDetailPanel);

            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'HIDE';
            });

            query('.ActionButton', button).forEach(function (node) {
              console.log('ActionButtonNode: ', node);
              domClass.remove(node, 'icon-chevron-circle-left');
              domClass.add(node, 'icon-chevron-circle-right');
            });
          }
        },
        true
      ],
      [
        'ColorSelection',
        'fa icon-paint-brush fa-2x',
        {
          label: 'COLORS',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Selection Color',
          tooltipDialog: colorMenu,
          ignoreDataType: true
        },
        function (selection) {
          colorMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.ColorSelection.options.tooltipDialog,
            around: this.selectionActionBar._actions.ColorSelection.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'IDSelection',
        'fa icon-pencil-square fa-2x',
        {
          label: 'ID TYPE',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Set ID Type',
          tooltipDialog: idMenu,
          ignoreDataType: true
        },
        function (selection) {
          // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

          idMenu.selection = selection;
          // console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
          popup.open({
            popup: this.selectionActionBar._actions.IDSelection.options.tooltipDialog,
            around: this.selectionActionBar._actions.IDSelection.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'FilterSelection',
        'fa icon-filter fa-2x',
        {
          label: 'Filter',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Show hide columns',
          tooltipDialog: filterMenu,
          ignoreDataType: true
        },
        function (selection) {
          // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

          filterMenu.selection = selection;
          // console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
          popup.open({
            popup: this.selectionActionBar._actions.FilterSelection.options.tooltipDialog,
            around: this.selectionActionBar._actions.FilterSelection.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'AddGroup',
        'fa icon-object-group fa-2x',
        {
          label: 'GROUP',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          requireAuth: true,
          max: 10000,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['genome_data', 'feature_data']
        },
        function (selection, containerWidget) {
          // console.log("Add Items to Group", selection);
          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type;

          if (!containerWidget) {
            // console.log("Container Widget not setup for addGroup");
            return;
          }

          if (containerWidget.containerType == 'genome_data') {
            type = 'genome_group';
          } else if (containerWidget.containerType == 'feature_data') {
            type = 'feature_group';
          }

          if (!type) {
            console.error('Missing type for AddGroup');
            return;
          }
          var stg = new SelectionToGroup({
            selection: selection,
            selectType: true,
            type: type,
            inputType: containerWidget.containerType,
            path: containerWidget.get('path')
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
        false
      ],
      [
        'ViewFeatureItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['*'],
          multiple: false,
          // disabled: false,
          tooltip: 'Switch to Feature View. Press and Hold for more options.',
          validContainerTypes: ['feature_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'Feature',
                perspectiveUrl: '/view/Feature/' + selection[0].feature_id
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          console.log('ViewFeatureItem this.containerType ', this.containerType);
          var sel = selection[0];
          Topic.publish('/navigate', {
            href: '/view/Feature/' + sel.patric_id + '#view_tab=overview',
            target: 'blank'
          });
        },
        false
      ],
      [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 5000,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['feature_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'FeatureList',
                perspectiveUrl: '/view/FeatureList/?in(feature_id,(' + selection.map(function (x) {
                  return x.feature_id;
                }).join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          Topic.publish('/navigate', {
            href: '/view/FeatureList/?in(feature_id,(' + selection.map(function (x) {
              return x.feature_id;
            }).join(',') + '))',
            target: 'blank'
          });
        },
        false
      ],
      [
        'ViewGenomeItem',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['*'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'Genome',
                perspectiveUrl: '/view/Genome/' + selection[0].genome_id
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          // console.log("sel: ", sel)
          // console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
          Topic.publish('/navigate', { href: '/view/Genome/' + sel.genome_id, target: 'blank' });
        },
        false
      ],
      [
        'ViewGenomeItems',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 1000,
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['*'],
          pressAndHold: function (selection, button, opts, evt) {
            var map = {};
            selection.forEach(function (sel) {
              if (!map[sel.genome_id]) {
                map[sel.genome_id] = true;
              }
            });
            var genome_ids = Object.keys(map);
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'GenomeList',
                perspectiveUrl: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))'
              }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var map = {};
          selection.forEach(function (sel) {
            if (!map[sel.genome_id]) {
              map[sel.genome_id] = true;
            }
          });
          var genome_ids = Object.keys(map);
          Topic.publish('/navigate', { href: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))', target: 'blank' });
        },
        false
      ],
      [
        'VisualOptions',
        'fa icon-eye fa-2x',
        {
          label: 'VISUAL',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Visualization options',
          tooltipDialog: visualMenu,
          ignoreDataType: true
        },
        function (selection) {
          visualMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.VisualOptions.options.tooltipDialog,
            around: this.selectionActionBar._actions.VisualOptions.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'Snapshot',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Save an image',
          tooltipDialog: snapMenu,
          ignoreDataType: true
        },
        function (selection) {
          // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

          var snapMenuDivs = [];
          // disable downloding MSA png as the png does not give the species or tell you where in the alignment it is.
          // snapMenuDivs.push('<div class="wsActionTooltip" rel="msa">MSA png</div>');
          /* var encodedTree = window.btoa(unescape(encodeURIComponent(Query("svg")[0].outerHTML)));

          var e = domConstruct.create("a", {
            download: "MSATree.svg",
            href: "data:image/svg+xml;base64,\n" + encodedTree,
            style: {"text-decoration": "none", color: "black"},
            innerHTML: "Tree svg",
            alt: "ExportedMSATree.svg"
          });

          var clustalData = window.btoa(this.dataMap.clustal);
          var clustalLink =domConstruct.create("a", {
            download: "msa_patric.txt",
            href: "data:text/plain;base64,\n" + clustalData,
            style: {"text-decoration": "none", color: "black"},
            innerHTML: "MSA txt",
            alt: "export_msa.txt"
          });

          var treeData = window.btoa(this.data.tree);
          var newickLink =domConstruct.create("a", {
            download: "tree_newick.txt",
            href: "data:text/plain;base64,\n" + treeData,
            style: {"text-decoration": "none", color: "black"},
            innerHTML: "Tree newick",
            alt: "tree_newick.txt"
          }); */
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa">MSA image</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-txt">MSA txt</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-fasta">MSA fasta</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-svg">Tree svg</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="tree-newick">Tree newick</div>');

          snapMenu.set('content', snapMenuDivs.join(''));
          snapMenu.selection = selection;
          // console.log("ViewFasta Sel: ", this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog)
          popup.open({
            popup: this.selectionActionBar._actions.Snapshot.options.tooltipDialog,
            around: this.selectionActionBar._actions.Snapshot.button,
            orient: ['below']
          });
        },
        true
      ]
    ],

    setupActions: function () {
      if (this.containerActionBar) {
        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5], a[6], a[7], a[8], a[9], a[10]);
        }, this);
      }
      this.selectionActions.forEach(function (a) {
        this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5], a[6], a[7], a[8], a[9], a[10]);
      }, this);

    },

    startup: function () {

      if (this._started) {
        return;
      }

      this.watch('loading', lang.hitch(this, 'onSetLoading'));
      this.watch('data', lang.hitch(this, 'onSetData'));
      this.watch('selection', lang.hitch(this, 'onSelection'));

      this.inherited(arguments);
    }
  });
});
