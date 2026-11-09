/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * Applying and capturing saved formats in the FASTA options step.
 *
 * The widget needs dijit to instantiate, so the apply/capture logic is
 * exercised against a stand-in carrying the real implementations. The
 * round-trip test is the one that matters: capture -> store -> apply must
 * return the controls to the state they were in, or a saved format quietly
 * changes meaning between sessions.
 */

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'FASTAConfiguratorStep.js'), 'utf8'
);

function bareFieldName(name) {
  return String(name).replace(/^genome_metadata\./, '');
}

const AVAILABLE = [
  { field: 'patric_id', label: 'BV-BRC ID' },
  { field: 'product', label: 'Product' },
  { field: 'genome_name', label: 'Genome Name' },
  { field: 'genome_metadata.strain', label: 'Genome Strain' }
];

function makeStep(overrides) {
  const step = Object.assign({
    context: { dataType: 'genome_feature' },
    sequenceIdField: 'patric_id',
    descriptionFields: [],
    idDelimiter: '|',
    descriptionDelimiter: ' | ',
    headerMode: 'zones',
    headerTemplate: '',
    availableFields: AVAILABLE,
    _savedFormats: [],

    // DOM-free stand-ins for the methods _applyFormat calls.
    _populateIdFieldDropdown() {},
    _populateFieldLists() {},
    _syncDelimiterControls() {},
    _syncModeControls() {},
    _validateTemplate() { return {}; },
    _updatePreview() {},
    notifyDataChanged() {},

    _findSavedFormat(name) {
      if (!name) return null;
      return this._savedFormats.filter((f) => f.name === name)[0] || null;
    },

    _applyFormat(format) {
      this._appliedPresetTemplate = (format.isPreset && format.mode === 'template')
        ? (format.template || '') : null;
      if (format.mode === 'template') {
        this.headerMode = 'template';
        this.headerTemplate = format.template || '';
      } else {
        this.headerMode = 'zones';
        if (format.idFields && format.idFields.length) {
          this.sequenceIdField = format.idFields[0];
        } else if (format.sequenceIdField) {
          this.sequenceIdField = format.sequenceIdField;
        }
        if (format.idDelimiter !== undefined) this.idDelimiter = format.idDelimiter;
        if (format.descriptionDelimiter !== undefined) {
          this.descriptionDelimiter = format.descriptionDelimiter;
        }
        if (format.descriptionFields) {
          const available = this.availableFields;
          this.descriptionFields = format.descriptionFields.map((name) => available
            .filter((f) => f.field === name
              || bareFieldName(f.field) === bareFieldName(name))[0]
            || { field: name, label: name });
        }
        this._populateIdFieldDropdown();
        this._populateFieldLists();
        this._syncDelimiterControls();
      }
      this._syncModeControls();
      this._validateTemplate();
      this._updatePreview();
      this.notifyDataChanged();
    },

    _currentFormatRecord(name) {
      if (this.headerMode === 'template') {
        return {
          name,
          dataType: this.context ? this.context.dataType : undefined,
          mode: 'template',
          template: this.headerTemplate
        };
      }
      return {
        name,
        dataType: this.context ? this.context.dataType : undefined,
        mode: 'zones',
        idFields: [this.sequenceIdField],
        idDelimiter: this.idDelimiter,
        descriptionFields: this.descriptionFields.map((f) => f.field),
        descriptionDelimiter: this.descriptionDelimiter
      };
    }
  }, overrides);

  return step;
}

function withFields(step, names) {
  step.descriptionFields = names.map((n) => {
    const known = AVAILABLE.filter((f) => f.field === n)[0];
    return known || { field: n, label: n };
  });
  return step;
}

