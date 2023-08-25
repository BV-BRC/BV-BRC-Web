define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-style', 'dojo/query', 'dojo/dom-attr', 'dojo/aspect', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  'dgrid/selector', 'put-selector/put',
  '../store/ArrangeableMemoryStore', './Grid', './formatter'
], function (
  declare, lang, Deferred,
  on, request, domStyle, domQuery, domAttr, aspect, Topic,
  BorderContainer, ContentPane,
  selector, put,
  Store, Grid, formatter
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

  // create empty Memory Store
  var store = new Store({
    idProperty: 'genome_id'
  });

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: store,
    bufferRows: 500,
    pfState: null,
    dataModel: 'genome',
    primaryKey: 'genome_id',
    deselectOnRefresh: true,
    columns: {
      present: selector({ label: '', field: 'present', selectorType: 'radio' }, filterSelector),
      absent: selector({ label: '', field: 'absent', selectorType: 'radio' }, filterSelector),
      mixed: selector({ label: '', field: 'mixed', selectorType: 'radio' }, filterSelectorChecked),
      genome_name: { label: 'Genome Name', field: 'genome_name' },
      genome_group: { label: 'Genome Group', field: 'genome_group' }
      // genome_status: { label: 'Genome Status', field: 'genome_status' },
      // isolation_country: { label: 'Isolation Country', field: 'isolation_country' },
      // host_name: { label: 'Host', field: 'host_name' },
      // disease: { label: 'Disease', field: 'disease' },
      // collection_date: { label: 'Collection Date', field: 'collection_date' },
      // completion_date: { label: 'Completion Date', field: 'completion_date', formatter: formatter.dateOnly }
    },
    constructor: function (options) {
      if (options && options.state) {
        this.state = options.state;
      }
      this.topicId = options.topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            break;
          case 'updateFilterGrid':
            console.log('updateFIlterGrid value = ', value);
            this.store.setData(value);
            this.store._loaded = true;
            this.refresh();
            break;
          case 'updateFilterGridOrder':
            console.log('sorting');
            // this.updateSortArrow([]);
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
        console.log('cell evt = ', evt);
        var cell = this.cell(evt);
        var colId = cell.column.id;
        var columnHeaders = cell.column.grid.columns;

        var conditionIds = this.pfState.genomeIds;
        var conditionStatus = this.pfState.genomeFilterStatus;

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
            if (el == colId && !columnHeaders[el].headerNode.firstChild.firstElementChild.checked) {
              toggleSelection(columnHeaders[el].headerNode.firstChild.firstElementChild, true);
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

        this.pfState = lang.mixin({}, this.pfState, {
          genomeFilterStatus: conditionStatus,
          clusterColumnOrder: []
        });

        Topic.publish(this.topicId, 'applyGenomeSelector', this.pfState);
      }));

      aspect.before(this, 'renderArray', lang.hitch(this, function (results) {
        Deferred.when(results.total, lang.hitch(this, function (x) {
          this.set('totalRows', x);
        }));
      }));

      // this.inherited(arguments);
      this._started = true;

      // increase grid width after rendering content-pane
      domStyle.set(this.id, 'width', '650px');
      // set checkbox title after load
      // console.log(domQuery(".field-present .dgrid-resize-header-container i"));
      domAttr.set(domQuery('.field-present .dgrid-resize-header-container i')[0], 'title', 'Present in all families');
      domAttr.set(domQuery('.field-absent .dgrid-resize-header-container i')[0], 'title', 'Absent in all families');
      domAttr.set(domQuery('.field-mixed .dgrid-resize-header-container i')[0], 'title', 'Either/Mixed');
    },
    _setSort: function (sort) {
      this.inherited(arguments);
      this.store.sort = sort;
      if (sort.length > 0) {
        var newIds = [];
        var idProperty = this.store.idProperty;
        this.store.query({}, { sort: sort }).forEach(function (condition) {
          newIds.push(condition[idProperty]);
        });
        this.pfState.clusterRowOrder = newIds;
        // console.log("new order", this.pfState.clusterRowOrder);

        Topic.publish(this.topicId, 'updatePfState', this.pfState);
        Topic.publish(this.topicId, 'requestHeatmapData', this.pfState);
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
