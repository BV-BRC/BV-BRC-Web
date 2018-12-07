define("p3/util/loading", ['dojo/dom-construct'], function (domConstruct) {
  let self = this;

  this.ele;

  this.rm = function () {
    domConstruct.destroy(self.ele);
  };

  return function (ele) {
    self.ele = domConstruct.create('div', {
      style: {
        color: '#666'
      },
      innerHTML:
        '<img src="/patric/images/loader.gif" style="vertical-align: middle;"/> ' +
        '<span>loading...</span>'
    }, ele);

    return self;
  };
});
