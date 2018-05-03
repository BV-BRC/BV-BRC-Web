define([
  'dojo/_base/declare', 'dojo/request', 'JBrowse/Store/SeqFeature/REST', 'JBrowse/Store/LRUCache', 'dojo/_base/lang'
], function (declare, dojoRequest, baseStore, LRUCache, lang) {

  return declare([baseStore], {
    _get: function ( request, callback, errorCallback ) {
      var thisB = this;
      if ( this.config.noCache )
      { dojoRequest( request.url, {
        method: 'GET',
        headers: {
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(
        callback,
        this._errorHandler( errorCallback )
      ); }
      else
      { this._getCache().get( request, function ( record, error ) {
        if ( error )
        { thisB._errorHandler(errorCallback)(error); }
        else
        { callback( record.response ); }
      }); }

    },

    _getCache: function () {
      var thisB = this;
      return this._cache || (
        this._cache = new LRUCache({
          name: 'REST data cache ' + this.name,
          maxSize: 25000, // cache up to about 5MB of data (assuming about 200B per feature)
          sizeFunction: function ( data ) { return data.length || 1; },
          fillCallback: function ( request, callback ) {
            var get = dojoRequest(
              request.url, {
                method: 'GET',
                headers: {
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
              },
              true // work around dojo/request bug
            );
            get.then(
              function (data) {
                var nocacheResponse = /no-cache/.test(get.response.getHeader('Cache-Control'))
                                    || /no-cache/.test(get.response.getHeader('Pragma'));
                callback({ response: data, request: request }, null, { nocache: nocacheResponse });
              },
              thisB._errorHandler( lang.partial( callback, null ) )
            );
          }
        }));
    }
  });
});
