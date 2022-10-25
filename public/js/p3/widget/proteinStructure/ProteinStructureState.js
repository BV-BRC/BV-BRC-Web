/**
 * State of protein structure view
 */
define( [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Stateful',
], function (
  declare,
  lang,
  Stateful
) {
  return declare([Stateful], {
    /**
     * Current displayed structure
     * object attributes:
     *   id: PDB accession
     *   label: PDB accession
     *   description: description of protein
     */
    accession: {},
    /**
     * object describing style used to display structures.
     *  @see p3/resources/jsmol/display-types.json
     */
    displayType: {},
    /**
     * current zoomLevel percentage as a number.
     */
    zoomLevel: '',
    /** object describing current effect, rock or spin
     * object attributes:
     *   startScript: script as a string to run to apply effect
     *   stopScript: script as a string to run to de-apply effect
     */
    effect: {},
    /**
     * highlights to apply
     * highlight objects attributes:
     *   highlighterName to Map of
     *     pos: position as a string
     *     color: highlight color
     */
    highlights: new Map(),
    /**
     * Workspace path to fetch pdb file
     */
    workspacePath: null
  });
});
