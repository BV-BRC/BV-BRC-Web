define([
  'rql/parser'
], function (
  RQLParser
) {

  // HTML escape function to prevent XSS
  function escapeHtml(str) {
    if (typeof str !== 'string') {
      str = String(str);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
          var f = escapeHtml(decodeURIComponent(term.args[0]).replace(/_/g, ' '));
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
          var f = escapeHtml(decodeURIComponent(term.args[0]));
          var v = escapeHtml(decodeURIComponent(term.args[1]));
          out =  f + '<span class="searchOperator"> is not </span>' + v;
          break;
        case 'eq':
          var f = escapeHtml(decodeURIComponent(term.args[0]).replace(/_/g, ' '));
          var v = escapeHtml(decodeURIComponent(term.args[1]));
          out =  '<span class="searchField">' + f  + ' </span><span class="searchOperator"> is </span><span class="searchValue">' + v + '</span>';
          break;
        case 'keyword':
          out = '<span class="searchValue"> '  + escapeHtml(decodeURIComponent(term.args[0])) + '</span>';
          break;
        case 'not':
          out = '<span class="searchOperator"> NOT </span>' + walk(term.args[0]);
          break;
        case 'between':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> is between ' + escapeHtml(term.args[1]) + ' and ' + escapeHtml(term.args[2]);
          break;
        case 'lt':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> &lt;= ' + escapeHtml(term.args[1]);
          break;
        case 'gt':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> &gt;= ' + escapeHtml(term.args[1]);
          break;
        case 'GenomeGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = escapeHtml(groupParts[groupParts.length - 1]);
          out = 'Genome Group <span class="searchValue">' + groupName + '</span>';
          break;
        case 'FeatureGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = escapeHtml(groupParts[groupParts.length - 1]);
          out = 'Feature Group <span class="searchValue">' + groupName + '</span>';
          break;
        default:
          if (typeof term == 'string' || typeof term == 'number') {
            return '<span class="searchValue">'  + escapeHtml(decodeURIComponent(term)) + '</span>';
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
