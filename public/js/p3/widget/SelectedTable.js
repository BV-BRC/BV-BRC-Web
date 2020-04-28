define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/dom-construct', 'dojo/query',

  'dojo/NodeList-traverse'
], function (
  declare, WidgetBase, dom, query
) {
  return declare([WidgetBase], {
    colNames: [],     // names of columns
    colKeys: [],      // names of keys for each column
    label: null,      // labels items. example: {rowIndex: 1, colKey: 'name', format: function(rowObj) {}}
    _rows: [],        // data model for rows in table

    _tableHTML:
      '<table class="p3basic striped-light" style="font-size: .8em; margin-bottom: 10px;">' +
        '<thead>' +
        '</thead>' +
        '<tbody>' +
        '</tbody>' +
      '</table>',

    _emptyHtML:
      '<tr class="none-selected">' +
        '<td colspan="3"><i class="pull-left">None Selected</i></td>' +
      '</tr>',

    _emptyEle: null,   // dom element for empty table

    constructor: function () {
      this._rows = [];
    },

    postCreate: function () {
      var self = this;
      self.inherited(arguments);

      // add list container
      var table = self.table = dom.toDom(this._tableHTML),
        thead = query('thead', table)[0],
        row =  dom.place('<tr>', thead);

      // add header
      self.colNames.forEach(function (name) {
        dom.place('<th>' + name + '</th>', row);
      });
      dom.place('<th style="width: 1px;">&nbsp;</th>', row);

      dom.place(row, thead);
      dom.place(table, self.domNode, 'last');

      // "none selected"
      self._addEmptyNotice();
    },

    startup: function () {
      // startup
    },

    /**
     * add item to tablerow of input
     */
    addRow: function (rowObj) {

      var self = this;

      // remove "none selected"
      dom.destroy(self._emptyEle);

      // add to data model
      var rowID = self.table.rows.length;
      self._rows.push(Object.assign({ _rowID: rowID }, rowObj));

      //  add to dom
      var tr = dom.toDom('<tr data-id="' + rowID + '"></tr>');

      var entries = self.colKeys.map(function (key) {
        // add special formatting if needed
        if (self.label && self.label.rowIndex == rowID && self.label.colKey == key) {
          return '<td data-key="' + key + '">' +  self.label.format(rowObj) + '</td>';
        }

        return '<td data-key="' + key + '">'  + rowObj[key] + '</td>';
      });

      dom.place(dom.toDom(entries.join('')), tr);
      var rmBtn = dom.toDom('<i class="fa icon-times rm-btn"></i>');
      dom.place('<td style="width: 1px">' + rmBtn.outerHTML + '</td>', tr);

      var tbody = query('tbody', self.table)[0];
      dom.place(tr, tbody);

      // reinit delete event
      self._addDeleteEvent(tr);
    },

    _rmRow: function (rowIndex) {
      // update data model
      this._rows.splice(rowIndex - 1, 1);
    },

    _addDeleteEvent: function (tr) {
      var self = this;

      query('.rm-btn', tr).on('click', function () {
        var row = query(this).parents('tr')[0];
        var rowIndex = row.rowIndex;

        self._rmRow(rowIndex);
        dom.destroy(row);

        // add none selected if needed
        if (!self._rows.length) {
          self._addEmptyNotice();
        }

        // add label if needed, and if not removing the last remaining row
        if (self.label && self.label.rowIndex == rowIndex && self._rows.length) {
          var tbody = query('tbody', self.table)[0];
          var i = rowIndex - 1;  // data model is zero-indexed
          var tr = query('tr', tbody)[i];
          var td = query('[data-key="' + self.label.colKey + '"]', tr)[0];
          td.innerHTML = self.label.format(self._rows[i]);
        }
      });
    },

    _addEmptyNotice: function () {
      var tbody = query('tbody', this.table)[0];
      this._emptyEle = dom.place(this._emptyHtML, tbody);
    },

    _getNameAttr: function () {
      // returns the name of the input set
      return this.name;
    },

    getRows: function () {
      return this._rows;
    },

    clear: function () {
      var tbody = query('tbody', this.table)[0];
      dom.empty(tbody);
      this._rows = [];

      this._addEmptyNotice();
    },

    onRmRow: function (id) {
      // if remove item call back is provided, call it
      if (this.onRemove) this.onRemove();
    }


  });
});
