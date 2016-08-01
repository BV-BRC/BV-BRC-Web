define([
	"dojo/_base/declare", "dojo/_base/Deferred",
	"./P3JsonRest", "dojo/when", "dojo/store/util/QueryResults"
], function(declare, defer,
			Store, when, QueryResults){
	//["no rank","varietas","forma","tribe",

	//var ranks = ["domain","superkingom","kingdom","superphylum", "phylum","subphylum", "class","subclass","order","suborder", "family","subfamily","genus","subgenus", "speciesgroup", "species","speciessubgroup","subspecies","no rank"]
	return declare([Store], {
		dataModel: "taxonomy",
		idProperty: "taxon_id",
		facetFields: [],
		mayHaveChildren: function(parent){
			return true;
			// return (parent.taxon_rank != "no rank");// && (parent.taxon_rank != "species")
		},
		getChildren: function(parentItem, opts){
			if(!parentItem.genomes || parentItem.genomes < 1){
				return false;
			}

			var prank = parentItem.taxon_rank
			var nextRank, nextRankQ;
			var _self = this;
			switch(prank){
				case "domain":
					nextRank = "superkingdom";
					nextRankQ = "or(eq(taxon_rank,superkingdom),eq(taxon_rank,kingdom))";
					break;
				case "superkingdom":
					nextRank = "kingdom";
					nextRankQ = "or(eq(taxon_rank,kingdom),eq(taxon_rank,superphylum),eq(taxon_rank,phylum))";
					break;
				case "kingdom":
					nextRank = "superphylum";
					nextRankQ = "or(eq(taxon_rank,superphylum),eq(taxon_rank,phylum))";
					break;
				case "superphylum":
					nextRank = "phylum";
					nextRankQ = "eq(taxon_rank,phylum)";
					break;
				case "phylum":
					nextRank = "subphylum";
					nextRankQ = "or(eq(taxon_rank,subphylum),eq(taxon_rank,class))";
					break;
				case "subphylum":
					nextRank = "class"
					nextRankQ = "eq(taxon_rank,class)";
					break;
				case "class":
					nextRank = "subclass";
					nextRankQ = "or(eq(taxon_rank,subclass),eq(taxon_rank,order))";
					break;
				case "subclass":
					nextRank = "order";
					nextRankQ = "eq(taxon_rank,order)";
					break;
				case "order":
					nextRank = "suborder";
					nextRankQ = "or(eq(taxon_rank,suborder),eq(taxon_rank,family))";
					break;
				case "suborder":
					nextRank = "family";
					nextRankQ = "eq(taxon_rank,family)";
					break;
				case "family":
					nextRank = "subfamily";
					nextRankQ = "or(eq(taxon_rank,subfamily),eq(taxon_rank,genus))";
					break;
				case "subfamily":
					nextRank = "genus";
					nextRankQ = "or(eq(taxon_rank,subfamily),eq(taxon_rank,genus))";
					break;

				case "genus":
					nextRank = "subgenus";
					nextRankQ = "or(eq(taxon_rank,subgenus),eq(taxon_rank,\%22species%20group\%22),eq(taxon_rank,species))";
					break;
				case "subgenus":
					nextRank = "species group";
					nextRankQ = "or(eq(taxon_rank,subgenus),eq(taxon_rank,\%22species%20group\%22),eq(taxon_rank,species))";
					break;
				case "species group":
					nextRank = "species";
					nextRankQ = "or(eq(taxon_rank,species),eq(taxon_rank,\%22no%20rank\%22))";
					break;
				case "species":
					nextRank = "subspecies";
					nextRankQ = "or(eq(taxon_rank,subspecies),eq(taxon_rank,\%22no%20rank\%22))";
					break;
	
				case "subspecies":
					nextRank = "no rank";
					nextRankQ = "eq(taxon_rank,\%22no%20rank\%22)";
					break;
				case "no rank":
					nextRank = false;
					nextRankQ = false;
				// return false;
			}

			// if (!nextRank) { return false; }
			// nextRankQ = "eq(taxon_rank,\%22" + nextRank.replace(" ","%20") + "\%22)";

			var query = "and(gt(genomes,0)," + nextRankQ + ",eq(lineage_ids," + parentItem.taxon_id + "))"

			console.log("TaxonTreeGrid Query: ", query)
			var def = new defer();
			def.total = new defer();

			var q = this.query(query, opts)

			when(q.total, function(total){
				console.log("Q TOTAL: ", total);
				if(total<1 && nextRank){
					console.log("SHOULD RECURSE HERE: ", nextRank, total);
					var rec = _self.getChildren({
						genomes: parentItem.genomes,
						taxon_id: parentItem.taxon_id,
						taxon_rank: nextRank
					}, opts);
					when(rec.total, function(tot){
						def.total.resolve(tot);
					})
					when(rec, function(res){
						def.resolve(res);
					}, function(err){
						def.reject(err);
					});

				}else{
					def.total.resolve(total)
					when(q, function(res){
						def.resolve(res)
					}, function(err){
						def.reject(err);
					})
				}
			})

			return QueryResults(def);
		}
	});
});

