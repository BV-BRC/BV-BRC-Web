define("p3/store/TranscriptomicsExperimentJsonRest", [
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'transcriptomics_experiment',
    idProperty: 'eid',
    facetFields: []
  });
});

