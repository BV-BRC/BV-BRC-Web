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
        options: ['', 'B.1.1.7', 'B.1.351', 'B.1.427', 'B.1.429', 'P.1'].map((el) => { return { 'label': el, 'value': el } }),
        style: 'width: 200px; margin: 5px 0'
      });
      this.select_lineage = select_lineage;

      var self = this;
      select_lineage.on('change', function (value) {
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
        innerHTML: 'Select Lineage of Concern (LoC): '
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
      }
    }
  });
});
