/* eslint-env jest */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'PPI.js');
const src = fs.readFileSync(SRC, 'utf8');
const TEMPLATE = path.resolve(__dirname, '..', 'templates', 'PPI.html');
const template = fs.readFileSync(TEMPLATE, 'utf8');

function grab(name) {
  const i = src.indexOf('\n    ' + name + ': function');
  if (i < 0) { throw new Error('method not found: ' + name); }
  const sig = src.indexOf('function', i);
  const paren = src.indexOf('(', sig);
  const parenEnd = src.indexOf(')', paren);
  const params = src.slice(paren, parenEnd + 1);
  let j = src.indexOf('{', parenEnd);
  let depth = 0;
  let k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') {
      depth++;
    } else if (src[k] === '}') {
      depth--;
      if (depth === 0) { break; }
    }
  }
  return { params: params, body: src.slice(j, k + 1) };
}

function method(name) {
  const value = grab(name);
  /* eslint-disable no-eval */
  return eval('(function' + value.params + value.body + ')');
  /* eslint-enable no-eval */
}

function widget(value) {
  return {
    get: function (name) { return name === 'checked' ? !!value : value; },
    set: function (name, next) { value = next; }
  };
}

function makeApp(querySource, targetSource) {
  const app = {
    queryFile: widget(querySource === 'file'),
    queryGroup: widget(querySource === 'group'),
    queryPaste: widget(querySource === 'paste'),
    targetFile: widget(targetSource === 'file'),
    targetGroup: widget(targetSource === 'group'),
    targetPaste: widget(targetSource === 'paste'),
    queryFileInput: widget('/workspace/query.faa'),
    queryGroupInput: widget('/workspace/query-feature-group'),
    queryPasteInput: widget('MPEPTIDE'),
    targetFileInput: widget('/workspace/target.faa'),
    targetGroupInput: widget('/workspace/target-feature-group'),
    targetPasteInput: widget('MTARGET'),
    output_path: widget('/workspace/results'),
    output_file: widget('ppi-results'),
    validateFasta: function (value, type, replace, name) {
      return { trimFasta: value[0] === '>' ? value : '>' + name + '\n' + value };
    }
  };
  ['_selectedSource', '_sourceParameter', '_defaultJobName',
    '_fastaValue', 'getValues'].forEach(function (name) {
    app[name] = method(name);
  });
  return app;
}

describe('PPI input mapping', () => {
  test('renders feature-group workspace selectors for both protein inputs', () => {
    expect(template.match(/>Select Feature Group<\/label>/g)).toHaveLength(2);
    expect(template.match(/type:\['feature_group'\],multi:false/g)).toHaveLength(2);
    expect(template).not.toContain('BV-BRC protein IDs');
  });

  test('renders a required Output Name workspace filename field', () => {
    expect(template).toContain('<label>Output Name</label>');
    expect(template).toContain('data-dojo-attach-point="output_file"');
    expect(template).toContain('data-dojo-type="p3/widget/WorkspaceFilenameValidationTextBox"');
  });

  test.each([
    ['file', 'file'], ['file', 'group'], ['file', 'paste'],
    ['group', 'file'], ['group', 'group'], ['group', 'paste'],
    ['paste', 'file'], ['paste', 'group'], ['paste', 'paste']
  ])('maps query %s and target %s without leaking inactive values', (querySource, targetSource) => {
    const app = makeApp(querySource, targetSource);
    const values = app.getValues();
    const queryField = app._sourceParameter('query', querySource);
    const targetField = app._sourceParameter('target', targetSource);
    const allInputFields = [
      'query_fasta_file', 'query_feature_group', 'query_fasta_keyboard_input',
      'target_fasta_file', 'target_feature_group', 'target_fasta_keyboard_input'
    ];

    allInputFields.forEach(function (field) {
      if (field === queryField || field === targetField) {
        expect(values[field]).toBeTruthy();
      } else {
        expect(values).not.toHaveProperty(field);
      }
    });

    if (querySource === 'group') {
      expect(values.query_feature_group).toEqual(['/workspace/query-feature-group']);
    }
    if (targetSource === 'group') {
      expect(values.target_feature_group).toEqual(['/workspace/target-feature-group']);
    }
    expect(values.output_path).toBe('/workspace/results');
    expect(values.threshold).toBe(0.5);
    expect(values.seq_type).toBe(2);
    expect(values.output_file).toBe('ppi-results');
  });

  test('normalizes a pasted sequence into FASTA', () => {
    const values = makeApp('paste', 'paste').getValues();
    expect(values.query_fasta_keyboard_input).toBe('>query_1\nMPEPTIDE');
    expect(values.target_fasta_keyboard_input).toBe('>target_1\nMTARGET');
  });

  test('requires a selected feature group when feature-group mode is active', () => {
    const app = makeApp('group', 'paste');
    app.queryMessage = { textContent: '' };
    app._validateSide = method('_validateSide');

    expect(app._validateSide('query', false)).toBe(true);
    app.queryGroupInput.set('value', '');
    expect(app._validateSide('query', false)).toBe(false);
  });

  test('reset restores paste modes, clears inputs, and restores the default output folder', () => {
    const app = makeApp('file', 'group');
    app.inherited = jest.fn();
    app.queryMessage = { textContent: 'old query error' };
    app.targetMessage = { textContent: 'old target error' };
    app.defaultPath = '/workspace/default';
    app.queryValid = true;
    app.targetValid = true;
    app.onQuerySourceChange = jest.fn();
    app.onTargetSourceChange = jest.fn();
    app.checkParameterRequiredFields = jest.fn();
    app.reset = method('reset');

    app.reset();

    expect(app.inherited).toHaveBeenCalled();
    expect(app._selectedSource('query')).toBe('paste');
    expect(app._selectedSource('target')).toBe('paste');
    expect(app.queryPasteInput.get('value')).toBe('');
    expect(app.queryFileInput.get('value')).toBe('');
    expect(app.queryGroupInput.get('value')).toBe('');
    expect(app.targetPasteInput.get('value')).toBe('');
    expect(app.targetFileInput.get('value')).toBe('');
    expect(app.targetGroupInput.get('value')).toBe('');
    expect(app.output_path.get('value')).toBe('/workspace/default');
    expect(app.output_file.get('value')).toMatch(/^PPI-\d{8}-\d{6}-\d{3}$/);
    expect(app.queryMessage.textContent).toBe('');
    expect(app.targetMessage.textContent).toBe('');
    expect(app.queryValid).toBe(false);
    expect(app.targetValid).toBe(false);
    expect(app.onQuerySourceChange).toHaveBeenCalled();
    expect(app.onTargetSourceChange).toHaveBeenCalled();
    expect(app.checkParameterRequiredFields).toHaveBeenCalled();
  });
});
