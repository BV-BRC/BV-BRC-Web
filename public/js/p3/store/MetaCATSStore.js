define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/request', 'dojo/when', 'dojo/topic',
  'dojo/store/Memory', 'dojo/store/util/QueryResults', 'dojo/Stateful',
  '../widget/GridSelector',
], function (
  declare, lang, Deferred,
  request, when, Topic,
  Memory, QueryResults, Stateful,
  selector
) {

  return declare([Memory, Stateful], {
    // baseQuery: {},
    // rawData: [],
    // dataType: '',
    idProperty: 'patric_id',
    // filterOptions: {},
    data: [],
    columns: [
      selector({label: selector({unidable: true})}),
      {label: 'Genbank Accession', field: 'genbank_accessions'},
      {label: 'Strain', field: 'strain'},
      {label: 'Metadata', field: 'metadata'},
      {label: 'Group', field: 'group'},
      {label: 'BRC ID', field: 'patric_id'},
      {label: 'Genome ID', field: 'genome_id'}]
  });
});
