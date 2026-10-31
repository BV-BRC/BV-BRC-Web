/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * FASTA format-string (template) mode.
 *
 * The pure helpers -- template parsing, syntax validation, field-name
 * normalisation -- are lifted out of FASTAConfiguratorStep.js by evaluating
 * the source with a define shim, so they are the real implementations rather
 * than copies. The widget methods that need DOM attach points are exercised
 * against a stand-in, as in fastaDelimiterControls.test.js.
 */

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'FASTAConfiguratorStep.js'), 'utf8'
);

/**
 * Pull the module-private helpers out of the AMD factory.
 *
 * The factory body is evaluated with stubbed dependencies and a trailing
 * return, which hands back the helpers the widget closes over. This keeps the
 * tests honest: a change to templateFields() or validateTemplateSyntax() is
 * seen here immediately.
 */
function loadHelpers() {
  let captured;
  const define = function (deps, factory) {
    const src = factory.toString();
    const bodyStart = src.indexOf('{') + 1;
    const bodyEnd = src.lastIndexOf('}');
    const body = src.slice(bodyStart, bodyEnd);
    // Re-evaluate the factory body with a different tail: instead of
    // returning the declared widget, return the helpers.
    const upToReturn = body.slice(0, body.indexOf('return declare('));
    // eslint-disable-next-line no-new-func
    captured = new Function(
      'declare', 'lang', 'on', 'domClass', 'domConstruct', 'query',
      'WizardStepBase', 'template', 'DownloadFormats',
      upToReturn + `
      return {
        bareFieldName: bareFieldName,
        templateFields: templateFields,
        validateTemplateSyntax: validateTemplateSyntax,
        closeTo: closeTo,
        bestSuggestion: bestSuggestion,
        ESCAPED_OPEN: ESCAPED_OPEN,
        ESCAPED_CLOSE: ESCAPED_CLOSE,
        TEMPLATE_FIELD: TEMPLATE_FIELD
      };`
    )(
      function () {}, {}, function () {}, {}, {}, function () {},
      function () {}, '', {}
    );
  };
  // eslint-disable-next-line no-new-func
  new Function('define', SRC)(define);
  return captured;
}

const H = loadHelpers();

/** The widget's preview and mode logic, against stand-in attach points. */
function makeStep(overrides) {
  return Object.assign({
    sequenceIdField: 'patric_id',
    descriptionFields: [],
    idDelimiter: '|',
    descriptionDelimiter: ' | ',
    headerMode: 'zones',
    headerTemplate: '',
    availableFields: [
      { field: 'patric_id', label: 'BV-BRC ID' },
      { field: 'product', label: 'Product' },
      { field: 'genome_name', label: 'Genome Name' },
      { field: 'genome_metadata.strain', label: 'Genome Strain' },
      { field: 'host_name', label: 'Host Name' }
    ],

    _templateFromZones() {
      const idField = H.bareFieldName(this.sequenceIdField || 'id');
      const parts = ['{' + idField + '}' + (this.idDelimiter || '')];
      if (this.descriptionFields.length > 0) {
        parts.push(this.descriptionFields
          .map((f) => '{' + H.bareFieldName(f.field) + '}')
          .join(this.descriptionDelimiter));
      }
      return parts.join(' ');
    },

    _buildPreview() {
      if (this.headerMode === 'template') {
        let masked = String(this.headerTemplate || '');
        masked = masked.split('{{').join(H.ESCAPED_OPEN);
        masked = masked.split('}}').join(H.ESCAPED_CLOSE);
        let rendered = masked.replace(H.TEMPLATE_FIELD, (match, raw) => {
          const name = raw.trim();
          return name || match;
        });
        rendered = rendered.split(H.ESCAPED_OPEN).join('{');
        rendered = rendered.split(H.ESCAPED_CLOSE).join('}');
        return '>' + rendered;
      }
      const idField = this.sequenceIdField || 'id';
      const descFields = this.descriptionFields.map((f) => f.field);
      const parts = ['>' + idField + (this.idDelimiter || '')];
      if (descFields.length > 0) {
        parts.push(descFields.join(this.descriptionDelimiter));
      }
      return parts.join(' ');
    },

    _validateTemplate() {
      if (this.headerMode !== 'template') return {};
      const error = H.validateTemplateSyntax(this.headerTemplate);
      let warning = null;
      if (!error) {
        const known = this.availableFields.map((f) => H.bareFieldName(f.field));
        const unrecognised = H.templateFields(this.headerTemplate)
          .filter((n) => known.indexOf(n) === -1);
        if (unrecognised.length > 0) {
          const name = unrecognised[0];
          const suggestion = H.bestSuggestion(name, known);
          warning = suggestion
            ? 'Unrecognised field {' + name + '} \u2014 did you mean {' + suggestion + '}?'
            : 'Unrecognised field {' + name + '}. If the collection has it the '
              + 'download will still work; if not, it will be left blank.';
          if (unrecognised.length > 1) {
            warning += ' (' + (unrecognised.length - 1) + ' more)';
          }
        }
      }
      return { error: error, warning: warning };
    },

    getData() {
      if (this.headerMode === 'template') {
        return {
          headerMode: 'template',
          headerTemplate: this.headerTemplate,
          sequenceIdField: this.sequenceIdField
        };
      }
      return {
        headerMode: 'zones',
        sequenceIdField: this.sequenceIdField,
        descriptionFields: this.descriptionFields.map((f) => f.field),
        idDelimiter: this.idDelimiter,
        descriptionDelimiter: this.descriptionDelimiter
      };
    }
  }, overrides);
}

