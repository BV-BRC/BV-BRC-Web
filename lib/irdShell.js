/**
 * The IRD shell: an Influenza Research Database style front door to BV-BRC,
 * served under /ird when `enableIrdShell` is on.
 *
 * It reproduces IRD's navigation (menu-influenza.xml in the old Tomcat webapp)
 * and sends each item to the BV-BRC page that replaced it. Nothing here queries
 * data; every destination is an existing BV-BRC page.
 *
 * Rules for a destination:
 *  - Only pages BV-BRC already advertises -- its own menus, the taxon overview
 *    pages, or the IRD/ViPR mapping in the docs
 *    (quick_start/ird-vipr_bv-brc_mapping.html). Some routes still resolve but
 *    are retired on purpose (Strain Search redirects to /searches), so "the
 *    route exists" is not enough.
 *  - An IRD feature with no BV-BRC equivalent keeps its entry with
 *    `unavailable` set to a short reason. Landing pages list it so returning
 *    IRD users learn it is gone rather than hunting for it; menus leave it out.
 *
 * `href` values starting with `docs:` are relative to docsServiceURL.
 */

var INFLUENZA_A = '/view/Taxonomy/2955291';

function fluTab(tab) {
  return INFLUENZA_A + '#view_tab=' + tab;
}

var navigation = [
  {
    id: 'search',
    label: 'Search Data',
    landing: '/ird/search',
    intro: 'Find influenza sequence, surveillance, structure, epitope, and serology data. Each search opens in BV-BRC.',
    sections: [
      {
        title: 'Sequences & Strains',
        desc: 'Strain, segment, and protein sequence data imported from GenBank and UniProt.',
        items: [
          { label: 'Nucleotide Sequences', href: '/searches/GenomeSearch', desc: 'Search segments by keyword, subtype, host, country, and more. In BV-BRC an influenza strain\'s segments are one genome record.' },
          { label: 'Protein Sequences', href: '/searches/ProteinSearch', desc: 'Search influenza proteins by keyword, subtype, host, country, and more.' },
          { label: 'Strain Data', href: fluTab('genomes'), desc: 'Strain metadata is carried on BV-BRC genome records; filter the Influenza A genome list.' },
          { label: 'Influenza Feature Search (beta)', href: '/searches/InfluenzaSearch', desc: 'New in BV-BRC: influenza-specific search over segments and proteins.' }
        ]
      },
      {
        title: 'Animal Surveillance',
        desc: 'Sample information from avian and non-human mammalian influenza surveillance.',
        items: [
          { label: 'Animal Surveillance Data', href: '/searches/SurveillanceSearch', desc: 'Filter by country, host, age, subtype, collection date, and more.' },
          { label: 'Compare Subtypes in Surveillance', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Summary of Avian Surveillance', unavailable: 'Not carried over to BV-BRC. The Influenza A Surveillance tab lists the records.' }
        ]
      },
      {
        title: 'Human Surveillance Data',
        desc: 'Human surveillance records with host clinical metadata, linked to virus sequences.',
        items: [
          { label: 'Human Surveillance Records', href: '/searches/SurveillanceSearch', desc: 'Animal and human records share one surveillance search in BV-BRC.' }
        ]
      },
      {
        title: '3D Protein Structures',
        desc: 'Structure files (PDB) for influenza proteins.',
        items: [
          { label: '3D Protein Structures', href: '/searches/ProteinStructureSearch', desc: 'Search by protein name, keyword, PDB ID, or author.' }
        ]
      },
      {
        title: 'Immune Epitopes',
        desc: 'Experimentally determined influenza epitopes imported from the Immune Epitope Database (IEDB).',
        items: [
          { label: 'Experimentally Determined Epitopes', href: '/searches/EpitopeSearch' },
          { label: 'Predicted Epitopes', unavailable: 'Not carried over to BV-BRC.' }
        ]
      },
      {
        title: 'Serology Experiments',
        desc: 'Hemagglutination inhibition and related serology results.',
        items: [
          { label: 'Serology Experiments', href: '/searches/SerologySearch' }
        ]
      },
      {
        title: 'Sequence Feature Variant Types',
        desc: 'Structural and functional sequence features in influenza proteins curated from the literature.',
        items: [
          { label: 'Sequence Feature Variant Types', href: '/searches/SFVTSearch' }
        ]
      },
      {
        title: 'Vaccine Strains',
        desc: 'Strains selected for Northern and Southern Hemisphere seasonal vaccines.',
        items: [
          { label: 'WHO Influenza Vaccine Strains', href: '/view/VaccineStrain' }
        ]
      },
      {
        title: 'Other IRD Data',
        desc: 'IRD data collections that were not migrated to BV-BRC.',
        items: [
          { label: 'Phenotype Characteristics', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'PCR Primer Probe Data', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Host Factor Experiments', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Antiviral Drugs', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Laboratory Experiments', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'CEIRS Reagents', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Plasmid Data', unavailable: 'Not carried over to BV-BRC.' }
        ]
      },
      {
        title: 'Search History',
        items: [
          { label: 'Your Saved Searches', href: '/view/SavedSearches', desc: 'Searches you have saved in BV-BRC. Requires sign-in.' },
          { label: 'Retrieve a Download', unavailable: 'BV-BRC downloads are delivered directly; there are no download tickets.' }
        ]
      }
    ]
  },
  {
    id: 'analyze',
    label: 'Analyze & Visualize',
    landing: '/ird/analyze',
    intro: 'Analysis tools run as BV-BRC services. Sign in to run them; results are saved to your workspace.',
    sections: [
      {
        title: 'Sequence Similarity',
        items: [
          { label: 'Identify Similar Sequences (BLAST)', href: '/app/Homology', desc: 'BLAST against influenza and other BV-BRC databases.' },
          { label: 'Identify Short Peptides in Proteins', href: '/app/Homology', desc: 'Use BLAST with a short protein query.' },
          { label: 'Identify Point Mutations in Proteins', unavailable: 'Not carried over to BV-BRC. MSA and SNP Analysis reports variation by position.' }
        ]
      },
      {
        title: 'Alignment & Variation',
        items: [
          { label: 'Align Sequences (MSA)', href: '/app/MSA' },
          { label: 'Visualize Aligned Sequences', href: '/app/MSA', desc: 'Alignments open in the BV-BRC alignment viewer.' },
          { label: 'Analyze Sequence Variation (SNP)', href: '/app/MSA' },
          { label: 'Metadata Sequence Analysis (Meta-CATS)', href: '/app/MetaCATS' }
        ]
      },
      {
        title: 'Phylogeny',
        items: [
          { label: 'Generate Phylogenetic Tree', href: '/app/GeneTree' },
          { label: 'Viral Genome Tree', href: '/app/ViralGenomeTree', desc: 'New in BV-BRC: trees from whole influenza genomes.' },
          { label: 'Reassortment Analysis (TreeSort)', href: '/app/TreeSort', desc: 'New in BV-BRC: detect reassortment across segments.' }
        ]
      },
      {
        title: 'Annotation & Classification',
        items: [
          { label: 'Annotate Nucleotide Sequences', href: '/app/Annotation' },
          { label: 'H5 Clade Classification', href: '/app/SubspeciesClassification' },
          { label: 'Swine H1 Clade Classification', href: '/app/SubspeciesClassification' },
          { label: 'Pandemic H1N1 Classification', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'HA Subtype Numbering Conversion', href: '/app/HASubtypeNumberingConversion' },
          { label: 'Identify Sequence Features in Segments', unavailable: 'Not carried over to BV-BRC.' },
          { label: 'Antiviral Resistance Risk Assessment', unavailable: 'Not carried over to BV-BRC.' }
        ]
      },
      {
        title: 'Utilities',
        items: [
          { label: 'PCR Primer Design', href: '/app/PrimerDesign' },
          { label: 'Sequence Format Conversion', unavailable: 'Not carried over to BV-BRC.' }
        ]
      },
      {
        title: 'Analysis History',
        items: [
          { label: 'Your Analysis History', href: '/job/', desc: 'Every analysis you run is listed with its status and results. Requires sign-in.' }
        ]
      }
    ]
  },
  {
    id: 'workbench',
    label: 'Workbench',
    landing: null,
    sections: [
      {
        title: 'Workspace',
        items: [
          { label: 'View My Workspace', href: '/workspace/', desc: 'IRD workbench data was copied into your BV-BRC workspace in November 2022.' },
          { label: 'View Public Workspaces', href: '/workspace/public' },
          { label: 'Sign In', href: '/login', desc: 'IRD accounts work in BV-BRC with the same user name and password.' },
          { label: 'Register', href: '/register' },
          { label: 'Workspace Guide', href: 'docs:quick_references/workspace_groups_upload.html' }
        ]
      }
    ]
  },
  {
    id: 'submit',
    label: 'Submit Data',
    landing: null,
    sections: [
      {
        title: 'Submit',
        items: [
          { label: 'Sequences (Single or Many Strains)', href: '/app/SequenceSubmission', desc: 'Influenza sequence submission to GenBank.' },
          { label: 'Surveillance Data', unavailable: 'Not available in BV-BRC.' },
          { label: 'Experimental Virus Phenotype Data', unavailable: 'Not available in BV-BRC.' },
          { label: 'Sequence Features', unavailable: 'Not available in BV-BRC.' }
        ]
      }
    ]
  },
  {
    id: 'help',
    label: 'Help',
    landing: null,
    sections: [
      {
        title: 'Help',
        items: [
          { label: 'Guide for IRD Users', href: 'docs:quick_start/ird-vipr_bv-brc_mapping.html', desc: 'Where each IRD feature lives in BV-BRC.' },
          { label: 'Help Manual', href: 'docs:quick_references/index.html' },
          { label: 'Tutorials & Training Materials', href: 'docs:tutorial/index.html' },
          { label: 'Computational Protocols', href: 'docs:data_protocols/index.html' },
          { label: 'Cite BV-BRC', href: '/citation' }
        ]
      }
    ]
  }
];

// The small links in the banner, where IRD had About Us / Support / etc.
var utilityNav = [
  { label: 'BV-BRC Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'News', href: 'docs:news/index.html' },
  { label: 'Help', href: 'docs:quick_start/ird-vipr_bv-brc_mapping.html' }
];

// Right-hand column on the home page.
var influenzaLinks = [
  { label: 'Influenza A virus overview', href: fluTab('overview') },
  { label: 'Influenza A genomes', href: fluTab('genomes') },
  { label: 'H5N1 2024 outbreak', href: '/outbreaks/H5N1/#view_tab=overview' },
  { label: 'WHO vaccine strains', href: '/view/VaccineStrain' }
];

function joinUrl(base, rel) {
  return String(base || '').replace(/\/+$/, '') + '/' + rel.replace(/^\/+/, '');
}

/** Resolve a menu href for rendering. `docs:` paths become docsServiceURL links. */
function resolveHref(href, docsServiceURL) {
  if (!href) {
    return href;
  }
  if (href.indexOf('docs:') === 0) {
    return joinUrl(docsServiceURL, href.slice(5));
  }
  return href;
}

function findSection(id) {
  for (var i = 0; i < navigation.length; i++) {
    if (navigation[i].id === id) {
      return navigation[i];
    }
  }
  return null;
}

/**
 * The query string for /search/? that BV-BRC's global search builds for its
 * default "All terms" option, so Quick Search here finds exactly what the
 * search box on every BV-BRC page would.
 *
 * The cleanup and ID quoting are a copy of processQuery() in
 * public/js/p3/widget/GlobalSearch.js, which lives inside a Dojo widget and
 * cannot be loaded on the server. lib/tests/irdShell.test.js extracts that
 * function and checks both give the same answer, so a change there fails the
 * test instead of drifting. `searchToQuery` is util/searchToQuery.js, passed
 * in rather than copied.
 *
 * Returns null for an empty or symbol-only query, which the global search
 * also ignores.
 */
function buildQuickSearchQuery(text, searchToQuery) {
  var query = String(text || '').replace(/^\s+|\s+$/g, '');
  if (!query || !query.match(/[a-z0-9]/i)) {
    return null;
  }

  // From here to searchToQuery(): GlobalSearch.js processQuery(), unchanged.
  query = query.replace(/'/g, '').replace(/:/g, ' ');
  query = query.replace(/\(\+\)/g, ' ').replace(/\(-\)/g, ' ').replace(/,|\+|-|=|<|>|\\|\//g, ' ');
  if (query.charAt(0) == '"' && query.match(/\(|\)|\[|\]|\{|\}/)) {
    query = query.replace(/"/g, '');
  }
  if (query.charAt(0) != '"' || query.match(/\(|\)|\[|\]|\{|\}/)) {
    var keywords = query.split(/\s|\(|\)|\[|\]|\{|\}/);
    for (var i = 0; i < keywords.length; i++) {
      if (keywords[i].charAt(0) != '"' && keywords[i].charAt(keywords[i].length - 1) != '"') {
        if (keywords[i].match(/^fig\|[0-9]+/) != null || keywords[i].match(/[0-9]+\.[0-9]+/) != null || keywords[i].match(/[0-9]+$/) != null) {
          keywords[i] = '"' + keywords[i] + '"';
        }
      }
    }
    query = keywords.join(' ');
  }

  try {
    return searchToQuery(query);
  } catch (e) {
    // The parser throws on an unbalanced quote or parenthesis; the global
    // search would fail outright. Search for the words as typed instead.
    return 'keyword(' + encodeURIComponent(query.replace(/["()]/g, ' ').trim()) + ')';
  }
}

module.exports = {
  INFLUENZA_A: INFLUENZA_A,
  navigation: navigation,
  utilityNav: utilityNav,
  influenzaLinks: influenzaLinks,
  resolveHref: resolveHref,
  findSection: findSection,
  buildQuickSearchQuery: buildQuickSearchQuery
};
