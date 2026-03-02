define([
  'dojo/_base/declare', '../ActionBar', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/on',
  'dojo/topic', 'dojo/query', 'dojo/dom-class', 'dijit/form/TextBox'
], function (
  declare, ActionBar, domConstruct, domStyle, on,
  Topic, query, domClass, TextBox
) {
  return declare([ActionBar], {
    postCreate: function () {
      this.inherited(arguments);
      this.container = domConstruct.create('div', {}, this.domNode);
      this.filters = {
        status: null,
        keyword: ''
      };
    },
    startup: function () {
      this.inherited(arguments);
      var _self = this;

      this.gutters = false;
      domStyle.set(this.domNode, {
        border: 'none',
        margin: '10px 0 0 0',
        padding: '3px 5px'
      });

      var row1 = domConstruct.create('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }
      }, this.container);

      var row2 = domConstruct.create('div', {
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5em'
        }
      }, this.container);

      domConstruct.create('b', {
        style: {
          fontSize: '1.2em',
          lineHeight: '1.2em'
        },
        innerHTML: this.header || 'Workflow Status'
      }, row1);

      var searchBox = new TextBox({
        placeHolder: 'Filter workflows...',
        style: {
          width: '250px'
        }
      });
      searchBox.placeAt(row1);

      var searchTimer = null;
      on(searchBox, 'keyup', function () {
        if (searchTimer) {
          clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(function () {
          _self.filters.keyword = (searchBox.get('value') || '').trim();
          Topic.publish('/WorkflowFilter', _self.filters);
        }, 200);
      });

      var statusBtns = this.statusBtns = domConstruct.create('span', {
        'class': 'JobFilters',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5em'
        }
      }, row2);

      function makeStatusBtn(label, iconClass, value, isActive) {
        var btn = domConstruct.create('span', {
          'class': 'JobFilter' + (isActive ? ' active' : ''),
          innerHTML: '<i class="' + iconClass + '"></i> ' + label,
          style: {
            fontSize: '1.1em'
          }
        }, statusBtns);
        on(btn, 'click', function () {
          query('.JobFilter', statusBtns).forEach(function (node) {
            domClass.remove(node, 'active');
          });
          domClass.add(btn, 'active');
          _self.filters.status = value;
          Topic.publish('/WorkflowFilter', _self.filters);
        });
      }

      makeStatusBtn('All', 'icon-undo', null, true);
      makeStatusBtn('Pending', 'icon-tasks Queued', 'pending', false);
      makeStatusBtn('Running', 'icon-play22 Running', 'running', false);
      makeStatusBtn('Completed', 'icon-checkmark2 Completed', 'completed', false);
      makeStatusBtn('Failed', 'icon-warning2 Failed', 'failed', false);
    }
  });
});

