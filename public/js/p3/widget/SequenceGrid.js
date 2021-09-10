define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SequenceJsonRest', './GridSelector'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    store: store,
    dataModel: 'genome_sequence',
    primaryKey: 'sequence_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: false },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: false },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      sequence_id: { label: 'Sequence ID', field: 'sequence_id', hidden: true },
      accession: { label: 'Accession', field: 'accession', hidden: false },
      gi: { label: 'GI', field: 'gi', hidden: true },
      sequence_type: { label: 'Sequence Type', field: 'sequence_type', hidden: false },
      sequence_status: { label: 'Sequence Status', field: 'sequence_status', hidden: true },
      mol_type: { label: 'Mol Type', field: 'mol_type', hidden: false },
      topology: { label: 'Topology', field: 'topology', hidden: true },
      description: { label: 'Description', field: 'description', hidden: false },
      chromosome: { label: 'Chromosome', field: 'chromosome', hidden: true },
      plasmid: { label: 'Plasmid', field: 'plasmid', hidden: true },
      segment: { label: 'Segment', field: 'segment', hidden: true },
      gc_content: { label: 'GC Content %', field: 'gc_content', hidden: false },
      length: { label: 'Length (bp)', field: 'length', hidden: false },
      sequence_md5: { label: 'Sequence MD5', field: 'sequence_md5', hidden: true },
      release_date: { label: 'Release Date', field: 'release_date', hidden: true },
      version: { label: 'Version', field: 'version', hidden: true },
      date_inserted: { label: 'Date Inserted', field: 'date_inserted', hidden: true },
      date_modified: { label: 'Date Modified', field: 'date_modified', hidden: true }
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
        console.log('dgrid-select: ', evt);
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
        console.log('dgrid-select');
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
