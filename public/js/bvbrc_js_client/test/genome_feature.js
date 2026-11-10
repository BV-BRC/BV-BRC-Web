const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const endpoint = "https://patricbrc.org/api"
//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Genome Feature API Tests", function(){
	const svc = new Service(endpoint)
	const test_genome_id="227377.26"
	const test_genome_ids=["227377.26","777.121","777.16"]
	const test_genome_feature_id="PATRIC.254246.3.QQAX01000001.CDS.67.237.fwd"

	it("getGenomeFeature", async function(){
		const feature = await svc.getGenomeFeature(test_genome_feature_id)
		assert.equal(feature.feature_id,test_genome_feature_id)
	})

	it("getGenomeFeatures", async function(){
		const result = await svc.getGenomeFeatures(test_genome_ids)
		const features = result.items
		assert.equal(features[0].genome_id,test_genome_id)
	})

	it("queryGenomeFeatures-RQL", async function(){
		const result = await svc.queryGenomeFeatures(`eq(genome_id,${test_genome_id})`,{"limit": 10})
		const features = result.items
		assert.equal(features[0].genome_id,test_genome_id)
		assert.lengthOf(features,10)
	})

	it("queryGenomeFeatures-SOLR", async function(){
		const result = await svc.queryGenomeFeatures(`genome_id:${test_genome_id}`,{"query_lang": "solr","limit":10})
		const features = result.items
		assert.equal(features[0].genome_id,test_genome_id)
		assert.lengthOf(features,10)
	})
});
