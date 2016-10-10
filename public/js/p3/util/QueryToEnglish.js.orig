define([
	"dojo/_base/declare", "dojo/_base/lang",
	"rql/parser"
], function(declare, lang,
			RQLParser){

	var parseQuery = function(filter){
		// console.log("PARSE: ", filter);

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
					// console.log("IN F: ", f, "V: ",v, term)
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
					// console.log("F: ", f, "V: ",f, term)
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

	function valueWrap(val,alt){
		val = decodeURIComponent(val);
		return '<span class="queryValue" title="' + (alt||"") + '">' + val + "</span>";
	}

	return function(query){
		var parsed = parseQuery(query);
		var out = [];

		// console.log("PARSED: ", parsed);
		var catsEnglish = Object.keys(parsed.byCategory).map(function(cat){
			var cout = ['<span class="queryField">' + cat + '</span> is'];
			var C = parsed.byCategory[cat];
			if(C.length == 1){
				cout.push(valueWrap(C[0]));
			}else if(C.length == 2){
				var vals = C.map(valueWrap).join('  <span class="queryOperator"> OR </span> ');
				cout.push(vals)
			}else{
				var vals = C.map(valueWrap).slice(0, C.length - 1).join(', ') + ', <span class="queryOperator"> OR </span>' + valueWrap(C[C.length - 1]);
				cout.push(vals);
			}
			return cout.join(' ');
		}).join(' <span class="queryOperator"> AND </span> ');

		if(catsEnglish){
			out.push(" where " + catsEnglish)
		}

		if (parsed.contains){
			var ins = Object.keys(parsed.contains).forEach(function(prop){

				out.push(" where <span class='queryField'>" + prop + "</span> is in ");
				out.push(parsed.contains[prop].map(function(val){
					if (val.length > 25){
						return valueWrap(val.slice(0,25) + "...", val);
					}else{
						return valueWrap(val,val);
					}
				}).join(" OR "));
			})
		}

		var keywords = parsed.keywords.map(valueWrap);
		if(keywords.length < 1){

		}else if(keywords.length == 1){
			out.push("that match the keyword " + keywords[0])
		}else if(keywords.length == 2){
			out.push("that match both keywords  " + keywords.join(' <span class="queryOperator"> AND </span> '))
		}else{
			out.push("that match all of the keywords " + keywords.slice(0, keywords.length - 1).join(", ") + ', <span class="queryOperator"> AND </span> ' + keywords[keywords.length - 1])
		}

		// console.log(" ENGLISH OUT: ", out.join(' <span class="queryOperator"> AND </span> '));

		return out.join(" ");
		//console.log("parsed query: ", parsed);
	}

});
