// Return a singleton instance of the BVBVRC API Client which
// exists globally as BVBRCClient

define(['./util/dateRangeWithinQuery'], function (dateRangeWithinQuery) {
  const client = new BVBRCClient();
  const query = client.query;
  client.query = function (dataType, filter, options) {
    if (!options || !options.query_lang || options.query_lang === 'rql') {
      filter = dateRangeWithinQuery(filter);
    }
    return query.call(this, dataType, filter, options);
  };
  return client;
});
