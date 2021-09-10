define([
  'dojo/_base/xhr',
  'dojo/store/Memory',
], function (
  xhr,
  Memory,
) {

  return function (dataModel, facetField) {

    return new Promise((resolve, reject) => {
      xhr('GET', {
        url: `${window.App.dataServiceURL}/${dataModel}/?keyword(*)&limit(1)&facet((field,${facetField}),(mincount,1),(limit,-1))&json(nl,map)`,
        handleAs: 'json',
        headers: {
          'Accept': 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          'Authorization': (window.App.authorizationToken || '')
        }
      }).then(function (res) {
        const facets = Object.keys(res.facet_counts.facet_fields[facetField])
        const data = facets.map((val) => {
          return {
            'name': val,
            'id': val
          }
        })
        // console.log(data)
        resolve(new Memory({
          data: data
        }))
      }, function (err) {
        reject(err)
      })
    })
  }
})
