define([], function () {

  /**
   * Saving and restoring the row selection attached to a saved search.
   *
   * A saved search already persists `selectedIds` -- the primary-key values
   * of the rows that were ticked when it was saved. This module is the
   * other half: capping what gets stored, and re-applying it to a grid once
   * the rows exist.
   *
   * Two things make the restore less trivial than `grid.select(id)`:
   *
   * 1. **dgrid accepts an id that does not exist.** Measured on a live
   *    grid: `grid.select('<not in result set>')` does not throw, puts the
   *    id in `grid.selection`, highlights nothing, and never reaches the
   *    action bar (GridContainer's `select` handler maps ids through
   *    `grid.row(id).data`, which is undefined for a row that is not
   *    there). The result is a phantom selection where the selection map,
   *    the DOM and the toolbar all disagree. So only ever select ids whose
   *    row actually resolves, and report the ones that did not.
   *
   * 2. **A selection can be enormous.** Ids run ~50 bytes, so "select all"
   *    on a 764-row grid is ~40 KB of JSON and a 100k-row genome selection
   *    would be ~5 MB -- in a .preferences file that is read on every page
   *    load. Hence MAX_SAVED_SELECTION, applied at save time, with the
   *    truncation recorded so the UI can say so rather than quietly
   *    dropping rows.
   */

  /**
   * Most rows we will persist with a saved search.
   *
   * 1000 x ~50-byte ids is ~50 KB of JSON, which is a tolerable addition to
   * the preferences file. Beyond that the selection is almost certainly
   * "select all", where re-running the query is the better answer anyway.
   */
  var MAX_SAVED_SELECTION = 1000;

  /**
   * Reduce a selection to what should be persisted.
   *
   * @param {Array} selectedIds - primary-key values, or null
   * @returns {Object} { ids, total, truncated }
   */
  function capSelection(selectedIds) {
    if (!selectedIds || !selectedIds.length) {
      return { ids: null, total: 0, truncated: false };
    }

    var total = selectedIds.length;
    if (total <= MAX_SAVED_SELECTION) {
      return { ids: selectedIds.slice(), total: total, truncated: false };
    }

    return {
      ids: selectedIds.slice(0, MAX_SAVED_SELECTION),
      total: total,
      truncated: true
    };
  }

  /**
   * Apply a saved selection to a grid.
   *
   * Call once the rows are rendered (dgrid-refresh-complete); selecting
   * before that matches nothing. Ids whose row does not resolve are
   * skipped rather than passed to grid.select(), which would create the
   * phantom selection described above.
   *
   * @param {Object} grid - a dgrid with the Selection mixin
   * @param {Array} ids - primary-key values to re-select
   * @returns {Object} { restored, missing, total }
   */
  function applySelection(grid, ids) {
    var result = { restored: 0, missing: 0, total: (ids && ids.length) || 0 };
    if (!grid || typeof grid.select !== 'function' || !result.total) {
      return result;
    }

    ids.forEach(function (id) {
      var row = null;
      try {
        row = grid.row(id);
      } catch (e) {
        row = null;
      }

      // `grid.row()` returns an object even for an unknown id; the element
      // is what tells us the row is really there.
      if (row && row.element) {
        try {
          grid.select(id);
          result.restored++;
          return;
        } catch (e) {
          // fall through and count it as missing
        }
      }
      result.missing++;
    });

    return result;
  }

  /**
   * Human-readable summary, or null when there is nothing worth saying.
   *
   * Silence on the clean path: a message only appears when rows went
   * missing or the save was truncated, because that is the case where the
   * grid does not match what the user saved.
   */
  function describeRestore(result, truncatedTotal) {
    if (!result || !result.total) return null;

    if (result.missing > 0) {
      return 'Restored ' + result.restored + ' of ' + result.total
        + ' selected rows; ' + result.missing
        + ' no longer match this search.';
    }

    if (truncatedTotal && truncatedTotal > result.total) {
      return 'Restored ' + result.restored + ' selected rows (the saved '
        + 'selection was capped at ' + MAX_SAVED_SELECTION + ' of '
        + truncatedTotal + ').';
    }

    return null;
  }

  return {
    MAX_SAVED_SELECTION: MAX_SAVED_SELECTION,
    capSelection: capSelection,
    applySelection: applySelection,
    describeRestore: describeRestore
  };
});
