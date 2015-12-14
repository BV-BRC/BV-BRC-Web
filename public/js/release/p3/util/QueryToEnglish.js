define("p3/util/QueryToEnglish", [
	"dojo/_base/declare", "dojo/_base/lang",
	"rql/parser"
], function(
	declare,lang,
	RQLParser
){


    var parseQuery = function(filter){
    	try {
    		var _parsed = RQLParser.parse(filter)
    	}catch(err){
    		console.log("Unable To Parse Query: ", filter);
    		return;
    	}
    	
		var _self=this;

		var parsed = {
			parsed: _parsed,
			selected: [],
			byCategory: {},
			keywords: []
		}

		function walk(term){
			// console.log("Walk: ", term.name, " Args: ", term.args);
			switch(term.name){
				case "and":
				case "or":
					term.args.forEach(function(t){
						walk(t);
					})
					break;
				case "eq":
					var f = decodeURIComponent(term.args[0]);
					var v = decodeURIComponent(term.args[1]);
					parsed.selected.push({field:f, value: v});
					if (!parsed.byCategory[f]){
						parsed.byCategory[f]=[v];
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

    }

    function valueWrap(val){
    	val = decodeURIComponent(val);
    	return '<span class="queryValue">' + val + "</span>";
    }

	return function(query){
		var parsed = parseQuery(query);
		var out=[];

		var catsEnglish = Object.keys(parsed.byCategory).map(function(cat){
			var cout = ['<span class="queryField">'+cat + '</span> is']
			var C = parsed.byCategory[cat];
			if (C.length==1){
				cout.push(valueWrap(C[0]));
			}else if (C.length==2){
				var vals = C.map(valueWrap).join('  <span class="queryOperator"> OR </span> ');
				cout.push(vals)
			}else{
				var vals= C.map(valueWrap).slice(0,C.length-1).join(', ') + ', <span class="queryOperator"> OR </span>' + valueWrap(C[C.length-1]);
				cout.push(vals);
			}
			return cout.join(' ');
		}).join(' <span class="queryOperator"> AND </span> ')

		if (catsEnglish){ out.push(" where " + catsEnglish)}

		var keywords = parsed.keywords.map(valueWrap);
		if (keywords.length<1){

		}else if (keywords.length==1){
			out.push("that match the keyword "  + keywords[0] )
		}else if (keywords.length==2){
			out.push("that match both keywords  " + keywords.join(' <span class="queryOperator"> AND </span> '))
		}else{
			out.push("that match all of the keywords " + keywords.slice(0,keywords.length-1).join(", ") + ', <span class="queryOperator"> AND </span> ' + keywords[keywords.length-1])
		}

		console.log(" ENGLISH OUT: ", out.join(' <span class="queryOperator"> AND </span> '));

		return out.join(" ");
		console.log("parsed query: ", parsed);
	}

});
