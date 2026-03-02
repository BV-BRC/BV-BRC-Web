define.amd.jQuery = true;
define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dojo/request',
  'dojo/text!./OutbreaksPhylogenyTreeViewer.html'
], function (
  declare, WidgetBase, Templated, xhr,
  Template
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksPhylogenyTreeViewer',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    isLoaded: false,
    phyloxmlTreeURL: null,
    defaultOptions: {
      alignPhylogram: false, // We should launch with "regular" phylogram.
      branchDataFontSize: 9,
      defaultFont: ['Arial', 'Helvetica', 'Times'],
      initialNodeFillColorVisualization: 'PANGO VOC',
      minBranchLengthValueToShow: 0.000001,
      minConfidenceValueToShow: 50,
      phylogram: true, // We should launch with "regular" phylogram.
      showConfidenceValues: false,
      showExternalLabels: true,
      showNodeName: true,
      showLineage: false,  // NEW as of 1.8.7b1
      showMutations: false, // NEW as of 1.8.7b1
      showNodeVisualizations: true,
      showSequence: false, // Do not show "Sequence" upon launch.
      showSequenceAccession: true, // If user turns on "Sequence" display, accession will be shown.
      searchProperties: true,
      searchIsPartial: false,
      showBranchEvents: false,
      showVisualizationsLegend: true,
      visualizationsLegendOrientation: 'vertical',
      visualizationsLegendXpos: 160,
      visualizationsLegendYpos: 30
    },
    defaultSettings: {
      border: '1px solid #909090',
      controls0Top: 10,
      controls1Top: 10, // Should have both boxes in line.
      // displayHeight: 700,
      // displayWidth: 1200,
      enableAccessToDatabases: true,
      enableCollapseByFeature: false,
      enableDownloads: true,
      enableNodeVisualizations: true,
      enableDynamicSizing: true,
      enableSpecialVisualizations2: true,
      enableSpecialVisualizations3: true,
      enableSpecialVisualizations4: true,
      nhExportWriteConfidences: true,
      searchFieldWidth: '50px',
      collapseLabelWidth: '36px',
      textFieldHeight: '16px',
      showLineageButton: true,
      showMutationsButton: true,
      showShortenNodeNamesButton: false,
      showDynahideButton: false,
      showSearchPropertiesButton: true,
      dynamicallyAddNodeVisualizations: true,
      propertiesToIgnoreForNodeVisualization: ['AccessionNumber', 'Mutation']
    },
    nodeVisualizations: null,
    specialVisualizations: null,

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    },

    _setStateAttr: function () {
      if (!this.isLoaded) {
        this.loadOnce();
        this.isLoaded = true;
      }
    },

    loadOnce: function () {
      // show overlay
      this._setLoading('Downloading tree…', true);

      const options = {...this.defaultOptions, ...this.options};
      const settings = {
        ...this.defaultSettings, ...this.settings, ...{
          controls0: 'controls-' + this.id + '-0',
          controls1: 'controls-' + this.id + '-1'
        }
      };
      const nodeVisualizations = this.nodeVisualizations || {};
      const specialVisualizations = this.specialVisualizations || {};

      // Yield so overlay paints
      this.afterPaint(() => {
        xhr.get(this.phyloxmlTreeURL, { headers: { 'Cache-Control': 'max-age=1800' } }) // Set cache to 1 hour
          .then((data) => {
            this._setLoading('Parsing tree…', true);

            // Yield again before parse
            this.afterPaint(() => {
              let tree;
              try {
                tree = window.archaeopteryx.parsePhyloXML(data);
              } catch (e) {
                this._setLoading("", false);
                alert('Error while parsing tree: ' + e);
                return;
              }

              this._setLoading('Rendering tree…', true);

              if (tree) {
                // Yield again before launch
                this.afterPaint(() => {
                  try {
                    window.archaeopteryx.launch('#phylogramOutbreak-' + this.id, tree, options, settings, nodeVisualizations, specialVisualizations);

                    const loading = document.querySelector('.phyloLoading');
                    const widgets = document.querySelectorAll('.phylogram-outbreak-controls');

                    // Adjust widgets top value based on loading div
                    if (loading && widgets.length) {
                      const loadingHeight = loading.offsetHeight;

                      for (let widget of widgets) {
                        const currentTop = parseFloat(widget.style.top) || 0;
                        widget.style.top = (currentTop - loadingHeight) + 'px';
                        widget.style.display = 'block';
                      }
                    }
                  } catch (e) {
                    alert('Error while launching archaeopteryx: ' + e);
                  } finally {
                    this._setLoading("", false);
                  }
                });
              }
            });
          });
      });
    },

    // Helper: let browser paint UI updates before heavy work
    afterPaint: function (fn) {
      requestAnimationFrame(function () {
        setTimeout(fn, 0);
      });
    },

    _setLoading: function (text, show) {
      if (!this.loadingNode) return;
      this.loadingNode.style.display = show ? '' : 'none';
      const box = this.loadingNode.querySelector('.phyloLoadingBox');
      if (box && text) box.textContent = text;
    },

    // #TODO: Combine loadTree and loadOnce by introducing cache or reuse mode
    loadTree: function (phyloxmlTreeURL) {
      // No need to reload if the same tree is requested
      if (!phyloxmlTreeURL || this.phyloxmlTreeURL === phyloxmlTreeURL) {
        return;
      }

      this.phyloxmlTreeURL = phyloxmlTreeURL;

      // Clear old viewer contents
      if (this.phylogramNode) {
        this.phylogramNode.innerHTML = "";
      }

      // Clear control panels
      const c0 = document.getElementById('controls-' + this.id + '-0');
      const c1 = document.getElementById('controls-' + this.id + '-1');
      if (c0) c0.innerHTML = '';
      if (c1) c1.innerHTML = '';

      this.loadOnce();
    },
  });
});
