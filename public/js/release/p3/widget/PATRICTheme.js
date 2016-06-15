define("p3/widget/PATRICTheme", [
	"dojox/charting/SimpleTheme",
	"dojox/charting/themes/common"
], function(SimpleTheme, themes){

	themes.PATRIC = new SimpleTheme({
		colors: [
			"#1f497d", "#4f81bd", "#4bacc6", "#f79646", "#9bbb59"
		]
	});

	return themes.PATRIC;
});