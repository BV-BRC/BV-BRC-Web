define([
	"dojo/_base/declare",
	"dojo/store/util/QueryResults",
	"./P3JsonRest"
], function(declare,
			QueryResults,
			Store){
	return declare([Store], {
		dataModel: "genome_amr",
		idProperty: "id",
		facetFields: [],

		query: function(query, opts){
			//we have to make the default query exclude the actual sequences themselves or it is way too slow
			// var sel = "&select(" + this.defaultFieldList.join(",") + ")";
			// query = query + sel;
			if(!query){
				return QueryResults([]);
			}
			// console.log("Query: ", query);
			return Store.prototype.query.apply(this, [query, opts]);
		}
	});
});

