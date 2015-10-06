define([
     "dojo/_base/declare",
     "./P3JsonRest",
], function(
    declare,
    Store
){
        return declare([Store], {
        	autoFacet: true,
        	facetFields: ["feature_type", "annotation"],
        	dataModel: "genome_feature"
        });
});

