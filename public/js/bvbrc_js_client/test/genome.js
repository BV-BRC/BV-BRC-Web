const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const endpoint = "https://patricbrc.org/api"
//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Genome API Tests", function(){
	var svc = new Service(endpoint)
	const test_genome_id="227377.26"
	const test_genome_feature_id="PATRIC.254246.3.QQAX01000001.CDS.67.237.fwd"

	it("getGenome", async function(){
		const genome = await svc.getGenome(test_genome_id)
		assert.equal(genome.genome_id,test_genome_id)
	})

	it("queryGenomes-RQL", async function(){
		const result = await svc.queryGenomes(`eq(genome_id,${test_genome_id})`)
		const genomes = result.items
		assert.equal(genomes[0].genome_id,test_genome_id)
	})

	it("queryGenomes-SOLR", async function(){
		const result = await svc.queryGenomes(`genome_id:${test_genome_id}`,{"query_lang": "solr"})
		const genomes = result.items
		assert.equal(genomes[0].genome_id,test_genome_id)
	})
});
