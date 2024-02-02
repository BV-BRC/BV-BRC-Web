define([], function () {
  return {
    // TODO: add modal
    rerun: function (job_params, service_id, window, Topic) {
      // make sure service_id variable is present for every service
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
        'CEIRRDataSubmission': 'CEIRRDataSubmission',
        'ComparativeSystems': 'ComparativeSystems',
        'ComprehensiveGenomeAnalysis': 'ComprehensiveGenomeAnalysis',
        'ComprehensiveSARS2Analysis': 'ComprehensiveSARS2Analysis',
        'DifferentialExpression': 'Expression',
        'FastqUtils': 'FastqUtil',
        'GeneTree': {
          'viral_genome': 'ViralGenomeTree',
          'gene': 'GeneTree'
        },
        'GenomeAssembly2': 'Assembly2',
        'GenomeAssembly': 'Assembly2',
        'GenomeAlignment': 'GenomeAlignment',
        'GenomeAnnotation': 'Annotation',
        'GenomeComparison': 'SeqComparison',
        'Homology': 'Homology',
        'MetaCATS': 'MetaCATS',
        'MetagenomeBinning': 'MetagenomicBinning',
        'MetagenomicReadMapping': 'MetagenomicReadMapping',
        'MSA': 'MSA',
        'CodonTree': 'PhylogeneticTree',
        'PrimerDesign': 'PrimerDesign',
        'RNASeq': 'Rnaseq',
        'SubspeciesClassification': 'SubspeciesClassification',
        'SequenceSubmission': 'SequenceSubmission',
        'HASubtypeNumberingConversion': 'HASubtypeNumberingConversion',
        'TaxonomicClassification': 'TaxonomicClassification',
        'TnSeq': 'Tnseq',
        'Variation': 'Variation'
      };

      // TODO: addin modal parameter

      if (service_id === 'GeneTree') {
        var job_data = JSON.parse(job_params);
        var tree_type = job_data['tree_type'];
        Topic.publish('/navigate', { href: '/app/' + service_app_map['GeneTree'][tree_type] + '?rerun_key=' + rerun_key, target: 'blank' });
      }
      else if (service_app_map.hasOwnProperty(service_id)) {
        Topic.publish('/navigate', { href: '/app/' + service_app_map[service_id] + '?rerun_key=' + rerun_key, target: 'blank' });
      }
      else {
        console.log('Rerun not enabled for: ', service_id);
      }
    },

  };

});
