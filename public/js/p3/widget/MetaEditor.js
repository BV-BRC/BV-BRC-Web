/**
 * MetaEditor
 * - Takes spec file, order of tables, and initial data to edit.
 * - Provides editing capabilities:
 *
 * Supports the following input types:
 *   - text
 *   - textarea
 *   - date
 *   - isList: for any of the above types
 *
 * Inputs
 *   spec - Spec for form.  Should be a hash with table names as keys.
 *     Ex: {
 *       table1: [{
 *         name: 'human readable name',
 *         text: 'some_key_to_data',
 *         type: (text|textarea|date)
 *         isList: (true|false)
 *       }, ...]
 *       ...
 *     }
 *
 *       tableNames - The order of the tables.
 *       Ex: ['table1', 'table2', ...]\
 *
 *       data: {} - (Current) data representation for the form.
 *
 * API
 *   .getValues - returns current values (state) of editor
 *   .getSolrJSON - returns current values of editor, but in solr update form
 *
 * Author(s):
 *  nc
 *
 */

define([
  'dojo', 'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/dom-construct', 'dojo/on',
  'dijit/form/Form', 'dijit/form/TextBox', './Confirmation', 'dojo/request',
  'dijit/form/SimpleTextarea', 'dijit/form/DateTextBox', 'dijit/form/NumberTextBox', './InputList'
], function (
  dojo, declare, WidgetBase, dom, on,
  Form, TextBox, Confirmation, Request,
  TextArea, DateTextBox, NumberTextBox, InputList
) {
  return declare([WidgetBase], {
    // required widget inputs
    dataId: null,    // The unique ID to edit (i.e., a genome id)
    spec: {},        // Spec for form.  Should be a hash with table names as keys.
    tableNames: [],  // The data to be edited is organized into groups, ordered by these names.
    data: {},        // (Current) data repreentation for the form.

    // default api config
    apiUrl: window.App.dataAPI + 'genome/',

    _inputs: [],     // UI input objects
    constructor: function () {},
    postCreate: function () {},
    startup: function () {
      if (this._started) {
        return;
      }

      this._started = true;
    },

    /**
     * Opens the editor (in dialog)
     */
    show: function () {
      var self = this;
      var tableNames = self.tableNames,
        spec = self.spec,
        data = self.data;

      /**
       * Create form
       */
      // var content = dom.toDom('<div>');
      var form = new Form();

      // put form in dialog
      self.dialog = new Confirmation({
        title: 'Edit Metadata',
        okLabel: 'Save',
        style: { width: '800px', height: '80%', overflow: 'scroll' },
        content: form,
        closeOnOK: false,
        onConfirm: function () {
          self.onSave(inputs);
        },
        onCancel: function () {
          this.hideAndDestroy();
        }
      });

      // disable save button until change
      self.dialog.okButton.setDisabled(true);

      // organize table specs according to tableNames list
      var tableSpecs = tableNames.map(function (name) { return spec[name]; });

      // for each table spec, add appropriate inputs
      var inputs = [];
      tableSpecs.forEach(function (tableSpec, i) {
        var tableName = tableNames[i];

        dom.place(
          '<h5 class="DataItemSectionHead" style="margin: 10px 0 0 0;">'
            + tableName +
          '</h5>'
          , form.domNode
        );

        var table = dom.toDom('<table>'),
          tbody = dom.place('<tbody>', table);
        tableSpec.forEach(function (item) {

          var input;
          if (item.type == 'date') {
            input = new DateTextBox({
              value: data[item.text],
              name: item.text,
              style: { width: '275px' },
              onChange: function () {
                self.dialog.okButton.setDisabled(false);
              }
            });
          } else if (item.isList) {
            input = new InputList({
              type: item.type,
              name: item.text,
              values: data[item.text] || [],
              placeHolder: item.editable ? 'Enter ' + item.name + '...' : '-',
              onChange: function () {
                self.dialog.okButton.setDisabled(false);
              }
            });
          } else if (item.type == 'textarea') {
            input = new TextArea({
              name: item.text,
              value: data[item.text] || '',
              style: { width: '275px' },
              placeHolder: item.editable ? 'Enter ' + item.name : '-',
              disabled: !item.editable
            });
          } else if (item.type == 'number') {
            input = new NumberTextBox({
              name: item.text,
              value: data[item.text] || '',
              style: { width: '275px' },
              placeHolder: item.editable ? 'Enter ' + item.name : '-',
              disabled: !item.editable,
              constraints: { pattern: '####' }
            });
          } else {
            input = new TextBox({
              name: item.text,
              value: data[item.text],
              style: { width: '275px' },
              placeHolder: item.editable ? 'Enter ' + item.name : '-',
              disabled: !item.editable
            });
          }

          // disable save button
          on.once(input, 'keyup', function (evt) {
            self.dialog.okButton.setDisabled(false);
            self.dialog.okButton.set('label', 'Save');
          });

          self._inputs.push(input);

          var tr = dom.place('<tr>', tbody);
          dom.place('<td style="width: 50%; vertical-align: top;">' + item.name, tr);
          dom.place(input.domNode, tr);
        });

        dom.place(table, form.domNode);
      });

      dom.place('<br><br>', form.domNode);

      self.dialog.startup();
      self.dialog.show();
    },

    hide: function () {
      self.dialog.hideAndDestroy();
    },

    /**
     * handling for when "save" button is clicked
     */
    onSave: function () {
      var self = this;
      var json = this.getJsonPatch();

      self.dialog.okButton.setDisabled(true);
      self.dialog.okButton.set('label', 'saving...');

      Request.post(this.apiUrl + this.dataId, {
        data: JSON.stringify(json),
        headers: {
          'content-type': 'application/jsonpatch+json',
          authorization: window.App.authorizationToken
        }
      }).then(function (res) {
        self.onSuccess(res);
        self.dialog.hideAndDestroy();
      });
    },

    /**
     * success callback method for after save request has been made
     */
    onSuccess: function () {
      // can be overridden
    },

    /**
     * fail callback method for after save request has been made
     */
    onFail: function () {
      // can be overridden
    },

    /**
     * returns key/value pair of form based on spec names
     */
    getValues: function () {
      var state = {};
      this._inputs.forEach(function (input) {
        var key = input.get('name'),
          value = input.value;

        state[key] = (value == '' ? null : value);
      });

      return state;
    },

    /**
     * support MetaEditor.get('value') as well
     */
    _getValueAttr: function () {
      return this.getValues();
    },

    /**
     * Takes form data and puts into neccessary JSON format for Solr
     * Note: this is not used.  getJsonPatch is being used with the data api
     */
    getSolrJSON: function () {
      var hash = this.getValues();

      var json = [];
      Object.keys(hash).forEach(function (key) {
        var value = hash[key];

        var obj = {};
        obj[key] = { set: value };
        json.push(obj);
      });

      return json;
    },

    /**
     * Takes form data and puts into neccessary JSON format for data api (json patch format)
     *
     * returns json of form:
     *  [{
     *    op: “add”,
     *    path: “/comments”,
     *    value: "whatever string/list/value/etc"
     *  }]
     */
    getJsonPatch: function () {
      var hash = this.getValues();
      var editableList = this.getEditableList();

      var json = [];
      Object.keys(hash).forEach(function (key) {
        var value = hash[key];

        // skip anything that is not editable
        if (editableList.indexOf(key) == -1) return;

        // add appropriate operation to json patch
        var op = {
          op: 'add',
          path: '/' + key,
          value: value || null
        };

        json.push(op);
      });

      return json;
    },

    /**
     * returns a list of the editable fields (based off the spec)
     */
    getEditableList: function () {
      var self = this;

      var editableList = [];
      Object.keys(this.spec).forEach(function (tableName) {
        var items = self.spec[tableName];
        items.forEach(function (item) {
          if (!item.editable) return;
          editableList.push(item.text);
        });
      });
      return editableList;
    }

  });
});