describe('applying a saved format', () => {
  test('a template format switches mode and fills the box', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'NCBI', mode: 'template', template: '{patric_id} {product}'
    });

    expect(step.headerMode).toBe('template');
    expect(step.headerTemplate).toBe('{patric_id} {product}');
  });

  test('a zone format restores fields and delimiters', () => {
    const step = makeStep({ headerMode: 'template', headerTemplate: '{x}' });
    step._applyFormat({
      name: 'Mine',
      mode: 'zones',
      idFields: ['genome_name'],
      idDelimiter: '',
      descriptionFields: ['product', 'genome_name'],
      descriptionDelimiter: ', '
    });

    expect(step.headerMode).toBe('zones');
    expect(step.sequenceIdField).toBe('genome_name');
    expect(step.idDelimiter).toBe('');
    expect(step.descriptionDelimiter).toBe(', ');
    expect(step.descriptionFields.map((f) => f.field)).toEqual(['product', 'genome_name']);
  });

  test('an empty delimiter in a stored format is honoured, not defaulted', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'Tight', mode: 'zones', idFields: ['patric_id'],
      idDelimiter: '', descriptionDelimiter: ''
    });

    expect(step.idDelimiter).toBe('');
    expect(step.descriptionDelimiter).toBe('');
  });

  test('an omitted delimiter leaves the current one alone', () => {
    const step = makeStep({ descriptionDelimiter: ' ~ ' });
    step._applyFormat({ name: 'Partial', mode: 'zones', idFields: ['patric_id'] });

    expect(step.descriptionDelimiter).toBe(' ~ ');
  });

  test('description fields are matched to the picker by bare name', () => {
    const step = makeStep();
    // Stored bare, offered prefixed: these are the same field.
    step._applyFormat({
      name: 'S', mode: 'zones', idFields: ['patric_id'], descriptionFields: ['strain']
    });

    expect(step.descriptionFields[0].label).toBe('Genome Strain');
  });

  test('an unknown field is kept rather than dropped', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'S', mode: 'zones', idFields: ['patric_id'],
      descriptionFields: ['some_future_field']
    });

    // Dropping it would silently change what the user saved.
    expect(step.descriptionFields.map((f) => f.field)).toEqual(['some_future_field']);
  });
});

describe('capturing the current configuration', () => {
  test('zone mode records fields and both delimiters', () => {
    const step = withFields(
      makeStep({ idDelimiter: '', descriptionDelimiter: ', ' }),
      ['product', 'genome_name']
    );
    const rec = step._currentFormatRecord('Mine');

    expect(rec).toEqual({
      name: 'Mine',
      dataType: 'genome_feature',
      mode: 'zones',
      idFields: ['patric_id'],
      idDelimiter: '',
      descriptionFields: ['product', 'genome_name'],
      descriptionDelimiter: ', '
    });
  });

  test('template mode records only the template', () => {
    const step = withFields(
      makeStep({ headerMode: 'template', headerTemplate: '{patric_id} {product}' }),
      ['product']
    );
    const rec = step._currentFormatRecord('T');

    expect(rec.mode).toBe('template');
    expect(rec.template).toBe('{patric_id} {product}');
    expect(rec.descriptionFields).toBeUndefined();
    expect(rec.idDelimiter).toBeUndefined();
  });

  test('the data type is recorded, so the format can be filtered later', () => {
    const step = makeStep({ context: { dataType: 'genome_sequence' } });
    expect(step._currentFormatRecord('X').dataType).toBe('genome_sequence');
  });
});

