define([
  'dojo/_base/declare', 'dojo/on',
  './PageGrid', '../store/ExperimentJsonRest', './GridSelector'
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
    dataModel: 'experiment',
    primaryKey: 'exp_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      exp_id: { label: 'Experiment ID', field: 'exp_id', hidden: true },
      study_name: { label: 'Study Name', field: 'study_name', hidden: true },
      study_title: { label: 'Study Title', field: 'study_title', hidden: true },
      exp_name: { label: 'Exp Name', field: 'exp_name', hidden: false },
      exp_title: { label: 'Exp Title', field: 'exp_title', hidden: false },
      public_id: { label: 'Public Identifier', field: 'public_identifier', hidden: false },
      exp_type: { label: 'Exp Type', field: 'exp_type', hidden: false },
      biosets: { label: 'Biosets', field: 'biosets', hidden: false },
      organism: {
        label: 'Organism', field: 'organism', hidden: false, sortable: false
      },
      strain: {
        label: 'Strain', field: 'strain', hidden: false, sortable: false
      },
      treatment_type: { label: 'Treatment Type', field: 'treatment_type', hidden: false },
      treatment_name: { label: 'Treatment Name', field: 'treatment_name', hidden: false },
      treatment_amount: { label: 'Treatment Amount', field: 'treatment_amount', hidden: false },
      treatment_duration: { label: 'Treatment Duration', field: 'treatment_duration', hidden: false },
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
