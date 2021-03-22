define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'jsmol/JSmol.min',
//  'jsmol/js/JSmol.full',
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
    // protein accession
    accession: {},
    // ordered list of highlighters
    highlighters: [],
    // view type, eg ball-and-stick, line, etc
    displayType: {},
    // rock or spin with parameters
    effectType: {},
    // JSMol makes a global Jmol object
    jmol: Jmol,
    jmolInfo: {
      use: 'HTML5',
      height: '100%',
      width: '100%',
      j2sPath: '/js/jsmol/j2s',
      deferApplet: false,
      src: '',
      //coverTitle: 'Loading accession ...',
      // this seems to be necessary to make the applet not defer loading
      coverImage: '/patric/images/bv-brc/ird-vipr-logo.png',
      readyFunction: function (applet) {
        console.log('JSMOL readyFunction for applet is ' + applet);
      },
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
      if (this.displayType.script) {
        this.runScript(this.displayType.script.join(' '));
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
    loadAccession: function (accession) {
      this.runScript('load async "=' + accession + '"');
    },
    animFrameCallback: function (appletId, frameIndex, fileNumber, frameNumber) {
      console.log('JSMOL animFrameCallback called with frameIndex=' + frameIndex);
    },
    loadStructCallback: function (appletId, filePath, fileName, title, errorMessage, errorCode, frame, lastFrame) {
      console.log('JSMOL loadStructCallback ' + filePath + ' ' + (errorCode == 3 ? 'success' : 'failed'));
    }
  });
});
