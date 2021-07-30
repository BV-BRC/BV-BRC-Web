define([
  'dojo/_base/declare', 'phyloxml/phyloxml', 'archaeopteryx/archaeopteryx-js/archaeopteryx',
  'dijit/_WidgetBase', 'dojo/request', 'dojo/dom-construct', 'dojo/_base/lang',
  'dojo/dom-geometry', 'dojo/dom-style', 'd3/d3', '../util/PathJoin',
  'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/form/Button',
  'dijit/MenuItem', 'dijit/TooltipDialog', 'dijit/popup', './SelectionToGroup',
  'dijit/Dialog', './ItemDetailPanel', 'dojo/query', 'FileSaver',
  './ActionBar', './ContainerActionBar', 'dijit/layout/BorderContainer', './PerspectiveToolTip',
  'dijit/layout/ContentPane', 'dojo/dom-class', 'dojo/on', 'dojo/topic',
  'dojo/text!./templates/Phylogeny2.html', 'dijit/_TemplatedMixin'
], function (
  declare, phyloxml, archaeopteryx,
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
    jsonTree: null,
    tree: null,
    apiServer: window.App.dataAPI,
    phylogram: true,
    containerType: 'genome_data',
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'user_guides/organisms_taxon/phylogeny.html',
    selection: null,
    tooltip: 'The "Phylogeny" tab provides order or genus level phylogenetic tree, constructed using core protein families',
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.containerPane = new ContentPane({ region: 'center' });// domConstruct.create("div", {id: this.id + "_canvas"}, this.domNode);
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
      this.addChild(this.containerPane);
      // this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();
      this.treeDiv = domConstruct.create('div', {class: 'size archaeopteryxClass', id: this.id + 'tree-container' }, this.containerPane.domNode);
 	  this.treeDiv1 = domConstruct.create('div', {id: 'phylogram1' }, this.treeDiv);
  	  this.treeDiv2 = domConstruct.create('div', {id: 'controls0' }, this.treeDiv);
 	  this.treeDiv3 = domConstruct.create('div', {id: 'controls1' }, this.treeDiv);

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('newickxml', lang.hitch(this, 'processTree'));
      this.watch('selection', lang.hitch(this, 'onSelection'));
    },
    
    onSetState: function (attr, oldVal, state) {
      // this.treeDiv.innerHTML= "Loading...";
      console.log('Phylogeny onSetState: ', state);
      if (!state) {
        return;
      }
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
      this.set('idType', idType);
      this.set('fileType', fileType);
      this.set('newickxml', treeDat.tree);
    },

    processTree: function () {
		console.log('this', this);
		console.log('this.newickxml', this.newickxml);
		console.log('processTree this.fileType', this.fileType);

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
		options.showInternalLabels = false;
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

		var settings = {};
		settings.border = '1px solid #909090';
		settings.controls0Top = 10;
		settings.controlsBackgroundColor = '#e0e0e0';
		settings.controlsFont = ['Arial', 'Helvetica', 'Times'];
		settings.controlsFontColor = '#505050';
		settings.controlsFontSize = 8;
		settings.enableDownloads = true;
		settings.enableBranchVisualizations = false;
		settings.enableCollapseByBranchLenghts = false;
		settings.enableCollapseByFeature = false;
		settings.enableNodeVisualizations = false;
		settings.nhExportWriteConfidences = true;
		settings.rootOffset = 180;

		var nodeVisualizations = {};
		var specialVisualizations = {};		
      
      if (!this.newickxml) {
        console.log('No Newick or xml File To Render');
        return;
      }
      var mytree;
	  try {
		// console.log('this.fileType', this.fileType);
	  	if (this.fileType == 'phyloxml') {
			mytree = window.archaeopteryx.parsePhyloXML(this.newickxml);  	
	  	} 
	  	else {
	  		mytree = window.archaeopteryx.parseNewHampshire(this.newickxml,true,false);
	  	}
		console.log('in try tree this.newickxml', this.newickxml);
		console.log('mytree', mytree);
	  }
	  catch (e) {
		alert('error while parsing tree: ' + e);
	  }
	  if (mytree) {
		try {
		  window.archaeopteryx.launch('#phylogram1', mytree, options, settings, nodeVisualizations, specialVisualizations);
		}
		catch (e) {
		  alert('error while launching archaeopteryx: ' + e);
		}
	  }         
    }
  });
});
