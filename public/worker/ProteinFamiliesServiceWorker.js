function parse_data(data, filter) {
  // get selected genomes
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
  parsed_data['pgfam'] = {};
  parsed_data['plfam'] = {};
  var family_counts = {};
  var family_list = [];
  var genomes_dict = {};
  genomes_dict['pgfam'] = {};
  genomes_dict['plfam'] = {};
  var means_dict = {};
  means_dict['pgfam'] = {};
  means_dict['plfam'] = {};
  data.forEach(function (obj) {
    // filter by genome
    if (present_genomes.length > 0 && !present_genomes.includes(obj['genome_id'])) {
      return;
    }
    if (absent_genomes.length > 0 && absent_genomes.includes(obj['genome_id'])) {
      return;
    }
    var family_type = obj['familyType'];
    if (family_list.includes(obj['family_id'])) {
      // readjust
      parsed_data[family_type][obj['family_id']]['aa_length_max'] = getMax(parsed_data[family_type][obj['family_id']]['aa_length_max'], obj['aa_length_max']);
      parsed_data[family_type][obj['family_id']]['aa_length_min'] = getMin(parsed_data[family_type][obj['family_id']]['aa_length_min'], obj['aa_length_min']);
      parsed_data[family_type][obj['family_id']]['aa_length_mean'] = getAvg(parsed_data[family_type][obj['family_id']]['aa_length_mean'], obj['aa_length_mean'], family_counts[obj['family_id']]);
      // parsed_data[family_type][obj['family_id']]['aa_length_std'] = getStdDev(parsed_data[family_type][obj['family_id']]['aa_length_std'], obj['aa_length_std'], family_counts[obj['family_id']])
      parsed_data[family_type][obj['family_id']]['feature_count'] = (parseInt(parsed_data[family_type][obj['family_id']]['feature_count']) + parseInt(obj['feature_count']));
      parsed_data[family_type][obj['family_id']]['genome_count'] = (parseInt(parsed_data[family_type][obj['family_id']]['genome_count']) + parseInt(obj['genome_count']));
      genomes_dict[family_type][obj['family_id']][obj['genome_id']] = obj['genomes'];
      means_dict[family_type][obj['family_id']][obj['genome_id']] = parseFloat(obj['aa_length_mean']);
      family_counts[obj['family_id']]++;
    }
    else {
      family_list.push(obj['family_id']);
      parsed_data[family_type][obj['family_id']] = {};
      // parsed_data[family_type][obj['family_id']]['id'] = obj['family_id'];
      parsed_data[family_type][obj['family_id']]['family_id'] = obj['family_id'];
      parsed_data[family_type][obj['family_id']]['aa_length_max'] = parseInt(obj['aa_length_max']);
      parsed_data[family_type][obj['family_id']]['aa_length_min'] = parseInt(obj['aa_length_min']);
      parsed_data[family_type][obj['family_id']]['aa_length_mean'] = parseFloat(obj['aa_length_mean']);
      // parsed_data[family_type][obj['family_id']]['aa_length_std'] = parseFloat(obj['aa_length_std']);
      // Get all means and calculate std dev at the end
      means_dict[family_type][obj['family_id']] = {};
      means_dict[family_type][obj['family_id']][obj['genome_id']] = parseFloat(obj['aa_length_mean']);
      parsed_data[family_type][obj['family_id']]['feature_count'] = parseInt(obj['feature_count']);
      parsed_data[family_type][obj['family_id']]['genome_count'] = parseInt(obj['genome_count']);
      genomes_dict[family_type][obj['family_id']] = {};
      genomes_dict[family_type][obj['family_id']][obj['genome_id']] = obj['genomes'];
      // parsed_data[obj['family_id']]['genomes'] = obj['genomes'];
      parsed_data[family_type][obj['family_id']]['description'] = obj['product'];
      family_counts[obj['family_id']] = 1;
    }
  });
  // Add genome hexvalues to parsed_data['genomes'] for heatmap
  // calculate std dev
  Object.keys(parsed_data['pgfam']).forEach(function (family_id) {
    var hexstr = '';
    Object.keys(genome_filter).forEach(function (genome_id) {
      if (genomes_dict['pgfam'][family_id].hasOwnProperty(genome_id)) { // if it contains a genomes entry for that family_id, genome_id
        hexstr += genomes_dict['pgfam'][family_id][genome_id];
      }
      else { // if not add 00
        hexstr += '00';
      }
    });
    parsed_data['pgfam'][family_id]['genomes'] = hexstr;
    parsed_data['pgfam'][family_id]['aa_length_std'] = getStdDev(parsed_data['pgfam'][family_id]['aa_length_mean'], Object.values(means_dict['pgfam'][family_id]));
  });
  Object.keys(parsed_data['plfam']).forEach(function (family_id) {
    var hexstr = '';
    Object.keys(genome_filter).forEach(function (genome_id) {
      if (genomes_dict['plfam'][family_id].hasOwnProperty(genome_id)) { // if it contains a genomes entry for that family_id, genome_id
        hexstr += genomes_dict['plfam'][family_id][genome_id];
      }
      else { // if not add 00
        hexstr += '00';
      }
    });
    parsed_data['plfam'][family_id]['genomes'] = hexstr;
    parsed_data['plfam'][family_id]['aa_length_std'] = getStdDev(parsed_data['plfam'][family_id]['aa_length_mean'], Object.values(means_dict['plfam'][family_id]));
  });
  return parsed_data;
}

function getStdDev(total_mean, means_list) {
  var ss = 0;
  means_list.forEach(function (mean) {
    var diff = total_mean - mean;
    ss += (diff * diff);
  });
  return findSqrt(ss / (means_list.length));
}

function getAvg(oldVal, newVal, currCounts) {
  newVal = parseFloat(newVal);
  oldVal = parseFloat(oldVal);
  var adjustVal = (newVal + currCounts * oldVal) / (currCounts + 1);
  return adjustVal;
}

function getMax(val1, val2) {
  val1 = parseInt(val1);
  val2 = parseInt(val2);
  if (val1 >= val2) {
    return val1;
  }
  else {
    return val2;
  }
}

function getMin(val1, val2) {
  val1 = parseInt(val1);
  val2 = parseInt(val2);
  if (val1 >= val2) {
    return val2;
  }
  else {
    return val1;
  }
}

// square and findSqrt are used to calculate the std deviation from the variance
// Do not have Math library accessible
const square = (n, i, j) => {
  let mid = (i + j) / 2;
  let mul = mid * mid;
  let absdiff = mul - n;
  if (absdiff < 0) {
    // eslint-disable-next-line operator-assignment
    absdiff = absdiff * -1;
  }
  if ((mul === n) || (absdiff < 0.00001)) {
    return mid;
  } else if (mul < n) {
    return square(n, mid, j);
  } else {
    return square(n, i, mid);
  }
}
// Function to find the square root of n
const findSqrt = num => {
  let i = 1;
  const found = false;
  while (!found) {
    // If n is a perfect square
    if (i * i === num) {
      return i;
    } else if (i * i > num) {
      let res = square(num, i - 1, i);
      return res;
    }
    i++;
  }
}

onmessage = (msg) => {
  console.log('in onmessage worker: ', JSON.parse(msg.data));
  var { type, payload } = JSON.parse(msg.data);
  switch (type) {
    case 'process_data':
      var genomeFilter = payload.genomeFilter;
      var data = payload.data;
      var parsedData = parse_data(data, genomeFilter);
      postMessage({ type: 'processed_data', pgfam: parsedData['pgfam'], plfam: parsedData['plfam'] });
      break;
    default:
      console.log('Unknown Message type in worker');
  }
}
