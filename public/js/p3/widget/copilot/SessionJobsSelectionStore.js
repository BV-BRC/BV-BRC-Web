(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CopilotSessionJobsSelectionStore = factory();
    }
}(this, function() {
    function createInitialState(sessionId) {
        return {
            sessionId: sessionId || null,
            items: [],
            itemIds: {}
        };
    }

    function normalizeJob(item) {
        if (!item) {
            return null;
        }

        var id = item.id || item.job_id || item.task_id;
        if (id === null || id === undefined || id === '') {
            return null;
        }
        id = String(id);

        return {
            id: id,
            status: item.status || null,
            application_name: item.application_name || item.app || item.service || null,
            submit_time: item.submit_time || null,
            start_time: item.start_time || null,
            completed_time: item.completed_time || null,
            selected: item.selected !== false
        };
    }

    function setItems(state, items) {
        var nextItems = Array.isArray(items) ? items : [];
        state.items = [];
        state.itemIds = {};

        nextItems.forEach(function(item) {
            var normalized = normalizeJob(item);
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

    function getIds(state) {
        return getSelectedItems(state).map(function(item) {
            return item.id;
        });
    }

    return {
        createInitialState: createInitialState,
        normalizeJob: normalizeJob,
        setItems: setItems,
        resetForSession: resetForSession,
        getItems: getItems,
        getSelectedItems: getSelectedItems,
        getIds: getIds
    };
}));


