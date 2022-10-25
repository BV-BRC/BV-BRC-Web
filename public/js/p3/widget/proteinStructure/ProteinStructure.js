/**
 * Used for interacting with a JMol javascript viewer.
 *
 * use getViewerHTML() to get the viewer display
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dojo/_base/kernel',
  './ProteinStructureState',
  '../../WorkspaceManager',
  'dojo/_base/Deferred',
  'molstar/mol-bvbrc/index'
], function (
  declare,
  lang,
  WidgetBase,
  kernel,
  ProteinStructureState,
  WS,
  Deferred
) {
  return declare([WidgetBase], {
    id: 'defaultId',
    className: 'ProteinStructure',
    viewState: new ProteinStructureState({}),
    // eslint-disable-next-line no-undef
    molstar: BVBRCMolStarWrapper,
    molstarSpecs: {
      layout: {
        initial: {
          isExpanded: true,
          showControls: true,
          regionState: {
            bottom: 'hidden',
            left: 'hidden',
            right: 'collapsed',
            top: 'full'
          }
        }
      },
      components: {
        remoteState: 'none'
      }
    },
    isMolstarInitialized: false,
    constructor: function (opts) {
      // console.log('ProteinStructure.constructor');
      opts = opts || {};
      lang.mixin(this, opts);
      this.molstarSpecs = lang.mixin(this.molstarSpecs, opts.molstarSpecs || {});

      console.log('ProteinStructure.constructor id=' + this.id);

      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        // Initialize molstar for the first time
        if (!this.isMolstarInitialized) {
          this.molstar.init('app', this.molstarSpecs);
          this.isMolstarInitialized = true;
        }
        newValue.watch('workspacePath', lang.hitch(this, this.loadFromWorkspace));
        newValue.watch('accession', lang.hitch(this, this.onAccessionChange));
        newValue.watch('displayType', lang.hitch(this, this.updateDisplay));
        newValue.watch('highlights', lang.hitch(this, function (attr, oldValue, newValue) {
          this.updateDisplay();
        }));
        if (oldValue.get('accession', {}).pdb_id != newValue.get('accession', {}).pdb_id) {
          this.updateAccession(newValue.get('accession'));
        } else if (oldValue.get('workspacePath') != newValue.get('workspacePath')) {
          this.loadFromWorkspace(newValue.get('workspacePath'));
        }
      }));
    },
    updateAccession: function (accessionInfo) {
      this.highlighters = [];
      this.loadAccession(accessionInfo.pdb_id);
      this.updateDisplay();
    },
    onAccessionChange: function (attr, oldValue, newValue) {
      // console.log('JMOL accession changed to ' + JSON.stringify(newValue));
      if (newValue && newValue.pdb_id &&  (oldValue.pdb_id != newValue.pdb_id)) {
        this.updateAccession(newValue);
      }
    },
    updateDisplay: function () {
      const highlights = this.get('viewState').get('highlights');
      this.handleHighlight('highlights', highlights, highlights);
    },
    // TODO block changes until script is run
    handleHighlight: function (attr, oldValue, newValue) {
      // console.log('old positions ' + oldValue + ' new positions ' + newValue);

      let positions = [], ligandColor = '';
      /* eslint-disable-next-line no-unused-vars */
      for (let [highlightName, highlightPositions] of newValue) {
        if (highlightName === 'ligands') {
          const color = highlightPositions.get('ligand');
          if (color) {
            ligandColor = this.colorToMolStarColor(color);
          }
        } else {
          for (let [pos, color] of highlightPositions) {
            positions.push({ seq: pos, color: this.colorToMolStarColor(color) });
          }
        }
      }

      if (positions.length > 0 || ligandColor != '') {
        // No need to clear the canvas as new overpaint will take care of it
        this.molstar.coloring.clearOverPaint(false);
        this.molstar.coloring.applyOverPaint(positions, ligandColor);
        // this.molstar.coloring.applyHeatMap('/js/molstar/mol-bvbrc/pdb1jsd.ent.r4s');
      } else {
        // Clear the canvas as there is no overpaint to apply
        this.molstar.coloring.clearOverPaint(true);
      }
    },
    colorToMolStarColor: function (hexColor) {
      return parseInt(hexColor.replace('#', '0x'), 16);
    },
    // TODO this assumes loading from PDB
    loadAccession: function (accession) {
      if (accession) {
        const urlEbi = 'https://www.ebi.ac.uk/pdbe/static/entry/' + accession.toLowerCase() + '_updated.cif';
        this.molstar.load({ url: urlEbi, displaySpikeSequence: true });
      }
    },
    loadFromWorkspace: function (workspacePath) {
      let _self = this;
      Deferred.when(WS.getDownloadUrls(workspacePath), function (url) {
        if (url && url.length > 0 && url[0] !== null) {
          _self.molstar.load({url: url[0], format: 'pdb', displaySpikeSequence: true});
        }
      });
    }
  });
});
