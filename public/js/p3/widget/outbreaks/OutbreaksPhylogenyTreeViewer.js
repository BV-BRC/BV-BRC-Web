define.amd.jQuery = true;
define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dojo/request',
  'dojo/text!./OutbreaksPhylogenyTreeViewer.html', 'dojo/dom-geometry'
], function (
  declare, WidgetBase, Templated, xhr,
  Template, domGeometry
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksPhylogenyTreeViewer',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    isLoaded: false,
    phyloxmlTreeURL: null,
    defaultConfig: {
      enableAccessToDatabases: true,
      enableDownloads: true,
      enableVisualizations: true,
      enableDynamicSizing: true,
      nhExportWriteConfidences: true
    },
    config: null,

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

    resize: function (size) {
      // StackContainer passes the space below its tabs to resizable children.
      // A percentage height alone cannot cross its unsized wrapper element.
      var previousWidth = this.domNode.clientWidth;
      var previousHeight = this.domNode.clientHeight;
      if (size) {
        domGeometry.setMarginBox(this.domNode, size);
      }
      if (this.phylogramNode && this.phylogramNode.querySelector('svg') &&
          (previousWidth !== this.domNode.clientWidth || previousHeight !== this.domNode.clientHeight)) {
        // v3 exposes resizing through its window listener, not its viewer handle.
        // Defer until Dijit has finished laying out the surrounding panes.
        if (this._treeResizeTimer) {
          this._treeResizeTimer.remove();
        }
        this._treeResizeTimer = this.defer(function () {
          this._treeResizeTimer = null;
          window.dispatchEvent(new Event('resize'));
        });
      }
    },

    loadOnce: function () {
      // show overlay
      this._setLoading('Downloading tree…', true);

      const config = {...this.defaultConfig, ...this.config};

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
                    window.archaeopteryx.launch('#phylogramOutbreak-' + this.id, tree, config);
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
