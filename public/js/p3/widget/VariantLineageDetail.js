define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/text!./templates/VariantLineageDetail.html',
  'dijit/form/Select', 'dijit/_WidgetBase', 'dijit/_Templated'

], function (
  declare, domConstruct, Template,
  Select, WidgetBase, Templated
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
      this.set('properties', state.lineage_id || 'B.1.1.7');
    },
    _setPropertiesAttr: function(lineage_id) {
      domConstruct.empty(this.lineagePropertiesNode);
      var table = domConstruct.create('table', { 'class': 'p3basic striped' }, this.lineagePropertiesNode);
      var tbody = domConstruct.create('tbody', {}, table);

      var htr;
      Object.entries(this.data[lineage_id]).forEach(([key, value]) => {
        htr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('th', { innerHTML: key, scope: 'row', style: 'width:25%' }, htr);
        if (typeof(value) != 'string') {
          var inner = ['<ol>'];
          value.forEach(function(el) {
            inner.push(`<li>${el}</li>`);
          })
          inner.push('</ol>');

          domConstruct.create('td', { innerHTML: inner.join('') || '&nbsp;' }, htr);
        } else {
          domConstruct.create('td', { innerHTML: value || '&nbsp;' }, htr);
        }
      })
    },
    _buildSelectBox: function() {

      var select_lineage = new Select({
        name: 'selectVoC',
        id: 'selectVoC',
        options: ['B.1.1.7', 'B.1.351', 'P.1', 'CAL.20C', 'B.1.375'].map((el) => {return {'label': el, 'value': el}}),
        style: 'width: 200px; margin: 5px 0'
      });

      var self = this;
      select_lineage.on('change', function() {
        var selected = this.get("value");
        self.set('properties', selected);
      });
      var label_select_lineage = domConstruct.create('label', {
        style: 'margin-left: 5px;',
        innerHTML: 'Select Variant of Concern (VoC): '
      });
      domConstruct.place(label_select_lineage, this.lineageSelectNode, 'last');
      domConstruct.place(select_lineage.domNode, this.lineageSelectNode, 'last');
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._buildSelectBox()
    },
    data: {
      'B.1.1.7': {
        'VoC name':'B.1.1.7',
        'PANGO lineage':'<a href="https://cov-lineages.org/global_report_B.1.1.7.html" target=_blank>B.1.1.7</a>',
        'NextStrain lineage':'20I/501Y.V1',
        'Other synonyms VOC':'202012/01, UK variant',
        'Emergence location':'Southeast England',
        'Emergence date':'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1 Spike': 'H69-, V70-, N501Y, A570D, D614G, P681H, T716I, S982A, D1118H',
        'Amino acid substitutions vs Wuhan-Hu-1 Non-Spike': 'ORF8 Q27stop',
        'Nucleotide substitutions vs Wuhan-Hu-1':'C241T, C913T, C3037T, C3267T, C5388A, C5986T, T6954C, T11288-, C11289-, T11290-, G11291-, G11292-, T11293-, T11294-, T11295-, T11296-, C14408T, C14676T, C15279T, T16176C, A17615G, T21765-, A21766-, C21767-, A21768-, T21769-, G21770-, T21991-, T21992-, A21993-, A23063T, A23271C, A23403G, A23604C, T23709C, G24506T, C24914G, T27972C, G28048T, G28111A, A28271-, G28280C, A28281T, T28282A, G28881A, G28882A, G28883C, C28977T',
        'Impact':'Increased transmissibility; S gene target failure (SGTF)',
        'SF overlap':'TBD',
        'ViPR representative strain link':'<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW430974&decorator=corona&context=1611876836946" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-P012/2020</a>',
        'GISAID representative strain':'hCoV-19/England/MILK-9E05B3/2020 EPI_ISL_601443',
        'Consensus genome sequence':'B.1.1.7_North America_genome_consensus.fasta',
        'Consensus Spike protein':'sequence	B.1.1.7_North America_S protein_consensus.fasta',
        'Consensus all protein':'sequences	B.1.1.7_North America_all proteins_consensus.fasta',
        'Relevant publications':[
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html</a>',
          '<a href="https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2" target=_blank>https://virological.org/t/transmission-of-sars-cov-2-lineage-b-1-1-7-in-england-insights-from-linking-epidemiological-and-genetic-data/576/2</a>'
        ]
      },
      'B.1.351': {
        'VoC name':'B.1.351',
        'PANGO lineage':'<a href="https://cov-lineages.org/global_report_B.1.351.html" target=_blank>B.1.351</a>',
        'NextStrain lineage':'20H/501Y.V2',
        'Other synonyms VOC':'South African variant',
        'Emergence location':'Nelson Mandela Bay, South African',
        'Emergence date':'October 2020',
        'Amino acid substitutions vs Wuhan-Hu-1 Spike':'D80A, D215G, L241-, L242-, A243-, K417N, E484K, N501Y, D614G, A701V',
        'Amino acid substitutions vs Wuhan-Hu-1 Non-Spike':'TBD',
        'Nucleotide substitutions vs Wuhan-Hu-1':'G174T, C241T, C1059T, T3037C, G5230T, A10323G, T11288-, C11289-, T11290-, G11291-, G11292-, T11293-, T11294-, T11295-, T11296-, C14408T, A21801C, A22206G, C22281-, T22282-, T22283-, T22284-, A22285-, C22286-, T22287-, T22288-, G22289-, G22813T, G23012A, A23063T, A23403G, C23664T, G25563T, C25904T, C26456T, C28253T, C28887T',
        'Impact':'E484K loss of serum antibody neutralization',
        'SF overlap':'TBD',
        'ViPR representative strain link':'NA',
        'GISAID representative strain':'hCoV-19/South Africa/KRISP-K004312/2020|EPI_ISL_660190|2020-10-23',
        'Consensus genome sequence':'B.1.351_genome_consensus.fasta',
        'Consensus Spike protein sequence':'B.1.351_S protein_consensus.fasta',
        'Consensus all protein sequences':'B.1.351_all proteins_consensus.fasta',
        'Relevant publications':[
          'Greaney AJ, Loes AN, Crawford KHD, et al. Comprehensive mapping of mutations to the SARS-CoV-2 receptor-binding domain that affect recognition by polyclonal human serum antibodies. bioRxiv. [Preprint posted online January 4, 2021]',
          'Weisblum Y, Schmidt F, Zhang F, et al. Escape from neutralizing antibodies by SARS-CoV-2 spike protein variants. eLife 2020;9:e61312.',
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html</a>'
        ]
      },
      'P.1': {
        'VoC name':'P.1',
        'PANGO lineage':'<a href="https://cov-lineages.org/lineages/lineage_B.1.1.248.html" target=_blank>B.1.1.248</a>',
        'NextStrain lineage':'20J/501Y.V3',
        'Other synonyms VOC':'Brazilian variant',
        'Emergence location':'Brazil',
        'Emergence date':'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1 Spike':'L18F, T20N, P26S, D138Y, R190S, K417T, E484K, N501Y, D614G, H655Y, T1027I, V1176F',
        'Amino acid substitutions vs Wuhan-Hu-1 Non-Spike':'TBD',
        'Nucleotide substitutions vs Wuhan-Hu-1':'C241T, T733C, C2749T, C3037T, C3828T, A5648C, A6319G, A6613G, G9105A, C10833T, T11288-, C11289-, T11290-, G11291-, G11292-, T11293-, T11294-, T11295-, T11296-, C12778T, C13860T, C14408T, G17259T, C21614T, C21621A, C21638T, G21974T, G22132T, A22812C, G23012A, A23063T, C23380T, A23403G, C23525T, C24642T, G25088T, T26149C, G28167A, -28263A, -28264A, -28265C, -28266A, C28516G, A28881T, G28882C, G28885A, G28886A, G28887C, T29838A',
        'Impact':'Increased transmissibility',
        'SF overlap':'TBD',
        'ViPR representative strain link':'<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW520923&decorator=corona&context=1611876882126" target=_blank>SARS-CoV-2/human/USA/MN-MDH-2399/2021</a>',
        'GISAID representative strain':'hCoV-19/Brazil/AM-L70-CD1722/2020 (incomplete); hCoV-19/Japan/IC-0564/2021',
        'Consensus genome sequence':'P.1_US_genome_consensus.fasta',
        'Consensus Spike protein sequence':'P.1_US_S protein_consensus.fasta',
        'Consensus all protein sequences':'P.1_US_all proteins_consensus.fasta',
        'Relevant publications':[
          '<a href="https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html" target=_blank>https://www.cdc.gov/coronavirus/2019-ncov/more/science-and-research/scientific-brief-emerging-variants.html</a>',
          'Resende PC, Bezerra JF, de Vasconcelos RHT, at al. Spike E484K mutation in the first SARS-CoV-2 reinfection case confirmed in Brazil, 2020. [Posted on www.virological.org on January 10, 2021]',
          '<a href="https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2" target=_blank>https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2</a>'
        ]
      },
      'CAL.20C': {
        'VoC name':'CAL.20C',
        'PANGO lineage':'',
        'NextStrain lineage':'',
        'Other synonyms VOC':'',
        'Emergence location':'Southern California, USA',
        'Emergence date':'July 2020',
        'Amino acid substitutions vs Wuhan-Hu-1 Spike':'S13I, W152C, L452R, D614G',
        'Amino acid substitutions vs Wuhan-Hu-1 Non-Spike':'N: T205I; NS3: Q57H; NSP2: T85I; NSP12: P323L; NSP13: D260Y',
        'Nucleotide substitutions vs Wuhan-Hu-1':'C29362T, C28887T, A28272T, G27890T, C26681T, G25563T, T24349C, A23403G, T22917G, G22018T, G21600T, G17014T, C14408T, A12878G, C12100T, C8947T, C3037T, T2597C, C2395T, C1059T, C241T',
        'Impact':'unknown',
        'SF overlap':'TBD',
        'ViPR representative strain link':'<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW485882&decorator=corona&context=1611876924806" target=_blank>SARS-CoV-2/human/USA/CA-LACPHL-AF00141/2021</a>',
        'GISAID representative strain':'',
        'Consensus genome sequence':'CAL.20C_genome_consensus.fasta',
        'Consensus Spike protein sequence':'CAL.20C_S protein_consensus.fasta',
        'Consensus all protein sequences':'CAL.20C_all proteins_consensus.fasta',
        'Relevant publications':[
          '<a href="https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2" target=_blank>https://en.wikipedia.org/wiki/Variants_of_SARS-CoV-2</a>',
          '<a href="https://www.medrxiv.org/content/10.1101/2021.01.18.21249786v1" target=_blank>https://www.medrxiv.org/content/10.1101/2021.01.18.21249786v1</a>'
        ]
      },
      'B.1.375': {
        'VoC name':'B.1.375',
        'PANGO lineage':'B.1.375',
        'NextStrain lineage':'',
        'Other synonyms VOC':'',
        'Emergence location':'Massachusetts, USA',
        'Emergence date':'September 2020',
        'Amino acid substitutions vs Wuhan-Hu-1 Spike':'H69-, V70-, D614G',
        'Amino acid substitutions vs Wuhan-Hu-1 Non-Spike':'TBD',
        'Nucleotide substitutions vs Wuhan-Hu-1':'C241T, C1059T, T1171C, C3037T, A5747G, C10789T, C14408T, G17259T, C21431T, T21765-, A21766-, C21767-, A21768-, T21769-, G21770-, A23403G, G24007A, G25563T, C25844T, A26664G, C28887T, A29863-, G29864-, A29865-, A29866-, T29867-, G29868-, A29869-, C29870-, A29871-, A29872-, A29873-, A29874-, A29875-, A29876-, A29877-, A29878-, A29886C',
        'Impact':'unknown',
        'SF overlap':'TBD',
        'ViPR representative strain link':'<a href="https://www.viprbrc.org/brc/viprStrainDetails.spg?ncbiAccession=MW430977&decorator=corona" target=_blank>SARS-CoV-2/human/USA/FL-CDC-STM-P015/2020</a>',
        'GISAID representative strain':'',
        'Consensus genome sequence':'B.1.375_North America_genome_consensus.fasta',
        'Consensus Spike protein sequence':'B.1.375_North America_S protein_consensus',
        'Consensus all protein sequences':'B.1.375_North America_all proteins_consensus.fasta',
        'Relevant publications':'<a href="https://virological.org/t/detection-of-non-b-1-1-7-spike-69-70-sequences-b-1-375-in-the-united-states/587" target=_blank>https://virological.org/t/detection-of-non-b-1-1-7-spike-69-70-sequences-b-1-375-in-the-united-states/587</a>'
      }
    },
  });
});
