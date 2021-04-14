define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'jsmol/JSmol.min',
  'dijit/_WidgetBase',
  'dojo/_base/kernel'
], function (
  declare,
  lang,
  JSMol,
  WidgetBase,
  kernel
) {
  return declare([WidgetBase], {
    id: 'defaultId',
    className: 'ProteinStructure',
    // protein accession information
    accession: {},
    // ordered list of highlighters
    highlighters: [],
    // view type information, eg ball-and-stick, line with s
    displayType: {},
    // rock or spin with parameters
    effect: {},
    zoomLevel: 100,
    // JSMol makes a global Jmol object
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
      readyFunction: function (applet) {
        console.log('JSMOL readyFunction for applet is ' + applet);
      },
      zIndexBase: 1000,
    },
    constructor: function (opts) {
      console.log('ProteinStructure.constructor');
      opts = opts || {};
      lang.mixin(this, opts);
      console.log('ProteinStructure.constructor id=' + this.id);
      this.jmol.setDocument(0);
      var animFrameCallbackName = this.id + '_animFrameCallback';
      var loadStructCallbackName = this.id + '_loadStructCallback';
      console.log('loadStructCallback is ' + loadStructCallbackName);
      kernel.global[animFrameCallbackName] = lang.hitch(this, this.animFrameCallback);
      kernel.global[loadStructCallbackName] = lang.hitch(this, this.loadStructCallback);
      this.jmolInfo.animFrameCallback = animFrameCallbackName;
      this.jmolInfo.loadStructCallback = loadStructCallbackName;

      this.jsmol = this.jmol.getApplet(this.id + '_jsmolDisplay', this.jmolInfo);
      console.log('global is ' + kernel.global);
    },
    getViewerHTML: function () {
      return this.jmol.getAppletHtml(this.jsmol);
    },
    runScript: function (script) {
      console.log('running script: "' + script + '"');
      this.jmol.script(this.jsmol, script);
    },
    postCreate: function () {
      this.watch('accession', lang.hitch(this, this.onAccessionChange));
      this.watch('displayType', lang.hitch(this, this.updateDisplay));
      this.watch('effect', lang.hitch(this, this.setEffect));
      this.watch('zoomLevel', lang.hitch(this, this.setZoomLevel));
    },
    onAccessionChange: function (attr, oldValue, newValue) {
      if (oldValue.id != newValue.id) {
        this.highlighters = [];
        this.loadAccession(newValue.id);
        this.updateDisplay();
      }
    },
    updateDisplay: function () {
      console.log('updating displayType ' + this.displayType.id);
      var zoomLevel = this.get('zoomLevel');
      if (zoomLevel) {
        this.runScript('set zoomLarge FALSE; zoom ' + zoomLevel + ';');
      }
      if (this.displayType.script) {
        this.runScript(this.displayType.script.join(' '));
      }
      if (this.effect && this.effect.startScript) {
        this.runScript(this.effect.startScript);
      }
    },
    handleHighlighters: function () {
      // the old code did:
      // stop rocking
      // dehighlight
      // update view
      // highlight
      // start rocking
    },
    highlightItemToJmol: function (item) {
      var jmolCommand = [
        'select ' + item.position,
        'color ' + item.color
      ];
      if (item.mode) {
        jmolCommand.append(item.mode);
      }
      return jmolCommand;
    },
    // TODO this assumes loading from PDB
    loadAccession: function (accession) {
      this.runScript('load async "=' + accession + '"');
    },
    animFrameCallback: function (appletId, frameIndex, fileNumber, frameNumber) {
      console.log('JSMOL animFrameCallback called with frameIndex=' + frameIndex);
    },
    // TODO use this to notify other controls that the file is loaded. Pub/Sub?
    loadStructCallback: function (appletId, filePath, fileName, title, errorMessage, errorCode, frame, lastFrame) {
      console.log('JSMOL loadStructCallback ' + filePath + ' ' + (errorCode == 3 ? 'success' : 'failed'));
    },
    setEffect: function (attr, oldValue, newValue) {
      var script = '';
      if (oldValue && oldValue.stopScript) {
        script += oldValue.stopScript;
      }
      if (newValue && newValue.startScript) {
        script += newValue.startScript;
      }
      console.log('setting effect via script: ' + script);
      this.runScript(script);
    },
    setZoomLevel: function (attr, oldValue, newValue) {
      this.runScript('zoom ' + newValue + ';');
    }
  });
});
