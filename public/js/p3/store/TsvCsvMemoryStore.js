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
    baseQuery: {},
    rawData: [],
    dataType: 'tsv',
    idProperty: 'RowNumber',
    keyword: '',
    columns: '',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      // console.log("onSetState", state, this);
      this.reload();

      this._filtered = undefined; // reset flag prevent to read stored _original
    },

    constructor: function (options) {
      this._loaded = false;
      this.topicId = options.topicId;

      // from protein family sorter, needs change
      Topic.subscribe('applyKeywordFilter', lang.hitch(this, function () {
        //this.keyword = value;
        this.keyword = arguments[0];
        this.keywordFilter();
        // console.log("received:", arguments);
      }));

      this.watch('state', lang.hitch(this, 'onSetState'));
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
        //qr.total = when(results, function (results) {
        //  return results.total || results.length;
        //});
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

    keywordFilter: function() {
      if (this._filtered == undefined) { // first time
        this._filtered = true;
        this._original = this.query('', {});
        //this._original = this.query('', {});
      }
      var data = this._original;
      var newData = [];

      var keywordRegex = this.keyword.trim().toLowerCase().replace(/,/g, '~').replace(/\n/g, '~')
        .split('~')
        .map(function (k) { return k.trim(); });

      if (this.keyword !== '') {
      data.forEach(function (dataLine) {
        var skip = false;

        // keyword search
        if (!skip && this.keyword !== '') {
          skip = !keywordRegex.some(function (needle) {
            console.log(dataLine);
            if (dataLine.Function) {
              console.log (dataLine.Function);
              return needle && (dataLine.Function.toLowerCase().indexOf(needle) >= 0 || dataLine.Function.toLowerCase().indexOf(needle) >= 0);
            } else {
              skip = true;  // no Function
            }
          });
        }

        if (!skip) {
          newData.push(dataLine);
        }

      }, this);
    

      this.setData(newData);
    } else {
      this.setData(this._original);
    }
      this.set('refresh');

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

      // get data for tsv (currently typed as txt)      
      if (this.state.dataType == 'txt') {
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/);

        // get the headers for the columns by splitting the first line.  
        var tmpColumnHeaders = dataLines[0].split(/\t/);	
      } else {    // csv
        // split on new lines, to get the grid rows
        var dataLines = this.state.data.split(/\r?\n/); 

        var tmpColumnHeaders = dataLines[0].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
      }

      // make column labels from the first line of dataLines
      var gridColumns = [];
      for (i = 0; i < tmpColumnHeaders.length; i++) {
        var columnHeaders = { label: tmpColumnHeaders[i], field: tmpColumnHeaders[i] };

        gridColumns.push(columnHeaders);
      }
      this.columns = gridColumns;

      // fill with data, start with second line of dataLines
      var columnData = [];
      for (i = 1; i < dataLines.length; i++) {  // temporary. start at 1 because columns are hard-coded
        // get data for tsv (currently typed as txt)      
        if (this.state.dataType == 'txt') {
          var tmpData = dataLines[i].split(/\t/);
        } else {
          var tmpData = dataLines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
        }
        var dataRow = {};
        dataRow['RowNumber'] = i;
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
