define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/topic',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dijit/Dialog',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/DownloadProgressDialog.html'
], function (
  declare,
  lang,
  on,
  topic,
  domClass,
  domConstruct,
  Dialog,
  _TemplatedMixin,
  _WidgetsInTemplateMixin,
  template
) {
  /**
   * DownloadProgressDialog - Shows download progress and status
   *
   * Features:
   * - Progress bar with percentage
   * - Status messages
   * - Cancel button for cancellable downloads
   * - Auto-close on completion
   * - Error display with retry option
   */

  var ProgressDialog = declare([Dialog, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,
    title: 'Download Progress',

    // State
    status: 'idle', // idle, preparing, downloading, processing, completed, error
    progress: 0,
    message: '',
    canCancel: false,
    autoClose: true,
    autoCloseDelay: 2000,

    // Event subscriptions
    _subscriptions: null,

    // Callbacks
    onCancel: null,
    onRetry: null,
    onClose: null,

    postCreate: function () {
      this.inherited(arguments);
      this._subscriptions = [];
      this._setupSubscriptions();
    },

    /**
     * Setup topic subscriptions for download events
     */
    _setupSubscriptions: function () {
      var self = this;

      this._subscriptions.push(
        topic.subscribe('/Download/started', function (event) {
          self.setStatus('downloading', 'Starting download...');
          self.setProgress(0);
        })
      );

      this._subscriptions.push(
        topic.subscribe('/Download/progress', function (event) {
          self.setProgress(event.progress);
          if (event.chunk && event.totalChunks) {
            self.setMessage('Downloading chunk ' + event.chunk + ' of ' + event.totalChunks + '...');
          }
        })
      );

      this._subscriptions.push(
        topic.subscribe('/Download/completed', function (event) {
          self.setStatus('completed', 'Download complete!');
          self.setProgress(100);
          if (event.filename) {
            self.setMessage('File: ' + event.filename);
          }
          if (self.autoClose) {
            setTimeout(function () {
              self.hide();
            }, self.autoCloseDelay);
          }
        })
      );

      this._subscriptions.push(
        topic.subscribe('/Download/error', function (event) {
          var errorMsg = 'Download failed';
          if (event.error && event.error.message) {
            errorMsg = event.error.message;
          }
          self.setStatus('error', errorMsg);
        })
      );

      this._subscriptions.push(
        topic.subscribe('/Download/jobSubmitted', function (event) {
          self.setStatus('completed', 'Bundle job submitted');
          self.setMessage('Job ID: ' + event.jobId + '. You will be notified when ready.');
          if (self.autoClose) {
            setTimeout(function () {
              self.hide();
            }, self.autoCloseDelay * 2);
          }
        })
      );
    },

    /**
     * Set current status
     * @param {string} status - Status code
     * @param {string} message - Optional message
     */
    setStatus: function (status, message) {
      this.status = status;

      // Update status icon
      if (this.statusIconNode) {
        domClass.remove(this.statusIconNode, 'fa-spinner fa-spin fa-check-circle fa-exclamation-circle fa-hourglass');
        switch (status) {
          case 'preparing':
          case 'downloading':
          case 'processing':
            domClass.add(this.statusIconNode, 'fa-spinner fa-spin');
            break;
          case 'completed':
            domClass.add(this.statusIconNode, 'fa-check-circle');
            break;
          case 'error':
            domClass.add(this.statusIconNode, 'fa-exclamation-circle');
            break;
          default:
            domClass.add(this.statusIconNode, 'fa-hourglass');
        }
      }

      // Update status text
      if (this.statusTextNode && message) {
        this.statusTextNode.textContent = message;
      }

      // Show/hide retry button
      if (this.retryButton) {
        if (status === 'error') {
          domClass.remove(this.retryButton, 'dijitHidden');
        } else {
          domClass.add(this.retryButton, 'dijitHidden');
        }
      }

      // Show/hide cancel button
      if (this.cancelButton) {
        if (this.canCancel && (status === 'downloading' || status === 'processing')) {
          domClass.remove(this.cancelButton, 'dijitHidden');
        } else {
          domClass.add(this.cancelButton, 'dijitHidden');
        }
      }

      // Update close button text
      if (this.closeButton) {
        if (status === 'completed' || status === 'error') {
          this.closeButton.textContent = 'Close';
        } else {
          this.closeButton.textContent = 'Cancel';
        }
      }
    },

    /**
     * Set progress percentage
     * @param {number} percent - Progress 0-100
     */
    setProgress: function (percent) {
      this.progress = Math.min(100, Math.max(0, percent));

      if (this.progressBar) {
        this.progressBar.style.width = this.progress + '%';
      }

      if (this.progressText) {
        this.progressText.textContent = Math.round(this.progress) + '%';
      }
    },

    /**
     * Set message text
     * @param {string} message - Message to display
     */
    setMessage: function (message) {
      this.message = message;
      if (this.messageNode) {
        this.messageNode.textContent = message;
      }
    },

    /**
     * Handle cancel button click
     */
    _onCancel: function () {
      if (this.onCancel) {
        this.onCancel();
      }
      this.hide();
    },

    /**
     * Handle retry button click
     */
    _onRetry: function () {
      if (this.onRetry) {
        this.onRetry();
      }
    },

    /**
     * Handle close button click
     */
    _onClose: function () {
      if (this.onClose) {
        this.onClose();
      }
      this.hide();
    },

    /**
     * Show the dialog
     */
    show: function () {
      this.setStatus('preparing', 'Preparing download...');
      this.setProgress(0);
      this.setMessage('');
      this.inherited(arguments);
    },

    /**
     * Reset state
     */
    reset: function () {
      this.status = 'idle';
      this.progress = 0;
      this.message = '';
      this.setStatus('idle', '');
      this.setProgress(0);
      this.setMessage('');
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._subscriptions.forEach(function (sub) {
        sub.remove();
      });
      this._subscriptions = [];
      this.inherited(arguments);
    }
  });

  /**
   * Static method to show progress dialog
   * @param {Object} options - Dialog options
   * @returns {ProgressDialog} Dialog instance
   */
  ProgressDialog.show = function (options) {
    options = options || {};
    var dialog = new ProgressDialog({
      title: options.title || 'Download Progress',
      canCancel: options.canCancel || false,
      autoClose: options.autoClose !== false,
      autoCloseDelay: options.autoCloseDelay || 2000,
      onCancel: options.onCancel,
      onRetry: options.onRetry,
      onClose: options.onClose
    });

    dialog.show();
    return dialog;
  };

  return ProgressDialog;
});
