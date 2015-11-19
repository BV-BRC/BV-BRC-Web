define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on","dojo/dom-construct",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/GlobalSearch.html","./Button","dijit/registry","dojo/_base/lang",
	"dojo/dom","dojo/topic","dijit/form/TextBox","dojo/keys","dijit/_FocusMixin","dijit/focus"
], function(
	declare, WidgetBase, on,domConstruct,
	domClass,Templated,WidgetsInTemplate,
	template,Button,Registry,lang,
	dom,Topic,TextBox,keys,FocusMixin,focusUtil
){
	return declare([WidgetBase,Templated,WidgetsInTemplate,FocusMixin], {
		templateString: template,
		constructor: function(){
		},
		"baseClass": "GlobalSearch",
		"disabled":false,
		"value": "",
		_setValueAttr: function(q){
			this.query=q;	
			this.searchInput.set("value", q);
		},

		onKeypress: function(evt){
			if (evt.charOrCode==keys.ENTER) {
				var query = this.searchInput.get('value');
				var searchFilter = this.searchFilter.get('value');
				if (!query){
					return;
				}

				switch(searchFilter){
					case "genome":
						var parts = query.split(" ");
						if (parts){
							q = parts.map(function(w){ return "keyword(" + encodeURIComponent(w) + ")"} )
							console.log(" Mapped: ", q, "Num Parts: ", parts.length)

							if (parts.length>1){
								q = "and(" + q.join(",") + ")";
							}else{
								q = q[0]
							}
							console.log("Q: ",q)
							Topic.publish("/navigate", {href: "/view/GenomeList/?" + q});
							this.searchInput.set("value", '');
						}else{
							return;
						}

					default: 
						console.log("Do Search: ", searchFilter, query);
				}

				console.log("Do Search: ", searchFilter, query);
			}
		},
		onClickAdvanced: function(evt){
			Topic.publish("/navigate", {href: "/search/"});
		},
		onInputChange: function(val){
			/*
			val = val.replace(/\ /g, "&");
			var dest = window.location.pathname + "?" + val;
			console.log("New Search Value",val,dest );
			Topic.publish("/navigate", {href: dest, set: "query", value: "?"+val});
			*/
		}
	});
});


