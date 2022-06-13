define([
  'dojo/_base/declare', 'dojo/on', './SubsystemServiceMemoryGrid', './SubSystemsMemoryGridContainer', 'dojo/topic',
  'dojo/_base/lang', './ComparativeSystemsActionBar', './AdvancedSearchFields'
], function (
  declare, on, SubSystemsGrid, oldGridContainer, Topic, lang, ContainerActionBar, AdvancedSearchFields
) {
  return declare([oldGridContainer], {
    gridCtor: SubSystemsGrid,
    facetFields: AdvancedSearchFields['subsystem'].filter((ff) => ff.facet),
    _loadedFacets: false,

    setTopicId: function (topicId) {
      this.topicId = topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0], value = arguments[1];
        switch (key) {
          case 'refreshGrid':
            console.log('refresh grid');
            break;
          case 'createFilterPanel':
            console.log('createFilterPanel');
            this.populateFilterPanel();
            break;
          default:
            break;
        }
      }));
      // set topic id in grid
      this.grid.setTopicId(this.topicId);

    },

    setFilterUpdateTrigger: function () {
      on(this.domNode, 'UpdateFilterCategory', lang.hitch(this, function (evt) {
        console.log('evt = ', evt);
        // TODO: Start Here: Have filters now set store.query to handle filters
        this.store.updateDataFilter(this.filterPanel.filter);
      }));
      this.filterPanel.setFilterUpdateTrigger();
    },

    // TODO: START HERE create filter panel after data is loaded
    createFilterPanel: function () {
      var _self = this;
      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: true,
        filter: '',
        className: 'BrowserHeader',
        dataModel: _self.dataModel,
        facetFields: _self.facetFields,
        currentContainerWidget: _self,
        _setQueryAttr: function (query) {
          this.getFacets(_self.store.data, this.facetFields).then(lang.hitch(this, function (facet_counts) {
            console.log('facet_counts', facet_counts);
            console.log('this.state', _self.store.state);
            Object.keys(facet_counts).forEach(function (cat) {
              // console.log("Facet Category: ", cat);
              if (this._ffWidgets[cat]) {
                // console.log("this.state: ", this.state);
                var selected = _self.store.state.selected;
                // console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
                this._ffWidgets[cat].set('data', facet_counts[cat], selected);
              } else {
                // console.log("Missing ffWidget for : ", cat);
              }
            }, this);
          }));
        }
      });
    },

    populateFilterPanel: function () {
      if (this.filterPanel) {
        this.filterPanel.getFacets(this.store.data, this.facetFields).then(lang.hitch(this, function (facet_counts) {
          Object.keys(facet_counts).forEach(function (cat) {
            // console.log("Facet Category: ", cat);
            if (this.filterPanel._ffWidgets[cat]) {
              // console.log("this.state: ", this.state);
              var selected = this.store.state.selected;
              // console.log(" Set Facet Widget Data", facets[cat], " _selected: ", this._ffWidgets[cat].selected)
              this.filterPanel._ffWidgets[cat].set('data', facet_counts[cat], selected);
            } else {
              // console.log("Missing ffWidget for : ", cat);
            }
          }, this);
        }));
      }
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      if (this.filterPanel) {
        this.filterPanel.set('state', lang.mixin({}, state, { hashParams: lang.mixin({}, state.hashParams) }));
      }
      if (this.grid) {
        this.grid.set('state', lang.mixin({}, state, { hashParams: lang.mixin({}, state.hashParams) }));
      }
    }
  });
});
