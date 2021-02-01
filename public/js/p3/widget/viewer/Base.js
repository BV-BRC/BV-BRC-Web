define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic',
  'dijit/layout/BorderContainer'
], function (
  declare, lang,
  on, Topic,
  BorderContainer
) {

  return declare([BorderContainer], {
    baseClass: 'ViewerApp',
    state: null,
    apiServiceUrl: window.App.dataAPI,

    refresh: function () {
    },

    postCreate: function () {
      this.inherited(arguments);
      on(this.domNode, 'UpdateHash', lang.hitch(this, 'onUpdateHash'));

      on(this.domNode, 'SetAnchor', lang.hitch(this, 'onSetAnchor'));

      // start watching for changes of state, and signal for the first time.
      this.watch('state', lang.hitch(this, 'onSetState'));
    },

    onSetState: function (attr, oldVal, newVal) {
    },

    onSetAnchor: function (evt) {
    },

    _setStateAttr: function (state) {
      // console.log("Base _setStateAttr: ", state);
      this._set('state', state);
    },

    onUpdateHash: function (evt) {
      // console.log("OnUpdateHash: ", evt);
      // console.log("Current State: ", this.state, " hash params: ", this.state.hashParams);
      if (!this.state) {
        this.state = {};
      }

      if (!this.state.hashParams) {
        this.state.hashParams = {};
      }

      if (evt.hashParams) {
        // console.log("EVT.hashParams: ", evt.hashParams);
        this.state.hashParams = evt.hashParams;
      } else if (evt.hashProperty == 'view_tab') {
        this.state.hashParams = {
          view_tab: evt.value
        };
      }
      if (evt.hashProperty) {
        this.state.hashParams[evt.hashProperty] = evt.value;
      }

      var l = window.location.pathname + window.location.search + '#' + Object.keys(this.state.hashParams).map(function (key) {
        if (key && this.state.hashParams[key]) {
          return key + '=' + this.state.hashParams[key];
        }
        return '';
      }, this).filter(function (x) {
        return !!x;
      }).join('&');
      // console.log("onUpdateHash. nav to: ", l);

      Topic.publish('/navigate', { href: l });
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      // console.log('setting state', this.state);
      this.onSetState('state', '', this.state);
    }
  });
});
