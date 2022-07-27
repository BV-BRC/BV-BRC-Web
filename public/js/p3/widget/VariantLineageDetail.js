define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct', 'dojo/text!./templates/VariantLineageDetail.html',
  'dojo/when', 'dojo/request', 'dojo/_base/lang',
  'dijit/form/Select', 'dijit/_WidgetBase', 'dijit/_Templated',
  './D3VerticalBarChart', './D3StackedAreaChart', './D3BarLineChart'
], function (
  declare, on, domConstruct, Template,
  when, xhr, lang,
  Select, WidgetBase, Templated,
  VerticalBarChart, StackedAreaChart, BarLineChart
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'VariantLineageDetail',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    state: null,
    docsServiceURL: window.App.docsServiceURL,
    _setStateAttr: function (state) {
      this._set('state', state);
      const loc = state.hashParams.loc || 'B.1.617.2'
      this.set('properties', loc);
      // this.updateByCountryChart(loc);
      // this.updateByMonthChart(loc);
    },
    updateByCountryChart: function (loc) {
      if (loc == '') return;

      xhr.post(window.App.dataServiceURL + '/spike_lineage', {
        data: `&eq(lineage_of_concern,%22${loc}%22)&ne(country,All)&eq(region,All)&eq(month,All)&select(country,lineage_count,lineage)&limit(25000)`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (data) {
        const byCountrySum = data.reduce((a, b) => {
          if (a.hasOwnProperty(b.country)) {
            a[b.country] += b.lineage_count;
          } else {
            a[b.country] = b.lineage_count;
          }
          return a;
        }, {})
        const vbar_chart_data = Object.entries(byCountrySum).map(([key, val]) => {
          return {
            label: key,
            value: val
          }
        }).sort((a, b) => {
          return b.value - a.value;
        }).map((el, i) => {
          el.rank = i;
          return el;
        })
        // console.log(vbar_chart_data);
        this.vbar_chart.render(vbar_chart_data);
      }))
    },
    updateByMonthChart: function (loc) {
      if (loc == '') return;

      xhr.post(window.App.dataServiceURL + '/spike_lineage/', {
        data: `eq(lineage_of_concern,%22${loc}%22)&ne(lineage,D614G)&eq(region,All)&ne(month,All)&eq(month,*)&select(lineage,lineage_count,month)&limit(25000)`,
        headers: {
          accept: 'application/json',
          'content-type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (data) {
        // console.log(data)
        const byMonthSum = data.reduce((a, b) => {
          if (a.hasOwnProperty(b.month)) {
            a[b.month] += b.lineage_count;
          } else {
            a[b.month] = b.lineage_count;
          }
          return a;
        }, {})
        const chart_data = Object.entries(byMonthSum).map(([key, val]) => {
          return {
            year: key / 100,
            bar_count: val
          }
        })
        // console.log(chart_data)
        this.hbar_chart.render(chart_data)
      }))
    },
    _setPropertiesAttr: function (lineage_id) {
      domConstruct.empty(this.lineagePropertiesNode);
      var table = domConstruct.create('table', { 'class': 'p3basic striped' }, this.lineagePropertiesNode);
      var tbody = domConstruct.create('tbody', {}, table);

      var htr;
      Object.entries(this.data[lineage_id]).forEach(([key, value]) => {
        htr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('th', { innerHTML: key, scope: 'row', style: 'width:25%;font-weight:bold' }, htr);
        if (typeof (value) != 'string') {
          var inner = ['<ol>'];
          value.forEach(function (el) {
            inner.push(`<li>${el}</li>`);
          })
          inner.push('</ol>');

          domConstruct.create('td', { innerHTML: inner.join('') || '&nbsp;' }, htr);
        } else {
          domConstruct.create('td', { innerHTML: value || '&nbsp;' }, htr);
        }
      })
    },
    _buildSelectBox: function () {

      var select_lineage = new Select({
        name: 'selectLoC',
        id: 'selectLoC',
        options: ['Lineages', 'B.1.617.2', 'BA.1', 'BA.2', 'BA.2.12.1', 'BA.2.75', 'BA.3', 'BA.4', 'BA.5', 'B.1.1.7', 'B.1.351', 'P.1', 'B.1.427/B.1.429', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.3', 'B.1.621', 'P.2'].map((el) => { return { 'label': el, 'value': el } }),
        style: 'width: 200px; margin: 5px 0'
      });
      this.select_lineage = select_lineage;

      var self = this;
      select_lineage.on('change', function (value) {
        if (value === 'Lineage of Concern' || value === 'Lineage of Interest') {
          return
        }
        if (value !== '') {
          on.emit(self.domNode, 'UpdateHash', {
            bubbles: true,
            cancelable: true,
            hashProperty: 'loc',
            value: value,
            oldValue: ''
          })
        }
      });
      var label_select_lineage = domConstruct.create('label', {
        style: 'margin-left: 5px;',
        innerHTML: 'Select Lineage of Concern/Interest (LoC/LoI): '
      });
      domConstruct.place(label_select_lineage, this.lineageSelectNode, 'last');
      domConstruct.place(select_lineage.domNode, this.lineageSelectNode, 'last');
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._buildSelectBox();
      /*
      this.vbar_chart = new VerticalBarChart(this.byCountryHBarChartNode, 'loc_country', {
        top_n: 10,
        title: 'Sequences by Country',
        width: 600,
        height: 400,
        margin: {
          top: 50,
          right: 10,
          bottom: 10,
          left: 100
        },
        x_axis_scale: 'log',
        tooltip: function(d) {
          return `Country: ${d.label}<br/>Count: ${d.value}`
        }
      })
      this.hbar_chart = new BarLineChart(this.byLineageChartNode, 'loc_by_month', {
        title: 'Sequences by Month',
        width: 600,
        margin: {
          top: 50,
          right: 10,
          bottom: 50,
          left: 100
        },
        tooltip: function(d) {
          return `Month: ${d.year}<br>Counts: ${d.bar_count}`
        }
      })
      */
    },
    data: {
      'B.1.617.2': {
        'Lineage': 'B.1.617.2',
        'WHO name': 'Delta',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.2.html" target=_blank>B.1.617.2</a>',
        'NextStrain lineage': '21A (Delta)',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, T478K, D614G, P681R,  D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S; nsp12:P323L, G671S; nsp13:P77L; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; N:D63G, R203M, D377Y',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.451044" target=_blank>SARS-CoV-2/human/USA/IN-CDC-STM-000049216/2021</a>',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'BA.1': {
        'Lineage': 'BA.1',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.1.html" target=_blank>BA.1</a>',
        'NextStrain lineage': '21K (Omicron)',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'November 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'A67V, H69-, V70-, T95I, G142D, V143-, Y144-, Y145-, N211-, L212I, ins214EPE, G339D, S371L, S373P, S375F, K417N, N440K, G446S, S477N, T478K, E484A, Q493R, G496S, Q498R, N501Y, Y505H, T547K, D614G, H655Y, N679K, P681H, N764K, D796Y, N856K, Q954H, N969K, L981F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: K38R, S1265-, L1266I, A1892T; nsp4: T492I; nsp5: P132H; nsp6: L105-, S106-, G107-, I189V; nsp12: P323L; nsp14: I42V; E: T9I; M: D3G, Q19E, A63T; N: P13L, E31-, R32-, S33-, R203K, G204R',
        'Representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/OL672836" target=_blank>Severe acute respiratory syndrome coronavirus 2 isolate SARS-CoV-2/human/BEL/rega-20174/2021</a>',
        'Relevant publications': [
          '<a href="https://www.ecdc.europa.eu/en/publications-data/covid-19-threat-assessment-spread-omicron-first-update" target=_blank>Threat Assessment Brief: Implications of the further emergence and spread of the SARS CoV 2 B.1.1.529 variant of concern (Omicron) for the EU/EEA first update</a>',
          '<a href="https://cov-lineages.org/lineage.html?lineage=B.1.1.529" target=_blank>Lineage B.1.1.529</a>'
        ]
      },
      'BA.2': {
        'Lineage': 'BA.2',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.2.html" target=_blank>BA.2</a>',
        'NextStrain lineage': '21L (Omicron)',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'November 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24del, P25del, P26del, A27S, G142D, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R;  nsp3: T24I, G489S, nsp4: L264F, T327I, L438F, T492I: nsp5: F108del, P132H; nsp6: S106del, G107del, F108del; nsp12: P323L; nsp13: R392C; nsp14: I42V; nsp15: T112I; ORF3a: T223I; E: T9I; M: Q19E , A63T; N: P13L, E31del, R32del, S33del, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OM371884" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-77CPCCUR3/2022</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/361" target=_blank>https://github.com/cov-lineages/pango-designation/issues/361</a>',
        ]
      },
      'BA.2.12.1': {
        'Lineage': 'BA.2.12.1',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.2.html" target=_blank>BA.2</a>',
        'NextStrain lineage': '21C (Omicron)',
        'Emergence location': 'Canada/USA',
        'Emergence date': 'December 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24del, P25del, P26del, A27S, G142D, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452Q, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, S704L, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, nsp3:G489S; nsp4:L264F, T327I, L438F, T492I; nsp5:P132H; nsp6:del106-108; nsp12 P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF8:S84L; N:P13L, del31/33, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.4570651" target=_blank>SARS-CoV-2/human/USA/NY-CDC-LC0553978/2022</a>',
        'Relevant publications': [

        ]
      },
      'BA.2.75': {
        'Lineage': 'BA.2.75',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.2.75.html" target=_blank>BA.2.75</a>',
        'NextStrain lineage': '21D (Omicron)',
        'Emergence location': 'India',
        'Emergence date': 'June 2022',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24del, P25del, P26del, A27S, G142D, K147E, W152R, F157L, I210V, V213G, G257S, G339H, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, G446S, N460K, S477N, T478K, E484A, R493Q, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R; nsp3: T24I, S403L, G489S, P822S; nsp4: L264F, T327I, L438F, T492I; nsp5: P132H; nsp6: S106del, G107del, F108del; nsp8: N118S; nsp12: P323L, G671S; nsp13: R392C; nsp14: I42V; nsp15: T112I; ORF3a:T223I; E:T9I, T11A; M:Q19E, A63T; ORF6:D61L; N:P13L, E31del, R32del, S33del, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/ON990685" target=_blank>SARS-CoV-2/human/USA/IL-CDC-STM-G6D8GUH6S/2022</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/773" target=_blank>https://github.com/cov-lineages/pango-designation/issues/773</a>',
        ]
      },
      'BA.3': {
        'Lineage': 'BA.3',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.3.html" target=_blank>BA.3</a>',
        'NextStrain lineage': '22K (Omicron)',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'November 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'A67V, H69del, V70del, T95I, G142D, V143del, Y144del, Y145del, N211del, L212I, G339D, S371F, S373P, S375F, D405N, K417N, N440K, G446S, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R; nsp3: G489S; nsp: T327I, T492I; nsp5: P132H; nsp6: A88V, S106del, G107del, F108del; nsp12: P323L; nsp14: I42V; ORF3a: T223I; E: T9I; M: A63T; M: Q19E; N: P13L, E31del, R32del, S33del, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OV494217" target=_blank>UNKNOWN-OV494217</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/367" target=_blank>https://github.com/cov-lineages/pango-designation/issues/367</a>',
        ]
      },
      'BA.4': {
        'Lineage': 'BA.4',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.4.html" target=_blank>BA.4</a>',
        'NextStrain lineage': '22A (Omicron)',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'January 2022',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24del, L24del, P25del, P25del, P25del, P26del, P26del, P26del, A27S, H69del, V70del, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, R452K, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, G489S; nsp4:L264F, L327I, T492I; nsp5: P132H; nsp6:S106del, G107del, F108del; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF7b: L11F; N:P13L, E31del, R32del, S33del, P151S, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/ON373214" target=_blank>SARS-CoV-2/human/USA/PA-CDC-LC0583069/2022</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/517" target=_blank>https://github.com/cov-lineages/pango-designation/issues/517</a>',
        ]
      },
      'BA.5': {
        'Lineage': 'BA.5',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.5.html" target=_blank>BA.5</a>',
        'NextStrain lineage': '22B (Omicron)',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'January 2022',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24del, L24del, P25del, P25del, P25del, P26del, P26del, P26del, A27S, H69del, V70del, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, R452K, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp2:Q376K; nsp3:T24I, G489S; nsp4:L264F, L327I, T492I; nsp5: P132H; nsp6:S106del, G107del, F108del; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:D3N, Q19E, A63T; N:P13L, E31del, R32del, S33del, R203K, G204R, S413R',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.4881887" target=_blank>SARS-CoV-2/human/USA/MI-CDC-ASC210848963/2022</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/517" target=_blank>https://github.com/cov-lineages/pango-designation/issues/517</a>',
        ]
      },
      'B.1.1.7': {
        'Lineage': 'B.1.1.7',
        'WHO name': 'Alpha',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7 + Q.* lineages</a>',
        'NextStrain lineage': '20I (Alpha, V1)',
        'Emergence location': 'United Kingdom',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'H69-**, V70-**, N501Y**, A570D, D614G**, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T183I, A890D, I1412T; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: K460R; ORF8: Q27stop',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.300955" target=_blank>SARS-CoV-2/human/USA/CA-CDC-STM-000008272/2021</a>',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>Virological.org</a>'
        ]
      },
      'B.1.351': {
        'Lineage': 'B.1.351',
        'WHO name': 'Beta',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351 + B.1.351.* lineages</a>',
        'NextStrain lineage': '20H (Beta, V2)',
        'Emergence location': 'South Africa',
        'Emergence date': 'May 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': '(L18F*)**, D80A, D215G, L242-, A243-, L244-, (R246I*), K417N**, E484K**, N501Y**, D614G**, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp3: K837N, A1775V; 3C-like proteinase: K90R; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: T588I; ORF3a: Q57H; S171L; envelope protein: P71L; nucleocapsid phosphoprotein: T205I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.293736" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-TRA-186/2021</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2020.12.21.20248640v1" target=_blank>Tegally et al. 2020</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2020.12.31.425021v1" target=_blank>Greaney et al. 2021</a>',
          '<a href="https://elifesciences.org/articles/61312" target=_blank>Weisblum et al. 2020</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank">CDC Emerging Variants</a>'
        ]
      },
      'P.1': {
        'Lineage': 'P.1',
        'WHO name': 'Gamma',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.28.html" target=_blank>P.1 + P.1.* lineages</a>',
        'NextStrain lineage': '20J (Gamma, V3)',
        'Emergence location': 'Brazil',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L18F**, T20N, P26S, D138Y, R190S, K417T**, E484K**, N501Y**, D614G**, H655Y, T1027I, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: S370L, K977Q; nsp4: S184N; 3C-like proteinase: A260V; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: E341D; ORF3a protein: S253P; ORF8 protein: E92K; nucleocapsid phosphoprotein: P80R, R203K, G204R',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.331381" target=_blank>SARS-CoV-2/human/ITA/ABR-IZSGC-TE30968/2021|gb|QRX39425</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.03.21252706v3" target=_blank>Mendes Coutinho et al.</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/spike-e484k-mutation-in-the-first-sars-cov-2-reinfection-case-confirmed-in-brazil-2020/584" target=_blank>Resende et al. 2021</a>'
        ]
      },
      'B.1.427/B.1.429': {
        'Lineage': 'B.1.427/B.1.429',
        'WHO name': 'Epsilon',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.427.html" target=_blank>B.1.427</a>',
        'NextStrain lineage': '20C/S:452R',
        'Emergence location': 'USA',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp4: S395T; nsp12: P323L; nsp13: P53L, D260Y; ORF3: Q57H; ORF8: A65V; N: T205I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.333200#view_tab=overview" target=_blank>SARS-CoV-2/human/USA/TN-CDC-LC0012874/2021</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>Transmission, infectivity, and antibody neutralization of an emerging SARS-CoV-2 variant in California carrying a L452R spike protein mutation</a>',
        ]
      },
      'B.1.525': {
        'Lineage': 'B.1.525',
        'WHO name': 'Eta',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.525.html" target=_blank>B.1.525</a>',
        'NextStrain lineage': '21D (Eta)',
        'Emergence location': 'Multiple',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'Q52R, E484K, D614G, Q677H, F888L',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1189I; nsp6:S106-, G107-, F108-; NSP12:P323F; E:L21F; M:I82T; N:A12G, T205I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.120701" target=_blank>SARS-CoV-2/human/USA/CA-LACPHL-AF00280/2021</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v2" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic<a>'
        ]
      },
      'B.1.526': {
        'Lineage': 'B.1.526',
        'WHO name': 'Iota',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.html" target=_blank>B.1.526</a>',
        'NextStrain lineage': '21F (Iota)',
        'Emergence location': 'USA',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, E484K*, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I; N:P199L, M234I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.333080" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-LC0012204/2021</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.02.14.431043v2#:~:text=1.526)%20are%20L5F%2C%20T95I%2C,New%20York%20during%20February%202021." target=_blank>ref</a>'
        ]
      },
      'B.1.617.1': {
        'Lineage': 'B.1.617.1',
        'WHO name': 'Kappa',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.1.html" target=_blank>B.1.617.1</a>',
        'NextStrain lineage': '21B (Kappa)',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E154K, L452R, E484Q, D614G, P681R, Q1071H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1429N; nsp6:T77A; nsp12:P323L; nsp13:M429I; nsp15:K259R; ORF3a:S26L; ORF7a:V82A; N:R203M, D377Y',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.433713" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-ASC210006113/2021</a>',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.617.3': {
        'Lineage': 'B.1.617.3',
        'WHO name': '---',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.3.html" target=_blank>B.1.617.3</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, E484Q, D614G, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A1526V, T1830I; nsp5:A194S; nsp6:A117V; nsp12:P323L; ORF7a:V82A; ORF8:T26I; N:P67S, R203M, D377Y',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.1272479" target=_blank>SARS-CoV-2/human/USA/NH-CDC-2-3998369/2021</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/49" target=_blank>https://github.com/cov-lineages/pango-designation/issues/49</a>',
        ]
      },
      'B.1.621': {
        'Lineage': 'B.1.621 + B.1.621.* lineages',
        'WHO name': 'Mu',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.621.html" target=_blank>B.1.621 + B.1.621.* lineages</a>',
        'NextStrain lineage': '21H (Mu)',
        'Emergence location': 'Colombia',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T95I, Y144S, Y145N, ins145N, R346K, E484K, N501Y, D614G, P681H, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T237A, T720I; nsp4: T492I; nsp6: Q160R; nsp12: P323L; nsp13: P419S; ORF3a: Q57H, V256I; ORF8: P38S, T11K, S67F; N:T205I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.1877076" target=_blank>SARS-CoV-2/human/USA/FL-CDC-ASC210274672/2021</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.09.06.459005v1" target=_blank>Ineffective neutralization of the SARS-CoV-2 Mu variant by convalescent and vaccine sera</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8364171/" target=_blank>Characterization of the emerging B.1.621 variant of interest of SARS-CoV-2</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8426698/" target=_blank>A cluster of the new SARS‐CoV‐2 B.1.621 lineage in Italy and sensitivity of the viral isolate to the BNT162b2 vaccine</a>',
        ]
      },
      'P.2': {
        'Lineage': 'P.2',
        'WHO name': 'Zeta',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_P.2.html" target=_blank>P.2</a>',
        'NextStrain lineage': '20J',
        'Emergence location': 'Brazil',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E484K, D614G, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp7: L71F; nsp12: P323L; N: A119S, R203K, G204R, M234I',
        'Representative strain link': '<a href="https://www.bv-brc.org/view/Genome/2697049.110644" target=_blank>SARS-CoV-2/human/USA/CA-QDX-4247/2021</a>',
        'Relevant publications': [
          '<a href="https://virological.org/t/genomic-characterisation-of-an-emergent-sars-cov-2-lineage-in-manaus-preliminary-findings/586" target=_blank>https://virological.org/t/genomic-characterisation-of-an-emergent-sars-cov-2-lineage-in-manaus-preliminary-findings/586</a>',
        ]
      },
    }
  });
});
