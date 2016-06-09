define("p3/util/QueryToSearchInput", [
	"dojo/_base/declare", "dojo/_base/lang",
	"rql/parser"
], function(declare, lang,
			RQLParser){

	var parseQuery = function(filter){
		console.log("PARSE: ", filter);

		var parsed = {
			parsed: _parsed,
			selected: [],
			byCategory: {},
			keywords: [],
			contains:{}
		};

		try{
			var _parsed = RQLParser.parse(filter)
		}catch(err){
			console.log("Unable To Parse Query: ", filter);
			return;
		}

		var _self = this;

		function walk(term){
			// console.log("Walk: ", term.name, " Args: ", term.args);
			switch(term.name){
				case "and":
				case "or":
					term.args.forEach(function(t){
						walk(t);
					});
					break;
				case "in":
					var f = decodeURIComponent(term.args[0]);
					var v = decodeURIComponent(term.args[1]);
					console.log("IN F: ", f, "V: ",v, term)
					// parsed.selected.push({field: f, value: v});
					if(!parsed.contains[f]){
						parsed.contains[f] = [v];
					}else{
						parsed.contains[f].push(v);
					}
					break;
				case "eq":
					var f = decodeURIComponent(term.args[0]);
					var v = decodeURIComponent(term.args[1]);
					console.log("F: ", f, "V: ",f, term)
					parsed.selected.push({field: f, value: v});
					if(!parsed.byCategory[f]){
						parsed.byCategory[f] = [v];
					}else{
						parsed.byCategory[f].push(v);
					}
					break;
				case "keyword":
					parsed.keywords.push(term.args[0]);
					break;
				default:
				// console.log("Skipping Unused term: ", term.name, term.args);
			}
		}

		walk(_parsed);


		return parsed;

	};

	function valueWrap(val){
		val = decodeURIComponent(val);
		return '<span class="queryValue">' + val + "</span>";
	}

	return function(query){
		var parsed = parseQuery(query);
		var out = [];

		console.log("PARSED: ", parsed);


		Object.keys(parsed.byCategory).forEach(function(cat){
			var C = parsed.byCategory[cat];
			C.forEach(function(val){
				out.push(cat + ":" + decodeURIComponent(val));
			})
		})


		// if (parsed.contains){
		// 	var ins = Object.keys(parsed.contains).forEach(function(prop){
		// 		out.push("contains " + prop + " " + parsed.contains[prop].map(valueWrap).join(" OR "));
		// 	})
		// }

		var keywords = parsed.keywords.forEach(function(val){
			out.push(decodeURIComponent(val));
		});
		return out.join(" ");
	}

});
