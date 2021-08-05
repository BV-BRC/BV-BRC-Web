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
        options: ['Lineage of Concern', 'B.1.1.7', 'B.1.351', 'B.1.617.2', 'AY.1', 'AY.2', 'AY.3', 'AY.3.1', 'P.1',
          'Lineage of Interest', 'B.1.427', 'B.1.429', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.3'].map((el) => { return { 'label': el, 'value': el } }),
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
        'VoC name': 'B.1.1.7',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7</a>',
        'NextStrain lineage': '20I(Alpha, V1)',
        'WHO name': 'Alpha',
        'Other synonyms': 'VOC 202012/01, UK variant',
        'Emergence location': 'United Kingdom',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'H69-**, V70-**, N501Y**, A570D, D614G**, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T183I, A890D, I1412T; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: K460R; ORF8: Q27stop',
        'Impact': 'Increased transmissibility; S gene target failure (SGTF); increased severity (https://www.nature.com/articles/s41586-021-03426-1); little impact on neutralization by moclonal antibodies (https://www.fda.gov/media/145802/download); litte impact on neautralization by polyclonal antibodies (Wang P, Nair MS, Liu L, et al. Antibody Resistance of SARS-CoV-2 Variants B.1.351 and B.1.1.7. BioXRiv 2021. doi: https://doi.org/10.1101/2021.01.25.428137 Shen X, Tang H, McDanal C, et al. SARS-CoV-2 variant B.1.1.7 is susceptible to neutralizing antibodies elicited by ancestral Spike vaccines. BioRxiv 2021.  doi:  https://doi.org/10.1101/2021.01.27.428516',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW642026&decorator=corona_ncov&context=1625086072003" target=_blank>SARS-CoV-2/human/USA/OH-UHTL-43/2021</a>',
        'GISAID representative strain': 'hCoV-19/England/MILK-ACF9CC/2020|EPI_ISL_629440|2020-10-22',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>Virological.org</a>'
        ]
      },
      'B.1.351': {
        'VoC name': 'B.1.351',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351</a>',
        'NextStrain lineage': '20H(Beta, V2)',
        'WHO name': 'Beta',
        'Other synonyms': 'VOC-20DEC02, South African variant',
        'Emergence location': 'South Africa',
        'Emergence date': 'May 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': '(L18F*)**, D80A, D215G, L242-, A243-, L244-, (R246I*), K417N**, E484K**, N501Y**, D614G**, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp3: K837N, A1775V; 3C-like proteinase: K90R; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: T588I; ORF3a: Q57H; S171L; envelope protein: P71L; nucleocapsid phosphoprotein: T205I',
        'Impact': 'Increased transmissibility (Pearson CAB, Russell TW, Davies NG, et al. Estimates of severity and transmissibility of novel South Africa SARS-CoV-2 variant 501Y.V2); E484K appears to result in loss of serum antibody neutralization; K417 is also found in RBD and may contribute to loss of serum antibody neutralization',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW598408&decorator=corona_ncov&context=1625156219083" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-TRA- 143/2021</a>',
        'GISAID representative strain': 'hCoV-19/Belgium/UZA-UA-CV2009498880/2021|EPI_ISL_1120737|2021-02-20',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2020.12.21.20248640v1" target=_blank>Tegally et al. 2020</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2020.12.31.425021v1" target=_blank>Greaney et al. 2021</a>',
          '<a href="https://elifesciences.org/articles/61312" target=_blank>Weisblum et al. 2020</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank">CDC Emerging Variants</a>'
        ]
      },
      'B.1.617.2': {
        'VoC name': 'B.1.617.2',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.2.html" target=_blank>B.1.617.2</a>',
        'NextStrain lineage': '21A(Delta)',
        'WHO name': 'Delta',
        'Other synonyms': 'B.1.617, VOC-21APR02',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, T478K, D614G, P681R,  D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S; nsp12:P323L, G671S; nsp13:P77L; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; N:D63G, R203M, D377Y',
        'Impact': 'Predominantly India lineage with several spike mutations, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ184193&decorator=corona_ncov&context=1625157326240" target=_blank>SARS-CoV-2/human/USA/IL-CDC-ASC210035446/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NJ-CDC-LC0038223/2021, EPI_ISL_1611370',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'AY.1': {
        'VoC name': 'AY.1',
        'PANGO lineage': '<a href="" target=_blank>AY.1</a>',
        'NextStrain lineage': '21A(Delta)',
        'WHO name': 'Delta',
        'Other synonyms': 'B.1.617.2',
        'Emergence location': 'Multiple Countries',
        'Emergence date': 'April 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, W258L, K417N, L452R, T478K, D614G, P681R, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A488S, P1228L, P1469S; nsp4:V167L, T492I; nsp6:T77A; nsp12:P323L, G671S; nsp13:P77L; nsp14:A394V ; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; ORF7b:T40I; ORF8:D119-, F120-; N:D63G, R203M, G215C, D377Y',
        'Impact': 'Increased transmissibility; may have reduced neutralization by some monoclonal & polyclonal antibodies',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/MZ315637" target=_blank>SARS-CoV-2/human/USA/CA-CDC-STM-000072456/2021</a>',
        'GISAID representative strain': '',
        'Relevant publications': [
          '<a href="https://khub.net/documents/135939561/405676950/Increased+Household+Transmission+of+COVID-19+Cases+-+national+case+study.pdf/7f7764fb-ecb0-da31-77b3-b1a8ef7be9aa" target=_blank>Increased household transmission of COVID-19 cases associated with SARS-CoV-2 Variant of Concern B.1.617.2: a national case- control study</a>',
          '<a href="https://www.fda.gov/media/145802/" target=_blank>Fact Sheet For Health Care Providers Emergency Use Authorization (Eua) Of Bamlanivimab And Etesevimab 05142021</a>',
          '<a href="https://www.fda.gov/media/145611/" target=_blank>Regeneron EUA HCP Fact Sheet 06032021</a>',
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>Transmission, infectivity, and antibody neutralization of an emerging SARS-CoV-2 variant in California carrying a L452R spike protein mutation</a>',
        ]
      },
      'AY.2': {
        'VoC name': 'AY.2',
        'PANGO lineage': '<a href="" target=_blank>AY.2</a>',
        'NextStrain lineage': '21A(Delta)',
        'WHO name': 'Delta',
        'Other synonyms': 'B.1.617.2',
        'Emergence location': 'USA',
        'Emergence date': 'March 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, V70F, F157-, R158-, A222V, K417N, L452R, T478K, D614G, P681R, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A328T, P822L; nsp4:A446V; nsp6:V149A, T181I; nsp12:P323L, G671S; nsp13:P77L, T367I; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; ORF8:D119-, F120-; N:D63G, R203M, D377Y',
        'Impact': 'Increased transmissibility; may have reduced neutralization by some monoclonal & polyclonal antibodies',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/MZ436591" target=_blank>SARS-CoV-2/human/USA/LSUH000677E2S1/2021</a>',
        'GISAID representative strain': '',
        'Relevant publications': [
          '<a href="https://khub.net/documents/135939561/405676950/Increased+Household+Transmission+of+COVID-19+Cases+-+national+case+study.pdf/7f7764fb-ecb0-da31-77b3-b1a8ef7be9aa" target=_blank>Increased household transmission of COVID-19 cases associated with SARS-CoV-2 Variant of Concern B.1.617.2: a national case- control study</a>',
          '<a href="https://www.fda.gov/media/145802/" target=_blank>Fact Sheet For Health Care Providers Emergency Use Authorization (Eua) Of Bamlanivimab And Etesevimab 05142021</a>',
          '<a href="https://www.fda.gov/media/145611/" target=_blank>Regeneron EUA HCP Fact Sheet 06032021</a>',
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>Transmission, infectivity, and antibody neutralization of an emerging SARS-CoV-2 variant in California carrying a L452R spike protein mutation</a>',
        ]
      },
      'AY.3': {
        'VoC name': 'AY.3',
        'PANGO lineage': '<a href="" target=_blank>AY.3</a>',
        'NextStrain lineage': '21A(Delta)',
        'WHO name': 'Delta',
        'Other synonyms': 'B.1.617.2.3',
        'Emergence location': 'USA',
        'Emergence date': 'April 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, E156G, F157-, R158-, L452R, T478K, D614G, P681R, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A488S, nsp3:P1228L, nsp3:P1469S, nsp4:V167L, nsp4:T492I, nsp6:T77A, nsp6:I162V, nsp12:P323L, nsp12:G671S, nsp13:P77L, nsp14:A394V, ORF3a:S26L, M:I82T, ORF7a:V82A, ORF7a:T120I, ORF7b:T40I, N:D63G, N:R203M, N:G215C, N:D377Y',
        'Impact': 'Increased transmissibility; may have reduced neutralization by some monoclonal & polyclonal antibodies',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ358404&decorator=corona&context=1628092432515" target=_blank>SARS-CoV-2/human/USA/OK-CDC-2-4451083/2021</a>',
        'GISAID representative strain': '',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.07.19.21260808v2" target=_blank>Delta variants of SARS-CoV-2 cause significantly increased vaccine breakthrough COVID-19 cases in Houston, Texas</a>',
        ]
      },
      'AY.3.1': {
        'VoC name': 'AY.3.1',
        'PANGO lineage': '<a href="" target=_blank>AY.3.1</a>',
        'NextStrain lineage': '21A(Delta)',
        'WHO name': 'Delta',
        'Other synonyms': 'B.1.617.2.3.1',
        'Emergence location': 'USA',
        'Emergence date': 'May 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, V70F, F157-, R158-, A222V, K417N, L452R, T478K, D614G, P681R, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:D309Y, nsp3:A488S, nsp3:P1228L, nsp3:P1469S, nsp4:V167L, nsp4:T492I, nsp6:T77A, nsp6:I162V, nsp12:P323L, nsp12:G671S, nsp13:P77L, nsp14:H26Y, nsp14:A394V, ORF3a:S26L, M:I82T, ORF7a:V82A, ORF7a:T120I, ORF7b:T40I, N:D63G, N:R203M, N:G215C, N:D377Y',
        'Impact': 'Increased transmissibility; may have reduced neutralization by some monoclonal & polyclonal antibodies',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ505747&decorator=corona&context=1628092001989" target=_blank>SARS-CoV-2/human/USA/LA-BIE-LSUH000936/2021</a>',
        'GISAID representative strain': '',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/147" target=_blank>A new sub-lineage of AY.3 concentrated in Mississippi, USA</a>',
        ]
      },
      'P.1': {
        'VoC name': 'P.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.28.html" target=_blank>P.1</a>',
        'NextStrain lineage': '20J(Gamma, V3)',
        'WHO name': 'Gamma',
        'Other synonyms': '20J/501Y.V3, VOC-20JAN02, B.1.1.248, Brazilian variant',
        'Emergence location': 'Brazil',
        'Emergence date': 'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L18F**, T20N, P26S, D138Y, R190S, K417T**, E484K**, N501Y**, D614G**, H655Y, T1027I, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: S370L, K977Q; nsp4: S184N; 3C-like proteinase: A260V; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: E341D; ORF3a protein: S253P; ORF8 protein: E92K; nucleocapsid phosphoprotein: P80R, R203K, G204R',
        'Impact': 'Increased transmissibility; E484K appears to result in loss of serum antibody neutralization; K417 is also found in RBD and may contribute to loss of serum antibody neutralization',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW642248&decorator=corona_ncov&context=1625158146181" target=_blank>SARS-CoV-2/human/ITA/ABR-IZSGC-TE30939/2021</a>',
        'GISAID representative strain': 'hCoV-19/Brazil/AM-991/2020|EPI_ISL_833171|2020-12-17',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.03.21252706v3" target=_blank>Mendes Coutinho et al.</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/spike-e484k-mutation-in-the-first-sars-cov-2-reinfection-case-confirmed-in-brazil-2020/584" target=_blank>Resende et al. 2021</a>'
        ]
      },
      'B.1.427': {
        'VoI name': 'B.1.427',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.427.html" target=_blank>B.1.427</a>',
        'NextStrain lineage': '21C(Epsilon)',
        'WHO name': 'Epsilon',
        'Other synonyms': '20C/S:452R, CAL.20C ',
        'Emergence location': 'Southern California, USA',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp4: S395T; nsp12: P323L; nsp13: P53L, D260Y; ORF3: Q57H; ORF8: A65V; nucleocapsid phosphoprotein: T205I',
        'Impact': 'increased transmissibility (https://doi.org/10.1101/2021.03.07.21252647); deacreased neutralization by some monoclonal antibodies; decreased neutralization by polyclonal anibodies (https://doi.org/10.1101/2021.03.07.21252647)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW795899&decorator=corona_ncov&context=1625158364610" target=_blank>SARS-CoV-2/human/USA/UT-UPHL-2103140561/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/CA-CDPH-UC1551/2020|EPI_ISL_984563|2020-11-07',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>https://doi.org/10.1101/2021.03.07.21252647</a>'
        ]
      },
      'B.1.429': {
        'VoI name': 'B.1.429',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.429.html" target=_blank>B.1.429</a>',
        'NextStrain lineage': '21C(Epsilon)',
        'WHO name': 'Epsilon',
        'Other synonyms': '20C/S:452R, CAL.20C',
        'Emergence location': 'Southern California, USA',
        'Emergence date': 'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp9: I65V; RNA-dependent RNA polymerase: P323L; helicase: D260Y; ORF3a: Q57H; nucleocapsid phosphoprotein: T205I',
        'Impact': 'increased transmissibility (https://doi.org/10.1101/2021.03.07.21252647); deacreased neutralization by some monoclonal antibodies; decreased neutralization by polyclonal anibodies (https://doi.org/10.1101/2021.03.07.21252647)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW907092&decorator=corona_ncov&context=1625158521949" target=_blank>SARS-CoV-2/human/USA/OH-UHTL-431/2021</a>',
        'GISAID representative strain': 'hCoV19/USA/CACZB12956/2020|EPI_ISL_672374|20201005',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>https://doi.org/10.1101/2021.03.07.21252647</a>',
          '<a href="https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2" target=_blank>Wikipedia CoV-2 Variants</a>',
          '<a href="https://www.medrxiv.org/content/10.1101/2021.01.18.21249786v1" target=_blank>Zhang et al. 2021</a>'
        ]
      },
      'B.1.525': {
        'VoI name': 'B.1.525',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.525.html" target=_blank>B.1.525</a>',
        'NextStrain lineage': '21D(Eta)',
        'WHO name': 'Eta',
        'Other synonyms': 'VUI-21FEB03, 20A/S:484K',
        'Emergence location': 'Multiple',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'Q52R, E484K, D614G, Q677H, F888L',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1189I; nsp6:S106-, G107-, F108-; NSP12:P323F; E:L21F; M:I82T; N:A12G, T205I',
        'Impact': 'Potential decreased neutralization by monoclonal and polyclonal antibodies. International lineage with E484K, del69-70 among other defining mutations.',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW941945&decorator=corona_ncov&context=1625158781590" target=_blank>SARS-CoV-2/human/USA/GA-CDC-STM-000019151/2021</a>',
        'GISAID representative strain': 'hCoV-19/England/CAMC-C769B3/2020|EPI_ISL_760883|2020-12-15',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v2" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic<a>'
        ]
      },
      'B.1.526': {
        'VoI name': 'B.1.526',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.html" target=_blank>B.1.526</a>',
        'NextStrain lineage': '21F(Iota)',
        'WHO name': 'Iota',
        'Other synonyms': '20C/S:484K, NY variant',
        'Emergence location': 'USA',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, E484K*, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I; N:P199L, M234I',
        'Impact': 'Minimal decrease in neutralization by monoclonal and polyclonal antibodies (https://www.biorxiv.org/content/10.1101/2021.03.24.436620v1)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW943279&decorator=corona_ncov&context=1625158921723" target=_blank>SARS-CoV-2/human/USA/CT-CDC-STM-000025966/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NY-NP-3840/2020|EPI_ISL_1080798|2020-12',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.02.14.431043v2#:~:text=1.526)%20are%20L5F%2C%20T95I%2C,New%20York%20during%20February%202021." target=_blank>ref</a>'
        ]
      },
      'B.1.617.1': {
        'VoI name': 'B.1.617.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.1.html" target=_blank>B.1.617.1</a>',
        'NextStrain lineage': '21B(Kappa)',
        'WHO name': 'Kappa',
        'Other synonyms': '20A/S:154K, B.1.617, VUI-21APR01',
        'Emergence location': 'India',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E154K, L452R, E484Q, D614G, P681R, Q1071H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1429N; nsp6:T77A; nsp12:P323L; nsp13:M429I; nsp15:K259R; ORF3a:S26L; ORF7a:V82A; N:R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW943960&decorator=corona_ncov&context=1625438339248" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-000028344/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/OH-CDC-ASC210016576/2021, EPI_ISL_1491819',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.617.3': {
        'VoI name': 'B.1.617.3',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.3.html" target=_blank>B.1.617.3</a>',
        'NextStrain lineage': '20A',
        'WHO name': '-',
        'Other synonyms': 'B.1.617',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, E484Q, D614G, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A1526V, T1830I; nsp5:A194S; nsp6:A117V; nsp12:P323L; ORF7a:V82A; ORF8:T26I; N:P67S, R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/MZ359842" target=_blank>SARS-CoV-2/human/IND/GBRC709/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/CA-Stanford-15_S42/2021, EPI_ISL_1701680',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
    }
  });
});
