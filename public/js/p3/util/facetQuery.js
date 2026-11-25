define([], function () {

  /**
   * Queries for the facet filter panel (FilterContainerActionBar).
   *
   * The rule that makes multi-select work: a category's counts are computed
   * with every OTHER category's selection applied, but not its own. Applying
   * a category's own selection to its counts collapses its list to the values
   * already picked, so a second Collection Year can never be added.
   *
   * Commit 2ca54d21b fetched all facets in one request with the full filter
   * applied, which broke exactly that. facetRequests() keeps one request for
   * every category without a selection and adds one per selected category.
   */

  /** keyword(...) with parentheses escaped: RQL reads them as operators. */
  function keywordClause(value) {
    const encoded = encodeURIComponent(value).replace(/\(/g, '%28').replace(/\)/g, '%29');
    return 'keyword(' + encoded + ')';
  }

  function and(parts) {
    const kept = parts.filter(Boolean);
    if (kept.length < 1) return '';
    if (kept.length === 1) return kept[0];
    return 'and(' + kept.join(',') + ')';
  }

  /**
   * One category's clause. A facet click stores a ready-made string
   * ('eq(...)' or 'or(...)'); a filter parsed from the URL or built by
   * Advanced Search stores an array of clauses, which are alternatives.
   */
  function categoryClause(value) {
    if (Array.isArray(value)) {
      const kept = value.filter(Boolean);
      if (kept.length < 1) return '';
      if (kept.length === 1) return kept[0];
      return 'or(' + kept.join(',') + ')';
    }
    return value || '';
  }

  function keywordsClause(keywords) {
    return and((keywords || []).filter(Boolean).map(keywordClause));
  }

  /**
   * The panel's filter: every category's clause plus the keywords, ANDed.
   * `except` leaves one category out. '' when nothing is selected.
   */
  function buildFilter(filterMap, keywords, except) {
    const map = filterMap || {};
    const parts = Object.keys(map)
      .filter(function (cat) { return cat !== except; })
      .map(function (cat) { return categoryClause(map[cat]); });
    parts.push(keywordsClause(keywords));
    return and(parts);
  }

  function fieldName(field) {
    return typeof field === 'string' ? field : field.field;
  }

  /**
   * The facet requests for the panel, as [{ query, fields }]. Categories with
   * no selection share one request with the full filter; each category with
   * a selection gets its own request without its own clause.
   */
  function facetRequests(query, filterMap, keywords, fields) {
    const base = (query && query.charAt(0) === '?') ? query.substr(1) : (query || '');
    const map = filterMap || {};
    const selected = (fields || []).filter(function (f) {
      return !!categoryClause(map[fieldName(f)]);
    });
    const unselected = (fields || []).filter(function (f) {
      return selected.indexOf(f) < 0;
    });

    const requests = [];
    if (unselected.length) {
      requests.push({ query: and([base, buildFilter(map, keywords)]), fields: unselected });
    }
    selected.forEach(function (f) {
      requests.push({ query: and([base, buildFilter(map, keywords, fieldName(f))]), fields: [f] });
    });
    return requests;
  }

  return {
    keywordClause: keywordClause,
    categoryClause: categoryClause,
    buildFilter: buildFilter,
    facetRequests: facetRequests
  };
});
