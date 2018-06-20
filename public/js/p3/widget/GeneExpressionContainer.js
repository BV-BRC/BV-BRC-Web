define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/request', 'dojo/when', 'dojo/_base/Deferred',
  'dijit/layout/BorderContainer', 'dijit/layout/TabContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/RadioButton', 'dijit/form/Textarea', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './ActionBar', './ContainerActionBar',
  './GeneExpressionGridContainer', './GeneExpressionChartContainer', './GeneExpressionMetadataChartContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup'
], function (
  declare, lang, on, Topic, domConstruct, xhr, when, Deferred,
  BorderContainer, TabContainer, StackContainer, TabController, ContentPane,
  RadioButton, TextArea, TextBox, Button, Select,
  ActionBar, ContainerActionBar,
  GeneExpressionGridContainer, GeneExpressionChartContainer, GeneExpressionMetadataChartContainer, TooltipDialog, Dialog, popup
) {

  return declare([BorderContainer], {
    id: 'GEContainer',
    gutters: false,
    state: null,
    tgState: null,
    tooltip: 'The "Transcriptomics" tab shows gene expression data available for the current gene',
    apiServer: window.App.dataServiceURL,
    constructor: function () {
    },
    onSetState: function (attr, oldVal, state) {
      // console.log("GeneExpressionGridContainer onSetState set state: ", state);
      if (!state) {
        return;
      }
      if (state && !state.feature) {
        return;
      }

      state.search = 'eq(feature_id,' + state.feature.feature_id + ')';
      this._buildPanels(state);

      if (this.GeneExpressionGridContainer) {
        this.GeneExpressionGridContainer.set('state', state);
      }
      if (this.GeneExpressionChartContainer) {
        this.GeneExpressionChartContainer.set('state', state);
      }
      if (this.GeneExpressionMetadataChartContainer) {
        this.GeneExpressionMetadataChartContainer.set('state', state);
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

      this.watch('state', lang.hitch(this, 'onSetState'));
      // moved to _buildPanels()

      this.inherited(arguments);
      // console.log("new GeneExpressionGridContainer arguments: ", arguments);
      this._firstView = true;
    },
    _buildPanels: function (state) {
      var self = this;
      var q = this.state.search;
      xhr.post(window.App.dataServiceURL + '/transcriptomics_gene/', {
        data: q,
        headers: {
          accept: 'application/solr+json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {
        // console.log("*********************In chechData: res:", res);
        // var def = new Deferred();
        // setTimeout(function(){
        //  def.resolve(res);
        // }, 2000);
        // console.log("*********************In chechData: res:", res);
        // console.log("*********************In chechData: res.response.numFound:", res.response.numFound);
        if (res && res.response.numFound == 0) {
          var messagePane = new ContentPane({
            region: 'top',
            content: '<p>No data found</p>'
          });
          self.addChild(messagePane);
        } else {

          // self.watch("state", lang.hitch(self, "onSetState"));

          var filterPanel = self._buildFilterPanel();
          // console.log("GeneExpressionGridContainer onFirstView: this", self);
          // console.log("GeneExpressionGridContainer onFirstView after _buildFilterPanel(): this.tgState", self.tgState);
          self.tabContainer = new StackContainer({ region: 'center', id: self.id + '_TabContainer' });
          var tabController = new TabController({
            containerId: self.id + '_TabContainer',
            region: 'top',
            'class': 'TextTabButtons'
          });

          // for charts
          // outer BorderContainer
          var bc1 = new BorderContainer({
            region: 'top',
            title: 'Chart',
            style: 'height: 350px;',
            gutters: false
          });

          var bc = new BorderContainer({
            region: 'top',
            title: 'Chart',
            style: 'height: 350px;'
          });

          // console.log("Before creating GeneExpressionChartContainer", self);

          var chartContainer1 = new GeneExpressionChartContainer({
            region: 'leading',
            style: 'height: 350px; width: 500px;',
            doLayout: false,
            id: self.id + '_chartContainer1',
            // region: "leading", style: "width: 500px;", doLayout: false, id: this.id + "_chartContainer1",
            title: 'Chart',
            content: 'Gene Expression Chart',
            state: self.state,
            tgtate: self.tgState,
            apiServer: self.apiServer
          });
          chartContainer1.startup();

          var chartContainer2 = new GeneExpressionMetadataChartContainer({
            region: 'leading',
            style: 'height: 350px; width: 500px;',
            doLayout: false,
            id: self.id + '_chartContainer2',
            // region: "leading", style: "width: 500px;", doLayout: false, id: this.id + "_chartContainer2",
            title: 'Chart',
            content: 'Gene Expression Metadata Chart',
            state: self.state,
            tgtate: self.tgState,
            apiServer: self.apiServer
          });
          chartContainer2.startup();

          // console.log("onFirstView new GeneExpressionGridContainer state: ", this.state);

          // for data grid
          self.GeneExpressionGridContainer = new GeneExpressionGridContainer({
            title: 'Table',
            content: 'Gene Expression Table',
            visible: true,
            // state: self.state,
            tgtate: self.tgState
          });
          self.GeneExpressionGridContainer.startup();
          // console.log("onFirstView create GeneExpressionGrid: ", self.GeneExpressionGridContainer);
          self.addChild(tabController);
          self.addChild(filterPanel);
          self.tabContainer.addChild(bc1);
          bc1.addChild(bc);
          bc.addChild(chartContainer1);
          bc.addChild(chartContainer2);
          self.tabContainer.addChild(self.GeneExpressionGridContainer);
          self.addChild(self.tabContainer);

          Topic.subscribe(self.id + '_TabContainer-selectChild', lang.hitch(self, function (page) {
            page.set('state', self.state);
            page.set('visible', true);
          }));
        }

      }, function (err) {
        var messagePane = new ContentPane({
          region: 'top',
          content: '<p>No data found</p>'
        });
        self.addChild(messagePane);
      });

    },

    _buildFilterPanel: function () {

      // other filter items
      var otherFilterPanel = new ContentPane({
        region: 'top',
        'class': 'GeneExpFilterPanel'
      });

      // download dialog
      var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
      var downloadTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadTT);
        }
      });

      var _self = this;
      on(downloadTT.domNode, 'div:click', function (evt) {
        var rel = evt.target.attributes.rel.value;
        console.log('REL: ', rel);
        var dataType = 'transcriptomics_gene';

        var uf = _self.tgState.upFold,
          df = _self.tgState.downFold;
        var uz = _self.tgState.upZscore,
          dz = _self.tgState.downZscore;
        var keyword = _self.tgState.keyword;
        var range = '';
        if (keyword && keyword.length > 0) {
          range += '&keyword(' + encodeURIComponent(keyword) + ')';
        }

        if (uf > 0 && df < 0) {
          range += '&or(gt(log_ratio,' + uf + '),lt(log_ratio,' + df + '))';
        }
        else if (uf > 0) {
          range += '&gt(log_ratio,' + uf + ')';
        }
        else if (df < 0) {
          range += '&lt(log_ratio,' + df + ')';
        }
        if (uz > 0 && dz < 0) {
          range += '&or(gt(z_score,' + uz + '),lt(z_score,' + dz + '))';
        }
        else if (uz > 0) {
          range += '&gt(z_score,' + uz + ')';
        }
        else if (dz < 0) {
          range += '&lt(z_score,' + dz + ')';
        }
        var query = _self.state.search + range + '&sort(+id)&limit(25000)';

        // var query = "eq(FOO,bar)";
        console.log('DownloadQuery: ', dataType, query);

        var baseUrl = window.App.dataServiceURL;
        if (baseUrl.charAt(-1) !== '/') {
          baseUrl += '/';
        }
        baseUrl = baseUrl + dataType + '/?';

        if (window.App.authorizationToken) {
          baseUrl = baseUrl + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
        }

        baseUrl = baseUrl + '&http_accept=' + rel + '&http_download=true';
        console.log('DownloadQuery: ', query, ' baseUrl:', baseUrl);


        var form = domConstruct.create('form', {
          style: 'display: none;',
          id: 'downloadForm',
          enctype: 'application/x-www-form-urlencoded',
          name: 'downloadForm',
          method: 'post',
          action: baseUrl
        }, _self.domNode);
        domConstruct.create('input', { type: 'hidden', value: encodeURIComponent(query), name: 'rql' }, form);
        form.submit();

        popup.close(downloadTT);
      });

      // download button
      var wrapper = domConstruct.create('div', {
        'class': 'ActionButtonWrapper',
        rel: 'DownloadTable'
      });
      domConstruct.create('div', { 'class': 'fa icon-download fa-2x' }, wrapper);
      domConstruct.create('div', { innerHTML: 'DOWNLOAD', 'class': 'ActionButtonText' }, wrapper);
      on(wrapper, 'div:click', function (evt) {
        popup.open({
          popup: downloadTT,
          around: wrapper,
          orient: ['below']
        });
      });

      domConstruct.place(wrapper, otherFilterPanel.containerNode, 'last');

      // var keyword_label = domConstruct.create("label", {innerHTML: "Keyword "});
      var keyword_textbox = new TextBox({
        name: 'keywordText',
        value: '',
        placeHolder: 'keyword',
        style: 'width: 200px; margin: 5px 0'
      });
      // domConstruct.place(keyword_label, otherFilterPanel.containerNode, "last");
      domConstruct.place(keyword_textbox.domNode, otherFilterPanel.containerNode, 'last');

      var select_log_ratio = new Select({
        name: 'selectGeneLogRatio',
        id: 'selectGeneLogRatio',
        options: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' },
          { value: 1.5, label: '1.5' }, { value: 2, label: '2' }, { value: 2.5, label: '2.5' },
          { value: 3, label: '3' }
        ],
        style: 'width: 80px; margin: 5px 0'
      });
      var label_select_log_ratio = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' |Log Ratio|: '
      });
      domConstruct.place(label_select_log_ratio, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_log_ratio.domNode, otherFilterPanel.containerNode, 'last');
      // domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

      var select_z_score = new Select({
        name: 'selectGeneZScore',
        id: 'selectGeneZScore',
        options: [{ value: 0, label: '0', selected: true }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' },
          { value: 1.5, label: '1.5' }, { value: 2, label: '2' }, { value: 2.5, label: '2.5' },
          { value: 3, label: '3' }
        ],
        style: 'width: 80px; margin: 5px 0'
      });
      var label_select_z_score = domConstruct.create('label', {
        style: 'margin-left: 10px;',
        innerHTML: ' |Z-score|: '
      });
      domConstruct.place(label_select_z_score, otherFilterPanel.containerNode, 'last');
      domConstruct.place(select_z_score.domNode, otherFilterPanel.containerNode, 'last');
      // domConstruct.place("<br>", otherFilterPanel.containerNode, "last");

      var defaultFilterValue = {
        upFold: 0,
        downFold: 0,
        upZscore: 0,
        downZscore: 0,
        keyword: ''
      };

      this.tgState = defaultFilterValue;
      var btn_submit = new Button({
        label: 'Filter',
        style: 'margin-left: 10px;',
        onClick: lang.hitch(this, function () {

          var filter = {
            upFold: 0,
            downFold: 0,
            upZscore: 0,
            downZscore: 0,
            keyword: ''
          };

          var lr = parseFloat(select_log_ratio.get('value'));
          var zs = parseFloat(select_z_score.get('value'));
          var keyword = keyword_textbox.get('value').trim();
          if (keyword) {
            filter.keyword = keyword;
          }

          !isNaN(lr) ? (filter.upFold = lr, filter.downFold = -lr) : {};
          !isNaN(zs) ? (filter.upZscore = zs, filter.downZscore = -zs) : {};

          console.log('submit btn clicked: filter', filter);

          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          Topic.publish('GeneExpression', 'updateTgState', this.tgState);
          console.log('submit btn clicked: this.tgState', this.tgState);
        })
      });
      domConstruct.place(btn_submit.domNode, otherFilterPanel.containerNode, 'last');

      var reset_submit = new Button({
        label: 'Reset Filter',
        style: 'margin-left: 10px;',
        type: 'reset',
        onClick: lang.hitch(this, function () {

          var filter = {
            upFold: 0,
            downFold: 0,
            upZscore: 0,
            downZscore: 0,
            keyword: ''
          };
          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          Topic.publish('GeneExpression', 'updateTgState', this.tgState);

          keyword_textbox.reset();
          select_log_ratio.reset();
          select_z_score.reset();

          // console.log("reset_submit btn clicked: select_log_ratio", select_log_ratio);
          // console.log("reset_submit btn clicked: select_z_score", select_z_score);
        })
      });
      domConstruct.place(reset_submit.domNode, otherFilterPanel.containerNode, 'last');

      var all_submit = new Button({
        label: 'Show All Comparisons',
        style: 'margin-left: 10px;',
        onClick: lang.hitch(this, function () {

          var filter = {
            upFold: 0,
            downFold: 0,
            upZscore: 0,
            downZscore: 0,
            keyword: ''
          };
          this.tgState = lang.mixin(this.tgState, defaultFilterValue, filter);
          Topic.publish('GeneExpression', 'updateTgState', this.tgState);

          // keyword_textbox.reset();
          // select_log_ratio.reset();
          // select_z_score.reset();
        })
      });
      domConstruct.place(all_submit.domNode, otherFilterPanel.containerNode, 'last');

      return otherFilterPanel;
    }
  });
});
