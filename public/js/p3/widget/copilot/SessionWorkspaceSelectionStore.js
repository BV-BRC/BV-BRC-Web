(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CopilotSessionWorkspaceSelectionStore = factory();
    }
}(this, function() {
    function createInitialState(sessionId) {
        return {
            sessionId: sessionId || null,
            items: [], // Array of objects with id, path, type, and name
            itemIds: {} // For quick lookup by id
        };
    }

    /**
     * Normalizes an item to minimal selection format with id, path, type, and name
     * @param {Object} item - Item object with id, path, type, and name properties
     * @returns {Object|null} Object with id, path, type, and name, or null if invalid
     */
    function normalizeItem(item) {
        if (!item) {
            return null;
        }

        var id = item.id;
        var path = item.path;
        var type = item.type;
        var name = item.name;

        // Both id and path are required
        if (!id || !path) {
            return null;
        }

        return {
            id: id,
            path: path,
            type: type || null,
            name: name || null,
            selected: item.selected !== false
        };
    }

    function setItems(state, items) {
        var nextItems = Array.isArray(items) ? items : [];
        state.items = [];
        state.itemIds = {};

        nextItems.forEach(function(item) {
            var normalized = normalizeItem(item);
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

    /**
     * Gets only the paths from stored items (for API payload)
     * @param {Object} state - The store state
     * @returns {Array<string>} Array of path strings
     */
    function getPaths(state) {
        return getSelectedItems(state).map(function(item) {
            return item.path;
        });
    }

    return {
        createInitialState: createInitialState,
        normalizeItem: normalizeItem,
        setItems: setItems,
        resetForSession: resetForSession,
        getItems: getItems,
        getSelectedItems: getSelectedItems,
        getPaths: getPaths
    };
}));

