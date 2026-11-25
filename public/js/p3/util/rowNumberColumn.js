define([], function () {

  /**
   * The optional "#" column of the list grids (PageGrid), behind the
   * `showRowNumbers` config flag.
   *
   * Each row shows its position in the whole result: dgrid passes every row's
   * absolute index (numbered pages start page 2 at 200, infinite scroll at
   * wherever the page landed), so the number is rowIndex + 1. It is written
   * into the cell when the row is inserted; there is no field behind it.
   *
   * Display only. Everything that turns grid columns into data -- download
   * columns and saved column sets (util/QueryDescriptor), copy to clipboard
   * (GridCopyToClipboard, CopyTooltipDialog) -- skips it by KEY, as it already
   * skips the checkbox column. Its field is not a real one, and an unknown
   * field in a download's sort or select can produce a silent empty file.
   */

  var KEY = 'Row Number';
  var FIELD = '_row_number';
  var CHECKBOX_KEY = 'Selection Checkboxes';

  /** The flag arrives from config as a boolean or, from argv/env, a string. */
  function isEnabled(app) {
    var v = app && app.showRowNumbers;
    return v === true || v === 'true';
  }

  function column() {
    return {
      label: '#',
      field: FIELD,
      sortable: false,
      // Not offered in the column chooser: the flag decides whether it shows.
      unhidable: true,
      className: 'rowNumberColumn',
      renderCell: function () {
        // Filled in by PageGrid.insertRow, which knows the row's index.
      }
    };
  }

  /**
   * `columns` with the row-number column added after the checkbox column, or
   * first when there is none. Returns the input itself when it is not a plain
   * column object or already has the column. Never mutates the input: grid
   * column objects are often shared prototype properties.
   */
  function withRowNumbers(columns) {
    if (!columns || typeof columns !== 'object' || Array.isArray(columns)
        || Object.prototype.hasOwnProperty.call(columns, KEY)) {
      return columns;
    }
    var out = {};
    var keys = Object.keys(columns);
    var afterCheckbox = keys.indexOf(CHECKBOX_KEY) !== -1;
    if (!afterCheckbox) { out[KEY] = column(); }
    keys.forEach(function (k) {
      out[k] = columns[k];
      if (k === CHECKBOX_KEY) { out[KEY] = column(); }
    });
    return out;
  }

  /**
   * The text for a row: its 1-based position. No thousands separators: the
   * column is kept as narrow as the digits allow, as in a spreadsheet.
   */
  function label(rowIndex) {
    return (typeof rowIndex === 'number' && rowIndex >= 0) ? String(rowIndex + 1) : '';
  }

  /**
   * The widest label the result can need, for sizing the column: one "8" (a
   * full-width digit in proportional fonts) per digit of the total.
   */
  function widestLabel(total) {
    var digits = String(Math.max(1, Math.floor(total) || 1)).length;
    return new Array(digits + 1).join('8');
  }

  return {
    KEY: KEY,
    FIELD: FIELD,
    isEnabled: isEnabled,
    withRowNumbers: withRowNumbers,
    label: label,
    widestLabel: widestLabel
  };
});
