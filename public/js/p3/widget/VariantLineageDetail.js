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
      const loc = state.hashParams.loc || 'B.1.1.7'
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
        options: ['Lineage of Concern', 'B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'P.1',
          'Lineage of Interest',
          /* 'A.23.1', 'A.27', 'B.1.1.318', 'B.1.1.519', */ 'B.1.525', 'B.1.526',
          'B.1.526.1', /* 'B.1.526.2', */ 'B.1.617.1', 'B.1.617.2', 'B.1.617.3',
          /* 'C.37', */ 'P.2'/* , 'P.3', 'R.1' */].map((el) => { return { 'label': el, 'value': el } }),
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
      'B.1.1.7': {
        'LoC name': 'B.1.1.7',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7</a>',
        'NextStrain lineage': '20I/501Y.V1',
        'Other synonyms': 'VOC 202012/01, variant originating in UK',
        'Emergence location': 'Southeast England',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'H69-**, V70-**, N501Y**, A570D, D614G**, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T183I, A890D, I1412T; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: K460R; ORF8: Q27stop',
        'Impact': 'Increased transmissibility; S gene target failure (SGTF); increased severity (https://www.nature.com/articles/s41586-021-03426-1); little impact on neutralization by moclonal antibodies (https://www.fda.gov/media/145802/download); litte impact on neautralization by polyclonal antibodies (Wang P, Nair MS, Liu L, et al. Antibody Resistance of SARS-CoV-2 Variants B.1.351 and B.1.1.7. BioXRiv 2021. doi: https://doi.org/10.1101/2021.01.25.428137 Shen X, Tang H, McDanal C, et al. SARS-CoV-2 variant B.1.1.7 is susceptible to neutralizing antibodies elicited by ancestral Spike vaccines. BioRxiv 2021.  doi:  https://doi.org/10.1101/2021.01.27.428516',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW430974&decorator=corona&context=1611876836946" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-P012/2020</a>',
        'GISAID representative strain': 'hCoV-19/England/MILK-ACF9CC/2020|EPI_ISL_629440|2020-10-22',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>Virological.org</a>'
        ]
      },
      'B.1.351': {
        'LoC name': 'B.1.351',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351</a>',
        'NextStrain lineage': '20H/501Y.V2',
        'Other synonyms': 'variant originating in South African',
        'Emergence location': 'Nelson Mandela Bay, South African',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': '(L18F*)**, D80A, D215G, L242-, A243-, L244-, (R246I*), K417N**, E484K**, N501Y**, D614G**, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp3: K837N, A1775V; 3C-like proteinase: K90R; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: T588I; ORF3a: Q57H; S171L; envelope protein: P71L; nucleocapsid phosphoprotein: T205I',
        'Impact': 'Increased transmissibility (Pearson CAB, Russell TW, Davies NG, et al. Estimates of severity and transmissibility of novel South Africa SARS-CoV-2 variant 501Y.V2); E484K appears to result in loss of serum antibody neutralization; K417 is also found in RBD and may contribute to loss of serum antibody neutralization',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW571126&decorator=corona&context=1613244976238" target=_blank>SARS-CoV-2/human/GHA/WACCBIP_nCoV_GS73/2021</a>',
        'GISAID representative strain': 'hCoV-19/Belgium/UZA-UA-CV2009498880/2021|EPI_ISL_1120737|2021-02-20',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2020.12.21.20248640v1" target=_blank>Tegally et al. 2020</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2020.12.31.425021v1" target=_blank>Greaney et al. 2021</a>',
          '<a href="https://elifesciences.org/articles/61312" target=_blank>Weisblum et al. 2020</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank">CDC Emerging Variants</a>'
        ]
      },
      'B.1.427': {
        'LoC name': 'B.1.427',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.427.html" target=_blank>B.1.427</a>',
        'NextStrain lineage': '20C/S:452R',
        'Other synonyms': 'CAL.20C',
        'Emergence location': 'Southern California, USA',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp4: S395T; nsp12: P323L; nsp13: P53L, D260Y; ORF3: Q57H; ORF8: A65V; nucleocapsid phosphoprotein: T205I',
        'Impact': 'increased transmissibility (https://doi.org/10.1101/2021.03.07.21252647); deacreased neutralization by some monoclonal antibodies; decreased neutralization by polyclonal anibodies (https://doi.org/10.1101/2021.03.07.21252647)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW583414&decorator=corona&context=1617338677764" target=_blank>SARS-CoV-2/human/USA/TX-CDC-9N4G-9005/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/CA-CDPH-UC1551/2020|EPI_ISL_984563|2020-11-07',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>https://doi.org/10.1101/2021.03.07.21252647</a>'
        ]
      },
      'B.1.429': {
        'LoC name': 'B.1.429',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.429.html" target=_blank>B.1.429</a>',
        'NextStrain lineage': '20C/S:452R',
        'Other synonyms': 'CAL.20C',
        'Emergence location': 'Southern California, USA',
        'Emergence date': 'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp9: I65V; RNA-dependent RNA polymerase: P323L; helicase: D260Y; ORF3a: Q57H; nucleocapsid phosphoprotein: T205I',
        'Impact': 'increased transmissibility (https://doi.org/10.1101/2021.03.07.21252647); deacreased neutralization by some monoclonal antibodies; decreased neutralization by polyclonal anibodies (https://doi.org/10.1101/2021.03.07.21252647)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW485882&decorator=corona&context=1611876924806" target=_blank>SARS-CoV-2/human/USA/CA-LACPHL-AF00141/2021</a>',
        'GISAID representative strain': 'hCoV19/USA/CACZB12956/2020|EPI_ISL_672374|20201005',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>https://doi.org/10.1101/2021.03.07.21252647</a>',
          '<a href="https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2" target=_blank>Wikipedia CoV-2 Variants</a>',
          '<a href="https://www.medrxiv.org/content/10.1101/2021.01.18.21249786v1" target=_blank>Zhang et al. 2021</a>'
        ]
      },
      'P.1': {
        'LoC name': 'P.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.28.html" target=_blank>B.1.1.28.1</a>',
        'NextStrain lineage': '20J/501Y.V3',
        'Other synonyms': 'variant originating in Brazil, B.1.1.248',
        'Emergence location': 'Brazil',
        'Emergence date': 'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L18F**, T20N, P26S, D138Y, R190S, K417T**, E484K**, N501Y**, D614G**, H655Y, T1027I, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: S370L, K977Q; nsp4: S184N; 3C-like proteinase: A260V; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: E341D; ORF3a protein: S253P; ORF8 protein: E92K; nucleocapsid phosphoprotein: P80R, R203K, G204R',
        'Impact': 'Increased transmissibility; E484K appears to result in loss of serum antibody neutralization; K417 is also found in RBD and may contribute to loss of serum antibody neutralization',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW642250&decorator=corona" target=_blank>SARS-CoV-2/human/ITA/ABR-IZSGC-TE30968/2021|gb|QRX39425</a>',
        'GISAID representative strain': 'hCoV-19/Brazil/AM-991/2020|EPI_ISL_833171|2020-12-17',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.03.21252706v3" target=_blank>Mendes Coutinho et al.</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/spike-e484k-mutation-in-the-first-sars-cov-2-reinfection-case-confirmed-in-brazil-2020/584" target=_blank>Resende et al. 2021</a>'
        ]
      },
      'A.23.1': {
        'VoC name': 'A.23.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_A.23.1.html" target=_blank>A.23.1 + E484K</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'VUI 202102/01',
        'Emergence location': 'Uganda',
        'Emergence date': '2020-10-21',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'R102I, F157L, V367F, E484K, Q613H, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:L741F, nsp6:M86I, nsp6:L98F, nsp6:M183I, ORF8:L84S, N: E92K, S202N',
        'Impact': 'Q613H is predicted to be functionally equivalent to the D614G mutation that arose early in 2020. International lineage with a number of variants of potential biological concern, including 681R',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW571125&decorator=corona" target=_blank>SARS-CoV-2/human/GHA/WACCBIP_nCoV_GS109/2021</a>',
        'GISAID representative strain': 'hCoV-19/Uganda/UG262/2020|EPI_ISL_1469353|2020-11-06',
        'Relevant publications': [
          '<a href="https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/972247/Variants_of_Concern_VOC_Technical_Briefing_7_England.pdf" target=_blank>SARS-CoV-2 variants of concern and variants under investigation in England</a>'
        ]
      },
      'A.27': {
        'VoC name': 'A.27',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_A.27.html" target=_blank>A.27</a>',
        'NextStrain lineage': '19B/501Y',
        'Other synonyms': '-',
        'Emergence location': 'France',
        'Emergence date': '2020-12-14',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L18F, L452R, N501Y, D614D, A653V, H655Y, D796Y, G1219V (sometimes Q677H)',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: P106L; nsp4:D217G; nsp6:N82S; nsp13:P77L; ORF3a:V50A; ORF3a:del257/258; ORF6:del63; ORF8:L84S; N:S202N',
        'Impact': 'Mayotte/ European cluster with 18 changes in the long branch leading to this cluster, including 7 NS changes in the spike (L18F, L452R, N501Y, A653V, H655Y, D796Y, G1219V), on a 614D background. pango-designation issue #11.',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2017070519" target=_blank>SARS-CoV-2/human/USA/CO-CDPHE-2100509191/2021</a>',
        'GISAID representative strain': 'hCoV-19/Nigeria/BCVL-18912/2021|EPI_ISL_985238|2021-01-05',
        'Relevant publications': [
          '<a href="https://virological.org/t/resurgence-of-sars-cov-2-19b-clade-corresponds-with-possible-convergent-evolution/620" target=_blank>Resurgence of SARS-CoV-2 19B clade corresponds with possible convergent evolution</a>'
        ]
      },
      'B.1.1.318': {
        'VoC name': 'B.1.1.318 + E484K',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.318.html" target=_blank>B.1.1.318</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'VUI 202102/04',
        'Emergence location': 'England',
        'Emergence date': '2021-02',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T95I, del144*, E484K, P681H, D796H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:E378V, nsp3K1693N, nsp4:T173I, nsp4:A446V, nsp5:T21I, nsp6:del106-108, nsp15:V320M, M:I82T, ORF8:del1-3, E106, N:A208_A209delinsG',
        'Impact': 'Lineage circulating in multiple countries with a number of variants of concern (Spike D614G, Spike D796H, Spike E484K, Spike P681H, Spike T95I, Spike Y144del). pango-designation issue #15',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2017803574" target=_blank>SARS-CoV-2/human/USA/MD-MDH-1369/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/MD-MDH-1369/2021, EPI_ISL_1336302',
        'Relevant publications': [
          '<a href="https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/972247/Variants_of_Concern_VOC_Technical_Briefing_7_England.pdf" target=_blank>SARS-CoV-2 variants of concern and variants under investigation in England</a>'
        ]
      },
      'B.1.1.519': {
        'VoC name': 'B.1.1.519',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.519.html" target=_blank>B.1.1.519</a>',
        'NextStrain lineage': '-',
        'Other synonyms': '-',
        'Emergence location': 'Mexico',
        'Emergence date': '2020-10',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T478K, D614G, P681H, T732A ',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P141S, nsp4:T492I, nspP6:I49V, nsp9:T35I, nsp12:P323L, N: R203K,G204R ',
        'Impact': 'USA/ Mexico lineage',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW644499&decorator=corona" target=_blank>SARS-CoV-2/human/USA/MD-MDH-0958/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/FL-BPHL-2798/2020|EPI_ISL_876555|2020-11-23',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v1" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic<a>'
        ]
      },
      'B.1.525': {
        'VoC name': 'B.1.525',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.525.html" target=_blank>B.1.525</a>',
        'NextStrain lineage': '20A/S:484K',
        'Other synonyms': '-',
        'Emergence location': 'Multiple',
        'Emergence date': '2020-12-15',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'Q52R, E484K, D614G, Q677H, F888L',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1189I; nsp6:S106-, G107-, F108-; NSP12:P323F; E:L21F; M:I82T; N:A12G, T205I',
        'Impact': 'Potential decreased neutralization by monoclonal and polyclonal antibodies. International lineage with E484K, del69-70 among other defining mutations.',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW560924&decorator=corona" target=_blank>SARS-CoV-2/human/USA/CA-LACPHL-AF00280/2021</a>',
        'GISAID representative strain': 'hCoV-19/England/CAMC-C769B3/2020|EPI_ISL_760883|2020-12-15',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v2" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic<a>'
        ]
      },
      'B.1.526': {
        'VoC name': 'B.1.526',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.html" target=_blank>B.1.526</a>',
        'NextStrain lineage': '20C/S:484K',
        'Other synonyms': 'NY variant',
        'Emergence location': 'New York',
        'Emergence date': '2020-11-15',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, E484K*, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I; N:P199L, M234I',
        'Impact': 'Minimal decrease in neutralization by monoclonal and polyclonal antibodies (https://www.biorxiv.org/content/10.1101/2021.03.24.436620v1)',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/MW636816.1" target=_blank>SARS-CoV-2/human/USA/IL-CDC-LC0007194/2021 (not in vipr yet)</a>',
        'GISAID representative strain': 'hCoV-19/USA/NY-NP-3840/2020|EPI_ISL_1080798|2020-12',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.02.14.431043v2#:~:text=1.526)%20are%20L5F%2C%20T95I%2C,New%20York%20during%20February%202021." target=_blank>ref</a>'
        ]
      },
      'B.1.526.1': {
        'VoC name': 'B.1.526.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_.html" target=_blank></a>',
        'NextStrain lineage': '20C',
        'Other synonyms': '-',
        'Emergence location': 'New York',
        'Emergence date': '2020-12',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'D80G, Y144-, F157S, L452R, D614G, T859N, D950H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4: K399E, L438P, A446V; NSP6:S106-, G107del, F108-, V278I; NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I,A51S; N: T205I, M234I',
        'Impact': 'Potential decrease in neutralization by monoclonal and polyclonal antibodies. Sublineage of B.1.526 (with spike mutations T95I and D253G) that appears to have several more unique mutations.',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW644517&decorator=corona" target=_blank>SARS-CoV-2/human/USA/MD-MDH-0978/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NY-Wadsworth-21010079-01/2021|EPI_ISL_896306|2021-01-05',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/cases-updates/variant-surveillance/variant-info.html" target=_blank>CDC</a>'
        ]
      },
      'B.1.526.2': {
        'VoC name': 'B.1.526.2',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.2.html" target=_blank>B.1.526.2</a>',
        'NextStrain lineage': '20C',
        'Other synonyms': '-',
        'Emergence location': 'New York',
        'Emergence date': '2020-12-08',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, S477N, D614G, Q957R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp3:G1128S, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:P42L, Q57H; ORF7a:L116F; ORF8:T11I; N:P199L, S202R',
        'Impact': 'Potential decrease in neutralization by monoclonal and polyclonal antibodies. Sublineage of B.1.526 (with spike mutations T95I and D253G) that appears to have several more unique mutations.',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2024806009" target=_blank>SARS-CoV-2/human/USA/NY-CDC-LC0034258/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NY-NYCPHL-001663/2020|EPI_ISL_823886|2020-12-08',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/cases-updates/variant-surveillance/variant-info.html" target=_blank>CDC</a>'
        ]
      },
      'B.1.617.1': {
        'VoC name': 'B.1.617.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.1.html" target=_blank>B.1.617.1</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.617',
        'Emergence location': 'India',
        'Emergence date': '2020-12-01',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E154K, L452R, E484Q, D614G, P681R, Q1071H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1429N; nsp6:T77A; nsp12:P323L; nsp13:M429I; nsp15:K259R; ORF3a:S26L; ORF7a:V82A; N:R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2022725152" target=_blank>SARS-CoV-2/human/USA/OH-CDC-ASC210016576/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/OH-CDC-ASC210016576/2021, EPI_ISL_1491819',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.617.2': {
        'VoC name': 'B.1.617.2',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.2.html" target=_blank>B.1.617.2</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.617',
        'Emergence location': 'UK',
        'Emergence date': '2020-12-12',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, T478K, D614G, P681R,  D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S; nsp12:P323L, G671S; nsp13:P77L; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; N:D63G, R203M, D377Y',
        'Impact': 'Predominantly India lineage with several spike mutations, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2028982630" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-LC0038223/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NJ-CDC-LC0038223/2021, EPI_ISL_1611370',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.617.3': {
        'VoC name': 'B.1.617.3',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.3.html" target=_blank>B.1.617.3</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.617',
        'Emergence location': 'India',
        'Emergence date': '2020-10-02',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, E484Q, D614G, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A1526V, T1830I; nsp5:A194S; nsp6:A117V; nsp12:P323L; ORF7a:V82A; ORF8:T26I; N:P67S, R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="" target=_blank></a>',
        'GISAID representative strain': 'hCoV-19/USA/CA-Stanford-15_S42/2021, EPI_ISL_1701680',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'C.37': {
        'VoC name': 'C.37',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.37.html" target=_blank>C.37</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.1.1.37',
        'Emergence location': 'Peru',
        'Emergence date': '2021-01',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'G75V, T76I, R246N, S247-, Y248-, L249-, T250-, P251-, G252-, D253-, L452Q, F490S, D614G, T859N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P2287S, F2387V; nsp4:L3201P, T3255I; nsp12:P314L; ORF9b:P10S; N:P13L, G214C',
        'Impact': 'Several deletions in spike protein- 2 escape mutations- sublineage may have S gene dropout',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2021145343" target=_blank>SARS-CoV-2/human/USA/VA-DCLS-3388/2021</a>',
        'GISAID representative strain': 'hCoV-19/Peru/LIM-INS-731/2021|EPI_ISL_1138413|2021-01-12',
        'Relevant publications': [
          'https://virological.org/t/novel-sublineage-within-b-1-1-1-currently-expanding-in-peru-and-chile-with-a-convergent-deletion-in-the-orf1a-gene-3675-3677-and-a-novel-deletion-in-the-spike-gene-246-252-g75v-t76i-l452q-f490s-t859n/685'
        ]
      },
      'P.2': {
        'VoC name': 'P.2',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_P.2.html" target=_blank>P.2</a>',
        'NextStrain lineage': '20J',
        'Other synonyms': 'B.1.1.28.2',
        'Emergence location': 'Brazil',
        'Emergence date': '2020-04-15',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E484K, D614G, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp5: L3468V; nsp7: L3930F; nsp12: P314L; N: A119S, R203K, G204R, M234I; 5’UTR: R81C',
        'Impact': 'Potential decreased neutralization by monoclonal and polyclonal antibodies',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW523796&decorator=corona&context=1617986992485" target=_blank>SARS-CoV-2/human/USA/CA-QDX-4247/2021</a>',
        'GISAID representative strain': 'hCoV-19/Brazil/RJ-00552/2020|EPI_ISL_717936|2020-10-29',
        'Relevant publications': [
          'https://virological.org/t/genomic-characterisation-of-an-emergent-sars-cov-2-lineage-in-manaus-preliminary-findings/586'
        ]
      },
      'P.3': {
        'VoC name': 'P.3',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_P.3.html" target=_blank>P.3</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.1.28.3; VUI-21MAR-02',
        'Emergence location': 'Philippines',
        'Emergence date': '2021-01-16',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L141-, G142-, V143-, A243-, L244-, E484K, N501Y, D614G, P681H, E1092K, H1101Y, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:D736G, S1807F; nsp4:D217N, L438P; nsp6:D112E; nsp7:L71F; nsp12:P323L; nsp13:A368V, L280F; ORF8:K2Q; N:G204R, R203K',
        'Impact': 'Potential decrease in neutralization by monoclonal and polyclonal antibodies. Alias of B.1.1.28.3, Lineage predominantly in the Philippines with spike mutations E484K, N501Y, P681H, 141-143del',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2026640365" target=_blank>SARS-CoV-2/human/USA/CA-CDC-FG-019454/2021</a>',
        'GISAID representative strain': 'hCoV-19/Norway/3458/2021|EPI_ISL_1073934|2021-02-05',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.03.21252812v2" target=_blank>Genome sequencing and analysis of an emergent SARS-CoV-2 variant characterized by multiple spike protein mutations detected from the Central Visayas Region of the Philippines</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2021.03.06.434059v2" target=_blank>Structural Analysis of Spike Protein Mutations in the SARS-CoV-2 P.3 Variant</a>'
        ]
      },
      'R.1': {
        'VoC name': 'R.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_R.1.html" target=_blank>R.1</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.1.316.1',
        'Emergence location': 'Multiple',
        'Emergence date': '2020-10-24',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'W152L, E484K, D614G, G769V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp12:P314L; nsp13:G1362R; nsp14:P1936H; M:F28L; N:S187L, R203K, G204R, Q418H',
        'Impact': 'Alias of B.1.1.316.1, Sublineage of B.1.1.316 with 3 additional spike mutations, circulating in a number of countries. pango-designation issue #17',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW598432&decorator=corona" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-NTRA-15381/2020</a>',
        'GISAID representative strain': 'hCoV-19/Japan/PG-19418/2020|EPI_ISL_1123466|2020-12-29',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.16.21253248v1.full-text" target=_blank>Household transmission of SARS-CoV-2 R.1 lineage with spike E484K mutation in Japan</a>',
          '<a href="https://www.cdc.gov/mmwr/volumes/70/wr/mm7017e2.htm" target=_blank>CDC</a>'
        ]
      }
    }
  });
});
