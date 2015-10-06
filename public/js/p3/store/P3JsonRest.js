define([
        "dojo/_base/declare",
               "dojo/store/JsonRest",
               "dojo/store/util/QueryResults",
                "dojo/when","dojo/_base/lang",
                "dojo/_base/xhr", "dojo/json",
                "dojo/Evented"

], function(
    declare,
    Store,
    QueryResults,
    when,lang,
    xhr,json,
    Evented
){
        return declare([Store,Evented], {
            constructor: function(options){
                console.log("P3JsonRest Options", options);
                this.target = (window.App.dataServiceURL ? (window.App.dataServiceURL) : "") + "/" + this.dataModel + "/";
            },
            autoFacet: false,
            dataModel: "",
        	target: "",
            idProperty: "id",
			headers: {
				"accept": "application/solr+json",
				"content-type": "application/json",
				'X-Requested-With': null,
				'Authorization': (window.App.authorizationToken || "")
			},
            query: function(query, options){
                console.log("p3JsonRest Query: ",typeof query, options);
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

        var headers = lang.mixin({ Accept: this.accepts }, this.headers, options.headers);

        var hasQuestionMark = this.target.indexOf("?") > -1;
        if(query && typeof query == "object"){
            query = xhr.objectToQuery(query);
            query = query ? (hasQuestionMark ? "&" : "?") + query: "";
        }
        if(options.start >= 0 || options.count >= 0){
            headers["X-Range"] = "items=" + (options.start || '0') + '-' +
                (("count" in options && options.count != Infinity) ?
                    (options.count + (options.start || 0) - 1) : '');
            if(this.rangeParam){
                query += (query || hasQuestionMark ? "&" : "?") + this.rangeParam + "=" + headers["X-Range"];
                hasQuestionMark = true;
            }else{
                headers.Range = headers["X-Range"];
            }
        }
        if(options && options.sort){
            var sortParam = this.sortParam;
            query += (query || hasQuestionMark ? "&" : "?") + (sortParam ? sortParam + '=' : "sort(");
            for(var i = 0; i<options.sort.length; i++){
                var sort = options.sort[i];
                query += (i > 0 ? "," : "") + (sort.descending ? this.descendingPrefix : this.ascendingPrefix) + encodeURIComponent(sort.attribute);
            }
            if(!sortParam){
                query += ")";
            }
        }
        var results = xhr("GET", {
            url: this.target + (query || ""),
            handleAs: "json",
            headers: headers
        });

        results.facets = results.then(lang.hitch(this, function(){
            //console.log("Facet Results: ", results.body.facet_counts);
            
            var facets = results.ioArgs.xhr.getResponseHeader("facet_counts");
            console.log("facet_counts", facets)
            facets = JSON.parse(facets)
            if (!facets) { return true};
            var finalFacets = {}
            

            Object.keys(facets).forEach(function(facetType){
                console.log("facetType: ". facetType)
                finalFacets[facetType]={}
                Object.keys(facets[facetType]).forEach(function(category){
                    console.log("\tCategory", category)
                    var data = facets[facetType][category];
                    console.log("\t\tdata",category, data)
                    var i=0;
                    finalFacets[facetType][category]=[];
                    while(i<data.length-1){
                        console.log("\t\t\tFacet Data ",i,data[i], data[i+1])
                        var cobj = {label: data[i], value: data[i], count: data[i+1]}
                        finalFacets[facetType][category].push(cobj);
                        i=i+2;
                    }
                },this)
            },this)
           
            this.emit("facet_counts", {store: this, facet_counts: finalFacets});
            
            //console.log("facets: ", facets);
            return finalFacets;
        }));

        results.total = results.then(function(){
            var range = results.ioArgs.xhr.getResponseHeader("Content-Range");
            if (!range){
                // At least Chrome drops the Content-Range header from cached replies.
                range = results.ioArgs.xhr.getResponseHeader("X-Content-Range");
            }
            return range && (range = range.match(/\/(.*)/)) && +range[1];
        });
        return QueryResults(results);
    }

        });
});

