
function parse_subsystems_data(data) {
  var parsed_data = {};
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
  });
  return Object.values(parsed_data);
}

onmessage = (msg) => {
  console.log('in subsystems onmessage worker');
  var { type, payload } = JSON.parse(msg.data);
  switch (type) {
    case 'parse_subsystems':
      // TODO: include genome filter
      var data = payload.data;
      var parsedData = parse_subsystems_data(data);
      postMessage({ type: 'processed_subsystem_data', parsed_data: parsedData });
      break;
    case 'parse_genes':
      // TODO
      break;
    default:
      console.log('Unknown message type in subsystems worker');
  }
}
