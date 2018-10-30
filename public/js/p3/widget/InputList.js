define([
  'dojo', 'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/dom-construct',
  'dijit/form/TextBox', 'dijit/form/SimpleTextarea', 'dijit/form/Button', 'dojo/on',
  'dojo/query', 'dojo/NodeList-traverse'
], function (
  dojo, declare, WidgetBase, dom,
  TextBox, TextArea, Button, on, query
) {
  return declare([WidgetBase], {
    options: {                                // options for form
      width: '275px'
    },                                        // options for form
    values: [],                               // initial list of items
    placeHolder: 'Enter an item to add...',   // add item placeholder text
    type: 'text',                             // type of input (text|textarea)
    name: null,                               // name of collections of inputs
    _currentNewValue: '',       // value of new item to be added
    constructor: function () {
      this._listItems = [];
      this._listContainer = dom.toDom('<div class="list-container">');
    },

    postCreate: function () {
      var self = this;
      self.inherited(arguments);

      // add list container
      dom.place(this._listContainer, this.domNode);

      // add initial items
      self.values.forEach(function (item) {
        self._addRow(item);
      });

      // add "add item" row
      self._addNewItemRow();
    },

    startup: function () {
      // startup
    },

    onChange: function (evt) {
      // can override
    },

    _getValueAttr: function () {
      return this.value;
    },

    _getNameAttr: function () {
      // returns the name of the input set
      return this.name;
    },

    /**
         * add row of input
         */
    _addRow: function (item) {
      var self = this;
      /**
             * add row with text box and remove button
             */
      var line = dom.toDom('<div class data-num="' + this._listItems.length + '"></div>');

      var textBox;
      if (self.type == 'textarea') {
        textBox = new TextArea({
          intermediateChanges: true,
          value: item,
          style: {
            width: self.options.width,
            margin: '2px 5px 2px 0'
          }
        });
      } else {
        textBox = new TextBox({
          value: item,
          style: {
            width: self.options.width,
            margin: '2px 5px 2px 0'
          }
        });
      }

      on(textBox, 'keyup', function (evt) { self.onChange(evt); });

      dom.place(textBox.domNode, line);

      var rmBtn = dom.toDom('<i class="fa icon-remove"></i>');
      on(rmBtn, 'click', function () {
        var row = query(this).closest('div')[0],
          rowNum = dojo.attr(row, 'data-num');

        dom.destroy(row);
        self._listItems.splice(rowNum, 1); // remove item from data model
        this.value = this._listItems;

        // call back event
        self.onChange();
      });
      dom.place(rmBtn, line);

      // add row to dom
      dom.place(line, this._listContainer);

      /**
             * add item to data model
             */
      this._listItems.push(item);
      this.value = this._listItems;
    },

    /**
         * adds input for new item with "add" button
         */
    _addNewItemRow: function () {
      var self = this;

      var line = dom.toDom('<div>');

      var newItemInput;
      if (self.type == 'textarea') {
        newItemInput = new TextArea({
          intermediateChanges: true,
          style: {
            width: self.options.width,
            height: '25px',
            margin: '2px 5px 2px 0'
          },
          placeHolder: self.placeHolder
        });
      } else {
        newItemInput = new TextBox({
          intermediateChanges: true,
          style: { width: self.options.width },
          placeHolder: self.placeHolder
        });
      }

      on(newItemInput, 'keyup', function (evt) {
        self.onChange(evt);
      });

      dom.place(newItemInput.domNode, line);

      var addBtn = new Button({
        label: '<i class="icon-plus"></i> Add',
        disabled: true,
        onClick: function (e) {
          var value = newItemInput.get('value');
          self._addRow(value);
          var value = newItemInput.set('value', '');
        }
      });
      dom.place(addBtn.domNode, line);

      dojo.connect(newItemInput, 'onChange', function (value) {
        // enable "add" button
        if (value.length) addBtn.setDisabled(false);
        else addBtn.setDisabled(true);

        // save current value
        self._currentNewValue = value;
        self.value = self._listItems.concat(self._currentNewValue);
        self.onChange();
      });
      dom.place(line, this.domNode);
    }
  });

});
