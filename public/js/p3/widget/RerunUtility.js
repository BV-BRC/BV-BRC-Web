define([], function () {
  return {

    rerun: function (job_params, service_id, window, Topic) {
      // TODO: make sure service_id variable is present for every service
      var sessionStorage = window.sessionStorage;
      const random = (length = 8) => {
        return Math.random().toString(16).substr(2, length);
      };
      var rerun_key = random();
      if (sessionStorage.hasOwnProperty(rerun_key)) {
        sessionStorage.removeItem(rerun_key);
      }
      sessionStorage.setItem(rerun_key, job_params);
      var service_app_map = {
        'ComparativeSystems': 'ComparativeSystems',
        'ComprehensiveGenomeAnalysis': 'ComprehensiveGenomeAnalysis',
        'ComprehensiveSARS2Analysis': 'ComprehensiveSARS2Analysis',
        // 'DifferentialExpression': 'Expression',
        'FastqUtils': 'FastqUtil',
        // 'GeneTree': 'GeneTree',
        'GenomeAssembly2': 'Assembly2',
        'GenomeAssembly': 'Assembly2',
        'GenomeAlignment': 'GenomeAlignment',
        // TODO: rerun for annotation needs to be updated
        'GenomeAnnotation': 'Annotation',
        // 'GenomeComparison': 'SeqComparison',
        // 'Homology': 'Homology',
        // 'MetaCATS': 'MetaCATS',
        // 'MetagenomeBinning': 'MetagenomicBinning',
        // 'MetagenomicReadMapping': 'MetagenomicReadMapping',
        // 'MSA': 'MSA',
        'CodonTree': 'PhylogeneticTree',
        // TODO: need to fix this
        // 'PhylogeneticTree': 'PhylogeneticTree',
        // 'PrimerDesign': 'PrimerDesign',
        'RNASeq': 'Rnaseq',
        // 'SubspeciesClassification': 'SubspeciesClassification',
        // 'TaxonomicClassification': 'TaxonomicClassification',
        // 'TnSeq': 'Tnseq',
        // 'Variation': 'Variation'
      };
      if (service_app_map.hasOwnProperty(service_id)) {
        Topic.publish('/navigate', { href: '/app/' + service_app_map[service_id] + '?rerun_key=' + rerun_key });
      }
      else {
        console.log('Rerun not enabled for: ', service_id);
      }
    },

  };

});
