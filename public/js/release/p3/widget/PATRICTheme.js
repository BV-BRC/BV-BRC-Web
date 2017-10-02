define("p3/widget/PATRICTheme", [
	"dojox/charting/SimpleTheme",
	"dojox/charting/themes/common"
], function(SimpleTheme, themes){

	themes.PATRIC = new SimpleTheme({
		// PATRIC palette from DLP
		// colors: ["#1f497d", "#4f81bd", "#4bacc6", "#f79646", "#9bbb59"]

		// light blue 900 (#01579B), light blue 500 (#03A9F4),
		// teal 500 (#009688), amber 500 (#FFC107), grey 500 (#9E9E9E)
		// colors: ["#01579B", "#03A9F4", "#009688", "#FFC107", "#9E9E9E"]

		// blue 700, teal 400, lime 500, amber 500, grey 500
		// blue 200, teal 200, lime 300, amber 200, grey 300
		// blue 50, teal 50, lime 50, amber 50, grey 50
		colors: ["#1976D2", "#26A69A", "#CDDC39", "#FFC107", "#9E9E9E",
			"#90CAF9", "#80CBC4", "#DCE775", "#FFE082", "#E0E0E0",
			"#E3F2FD", "#E0F2F1", "#F9FBE7", "#FFF8E1", "#FAFAFA"
		]
	});

	return themes.PATRIC;
});