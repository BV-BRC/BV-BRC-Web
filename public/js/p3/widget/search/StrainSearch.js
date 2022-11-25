define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './SearchBase',
  'dojo/text!./templates/StrainSearch.html',
  './TextInputEncoder',
  './FacetStoreBuilder',
  './StrainPathogenGroups',
  './HostGroups'
], function (
  declare,
  lang,
  SearchBase,
  template,
  TextInputEncoder,
  storeBuilder,
  pathogenGroupStore,
  hostGroupStore
) {

  function sanitizeInput(str) {
    return str.replace(/\(|\)|\.|\*|\||\[|\]/g, '')
  }

  return declare([SearchBase], {
    templateString: template,
    searchAppName: 'Strain Search',
    pageTitle: 'Strain Search | BV-BRC',
    dataKey: 'strain',
    resultUrlBase: '/view/StrainList/?',
    resultUrlHash: '#view_tab=strains',
    postCreate: function () {
      this.inherited(arguments)

      this.pathogenGroupNode.store = pathogenGroupStore
      this.hostGroupNode.store = hostGroupStore

      storeBuilder('genome', 'host_common_name').then(lang.hitch(this, (store) => {
        this.hostNameNode.store = store
      }))

      storeBuilder('genome', 'geographic_group').then(lang.hitch(this, (store) => {
        this.geographicGroupNode.store = store
      }))

      storeBuilder('genome', 'isolation_country').then(lang.hitch(this, (store) => {
        this.isolationCountryNode.store = store
      }))
    },
    onPathogenGroupChange: function () {
      if (this.pathogenGroupNode.get('value') === '11320') {
        this.influenzaSegmentsNode.style.display = 'block';
        this.viralSegmentsNode.style.display = 'none';
      }
      else {
        this.viralSegmentsNode.style.display = 'block';
        this.influenzaSegmentsNode.style.display = 'none';
      }
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

      const hostGroupValue = this.hostGroupNode.get('value')
      if (hostGroupValue !== '') {
        queryArr.push(`eq(host_group,${sanitizeInput(hostGroupValue)})`)
      }

      const hostNameValue = this.hostNameNode.get('value')
      if (hostNameValue !== '') {
        queryArr.push(`eq(host_common_name,${sanitizeInput(hostNameValue)})`)
      }

      const geographicGroupValue = this.geographicGroupNode.get('value')
      if (geographicGroupValue !== '') {
        queryArr.push(`eq(geographic_group,${geographicGroupValue})`)
      }

      const isolationCountryValue = this.isolationCountryNode.get('value')

      if (isolationCountryValue !== '') {
        queryArr.push(`eq(isolation_country,${sanitizeInput(isolationCountryValue)})`)
      }

      const collectionYearFromValue = parseInt(this.collectionYearFromNode.get('value'))
      const collectionYearToValue = parseInt(this.collectionYearToNode.get('value'))
      if (!isNaN(collectionYearFromValue) && !isNaN(collectionYearToValue)) {
        // between
        queryArr.push(`between(collection_year,${collectionYearFromValue},${collectionYearToValue})`)
      } else if (!isNaN(collectionYearFromValue)) {
        // gt
        queryArr.push(`gt(collection_year,${collectionYearFromValue})`)
      } else if (!isNaN(collectionYearToValue)) {
        // lt
        queryArr.push(`lt(collection_year,${collectionYearToValue})`)
      }

      const segmentArr = [];
      const segmentCheckBox1 = this.segmentCheckBox1Node.checked;
      const segmentCheckBox2 = this.segmentCheckBox2Node.checked;
      const segmentCheckBox3 = this.segmentCheckBox3Node.checked;
      const segmentCheckBox4 = this.segmentCheckBox4Node.checked;
      const segmentCheckBox5 = this.segmentCheckBox5Node.checked;
      const segmentCheckBox6 = this.segmentCheckBox6Node.checked;
      const segmentCheckBox7 = this.segmentCheckBox7Node.checked;
      const segmentCheckBox8 = this.segmentCheckBox8Node.checked;
      const segmentCheckBox9 = this.segmentCheckBox9Node.checked;
      const segmentCheckBox10 = this.segmentCheckBox10Node.checked;
      const segmentCheckBox11 = this.segmentCheckBox11Node.checked;

      if (segmentCheckBox1) {
        segmentArr.push('eq(1_pb2,*)')
      }
      if (segmentCheckBox2) {
        segmentArr.push('eq(2_pb1,*)')
      }
      if (segmentCheckBox3) {
        segmentArr.push('eq(3_pa,*)')
      }
      if (segmentCheckBox4) {
        segmentArr.push('eq(4_ha,*)')
      }
      if (segmentCheckBox5) {
        segmentArr.push('eq(5_np,*)')
      }
      if (segmentCheckBox6) {
        segmentArr.push('eq(6_na,*)')
      }
      if (segmentCheckBox7) {
        segmentArr.push('eq(7_mp,*)')
      }
      if (segmentCheckBox8) {
        segmentArr.push('eq(8_ns),*)')
      }
      if (segmentCheckBox9) {
        segmentArr.push('eq(s,*)')
      }
      if (segmentCheckBox10) {
        segmentArr.push('eq(m,*)')
      }
      if (segmentCheckBox11) {
        segmentArr.push('eq(l,*)')
      }

      queryArr = queryArr.concat(segmentArr);

      const advancedQueryArr = this._buildAdvancedQuery()
      if (advancedQueryArr.length > 0) {
        queryArr = queryArr.concat(advancedQueryArr)
      }

      return queryArr.join('&')
    }
  })
})
