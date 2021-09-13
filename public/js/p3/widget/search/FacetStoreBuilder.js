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
        url: `${window.App.dataServiceURL}/data/distinct/${dataModel}/${facetField}`,
        handleAs: 'json',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': null,
          'Authorization': ''
        }
      }).then((res) => {
        const data = Object.keys(res).map((val) => {
          return {
            'name': val,
            'id': val
          }
        })
        resolve(new Memory({
          data: data
        }))
      }, (err) => {
        reject(err)
      })
    })
  }
})
