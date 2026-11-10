const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const endpoint = "https://patricbrc.org/api"
//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Genome Sequence API Tests", function(){
	var svc = new Service(endpoint)
	const test_genome_id="777.121"
	const test_genome_sequence_id="777.121.con.0001"

	it("getGenomeSequence", async function(){
		var seq = await svc.getGenomeSequence(test_genome_sequence_id)
		assert.equal(seq.sequence_id,test_genome_sequence_id)
	})

	it("queryGenomeSequence-RQL", async function(){
		var result = await svc.queryGenomeSequences(`eq(genome_id,${test_genome_id})`,{"limit": 10})
		var seqs = result.items
		assert.equal(seqs[0].genome_id,test_genome_id)
		assert.lengthOf(seqs,10)
	})

	it("queryGenomeFeatures-SOLR", async function(){
		var result = await svc.queryGenomeSequences(`genome_id:${test_genome_id}`,{"query_lang": "solr","limit":10})
		var seqs = result.items
		assert.equal(seqs[0].genome_id,test_genome_id)
		assert.lengthOf(seqs,10)
	})
});
