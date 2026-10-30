/* eslint-env jest */

/**
 * FASTAConfiguratorStep delimiter controls.
 *
 * The widget is a dijit template widget, so instantiating it needs the whole
 * dojo/dijit stack. What matters here is not the DOM plumbing but the state
 * logic layered on top of it: which delimiter a control selects, when the
 * Custom box appears, and -- above all -- that the preview is built from the
 * same values getData() reports. A preview that disagrees with the request is
 * the exact bug this feature exists to fix.
 *
 * So exercise the methods against a minimal stand-in object carrying the real
 * implementations. If the widget's own wiring changes, the integration tests
 * in downloadExecutorFasta.test.js still cover the request end.
 */

/** Mirrors the module-private sentinel in FASTAConfiguratorStep.js. */
const CUSTOM_DELIMITER = '\u0000custom';

const DELIMITER_OPTIONS = [
  { value: ' | ', label: 'Pipe  ( a | b )' },
  { value: '|', label: 'Pipe, no spaces  ( a|b )' },
  { value: ' ', label: 'Space  ( a b )' },
  { value: ', ', label: 'Comma  ( a, b )' },
  { value: '_', label: 'Underscore  ( a_b )' },
  { value: '', label: 'Nothing  ( ab )' }
];

/**
 * A stand-in carrying the step's delimiter logic verbatim. Kept in step with
 * FASTAConfiguratorStep.js by the shape assertions at the bottom of the file.
 */
function makeStep(overrides) {
  const hidden = new Set(['custom']);

  const step = Object.assign({
    sequenceIdField: 'patric_id',
    descriptionFields: [],
    idDelimiter: '|',
    descriptionDelimiter: ' | ',
    delimiterOptions: DELIMITER_OPTIONS,

    // Stand-ins for the template's attach points.
    descDelimiterSelect: { value: ' | ' },
    descDelimiterCustom: { value: '', focus() {}, select() {} },
    idTrailingCheck: { checked: true },

    customVisible() { return !hidden.has('custom'); },
    _showCustom() { hidden.delete('custom'); },
    _hideCustom() { hidden.add('custom'); },

    notifyDataChanged() {},
    _updatePreview() {},

    _buildPreview() {
      const idField = this.sequenceIdField || 'id';
      const descFields = this.descriptionFields.map((f) => f.field);
      const id = idField + (this.idDelimiter || '');
      const parts = ['>' + id];
      if (descFields.length > 0) {
        parts.push(descFields.join(this.descriptionDelimiter));
      }
      return parts.join(' ');
    },

    getData() {
      return {
        sequenceIdField: this.sequenceIdField,
        descriptionFields: this.descriptionFields.map((f) => f.field),
        idDelimiter: this.idDelimiter,
        descriptionDelimiter: this.descriptionDelimiter
      };
    },

    _onDescDelimiterChange() {
      const value = this.descDelimiterSelect.value;
      if (value === CUSTOM_DELIMITER) {
        this._showCustom();
        this.descDelimiterCustom.value = this.descriptionDelimiter;
        return;
      }
      this._hideCustom();
      this.descriptionDelimiter = value;
      this._updatePreview();
      this.notifyDataChanged();
    },

    _onDescDelimiterCustomInput() {
      this.descriptionDelimiter = this.descDelimiterCustom.value;
      this._updatePreview();
      this.notifyDataChanged();
    },

    _onIdTrailingChange() {
      this.idDelimiter = this.idTrailingCheck.checked ? '|' : '';
      this._updatePreview();
      this.notifyDataChanged();
    },

    _syncDelimiterControls() {
      this.idTrailingCheck.checked = (this.idDelimiter === '|');
      const known = this.delimiterOptions.some((o) => o.value === this.descriptionDelimiter);
      if (known) {
        this.descDelimiterSelect.value = this.descriptionDelimiter;
        this._hideCustom();
      } else {
        this.descDelimiterSelect.value = CUSTOM_DELIMITER;
        this.descDelimiterCustom.value = this.descriptionDelimiter;
        this._showCustom();
      }
    }
  }, overrides);

  return step;
}

function withFields(step, names) {
  step.descriptionFields = names.map((n) => ({ field: n, label: n }));
  return step;
}

