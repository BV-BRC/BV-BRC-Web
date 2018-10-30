define([
  'dojo/_base/declare', 'dojo/store/Memory'
], function (declare, Memory) {

  return declare([Memory], {
    arrange: function (orderedIds) {
      this.index = {};
      var sortedData = [];

      for (var i = 0, l = this.data.length; i < l; i++) {
        var newIdx = orderedIds.indexOf(this.data[i][this.idProperty]);
        sortedData[newIdx] = this.data[i];
        this.index[this.data[i][this.idProperty]] = newIdx;
      }
      this.data = sortedData.filter(function (el) { return el !== undefined; });
    }
  });
});
