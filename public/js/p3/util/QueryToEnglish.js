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

  /**
   * Parse an RQL query and convert to human-readable format
   * @param {string} filter - RQL query string
   * @param {boolean} plainText - If true, output plain text without HTML tags
   * @returns {string} Human-readable representation
   */
  var parseQuery = function (filter, plainText) {
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
            if (plainText) {
              out += vals.join(' ' + term.name.toUpperCase() + ' ');
            } else {
              out += vals.join('<span class="searchOperator"> ' + term.name.toUpperCase() + ' </span>');
            }
          } else {
            if (plainText) {
              out = out + vals.slice(0, numTerms).join(' ' + term.name.toUpperCase() + ' ') + ' ... ' + (vals.length - numTerms) + ' more terms ...';
            } else {
              out = out + vals.slice(0, numTerms).join('<span class="searchOperator"> ' + term.name.toUpperCase() + ' </span>') + ' ... ' + (vals.length - numTerms) + ' more terms ...';
            }
          }
          break;
        case 'in':
          var fRaw = decodeURIComponent(term.args[0]).replace(/_/g, ' ');
          var v = term.args[1];
          // console.log('V: ', v);
          var vals;
          if (!(v instanceof Array)) {
            v = [v];
          }

          vals = v.map(walk);

          if (plainText) {
            out = fRaw + ' is ';
          } else {
            out = '<span class="searchField">' + escapeHtml(fRaw) + ' </span><span class="searchOperator"> is </span> ';
          }

          if (vals.length == 1) {
            out = out + ' IN ' + vals.join('');
          } else if (vals.length < 3) {
            if (plainText) {
              out += vals.join(' OR ');
            } else {
              out += vals.join('<span class="searchOperator"> OR </span>');
            }
          } else {
            if (plainText) {
              out = out + vals.slice(0, 2).join(' OR ') + ' ... ' + (vals.length - 2) + ' more ...';
            } else {
              out = out + vals.slice(0, 2).join('<span class="searchOperator"> OR </span>') + ' ... ' + (vals.length - 2) + ' more ...';
            }
          }
          // parsed.selected.push({field: f, value: v});
          break;
        case 'ne':
          var fRaw = decodeURIComponent(term.args[0]);
          var vRaw = decodeURIComponent(term.args[1]);
          if (plainText) {
            out = fRaw + ' is not ' + vRaw;
          } else {
            out = escapeHtml(fRaw) + '<span class="searchOperator"> is not </span>' + escapeHtml(vRaw);
          }
          break;
        case 'eq':
          var fRaw = decodeURIComponent(term.args[0]).replace(/_/g, ' ');
          var vRaw = decodeURIComponent(term.args[1]);
          if (plainText) {
            out = fRaw + ' is ' + vRaw;
          } else {
            out = '<span class="searchField">' + escapeHtml(fRaw) + ' </span><span class="searchOperator"> is </span><span class="searchValue">' + escapeHtml(vRaw) + '</span>';
          }
          break;
        case 'keyword':
          if (plainText) {
            out = decodeURIComponent(term.args[0]);
          } else {
            out = '<span class="searchValue"> ' + escapeHtml(decodeURIComponent(term.args[0])) + '</span>';
          }
          break;
        case 'not':
          if (plainText) {
            out = 'NOT ' + walk(term.args[0]);
          } else {
            out = '<span class="searchOperator"> NOT </span>' + walk(term.args[0]);
          }
          break;
        case 'between':
          if (plainText) {
            out = term.args[0] + ' is between ' + term.args[1] + ' and ' + term.args[2];
          } else {
            out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> is between ' + escapeHtml(term.args[1]) + ' and ' + escapeHtml(term.args[2]);
          }
          break;
        case 'lt':
          if (plainText) {
            out = term.args[0] + ' <= ' + term.args[1];
          } else {
            out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> &lt;= ' + escapeHtml(term.args[1]);
          }
          break;
        case 'gt':
          if (plainText) {
            out = term.args[0] + ' >= ' + term.args[1];
          } else {
            out = '<span class="searchField">' + escapeHtml(term.args[0]) + '</span> &gt;= ' + escapeHtml(term.args[1]);
          }
          break;
        case 'GenomeGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = escapeHtml(groupParts[groupParts.length - 1]);
          if (plainText) {
            out = 'Genome Group ' + groupName;
          } else {
            out = 'Genome Group <span class="searchValue">' + groupName + '</span>';
          }
          break;
        case 'FeatureGroup':
          var groupParts = decodeURIComponent(term.args[0]).split('/');
          var groupName = escapeHtml(groupParts[groupParts.length - 1]);
          if (plainText) {
            out = 'Feature Group ' + groupName;
          } else {
            out = 'Feature Group <span class="searchValue">' + groupName + '</span>';
          }
          break;
        // Data type wrapper functions - recursively process inner query
        case 'genome':
        case 'genome_feature':
        case 'genome_sequence':
        case 'specialty_gene':
        case 'pathway':
        case 'subsystem':
        case 'antibiotic':
        case 'genome_amr':
        case 'epitope':
        case 'protein_structure':
        case 'surveillance':
        case 'serology':
        case 'experiment':
          // These are data type wrappers - just process their inner content
          if (term.args && term.args.length > 0) {
            out = walk(term.args[0]);
          }
          break;
        default:
          if (typeof term == 'string' || typeof term == 'number') {
            if (plainText) {
              return decodeURIComponent(term);
            } else {
              return '<span class="searchValue">' + escapeHtml(decodeURIComponent(term)) + '</span>';
            }
          }
          // console.log("Skipping Unused term: ", term.name, term.args);
      }

      return out;
    }

    return walk(_parsed);
  };

  /**
   * Main function: Convert RQL to HTML representation
   * @param {string} query - RQL query string
   * @returns {string} HTML representation
   */
  var toHtml = function (query) {
    var q = parseQuery(query, false);
    return q;
  };

  /**
   * Convert RQL to plain text representation (no HTML tags)
   * @param {string} query - RQL query string
   * @returns {string} Plain text representation
   */
  var toPlainText = function (query) {
    var q = parseQuery(query, true);
    return q;
  };

  // Main export function (backwards compatible)
  var QueryToEnglish = function (query) {
    return toHtml(query);
  };

  // Attach methods to the function for named access
  QueryToEnglish.toHtml = toHtml;
  QueryToEnglish.toPlainText = toPlainText;

  return QueryToEnglish;

});
