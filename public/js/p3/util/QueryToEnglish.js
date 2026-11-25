define([
  'rql/parser', './fullCollectionDatePattern'
], function (
  RQLParser, fullCollectionDatePattern
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

  // Describe the generated precision alternatives as one date range, while
  // leaving arbitrary user-written OR expressions expanded as before.
  function collectionDateSummary(term) {
    if (!term || (term.name !== 'or' && term.name !== 'and')) return null;
    var branches = term.name === 'or' ? term.args : [term];
    var bounds = {};
    var patterns = [fullCollectionDatePattern, '/[0-9]{4}-[0-9]{2}/', '/[0-9]{4}/'];
    for (var i = 0; i < branches.length; i++) {
      var branch = branches[i];
      if (!branch || branch.name !== 'and' || branch.args.length !== 2) return null;
      var format = branch.args.find(function (arg) { return arg.name === 'eq' && arg.args[0] === 'collection_date'; });
      var range = branch.args.find(function (arg) { return arg.name === 'between' && arg.args[0] === 'collection_date'; });
      if (!format || !range) return null;
      var precision = patterns.indexOf(decodeURIComponent(format.args[1]));
      if (precision === -1 || bounds[precision]) return null;
      bounds[precision] = range.args.slice(1).map(String);
    }
    if (!bounds[0]) return null;
    var lower = bounds[0][0], upper = bounds[0][1];
    if (![lower, upper].every(function (value) { return value === '*' || /^\d{4}-\d{2}-\d{2}$/.test(value); })) return null;
    var start = lower === '*' ? null : lower.split('-').map(Number);
    var end = upper === '*' ? null : upper.split('-').map(Number);
    var lastDay = end && new Date(Date.UTC(end[0], end[1], 0)).getUTCDate();
    var expected = [bounds[0], [
      start ? new Date(Date.UTC(start[0], start[1] - 1 + (start[2] === 1 ? 0 : 1), 1)).toISOString().slice(0, 7) : '*',
      end ? new Date(Date.UTC(end[0], end[1] - 1 - (end[2] === lastDay ? 0 : 1), 1)).toISOString().slice(0, 7) : '*'
    ], [
      start ? String(start[0] + (start[1] === 1 && start[2] === 1 ? 0 : 1)) : '*',
      end ? String(end[0] - (end[1] === 12 && end[2] === 31 ? 0 : 1)) : '*'
    ]];
    function fits(pair) { return pair[0] === '*' || pair[1] === '*' || pair[0] <= pair[1]; }
    if (term.name === 'or') {
      for (var p = 1; p < expected.length; p++) {
        if (fits(expected[p]) ? !bounds[p] || bounds[p].join(',') !== expected[p].join(',') : !!bounds[p]) return null;
      }
    }
    function display(value, isUpper) {
      if (value === '*') return '';
      var parts = value.split('-').map(Number);
      if (isUpper ? parts[1] === 12 && parts[2] === 31 : parts[1] === 1 && parts[2] === 1) return value.slice(0, 4);
      var monthEnd = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
      return (isUpper ? parts[2] === monthEnd : parts[2] === 1) ? value.slice(0, 7) : value;
    }
    var from = display(lower, false), to = display(upper, true);
    function value(text) { return '<span class="searchValue">' + escapeHtml(text) + '</span>'; }
    var description = '<span class="searchField">Collection date</span> ';
    if (from && to) description += from === to ? 'in ' + value(from) : 'between ' + value(from) + ' and ' + value(to);
    else if (from) description += 'on or after ' + value(from);
    else if (to) description += 'on or before ' + value(to);
    else return null;
    if (term.name === 'and' && (fits(expected[1]) || fits(expected[2]))) description += ' (Full collection dates only)';
    return description;
  }

  var parseQuery = function (filter) {
    try {
      var _parsed = RQLParser.parse(filter);
    } catch (err) {
      console.log('Unable To Parse Query: ', filter);
      return;
    }

    function walk(term, insideOr) {
      var dateSummary = collectionDateSummary(term);
      if (dateSummary) return dateSummary;
      // console.log(`Walk: ${term.name}, Args: ${term.args}`);
      switch (term.name) {
        case 'and':
        case 'or':
          var v = term.args;
          if (!(v instanceof Array)) {
            v = [v];
          }
          var vals = v.map(function (child) { return walk(child, insideOr || term.name === 'or'); });
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

          vals = v.map(function (child) { return walk(child, insideOr); });

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
        case 'eq': {
          const field = decodeURIComponent(term.args[0]);
          const value = decodeURIComponent(term.args[1]);
          if (field === 'collection_date' && value === fullCollectionDatePattern) {
            return '<span class="searchValue">' + (insideOr ? 'Collection date has day precision' : 'Full collection dates only') + '</span>';
          }
          if (field === 'collection_date' && value === '/[0-9]{4}-[0-9]{2}/') {
            return '<span class="searchValue">Collection date has month precision</span>';
          }
          if (field === 'collection_date' && value === '/[0-9]{4}/') {
            return '<span class="searchValue">Collection date has year precision</span>';
          }
          out = '<span class="searchField">' + escapeHtml(field.replace(/_/g, ' '))
            + ' </span><span class="searchOperator"> is </span><span class="searchValue">' + escapeHtml(value) + '</span>';
          break;
        }
        case 'keyword':
          out = '<span class="searchValue"> '  + escapeHtml(decodeURIComponent(term.args[0])) + '</span>';
          break;
        case 'not':
          out = '<span class="searchOperator"> NOT </span>' + walk(term.args[0], insideOr);
          break;
        case 'between':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + ' </span><span class="searchOperator"> is between </span><span class="searchValue">' + escapeHtml(term.args[1]) + '</span> and <span class="searchValue">' + escapeHtml(term.args[2]) + '</span>';
          break;
        case 'lt':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + ' </span><span class="searchOperator"> &lt;= </span><span class="searchValue">' + escapeHtml(term.args[1]) + '</span>';
          break;
        case 'gt':
          out = '<span class="searchField">' + escapeHtml(term.args[0]) + ' </span><span class="searchOperator"> &gt;= </span><span class="searchValue">' + escapeHtml(term.args[1]) + '</span>';
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


  var queryToEnglish = function (query) {
    var q = parseQuery(query);
    // q = q.substr(1, q.length-2);
    return q;
  };

  /**
   * The same description with the markup removed.
   *
   * The main function emits HTML -- <span class="searchField"> and friends
   * -- which suits the list viewers that drop it straight into innerHTML.
   * Anywhere the text goes into a title attribute, a dialog label, or a
   * saved record it has to be plain, and three call sites were already
   * written against a `toPlainText` that did not exist (SaveSearchDialog,
   * SavedSearchBrowser, and a guarded one in QueryDescriptor). This adds
   * it rather than scattering strip-tag calls at each.
   *
   * Entities are decoded after stripping, so a query containing `>` comes
   * back as `>` rather than `&gt;`.
   */
  queryToEnglish.toPlainText = function (query) {
    var html = queryToEnglish(query);
    if (!html) return '';
    return String(html)
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return queryToEnglish;

});
