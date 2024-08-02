define([
  'dojo/_base/xhr',
  'dojo/store/Memory',
], function (
  xhr,
  Memory,
) {

  return function (dataModel, facetField, condition) {

    return new Promise((resolve, reject) => {
      let url = `${window.App.dataServiceURL}/data/distinct/${dataModel}/${facetField}`;
      if (condition) {
        url += '?q=' + condition;
      }
      xhr('GET', {
        url: url,
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
