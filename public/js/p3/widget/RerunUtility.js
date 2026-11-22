define([], function () {
  return {
    // TODO: add modal
    rerun: function (job_params, service_id, window, Topic, targetWindow) {
      // make sure service_id variable is present for every service
      var sessionStorage = (targetWindow || window).sessionStorage;
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
        'Docking': 'Docking',
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
        'PredictStructure': 'PredictStructure',
        'StabiliNNator': 'StabiliNNator',
        'CodonTree': 'PhylogeneticTree',
        'PrimerDesign': 'PrimerDesign',
        'RNASeq': 'Rnaseq',
        'SubspeciesClassification': 'SubspeciesClassification',
        'SequenceSubmission': 'SequenceSubmission',
        'HASubtypeNumberingConversion': 'HASubtypeNumberingConversion',
        'TaxonomicClassification': 'TaxonomicClassification',
        'TnSeq': 'Tnseq',
        'TreeSort': 'TreeSort',
        'Variation': 'Variation',
        'ViralAssembly': 'ViralAssembly',
        'CoreGenomeMLST': 'CoreGenomeMLST',
        'WholeGenomeSNPAnalysis': 'WholeGenomeSNPAnalysis',
        'MobileElementDetection': 'MobileElementDetection'
      };

      // TODO: addin modal parameter

      var appName;
      if (service_id === 'GeneTree') {
        var job_data = JSON.parse(job_params);
        var tree_type = job_data['tree_type'];
        appName = service_app_map['GeneTree'][tree_type];
      }
      else if (service_app_map.hasOwnProperty(service_id)) {
        appName = service_app_map[service_id];
      }
      else {
        console.log('Rerun not enabled for: ', service_id);
        return;
      }

      var href = '/app/' + appName + '?rerun_key=' + rerun_key;
      if (targetWindow) {
        targetWindow.location.replace(new URL(href, window.location.href).href);
      } else {
        Topic.publish('/navigate', { href: href, target: 'blank' });
      }
    },

  };

});
