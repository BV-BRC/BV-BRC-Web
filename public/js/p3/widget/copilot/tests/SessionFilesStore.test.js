/* eslint-env jest */
const path = require('path');

const SessionFilesStore = require(path.join(__dirname, '..', 'SessionFilesStore.js'));

describe('SessionFilesStore', () => {
  test('initial fetch render state is populated', () => {
    const state = SessionFilesStore.createInitialState('s1', 20);
    const response = {
      session_id: 's1',
      files: [
        { file_id: 'f1', file_name: 'file-a.tsv', tool_id: 'query', created_at: '2026-01-01T00:00:00Z' }
      ],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
      summary: { total_files: 1, total_size_bytes: 12 }
    };

    SessionFilesStore.applyFetchResponse(state, response, false);

    expect(state.files).toHaveLength(1);
    expect(state.files[0].file_id).toBe('f1');
    expect(state.pagination.has_more).toBe(false);
    expect(state.summary.total_files).toBe(1);
  });

  test('pagination append adds next page', () => {
    const state = SessionFilesStore.createInitialState('s1', 1);
    SessionFilesStore.applyFetchResponse(state, {
      files: [{ file_id: 'f1', file_name: 'a' }],
      pagination: { total: 3, limit: 1, offset: 0, has_more: true },
      summary: { total_files: 3, total_size_bytes: 30 }
    }, false);

    SessionFilesStore.applyFetchResponse(state, {
      files: [{ file_id: 'f2', file_name: 'b' }],
      pagination: { total: 3, limit: 1, offset: 1, has_more: true },
      summary: { total_files: 3, total_size_bytes: 30 }
    }, true);

    expect(state.files.map((f) => f.file_id)).toEqual(['f1', 'f2']);
    expect(state.pagination.offset).toBe(1);
    expect(state.pagination.has_more).toBe(true);
  });

  test('SSE insert prepends new file', () => {
    const state = SessionFilesStore.createInitialState('s1', 20);
    SessionFilesStore.applyFetchResponse(state, {
      files: [{ file_id: 'f1', file_name: 'a' }],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
      summary: { total_files: 1, total_size_bytes: 1 }
    }, false);

    SessionFilesStore.insertRealtimeFile(state, {
      session_id: 's1',
      tool: 'workspace_list',
      file: {
        file_id: 'f2',
        file_name: 'new-file.tsv'
      }
    });

    expect(state.files.map((f) => f.file_id)).toEqual(['f2', 'f1']);
    expect(state.files[0].tool_id).toBe('workspace_list');
  });

  test('dedupe by file_id across SSE and pagination fetch', () => {
    const state = SessionFilesStore.createInitialState('s1', 20);
    SessionFilesStore.insertRealtimeFile(state, {
      session_id: 's1',
      tool: 'query',
      file: {
        file_id: 'f1',
        file_name: 'dedupe.tsv'
      }
    });

    SessionFilesStore.applyFetchResponse(state, {
      files: [{ file_id: 'f1', file_name: 'dedupe.tsv', tool_id: 'query' }],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
      summary: { total_files: 1, total_size_bytes: 1 }
    }, true);

    expect(state.files).toHaveLength(1);
    expect(state.files[0].file_id).toBe('f1');
  });

  test('session switch reset clears previous session files', () => {
    const state = SessionFilesStore.createInitialState('s1', 20);
    SessionFilesStore.applyFetchResponse(state, {
      files: [{ file_id: 'f1', file_name: 'old-file.tsv' }],
      pagination: { total: 1, limit: 20, offset: 0, has_more: false },
      summary: { total_files: 1, total_size_bytes: 10 }
    }, false);

    SessionFilesStore.resetForSession(state, 's2');

    expect(state.sessionId).toBe('s2');
    expect(state.files).toHaveLength(0);
    expect(state.pagination.has_more).toBe(false);
    expect(state.summary.total_files).toBe(0);
  });

  test('error state handling stores error and clears loading', () => {
    const state = SessionFilesStore.createInitialState('s1', 20);
    SessionFilesStore.setLoading(state, true);

    const err = new Error('boom');
    SessionFilesStore.setError(state, err);

    expect(state.loading).toBe(false);
    expect(state.error).toBe(err);
  });
});