function withFields(step, names) {
  step.descriptionFields = names.map((n) => ({ field: n, label: n }));
  return step;
}

describe('FASTA template mode', () => {
  describe('field name normalisation', () => {
    /**
     * Enriched fields work under either name in zone mode, but a template
     * accepts only the bare one -- the prefixed form renders empty. Measured
     * on alpha:
     *   zone     genome_metadata.strain -> MGYG-HGUT-00869
     *   template {genome_metadata.strain} -> (empty)
     *   template {strain}                 -> MGYG-HGUT-00869
     */
    test('strips the join prefix', () => {
      expect(H.bareFieldName('genome_metadata.strain')).toBe('strain');
      expect(H.bareFieldName('genome_metadata.genome_status')).toBe('genome_status');
    });

    test('leaves an unprefixed name alone', () => {
      expect(H.bareFieldName('patric_id')).toBe('patric_id');
      expect(H.bareFieldName('product')).toBe('product');
    });

    test('only strips at the start', () => {
      expect(H.bareFieldName('x.genome_metadata.strain'))
        .toBe('x.genome_metadata.strain');
    });
  });

  describe('seeding from the zone selection', () => {
    test('produces a template matching the current picker state', () => {
      const step = withFields(makeStep(), ['product', 'genome_name']);
      expect(step._templateFromZones())
        .toBe('{patric_id}| {product} | {genome_name}');
    });

    test('normalises prefixed field names, which would otherwise be empty', () => {
      const step = withFields(makeStep(), ['genome_metadata.strain']);
      const seeded = step._templateFromZones();

      expect(seeded).toBe('{patric_id}| {strain}');
      expect(seeded).not.toContain('genome_metadata.');
    });

    test('honours the delimiters', () => {
      const step = withFields(
        makeStep({ descriptionDelimiter: ', ', idDelimiter: '' }),
        ['product', 'host_name']
      );
      expect(step._templateFromZones()).toBe('{patric_id} {product}, {host_name}');
    });

    test('an ID with no description fields', () => {
      expect(makeStep()._templateFromZones()).toBe('{patric_id}|');
    });
  });

  describe('syntax validation', () => {
    test('accepts a well-formed template', () => {
      expect(H.validateTemplateSyntax('{patric_id} {product}')).toBeNull();
    });

    test('rejects an empty template', () => {
      expect(H.validateTemplateSyntax('')).toMatch(/Enter a format string/);
      expect(H.validateTemplateSyntax('   ')).toMatch(/Enter a format string/);
    });

    test('rejects unbalanced braces', () => {
      expect(H.validateTemplateSyntax('{patric_id')).toMatch(/Unbalanced braces/);
      expect(H.validateTemplateSyntax('patric_id}')).toMatch(/Unbalanced braces/);
    });

    test('rejects an empty field reference', () => {
      expect(H.validateTemplateSyntax('{patric_id}{}')).toMatch(/Empty field reference/);
    });

    test('accepts escaped braces', () => {
      expect(H.validateTemplateSyntax('{{literal}} {patric_id}')).toBeNull();
    });
  });

  describe('field extraction', () => {
    test('finds referenced fields in order', () => {
      expect(H.templateFields('{a}|{b} {c}')).toEqual(['a', 'b', 'c']);
    });

    test('de-duplicates', () => {
      expect(H.templateFields('{a} {a} {b}')).toEqual(['a', 'b']);
    });

    test('ignores escaped braces', () => {
      expect(H.templateFields('{{notafield}} {real}')).toEqual(['real']);
    });

    test('trims whitespace inside the braces', () => {
      expect(H.templateFields('{ a }')).toEqual(['a']);
    });
  });

  describe('unrecognised field detection', () => {
    /**
     * Worth flagging because the deployed API renders an unknown field as an
     * empty string and returns 200 -- contrary to its documented contract --
     * so nothing else catches a typo. Measured: {hostname} -> ">CY086966".
     *
     * But a WARNING, not an error: the picker's hardcoded list knows 30 names
     * while the collection accepts 88, so a template can reference a field we
     * do not know about and still work. Blocking would refuse valid
     * templates, which is worse than the typo we are guarding against.
     */
    test('warns about a field not in our list', () => {
      const step = makeStep({ headerMode: 'template', headerTemplate: '{bogus}' });
      const r = step._validateTemplate();

      expect(r.warning).toMatch(/Unrecognised field \{bogus\}/);
      expect(r.error).toBeFalsy();
    });

    test('suggests a near miss', () => {
      const step = makeStep({ headerMode: 'template', headerTemplate: '{producr}' });
      expect(step._validateTemplate().warning).toMatch(/did you mean \{product\}\?/);
    });

    test('suggests the CLOSEST match, not the first one in range', () => {
      // Measured in the browser: with a boolean closeTo() this suggested
      // {host_age} for {hostname}, because host_age came first in the
      // field list and was also within the distance threshold.
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{hostname}',
        availableFields: [
          { field: 'host_age', label: 'Host Age' },
          { field: 'host_name', label: 'Host Name' },
          { field: 'host_group', label: 'Host Group' }
        ]
      });
      expect(step._validateTemplate().warning).toMatch(/did you mean \{host_name\}\?/);
    });

    test('explains itself when there is no near miss', () => {
      const step = makeStep({ headerMode: 'template', headerTemplate: '{zzz_nothing}' });
      expect(step._validateTemplate().warning)
        .toMatch(/If the collection has it the download will still work/);
    });

    test('counts additional unrecognised fields', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{nope1} {nope2} {nope3}'
      });
      expect(step._validateTemplate().warning).toMatch(/\(2 more\)/);
    });

    test('accepts the bare form of a prefixed picker field', () => {
      const step = makeStep({ headerMode: 'template', headerTemplate: '{strain}' });
      expect(step._validateTemplate().warning).toBeNull();
    });

    test('warns on the prefixed form, which would render empty', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{genome_metadata.strain}'
      });
      expect(step._validateTemplate().warning).toMatch(/Unrecognised field/);
    });

    test('passes a valid template', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{patric_id} {product} [{genome_name}]'
      });
      const r = step._validateTemplate();
      expect(r.error).toBeNull();
      expect(r.warning).toBeNull();
    });

    test('no complaint in zone mode', () => {
      const step = makeStep({ headerTemplate: '{bogus}' });
      expect(step._validateTemplate()).toEqual({});
    });

    test('a syntax problem IS an error, and blocks', () => {
      const step = makeStep({ headerMode: 'template', headerTemplate: '{patric_id' });
      expect(step._validateTemplate().error).toMatch(/Unbalanced braces/);
    });
  });

  describe('preview', () => {
    test('substitutes field names', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{patric_id}|{genome_name} {product}'
      });
      expect(step._buildPreview()).toBe('>patric_id|genome_name product');
    });

    test('preserves literal text and punctuation', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{patric_id} [organism={genome_name}]'
      });
      expect(step._buildPreview()).toBe('>patric_id [organism=genome_name]');
    });

    test('renders escaped braces as literal braces', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{{x}} {patric_id}'
      });
      expect(step._buildPreview()).toBe('>{x} patric_id');
    });

    test('a sentinel cannot be forged from typed text', () => {
      // The masking sentinels must not be strings a user can type; if they
      // were, this would come back with braces where the words had been.
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: 'openbrace closebrace {patric_id}'
      });
      expect(step._buildPreview()).toBe('>openbrace closebrace patric_id');
    });
  });

  describe('the two modes are exclusive', () => {
    /**
     * The server ignores the zone parameters when http_fasta_header is
     * present, so getData() must carry one or the other -- never both.
     */
    test('template mode omits the zone fields', () => {
      const step = withFields(
        makeStep({ headerMode: 'template', headerTemplate: '{patric_id}' }),
        ['product']
      );
      const data = step.getData();

      expect(data.headerTemplate).toBe('{patric_id}');
      expect(data.descriptionFields).toBeUndefined();
      expect(data.descriptionDelimiter).toBeUndefined();
      expect(data.idDelimiter).toBeUndefined();
    });

    test('zone mode omits the template', () => {
      const step = withFields(makeStep(), ['product']);
      const data = step.getData();

      expect(data.headerMode).toBe('zones');
      expect(data.headerTemplate).toBeUndefined();
      expect(data.descriptionFields).toEqual(['product']);
    });

    test('switching to template and back keeps the zone selection', () => {
      const step = withFields(makeStep(), ['product', 'genome_name']);

      step.headerMode = 'template';
      step.headerTemplate = step._templateFromZones();
      expect(step.getData().descriptionFields).toBeUndefined();

      step.headerMode = 'zones';
      expect(step.getData().descriptionFields).toEqual(['product', 'genome_name']);
    });
  });

  describe('verified preset format strings', () => {
    /**
     * From REPORT-fasta-header-presets.md, all confirmed against live alpha.
     * They must validate against the field registry and preview sensibly.
     */
    const PRESETS = [
      ['Classic NCBI', '{patric_id} {product} [{genome_name}]'],
      ['Bacterial metadata', '{patric_id} {product} [{genome_name}] [{host_name}]']
    ];

    test.each(PRESETS)('%s has no syntax error', (_name, tpl) => {
      const step = makeStep({ headerMode: 'template', headerTemplate: tpl });
      expect(step._validateTemplate().error).toBeNull();
    });

    test('Classic NCBI previews with the right separators', () => {
      const step = makeStep({
        headerMode: 'template',
        headerTemplate: '{patric_id} {product} [{genome_name}]'
      });
      // alpha rendered:
      //   >fig|646741.3.CDS.1 putative polymerase PA, fragment [Influenza A…]
      expect(step._buildPreview()).toBe('>patric_id product [genome_name]');
    });
  });

  describe('implementation stays in step', () => {
    test('the widget still sends http_fasta_header for a template', () => {
      const exec = fs.readFileSync(
        path.join(__dirname, '..', '..', '..', 'util', 'DownloadExecutor.js'), 'utf8'
      );
      expect(exec).toContain('http_fasta_header');
      expect(exec).toContain('cfg.headerTemplate');
    });
  });
});
