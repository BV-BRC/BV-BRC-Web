define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_WidgetsInTemplateMixin', 'dijit/_TemplatedMixin',
  'dojo/_base/lang', 'dojo/request', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/dom-class', 'dojo/on',
  'dojo/text!./templates/PhylogenyVirus.html', './PhylogenyTreeCards', './outbreaks/OutbreaksPhylogenyTreeViewer',
  './ActionBar', '../util/PathJoin'
], function (
  declare, _WidgetBase, _WidgetsInTemplateMixin, _TemplatedMixin,
  lang, request, domConstruct, domStyle, domClass, on,
  template, PhylogenyTreeCards, OutbreaksPhylogenyTreeViewer,
  ActionBar, PathJoin
) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    state: null,
    _data: null,
    _cards: null,
    containerType: 'virus_phylogeny',
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_taxon/phylogeny.html',

    postCreate: function () {
      this.inherited(arguments);
      this._ensureCards();
      this._setupActionBar();
    },

    _setupActionBar: function () {
      this.selectionActionBar = new ActionBar({
        style: 'width:56px; text-align:center;',
        currentContainerWidget: this
      });
      domConstruct.place(this.selectionActionBar.domNode, this.actionBarHostNode);
      this.selectionActionBar.startup();
      this._setupActions();
    },

    _setupActions: function () {
      this.selectionActionBar.addAction(
        'UserGuide',
        'fa icon-info-circle fa-2x',
        {
          label: 'GUIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Open User Guide in a new Tab'
        },
        lang.hitch(this, function () {
          window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
        }),
        true
      );

      // DWNLD — shown only when the active tree has an associated metadata file.
      // Starts hidden (enabled=false); _openViewer toggles visibility.
      this.selectionActionBar.addAction(
        'DownloadMetadata',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Download metadata for this tree'
        },
        lang.hitch(this, function () {
          if (this._currentMetadataUrl) {
            window.open(this._currentMetadataUrl, '_blank');
          }
        }),
        false  // hidden until a tree with metadata is opened
      );
    },

    destroy: function () {
      if (this._cards) {
        this._cards.destroyRecursive();
        this._cards = null;
      }
      if (this._nextstrainIframe) {
        domConstruct.destroy(this._nextstrainIframe);
        this._nextstrainIframe = null;
      }
      if (this._nextstrainContainer) {
        domConstruct.destroy(this._nextstrainContainer);
        this._nextstrainContainer = null;
      }
      this._data = null;
      this.inherited(arguments);
    },

    _ensureCards: function () {
      if (this._cards) {
        return;
      }

      const node = domConstruct.create('div', {}, this.cardsHostNode);
      this._cards = new PhylogenyTreeCards({}, node);
      this._cards.startup();

      // listen to selections
      this._cards.onSelectTree = lang.hitch(this, function (payload) {
        this._openViewer(payload);
      });
    },

    setTreeData: function (taxonBlock) {
      this._ensureCards();
      this._cards.setTreeData(taxonBlock);
      this._showCards();
    },

    _showCards: function () {
      this.cardsHostNode.style.display = '';
      this.viewerPaneNode.style.display = 'none';
      // Clear metadata state and hide DWNLD button
      this._currentMetadataUrl = null;
      if (this.selectionActionBar && this.selectionActionBar._actions.DownloadMetadata) {
        domClass.add(this.selectionActionBar._actions.DownloadMetadata.button, 'dijitHidden');
      }
    },

    _showViewer: function () {
      this.cardsHostNode.style.display = 'none';
      this.viewerPaneNode.style.display = '';
    },

    _openViewer: function (payload) {
      // payload: { url, name, groupTitle, section, metadata }
      const title = payload.groupTitle
        ? payload.groupTitle + ' — ' + payload.name
        : payload.name;

      this.viewerTitleNode.textContent = title;

      // Show DWNLD button only when this tree has a metadata file
      this._currentMetadataUrl = payload.metadata || null;
      if (this.selectionActionBar && this.selectionActionBar._actions.DownloadMetadata) {
        var dlBtn = this.selectionActionBar._actions.DownloadMetadata.button;
        domClass.toggle(dlBtn, 'dijitHidden', !this._currentMetadataUrl);
      }

      var isNextstrain = payload.section === 'Nextstrain';
      this.actionBarHostNode.style.display = isNextstrain ? 'none' : '';

      if (isNextstrain) {
        this._hideArchaeopteryxViewer();
        this._openNextstrainViewer(payload.url);
      } else {
        this._hideNextstrainViewer();
        this._ensureViewer();
        this._viewer.loadTree(payload.url);
        domStyle.set(this.viewerHostNode, 'display', '');
      }

      this._showViewer();
    },

    // ── Nextstrain iframe viewer ──────────────────────────────────────────

    _openNextstrainViewer: function (url) {
      // Remove old iframe if it exists (src may differ)
      if (this._nextstrainIframe) {
        domConstruct.destroy(this._nextstrainIframe);
        this._nextstrainIframe = null;
      }

      domStyle.set(this.viewerHostNode, 'display', 'none');

      if (!this._nextstrainContainer) {
        this._nextstrainContainer = domConstruct.create('div', {}, this.viewerContentNode);
      }

      domStyle.set(this._nextstrainContainer, {
        width: '100%',
        height: 'calc(100vh - 200px)',
        minHeight: '400px',
        overflow: 'hidden'
      });

      this._nextstrainIframe = domConstruct.create('iframe', {
        src: '/nextstrain-viewer/' + url,
        style: 'width:100%; height:100%; border:none; display:block;'
      }, this._nextstrainContainer);

      domStyle.set(this._nextstrainContainer, 'display', '');
    },

    _hideNextstrainViewer: function () {
      if (this._nextstrainContainer) {
        domStyle.set(this._nextstrainContainer, 'display', 'none');
      }
    },

    _hideArchaeopteryxViewer: function () {
      domStyle.set(this.viewerHostNode, 'display', 'none');
    },

    _ensureViewer: function () {
      if (this._viewer) {
        return;
      }

      let options = {};
      options.minBranchLengthValueToShow = 0.001;
      options.minConfidenceValueToShow = 50;
      options.initialLabelColorVisualization = 'Year';
      options.initialNodeFillColorVisualization = 'Host';
      options.phylogram = true;
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showNodeVisualizations = true;
      options.showVisualizationsLegend = true;
      options.visualizationsLegendOrientation = 'vertical';
      options.visualizationsLegendXpos = 220;
      options.visualizationsLegendYpos = 30;

      let settings = {};
      settings.border = '1px solid #909090';
      settings.showSequenceButton = false;
      settings.controls0Left = 20;
      settings.controls1Width = 120;
      settings.rootOffset = 220;
      settings.controls0Top = 10;
      settings.controls1Top = 10;
      settings.enableDownloads = true;
      settings.enableDynamicSizing = true;
      settings.enableMsaResidueVisualizations = false;
      settings.enableCollapseByFeature = true;
      settings.enableNodeVisualizations = true;
      settings.enableBranchVisualizations = false;
      settings.nhExportWriteConfidences = true;
      settings.enableSubtreeDeletion = true;
      settings.showShortenNodeNamesButton = false;
      settings.showExternalLabelsButton = false;
      settings.showInternalLabelsButton = false;
      settings.showExternalNodesButton = false;
      settings.showInternalNodesButton = false;

      const decorator = 'vipr:';
      const nodeVisualizations = {};

      nodeVisualizations['Host'] = {
        label: 'Host',
        description: 'the host of the virus',
        field: null,
        cladeRef: decorator + 'Host',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Host_Group'] = {
        label: 'Host Group',
        description: 'the host group of the virus',
        field: null,
        cladeRef: decorator + 'Host_Group',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['Host_Group_Domestic_vs_Wild'] = {
        label: 'Host Group (Domestic vs Wild)',
        description: 'the host range of the virus',
        field: null,
        cladeRef: decorator + 'Host_Group_Domestic_vs_Wild',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['Region'] = {
        label: 'Region',
        description: 'the geographic region of the virus',
        field: null,
        cladeRef: decorator + 'Region',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20c',
        sizes: null
      };

      nodeVisualizations['Country'] = {
        label: 'Country',
        description: 'the country of the virus',
        field: null,
        cladeRef: decorator + 'Country',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['State'] = {
        label: 'State',
        description: 'the state',
        field: null,
        cladeRef: decorator + 'State',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Year'] = {
        label: 'Year',
        description: 'the year of the virus',
        field: null,
        cladeRef: decorator + 'Year',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50c',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      nodeVisualizations['Subtype'] = {
        label: 'Subtype',
        description: 'the sub type of the virus',
        field: null,
        cladeRef: decorator + 'Subtype',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      const nodeLabels = {};

      nodeLabels['Host'] = {
        label: 'Host',
        description: 'to use the host as part of node names',
        propertyRef: 'vipr:Host',
        selected: false,
        showButton: true
      };

      nodeLabels['Host_Group'] = {
        label: 'Host Group',
        description: 'to use the host range as part of node names',
        propertyRef: 'vipr:Host_Group',
        selected: false,
        showButton: true
      };

      nodeLabels['Host_Group_Domestic_vs_Wild'] = {
        label: 'Host Group (Dom vs Wild)',
        description: 'to use the host group (domestic vs wild) as part of node names',
        propertyRef: 'vipr:Host_Group_Domestic_vs_Wild',
        selected: false,
        showButton: true
      };

      nodeLabels['Region'] = {
        label: 'Region',
        description: 'to use the region as part of node names',
        propertyRef: 'vipr:Region',
        selected: false,
        showButton: true
      };

      nodeLabels['Country'] = {
        label: 'Country',
        description: 'to use the country as part of node names',
        propertyRef: 'vipr:Country',
        selected: false,
        showButton: true
      };

      nodeLabels['State'] = {
        label: 'State',
        description: 'to use the state as part of node names',
        propertyRef: 'vipr:State',
        selected: false,
        showButton: true
      };

      nodeLabels['Year'] = {
        label: 'Year',
        description: 'to use the year as part of node names',
        propertyRef: 'vipr:Year',
        selected: false,
        showButton: true
      };

      nodeLabels['Subtype'] = {
        label: 'Subtype',
        description: 'to use the subtype as part of node names',
        propertyRef: 'vipr:Subtype',
        selected: false,
        showButton: true
      };

      this._viewer = new OutbreaksPhylogenyTreeViewer({
        id: this.id + '_inlinePhyloViewer',
        mode: 'reuse',
        settings: settings,
        options: options,
        nodeVisualizations: nodeVisualizations,
        specialVisualizations: nodeLabels
      }, domConstruct.create('div', {}, this.viewerHostNode));

      this._viewer.startup();
    },

  });
});