define([
  'dojo/_base/declare', 'dojo/on',
  './PageGrid', '../store/BiosetJsonRest', './GridSelector'
], function (
  declare, on,
  Grid, Store, selector
) {

  const store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    store: store,
    dataModel: 'bioset',
    primaryKey: 'bioset_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      bioset_id: { label: 'Bioset ID', field: 'bioset_id', hidden: true },
      exp_id: { label: 'Experiment ID', field: 'exp_id', hidden: true },
      study_name: { label: 'Study Name', field: 'study_name', hidden: false },
      exp_name: { label: 'Experiment Name', field: 'exp_name', hidden: false },
      exp_title: { label: 'Experiment Title', field: 'exp_title', hidden: false },
      exp_type: { label: 'Experiment Type', field: 'exp_type', hidden: false },
      bioset_name: { label: 'Bioset Name', field: 'bioset_name', hidden: false },
      bioset_desc: { label: 'Bioset Description', field: 'bioset_description', hidden: false },
      bioset_type: { label: 'Type', field: 'bioset_type', hidden: false },
      organism: { label: 'Organism', field: 'organism', hidden: false },
      strain: { label: 'Strain', field: 'strain', hidden: false },
      treatment_type: { label: 'Treatment Type', field: 'treatment_type', hidden: false },
      treatment_name: { label: 'Treatment Name', field: 'treatment_name', hidden: false },
      treatment_amount: { label: 'Treatment Amount', field: 'treatment_amount', hidden: false },
      treatment_duration: { label: 'Treatment Duration', field: 'treatment_duration', hidden: false },
      result_count: { label: 'Result Count', field: 'entity_count', hidden: false },
    },
    startup: function () {
      const _self = this;

      this.on('dgrid-select', function (evt) {
        const newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.on('dgrid-deselect', function (evt) {
        const newEvt = {
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
