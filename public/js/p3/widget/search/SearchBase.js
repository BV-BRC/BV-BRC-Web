define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  'dijit/popup',
  './TextInputEncoder',
  '../AdvancedSearchFields', '../AdvancedSearchRowForm'
], function (
  declare, lang,
  WidgetBase, Templated, WidgetsInTemplate,
  on, domConstruct, Topic,
  popup,
  TextInputEncoder,
  AdvancedSearchFields, AdvancedSearchRowForm
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    templateString: '',
    dataKey: null,
    _Searches: {},
    _SearchesIdx: 0,
    postCreate: function () {
      this.inherited(arguments)

      if (this.pageTitle) {
        window.document.title = this.pageTitle;
      }

      this.buildSearchPanel()
    },
    buildSearchPanel: function () {
      const searchableFields = AdvancedSearchFields[this.dataKey].filter(ff => ff.search)
      this.fieldSelectOptions = searchableFields.map(ff => {
        const field = ff.field || ff;
	const label = ff.label || field;
        return { id: field, label: label.replace(/_/g, ' '), value: field }
      })

      this.fieldTypes = {}
      searchableFields.forEach((ff) => {
        this.fieldTypes[ff.field] = ff.type
      })

      // initial
      this.createAdvancedSearchRow(null, true)
    },
    createAdvancedSearchRow: function (_evt, isFirst = false) {
      const _row = AdvancedSearchRowForm({
        hideFirstLogicalOp: true,
        logicalOpOptions: [
          { label: 'AND', value: 'AND' },
          { label: 'OR', value: 'OR' },
          { label: 'NOT', value: 'NOT' },
        ],
        columnOptions: this.fieldSelectOptions,
        columnTypes: this.fieldTypes,
        isFirst: isFirst,
        index: this._SearchesIdx
      })
      domConstruct.place(_row.domNode, this.AdvancedSearchPanel, 'last')

      on(_row, 'remove', (evt) => {
        this._Searches[evt.idx].destroyRecursive()
        delete this._Searches[evt.idx]
      })
      on(_row, 'create', lang.hitch(this, 'createAdvancedSearchRow'))
      this._Searches[this._SearchesIdx] = _row
      this._SearchesIdx++;
    },
    buildQuery: function () {
      // customize query
      return this._buildAdvancedQuery().join('&')
    },
    buildFilter: function () {
    },
    buildDefaultColumns: function () {
    },
    _buildAdvancedQuery: function () {
      return Object.keys(this._Searches).map((idx) => {
        const col = this._Searches[idx]
        const condition = col.getValues()
        let q;

        if (condition.type === 'str' && condition.value !== '') {
          const encodedConditionValue = TextInputEncoder(condition.value)
          q = `${condition.op === 'NOT' ? 'ne' : 'eq'}(${condition.column},${encodedConditionValue})`
        } else if (condition.type === 'numeric' || condition.type === 'decimal') {
          // numeric
          const lowerBound = condition.type === 'numeric' ? parseInt(condition.from) : parseFloat(condition.from);
          const upperBound = condition.type === 'numeric' ? parseInt(condition.to) : parseFloat(condition.to);

          if (!isNaN(lowerBound) && !isNaN(upperBound)) {
            q = `between(${condition.column},${lowerBound},${upperBound})`;
          } else if (!isNaN(lowerBound) && isNaN(upperBound)) {
            q = `gt(${condition.column},${lowerBound})`
          } else if (isNaN(lowerBound) && !isNaN(upperBound)) {
            q = `lt(${condition.column},${upperBound})`
          } else {
            // both NaN, skip
            return
          }
          if (condition.op === 'NOT') {
            q = `not(${q})`
          }
        } else if (condition.type === 'date') {
          // Supports partial dates: YYYY, YYYY-MM, or YYYY-MM-DD
          const encodeDateBound = (dateStr, isUpperBound) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-').map(Number);
            const year = parts[0];
            let month, day, hour, min, sec;
            if (isUpperBound) {
              if (parts.length === 1) {
                // YYYY -> Dec 31 end of day
                month = 11; day = 31;
              } else if (parts.length === 2) {
                // YYYY-MM -> last day of that month
                month = parts[1] - 1;
                day = new Date(Date.UTC(year, parts[1], 0)).getUTCDate();
              } else {
                month = parts[1] - 1; day = parts[2];
              }
              hour = 23; min = 59; sec = 59;
            } else {
              if (parts.length === 1) {
                month = 0; day = 1;
              } else if (parts.length === 2) {
                month = parts[1] - 1; day = 1;
              } else {
                month = parts[1] - 1; day = parts[2];
              }
              hour = 0; min = 0; sec = 0;
            }
            return encodeURIComponent(
              new Date(Date.UTC(year, month, day, hour, min, sec)).toISOString()
            );
          };
          const lowerBound = encodeDateBound(condition.from, false);
          const upperBound = encodeDateBound(condition.to, true);

          if (lowerBound && upperBound) {
            q = `between(${condition.column},${lowerBound},${upperBound})`;
          } else if (lowerBound && !upperBound) {
            q = `gt(${condition.column},${lowerBound})`;
          } else if (!lowerBound && upperBound) {
            q = `lt(${condition.column},${upperBound})`;
          } else {
            // both bounds are invalid, skip
            return;
          }

          if (condition.op === 'NOT') {
            q = `not(${q})`;
          }
        } else {
          return
        }

        if (condition.op === 'OR') {
          q = `or(${q})`
        }
        return q
      }).filter(cond => cond !== '' && cond !== undefined)
    },
    onSubmit: async function (evt) {
      evt.preventDefault();
      evt.stopPropagation();

      // Close any open calendar popups
      Object.keys(this._Searches).forEach(lang.hitch(this, function (idx) {
        var row = this._Searches[idx];
        if (row._dateFromDialog) {
          popup.close(row._dateFromDialog);
          row._dateFromOpen = false;
        }
        if (row._dateToDialog) {
          popup.close(row._dateToDialog);
          row._dateToOpen = false;
        }
      }));

      const query = this.buildQuery();
      const filter = await this.buildFilter();
      const defaultColumns = this.buildDefaultColumns();

      let url = this.resultUrlBase + query + this.resultUrlHash;
      if (filter) {
        url += '&filter=' + filter;
      }
      if (defaultColumns) {
        url += '&defaultColumns=' + defaultColumns;
      }
      Topic.publish('/navigate', { href: url });
    }
  })
})