describe('round trip', () => {
  /**
   * The invariant that makes saving worth anything: capture then apply must
   * reproduce the configuration exactly. A drift here means a saved format
   * means something different the next time it is used.
   */
  const CASES = [
    ['default zones', { idDelimiter: '|', descriptionDelimiter: ' | ' }, ['product']],
    ['no trailing id', { idDelimiter: '', descriptionDelimiter: ' | ' }, ['product']],
    ['comma delimited', { idDelimiter: '|', descriptionDelimiter: ', ' }, ['product', 'genome_name']],
    ['empty delimiter', { idDelimiter: '', descriptionDelimiter: '' }, ['product']],
    ['custom delimiter', { idDelimiter: '|', descriptionDelimiter: ' ~~ ' }, ['genome_name']],
    ['no description', { idDelimiter: '|', descriptionDelimiter: ' | ' }, []]
  ];

  test.each(CASES)('%s', (_name, state, fields) => {
    const original = withFields(makeStep(state), fields);
    const record = original._currentFormatRecord('saved');

    const fresh = makeStep();
    fresh._applyFormat(record);

    expect(fresh.headerMode).toBe('zones');
    expect(fresh.sequenceIdField).toBe(original.sequenceIdField);
    expect(fresh.idDelimiter).toBe(original.idDelimiter);
    expect(fresh.descriptionDelimiter).toBe(original.descriptionDelimiter);
    expect(fresh.descriptionFields.map((f) => f.field))
      .toEqual(original.descriptionFields.map((f) => f.field));
  });

  test('template mode round-trips', () => {
    const original = makeStep({
      headerMode: 'template',
      headerTemplate: '{strain}|A|{subtype}|{collection_date}'
    });
    const record = original._currentFormatRecord('flu');

    const fresh = makeStep();
    fresh._applyFormat(record);

    expect(fresh.headerMode).toBe('template');
    expect(fresh.headerTemplate).toBe(original.headerTemplate);
  });

  test('a seeded preset applies to a clean step', () => {
    // Exactly the record shape written to /olson@patricbrc.org/tmp/presets.
    const preset = {
      name: 'GISAID / augur (influenza A)',
      description: 'strain|type|subtype|date|season|country|host|accession',
      dataType: 'genome_feature',
      mode: 'template',
      template: '{strain}|A|{subtype}|{collection_date}||{isolation_country}'
        + '|{host_common_name}|{accession}',
      isPreset: true,
      sourcePath: '/olson@patricbrc.org/tmp/presets/gisaid-influenza-a.json'
    };

    const step = makeStep();
    step._applyFormat(preset);

    expect(step.headerMode).toBe('template');
    expect(step.headerTemplate).toContain('{host_common_name}');
  });
});

describe('presets are read-only', () => {
  test('capturing after applying a preset produces a plain user record', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'NCBI / BLAST (classic)',
      mode: 'template',
      template: '{patric_id} {product} [{genome_name}]',
      isPreset: true,
      sourcePath: '/presets/ncbi-classic.json'
    });

    const rec = step._currentFormatRecord('My NCBI');

    // The load-time annotations must not be carried into a saved copy.
    expect(rec.isPreset).toBeUndefined();
    expect(rec.sourcePath).toBeUndefined();
    expect(rec.name).toBe('My NCBI');
  });
});

describe('an unedited preset is not second-guessed', () => {
  /**
   * Caught in the browser, not by the unit tests: the shipped GISAID preset
   * showed "Unrecognised field {subtype}... (3 more)". Those fields work --
   * they are verified against live alpha -- but they are absent from the
   * picker's hardcoded 30-name list. Warning about a curated preset reads as
   * "this preset is broken", so suppress it until the user edits it.
   */
  test('applying a preset records its template', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'GISAID', mode: 'template', isPreset: true,
      template: '{strain}|A|{subtype}'
    });
    expect(step._appliedPresetTemplate).toBe('{strain}|A|{subtype}');
  });

  test('applying a user format records nothing to suppress', () => {
    const step = makeStep();
    step._applyFormat({ name: 'Mine', mode: 'template', template: '{bogus}' });
    expect(step._appliedPresetTemplate).toBeNull();
  });

  test('a zone preset records nothing — there is no template to compare', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'Z', mode: 'zones', isPreset: true, idFields: ['patric_id']
    });
    expect(step._appliedPresetTemplate).toBeNull();
  });

  test('the suppression is exact-match, so an edit re-enables the check', () => {
    const step = makeStep();
    step._applyFormat({
      name: 'GISAID', mode: 'template', isPreset: true, template: '{strain}|A'
    });

    expect(step._appliedPresetTemplate === step.headerTemplate).toBe(true);

    // User types one more character: no longer pristine.
    step.headerTemplate = '{strain}|A|{x}';
    expect(step._appliedPresetTemplate === step.headerTemplate).toBe(false);
  });
});

describe('implementation stays in step', () => {
  test('the widget wires the store in', () => {
    expect(SRC).toContain("'../../util/FastaFormatStore'");
    expect(SRC).toContain('FastaFormatStore.list(');
    expect(SRC).toContain('FastaFormatStore.save(');
    expect(SRC).toContain('FastaFormatStore.remove(');
    expect(SRC).toContain('FastaFormatStore.canSave()');
  });

  test('delete is gated on the format not being a preset', () => {
    expect(SRC).toMatch(/!selected\.isPreset/);
  });
});
