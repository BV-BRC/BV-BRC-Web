define([
  'rql/parser'
], function (
  RQLParser
) {

  var parseQuery = function (filter) {
    try {
      var _parsed = RQLParser.parse(filter);
    } catch (err) {
      console.log('Unable To Parse Query: ', filter);
      return;
    }

    function walk(term) {
      // console.log(`Walk: ${term.name}, Args: ${term.args}`);
      switch (term.name) {
        case 'and':
        case 'or':
          var v = term.args;
          if (!(v instanceof Array)) {
            v = [v];
          }
          var vals = v.map(walk);
          var out = '';

          // set the number of terms to display in the perspective window
          var numTerms = 7;

          if (vals.length == 1) {
            out = vals.join('');
          } else if (vals.length < numTerms + 1) {
            out += vals.join('<span class="searchOperator"> ' + term.name.toUpperCase() + ' </span>');
          } else {
            out = out + vals.slice(0, numTerms).join('<span class="searchOperator"> ' + term.name.toUpperCase() + ' </span>') + ' ... ' + (vals.length - numTerms) + ' more terms ...';
          }
          break;
        case 'in':
          var f = decodeURIComponent(term.args[0]).replace(/_/g, ' ');
          var v = term.args[1];
          // console.log('V: ', v);
          var vals;
          if (!(v instanceof Array)) {
            v = [v];
          }

          vals = v.map(walk);

          out = '<span class="searchField">' + f + ' </span><span class="searchOperator"> is </span> ';

          if (vals.length == 1) {
            out = out + ' IN ' + vals.join('');
          } else if (vals.length < 3) {
            out += vals.join('<span class="searchOperator"> OR </span>');
          } else {
            out = out + vals.slice(0, 2).join('<span class="searchOperator"> OR </span>') + ' ... ' + (vals.length - 2) + ' more ...';
          }
          // parsed.selected.push({field: f, value: v});
          break;
        case 'ne':
          var f = decodeURIComponent(term.args[0]);
          var v = decodeURIComponent(term.args[1]);
          out =  f + '<span class="searchOperator"> is not </span>' + v;
          break;
        case 'eq':
          var f = decodeURIComponent(term.args[0]).replace(/_/g, ' ');
          var v = decodeURIComponent(term.args[1]);
          out =  '<span class="searchField">' + f  + ' </span><span class="searchOperator"> is </span><span class="searchValue">' + v + '</span>';
          break;
        case 'keyword':
          out = '<span class="searchValue"> '  + decodeURIComponent(term.args[0]) + '</span>';
          break;
        case 'not':
          out = '<span class="searchOperator"> NOT </span>' + walk(term.args[0]);
          break;
        case 'between':
          out = `<span class="searchField">${term.args[0]}</span> is between ${term.args[1]} and ${term.args[2]}`
          break;
        case 'lt':
          out = `<span class="searchField">${term.args[0]}</span> &lt;= ${term.args[1]}`
          break;
        case 'gt':
          out = `<span class="searchField">${term.args[0]}</span> &gt;= ${term.args[1]}`
          break;
        case 'GenomeGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = groupParts[groupParts.length - 1];
          out = 'Genome Group <span class="searchValue">' + groupName + '</span>';
          break;
        case 'FeatureGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = groupParts[groupParts.length - 1];
          out = 'Feature Group <span class="searchValue">' + groupName + '</span>';
          break;
        default:
          if (typeof term == 'string' || typeof term == 'number') {
            return '<span class="searchValue">'  + decodeURIComponent(term) + '</span>';
          }
          // console.log("Skipping Unused term: ", term.name, term.args);
      }

      return out;
    }

    return walk(_parsed);
  };


  return function (query) {
    var q = parseQuery(query);
    // q = q.substr(1, q.length-2);
    return q;
  };

});
