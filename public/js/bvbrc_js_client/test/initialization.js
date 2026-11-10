const chai = require("chai");
const assert = chai.assert
const Service = require("../src")
const errors = require("../src/errors");

const endpoint = "https://patricbrc.org/api"

//const endpoint = "http://localhost:3001"
//const endpoint='https://httpbin.org/post'

describe("Initialization Tests API Tests", function () {
	const svc = new Service()
	const test_genome_id = "227377.26"


	it("get while uninitialized", async function () {
		try {
			var genome = await svc.get("genome", test_genome_id)
			throw Error("Should be ClientNotInitialized error");
		} catch (err) {
			// console.log("err: ", err, typeof err, err instanceof errors.NotFound)

			assert.instanceOf(err,errors.ClientNotInitialized,"Should be ClientNotInitialized Error")
		}
	})

	it("get after initialization", async function () {
		svc.init(endpoint)
		var genome = await svc.get("genome", test_genome_id)
		assert.equal(genome.genome_id, test_genome_id, "Mismatched Genome ID")
	});

});
