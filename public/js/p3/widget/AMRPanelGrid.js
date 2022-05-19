define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on',
  'dijit/layout/BorderContainer',
  '../store/AMRJsonRest',
  './PageGrid', './GridSelector'
], function (
  declare, lang,
  on,
  BorderContainer,
  Store,
  Grid, selector
) {

  var store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    store: store,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      genome_name: { label: 'Genome Name', field: 'genome_name' },
      antibiotic: { label: 'Antibiotic', field: 'antibiotic' },
      phenotype: { label: 'Resistant Phenotype', field: 'resistant_phenotype' },
      m_sign: { label: 'Measurement Sign', field: 'measurement_sign' },
      m_value: { label: 'Measurement Value', field: 'measurement_value' },
      m_unit: { label: 'Measurement Units', field: 'measurement_unit' },
      l_method: { label: 'Lab typing Method', field: 'laboratory_typing_method' },
      l_version: { label: 'Lab typing Version', field: 'laboratory_typing_method_version', hidden: true },
      l_pltform: { label: 'Lab typing Platform', field: 'laboratory_typing_platform', hidden: true },
      l_vendor: { label: 'Lab typing Vendor', field: 'vendor', hidden: true },
      test_standard: { label: 'Testing standard', field: 'testing_standard', hidden: true },
      test_year: { label: 'Testing standard year', field: 'testing_standard_year', hidden: true },
      c_method: { label: 'Computational Method', field: 'computational_method' },
      c_version: { label: 'Computational Method Version', field: 'computational_method_version', hidden: true },
      c_performance: { label: 'Computational Method Performance', field: 'computational_method_performance', hidden: true },
      evidence: { label: 'Evidence', field: 'evidence' },
      pmid: { label: 'Pubmed', field: 'pmid' }
    },
    selectAllFields: ['genome_id'],
    startup: function () {
      var _self = this;
      this.on('dgrid-select', function (evt) {
        // console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.on('dgrid-deselect', function (evt) {
        // console.log("dgrid-deselect");
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.inherited(arguments);
      this.refresh();
    }
  });
});
