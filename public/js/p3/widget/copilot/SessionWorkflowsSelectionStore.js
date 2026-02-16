(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CopilotSessionWorkflowsSelectionStore = factory();
    }
}(this, function() {
    function createInitialState(sessionId) {
        return {
            sessionId: sessionId || null,
            items: [],
            itemIds: {}
        };
    }

    function normalizeWorkflow(item) {
        if (!item) {
            return null;
        }
        var id = item.id || item.workflow_id;
        if (!id) {
            return null;
        }
        id = String(id);
        return {
            id: id,
            workflow_id: id,
            workflow_name: item.workflow_name || 'Workflow',
            status: item.status || null,
            submitted_at: item.submitted_at || null,
            completed_at: item.completed_at || null,
            selected: item.selected !== false
        };
    }

    function setItems(state, items) {
        var nextItems = Array.isArray(items) ? items : [];
        state.items = [];
        state.itemIds = {};

        nextItems.forEach(function(item) {
            var normalized = normalizeWorkflow(item);
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
        normalizeWorkflow: normalizeWorkflow,
        setItems: setItems,
        resetForSession: resetForSession,
        getItems: getItems,
        getSelectedItems: getSelectedItems
    };
}));

