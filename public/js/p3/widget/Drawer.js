define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_WidgetsInTemplateMixin',
  'dijit/_TemplatedMixin', 'dojo/topic', 'dojo/dom-construct'
], function (
  declare, WidgetBase, on,
  domClass, WiT,
  Templated, Topic, domConstruct
) {
  return declare([WidgetBase, Templated], {
    templateString: "<div><div data-dojo-attach-event='click:toggle' class='handle' data-dojo-attach-point='handle'><div>${title}</div></div><div data-dojo-attach-point='panelContainer' class='PanelContainer'></div></div>",
    baseClass: 'Drawer',
    'class': 'LeftDrawer',
    title: '',
    topic: '/overlay',
    handleContent: null,
    postCreate: function () {
      console.log('POSTCREATE');
      this.inherited(arguments);

      if (!this.title && this.handleContent) {
        this.handle.innerHTML = this.handleContent;
      }

      domClass.add(this.domNode, 'dijitHidden');
      var _self = this;
      Topic.subscribe(this.topic, function (msg) {
        console.log('DrawerMessage: ', msg);
        if (msg.action && msg.action == 'hide') {
          domClass.add(_self.domNode, 'dijitHidden');
          return;
        }

        if (msg.action && msg.action == 'set' && msg.panel) {

          if (msg.open && domClass.contains(_self.domNode, 'Closed')) {
            domClass.remove(_self.domNode, 'Closed');
          } else {
            domClass.add(_self.domNode, 'Closed');
          }

          domClass.remove(_self.domNode, 'dijitHidden');

          _self.set('panel', msg.panel);
        }

      });
    },
    toggle: function () {
      domClass.toggle(this.domNode, 'Closed');
      if (!domClass.contains(this.domNode, 'Closed')) {
        console.log('Startup CurrentPanel');
        this.panel.startup();
        this.panel.resize();
      }

    },

    panel: null,
    _setPanelAttr: function (Panel) {
      console.log('Setup Drawer Panel: ', Panel, typeof Panel);
      if (this.panel === Panel) {
        return;
      }
      if (typeof Panel == 'function') {
        this.panel = new Panel({ 'class': 'PanelContent', content: 'Loading Panel Content' });
        domConstruct.place(this.panel.domNode, this.panelContainer, 'only');
      } else {
        this.panel = Panel;
        domConstruct.place(Panel.domNode, this.panelContainer, 'only');
      }

      if (!domClass.contains(this.domNode, 'Closed')) {
        console.log('Startup on Startup CurrentPanel');
        this.panel.startup();
        this.panel.resize();
      }
    }
  });
});
