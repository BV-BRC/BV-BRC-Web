define([
	"dojo/_base/declare", "dojo/_base/Deferred",
	"./P3JsonRest", "dojo/store/util/QueryResults",
	"dojo/when", "dojo/_base/lang"
], function(declare, Deferred,
			Store, QueryResults,
			when, lang){
	return declare([Store], {
		dataModel: "pathway",
		idProperty: "pathway_id",
		facetFields: ["annotation", "gene", "pathway_class"],
		init: function(){
			this.headers = {
				"accept": "application/solr+json",
				"content-type": "application/rqlquery+x-www-form-urlencoded",
				'X-Requested-With': null,
				'Authorization': (window.App.authorizationToken || "")
			}

		},
		query: function(query, options){
			// console.log("p3JsonRest Query: ",typeof query, options);
			// summary:
			//      Queries the store for objects. This will trigger a GET request to the server, with the
			//      query added as a query string.
			// query: Object
			//      The query to use for retrieving objects from the store.
			// options: __QueryOptions?
			//      The optional arguments to apply to the resultset.
			// returns: dojo/store/api/Store.QueryResults
			//      The results of the query, extended with iterative methods.
			options = options || {};
			var headers = lang.mixin({
				Accept: this.accepts
			}, this.headers, options.headers);
			// console.log("Store Req Headers: ", headers, "this.headers: ",this.headers, " opts.headers: ", options.headers, this);
			var hasQuestionMark = this.target.indexOf("?") > -1;
			if(query && typeof query == "object"){
				query = xhr.objectToQuery(query);
				query = query ? (hasQuestionMark ? "&" : "?") + query : "";
			}
			query = query || "";

			//            console.log("p3JsonRest Query: ", query)
			if(options.start >= 0 || options.count >= 0){
				headers["X-Range"] = "items=" + (options.start || '0') + '-' +
					(("count" in options && options.count != Infinity) ?
						(options.count + (options.start || 0) - 1) : '');
				if(this.rangeParam){
					query += (query || hasQuestionMark ? "&" : "?") + this.rangeParam + "=" + headers["X-Range"];
					hasQuestionMark = true;
				}
				else{
					headers.Range = headers["X-Range"];
				}
				// var l = [];
				// if (options.count) {
				// 	l.push(options.count);
				// }
				// if (options.start) {
				// 	l.push(options.start);
				// }
				//query = query + "&limit(" + l.join(",") + ")";
			}

			if(options && options.sort){
				var sortParam = this.sortParam;
				query += (query || hasQuestionMark ? "&" : "?") + (sortParam ? sortParam + '=' : "sort(");
				for(var i = 0; i < options.sort.length; i++){
					var sort = options.sort[i];
					query += (i > 0 ? "," : "") + (sort.descending ? this.descendingPrefix : this.ascendingPrefix) + encodeURIComponent(sort.attribute);
				}
				if(!sortParam){
					query += ")";
				}
			}

			// this is the POST version
			query = (query && (typeof query == 'string') && (query.charAt(0) == "?")) ? query.substr(1) : query;
			console.log("DO POST: ", query);
			var rawres = dojo.rawXhrPost({
				url: this.target,
				postData: query || "",
				handleAs: "json",
				headers: headers
			}, true);

			var defer = new Deferred();

			defer.total = new Deferred();

			when(rawres, function(res){
				var params = (res && res.responseHeader && res.responseHeader.params) ? res.responseHeader.params : {};
				if(params["json.facet"]){
					if(typeof params["json.facet"] == "string"){
						params["json.facet"] = JSON.parse(params["json.facet"]);
					}
				}
				var data;
				// console.log("RES: ", res)
				if(res.grouped && params["group.field"] && res.grouped[params["group.field"]].doclist){
					defer.total.resolve(res.grouped[params["group.field"]].ngroups || res.grouped[params["group.field"]].doclist.docs.length)
					data = res.grouped[params["group.field"]].doclist.docs || []
				}else{
					defer.total.resolve(res.results.numFound);
					data = res.results.docs
				}

				if(params["json.facet"] && res.facets && res.facets.stat && res.facets.stat.buckets){
					var f = params["json.facet"];
					var buckets = res.facets.stat.buckets;
					var map = {};
					buckets.forEach(function(b){
						map[b["val"]] = b;
						delete b["val"];
					});

					if(f.stat && f.stat.field && f.stat.field.field){
						var ffield = f.stat.field.field;
						data.forEach(function(i){
							if(i[ffield] && map[i[ffield]]){
								lang.mixin(i, map[i[ffield]]);
								if(map[i[ffield]].genome_count && map[i[ffield]].ec_count){
									i.ec_cons = map[i[ffield]].genome_ec / map[i[ffield]].genome_count / map[i[ffield]].ec_count * 100;
									i.gene_cons = map[i[ffield]].gene_count / map[i[ffield]].genome_count / map[i[ffield]].ec_count;
								}
							}
						})
					}
				}

				// console.log("data[0]", data[0])
				console.log("DEF: ", defer);
				if(defer.fired){
					defer.resolve(data);
				}
			}, function(err){
				if(defer.fired){
					defer.reject(err);
				}
			});

			return QueryResults(defer);
		}
	});
});

