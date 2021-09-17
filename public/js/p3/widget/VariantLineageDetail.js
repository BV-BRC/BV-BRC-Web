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
        options: ['Lineage of Concern', 'B.1.1.7', 'B.1.351', 'P.1', 'B.1.617.2',
          'Lineage of Interest', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.3', 'C.37', 'B.1.621'].map((el) => { return { 'label': el, 'value': el } }),
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
        'WHO name': 'Alpha',
        'LoC name': 'B.1.1.7 + Q.* lineage',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7 + Q.* lineage</a>',
        'NextStrain lineage': '20I (Alpha, V1)',
        'Other synonyms': '20I/501Y.V1, VOC 202012/01, UK variant',
        'Emergence location': 'United Kingdom',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'H69-**, V70-**, N501Y**, A570D, D614G**, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T183I, A890D, I1412T; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: K460R; ORF8: Q27stop',
        'Impact': 'Increased transmissibility; S gene target failure (SGTF); increased severity (https://www.nature.com/articles/s41586-021-03426-1); little impact on neutralization by moclonal antibodies (https://www.fda.gov/media/145802/download); litte impact on neautralization by polyclonal antibodies (Wang P, Nair MS, Liu L, et al. Antibody Resistance of SARS-CoV-2 Variants B.1.351 and B.1.1.7. BioXRiv 2021. doi: https://doi.org/10.1101/2021.01.25.428137 Shen X, Tang H, McDanal C, et al. SARS-CoV-2 variant B.1.1.7 is susceptible to neutralizing antibodies elicited by ancestral Spike vaccines. BioRxiv 2021.  doi:  https://doi.org/10.1101/2021.01.27.428516',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW633953&decorator=corona&context=1620187400922" target=_blank>SARS-CoV-2/human/USA/CA-CDC-STM-000008272/2021</a>',
        'GISAID representative strain': 'hCoV-19/England/MILK-ACF9CC/2020|EPI_ISL_629440|2020-10-22',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>Virological.org</a>'
        ]
      },
      'B.1.351': {
        'WHO name': 'Beta',
        'LoC name': 'B.1.351, B.1.351.2, B.1.351.3',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351, B.1.351.2, B.1.351.3</a>',
        'NextStrain lineage': '20H (Beta, V2)',
        'Other synonyms': '20H/501Y.V2, South African variant',
        'Emergence location': 'South Africa',
        'Emergence date': 'May 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': '(L18F*)**, D80A, D215G, L242-, A243-, L244-, (R246I*), K417N**, E484K**, N501Y**, D614G**, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp3: K837N, A1775V; 3C-like proteinase: K90R; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: T588I; ORF3a: Q57H; S171L; envelope protein: P71L; nucleocapsid phosphoprotein: T205I',
        'Impact': 'Increased transmissibility (Pearson CAB, Russell TW, Davies NG, et al. Estimates of severity and transmissibility of novel South Africa SARS-CoV-2 variant 501Y.V2); E484K appears to result in loss of serum antibody neutralization; K417 is also found in RBD and may contribute to loss of serum antibody neutralization',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW598413&decorator=corona&context=1619463700327" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-TRA-186/2021</a>',
        'GISAID representative strain': 'hCoV-19/Belgium/UZA-UA-CV2009498880/2021|EPI_ISL_1120737|2021-02-20',
        'SOP': '<a href="/patric/pdf/sequence_variants_sop_20210212.pdf" target=_blank>Sequence variations calculation descriptions</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2020.12.21.20248640v1" target=_blank>Tegally et al. 2020</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2020.12.31.425021v1" target=_blank>Greaney et al. 2021</a>',
          '<a href="https://elifesciences.org/articles/61312" target=_blank>Weisblum et al. 2020</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank">CDC Emerging Variants</a>'
        ]
      },
      'P.1': {
        'WHO name': 'Gamma',
        'LoC name': 'P.1 + P.1.* lineages',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.28.html" target=_blank>P.1 + P.1.* lineages</a>',
        'NextStrain lineage': '20J (Gamma, V3)',
        'Other synonyms': '20J/501Y.V3, Brazilian variant, B.1.1.28.1, B.1.1.248',
        'Emergence location': 'Brazil',
        'Emergence date': 'November 2020',
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
      'B.1.617.2': {
        'WHO name': 'Delta',
        'LoC name': 'B.1.617.2 + AY.* lineages',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.2.html" target=_blank>B.1.617.2</a>',
        'NextStrain lineage': '21A (Delta)',
        'Other synonyms': '20A/S:478K, B.1.617',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, T478K, D614G, P681R,  D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S; nsp12:P323L, G671S; nsp13:P77L; ORF3a:S26L; M:I82T; ORF7a:V82A, T120I; N:D63G, R203M, D377Y',
        'Impact': 'Predominantly India lineage with several spike mutations, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/vipr_genome_search.spg?method=doQuickTextSearch&decorator=corona_ncov&pageTo=1&selectionContext=1631918231229" target=_blank>SARS-CoV-2/human/USA/IN-CDC-STM-000049216/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NJ-CDC-LC0038223/2021, EPI_ISL_1611370',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.525': {
        'WHO name': 'Eta',
        'LoI name': 'B.1.525',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.525.html" target=_blank>B.1.525</a>',
        'NextStrain lineage': '21D (Eta)',
        'Other synonyms': '20A/S:484K',
        'Emergence location': 'Multiple',
        'Emergence date': 'December 2020',
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
        'WHO name': 'Iota',
        'LoI name': 'B.1.526',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.html" target=_blank>B.1.526</a>',
        'NextStrain lineage': '21F (Iota)',
        'Other synonyms': '20C/S:484K, NY variant',
        'Emergence location': 'USA',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, E484K*, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I; N:P199L, M234I',
        'Impact': 'Minimal decrease in neutralization by monoclonal and polyclonal antibodies (https://www.biorxiv.org/content/10.1101/2021.03.24.436620v1)',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW643362&decorator=corona_ncov&context=1620190342288" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-LC0012204/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/NY-NP-3840/2020|EPI_ISL_1080798|2020-12',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.02.14.431043v2#:~:text=1.526)%20are%20L5F%2C%20T95I%2C,New%20York%20during%20February%202021." target=_blank>ref</a>'
        ]
      },
      'B.1.617.1': {
        'WHO name': 'Kappa',
        'LoI name': 'B.1.617.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.1.html" target=_blank>B.1.617.1</a>',
        'NextStrain lineage': '21B (Kappa)',
        'Other synonyms': '20A/S:154K, B.1.617',
        'Emergence location': 'India',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E154K, L452R, E484Q, D614G, P681R, Q1071H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1429N; nsp6:T77A; nsp12:P323L; nsp13:M429I; nsp15:K259R; ORF3a:S26L; ORF7a:V82A; N:R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW966601&decorator=corona_ncov&context=1631641506998" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-ASC210006113/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/OH-CDC-ASC210016576/2021, EPI_ISL_1491819',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'B.1.617.3': {
        'WHO name': '-',
        'LoI name': 'B.1.617.3',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.3.html" target=_blank>B.1.617.3</a>',
        'NextStrain lineage': '-',
        'Other synonyms': 'B.1.617',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T19R, L452R, E484Q, D614G, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:A1526V, T1830I; nsp5:A194S; nsp6:A117V; nsp12:P323L; ORF7a:V82A; ORF8:T26I; N:P67S, R203M, D377Y',
        'Impact': 'Predominantly India lineage with 484Q, pango-designation issue #49',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ779752&decorator=corona_ncov&context=1631641696336" target=_blank>SARS-CoV-2/human/USA/NH-CDC-2-3998369/2021</a>',
        'GISAID representative strain': 'hCoV-19/USA/CA-Stanford-15_S42/2021, EPI_ISL_1701680',
        'Relevant publications': [
          'https://github.com/cov-lineages/pango-designation/issues/49'
        ]
      },
      'C.37': {
        'WHO name': 'Lambda',
        'LoI name': 'C.37 + C.37.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.37.html" target=_blank>C.37</a>',
        'NextStrain lineage': '21G (Lambda)',
        'Other synonyms': 'B.1.1.1.37',
        'Emergence location': 'Peru',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'G75V, T76I, R246N, S247-, Y248-, L249-, T250-, P251-, G252-, D253-, L452Q, F490S, D614G, T859N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S, F1569V; nsp4:L438P, T492I; nsp12:P323L; ORF9b:P10S; N:P13L, G214C',
        'Impact': 'Several deletions in spike protein- 2 escape mutations- sublineage may have S gene dropout',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW850639&decorator=corona_ncov&context=1631641802152" target=_blank>SARS-CoV-2/human/USA/VA-DCLS-3388/2021</a>',
        'GISAID representative strain': 'hCoV-19/Brazil/AM-991/2020|EPI_ISL_833171|2020-12-17',
        'Relevant publications': [
          '<a href="https://virological.org/t/novel-sublineage-within-b-1-1-1-currently-expanding-in-peru-and-chile-with-a-convergent-deletion-in-the-orf1a-gene-3675-3677-and-a-novel-deletion-in-the-spike-gene-246-252-g75v-t76i-l452q-f490s-t859n/685">https://virological.org/t/novel-sublineage-within-b-1-1-1-currently-expanding-in-peru-and-chile-with-a-convergent-deletion-in-the-orf1a-gene-3675-3677-and-a-novel-deletion-in-the-spike-gene-246-252-g75v-t76i-l452q-f490s-t859n/685</a>',
          '<a href="https://www.medrxiv.org/content/10.1101/2021.07.21.21260961v1">https://www.medrxiv.org/content/10.1101/2021.07.21.21260961v1</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2021.07.02.450959v1">https://www.biorxiv.org/content/10.1101/2021.07.02.450959v1</a>'
        ]
      },
      'B.1.621': {
        'WHO name': 'Lambda',
        'LoI name': 'B.1.621 + B.1.621.1',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.37.html" target=_blank>C.37</a>',
        'NextStrain lineage': '21H (Mu)',
        'Other synonyms': '-',
        'Emergence location': 'Colombia',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T95I, Y144S, Y145N, ins145N, R346K, E484K, N501Y, D614G, P681H, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T237A, T720I; nsp4: T492I; nsp6: Q160R; nsp12: P323L; nsp13: P419S; ORF3a: Q57H, V256I; ORF8: P38S, T11K, S67F; N:T205I',
        'Impact': 'Reduced sensitivity to neuthralizing antibodies',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OK005482&decorator=corona_ncov&context=1631641924705" target=_blank>SARS-CoV-2/human/USA/FL-CDC-ASC210274672/2021</a>',
        'GISAID representative strain': 'hCoV-19/Brazil/AM-991/2020|EPI_ISL_833171|2020-12-17',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.09.06.459005v1">https://www.biorxiv.org/content/10.1101/2021.09.06.459005v1</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8364171/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8364171/</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8426698/">https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8426698/</a>'
        ]
      },
    }
  });
});
