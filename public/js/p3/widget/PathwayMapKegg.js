define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/dom', 'dojo/query', 'dojo/when', 'dojo/request', 'dojo/promise/all',
  'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/TitlePane', 'dijit/registry', 'dijit/form/Form', 'dijit/form/RadioButton', 'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar', 'FileSaver', './KeggMapPainter'

], function (
  declare, lang, Deferred,
  on, Topic, domConstruct, dom, Query, when, request, All,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  TitlePane, registry, Form, RadioButton, Select, Button,
  ContainerActionBar, saveAs, KeggMapPainter
) {

  var legend = '<div class="kegg-map-legend-color-box white"></div><div class="kegg-map-legend-label">Not Annotated</div><div class="clear"></div>' +
    '<div class="kegg-map-legend-color-box green"></div><div class="kegg-map-legend-label">Annotated</div><div class="clear"></div>' +
    '<div class="kegg-map-legend-color-box darkgreen"></div><div class="kegg-map-legend-label">Present in some genomes</div><div class="clear"></div>' +
    '<div class="kegg-map-legend-color-box blue"></div><div class="kegg-map-legend-label">Selected</div><div class="clear"></div>' +
    '<div class="kegg-map-legend-color-box red"></div><div class="kegg-map-legend-label">Selected from EC table</div><div class="clear"></div>';

  var legendTooltip = new TooltipDialog({
    content: legend
  });

  // refer http://stackoverflow.com/questions/6150289/how-to-convert-image-into-base64-string-using-javascript
  // source code from https://gist.github.com/HaNdTriX/7704632
  // modified callback caller to return img size.
  function toDataUrl(src, callback, outputFormat) {
    // Create an Image object
    var img = new Image();
    // Add CORS approval to prevent a tainted canvas
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      // Create an html canvas element
      var canvas = document.createElement('CANVAS');
      // Create a 2d context
      var ctx = canvas.getContext('2d');
      var dataURL;
      // Resize the canavas to the image dimensions
      canvas.height = this.height;
      canvas.width = this.width;
      // Draw the image to a canvas
      ctx.drawImage(this, 0, 0);
      // Convert the canvas to a data url
      dataURL = canvas.toDataURL(outputFormat);
      // Return the data url via callback
      callback(dataURL, canvas.width, canvas.height);
      // Mark the canavas to be ready for garbage
      // collection
      canvas = null;
    };
    // Load the image
    img.src = src;
    // make sure the load event fires for cached images too
    if (img.complete || img.complete === undefined) {
      // Flush cache
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      // Try again
      img.src = src;
    }
  }

  return declare([BorderContainer], {
    gutters: false,
    region: 'center',
    visible: false,
    containerActions: [
      [
        'Legend',
        'fa icon-bars fa-2x',
        {
          label: 'Legend',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Show Legend',
          tooltipDialog: legendTooltip
        },
        function () {

          if (this.isPopupOpen) {
            this.isPopupOpen = false;
            popup.close();
          } else {
            popup.open({
              parent: this,
              popup: this.containerActionBar._actions.Legend.options.tooltipDialog,
              around: this.containerActionBar._actions.Legend.button,
              orient: ['below']
            });
            this.isPopupOpen = true;
            this.legend_btn_close = false;
          }

          // close when mouseout on the legend button.
          if (!this.legend_btn_listen) {
            if (!this.legend_btn_close) {
              on(this.containerActionBar._actions.Legend.button, 'mouseout', lang.hitch(this, function (evt) {
                this.isPopupOpen = false;
                popup.close();
              }));
              this.legend_btn_close = true;
            }
            this.legend_btn_listen = true;
          }
        },
        true
      ],
      [
        'Print Map',
        'fa icon-print fa-2x',
        { label: 'Print', multiple: false, validTypes: ['*'] },
        function () {
          var svg = this.pNS.export_to_svg();
          saveAs(new Blob([svg], { type: 'image/svg+xml' }), 'BVBRC_pathway_map.svg');
        },
        true
      ]
    ],
    pmState: null,
    constructor: function () {
      Topic.subscribe('PathwayMap', lang.hitch(this, function () {
        // console.log("PathwayMapKegg:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePmState':
            this.pmState = value;
            this.drawBoxes(value);
            break;
          case 'highlightEC':
            this.pNS.highlight(value);
            break;
          default:
            break;
        }
      }));
    },
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

      this.containerActionBar = new ContainerActionBar({
        baseClass: 'BrowserHeader',
        region: 'top'
      });
      this.containerActions.forEach(function (a) {
        this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
      }, this);
      this.addChild(this.containerActionBar);

      var _self = this;
      var pathwayImgUrl = '/patric/images/pathways/map' + this.state.pathway_id + '.png';
      toDataUrl(pathwayImgUrl, function (base64Img, width, height) {
        // draw map panel
        _self.addChild(new ContentPane({
          region: 'center',
          style: 'padding:0',
          content: '<svg id="map_wrapper" style="width:' + width + 'px;height:' + height + 'px;position:absolute;"><g><image width="' + width + '" height="' + height + '" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="' + base64Img + '" /></g><g id="map_div"></g></svg>'
        }));
      });

      this.inherited(arguments);
      this._firstView = true;
    },
    drawBoxes: function (pmState) {
      var self = this;

      var defEcCoordinates;
      var defFeatureCoordinates;

      if (Object.prototype.hasOwnProperty.call(pmState, 'feature_id')) {
        defFeatureCoordinates = self.getKeggCoordinates(pmState.pathway_id, 'feature', pmState.feature_id);
      } else {
        defFeatureCoordinates = Deferred.resolved;
      }

      if (Object.prototype.hasOwnProperty.call(pmState, 'ec_number')) {
        defEcCoordinates = self.getKeggCoordinates(pmState.pathway_id, 'ec_number', pmState.ec_number);
      } else {
        defEcCoordinates = Deferred.resolved;
      }

      var defKeggMap = self.getKeggData(pmState);

      when(All([defKeggMap, defEcCoordinates, defFeatureCoordinates]), function (result) {

        var data = result[0];

        // initialize
        self.pNS = new KeggMapPainter.PathwayPainter();

        // process all ECs
        data.all_coordinates.forEach(function (box) {
          self.pNS.data.push(new KeggMapPainter.boxData(box));
        });

        // present
        data.genome_x_y.forEach(function (d) {
          self.pNS.data.forEach(function (current) {
            if (current.name === d.ec_number) {
              current.genome_count[d.algorithm] = parseInt(d.genome_count);
              current[d.algorithm] = true;
            }
          });
        });

        // if ec_number is selected
        if (result[1]) {
          self.pNS.data.forEach(function (d) {
            d.selected = (result[1].indexOf(d.name) > -1);
          });
        }

        // if feature is selected
        if (result[2]) {
          self.pNS.data.forEach(function (d) {
            d.selected = (result[2].indexOf(d.name) > -1);
          });
        }

        self.pNS.setCurrent(pmState.annotation, pmState.genomeIds.length);
        self.pNS.paint();
      });
    },
    getKeggData: function (pmState) {

      var def = new Deferred();
      var _self = this;

      var defGenomeXy = when(request.post(_self.apiServer + '/pathway/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
        },
        data: 'q=genome_id:(' + pmState.genomeIds.join(' OR ') + ') AND pathway_id:(' + pmState.pathway_id + ') AND annotation:(' + pmState.annotation + ')&rows=0&facet=true&json.facet={stat:{field:{field:ec_number,limit:-1,facet:{genome_count:"unique(genome_id)"}}}}'
      }), function (response) {

        var facets = response.facets.stat.buckets;
        var ecNumbers = [];
        var ecGenomeMap = {};
        facets.forEach(function (bucket) {
          var ecNumber = bucket.val;
          var count = bucket.genome_count;
          ecNumbers.push(ecNumber);
          ecGenomeMap[ecNumber] = count;
        });

        return when(request.post(_self.apiServer + '/pathway_ref/', {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/solrquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
          },
          data: 'q=pathway_id:' + pmState.pathway_id + ' AND map_type:enzyme AND ec_number:(' + ecNumbers.join(' OR ') + ')&fl=ec_number,ec_description,map_location&rows=25000'
        }), function (response) {

          var ref = {};
          response.forEach(function (row) {
            var loc = row.map_location[0].split(',');
            ref[row.ec_number] = {
              ec_number: row.ec_number,
              ec_description: row.ec_description,
              x: parseInt(loc[0]),
              y: parseInt(loc[1])
            };
          });
          // build genome_x_y
          // algorithm, description, ec_number, genome_count, x, y
          return ecNumbers.map(function (ec_number) {
            return lang.mixin(ref[ec_number], {
              algorithm: 'PATRIC',
              genome_count: ecGenomeMap[ec_number]
            });
          });
        });
      });

      var defAllCoordinates = when(request.post(_self.apiServer + '/pathway_ref/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
        },
        data: 'q=pathway_id:' + pmState.pathway_id + '&fl=ec_number,ec_description,map_location&rows=25000'
      }), function (response) {

        var coordinates = [];
        response.forEach(function (row) {
          row.map_location.forEach(function (location) {
            var loc = location.split(',');
            coordinates.push({
              ec_number: row.ec_number,
              ec_description: row.ec_description,
              x: parseInt(loc[0]),
              y: parseInt(loc[1])
            });
          });
        });

        return coordinates;
      });

      // var genomePathwayXy, var mapIdsInMap: implement when needed and add to All([])

      when(All([defGenomeXy, defAllCoordinates]), function (results) {
        def.resolve({ genome_x_y: results[0], all_coordinates: results[1] });
      });

      return def.promise;
    },
    getKeggCoordinates: function (pathwayId, type, idValue) {

      var def = new Deferred();
      var _self = this;

      switch (type) {
        case 'ec_number':
          /* when(request.post(_self.apiServer + '/pathway_ref', {
            handleAs: 'json',
            headers: {
              'Accept': "application/json",
              'Content-Type': "application/solrquery+x-www-form-urlencoded",
              'X-Requested-With': null,
              'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
            },
            data: 'q=pathway_id:' + pathwayId + ' AND ec_number:' + idValue + '&fl=ec_number,map_location'
          }), function(response){

            var coordinates = [];
            response.forEach(function(row){
              row['map_location'].forEach(function(location){
                var loc = location.split(',');
                coordinates.push({
                  ec_number: row['ec_number'],
                  x: parseInt(loc[0]),
                  y: parseInt(loc[1])
                });
              });
            });

            def.resolve(coordinates);
          }); */
          def.resolve([idValue]);
          break;
        case 'feature':
          var idValueStr = (typeof idValue == 'string') ? idValue.replace(',', ' OR ') : idValue.join(' OR ');
          when(request.post(_self.apiServer + '/pathway/', {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/solrquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: _self.token ? _self.token : (window.App.authorizationToken || '')
            },
            data: 'q=pathway_id:' + pathwayId + ' AND feature_id:(' + idValueStr + ')&fl=ec_number&rows=25000'
          }), function (response) {

            var ecNumbers = response.map(function (row) {
              return row.ec_number;
            });
            def.resolve(ecNumbers);

            /* when(request.post(_self.apiServer + '/pathway_ref', {
              handleAs: 'json',
              headers: {
                'Accept': "application/json",
                'Content-Type': "application/solrquery+x-www-form-urlencoded",
                'X-Requested-With': null,
                'Authorization': _self.token ? _self.token : (window.App.authorizationToken || "")
              },
              data: 'q=pathway_id:' + pathwayId + ' AND ec_number:' + ecNumbers.join(' OR ') + '&fl=ec_number,map_location'
            }), function(response){

              var coordinates = response.map(function(row){
                var loc = row['map_location'][0].split(',');
                return {
                  ec_number: row['ec_number'],
                  x: parseInt(loc[0]),
                  y: parseInt(loc[1])
                };
              });

              def.resolve(coordinates);
            }); */
          });
          break;
        default:
          def.error('wrong params');
          break;
      }

      return def.promise;
    }
  });
});
