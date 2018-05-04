define([
  'dojo/_base/declare', './Button', 'dojo/on',
  'dojo/dom-class', 'dojo/_base/event', 'dojo/topic'
], function (
  declare, Button, on,
  domClass, Event, Topic
) {
  return declare([Button], {
    disabled: false,
    'class': 'GroupButton',
    toggleButton: false,
    toggled: false,
    data: null,
    postCreate: function () {
      this.inherited(arguments);
      var _self = this;
      this.on('click', function () {
        var state = (window.history && window.history.state) ? window.history.state : {};
        console.log('state: ', state);
        state.filter = 'in(genome_info_id,(' + _self.data.map(function (d) {
          return d;
        }) + '))';
        Topic.publish('/navigate', state);
      });
    }
  });
});
