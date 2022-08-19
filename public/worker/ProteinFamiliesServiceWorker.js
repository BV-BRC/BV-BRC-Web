
function parse_data(data, filter, family_genomes) {
  var genome_filter = filter;
  var mixed_genomes = []; // don't think this one needs to be used
  var present_genomes = [];
  var absent_genomes = [];
  Object.keys(genome_filter).forEach(function (genome) {
    if (genome_filter[genome].status == 2) {
      mixed_genomes.push(genome);
    }
    if (genome_filter[genome].status == 1) {
      absent_genomes.push(genome);
    }
    if (genome_filter[genome].status == 0) {
      present_genomes.push(genome);
    }
  });
  var parsed_data = {};
  parsed_data['plfam'] = {};
  parsed_data['pgfam'] = {};
  data.forEach(function (obj) {
    var family_type = obj['familyType'];
    var family_id = obj['family_id'];
    // loop over absent genomes: if a family_id contains an absent genome, don't add that family data
    var family_absent_genomes = family_genomes[family_type][family_id].filter(x => absent_genomes.includes(x));
    // var family_present_genomes = family_genomes[family_type][family_id].filter(x => present_genomes.includes(x));
    // const containsAll = (arr1, arr2) => arr2.every(arr2Item => arr1.includes(arr2Item));
    // const sameMembers = (arr1, arr2) => (containsAll(arr1, arr2) && containsAll(arr2, arr1));
    var has_all_present_genomes = present_genomes.every(pg => family_genomes[family_type][family_id].includes(pg));
    if (!has_all_present_genomes) {
      return;
    }
    if (family_absent_genomes.length == 0) {
      parsed_data[family_type][family_id] = {};
      // parsed_data[family_type][obj['family_id']]['id'] = obj['family_id'];
      parsed_data[family_type][obj['family_id']]['family_id'] = obj['family_id'];
      parsed_data[family_type][obj['family_id']]['aa_length_max'] = parseInt(obj['aa_length_max']);
      parsed_data[family_type][obj['family_id']]['aa_length_min'] = parseInt(obj['aa_length_min']);
      parsed_data[family_type][obj['family_id']]['aa_length_mean'] = parseFloat(obj['aa_length_mean']);
      parsed_data[family_type][obj['family_id']]['aa_length_std'] = parseFloat(obj['aa_length_std']);
      parsed_data[family_type][obj['family_id']]['feature_count'] = parseInt(obj['feature_count']);
      parsed_data[family_type][obj['family_id']]['genome_count'] = parseInt(obj['genome_count']);
      parsed_data[family_type][obj['family_id']]['genomes'] = obj['genomes'];
      parsed_data[family_type][obj['family_id']]['description'] = obj['product'];
    }
  });
  return parsed_data;
}

onmessage = (msg) => {
  console.log('in onmessage worker: ', JSON.parse(msg.data));
  var { type, payload } = JSON.parse(msg.data);
  switch (type) {
    case 'process_data':
      var genomeFilter = payload.genomeFilter;
      var data = payload.data;
      var family_genomes = payload.family_genomes;
      var parsedData = parse_data(data, genomeFilter, family_genomes);
      postMessage({ type: 'processed_data', pgfam: parsedData['pgfam'], plfam: parsedData['plfam'] });
      break;
    default:
      console.log('Unknown Message type in worker');
  }
}
