define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dojo/topic',
  'dojo/dom-construct', 'dojo/_base/lang', 'dojo/dom-geometry', 'dojo/dom-style', 'dojo/text!./templates/TrackController.html',
  './ColorPicker', 'dijit/popup', 'dijit/TooltipDialog', 'dojo/on', 'dojo/dom-class', 'dijit/Dialog', 'dojo/dom', 'dojo/when', 'FileSaver', 'dijit/form/Select'
], function (
  declare, WidgetBase, Templated, WidgetsInTemplate, Topic,
  domConstruct, lang, domGeometry, domStyle, Template,
  ColorPicker, popup, TooltipDialog, on, domClass, Dialog, dom, when, saveAs, Select
) {
  return declare([WidgetBase, Templated, WidgetsInTemplate], {
    templateString: Template,
    customTrackIndex: 0,
    userTrackIndex: 0,
    userData: {},
    maxScore: 0,
    minScore: 0,
    fileName: '',

    postCreate: function () {
      this.inherited(arguments);
      dom.setSelectable(this.domNode, false);
      Topic.subscribe('/addTrack', lang.hitch(this, 'onAddTrack'));

      // Comment out the following codes. Use  <i class='fa-1x icon-question-circle-o DialogButton' rel='help:AddCustomTrack' /> and <i class='fa-1x icon-question-circle-o DialogButton' rel='help:AddUserTrack' /> in TrackController.html instead
      /*
      var customTrackHelp = "Add custom tracks by selecting feature type, strand and keywords to show genes of interest.";
      var customTT = new TooltipDialog({
        content: customTrackHelp,
        onMouseLeave: function(){
          popup.close(customTT);
        }
      });
      on(this.customTrackInfo, 'mouseover', function(){
        //console.log("customTrackInfo", customTT.content);
        popup.open({
          popup: customTT,
          around: this,
          orient: ["below-centered"]
        });
      });

      var userTrackHelp = 'To display your data as "Tiles" plot, upload data file containing accession, start, and end position delimited by tabs.<br>' +
        'For example, <br>NC_000962&nbsp;&nbsp;&nbsp;&nbsp;34&nbsp;&nbsp;&nbsp;&nbsp;1524<br>NC_000962&nbsp;&nbsp;&nbsp;&nbsp;2052&nbsp;&nbsp;&nbsp;&nbsp;3260<br><br>' +
        'To display your data as "Line, Histogram, or Heatmap" plot, upload data file containing accession, start, end, and quantitative value delimited by tabs.<br>' +
        'For example, <br>NC_000962&nbsp;&nbsp;&nbsp;&nbsp;3596001&nbsp;&nbsp;&nbsp;&nbsp;3598000&nbsp;&nbsp;&nbsp;&nbsp;0.639500<br>NC_000962&nbsp;&nbsp;&nbsp;&nbsp;1498001&nbsp;&nbsp;&nbsp;&nbsp;1500000&nbsp;&nbsp;&nbsp;&nbsp;0.673000';

      var userTT = new TooltipDialog({
        content: userTrackHelp,
        style: "overflow: auto",
        onMouseLeave: function(){
          popup.close(userTT);
        }
      });
      on(this.userTrackInfo, 'mouseover', function(){
        //console.log("customTrackInfo", userTT.content);
        popup.open({
          popup: userTT,
          around: this,
          orient: ["below-centered"]
        });
      });
      */
    },

    visibleIconClass: 'icon-eye',
    hiddenIconClass: 'icon-eye-slash',
    removeIconClass: 'icon-close',

    saveSVG: function () {
      if (this.viewer) {
        var svg = this.viewer.exportSVG();
        saveAs(new Blob([svg]), 'BVBRC_circular_genome.svg');
      }
    },

    validateCustomSelection: function () {
      var type = this.track_type_select.get('value');
      var strand = this.track_strand_select.get('value');
      var keyword = this.keyword_box.get('value');
      if (type && strand && keyword) {
        this.customTrackButton.set('disabled', false);
      }

      // console.log("onAddCustomTrack: type =, strand =, keyword =", type, strand, keyword);
    },

    onAddCustomTrack: function () {
      var type = this.track_type_select.get('value');
      var strand = this.track_strand_select.get('value');
      var keyword = this.keyword_box.get('value');
      var custom_trackname = this.custom_trackname_box.get('value');

      this.customTrackButton.set('disabled', true);

      this.customTrackIndex++;
      var customTrackSelection = {
        index: this.customTrackIndex,
        type: type,
        strand: strand,
        keyword: keyword,
        name: custom_trackname
      };
      Topic.publish('/Notification', { message: 'Adding a custom track', type: 'message' });
      Topic.publish('CircularView', 'addCustomTrack', customTrackSelection);

      // console.log("onAddCustomTrack: type =, strand =, keyword =", type, strand, keyword);
    },

    validateUserFileType: function () {
      // console.log("-----validateUserFileType this.userData", this.userData);
      if (this.userData && this.userData.length > 0) {
        this.userFileButton.set('disabled', false);
      } else {
        this.userFileButton.set('disabled', true);
      }
    },

    validateUserFileSelection: function (event) {
      var type = this.plot_type_select.get('value');
      var files = event.target.files;
      var user_data = [];
      var self = this;
      // console.log("validateUserFileSelection: type =, files =", type, files);
      var file = null;
      self.maxScore = 0;
      self.minScore = 0;

      // get the last file that was chosen
      if (files.length > 0) {
        file = files[files.length - 1];
      }

      if (type && file && file.type === 'text/plain') {
        var reader = new FileReader();
        reader.onload = function () {
          // console.log(this.result);
          var lines = this.result.trim().split(/[\r\n]/g);
          if (lines) {
            lines.map(function (item) {
              var tabs = item.split('\t');
              // console.log("tabs.length", tabs.length , "0",tabs[0], "1",tabs[1], "2",tabs[2],"3", tabs[3],"4");
              if (tabs.length > 3 && tabs[0] && Number.isInteger(parseInt(tabs[1]))) {
                user_data.push({
                  accession: tabs[0],
                  start: parseInt(tabs[1]),
                  end: parseInt(tabs[2]),
                  length: parseInt(tabs[2]) - parseInt(tabs[1]) + 1,
                  score: parseFloat(tabs[3])
                });
                if (parseFloat(tabs[3]) > self.maxScore) {
                  self.maxScore = parseFloat(tabs[3]);
                }
                if (parseFloat(tabs[3]) < self.minScore) {
                  self.minScore = parseFloat(tabs[3]);
                }

              } else if (tabs.length == 3 && tabs[0]  && Number.isInteger(parseInt(tabs[1])) && (type === 'tiles')) {
                user_data.push({
                  accession: tabs[0],
                  start: parseInt(tabs[1]),
                  end: parseInt(tabs[2]),
                  length: parseInt(tabs[2]) - parseInt(tabs[1]) + 1,
                  score: null
                });
              } else {
                // console.log("line=", lines, "tabs=", tabs);
              }
            });
          }

          // console.log("before assigning self.maxScore=", self.maxScore, "self.minScore=", self.minScore);

          // For GC content, GC skew, reset maxScore, minScore
          if (self.maxScore <= 1 && self.maxScore > 0 && self.minScore <= 1 && self.minScore >= 0) {
            self.maxScore = 1;
            self.minScore = 0;
          } else if (self.maxScore <= 1 && self.maxScore > 0 && self.minScore < 0 && self.minScore >= -1) {
            self.maxScore = 1;
            self.minScore = -1;
          } else if (self.maxScore > 1 && self.minScore >= 0) {
            self.maxScore = self.maxScore;
            self.minScore = 0;
          } else {
            self.maxScore = Math.max(Math.abs(self.maxScore), Math.abs(self.minScore));
            self.minScore = (-1) * self.maxScore;
          }
          // console.log("after assigning self.maxScore=", self.maxScore, "self.minScore=", self.minScore);

          user_data.sort(function (a, b) {
            var a1 = a.start,
              b1 = b.start;
            // Sort first on day
            if (a1 > b1) {
              return 1;
            } else if (a1 < b1) {
              return -1;
            }
            var a2 = a.end;
            var b2 = b.end;

            if (a2 > b2) {
              return 1;
            } else if (a2 < b2) {
              return -1;
            }
            return 0;


          });

          self.userData = user_data;
          self.fileName = file.name;
          /*
            self.userData = {};
            user_data.forEach(function(val,index) {
              self.userData[index] = val;
            });
          */
          // console.log(user_data);
          // console.log("-----reading file self.userData=", self.userData, "self.maxScore=", self.maxScore, "self.minScore=", self.minScore, "fileName=", self.fileName);
          if (user_data.length == 0) {
            Topic.publish('/Notification', { message: 'User file format error.', type: 'error' });
          } else {
            self.userFileButton.set('disabled', false);
          }
        };
        reader.readAsText(file);

      } else if (file.type !== 'text/plain') {
        Topic.publish('/Notification', { message: 'Only text/plain files are allowed', type: 'error' });
      } else {
        self.userFileButton.set('disabled', true);
      }
    },

    onAddUserFileTrack: function () {
      var type = this.plot_type_select.get('value');
      var user_trackname = this.user_trackname_box.get('value');
      // var files = this.data_file.event.target.files;
      this.userFileButton.set('disabled', true);
      if (this.userData && this.userData.length > 0) {
        Topic.publish('/Notification', { message: 'Adding a user track.', type: 'message' });
        this.userTrackIndex++;
        var userTrackSelection = {
          index: this.userTrackIndex,
          type: type,
          name: user_trackname,
          fileName: this.fileName,
          maxScore: this.maxScore,
          minScore: this.minScore,
          userData: this.userData
        };
        // console.log("onAddUserFileTrack: userTrackSelection =", userTrackSelection);
        Topic.publish('CircularView', 'addUserTrack', userTrackSelection);
      } else {
        Topic.publish('/Notification', { message: 'User file format error.', type: 'error' });
      }
    },

    onAddTrack: function (event) {
      if (!this.viewer) {
        this.viewer = event.track.viewer;
      }
      // console.log("addTrack Event: ", event);
      var tr = domConstruct.create('tr', {}, this.trackTable);
      var color = domConstruct.create('td', { style: 'width: 35px;' }, tr);
      var fg,
        bg;
      // var foregroundIsStroke = false;

      if (event.track) {
        if (event.track.fill) {
          fg = event.track.fill;
        } else if (event.track.stroke) {
          fg = event.track.stroke.color || event.track.stroke;
          // foregroundIsStroke = true;
        } else {
          fg = null;
        }

        if (event.track.background) {
          bg = event.track.background.fill || null;
        } else {
          bg = null;
        }

      }

      var colorPicker = new ColorPicker({
        style: 'margin:2px;',
        enableBackgroundSelector: true,
        enableForegroundSelector: !(typeof event.track.fill == 'function'),
        foregroundColor: fg,
        backgroundColor: bg
      });

      domConstruct.place(colorPicker.domNode, color);

      colorPicker.watch('backgroundColor', function (attr, oldVal, color) {
        // console.log("COLOR PICKER VALUE: ", color)
        event.track.set('backgroundColor', color);
        // console.log("backgroundColor event.track=", event.track);
      });

      colorPicker.watch('foregroundColor', function (attr, oldVal, color) {
        event.track.set('foregroundColor', color);
        // console.log("foregroundColor event.track=", event.track);
      });

      var tdinfo = domConstruct.create('td', { innerHTML: event.track.title }, tr);
      if (event.track.title_tooltip) {
        var titleTT = new TooltipDialog({
          content: event.track.title_tooltip,
          onMouseLeave: function () {
            popup.close(titleTT);
          }
        });

        on(tdinfo, 'mouseover', function () {
          popup.open({
            popup: titleTT,
            around: tdinfo,
            orient: ['below-centered']
          });
        });
      }

      // this part is for adding plot type selection for GC Content and GC Skew. Temporarily comment out. Waiting for the new implementation of removing and adding track
      /*
      if (event.track.title === "GC Content" || event.track.title === "GC Skew") {
        var name;
        var id;
        if (event.track.title === "GC Content") {
          name = "selectGCContentPlot";
          id = "selectGCContentPlot";
        } else {
          name = "selectGCSkewPlot";
          id = "selectGCSkewPlot";
        }

        var select_plot = new Select({
          name: name,
          id: id,
          options: [{value: "line", label: "Line Plot"}, {value: "histogram", label: "Histogram"}, {value: "heatmap", label: "Heatmap"}],
          style: "width: 50px; margin-left: 5px;"
        });
        domConstruct.place(select_plot.domNode, tdinfo, "last");

        select_plot.on("change", function(){
          Topic.publish("CircularView", "name", select_plot.get("value"));
          // console.log("select_plot my value: ", select_plot.get("value"));
        })
      }
      */

      var td = domConstruct.create('td', {
        style: {
          'word-wrap': 'nowrap',
          'text-align': 'right',
          'font-size': '.85em'
        }
      }, tr);

      // console.log("Track check event.track", event.track);
      // console.log("Track check event.track.hideable", event.track.hideable);

      if (!event.isReferenceTrack && event.track.hideable != false) {
        var visibleButton = domConstruct.create('i', {
          'class': 'fa ' + (event.track.visible ? this.visibleIconClass : this.hiddenIconClass) + ' fa-2x',
          style: { margin: '2px' }
        }, td);
        on(visibleButton, 'click', lang.hitch(this, function (evt) {
          // console.log("Click Visible");
          if (domClass.contains(visibleButton, this.visibleIconClass)) {
            // hide
            // console.log("hide");
            domClass.remove(visibleButton, this.visibleIconClass);
            domClass.add(visibleButton, this.hiddenIconClass);
            event.track.set('visible', false);
          } else {
            // console.log("show");
            domClass.remove(visibleButton, this.hiddenIconClass);
            domClass.add(visibleButton, this.visibleIconClass);
            event.track.set('visible', true);
          }
        }));
      }

      // var settingsButton = domConstruct.create("i", {'class': "fa icon-cog fa-2x", style: {margin: "2px"}}, td);
      // on(settingsButton,"click", function(evt){
      //   new Dialog({content: "Track Settings not yet Implemented", title: "Track Settings"}).show();

      // })
      // disabled the remove button for future implementation
      // console.log("trackTable = ", this.trackTable);

      if (!event.isReferenceTrack && event.track.hideable != false) {
        var removeButton = domConstruct.create('i', {
          'class': 'fa icon-close fa-2x' + (event.isReferenceTrack ? ' disabled' : ''),
          style: { margin: '2px' }
        }, td);

        on(removeButton, 'click', lang.hitch(this, function (evt) {
          domConstruct.empty(removeButton.parentNode.parentNode.parentNode);
          // event.track.set('visible', false);
          Topic.publish('CircularView', 'removeTrack', event.track);
        }));
      }

    }

  });
});
