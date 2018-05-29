define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-style', 'dojo/query', 'dojo/dom-attr', 'dojo/aspect', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  './GridSelector', 'put-selector/put',
  './Grid', '../store/ArrangeableMemoryStore'
], function (
  declare, lang, Deferred,
  on, request, domStyle, domQuery, domAttr, aspect, Topic,
  BorderContainer, ContentPane,
  selector, put,
  Grid, Store
) {

  var filterSelector = function (value, cell, object) {
    var parent = cell.parentNode;

    // must set the class name on the outer cell in IE for keystrokes to be intercepted
    put(parent && parent.contents ? parent : cell, '.dgrid-selector');
    var input = cell.input || (cell.input = put(cell, 'i', {
      tabIndex: -1,
      checked: !!value
    }));
    input.setAttribute('class', value ? 'fa icon-check-square-o' : 'fa icon-square-o');
    input.setAttribute('aria-checked', !!value);

    return input;
  };

  var filterSelectorChecked = function (value, cell, object) {
    return filterSelector(true, cell, object);
  };

  var store = new Store({
    idProperty: 'pid'
  });

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: store,
    tgState: null,
    dataModel: 'transcriptomics_sample',
    primaryKey: 'pid',
    deselectOnRefresh: true,
    columns: {
      present: selector({
        label: '', field: 'present', selectorType: 'radio', unhidable: true
      }, filterSelector),
      absent: selector({
        label: '', field: 'absent', selectorType: 'radio', unhidable: true
      }, filterSelector),
      mixed: selector({
        label: '', field: 'mixed', selectorType: 'radio', unhidable: true
      }, filterSelectorChecked),
      source: { label: 'Source', field: 'source', hidden: true },
      comparison_id: { label: 'Comparison ID', field: 'pid', hidden: true },
      title: { label: 'Title', field: 'expname' },
      strain: { label: 'Strain', field: 'strain' },
      modification: { label: 'Modification', field: 'mutant' },
      condition: { label: 'Condition', field: 'condition' },
      timepoint: { label: 'Time Point', field: 'timepoint' }
    },
    constructor: function (options) {
      if (options && options.state) {
        this.state = options.state;
      }
      this.topicId = options.topicId;

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("TranscriptomicsGeneFilterGrid:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            this.tgState = value;
            break;
          case 'updateFilterGrid':
            this.store.setData(value);
            this.store._loaded = true;
            this.refresh();
            break;
          case 'updateFilterGridOrder':
            this.set('sort', []);
            this.store.arrange(value);
            this.refresh();
            break;
          default:
            break;
        }
      }));
    },
    startup: function () {

      var options = ['present', 'absent', 'mixed'];
      var toggleSelection = function (element, value) {
        element.checked = value;
        element.setAttribute('class', value ? 'fa icon-check-square-o' : 'fa icon-square-o');
        element.setAttribute('aria-checked', value);
      };

      this.on('.dgrid-cell:click', lang.hitch(this, function (evt) {
        var cell = this.cell(evt);
        var colId = cell.column.id;
        var columnHeaders = cell.column.grid.columns;

        var conditionIds = this.tgState.comparisonIds;
        var conditionStatus = this.tgState.comparisonFilterStatus;

        if (!cell.element.input) return;

        if (cell.row) {
          // data row is clicked
          var rowId = cell.row.id;

          // deselect other radio in the same row
          options.forEach(function (el) {
            if (el != colId && this.cell(rowId, el).element.input.checked) {
              toggleSelection(this.cell(rowId, el).element.input, false);
            }

            // updated selected box
            if (el === colId) {
              toggleSelection(this.cell(rowId, el).element.input, true);
            }
          }, this);

          // check whether entire rows are selected & mark as needed
          options.forEach(function (el) {
            var allSelected = true;
            conditionIds.forEach(function (conditionId) {
              if (this.cell(conditionId, el).element.input.checked == false) {
                allSelected = false;
              }
            }, this);
            toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, allSelected);
          }, this);

        } else {
          // if header is clicked, reset the selections & update
          conditionIds.forEach(function (conditionId) {
            options.forEach(function (el) {
              if (el === colId) {
                toggleSelection(this.cell(conditionId, el).element.input, true);
              } else {
                toggleSelection(this.cell(conditionId, el).element.input, false);
              }
            }, this);
          }, this);

          // deselect other radio in the header
          options.forEach(function (el) {
            if (el != colId && columnHeaders[el].headerNode.firstChild.firstElementChild.checked) {
              toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, false);
            }
          });
        }

        // update filter
        Object.keys(conditionStatus).forEach(function (conditionId) {
          var status = options.findIndex(function (el) {
            if (this.cell(conditionId, el).element.input.checked) {
              return el;
            }
          }, this);

          conditionStatus[conditionId].setStatus(status);
        }, this);

        this.tgState.comparisonFilterStatus = conditionStatus;
        Topic.publish(this.topicId, 'applyConditionFilter', this.tgState);
      }));

      aspect.before(this, 'renderArray', lang.hitch(this, function (results) {
        Deferred.when(results.total, lang.hitch(this, function (x) {
          this.set('totalRows', x);
        }));
      }));

      // this.inherited(arguments);
      this._started = true;

      // increase grid width after rendering content-pane
      domStyle.set(this.id, 'width', '750px');
      // set checkbox title after load
      domAttr.set(domQuery('.field-present .dgrid-resize-header-container i')[0], 'title', 'Up regulate');
      domAttr.set(domQuery('.field-absent .dgrid-resize-header-container i')[0], 'title', 'Down regulate');
      domAttr.set(domQuery('.field-mixed .dgrid-resize-header-container i')[0], 'title', "Don't care");
    },
    _setSort: function (sort) {
      this.inherited(arguments);
      this.store.sort = sort;

      if (sort.length > 0) {
        // console.log("old order", this.pfState.genomeIds);
        var newIds = [];
        var idProperty = this.store.idProperty;
        this.store.query({}, { sort: sort }).forEach(function (condition) {
          newIds.push(condition[idProperty]);
        });
        this.tgState.clusterRowOrder = newIds;
        // console.log("new order", this.pfState.clusterRowOrder);

        Topic.publish(this.topicId, 'updateTgState', this.tgState);
        Topic.publish(this.topicId, 'requestHeatmapData', this.tgState);
      }
    },
    state: null,
    postCreate: function () {
      this.inherited(arguments);
    },
    _setApiServer: function (server) {
      this.apiServer = server;
    }
  });
});
