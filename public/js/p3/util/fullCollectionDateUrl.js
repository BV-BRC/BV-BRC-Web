'use strict';

define(['./fullCollectionDatePattern'], function (fullCollectionDatePattern) {
  const alias = 'fullCollectionDate';
  const encodedPattern = encodeURIComponent(fullCollectionDatePattern);
  const clause = 'eq(collection_date,' + encodedPattern + ')';
  const queryTokens = new RegExp('(?:eq\\(collection_date,' + encodedPattern
    + '\\)|fullCollectionDate(?:\\(\\))?)(?=$|[,)&])|([\\w]*)\\(|\\)', 'g');

  function replaceGenomeDateTerm(search, replacement) {
    const operators = [];
    return search.replace(queryTokens, function (token, operator, offset) {
      if (operator !== undefined) {
        operators.push(operator);
      } else if (token === ')') {
        operators.pop();
      } else if (operators[operators.length - 1] === 'genome' && /[,(]/.test(search.charAt(offset - 1))) {
        // A bare alias is reserved as a genome criterion and can still be a field value elsewhere.
        return replacement;
      }
      return token;
    });
  }

  return {
    shorten: function (href) {
      // Keep URL fragments and non-view routes out of the query rewrite.
      return href.replace(/^(\/view\/[^?#]+\?)([^#]*)/, function (match, path, search) {
        return path + replaceGenomeDateTerm(search, alias);
      });
    },
    expand: function (search) {
      return replaceGenomeDateTerm(search, clause);
    }
  };
});
