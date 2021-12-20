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
        options: ['Lineages', 'B.1.1.7', 'B.1.351', 'P.1', 'B.1.617.2', 'BA.1', 'BA.2', 'B.1.621', 'C.37', 'B.1.1.318', 'B.1.1.519', 'B.1.1.523', 'B.1.214.2', 'B.1.427/B.1.429', 'B.1.466.2', 'B.1.525', 'B.1.526', 'B.1.617.1', 'B.1.617.3', 'B.1.619/B.1.619.1', 'B.1.620', 'C.1.2', 'C.36.3/C.36.3.1', 'P.2', 'R.1'].map((el) => { return { 'label': el, 'value': el } }),
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
        'Lineage': 'B.1.1.7',
        'WHO name': 'Alpha',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7 + Q.* lineages</a>',
        'NextStrain lineage': '20I (Alpha, V1)',
        'Emergence location': 'United Kingdom',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'H69-**, V70-**, N501Y**, A570D, D614G**, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T183I, A890D, I1412T; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: K460R; ORF8: Q27stop',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW633953&decorator=corona&context=1620187400922" target=_blank>SARS-CoV-2/human/USA/CA-CDC-STM-000008272/2021</a>',
        'Relevant publications': [
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>Virological.org</a>'
        ]
      },
      'B.1.351': {
        'Lineage': 'B.1.351',
        'WHO name': 'Beta',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351 + B.1.351.* lineages</a>',
        'NextStrain lineage': '20H (Beta, V2)',
        'Emergence location': 'South Africa',
        'Emergence date': 'May 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': '(L18F*)**, D80A, D215G, L242-, A243-, L244-, (R246I*), K417N**, E484K**, N501Y**, D614G**, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp3: K837N, A1775V; 3C-like proteinase: K90R; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: T588I; ORF3a: Q57H; S171L; envelope protein: P71L; nucleocapsid phosphoprotein: T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW598413&decorator=corona&context=1619463700327" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-TRA-186/2021</a>',
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
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/lineages/lineage_B.1.1.28.html" target=_blank>P.1 + P.1.* lineages</a>',
        'NextStrain lineage': '20J (Gamma, V3)',
        'Emergence location': 'Brazil',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L18F**, T20N, P26S, D138Y, R190S, K417T**, E484K**, N501Y**, D614G**, H655Y, T1027I, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: S370L, K977Q; nsp4: S184N; 3C-like proteinase: A260V; nsp6: S106-, G107-, F108-; RNA-dependent RNA polymerase: P323L; helicase: E341D; ORF3a protein: S253P; ORF8 protein: E92K; nucleocapsid phosphoprotein: P80R, R203K, G204R',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW642250&decorator=corona" target=_blank>SARS-CoV-2/human/ITA/ABR-IZSGC-TE30968/2021|gb|QRX39425</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.03.21252706v3" target=_blank>Mendes Coutinho et al.</a>',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>CDC Emerging Variants</a>',
          '<a href="https://virological.org/t/spike-e484k-mutation-in-the-first-sars-cov-2-reinfection-case-confirmed-in-brazil-2020/584" target=_blank>Resende et al. 2021</a>'
        ]
      },
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
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ009823&decorator=corona_ncov&context=1631918231229" target=_blank>SARS-CoV-2/human/USA/IN-CDC-STM-000049216/2021</a>',
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
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/OL672836" target=_blank>Severe acute respiratory syndrome coronavirus 2 isolate SARS-CoV-2/human/BEL/rega-20174/2021</a>',
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
        'ViPR representative strain link': 'N/A',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/361" target=_blank>https://github.com/cov-lineages/pango-designation/issues/361</a>',
        ]
      },
      'BA.3': {
        'Lineage': 'BA.3',
        'WHO name': 'Omicron',
        'WHO classification': 'VOC',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_BA.3.html" target=_blank>BA.3</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Southern Africa',
        'Emergence date': 'November 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'A67V, H69del, V70del, T95I, G142D, V143del, Y144del, Y145del, N211del, L212I, G339D, S371F, S373P, S375F, D405N, K417N, N440K, G446S, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R; nsp3: G489S; nsp: T327I, T492I; nsp5: P132H; nsp6: A88V, S106del, G107del, F108del; nsp12: P323L; nsp14: I42V; ORF3a: T223I; E: T9I; M: A63T; M: Q19E; N: P13L, E31del, R32del, S33del, R203K, G204R, S413R',
        'ViPR representative strain link': 'N/A',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/367" target=_blank>https://github.com/cov-lineages/pango-designation/issues/367</a>',
        ]
      },
      'B.1.621': {
        'Lineage': 'B.1.621 + B.1.621.* lineages',
        'WHO name': 'Mu',
        'WHO classification': 'VOI',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.621.html" target=_blank>B.1.621 + B.1.621.* lineages</a>',
        'NextStrain lineage': '21H (Mu)',
        'Emergence location': 'Colombia',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T95I, Y144S, Y145N, ins145N, R346K, E484K, N501Y, D614G, P681H, D950N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: T237A, T720I; nsp4: T492I; nsp6: Q160R; nsp12: P323L; nsp13: P419S; ORF3a: Q57H, V256I; ORF8: P38S, T11K, S67F; N:T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OK005482&decorator=corona_ncov&context=1631641924705" target=_blank>SARS-CoV-2/human/USA/FL-CDC-ASC210274672/2021</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.09.06.459005v1" target=_blank>Ineffective neutralization of the SARS-CoV-2 Mu variant by convalescent and vaccine sera</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8364171/" target=_blank>Characterization of the emerging B.1.621 variant of interest of SARS-CoV-2</a>',
          '<a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8426698/" target=_blank>A cluster of the new SARS‐CoV‐2 B.1.621 lineage in Italy and sensitivity of the viral isolate to the BNT162b2 vaccine</a>',
        ]
      },
      'C.37': {
        'Lineage': 'C.37 + C.37.1',
        'WHO name': 'Lambda',
        'WHO classification': 'VOI',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.37.html" target=_blank>C.37 + C.37.1</a>',
        'NextStrain lineage': '21G (Lambda)',
        'Emergence location': 'Peru',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'G75V, T76I, R246N, S247-, Y248-, L249-, T250-, P251-, G252-, D253-, L452Q, F490S, D614G, T859N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P1469S, F1569V; nsp4:L438P, T492I; nsp12:P323L; ORF9b:P10S; N:P13L, G214C',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW850639&decorator=corona_ncov&context=1631641802152" target=_blank>SARS-CoV-2/human/USA/VA-DCLS-3388/2021</a>',
        'Relevant publications': [
          '<a href="https://virological.org/t/novel-sublineage-within-b-1-1-1-currently-expanding-in-peru-and-chile-with-a-convergent-deletion-in-the-orf1a-gene-3675-3677-and-a-novel-deletion-in-the-spike-gene-246-252-g75v-t76i-l452q-f490s-t859n/685" target=_blank>Novel sublineage within B.1.1.1 currently expanding in Peru and Chile, with a convergent deletion in the ORF1a gene (Δ3675-3677) and a novel deletion in the Spike gene (Δ246-252, G75V, T76I, L452Q, F490S, T859N)</a>',
          '<a href="https://www.medrxiv.org/content/10.1101/2021.07.21.21260961v1" target=_blank>Reduced neutralizing activity of post-SARS-CoV-2 vaccination serum against variants B.1.617.2, B.1.351, B.1.1.7+E484K and a sub-variant of C.37</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2021.07.02.450959v1" target=_blank>SARS-CoV-2 Lambda Variant Remains Susceptible to Neutralization by mRNA Vaccine-elicited Antibodies and Convalescent Serum</a>',

        ]
      },
      'B.1.1.318': {
        'Lineage': 'B.1.1.318',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.318.html" target=_blank>B.1.1.318</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'England',
        'Emergence date': 'February 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T95I, del144*, E484K, P681H, D796H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:E378V, nsp3K1693N, nsp4:T173I, nsp4:A446V, nsp5:T21I, nsp6:del106-108, nsp15:V320M, M:I82T, ORF8:M1-,K2-,F3-, E106, N:A208G, R209-',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/2017803574" target=_blank>SARS-CoV-2/human/USA/MD-MDH-1369/2021</a>',
        'Relevant publications': [
          '<a href="https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/972247/Variants_of_Concern_VOC_Technical_Briefing_7_England.pdf" target=_blank>SARS-CoV-2 variants of concern and variants under investigation in England</a>',
        ]
      },
      'B.1.1.519': {
        'Lineage': 'B.1.1.519',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.519.html" target=_blank>B.1.1.519</a>',
        'NextStrain lineage': '20B/S:732A',
        'Emergence location': 'Mexico',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'T478K, D614G, P681H, T732A ',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:P141S, nsp4:T492I, nspP6:I49V, nsp9:T35I, nsp12:P323L, N: R203K,G204R ',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW644499&decorator=corona&context=1619414300344" target=_blank>SARS-CoV-2/human/USA/MD-MDH-0958/2021</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v1" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic</a>',
        ]
      },
      'B.1.1.523': {
        'Lineage': 'B.1.1.523',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.1.523.html" target=_blank>B.1.1.523</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Multiple',
        'Emergence date': 'August 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'F306L, E484K, S494P, D614G, E780A, D839V, T1027I ',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:N269D, nsp3:M84V, nsp3:R1297I, nsp5:V303I, nsp6:V84F, nsp10:T111I, nsp12:S229N, nsp12:P323L, nsp13:P77L, ORF3a: S171L, V201F ; M:I82T ; N:R203K, G204R, G212C',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OU429148&decorator=corona_ncov&context=1632979238640" target=_blank>Severe acute respiratory syndrome coronavirus 2 genome assembly, chromosome: 1</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.09.16.460616v1" target=_blank>A novel B.1.1.523 SARS-CoV-2 variant that combines many spike mutations linked to immune evasion with current variants of concern</a>',
        ]
      },
      'B.1.214.2': {
        'Lineage': 'B.1.214.2',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.214.2.html" target=_blank>B.1.214.2</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Belgium',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'ins214TDR, Q414K, N450K, D614G, T716I',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3 I580V, nsp3 T1063I, nsp6 F106-108del, nsp8 A74V, nsp10 T51I, nsp12 P323L, nsp12 R583G; ORF3a: 19-28 del, G172C; N:D3L:T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OU176142&decorator=corona_ncov&context=1632979664781" target=_blank>Severe acute respiratory syndrome coronavirus 2 isolate hCoV-19/Switzerland/BL-ETHZ-521059/2020 genome assembly, chromosome: 1</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.04.17.440288v3" target=_blank>Emergence of a recurrent insertion in the N-terminal domain of the SARS-CoV-2 spike glycoprotein</a>',
          '<a href="https://www.clinicalmicrobiologyandinfection.com/article/S1198-743X(21)00497-3/fulltext" target=_blank>Monitoring the SARS-CoV-2 pandemic: screening algorithm with single nucleotide polymorphism detection for the rapid identification of established and emerging variants</a>',
        ]
      },
      'B.1.427/B.1.429': {
        'Lineage': 'B.1.427/B.1.429',
        'WHO name': 'Epsilon',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.427.html" target=_blank>B.1.427</a>',
        'NextStrain lineage': '20C/S:452R',
        'Emergence location': 'USA',
        'Emergence date': 'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S13I, W152C,  L452R, D614G**',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T85I; nsp4: S395T; nsp12: P323L; nsp13: P53L, D260Y; ORF3: Q57H; ORF8: A65V; N: T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW643426&decorator=corona&context=1620187705467" target=_blank>SARS-CoV-2/human/USA/TN-CDC-LC0012874/2021</a>',
        'Relevant publications': [
          '<a href="https://doi.org/10.1101/2021.03.07.21252647" target=_blank>Transmission, infectivity, and antibody neutralization of an emerging SARS-CoV-2 variant in California carrying a L452R spike protein mutation</a>',
        ]
      },
      'B.1.466.2': {
        'Lineage': 'B.1.466.2',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.466.2.html" target=_blank>B.1.466.2</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Indonesia',
        'Emergence date': 'August 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'N439K, D614G, P681R',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: Q203H, T350I, P822L: nsp6:L75F, nsp12:P323L, nsp13:S259L; ORF3a:Q57H, N:T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ006524&decorator=corona_ncov&context=1632979880928" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-000047642/2021</a>',
        'Relevant publications': [
          '<a href="https://journals.asm.org/doi/10.1128/MRA.00657-21" target=_blank>Near-Complete Genome Sequences of Nine SARS-CoV-2 Strains Harboring the D614G Mutation in Malaysia</a>',
          '<a href="https://www.biorxiv.org/content/10.1101/2021.07.06.451270v3" target=_blank>Genome Profiling of SARS-CoV-2 in Indonesia, ASEAN, and the Neighbouring East Asian Countries: Features, Challenges, and Achievements</a>',
        ]
      },
      'B.1.525': {
        'Lineage': 'B.1.525',
        'WHO name': 'Eta',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.525.html" target=_blank>B.1.525</a>',
        'NextStrain lineage': '21D (Eta)',
        'Emergence location': 'Multiple',
        'Emergence date': 'December 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'Q52R, E484K, D614G, Q677H, F888L',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1189I; nsp6:S106-, G107-, F108-; NSP12:P323F; E:L21F; M:I82T; N:A12G, T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW560924&decorator=corona" target=_blank>SARS-CoV-2/human/USA/CA-LACPHL-AF00280/2021</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.02.08.21251393v2" target=_blank>A SARS-CoV-2 lineage A variant (A.23.1) with altered spike has emerged and is dominating the current Uganda epidemic<a>'
        ]
      },
      'B.1.526': {
        'Lineage': 'B.1.526',
        'WHO name': 'Iota',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.526.html" target=_blank>B.1.526</a>',
        'NextStrain lineage': '21F (Iota)',
        'Emergence location': 'USA',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'L5F, T95I, D253G, E484K*, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2:T85I, nsp4:L438P, NSP6:S106-, G107del, F108-, NSP12:P323L, NSP13:Q88H, ORF3a:Q57H, P42L; ORF8:T11I; N:P199L, M234I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW643362&decorator=corona_ncov&context=1620190342288" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-LC0012204/2021</a>',
        'Relevant publications': [
          '<a href="https://www.biorxiv.org/content/10.1101/2021.02.14.431043v2#:~:text=1.526)%20are%20L5F%2C%20T95I%2C,New%20York%20during%20February%202021." target=_blank>ref</a>'
        ]
      },
      'B.1.617.1': {
        'Lineage': 'B.1.617.1',
        'WHO name': 'Kappa',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.617.1.html" target=_blank>B.1.617.1</a>',
        'NextStrain lineage': '21B (Kappa)',
        'Emergence location': 'India',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E154K, L452R, E484Q, D614G, P681R, Q1071H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3:T1429N; nsp6:T77A; nsp12:P323L; nsp13:M429I; nsp15:K259R; ORF3a:S26L; ORF7a:V82A; N:R203M, D377Y',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW966601&decorator=corona_ncov&context=1631641506998" target=_blank>SARS-CoV-2/human/USA/NJ-CDC-ASC210006113/2021</a>',
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
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MZ779752&decorator=corona_ncov&context=1631641696336" target=_blank>SARS-CoV-2/human/USA/NH-CDC-2-3998369/2021</a>',
        'Relevant publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/49" target=_blank>https://github.com/cov-lineages/pango-designation/issues/49</a>',
        ]
      },
      'B.1.619/B.1.619.1': {
        'Lineage': 'B.1.619 / B.1.619.1',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.619.html" target=_blank>B.1.619</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Multiple',
        'Emergence date': 'May 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'I210T, N440K, E484K, D614G, D936N, S939F, T1027I',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: A1305V, nsp3: E1789K, nsp6: F106-108del, nsp6: M183I, nsp12: P323L; M:I82T; ORF7a:E22D; N:P13L, S201I, T205I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OU185146&decorator=corona_ncov&context=1632982693787" target=_blank>UNKNOWN-OU185146 </a>',
        'Relevant publications': [
          '---'
        ]
      },
      'B.1.620': {
        'Lineage': 'B.1.620',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_B.1.620.html" target=_blank>B.1.620</a>',
        'NextStrain lineage': '20A/S:126A',
        'Emergence location': 'Multiple',
        'Emergence date': 'November 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'P26S, H69del, V70del, V126A, Y144del, L242del, A243del,L244del, H245Y, S477N, E484K, D614G, P681H, T1027I, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp2: T223I, nsp3: V1173I, nsp6: S106del G107del, F108del, nsp12: P323L, nsp13: A292S, NS7b:L14del, N:A220V',
        'ViPR representative strain link': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/MZ385585.1" target=_blank>SARS-CoV-2/human/USA/WA-CDC-4139020-001/2021</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.05.04.21256637v1" target=_blank>https://www.medrxiv.org/content/10.1101/2021.05.04.21256637v1</a>',
        ]
      },
      'C.1.2': {
        'Lineage': 'C.1.2',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.1.2.html" target=_blank>C.1.2</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'South Africa',
        'Emergence date': 'May 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'P9L, C136F, Y144del, R190S, D215G, Y449H, E484K, N501Y, D614G, H655Y, N679K, T716I, T859N',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: E102K; nsp3: T428I, T819I; nsp5: G15S; nsp6: S106del, G107del, F108del, nsp12: P323L; ORF3a:V255del, E: L21I, M:I82T, N:P13L, R203K, G204R, Q384H',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OU407527&decorator=corona_ncov&context=1632980151859" target=_blank>Severe acute respiratory syndrome coronavirus 2 isolate hCoV-19/Switzerland/VD-CHUV-GEN5512/2021 genome assembly, chromosome: 1</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.08.20.21262342v3" target=_blank>https://www.medrxiv.org/content/10.1101/2021.08.20.21262342v3</a>',
        ]
      },
      'C.36.3/C.36.3.1': {
        'Lineage': 'C.36.3 + C.36.3.1',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_C.36.3.html" target=_blank>C.36.3</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Multiple',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'S12F, H69del, V70del, W152R, R346S, L452R, D614G, Q677H, A899S',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: E102K; nsp3: A41V, T428I, D821N, P1469S; nsp4: D217N, D459N; nsp5: G15S; nsp6: S118L, L122S; nsp8: T148I; nsp12: P323L; nsp13: D105Y; M: I82T; ORF7b: A43S; N: R203K, G204R, G212V',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=OU359644&decorator=corona_ncov&context=1632982024122" target=_blank>Severe acute respiratory syndrome coronavirus 2 genome assembly, chromosome: 1.</a>',
        'Relevant publications': [
          '---'
        ]
      },
      'P.2': {
        'Lineage': 'P.2',
        'WHO name': '---',
        'WHO classification': '---',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_P.2.html" target=_blank>P.2</a>',
        'NextStrain lineage': '20J',
        'Emergence location': 'Brazil',
        'Emergence date': 'January 2021',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'E484K, D614G, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp7: L71F; nsp12: P323L; N: A119S, R203K, G204R, M234I',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW523796&decorator=corona&context=1617986992485" target=_blank>SARS-CoV-2/human/USA/CA-QDX-4247/2021</a>',
        'Relevant publications': [
          '<a href="https://virological.org/t/genomic-characterisation-of-an-emergent-sars-cov-2-lineage-in-manaus-preliminary-findings/586" target=_blank>https://virological.org/t/genomic-characterisation-of-an-emergent-sars-cov-2-lineage-in-manaus-preliminary-findings/586</a>',
        ]
      },
      'R.1': {
        'Lineage': 'R.1',
        'WHO name': '---',
        'WHO classification': 'VUM',
        'PANGO lineage': '<a href="https://cov-lineages.org/global_report_R.1.html" target=_blank>R.1</a>',
        'NextStrain lineage': '---',
        'Emergence location': 'Multiple',
        'Emergence date': 'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1: Spike': 'W152L, E484K, D614G, G769V',
        'Amino acid substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp12:P323L; nsp13:G439R; nsp14:P412H; M:F28L; N:S187L, R203K, G204R, Q418H',
        'ViPR representative strain link': '<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW598432&decorator=corona" target=_blank>SARS-CoV-2/human/GHA/nmimr-SARS-CoV-2-NTRA-15381/2020</a>',
        'Relevant publications': [
          '<a href="https://www.medrxiv.org/content/10.1101/2021.03.16.21253248v1.full-text" target=_blank>https://www.medrxiv.org/content/10.1101/2021.03.16.21253248v1.full-text</a>',
          '<a href="https://www.cdc.gov/mmwr/volumes/70/wr/mm7017e2.htm" target=_blank>https://www.cdc.gov/mmwr/volumes/70/wr/mm7017e2.htm</a>',
        ]
      },
    }
  });
});
