define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  './TextInputEncoder',
  '../AdvancedSearchFields', '../AdvancedSearchRowForm'
], function (
  declare, lang,
  WidgetBase, Templated, WidgetsInTemplate,
  on, domConstruct, Topic,
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
        return { id: field, label: field.replace(/_/g, ' '), value: field }
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
          const encode = (date) => {
            if (!date) {
              return '';
            }

            const parsedDate = new Date(date);
            const utcDate = new Date(Date.UTC(
              parsedDate.getUTCFullYear(),
              parsedDate.getUTCMonth(),
              parsedDate.getUTCDate()
            ));
            return encodeURIComponent(utcDate.toISOString());
          };
          const lowerBound = encode(condition.from);
          const upperBound = encode(condition.to);

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
