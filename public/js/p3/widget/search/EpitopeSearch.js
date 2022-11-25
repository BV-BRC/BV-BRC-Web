define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/EpitopeSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './PathogenGroups',
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Epitope Search',
    pageTitle: 'Epitope Search | BV-BRC',
    dataKey: 'epitope',
    resultUrlBase: '/view/EpitopeList/?',
    resultUrlHash: '#view_tab=epitope',
    postCreate: function () {
      this.inherited(arguments);

      this.pathogenGroupNode.store = pathogenGroupStore;

      storeBuilder('epitope', 'epitope_type').then(lang.hitch(this, (store) => {
        this.epitopeTypeNode.store = store
      }))
    },
    buildQuery: function () {
      let queryArr = []

      const keywordValue = this.keywordNode.get('value')
      if (keywordValue !== '') {
        queryArr.push(`keyword(${TextInputEncoder(sanitizeInput(keywordValue))})`)
      }

      const pathogenGroupValue = this.pathogenGroupNode.get('value')
      if (pathogenGroupValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(pathogenGroupValue)})`)
      }

      const taxonNameValue = this.taxonNameNode.get('value')
      if (taxonNameValue !== '') {
        queryArr.push(`eq(taxon_lineage_ids,${sanitizeInput(taxonNameValue)})`)
      }

      const epitopeIDValue = this.epitopeIDNode.get('value')
      if (epitopeIDValue !== '') {
        queryArr.push(`eq(epitope_id,${sanitizeInput(epitopeIDValue)})`)
      }

      const epitopeTypeValue = this.epitopeTypeNode.get('value')
      if (epitopeTypeValue !== '') {
        queryArr.push(`eq(epitope_type,${sanitizeInput(epitopeTypeValue)})`)
      }

      const epitopeSequenceValue = this.epitopeSequenceNode.get('value')
      if (epitopeSequenceValue !== '') {
        queryArr.push(`eq(epitope_sequence,${sanitizeInput(epitopeSequenceValue)})`)
      }

      const proteinNameValue = this.proteinNameNode.get('value')
      if (proteinNameValue !== '') {
        queryArr.push(`eq(protein_name,${TextInputEncoder(sanitizeInput(proteinNameValue))})`)
      }

      const proteinAccessionValue = this.proteinAccessionNode.get('value')
      if (proteinAccessionValue !== '') {
        queryArr.push(`eq(protein_accession,${sanitizeInput(proteinAccessionValue)})`)
      }

      const assayArr = [];
      const assayCheckBox1 = this.assayCheckBox1Node.checked;
      const assayCheckBox2 = this.assayCheckBox2Node.checked;
      const assayCheckBox3 = this.assayCheckBox3Node.checked;
      const assayCheckBox4 = this.assayCheckBox4Node.checked;
      const assayCheckBox5 = this.assayCheckBox5Node.checked;
      const assayCheckBox6 = this.assayCheckBox6Node.checked;

      if (assayCheckBox1) {
        assayArr.push('eq(assay_results,"B cell - Positive")')
      }
      if (assayCheckBox2) {
        assayArr.push('eq(assay_results,"T cell - Positive")')
      }
      if (assayCheckBox3) {
        assayArr.push('eq(assay_results,"MHC cell - Positive")')
      }
      if (assayCheckBox4) {
        assayArr.push('eq(assay_results,"B cell - Negative")')
      }
      if (assayCheckBox5) {
        assayArr.push('eq(assay_results,"T cell - Negative")')
      }
      if (assayCheckBox6) {
        assayArr.push('eq(assay_results,"MHC cell - Negative")')
      }

      let assayResults = assayArr.toString();
      let assayQuery = `or(${assayResults})`;

      if (assayCheckBox1 === false && assayCheckBox2 === false && assayCheckBox3 === false && assayCheckBox4 === false && assayCheckBox5 === false && assayCheckBox6 === false) {
        assayQuery = '';
      }

      queryArr = queryArr.concat(assayQuery);

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
