define([
  'dojo/_base/declare', 'dojo/on',
  './PageGrid', '../store/StrainJsonRest', './GridSelector'
], function (
  declare, on,
  Grid, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    store: store,
    dataModel: 'strain',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      // taxon_lineage_ids: { label: 'Taxon Lineage IDs', field: 'taxon_lineage_ids', hidden: true },
      // taxon_lineage_names: { label: 'Taxon Lineage Names', field: 'taxon_lineage_names', hidden: true },

      family: { label: 'Family', field: 'family', hidden: true },
      genus: { label: 'Genus', field: 'genus', hidden: true },
      species: { label: 'Species', field: 'species', hidden: false },
      strain: { label: 'Strain', field: 'strain', hidden: false },

      subtype: { label: 'Subtype', field: 'subtype', hidden: true },
      // h_type: { label: 'H Type', field: 'h_type', hidden: true },
      // n_type: { label: 'N Type', field: 'n_type', hidden: true },

      genome_ids: { label: 'Genome IDs', field: 'genome_ids', hidden: true },
      genbank_accessions: { label: 'Genbank Accessions', field: 'genbank_accessions', hidden: true },
      segment_count: { label: 'Segment Count', field: 'segment_count', hidden: false },
      status: { label: 'Status', field: 'status', hidden: false },

      host_group: { label: 'Host Group', field: 'host_group', hidden: true },
      host_common_name: { label: 'Host Common Name', field: 'host_common_name', hidden: false },
      host_name: { label: 'Host Name', field: 'host_name', hidden: true },
      lab_host: { label: 'Lab Host', field: 'lab_host', hidden: true },
      passage: { label: 'Passage', field: 'passage', hidden: true },

      geographic_group: { label: 'Geographic Group', field: 'geographic_group', hidden: true },
      isolation_country: { label: 'Isolation Country', field: 'isolation_country', hidden: false },
      collection_year: { label: 'Collection Year', field: 'collection_year', hidden: true },
      collection_date: { label: 'Collection Date', field: 'collection_date', hidden: false },
      // season: { label: 'Season', field: 'season', hidden: true },

      // s_1_pb2: { label: '1_PB2', field: '1_pb2', hidden: false },
      // s_2_pb1: { label: '2_PB1', field: '2_pb1', hidden: false },
      // s_3_pa: { label: '3_PA', field: '3_pa', hidden: false },
      // s_4_ha: { label: '4_HA', field: '4_ha', hidden: false },
      // s_5_np: { label: '5_NP', field: '5_np', hidden: false },
      // s_6_na: { label: '6_NA', field: '6_na', hidden: false },
      // s_7_mp: { label: '7_MP', field: '7_mp', hidden: false },
      // s_8_ns: { label: '8_NS', field: '8_ns', hidden: false },
      s_s: { label: 'S', field: 's', hidden: false },
      s_m: { label: 'M', field: 'm', hidden: false },
      s_l: { label: 'L', field: 'l', hidden: false },
      s_other_segments: { label: 'Other Segments', field: 'other_segments', hidden: false },
    },
    startup: function () {
      var _self = this;
      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
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
