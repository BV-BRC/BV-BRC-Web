define([
  'dojo/_base/lang'
], function (
  lang
) {
  return {
    /**
     * Function to convert an object returned from a dojo.data store into a plain object.
     * @param store
     * @param item
     */
    storeItemToRecord: function (store, item) {
      var record = {};
      if (item) {
        for (let attrName of store.getAttributes(item)) {
          record[attrName] = store.getValue(item, attrName);
        }
      }
      return record;
    },
    /**
     * Return a single item fetched by id from a dojo.data store as a promise.
     * @param store
     * @param query
     * @returns {Promise<unknown>}
     */
    itemByIdToPromise: function (store, id) {
      return new Promise(
        (resolve, reject) => {
          store.fetchItemByIdentity({
            identity: id,
            onItem: lang.hitch(this, (record) => {
              resolve(this.storeItemToRecord(store, record));
            }),
            onError: error=>reject(error)
          });
        });
    },
    /**
     * Return all results of a query to a data store as a promise.
     * @param store
     * @param query
     * @returns {Promise<unknown>}
     */
    fetchAllToPromise: function (store, query) {
      return new Promise(
        (resolve, reject) => {
          store.fetch({
            query: query,
            // eslint-disable-next-line no-unused-vars
            onComplete: lang.hitch(this, (records, request) => {
              resolve(records.map(record => this.storeItemToRecord(store, record)));
            }),
            onError: error=>reject(error)
          });
        });

    }
  };
});
