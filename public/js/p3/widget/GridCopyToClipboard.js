define(['dojo/_base/declare', 'dojo/has', 'dojo/on', 'dgrid/util/misc', 'put-selector/put', 'dojo/i18n!dgrid/extensions/nls/columnHider', 'xstyle/css!dgrid/css/extensions/ColumnHider.css'],
  function (declare, has, listen, miscUtil, put, i18n) {
    /*
 * Column Hider plugin for dgrid
 * Originally contributed by TRT 2011-09-28
 *
 * A dGrid plugin that attaches a menu to a dgrid, along with a way of opening it,
 * that will allow you to show and hide columns.  A few caveats:
 *
 * 1. Menu placement is entirely based on CSS definitions.
 * 2. If you want columns initially hidden, you must add "hidden: true" to your
 *    column definition.
 * 3. This implementation does NOT support ColumnSet, and has not been tested
 *    with multi-subrow records.
 * 4. Column show/hide is controlled via straight up HTML checkboxes.  If you
 *    are looking for something more fancy, you'll probably need to use this
 *    definition as a template to write your own plugin.
 *
 */

    var activeGrid, // references grid for which the menu is currently open
      bodyListener, // references pausable event handler for body mousedown
      // Need to handle old IE specially for checkbox listener and for attribute.
      hasIE = has('ie'),
      hasIEQuirks = hasIE && has('quirks'),
      forAttr = hasIE < 8 || hasIEQuirks ? 'htmlFor' : 'for';



    return declare(null, {
      copyToClipboard: function (includeHeader) {
        var out = [];
        var _self=this
        console.log("Selection: ", this)
        selection = []

        Object.keys(this._all?this._unloadedData:this.selection).forEach(function(id){
          if (_self.selectedData[id]){
            selection.push(_self.selectedData[id])
          }
        })
        // console.log("selection", selection)
        // var selection = JSON.parse(JSON.stringify(this.selectedData))
        // return
        // remove any undefined entries
        var clean_selection = [];
        selection.forEach(function (obj) {
          if (obj) {
            clean_selection.push(obj);
          }
        });

        // sort based on the columns defined elsewhere on the UI
        var columns = this.columns;
        var key_list = Array.from(Object.keys(columns));

        // filter out blacklisted columns
        key_list = key_list.filter(function (i) {
          return ['Selection Checkboxes', 'public'].indexOf(i) < 0;
        });


        key_list = key_list.filter(function (j) {
          return (typeof columns[j].hidden == 'undefined' || !columns[j].hidden);
        });

        // console.log('[CopyTooltipDialog] columns: ', columns)
        // console.log('[CopyTooltipDialog] selection: ', selection)
        // console.log('[CopyTooltipDialog] key_list: ', key_list);

        // if we want the header, push it to the array
        if (includeHeader) {
          var header = [];
          key_list.forEach(function (key) {
            header.push(columns[key].label);
          });
          out.push(header.join('\t'));
        }

        // for each selected item, push its data to the result array
        selection.forEach(function (obj) {
          var io = [];
          key_list.forEach(function (col_key) {
            var key = columns[col_key].field;
            if (obj[key] instanceof Array) {
              io.push(obj[key].join(';'));
            } else {
              io.push(obj[key]);
            }
          });
          out.push(io.join('\t'));
        });

        console.log("Copy to clipboard: ", out.join("\n"))
        navigator.clipboard.writeText(out.join("\n"));
      },

    });
  });
