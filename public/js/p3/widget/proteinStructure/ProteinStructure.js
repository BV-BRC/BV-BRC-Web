/**
 * Used for interacting with a JMol javascript viewer.
 *
 * use getViewerHTML() to get the viewer display
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'jsmol/JSmol.min',
  'dijit/_WidgetBase',
  'dojo/_base/kernel',
  './ProteinStructureState',
], function (
  declare,
  lang,
  JSMol,
  WidgetBase,
  kernel,
  ProteinStructureState
) {
  return declare([WidgetBase], {
    id: 'defaultId',
    className: 'ProteinStructure',
    viewState: new ProteinStructureState({}),
    // JSMol makes a global Jmol object
    // eslint-disable-next-line no-undef
    jmol: Jmol,
    jmolInfo: {
      use: 'HTML5',
      height: '100%',
      width: '100%',
      j2sPath: '/js/jsmol/j2s',
      deferApplet: false,
      src: '',
      // this seems to be necessary to make the applet not defer loading until clicked
      coverImage: '/patric/images/bv-brc/ird-vipr-logo.png',
      readyFunction: lang.hitch(this, function (applet) {
        // console.log('JMOL readyFunction called for applet  ' + applet._id);
      }),
      zIndexBase: 1000,
    },
    constructor: function (opts) {
      // console.log('ProteinStructure.constructor');
      opts = opts || {};
      lang.mixin(this, opts);
      console.log('ProteinStructure.constructor id=' + this.id);
      // don't create HTML for the viewer
      this.jmol.setDocument(0);

      // JMOL callbacks are function names rather than the functions themselves
      // TODO it may be possible to set the evaluation scope for these callback names
      var animFrameCallbackName = this.id + '_animFrameCallback';
      var loadStructCallbackName = this.id + '_loadStructCallback';
      kernel.global[animFrameCallbackName] = lang.hitch(this, this.animFrameCallback);
      kernel.global[loadStructCallbackName] = lang.hitch(this, this.loadStructCallback);
      this.jmolInfo.animFrameCallback = animFrameCallbackName;
      this.jmolInfo.loadStructCallback = loadStructCallbackName;

      this.jsmol = this.jmol.getApplet(this.id + '_jsmolDisplay', this.jmolInfo);
      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        // console.log('JMOL updating viewState from ' + JSON.stringify(oldValue) + ' to ' + JSON.stringify(newValue));
        newValue.watch('accession', lang.hitch(this, this.onAccessionChange));
        newValue.watch('displayType', lang.hitch(this, this.updateDisplay));
        newValue.watch('effect', lang.hitch(this, this.setEffect));
        newValue.watch('zoomLevel', lang.hitch(this, this.setZoomLevel));
        newValue.watch('highlights', lang.hitch(this, function (attr, oldValue, newValue) {
          this.updateDisplay();
        }));
        if (oldValue.get('accession', {}).id != newValue.get('accession', {}).id) {
          this.updateAccession(newValue.get('accession'));
        }
      }));
    },
    getViewerHTML: function () {
      return this.jmol.getAppletHtml(this.jsmol);
    },
    runScript: function (script) {
      // console.log('JMOL running script: "' + script + '"');
      this.jmol.script(this.jsmol, script);
    },
    updateAccession: function (accessionInfo) {
      this.highlighters = [];
      this.loadAccession(accessionInfo.id);
      this.updateDisplay();
    },
    onAccessionChange: function (attr, oldValue, newValue) {
      // console.log('JMOL accession changed to ' + JSON.stringify(newValue));
      if (newValue && newValue.id &&  (oldValue.id != newValue.id)) {
        this.updateAccession(newValue);
      }
    },
    updateDisplay: function () {
      let displayType = this.viewState.get('displayType');
      // console.log('JMOL updating displayType to ' + displayType.id);
      this.stopEffect();
      var zoomLevel = this.viewState.get('zoomLevel');
      if (zoomLevel) {
        this.runScript('set zoomLarge FALSE; zoom ' + zoomLevel + ';');
      }
      if (displayType.script) {
        // console.log('JMOL displayType.script ' + JSON.stringify(displayType.script));
        this.runScript(displayType.script);
      }
      const highlights = this.get('viewState').get('highlights');
      this.handleHighlight('highlights', highlights, highlights);
      this.startEffect();
    },
    stopEffect: function () {
      const effect = this.viewState.get('effect', {});
      if (effect.stopScript) {
        this.runScript(effect.stopScript);
      }
    },
    startEffect: function () {
      const effect = this.viewState.get('effect', {});
      if (effect.startScript) {
        this.runScript(effect.startScript);
      }
    },
    // TODO block changes until script is run
    handleHighlight: function (attr, oldValue, newValue) {
      // console.log('old positions ' + oldValue + ' new positions ' + newValue);
      const script = [];
      /* eslint-disable-next-line no-unused-vars */
      for (let [highlightName, highlightPositions] of newValue) {
        for (let [pos, color] of highlightPositions) {
          script.push('select ' + pos + ';');
          script.push('color ' + this.colorToJmolColor(color) + ';');
        }
      }
      if (script.length > 0) {
        this.runScript(script.join(''));
      }
    },
    colorToJmolColor: function (hexColor) {
      return '[' + hexColor.replace('#', 'x') + ']';
    },
    // TODO this assumes loading from PDB
    loadAccession: function (accession) {
      if (accession) {
        this.runScript('load async "=' + accession + '"');
      }
    },
    animFrameCallback: function (appletId, frameIndex, fileNumber, frameNumber) {
      // console.log('JMOL animFrameCallback called with frameIndex=' + frameIndex);
    },
    // TODO use this to notify other controls that the file is loaded. Pub/Sub?
    loadStructCallback: function (appletId, filePath, fileName, title, errorMessage, errorCode, frame, lastFrame) {
      // console.log('JMOL loadStructCallback ' + filePath + ' ' + (errorCode == 3 ? 'success' : 'failed'));
    },
    setEffect: function (attr, oldValue, newValue) {
      var script = '';
      if (oldValue && oldValue.stopScript) {
        script += oldValue.stopScript;
      }
      if (newValue && newValue.startScript) {
        script += newValue.startScript;
      }
      // console.log('JMOL setting effect via script: ' + script);
      this.runScript(script);
    },
    setZoomLevel: function (attr, oldValue, newValue) {
      // console.log('JMOL zoomLevel changed from %s to %s', oldValue, newValue);
      this.stopEffect();
      this.runScript('zoom ' + newValue + ';');
      this.startEffect();
    }
  });
});
