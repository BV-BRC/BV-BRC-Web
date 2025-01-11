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
  'dojo/request',
  'molstar/mol-bvbrc/index',
  'xstyle/css!molstar/mol-bvbrc/molstar.css'
], function (
  declare,
  lang,
  WidgetBase,
  kernel,
  ProteinStructureState,
  WS,
  Deferred,
  xhr
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
    existingPositions: new Map(),
    structureServer: 'https://www.bv-brc.org/structure',
    constructor: function (opts) {
      // console.log('ProteinStructure.constructor');
      opts = opts || {};
      lang.mixin(this, opts);
      this.molstarSpecs = lang.mixin(this.molstarSpecs, opts.molstarSpecs || {});

      console.log('ProteinStructure.constructor id=' + this.id);

      this.watch('viewState', lang.hitch(this, async function (attr, oldValue, newValue) {
        // Initialize molstar for the first time
        if (!this.isMolstarInitialized) {
          await this.molstar.init('app', this.molstarSpecs);
          this.isMolstarInitialized = true;
        }
        newValue.watch('highlights', lang.hitch(this, function (attr, oldValue, newValue) {
          this.updateDisplay();
        }));
        const oldAccession = oldValue.get('accession', []);
        const newAccession = newValue.get('accession', []);
        const isMultiple = Array.isArray(newAccession);
        if (isMultiple && (oldAccession.length != newAccession.length)) {
          this.updateAccession(newValue.get('accession'));
        } else if (oldAccession.pdb_id != newAccession.pdb_id) {{
          this.updateAccession([newValue.get('accession')]);
        }} else if (oldValue.get('workspacePath') != newValue.get('workspacePath')) {
          this.loadFromWorkspace(newValue.get('workspacePath'));
        }
      }));
    },
    updateAccession: function (accessionInfo) {
      this.highlighters = [];
      this.loadAccession(accessionInfo);
      this.updateDisplay();
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
          const index = highlightPositions.get('index');
          const coordinates = highlightPositions.get('coordinates');
          if (coordinates && typeof index !== 'undefined') {
            let featurePositions = [];
            for (let [pos, color] of coordinates) {
              featurePositions.push({seq: pos, index: index, color: this.colorToMolStarColor(color)});
            }

            const highlightIndex = highlightName + index;
            this.existingPositions.set(highlightIndex, featurePositions);
            for (let key of this.existingPositions.keys()) {
              if (key.includes(highlightName) && key !== highlightIndex) {
                featurePositions = featurePositions.concat(this.existingPositions.get(key));
              }
            }

            positions = positions.concat(featurePositions);
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
    loadAccession: async function (accessions) {
      if (accessions) {
        let selections = [];
        // accessionInfo.map(a => a.pdb_id)
        for (let accession of accessions) {
          // Check if it is a predicted structure and has valid file path
          if (accession.method.includes('Predicted') && accession.file_path) {
            // Create api path for the content
            const path = `${this.structureServer}/${accession.file_path}`;
            const response = await Promise.all(
              [xhr.get(path).then(res => res).catch(e => e)]
            );

            const responseContent = response[0];
            if (accession.file_path.includes('alphafold')) {
              // Check if alphafold file exists, otherwise use alphafold database
              if (!(responseContent instanceof Error)) {
                const url = path.endsWith('.gz') ? path.slice(0, -3) : path;
                selections.push({
                  value: url,
                  source: 'url',
                  label: `${accession.pdb_id} | ${accession.title}`
                });
              } else {
                selections.push({
                  value: accession.uniprotkb_accession[0],
                  source: 'alphafold'
                });
              }
            } else  {
              if (!(responseContent instanceof Error)) {
                selections.push({
                  value: path,
                  source: 'url',
                  format: 'pdb',
                  label: `${accession.pdb_id} | ${accession.title}`
                });
              } else {
                selections.push({
                  value: accession.pdb_id,
                  source: 'pdb'
                });
              }
            }
          } else {
            selections.push({
              value: accession.pdb_id,
              source: 'pdb'
            });
          }
        }

        this.molstar.load({ selections, displaySpikeSequence: true });
      }
    },
    loadFromWorkspace: function (workspacePath) {
      let _self = this;
      Deferred.when(WS.getDownloadUrls(workspacePath), function (url) {
        if (url && url.length > 0 && url[0] !== null) {
          const fileName = url[0].match(/\/([^\/]+)\/?$/)[1];
          _self.molstar.load({
            selections: [{value: url[0], source: 'url', format: 'pdb', label: fileName}],
            displaySpikeSequence: true
          });
        }
      });
    }
  });
});
