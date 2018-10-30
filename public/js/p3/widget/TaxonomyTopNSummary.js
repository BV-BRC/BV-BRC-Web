define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/when',
  'dgrid/Grid', 'dgrid/extensions/DijitRegistry',
  '../store/TaxonomyJsonRest'

], function (
  declare, lang,
  domClass, when,
  Grid, dgridRegistry,
  Store
) {

  var store = new Store({});

  return declare([Grid, dgridRegistry], {
    dataModel: 'taxonomy',
    store: store,
    query: '&eq(taxon_rank,genus)&sort(-genomes)&select(taxon_id,taxon_name,genomes)',
    count: 10,
    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, 'dgrid-autoheight');
    },
    startup: function () {
      this.inherited(arguments);
      when(this.store.query(this.query + '&limit(' + this.count + ')'), lang.hitch(this, function (results) {
        // console.log("Results: ", results)
        this.renderArray(results);
      }));

    },
    columns: [{
      label: 'Name',
      field: 'taxon_name',
      renderCell: function (obj, val, node) {
        node.innerHTML = '<a class="navigationLink" href="/view/Taxonomy/' + obj.taxon_id + '">' + obj.taxon_name +  '</a>';
      }
    }, {
      label: 'Genomes',
      field: 'genomes'
    }]
  });
});
