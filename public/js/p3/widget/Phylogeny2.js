define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dojo/when',
  'dijit/_WidgetBase', 'dojo/request', 'dojo/dom-construct', 'dojo/_base/lang',
  'dojo/dom-geometry', 'dojo/dom-style', 'd3/d3', '../util/PathJoin',
  'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/form/Button',
  'dijit/MenuItem', 'dijit/TooltipDialog', 'dijit/popup', './SelectionToGroup',
  'dijit/Dialog', './ItemDetailPanel', 'dojo/query', 'FileSaver',
  './ActionBar', './ContainerActionBar', 'dijit/layout/BorderContainer', './PerspectiveToolTip',
  'dijit/layout/ContentPane', 'dojo/dom-class', 'dojo/on', 'dojo/topic',
  'dojo/text!./templates/Phylogeny2.html', 'dijit/_TemplatedMixin'
], function (
  declare, Deferred, when,
  WidgetBase, request, domConstruct,
  lang, domGeometry, domStyle, d3, PathJoin,
  DropDownButton, DropDownMenu,
  Button, MenuItem, TooltipDialog, popup,
  SelectionToGroup, Dialog, ItemDetailPanel, query, saveAs,
  ActionBar, ContainerActionBar, BorderContainer, PerspectiveToolTipDialog,
  ContentPane, domClass, on, Topic,
  Template, Templated
) {

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

  var snapMenu = new TooltipDialog({
    content: '',
    onMouseLeave: function () {
      popup.close(snapMenu);
    }
  });

  return declare([BorderContainer, Templated], {
    baseClass: 'Phylogeny2',
    templateString: Template,
    disabled: false,
    constructor: function () {
    },
    isloaded: false,
    type: 'rectangular',
    state: null,
    taxon_id: null,
    newickxml: null,
    fileType: null,
    labels: null,
    options: null,
    jsonTree: null,
    tree: null,
    apiServer: window.App.dataAPI,
    phylogram: true,
    containerType: 'unknown',
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_taxon/phylogeny.html',
    nodeSelection: null,
    featureData: null,
    genomeData: null,
    selection: null,
    nodeType: 'unknown',
    tooltip: 'The "Phylogeny" tab provides order or genus level phylogenetic tree, constructed using core protein families',
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      var fileCheck = this.state.href.match(/wsTreeFile=..+?(?=&|$)/);
      var objPath = fileCheck[0].split('=')[1];
      // var folder = objPath.split('/').slice(0, -1).join('/');
      // console.log('postCreate: objPath', objPath);
      console.log('postCreate: this.state', this.state);
      // console.log('postCreate: folder', folder);

      this.pathContainer = new ContentPane({ 'content': this.generatePathLinks(objPath), 'region': 'top' });

      // this.pathContainer = domConstruct.create('div', { 'class': 'wsBreadCrumbContainer' }, this.domNode);
      // this.pathContainer.innerHTML = this.generatePathLinks(objPath);
      this.containerPane = new ContentPane({ region: 'center' });// domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);

      /*
      this.containerActionBar = new ContainerActionBar({
        baseClass: 'WSContainerActionBar',
        region: 'top'
      });
      */

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
      this.treeDiv = domConstruct.create('div', { class: 'size archaeopteryxClass', id: this.id + 'tree-container' }, this.containerPane.domNode);
      this.treeDiv1 = domConstruct.create('div', { id: 'phylogram1' }, this.treeDiv);
      this.treeDiv2 = domConstruct.create('div', { id: 'controls0' }, this.treeDiv);
      // this.treeDiv3 = domConstruct.create('div', { id: 'controls1' }, this.treeDiv);

      // this.addChild(this.containerActionBar);
      this.addChild(this.pathContainer);
      this.addChild(this.selectionActionBar);
      this.addChild(this.containerPane);
      this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();

      console.log('startup this.nodeType', this.nodeType);

      this.setupActions();

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('taxon_id', lang.hitch(this, 'onSetTaxonId'));
      this.watch('newickxml', lang.hitch(this, 'processTree'));
      this.watch('selection', lang.hitch(this, 'onNodeSelection'));
      // this.watch('submit_selected_nodes_event', lang.hitch(this, 'onNodeSelection'));
      // this.watch('selection', lang.hitch(this, 'onNodeSelection'));
      // document.addEventListener('selected_nodes_changed_event', this.onNodeSelection());
    },

    noData: function () {
      domClass.add(this.typeButton.domNode, 'dijitHidden');
      this.treeDiv.innerHTML = 'There is no tree currently available';
    },

    onNodeSelection: function (contain) {
      console.log('onNodeSelection this', this);
      // var ele = event.target;
      console.log('onNodeSelection contain', contain);

      this.nodeSelection = window.archaeopteryx.getSelectedNodes();
      console.log('onNodeSelection this.nodeSelection', this.nodeSelection);
      var cur = [];
      this.nodeSelection.map(lang.hitch(this, function (selected) {
        if (!selected.children) {
          if (this.nodeType == 'feature') {
            this.containerType = 'feature_data';
            this.featureData.forEach(function (item) {
              console.log('onNodeSelection featureData item', item);
              console.log('onNodeSelection selected.name', selected.name);
              if (item.feature_id == selected.name || item.patric_id == selected.name) {
                cur.push(item);
              }
            });
          }
          else {
            cur.push({ genome_id: selected.name });
            if (this.nodeType == 'genome') {
              this.containerType = 'genome_data';
            }
          }
        }

      }));

      console.log('onNodeSelection this.containerType', this.containerType);

      this.selection = cur;
      this.selectionActionBar.set('currentContainerType', this.containerType);
      this.selectionActionBar.set('selection', this.selection);

      console.log('onNodeSelection before query this.nodeType', this.nodeType);
      console.log('onNodeSelection this.nodeSelection', this.nodeSelection);

      console.log('onNodeSelection this.selection', this.selection);
      console.log('onNodeSelection cur', cur);
      console.log('onNodeSelection this.selectionActionBar', this.selectionActionBar);
      console.log('onNodeSelection this.itemDetailPanel', this.itemDetailPanel);
      console.log('onNodeSelection this.idType', this.idType);
      console.log('onNodeSelection this.nodeType', this.nodeType);


      if (cur && cur.length == 1) {
        if (cur[0].feature_id) {
          request.get(PathJoin(this.apiServer, 'genome_feature', cur[0].feature_id), {
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
          request.get(PathJoin(this.apiServer, 'genome', cur[0].genome_id), {
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

    onSelection: function () {

      var cur = this.selection.map(lang.hitch(this, function (selected) {
        return { genome_id: selected.id };
      }));

      this.selectionActionBar.set('selection', cur);

      if (cur.length == 1) {
        request.get(PathJoin(this.apiServer, 'genome', cur[0].genome_id), {
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
        this.itemDetailPanel.set('selection', cur);
      }
    },

    onSetState: function (attr, oldVal, state) {
      // this.treeDiv.innerHTML= "Loading...";
      // console.log('Phylogeny onSetState: ', state);
      if (!state) {
        return;
      }

      if (state.taxon_id) {
        this.set('taxon_id', state.taxon_id);
      } else if (state.genome) {
        this.set('taxon_id', state.genome.taxon_id);
      } else if (state.taxonomy) {
        this.set('taxon_id', state.taxonomy.taxon_id);
      }
    },

    onSetTaxonId: function (attr, oldVal, taxonId) {
      request.get(PathJoin(this.apiServer, 'taxonomy', taxonId), {
        headers: {
          accept: 'application/newick+json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (treeDat) {
        // console.log("Set Newick");
        this.processTreeData(treeDat);
      }), lang.hitch(this, function (err) {
        this.noData();
        console.log('Error Retreiving newick for Taxon: ', err);
      }));
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
        if (idx == parts.length - 1) {
          out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</a>');
        } else {
          out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</a> / ');
        }
      });
      // console.log('in generatePathLinks() out', out);
      return out.join('');
    },

    getLeafNodes: function (nodes, result = []) {
      for (var i = 0, length = nodes.length; i < length; i++) {
        if (!nodes[i].children || nodes[i].children.length === 0) {
          result.push(nodes[i]);
        } else {
          result = this.getLeafNodes(nodes[i].children, result);
        }
      }
      return result;
    },

    processTreeData: function (treeDat, idType, fileType) {
      console.log('treeDat', treeDat);
      console.log('idType', idType);
      console.log('processTreeData fileType', fileType);

      if (!treeDat.tree) {
        console.log('No newick+json in Request Response');
        return;
      }
      if (treeDat.labels) {
        this.set('labels', treeDat.labels);
      }
      if (treeDat.options) {
        this.set('options', treeDat.options);
      }
      this.set('idType', idType);
      this.set('fileType', fileType);
      this.set('newickxml', treeDat.tree);
    },

    processTree: function () {
      // console.log('processTree this', this);
      // console.log('processTree this.options', this.options);
      // console.log('this.newickxml', this.newickxml);
      // console.log('processTree this.fileType', this.fileType);
      this.containerPane.set('style', 'top: 40px');

      var options = {};
      options.backgroundColorDefault = '#ffffff';
      options.branchColorDefault = '#909090';
      options.branchDataFontSize = 12;
      options.branchWidthDefault = 3;
      options.collapasedLabelLength = 7;
      options.defaultFont = ['Arial', 'Helvetica', 'Times'];
      options.dynahide = true;
      options.externalNodeFontSize = 12;
      options.internalNodeFontSize = 12;
      options.labelColorDefault = '#202020';
      options.minBranchLengthValueToShow = 0.01;
      options.minConfidenceValueToShow = 0.5;
      options.nodeSizeDefault = 2;
      options.nodeVisualizationsOpacity = 1.0;
      options.phylogram = true;
      options.searchIsCaseSensitive = false;
      options.searchIsPartial = true;
      options.searchUsesRegex = false;
      options.showBranchEvents = true;
      options.showBranchLengthValues = false;
      options.showConfidenceValues = true;
      options.showDisributions = true;
      options.showExternalLabels = true;
      options.showExternalNodes = false;
      options.showInternalLabels = true;
      options.showInternalNodes = false;
      options.showNodeEvents = true;
      options.showNodeName = true;
      options.showSequence = true;
      options.showSequenceAccession = true;
      options.showSequenceGeneSymbol = true;
      options.showSequenceName = true;
      options.showSequenceSymbol = true;
      options.showTaxonomy = false;
      options.showTaxonomyCode = true;
      options.showTaxonomyCommonName = true;
      options.showTaxonomyRank = true;
      options.showTaxonomyScientificName = true;
      options.showTaxonomySynonyms = true;
      options.labelColor = '#202020';

      var settings = {};
      settings.border = '1px solid #909090';
      settings.controls0Top = 10;
      settings.controls1Top = 10;
      settings.enableAccessToDatabases = true;
      settings.controlsBackgroundColor = '#e0e0e0';
      settings.controlsFont = ['Arial', 'Helvetica', 'Times'];
      settings.controlsFontColor = '#505050';
      settings.controlsFontSize = 8;
      settings.enableDownloads = true;
      settings.enableBranchVisualizations = true;
      settings.enableCollapseByBranchLenghts = false;
      settings.enableCollapseByFeature = false;
      settings.enableNodeVisualizations = true;
      settings.nhExportWriteConfidences = true;
      settings.rootOffset = 180;
      settings.allowManualNodeSelection = true;
      settings.orderTree = true;

      if (this.options) {
        options = lang.mixin(options, this.options);
      }

      // console.log('options', options);

      var nodeVisualizations = {};
      var specialVisualizations = {};
      var nodeLabels = {};

      var property_name = '';
      if (!this.newickxml) {
        console.log('No Newick or xml File To Render');
        return;
      }
      var mytree;
      try {
        // console.log('this.fileType', this.fileType);
        if (this.fileType == 'phyloxml') {
          mytree = window.archaeopteryx.parsePhyloXML(this.newickxml);

          var refs_set = forester.collectPropertyRefs(mytree, 'node', true);
          // console.log('mytree collectPropertyRefs refs_set: ', refs_set);

          if (refs_set.size > 0) {
            this.treeDiv3 = domConstruct.create('div', { id: 'controls1' }, this.treeDiv); // show control1 panel if there are node properties
            refs_set.forEach(function (a) {
              // console.log('refs_set a', a);

              var property_line = a.split(':');
              // console.log('property_line', property_line);
              var selected = false;

              if (property_line.length == 1) {
                property_name = property_line[0];
              }
              else if (property_line.length > 1) {
                property_name = property_line[1];
              }

              if (property_name.toLowerCase() == 'genome_name') {
                selected = true;
                options.showNodeName = false;
              }
              nodeVisualizations[property_name] =  {
                label: property_name,
                description: property_name,
                field: null,
                cladeRef: a,
                regex: false,
                shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
                colors: 'category50',
                sizes: null
              };
              nodeLabels[property_name] = {
                label: property_name,
                description: property_name,
                propertyRef: 'BVBRC:' + property_name,
                selected: selected,
                showButton: true
              };
            });
            // console.log('mytree nodeVisualizations: ', nodeVisualizations);
          }
        }
        else {
          mytree = window.archaeopteryx.parseNewHampshire(this.newickxml, true, false);
        }
        // console.log('in try tree this.newickxml', this.newickxml);
        console.log('mytree', mytree);
      }
      catch (e) {
        alert('error while parsing tree: ' + e);
      }
      if (mytree) {
        try {
          forester.midpointRoot(mytree);
          // console.log('before launch mytree nodeVisualizations: ', nodeVisualizations);
          // console.log('processTree this ', this);
          // console.log('processTree before launch mytree ', mytree);
          // console.log('this.options ', this.options);
          // console.log('options ', options);
          // console.log('settings ', settings);
          // console.log('nodeVisualizations ', nodeVisualizations);
          // console.log('nodeLabels ', nodeLabels);
          // console.log('specialVisualizations ', specialVisualizations);

          window.archaeopteryx.launch('#phylogram1', mytree, options, settings, nodeVisualizations, nodeLabels, specialVisualizations);
          console.log('processTree this ', this);
          // get node labels
          var nodeList = this.getLeafNodes([mytree]);
          console.log('node list', nodeList);

          var ids = nodeList.map(function (node) { return node.name; });
          console.log('processTree node ids ', ids);

          var pIDs = [];
          ids.forEach((id) => {
            pIDs.push(encodeURIComponent(id))
          });
          console.log('processTree pIDs ', pIDs);

          var self = this;
          // var query = '';
          if (ids[0].match(/^fig/) || ids[0].match(/CDS/)) {
            this.nodeType = 'feature';
            this.containerType = 'feature_data';

            // query = 'in(patric_id,(' + pIDs.join(',') + '))&select(patric_id, feature_id, genome_id)&limit(25000)';
            // query = 'in(genome_id,(1207076.3,2006848.36,1042404.3,1076934.5,1235789.3))&select(genome_id,genome_name)&limit(250)';

            var fetchedIds = when(request.post(PathJoin(window.App.dataAPI, 'genome_feature'), {
              handleAs: 'json',
              // headers: this.headers,
              data: 'or(in(patric_id,(' +  pIDs.join(',') + ')),in(feature_id,(' + pIDs.join(',') + ')))&select(feature_id,patric_id,genome_id)&limit(1000)'
            }), function (response) {
              console.log('in when response response', response);
              self.featureData = response.map(function (feature) {
                return { patric_id: feature.patric_id, feature_id: feature.feature_id, genome_id: feature.genome_id };
              });
              console.log('self.featureData', self.featureData);
              document.addEventListener('selected_nodes_changed_event', self.onNodeSelection.bind(self));
              return response;
            });
            console.log('this.featureData', this.featureData);
            console.log('fetchedIds', fetchedIds);
          }
          else if (ids[0].match(/^\d+\.\d+/)) {
            this.nodeType = 'genome';
            this.containerType = 'genome_data';

            this.genomeData = nodeList.map(function (node) { return { genome_id: node.name } });
            console.log('this.genomeData', this.genomeData);
            document.addEventListener('selected_nodes_changed_event', this.onNodeSelection.bind(self));
          }
          else {
            this.nodeType = 'unknown';
            this.containerType = 'unknown';
            console.log('node names are not genome nor feature ids');
          }

          console.log('processTree this.containerType ', this.containerType);

          document.addEventListener('selected_nodes_changed_event', this.onNodeSelection.bind(self));
          console.log('processTree this after add ', this);
          // document.addEventListener('submit_selected_nodes_event', this.onNodeSelection(this));
        }
        catch (e) {
          alert('Error while launching archaeopteryx... Please reload the page using your browser reload button.');
        }
      }
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
          // console.log("Toggle Item Detail Panel",this.itemDetailPanel.id, this.itemDetailPanel);

          var children = this.getChildren();
          // console.log("Children: ", children);
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
            // console.log("Remove Item Detail Panel");
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
      ], [
        'UserGuide',
        'fa icon-info-circle fa-2x',
        {
          label: 'GUIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Open User Guide in a new Tab'
        },
        function (selection, container) {
          // console.log('USER GUIDE action', container);
          window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
        },
        true
      ], [
        'ViewGenomeItemFromGenome',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          disabled: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          validContainerTypes: ['genome_data', 'feature_data'],
          pressAndHold: function (selection, button, opts, evt) {
            console.log('PressAndHold');
            console.log('Selection: ', selection, selection[0]);
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Genome/' + selection[0].genome_id }),
              around: button,
              orient: ['below']
            });

          }
        },
        function (selection) {
          var sel = selection[0];
          // console.log("sel: ", sel)
          // console.log("Nav to: ", "/view/Genome/" + sel.genome_id);
          Topic.publish('/navigate', {
            href: '/view/Genome/' + sel.genome_id,
            target: 'blank'
          });
        },
        false
      ], [
        'ViewGenomeItems',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['*'],
          multiple: true,
          disabled: false,
          min: 2,
          max: 1000,
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['genome_data', 'feature_data'],
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
                perspectiveUrl: '/view/GenomeList/?in(genome_id,(' + genome_ids.join(',') + '))',
                target: 'blank'
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
      ], [
        'ViewFeatureItem',
        'MultiButton fa icon-selection-Feature fa-2x',
        {
          label: 'FEATURE',
          validTypes: ['*'],
          multiple: false,
          disabled: false,
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
          var sel = selection[0];
          Topic.publish('/navigate', {
            href: '/view/Feature/' + sel.patric_id + '#view_tab=overview',
            target: 'blank'
          });
        },
        false
      ], [
        'ViewFeatureItems',
        'MultiButton fa icon-selection-FeatureList fa-2x',
        {
          label: 'FEATURES',
          validTypes: ['*'],
          multiple: true,
          min: 2,
          max: 5000,
          disabled: false,
          tooltip: 'Switch to Feature List View. Press and Hold for more options.',
          validContainerTypes: ['feature_data'],
          pressAndHold: function (selection, button, opts, evt) {
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
      ], [
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
      ]
    ],

    setupActions: function () {
      if (this.containerActionBar && this.containerActions) {
        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
        }, this);
      }
      this.selectionActions.forEach(function (a) {
        var cont = false;
        console.log('setupActions this.nodeType = ', this.nodeType);


        if (this.selection) {
          console.log('if setupActions this.selection = ', this.selection);
          cont = true;
        }
        if (!cont) {
          this.selectionActionBar.addAction(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
        }

      }, this);

      console.log('setupActions this.containerActionBar ', this.containerActionBar);
      console.log('setupActions this.containerActions ', this.containerActions);
      console.log('setupActions this.selectionActionBar ', this.selectionActionBar);
      console.log('setupActions this.itemDetailPanel ', this.itemDetailPanel);
      console.log('setupActions this.state ', this.state);
      console.log('setupActions this.containerType ', this.containerType);
    }
  });
});
