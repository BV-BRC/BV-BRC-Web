/* eslint-env jest */
const fs = require('fs');
const path = require('path');

function load() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'DownloadFormats.js'), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const DownloadFormats = load();

function offered(dataType, current) {
  return DownloadFormats.getFastaIdChoices(dataType, current)
    .reduce((all, g) => all.concat(g.fields.map((f) => f.field)), []);
}

describe('getFastaIdChoices', () => {
  test('THE POINT: features are offered identifiers only', () => {
    // The dropdown used to list every field of the collection -- 77 on alpha,
    // including product, genome_name and isolation_comments, which contain
    // spaces and so cannot be the first word of a FASTA header.
    expect(offered('genome_feature')).toEqual(['patric_id', 'feature_id', 'refseq_locus_tag', 'protein_id']);
  });

  test('THE POINT: contigs are offered identifiers only', () => {
    // genome_id is shared by every contig of a genome; genome_name has spaces.
    expect(offered('genome_sequence')).toEqual(['sequence_id', 'accession']);
    expect(offered('genome_sequence')).not.toContain('genome_id');
    expect(offered('genome_sequence')).not.toContain('genome_name');
  });

  test('non-identifier fields are never offered', () => {
    const never = ['product', 'genome_name', 'gene', 'annotation', 'feature_type', 'taxon_id',
      'strain', 'species', 'host_name', 'isolation_country', 'collection_date', 'aa_sequence_md5'];
    ['genome_feature', 'genome_sequence'].forEach((dt) => {
      never.forEach((f) => expect(offered(dt)).not.toContain(f));
    });
  });

  test('grouped: unique in BV-BRC first, then external IDs', () => {
    const groups = DownloadFormats.getFastaIdChoices('genome_feature');
    expect(groups.map((g) => g.label)).toEqual(['Unique in BV-BRC', 'External IDs (can repeat across BV-BRC records)']);
    expect(groups[0].fields.map((f) => f.field)).toEqual(['patric_id', 'feature_id']);
    expect(groups[1].fields.map((f) => f.field)).toEqual(['refseq_locus_tag', 'protein_id']);
  });

  test('every option has a label', () => {
    ['genome_feature', 'genome_sequence'].forEach((dt) => {
      DownloadFormats.getFastaIdChoices(dt).forEach((g) => g.fields.forEach((f) => {
        expect(typeof f.label).toBe('string');
        expect(f.label.length).toBeGreaterThan(0);
      }));
    });
  });

  test('the default ID field for each FASTA collection is one of the choices', () => {
    // genome and sp_gene downloads resolve to these two collections.
    ['genome_feature', 'genome_sequence'].forEach((dt) => {
      expect(offered(dt)).toContain(DownloadFormats.getDefaultIdField(dt));
    });
  });

  test('THE POINT: a saved format\'s ID field is kept, in its own group, not replaced', () => {
    // Applying a saved format must produce the same headers it always did,
    // even if its ID field is no longer offered.
    const groups = DownloadFormats.getFastaIdChoices('genome_feature', 'gene');
    expect(groups[groups.length - 1]).toEqual({ label: 'From saved format', fields: [{ field: 'gene', label: 'gene' }] });
    expect(offered('genome_feature', 'gene')).toContain('gene');
  });

  test('an offered current field adds no extra group', () => {
    expect(DownloadFormats.getFastaIdChoices('genome_feature', 'feature_id')).toHaveLength(2);
    expect(DownloadFormats.getFastaIdChoices('genome_feature', null)).toHaveLength(2);
  });

  test('a collection with no curated list offers its default ID', () => {
    expect(offered('genome')).toEqual(['genome_id']);
  });
});

describe('FASTA options step', () => {
  const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'widget', 'download', 'FASTAConfiguratorStep.js'), 'utf8');
  const body = SRC.slice(SRC.indexOf('_populateIdFieldDropdown: function'), SRC.indexOf('_populateFieldLists: function'));

  test('builds the ID dropdown from getFastaIdChoices, not from availableFields', () => {
    expect(body).toContain('DownloadFormats.getFastaIdChoices(');
    expect(body).not.toContain('availableFields');
  });

  test('the /fields refresh no longer resets or rebuilds the ID dropdown', () => {
    const refresh = SRC.slice(SRC.indexOf('_refreshFieldsFromApi: function'), SRC.indexOf('// ---', SRC.indexOf('_refreshFieldsFromApi: function')));
    expect(refresh).not.toContain('sequenceIdField =');
    expect(refresh).not.toContain('self._populateIdFieldDropdown(');
  });
});
