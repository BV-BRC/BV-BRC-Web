define(["dojo/date/locale","dojo/dom-construct","dojo/dom-class"],function(locale,domConstruct,domClass){

	var formatters = {
		"default": function(item, options){
			console.log("item: ", item);
			options = options || {}

			var table = domConstruct.create("table");
			var tbody = domConstruct.create("tbody",{},table);
			
			Object.keys(item).sort().forEach(function(key){
				var tr = domConstruct.create("tr",{},tbody)
				var tda = domConstruct.create("td",{innerHTML: key}, tr);
				var tdb = domConstruct.create("td",{innerHTML: item[key]}, tr);
			},this);		

			return table;
		},

		"someOtherType": function(item, options){
			// do some other type formatting here and return it
		}	
	}

	return function(item, type, options) {
		console.log("Format Data: ", type, item);
		var out;
		if (type && formatters[type]) {
			out = formatters[type](item,options)
		}else{
			out = formatters["default"](item,options);
		}

		console.log("output: ", out);
		return out;
	}
});
