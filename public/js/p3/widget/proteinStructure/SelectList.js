define([
  'dojo/_base/declare',
  'dgrid/List',
  'dgrid/Selection'],
function (declare, List, Selection) {
  return declare([List, Selection], {
    selectionMode: 'single',
    className: 'dgrid-autoheight',
    showHeader: false,
    showFooter: false,
    setSelected: function (id) {
      this.clearSelection();
      this.select(id);
    },
    getSelectedIds: function () {
      return Object.getOwnPropertyNames(this.selection).filter(id => this.selection[id]);
    }
  });
});
