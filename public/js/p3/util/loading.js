
/**
 * Creates simple "loading" gif for ajax requests
 *
 * Usage:
 *
 *  // create loading status in domElement
 *  let loading = Loading(domElement);
 *
 *  // include optional message
 *  let loading = Loading(domElement, 'loading genome data');
 *
 *  // manually remove loading status (if necessary)
 *  loading.rm()
 *
 *  // (optional) display error message in loading status' place
 *  loading.error('Message for user', '(Optional) server error message for more details')
 *
 *  // (optional) method of updating loading status
 *  loading.text('Sorry this is taking so long...')
 */
define(['dojo/dom-construct'], function (domConstruct) {
  var self = this;

  // provided dom element
  this.ele;

  // container for loading status
  this.container;

  this.rm = function () {
    domConstruct.destroy(self.ele);
  };

  this.error = function (userMsg, errorMsg) {
    self.rm();

    self.container = domConstruct.create('div', {
      style: {
        background: '#f8d7da',
        padding: '10px',
        border: '2px solid #f5c6cb',
        color: '#721c24',
        marginBottom: '10px'
      },
      innerHTML: (errorMsg ?
        '<p style="font-size: 1.3em;">' +
          '<b><i class="fa icon-exclamation-triangle" style="color: #721c24;"></i> ' + userMsg + '</b>' +
        '</p><br>' : '')
        + errorMsg
    }, self.ele);
  };

  this.text = function (msg) {
    self.loadingMsg.innerHTML = msg;
  };

  return function (ele, msg /* optional */) {
    // save provided dom element
    self.ele = ele;

    // inital loading message
    self.loadingMsg = domConstruct.toDom('<span>' + (msg || 'loading...') + '</span>');

    self.container = domConstruct.create('div', {
      style: {
        color: '#666'
      },
      innerHTML:
        '<img src="/patric/images/loader.gif" style="vertical-align: middle;"/> '
    }, self.ele);

    domConstruct.place(self.loadingMsg, self.container);

    return self;
  };
});
