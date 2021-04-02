define([
  'dojo/_base/declare', './Base', 'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../formatter', '../TabContainer', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/_base/lang', 'dojo/when',
  '../ActionBar', '../FilterContainerActionBar', 'phyloview/PhyloTree', '../../WorkspaceManager',
  'd3/d3', 'phyloview/TreeNavSVG', '../../util/PathJoin', 'dijit/form/Button',
  'dijit/MenuItem', 'dijit/TooltipDialog', 'dijit/popup', '../SelectionToGroup', '../PerspectiveToolTip',
  'dijit/Dialog', '../ItemDetailPanel', 'dojo/query', 'FileSaver'
], function (
  declare, Base, on, Topic,
  domClass, ContentPane, domConstruct,
  formatter, TabContainer, Deferred,
  xhr, lang, when,
  ActionBar, ContainerActionBar, PhyloTree, WorkspaceManager,
  d3, d3Tree, PathJoin, Button,
  MenuItem, TooltipDialog, popup,
  SelectionToGroup, PerspectiveToolTipDialog, Dialog, ItemDetailPanel, query, saveAs
) {

  var schemes = [{
    name: 'Zappo',
    id: 'zappo'
  },
  {
    name: 'Taylor',
    id: 'taylor'
  },
  {
    name: 'Hydrophobicity',
    id: 'hydro'
  },
  {
    name: 'Lesk',
    id: 'lesk'
  },
  {
    name: 'Cinema',
    id: 'cinema'
  },
  {
    name: 'MAE',
    id: 'mae'
  },
  {
    name: 'Clustal',
    id: 'clustal'
  },
  {
    name: 'Clustal2',
    id: 'clustal2'
  },
  {
    name: 'Turn',
    id: 'turn'
  },
  {
    name: 'Strand',
    id: 'strand'
  },
  {
    name: 'Buried',
    id: 'buried'
  },
  {
    name: 'Helix',
    id: 'helix'
  },
  {
    name: 'Nucleotide',
    id: 'nucleotide'
  },
  {
    name: 'Purine',
    id: 'purine'
  },
  {
    name: 'PID',
    id: 'pid'
  },
  {
    name: 'No color',
    id: 'foo'
  }];


  var filters = [{
    name: 'Hide columns by % conservation (>=)',
    id: 'hide_col_threshold_greater'
  },
  {
    name: 'Hide columns by % conservation (<=)',
    id: 'hide_col_threshold_less'
  },
  {
    name: 'Hide columns by % conservation (between)',
    id: 'hide_col_threshold_between'
  },
  {
    name: 'Hide columns by % gaps (>=)',
    id: 'hide_col_gaps_greater'
  },
  {
    name: 'Hide columns by % gaps (<=)',
    id: 'hide_col_gaps_less'
  },
  {
    name: 'Hide columns by % gaps (between)',
    id: 'hide_col_gaps_between'
  },
  /* to be implemented in the future
  {
    name: "Hide seqs by identity (>=)",
    id: "hide_seq_identity_greater"
  },
  {
    name: "Hide seqs by identity (<=)",
    id: "hide_seq_identity_less"
  },
  {
    name: "Hide seqs by gaps (>=)",
    id: "hide_seq_gaps_greater"
  },
  {
    name: "Hide seqs by gaps (<=)",
    id: "hide_seq_gaps_less"
  },
  */
  {
    name: 'Reset',
    id: 'reset'
  }];

  var visualopts = [{
    name: 'Conserved weight',
    id: 'conserv'
  },
  {
    name: 'Sequence logo',
    id: 'seqlogo'
  },
  {
    name: 'Overview box',
    id: 'overviewbox'
  },
  {
    name: 'Markers',
    id: 'markers'
  }];

  var colorMenuDivs = [];

  schemes.forEach(lang.hitch(this, function (scheme) {
    colorMenuDivs.push('<div class="wsActionTooltip"  rel="' + scheme.id + '">' + scheme.name + '</div>');
  }));

  var filterMenuDivs = [];
  filters.forEach(lang.hitch(this, function (filters) {
    filterMenuDivs.push('<div class="wsActionTooltip"  rel="' + filters.id + '">' + filters.name + '</div>');
  }));

  var visualMenuDivs = [];
  visualopts.forEach(lang.hitch(this, function (vis) {
    visualMenuDivs.push('<div class="wsActionTooltip"  rel="' + vis.id + '">' + vis.name + '</div>');
  }));

  var colorMenu = new TooltipDialog({
    content: colorMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(colorMenu);
    }
  });

  var infoMenu = new TooltipDialog({
    content: '<div> Create groups and download sequences by making a selection in the tree on the left.</div>',
    onMouseLeave: function () {
      popup.close(infoMenu);
    }
  });

  var idMenu = new TooltipDialog({
    content: '',
    onMouseLeave: function () {
      popup.close(idMenu);
    }
  });

  var filterMenu = new TooltipDialog({
    content: filterMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(filterMenu);
    }
  });

  var visualMenu = new TooltipDialog({
    content: visualMenuDivs.join(''),
    onMouseLeave: function () {
      popup.close(visualMenu);
    }
  });

  var snapMenu = new TooltipDialog({
    content: '',
    onMouseLeave: function () {
      popup.close(snapMenu);
    }
  });

  return declare([Base], {
    baseClass: 'MSA_Viewer',
    disabled: false,
    query: null,
    loading: false,
    data: null,
    dataStats: { _formatterType: 'msa_details' },
    alignType: 'protein',
    maxSequences: 500,
    numSequences: 0,
    selection: null,

    onSetLoading: function (attr, oldVal, loading) {
      if (loading) {
        this.contentPane.set('content', '<div>Getting Multiple Sequence Alignment. Please Wait...</div>');
      }
    },

    onSetState: function (attr, oldVal, state) {
      this.loading = true;
      var fileCheck = this.state.pathname.match(/path=..+?(?=&|$)/);
      var objPath = fileCheck[0].split('=')[1];
      var typeCheck = this.state.pathname.match(/alignType=..+?(?=&|$)/);
      if (typeCheck && typeCheck[0].split('=')[1].includes('dna')) {
        this.alignType = 'dna';
      }
      WorkspaceManager.getObjects([objPath]).then(lang.hitch(this, function (objs) {
        var myFasta = objs[0].data;
        var geneID = null;
        var clustal = ['CLUSTAL'];
        var fasta = [];
        var seq = '';
        var count = 0;
        myFasta.split('\n').forEach(function (line) {
          if (line.slice(0, 1) == '>') {
            count += 1;
            geneID = line.slice(1, line.length);
            geneID = geneID.split(' ')[0];
            geneID = geneID.replaceAll('|', ':');
            if (seq.length > 0) {
              clustal[clustal.length - 1] = clustal[clustal.length - 1] + seq;
              fasta.push(seq);
              seq = '';
            }
            clustal.push(geneID + '\t');
            fasta.push('>' + geneID);
          } else {
            seq += line.trim();
          }
        });
        if (seq.length > 0) {
          clustal[clustal.length - 1] = clustal[clustal.length - 1] + seq;
          fasta.push(seq);
        }
        this.dataStats.clustal = clustal.join('\n');
        this.numSequences = count;
        this.dataStats.fasta = fasta.join('\n');
        this.loading = false;
        this.render();
      }));
    },

    showError: function (msg) {
      this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + '</div>');
    },

    render: function () {
      this.contentPane.set('content', '');
      var menuDiv = domConstruct.create('div', {}, this.contentPane.containerNode);
      var combineDiv = domConstruct.create('table', { style: { width: '100%' } }, this.contentPane.containerNode);// domConstruct.create("div",{"style":{"width":"100%"}},this.contentPane.containerNode);
      var combineRow = domConstruct.create('tr', {}, combineDiv);
      var cell2 = domConstruct.create('td', { width: '100%' }, combineRow);
      var msaDiv = domConstruct.create('div', { style: { width: '100%' } }, cell2);
      msaDiv.style.display = 'inline-block';
      msaDiv.style.overflowY = 'hidden';
      msaDiv.style.verticalAlign = 'bottom';
      msaDiv.style.paddingBottom = '10px';
      var msa_models = {
        seqs: msa.io.clustal.parse(this.dataStats.clustal)
        // seqs: msa.io.fasta.parse(this.dataStats.fasta)
      };

      var rearrangeSeqs = {};
      var id_count = 0;
      msa_models.seqs.forEach(lang.hitch(this, function (s) {
        rearrangeSeqs[s.name] = s;
        s.id = id_count;
        id_count += 1;
      }));
      var opts = {};
      // set your custom properties
      // @see: https://github.com/greenify/biojs-vis-msa/tree/master/src/g
      opts.seqs = msa_models.seqs;
      opts.el = msaDiv;
      opts.bootstrapMenu = false;
      if (this.alignType == 'protein') {
        opts.colorscheme = { scheme: 'taylor' };
      }
      else if (this.alignType == 'dna') {
        opts.colorscheme = { scheme: 'nucleotide' };
      }
      opts.vis = {
        conserv: true,
        overviewbox: false,
        seqlogo: true,
        sequences: true,
        labelName: true,
        labelId: true,
        markers: true
      };
      opts.conf = {
        dropImport: true,
        registerWheelCanvas: false,
        registerMouseHover: false,
        debug: true
      };
      opts.zoomer = {
        menuFontsize: '12px',
        autoResize: true,
        labelNameLength: 150,
        alignmentHeight: 14.04 * this.numSequences,
        // alignmentWidth: msa_models.seqs[0].seq.length*15.1,
        residueFont: '12',
        rowHeight: 14.04
      };

      // init msa
      var m = new msa.msa(opts);
      var menuOpts = {};
      menuOpts.el = menuDiv;
      msaDiv.setAttribute('style', 'white-space: nowrap;');
      menuOpts.msa = m;
      new msa.menu.defaultmenu(menuOpts);

      on(colorMenu.domNode, 'click', function (evt) {
        var rel = evt.target.attributes.rel.value;
        delete colorMenu.selection;
        m.g.colorscheme.set('scheme', rel);
        popup.close(colorMenu);
      });

      on(visualMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        switch (rel) {
          case 'conserv':
            var value = m.g.vis.get('conserv');
            m.g.vis.set('conserv', !value);
            break;
          case 'overviewbox':
            var value = m.g.vis.get('overviewbox');
            m.g.vis.set('overviewbox', !value);
            break;
          case 'seqlogo':
            var value = m.g.vis.get('seqlogo');
            m.g.vis.set('seqlogo', !value);
            break;
          case 'markers':
            var value = m.g.vis.get('markers');
            m.g.vis.set('markers', !value);
            break;
        }
        popup.close(visualMenu);
      }));

      on(filterMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel.value;
        delete filterMenu.selection;
        var maxLen = m.seqs.getMaxLength();
        var conserv = m.g.stats.scale(m.g.stats.conservation());
        var end = maxLen - 1;
        switch (rel) {
          case 'hide_col_threshold_greater':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] >= threshold) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'hide_col_threshold_less':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] <= threshold) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'hide_col_threshold_between':
            var threshold1 = prompt('Enter minimum threshold (in percent)', 20);
            var threshold2 = prompt('Enter maximum threshold (in percent)', 80);
            threshold1 /= 100;
            threshold2 /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              if (conserv[i] >= threshold1 && conserv[i] <= threshold2) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'hide_col_gaps_greater':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent >= threshold) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'hide_col_gaps_less':
            var threshold = prompt('Enter threshold (in percent)', 20);
            threshold /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent <= threshold) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'hide_col_gaps_between':
            var threshold1 = prompt('Enter minimum threshold (in percent)', 20);
            var threshold2 = prompt('Enter maximum threshold (in percent)', 80);
            threshold1 /= 100;
            threshold2 /= 100;
            var hidden = [];
            for (var i = 0; i <= end; i++) {
              var gaps = 0;
              var total = 0;
              m.seqs.each(function (el) {
                if (el.get('seq')[i] === '-') { gaps++; }
                return total++;
              });
              var gapContent = gaps / total;
              if (gapContent >= threshold1 && gapContent <= threshold2) {
                hidden.push(i);
              }
            }
            cell2.setAttribute('style', 'padding-top:105px;');
            m.g.columns.set('hidden', hidden);
            m.g.vis.set('seqlogo', false);
            break;
          case 'reset':
            m.g.columns.set('hidden', []);
            m.seqs.each(function (el) {
              if (el.get('hidden')) {
                return el.set('hidden', false);
              }
            });
            cell2.setAttribute('style', 'padding-top:0px;');
            m.g.vis.set('seqlogo', true);
            break;
          default:
            break;
        }
        popup.close(filterMenu);
      }));

      on(snapMenu.domNode, 'click', lang.hitch(this, function (evt) {
        var rel = evt.target.attributes.rel ? evt.target.attributes.rel.value : null;
        delete snapMenu.selection;
        if (rel == 'msa-img') {
          msa.utils.export.saveAsImg(m, 'PATRIC_msa.png');
        }
        else if (rel == 'msa-clustal') {
          saveAs(new Blob([this.dataStats.clustal]), 'PATRIC_msa_clustal.txt');
        }
        else if (rel == 'msa-fasta') {
          saveAs(new Blob([this.dataStats.fasta]), 'PATRIC_msa.fasta');
        }
        // else if (rel == 'jalview') {
        //   // share via jalview
        //   var url = m.g.config.get('url');
        //   if (url.indexOf('localhost') || url === 'dragimport') {
        //     m.utils.export.publishWeb(m, function (link) {
        //       m.utils.export.openInJalview(link, m.g.colorscheme.get('scheme'));
        //     });
        //   } else {
        //     m.utils.export.openInJalview(url, m.g.colorscheme.get('scheme'));
        //   }
        // }
        popup.close(snapMenu);
      }));
      m.render();
      msaDiv.style.display = 'inline-block';
      msaDiv.style.overflowX = 'hidden';
      msaDiv.style.overflowY = 'hidden';
      msaDiv.style.verticalAlign = 'bottom';
      msaDiv.style.paddingBottom = '10px';
    },

    postCreate: function () {
      this.inherited(arguments);
      this.contentPane = new ContentPane({ region: 'center' });
      this.addChild(this.contentPane);
      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 4,
        style: 'width:56px;text-align:center;',
        splitter: false,
        currentContainerWidget: this
      });
      this.addChild(this.selectionActionBar);
      this.setupActions();
    },

    selectionActions: [
      [
        'ColorSelection',
        'fa icon-paint-brush fa-2x',
        {
          label: 'COLORS',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Selection Color',
          tooltipDialog: colorMenu,
          ignoreDataType: true
        },
        function (selection) {
          colorMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.ColorSelection.options.tooltipDialog,
            around: this.selectionActionBar._actions.ColorSelection.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'FilterSelection',
        'fa icon-filter fa-2x',
        {
          label: 'FILTER',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Show hide columns',
          tooltipDialog: filterMenu,
          ignoreDataType: true
        },
        function (selection) {
          filterMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.FilterSelection.options.tooltipDialog,
            around: this.selectionActionBar._actions.FilterSelection.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'VisualOptions',
        'fa icon-eye fa-2x',
        {
          label: 'VISUAL',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Visualization options',
          tooltipDialog: visualMenu,
          ignoreDataType: true
        },
        function (selection) {
          visualMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.VisualOptions.options.tooltipDialog,
            around: this.selectionActionBar._actions.VisualOptions.button,
            orient: ['below']
          });
        },
        true
      ],
      [
        'Snapshot',
        'fa icon-download fa-2x',
        {
          label: 'DWNLD',
          persistent: true,
          validTypes: ['*'],
          validContainerTypes: ['*'],
          tooltip: 'Save an image',
          tooltipDialog: snapMenu,
          ignoreDataType: true
        },
        function (selection) {
          var snapMenuDivs = [];
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-img">MSA image</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-clustal">MSA clustal</div>');
          snapMenuDivs.push('<div class="wsActionTooltip" rel="msa-fasta">MSA fasta</div>');
          // snapMenuDivs.push('<div class="wsActionTooltip" rel="jalview">Jalview link</div>');
          snapMenu.set('content', snapMenuDivs.join(''));
          snapMenu.selection = selection;
          popup.open({
            popup: this.selectionActionBar._actions.Snapshot.options.tooltipDialog,
            around: this.selectionActionBar._actions.Snapshot.button,
            orient: ['below']
          });
        },
        true
      ]
    ],

    setupActions: function () {
      if (this.containerActionBar) {
        this.containerActions.forEach(function (a) {
          this.containerActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
        }, this);
      }
      this.selectionActions.forEach(function (a) {
        this.selectionActionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4], a[5]);
      }, this);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.watch('loading', lang.hitch(this, 'onSetLoading'));
      this.inherited(arguments);
    }

  });
});
