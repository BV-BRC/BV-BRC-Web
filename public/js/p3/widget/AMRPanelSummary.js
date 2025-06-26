define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/dom-class',
  './SummaryWidget'

], function (
  declare, lang,
  on, domClass,
  SummaryWidget
) {

  return declare([SummaryWidget], {
    templateString: '<div class="SummaryWidget"><div class="loadingNode" data-dojo-attach-point="loadingNode">Loading...</div><div class="tableNode" data-dojo-attach-point="tableNode"></div></div>',
    dataModel: 'genome_amr',
    query: '',
    view: 'table',
    baseQuery: '&limit(1)&facet((pivot,(resistant_phenotype,evidence,antibiotic)),(mincount,1),(method,enum))&json(nl,map)',
    columns: [
      {
        label: 'Phenotypes',
        field: 'resistant_phenotype',
        renderCell: function (obj, val, node) {
          var label = (obj.is_computed) ? val + ' (predicted)' : val;
          node.innerHTML = lang.replace('<a href="#view_tab=amr&filter=eq(resistant_phenotype,{0})">{1}</a>', [encodeURIComponent(val), label]);
        }
      },
      {
        label: 'Antibiotics',
        field: 'antibiotics',
        renderCell: function (obj, val, node) {
          if (val) {
            node.innerHTML = val.join(', ');
          } else {
            node.innerHTML = ' ';
          }
        }
      }
    ],
    processData: function (data) {

      if (!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['resistant_phenotype,evidence,antibiotic']
        || data.facet_counts.facet_pivot['resistant_phenotype,evidence,antibiotic'].length == 0) {
        // hide this section
        domClass.add(this.domNode.parentNode, 'hidden');
        return;
      }

      // make section visible
      domClass.remove(this.domNode.parentNode, 'hidden');

      data = data.facet_counts.facet_pivot['resistant_phenotype,evidence,antibiotic'];
      var byPhenotypes = [];

      data.forEach(function (phenotype) {
        phenotype.pivot.forEach(function (method) {
          var antibiotics = method.pivot.map(function (pv) {
            return pv.value;
          });

          // Check for method values
          if (method.value.toLowerCase() === 'computational method' || method.value.toLowerCase() === 'laboratory method') {
            var isComputed = (method.value.toLowerCase() === 'computational method');
            byPhenotypes.push({
              resistant_phenotype: phenotype.value,
              antibiotics: antibiotics,
              is_computed: isComputed
            });
          }
        });
      });

      this._tableData = byPhenotypes;
      this.set('data', byPhenotypes);
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    }
  });
});
