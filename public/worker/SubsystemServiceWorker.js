
function parse_subsystems_data(data, facets) {
  var parsed_data = {};
  var facet_data = {};
  facets.forEach(function (ff) {
    facet_data[ff] = {};
  });
  // TODO: insert genome filter
  data.forEach(function (obj) {
    var id = obj['id'];
    if (parsed_data.hasOwnProperty(id)) { // duplicate id from multiple genomes
      var dup_obj = parsed_data[id];
      dup_obj['gene_count'] += parseInt(obj['gene_count']);
      dup_obj['role_count'] += parseInt(obj['role_count']);
      parsed_data[id] = dup_obj;
    }
    else {
      parsed_data[id] = obj;
      parsed_data[id]['gene_count'] = parseInt(obj['gene_count']);
      parsed_data[id]['role_count'] = parseInt(obj['role_count']);
    }
    facets.forEach(function (ff) {
      var value = obj[ff];
      if (!facet_data[ff].hasOwnProperty(value)) {
        facet_data[ff][value] = 0;
      }
      facet_data[ff][value]++;
    });
  });
  return { 'parsed_data': Object.values(parsed_data), 'facet_counts': facet_data };
}

// TODO: replace this with the initial gene table loading
function parse_genes_data(data, facets) {
  var parsed_data = {};
  var facet_data = {};
  facets.forEach(function (ff) {
    facet_data[ff] = {};
  });
  // TODO: insert genome filter
  data.forEach(function (obj) {
    var id = obj['id'];
    if (parsed_data.hasOwnProperty(id)) { // duplicate id from multiple genomes
      var dup_obj = parsed_data[id];
      dup_obj['gene_count'] += parseInt(obj['gene_count']);
      dup_obj['role_count'] += parseInt(obj['role_count']);
      parsed_data[id] = dup_obj;
    }
    else {
      parsed_data[id] = obj;
      parsed_data[id]['gene_count'] = parseInt(obj['gene_count']);
      parsed_data[id]['role_count'] = parseInt(obj['role_count']);
    }
    facets.forEach(function (ff) {
      var value = obj[ff];
      if (!facet_data[ff].hasOwnProperty(value)) {
        facet_data[ff][value] = 0;
      }
      facet_data[ff][value]++;
    });
  });
}

onmessage = (msg) => {
  console.log('in subsystems onmessage worker');
  var { type, payload } = JSON.parse(msg.data);
  switch (type) {
    case 'parse_subsystems':
      // TODO: include genome filter
      var data = payload.data;
      var facets = payload.facetFields;
      var parsedData = parse_subsystems_data(data, facets);

      postMessage({ type: 'processed_subsystem_data', parsed_data: parsedData['parsed_data'], facet_counts: parsedData['facet_counts'] });
      break;
    case 'parse_genes':
      var data = payload.data;
      var facets = payload.facetFields;
      var parsedData = parse_genes_data(data, facets);

      postMessage({ type: 'processed_genes_data', parsed_data: parsedData['parsed_data'], facet_counts: parsedData['facet_counts'] });
      break;
    default:
      console.log('Unknown message type in subsystems worker');
  }
}
