define([
  'dojo/_base/declare', 'phyloview/PhyloTree', 'phyloview/TreeNavSVG', 'dojo/when',
  'dijit/_WidgetBase', 'dojo/request', 'dojo/dom-construct', 'dojo/_base/lang',
  'dojo/dom-geometry', 'dojo/dom-style', 'd3/d3', '../util/PathJoin',
  'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/form/Button',
  'dijit/MenuItem', 'dijit/TooltipDialog', 'dijit/popup', './SelectionToGroup',
  'dijit/Dialog', './ItemDetailPanel', 'dojo/query', 'FileSaver',
  './ActionBar', './ContainerActionBar', 'dijit/layout/BorderContainer', './PerspectiveToolTip',
  'dijit/layout/ContentPane', 'dojo/dom-class', 'dojo/on', 'dojo/topic'
], function (
  declare, PhyloTree, TreeNavSVG, when,
  WidgetBase, request, domConstruct,
  lang, domGeometry, domStyle, d3, PathJoin,
  DropDownButton, DropDownMenu,
  Button, MenuItem, TooltipDialog, popup,
  SelectionToGroup, Dialog, ItemDetailPanel, query, saveAs,
  ActionBar, ContainerActionBar, BorderContainer, PerspectiveToolTipDialog,
  ContentPane, domClass, on, Topic
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

  return declare([BorderContainer], {
    baseClass: 'Phylogeny',
    type: 'rectangular',
    state: null,
    taxon_id: null,
    newick: null,
    labels: null,
    jsonTree: null,
    tree: null,
    apiServer: window.App.dataAPI,
    phyloxml_date: '111023', // month, day, year
    phylogram: true,
    containerType: 'genome_data',
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_taxon/phylogeny.html',
    selection: null,
    tooltip: 'The "Phylogeny" tab provides order or genus level phylogenetic tree, constructed using core protein families.',
    startup: function () {
      this.containerPane = new ContentPane({ region: 'center' });// domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);
      this.containerActionBar = new ContainerActionBar({
        region: 'top',
        splitter: false,
        content: '',
        style: 'height: 30px;display: flex;align-items:center; margin:0px;padding:0px; overflow: hidden; vertical-align:middle;',
        className: 'TextTabButtons'
      });
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
      this.addChild(this.containerActionBar);
      this.addChild(this.selectionActionBar);
      this.addChild(this.containerPane);
      // this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();

      var menuDiv = domConstruct.create('div', { style: 'display: inline-block' }, this.containerActionBar.pathContainer);

      this.setupActions();
      on(idMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        // var sel = idMenu.selection;
        delete idMenu.selection;

        this.tree.selectLabels(rel);
        popup.close(idMenu);
      }));

      on(snapMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value : null;
        delete snapMenu.selection;
        if (rel == 'tree-svg') {
          saveAs(new Blob([this.tree.svgContainer[0][0].outerHTML]), 'BVBRC_phylogeny_tree.svg');
        }
        else if (rel == 'tree-newick') {
          saveAs(new Blob([this.newick]), 'BVBRC_phylogeny_tree.nwk');
        }
        popup.close(snapMenu);
      }));

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('taxon_id', lang.hitch(this, 'onSetTaxonId'));
      // this.watch('newick', lang.hitch(this, 'processTree'));
      this.watch('selection', lang.hitch(this, 'onNodeSelection'));

      // this.watch('selection', lang.hitch(this, 'onNodeSelection'));

      this.pre_build_options();
    },

    noData: function () {
      // domClass.add(this.typeButton.domNode, 'dijitHidden');
      this.treeDiv.innerHTML = 'There is no tree currently available';
    },

    pre_build_options: function () {
      const options = {};
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
      options.showConfidenceValues = false;
      options.showDisributions = true;
      options.showExternalLabels = true;
      options.showExternalNodes = false;
      options.showInternalLabels = false;
      options.showInternalNodes = false;
      options.showNodeEvents = true;
      options.showNodeName = false;
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

      this.settings = settings;
      this.options = options;
    },

    onSelection: function () {

      var cur = this.selection.map(lang.hitch(this, function (selected) {
        return { genome_id: selected.id };
      }));

      this.selectionActionBar.set('selection', cur);

      if (cur.length == 1) {
        request.get(PathJoin(this.apiServer, 'genome', cur[0].genome_id), {
          headers: {
            accept: 'application/json'
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

    onSetState: function (attr, oldVal, state) {
      // this.treeDiv.innerHTML= "Loading...";
      console.log('Phylogeny onSetState: ', state);
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
      // after the Phylogeny tab has been clicked, add this div for the tree
      // if placed in startup, will throw an error after navigating away from the page without a refresh
      // for some reason we lose the references for the child nodes of treeDiv
      if (document.getElementById(this.id + 'tree-container')) {
        // remove all child nodes and add them again when doing basic navigation without reloading the page
        var currTree = document.getElementById(this.id + 'tree-container');
        var child = currTree.lastElementChild;
        while (child) {
          currTree.removeChild(child);
          child = currTree.lastElementChild;
        }
        domConstruct.destroy('iconBanner');
        domConstruct.destroy('taxonBanner');
      } else {
        this.treeDiv = domConstruct.create('div', { id: this.id + 'tree-container', class: 'size archaeopteryxClass' }, this.containerPane.domNode);
      }
      domConstruct.create('div', { id: 'phylogram1' }, this.treeDiv);
      domConstruct.create('div', { id: 'controls0', class: 'ui-widget-content' }, this.treeDiv);
      domConstruct.create('div', { id: 'controls1', class: 'ui-widget-content' }, this.treeDiv);

      // when the json file updates, update the phyloxml_date variable
      // when the same string is used it returns the cached file
      // when the string is updated it will query the server for the updated file
      request.get('https://www.bv-brc.org/api/content/bvbrc_phylogeny_tab/taxon_tree_dict.json?version=' + this.phyloxml_date).then(lang.hitch(this, function (text_data) {
        var data = JSON.parse(text_data);
        this.processPhyloxml(taxonId.toString(), data);
      }), lang.hitch(this, function (err) {
        this.noData();
        console.log('Error Retreiving newick for Taxon: ', err);
      }));
    },

    processPhyloxml: function (taxonId, data) {
      if (!Object.keys(data).includes(taxonId)) {
        this.noData();
        console.log('Error Retreiving newick for Taxon: ', taxonId);
      } else {
        var phyloxml_file = data[taxonId];
        phyloxml_file = 'https://www.bv-brc.org/api/content/bvbrc_phylogeny_tab/phyloxml/' + phyloxml_file + '?version=' + this.phyloxml_date;
        request.get(phyloxml_file).then(lang.hitch(this, function (phyloxml) {
          /*
          <div name="overview" class="infobox iconbox infobutton dialoginfo">
          <i class="fa icon-info-circle fa" title="click to open info dialog"></i>
        </div>
          */
          var iconDiv = domConstruct.create('div', {
            id: 'iconBanner',
            name: 'overview',
            class: 'infobox iconbox infobutton dialoginfo',
            innerHTML: '<i class="fa icon-info-circle fa" title="click to open info dialog"></i>'
          });
          var file_parts = phyloxml_file.split('/').reverse()[0].split('_');
          var taxon_level = file_parts[2];
          var taxon_name = file_parts[0];
          var phylo_title = 'GTDB Reference Phylogeny for ' + taxon_level + ': ' + taxon_name;
          var taxonDiv = domConstruct.create('div', {
            id: 'taxonBanner',
            style: 'padding-top: 20px;padding-left: 5px',
            innerHTML: '<h5>' + phylo_title + '</h5>'
          });
          // this.containerActionBar.set('value', '<p>'+phyloxml_file+'</p>');
          // this.containerActionBar.set('innerHTML', cabDiv);
          domConstruct.place(iconDiv, this.containerActionBar.domNode, 'last');
          domConstruct.place(taxonDiv, this.containerActionBar.domNode, 'last');
          var mytree;

          var options = this.options;
          var settings = this.settings;
          var nodeVisualizations = {};
          // var specialVisualizations = this.specialVisualizations;
          var nodeLabels = {};

          try {
            mytree = window.archaeopteryx.parsePhyloXML(phyloxml);
            var nodeListSize = this.getLeafNodes([mytree]).length;
            if (nodeListSize > 65 && nodeListSize <= 75) {
              options.externalNodeFontSize = 10;
            } else if (nodeListSize > 75) {
              options.externalNodeFontSize = 8;
            }

          }
          catch (e) {
            alert('error while parsing tree: ' + e);
          }
          var refs_set = forester.collectPropertyRefs(mytree, 'node', true);
          refs_set.forEach(function (a) {
            // console.log('refs_set a', a);
            var property_name = '';
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
          // forester.midpointRoot(mytree);
          if (mytree) {
            try {
              window.archaeopteryx.launch('#phylogram1', mytree, options, settings, nodeVisualizations, nodeLabels);

              var nodeList = this.getLeafNodes([mytree]);
              // console.log('mytree nodeList', nodeList);
              var ids = nodeList.map(function (node) { return node.name; });
              var pIDs = [];
              ids.forEach((id) => {
                pIDs.push(encodeURIComponent(id))
              });
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
            }
            catch (e) {
              alert('error while launching archaeopteryx: ' + e);
            }
          }
        }));
      }
    },

    updateTree: function () {
      if (!this.tree) {
        console.log('No tree to update');

      }
      // this.tree.update();
    },

    renderTree: function () {
      if (!this.newick) {
        console.log('No Newick File To Render');
        return;
      }
      console.log('D3: ', d3);
    },

    onFirstView: function () {
      this.updateTree();
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
      ], [
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
      ], [
        'ViewGenomeItemFromGenome',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          disabled: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          validContainerTypes: ['genome_data'],
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
      ],
      [
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
          validContainerTypes: ['genome_data', 'sequence_data', 'feature_data', 'spgene_data', 'sequence_data'],
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
        'AddGroup',
        'fa icon-object-group fa-2x',
        {
          label: 'GROUP',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          disabled: false,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['*']
        },
        function (selection, containerWidget) {
          // console.log("Add Items to Group", selection);
          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type = 'genome_group';

          if (!type) {
            console.error('Missing type for AddGroup');
            return;
          }
          var stg = new SelectionToGroup({
            selection: selection,
            type: type,
            idType: 'genome_id',
            path: null // set by type
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
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
        }, this);
      }
      this.selectionActions.forEach(function (a) {
        var cont = false;
        if (this.state && this.state.href.includes('WithGenomeNames.') && a[0] == 'IDSelection') {
          cont = true;
        }
        if (this.state && this.state.href.includes('WithGenomeNames.') && (a[0] == 'ViewGenomeItemFromGenome' || a[0] == 'ViewGenomeItems' || a[0] == 'AddGroup')) {
          a[2].disabled = true;
          this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, undefined), false, a[5]);
          cont = true;
        } else if (a[0] == 'ViewGenomeItemFromGenome' || a[0] == 'ViewGenomeItems' || a[0] == 'AddGroup') {
          a[2].disabled = false;
        }
        if (!cont) {
          this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
        }
      }, this);

    }

  });
});
