
function parse_subsystems_data(data, facets) {
  var parsed_data = {};
  var facet_data = {};
  facets.forEach(function (ff) {
    facet_data[ff] = {};
  });
  data.forEach(function (obj) {
    var id = obj['id'];
    parsed_data[id] = obj;
    parsed_data[id]['gene_count'] = parseInt(obj['gene_counts']);
    parsed_data[id]['role_count'] = parseInt(obj['role_counts']);
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

// data is the raw text of the subsystems table
function load_subsystem_data(data) {
  var subsystem_data = [];
  var header = true;
  var subsystem_keys = null;
  data.split('\n').forEach(function (line) {
    if (header) {
      subsystem_keys = line.split('\t');
      header = false;
      console.log(subsystem_keys);
    }
    else {
      var new_data = {};
      var l = line.split('\t');
      var id = '';
      subsystem_keys.forEach(function (key, index) {
        new_data[key] = l[index];
        id += l[index];
      });
      new_data['document_type'] = 'subsystems_subsystem'; // used in ItemDetailPanel
      new_data['id'] = id;
      subsystem_data.push(new_data);
    }
  });
  // TODO: the last entry is undefined, not sure why it's being added: for now just remove
  // - Probably move this fix for the same issue in Pathways and ProteinFams to p3_core/lib/bvbrc_api
  // subsystem_data.pop();
  return subsystem_data;
}

// data is the raw text of the genes table
function load_genes_data(data) {
  var genes_data = [];
  var header = true;
  var genes_keys = null;
  data.split('\n').forEach(function (line) {
    if (header) {
      genes_keys = line.split('\t');
      header = false;
      console.log(genes_keys);
    }
    else {
      var new_data = {};
      var l = line.split('\t');
      genes_keys.forEach(function (key, index) {
        new_data[key] = l[index];
        new_data['document_type'] = 'subsystems_gene'; // used in ItemDetailPanel
      });
      genes_data.push(new_data);
    }
  });
  // TODO: the last entry is undefined, not sure why it's being added: for now just remove
  genes_data.pop();
  return genes_data;
}

function parse_genes_data(data, facets) {
  var parsed_data = {};
  var facet_data = {};
  facets.forEach(function (ff) {
    facet_data[ff] = {};
  });
  // TODO: insert genome filter
  data.forEach(function (obj) {
    var id = obj['id'];
    if (parsed_data.hasOwnProperty(id)) { // shouldn't happen for genes table
      console.log('duplicate entry in genes table: id = ', id);
    }
    else {
      parsed_data[id] = obj;
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
    case 'load_subsystems':
      var data = payload.data;
      var loadedData = load_subsystem_data(data);

      postMessage({ type: 'loaded_subsystem_data', loaded_data: loadedData });
      break;
    case 'load_genes':
      var data = payload.data;
      var loadedData = load_genes_data(data);

      postMessage({ type: 'loaded_genes_data', loaded_data: loadedData });
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
