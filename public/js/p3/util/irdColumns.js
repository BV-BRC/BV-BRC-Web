define([], function () {

  /**
   * IRD's result columns (Option C, Phase 1c), as `defaultColumns` tokens for
   * the BV-BRC grid containers. GridContainer._prepareSearchColumns reads
   * them: a token naming a grid column shows it, `-name` hides it, and a
   * genome field the grid lacks is added as a column filled by
   * GenomeMetadataStore from the genome records of the displayed rows only.
   * Columns not mentioned keep their BV-BRC default.
   *
   * Each list follows the default-visible columns of IRD's displays
   * (brc/WEB-INF/conf/views/views-search-results.xml): Influenza Gene Search
   * Segment Display, Protein Display, and Strain Display-A. IRD columns with
   * no BV-BRC data (Curation Report, NS1 T92E, polybasic cleavage, drug
   * sensitivity) are left out (decision D4).
   */

  var COLUMNS = {
    segment: [
      // Sequence record
      'segment', 'accession', 'length', 'sequence_status',
      // Genome (strain) metadata, enriched per page
      'strain', 'subtype', 'collection_date', 'host_common_name', 'isolation_country',
      'state_province', 'season', 'genome_status',
      // BV-BRC defaults IRD did not show
      '-genome_id', '-genome_name', '-sequence_type', '-mol_type', '-description', '-gc_content'
    ],
    protein: [
      'gene', 'product', 'patric_id', 'protein_id', 'aa_length',
      'strain', 'subtype', 'collection_date', 'host_common_name', 'isolation_country',
      'state_province', 'season',
      '-genome_id', '-genome_name', '-feature_type', '-refseq_locus_tag', '-start', '-end',
      '-strand', '-na_length', '-accession'
    ],
    // Plus one column per segment (SEGMENT_COLUMNS), added by
    // IrdStrainGridContainer.
    strain: [
      'strain', 'subtype', 'collection_date', 'host_common_name', 'isolation_country',
      'state_province', 'season', 'genome_status', 'contigs',
      // The genome's own segment list: the per-segment columns replace it.
      '-segment',
      '-genome_name', '-genbank_accessions', '-genome_length', '-cds', '-collection_year'
    ]
  };

  // IRD's Strain Display columns 1 PB2 ... 8 NS, in IRD's order.
  var SEGMENT_COLUMNS = ['PB2', 'PB1', 'PA', 'HA', 'NP', 'NA', 'M', 'NS'].map(function (seg, i) {
    return { segment: seg, label: (i + 1) + ' ' + seg };
  });

  /**
   * Text and tooltip for one segment cell of a strain row, from the
   * `ird_segments` IrdSegmentAccessionStore attaches. Several accessions for
   * one segment means segment linking put more than one sequence in this
   * genome: the cell shows the first and the count, never just one as if it
   * were the only one.
   */
  function segmentCell(row, segment) {
    var accessions = (row && row.ird_segments && row.ird_segments[segment]) || [];
    var truncated = !!(row && row.ird_segments_truncated);
    var text = accessions.length ? accessions[0] : '';
    var title = '';
    if (accessions.length > 1) {
      text += ' (+' + (accessions.length - 1) + ')';
      title = accessions.length + ' sequences for ' + segment + ' in this genome: ' + accessions.join(', ');
    }
    if (truncated) {
      text += ' \u2026';
      title = (title ? title + '. ' : '') + 'This genome has too many sequences to list them all here.';
    }
    return { text: text, title: title };
  }

  return {
    COLUMNS: COLUMNS,
    SEGMENT_COLUMNS: SEGMENT_COLUMNS,
    segmentCell: segmentCell,

    /** The `defaultColumns` value for a result type. */
    defaultColumns: function (grain) {
      var cols = COLUMNS[grain];
      if (!cols) throw new Error('irdColumns: unknown grain ' + grain);
      return cols.join(',');
    }
  };
});
