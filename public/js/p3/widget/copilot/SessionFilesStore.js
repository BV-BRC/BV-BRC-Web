(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CopilotSessionFilesStore = factory();
    }
}(this, function() {
    function createInitialState(sessionId, pageSize) {
        return {
            sessionId: sessionId || null,
            files: [],
            fileIds: {},
            pagination: {
                total: 0,
                limit: pageSize || 20,
                offset: 0,
                has_more: false
            },
            summary: {
                total_files: 0,
                total_size_bytes: 0
            },
            loading: false,
            error: null
        };
    }

    function normalizeSessionFile(file, fallbackTool) {
        var source = file || {};
        var workspace = source.workspace || {};
        return {
            file_id: source.file_id || null,
            file_name: source.file_name || source.name || 'Untitled file',
            tool_id: source.tool_id || source.tool || fallbackTool || null,
            created_at: source.created_at || source.timestamp || null,
            last_accessed: source.last_accessed || null,
            data_type: source.data_type || null,
            size_bytes: typeof source.size_bytes === 'number' ? source.size_bytes : null,
            size_formatted: source.size_formatted || null,
            record_count: typeof source.record_count === 'number' ? source.record_count : null,
            fields: Array.isArray(source.fields) ? source.fields : [],
            is_error: Boolean(source.is_error),
            workspace_path: source.workspace_path || workspace.path || null,
            workspace_url: source.workspace_url || workspace.url || null,
            query_parameters: source.query_parameters || null,
            summary: source.summary || null
        };
    }

    function _fileIdentity(file) {
        if (file && file.file_id) return 'id:' + file.file_id;
        var name = file && file.file_name ? file.file_name : '';
        var created = file && file.created_at ? file.created_at : '';
        var tool = file && file.tool_id ? file.tool_id : '';
        return 'fallback:' + name + '|' + created + '|' + tool;
    }

    function _rememberFile(state, file) {
        state.fileIds[_fileIdentity(file)] = true;
    }

    function _hasFile(state, file) {
        return Boolean(state.fileIds[_fileIdentity(file)]);
    }

    function applyFetchResponse(state, response, append) {
        var res = response || {};
        var incoming = Array.isArray(res.files) ? res.files : [];
        var normalized = incoming.map(function(file) {
            return normalizeSessionFile(file, null);
        });

        if (!append) {
            state.files = [];
            state.fileIds = {};
        }

        normalized.forEach(function(file) {
            if (!_hasFile(state, file)) {
                state.files.push(file);
                _rememberFile(state, file);
            }
        });

        state.pagination = {
            total: res.pagination && typeof res.pagination.total === 'number' ? res.pagination.total : state.files.length,
            limit: res.pagination && typeof res.pagination.limit === 'number' ? res.pagination.limit : state.pagination.limit,
            offset: res.pagination && typeof res.pagination.offset === 'number' ? res.pagination.offset : state.pagination.offset,
            has_more: Boolean(res.pagination && res.pagination.has_more)
        };

        state.summary = {
            total_files: res.summary && typeof res.summary.total_files === 'number' ? res.summary.total_files : state.files.length,
            total_size_bytes: res.summary && typeof res.summary.total_size_bytes === 'number' ? res.summary.total_size_bytes : state.summary.total_size_bytes
        };

        state.error = null;
        state.loading = false;
        return state;
    }

    function insertRealtimeFile(state, eventPayload) {
        var payload = eventPayload || {};
        var normalized = normalizeSessionFile(payload.file, payload.tool);
        if (_hasFile(state, normalized)) {
            return state;
        }

        state.files.unshift(normalized);
        _rememberFile(state, normalized);
        state.summary.total_files = Math.max(state.summary.total_files || 0, state.files.length);
        return state;
    }

    function resetForSession(state, sessionId) {
        var next = createInitialState(sessionId, state && state.pagination ? state.pagination.limit : 20);
        state.sessionId = next.sessionId;
        state.files = next.files;
        state.fileIds = next.fileIds;
        state.pagination = next.pagination;
        state.summary = next.summary;
        state.loading = next.loading;
        state.error = next.error;
        return state;
    }

    function setLoading(state, loading) {
        state.loading = Boolean(loading);
        return state;
    }

    function setError(state, error) {
        state.error = error || null;
        state.loading = false;
        return state;
    }

    function getNextOffset(state) {
        return state && Array.isArray(state.files) ? state.files.length : 0;
    }

    return {
        createInitialState: createInitialState,
        normalizeSessionFile: normalizeSessionFile,
        applyFetchResponse: applyFetchResponse,
        insertRealtimeFile: insertRealtimeFile,
        resetForSession: resetForSession,
        setLoading: setLoading,
        setError: setError,
        getNextOffset: getNextOffset
    };
}));

