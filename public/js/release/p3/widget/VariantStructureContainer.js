define("p3/widget/VariantStructureContainer", [
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/request', 'dojo/when', 'dojo/_base/Deferred',
  'dijit/layout/BorderContainer'
], function (
  declare, lang, on, Topic, domConstruct, xhr, when, Deferred,
  BorderContainer
) {

  return declare([BorderContainer], {
    id: 'VariantStructureContainer',
    gutters: false,
    state: null,
    tgState: null,
    tooltip: '',
    apiServer: window.App.dataServiceURL,
    constructor: function () {
    },
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this._set('state', state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }
      domConstruct.place('<span>Will be implemented soon</span>', this.containerNode, 'last');

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
