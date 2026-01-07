define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', "dojo/_base/lang",
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 'dojo/_base/array'
], function (
  declare, BorderContainer, on, lang,
  domClass, ContentPane, domConstruct, domStyle,
  formatter, WS, Deferred, domAttr, array
) {
  return declare([BorderContainer], {
    baseClass: 'FileViewer',
    disabled: false,
    containerType: 'file',
    file: null,
    viewable: false,
    url: null,
    preload: true,

    _setFileAttr: function (val) {
      // this is invoked by the widget creation mechanism
      // with the value of the "file" key in params.
      // console.log('[File] _setFileAttr:', val);
      if (!val) {
        this.file = {}; this.filepath = ''; this.url = '';
        return;
      }
      if (typeof val == 'string') {
        this.set('filepath', val);
      } else {
        this.filepath =
          'path' in val.metadata ?
            val.metadata.path +
            ((val.metadata.path.charAt(val.metadata.path.length - 1) == '/') ? '' : '/')
            + val.metadata.name : '/';

        this.file = val;
        this.refresh();
      }
    },
    _setFilepathAttr: function (val) {
      // If we were set up with just a path, retrieve metadata from workspace
      // console.log('[File] _setFilepathAttr:', val);
      this.filepath = val;
      var _self = this;
      return Deferred.when(WS.getObject(val, true), function (meta) {
        _self.file = { metadata: meta };
        _self.refresh();
      });
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.viewHeader = new ContentPane({ content: '', region: 'top' });
      this.viewSubHeader = new ContentPane({ content: '', region: 'top' });
      this.viewer = new ContentPane({ region: 'center' });
      this.addChild(this.viewHeader);
      this.addChild(this.viewSubHeader);
      this.addChild(this.viewer);

      var _self = this;
      // for direct load, make everything viewable
      this.viewable = true;
      /*
      if (WS.viewableTypes.indexOf(this.file.metadata.type) >= 0 && this.file.metadata.size <= 10000000) {
        this.viewable = true;
      }
      */
      // console.log('[File] viewable?:', this.viewable);

      this.refresh();
    },

    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      if (this.file && fileMeta) {
        var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + ' file</b>: ' + fileMeta.name + '</h3>';

        if (!WS.forbiddenDownloadTypes.includes(fileMeta.type)) {
          content += '<a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a>';
        }

        if (showMetaDataRows) {
          var formatLabels = formatter.autoLabel('fileView', fileMeta);
          content += formatter.keyValueTable(formatLabels);
        }
        content += '</tbody></table></div>';
      }

      return content;
    },

    authorize: function () {
      const d = new Deferred();

      (async () => {
        try {
          const res = await fetch(window.App.workspaceDownloadAPI + "/set-cookie-auth", {
            method: "POST",
            headers: {
              "Authorization": window.App.authorizationToken,
              "Content-Type": "application/json"
            },
            credentials: "include"
          });

          if (!res.ok) {
            throw new Error("Authorization failed with status " + res.status);
          }

          const data = await res.text();
          d.resolve(data);
        } catch (err) {
          d.reject(err);
        }
      })();

      return d.promise;
    },
    refresh: function () {
      if (!this._started) {
        return;
      }
      if (!this.file || !this.file.metadata) {
        this.viewer.set('content', "<div class='error'>Unable to load file</div>");
        return;
      }

      if (this.file && this.file.metadata) {
        if (this.viewable) {
          this.viewSubHeader.set('content', this.formatFileMetaData(false));
          // Set cookie for workspace load
          this.authorize().then(lang.hitch(this, function () {
            // Encode filepath to handle special characters like #, ?, &, etc.
            var encodedPath = this.filepath.split('/').map(function(component, index) {
              // Keep first component (empty string before leading /) and username unencoded
              if (index <= 1) return component;
              return encodeURIComponent(component);
            }).join('/');
            const docURL = window.App.workspaceDownloadAPI + "/view" + encodedPath;
            // Create a spinner div
            const spinner = domConstruct.create("div", {
              className: "spinner",
              innerHTML: "Loading..."
            });

            // Style the spinner (you can customize this or use a CSS class)
            domStyle.set(spinner, {
              position: "absolute",
              fontSize: "2.5em",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              backgroundColor: "white",
              padding: "10px",
              borderRadius: "4px"
            });
            var iframe = domConstruct.create('iframe', { style: 'width:100%;height:100%' });
            domConstruct.empty(this.viewer.containerNode);
            domStyle.set(this.viewer.containerNode, 'overflow', 'hidden');
            domConstruct.place(spinner, this.viewer.containerNode);
            domConstruct.place(iframe, this.viewer.containerNode);

            iframe.onload = function () {
              /*
              var nodes = iframe.contentWindow.document.getElementsByTagName("a")
              var i = 0
              while (i < nodes.length) {
                var n = nodes.item(i)
                console.log("modify", n.target, n)
                //n.target = "_parent";
                i++
              }
              */
              domConstruct.destroy(spinner);

            }
            iframe.src = docURL;

          }), function () {
            console.log("Cookie auth failure");
          });
        } else {
          this.viewSubHeader.set('content', this.formatFileMetaData(true));
        }
      }
    }
  });
});
