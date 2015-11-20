define([
     "dojo/_base/declare",
     "./P3JsonRest"
], function(
    declare,
    Store
){
        return declare([Store], {
        	dataModel: "pathway",
		idProperty: "pathway_id",
   	     	facetFields: ["annotation","gene","pathway_class"]
        });
});

