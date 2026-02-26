(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CopilotSessionFilesSelectionStore = factory();
    }
}(this, function() {
    function createInitialState(sessionId) {
        return {
            sessionId: sessionId || null,
            items: [],
            itemIds: {}
        };
    }

    function normalizeFile(item) {
        if (!item) {
            return null;
        }
        var id = item.id || item.file_id;
        if (id === null || id === undefined || id === '') {
            return null;
        }
        id = String(id);
        return {
            id: id,
            file_id: item.file_id || null,
            file_name: item.file_name || 'Untitled file',
            tool_id: item.tool_id || null,
            created_at: item.created_at || null,
            workspace_path: item.workspace_path || null,
            data_type: item.data_type || null,
            selected: item.selected !== false
        };
    }

    function setItems(state, items) {
        var nextItems = Array.isArray(items) ? items : [];
        state.items = [];
        state.itemIds = {};

        nextItems.forEach(function(item) {
            var normalized = normalizeFile(item);
            if (normalized && !state.itemIds[normalized.id]) {
                state.itemIds[normalized.id] = true;
                state.items.push(normalized);
            }
        });

        return state;
    }

    function resetForSession(state, sessionId) {
        var next = createInitialState(sessionId);
        state.sessionId = next.sessionId;
        state.items = next.items;
        state.itemIds = next.itemIds;
        return state;
    }

    function getItems(state) {
        return state.items;
    }

    function getSelectedItems(state) {
        return (state.items || []).filter(function(item) {
            return item && item.selected !== false;
        });
    }

    return {
        createInitialState: createInitialState,
        normalizeFile: normalizeFile,
        setItems: setItems,
        resetForSession: resetForSession,
        getItems: getItems,
        getSelectedItems: getSelectedItems
    };
}));

