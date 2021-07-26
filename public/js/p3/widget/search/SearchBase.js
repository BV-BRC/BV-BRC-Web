define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  '../AdvancedSearchFields', '../AdvancedSearchRowForm'
], function (
  declare, lang,
  WidgetBase, Templated, WidgetsInTemplate,
  on, domConstruct, Topic,
  AdvancedSearchFields, AdvancedSearchRowForm
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    templateString: '',
    dataKey: null,
    _Searches: {},
    _SearchesIdx: 0,
    postCreate: function () {
      this.inherited(arguments)

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
    _buildAdvancedQuery: function () {
      return Object.keys(this._Searches).map((idx) => {
        const col = this._Searches[idx]
        const condition = col.getValues()
        let q;

        if (condition.type === 'str' && condition.value !== '') {
          q = `${condition.op === 'NOT' ? 'ne' : 'eq'}(${condition.column},${condition.value})`
        } else if (condition.type === 'numeric') {
          // numeric
          const lowerBound = parseInt(condition.from)
          const upperBound = parseInt(condition.to)

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
        } else {
          return
        }

        if (condition.op === 'OR') {
          q = `or(${q})`
        }
        return q
      }).filter(cond => cond !== '' && cond !== undefined)
    },
    onSubmit: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();

      const query = this.buildQuery()
      if (query !== '') {
        Topic.publish('/navigate', { href: this.resultUrlBase + query + this.resultUrlHash });
      } else {
        // mark error
      }
    }
  })
})
