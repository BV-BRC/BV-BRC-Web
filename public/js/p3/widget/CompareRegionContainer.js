define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/when', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', 'dijit/form/Select', 'dijit/form/Button', 'dijit/Dialog',
  'dojox/widget/Standby',
  'FileSaver',
  './SEEDClient', './CompareRegionViewer', './WorkspaceObjectSelector'
], function (
  declare, lang,
  domConstruct, when, Topic,
  BorderContainer, ContentPane, Select, Button, Dialog,
  Standby,
  saveAs,
  SEEDClient, CompareRegionViewer, WorkspaceObjectSelector
) {

  return declare([BorderContainer], {
    gutters: false,
    visible: false,
    state: null,
    patric_id: null,
    topicId: null,

    constructor: function (options) {
      this.topicId = 'CompareRegions_' + options.id.split('_compareRegionViewer')[0];

      Topic.subscribe(this.topicId, lang.hitch(this, function () {

        var key = arguments[0];
        // var value = arguments[1];

        switch (key) {
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
            break;
          default:
            break;
        }
      }));
    },

    onSetState: function (attr, oldVal, state) {
      console.log("onSetState", attr, oldVal, state);
      if (!state)
      {
        return;
      }

      if (state.feature && state.feature.patric_id)
      {
//	if (this.patric_id == state.feature.patric_id) {
//	  return;
//	}
	this.patric_id = state.feature.patric_id;
      }

      /*
       * Determine our view mode. If we have a state.feature we are viewing
       * a single feature. (We should also see widgetClass == p3/widget/viewerFeature)
       *
       * Otherwise we need to look at 
       */

      if (this.viewer) {

	switch (state.widgetClass) {
	  
	  case 'p3/widget/viewer/FeatureGroup':
	  {
            var window = this.region_size.get('value');
            var n_genomes = this.n_genomes.get('value');
            var method = this.method.get('value');
            var filter = 'feature_query';
	    
            this.render('', window, n_genomes, method, filter, state.search);
	  }

	  break;
	  
	  case 'p3/widget/viewer/FeatureList':
	  {
            var window = this.region_size.get('value');
            var n_genomes = this.n_genomes.get('value');
            var method = this.method.get('value');
            var filter = 'feature_query';
	    
            this.render('', window, n_genomes, method, filter, state.search);
	  }

	  break;

	  case 'p3/widget/viewer/Feature':
	  {
	    if (!state.feature)
	    {
	      console.log("Skipping due to missing feature");
	      return;
	    }
	    if (state.feature.feature_type === 'CDS')
	    {
              var window = this.region_size.get('value');
              var n_genomes = this.n_genomes.get('value');
              var method = this.method.get('value');
              var filter = this.g_filter.get('value');
	      
	      console.log("initial render", state.feature.patric_id, window, n_genomes, method, filter);
              this.render(state.feature.patric_id, window, n_genomes, method, filter);
              // this.render(state.feature.patric_id, 10000, 10, 'pgfam', 'representative+reference');
            }
	    else
	    {
              new Dialog({
		title: '',
		content: 'Compare Region Viewer is only available for CDS features.',
		style: 'width: 400px'
              }).show();
            }
	  }
	  break;
	  }
	}

	this._set('state', state);
      },

    render: function (peg, window, n_genomes, method, filter, val) {
      this.loadingMask.show();
      console.log("RENDER:", peg, method, filter, val);
      var options = {};
      if (filter == 'genome_group') {
	options.genome_group = this.genome_group_selector.get('value');
      } else if (filter == 'feature_group') {
	options.feature_group = this.feature_group_selector.get('value');
      }
      else if (filter == 'feature_query') {
	options.feature_query = val;
      }
      
      console.log(options);
      
      this.service.compare_regions_for_peg2(
        peg, window, n_genomes, method, filter, options,
        function (data) {
          // console.log(data);
          this.compare_regions.set_data(data);
          try {
            this.compare_regions.render();
          } catch (err) {
            console.log(err);
            new Dialog({
              title: 'Please report this error: ' + err.name,
              content: err.message,
              style: 'width: 300px'
            }).show();
          }
          this.loadingMask.hide();
        }.bind(this),
        function (err) {
          // TODD: display error
          console.error(err);
        }
      );
    },

    exportToSVG: function () {
      if (this.compare_regions) {

        when(this.compare_regions.exportSVG(), function (data) {
          saveAs(new Blob([data], { type: 'image/svg+xml' }), 'BVBRC_compare_regions.svg');
        });
      }
    },

    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }

      if (this.viewer) {
        this.viewer.set('visible', true);

        this.service.get_palette('compare_region', function (palette) {
          this.compare_regions.set_palette(palette);
        }.bind(this));
      }
    },

    postCreate: function () {
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      var auth = window.App.user ? { token: window.App.authorizationToken } : null;
      this.service = new SEEDClient(window.App.compareregionServiceURL, auth);

      this.viewer = new ContentPane({
        region: 'center'
      });

      this.compare_regions = new CompareRegionViewer(this.viewer.domNode, this.service);
      this.compare_regions.topicId = this.topicId;

      this.filterPanel = this._buildFilterPanel();

      this.watch('state', lang.hitch(this, 'onSetState'));

      this.addChild(this.viewer);
      this.addChild(this.filterPanel);

      this.inherited(arguments);
      this._firstView = true;
    },

    _buildFilterPanel: function () {

      var filterPanel = new ContentPane({
        region: 'top',
        splitter: true
      });

      // region size
      var label_region_size = domConstruct.create('label', { innerHTML: 'Region Size: ' });
      this.region_size = new Select({
        name: 'region_size',
        value: 10000,
        style: 'width: 100px; margin-right: 10px',
        options: [{
          value: 5000, label: '5,000bp'
        }, {
          value: 10000, label: '10,000bp'
        }, {
          value: 15000, label: '15,000bp'
        }, {
          value: 20000, label: '20,000bp'
        }, {
          value: 50000, label: '50,000bp'
        }, {
          value: 75000, label: '75,000bp'
        }, {
          value: 100000, label: '100,000bp'
        }]
      });
      domConstruct.place(label_region_size, filterPanel.containerNode, 'last');
      domConstruct.place(this.region_size.domNode, filterPanel.containerNode, 'last');

      // domConstruct.place("<br/>", filterPanel.containerNode, "last");

      // number of genomes
      var label_n_genomes = domConstruct.create('label', { innerHTML: 'Number of genomes: ' });
      this.n_genomes = new Select({
        name: 'n_genomes',
        value: 10,
        style: 'width: 50px; margin-right: 10px',
        options: [{
          value: 5, label: '5'
        }, {
          value: 10, label: '10'
        }, {
          value: 15, label: '15'
        }, {
          value: 20, label: '20'
        }, {
          value: 50, label: '50'
        }]
      });
      domConstruct.place(label_n_genomes, filterPanel.containerNode, 'last');
      domConstruct.place(this.n_genomes.domNode, filterPanel.containerNode, 'last');

      // domConstruct.place("<br/>", filterPanel.containerNode, "last");

      // pinning method
      var label_method = domConstruct.create('label', { innerHTML: 'Method: ' });
      this.method = new Select({
        name: 'method',
        value: 'pgfam',
        style: 'width: 150px; margin-right: 10px',
        options: [{
          value: 'pgfam', label: 'PATRIC cross-genus families (PGfams)'
        }, {
          value: 'plfam', label: 'PATRIC genus-specific families (PLfams)'
        }]
      });
      domConstruct.place(label_method, filterPanel.containerNode, 'last');
      domConstruct.place(this.method.domNode, filterPanel.containerNode, 'last');

      // domConstruct.place("<br/>", filterPanel.containerNode, "last");

      // filter
      var label_g_filter = domConstruct.create('label', { innerHTML: 'Genomes: ' });
      this.g_filter = new Select({
        name: 'filter',
        value: 'representative reference',
        style: 'width: 100px; margin-right: 10px',
        options: [{
          value: 'representative+reference', label: 'Reference & Representative'
        }, {
          value: 'all', label: 'All genomes'
        }, {
	  value: 'genome_group', label: 'Selected genome group'
        }, {
	  value: 'feature_group', label: 'Selected feature group'
	}]
      });
	this.g_filter.onChange = lang.hitch(this, function(val) { 
	    if (val == "genome_group") {
console.log("enable group ", this.genome_group_selector);
		this.genome_group_selector.set('disabled', false);
		this.feature_group_selector.set('disabled', true);
	    } else if (val == "feature_group") {
console.log("enable feature ", this.feature_group_selector);
		this.genome_group_selector.set('disabled', true);
		this.feature_group_selector.set('disabled', false);
	    } else {
		this.genome_group_selector.set('disabled', true);
		this.feature_group_selector.set('disabled', true);
	    }
	});
	domConstruct.place(label_g_filter, filterPanel.containerNode, 'last');
	domConstruct.place(this.g_filter.domNode, filterPanel.containerNode, 'last');

	var label_genome_group_selector = domConstruct.create('label', { innerHTML: 'Genome group : ' });
	domConstruct.place(label_genome_group_selector, filterPanel.containerNode, 'last');
	this.genome_group_selector = new WorkspaceObjectSelector({ style: "width: 200px" });
	this.genome_group_selector.set('type', ['genome_group']);
	domConstruct.place(this.genome_group_selector.domNode, filterPanel.containerNode, 'last');
	this.genome_group_selector.set('disabled', true);

	var label_feature_group_selector = domConstruct.create('label', { innerHTML: 'Feature group : ' });
	domConstruct.place(label_feature_group_selector, filterPanel.containerNode, 'last');
	this.feature_group_selector = new WorkspaceObjectSelector({ style: "width: 200px" });
	this.feature_group_selector.set('type', ['feature_group']);
	domConstruct.place(this.feature_group_selector.domNode, filterPanel.containerNode, 'last');
	this.feature_group_selector.set('disabled', true);

      // domConstruct.place("<br/>", filterPanel.containerNode, "last");

      // update button
      var btn_submit = new Button({
        label: 'Update',
        onClick: lang.hitch(this, function () {
          var window = this.region_size.get('value');
          var n_genomes = this.n_genomes.get('value');
          var method = this.method.get('value');
          var filter = this.g_filter.get('value');

	  //
	  // Use the state-change mechanism to implement the update since that
	  // is where we have the logic to determine the correct render() parameters
	  // based on in which page the compare region is embedded.
	  //
	  this._set('state', structuredClone(this.state));
	  
          // this.render(this.patric_id, window, n_genomes, method, filter);
        })
      });
      domConstruct.place(btn_submit.domNode, filterPanel.containerNode, 'last');

      // export button
      var btn_export = new Button({
        label: 'Export',
        onClick: lang.hitch(this, 'exportToSVG')
      });
      domConstruct.place(btn_export.domNode, filterPanel.containerNode, 'last');

      return filterPanel;
    }
  });
});
