const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const endpoint = "https://patricbrc.org/api"
//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Antibiotic API Tests", function(){
	const svc = new Service(endpoint)
	const test_id="1046"
	const test_id_field="pubchem_cid"
	const test_rql_query = `eq(${test_id_field},${test_id})`
	const test_solr_query = `${test_id_field}:${test_id}`
	const expected_result_len = 1

	it("queryAntibiotics-RQL", async function(){
		const result = await svc.queryAntibiotics(test_rql_query,{"limit": expected_result_len})
		const items = result.items
		assert.equal(items[0][test_id_field],test_id)
		assert.lengthOf(items,expected_result_len)
	})

	it("queryAntibiotics-SOLR", async function(){
		const result = await svc.queryAntibiotics(test_solr_query,{"query_lang": "solr","limit":expected_result_len})
		const items = result.items
		assert.equal(items[0][test_id_field],test_id)
		assert.lengthOf(items,expected_result_len)
	})
});
