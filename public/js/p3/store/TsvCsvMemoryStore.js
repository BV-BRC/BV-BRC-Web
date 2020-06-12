define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults', 'dojo/Stateful'
], function (
  declare, lang, Deferred,
  request, when, Topic,
  Memory, QueryResults, Stateful
) {

  return declare([Memory, Stateful], {
    // baseQuery: {},
    rawData: [],
    dataType: 'tsv',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      // console.log("onSetState", state, this);
      this.reload();
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;
    },

    reload: function () {

      if (this._loadingDeferred && !this._loadingDeferred.isResolved()) {
        this._loadingDeferred.cancel('reloaded');
      }

      delete this._loadingDeferred;
      this._loaded = false;
      this.loadData();
      this.set('refresh');
    },

    query: function (query, opts) {
      query = query || {};
      if (this._loaded) {
        return this.inherited(arguments);
      }

      var results;
      var qr = QueryResults(when(this.loadData(), lang.hitch(this, function () {
        results = this.query(query, opts);
        qr.total = when(results, function (results) {
          return results.total || results.length;
        });
        return results;
      })));

      return qr;

    },

    get: function (id, opts) {
      if (this._loaded) {
        return this.inherited(arguments);
      }
      return when(this.loadData(), lang.hitch(this, function () {
        return this.get(id, opts);
      }));

    },

    loadData: function () {
      if (this._loadingDeferred) {
        return this._loadingDeferred;
      }

      // console.warn("loadData", this.type, this.state);

      if (!this.state) {
        // console.log("No state, use empty data set for initial store");

        // this is done as a deferred instead of returning an empty array
        // in order to make it happen on the next tick.  Otherwise it
        // in the query() function above, the callback happens before qr exists
        var def = new Deferred();
        setTimeout(lang.hitch(this, function () {
          this.setData([]);
          this._loaded = true;
          // def.resolve(true);
        }), 0);
        return def.promise;
      }

      // console.warn("loadData", this.type, this.state);

      // Dev DLB:  Start here...
      // get data for tsv (currently typed as txt)
      
      if (this.state.dataType == 'txt') {
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/);

        // get the headers for the columns by splitting the first line.  
        var tmpColumnHeaders = dataLines[0].split(/\t/);	
      } else {    // csv
        var dataLines = this.state.data.split(/\r?\n/); 
      }

      // make column labels from the first line of dataLines
      var gridColumns = [];
      //gridColumns.push({'Selection Checkboxes' : selector({ unhidable: true})});
      for (i = 0; i < tmpColumnHeaders.length; i++) {
        //var columnHeaders = { label: tmpColumnHeaders[i], field: 'column' + i };
        var columnHeaders = { label: tmpColumnHeaders[i], field: tmpColumnHeaders[i] };

        gridColumns.push(columnHeaders);
}

      // fill with data, start with second line of dataLines
      var columnData = [];
      for (i = 0; i < dataLines.length; i++) {  // temporary. start at 1 because columns are hard-coded
        var tmpData = dataLines[i].split(/\t/);
        var dataRow = {};
        for (j = 0; j < tmpData.length; j++) {
          //dataRow["column" + j] = tmpData[j];	
          dataRow[gridColumns[j].field] = tmpData[j];
        }
        columnData.push(dataRow);
      }
      this.setData(columnData);
      this._loaded = true;

      return this._loadingDeferred;
    }

    
  });
});
