define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_Templated',
  'dijit/form/Select', 'dijit/form/TextBox',
  'dijit/form/ValidationTextBox',
  'dijit/Calendar', 'dijit/TooltipDialog', 'dijit/popup',
  'dojo/dom-construct', 'dojo/dom-class', 'dojo/on', 'dojo/dom',
], function (
  declare, lang,
  WidgetBase, Templated,
  Select, TextBox, ValidationTextBox,
  Calendar, TooltipDialog, popup,
  domConstruct, domClass, on, dom
) {

  const widgetTemplateString = '<div style="display:flex;align-items:center;width:500px"><div data-dojo-attach-point="opNode" style="width:55px;padding:2px"></div><div data-dojo-attach-point="colNode" style="padding:2px"></div><div data-dojo-attach-point="searchNode" style="padding:2px"></div><div data-dojo-attach-point="rangeNode" class="dijitHidden"></div><div data-dojo-attach-point="dateRangeNode" class="dijitHidden"></div><i class="fa icon-minus2" style="padding: 2px" data-dojo-attach-point="removeIconNode"></i><i class="fa icon-plus2" style="padding: 2px" data-dojo-attach-point="addIconNode"></i></div>'

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
        if (col_type === 'date') {
          this.switchToDateRange()
        } else if (col_type == 'str') {
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

      // date range Node - text inputs accepting YYYY, YYYY-MM, or YYYY-MM-DD + calendar popups
      this.fieldDateFrom = new ValidationTextBox({
        style: 'width: 95px;',
        placeHolder: 'YYYY-MM-DD',
        regExp: '\\d{4}(-\\d{2}(-\\d{2})?)?',
        invalidMessage: 'Use YYYY, YYYY-MM, or YYYY-MM-DD'
      })
      this.fieldDateTo = new ValidationTextBox({
        style: 'width: 95px;',
        placeHolder: 'YYYY-MM-DD',
        regExp: '\\d{4}(-\\d{2}(-\\d{2})?)?',
        invalidMessage: 'Use YYYY, YYYY-MM, or YYYY-MM-DD'
      })

      // Calendar popups for convenient date picking
      this._dateFromCalendar = new Calendar({})
      this._dateFromDialog = new TooltipDialog({ content: this._dateFromCalendar })
      this._dateToCalendar = new Calendar({})
      this._dateToDialog = new TooltipDialog({ content: this._dateToCalendar })

      on(this._dateFromCalendar, 'change', lang.hitch(this, function (date) {
        this.fieldDateFrom.set('value', this._formatDate(date))
        popup.close(this._dateFromDialog)
        this._dateFromOpen = false
        if (this._dateFromOutsideHandle) {
          this._dateFromOutsideHandle.remove()
          this._dateFromOutsideHandle = null
        }
      }))
      on(this._dateToCalendar, 'change', lang.hitch(this, function (date) {
        this.fieldDateTo.set('value', this._formatDate(date))
        popup.close(this._dateToDialog)
        this._dateToOpen = false
        if (this._dateToOutsideHandle) {
          this._dateToOutsideHandle.remove()
          this._dateToOutsideHandle = null
        }
      }))

      this._dateFromOpen = false
      this._dateToOpen = false

      domConstruct.place(this.fieldDateFrom.domNode, this.dateRangeNode, 'last')
      var calBtnFrom = domConstruct.create('span', {
        className: 'icon-calendar',
        style: 'cursor:pointer;padding:0 4px;font-size:14px;vertical-align:middle;',
        title: 'Pick start date'
      }, this.dateRangeNode, 'last')
      on(calBtnFrom, 'click', lang.hitch(this, function (e) {
        e.stopPropagation()
        if (this._dateFromOpen) {
          popup.close(this._dateFromDialog)
          this._dateFromOpen = false
        } else {
          // close the other popup if open
          if (this._dateToOpen) {
            popup.close(this._dateToDialog)
            this._dateToOpen = false
          }
          popup.open({
            popup: this._dateFromDialog,
            around: calBtnFrom
          })
          this._dateFromOpen = true
          // close on click outside
          this._dateFromOutsideHandle = on(document, 'click', lang.hitch(this, function (evt) {
            if (!dom.isDescendant(evt.target, this._dateFromDialog.domNode) &&
                evt.target !== calBtnFrom) {
              popup.close(this._dateFromDialog)
              this._dateFromOpen = false
              if (this._dateFromOutsideHandle) {
                this._dateFromOutsideHandle.remove()
                this._dateFromOutsideHandle = null
              }
            }
          }))
        }
      }))

      domConstruct.place('<span> TO </span>', this.dateRangeNode, 'last')

      domConstruct.place(this.fieldDateTo.domNode, this.dateRangeNode, 'last')
      var calBtnTo = domConstruct.create('span', {
        className: 'icon-calendar',
        style: 'cursor:pointer;padding:0 4px;font-size:14px;vertical-align:middle;',
        title: 'Pick end date'
      }, this.dateRangeNode, 'last')
      on(calBtnTo, 'click', lang.hitch(this, function (e) {
        e.stopPropagation()
        if (this._dateToOpen) {
          popup.close(this._dateToDialog)
          this._dateToOpen = false
        } else {
          // close the other popup if open
          if (this._dateFromOpen) {
            popup.close(this._dateFromDialog)
            this._dateFromOpen = false
          }
          popup.open({
            popup: this._dateToDialog,
            around: calBtnTo
          })
          this._dateToOpen = true
          // close on click outside
          this._dateToOutsideHandle = on(document, 'click', lang.hitch(this, function (evt) {
            if (!dom.isDescendant(evt.target, this._dateToDialog.domNode) &&
                evt.target !== calBtnTo) {
              popup.close(this._dateToDialog)
              this._dateToOpen = false
              if (this._dateToOutsideHandle) {
                this._dateToOutsideHandle.remove()
                this._dateToOutsideHandle = null
              }
            }
          }))
        }
      }))

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
      // Make sure to display the correct input type
      if (value) {
        const col_type = this.columnTypes[value];
        if (col_type === 'date') {
          this.switchToDateRange();
        } else if (col_type !== 'str') {
          this.switchToRange();
        }
      }
    },
    switchToStrSearch: function () {
      // reset value, switch toggle
      this.fieldRangeFrom.set('value', '')
      this.fieldRangeTo.set('value', '')
      this.fieldDateFrom.set('value', '')
      this.fieldDateTo.set('value', '')
      domClass.add(this.rangeNode, 'dijitHidden')
      domClass.add(this.dateRangeNode, 'dijitHidden')
      domClass.remove(this.searchNode, 'dijitHidden')
    },
    switchToRange: function () {
      // reset value, switch toggle
      this.fieldKeyword.set('value', '')
      this.fieldDateFrom.set('value', '')
      this.fieldDateTo.set('value', '')
      domClass.remove(this.rangeNode, 'dijitHidden')
      domClass.add(this.searchNode, 'dijitHidden')
      domClass.add(this.dateRangeNode, 'dijitHidden')
    },
    switchToDateRange: function () {
      // reset other inputs, show date pickers
      this.fieldKeyword.set('value', '')
      this.fieldRangeFrom.set('value', '')
      this.fieldRangeTo.set('value', '')
      domClass.add(this.searchNode, 'dijitHidden')
      domClass.add(this.rangeNode, 'dijitHidden')
      domClass.remove(this.dateRangeNode, 'dijitHidden')
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
      } else if (col_type === 'date') {
        // date type — raw string values (YYYY, YYYY-MM, or YYYY-MM-DD)
        const from = this.fieldDateFrom.get('value') || ''
        const to = this.fieldDateTo.get('value') || ''
        return {
          op: op, column: col, type: col_type, from: from.trim(), to: to.trim()
        }
      } else {
        // col_type === 'numeric' or 'decimal'
        const range_from = this.fieldRangeFrom.get('value')
        const range_to = this.fieldRangeTo.get('value')
        return {
          op: op, column: col, type: col_type, from: range_from, to: range_to
        }
      }
    },
    _formatDate: function (date) {
      var y = date.getFullYear()
      var m = ('0' + (date.getMonth() + 1)).slice(-2)
      var d = ('0' + date.getDate()).slice(-2)
      return y + '-' + m + '-' + d
    }
  })
})
