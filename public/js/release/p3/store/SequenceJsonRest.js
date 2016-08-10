define("p3/store/SequenceJsonRest", [
	"dojo/_base/declare",
	"./P3JsonRest"
], function(declare,
			Store){
	return declare([Store], {
		dataModel: "genome_sequence",
		idProperty: "sequence_id",
		facetFields: [],
		defaultFieldList: ["owner", "version", "release_date", "gc_content", "taxon_id", "sequence_type", "sequence_id", "description",
			"accession", "length", "gi", "public", "genome_name", "genome_id", "date_inserted", "topology"],

		query: function(query, opts){
			//we have to make the default query exclude the actual sequences themselves or it is way too slow
			var sel = "&select(" + this.defaultFieldList.join(",") + ")";
			query = query + sel;
			// console.log("Query: ", query);
			return Store.prototype.query.apply(this, [query, opts]);
		}
	});
});

