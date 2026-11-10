const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const errors = require("../src/errors");

const endpoint = "https://patricbrc.org/api"

//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Base API Tests", function () {
	var svc = new Service(endpoint)
	const test_genome_id = "227377.26"

	it("get schema async", async function(){
		var schema = await svc.getSchema("genome")
		assert.equal(schema.schema.name,"genome")
	})

	it("get schema promise", function(done){
		svc.getSchema("genome").then((schema)=>{
			assert.equal(schema.schema.name,"genome")
			done()
		})
	})

	it("generic get(datatype,id) async", async function () {
		var genome = await svc.get("genome", test_genome_id)
		assert.equal(genome.genome_id, test_genome_id, "Mismatched Genome ID")
	});

	it("generic get(datatype,id) promise", function (done) {
		svc.get("genome", test_genome_id).then((genome)=>{
			assert.equal(genome.genome_id, test_genome_id)
			done()
		})
	});

	it("get non-existant genome async", async function () {
		const test_genome_id = "invalid_id"
		try {
			var genome = await svc.get("genome", test_genome_id)
			throw Error("Should be not found error");
		} catch (err) {
			// console.log("err: ", err, typeof err, err instanceof errors.NotFound)

			assert.instanceOf(err,errors.NotFound,"Should be NotFound Error")
		}
	})

	it("get non-existant genome promise", function (done) {
		const test_genome_id = "invalid_id"
		svc.get("genome", test_genome_id).then((genome)=>{
			done(Error("Should be NotFound Error"))
		},(err)=>{
			assert.instanceOf(err,errors.NotFound,"Should be NotFound Error")
			done()
		})
	})

	it("get invalid data type async", async function () {
		const test_genome_id = "invalid_id"
		try {
			await svc.get("invalid", test_genome_id)
		} catch (err) {
			assert.instanceOf(err,errors.InvalidDataType,"Should be instance of InvalidDataType Error")
		}
	})

	it("get invalid data type promise", function (done) {
		const test_genome_id = "invalid_id"
		svc.get("invalid", test_genome_id).then(()=>{
			done(Error("Should be InvalidDataType"))
		}).catch((err)=>{
			assert.instanceOf(err,errors.InvalidDataType,"Should be instance of InvalidDataType Error")
			done()
		})
	})

	it("query rql async", async function () {
		const test_genome_id = "227377.26"
		var result = await svc.query("genome", `eq(genome_id,${test_genome_id})`);
		var genomes = result.items;
		assert.lengthOf(genomes, 1, "query result size should be 1")
		assert.equal(genomes[0].genome_id, test_genome_id)
	});

	it("query rql async - solr response obj", async function () {
		const test_genome_id = "227377.26"
		var result = await svc.query("genome", `eq(genome_id,${test_genome_id})`, {accept: "application/solr+json"});
		var genomes = result.response.docs;
		assert.lengthOf(genomes, 1, "query result size should be 1")
		assert.equal(genomes[0].genome_id, test_genome_id)
	});

	it("query rql async - TSV Response", async function () {
		const test_genome_id = "227377.26"
		var result = await svc.query("genome", `eq(genome_id,${test_genome_id})`, {accept: "text/tsv"});
		var genome = result.split('\n')[1]
		var genome_id = genome.split("\t")[0]
		assert.equal(genome_id, `"${test_genome_id}"`)
	});

	it("query rql promise", function (done) {
		const test_genome_id = "227377.26"
		svc.query("genome", `eq(genome_id,${test_genome_id})`).then((result)=>{
			const genomes = result.items
			assert.lengthOf(genomes, 1, "query result size should be 1")
			assert.equal(genomes[0].genome_id, test_genome_id)
			done()
		})
	});

	it("query rql promise - solr response -obj", function (done) {
		const test_genome_id = "227377.26"
		svc.query("genome", `eq(genome_id,${test_genome_id})`,{accept: "application/solr+json"}).then((result)=>{
			const genomes = result.response.docs
			assert.lengthOf(genomes, 1, "query result size should be 1")
			assert.equal(genomes[0].genome_id, test_genome_id)
			done()
		})
	});

	it("query solr async", async function () {
		const test_genome_id = "227377.26"
		var result = await svc.query("genome", `genome_id:${test_genome_id}`,{"query_lang": "solr"});
		var genomes = result.items
		assert.lengthOf(genomes, 1, "query result size should be 1")
		assert.equal(genomes[0].genome_id, test_genome_id)
	});

	it("query solr promise", function (done) {
		const test_genome_id = "227377.26"
		svc.query("genome", `genome_id:${test_genome_id}`,{"query_lang": "solr"}).then((result)=>{
			var genomes = result.items
			assert.lengthOf(genomes, 1, "query result size should be 1")
			assert.equal(genomes[0].genome_id, test_genome_id)		
			done()	
		})
	});
});
