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
        options: ['Lineages', 'BA.1', 'BA.2', 'BA.2.12.1', 'BA.2.75', 'BA.3', 'BA.4', 'BA.5', 'BA.4.6', 'BQ.1.1', 'XBB', 'XBB.1', 'BF.7'].map((el) => { return { 'label': el, 'value': el } }),
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
      'BA.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.1 + BA.1.*',
        'NextStrain Lineage': '21K (Omicron)',
        'Emergence Location': 'Southern Africa',
        'Emergence Date': 'November 2021',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A67V, H69-, V70-, T95I, G142D, V143-, Y144-, Y145-, N211-, L212I, ins214EPE, G339D, S371L, S373P, S375F, K417N, N440K, G446S, S477N, T478K, E484A, Q493R, G496S, Q498R, N501Y, Y505H, T547K, D614G, H655Y, N679K, P681H, N764K, D796Y, N856K, Q954H, N969K, L981F',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp3: K38R, S1265-, L1266I, A1892T; nsp4: T492I; nsp5: P132H; nsp6: L105-, S106-, G107-, I189V; nsp12: P323L; nsp14: I42V; E: T9I; M: D3G, Q19E, A63T; N: P13L, E31-, R32-, S33-, R203K, G204R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.2862877" target=_blank>SARS-CoV-2/human/BEL/rega-20174/2021</a>',
        'Relevant Publications': [
          '<a href="https://www.ecdc.europa.eu/en/publications-data/covid-19-threat-assessment-spread-omicron-first-update" target=_blank>https://www.ecdc.europa.eu/en/publications-data/covid-19-threat-assessment-spread-omicron-first-update</a>',
          '<a href="https://cov-lineages.org/lineage.html?lineage=B.1.1.529" target=_blank>https://cov-lineages.org/lineage.html?lineage=B.1.1.529</a>'

        ]
      },
      'BA.2': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.2 + BA.2*',
        'NextStrain Lineage': '21L (Omicron)',
        'Emergence Location': 'Southern Africa',
        'Emergence Date': 'November 2021',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, G142D, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, nsp3:G489S; nsp4:L264F, T327I, L438F, T492I; nsp5:P132H; nsp6:-106-108; nsp12 P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF8:S84L; N:P13L, -31/33, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.4219032" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-77CPCCUR3/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/361" target=_blank>https://github.com/cov-lineages/pango-designation/issues/361</a>',
        ]
      },
      'BA.2.12.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.2.12.1',
        'NextStrain Lineage': '22C (Omicron)',
        'Emergence Location': 'Canada/USA',
        'Emergence Date': 'December 2021',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, G142D, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452Q, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, S704L, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, nsp3:G489S; nsp4:L264F, T327I, L438F, T492I; nsp5:P132H; nsp6:-106-108; nsp12 P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF8:S84L; N:P13L, -31/33, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.4570651" target=_blank>SARS-CoV-2/human/USA/NY-CDC-LC0553978/2022</a>',
        'Relevant Publications': []
      },
      'BA.2.75': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.2.75*',
        'NextStrain Lineage': '22D (Omicron)',
        'Emergence Location': 'India',
        'Emergence Date': 'June 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, G142D, K147E, W152R, F157L, I210V, V213G, G257S, G339H, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, G446S, N460K, S477N, T478K, E484A, R493Q, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R; nsp3: T24I, S403L, G489S, P822S; nsp4: L264F, T327I, L438F, T492I; nsp5: P132H; nsp6: S106-, G107-, F108-; nsp8: N118S; nsp12: P323L, G671S; nsp13: R392C; nsp14: I42V; nsp15: T112I; ORF3a:T223I; E:T9I, T11A; M:Q19E, A63T; ORF6:D61L; N:P13L, E31-, R32-, S33-, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/ON990685" target=_blank>SARS-CoV-2/human/USA/IL-CDC-STM-G6D8GUH6S/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/773" target=_blank>https://github.com/cov-lineages/pango-designation/issues/773</a>'
        ]
      },
      'BA.3': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.3',
        'NextStrain Lineage': '21K (Omicron)',
        'Emergence Location': 'Southern Africa',
        'Emergence Date': 'November 2021',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A67V, H69-, V70-, T95I, G142D, V143-, Y144-, Y145-, N211-, L212I, G339D, S371F, S373P, S375F, D405N, K417N, N440K, G446S, S477N, T478K, E484A, Q493R, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1: S135R; nsp3: T24I, G489S, nsp4: L264F, T327I, L438F, T492I: nsp5: P132H; nsp6: S106-, G107-, F108-; nsp12: P323L; nsp13: R392C; nsp14: I42V; nsp15: T112I; ORF3a: T223I; E: T9I; M: Q19E, A63T; N: P13L, E31-, R32-, S33-, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.3740221" target=_blank>UNKNOWN-OV494217</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/367" target=_blank>https://github.com/cov-lineages/pango-designation/issues/367</a>'
        ]
      },
      'BA.4': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.4*',
        'NextStrain Lineage': '22A (Omicron)',
        'Emergence Location': 'Southern Africa',
        'Emergence Date': 'January 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452R, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, G489S; nsp4:L264F, T327I, T492I; nsp5: P132H; nsp6:S106-, G107-, F108-; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF7b: L11F; N:P13L, E31-, R32-, S33-, P151S, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.ncbi.nlm.nih.gov/nuccore/ON373214" target=_blank>SARS-CoV-2/human/USA/PA-CDC-LC0583069/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/517" target=_blank>https://github.com/cov-lineages/pango-designation/issues/517</a>'
        ]
      },
      'BA.5': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.5*',
        'NextStrain Lineage': '22B (Omicron)',
        'Emergence Location': 'Southern Africa',
        'Emergence Date': 'January 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452R, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp2:Q376K; nsp3:T24I, G489S; nsp4:L264F, T327I, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:D3N, Q19E, A63T; N:P13L, E31-, R32-, S33-, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.4881887" target=_blank>SARS-CoV-2/human/USA/MI-CDC-ASC210848963/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/517" target=_blank>https://github.com/cov-lineages/pango-designation/issues/517</a>'
        ]
      },
      'BA.4.6': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BA.4.6',
        'NextStrain Lineage': '22A (Omicron)',
        'Emergence Location': 'USA',
        'Emergence Date': 'April 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, G142D, V213G, G339D, R346T, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452R, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N658S, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R, 141, 142-, 143-; nsp2:Q376K; nsp3:T24I, G489S; nsp4:L264F, T327I, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:Q19E, A63T; ORF6:D61L; ORF7b:L11F; ORF8:S84L; N:P13L, E31-, R32-, S33-, P151S, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.5789914" target=_blank>SARS-CoV-2/human/SouthAfrica/NHLS-UCT-LA-Z997/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/741" target=_blank>https://github.com/cov-lineages/pango-designation/issues/741</a>'
        ]
      },
      'BQ.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BQ.1',
        'NextStrain Lineage': '22E (Omicron)',
        'Emergence Location': 'Nigeria',
        'Emergence Date': 'July 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, V213G, G339D, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, K444TL452R, N460, KS477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp2:Q376K; nsp3:T24I, G489S; nsp4:L264F, T327I, T492I; nsp5: P132H; nsp6:S106-, G107-, F108-, L260F; nsp12:Y273H, P323L; nsp13: M233I, R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:D3N, Q19E, A63T; N:P13L, E31-, R32-, S33-, E136D, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.6548693" target=_blank>SARS-CoV-2/human/USA/MI-CDC-QDX40579621/202</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/993" target=_blank>https://github.com/cov-lineages/pango-designation/issues/993</a>'
        ]
      },
      'BQ.1.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BQ.1.1',
        'NextStrain Lineage': '22E (Omicron)',
        'Emergence Location': 'Nigeria',
        'Emergence Date': 'July 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, V213G, G339D, R346T, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, K444TL452R, N460K, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp2:Q376K; nsp3:T24I, G489S; nsp4:L264F, T327I, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-, L260F; nsp12:Y273H, P323L; nsp13:M233I, N268S, R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:D3N, Q19E, A63T; N:P13L, E31-, R32-, S33-, E136D, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.6552047" target=_blank>SARS-CoV-2/human/USA/IL-CDC-QDX40817824/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/993" target=_blank>https://github.com/cov-lineages/pango-designation/issues/993</a>'
        ]
      },
      'XBB': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'XBB',
        'NextStrain Lineage': '22F (Omicron)',
        'Emergence Location': 'USA/Singapore',
        'Emergence Date': 'August 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, V83A, G142D, Y144-, H146Q, Q183E, V213E, G339H, R346T, L368I, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, V445P, G446S, N460K, S477N, T478K, E484A, F486S, F490S, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:K47R, G82D, S135R; nsp3:T24I, G489S; nsp4:L264F, T327I, L438F, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-; nsp12:P323L, G671S; nsp13:S36P, R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I,T11A; M:Q19E, A63T; N:P13L, E31-, R32-, S33-, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.6687074" target=_blank>SARS-CoV-2/human/USA/MI-CDC-STM-C932986AR/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/1058" target=_blank>https://github.com/cov-lineages/pango-designation/issues/1058</a>'
        ]
      },
      'XBB.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'XBB.1',
        'NextStrain Lineage': '22F (Omicron)',
        'Emergence Location': 'USA/Singapore',
        'Emergence Date': 'September 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, V83A, G142D, Y144-, H146Q, Q183E, V213E, G252V, G339H, R346T, L368I, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, V445P, G446S, N460K, S477N, T478K, E484A, F486S, F490S, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:K47R, S135R; nsp3:T24I, G489S; nsp4:L264F, T327I, L438F, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-; nsp12:P323L, G671S; nsp13:S36P, R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I, T11A; M:Q19E, A63T; ORF8:G8stop; N:P13L, E31-, R32-, S33-, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.6687750" target=_blank>SARS-CoV-2/human/USA/AZ-CDC-STM-PX93VHGWN/2022</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/1088" target=_blank>https://github.com/cov-lineages/pango-designation/issues/1088</a>'
        ]
      },
      'BF.7': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'BF.7',
        'NextStrain Lineage': '22B (Omicron)',
        'Emergence Location': 'Multiple',
        'Emergence Date': 'June 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'T19I, L24-, P25-, P26-, A27S, H69-, V70-, G142D, V213G, G339D, R346T, S371F, S373P, S375F, T376A, D405N, R408S, K417N, N440K, L452R, S477N, T478K, E484A, F486V, Q498R, N501Y, Y505H, D614G, H655Y, N679K, P681H, N764K, D796Y, Q954H, N969K',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'nsp1:S135R; nsp3:T24I, G489S; nsp4:L264F, L327I, T492I; nsp5:P132H; nsp6:S106-, G107-, F108-; nsp12:P323L; nsp13:R392C; nsp14:I42V; nsp15:T112I; ORF3a:T223I; E:T9I; M:D3N, Q19E, A63T; N:P13L,E31-, R32-, S33-, P151S, R203K, G204R, S413R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.5996800" target=_blank>SARS-CoV-2/human/USA/UT-IDEL20220621042</a>',
        'Relevant Publications': [
          '<a href="https://github.com/cov-lineages/pango-designation/issues/827" target=_blank>https://github.com/cov-lineages/pango-designation/issues/827</a>'
        ]
      },
    }
  });
});
