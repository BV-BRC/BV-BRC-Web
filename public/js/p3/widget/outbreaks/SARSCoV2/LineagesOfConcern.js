define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct', 'dojo/text!./LineagesOfConcern.html',
  'dojo/when', 'dojo/request', 'dojo/_base/lang',
  'dijit/form/Select', 'dijit/_WidgetBase', 'dijit/_Templated'
], function (
  declare, on, domConstruct, Template,
  when, xhr, lang,
  Select, WidgetBase, Templated
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'LineagesOfConcern',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    state: null,
    docsServiceURL: window.App.docsServiceURL,
    defaultLineageId: 'BA.1',
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
          '<a href="https://github.com/cov-lineages/pango-designation/issues/361" target=_blank>https://github.com/cov-lineages/pango-designation/issues/361</a>'
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
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.6057056" target=_blank>SARS-CoV-2/human/USA/IL-CDC-STM-G6D8GUH6S/2022</a>',
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
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.5037398" target=_blank>SARS-CoV-2/human/USA/PA-CDC-LC0583069/2022</a>',
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
      'JN.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JN.1',
        'NextStrain Lineage': '23I (Omicron)',
        'Emergence Location': 'Luxembourg/Iceland',
        'Emergence Date': 'January 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A264D, A570V, D405N, D614G, D796Y, E484K, E554K, F157S, F486P, G142D, G339H, G446S, H69del, H245N, H655Y, I332V, ins16MPLF, K356T, K417N, L24del, L212I, L216F, L452W, L455S, N211del, N440K, N450D, N460K, N481K, N501Y, N679K, N764K, N969K, P25del, P26del, P621S, P681R, P1143L, Q498R, Q954H, R21T, R158G, R403K, R408S, S50L, S371F, S373P, S375F, S477N, S939F, T19I, T376A, T478K, V70del, V127F, V213G, V445H, V483del, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I; M A63T, A104V, D3H, Q19E, T30A; N E31del, G204R, P13L, Q229K, R32del, R203K, S33del, S413R; NS3 T223I; NS7b F19L; NSP1 S135R; NSP2 A31D; NSP3 A1892T, G489S, K1155R, N1708S, T24I, V238L; NSP4 L264F, T327I, T492I; NSP5 P132H; NSP6 F108del, G107del, R252K, S106del, V24F; NSP9 T35I; NSP12 P323L; NSP13 R392C; NSP14 I42V; NSP15 T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8767218">SARS-CoV-2/human/BEL/rega-20174/2021</a>'
      },
      'JN.4': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JN.4',
        'NextStrain Lineage': '23I (Omicron)',
        'Emergence Location': 'Denmark/Israel/USA',
        'Emergence Date': 'September 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A264D, A475V, A570V, D405N, D614G, D796Y, E484K, E554K, F157S, F486P, G142D, G446S, H69del, H245N, H655Y, ins16MPLF, K356T, K417N, L24del, L212I, L216F, L452W, N211del, N440K, N450D, N460K, N481K, N679K, N764K, N969K, P25del, P26del, P621S, P681R, P1143L, Q954H, R21T, R158G, R403K, R408S, S50L, S371F, S373P, S477N, S939F, T19I, T376A, T478K, V70del, V127F, V213G, V445H, V483del, Y144del',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I; M A63T, A104V, D3H, Q19E, T30A; N E31del, G204R, P13L, Q229K, R32del, R203K, S33del, S413R; NS3 T223I; NS7a S37F; NSP1 S135R; NSP2 A31D, K500N; NSP3 A1892T, G489S, K1155R, N1708S, T24I, V238L; NSP4 L264F, T492I; NSP5 P132H; NSP6 F108del, G107del, S106del, V24F; NSP9 T35I; NSP12 P323L; NSP13 R392C; NSP14 I42V; NSP15 T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8733969">SARS-CoV-2/human/USA/MD-MDH-9069/2023</a>'
      },
      'HV.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'HV.1',
        'NextStrain Lineage': '23F (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'July 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F157L, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L452R, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M A63T, Q19E; N E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3 T223I; NS7a T115I; NS8 G8stop; NSP1 K47R, S135R; NSP2 A510V; NSP3 G489S, G1001S, S1039L, T24I; NSP4 A380V, L264F, L438F, T327I, T492I; NSP5 P132H; NSP6 F108del, G107del, S106del; NSP9 T35I; NSP12 G671S, P323L; NSP13 R392C, S36P; NSP14 I42V; NSP15 T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8706164">SARS-CoV-2/human/USA/MD-CDC-LC1057321/2023</a>'
      },
      'JD.1.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JD.1.1',
        'NextStrain Lineage': '23A (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'October 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A475V, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M A63T, Q19E; N G204R, P13L, R203K, S413R; NS3 T223I; NS8 G8stop; NSP1 K47R, S135R; NSP3 G489S, T24I; NSP4 L264F, L438F, T327I, T492I; NSP5 P132H; NSP6 F108del, G107del, S106del; NSP12 A250V, G671S, P323L; NSP13 R392C, S36P; NSP14 I42V; NSP15 T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.87571">SARS-CoV-2/human/USA/FL-BPHL-1807/2020</a>'
      },
      'HK.3': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'HK.3',
        'NextStrain Lineage': '23H (Omicron)',
        'Emergence Location': 'Austria/India/Bangladesh',
        'Emergence Date': 'January 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G120V, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T34A, T223I; NS8: G8stop; NSP1: K47R, S135R; NSP2: A510V; NSP3: G489S, G1001S, T24I; NSP4: A380V, L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: D63N, G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8712301">SARS-CoV-2/human/USA/NY-CDC-QDX84734656/2023</a>'
      },
      'GW.5.1.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'GW.5.1.1',
        'NextStrain Lineage': '22F (Omicron)',
        'Emergence Location': 'India',
        'Emergence Date': 'August 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A475V, D405N, D614G, D796Y, E484A, E554K, F79S, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478I, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, P80S, R32del, R203K, S33del, S413R; NS3: G172C, T223I, W149C; NSP1: K47R, P62L, S135R; NSP2: S122F; NSP3: G489S, P1261Q, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: K90R, P132H; NSP6: F108del, G107del, S106del; NSP9: P80L; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8724624">SARS-CoV-2/human/USA/MN-CDC-VSX-A09331/2023</a>'
      },
      'FL.1.5.2': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'FL.1.5.2',
        'NextStrain Lineage': '23D (Omicron)',
        'Emergence Location': 'Indonesia/Israel/Singapore',
        'Emergence Date': 'June 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A701V, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, N440K, N460K, N481K, N501Y, N679K, N764K, N969K, P25del, P26del, P681R, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I; NS8: G8stop; NSP1: K47R, S135R; NSP3: G175S, G489S, G1001S, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I; NSP16: K160R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8723790">SARS-CoV-2/human/USA/MA-CDC-QDX85193071/2023</a>'
      },
      'FL.1.5.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'FL.1.5.1',
        'NextStrain Lineage': '23D (Omicron)',
        'Emergence Location': 'Indonesia/Israel/Singapore',
        'Emergence Date': 'October 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A701V, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478R, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I; NS8: G8stop; NSP1: K47R, S135R; NSP3: G175S, G489S, G1001S, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: S147I, T112I; NSP16: K160R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8714239">SARS-CoV-2/human/USA/NY-CDC-QDX84971198/2023</a>'
      },
      'JG.3': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JG.3',
        'NextStrain Lineage': '23F (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'January 2022',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, S704L, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I, NS7a K53I; NS8: G8stop; NSP1: K47R, S135R; NSP2: A510V, R362C; NSP3: G489S, G1001S, T24I, T1456I; NSP4: A380V, L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8763270">SARS-CoV-2/human/USA/UT-UPHL-231109691269/2023</a>'
      },
      'GW.5': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'GW.5',
        'NextStrain Lineage': '22F (Omicron)',
        'Emergence Location': 'India',
        'Emergence Date': 'April 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, E554K, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478I, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, P80S, R32del, R203K, S33del, S413R; NS3: T223I, NS7b C41Y; NSP1: G82del, H83del, K47R, M85del, S135R, V84del, V86del; NSP2: I514V, S122F; NSP3: G489S, P1261Q, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: P80L; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8704216">SARS-CoV-2/human/USA/NY-CDC-QDX84542137/2023</a> <br> <a href="https://www.bv-brc.org/view/Genome/2697049.8725372">SARS-CoV-2/human/USA/MI-CDC-2-7320511/2023</a>'
      },
      'DV.7.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'DV.7.1',
        'NextStrain Lineage': '23C (Omicron)',
        'Emergence Location': 'Austria',
        'Emergence Date': 'May 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F157L, F456L, F486S, G142D, G257S, G339H, G446S, H655Y, I210V, K147E, K417N, K444T, L24del, L452R, L455F, L858I, N185D, N440K, N460K, N501Y, N764K, N969K, P25del, P26del, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V213G, W152R, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E: T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: A72T, A110V, T223I; NSP1: E37G, S135R; NSP3: E52D, G145D, G489S, P822S, Q380K, S403L, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: A285V, P132H; NSP6: F108del, G107del, S106del; NSP8: N118S; NSP12: A529V, G671S, L49I, P323L; NSP13: R392C; NSP14: I42V, V182I; NSP15: K89R, T112I; NSP16: Q28R',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8487068">SARS-CoV-2/human/USA/CA-LACPHL-AY01271/2023</a>'
      },
      'HK.3.2': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'HK.3.2',
        'NextStrain Lineage': '23F (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'August 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q14K, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I; NS6: L15V; NS7a: T115I; NS7b: I7T; NS8: G8stop; NSP1: E148A, K47R, S135R; NSP2: A510V; NSP3: G489S, G1001S, T24I; NSP4: A380V, L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: D63N, G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8719990">SARS-CoV-2/human/USA/NJ-CDC-QDX85241599/2023</a>'
      },
      'JD.1.1.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JD.1.1.1',
        'NextStrain Lineage': '23A (Omicron)',
        'Emergence Location': 'Austria/India/Bangladesh',
        'Emergence Date': 'April 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, A475V, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y248H, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I; NS8: G8stop; NSP1: K47R, S135R; NSP3: G489S, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP10: T12I; NSP12: A250V, G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8723858">SARS-CoV-2/human/USA/IL-CDC-QDX85193109/2023</a>'
      },
      'HK.2': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'HK.2',
        'NextStrain Lineage': '23F (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'June 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q14H, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I, Y211H; NS8: G8stop; NSP1: K47R, S135R; NSP2: A510V; NSP3: G489S, G1001S, K1943R, T24I; NSP4: A380V, L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: D63N, G671S, P323L; NSP13: R392C, S36P; NSP14: A96V, I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8788407">UNKNOWN-OY779846</a>'
      },
      'JF.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'JF.1',
        'NextStrain Lineage': '23B (Omicron)',
        'Emergence Location': 'India',
        'Emergence Date': 'June 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E180V, E484A, F456L, F486P, F490S, G142D, G252V, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, L455F, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478R, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I, Y211H; NS8: G8stop; NSP1: K47R, S135R; NSP3: G489S, T24I; NSP4: L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, L260F, S106del; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: D222Y, I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8483096">SARS-CoV-2/human/USA/FL-CDC-QDX83301046/2023</a>'
      },
      'EG.5.1': {
        'WHO name': 'Omicron',
        'PANGO Lineage': 'EG.5.1',
        'NextStrain Lineage': '23F (Omicron)',
        'Emergence Location': 'Indonesia/France',
        'Emergence Date': 'January 2023',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Spike': 'A27S, D405N, D614G, D796Y, E484A, F456L, F486P, F490S, G142D, G339H, G446S, H146Q, H655Y, K417N, L24del, L368I, N440K, N460K, N501Y, N679K, N764K, N969K, P25del, P26del, P681H, Q52H, Q183E, Q498R, Q954H, R346T, R408S, S371F, S373P, S375F, S477N, T19I, T376A, T478K, V83A, V213E, V445P, Y144del, Y505H',
        'Amino Acid Substitutions vs Wuhan-Hu-1: Non-Spike': 'E T9I, T11A; M: A63T, Q19E; N: E31del, G204R, P13L, R32del, R203K, S33del, S413R; NS3: T223I; NS8: G8stop; NSP1: K47R, S135R; NSP2: A510V, S99F; NSP3: G489S, G1001S, T24I; NSP4: A380V, L264F, L438F, T327I, T492I; NSP5: P132H; NSP6: F108del, G107del, S106del; NSP9: T35I; NSP12: G671S, P323L; NSP13: R392C, S36P; NSP14: I42V; NSP15: T112I',
        'Representative Strain': '<a href="https://www.bv-brc.org/view/Genome/2697049.8691573">hCoV-19/Switzerland/ZH-UZH-IMV-3ba6ae5d/2023</a>'
      }
    },

    _setStateAttr: function (state) {
      this._set('state', state);
      const loc = state.hashParams.loc || this.defaultLineageId;
      this.set('properties', loc);
    },

    _setPropertiesAttr: function (lineageId) {
      domConstruct.empty(this.lineagePropertiesNode);
      const table = domConstruct.create('table', {'class': 'p3basic striped'}, this.lineagePropertiesNode);
      const tbody = domConstruct.create('tbody', {}, table);

      Object.entries(this.data[lineageId]).forEach(([key, value]) => {
        let htr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('th', {innerHTML: key, scope: 'row', style: 'width:25%;font-weight:bold'}, htr);
        if (typeof (value) != 'string') {
          let inner = ['<ol>'];
          value.forEach(function (el) {
            inner.push(`<li>${el}</li>`);
          });
          inner.push('</ol>');

          domConstruct.create('td', {innerHTML: inner.join('') || '&nbsp;'}, htr);
        } else {
          domConstruct.create('td', {innerHTML: value || '&nbsp;'}, htr);
        }
      });
    },

    _buildSelectBox: function () {
      this.selectLineage = new Select({
        name: 'selectLoC',
        id: 'selectLoC',
        options: Object.keys(this.data).sort().map((el) => {
          return {'label': el, 'value': el};
        }),
        style: 'width: 200px; margin: 5px 0'
      });

      const self = this;
      this.selectLineage.on('change', function (value) {
        if (value !== '' && value in self.data) {
          on.emit(self.domNode, 'UpdateHash', {
            bubbles: true,
            cancelable: true,
            hashProperty: 'loc',
            value: value,
            oldValue: ''
          });
        }
      });
      const selectLineageLabel = domConstruct.create('label', {
        style: 'margin-left: 5px;',
        innerHTML: 'Select Lineage of Concern/Interest (LoC/LoI): '
      });
      domConstruct.place(selectLineageLabel, this.lineageSelectNode, 'last');
      domConstruct.place(this.selectLineage.domNode, this.lineageSelectNode, 'last');
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._buildSelectBox();
    }
  });
});
