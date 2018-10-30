define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'rql/parser'
], function (
  declare, lang,
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
      // console.log("Walk: ", term.name, " Args: ", term.args);
      switch (term.name) {
        case 'and':
        case 'or':
          var out = term.args.map(function (t) {
            return walk(t);
          }).join(' ' + term.name.toUpperCase() + ' ');

          // console.log("out: ", out);
          break;
        case 'in':
          var f = decodeURIComponent(term.args[0]);
          var v = term.args[1];
          var vals = v.map(decodeURIComponent);
          out = f + ':(' + vals.join(' OR ') + ')';
          // parsed.selected.push({field: f, value: v});
          break;
        case 'ne':
          var f = decodeURIComponent(term.args[0]);
          var v = decodeURIComponent(term.args[1]);
          out =  'NOT ' + f + ':' + v;
          break;
        case 'eq':
          var f = decodeURIComponent(term.args[0]);
          var v = decodeURIComponent(term.args[1]);
          out =  f + ':' + v;
          break;
        case 'keyword':
          out = decodeURIComponent(term.args[0]);
          break;
        case 'not':
          out = 'NOT ' + walk(term.args[0]);
          break;
        default:
          console.log('Skipping Unused term: ', term.name, term.args);
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
