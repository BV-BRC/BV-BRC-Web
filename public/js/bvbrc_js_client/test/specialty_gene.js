const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const endpoint = "https://patricbrc.org/api"
//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'
const type="SpecialtyGene"

describe(`${type} API Tests`, function(){
	const svc = new Service(endpoint)
	const test_id="6c07c107-f416-4f4e-a265-8c689da27785"
	const test_id_field="id"
	const test_rql_query = `eq(${test_id_field},${encodeURIComponent('"'+test_id+'"')})`
	const test_solr_query = `${test_id_field}:${encodeURIComponent('"'+test_id+'"')}`
	const expected_result_len = 1
	it(`get${type}`, async function(){
		const item = await svc[`get${type}`](test_id)
		assert.equal(item[test_id_field],test_id)
	})

	it(`query ${type} RQL`, async function(){
		const result = await svc[`query${type}s`](test_rql_query,{"limit": expected_result_len})
		const items = result.items
		assert.equal(items[0][test_id_field],test_id)
		assert.lengthOf(items,expected_result_len)
	})

	it(`query ${type} SOLR`, async function(){
		const result = await svc[`query${type}s`](test_solr_query,{"query_lang": "solr","limit":expected_result_len})
		const items = result.items
		assert.equal(items[0][test_id_field],test_id)
		assert.lengthOf(items,expected_result_len)
	})
});