describe('FASTA delimiter controls', () => {
  describe('description delimiter dropdown', () => {
    test('selecting a named option sets that delimiter', () => {
      const step = makeStep();
      step.descDelimiterSelect.value = ', ';
      step._onDescDelimiterChange();

      expect(step.descriptionDelimiter).toBe(', ');
      expect(step.getData().descriptionDelimiter).toBe(', ');
    });

    test('the empty option is honoured, not treated as unset', () => {
      const step = makeStep();
      step.descDelimiterSelect.value = '';
      step._onDescDelimiterChange();

      // '' means "run the fields together" and must survive to getData(),
      // where DownloadExecutor distinguishes it from undefined.
      expect(step.getData().descriptionDelimiter).toBe('');
      expect(step.getData().descriptionDelimiter).not.toBeUndefined();
    });

    test('every named option round-trips through sync', () => {
      DELIMITER_OPTIONS.forEach((opt) => {
        const step = makeStep({ descriptionDelimiter: opt.value });
        step._syncDelimiterControls();
        expect(step.descDelimiterSelect.value).toBe(opt.value);
        expect(step.customVisible()).toBe(false);
      });
    });
  });

  describe('custom delimiter', () => {
    test('choosing Custom reveals the box seeded with the current value', () => {
      const step = makeStep({ descriptionDelimiter: ' | ' });
      step.descDelimiterSelect.value = CUSTOM_DELIMITER;
      step._onDescDelimiterChange();

      expect(step.customVisible()).toBe(true);
      // Seeded, so switching to Custom is an edit and not a blank slate.
      expect(step.descDelimiterCustom.value).toBe(' | ');
      // Nothing has changed yet -- the delimiter only moves on input.
      expect(step.descriptionDelimiter).toBe(' | ');
    });

    test('typing in the box sets the delimiter verbatim', () => {
      const step = makeStep();
      step.descDelimiterCustom.value = ' :: ';
      step._onDescDelimiterCustomInput();

      expect(step.getData().descriptionDelimiter).toBe(' :: ');
    });

    test('leading and trailing spaces are preserved, not trimmed', () => {
      const step = makeStep();
      step.descDelimiterCustom.value = '   ';
      step._onDescDelimiterCustomInput();

      // Whitespace is the point: ' | ' and '|' produce different headers.
      expect(step.getData().descriptionDelimiter).toBe('   ');
    });

    test('an unrecognised delimiter opens the Custom box on sync', () => {
      const step = makeStep({ descriptionDelimiter: ' ~ ' });
      step._syncDelimiterControls();

      expect(step.descDelimiterSelect.value).toBe(CUSTOM_DELIMITER);
      expect(step.descDelimiterCustom.value).toBe(' ~ ');
      expect(step.customVisible()).toBe(true);
    });
  });

  describe('trailing ID character', () => {
    /**
     * Not a delimiter: the ID selector is single-select, so this only controls
     * whether the header reads '>fig|...peg.9|' or '>fig|...peg.9'.
     */
    test('unchecking clears the trailing character', () => {
      const step = makeStep();
      step.idTrailingCheck.checked = false;
      step._onIdTrailingChange();

      expect(step.getData().idDelimiter).toBe('');
      expect(step._buildPreview()).toBe('>patric_id');
    });

    test('checking restores the pipe', () => {
      const step = makeStep({ idDelimiter: '' });
      step.idTrailingCheck.checked = true;
      step._onIdTrailingChange();

      expect(step.getData().idDelimiter).toBe('|');
      expect(step._buildPreview()).toBe('>patric_id|');
    });

    test('sync reflects a loaded value', () => {
      const step = makeStep({ idDelimiter: '' });
      step._syncDelimiterControls();
      expect(step.idTrailingCheck.checked).toBe(false);
    });
  });

  describe('preview agrees with getData', () => {
    /**
     * The invariant the whole feature rests on. The original bug was a preview
     * built from a different hardcoded delimiter than the request carried.
     */
    function renderLikeServer(data) {
      const parts = ['>' + data.sequenceIdField + data.idDelimiter];
      if (data.descriptionFields.length > 0) {
        parts.push(data.descriptionFields.join(data.descriptionDelimiter));
      }
      return parts.join(' ');
    }

    test.each([
      [' | ', '|'],
      ['|', '|'],
      [' ', '|'],
      [', ', ''],
      ['', ''],
      [' ~~ ', '|']
    ])('delimiter %p / trailing %p', (descDelim, idDelim) => {
      const step = withFields(
        makeStep({ descriptionDelimiter: descDelim, idDelimiter: idDelim }),
        ['strain', 'host_name', 'isolation_country']
      );

      expect(step._buildPreview()).toBe(renderLikeServer(step.getData()));
    });

    test('matches a real alpha header for the default configuration', () => {
      const step = withFields(makeStep(), ['strain', 'host_name', 'isolation_country']);

      // Field names stand in for values in the preview, but the separators
      // must match what alpha produced for this configuration:
      //   >fig|1545742.911.peg.9| MGYG-HGUT-00869 | Human | USA
      expect(step._buildPreview())
        .toBe('>patric_id| strain | host_name | isolation_country');
    });
  });

  describe('implementation stays in step', () => {
    /**
     * This file reimplements the widget's logic to avoid booting dijit, so
     * guard the two constants that must not drift apart silently.
     */
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'FASTAConfiguratorStep.js'), 'utf8'
    );

    test('the sentinel matches the widget', () => {
      expect(src).toContain("var CUSTOM_DELIMITER = '\\u0000custom'");
    });

    test('the widget offers exactly the options tested here', () => {
      DELIMITER_OPTIONS.forEach((opt) => {
        expect(src).toContain("label: '" + opt.label + "'");
      });
      const count = (src.match(/^\s+\{ value: .*label: /gm) || []).length;
      expect(count).toBe(DELIMITER_OPTIONS.length);
    });
  });
});
