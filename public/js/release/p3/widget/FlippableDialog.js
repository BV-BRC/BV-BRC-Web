define("p3/widget/FlippableDialog", [
	"dojo/_base/declare", "dijit/Dialog","dojo/dom-construct",
	"dojo/dom-geometry","dojo/dom-style", "dojo/window", "dojo/sniff"

], function(
	declare, Dialog, domConstr,
	domGeometry, domStyle,winUtils,has
){
	return declare([Dialog],{
		postCreate: function(){
			this.inherited(arguments);
			this.backPane = domConstr.create("div",{"class": "backpane", innerHTML: "Loading Back Panel Content", style:{"width":"300px","height":"200px","background":"#fff"}});
			domConstr.place(this.backPane, this.containerNode, "after");	
		}, 

		_setBackpaneContentAttr: function(content){
			this.backPane.innerHTML=content;
		}

	});
});

