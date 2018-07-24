define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/on', 'dojo/topic',
  'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar'
], function (
  declare, lang,
  domConstruct, on, Topic,
  Select, Button,
  ContainerActionBar
) {

  return declare([ContainerActionBar], {
    style: 'height: 52px; margin:0px;padding:0px; overflow: hidden;',
    minimized: true,
    minSize: 52,
    absoluteMinSize: 52,
    query: '',
    state: null,
    filter: '',
    dataModel: '',
    apiServer: window.App.dataAPI,
    authorizationToken: window.App.authorizationToken,
    enableAnchorButton: false,
    constructor: function () {
      this._ffWidgets = {};
      this._ffValueButtons = {};
      this._filter = {};
      this.minimized = true;
    },
    _setStateAttr: function (state) {
      state = state || {};
      this._set('state', state);
    },
    onSetState: function (attr, oldVal, state) {
      // console.log("FilterContainerActionBar onSetState: ", state)
      state.search = (state.search && (state.search.charAt(0) == '?')) ? state.search.substr(1) : (state.search || '');
    },

    postCreate: function () {
      this.inherited(arguments);

      domConstruct.destroy(this.pathContainer);

      this.smallContentNode = domConstruct.create('div', {
        'class': 'minFilterView',
        style: { margin: '2px' }
      }, this.domNode);

      var table = this.smallContentNode = domConstruct.create('table', {
        style: {
          'border-collapse': 'collapse',
          margin: '0px',
          padding: '0px',
          background: '#fff'
        }
      }, this.smallContentNode);

      var tr = domConstruct.create('tr', {}, table);
      this.leftButtons = domConstruct.create('td', {
        style: {
          width: '1px',
          'text-align': 'left',
          padding: '4px',
          'white-space': 'nowrap',
          background: '#fff'
        }
      }, tr);

      this.containerNode = this.actionButtonContainer = this.centerButtons = domConstruct.create('td', {
        style: {
          border: '0px',
          'border-left': '2px solid #aaa',
          'text-align': 'left',
          padding: '4px',
          background: '#fff'
        }
      }, tr);

      this.rightButtons = domConstruct.create('td', {
        style: {
          'text-align': 'right',
          padding: '4px',
          background: '#fff',
          width: '1px',
          'white-space': 'nowrap'
        }
      }, tr);

      var customFilterBox = domConstruct.create('div', {
        style: {
          display: 'inline-block',
          'vertical-align': 'top',
          'margin-top': '4px',
          'margin-left': '2px'
        }
      }, this.centerButtons);

      this.cutoff = new Select({
        name: 'selectCutOff',
        options: [{ value: 1, label: '1' }, { value: 0.8, label: '0.8' },
          { value: 0.6, label: '0.6' }, { value: 0.4, label: '0.4' },
          { value: 0.2, label: '0.2' }, { value: 0, label: '0' }],
        value: 0.4,
        style: 'width: 60px; margin: 0px 15px 0px 0px'
      });
      this.cutoff_label = domConstruct.create('label', { innerHTML: 'Correlation Cutoff: ' });
      domConstruct.place(this.cutoff_label, customFilterBox, 'last');
      domConstruct.place(this.cutoff.domNode, customFilterBox, 'last');

      this.direction = new Select({
        name: 'selectCorrelation',
        options: [{ value: 'pos', label: 'positive' }, { value: 'neg', label: 'negative' }],
        value: 'pos',
        style: 'width: 70px; margin: 0px 15px 0px 0px'
      });
      this.direction_label = domConstruct.create('label', { innerHTML: 'Correlation: ' });
      domConstruct.place(this.direction_label, customFilterBox, 'last');
      domConstruct.place(this.direction.domNode, customFilterBox, 'last');

      var self = this;
      var btn_submit = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function () {

          var filter = {};
          filter.cutoff_value = parseFloat(self.cutoff.get('value'));
          filter.cutoff_dir = self.direction.get('value');

          Topic.publish('CorrelatedGenes', 'filter', filter);
        })
      });
      domConstruct.place(btn_submit.domNode, customFilterBox, 'last');

      this.watch('state', lang.hitch(this, 'onSetState'));

    },

    _setQueryAttr: function (query) {
      this._set('query', query);

    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._started = true;

      this.onSetState('state', '', this.state);

      if (this.currentContainerWidget) {
        this.currentContainerWidget.resize();
      }
    },

    addAction: function (name, classes, opts, fn, enabled, target) {
      if (target && typeof target == 'string') {
        if (target == 'left') {
          target = this.leftButtons;
        } else if (target == 'right') {
          target = this.rightButtons;
        }
      }

      // console.log("Add Action: ", name, classes, opts,enabled);
      target = target || this.leftButtons;
      var wrapper = domConstruct.create('div', {
        'class': (enabled ? '' : 'dijitHidden ') + 'ActionButtonWrapper',
        rel: name
      });
      domConstruct.create('div', { className: 'ActionButton ' + classes }, wrapper);

      if (opts && opts.label) {
        var t = domConstruct.create('div', { innerHTML: opts.label, 'class': 'ActionButtonText' }, wrapper);
      }

      domConstruct.place(wrapper, target, 'last');

      this._actions[name] = {
        options: opts,
        action: fn,
        button: wrapper,
        textNode: t
      };
    }
  });
});
