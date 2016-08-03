define([
        "dojo/_base/declare", "dijit/layout/ContentPane", "dojo/on"
], function(declare, ContentPane,on){

        return declare([ContentPane], {
		helpId: "",
		baseUrl: "/public/help/",
		_setHelpIdAttr: function(id){
			this.helpId=id;
			this.set("href",this.baseUrl + id);
		},
		startup: function(){
			if (this._started){return;}
			this.inherited(arguments);
			if (this.helpId){
				this.set("helpId",this.helpId);
			}
		}
	});
});
