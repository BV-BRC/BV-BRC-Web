define("p3/widget/TaxonNameSelector", [
	"dijit/form/FilteringSelect","dojo/_base/declare",
	"dojo/store/JsonRest","dojo/_base/lang","dojo/when",
    "../util/PathJoin","dijit/form/_AutoCompleterMixin"
], function(
	FilteringSelect, declare, 
	Store,lang,when,PathJoin,AutoCompleterMixin
){
	
	return declare([FilteringSelect, AutoCompleterMixin], {
		apiServiceUrl: window.App.dataAPI,
		promptMessage:'Taxonomy name of the organism being annotated.',
		missingMessage:'Taxonomy Name must be provided.',
		placeHolder:'e.g. Bacillus Cereus',
		searchAttr: "taxon_name",
        resultFields: ["taxon_name","taxon_id","taxon_rank", "lineage_names"],
        rankAttrs: ["taxon_rank"],
        subStringAttrs: ["taxon_name"],
        promoteAttrs: ["taxon_name"],
        boostQuery:["taxon_rank:(superkingdom)^7000000","taxon_rank:(phylum)^6000000","taxon_rank:(class)^5000000","taxon_rank:(order)^4000000","taxon_rank:(family)^3000000","taxon_rank:(genus)^2000000", "taxon_rank:(species)^1000000","taxon_rank:*"],
        intAttrs:["taxon_id"],
        rankList:["species","no rank","genus","subspecies","family","order","class","phylum","species group","suborder","varietas","species subgroup","subclass","subgenus","forma","superphylum","superkingdom","tribe","subfamily","subphylum"],
		//query: "?&select(taxon_name)",
		queryExpr: "${0}",
		pageSize: 25,
		highlightMatch: "all",
        segmentWildcard: true,
		autoComplete: false,
		store: null,
		constructor: function(){
            this.constructorSOLR();
			//if (!this.store){
			//	this.store = new Store({target: this.apiServiceUrl + "/taxonomy/", idProperty: "taxon_id", headers: {accept: "application/json"}});
			//}
		},
		constructorSOLR: function(){
			var _self=this;
			if (!this.store){
				this.store = new Store({target: PathJoin(this.apiServiceUrl, "/taxonomy/"), idProperty: "taxon_id", headers: {accept: "application/json", "content-type": "application/solrquery+x-www-form-urlencoded"}});
			}

			var orig = this.store.query;
			this.store.query = lang.hitch(this.store, function(query,options){
				console.log("query: ", query);
				console.log("Store Headers: ", _self.store.headers);
				var q = "?q=";
                var extraSearch=[];
                var qString=query[_self.searchAttr].toString().replace(/\(|\)|\.|\*|\||\[|\]/g,'');

                var rankParts=[];
                _self.rankList.forEach(function(rank){
                    var re = new RegExp("(\\b)"+rank+"(\\b)","gi");
                    var newQString = qString.replace(re, "");
                    if (newQString != qString){
                        rankParts.push(rank);
                        qString= newQString.trim();
                    }
                });
               
                if (_self.segmentWildcard){
                    var queryParts= qString ? qString.split(/[ ,]+/) : [];

                    /*rankParts.forEach(function(qPart){
                        _self.rankAttrs.forEach(function(item){
                            extraSearch.push('('+item + ':' + qPart + ')');
                        });
                    });

                    queryParts.forEach(function(qPart){
                        _self.intAttrs.forEach(function(item){
                            if(!isNaN(qPart) && qPart){ //only if its a number
                                extraSearch.push("("+item + ":" + qPart + ")");
                            }
                        });
                        _self.subStringAttrs.forEach(function(item){
                            if (qPart.length > 1){
                                extraSearch.push("("+item + ":" + qPart + ")"); //for this attribute value an exact match valued more
                                extraSearch.push("("+item + ":*" + qPart + "*)");
                            }
                        });
                    });*/
                    if(queryParts.length){
                        _self.subStringAttrs.forEach(function(item){
                            extraSearch.push("("+item + ":*" + queryParts.join('*') + "*)");
                            extraSearch.push("("+item + ":" + queryParts.join(' ') + ")");
                        });
                    }

                    q+="("+extraSearch.join(' OR ')+")";
                }
                else{
                    q+=qString
                }


                //pump up the volume on higher ranks
				if (_self.boostQuery && _self.boostQuery.length>0) {
                    q+=" AND ("+_self.boostQuery.join(" OR ")+")"
                    //q +='&defType=dismax'; //&bq='+_self.boostQuery.join(' OR ');
                    //q = q.replace("?q=","?q.alt=");
                   // _self.boostQuery.forEach(function(item){
                   //     q += "&bq="+item
                   // });
                }

				if (_self.queryFilter) {
					q+=_self.queryFilter
				}

				if (_self.resultFields && _self.resultFields.length>0) {
					q += "&fl=" + _self.resultFields.join(",");
				}
				if (_self.promoteAttrs && _self.promoteAttrs.length>0) {
					q += '&qf=' + _self.promoteAttrs.join(" ");
				}
                //var re = new RegExp("\\s+","gi");
                //q=q.replace(re,"+"); //hack appropriate web api handling spaces
				console.log("Q: ", q);
				return orig.apply(_self.store,[q,options]);
			});	
		},
        // Very strange bug caused by this being active. Asynch validation causes top first choice to be picked
		/*
          isValid: function(){
			return (!this.required || this.get('displayedValue') != "");
		},*/
		labelFunc: function(item, store){
			var label="["+item.taxon_rank+"] "  + item.taxon_name;
			return label;
		}

	});
});
