define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/xhr",
	"dijit/layout/ContentPane", "dojo/dom-construct"
	], function(declare, lang, xhr,
	ContentPane, domConstruct){

	return declare([ContentPane], {

		_setContent: function(data){

			var parsed = domConstruct.toDom(data);

			if (parsed.childNodes.length === 2){
				this.inherited(arguments);
			}
			else {

				for(i = 0; i < parsed.childNodes.length; i++){
					// console.log(parsed.childNodes[i])
					if(parsed.childNodes[i].tagName === "TITLE"){
						window.document.title  = parsed.childNodes[i].innerHTML
					} else if (parsed.childNodes[i].tagName === "DIV"){
						arguments[0] = parsed.childNodes[i]
					}
				}

				this.inherited(arguments);
			}
		},
		onLoad: function(){
			this.containerNode.classList.add("webpage")
		}
	})
})