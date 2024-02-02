define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_Templated',
  'dijit/form/Select', 'dijit/form/TextBox',
  'dojo/dom-construct', 'dojo/dom-class', 'dojo/on',
], function (
  declare, lang,
  WidgetBase, Templated,
  Select, TextBox,
  domConstruct, domClass, on
) {

  const widgetTemplateString = '<div style="display:flex;align-items:center;width:500px"><div data-dojo-attach-point="opNode" style="width:55px;padding:2px"></div><div data-dojo-attach-point="colNode" style="padding:2px"></div><div data-dojo-attach-point="searchNode" style="padding:2px"></div><div data-dojo-attach-point="rangeNode" class="dijitHidden"></div><i class="fa icon-minus2" style="padding: 2px" data-dojo-attach-point="removeIconNode"></i><i class="fa icon-plus2" style="padding: 2px" data-dojo-attach-point="addIconNode"></i></div>'

  return declare([WidgetBase, Templated], {
    templateString: widgetTemplateString,
    hideFirstLogicalOp: false,
    logicalOpOptions: [
      { label: 'Equal', value: 'EQ' },
      { label: 'Not', value: 'NOT' },
    ],
    columnOptions: [],
    columnTypes: {},
    isFirst: false,
    displayAddIcon: true, // need to implement
    index: null,
    postCreate: function () {
      this.inherited(arguments);
      // console.log(this.isFirst)

      this.opSelector = Select({
        style: 'width: 54px',
        class: (this.hideFirstLogicalOp && this.isFirst ? 'dijitHidden' : ''),
        options: this.logicalOpOptions
      })
      domConstruct.place(this.opSelector.domNode, this.opNode, 'last')

      this.fieldSelector = Select({
        style: 'width: 150px;',
        options: this.columnOptions
      })
      domConstruct.place(this.fieldSelector.domNode, this.colNode, 'last')

      on(this.fieldSelector, 'change', lang.hitch(this, (val) => {
        const col_type = this.columnTypes[val]
        if (col_type == 'str') {
          this.switchToStrSearch()
        } else {
          this.switchToRange()
        }
      }))

      // search Node, activate by default
      this.fieldKeyword = TextBox({
        style: 'width: 250px'
      })
      domConstruct.place(this.fieldKeyword.domNode, this.searchNode, 'last')

      // range Node, hide by default
      this.fieldRangeFrom = TextBox({
        style: 'width: 112px;'
      })
      this.fieldRangeTo = TextBox({
        style: 'width: 113px'
      })
      domConstruct.place(this.fieldRangeFrom.domNode, this.rangeNode, 'first')
      domConstruct.place('<span> TO </span>', this.rangeNode, 'last')
      domConstruct.place(this.fieldRangeTo.domNode, this.rangeNode, 'last')

      if (this.isFirst) {
        // hide remove button for the first row
        domClass.add(this.removeIconNode, 'dijitHidden')
      } else {
        // attach click event
        on(this.removeIconNode, 'click', () => {
          on.emit(this.domNode, 'remove', {
            bubble: true,
            cancelable: true,
            idx: this.index
          })
        })
      }

      // add button only for the first row
      if (this.isFirst) {
        on(this.addIconNode, 'click', () => {
          on.emit(this.domNode, 'create', {
            bubble: true,
            cancelable: true
          })
        })
      } else {
        domClass.add(this.addIconNode, 'dijitHidden')
      }

      const value = this.fieldSelector.get("value");
      // Make sure to display range
      if (value) {
        const col_type = this.columnTypes[value];
        if (col_type !== 'str') {
          this.switchToRange();
        }
      }
    },
    switchToStrSearch: function () {
      // reset value, switch toggle
      this.fieldRangeFrom.set('value', '')
      this.fieldRangeTo.set('value', '')
      domClass.add(this.rangeNode, 'dijitHidden')
      domClass.remove(this.searchNode, 'dijitHidden')
    },
    switchToRange: function () {
      // reset value, switch toggle
      this.fieldKeyword.set('value', '')
      domClass.remove(this.rangeNode, 'dijitHidden')
      domClass.add(this.searchNode, 'dijitHidden')
    },
    getValues: function () {
      const op = this.opSelector.get('value')
      const col = this.fieldSelector.get('value')
      const col_type = this.columnTypes[col]

      if (col_type === 'str') {
        const keyword = this.fieldKeyword.get('value')
        return {
          op: op, column: col, type: col_type, value: keyword
        }
      } else {
        // col_type === 'numeric'
        const range_from = this.fieldRangeFrom.get('value')
        const range_to = this.fieldRangeTo.get('value')
        return {
          op: op, column: col, type: col_type, from: range_from, to: range_to
        }
      }
    }
  })
})
