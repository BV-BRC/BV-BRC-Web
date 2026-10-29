/* eslint-env jest */
const path = require('path');

const PlanResultSanitizer = require(path.join(__dirname, '..', 'PlanResultSanitizer.js'));

describe('PlanResultSanitizer', () => {
  test('keeps only bounded fields needed by later plan steps', () => {
    const source = {
      answer: 'a'.repeat(5000),
      status: 'completed',
      sources: Array.from({ length: 25 }, (_, index) => ({ id: index })),
      structured_data: {
        record_ids: Array.from({ length: 250 }, (_, index) => `genome-${index}`),
        record_count: 250
      },
      service_name: 'GenomeAssembly2',
      workflow_id: 'wf-123',
      tool_trace: [{ result: 'raw result' }],
      messages: [{ content: 'internal prompt' }],
      raw: { records: Array(1000).fill('large') },
      result_for_ui: { grid: true },
      manifest: { steps: Array(100).fill({}) }
    };

    const result = PlanResultSanitizer.sanitizeResult(source);

    expect(result.answer.length).toBeLessThanOrEqual(4000);
    expect(result.sources).toHaveLength(20);
    expect(result.sources_total).toBe(25);
    expect(result.structured_data.record_ids).toHaveLength(200);
    expect(result.structured_data.record_ids_total).toBe(250);
    expect(result.structured_data.record_count).toBe(250);
    expect(result.service_name).toBe('GenomeAssembly2');
    expect(result.workflow_id).toBe('wf-123');
    expect(result).not.toHaveProperty('tool_trace');
    expect(result).not.toHaveProperty('messages');
    expect(result).not.toHaveProperty('raw');
    expect(result).not.toHaveProperty('result_for_ui');
    expect(result).not.toHaveProperty('manifest');
  });

  test('uses structured data override without mutating event data', () => {
    const agentResult = {
      answer: 'done',
      structured_data: { ids: ['old'] },
      tool_trace: [{ result: 'raw' }]
    };
    const override = {
      selected_ids: Array.from({ length: 205 }, (_, index) => `id-${index}`)
    };

    const result = PlanResultSanitizer.sanitizeResult(agentResult, override);

    expect(result.structured_data.selected_ids).toHaveLength(200);
    expect(result.structured_data.selected_ids_total).toBe(205);
    expect(agentResult.structured_data.ids).toEqual(['old']);
    expect(agentResult).toHaveProperty('tool_trace');
    expect(override.selected_ids).toHaveLength(205);
  });

  test('sanitizes restored completed results as a new object', () => {
    const restored = {
      step_1: {
        answer: 'complete',
        status: 'completed',
        tool_trace: [{ result: 'large' }]
      }
    };

    const sanitized = PlanResultSanitizer.sanitizeCompletedResults(restored);

    expect(sanitized).not.toBe(restored);
    expect(sanitized.step_1).toEqual({
      answer: 'complete',
      status: 'completed'
    });
    expect(restored.step_1).toHaveProperty('tool_trace');
  });

  test('keeps workflow completion identifiers but drops UI payloads', () => {
    const completion = {
      status: 'succeeded',
      workflow_id: 'wf-1',
      workflow_name: 'assembly',
      submission_id: 'submission-1',
      output_paths: ['/large/path'],
      manifest: { steps: [{ raw: 'data' }] }
    };

    expect(PlanResultSanitizer.sanitizeResult(completion)).toEqual({
      status: 'succeeded',
      workflow_id: 'wf-1',
      workflow_name: 'assembly',
      submission_id: 'submission-1'
    });
  });

  test('keeps what the next plan step needs: submission_ids, result_summary, step_outputs (D4 Phase 3)', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `fig|1.1.peg.${i}`);
    const out = PlanResultSanitizer.sanitizeResult({
      answer: 'done',
      submission_ids: ['sub_1', 'sub_2'],
      result_summary: 'Created the group.',
      step_outputs: {
        groups: [{ path: '/u/home/Feature Groups/g', count: 100 }],
        ids: ids,
        values: { plfam_id: 'PLF_1763_00002110' }
      }
    });
    expect(out.submission_ids).toEqual(['sub_1', 'sub_2']);
    expect(out.result_summary).toBe('Created the group.');
    expect(out.step_outputs.groups[0].path).toBe('/u/home/Feature Groups/g');
    expect(out.step_outputs.values.plfam_id).toBe('PLF_1763_00002110');
    expect(out.step_outputs.ids).toHaveLength(200);
  });
});
